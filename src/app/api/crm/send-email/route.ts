/**
 * Send Email API
 *
 * Send emails to contacts using Resend. Multi-tenant: non-primary agents send
 * from their own verified domain (emailConfig), are gated until verified, and are
 * metered in credits. The primary/platform agent uses the shared sender and is exempt.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { Resend } from 'resend';
import { escapeHtml } from '@/lib/security';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';
import { ensureBalance, debit } from '@/lib/credits';
import { EMAIL_SEND_CREDITS } from '@/config/credits';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { to, subject, message, contactName } = body;

    if (!to || !subject || !message) {
      return NextResponse.json({ success: false, error: 'to, subject, and message are required' }, { status: 400 });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return NextResponse.json({ success: false, error: 'Invalid email address' }, { status: 400 });
    }

    await dbConnect();
    const user = await User.findById(session.user.id).select('name email emailConfig').lean();
    const ec = (user as any)?.emailConfig;
    const primaryEmail = (process.env.PRIMARY_AGENT_EMAIL || 'josephsardella@gmail.com').toLowerCase();
    const isPrimary = (user as any)?.email?.toLowerCase() === primaryEmail;

    // Gate: non-primary agents must have a verified sending domain.
    if (!isPrimary && ec?.status !== 'verified') {
      return NextResponse.json(
        { success: false, error: 'email_not_setup', detail: 'Set up email sending to send.' },
        { status: 403 }
      );
    }
    // Meter: ensure the agent can afford this email.
    if (!isPrimary) {
      try {
        await ensureBalance(session.user.id, EMAIL_SEND_CREDITS);
      } catch (e: any) {
        return NextResponse.json(
          { success: false, error: 'insufficient_credits', detail: e.message, creditsNeeded: EMAIL_SEND_CREDITS },
          { status: 402 }
        );
      }
    }

    const fromName = (user as any)?.name || session.user.name || 'ChatRealty';
    const noreplyDomain = process.env.EMAIL_FROM_DOMAIN || 'jpsrealtor.com';
    const senderAddress = !isPrimary && ec?.fromAddress ? ec.fromAddress : `noreply@${noreplyDomain}`;
    const replyTo = (user as any)?.email || session.user.email || senderAddress;

    console.log(`[Send Email] Sending to ${to} from ${senderAddress} (replyTo ${replyTo})`);

    const data = await resend.emails.send({
      from: `${fromName} <${senderAddress}>`,
      to: [to],
      replyTo,
      subject,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { border-bottom: 2px solid #0066cc; padding-bottom: 20px; margin-bottom: 20px; }
              .message-body { white-space: pre-wrap; background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0; }
              .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
            </style>
          </head>
          <body>
            <div class="header">
              <h2 style="margin: 0; color: #0066cc;">Message from ${escapeHtml(fromName)}</h2>
            </div>
            ${contactName ? `<p><strong>Hi ${escapeHtml(contactName)},</strong></p>` : ''}
            <div class="message-body">${message.replace(/\n/g, '<br>')}</div>
            <div class="footer">
              <p><strong>${escapeHtml(fromName)}</strong><br>Email: <a href="mailto:${replyTo}">${replyTo}</a></p>
              <p style="color: #999; font-size: 11px; margin-top: 20px;">
                This email was sent via ChatRealty. To unsubscribe from future emails, reply with "UNSUBSCRIBE" in the subject line.
              </p>
            </div>
          </body>
        </html>
      `,
      text: `${contactName ? `Hi ${contactName},\n\n` : ''}${message}\n\n---\n${fromName}\nEmail: ${replyTo}`,
    });

    if ('error' in data && data.error) {
      throw new Error(data.error.message);
    }

    // Meter the send for non-primary agents (balance was ensured above).
    if (!isPrimary) {
      await debit({
        userId: session.user.id,
        amount: EMAIL_SEND_CREDITS,
        type: 'email_send',
        channel: 'email',
        description: `Email to ${to}`,
      }).catch((e) => console.error('[Send Email] credit debit failed:', e));
    }

    return NextResponse.json({
      success: true,
      messageId: data.data?.id || 'unknown',
      message: 'Email sent successfully',
    });
  } catch (error: any) {
    console.error('[Send Email] Error:', error);
    if (error.statusCode === 422) {
      return NextResponse.json(
        { success: false, error: 'Invalid email parameters. Please check the recipient email address.' },
        { status: 422 }
      );
    }
    return NextResponse.json({ success: false, error: error.message || 'Failed to send email' }, { status: 500 });
  }
}
