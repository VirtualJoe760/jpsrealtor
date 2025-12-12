/**
 * Send Email API
 *
 * Send emails to contacts using Resend
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// ============================================================================
// POST /api/crm/send-email
// Send an email to a contact
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { to, subject, message, contactName } = body;

    // Validate required fields
    if (!to || !subject || !message) {
      return NextResponse.json(
        { success: false, error: 'to, subject, and message are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email address' },
        { status: 400 }
      );
    }

    // Get user's email for "from" address
    const fromEmail = session.user.email || 'noreply@jpsrealtor.com';
    const fromName = session.user.name || 'Joseph Sardella';

    console.log(`[Send Email] Sending email to ${to} from ${fromEmail}`);

    // Send email using Resend
    const data = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: [to],
      subject: subject,
      html: `
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
              <h2 style="margin: 0; color: #0066cc;">Message from ${fromName}</h2>
            </div>

            ${contactName ? `<p><strong>Hi ${contactName},</strong></p>` : ''}

            <div class="message-body">
              ${message.replace(/\n/g, '<br>')}
            </div>

            <div class="footer">
              <p>
                <strong>${fromName}</strong><br>
                Email: <a href="mailto:${fromEmail}">${fromEmail}</a>
              </p>
              <p style="color: #999; font-size: 11px; margin-top: 20px;">
                This email was sent via JPS Realtor CRM. If you wish to unsubscribe from future emails,
                please reply to this email with "UNSUBSCRIBE" in the subject line.
              </p>
            </div>
          </body>
        </html>
      `,
      text: `${contactName ? `Hi ${contactName},\n\n` : ''}${message}\n\n---\n${fromName}\nEmail: ${fromEmail}`,
    });

    console.log(`[Send Email] Email sent successfully:`, data);

    // Check if response has error
    if ('error' in data && data.error) {
      throw new Error(data.error.message);
    }

    return NextResponse.json({
      success: true,
      messageId: data.data?.id || 'unknown',
      message: 'Email sent successfully',
    });

  } catch (error: any) {
    console.error('[Send Email] Error:', error);

    // Handle Resend-specific errors
    if (error.statusCode === 422) {
      return NextResponse.json(
        { success: false, error: 'Invalid email parameters. Please check the recipient email address.' },
        { status: 422 }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message || 'Failed to send email' },
      { status: 500 }
    );
  }
}
