/**
 * Send Email API
 *
 * Sends emails to contacts via Resend. Accepts BOTH JSON ({ to, subject, message,
 * contactName, cc?, bcc? }) and multipart/form-data (the CRM composer — adds
 * cc/bcc/attachments). Multi-tenant: non-primary agents send from their own
 * verified domain (emailConfig), are gated until verified, and are metered in
 * credits per recipient. The primary/platform agent uses the shared sender and is
 * exempt.
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
import { isFreeTier } from '@/lib/subscription-helpers';

const resend = new Resend(process.env.RESEND_API_KEY);

const splitList = (v?: string | null): string[] =>
  (v || '').split(',').map((s) => s.trim()).filter(Boolean);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Email sending is a paid-plan feature; block free-tier agents (admins exempt).
    if (!(session.user as any).isAdmin && (await isFreeTier((session.user as any).id))) {
      return NextResponse.json(
        { success: false, error: 'Email sending requires a paid plan.' },
        { status: 403 }
      );
    }

    // --- Parse input (JSON or multipart from the composer) ---
    const contentType = request.headers.get('content-type') || '';
    let to = '', cc = '', bcc = '', subject = '', message = '', contactName = '';
    const attachments: { filename: string; content: Buffer }[] = [];

    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData();
      to = (form.get('to') as string) || '';
      cc = (form.get('cc') as string) || '';
      bcc = (form.get('bcc') as string) || '';
      subject = (form.get('subject') as string) || '';
      message = (form.get('message') as string) || '';
      contactName = (form.get('contactName') as string) || '';
      for (const f of form.getAll('attachments')) {
        if (f instanceof File && f.size > 0) {
          attachments.push({ filename: f.name, content: Buffer.from(await f.arrayBuffer()) });
        }
      }
    } else {
      const body = await request.json();
      to = body.to || '';
      cc = body.cc || '';
      bcc = body.bcc || '';
      subject = body.subject || '';
      message = body.message || '';
      contactName = body.contactName || '';
    }

    const toList = splitList(to);
    const ccList = splitList(cc);
    const bccList = splitList(bcc);

    if (!toList.length || !subject || !message) {
      return NextResponse.json({ success: false, error: 'to, subject, and message are required' }, { status: 400 });
    }
    const invalid = [...toList, ...ccList, ...bccList].find((e) => !EMAIL_RE.test(e));
    if (invalid) {
      return NextResponse.json({ success: false, error: `Invalid email address: ${invalid}` }, { status: 400 });
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

    // Meter per recipient (to + cc + bcc).
    const recipientCount = toList.length + ccList.length + bccList.length;
    const cost = Math.round(EMAIL_SEND_CREDITS * recipientCount * 1000) / 1000;
    if (!isPrimary) {
      try {
        await ensureBalance(session.user.id, cost);
      } catch (e: any) {
        return NextResponse.json(
          { success: false, error: 'insufficient_credits', detail: e.message, creditsNeeded: cost },
          { status: 402 }
        );
      }
    }

    const fromName = (user as any)?.name || session.user.name || 'ChatRealty';
    const noreplyDomain = process.env.EMAIL_FROM_DOMAIN || 'chatrealty.io';
    const senderAddress = !isPrimary && ec?.fromAddress ? ec.fromAddress : `noreply@${noreplyDomain}`;
    const replyTo = (user as any)?.email || session.user.email || senderAddress;

    console.log(`[Send Email] ${recipientCount} recipient(s) from ${senderAddress} (replyTo ${replyTo})`);

    // The composer (multipart) sends rich HTML from its contentEditable editor;
    // JSON callers send plain text. Render each correctly and derive a matching
    // text/plain fallback (raw tags must never leak into the plaintext part).
    const bodyIsHtml = contentType.includes('multipart/form-data');
    const bodyHtml = bodyIsHtml ? message : message.replace(/\n/g, '<br>');
    const textFallback = bodyIsHtml
      ? message.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
      : message;

    const data = await resend.emails.send({
      from: `${fromName} <${senderAddress}>`,
      to: toList,
      ...(ccList.length ? { cc: ccList } : {}),
      ...(bccList.length ? { bcc: bccList } : {}),
      replyTo,
      subject,
      ...(attachments.length ? { attachments } : {}),
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
            ${bodyIsHtml
              ? `<div style="margin: 20px 0;">${bodyHtml}</div>`
              : `<div class="message-body">${bodyHtml}</div>`}
            <div class="footer">
              <p><strong>${escapeHtml(fromName)}</strong><br>Email: <a href="mailto:${replyTo}">${replyTo}</a></p>
              <p style="color: #999; font-size: 11px; margin-top: 20px;">
                This email was sent via ChatRealty. To unsubscribe from future emails, reply with "UNSUBSCRIBE" in the subject line.
              </p>
            </div>
          </body>
        </html>
      `,
      text: `${contactName ? `Hi ${contactName},\n\n` : ''}${textFallback}\n\n---\n${fromName}\nEmail: ${replyTo}`,
    });

    if ('error' in data && data.error) {
      throw new Error(data.error.message);
    }

    // Meter the send for non-primary agents (balance was ensured above).
    if (!isPrimary) {
      await debit({
        userId: session.user.id,
        amount: cost,
        type: 'email_send',
        channel: 'email',
        description: `Email to ${toList[0]}${recipientCount > 1 ? ` +${recipientCount - 1}` : ''}`,
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
