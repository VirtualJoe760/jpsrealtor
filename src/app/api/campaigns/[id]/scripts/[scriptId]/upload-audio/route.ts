// app/api/campaigns/[id]/scripts/[scriptId]/upload-audio/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongoose';
import VoicemailScript from '@/models/VoicemailScript';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

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

/**
 * POST /api/campaigns/[id]/scripts/[scriptId]/upload-audio
 * Upload user-recorded audio for a voicemail script
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; scriptId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    const { id: campaignId, scriptId } = await params;

    console.log('[upload-audio] Received request:', {
      campaignId,
      scriptId,
      userId: session.user.id
    });

    // Get the audio file from form data
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json(
        { success: false, error: 'No audio file provided' },
        { status: 400 }
      );
    }

    console.log('[upload-audio] Audio file received:', {
      name: audioFile.name,
      size: audioFile.size,
      type: audioFile.type
    });

    // Verify script exists and belongs to user
    const script = await VoicemailScript.findOne({
      _id: scriptId,
      campaignId,
      userId: session.user.id
    });

    console.log('[upload-audio] Script query result:', {
      found: !!script,
      scriptId,
      campaignId,
      userId: session.user.id
    });

    if (!script) {
      // Additional debugging - let's see if the script exists at all
      const anyScript = await VoicemailScript.findById(scriptId);
      console.log('[upload-audio] Script exists without filters:', {
        exists: !!anyScript,
        actualCampaignId: anyScript?.campaignId,
        actualUserId: anyScript?.userId
      });

      return NextResponse.json(
        { success: false, error: 'Script not found' },
        { status: 404 }
      );
    }

    // Validate Cloudinary configuration
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
      console.error('[upload-audio] Cloudinary credentials missing:', {
        CLOUDINARY_CLOUD_NAME: !CLOUDINARY_CLOUD_NAME,
        CLOUDINARY_API_KEY: !CLOUDINARY_API_KEY,
        CLOUDINARY_API_SECRET: !CLOUDINARY_API_SECRET,
      });
      return NextResponse.json(
        {
          success: false,
          error: 'Cloudinary credentials are not configured. Please add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to your .env.local file and restart the dev server.'
        },
        { status: 500 }
      );
    }

    // Convert File to Buffer
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Cloudinary
    const uploadResult = await new Promise<any>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'video', // Audio files are stored as video type
          public_id: `voicemail_user_recorded_${scriptId}`,
          folder: 'voicemail-campaigns/user-recorded',
          tags: [
            campaignId,
            session.user.id,
            script.contactId ? script.contactId.toString() : 'general',
            'user-recorded'
          ],
          context: {
            campaignId,
            contactId: script.contactId ? script.contactId.toString() : 'general',
            userId: session.user.id,
            recordedBy: 'user',
            isGeneral: script.isGeneral || false
          },
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );

      uploadStream.end(buffer);
    });

    // Update script with audio info
    script.audio = {
      status: 'completed',
      url: uploadResult.secure_url,
      elevenLabsId: uploadResult.public_id,
      voiceId: 'user-recorded',
      duration: uploadResult.duration,
      generatedAt: new Date(),
    };
    await script.save();

    return NextResponse.json({
      success: true,
      audioUrl: uploadResult.secure_url,
      duration: uploadResult.duration,
    });

  } catch (error: any) {
    console.error('[upload-audio] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Upload failed' },
      { status: 500 }
    );
  }
}
