// src/app/api/skill/me/profile/route.ts
//
// GET → richer profile fields so Claude can tailor LP/article content to the
// specific agent: bio, service areas, specializations, headshot, broker
// info, social links.
//
// Identity-tier rate limit. No specific scope required (matches /me — any
// valid token can read the agent's own profile, since the bearer token
// IS that agent's authority).

import { NextRequest, NextResponse } from "next/server";
import { authenticateSkillRequest, skillRateLimit } from "@/lib/skill-auth";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(req: NextRequest) {
  const auth = await authenticateSkillRequest(req);
  if (auth.ok === false) {
    return NextResponse.json(
      { error: auth.reason },
      { status: auth.status, headers: NO_STORE }
    );
  }
  const rateLimited = skillRateLimit(auth, "identity");
  if (rateLimited) return rateLimited;

  const user = auth.user;
  const ap = (user.agentProfile as any) || {};

  return NextResponse.json(
    {
      // Basics
      name: user.name || null,
      email: user.email || null,
      phone: user.phone || null,
      licenseNumber: user.licenseNumber || null,
      brokerageName: user.brokerageName || null,
      teamName: user.teamName || null,
      website: user.website || null,

      // Profile content (most useful to Claude when drafting)
      bio: ap.bio || null,
      headline: ap.headline || null,
      tagline: ap.tagline || null,
      personalStory: ap.personalStory || null,

      // Media
      headshot: ap.headshot || user.image || null,
      heroPhoto: ap.heroPhoto || null,

      // Local expertise — high-signal context for content
      serviceAreas: (ap.serviceAreas || [])
        .map((a: any) => ({ name: a?.name, type: a?.type }))
        .filter((a: any) => a.name),
      specializations: ap.specializations || [],
      certifications: (ap.certifications || []).map((c: any) => ({
        name: c?.name,
        issuedBy: c?.issuedBy,
        year: c?.year,
      })),

      // Differentiators / proof
      valuePropositions: (ap.valuePropositions || []).map((v: any) => ({
        title: v?.title,
        description: v?.description,
      })),
      stats: (ap.stats || []).map((s: any) => ({ label: s?.label, value: s?.value })),

      // Social — useful for Claude when drafting "find me on X" sections
      socialMedia: ap.socialMedia || {},

      // Brand colors so Claude can suggest matching theme overrides
      brandColors: ap.brandColors || {},
      siteName: ap.siteName || null,
    },
    { headers: NO_STORE }
  );
}
