/**
 * Domain Onboarding Pipeline
 *
 * Orchestrates SEO infrastructure provisioning when an agent gets a custom domain.
 * Each step is non-blocking — individual failures don't stop the pipeline.
 *
 * Steps:
 *   1. Verify domain is live (HTTPS fetch for 200)
 *   2. Add site property to Google Search Console
 *   3. Submit sitemap to GSC
 *   4. Create GBP announcement post (if agent has GBP connected)
 *   5. Persist onboarding status to User record
 */

import { addSite, submitSitemap, getSiteStatus } from '@/lib/gsc-api';
import { createLocalPost } from '@/lib/gbp-api';
import type { GBPCredentials } from '@/lib/gbp-api';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';

// ── Types ────────────────────────────────────────────────────────────────────

export type StepStatus = 'success' | 'failed' | 'skipped';

export interface StepResult {
  status: StepStatus;
  message: string;
  /** ISO timestamp of completion */
  completedAt: string;
}

export interface OnboardingResult {
  domain: string;
  userId: string;
  startedAt: string;
  completedAt: string;
  steps: {
    domainLive: StepResult;
    gscSiteAdded: StepResult;
    gscSitemapSubmitted: StepResult;
    gbpPostCreated: StepResult;
    statusSaved: StepResult;
  };
}

/** Shape stored on User.agentProfile.domainOnboarding in MongoDB */
export interface DomainOnboardingStatus {
  domain: string;
  startedAt: Date;
  completedAt: Date;
  steps: {
    domainLive: { status: StepStatus; message: string; completedAt: Date };
    gscSiteAdded: { status: StepStatus; message: string; completedAt: Date };
    gscSitemapSubmitted: { status: StepStatus; message: string; completedAt: Date };
    gbpPostCreated: { status: StepStatus; message: string; completedAt: Date };
  };
}

// ── Pipeline ─────────────────────────────────────────────────────────────────

/**
 * Run the full domain onboarding pipeline for an agent.
 *
 * Each step catches its own errors so the pipeline always completes.
 * Results are persisted to the User record for later retrieval.
 */
export async function runDomainOnboarding(
  userId: string,
  domain: string
): Promise<OnboardingResult> {
  const startedAt = new Date().toISOString();
  const siteUrl = `https://${domain}`;
  const sitemapUrl = `${siteUrl}/sitemap.xml`;

  console.log(`[DomainOnboarding] Starting pipeline for ${domain} (user: ${userId})`);

  // Load user for GBP credentials
  await dbConnect();
  const user = await User.findById(userId).lean();

  // ── Step 1: Verify domain is live ────────────────────────────────────────
  const domainLive = await runStep('domainLive', async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);

    try {
      const resp = await fetch(siteUrl, {
        method: 'HEAD',
        signal: controller.signal,
        redirect: 'follow',
      });

      if (resp.ok) {
        return `Domain is live (HTTP ${resp.status})`;
      }
      throw new Error(`Domain returned HTTP ${resp.status}`);
    } finally {
      clearTimeout(timeout);
    }
  });

  // ── Step 2: Add site to Google Search Console ────────────────────────────
  const gscSiteAdded = await runStep('gscSiteAdded', async () => {
    await addSite(siteUrl);

    // Check if verification already exists
    const status = await getSiteStatus(siteUrl);
    if (status?.permissionLevel === 'siteOwner') {
      return 'Site added and verified as owner in GSC';
    }
    return 'Site property created in GSC (pending verification — DNS TXT record or HTML file required)';
  });

  // ── Step 3: Submit sitemap to GSC ────────────────────────────────────────
  const gscSitemapSubmitted = await runStep('gscSitemapSubmitted', async () => {
    // Only attempt if GSC site was added successfully
    if (gscSiteAdded.status === 'failed') {
      throw new SkipError('Skipped — GSC site was not added successfully');
    }

    await submitSitemap(siteUrl, sitemapUrl);
    return `Sitemap submitted: ${sitemapUrl}`;
  });

  // ── Step 4: Create GBP announcement post ─────────────────────────────────
  const gbpPostCreated = await runStep('gbpPostCreated', async () => {
    const gbp = (user as any)?.adAccounts?.gbp;
    if (!gbp?.accountId || !gbp?.locationId || gbp?.status !== 'connected') {
      throw new SkipError('Skipped — agent does not have GBP connected');
    }

    const agentName = (user as any)?.name || 'Our team';
    const credentials: Partial<GBPCredentials> = gbp.refreshToken
      ? { refreshToken: gbp.refreshToken }
      : undefined;

    await createLocalPost(
      gbp.accountId,
      gbp.locationId,
      {
        summary: `Exciting news! ${agentName} has launched a new real estate website at ${siteUrl}. Browse listings, explore neighborhoods, and get expert insights — all in one place. Visit us today!`,
        callToAction: {
          actionType: 'LEARN_MORE',
          url: siteUrl,
        },
        topicType: 'STANDARD',
        languageCode: 'en-US',
      },
      credentials
    );

    return `GBP post created announcing ${domain}`;
  });

  // ── Step 5: Save onboarding status to user record ────────────────────────
  const statusSaved = await runStep('statusSaved', async () => {
    const onboardingStatus: DomainOnboardingStatus = {
      domain,
      startedAt: new Date(startedAt),
      completedAt: new Date(),
      steps: {
        domainLive: toDbStep(domainLive),
        gscSiteAdded: toDbStep(gscSiteAdded),
        gscSitemapSubmitted: toDbStep(gscSitemapSubmitted),
        gbpPostCreated: toDbStep(gbpPostCreated),
      },
    };

    await User.findByIdAndUpdate(userId, {
      $set: { 'agentProfile.domainOnboarding': onboardingStatus },
    });

    return 'Onboarding status saved to user profile';
  });

  const result: OnboardingResult = {
    domain,
    userId,
    startedAt,
    completedAt: new Date().toISOString(),
    steps: {
      domainLive,
      gscSiteAdded,
      gscSitemapSubmitted,
      gbpPostCreated,
      statusSaved,
    },
  };

  const successCount = Object.values(result.steps).filter(s => s.status === 'success').length;
  const failedCount = Object.values(result.steps).filter(s => s.status === 'failed').length;
  const skippedCount = Object.values(result.steps).filter(s => s.status === 'skipped').length;

  console.log(
    `[DomainOnboarding] Pipeline complete for ${domain}: ` +
    `${successCount} success, ${failedCount} failed, ${skippedCount} skipped`
  );

  return result;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Sentinel error to indicate a step should be marked as "skipped" rather than "failed" */
class SkipError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SkipError';
  }
}

/**
 * Execute a pipeline step, catching errors and returning a StepResult.
 */
async function runStep(
  name: string,
  fn: () => Promise<string>
): Promise<StepResult> {
  try {
    const message = await fn();
    console.log(`[DomainOnboarding] ${name}: SUCCESS — ${message}`);
    return {
      status: 'success',
      message,
      completedAt: new Date().toISOString(),
    };
  } catch (err: any) {
    const isSkip = err instanceof SkipError;
    const status: StepStatus = isSkip ? 'skipped' : 'failed';
    const message = err.message || 'Unknown error';

    console.log(`[DomainOnboarding] ${name}: ${status.toUpperCase()} — ${message}`);
    return {
      status,
      message,
      completedAt: new Date().toISOString(),
    };
  }
}

/** Convert a StepResult to the shape stored in MongoDB */
function toDbStep(step: StepResult) {
  return {
    status: step.status,
    message: step.message,
    completedAt: new Date(step.completedAt),
  };
}
