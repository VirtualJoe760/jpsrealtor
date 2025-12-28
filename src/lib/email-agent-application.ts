// src/lib/email-agent-application.ts
// Email notifications for agent application system

import { Resend } from "resend";

function getResend() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not defined");
  }
  return new Resend(process.env.RESEND_API_KEY);
}

type EmailPhase =
  | "submitted"
  | "phase1_approved"
  | "phase1_rejected"
  | "identity_verified"
  | "final_approved"
  | "final_rejected";

interface SendAgentApplicationEmailParams {
  applicantName: string;
  applicantEmail: string;
  applicationId: string;
  phase: EmailPhase;
  reviewNotes?: string;
  teamName?: string;
}

export async function sendAgentApplicationEmail(params: SendAgentApplicationEmailParams) {
  const resend = getResend();
  const { applicantName, applicantEmail, applicationId, phase, reviewNotes, teamName } = params;

  // Admin notification emails
  const adminEmails = ["josephsardella@gmail.com"];

  switch (phase) {
    case "submitted":
      // Notify admins of new application
      await resend.emails.send({
        from: "Joey Sardella Real Estate <noreply@jpsrealtor.com>",
        to: adminEmails,
        subject: `New Agent Application - ${applicantName}`,
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
                  background-color: white;
                  border-radius: 8px;
                  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                  overflow: hidden;
                }
                .header {
                  background-color: #2563eb;
                  color: white;
                  padding: 30px;
                  text-align: center;
                }
                .content {
                  padding: 30px;
                }
                .button {
                  display: inline-block;
                  background-color: #2563eb;
                  color: white;
                  text-decoration: none;
                  padding: 12px 24px;
                  border-radius: 6px;
                  margin-top: 20px;
                }
                .footer {
                  background-color: #f5f5f5;
                  padding: 20px;
                  text-align: center;
                  font-size: 12px;
                  color: #666;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>📝 New Agent Application</h1>
                </div>
                <div class="content">
                  <p><strong>Applicant:</strong> ${applicantName}</p>
                  <p><strong>Email:</strong> ${applicantEmail}</p>
                  <p><strong>Application ID:</strong> ${applicationId}</p>

                  <p>A new agent application has been submitted and is ready for Phase 1 review.</p>

                  <a href="${process.env.NEXTAUTH_URL}/admin/applications/${applicationId}" class="button">
                    Review Application
                  </a>
                </div>
                <div class="footer">
                  <p>JPSRealtor Agent Application System</p>
                </div>
              </div>
            </body>
          </html>
        `,
      });

      // Notify applicant of submission
      await resend.emails.send({
        from: "Joey Sardella Real Estate <noreply@jpsrealtor.com>",
        to: [applicantEmail],
        subject: "Application Received - JPSRealtor.com",
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
                  background-color: white;
                  border-radius: 8px;
                  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                  overflow: hidden;
                }
                .header {
                  background-color: #2563eb;
                  color: white;
                  padding: 30px;
                  text-align: center;
                }
                .content {
                  padding: 30px;
                }
                .footer {
                  background-color: #f5f5f5;
                  padding: 20px;
                  text-align: center;
                  font-size: 12px;
                  color: #666;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>✅ Application Received</h1>
                </div>
                <div class="content">
                  <p>Hi ${applicantName},</p>

                  <p>Thank you for applying to join the JPSRealtor team!</p>

                  <p>We've received your application and it's currently under review. We'll notify you of our decision within 2-3 business days.</p>

                  <p><strong>What's Next?</strong></p>
                  <ul>
                    <li>Our team will review your license and MLS information</li>
                    <li>If approved, you'll be invited to complete identity verification</li>
                    <li>Final approval and team assignment will follow</li>
                  </ul>

                  <p>Thank you for your patience!</p>

                  <p>Best regards,<br>
                  The JPSRealtor Team</p>
                </div>
                <div class="footer">
                  <p>Questions? Reply to this email or contact us at support@jpsrealtor.com</p>
                </div>
              </div>
            </body>
          </html>
        `,
      });
      break;

    case "phase1_approved":
      await resend.emails.send({
        from: "Joey Sardella Real Estate <noreply@jpsrealtor.com>",
        to: [applicantEmail],
        subject: "Application Approved - Next Step: Identity Verification",
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
                  background-color: white;
                  border-radius: 8px;
                  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                  overflow: hidden;
                }
                .header {
                  background-color: #10b981;
                  color: white;
                  padding: 30px;
                  text-align: center;
                }
                .content {
                  padding: 30px;
                }
                .button {
                  display: inline-block;
                  background-color: #2563eb;
                  color: white;
                  text-decoration: none;
                  padding: 12px 24px;
                  border-radius: 6px;
                  margin-top: 20px;
                }
                .footer {
                  background-color: #f5f5f5;
                  padding: 20px;
                  text-align: center;
                  font-size: 12px;
                  color: #666;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>🎉 Application Approved!</h1>
                </div>
                <div class="content">
                  <p>Hi ${applicantName},</p>

                  <p>Great news! Your agent application has been approved.</p>

                  ${reviewNotes ? `<p><strong>Reviewer Notes:</strong><br>${reviewNotes}</p>` : ""}

                  <p><strong>Next Step: Identity Verification</strong></p>
                  <p>To complete your application, please verify your identity. This is a secure process that takes just a few minutes.</p>

                  <a href="${process.env.NEXTAUTH_URL}/dashboard/agent-application" class="button">
                    Verify Your Identity
                  </a>

                  <p>You'll need a government-issued ID and your phone camera.</p>

                  <p>Best regards,<br>
                  The JPSRealtor Team</p>
                </div>
                <div class="footer">
                  <p>Questions? Reply to this email or contact us at support@jpsrealtor.com</p>
                </div>
              </div>
            </body>
          </html>
        `,
      });
      break;

    case "phase1_rejected":
      await resend.emails.send({
        from: "Joey Sardella Real Estate <noreply@jpsrealtor.com>",
        to: [applicantEmail],
        subject: "Application Status Update - JPSRealtor.com",
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
                  background-color: white;
                  border-radius: 8px;
                  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                  overflow: hidden;
                }
                .header {
                  background-color: #dc2626;
                  color: white;
                  padding: 30px;
                  text-align: center;
                }
                .content {
                  padding: 30px;
                }
                .footer {
                  background-color: #f5f5f5;
                  padding: 20px;
                  text-align: center;
                  font-size: 12px;
                  color: #666;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>Application Status Update</h1>
                </div>
                <div class="content">
                  <p>Hi ${applicantName},</p>

                  <p>Thank you for your interest in joining the JPSRealtor team.</p>

                  <p>After careful review, we're unable to move forward with your application at this time.</p>

                  ${reviewNotes ? `<p><strong>Feedback:</strong><br>${reviewNotes}</p>` : ""}

                  <p>We appreciate your interest and wish you the best in your real estate career.</p>

                  <p>Best regards,<br>
                  The JPSRealtor Team</p>
                </div>
                <div class="footer">
                  <p>Questions? Reply to this email or contact us at support@jpsrealtor.com</p>
                </div>
              </div>
            </body>
          </html>
        `,
      });
      break;

    case "final_approved":
      await resend.emails.send({
        from: "Joey Sardella Real Estate <noreply@jpsrealtor.com>",
        to: [applicantEmail],
        subject: "🎉 Welcome to JPSRealtor!",
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
                  background-color: white;
                  border-radius: 8px;
                  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                  overflow: hidden;
                }
                .header {
                  background-color: #10b981;
                  color: white;
                  padding: 30px;
                  text-align: center;
                }
                .content {
                  padding: 30px;
                }
                .button {
                  display: inline-block;
                  background-color: #2563eb;
                  color: white;
                  text-decoration: none;
                  padding: 12px 24px;
                  border-radius: 6px;
                  margin-top: 20px;
                }
                .footer {
                  background-color: #f5f5f5;
                  padding: 20px;
                  text-align: center;
                  font-size: 12px;
                  color: #666;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>🎉 Welcome to JPSRealtor!</h1>
                </div>
                <div class="content">
                  <p>Hi ${applicantName},</p>

                  <p>Congratulations! You've been approved to join the JPSRealtor team.</p>

                  ${teamName ? `<p><strong>Team Assignment:</strong> ${teamName}</p>` : ""}
                  ${reviewNotes ? `<p><strong>Welcome Message:</strong><br>${reviewNotes}</p>` : ""}

                  <p><strong>What's Next?</strong></p>
                  <ul>
                    <li>Access your agent dashboard</li>
                    <li>Complete your profile setup</li>
                    <li>Meet your team leader and fellow agents</li>
                    <li>Start connecting with clients</li>
                  </ul>

                  <a href="${process.env.NEXTAUTH_URL}/dashboard/agent" class="button">
                    Go to Agent Dashboard
                  </a>

                  <p>We're excited to have you on board!</p>

                  <p>Best regards,<br>
                  The JPSRealtor Team</p>
                </div>
                <div class="footer">
                  <p>Questions? Reply to this email or contact us at support@jpsrealtor.com</p>
                </div>
              </div>
            </body>
          </html>
        `,
      });
      break;

    case "final_rejected":
      await resend.emails.send({
        from: "Joey Sardella Real Estate <noreply@jpsrealtor.com>",
        to: [applicantEmail],
        subject: "Application Status Update - JPSRealtor.com",
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
                  background-color: white;
                  border-radius: 8px;
                  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                  overflow: hidden;
                }
                .header {
                  background-color: #dc2626;
                  color: white;
                  padding: 30px;
                  text-align: center;
                }
                .content {
                  padding: 30px;
                }
                .footer {
                  background-color: #f5f5f5;
                  padding: 20px;
                  text-align: center;
                  font-size: 12px;
                  color: #666;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>Application Status Update</h1>
                </div>
                <div class="content">
                  <p>Hi ${applicantName},</p>

                  <p>Thank you for completing the identity verification process.</p>

                  <p>After final review, we're unable to proceed with your application at this time.</p>

                  ${reviewNotes ? `<p><strong>Feedback:</strong><br>${reviewNotes}</p>` : ""}

                  <p>We appreciate your time and interest in joining JPSRealtor.</p>

                  <p>Best regards,<br>
                  The JPSRealtor Team</p>
                </div>
                <div class="footer">
                  <p>Questions? Reply to this email or contact us at support@jpsrealtor.com</p>
                </div>
              </div>
            </body>
          </html>
        `,
      });
      break;
  }
}
