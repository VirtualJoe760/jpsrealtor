// src/app/api/skill/contacts/from-signup/route.ts
//
// Agent 32 — BYO-auth lead-capture endpoint (build_plan §8.3, integration path 2).
//
// Agents who run their own end-user auth POST the new user's details here with
// their tenant token; the server upserts a deduped Contact into THAT tenant's
// CRM — the same `onSignup` flow the product-provided registration path runs, so
// both paths land an identical, deduped, linked Contact.
//
// TENANT SCOPING (build_plan §3.3): the route is wrapped in `withSkill`, which
// authenticates the bearer token and injects the per-tenant `DbAdapter` from the
// keystone resolver. The handler reads `ctx.adapter` — it never constructs an
// adapter, never opens a Pool, never imports a module-level `db`. The token's
// tenant binding IS the agent scoping (no `userId`).
//
// NON-BLOCKING (build_plan §8.3): `onSignup`'s contact mirroring never throws, so
// a CRM hiccup still returns 200 with `contactId: null` rather than failing the
// caller's signup. Only a malformed body (400) or an end-user-account write error
// (mapped by the wrapper) is a non-200.

import { z } from "zod";

import { withSkill, type SkillContext } from "@/lib/skill-api/with-skill";
import { okOne, fail } from "@/lib/skill-api/response";
import { ValidationError } from "@/lib/skill-api/errors";
import { onSignup } from "@/lib/crm/end-user";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Payload validation (zod)
// ---------------------------------------------------------------------------
//
// At least one identity key (email or phone) is required — there is nothing to
// dedup an anonymous lead on (mirrors the legacy `linkUserToAgent` guard).

const consentSchema = z
  .object({
    smsOptIn: z.boolean().optional(),
    emailOptIn: z.boolean().optional(),
    marketingConsent: z.boolean().optional(),
    consentDate: z.string().optional(),
    consentIp: z.string().optional(),
  })
  .passthrough();

const signupSchema = z
  .object({
    email: z.string().email().optional(),
    name: z.string().max(200).optional(),
    phone: z.string().max(40).optional(),
    consent: consentSchema.optional(),
    source: z.string().max(64).optional(),
    tags: z.array(z.string().max(64)).max(20).optional(),
  })
  .refine((v) => Boolean(v.email) || Boolean(v.phone), {
    message: "At least one of `email` or `phone` is required.",
    path: ["email"],
  });

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

async function handler(ctx: SkillContext) {
  let body: unknown;
  try {
    body = await ctx.req.json();
  } catch {
    return fail(
      new ValidationError("Request body must be valid JSON.", { param: "body" }),
    );
  }

  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return fail(
      new ValidationError(first?.message ?? "Invalid signup payload.", {
        param: first?.path?.join(".") || undefined,
        details: { issues: parsed.error.issues },
      }),
    );
  }

  const result = await onSignup(ctx.adapter, parsed.data);

  // Return only the contact id (no PII echoed back) — 201 when a new contact was
  // created, 200 when an existing one was linked. `contactId` may be null when
  // the non-blocking CRM mirror failed; the end-user account still exists.
  return okOne(
    { contactId: result.contact.contactId, endUserId: result.endUserId },
    result.contact.created ? 201 : 200,
  );
}

export const POST = withSkill(handler);
