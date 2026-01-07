/**
 * Audio Generation Service
 *
 * Handles:
 * - 11Labs text-to-speech generation
 * - 11Labs streaming for preview
 * - Cloudinary storage for audio files
 * - Storage management and cleanup
 */

import { v2 as cloudinary } from 'cloudinary';
import { Types } from 'mongoose';
import VoicemailScript from '@/models/VoicemailScript';

// Cloudinary configuration
const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

// Configure Cloudinary
cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
});

// 11Labs configuration
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

// Default voice ID (Joseph's voice - configure in env)
const DEFAULT_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM'; // Rachel voice as default

// Validate API keys at startup
if (!ELEVENLABS_API_KEY) {
  console.error('[AudioGenerationService] ELEVENLABS_API_KEY is not set in environment variables');
}
if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
  console.error('[AudioGenerationService] Cloudinary credentials are not set in environment variables');
  console.error('  Missing:', {
    CLOUDINARY_CLOUD_NAME: !CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY: !CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET: !CLOUDINARY_API_SECRET,
  });
}

export interface AudioGenerationResult {
  success: boolean;
  audioUrl?: string;
  cloudinaryPublicId?: string;
  elevenLabsId?: string;
  duration?: number;
  error?: string;
}

export interface StorageStats {
  totalUsed: number; // bytes
  totalAllowed: number; // bytes
  usagePercent: number;
  audioCount: number;
  oldestAudio?: Date;
}

export class AudioGenerationService {
  /**
   * Generate audio from script using 11Labs
   * Saves to Cloudinary and updates VoicemailScript record
   */
  static async generateAudio(
    scriptId: Types.ObjectId,
    userId: Types.ObjectId,
    voiceId: string = DEFAULT_VOICE_ID
  ): Promise<AudioGenerationResult> {
    try {
      // Get script
      const script = await (VoicemailScript as any).findOne({ _id: scriptId, userId });
      if (!script) {
        return { success: false, error: 'Script not found' };
      }

      // Update status to generating
      script.audio.status = 'generating';
      await script.save();

      // Call 11Labs API
      const audioBuffer = await this.callElevenLabs(script.script, voiceId);

      // Upload to Cloudinary
      const cloudinaryResult = await this.uploadToCloudinary(
        audioBuffer,
        `voicemail_${scriptId}`,
        {
          campaignId: script.campaignId.toString(),
          contactId: script.contactId.toString(),
          userId: userId.toString(),
        }
      );

      // Update script with audio info
      script.audio = {
        status: 'completed',
        url: cloudinaryResult.secure_url,
        elevenLabsId: cloudinaryResult.public_id,
        voiceId,
        duration: cloudinaryResult.duration,
        generatedAt: new Date(),
      };
      await script.save();

      return {
        success: true,
        audioUrl: cloudinaryResult.secure_url,
        cloudinaryPublicId: cloudinaryResult.public_id,
        duration: cloudinaryResult.duration,
      };
    } catch (error: any) {
      console.error('[AudioGenerationService] Generation failed:', error);

      // Update script status to failed
      try {
        const script = await (VoicemailScript as any).findById(scriptId);
        if (script) {
          script.audio.status = 'failed';
          script.audio.error = error.message;
          await script.save();
        }
      } catch {}

      return {
        success: false,
        error: error.message || 'Audio generation failed',
      };
    }
  }

  /**
   * Stream audio preview from 11Labs (for testing before saving)
   * Returns ReadableStream that can be piped to response
   */
  static async streamAudioPreview(
    text: string,
    voiceId: string = DEFAULT_VOICE_ID
  ): Promise<ReadableStream> {
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ELEVENLABS_API_KEY is not configured. Please add it to your .env.local file and restart the dev server.');
    }

    const response = await fetch(
      `${ELEVENLABS_API_URL}/text-to-speech/${voiceId}/stream`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`11Labs API error: ${response.statusText}`);
    }

    return response.body!;
  }

  /**
   * Delete audio from Cloudinary
   */
  static async deleteAudio(publicId: string): Promise<boolean> {
    try {
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: 'video', // Audio files are stored as video type in Cloudinary
      });

      return result.result === 'ok';
    } catch (error: any) {
      console.error('[AudioGenerationService] Delete failed:', error);
      return false;
    }
  }

  /**
   * Delete audio and update VoicemailScript
   */
  static async deleteScriptAudio(
    scriptId: Types.ObjectId,
    userId: Types.ObjectId
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const script = await (VoicemailScript as any).findOne({ _id: scriptId, userId });
      if (!script) {
        return { success: false, error: 'Script not found' };
      }

      if (script.audio.elevenLabsId) {
        await this.deleteAudio(script.audio.elevenLabsId);
      }

      // Reset audio status
      script.audio = {
        status: 'pending',
      };
      await script.save();

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Archive campaign (delete all audio, keep scripts)
   */
  static async archiveCampaign(
    campaignId: Types.ObjectId,
    userId: Types.ObjectId
  ): Promise<{
    success: boolean;
    deletedCount: number;
    error?: string;
  }> {
    try {
      const scripts = await (VoicemailScript as any).find({ campaignId, userId });

      let deletedCount = 0;
      for (const script of scripts) {
        if (script.audio.elevenLabsId) {
          const deleted = await this.deleteAudio(script.audio.elevenLabsId);
          if (deleted) deletedCount++;

          // Reset audio status
          script.audio = { status: 'pending' };
          await script.save();
        }
      }

      return { success: true, deletedCount };
    } catch (error: any) {
      return { success: false, deletedCount: 0, error: error.message };
    }
  }

  /**
   * Get Cloudinary storage stats
   */
  static async getStorageStats(): Promise<StorageStats> {
    try {
      // Get usage from Cloudinary API
      const usage = await cloudinary.api.usage();

      // Get all audio files
      const audioResources = await cloudinary.api.resources({
        resource_type: 'video',
        type: 'upload',
        max_results: 500,
      });

      // Calculate oldest audio
      let oldestAudio: Date | undefined;
      if (audioResources.resources.length > 0) {
        const oldest = audioResources.resources.reduce((prev: any, curr: any) =>
          new Date(prev.created_at) < new Date(curr.created_at) ? prev : curr
        );
        oldestAudio = new Date(oldest.created_at);
      }

      return {
        totalUsed: usage.storage.usage,
        totalAllowed: usage.storage.limit,
        usagePercent: (usage.storage.usage / usage.storage.limit) * 100,
        audioCount: audioResources.resources.length,
        oldestAudio,
      };
    } catch (error: any) {
      console.error('[AudioGenerationService] Storage stats failed:', error);
      return {
        totalUsed: 0,
        totalAllowed: 0,
        usagePercent: 0,
        audioCount: 0,
      };
    }
  }

  /**
   * Delete old audio files (older than X days)
   */
  static async deleteOldAudio(
    daysOld: number = 90
  ): Promise<{ success: boolean; deletedCount: number; error?: string }> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      // Get all audio files
      const audioResources = await cloudinary.api.resources({
        resource_type: 'video',
        type: 'upload',
        max_results: 500,
      });

      let deletedCount = 0;
      for (const resource of audioResources.resources) {
        const createdAt = new Date(resource.created_at);
        if (createdAt < cutoffDate) {
          await cloudinary.uploader.destroy(resource.public_id, {
            resource_type: 'video',
          });
          deletedCount++;

          // Update VoicemailScript if exists
          await VoicemailScript.updateMany(
            { 'audio.elevenLabsId': resource.public_id },
            { $set: { 'audio.status': 'pending', 'audio.url': null } }
          );
        }
      }

      return { success: true, deletedCount };
    } catch (error: any) {
      return { success: false, deletedCount: 0, error: error.message };
    }
  }

  /**
   * Private: Call 11Labs API
   */
  private static async callElevenLabs(
    text: string,
    voiceId: string
  ): Promise<Buffer> {
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ELEVENLABS_API_KEY is not configured. Please add it to your .env.local file and restart the dev server.');
    }

    const response = await fetch(
      `${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`11Labs API error: ${error.detail || response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * Private: Upload audio to Cloudinary
   */
  private static async uploadToCloudinary(
    audioBuffer: Buffer,
    filename: string,
    tags: Record<string, string>
  ): Promise<any> {
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
      throw new Error(
        'Cloudinary credentials are not configured. Please add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to your .env.local file and restart the dev server.'
      );
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'video', // Audio files are stored as video type
          public_id: filename,
          folder: 'voicemail-campaigns',
          tags: Object.values(tags),
          context: tags,
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );

      uploadStream.end(audioBuffer);
    });
  }
}
