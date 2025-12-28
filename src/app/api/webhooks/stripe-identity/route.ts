// src/app/api/webhooks/stripe-identity/route.ts
// Stripe Identity webhook handler for agent application verification

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import { Resend } from "resend";

// Lazy initialization to avoid build-time errors
function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not defined");
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2025-01-27.acacia",
  });
}

function getResend() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not defined");
  }
  return new Resend(process.env.RESEND_API_KEY);
}

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature")!;

  let event: Stripe.Event;

  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_IDENTITY_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return NextResponse.json(
      { error: "Webhook signature verification failed" },
      { status: 400 }
    );
  }

  await dbConnect();

  console.log("Stripe Identity Event:", event.type);

  switch (event.type) {
    case "identity.verification_session.verified": {
      const session = event.data.object as Stripe.Identity.VerificationSession;
      const userId = session.metadata?.userId;

      if (userId) {
        const user = await User.findById(userId);

        if (user && user.agentApplication) {
          user.agentApplication.phase = "verification_complete";
          user.agentApplication.identityVerified = true;
          user.agentApplication.identityVerifiedAt = new Date();
          user.agentApplication.identityStatus = "verified";
          user.agentApplication.stripeIdentityVerificationId = session.id;

          await user.save();

          // Send success email
          try {
            const resend = getResend();
            await resend.emails.send({
              from: "Joey Sardella Real Estate <noreply@jpsrealtor.com>",
              to: [user.email],
              subject: "Identity Verified - Final Review - JPSRealtor.com",
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
                        <h1>✅ Identity Verified!</h1>
                      </div>
                      <div class="content">
                        <p>Hi ${user.name || "there"},</p>

                        <p>Great news! Your identity has been successfully verified.</p>

                        <p>Your application is now in final review. We'll notify you of the decision within 1-2 business days.</p>

                        <p>Thank you for your patience throughout this process.</p>

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
            console.log("✅ Identity verified email sent to:", user.email);
          } catch (emailError) {
            console.error("Failed to send verification success email:", emailError);
            // Don't fail the webhook if email fails
          }
        }
      }
      break;
    }

    case "identity.verification_session.requires_input": {
      const session = event.data.object as Stripe.Identity.VerificationSession;
      const userId = session.metadata?.userId;

      if (userId) {
        const user = await User.findById(userId);

        if (user && user.agentApplication) {
          user.agentApplication.identityStatus = "requires_input";
          await user.save();

          // Send retry email
          try {
            const resend = getResend();
            await resend.emails.send({
              from: "Joey Sardella Real Estate <noreply@jpsrealtor.com>",
              to: [user.email],
              subject: "Identity Verification Issue - JPSRealtor.com",
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
                        <h1>⚠️ Identity Verification Issue</h1>
                      </div>
                      <div class="content">
                        <p>Hi ${user.name || "there"},</p>

                        <p>We encountered an issue verifying your identity. This can happen for several reasons:</p>

                        <ul>
                          <li>Photo quality was too low</li>
                          <li>ID information didn't match</li>
                          <li>Technical issue during upload</li>
                        </ul>

                        <p>Please check your email for instructions to retry the verification process, or visit your dashboard to continue.</p>

                        <p>If you continue to have issues, please contact us at support@jpsrealtor.com.</p>

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
            console.log("⚠️ Retry email sent to:", user.email);
          } catch (emailError) {
            console.error("Failed to send retry email:", emailError);
          }
        }
      }
      break;
    }

    case "identity.verification_session.canceled":
    case "identity.verification_session.processing": {
      console.log("Received event:", event.type);
      // Just log these events, no action needed
      break;
    }
  }

  return NextResponse.json({ received: true });
}
