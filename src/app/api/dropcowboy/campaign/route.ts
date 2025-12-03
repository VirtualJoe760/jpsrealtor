import { NextRequest, NextResponse } from 'next/server';

const DROP_COWBOY_TEAM_ID = process.env.DROP_COWBOY_TEAM_ID;
const DROP_COWBOY_SECRET = process.env.DROP_COWBOY_SECRET;
const DROP_COWBOY_API_URL = 'https://api.dropcowboy.com/v1';

interface ContactRow {
  phone: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  postalCode?: string;
  [key: string]: any;
}

export async function POST(req: NextRequest) {
  try {
    if (!DROP_COWBOY_TEAM_ID || !DROP_COWBOY_SECRET) {
      return NextResponse.json(
        { error: 'Drop Cowboy credentials not configured' },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const contactsFile = formData.get('contacts') as File | null;
    const audioFile = formData.get('audio') as File | null;
    const campaignName = formData.get('campaignName') as string;
    const brandId = formData.get('brandId') as string; // Required for TCPA compliance
    const forwardingNumber = formData.get('forwardingNumber') as string; // For replies

    if (!contactsFile) {
      return NextResponse.json(
        { error: 'Contacts file is required' },
        { status: 400 }
      );
    }

    if (!audioFile) {
      return NextResponse.json(
        { error: 'Audio file is required' },
        { status: 400 }
      );
    }

    if (!campaignName) {
      return NextResponse.json(
        { error: 'Campaign name is required' },
        { status: 400 }
      );
    }

    if (!brandId) {
      return NextResponse.json(
        { error: 'Brand ID is required for TCPA compliance' },
        { status: 400 }
      );
    }

    if (!forwardingNumber) {
      return NextResponse.json(
        { error: 'Forwarding number is required for replies' },
        { status: 400 }
      );
    }

    // Parse contacts file (CSV)
    const contactsText = await contactsFile.text();
    const contacts = parseCSV(contactsText);

    if (contacts.length === 0) {
      return NextResponse.json(
        { error: 'No valid contacts found in file' },
        { status: 400 }
      );
    }

    // Step 1: Upload audio to Drop Cowboy
    console.log('Uploading audio to Drop Cowboy...');
    const audioArrayBuffer = await audioFile.arrayBuffer();
    const audioBase64 = Buffer.from(audioArrayBuffer).toString('base64');

    const uploadResponse = await uploadRecording(audioFile.name, audioBase64);

    if (!uploadResponse.success) {
      return NextResponse.json(
        { error: 'Failed to upload audio', details: uploadResponse.error },
        { status: 500 }
      );
    }

    const recordingId = uploadResponse.recordingId;

    // Step 2: Send RVM to each contact
    console.log(`Sending RVM to ${contacts.length} contacts...`);
    const results = await sendCampaign(
      contacts,
      recordingId,
      brandId,
      forwardingNumber,
      campaignName
    );

    return NextResponse.json({
      success: true,
      campaignName,
      recordingId,
      totalContacts: contacts.length,
      successCount: results.successes,
      failureCount: results.failures,
      results: results.details,
    });

  } catch (error: any) {
    console.error('Error creating Drop Cowboy campaign:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

function parseCSV(csvText: string): ContactRow[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim());
  const contacts: ContactRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const contact: ContactRow = { phone: '' };

    headers.forEach((header, index) => {
      const value = values[index] || '';
      const lowerHeader = header.toLowerCase();

      if (lowerHeader.includes('phone')) {
        contact.phone = formatPhoneE164(value);
      } else if (lowerHeader.includes('first') && lowerHeader.includes('name')) {
        contact.firstName = value;
      } else if (lowerHeader.includes('last') && lowerHeader.includes('name')) {
        contact.lastName = value;
      } else if (lowerHeader.includes('email')) {
        contact.email = value;
      } else if (lowerHeader.includes('zip') || lowerHeader.includes('postal')) {
        contact.postalCode = value;
      } else {
        contact[header] = value;
      }
    });

    // Only add if we have a valid phone number
    if (contact.phone && contact.phone.length >= 12) {
      contacts.push(contact);
    }
  }

  return contacts;
}

function formatPhoneE164(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');

  // If it's 10 digits, assume US and add +1
  if (digits.length === 10) {
    return `+1${digits}`;
  }

  // If it's 11 digits and starts with 1, add +
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }

  // Otherwise return as-is with + prefix if not already there
  return digits.startsWith('+') ? digits : `+${digits}`;
}

async function uploadRecording(filename: string, audioBase64: string) {
  try {
    // Drop Cowboy uses /v1/media endpoint to upload recordings
    const response = await fetch(`${DROP_COWBOY_API_URL}/media`, {
      method: 'POST',
      headers: {
        'x-team-id': DROP_COWBOY_TEAM_ID!,
        'x-secret': DROP_COWBOY_SECRET!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        team_id: DROP_COWBOY_TEAM_ID,
        secret: DROP_COWBOY_SECRET,
        filename,
        audio_data: audioBase64,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error };
    }

    const data = await response.json();
    return { success: true, recordingId: data.recording_id || data.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function sendCampaign(
  contacts: ContactRow[],
  recordingId: string,
  brandId: string,
  forwardingNumber: string,
  campaignName: string
) {
  let successes = 0;
  let failures = 0;
  const details: any[] = [];

  // Send RVM to each contact (Drop Cowboy processes individually)
  for (const contact of contacts) {
    try {
      const response = await fetch(`${DROP_COWBOY_API_URL}/rvm`, {
        method: 'POST',
        headers: {
          'x-team-id': DROP_COWBOY_TEAM_ID!,
          'x-secret': DROP_COWBOY_SECRET!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          team_id: DROP_COWBOY_TEAM_ID,
          secret: DROP_COWBOY_SECRET,
          brand_id: brandId,
          phone_number: contact.phone,
          forwarding_number: forwardingNumber,
          recording_id: recordingId,
          foreign_id: `${campaignName}-${contact.phone}`,
          postal_code: contact.postalCode || '',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        successes++;
        details.push({
          phone: contact.phone,
          status: 'success',
          dropId: data.drop_id,
        });
      } else {
        const error = await response.text();
        failures++;
        details.push({
          phone: contact.phone,
          status: 'failed',
          error,
        });
      }
    } catch (error: any) {
      failures++;
      details.push({
        phone: contact.phone,
        status: 'failed',
        error: error.message,
      });
    }

    // Rate limiting - small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return { successes, failures, details };
}
