// src/lib/stripe-identity.ts
// Stripe Identity verification for agent applications

import Stripe from "stripe";

// Lazy initialization to avoid build-time errors when env vars aren't available
let stripe: Stripe | null = null;

function getStripe() {
  if (!stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not defined");
    }
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-01-27.acacia",
    });
  }
  return stripe;
}

export async function createIdentityVerificationSession(
  userId: string,
  email: string
) {
  const stripeInstance = getStripe();
  const session = await stripeInstance.identity.verificationSessions.create({
    type: "document",
    metadata: {
      userId,
      purpose: "agent_application",
    },
    options: {
      document: {
        // Require government ID with ID number
        require_id_number: true,
        // Require live capture (not uploaded photo)
        require_live_capture: true,
        // Require selfie for liveness check
        require_matching_selfie: true,
      },
    },
    // Return URL after verification
    return_url: `${process.env.NEXTAUTH_URL}/dashboard/agent-application?verified=true`,
  });

  return session;
}

export async function getVerificationSession(sessionId: string) {
  const stripeInstance = getStripe();
  const session = await stripeInstance.identity.verificationSessions.retrieve(sessionId);
  return session;
}

export async function getVerificationReport(verificationId: string) {
  const stripeInstance = getStripe();
  const verification = await stripeInstance.identity.verificationReports.retrieve(
    verificationId
  );
  return verification;
}

export { getStripe as stripe };
