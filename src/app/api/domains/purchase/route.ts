// src/app/api/domains/purchase/route.ts
// Purchase a domain and connect it to the Vercel project + save to user profile
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import {
  purchaseDomain,
  addDomainToProject,
} from "@/lib/vercel-domains";
import { runDomainOnboarding } from "@/lib/domain-onboarding";
import { isFreeTier } from "@/lib/subscription-helpers";

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    // Verify user has admin or realEstateAgent role
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const hasPermission =
      user.isAdmin ||
      user.hasRole("admin") ||
      user.hasRole("realEstateAgent");

    if (!hasPermission) {
      return NextResponse.json(
        { error: "Forbidden - Admin or agent role required" },
        { status: 403 }
      );
    }

    // Buying a custom domain is a paid-plan feature; block free-tier agents (admins exempt).
    if (!user.isAdmin && (await isFreeTier(String(user._id)))) {
      return NextResponse.json(
        { error: "Custom domains require a paid plan." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { domain } = body;

    if (!domain || typeof domain !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'domain' field" },
        { status: 400 }
      );
    }

    const normalizedDomain = domain.toLowerCase().trim();

    // Basic domain format validation
    if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z]{2,})+$/.test(normalizedDomain)) {
      return NextResponse.json(
        { error: "Invalid domain format" },
        { status: 400 }
      );
    }

    // Step 1: Purchase the domain through Vercel
    const purchaseResult = await purchaseDomain(normalizedDomain);

    // Step 2: Add the domain to our Vercel project
    let projectDomain;
    try {
      projectDomain = await addDomainToProject(normalizedDomain);
    } catch (addError: any) {
      // Domain was purchased but failed to connect — log but don't fail entirely
      console.error(
        "[domains/purchase] Domain purchased but failed to add to project:",
        addError.message
      );
    }

    // Step 3: Save the custom domain to the agent's profile in MongoDB
    await User.findByIdAndUpdate(user._id, {
      $set: { "agentProfile.customDomain": normalizedDomain },
    });

    // Step 4: Kick off domain onboarding pipeline (non-blocking)
    // Provisions GSC, submits sitemap, creates GBP post, etc.
    const onboardingPromise = runDomainOnboarding(
      user._id.toString(),
      normalizedDomain
    ).catch((err) => {
      console.error(
        "[domains/purchase] Onboarding pipeline error:",
        err.message
      );
      return null;
    });

    // Wait briefly for fast steps, but don't block the response
    const onboardingResult = await Promise.race([
      onboardingPromise,
      new Promise((resolve) => setTimeout(() => resolve(null), 5_000)),
    ]);

    return NextResponse.json({
      success: true,
      domain: normalizedDomain,
      purchased: purchaseResult.created,
      connectedToProject: !!projectDomain,
      savedToProfile: true,
      onboarding: onboardingResult
        ? { status: "completed", steps: (onboardingResult as any).steps }
        : { status: "in_progress", message: "Onboarding pipeline running in background" },
    });
  } catch (error: any) {
    console.error("[domains/purchase] Error:", error.message);
    return NextResponse.json(
      { error: error.message || "Failed to purchase domain" },
      { status: 500 }
    );
  }
}
