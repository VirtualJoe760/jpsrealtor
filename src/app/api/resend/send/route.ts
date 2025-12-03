import { NextRequest, NextResponse } from 'next/server';

const RESEND_API_KEY = process.env.FULL_ACCESS_RESEND_API_KEY || process.env.RESEND_API_KEY;
const RESEND_API_URL = 'https://api.resend.com';

export async function POST(req: NextRequest) {
  try {
    if (!RESEND_API_KEY) {
      return NextResponse.json(
        { error: 'Resend API key not configured. Add RESEND_API_KEY to .env.local' },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const to = formData.get('to') as string;
    const cc = formData.get('cc') as string | null;
    const bcc = formData.get('bcc') as string | null;
    const subject = formData.get('subject') as string;
    const message = formData.get('message') as string;
    const attachmentFiles = formData.getAll('attachments') as File[];

    if (!to || !subject || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, message' },
        { status: 400 }
      );
    }

    // Convert HTML to plain text (remove HTML tags for text version)
    const plainText = message
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .trim();

    // Helper function to parse comma-separated emails
    const parseEmails = (emailString: string): string[] => {
      return emailString
        .split(',')
        .map(email => email.trim())
        .filter(email => email.length > 0);
    };

    // Build email payload with best practices for deliverability
    const emailPayload: any = {
      from: 'Joseph Sardella <joseph@josephsardella.com>',
      to: [to],
      subject: subject,
      html: message, // Send as-is (already HTML from rich text editor)
      text: plainText, // Include plain text version
      reply_to: 'joseph@josephsardella.com', // Add reply-to header
      headers: {
        'X-Entity-Ref-ID': Date.now() + '-' + Math.random().toString(36).substring(7), // Unique message ID
      },
    };
    // Add CC if provided
    if (cc) {
      emailPayload.cc = parseEmails(cc);
    }

    // Add BCC if provided
    if (bcc) {
      emailPayload.bcc = parseEmails(bcc);
    }


    // Handle attachments if any
    if (attachmentFiles.length > 0) {
      const attachments = await Promise.all(
        attachmentFiles.map(async (file) => {
          const arrayBuffer = await file.arrayBuffer();
          const base64Content = Buffer.from(arrayBuffer).toString('base64');

          return {
            filename: file.name,
            content: base64Content,
          };
        })
      );

      emailPayload.attachments = attachments;
    }

    // Send email via Resend API
    const response = await fetch(RESEND_API_URL + '/emails', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + RESEND_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: 'Failed to send email via Resend', details: error },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('Error sending email:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
