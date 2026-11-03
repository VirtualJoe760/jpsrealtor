// src/lib/email-resend.ts
// Email utilities using Resend (more reliable than Gmail)

import { Resend } from 'resend';
import { renderBrandedEmail, escapeHtml } from '@/lib/email-brand';
import { AI_CLASS_LENGTH_LABEL, type AiClassIntake } from '@/config/ai-classes';

// Lazy initialization to avoid errors during build when API key might not be set
let resendInstance: Resend | null = null;

function getResendClient(): Resend {
  if (!resendInstance) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY environment variable is not set');
    }
    resendInstance = new Resend(apiKey);
  }
  return resendInstance;
}

export interface EmailAgent {
  name: string;
  headshot?: string;
  brokerage: string;
  licenseNumber: string;
  phone: string;
  email: string;
  website: string;
  brandColor: string;
  secondaryColor: string;
  instagram?: string;
  facebook?: string;
  youtube?: string;
}

const DEFAULT_AGENT: EmailAgent = {
  name: 'Joseph Sardella',
  headshot: 'https://res.cloudinary.com/duqgao9h8/image/upload/v1774327194/headshots/head-shot-2026.png',
  // Last-resort identity when no agent resolves. Left blank rather than
  // naming an agency: resolveEmailAgent() falls back here for ANY tenant, and
  // a wrong brokerage in a compliance footer is worse than none.
  brokerage: '',
  licenseNumber: '02106916',
  phone: '(760) 333-3676',
  email: 'josephsardella@gmail.com',
  website: 'jpsrealtor.com',
  brandColor: '#3b82f6',
  secondaryColor: '#1e3a8a',
  instagram: 'https://instagram.com/jpsrealtor',
  facebook: 'https://facebook.com/jpsrealtor',
  youtube: 'https://youtube.com/@jpsrealtor',
};

// Platform default sender domain. chatrealty.io is verified in Resend.
// NOTE: a deployed EMAIL_FROM_DOMAIN env var overrides this default.
const NOREPLY_DOMAIN = process.env.EMAIL_FROM_DOMAIN || 'chatrealty.io';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'josephsardella@gmail.com';

/**
 * Resolve an EmailAgent from a userId string or an already-resolved object.
 * Falls back to DEFAULT_AGENT when no user is found or no agentProfile exists.
 */
export async function resolveEmailAgent(
  agentOrId?: string | EmailAgent
): Promise<EmailAgent> {
  if (!agentOrId) return DEFAULT_AGENT;
  if (typeof agentOrId !== 'string') return agentOrId;

  try {
    const mongoose = await import('mongoose');
    const db = mongoose.default.connection.db;
    if (!db) return DEFAULT_AGENT;

    const user = await db.collection('users').findOne(
      { _id: new mongoose.Types.ObjectId(agentOrId) },
      {
        projection: {
          name: 1,
          image: 1,
          brokerageName: 1,
          licenseNumber: 1,
          phone: 1,
          email: 1,
          'agentProfile.brokerage': 1,
          'agentProfile.brokerageName': 1,
          'agentProfile.licenseNumber': 1,
          'agentProfile.brandColor': 1,
          'agentProfile.secondaryColor': 1,
          'agentProfile.subdomain': 1,
          'agentProfile.instagram': 1,
          'agentProfile.facebook': 1,
          'agentProfile.youtube': 1,
        },
      }
    );
    if (!user) return DEFAULT_AGENT;

    return {
      name: user.name || DEFAULT_AGENT.name,
      headshot: user.image || DEFAULT_AGENT.headshot,
      // Brokerage: new agentProfile.brokerage first, then the legacy fields.
      // Compliance footers carry this, so it must track the agent's CURRENT
      // brokerage rather than whatever was denormalized onto the user doc.
      brokerage:
        user.agentProfile?.brokerage?.name ||
        user.agentProfile?.brokerageName ||
        user.brokerageName ||
        DEFAULT_AGENT.brokerage,
      licenseNumber:
        user.agentProfile?.licenseNumber || user.licenseNumber || DEFAULT_AGENT.licenseNumber,
      phone: user.phone || DEFAULT_AGENT.phone,
      email: user.email || DEFAULT_AGENT.email,
      website: user.agentProfile?.subdomain
        ? `${user.agentProfile.subdomain}.chatrealty.io`
        : DEFAULT_AGENT.website,
      brandColor: user.agentProfile?.brandColor || DEFAULT_AGENT.brandColor,
      secondaryColor: user.agentProfile?.secondaryColor || DEFAULT_AGENT.secondaryColor,
      instagram: user.agentProfile?.instagram || DEFAULT_AGENT.instagram,
      facebook: user.agentProfile?.facebook || DEFAULT_AGENT.facebook,
      youtube: user.agentProfile?.youtube || DEFAULT_AGENT.youtube,
    };
  } catch {
    return DEFAULT_AGENT;
  }
}

/** From line for agent-branded emails */
function emailFrom(agent: EmailAgent): string {
  return `${agent.name} via ChatRealty <noreply@${NOREPLY_DOMAIN}>`;
}

/** From line for platform-level emails (no agent branding) */
function platformFrom(): string {
  return `ChatRealty <noreply@${NOREPLY_DOMAIN}>`;
}

/** Reusable HTML email signature block */
function emailSignature(agent: EmailAgent): string {
  const phoneDigits = agent.phone.replace(/\D/g, '');
  const signatureHeadshot = agent.headshot
    ? agent.headshot.replace(
        '/upload/',
        '/upload/c_thumb,g_face,w_200,h_200,r_max,f_auto,q_auto/'
      )
    : '';

  return `
    <div class="signature" style="margin-top:40px;padding-top:20px;border-top:1px solid #e5e7eb;font-size:14px;line-height:1.8;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          ${signatureHeadshot ? `<td width="96" valign="top" style="padding-right:20px;">
            <img src="${signatureHeadshot}" alt="${agent.name}" width="80" height="80" style="display:block;width:80px;height:80px;border-radius:50%;border:3px solid ${agent.brandColor};" />
          </td>` : ''}
          <td valign="middle">
            <p style="margin:0;font-size:17px;font-weight:700;color:#0f172a;line-height:1.3;">${agent.name}</p>
            <p style="margin:4px 0 0;font-size:13px;color:#6b7280;line-height:1.4;">REALTOR® · ${agent.brokerage}</p>
            <p style="margin:2px 0 0;font-size:12px;color:#9ca3af;line-height:1.4;">DRE# ${agent.licenseNumber}</p>
          </td>
        </tr>
      </table>
      <p style="margin:12px 0 0;font-size:14px;line-height:1.7;color:#374151;">
        📞 <a href="tel:${phoneDigits}" style="color:${agent.brandColor};text-decoration:none;font-weight:600;">${agent.phone}</a><br/>
        ✉️ <a href="mailto:${agent.email}" style="color:${agent.brandColor};text-decoration:none;font-weight:600;">${agent.email}</a><br/>
        🌐 <a href="https://${agent.website}" style="color:${agent.brandColor};text-decoration:none;font-weight:600;">${agent.website}</a>
      </p>
      ${agent.instagram || agent.facebook || agent.youtube ? `
      <p style="margin:8px 0 0;font-size:12px;line-height:1.5;color:#9ca3af;">
        ${agent.instagram ? `<a href="${agent.instagram}" style="color:#9ca3af;text-decoration:none;">Instagram</a>` : ''}
        ${agent.instagram && agent.facebook ? ' · ' : ''}
        ${agent.facebook ? `<a href="${agent.facebook}" style="color:#9ca3af;text-decoration:none;">Facebook</a>` : ''}
        ${(agent.instagram || agent.facebook) && agent.youtube ? ' · ' : ''}
        ${agent.youtube ? `<a href="${agent.youtube}" style="color:#9ca3af;text-decoration:none;">YouTube</a>` : ''}
      </p>` : ''}
    </div>`;
}

/** Reusable HTML email footer */
function emailFooter(agent: EmailAgent): string {
  return `
    <div style="background-color:#f8fafc;padding:24px 40px;text-align:center;border-top:1px solid #e5e7eb;">
      <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.6;">
        © ${new Date().getFullYear()} ${agent.name} · ${agent.brokerage}<br/>
        Powered by <a href="https://chatrealty.io" style="color:#9ca3af;text-decoration:none;font-weight:600;">ChatRealty</a>
      </p>
    </div>`;
}

export async function sendVerificationEmail(
  email: string,
  token: string,
  name: string,
  agentOrId?: string | EmailAgent,
  baseUrl?: string
) {
  const agent = await resolveEmailAgent(agentOrId);
  const base = baseUrl || process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || 'https://chatrealty.io';
  const verificationUrl = `${base}/auth/verify-email?token=${token}`;

  console.log('📧 Sending verification email via Resend to:', email);
  console.log('🔗 Verification URL:', verificationUrl);

  try {
    const resend = getResendClient();
    const data = await resend.emails.send({
      from: emailFrom(agent),
      to: [email],
      replyTo: `noreply@${NOREPLY_DOMAIN}`,
      subject: 'Verify your email address',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                background-color: #f5f5f5;
                margin: 0;
                padding: 0;
              }
              .container {
                max-width: 600px;
                margin: 40px auto;
                background: white;
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              }
              .header {
                background: linear-gradient(135deg, ${agent.secondaryColor} 0%, ${agent.brandColor} 100%);
                color: white;
                padding: 40px 30px;
                text-align: center;
              }
              .header h1 {
                margin: 0;
                font-size: 28px;
                font-weight: 600;
              }
              .content {
                padding: 40px 30px;
              }
              .button {
                display: inline-block;
                padding: 14px 32px;
                background: ${agent.brandColor};
                color: white !important;
                text-decoration: none;
                border-radius: 6px;
                margin: 25px 0;
                font-weight: 600;
              }
              .button:hover {
                opacity: 0.9;
              }
              .link-fallback {
                word-break: break-all;
                color: ${agent.brandColor};
                font-size: 13px;
                margin: 20px 0;
              }
              .footer {
                background: #f9fafb;
                padding: 20px 30px;
                text-align: center;
                color: #666;
                font-size: 12px;
                border-top: 1px solid #e5e7eb;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Welcome!</h1>
              </div>
              <div class="content">
                <p>Hi ${name},</p>
                <p>Thank you for creating an account. To get started, please verify your email address by clicking the button below:</p>
                <p style="text-align: center;">
                  <a href="${verificationUrl}" class="button">Verify Email Address</a>
                </p>
                <p>Or copy and paste this link into your browser:</p>
                <p class="link-fallback">${verificationUrl}</p>
                <p style="color: #666; font-size: 14px;">This verification link will expire in 24 hours.</p>
                <p style="color: #666; font-size: 14px; margin-top: 30px;">If you didn't create this account, you can safely ignore this email.</p>

                ${emailSignature(agent)}
              </div>
              ${emailFooter(agent)}
            </div>
          </body>
        </html>
      `,
    });

    console.log('✅ Verification email sent successfully via Resend:', data);
    return data;
  } catch (error) {
    console.error("❌ Error sending verification email via Resend:", error);
    if (error instanceof Error) {
      console.error("Error details:", error.message);
    }
    throw error;
  }
}

export async function send2FACode(
  email: string,
  code: string,
  name: string,
  agentOrId?: string | EmailAgent
) {
  const agent = await resolveEmailAgent(agentOrId);
  console.log('📧 Sending 2FA code via Resend to:', email);

  try {
    const resend = getResendClient();
    const data = await resend.emails.send({
      from: emailFrom(agent),
      to: [email],
      replyTo: `noreply@${NOREPLY_DOMAIN}`,
      subject: 'Your Two-Factor Authentication Code',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                background-color: #f5f5f5;
                margin: 0;
                padding: 0;
              }
              .container {
                max-width: 600px;
                margin: 40px auto;
                background: white;
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              }
              .header {
                background: linear-gradient(135deg, ${agent.secondaryColor} 0%, ${agent.brandColor} 100%);
                color: white;
                padding: 40px 30px;
                text-align: center;
              }
              .header h1 {
                margin: 0;
                font-size: 28px;
                font-weight: 600;
              }
              .content {
                padding: 40px 30px;
              }
              .code-container {
                background: #f9fafb;
                border: 2px solid ${agent.brandColor};
                border-radius: 8px;
                padding: 30px;
                text-align: center;
                margin: 25px 0;
              }
              .code {
                display: inline-block;
                font-size: 36px;
                font-weight: bold;
                letter-spacing: 10px;
                color: ${agent.secondaryColor};
                font-family: 'Courier New', monospace;
              }
              .footer {
                background: #f9fafb;
                padding: 20px 30px;
                text-align: center;
                color: #666;
                font-size: 12px;
                border-top: 1px solid #e5e7eb;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Two-Factor Authentication</h1>
              </div>
              <div class="content">
                <p>Hi ${name},</p>
                <p>Your verification code for two-factor authentication is:</p>
                <div class="code-container">
                  <div class="code">${code}</div>
                </div>
                <p style="color: #666; font-size: 14px; text-align: center;">This code will expire in 10 minutes.</p>
                <p style="color: #dc2626; font-size: 14px; margin-top: 30px;"><strong>Security Notice:</strong> If you didn't request this code, please ignore this email and consider changing your password immediately.</p>

                ${emailSignature(agent)}
              </div>
              ${emailFooter(agent)}
            </div>
          </body>
        </html>
      `,
    });

    console.log('✅ 2FA code sent successfully via Resend:', data);
    return data;
  } catch (error) {
    console.error("❌ Error sending 2FA code via Resend:", error);
    if (error instanceof Error) {
      console.error("Error details:", error.message);
    }
    throw error;
  }
}

export async function sendPasswordResetEmail(
  email: string,
  resetUrl: string,
  name: string,
  agentOrId?: string | EmailAgent
) {
  const agent = await resolveEmailAgent(agentOrId);
  console.log('📧 Sending password reset email via Resend to:', email);
  console.log('🔗 Reset URL:', resetUrl);

  try {
    const resend = getResendClient();
    const data = await resend.emails.send({
      from: emailFrom(agent),
      to: [email],
      replyTo: `noreply@${NOREPLY_DOMAIN}`,
      subject: 'Reset your password',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                background-color: #f5f5f5;
                margin: 0;
                padding: 0;
              }
              .container {
                max-width: 600px;
                margin: 40px auto;
                background-color: #ffffff;
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
              }
              .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 40px 20px;
                text-align: center;
              }
              .header h1 {
                margin: 0;
                font-size: 28px;
                font-weight: 600;
              }
              .content {
                padding: 40px 30px;
              }
              .content h2 {
                color: #2d3748;
                font-size: 22px;
                margin-bottom: 20px;
              }
              .content p {
                color: #4a5568;
                font-size: 16px;
                margin-bottom: 20px;
              }
              .button {
                display: inline-block;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white !important;
                text-decoration: none;
                padding: 14px 32px;
                border-radius: 6px;
                font-weight: 600;
                margin: 20px 0;
                text-align: center;
              }
              .button:hover {
                opacity: 0.9;
              }
              .info-box {
                background-color: #f7fafc;
                border-left: 4px solid #4299e1;
                padding: 16px;
                margin: 20px 0;
                border-radius: 4px;
              }
              .info-box p {
                margin: 0;
                font-size: 14px;
                color: #2d3748;
              }
              .footer {
                background-color: #f7fafc;
                padding: 30px;
                text-align: center;
                border-top: 1px solid #e2e8f0;
              }
              .footer p {
                margin: 5px 0;
                font-size: 14px;
                color: #718096;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Password Reset Request</h1>
              </div>
              <div class="content">
                <h2>Hi ${name},</h2>
                <p>
                  We received a request to reset your password for your ChatRealty account.
                </p>
                <p>
                  Click the button below to reset your password:
                </p>
                <div style="text-align: center;">
                  <a href="${resetUrl}" class="button">Reset Password</a>
                </div>
                <div class="info-box">
                  <p><strong>⏰ This link will expire in 1 hour</strong></p>
                </div>
                <p>
                  If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.
                </p>
                <p style="font-size: 14px; color: #718096; margin-top: 30px;">
                  If the button doesn't work, copy and paste this link into your browser:<br>
                  <a href="${resetUrl}" style="color: #4299e1; word-break: break-all;">${resetUrl}</a>
                </p>
              </div>
              <div class="footer">
                <p><strong>${agent.name} · ${agent.brokerage}</strong></p>
                <p>Powered by <a href="https://chatrealty.io" style="color:#718096;text-decoration:none;">ChatRealty</a></p>
                <p style="font-size: 12px; margin-top: 20px;">
                  This is an automated email. Please do not reply to this message.
                </p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    console.log('✅ Password reset email sent successfully via Resend:', data);
    return data;
  } catch (error) {
    console.error("❌ Error sending password reset email via Resend:", error);
    if (error instanceof Error) {
      console.error("Error details:", error.message);
    }
    throw error;
  }
}

/**
 * Welcome / verification email for newly captured leads from /buy or /sell
 * intake forms. Takes them to /auth/welcome where they can either set a
 * password OR sign in with Google/Facebook.
 */
export interface LeadWelcomeAgent {
  name?: string;
  headshot?: string;       // Cloudinary URL — round-cropped via transformation
  brokerage?: string;
  licenseNumber?: string;
  phone?: string;          // Display format, e.g. "(760) 333-3676"
  email?: string;
  website?: string;        // e.g. "jpsrealtor.com"
  brandColor?: string;     // hex
  secondaryColor?: string; // hex
  instagram?: string;
  facebook?: string;
  youtube?: string;
}

export async function sendLeadWelcomeEmail(
  email: string,
  verifyUrl: string,
  name: string,
  agent: LeadWelcomeAgent = {}
) {
  console.log("📧 Sending lead welcome email via Resend to:", email);

  // Sensible defaults so the template never has gaps
  const a = {
    name: agent.name || DEFAULT_AGENT.name,
    headshot: agent.headshot || DEFAULT_AGENT.headshot || "",
    brokerage: agent.brokerage || DEFAULT_AGENT.brokerage,
    licenseNumber: agent.licenseNumber || DEFAULT_AGENT.licenseNumber,
    phone: agent.phone || DEFAULT_AGENT.phone,
    email: agent.email || DEFAULT_AGENT.email,
    website: agent.website || DEFAULT_AGENT.website,
    brandColor: agent.brandColor || DEFAULT_AGENT.brandColor,
    secondaryColor: agent.secondaryColor || DEFAULT_AGENT.secondaryColor,
    instagram: agent.instagram || DEFAULT_AGENT.instagram,
    facebook: agent.facebook || DEFAULT_AGENT.facebook,
    youtube: agent.youtube || DEFAULT_AGENT.youtube,
  };

  // Round-crop the Cloudinary headshot to 200x200 for the email signature.
  // We rewrite any /upload/ URL to add face-detection crop transformations.
  const signatureHeadshot = a.headshot
    ? a.headshot.replace(
        "/upload/",
        "/upload/c_thumb,g_face,w_200,h_200,r_max,f_auto,q_auto/"
      )
    : "";

  const firstName = name?.split(" ")[0] || "there";
  const phoneDigits = a.phone.replace(/\D/g, "");

  try {
    const resend = getResendClient();
    const data = await resend.emails.send({
      from: `${a.name} via ChatRealty <noreply@${NOREPLY_DOMAIN}>`,
      to: [email],
      replyTo: `${a.email}`,
      subject: `Welcome to ${a.name.split(" ")[0]} Real Estate — verify your email`,
      html: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to ${a.name} Real Estate</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f4f6f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1f2937;">
    <!-- Hidden inbox preview text -->
    <div style="display:none;font-size:1px;color:#f4f6f9;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;mso-hide:all;">
      Verify your email to finish setting up your account with ${a.name}. ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌
    </div>

    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f4f6f9;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08);">

            <!-- Header w/ gradient -->
            <tr>
              <td style="background-image:linear-gradient(135deg, ${a.brandColor} 0%, ${a.secondaryColor} 100%);background-color:${a.brandColor};padding:48px 40px;text-align:center;">
                <p style="margin:0;color:rgba(255,255,255,0.9);font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase;">${a.brokerage} · DRE# ${a.licenseNumber}</p>
                <h1 style="margin:14px 0 0;color:#ffffff;font-size:30px;font-weight:800;line-height:1.2;">Welcome aboard, ${firstName} 👋</h1>
                <p style="margin:14px 0 0;color:rgba(255,255,255,0.9);font-size:15px;line-height:1.5;">A quick verification and you're all set.</p>
              </td>
            </tr>

            <!-- Spacer -->
            <tr><td style="height:8px;line-height:8px;font-size:8px;">&nbsp;</td></tr>

            <!-- Intro -->
            <tr>
              <td style="padding:32px 40px 0;">
                <p style="margin:0;font-size:16px;line-height:1.65;color:#374151;">
                  Hi ${firstName},
                </p>
                <p style="margin:16px 0 0;font-size:16px;line-height:1.65;color:#374151;">
                  Thanks for reaching out — I'm excited to help with your real estate goals in the Coachella Valley.
                </p>
                <p style="margin:16px 0 0;font-size:16px;line-height:1.65;color:#374151;">
                  Click the button below to verify your email and finish setting up your account. Once you're in you'll be able to:
                </p>
              </td>
            </tr>

            <!-- Feature list -->
            <tr>
              <td style="padding:20px 40px 0;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                  <tr><td style="padding:6px 0;font-size:15px;line-height:1.5;color:#374151;">★ &nbsp;Save your favorite homes &amp; searches</td></tr>
                  <tr><td style="padding:6px 0;font-size:15px;line-height:1.5;color:#374151;">★ &nbsp;Get instant alerts for matching listings</td></tr>
                  <tr><td style="padding:6px 0;font-size:15px;line-height:1.5;color:#374151;">★ &nbsp;Track market activity for your neighborhood</td></tr>
                  <tr><td style="padding:6px 0;font-size:15px;line-height:1.5;color:#374151;">★ &nbsp;Receive your personal CMA when ready</td></tr>
                </table>
              </td>
            </tr>

            <!-- CTA button -->
            <tr>
              <td align="center" style="padding:32px 40px 8px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="background-image:linear-gradient(135deg, ${a.brandColor} 0%, ${a.secondaryColor} 100%);background-color:${a.brandColor};border-radius:12px;">
                      <a href="${verifyUrl}" target="_blank" style="display:inline-block;padding:18px 44px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:12px;">
                        Verify Email &amp; Continue →
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Helper text -->
            <tr>
              <td style="padding:8px 40px 0;">
                <p style="margin:0;font-size:13px;line-height:1.6;color:#6b7280;text-align:center;">
                  After verifying, you can create a password <strong style="color:#374151;">or</strong> sign in with Google or Facebook.
                </p>
                <p style="margin:6px 0 0;font-size:12px;color:#9ca3af;text-align:center;">
                  This link expires in 24 hours.
                </p>
              </td>
            </tr>

            <!-- Spacer -->
            <tr><td style="height:24px;line-height:24px;font-size:24px;">&nbsp;</td></tr>

            <!-- Fallback URL -->
            <tr>
              <td style="padding:0 40px 32px;">
                <p style="margin:0 0 6px;font-size:11px;color:#9ca3af;text-align:center;">
                  Button not working? Copy and paste this link:
                </p>
                <p style="margin:0;font-size:11px;color:${a.brandColor};text-align:center;word-break:break-all;line-height:1.5;">
                  <a href="${verifyUrl}" style="color:${a.brandColor};text-decoration:none;">${verifyUrl}</a>
                </p>
              </td>
            </tr>

            <!-- Divider -->
            <tr>
              <td style="padding:0 40px;">
                <div style="border-top:1px solid #e5e7eb;height:1px;line-height:1px;font-size:1px;">&nbsp;</div>
              </td>
            </tr>

            <!-- Signature -->
            <tr>
              <td style="padding:36px 40px 36px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                  <tr>
                    ${
                      signatureHeadshot
                        ? `<td width="96" valign="top" style="padding-right:20px;">
                             <img src="${signatureHeadshot}" alt="${a.name}" width="80" height="80" style="display:block;width:80px;height:80px;border-radius:50%;border:3px solid ${a.brandColor};" />
                           </td>`
                        : ""
                    }
                    <td valign="middle">
                      <p style="margin:0;font-size:17px;font-weight:700;color:#0f172a;line-height:1.3;">${a.name}</p>
                      <p style="margin:4px 0 0;font-size:13px;color:#6b7280;line-height:1.4;">REALTOR® · ${a.brokerage}</p>
                      <p style="margin:2px 0 0;font-size:12px;color:#9ca3af;line-height:1.4;">DRE# ${a.licenseNumber}</p>
                    </td>
                  </tr>
                </table>

                <!-- Spacer -->
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td style="height:18px;line-height:18px;font-size:18px;">&nbsp;</td></tr></table>

                <!-- Contact lines -->
                <p style="margin:0;font-size:14px;line-height:1.7;color:#374151;">
                  📞 &nbsp;<a href="tel:${phoneDigits}" style="color:${a.brandColor};text-decoration:none;font-weight:600;">${a.phone}</a>
                </p>
                <p style="margin:0;font-size:14px;line-height:1.7;color:#374151;">
                  ✉️ &nbsp;<a href="mailto:${a.email}" style="color:${a.brandColor};text-decoration:none;font-weight:600;">${a.email}</a>
                </p>
                <p style="margin:0;font-size:14px;line-height:1.7;color:#374151;">
                  🌐 &nbsp;<a href="https://${a.website}" style="color:${a.brandColor};text-decoration:none;font-weight:600;">${a.website}</a>
                </p>

                <!-- Spacer -->
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td style="height:14px;line-height:14px;font-size:14px;">&nbsp;</td></tr></table>

                <!-- Social links -->
                <p style="margin:0;font-size:12px;line-height:1.5;color:#9ca3af;">
                  <a href="${a.instagram}" style="color:#9ca3af;text-decoration:none;">Instagram</a>
                  &nbsp;·&nbsp;
                  <a href="${a.facebook}" style="color:#9ca3af;text-decoration:none;">Facebook</a>
                  &nbsp;·&nbsp;
                  <a href="${a.youtube}" style="color:#9ca3af;text-decoration:none;">YouTube</a>
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="background-color:#f8fafc;padding:24px 40px;text-align:center;border-top:1px solid #e5e7eb;">
                <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.6;">
                  This is an automated message — please don't reply directly.<br>
                  To reach ${a.name.split(" ")[0]}, email <a href="mailto:${a.email}" style="color:#9ca3af;">${a.email}</a> or call <a href="tel:${phoneDigits}" style="color:#9ca3af;">${a.phone}</a>.
                </p>
                <p style="margin:10px 0 0;font-size:11px;color:#9ca3af;">
                  © ${new Date().getFullYear()} ${a.name} · ${a.brokerage}
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
    });

    console.log("✅ Lead welcome email sent successfully via Resend:", data);
    return data;
  } catch (error) {
    console.error("❌ Error sending lead welcome email via Resend:", error);
    if (error instanceof Error) {
      console.error("Error details:", error.message);
    }
    throw error;
  }
}

export async function sendPartnerApplicationEmail(
  email: string,
  name: string,
  companyName: string,
  partnerType: string,
) {
  const resend = getResendClient();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || 'https://chatrealty.io';
  const typeLabel = partnerType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  console.log('📧 Sending partner application confirmation to:', email);

  try {
    const { data, error } = await resend.emails.send({
      from: platformFrom(),
      replyTo: `noreply@${NOREPLY_DOMAIN}`,
      to: email,
      subject: 'Welcome to ChatRealty — Your Service Partner Application',
      html: renderBrandedEmail({
        title: 'Application received',
        preheader: 'Your ChatRealty Service Partner application is under review.',
        bodyHtml: `
          <p style="margin:0 0 16px;">Hi ${name || 'there'},</p>
          <p style="margin:0 0 16px;">
            Thank you for applying to join the ChatRealty Service Partner Network! We've received your application and it's currently under review.
          </p>
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;margin:24px 0;">
            <h3 style="color:#166534;font-size:14px;margin:0 0 12px;text-transform:uppercase;letter-spacing:0.5px;">Application Summary</h3>
            <table style="width:100%;font-size:14px;color:#334155;">
              <tr><td style="padding:4px 0;color:#64748b;">Company</td><td style="padding:4px 0;font-weight:600;">${companyName}</td></tr>
              <tr><td style="padding:4px 0;color:#64748b;">Partner Type</td><td style="padding:4px 0;font-weight:600;">${typeLabel}</td></tr>
              <tr><td style="padding:4px 0;color:#64748b;">Status</td><td style="padding:4px 0;font-weight:600;color:#059669;">Pending Review</td></tr>
            </table>
          </div>
          <p style="margin:24px 0 8px;font-weight:600;">What happens next?</p>
          <ol style="margin:0 0 16px;font-size:14px;line-height:1.8;padding-left:20px;">
            <li>Our team will review your application (typically 1-2 business days)</li>
            <li>You'll receive an email once your application is approved</li>
            <li>Once approved, you can set up your full partner profile and start connecting with agents</li>
          </ol>
          <p style="margin:0;color:#94a3b8;font-size:13px;">
            If you have any questions, reply to this email or contact us at support@chatrealty.io
          </p>
        `,
        cta: { label: 'View your partner dashboard', url: `${baseUrl}/partner/settings` },
      }),
    });

    if (error) {
      console.error('❌ Partner application email error:', error);
      return null;
    }

    console.log('✅ Partner application email sent:', data?.id);
    return data;
  } catch (error: any) {
    console.error('Failed to send partner application email:', error);
    return null;
  }
}

export async function sendPartnerApplicationNotification(
  applicantEmail: string,
  applicantName: string,
  companyName: string,
  partnerType: string,
  phone: string,
  website: string,
  licenseNumber: string,
  nmlsId: string,
) {
  const resend = getResendClient();
  const adminEmail = ADMIN_EMAIL;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || 'https://chatrealty.io';
  const typeLabel = partnerType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  console.log('📧 Sending partner application notification to admin:', adminEmail);

  try {
    const { data, error } = await resend.emails.send({
      from: platformFrom(),
      replyTo: applicantEmail,
      to: adminEmail,
      subject: `[Partner Request] New Application: ${companyName} (${typeLabel})`,
      headers: {
        'X-Entity-Ref-ID': `partner-apply-${Date.now()}`,
      },
      html: renderBrandedEmail({
        title: 'New service partner application',
        bodyHtml: `
          <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:20px;margin:0 0 16px;">
            <table style="width:100%;font-size:14px;color:#334155;">
              <tr><td style="padding:6px 0;color:#64748b;width:120px;">Applicant</td><td style="padding:6px 0;font-weight:600;">${applicantName || 'N/A'}</td></tr>
              <tr><td style="padding:6px 0;color:#64748b;">Email</td><td style="padding:6px 0;font-weight:600;"><a href="mailto:${applicantEmail}" style="color:#2563eb;">${applicantEmail}</a></td></tr>
              <tr><td style="padding:6px 0;color:#64748b;">Company</td><td style="padding:6px 0;font-weight:600;">${companyName}</td></tr>
              <tr><td style="padding:6px 0;color:#64748b;">Type</td><td style="padding:6px 0;font-weight:600;">${typeLabel}</td></tr>
              ${phone ? `<tr><td style="padding:6px 0;color:#64748b;">Phone</td><td style="padding:6px 0;">${phone}</td></tr>` : ''}
              ${website ? `<tr><td style="padding:6px 0;color:#64748b;">Website</td><td style="padding:6px 0;"><a href="${website}" style="color:#2563eb;">${website}</a></td></tr>` : ''}
              ${licenseNumber ? `<tr><td style="padding:6px 0;color:#64748b;">License #</td><td style="padding:6px 0;">${licenseNumber}</td></tr>` : ''}
              ${nmlsId ? `<tr><td style="padding:6px 0;color:#64748b;">NMLS ID</td><td style="padding:6px 0;">${nmlsId}</td></tr>` : ''}
            </table>
          </div>
          <p style="margin:0;color:#94a3b8;font-size:12px;">Reply to this email to contact the applicant directly.</p>
        `,
        cta: { label: 'Review in agent dashboard', url: `${baseUrl}/agent/dashboard` },
      }),
    });

    if (error) {
      console.error('❌ Admin notification email error:', error);
      return null;
    }

    console.log('✅ Admin notification sent:', data?.id);
    return data;
  } catch (error: any) {
    console.error('Failed to send admin notification:', error);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Subscription emails (Pro upgrade / cancellation)
// ---------------------------------------------------------------------------

export async function sendSubscriptionEmail(
  email: string,
  name: string,
  action: 'subscribed' | 'cancelled',
  expiresAt?: Date | null,
) {
  const resend = getResendClient();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || 'https://chatrealty.io';
  const firstName = name.split(' ')[0] || 'there';

  const isSubscribed = action === 'subscribed';
  const subject = isSubscribed
    ? 'Welcome to Pro — Your Upgrade is Active'
    : 'Your Pro Subscription Has Been Cancelled';

  const heading = isSubscribed
    ? 'You\'re on Pro!'
    : 'Subscription Cancelled';

  const body = isSubscribed
    ? `<p style="color:#334155;font-size:15px;line-height:1.7;">
        Hey ${firstName}, your Pro upgrade is now active. You have access to:
      </p>
      <ul style="color:#334155;font-size:14px;line-height:2;padding-left:20px;">
        <li>100 AI chat queries per day</li>
        <li>Unlimited saved listings & searches</li>
        <li>Price drop & new listing alerts</li>
        <li>Advanced search filters</li>
        <li>Priority email support</li>
      </ul>
      <p style="color:#334155;font-size:15px;line-height:1.7;">
        Start exploring — your AI assistant is ready to help you find the perfect home.
      </p>`
    : `<p style="color:#334155;font-size:15px;line-height:1.7;">
        Hey ${firstName}, your Pro subscription has been cancelled.
        ${expiresAt ? `You'll keep access to Pro features until <strong>${expiresAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</strong>.` : ''}
      </p>
      <p style="color:#334155;font-size:15px;line-height:1.7;">
        After that, your account will revert to the Free plan. You can re-subscribe anytime from your settings.
      </p>`;

  const ctaText = isSubscribed ? 'Start Searching' : 'Back to Settings';
  const ctaUrl = isSubscribed ? `${baseUrl}/map` : `${baseUrl}/dashboard/settings`;

  console.log(`📧 Sending subscription ${action} email to:`, email);

  try {
    const { data, error } = await resend.emails.send({
      from: platformFrom(),
      to: [email],
      replyTo: ADMIN_EMAIL,
      subject,
      html: renderBrandedEmail({
        title: heading,
        bodyHtml: body,
        cta: { label: ctaText, url: ctaUrl },
      }),
    });

    if (error) {
      console.error('❌ Subscription email error:', error);
      return null;
    }
    console.log(`✅ Subscription ${action} email sent:`, data?.id);
    return data;
  } catch (error: any) {
    console.error('Failed to send subscription email:', error);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Cancellation notification to admin
// ---------------------------------------------------------------------------

export async function sendCancellationNotification(
  userEmail: string,
  userName: string,
  reason: string,
  feedback: string,
  expiresAt?: Date | null,
) {
  const resend = getResendClient();
  const adminEmail = ADMIN_EMAIL;

  console.log('📧 Sending cancellation notification to admin:', adminEmail);

  try {
    const { data, error } = await resend.emails.send({
      from: platformFrom(),
      replyTo: userEmail,
      to: adminEmail,
      subject: `[Cancellation] ${userName || userEmail} cancelled Pro`,
      html: renderBrandedEmail({
        title: 'Pro subscription cancelled',
        bodyHtml: `
          <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:20px;margin:0 0 24px;">
            <table style="width:100%;font-size:14px;color:#334155;">
              <tr><td style="padding:6px 0;color:#64748b;width:100px;">User</td><td style="padding:6px 0;font-weight:600;">${userName || 'N/A'}</td></tr>
              <tr><td style="padding:6px 0;color:#64748b;">Email</td><td style="padding:6px 0;"><a href="mailto:${userEmail}" style="color:#2563eb;">${userEmail}</a></td></tr>
              ${expiresAt ? `<tr><td style="padding:6px 0;color:#64748b;">Access Until</td><td style="padding:6px 0;">${expiresAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</td></tr>` : ''}
              ${reason ? `<tr><td style="padding:6px 0;color:#64748b;">Reason</td><td style="padding:6px 0;font-weight:600;">${reason}</td></tr>` : ''}
            </table>
          </div>
          ${feedback ? `
            <div style="margin:0 0 24px;">
              <p style="color:#64748b;font-size:12px;margin:0 0 8px;font-weight:600;">FEEDBACK</p>
              <p style="color:#334155;font-size:14px;margin:0;background:#f8fafc;border-radius:8px;padding:16px;border:1px solid #e2e8f0;">${feedback}</p>
            </div>
          ` : ''}
          <p style="margin:0;color:#94a3b8;font-size:12px;">Reply to this email to reach the user directly.</p>
        `,
      }),
    });

    if (error) {
      console.error('❌ Cancellation notification error:', error);
      return null;
    }
    console.log('✅ Cancellation notification sent:', data?.id);
    return data;
  } catch (error: any) {
    console.error('Failed to send cancellation notification:', error);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Email change verification
// ---------------------------------------------------------------------------

export async function sendEmailChangeVerification(
  newEmail: string,
  name: string,
  token: string,
) {
  const resend = getResendClient();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || 'https://chatrealty.io';
  const verifyUrl = `${baseUrl}/api/auth/confirm-email-change?token=${token}`;
  const firstName = name.split(' ')[0] || 'there';

  console.log('📧 Sending email change verification to:', newEmail);

  try {
    const { data, error } = await resend.emails.send({
      from: platformFrom(),
      to: [newEmail],
      subject: 'Confirm your new email address',
      html: renderBrandedEmail({
        title: 'Confirm your new email',
        bodyHtml: `
          <p style="margin:0 0 16px;">
            Hey ${firstName}, we received a request to change your ChatRealty account email to this address. Click below to confirm.
          </p>
          <p style="margin:0;color:#94a3b8;font-size:13px;">
            This link expires in 1 hour. If you didn't request this change, ignore this email.
          </p>
        `,
        cta: { label: 'Confirm email change', url: verifyUrl },
      }),
    });

    if (error) {
      console.error('❌ Email change verification error:', error);
      return null;
    }
    console.log('✅ Email change verification sent:', data?.id);
    return data;
  } catch (error: any) {
    console.error('Failed to send email change verification:', error);
    return null;
  }
}

export async function sendAgentApprovalEmail(
  email: string,
  name: string,
  subdomain: string,
) {
  const resend = getResendClient();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || 'https://chatrealty.io';
  const firstName = name.split(' ')[0] || 'there';
  const subdomainUrl = `https://${subdomain}.chatrealty.io`;

  console.log('📧 Sending agent approval email to:', email);

  try {
    const { data, error } = await resend.emails.send({
      from: platformFrom(),
      to: [email],
      replyTo: ADMIN_EMAIL,
      subject: 'Welcome to ChatRealty — your agent account is approved',
      html: renderBrandedEmail({
        title: "You're approved!",
        preheader: `Your agent account is ready — ${subdomain}.chatrealty.io is reserved for you.`,
        bodyHtml: `
          <p style="margin:0 0 16px;">Hey ${escapeHtml(firstName)}, welcome to ChatRealty. Your license checked out and your agent account is approved. Here's what's ready for you:</p>
          <div style="background-color:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:20px;margin:0 0 20px;">
            <p style="margin:0 0 8px;color:#1e40af;font-size:13px;font-weight:600;">YOUR SUBDOMAIN</p>
            <p style="margin:0;font-size:18px;font-weight:700;">
              <a href="${subdomainUrl}" style="color:#2563eb;text-decoration:none;">${subdomain}.chatrealty.io</a>
            </p>
            <p style="margin:8px 0 0;color:#64748b;font-size:13px;">
              Your personal real estate site. Subscribe to a plan to activate it.
            </p>
          </div>
          <p style="margin:0 0 8px;font-weight:600;">Next steps:</p>
          <ol style="margin:0;font-size:14px;line-height:2;padding-left:20px;">
            <li>Complete your agent profile in settings</li>
            <li>Choose a subscription plan to activate your subdomain</li>
            <li>Upload your branding (logo, hero photo, headshot)</li>
            <li>Add your social media links</li>
            <li>Optionally purchase a custom domain</li>
          </ol>
        `,
        cta: {
          label: 'Set up your profile',
          url: `${baseUrl}/agent/settings?onboarding=true`,
        },
      }),
    });

    if (error) {
      console.error('❌ Agent approval email error:', error);
      return null;
    }
    console.log('✅ Agent approval email sent:', data?.id);
    return data;
  } catch (error: any) {
    console.error('Failed to send agent approval email:', error);
    return null;
  }
}

function prettyPartnerType(type?: string): string {
  if (!type) return "Service Partner";
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Sent to a service partner when their application is APPROVED (whether by an
 * admin, auto-approve, or the 24h backstop). Lets them know they're now listed.
 */
export async function sendPartnerApprovalEmail(
  email: string,
  name: string,
  companyName: string,
  type: string,
) {
  const resend = getResendClient();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || 'https://chatrealty.io';
  const firstName = (name || '').split(' ')[0] || 'there';
  const typeLabel = prettyPartnerType(type);

  console.log('📧 Sending partner approval email to:', email);

  try {
    const { data, error } = await resend.emails.send({
      from: platformFrom(),
      to: [email],
      replyTo: ADMIN_EMAIL,
      subject: `You're approved — ${companyName || 'your business'} is now in the ChatRealty partner directory`,
      html: renderBrandedEmail({
        title: "You're approved!",
        preheader: 'Welcome to the ChatRealty Partner Network',
        bodyHtml: `
          <p style="margin:0 0 16px;">
            Hi ${firstName}, great news — <strong>${companyName || 'your business'}</strong> has been approved
            as a <strong>${typeLabel}</strong> and is now listed in the ChatRealty partner directory, where
            agents and their clients can find and connect with you.
          </p>
          <p style="margin:0;color:#64748b;font-size:13px;">
            You can update your company profile, service areas, and specializations any time in
            <a href="${baseUrl}/partner/settings" style="color:#2563eb;">your partner settings</a>.
          </p>
        `,
        cta: { label: 'View the directory', url: `${baseUrl}/directory` },
      }),
    });

    if (error) {
      console.error('❌ Partner approval email error:', error);
      return null;
    }
    console.log('✅ Partner approval email sent:', data?.id);
    return data;
  } catch (error: any) {
    console.error('Failed to send partner approval email:', error);
    return null;
  }
}

/**
 * Sent to each co-marketing participant when an agent bills a campaign's ad
 * spend to a partnership. Links them into their account to review their share,
 * top up credits if needed, and approve or deny the ad spend.
 */
export async function sendCoMarketingApprovalEmail(opts: {
  email: string;
  name: string;
  agentName: string;
  campaignName: string;
  shareCredits: number;
  shareDollars: number;
  reviewUrl: string;
}) {
  const resend = getResendClient();
  const firstName = (opts.name || '').split(' ')[0] || 'there';

  console.log('📧 Sending co-marketing approval email to:', opts.email);

  try {
    const { data, error } = await resend.emails.send({
      from: platformFrom(),
      to: [opts.email],
      replyTo: ADMIN_EMAIL,
      subject: `Approve your share of ${opts.agentName}'s co-marketing campaign`,
      html: renderBrandedEmail({
        title: 'Co-marketing ad spend: your approval is needed',
        preheader: opts.campaignName,
        bodyHtml: `
          <p style="margin:0 0 6px;color:#64748b;font-size:13px;">${opts.campaignName}</p>
          <p style="margin:0 0 16px;">
            Hi ${firstName}, <strong>${opts.agentName}</strong> has set up a co-marketing campaign and
            allocated you a share of the ad spend. You only pay the fair-market value of the advertising
            you receive — nothing more.
          </p>
          <div style="background:#f1f5f9;border-radius:10px;padding:18px 20px;margin:18px 0;">
            <p style="margin:0;font-size:13px;color:#64748b;">Your share</p>
            <p style="margin:4px 0 0;font-size:22px;font-weight:700;color:#0f172a;">
              ${opts.shareCredits.toLocaleString()} credits
              <span style="font-size:14px;font-weight:500;color:#64748b;">(~$${opts.shareDollars.toFixed(2)} in ad spend)</span>
            </p>
          </div>
          <p style="margin:0 0 16px;font-size:14px;">
            Review the creative and approve or deny your share in your account. If your credit balance
            doesn't cover it, you'll be able to top up first — the campaign launches only after every
            party approves.
          </p>
          <p style="margin:0;color:#94a3b8;font-size:12px;">
            This is a joint marketing arrangement. Your payment is for your own advertising, not a referral.
          </p>
        `,
        cta: { label: 'Review & approve', url: opts.reviewUrl },
      }),
    });

    if (error) {
      console.error('❌ Co-marketing approval email error:', error);
      return null;
    }
    console.log('✅ Co-marketing approval email sent:', data?.id);
    return data;
  } catch (error: any) {
    console.error('Failed to send co-marketing approval email:', error);
    return null;
  }
}

/**
 * Sent to a service partner when their application is REJECTED by an admin.
 */
export async function sendPartnerRejectionEmail(
  email: string,
  name: string,
  companyName: string,
  reason?: string,
) {
  const resend = getResendClient();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || 'https://chatrealty.io';
  const firstName = (name || '').split(' ')[0] || 'there';

  console.log('📧 Sending partner rejection email to:', email);

  try {
    const { data, error } = await resend.emails.send({
      from: platformFrom(),
      to: [email],
      replyTo: ADMIN_EMAIL,
      subject: `Update on your ChatRealty partner application`,
      html: renderBrandedEmail({
        title: 'Partner application update',
        bodyHtml: `
          <p style="margin:0 0 16px;">
            Hi ${firstName}, thank you for your interest in joining the ChatRealty partner directory with
            <strong>${companyName || 'your business'}</strong>. After review, we're not able to approve the
            application at this time.
          </p>
          ${reason ? `<div style="background:#f1f5f9;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin:16px 0;"><p style="color:#475569;font-size:13px;font-weight:600;margin:0 0 6px;">REASON</p><p style="color:#334155;font-size:14px;margin:0;">${reason}</p></div>` : ''}
          <p style="margin:0;color:#64748b;font-size:14px;">
            If you believe this was a mistake or you'd like to provide additional information, just reply to
            this email and we'll take another look.
          </p>
        `,
        cta: { label: 'Re-apply', url: `${baseUrl}/partner/settings/apply` },
      }),
    });

    if (error) {
      console.error('❌ Partner rejection email error:', error);
      return null;
    }
    console.log('✅ Partner rejection email sent:', data?.id);
    return data;
  } catch (error: any) {
    console.error('Failed to send partner rejection email:', error);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Job applications (/join) — admin notification with the files attached
// ---------------------------------------------------------------------------

export async function sendJobApplicationNotification(opts: {
  roleTitle: string;
  name: string;
  email: string;
  phone?: string;
  linkedin?: string;
  answers: { question: string; answer: string }[];
  coverLetterText?: string;
  attachments: { filename: string; content: Buffer }[];
}) {
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const qa = opts.answers
    .map(
      (a, i) => `
        <p style="margin:16px 0 4px;font-weight:600;color:#0f172a;">${i + 1}. ${esc(a.question)}</p>
        <p style="margin:0;white-space:pre-wrap;">${esc(a.answer)}</p>`
    )
    .join('');
  try {
    const resend = getResendClient();
    const { error } = await resend.emails.send({
      from: platformFrom(),
      replyTo: opts.email,
      to: ADMIN_EMAIL,
      subject: `[Careers] ${opts.roleTitle}: ${opts.name}`,
      attachments: opts.attachments,
      html: renderBrandedEmail({
        title: `New application: ${esc(opts.roleTitle)}`,
        bodyHtml: `
          <p style="margin:0;"><strong>${esc(opts.name)}</strong> &lt;${esc(opts.email)}&gt;</p>
          ${opts.phone ? `<p style="margin:0;">${esc(opts.phone)}</p>` : ''}
          ${opts.linkedin ? `<p style="margin:0;">${esc(opts.linkedin)}</p>` : ''}
          <p style="margin:12px 0 0;font-size:13px;color:#64748b;">Résumé${opts.attachments.length > 1 ? ' and cover letter' : ''} attached.</p>
          <h3 style="margin:24px 0 0;color:#0f172a;">Screening answers</h3>
          ${qa}
          ${opts.coverLetterText ? `<h3 style="margin:24px 0 8px;color:#0f172a;">Cover letter</h3><p style="white-space:pre-wrap;margin:0;">${esc(opts.coverLetterText)}</p>` : ''}
          <p style="margin-top:24px;font-size:12px;color:#94a3b8;">Reply to this email to contact the applicant. The application is also saved in the job_applications collection.</p>
        `,
      }),
    });
    if (error) console.error('[careers] application notification error:', error);
  } catch (error) {
    console.error('[careers] application notification failed:', error);
  }
}

/**
 * Confirmation to the person who booked an in-office AI class (/ai-classes).
 * Sent as the platform (ChatRealty <noreply@chatrealty.io>), never as an agent:
 * the class is ChatRealty's product, booked on the platform host.
 */
export async function sendAiClassConfirmationEmail(opts: {
  to: string;
  name: string;
  startTime: string;
  endTime: string;
  intake: AiClassIntake;
}) {
  const { to, name, startTime, intake } = opts;
  const resend = getResendClient();
  const firstName = name.trim().split(' ')[0] || 'there';
  const when = new Date(startTime).toLocaleString('en-US', {
    timeZone: 'America/Los_Angeles',
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });
  const office = `${intake.brokerage}${intake.officeName ? ` — ${intake.officeName}` : ''}`;
  const poc = intake.pointOfContact;

  // Prep checklist from the room answers: only ask for what we said we'd need.
  const prep: string[] = [];
  const eq = intake.equipment || {};
  if (eq.tv !== 'yes' && eq.projector !== 'yes') prep.push('A TV or projector we can present on (let us know if there isn\'t one and we\'ll plan around it)');
  if (eq.wifi !== 'yes') prep.push('The guest Wi-Fi name and password for attendees');
  if (intake.laptops !== 'no') prep.push('Agents bring a laptop, charged, if they can — the class is hands-on');
  prep.push(`${poc.name} reachable at ${poc.phone} on the day of the class`);

  const row = (label: string, value: string) =>
    `<tr><td style="padding:4px 12px 4px 0;color:#64748b;font-size:13px;white-space:nowrap;vertical-align:top;">${label}</td><td style="padding:4px 0;font-size:14px;">${value}</td></tr>`;

  try {
    const { data, error } = await resend.emails.send({
      from: platformFrom(),
      to: [to],
      replyTo: ADMIN_EMAIL,
      subject: `Your ChatRealty AI class is booked — ${when}`,
      html: renderBrandedEmail({
        title: 'Your AI class is booked',
        preheader: `${when} at ${intake.brokerage}. Here's what to have ready.`,
        bodyHtml: `
          <p style="margin:0 0 16px;">Hi ${escapeHtml(firstName)}, thanks for booking a ChatRealty AI class for your office. We'll teach your agents ChatRealty, Claude Code / Codex and AI content creation, in person.</p>
          <div style="background-color:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:16px 20px;margin:0 0 20px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              ${row('When', `<strong>${escapeHtml(when)}</strong> · ${AI_CLASS_LENGTH_LABEL} class`)}
              ${row('Where', `${escapeHtml(office)}<br>${escapeHtml(intake.address)}, ${escapeHtml(intake.city)}`)}
              ${row('Contact', `${escapeHtml(poc.name)} · ${escapeHtml(poc.phone)}`)}
              ${intake.expectedAttendees ? row('Attendees', String(intake.expectedAttendees)) : ''}
            </table>
          </div>
          <p style="margin:0 0 8px;font-weight:600;">Before the class, please have ready:</p>
          <ul style="margin:0 0 20px;font-size:14px;line-height:1.9;padding-left:20px;">
            ${prep.map((p) => `<li>${escapeHtml(p)}</li>`).join('')}
          </ul>
          <p style="margin:0;">A calendar invite is on its way separately. Need to change the time or anything about the room? Just reply to this email.</p>
        `,
      }),
    });

    if (error) {
      console.error('❌ AI class confirmation email error:', error);
      return null;
    }
    return data;
  } catch (error: any) {
    console.error('Failed to send AI class confirmation email:', error);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Affiliate program (docs/commerce/affiliates.md). Platform mail: branded
// shell + platformFrom(). Money rules come from src/config/affiliates.ts.
// ---------------------------------------------------------------------------

/** Send a platform email (ChatRealty sender, admin reply-to). Best-effort: returns null on failure. */
export async function sendPlatformEmail(tag: string, to: string, subject: string, html: string) {
  try {
    const { data, error } = await getResendClient().emails.send({
      from: platformFrom(),
      to: [to],
      replyTo: ADMIN_EMAIL,
      subject,
      html,
    });
    if (error) {
      console.error(`❌ ${tag} email error:`, error);
      return null;
    }
    return data;
  } catch (error: any) {
    console.error(`Failed to send ${tag} email:`, error);
    return null;
  }
}

/** Applicant: "we got your application". */
export async function sendAffiliateApplicationReceivedEmail(email: string, name: string) {
  const firstName = escapeHtml((name || '').split(' ')[0] || 'there');
  return sendPlatformEmail(
    'Affiliate application received',
    email,
    'We got your ChatRealty affiliate application',
    renderBrandedEmail({
      title: 'Application received',
      preheader: "We'll review it and email you your link once you're approved.",
      bodyHtml: `
        <p style="margin:0 0 16px;">Hi ${firstName}, thanks for applying to the ChatRealty affiliate program.</p>
        <p style="margin:0 0 16px;">We review every application by hand. Once you're approved we'll email your personal link — every agent who subscribes through it earns you a monthly commission for as long as they stay subscribed.</p>
      `,
    }),
  );
}

/** Admin: a new affiliate applied. */
export async function sendAffiliateApplicationAdminNotification(app: {
  name: string;
  email: string;
  website?: string;
  audience?: string;
  promotionPlan?: string;
  isSettlementServiceProvider?: boolean;
}) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || 'https://chatrealty.io';
  const row = (k: string, v?: string) =>
    v ? `<tr><td style="padding:4px 12px 4px 0;color:#64748b;vertical-align:top;">${k}</td><td style="padding:4px 0;">${escapeHtml(v)}</td></tr>` : '';
  return sendPlatformEmail(
    'Affiliate admin notification',
    ADMIN_EMAIL,
    `New affiliate application: ${app.name}`,
    renderBrandedEmail({
      title: 'New affiliate application',
      bodyHtml: `
        <table role="presentation" style="font-size:14px;border-collapse:collapse;">
          ${row('Name', app.name)}${row('Email', app.email)}${row('Website', app.website)}
          ${row('Audience', app.audience)}${row('How they will promote', app.promotionPlan)}
          ${row('Licensed RE / lender / title / escrow', app.isSettlementServiceProvider ? 'Yes — check with counsel before approving' : 'No')}
        </table>
      `,
      cta: { label: 'Review affiliates', url: `${baseUrl}/admin/affiliates` },
    }),
  );
}

/** Applicant: approved — their code, link and how they get paid. */
export async function sendAffiliateApprovalEmail(email: string, name: string, code: string, link: string) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || 'https://chatrealty.io';
  const firstName = escapeHtml((name || '').split(' ')[0] || 'there');
  const { AFFILIATE_TIERS, PAYOUT_MINIMUM_USD, REFUND_HOLD_DAYS } = await import('@/config/affiliates');
  const tierRows = AFFILIATE_TIERS.map(
    (t) => `<tr><td style="padding:3px 16px 3px 0;">${escapeHtml(t.label)}</td><td style="padding:3px 0;font-weight:600;">$${t.ratePerAgent}/agent/month</td></tr>`,
  ).join('');
  return sendPlatformEmail(
    'Affiliate approval',
    email,
    "You're approved — here's your ChatRealty affiliate link",
    renderBrandedEmail({
      title: "You're a ChatRealty affiliate",
      preheader: `Your code is ${code}. Share your link and earn every month an agent stays subscribed.`,
      bodyHtml: `
        <p style="margin:0 0 16px;">Hi ${firstName}, you're approved. Share your link with real estate agents — when one subscribes to ChatRealty through it, you earn a flat amount every month they keep paying.</p>
        <div style="background-color:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:20px;margin:0 0 20px;">
          <p style="margin:0 0 6px;color:#1e40af;font-size:13px;font-weight:600;">YOUR CODE</p>
          <p style="margin:0 0 14px;font-size:20px;font-weight:700;letter-spacing:1px;">${escapeHtml(code)}</p>
          <p style="margin:0 0 6px;color:#1e40af;font-size:13px;font-weight:600;">YOUR LINK</p>
          <p style="margin:0;font-size:15px;"><a href="${link}" style="color:#2563eb;">${escapeHtml(link)}</a></p>
        </div>
        <p style="margin:0 0 8px;font-weight:600;">What you earn</p>
        <p style="margin:0 0 8px;font-size:14px;">The rate depends on how many of your agents are paying right now, and applies to all of them:</p>
        <table role="presentation" style="font-size:14px;border-collapse:collapse;margin:0 0 16px;">${tierRows}</table>
        <p style="margin:0 0 16px;font-size:14px;">Commissions become payable ${REFUND_HOLD_DAYS} days after the agent's payment and are paid monthly once your balance reaches $${PAYOUT_MINIMUM_USD}. To get paid, connect a payout account from your affiliate dashboard (Stripe handles your bank details and tax form).</p>
        <p style="margin:0 0 16px;font-size:14px;"><strong>You must tell people you're paid.</strong> Wherever you share your link, say you earn a commission if they subscribe (FTC rule). Commissions are paid on ChatRealty subscriptions only — never on a home sale, lead or closing. Full terms: <a href="${baseUrl}/affiliate-terms" style="color:#2563eb;">${baseUrl}/affiliate-terms</a>.</p>
      `,
      cta: { label: 'Open your affiliate dashboard', url: `${baseUrl}/partner/affiliate` },
    }),
  );
}

/** Applicant: not approved. */
export async function sendAffiliateRejectionEmail(email: string, name: string, reason?: string) {
  const firstName = escapeHtml((name || '').split(' ')[0] || 'there');
  return sendPlatformEmail(
    'Affiliate rejection',
    email,
    'Your ChatRealty affiliate application',
    renderBrandedEmail({
      title: 'About your application',
      bodyHtml: `
        <p style="margin:0 0 16px;">Hi ${firstName}, thanks for your interest in the ChatRealty affiliate program. We're not able to approve your application right now.</p>
        ${reason ? `<p style="margin:0 0 16px;color:#64748b;">${escapeHtml(reason)}</p>` : ''}
        <p style="margin:0;">If you have questions, just reply to this email.</p>
      `,
    }),
  );
}
