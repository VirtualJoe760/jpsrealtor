// src/app/api/campaign/submit/route.ts
// Handles landing page form submissions:
// 1. Creates a user account (or links to existing)
// 2. Sends form data to all configured recipients via Resend
// 3. Stores the submission for CRM tracking

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import VerificationToken from "@/models/verificationToken";
import { Resend } from "resend";

export const dynamic = "force-dynamic";

const resend = new Resend(process.env.RESEND_API_KEY);

interface FormField {
  id: string;
  label: string;
  type: string;
  value: string;
}

/**
 * POST /api/campaign/submit
 *
 * Body: {
 *   campaignSlug: string,
 *   campaignTitle: string,
 *   fields: FormField[],       // All form field responses
 *   recipients: string[],      // Email addresses to notify
 *   agentEmail: string,        // Agent who owns this landing page
 * }
 */
export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    const body = await req.json();
    const { campaignSlug, campaignTitle, fields, recipients, agentEmail } = body;

    if (!fields || !Array.isArray(fields) || fields.length === 0) {
      return NextResponse.json(
        { error: "Form fields are required" },
        { status: 400 }
      );
    }

    // Extract key fields from the form submission
    const emailField = fields.find(
      (f: FormField) => f.type === "email" || f.id === "email"
    );
    const nameField = fields.find(
      (f: FormField) => f.id === "name" || f.id === "fullName"
    );
    const phoneField = fields.find(
      (f: FormField) => f.type === "tel" || f.id === "phone"
    );

    const userEmail = emailField?.value?.trim().toLowerCase();
    const userName = nameField?.value?.trim();
    const userPhone = phoneField?.value?.trim();

    if (!userEmail) {
      return NextResponse.json(
        { error: "Email address is required" },
        { status: 400 }
      );
    }

    // 1. Create account or find existing user
    let user = await User.findOne({ email: userEmail });
    let isNewUser = false;

    if (!user) {
      // Generate a random password (user can reset later)
      const tempPassword = crypto.randomBytes(16).toString("hex");
      const hashedPassword = await bcrypt.hash(tempPassword, 12);

      user = await User.create({
        email: userEmail,
        password: hashedPassword,
        name: userName || userEmail.split("@")[0],
        phone: userPhone || undefined,
        roles: ["endUser"],
        emailVerified: false,
        source: `campaign:${campaignSlug}`,
      });

      isNewUser = true;

      // Create verification token (for email verification)
      const verificationToken = crypto.randomBytes(32).toString("hex");
      await VerificationToken.create({
        userId: user._id,
        token: verificationToken,
        type: "email-verification",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      });

      // Create password reset token (so user can set their own password)
      const passwordToken = crypto.randomBytes(32).toString("hex");
      const passwordTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      user.resetPasswordToken = passwordToken;
      user.resetPasswordExpires = passwordTokenExpiry;
      await user.save();

      const baseUrl =
        process.env.NEXT_PUBLIC_BASE_URL ||
        process.env.NEXTAUTH_URL ||
        "https://www.jpsrealtor.com";
      const verifyUrl = `${baseUrl}/auth/verify-email?token=${verificationToken}`;
      const setPasswordUrl = `${baseUrl}/auth/reset-password?token=${passwordToken}`;

      // Send combined welcome + verify + set password email
      try {
        await resend.emails.send({
          from: "Joey Sardella Real Estate <noreply@jpsrealtor.com>",
          to: [userEmail],
          subject: `Welcome! Set up your account`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Welcome${userName ? `, ${userName}` : ""}!</h2>
              <p>Thanks for your interest in <strong>${campaignTitle || "our services"}</strong>. We've created an account for you.</p>

              <p><strong>Step 1:</strong> Verify your email address</p>
              <a href="${verifyUrl}" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px; margin: 8px 0;">
                Verify Email
              </a>

              <p style="margin-top: 24px;"><strong>Step 2:</strong> Set your password</p>
              <a href="${setPasswordUrl}" style="display: inline-block; padding: 12px 24px; background: #059669; color: white; text-decoration: none; border-radius: 8px; margin: 8px 0;">
                Create Password
              </a>

              <p style="color: #666; font-size: 14px; margin-top: 24px;">
                These links expire in 24 hours. Once verified, you can sign in to browse listings, save favorites, and chat with our AI assistant.
              </p>
              <p style="color: #999; font-size: 12px;">If you didn't request this, you can safely ignore this email.</p>
            </div>
          `,
        });
      } catch (emailErr) {
        console.error("[Campaign Submit] Failed to send welcome email:", emailErr);
      }
    }

    // 2. Build the form summary for email notifications
    const formSummaryHtml = fields
      .map(
        (f: FormField) =>
          `<tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #eee; font-weight: 600; color: #333; width: 40%;">${f.label}</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #eee; color: #555;">${f.value || "—"}</td>
          </tr>`
      )
      .join("");

    const notificationHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1e293b; color: white; padding: 24px; border-radius: 12px 12px 0 0;">
          <h2 style="margin: 0 0 4px 0;">New Form Submission</h2>
          <p style="margin: 0; opacity: 0.8; font-size: 14px;">From: ${campaignTitle || campaignSlug}</p>
        </div>
        <div style="padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
          <table style="width: 100%; border-collapse: collapse;">
            ${formSummaryHtml}
          </table>
          <div style="margin-top: 20px; padding: 12px; background: #f8fafc; border-radius: 8px; font-size: 13px; color: #64748b;">
            <p style="margin: 0;">
              <strong>Account:</strong> ${isNewUser ? "New account created" : "Existing user"}<br>
              <strong>Email:</strong> ${userEmail}<br>
              <strong>Campaign:</strong> ${campaignSlug}<br>
              <strong>Submitted:</strong> ${new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles" })}
            </p>
          </div>
        </div>
      </div>
    `;

    // 3. Send notification emails to all recipients
    const allRecipients = [
      ...(recipients || []),
      agentEmail,
    ].filter((email): email is string => !!email && email.includes("@"));

    // Deduplicate
    const uniqueRecipients = [...new Set(allRecipients)];

    if (uniqueRecipients.length > 0) {
      try {
        await resend.emails.send({
          from: "JPSRealtor Leads <noreply@jpsrealtor.com>",
          to: uniqueRecipients,
          replyTo: userEmail,
          subject: `New Lead: ${userName || userEmail} — ${campaignTitle || campaignSlug}`,
          html: notificationHtml,
        });
      } catch (emailErr) {
        console.error("[Campaign Submit] Failed to send notification emails:", emailErr);
      }
    }

    return NextResponse.json({
      success: true,
      isNewUser,
      message: isNewUser
        ? "Account created! Check your email to verify."
        : "Form submitted successfully!",
    });
  } catch (error) {
    console.error("[Campaign Submit] Error:", error);
    return NextResponse.json(
      { error: "Failed to process form submission" },
      { status: 500 }
    );
  }
}
