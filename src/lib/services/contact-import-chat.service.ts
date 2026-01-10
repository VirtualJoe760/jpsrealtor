/**
 * Contact Import Chat Service
 *
 * Orchestrates the chat-based contact import workflow with state management.
 * This service manages the state machine for the import process.
 */

import { cleanContacts, CleanContactsResult } from './contact-cleaner.service';
import { importContactsForChat, ChatImportResult } from './contact-import.service';
import { getUserLists, createList, formatListsForChat } from './list-management.service';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Chat state machine states
 */
export type ChatState =
  | 'IDLE' // No file uploaded
  | 'FILE_UPLOADED' // File received, ready to preview
  | 'PREVIEW_SHOWN' // Preview generated and shown to user
  | 'AWAITING_CONFIRMATION' // Waiting for user to confirm preview
  | 'AWAITING_LIST_ASSIGNMENT' // Confirmed, waiting for list selection
  | 'IMPORTING' // Currently importing to database
  | 'COMPLETED' // Import completed successfully
  | 'ERROR'; // Error occurred

/**
 * Chat context with state and data
 */
export interface ChatContext {
  state: ChatState;
  filePath?: string;
  cleanedData?: any[];
  statistics?: CleanContactsResult['statistics'];
  listId?: string;
  listName?: string;
  confirmationReceived?: boolean;
  importResult?: ChatImportResult;
  error?: string;
}

/**
 * State transition result
 */
export interface StateTransitionResult {
  newState: ChatState;
  shouldCallTool: boolean;
  toolName?: string;
  toolArgs?: any;
}

// ============================================================================
// STATE MACHINE LOGIC
// ============================================================================

/**
 * Determine next state and action based on current state and user message
 *
 * @param currentState - Current chat state
 * @param userMessage - User's message
 * @param context - Current chat context
 * @returns State transition information
 */
export function determineNextState(
  currentState: ChatState,
  userMessage: string,
  context: ChatContext
): StateTransitionResult {
  const messageLower = userMessage.toLowerCase();

  switch (currentState) {
    case 'IDLE':
    case 'FILE_UPLOADED':
      // If file path is in context, automatically trigger preview
      if (context.filePath) {
        return {
          newState: 'PREVIEW_SHOWN',
          shouldCallTool: true,
          toolName: 'preview_contacts',
          toolArgs: { filePath: context.filePath },
        };
      }
      return { newState: 'IDLE', shouldCallTool: false };

    case 'PREVIEW_SHOWN':
      // Check if user is confirming
      if (isConfirmation(messageLower)) {
        return {
          newState: 'AWAITING_LIST_ASSIGNMENT',
          shouldCallTool: true,
          toolName: 'get_user_lists',
        };
      }
      // Check if user is rejecting
      if (isRejection(messageLower)) {
        return { newState: 'IDLE', shouldCallTool: false };
      }
      // Still waiting for confirmation
      return { newState: 'AWAITING_CONFIRMATION', shouldCallTool: false };

    case 'AWAITING_CONFIRMATION':
      // Same logic as PREVIEW_SHOWN
      if (isConfirmation(messageLower)) {
        return {
          newState: 'AWAITING_LIST_ASSIGNMENT',
          shouldCallTool: true,
          toolName: 'get_user_lists',
        };
      }
      if (isRejection(messageLower)) {
        return { newState: 'IDLE', shouldCallTool: false };
      }
      return { newState: 'AWAITING_CONFIRMATION', shouldCallTool: false };

    case 'AWAITING_LIST_ASSIGNMENT':
      // Check if user wants to create new list
      const createMatch = messageLower.match(/create list[:\s]+(.+)/i);
      if (createMatch) {
        const listName = createMatch[1].trim();
        return {
          newState: 'IMPORTING',
          shouldCallTool: true,
          toolName: 'import_contacts',
          toolArgs: {
            cleanedData: context.cleanedData,
            listName,
          },
        };
      }

      // Check if user selected existing list by number or name
      const listMatch = extractListSelection(messageLower);
      if (listMatch) {
        return {
          newState: 'IMPORTING',
          shouldCallTool: true,
          toolName: 'import_contacts',
          toolArgs: {
            cleanedData: context.cleanedData,
            listId: listMatch,
          },
        };
      }

      // Still waiting for list selection
      return { newState: 'AWAITING_LIST_ASSIGNMENT', shouldCallTool: false };

    case 'IMPORTING':
      // Import in progress, should not receive messages here
      return { newState: 'IMPORTING', shouldCallTool: false };

    case 'COMPLETED':
      // Reset to IDLE for next import
      return { newState: 'IDLE', shouldCallTool: false };

    case 'ERROR':
      // Reset to IDLE after error
      return { newState: 'IDLE', shouldCallTool: false };

    default:
      return { newState: 'IDLE', shouldCallTool: false };
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if message is a confirmation
 */
function isConfirmation(message: string): boolean {
  const confirmKeywords = [
    'yes',
    'yeah',
    'yep',
    'sure',
    'okay',
    'ok',
    'proceed',
    'continue',
    'confirm',
    'looks good',
    'correct',
    'go ahead',
    'import',
  ];

  return confirmKeywords.some(keyword => message.includes(keyword));
}

/**
 * Check if message is a rejection
 */
function isRejection(message: string): boolean {
  const rejectKeywords = [
    'no',
    'nope',
    'cancel',
    'stop',
    'abort',
    'wrong',
    'incorrect',
    'not right',
  ];

  return rejectKeywords.some(keyword => message.includes(keyword));
}

/**
 * Extract list selection from user message
 * Handles: "list 1", "1", "warm leads", etc.
 */
function extractListSelection(message: string): string | null {
  // Match patterns like "list 1", "option 2", "number 3"
  const numberMatch = message.match(/(?:list|option|number)?\s*(\d+)/i);
  if (numberMatch) {
    return numberMatch[1]; // Return the number as string
  }

  // Match list names directly
  // This would need access to available lists, handled by LLM

  return null;
}

// ============================================================================
// PREVIEW FORMATTING
// ============================================================================

/**
 * Format cleaned data as markdown table for chat preview
 *
 * @param cleanedData - Array of cleaned contacts
 * @param maxRows - Maximum rows to show (default: 5)
 * @returns Formatted markdown table
 */
export function formatPreviewTable(cleanedData: any[], maxRows: number = 5): string {
  if (!cleanedData || cleanedData.length === 0) {
    return '_No contacts to preview_';
  }

  const previewData = cleanedData.slice(0, maxRows);
  const hasMore = cleanedData.length > maxRows;

  // Determine which fields to show (prioritize common fields)
  const fieldPriority = [
    'firstName',
    'lastName',
    'phone',
    'email',
    'city',
    'state',
    'organization',
  ];

  const sampleContact = previewData[0];
  const availableFields = fieldPriority.filter(
    field => sampleContact[field] !== undefined && sampleContact[field] !== ''
  );

  // Take first 5 non-empty fields
  const fieldsToShow = availableFields.slice(0, 5);

  // Build markdown table
  let table = '| ' + fieldsToShow.map(f => formatFieldName(f)).join(' | ') + ' |\n';
  table += '|' + fieldsToShow.map(() => '---').join('|') + '|\n';

  previewData.forEach(contact => {
    const row = fieldsToShow.map(field => {
      const value = contact[field];
      if (!value) return '_empty_';
      if (typeof value === 'string' && value.length > 30) {
        return value.substring(0, 27) + '...';
      }
      return String(value);
    });
    table += '| ' + row.join(' | ') + ' |\n';
  });

  if (hasMore) {
    table += `\n_... and ${cleanedData.length - maxRows} more contacts_`;
  }

  return table;
}

/**
 * Format field name for display
 */
function formatFieldName(field: string): string {
  // Convert camelCase to Title Case
  const formatted = field
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();

  return formatted;
}

/**
 * Format statistics for chat display
 */
export function formatStatistics(statistics: CleanContactsResult['statistics']): string {
  let formatted = '**Statistics:**\n';
  formatted += `- Total rows: ${statistics.totalRows}\n`;
  formatted += `- Cleaned successfully: ${statistics.cleanedRows}\n`;
  formatted += `- Skipped (invalid data): ${statistics.skippedRows}\n`;
  formatted += `- Duplicates removed: ${statistics.duplicatesRemoved}\n`;

  if (statistics.warnings.length > 0) {
    formatted += `\n**Warnings (${statistics.warnings.length}):**\n`;
    statistics.warnings.slice(0, 3).forEach(w => {
      formatted += `- Row ${w.row}: ${w.message}\n`;
    });

    if (statistics.warnings.length > 3) {
      formatted += `- ... and ${statistics.warnings.length - 3} more warnings\n`;
    }
  }

  return formatted;
}

/**
 * Format import result for chat display
 */
export function formatImportResult(result: ChatImportResult): string {
  let formatted = '✅ **Import Complete!**\n\n';
  formatted += `**Results:**\n`;
  formatted += `- Imported: ${result.imported} contacts\n`;
  formatted += `- Skipped: ${result.skipped}\n`;
  formatted += `- Duplicates: ${result.duplicates}\n`;

  if (result.listId) {
    formatted += `\nContacts have been assigned to the specified list.\n`;
  }

  if (result.errors.length > 0) {
    formatted += `\n**Errors (${result.errors.length}):**\n`;
    result.errors.slice(0, 3).forEach(e => {
      formatted += `- Row ${e.row}: ${e.error}\n`;
    });

    if (result.errors.length > 3) {
      formatted += `- ... and ${result.errors.length - 3} more errors\n`;
    }
  }

  formatted += `\nYour contacts are now in the CRM and ready to use!`;

  return formatted;
}

// ============================================================================
// CONTEXT INITIALIZATION
// ============================================================================

/**
 * Create initial context when file is uploaded
 */
export function createInitialContext(filePath: string): ChatContext {
  return {
    state: 'FILE_UPLOADED',
    filePath,
  };
}

/**
 * Update context after preview
 */
export function updateContextAfterPreview(
  context: ChatContext,
  result: CleanContactsResult
): ChatContext {
  return {
    ...context,
    state: 'PREVIEW_SHOWN',
    cleanedData: result.cleanedData,
    statistics: result.statistics,
  };
}

/**
 * Update context after import
 */
export function updateContextAfterImport(
  context: ChatContext,
  result: ChatImportResult
): ChatContext {
  return {
    ...context,
    state: 'COMPLETED',
    importResult: result,
    listId: result.listId,
  };
}
