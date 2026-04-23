// src/app/api/domains/onboarding/route.ts
// Returns the domain onboarding status for the authenticated user's custom domain.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import { runDomainOnboarding } from "@/lib/domain-onboarding";

/**
 * GET /api/domains/onboarding
 *
 * Returns the onboarding pipeline status for the user's custom domain.
 * Response includes the status of each step (success/failed/skipped).
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const user = await User.findOne({ email: session.user.email })
      .select("agentProfile.customDomain agentProfile.domainOnboarding")
      .lean();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const ap = (user as any).agentProfile || {};

    if (!ap.customDomain) {
      return NextResponse.json({
        status: "no_domain",
        message: "No custom domain configured for this account",
      });
    }

    if (!ap.domainOnboarding) {
      return NextResponse.json({
        status: "not_started",
        domain: ap.customDomain,
        message: "Domain onboarding has not been run yet",
      });
    }

    const onboarding = ap.domainOnboarding;

    // Summarize step statuses
    const steps = onboarding.steps || {};
    const stepNames = Object.keys(steps);
    const successCount = stepNames.filter(
      (k) => steps[k]?.status === "success"
    ).length;
    const failedCount = stepNames.filter(
      (k) => steps[k]?.status === "failed"
    ).length;
    const skippedCount = stepNames.filter(
      (k) => steps[k]?.status === "skipped"
    ).length;

    return NextResponse.json({
      status: failedCount > 0 ? "partial" : "completed",
      domain: onboarding.domain,
      startedAt: onboarding.startedAt,
      completedAt: onboarding.completedAt,
      summary: {
        success: successCount,
        failed: failedCount,
        skipped: skippedCount,
        total: stepNames.length,
      },
      steps,
    });
  } catch (error: any) {
    console.error("[domains/onboarding] GET Error:", error.message);
    return NextResponse.json(
      { error: error.message || "Failed to fetch onboarding status" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/domains/onboarding
 *
 * Re-run the domain onboarding pipeline for the user's custom domain.
 * Useful for retrying failed steps after fixing issues (e.g., DNS propagation).
 */
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const user = await User.findOne({ email: session.user.email })
      .select("_id agentProfile.customDomain roles isAdmin")
      .lean();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const ap = (user as any).agentProfile || {};
    if (!ap.customDomain) {
      return NextResponse.json(
        { error: "No custom domain configured" },
        { status: 400 }
      );
    }

    const result = await runDomainOnboarding(
      (user as any)._id.toString(),
      ap.customDomain
    );

    return NextResponse.json({
      success: true,
      onboarding: result,
    });
  } catch (error: any) {
    console.error("[domains/onboarding] POST Error:", error.message);
    return NextResponse.json(
      { error: error.message || "Failed to run onboarding pipeline" },
      { status: 500 }
    );
  }
}
