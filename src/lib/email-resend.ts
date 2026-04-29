// src/lib/email-resend.ts
// Email utilities using Resend (more reliable than Gmail)

import { Resend } from 'resend';

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

export async function sendVerificationEmail(
  email: string,
  token: string,
  name: string
) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || 'https://www.jpsrealtor.com';
  const verificationUrl = `${baseUrl}/auth/verify-email?token=${token}`;

  console.log('📧 Sending verification email via Resend to:', email);
  console.log('🔗 Verification URL:', verificationUrl);

  try {
    const resend = getResendClient();
    const data = await resend.emails.send({
      from: 'Joey Sardella Real Estate <noreply@jpsrealtor.com>',
      to: [email],
      replyTo: 'noreply@jpsrealtor.com',
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
                background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
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
                background: #3b82f6;
                color: white !important;
                text-decoration: none;
                border-radius: 6px;
                margin: 25px 0;
                font-weight: 600;
              }
              .button:hover {
                background: #2563eb;
              }
              .link-fallback {
                word-break: break-all;
                color: #3b82f6;
                font-size: 13px;
                margin: 20px 0;
              }
              .signature {
                margin-top: 40px;
                padding-top: 20px;
                border-top: 1px solid #e5e7eb;
                font-size: 14px;
                line-height: 1.8;
              }
              .signature-name {
                font-weight: 600;
                margin-bottom: 5px;
              }
              .signature-info {
                color: #666;
                margin: 2px 0;
              }
              .signature-links a {
                color: #3b82f6;
                text-decoration: none;
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
                <h1>Welcome to JPSRealtor!</h1>
              </div>
              <div class="content">
                <p>Hi ${name},</p>
                <p>Thank you for creating an account with JPSRealtor. To get started, please verify your email address by clicking the button below:</p>
                <p style="text-align: center;">
                  <a href="${verificationUrl}" class="button">Verify Email Address</a>
                </p>
                <p>Or copy and paste this link into your browser:</p>
                <p class="link-fallback">${verificationUrl}</p>
                <p style="color: #666; font-size: 14px;">This verification link will expire in 24 hours.</p>
                <p style="color: #666; font-size: 14px; margin-top: 30px;">If you didn't create this account, you can safely ignore this email.</p>

                <div class="signature">
                  <p class="signature-name">Sincerely,</p>
                  <p class="signature-name">Joseph Sardella</p>
                  <p class="signature-info">DRE: 02106916</p>
                  <p class="signature-info">Obsidian Group - eXp Realty</p>
                  <br>
                  <p class="signature-info signature-links">
                    E: <a href="mailto:josephsardella@gmail.com">josephsardella@gmail.com</a><br>
                    W: <a href="mailto:joseph@obsidianregroup.com">joseph@obsidianregroup.com</a> (for transactions)<br>
                    P: <a href="tel:+17603333676">(760) 333-3676</a><br>
                    W: <a href="tel:+17608336334">(760) 833-6334</a><br>
                    <a href="https://www.obsidianregroup.com">www.obsidianregroup.com</a><br>
                    <a href="https://jpsrealtor.com">https://jpsrealtor.com</a>
                  </p>
                </div>
              </div>
              <div class="footer">
                <p>&copy; ${new Date().getFullYear()} Joseph Sardella - Obsidian Group, eXp Realty. All rights reserved.</p>
              </div>
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
  name: string
) {
  console.log('📧 Sending 2FA code via Resend to:', email);

  try {
    const resend = getResendClient();
    const data = await resend.emails.send({
      from: 'Joey Sardella Real Estate <noreply@jpsrealtor.com>',
      to: [email],
      replyTo: 'noreply@jpsrealtor.com',
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
                background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
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
                border: 2px solid #3b82f6;
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
                color: #1e3a8a;
                font-family: 'Courier New', monospace;
              }
              .signature {
                margin-top: 40px;
                padding-top: 20px;
                border-top: 1px solid #e5e7eb;
                font-size: 14px;
                line-height: 1.8;
              }
              .signature-name {
                font-weight: 600;
                margin-bottom: 5px;
              }
              .signature-info {
                color: #666;
                margin: 2px 0;
              }
              .signature-links a {
                color: #3b82f6;
                text-decoration: none;
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

                <div class="signature">
                  <p class="signature-name">Sincerely,</p>
                  <p class="signature-name">Joseph Sardella</p>
                  <p class="signature-info">DRE: 02106916</p>
                  <p class="signature-info">Obsidian Group - eXp Realty</p>
                  <br>
                  <p class="signature-info signature-links">
                    E: <a href="mailto:josephsardella@gmail.com">josephsardella@gmail.com</a><br>
                    W: <a href="mailto:joseph@obsidianregroup.com">joseph@obsidianregroup.com</a> (for transactions)<br>
                    P: <a href="tel:+17603333676">(760) 333-3676</a><br>
                    W: <a href="tel:+17608336334">(760) 833-6334</a><br>
                    <a href="https://www.obsidianregroup.com">www.obsidianregroup.com</a><br>
                    <a href="https://jpsrealtor.com">https://jpsrealtor.com</a>
                  </p>
                </div>
              </div>
              <div class="footer">
                <p>&copy; ${new Date().getFullYear()} Joseph Sardella - Obsidian Group, eXp Realty. All rights reserved.</p>
              </div>
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
  name: string
) {
  console.log('📧 Sending password reset email via Resend to:', email);
  console.log('🔗 Reset URL:', resetUrl);

  try {
    const resend = getResendClient();
    const data = await resend.emails.send({
      from: 'Joey Sardella Real Estate <noreply@jpsrealtor.com>',
      to: [email],
      replyTo: 'noreply@jpsrealtor.com',
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
                  We received a request to reset your password for your Joey Sardella Real Estate account.
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
                <p><strong>Joey Sardella Real Estate</strong></p>
                <p>Your trusted partner in real estate</p>
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
    name: agent.name || "Joseph Sardella",
    headshot: agent.headshot || "",
    brokerage: agent.brokerage || "eXp Realty",
    licenseNumber: agent.licenseNumber || "02106916",
    phone: agent.phone || "(760) 333-3676",
    email: agent.email || "joseph@jpsrealtor.com",
    website: agent.website || "jpsrealtor.com",
    brandColor: agent.brandColor || "#10b981",
    secondaryColor: agent.secondaryColor || "#06b6d4",
    instagram: agent.instagram || "https://instagram.com/jpsrealtor",
    facebook: agent.facebook || "https://facebook.com/jpsrealtor",
    youtube: agent.youtube || "https://youtube.com/@jpsrealtor",
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
      from: `${a.name} <noreply@jpsrealtor.com>`,
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
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || 'https://www.jpsrealtor.com';
  const typeLabel = partnerType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  console.log('📧 Sending partner application confirmation to:', email);

  try {
    const { data, error } = await resend.emails.send({
      from: 'Joey Sardella Real Estate <noreply@jpsrealtor.com>',
      replyTo: 'noreply@jpsrealtor.com',
      to: email,
      subject: 'Welcome to ChatRealty — Your Service Partner Application',
      html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
          <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
            <div style="background:linear-gradient(135deg,#059669,#0d9488);border-radius:16px 16px 0 0;padding:40px 32px;text-align:center;">
              <h1 style="color:#fff;font-size:24px;margin:0 0 8px;">Application Received</h1>
              <p style="color:#d1fae5;font-size:14px;margin:0;">ChatRealty Service Partner Network</p>
            </div>
            <div style="background:#fff;padding:32px;border:1px solid #e2e8f0;border-top:none;">
              <p style="color:#334155;font-size:16px;line-height:1.6;">Hi ${name || 'there'},</p>
              <p style="color:#334155;font-size:16px;line-height:1.6;">
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
              <h3 style="color:#334155;font-size:16px;margin:24px 0 12px;">What happens next?</h3>
              <ol style="color:#475569;font-size:14px;line-height:1.8;padding-left:20px;">
                <li>Our team will review your application (typically 1-2 business days)</li>
                <li>You'll receive an email once your application is approved</li>
                <li>Once approved, you can set up your full partner profile and start connecting with agents</li>
              </ol>
              <div style="text-align:center;margin:32px 0 16px;">
                <a href="${baseUrl}/partner/settings" style="display:inline-block;background:#059669;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
                  View Your Partner Dashboard
                </a>
              </div>
              <p style="color:#94a3b8;font-size:13px;text-align:center;">
                If you have any questions, reply to this email or contact us at help@josephsardella.com
              </p>
            </div>
            <div style="padding:24px 32px;text-align:center;">
              <p style="color:#94a3b8;font-size:12px;margin:0;">
                Joseph Sardella | eXp Realty | DRE# 02106916<br/>
                ChatRealty Service Partner Network
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
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
  const adminEmail = process.env.EMAIL_USER || 'josephsardella@gmail.com';
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || 'https://www.jpsrealtor.com';
  const typeLabel = partnerType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  console.log('📧 Sending partner application notification to admin:', adminEmail);

  try {
    const { data, error } = await resend.emails.send({
      from: 'ChatRealty Notifications <noreply@jpsrealtor.com>',
      replyTo: applicantEmail,
      to: adminEmail,
      subject: `[Partner Request] New Application: ${companyName} (${typeLabel})`,
      headers: {
        'X-Entity-Ref-ID': `partner-apply-${Date.now()}`,
      },
      html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
          <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
            <div style="background:linear-gradient(135deg,#1e40af,#3b82f6);border-radius:16px 16px 0 0;padding:32px;text-align:center;">
              <h1 style="color:#fff;font-size:20px;margin:0 0 4px;">New Service Partner Application</h1>
              <p style="color:#bfdbfe;font-size:13px;margin:0;">ChatRealty Partner Network</p>
            </div>
            <div style="background:#fff;padding:32px;border:1px solid #e2e8f0;border-top:none;">
              <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:20px;margin:0 0 24px;">
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
              <div style="text-align:center;">
                <a href="${baseUrl}/agent/dashboard" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
                  Review in Agent Dashboard
                </a>
              </div>
              <p style="color:#94a3b8;font-size:12px;text-align:center;margin:16px 0 0;">
                Reply to this email to contact the applicant directly.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
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
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || 'https://www.jpsrealtor.com';
  const firstName = name.split(' ')[0] || 'there';

  const isSubscribed = action === 'subscribed';
  const subject = isSubscribed
    ? 'Welcome to Pro — Your Upgrade is Active'
    : 'Your Pro Subscription Has Been Cancelled';

  const gradientColors = isSubscribed
    ? 'linear-gradient(135deg,#059669,#10b981)'
    : 'linear-gradient(135deg,#6b7280,#9ca3af)';

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
      from: 'Joey Sardella Real Estate <noreply@jpsrealtor.com>',
      to: [email],
      replyTo: 'josephsardella@gmail.com',
      subject,
      html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
          <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
            <div style="background:${gradientColors};border-radius:16px 16px 0 0;padding:32px;text-align:center;">
              <h1 style="color:#fff;font-size:24px;margin:0 0 4px;">${heading}</h1>
              <p style="color:rgba(255,255,255,0.85);font-size:13px;margin:0;">ChatRealty Pro</p>
            </div>
            <div style="background:#fff;padding:32px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 16px 16px;">
              ${body}
              <div style="text-align:center;margin:24px 0 0;">
                <a href="${ctaUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
                  ${ctaText}
                </a>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
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
  const adminEmail = process.env.EMAIL_USER || 'josephsardella@gmail.com';

  console.log('📧 Sending cancellation notification to admin:', adminEmail);

  try {
    const { data, error } = await resend.emails.send({
      from: 'ChatRealty Notifications <noreply@jpsrealtor.com>',
      replyTo: userEmail,
      to: adminEmail,
      subject: `[Cancellation] ${userName || userEmail} cancelled Pro`,
      html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
          <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
            <div style="background:linear-gradient(135deg,#dc2626,#ef4444);border-radius:16px 16px 0 0;padding:32px;text-align:center;">
              <h1 style="color:#fff;font-size:20px;margin:0 0 4px;">Pro Subscription Cancelled</h1>
              <p style="color:#fecaca;font-size:13px;margin:0;">ChatRealty Billing</p>
            </div>
            <div style="background:#fff;padding:32px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 16px 16px;">
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
              <p style="color:#94a3b8;font-size:12px;text-align:center;margin:0;">
                Reply to this email to reach the user directly.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
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
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || 'https://www.jpsrealtor.com';
  const verifyUrl = `${baseUrl}/api/auth/confirm-email-change?token=${token}`;
  const firstName = name.split(' ')[0] || 'there';

  console.log('📧 Sending email change verification to:', newEmail);

  try {
    const { data, error } = await resend.emails.send({
      from: 'Joey Sardella Real Estate <noreply@jpsrealtor.com>',
      to: [newEmail],
      subject: 'Confirm your new email address',
      html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
          <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
            <div style="background:linear-gradient(135deg,#2563eb,#3b82f6);border-radius:16px 16px 0 0;padding:32px;text-align:center;">
              <h1 style="color:#fff;font-size:22px;margin:0;">Confirm Your New Email</h1>
            </div>
            <div style="background:#fff;padding:32px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 16px 16px;">
              <p style="color:#334155;font-size:15px;line-height:1.7;">
                Hey ${firstName}, we received a request to change your ChatRealty account email to this address. Click below to confirm:
              </p>
              <div style="text-align:center;margin:24px 0;">
                <a href="${verifyUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
                  Confirm Email Change
                </a>
              </div>
              <p style="color:#94a3b8;font-size:13px;text-align:center;">
                This link expires in 1 hour. If you didn't request this change, ignore this email.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
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
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || 'https://www.jpsrealtor.com';
  const firstName = name.split(' ')[0] || 'there';
  const subdomainUrl = `https://${subdomain}.chatrealty.io`;

  console.log('📧 Sending agent approval email to:', email);

  try {
    const { data, error } = await resend.emails.send({
      from: 'ChatRealty <noreply@jpsrealtor.com>',
      to: [email],
      replyTo: 'josephsardella@gmail.com',
      subject: 'Welcome to ChatRealty — Your Agent Account is Approved!',
      html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
          <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
            <div style="background:linear-gradient(135deg,#2563eb,#3b82f6);border-radius:16px 16px 0 0;padding:32px;text-align:center;">
              <h1 style="color:#fff;font-size:24px;margin:0 0 4px;">You're Approved!</h1>
              <p style="color:rgba(255,255,255,0.85);font-size:13px;margin:0;">Welcome to the ChatRealty Agent Network</p>
            </div>
            <div style="background:#fff;padding:32px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 16px 16px;">
              <p style="color:#334155;font-size:15px;line-height:1.7;">
                Hey ${firstName}, your agent application has been approved! Here's what's ready for you:
              </p>

              <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:20px;margin:20px 0;">
                <p style="color:#1e40af;font-size:13px;font-weight:600;margin:0 0 8px;">YOUR SUBDOMAIN</p>
                <p style="color:#1e3a5f;font-size:18px;font-weight:700;margin:0;">
                  <a href="${subdomainUrl}" style="color:#2563eb;text-decoration:none;">${subdomain}.chatrealty.io</a>
                </p>
                <p style="color:#64748b;font-size:13px;margin:8px 0 0;">
                  This will be your personal real estate page. Subscribe to a plan to activate it.
                </p>
              </div>

              <p style="color:#334155;font-size:15px;line-height:1.7;font-weight:600;">Next steps:</p>
              <ol style="color:#334155;font-size:14px;line-height:2;padding-left:20px;">
                <li>Complete your agent profile in settings</li>
                <li>Choose a subscription plan to activate your subdomain</li>
                <li>Upload your branding (logo, hero photo, headshot)</li>
                <li>Add your social media links</li>
                <li>Optionally purchase a custom domain</li>
              </ol>

              <div style="text-align:center;margin:24px 0 0;">
                <a href="${baseUrl}/agent/settings?onboarding=true" style="display:inline-block;background:#2563eb;color:#fff;padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
                  Set Up Your Profile
                </a>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
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
