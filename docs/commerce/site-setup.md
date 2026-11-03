---
title: $300 custom-site setup (one-time service for Basic subscribers)
status: current
last_verified: 2026-11-03
related: [./README.md, ./stripe-billing.md, ../multi-tenant/site-platform-plan.md]
---

# Custom-site setup ($300)

## TL;DR

An agent with an **active, paid Basic subscription** can buy a one-time **$300
custom-site setup** at `/agent/site-setup` (linked from Settings → Billing).
Stripe Checkout (mode `payment`) → the webhook marks the order paid and emails
the agent a link to a short **intake form** (style, service areas, logo,
example sites, colors, notes). Paid orders land in **Admin → Site setups**,
where Joseph moves them through `intake_received → in_progress → live`;
marking one live (with its URL) sends the **"your site is live"** email once.
Built as P5 of the [site-platform plan](../multi-tenant/site-platform-plan.md)
(decision D7).

**Not built: step 5.3**, the agent-approved, time-boxed build grant that lets
Joseph's Claude act on the agent's account. It waits on P3 (ChatRealty-hosted
custom sites). Until then Joseph builds with the agent's own MCP access.

## Rules

| Rule | Where |
|---|---|
| Price $300, one-time | `SITE_SETUP_PRICE_CENTS` in `src/config/site-setup.ts` |
| Buyer must have `AgentSubscription` with `tier: beginner` (Basic), `status: active`, and a Stripe subscription + customer | `checkSiteSetupEligibility()` |
| Admins can't buy (their Top Agent record is complimentary, no Stripe customer) | same |
| One open paid setup per agent at a time | `createSiteSetupCheckout()` → 409 |
| Stripe price: inline `price_data` unless `STRIPE_PRICE_SITE_SETUP` is set | so no product has to exist before launch |

## Files

| File | Purpose |
|---|---|
| `src/config/site-setup.ts` | Price, eligible tiers, checkout type, styles, statuses |
| `src/models/SiteSetupOrder.ts` | Order: status, payment ids, intake, live URL, history |
| `src/lib/site-setup.ts` | Eligibility, checkout, webhook fulfilment, refund handling |
| `src/lib/site-setup-emails.ts` | Paid / admin notice / live handoff — `renderBrandedEmail` + `platformFrom()` |
| `src/app/agent/site-setup/page.tsx` | Buy → intake form → status |
| `src/app/admin/site-setups/page.tsx` | Admin queue |

## Routes

| Route | Auth | What |
|---|---|---|
| `GET /api/site-setup` | Session | Eligibility + the agent's paid orders |
| `POST /api/site-setup` | Session, eligible | Creates the order (`awaiting_payment`) + Checkout session; returns its URL |
| `PUT /api/site-setup/[id]/intake` | Session, own order | Saves intake; first submit → `intake_received` + admin email. Editable until `in_progress` |
| `GET/PUT /api/admin/site-setups` | Admin | Queue; status, live URL, notes. `live` needs a URL and sends the handoff email once (`liveEmailSentAt`) |

## Statuses

`awaiting_payment` (checkout opened; hidden everywhere) → `intake_pending`
(webhook: paid) → `intake_received` (agent sent the form) → `in_progress` →
`live`. Side exits: `cancelled` (admin), `refunded` (Stripe full refund).

## Webhook

In `POST /api/webhooks/stripe`, **before** the event claim, like credit top-ups
and domains: `checkout.session.completed` / `async_payment_succeeded` with
`metadata.type = "site_setup"` → `fulfillSiteSetupCheckout()`. Idempotent: only
an `awaiting_payment` order moves, so a retry is a no-op and emails go once.
A full `charge.refunded` on the setup's payment intent marks it `refunded`.

The setup is a one-time payment, **not** a subscription invoice, so it never
earns an affiliate commission ([affiliates.md](./affiliates.md)).

## Testing (Stripe test mode)

`scripts/test-site-setup-flow.ts` creates a test agent with an active Basic
test-mode subscription, checks that ineligible users (no subscription, admin)
are refused, creates a real test-mode Checkout session, pays a test-mode
PaymentIntent, delivers a signed `checkout.session.completed` to the local
webhook, submits the intake, marks it live and cleans up. It refuses to run
with live keys and never sends the live email to a real address.
