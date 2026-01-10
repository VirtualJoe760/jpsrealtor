// app/api/campaigns/[id]/recordings/list/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import Campaign from '@/models/Campaign';
import { Types } from 'mongoose';

const DROP_COWBOY_TEAM_ID = process.env.DROP_COWBOY_TEAM_ID;
const DROP_COWBOY_SECRET = process.env.DROP_COWBOY_SECRET;
const DROP_COWBOY_API_URL = 'https://api.dropcowboy.com/v1';

interface DropCowboyRecording {
  media_id: string;
  name: string;
  duration: number;
  date_added: string;
  file_size_kb?: number;
  preview_url?: string;
}

/**
 * GET - Fetch list of available Drop Cowboy recordings
 *
 * This endpoint fetches the list of pre-uploaded recordings from the Drop Cowboy account.
 * Users must manually upload recordings to Drop Cowboy's web portal first.
 *
 * @returns Array of recordings with: media_id, name, duration, date_added
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📋 FETCH DROP COWBOY RECORDINGS - STARTING');
  console.log('═══════════════════════════════════════════════════════════');

  try {
    // 1. Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      console.error('❌ Unauthorized request');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = session.user as any;
    const userId = new Types.ObjectId(user.id);
    const { id: campaignId } = await params;

    console.log('📋 Request Parameters:');
    console.log('   User ID:', userId.toString());
    console.log('   Campaign ID:', campaignId);

    // 2. Validate Drop Cowboy credentials
    if (!DROP_COWBOY_TEAM_ID || !DROP_COWBOY_SECRET) {
      console.error('❌ Drop Cowboy credentials not configured');
      return NextResponse.json(
        {
          success: false,
          error: 'Drop Cowboy API credentials not configured. Please contact support.'
        },
        { status: 500 }
      );
    }

    console.log('✅ Drop Cowboy credentials verified');

    await dbConnect();

    // 3. Verify campaign ownership
    const campaign = await (Campaign as any).findOne({
      _id: new Types.ObjectId(campaignId),
      userId,
    });

    if (!campaign) {
      console.error('❌ Campaign not found or access denied');
      return NextResponse.json(
        { success: false, error: 'Campaign not found or access denied' },
        { status: 404 }
      );
    }

    console.log('✅ Campaign found:', campaign.name);

    // 4. Fetch recordings from Drop Cowboy
    console.log('🔄 Fetching recordings from Drop Cowboy...');

    const payload = {
      team_id: DROP_COWBOY_TEAM_ID,
      secret: DROP_COWBOY_SECRET,
    };

    console.log('📤 Drop Cowboy API Request:', {
      url: `${DROP_COWBOY_API_URL}/media`,
      team_id: DROP_COWBOY_TEAM_ID.substring(0, 10) + '...',
    });

    const response = await fetch(`${DROP_COWBOY_API_URL}/media`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Drop Cowboy API error:', response.status, errorText);
      return NextResponse.json(
        {
          success: false,
          error: `Failed to fetch recordings from Drop Cowboy: ${response.statusText}`,
          details: errorText
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ Drop Cowboy response received');
    console.log('📊 Recordings count:', Array.isArray(data) ? data.length : 0);
    console.log('📋 RAW Drop Cowboy response (first item):', JSON.stringify(Array.isArray(data) ? data[0] : data, null, 2));

    // 5. Parse and format recordings
    let recordings: DropCowboyRecording[] = [];

    if (Array.isArray(data)) {
      recordings = data.map((item: any) => ({
        media_id: item.media_id || '',
        name: item.name || 'Unnamed Recording',
        duration: parseInt(item.duration) || 0,
        date_added: item.date_added || new Date().toISOString(),
        file_size_kb: item.file_size_kb ? parseInt(item.file_size_kb) : undefined,
        preview_url: item.preview_url || undefined,
      }));

      console.log('✅ Formatted recordings:', recordings.length);
      console.log('📋 Sample recording:', recordings[0]);
      console.log('📋 Raw data fields available:', Object.keys(data[0] || {}));
    } else {
      console.warn('⚠️ Unexpected response format from Drop Cowboy');
      console.log('   Response data:', data);
    }

    // 6. Return formatted list
    return NextResponse.json({
      success: true,
      recordings,
      count: recordings.length,
    });

  } catch (error: any) {
    console.error('❌ Error fetching recordings:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch recordings',
        details: error.message
      },
      { status: 500 }
    );
  }
}
