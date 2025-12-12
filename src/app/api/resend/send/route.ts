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

    // Helper function to parse comma-separated emails
    const parseEmails = (emailString: string): string[] => {
      return emailString
        .split(',')
        .map(email => email.trim())
        .filter(email => email.length > 0);
    };

    // Format the message as HTML if it's plain text
    const isHtml = message.includes('<') && message.includes('>');
    const htmlMessage = isHtml ? message : `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              border-bottom: 2px solid #0066cc;
              padding-bottom: 20px;
              margin-bottom: 20px;
            }
            .message-body {
              white-space: pre-wrap;
              background: #f9f9f9;
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
              font-size: 12px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h2 style="margin: 0; color: #0066cc;">Message from Joseph Sardella</h2>
          </div>

          <div class="message-body">
            ${message.replace(/\n/g, '<br>')}
          </div>

          <div class="footer">
            <p>
              <strong>Joseph Sardella</strong><br>
              Email: <a href="mailto:joseph@josephsardella.com">joseph@josephsardella.com</a>
            </p>
            <p style="color: #999; font-size: 11px; margin-top: 20px;">
              This email was sent via JPS Realtor CRM.
            </p>
          </div>
        </body>
      </html>
    `;

    // Convert HTML to plain text (remove HTML tags for text version)
    const plainText = message
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .trim();

    // Build email payload with best practices for deliverability
    const emailPayload: any = {
      from: 'Joseph Sardella <joseph@josephsardella.com>',
      to: [to],
      subject: subject,
      html: htmlMessage, // Properly formatted HTML
      text: plainText || message, // Include plain text version
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
