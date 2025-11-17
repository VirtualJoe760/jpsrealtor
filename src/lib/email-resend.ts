// src/lib/email-resend.ts
// Email utilities using Resend (more reliable than Gmail)

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

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
