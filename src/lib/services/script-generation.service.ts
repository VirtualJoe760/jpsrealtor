/**
 * Script Generation Service
 *
 * Generates personalized voicemail scripts using AI (Groq/Claude)
 * Supports batch generation and script regeneration
 */

import { Types } from 'mongoose';
import Groq from 'groq-sdk';
import Anthropic from '@anthropic-ai/sdk';
import Contact, { IContact } from '@/models/contact';
import Campaign, { ICampaign } from '@/models/Campaign';
import VoicemailScript from '@/models/VoicemailScript';
import ContactCampaign from '@/models/ContactCampaign';
import GenerationSession from '@/models/GenerationSession';

// Initialize AI clients
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// AI Model types
export type AIModel = 'groq-llama3' | 'claude-3.5-sonnet' | 'claude-3-haiku';

// Script generation result
export interface ScriptGenerationResult {
  success: boolean;
  scriptId?: Types.ObjectId;
  script?: string;
  error?: string;
}

// Batch generation progress
export interface BatchGenerationProgress {
  total: number;
  completed: number;
  failed: number;
  inProgress: boolean;
}

export class ScriptGenerationService {
  /**
   * Generate script for a single contact
   */
  static async generateScriptForContact(
    contactId: Types.ObjectId,
    campaignId: Types.ObjectId,
    userId: Types.ObjectId,
    model: AIModel = 'groq-llama3',
    customPrompt?: string
  ): Promise<ScriptGenerationResult> {
    try {
      // Fetch contact and campaign
      const contact = await Contact.findOne({ _id: contactId, userId });
      const campaign = await Campaign.findOne({ _id: campaignId, userId });

      if (!contact || !campaign) {
        return {
          success: false,
          error: 'Contact or campaign not found',
        };
      }

      // Check if script already exists
      const existingScript = await VoicemailScript.findOne({
        contactId,
        campaignId,
      });

      // Build prompt
      let prompt: string;
      if (customPrompt) {
        // If user provided custom prompt for personalized script, wrap it with user AND contact data
        prompt = await this.buildCustomPromptWithContactData(customPrompt, contact, userId);
      } else {
        // Use template-based prompt (includes user and contact data)
        prompt = await this.buildPrompt(contact, campaign, userId);
      }

      // Call AI to generate script
      const rawScriptText = await this.callAI(prompt, model);

      // Personalize the script by replacing placeholders with actual data
      const User = (await import('@/models/User')).default;
      const user = await User.findById(userId);
      const scriptText = this.personalizeScript(rawScriptText, contact, user);

      // Create or update script
      if (existingScript) {
        existingScript.script = scriptText;
        existingScript.scriptVersion += 1;
        existingScript.aiModel = model;
        existingScript.generationPrompt = prompt;
        existingScript.generatedBy = 'ai';

        // Reset audio status when script is regenerated
        // The old audio no longer matches the new script text
        existingScript.audio = {
          status: 'pending',
        };

        await existingScript.save();

        return {
          success: true,
          scriptId: existingScript._id,
          script: scriptText,
        };
      } else {
        const newScript = await VoicemailScript.create({
          contactId,
          campaignId,
          userId,
          script: scriptText,
          scriptVersion: 1,
          generatedBy: 'ai',
          aiModel: model,
          generationPrompt: prompt,
          reviewStatus: 'pending',
          audio: {
            status: 'pending',
          },
          delivery: {
            status: 'not_sent',
          },
        });

        return {
          success: true,
          scriptId: newScript._id,
          script: scriptText,
        };
      }
    } catch (error: any) {
      console.error('[ScriptGenerationService] Generation failed:', error);
      return {
        success: false,
        error: error.message || 'Script generation failed',
      };
    }
  }

  /**
   * Generate scripts for all contacts in a campaign (batch)
   */
  static async generateScriptsForCampaign(
    campaignId: Types.ObjectId,
    userId: Types.ObjectId,
    model: AIModel = 'groq-llama3',
    customPrompt?: string,
    scriptType: 'general' | 'personalized' = 'personalized',
    template?: string
  ): Promise<{
    success: boolean;
    jobId: string;
    message: string;
    count?: number;
  }> {
    try {
      // Verify campaign ownership
      const campaign = await Campaign.findOne({ _id: campaignId, userId });
      if (!campaign) {
        return {
          success: false,
          jobId: '',
          message: 'Campaign not found',
        };
      }

      // Delete all existing scripts for this campaign before regenerating
      // This ensures users get fresh scripts when regenerating
      console.log(`[ScriptGenerationService] Deleting existing scripts for campaign: ${campaignId}`);
      const deleteResult = await VoicemailScript.deleteMany({
        campaignId,
        userId,
      });
      console.log(`[ScriptGenerationService] Deleted ${deleteResult.deletedCount} existing scripts`);

      // Update campaign status
      campaign.status = 'generating_scripts';
      await campaign.save();

      // Get all contacts for this campaign
      const contactCampaigns = await ContactCampaign.find({
        campaignId,
        userId,
      }).populate('contactId');

      const contacts = contactCampaigns
        .map((cc: any) => cc.contactId)
        .filter((c: any) => c !== null);

      console.log(`[ScriptGenerationService] Script type: ${scriptType}, Contacts: ${contacts.length}`);

      // Handle GENERAL script generation (one script for all contacts)
      if (scriptType === 'general') {
        console.log('[generateScriptsForCampaign] Generating general script with userId:', userId.toString());

        // Build a general prompt that doesn't reference specific contacts
        let prompt: string;
        if (customPrompt) {
          // If user provided custom prompt, wrap it with user data context
          prompt = await this.buildCustomPromptWithUserData(customPrompt, userId);
        } else {
          // Use template-based prompt
          prompt = await this.buildGeneralPrompt(campaign, userId, template);
        }

        console.log('[generateScriptsForCampaign] Prompt built, first 200 chars:', prompt.substring(0, 200));

        // Call AI to generate one general script
        const rawScriptText = await this.callAI(prompt, model);

        console.log('[generateScriptsForCampaign] Raw AI output (first 200 chars):', rawScriptText.substring(0, 200));

        // Create one VoicemailScript that applies to all contacts
        const generalScript = await VoicemailScript.create({
          campaignId,
          userId,
          contactId: null, // No specific contact - general script
          script: rawScriptText,
          scriptVersion: 1,
          generatedBy: 'ai',
          aiModel: model,
          generationPrompt: prompt,
          reviewStatus: 'pending',
          isGeneral: true, // Mark as general script
          audio: {
            status: 'pending',
          },
          delivery: {
            status: 'not_sent',
          },
        });

        // Update campaign status
        campaign.stats.scriptsGenerated = 1;
        campaign.status = 'review';
        await campaign.save();

        console.log(`[ScriptGenerationService] Created general script: ${generalScript._id}`);

        return {
          success: true,
          jobId: campaignId.toString(),
          message: `Generated 1 general script`,
          count: 1,
        };
      }

      // Handle PERSONALIZED script generation (one per contact)
      // Create GenerationSession BEFORE starting background processing
      // This ensures the progress tracker can immediately start polling
      const session = await GenerationSession.create({
        campaignId,
        userId,
        type: 'script_generation',
        status: 'in_progress',
        totalItems: contacts.length,
        lastProcessedIndex: -1,
        successCount: 0,
        failureCount: 0,
        config: {
          model,
          customPrompt,
          scriptType,
          template,
        },
        errorLog: [],
      });

      console.log(`[ScriptGenerationService] Created session: ${session._id} for ${contacts.length} contacts`);

      // Generate scripts for each contact (in background)
      // In production, this should use a job queue (Bull, etc.)
      this.processBatchGeneration(campaignId, userId, contacts, campaign, model, customPrompt, session);

      return {
        success: true,
        jobId: campaignId.toString(),
        message: `Generating ${contacts.length} personalized scripts`,
        count: contacts.length,
      };
    } catch (error: any) {
      console.error('[ScriptGenerationService] Batch generation failed:', error);
      return {
        success: false,
        jobId: '',
        message: error.message || 'Batch generation failed',
      };
    }
  }

  /**
   * Process batch script generation (background task) with resume capability
   */
  private static async processBatchGeneration(
    campaignId: Types.ObjectId,
    userId: Types.ObjectId,
    contacts: IContact[],
    campaign: ICampaign,
    model: AIModel,
    customPrompt: string | undefined,
    session: any // Pre-created GenerationSession
  ) {
    try {
      // Use the pre-created session passed as parameter
      console.log(
        `[ScriptGenerationService] Starting batch generation with session: ${session._id}`
      );

      // Start from last processed index + 1
      const startIndex = session.lastProcessedIndex + 1;

      for (let i = startIndex; i < contacts.length; i++) {
        const contact = contacts[i];

        try {
          const result = await this.generateScriptForContact(
            contact._id as Types.ObjectId,
            campaignId,
            userId,
            model,
            customPrompt
          );

          if (result.success) {
            session.successCount++;
          } else {
            session.failureCount++;
            session.errorLog.push({
              index: i,
              contactId: contact._id,
              error: result.error || 'Unknown error',
              timestamp: new Date(),
            });
          }
        } catch (error: any) {
          console.error(
            `[ScriptGenerationService] Failed for contact ${contact._id}:`,
            error
          );
          session.failureCount++;
          session.errorLog.push({
            index: i,
            contactId: contact._id,
            error: error.message || 'Unknown error',
            timestamp: new Date(),
          });
        }

        // Update session after each contact (for resume capability)
        session.lastProcessedIndex = i;
        session.lastUpdatedAt = new Date();
        await session.save();

        // Update campaign stats periodically (every 10 contacts)
        if ((session.successCount + session.failureCount) % 10 === 0) {
          campaign.stats.scriptsGenerated = session.successCount;
          await campaign.save();
        }
      }

      // Mark session as completed
      session.status = 'completed';
      session.completedAt = new Date();
      await session.save();

      // Update final campaign status
      campaign.stats.scriptsGenerated = session.successCount;
      campaign.status = session.successCount > 0 ? 'review' : 'draft';
      await campaign.save();

      console.log(
        `[ScriptGenerationService] Batch complete: ${session.successCount} succeeded, ${session.failureCount} failed`
      );
    } catch (error: any) {
      console.error('[ScriptGenerationService] processBatchGeneration error:', error);
      // Mark session as failed if it exists
      const session = await GenerationSession.findOne({
        campaignId,
        type: 'script_generation',
        status: 'in_progress',
      });
      if (session) {
        session.status = 'failed';
        session.completedAt = new Date();
        await session.save();
      }
    }
  }

  /**
   * Regenerate a single script
   */
  static async regenerateScript(
    scriptId: Types.ObjectId,
    userId: Types.ObjectId,
    customPrompt?: string,
    model?: AIModel
  ): Promise<ScriptGenerationResult> {
    try {
      const script = await VoicemailScript.findOne({ _id: scriptId, userId });
      if (!script) {
        return {
          success: false,
          error: 'Script not found',
        };
      }

      return this.generateScriptForContact(
        script.contactId,
        script.campaignId,
        userId,
        model || (script.aiModel as AIModel) || 'groq-llama3',
        customPrompt
      );
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Regeneration failed',
      };
    }
  }

  /**
   * Get batch generation progress
   */
  static async getBatchProgress(
    campaignId: Types.ObjectId
  ): Promise<BatchGenerationProgress> {
    const campaign = await Campaign.findById(campaignId);
    const totalContacts = campaign?.stats.totalContacts || 0;
    const scriptsGenerated = campaign?.stats.scriptsGenerated || 0;

    return {
      total: totalContacts,
      completed: scriptsGenerated,
      failed: 0, // TODO: Track failed count separately
      inProgress: campaign?.status === 'generating_scripts',
    };
  }

  /**
   * Build AI prompt for general script generation (no specific contact)
   */
  private static async buildGeneralPrompt(campaign: ICampaign, userId: Types.ObjectId, template?: string): Promise<string> {
    // Get agent info from User model
    const User = (await import('@/models/User')).default;
    const user = await User.findById(userId);

    console.log('[buildGeneralPrompt] User data:', {
      userId,
      hasUser: !!user,
      name: user?.name,
      phone: user?.phone,
      brokerageName: user?.brokerageName,
      teamName: user?.teamName,
    });

    // Throw error if required fields are missing - don't use placeholders
    if (!user?.name || !user?.phone || !user?.brokerageName) {
      throw new Error('Agent profile incomplete. Please complete your profile in Settings before generating scripts.');
    }

    const agentName = user.name;
    const agentPhone = user.phone;
    const brokerage = user.brokerageName;
    const teamName = user?.teamName || '';
    const website = user?.website || '';

    // Get agent's voice/personality training if available
    const voicePersonality = user?.voicePersonality || '';

    // Build campaign-specific hooks based on template (use template param, not campaign.type)
    const templateType = template || campaign.type || 'custom';
    let campaignHook = '';

    console.log('[buildGeneralPrompt] Using template:', templateType);

    switch (templateType) {
      case 'neighborhood_expireds':
      case 'expired_listing':
        campaignHook = 'Just saw that your property recently expired from the MLS and wanted to see if you were still interested in selling. Our office is currently accepting new listings in our portfolio.';
        break;
      case 'fsbo':
        campaignHook = 'I noticed you have your property listed for sale and wanted to reach out. Our office specializes in helping homeowners get top dollar for their properties with professional marketing.';
        break;
      case 'just_listed':
        campaignHook = 'I just listed a property in your neighborhood and wanted to reach out to nearby homeowners. Our office has been very active in the area with strong buyer demand.';
        break;
      case 'just_sold':
        campaignHook = 'We just successfully sold a property in your neighborhood and wanted to share our success with nearby homeowners. The market has been very strong for sellers.';
        break;
      case 'market_update':
        campaignHook = 'I wanted to share some valuable market insights with homeowners in your area. We\'ve been seeing strong activity and wanted to keep you informed about current trends.';
        break;
      default:
        campaignHook = 'I wanted to reach out about some exciting opportunities in the real estate market. Our office has been very active and I wanted to connect with homeowners in the area.';
    }

    // Build the general prompt - model it after the user's example
    const prompt = `You are a voicemail script writer. Create a professional real estate voicemail script.

CRITICAL INSTRUCTIONS:
1. Write EXACTLY 60-80 words (the script will be spoken word-for-word)
2. Use ONLY these ACTUAL values - NEVER use placeholders:
   - Agent: ${agentName}
   - Brokerage: ${brokerage}
   - Phone: ${agentPhone}${website ? `\n   - Website: ${website}` : ''}

3. Follow this EXACT structure (like the example below):
   a. Greeting: "Hey this is ${agentName} with ${brokerage}."
   b. Reason: ${campaignHook}
   c. Value: "I would be grateful for the opportunity to earn your business."
   d. CTA: "Please call me back at ${agentPhone} at your earliest convenience."${website ? `\n   e. Website: "You can learn more about me by visiting my website ${website}."` : ''}
   f. Close: "Thanks and have a great day!"

EXAMPLE (THIS IS THE STYLE TO MATCH - 71 words):
"Hey this is Joe with eXp Realty. Just saw that your property recently expired from the MLS and wanted to see if you were still interested in selling. Our office is currently accepting new listings in our portfolio. I would be grateful for the opportunity to earn your business. Please call me back at 760-333-3676 at your earliest convenience. You can learn more about me by visiting my website jpsrealtor.com. Thanks and have a great day!"

${voicePersonality ? `\nVOICE STYLE: ${voicePersonality}` : ''}

OUTPUT REQUIREMENTS:
- Start IMMEDIATELY with "Hey this is ${agentName}" - NO preamble or meta-text
- Use the actual values provided (${agentName}, ${brokerage}, ${agentPhone}${website ? `, ${website}` : ''})
- NEVER write [Your Name], [Your Phone], [Your Brokerage], or ANY placeholders
- 60-80 words exactly
- Conversational, professional, and warm tone

Generate the script now:`;

    return prompt;
  }

  /**
   * Build custom prompt with user AND contact data context (for personalized scripts)
   * This ensures custom prompts use actual user and contact data instead of placeholders
   */
  private static async buildCustomPromptWithContactData(
    customPrompt: string,
    contact: IContact,
    userId: Types.ObjectId
  ): Promise<string> {
    // Get agent info from User model
    const User = (await import('@/models/User')).default;
    const user = await User.findById(userId);

    console.log('[buildCustomPromptWithContactData] User data:', {
      userId,
      hasUser: !!user,
      name: user?.name,
      phone: user?.phone,
      brokerageName: user?.brokerageName,
    });

    // Throw error if required fields are missing
    if (!user?.name || !user?.phone || !user?.brokerageName) {
      throw new Error('Agent profile incomplete. Please complete your profile in Settings before generating scripts.');
    }

    const agentName = user.name;
    const agentPhone = user.phone;
    const brokerage = user.brokerageName;
    const website = user?.website || '';

    // Contact info
    const contactName = contact.firstName + (contact.lastName ? ` ${contact.lastName}` : '');
    const propertyAddress = contact.address?.street || '';
    const city = contact.address?.city || '';

    // Wrap the custom prompt with instructions to use actual user AND contact data
    const enhancedPrompt = `You are a voicemail script writer. Create a personalized real estate voicemail script based on the user's instructions below.

CRITICAL INSTRUCTIONS:
1. Write EXACTLY 60-80 words (the script will be spoken word-for-word)
2. Use ONLY these ACTUAL values - NEVER use placeholders like [Your Name], [First Name], [Your Phone], [Your Company]:
   - Agent Name: ${agentName}
   - Brokerage: ${brokerage}
   - Phone: ${agentPhone}${website ? `\n   - Website: ${website}` : ''}
   - Contact Name: ${contactName}${propertyAddress ? `\n   - Property Address: ${propertyAddress}` : ''}${city ? `\n   - City: ${city}` : ''}

3. USER'S CUSTOM INSTRUCTIONS:
${customPrompt}

4. OUTPUT REQUIREMENTS:
   - Start IMMEDIATELY with the spoken script - NO preamble or meta-text
   - Use the actual values provided (${agentName}, ${brokerage}, ${agentPhone}${contactName ? `, ${contactName}` : ''}${website ? `, ${website}` : ''})
   - NEVER write [Your Name], [First Name], [Last Name], [Your Phone], [Your Brokerage], or ANY placeholders
   - Replace ALL placeholder-style text with actual information
   - 60-80 words exactly
   - Conversational, professional, and warm tone

Generate the script now:`;

    console.log('[buildCustomPromptWithContactData] Enhanced prompt (first 300 chars):', enhancedPrompt.substring(0, 300));

    return enhancedPrompt;
  }

  /**
   * Build custom prompt with user data context (for general scripts)
   * This ensures custom prompts use actual user data instead of placeholders
   */
  private static async buildCustomPromptWithUserData(customPrompt: string, userId: Types.ObjectId): Promise<string> {
    // Get agent info from User model
    const User = (await import('@/models/User')).default;
    const user = await User.findById(userId);

    console.log('[buildCustomPromptWithUserData] User data:', {
      userId,
      hasUser: !!user,
      name: user?.name,
      phone: user?.phone,
      brokerageName: user?.brokerageName,
    });

    // Throw error if required fields are missing
    if (!user?.name || !user?.phone || !user?.brokerageName) {
      throw new Error('Agent profile incomplete. Please complete your profile in Settings before generating scripts.');
    }

    const agentName = user.name;
    const agentPhone = user.phone;
    const brokerage = user.brokerageName;
    const website = user?.website || '';

    // Wrap the custom prompt with instructions to use actual user data
    const enhancedPrompt = `You are a voicemail script writer. Create a professional real estate voicemail script based on the user's instructions below.

CRITICAL INSTRUCTIONS:
1. Write EXACTLY 60-80 words (the script will be spoken word-for-word)
2. Use ONLY these ACTUAL values - NEVER use placeholders like [Your Name], [Your Phone], [Your Company]:
   - Agent Name: ${agentName}
   - Brokerage: ${brokerage}
   - Phone: ${agentPhone}${website ? `\n   - Website: ${website}` : ''}

3. USER'S CUSTOM INSTRUCTIONS:
${customPrompt}

4. OUTPUT REQUIREMENTS:
   - Start IMMEDIATELY with the spoken script - NO preamble or meta-text
   - Use the actual values provided (${agentName}, ${brokerage}, ${agentPhone}${website ? `, ${website}` : ''})
   - NEVER write [Your Name], [First Name], [Your Phone], [Your Brokerage], or ANY placeholders
   - Replace ALL placeholder-style text with actual information
   - 60-80 words exactly
   - Conversational, professional, and warm tone

Generate the script now:`;

    console.log('[buildCustomPromptWithUserData] Enhanced prompt (first 300 chars):', enhancedPrompt.substring(0, 300));

    return enhancedPrompt;
  }

  /**
   * Build AI prompt for script generation
   */
  private static async buildPrompt(contact: IContact, campaign: ICampaign, userId: Types.ObjectId): Promise<string> {
    // Get agent info from User model
    const User = (await import('@/models/User')).default;
    const user = await User.findById(userId);

    console.log('[buildPrompt] User data:', {
      userId,
      hasUser: !!user,
      name: user?.name,
      phone: user?.phone,
      brokerageName: user?.brokerageName,
    });

    // Throw error if required fields are missing - don't use placeholders
    if (!user?.name || !user?.phone || !user?.brokerageName) {
      throw new Error('Agent profile incomplete. Please complete your profile in Settings before generating scripts.');
    }

    const agentName = user.name;
    const agentPhone = user.phone;
    const brokerage = user.brokerageName;
    const teamName = user?.teamName || '';

    // Contact info
    const contactName = contact.firstName + (contact.lastName ? ` ${contact.lastName}` : '');
    const propertyAddress = contact.address?.street || 'your property';
    const city = contact.address?.city || 'the area';

    // Campaign-specific context
    let campaignContext = '';
    switch (campaign.type) {
      case 'sphere_of_influence':
        campaignContext = 'You are reaching out to someone in your sphere of influence to check in and offer assistance with real estate needs.';
        break;
      case 'past_clients':
        campaignContext = 'You are following up with a past client to maintain the relationship and offer continued support.';
        break;
      case 'neighborhood_expireds':
        campaignContext = `You are reaching out to a property owner in ${campaign.neighborhood || city}. Mention your marketing expertise generally without specific claims about their listing.`;
        break;
      case 'high_equity':
        campaignContext = 'You are reaching out to a homeowner to offer a market discussion. DO NOT mention specific equity amounts or property values.';
        break;
      default:
        campaignContext = 'You are a real estate agent reaching out professionally.';
    }

    // Get agent's voice/personality training if available
    const voicePersonality = user?.voicePersonality || '';

    // Build the prompt
    const prompt = `You are creating a personalized voicemail script for a real estate agent's campaign.

Agent Information (USE THESE EXACT VALUES - DO NOT USE PLACEHOLDERS):
- Name: ${agentName}${brokerage ? `\n- Brokerage: ${brokerage}` : ''}${teamName ? `\n- Team: ${teamName}` : ''}
- Phone: ${agentPhone}

Contact Information (USE THESE EXACT VALUES - DO NOT USE PLACEHOLDERS):
- Name: ${contactName}
- Property Address: ${propertyAddress}
- City: ${city}

Campaign Type: ${campaign.type}
Campaign Context: ${campaignContext}

CRITICAL DATA RESTRICTION:
- ONLY use the actual data provided above (agent name, brokerage, phone, contact name, address, city)
- DO NOT invent or reference data we don't have such as:
  * Specific market statistics or home values
  * Recent sales data or comparable sales
  * Buyer names or buyer details
  * Equity amounts or property valuations
  * Listing expiration dates
  * Any specific numbers, dates, or statistics
- Keep references general and conversational
- If the template suggests specific data we don't have, speak in general terms instead

${voicePersonality ? `AGENT'S VOICE & PERSONALITY (CRITICAL - Match this style exactly):\n${voicePersonality}\n\n` : ''}

${campaign.scriptTemplate ? `Template to follow:\n${campaign.scriptTemplate}\n\n` : ''}

IMPORTANT REAL ESTATE TERMINOLOGY (CRITICAL - MUST FOLLOW):
- The agent works for a BROKERAGE (${brokerage}), NOT a "company" or "firm"
- NEVER say "company" - always use "brokerage" or the specific brokerage name
- If the agent has a team (${teamName || 'not applicable'}), you may reference it naturally
- Real estate agents are AGENTS who work for BROKERAGES, not companies
- ALWAYS use the agent's actual name (${agentName}), brokerage (${brokerage}), and phone (${agentPhone})
- DO NOT use placeholders like "[Your Company]", "[Company Name]", "[Your Brokerage]" - use the actual values provided above

Create a natural, conversational 30-45 second voicemail script that:
1. Introduces ${agentName} warmly and professionally
2. References the specific property or situation naturally
3. Provides clear value proposition relevant to the campaign type
4. Ends with a soft call-to-action (callback number)
5. Sounds human and authentic - NOT salesy or robotic
6. Uses natural pauses and conversational language
7. Mentions ${agentPhone} for callback
8. Keep it between 30-45 seconds when spoken aloud (roughly 75-120 words)
${voicePersonality ? '9. MOST IMPORTANTLY: Match the agent\'s personality, speaking style, and tone described above' : ''}

CRITICAL INSTRUCTIONS - OUTPUT FORMAT:
- OUTPUT ONLY THE RAW SPOKEN DIALOGUE
- DO NOT include ANY introductory text like "Here is a script" or "Below is..."
- DO NOT include ANY explanatory commentary or meta-text
- DO NOT use markdown formatting (no #, ##, *, -, >, etc.)
- DO NOT include stage directions or instructions
- DO NOT include multiple script options - just ONE script
- DO NOT include headings, bullet points, or section markers
- DO NOT use placeholders like [Client's Name], [Your Company], etc. - USE THE ACTUAL VALUES PROVIDED ABOVE
- JUST the raw voicemail text that will be spoken word-for-word with all real names, numbers, and addresses filled in

Your response should start immediately with the first word of the voicemail (e.g., "Hi" or "Hello") and end with the last word of the script.

Generate the script now:`;

    return prompt;
  }

  /**
   * Call AI service to generate script
   */
  private static async callAI(prompt: string, model: AIModel): Promise<string> {
    try {
      let rawScript = '';
      if (model === 'groq-llama3') {
        rawScript = await this.callGroq(prompt);
      } else if (model.startsWith('claude')) {
        rawScript = await this.callClaude(prompt, model);
      } else {
        throw new Error(`Unsupported model: ${model}`);
      }

      // Clean up the script to remove any extra formatting or commentary
      return this.cleanScriptOutput(rawScript);
    } catch (error: any) {
      console.error('[ScriptGenerationService] AI call failed:', error);
      throw error;
    }
  }

  /**
   * Clean up AI-generated script output to remove markdown, commentary, etc.
   */
  private static cleanScriptOutput(rawOutput: string): string {
    let cleaned = rawOutput.trim();

    // Remove common intro phrases
    const introPhrases = [
      /^(Here is a|Here's a|Below is a|Below are|Here are).*?(script|voicemail).*?[:.\n]/i,
      /^(I've created|I created|I've written|I wrote).*?[:.\n]/i,
      /^(This|The following).*?(script|voicemail).*?[:.\n]/i,
    ];

    for (const phrase of introPhrases) {
      cleaned = cleaned.replace(phrase, '');
    }

    // Remove markdown headers (##, ###, etc.)
    cleaned = cleaned.replace(/^#+\s+.+$/gm, '');

    // Remove markdown bullet points (-, *, >)
    cleaned = cleaned.replace(/^[-*>]\s+/gm, '');

    // Remove quoted blocks
    cleaned = cleaned.replace(/^>\s+/gm, '');

    // Remove horizontal rules (---, ___, ***)
    cleaned = cleaned.replace(/^[-_*]{3,}$/gm, '');

    // Remove any lines that look like section markers or explanations
    cleaned = cleaned.replace(/^(Note:|Tips?:|Example:).*$/gim, '');

    // Remove emoji-prefixed headings (e.g., "## 📞 For a...")
    cleaned = cleaned.replace(/^##?\s*[\p{Emoji}].*$/gmu, '');

    // Remove any remaining markdown bold/italic
    cleaned = cleaned.replace(/[*_]{1,2}([^*_]+)[*_]{1,2}/g, '$1');

    // If there are multiple paragraphs separated by blank lines, take only the first substantial one
    const paragraphs = cleaned.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    if (paragraphs.length > 1) {
      // Find the first paragraph that looks like actual dialogue (starts with a greeting)
      const dialoguePara = paragraphs.find(p =>
        /^(Hi|Hello|Hey|Good morning|Good afternoon|Good evening)/i.test(p.trim())
      );
      cleaned = dialoguePara || paragraphs[0];
    }

    // Clean up any remaining extra whitespace
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();

    return cleaned;
  }

  /**
   * Personalize script by replacing placeholders with actual contact data
   */
  private static personalizeScript(
    script: string,
    contact: IContact,
    user: any
  ): string {
    let personalized = script;

    // Contact information
    const firstName = contact.firstName || '';
    const lastName = contact.lastName || '';
    const fullName = `${firstName} ${lastName}`.trim();
    const propertyAddress = contact.address?.street || 'your property';
    const city = contact.address?.city || '';
    const state = contact.address?.state || '';
    const zip = contact.address?.zip || '';
    const fullAddress = [propertyAddress, city, state, zip].filter(Boolean).join(', ');

    // Agent information
    const agentName = user?.name || 'Your Agent';
    const agentFirstName = agentName.split(' ')[0];
    const agentPhone = user?.phone || 'your phone number';
    const brokerage = user?.brokerageName || '';
    const teamName = user?.teamName || '';

    // Define all possible placeholder variations
    const replacements: Record<string, string> = {
      // Homeowner/Contact placeholders
      '[Homeowner\'s Name]': fullName,
      '[Homeowner Name]': fullName,
      '[homeowner\'s name]': fullName,
      '[homeowner name]': fullName,
      '[Contact\'s Name]': fullName,
      '[Contact Name]': fullName,
      '[contact\'s name]': fullName,
      '[contact name]': fullName,
      '[Name]': fullName,
      '[First Name]': firstName,
      '[first name]': firstName,
      '[Last Name]': lastName,
      '[last name]': lastName,
      '[Client\'s Name]': fullName,
      '[Client Name]': fullName,
      '[client\'s name]': fullName,
      '[client name]': fullName,
      '[Owner\'s Name]': fullName,
      '[Owner Name]': fullName,
      '[owner\'s name]': fullName,
      '[owner name]': fullName,

      // Agent placeholders
      '[Your Name]': agentName,
      '[your name]': agentName,
      '[Agent Name]': agentName,
      '[agent name]': agentName,
      '[Your First Name]': agentFirstName,
      '[your first name]': agentFirstName,

      // Brokerage placeholders
      '[Your Brokerage]': brokerage,
      '[your brokerage]': brokerage,
      '[Brokerage]': brokerage,
      '[brokerage]': brokerage,
      '[Brokerage Name]': brokerage,
      '[brokerage name]': brokerage,

      // Company placeholders (incorrect but sometimes used - replace with brokerage)
      '[Your Company]': brokerage,
      '[your company]': brokerage,
      '[Company]': brokerage,
      '[company]': brokerage,
      '[Company Name]': brokerage,
      '[company name]': brokerage,
      '[Your Firm]': brokerage,
      '[your firm]': brokerage,
      '[Firm]': brokerage,
      '[firm]': brokerage,

      // Team placeholders
      '[Your Team]': teamName,
      '[your team]': teamName,
      '[Team]': teamName,
      '[team]': teamName,
      '[Team Name]': teamName,
      '[team name]': teamName,

      // Phone placeholders
      '[Your Phone Number]': agentPhone,
      '[your phone number]': agentPhone,
      '[Phone Number]': agentPhone,
      '[phone number]': agentPhone,
      '[Your Number]': agentPhone,
      '[your number]': agentPhone,
      '[Callback Number]': agentPhone,
      '[callback number]': agentPhone,

      // Address placeholders
      '[Address]': propertyAddress,
      '[address]': propertyAddress,
      '[Property Address]': propertyAddress,
      '[property address]': propertyAddress,
      '[Full Address]': fullAddress,
      '[full address]': fullAddress,
      '[Street Address]': propertyAddress,
      '[street address]': propertyAddress,
      '[Home Address]': propertyAddress,
      '[home address]': propertyAddress,

      // Location placeholders
      '[City]': city,
      '[city]': city,
      '[State]': state,
      '[state]': state,
      '[Zip]': zip,
      '[zip]': zip,
      '[ZIP Code]': zip,
      '[zip code]': zip,
    };

    // Apply all replacements
    for (const [placeholder, value] of Object.entries(replacements)) {
      if (value) {  // Only replace if we have a value
        personalized = personalized.split(placeholder).join(value);
      }
    }

    return personalized;
  }

  /**
   * Call Groq API (using GPT-OSS 120B - same as chat-v2)
   */
  private static async callGroq(prompt: string): Promise<string> {
    try {
      console.log('[callGroq] Making API call to Groq...');

      const completion = await groq.chat.completions.create({
        model: 'openai/gpt-oss-120b', // GPT-OSS 120B - same model as chat-v2
        messages: [
          {
            role: 'system',
            content:
              'You are an expert real estate voicemail script writer. Output ONLY the raw spoken dialogue with no introductory text, markdown formatting, or commentary. Just the script text itself.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 2048, // Increased to handle edge cases with token counting
      });

      console.log('[callGroq] API response:', {
        hasChoices: !!completion.choices && completion.choices.length > 0,
        choicesLength: completion.choices?.length,
        hasMessage: !!completion.choices?.[0]?.message,
        hasContent: !!completion.choices?.[0]?.message?.content,
        contentLength: completion.choices?.[0]?.message?.content?.length,
        finishReason: completion.choices?.[0]?.finish_reason,
      });

      const content = completion.choices?.[0]?.message?.content;
      const finishReason = completion.choices?.[0]?.finish_reason;

      // Handle specific finish reasons
      if (finishReason === 'length' && (!content || content.trim().length === 0)) {
        throw new Error('Groq API hit token limit before generating response. Try using a shorter prompt or switch to Claude.');
      }

      if (!content || content.trim().length === 0) {
        throw new Error('Groq API returned empty response. This may be due to rate limiting or API issues.');
      }

      return content;
    } catch (error: any) {
      console.error('[callGroq] Error:', {
        message: error.message,
        status: error.status,
        code: error.code,
        type: error.type,
      });
      throw new Error(`Groq API error: ${error.message}`);
    }
  }

  /**
   * Call Claude API
   */
  private static async callClaude(prompt: string, model: AIModel): Promise<string> {
    const modelName =
      model === 'claude-3.5-sonnet'
        ? 'claude-3-5-sonnet-20241022'
        : 'claude-3-haiku-20240307';

    const message = await anthropic.messages.create({
      model: modelName,
      max_tokens: 300,
      temperature: 0.7,
      system:
        'You are an expert real estate voicemail script writer. Output ONLY the raw spoken dialogue with no introductory text, markdown formatting, or commentary. Just the script text itself.',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = message.content[0];
    if (content.type === 'text') {
      return content.text;
    }

    return '';
  }

  /**
   * Apply script template with variable substitution
   */
  static applyTemplate(
    template: string,
    variables: Record<string, string>
  ): string {
    let result = template;

    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{${key}\\}`, 'g');
      result = result.replace(regex, value);
    }

    return result;
  }

  /**
   * Validate script length (should be 30-45 seconds spoken)
   */
  static validateScriptLength(script: string): {
    valid: boolean;
    wordCount: number;
    estimatedSeconds: number;
    message?: string;
  } {
    const words = script.trim().split(/\s+/).length;
    // Average speaking rate: ~150 words per minute = 2.5 words per second
    const estimatedSeconds = words / 2.5;

    if (estimatedSeconds < 25) {
      return {
        valid: false,
        wordCount: words,
        estimatedSeconds,
        message: 'Script is too short. Aim for 30-45 seconds (75-120 words).',
      };
    } else if (estimatedSeconds > 50) {
      return {
        valid: false,
        wordCount: words,
        estimatedSeconds,
        message: 'Script is too long. Aim for 30-45 seconds (75-120 words).',
      };
    }

    return {
      valid: true,
      wordCount: words,
      estimatedSeconds,
    };
  }
}
