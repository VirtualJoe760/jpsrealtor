/**
 * Fetch Single Email by ID
 *
 * Get full email content including body (html/text)
 */

import { NextRequest, NextResponse } from 'next/server';

const RESEND_API_KEY = process.env.FULL_ACCESS_RESEND_API_KEY || process.env.RESEND_API_KEY;
const RESEND_API_URL = 'https://api.resend.com';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!RESEND_API_KEY) {
      return NextResponse.json(
        { error: 'Resend API key not configured' },
        { status: 500 }
      );
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Email ID is required' },
        { status: 400 }
      );
    }

    // Check if this is a folder/type parameter from the query string
    const { searchParams } = new URL(request.url);
    const folder = searchParams.get('folder') || 'inbox';

    console.log(`[Resend Email] Fetching email ID: ${id}, folder: ${folder}`);

    // Use different endpoints for sent vs received emails
    const endpoint = folder === 'sent'
      ? `${RESEND_API_URL}/emails/${id}`
      : `${RESEND_API_URL}/emails/receiving/${id}`;

    console.log(`[Resend Email] Using endpoint: ${endpoint}`);

    // Fetch the email by ID from Resend
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    console.log(`[Resend Email] Response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Resend Email] Error response:', errorText);
      console.error('[Resend Email] Status code:', response.status);

      let errorDetails;
      try {
        errorDetails = JSON.parse(errorText);
      } catch {
        errorDetails = errorText;
      }

      return NextResponse.json(
        {
          error: 'Failed to fetch email',
          details: errorDetails,
          statusCode: response.status
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('[Resend Email] Successfully fetched email');
    console.log('[Resend Email] Email data keys:', Object.keys(data));
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('[Resend Email] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
