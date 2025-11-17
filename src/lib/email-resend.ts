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
              }
              .container {
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .header {
                background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
                color: white;
                padding: 30px;
                text-align: center;
                border-radius: 10px 10px 0 0;
              }
              .content {
                background: #f9fafb;
                padding: 30px;
                border-radius: 0 0 10px 10px;
              }
              .button {
                display: inline-block;
                padding: 12px 30px;
                background: #3b82f6;
                color: white;
                text-decoration: none;
                border-radius: 5px;
                margin: 20px 0;
              }
              .footer {
                text-align: center;
                margin-top: 20px;
                color: #666;
                font-size: 12px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Welcome to Joey Sardella Real Estate!</h1>
              </div>
              <div class="content">
                <p>Hi ${name},</p>
                <p>Thank you for registering! Please verify your email address to get started.</p>
                <p>Click the button below to verify your email:</p>
                <p style="text-align: center;">
                  <a href="${verificationUrl}" class="button">Verify Email Address</a>
                </p>
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
                <p>This link will expire in 24 hours.</p>
                <p>If you didn't create an account, you can safely ignore this email.</p>
                <p>Best regards,<br>Joey Sardella Real Estate Team</p>
              </div>
              <div class="footer">
                <p>&copy; ${new Date().getFullYear()} Joey Sardella Real Estate. All rights reserved.</p>
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
              }
              .container {
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .header {
                background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
                color: white;
                padding: 30px;
                text-align: center;
                border-radius: 10px 10px 0 0;
              }
              .content {
                background: #f9fafb;
                padding: 30px;
                border-radius: 0 0 10px 10px;
              }
              .code {
                display: inline-block;
                padding: 20px 40px;
                background: #1e3a8a;
                color: white;
                font-size: 32px;
                font-weight: bold;
                letter-spacing: 8px;
                border-radius: 8px;
                margin: 20px 0;
              }
              .footer {
                text-align: center;
                margin-top: 20px;
                color: #666;
                font-size: 12px;
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
                <p style="text-align: center;">
                  <span class="code">${code}</span>
                </p>
                <p>This code will expire in 10 minutes.</p>
                <p>If you didn't request this code, please ignore this email and consider changing your password.</p>
                <p>Best regards,<br>Joey Sardella Real Estate Team</p>
              </div>
              <div class="footer">
                <p>&copy; ${new Date().getFullYear()} Joey Sardella Real Estate. All rights reserved.</p>
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
