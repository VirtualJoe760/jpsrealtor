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
      const prompt = customPrompt || this.buildPrompt(contact, campaign);

      // Call AI to generate script
      const scriptText = await this.callAI(prompt, model);

      // Create or update script
      if (existingScript) {
        existingScript.script = scriptText;
        existingScript.scriptVersion += 1;
        existingScript.aiModel = model;
        existingScript.generationPrompt = prompt;
        existingScript.generatedBy = 'ai';
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
    model: AIModel = 'groq-llama3'
  ): Promise<{
    success: boolean;
    jobId: string;
    message: string;
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

      // Generate scripts for each contact (in background)
      // In production, this should use a job queue (Bull, etc.)
      this.processBatchGeneration(campaignId, userId, contacts, campaign, model);

      return {
        success: true,
        jobId: campaignId.toString(),
        message: `Generating scripts for ${contacts.length} contacts`,
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
   * Process batch script generation (background task)
   */
  private static async processBatchGeneration(
    campaignId: Types.ObjectId,
    userId: Types.ObjectId,
    contacts: IContact[],
    campaign: ICampaign,
    model: AIModel
  ) {
    let completed = 0;
    let failed = 0;

    for (const contact of contacts) {
      try {
        const result = await this.generateScriptForContact(
          contact._id,
          campaignId,
          userId,
          model
        );

        if (result.success) {
          completed++;
        } else {
          failed++;
        }

        // Update campaign stats periodically
        if ((completed + failed) % 10 === 0) {
          campaign.stats.scriptsGenerated = completed;
          await campaign.save();
        }
      } catch (error) {
        console.error(
          `[ScriptGenerationService] Failed for contact ${contact._id}:`,
          error
        );
        failed++;
      }
    }

    // Update final campaign status
    campaign.stats.scriptsGenerated = completed;
    campaign.status = completed > 0 ? 'review' : 'draft';
    await campaign.save();

    console.log(
      `[ScriptGenerationService] Batch complete: ${completed} succeeded, ${failed} failed`
    );
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
   * Build AI prompt for script generation
   */
  private static buildPrompt(contact: IContact, campaign: ICampaign): string {
    // Agent info (hardcoded for now - should come from User model)
    const agentName = 'Joseph Sardella';
    const agentPhone = '(760) 899-6988';
    const brokerage = 'eXp Realty';

    // Contact info
    const contactName = contact.firstName + (contact.lastName ? ` ${contact.lastName}` : '');
    const propertyAddress = contact.address?.street || 'your property';
    const city = contact.address?.city || 'the area';

    // Campaign-specific context
    let campaignContext = '';
    switch (campaign.type) {
      case 'sphere_of_influence':
        campaignContext = 'You are reaching out to someone in your sphere of influence to provide them with a market update.';
        break;
      case 'past_clients':
        campaignContext = 'You are following up with a past client to maintain the relationship and offer continued support.';
        break;
      case 'neighborhood_expireds':
        campaignContext = `You are reaching out about an expired listing in ${campaign.neighborhood || city}. Offer fresh perspective and proven marketing strategies.`;
        break;
      case 'high_equity':
        campaignContext = 'You are reaching out to a homeowner with significant equity to discuss potential opportunities.';
        break;
      default:
        campaignContext = 'You are a real estate agent reaching out with valuable information.';
    }

    // Build the prompt
    const prompt = `You are creating a personalized voicemail script for a real estate agent's campaign.

Agent Information:
- Name: ${agentName}
- Brokerage: ${brokerage}
- Phone: ${agentPhone}

Contact Information:
- Name: ${contactName}
- Property Address: ${propertyAddress}
- City: ${city}

Campaign Type: ${campaign.type}
Campaign Context: ${campaignContext}

${campaign.scriptTemplate ? `Template to follow:\n${campaign.scriptTemplate}\n\n` : ''}

Create a natural, conversational 30-45 second voicemail script that:
1. Introduces ${agentName} warmly and professionally
2. References the specific property or situation naturally
3. Provides clear value proposition relevant to the campaign type
4. Ends with a soft call-to-action (callback number)
5. Sounds human and authentic - NOT salesy or robotic
6. Uses natural pauses and conversational language
7. Mentions ${agentPhone} for callback

IMPORTANT:
- Return ONLY the voicemail script text
- Do NOT include any stage directions, formatting marks, or meta-commentary
- Write it as it should be spoken, naturally
- Keep it between 30-45 seconds when spoken aloud (roughly 75-120 words)

Example tone: "Hi [Name], this is [Agent] with [Brokerage]. I noticed [specific detail about their property/situation], and I wanted to reach out because [value proposition]. I'd love to chat with you briefly about [specific opportunity]. You can reach me at [phone]. Thanks, and I look forward to speaking with you!"

Generate the script now:`;

    return prompt;
  }

  /**
   * Call AI service to generate script
   */
  private static async callAI(prompt: string, model: AIModel): Promise<string> {
    try {
      if (model === 'groq-llama3') {
        return await this.callGroq(prompt);
      } else if (model.startsWith('claude')) {
        return await this.callClaude(prompt, model);
      } else {
        throw new Error(`Unsupported model: ${model}`);
      }
    } catch (error: any) {
      console.error('[ScriptGenerationService] AI call failed:', error);
      throw error;
    }
  }

  /**
   * Call Groq API
   */
  private static async callGroq(prompt: string): Promise<string> {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content:
            'You are an expert real estate voicemail script writer. Create natural, conversational scripts that sound authentic and professional.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 300,
    });

    return completion.choices[0]?.message?.content || '';
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
        'You are an expert real estate voicemail script writer. Create natural, conversational scripts that sound authentic and professional.',
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
