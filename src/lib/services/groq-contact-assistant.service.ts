/**
 * Groq Contact Cleaning Assistant Service
 *
 * This service integrates Groq LLM with the deterministic contact cleaner.
 *
 * ARCHITECTURE:
 * - LLM: Intent understanding, parameter selection, user communication
 * - Tools: All data transformations and file operations
 *
 * The LLM NEVER manipulates CSV/Excel data directly.
 */

import Groq from 'groq-sdk';
import { cleanContactsTool, CleanContactsResult } from './contact-cleaner.service';
import { getAvailableRules } from './contact-validators';

// ============================================================================
// GROQ CLIENT INITIALIZATION
// ============================================================================

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// ============================================================================
// TOOL DEFINITIONS FOR GROQ
// ============================================================================

const CONTACT_CLEANING_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "clean_contacts",
      description: "Clean and normalize contact data from CSV or Excel files. Handles phone number formatting, ZIP code preservation, field fallbacks, and validation. Returns statistics and cleaned file path. Use this tool for ALL contact data cleaning operations - NEVER manipulate CSV/Excel data directly.",
      parameters: {
        type: "object" as const,
        properties: {
          filePath: {
            type: "string" as const,
            description: "Absolute path to the input CSV or Excel file"
          },
          outputPath: {
            type: "string" as const,
            description: "Absolute path for the cleaned output CSV file. If not provided, will use input filename with '_cleaned' suffix"
          },
          options: {
            type: "object" as const,
            description: "Cleaning and normalization options",
            properties: {
              phoneFields: {
                type: "array" as const,
                items: { type: "string" as const },
                description: "Ordered list of phone field names to try (first available wins). Example: ['Primary Phone', 'Mobile', 'Phone']. Common Google Contacts fields: ['Phone 1 - Value', 'Phone 2 - Value']"
              },
              phoneFormat: {
                type: "string" as const,
                enum: ["e164", "national", "raw"],
                description: "Output phone format. 'e164' = +12345678900, 'national' = (234) 567-8900, 'raw' = 2345678900"
              },
              defaultCountryCode: {
                type: "string" as const,
                description: "ISO country code for phone parsing (e.g., 'US', 'CA', 'GB')",
                default: "US"
              },
              zipFields: {
                type: "array" as const,
                items: { type: "string" as const },
                description: "ZIP/postal code field names to normalize. Example: ['ZIP', 'Zip Code', 'Postal Code']"
              },
              requiredFields: {
                type: "array" as const,
                items: { type: "string" as const },
                description: "Fields that must have values. Rows missing these will be flagged and skipped"
              },
              skipInvalidPhones: {
                type: "boolean" as const,
                description: "Skip rows with invalid phone numbers",
                default: false
              },
              skipDuplicates: {
                type: "boolean" as const,
                description: "Skip duplicate phone numbers (keep first occurrence)",
                default: false
              },
              exportFormat: {
                type: "string" as const,
                enum: ["generic", "drop_cowboy", "sendfox", "mojo_dialer"],
                description: "Output format preset with field mappings for specific platforms. 'drop_cowboy' = Drop Cowboy RVM, 'sendfox' = SendFox email, 'mojo_dialer' = MOJO Dialer, 'generic' = keep all fields",
                default: "generic"
              }
            },
            required: ["phoneFields"]
          }
        },
        required: ["filePath", "options"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "preview_contacts",
      description: "Preview contact data WITHOUT importing to database. Shows cleaned data, statistics, and potential issues. ALWAYS use this BEFORE importing. Performs smart data quality fixes: (1) Parses owner names from 'All Owners' field when individual name fields are inconsistent, (2) Preserves all alternate phone numbers for multi-touch campaigns, (3) Detects absentee owners by comparing mailing vs property address, (4) Stores geolocation and property metadata for enrichment. This is a non-destructive operation that runs in-memory only.",
      parameters: {
        type: "object" as const,
        properties: {
          filePath: {
            type: "string" as const,
            description: "Absolute path to the uploaded contact file"
          },
          options: {
            type: "object" as const,
            description: "Cleaning options with smart field detection. For property data, look for: 'Phone' + 'Alternate Phone 1-5', 'Site Address' vs 'Mail Address', 'Latitude', 'Longitude', 'All Owners' for name parsing, 'Pool', 'Fireplace', 'Year Built', etc.",
            properties: {
              phoneFields: {
                type: "array" as const,
                items: { type: "string" as const },
                description: "Phone field names to try (includes alternate phones). Example: ['Phone', 'Alternate Phone 1', 'Alternate Phone 2', 'Alternate Phone 3', 'Alternate Phone 4', 'Alternate Phone 5']"
              },
              phoneFormat: {
                type: "string" as const,
                enum: ["e164", "national", "raw"],
                description: "Output phone format",
                default: "national"
              },
              exportFormat: {
                type: "string" as const,
                enum: ["generic", "drop_cowboy", "sendfox", "mojo_dialer"],
                default: "generic"
              },
              skipDuplicates: {
                type: "boolean" as const,
                default: true
              }
            },
            required: ["phoneFields"]
          }
        },
        required: ["filePath", "options"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "import_contacts",
      description: "Import contacts into CRM database after preview. REQUIRES explicit user confirmation. REQUIRES list assignment. Supports natural language: if user says 'import with label X' or 'import as X' or 'add to X list', extract list name 'X' and pass as listName. Will create the list if it doesn't exist. Re-reads the file to get cleaned data. This writes data to the database - use with caution.",
      parameters: {
        type: "object" as const,
        properties: {
          filePath: {
            type: "string" as const,
            description: "Absolute path to the contact file (same path used in preview_contacts)"
          },
          options: {
            type: "object" as const,
            properties: {
              listId: {
                type: "string" as const,
                description: "Existing list ID to assign contacts to (optional if listName provided)"
              },
              listName: {
                type: "string" as const,
                description: "List name to create or assign to. Extract from user's message if they say things like 'import with label Old Town Farm' or 'add to Cold Leads list'. Will create list if it doesn't exist."
              },
              skipDuplicates: {
                type: "boolean" as const,
                description: "Skip contacts with duplicate phone/email",
                default: true
              },
              phoneFields: {
                type: "array" as const,
                items: { type: "string" as const },
                description: "Phone field names to try (same as preview_contacts). Example: ['Phone', 'Alternate Phone 1', 'Alternate Phone 2']"
              },
              phoneFormat: {
                type: "string" as const,
                enum: ["e164", "national", "raw"],
                description: "Output phone format (same as preview)",
                default: "national"
              }
            }
          }
        },
        required: ["filePath", "options"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "get_user_lists",
      description: "Retrieve all available contact lists for list assignment. Use this to show the user their options before importing.",
      parameters: {
        type: "object" as const,
        properties: {},
        required: []
      }
    }
  }
];

// ============================================================================
// SYSTEM PROMPT
// ============================================================================

const SYSTEM_PROMPT = `You are a contact data cleaning and import assistant with strict safety protocols.

YOUR ROLE:
1. Analyze uploaded contact files and explain data mapping
2. Preview contact data before any database operations
3. Get explicit confirmation before importing
4. Ensure list assignment is specified
5. Execute imports safely with user oversight

WHEN USER UPLOADS A FILE - BE CONVERSATIONAL AND DETAILED:
1. Acknowledge the file upload with enthusiasm
2. Explain what you're about to do: "I'll analyze your file and preview how the data will be mapped..."
3. Describe the file type (CSV/Excel) and what fields you expect to find
4. Call preview_contacts tool to analyze the data
5. Show the preview table with clear explanations of any transformations
6. Highlight phone number formatting, duplicate handling, and any issues found

CRITICAL IMPORT SAFETY RULES:
1. ✅ ALWAYS preview contacts BEFORE importing (use preview_contacts tool first)
2. ✅ NEVER import without explicit user confirmation ("yes", "proceed", "confirm", etc.)
3. ✅ ALWAYS ask about list assignment before importing
4. ✅ NEVER assume list assignment - user must specify or create
5. ✅ Show preview in markdown table format (max 5 rows)
6. ✅ Clearly state statistics: total, cleaned, skipped, duplicates
7. ✅ Highlight warnings and issues from preview

WORKFLOW ENFORCEMENT - FOLLOW THIS EXACTLY:
Step 1: User uploads file → Greet warmly and explain what you'll do → Call preview_contacts(filePath, options)
Step 2: Show preview table + statistics + explain transformations → Ask "Does this look correct?"
Step 3: If confirmed with list name in message → Call import_contacts(filePath=SAME_FILE_PATH, options={listName: extracted_name, phoneFields: SAME_AS_PREVIEW, phoneFormat: SAME_AS_PREVIEW})
Step 3 (alt): If confirmed without list name → Call get_user_lists → Ask "Which list should I assign these contacts to?"
Step 4: User selects/creates list → Call import_contacts(filePath, options)
Step 5: Show import results with celebration

⚠️ CRITICAL: When calling import_contacts, you MUST pass the same filePath and phoneFields/phoneFormat that you used in preview_contacts!

NATURAL LANGUAGE LIST ASSIGNMENT:
✅ If user says "import with label X" or "import as X" or "add to X list" → Extract list name "X" and import directly
✅ If user says "import them with the label Old Town Farm" → Extract "Old Town Farm" as list name
✅ Common patterns: "import as [name]", "label them [name]", "add to [name]", "create list [name]"
✅ If list name provided, skip get_user_lists step and import directly

FORBIDDEN ACTIONS - NEVER DO THESE:
❌ NEVER call import_contacts without preview_contacts first
❌ NEVER import without user saying "yes" or equivalent
❌ NEVER skip list assignment question
❌ NEVER assume a default list
❌ NEVER give generic "connection error" messages - always call preview_contacts

DATA HANDLING RULES:
- NEVER manipulate CSV or Excel data directly
- ALWAYS use tools for data transformations
- NEVER inline CSV content in responses
- NEVER hallucinate cleaned data

COMMON SCENARIOS & AUTO-DETECTION:
1. **Google Contacts Export**: Phone fields are "Phone 1 - Value", "Phone 2 - Value"
2. **Excel Files**: Auto-fix phone numbers and ZIP codes with ".0" suffix
3. **Leading Zero Loss**: Restore ZIP codes like "01234" from "1234"
4. **File Naming**: Infer intent from filename (e.g., "cold_leads.csv" → cold calling list)

SMART DATA QUALITY FIXES:
1. **Name Parsing Issues**: If owner name fields are inconsistent (e.g., "1st Owner's First Name" is populated but "1st Owner's Last Name" is blank, while "2nd Owner's Last Name" matches the first name), use the "All Owners" field to parse proper names. Example: "Mcintyre and Marvin Mcintyre" → First: "Marvin", Last: "Mcintyre"
2. **Multiple Phones**: Preserve all alternate phone numbers (Alternate Phone 1-5) for multi-touch campaigns
3. **Mailing vs Property Address**: If mailing address differs from property address, flag as absentee owner (high-value lead)
4. **Property Enrichment**: Store geolocation (lat/long), property details (pool, fireplace, year built) for cross-referencing with listing databases

FILE UPLOAD RESPONSE TEMPLATE:
"Perfect! I've received your contact file **[filename]**. Let me analyze the data structure and show you a preview of how your contacts will be imported.

I'll be looking for:
- Phone numbers (will format to: (XXX) XXX-XXXX)
- Names, emails, addresses
- Any duplicate phone numbers to remove

Analyzing now..."

[Then call preview_contacts tool]

PREVIEW FORMAT EXAMPLE:
Here's a preview of your **247 contacts** from [filename]:

| First Name | Last Name | Phone | Email | City |
|------------|-----------|-------|-------|------|
| John | Smith | (555) 123-4567 | john@example.com | Phoenix |
| Jane | Doe | (555) 987-6543 | jane@example.com | Scottsdale |

_... and 242 more contacts_

**Statistics:**
- Total rows: 247
- Cleaned successfully: 245 ✓
- Skipped (invalid data): 2
- Duplicates removed: 0

**Transformations Applied:**
- ✓ Phone numbers formatted to national format
- ✓ ZIP codes preserved with leading zeros
- ✓ Empty fields normalized

Does this look correct? Should I proceed with importing these 245 contacts?

RESPONSE STYLE:
- Be warm, professional, and conversational
- Use emojis sparingly (✓, ⚠️, ✅ for status)
- Explain transformations clearly
- Highlight important warnings
- Always ask for confirmation before destructive operations
- Make users feel confident about their data

NATURAL LANGUAGE EXAMPLES:
User: "import them with the label Old Town Farm"
→ Extract: listName = "Old Town Farm", call import_contacts

User: "okay import as Cold Leads"
→ Extract: listName = "Cold Leads", call import_contacts

User: "add to Neighborhood Farming list"
→ Extract: listName = "Neighborhood Farming", call import_contacts

User: "yes import them"
→ No list name provided, call get_user_lists to ask

User: "import these to my Hot Leads"
→ Extract: listName = "Hot Leads", call import_contacts

PATTERN RECOGNITION:
- "with the label X" → listName = X
- "import as X" → listName = X
- "add to X" → listName = X
- "create list X" → listName = X
- "label them X" → listName = X
- "X list" → listName = X (remove "list" suffix)
- "import to X" → listName = X`;

// ============================================================================
// MAIN ASSISTANT FUNCTION
// ============================================================================

export interface AssistantMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string;
  tool_calls?: any[];
}

/**
 * Process a contact cleaning request using Groq LLM + deterministic tools
 *
 * @param userMessage - User's message/request
 * @param conversationHistory - Optional previous messages for context
 * @returns Object with response text, optional preview data, and tool_calls
 */
export async function processContactCleaningRequest(
  userMessage: string,
  conversationHistory: AssistantMessage[] = []
): Promise<{ response: string; previewData?: any; tool_calls?: any[] }> {
  try {
    console.log('\n┌─────────────────────────────────────────────────────┐');
    console.log('│ 🤖 [Groq Assistant] Processing request             │');
    console.log('└─────────────────────────────────────────────────────┘\n');
    console.log('📝 User message:', userMessage);
    console.log('📚 Conversation history:', conversationHistory.length, 'messages');

    // Build messages array
    const messages: any[] = [
      {
        role: "system",
        content: SYSTEM_PROMPT,
      },
      ...conversationHistory,
      {
        role: "user",
        content: userMessage,
      },
    ];

    console.log('📨 Total messages to Groq:', messages.length);

    // Step 1: Send request to Groq
    console.log('🚀 Sending request to Groq API...');
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile", // High-quality Groq model
      messages,
      tools: CONTACT_CLEANING_TOOLS,
      tool_choice: "auto", // Let LLM decide when to use tools
      temperature: 0.3, // Lower temperature for more deterministic responses
      max_tokens: 2000,
    });

    console.log('✅ Groq API response received');
    const message = response.choices[0].message;
    console.log('💬 Message content preview:', message.content?.substring(0, 150));
    console.log('🔧 Tool calls:', message.tool_calls?.length || 0);

    // Step 2: Check if LLM wants to call a tool
    if (message.tool_calls && message.tool_calls.length > 0) {
      const toolCall = message.tool_calls[0];
      console.log('\n🔧 [Groq Assistant] Tool call requested:', toolCall.function.name);

      const args = JSON.parse(toolCall.function.arguments);
      console.log('📦 [Groq Assistant] Tool arguments:', JSON.stringify(args, null, 2));

      let result: any;

      // Step 3: Execute the appropriate tool
      console.log('⚙️ [Groq Assistant] Executing tool:', toolCall.function.name);

      switch (toolCall.function.name) {
        case 'clean_contacts':
          console.log('🧹 Calling cleanContactsTool...');
          result = await cleanContactsTool(args);
          console.log('✅ cleanContactsTool result:', { success: result.success, error: result.error });
          break;

        case 'preview_contacts':
          console.log('👀 Calling previewContactsTool...');
          console.log('📁 File path:', args.filePath);
          const { previewContactsTool } = await import('./contact-cleaner.service');
          result = await previewContactsTool(args);
          console.log('✅ previewContactsTool result:', {
            success: result.success,
            error: result.error,
            cleanedDataCount: result.cleanedData?.length,
            totalRows: result.statistics?.totalRows
          });
          break;

        case 'import_contacts':
          console.log('📥 Calling importContactsTool...');
          console.log('📁 File path:', args.filePath);
          console.log('📋 List name:', args.options?.listName || 'none');
          const { importContactsTool } = await import('./contact-import.service');
          result = await importContactsTool(args);
          console.log('✅ importContactsTool result:', {
            success: result.success,
            imported: result.imported,
            duplicates: result.duplicates,
            skipped: result.skipped,
            message: result.message
          });
          break;

        case 'get_user_lists':
          console.log('📋 Calling getUserListsTool...');
          const { getUserListsTool } = await import('./list-management.service');
          result = await getUserListsTool();
          console.log('✅ getUserListsTool result:', result);
          break;

        default:
          console.error('❌ Unknown tool:', toolCall.function.name);
          return { response: `Unknown tool: ${toolCall.function.name}` };
      }

      // Step 4: Send tool result back to LLM for interpretation
      const finalResponse = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT,
          },
          ...conversationHistory as any[],
          {
            role: "user",
            content: userMessage,
          },
          {
            role: message.role,
            content: message.content,
            ...(message.tool_calls && { tool_calls: message.tool_calls }),
          } as any,
          {
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify(result),
          },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      });

      let responseText = finalResponse.choices[0].message.content || 'Operation completed.';
      let previewData: any = undefined;

      // If this was a preview_contacts call, append marker and return preview data
      if (toolCall.function.name === 'preview_contacts' && result.success && result.cleanedData) {
        responseText += '\n\n[CONTACT_IMPORT_PREVIEW]';
        previewData = result; // Include the preview result data
      }

      // If this was an import_contacts call, append marker and return success data
      if (toolCall.function.name === 'import_contacts' && result.success) {
        responseText += '\n\n[CONTACT_IMPORT_SUCCESS]';
        previewData = result; // Include the import result data
      }

      // Return response with tool_calls so they can be stored in conversation history
      return {
        response: responseText,
        previewData,
        tool_calls: message.tool_calls, // Preserve tool calls for conversation context
      };
    }

    // Step 5: Return LLM response (might be asking for clarification)
    return {
      response: message.content || 'I need more information to proceed.',
      tool_calls: message.tool_calls, // Preserve tool calls even if no tool was executed
    };

  } catch (error: any) {
    console.error('[Groq Contact Assistant] Error:', error);
    return { response: `Error: ${error.message}. Please try again or contact support.` };
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get available validation rules for LLM context
 * This helps LLM understand what validation options are available
 */
export function getValidationRulesContext(): string {
  const rules = getAvailableRules();

  const ruleDescriptions = rules.map(rule =>
    `- ${rule.id}: ${rule.description} (${rule.severity})`
  ).join('\n');

  return `Available Validation Rules:\n${ruleDescriptions}`;
}

/**
 * Format tool result for better LLM understanding
 * Adds context and formatting to raw tool results
 */
export function formatToolResult(result: CleanContactsResult): string {
  if (!result.success) {
    return `Error: ${result.error}`;
  }

  const stats = result.statistics;

  let formatted = `✅ Successfully cleaned contacts!\n\n`;
  formatted += `**Statistics:**\n`;
  formatted += `- Total rows: ${stats.totalRows}\n`;
  formatted += `- Cleaned: ${stats.cleanedRows}\n`;
  formatted += `- Skipped: ${stats.skippedRows}\n`;
  formatted += `- Duplicates removed: ${stats.duplicatesRemoved}\n`;
  formatted += `\n**Output:** ${result.outputPath}\n`;

  if (stats.warnings.length > 0) {
    formatted += `\n**Warnings (${stats.warnings.length}):**\n`;
    stats.warnings.slice(0, 5).forEach(w => {
      formatted += `- Row ${w.row}: ${w.message}\n`;
    });

    if (stats.warnings.length > 5) {
      formatted += `- ... and ${stats.warnings.length - 5} more warnings\n`;
    }
  }

  return formatted;
}

// ============================================================================
// EXAMPLE USAGE
// ============================================================================

/**
 * Example: Clean contacts for Drop Cowboy
 */
export async function exampleDropCowboyCleaning(filePath: string): Promise<string> {
  const userMessage = `I have a Google Contacts export at ${filePath}.
    Clean it for Drop Cowboy. Remove duplicates and fix the .0 issues.`;

  const { response } = await processContactCleaningRequest(userMessage);
  return response;
}

/**
 * Example: Clean contacts with custom validation
 */
export async function exampleWithValidation(filePath: string): Promise<string> {
  const userMessage = `Clean ${filePath} for MOJO Dialer.
    Skip any test phone numbers and contacts without complete names.
    Use validation rules: phone_not_test_number, has_complete_name`;

  const { response } = await processContactCleaningRequest(userMessage);
  return response;
}
