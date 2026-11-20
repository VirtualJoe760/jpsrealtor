---
title: Site management — edge, traffic and crawler control
status: current
last_verified: 2026-11-20
related: [../listings/caching-and-traffic.md, ../multi-tenant/README.md, ../incidents/2026-11-19-listings-saturation.md, ../routing/README.md]
---

# Site management — edge, traffic and crawler control

## TL;DR

One Vercel deployment serves **every** tenant host. Protection therefore lives at
**two layers that cover different sets of hostnames**, and picking the wrong one
silently leaves tenants exposed:

| Layer | Covers | Does **not** cover |
|---|---|---|
| **Cloudflare WAF** (per zone) | only hostnames with a **proxied / orange-cloud** DNS record — today `jpsrealtor.com`, `www.jpsrealtor.com`, `chatrealty.io`, `www.chatrealty.io` | `*.chatrealty.io`, every agent subdomain, `api.chatrealty.io`, custom domains — all deliberately **DNS-only** |
| **Vercel Firewall** (project-wide) | **every host on the deployment**, including agent subdomains and custom domains | nothing — it is the backstop |

**Rule of thumb: anything that must hold for all tenants goes in the Vercel
Firewall.** Cloudflare is an edge optimisation on top — it blocks before the
request costs a function invocation, but it only sees four hostnames.

## Why the split exists

On 2026-11-05 the four public hostnames were put behind Cloudflare (orange) and
`api.chatrealty.io`, `*.chatrealty.io` and the named agent subdomains were
**left DNS-only on purpose**. That is still the layout, verified 2026-11-20. It
means a Cloudflare rule written for jpsrealtor.com protects roughly one tenant,
not the estate.

> **Note on where that history lives.** The fuller account — the orange-cloud
> switch, Fluid Compute, the spend cap, the "don't enable Bot Fight Mode"
> warning — is in a revision of
> [../listings/caching-and-traffic.md](../listings/caching-and-traffic.md) that
> is **not on `main`**: it sits on `feat/highlevel-integration` (PR #16).
> `main`'s copy is still `last_verified: 2026-10-25` and predates Cloudflare
> entirely. Anyone reading from `main` will not find it, which is part of why
> this page exists.

## Current rules (2026-11-20)

### Vercel Firewall — project `jpsrealtor`, team `joes-projects-e3fd5dcd`

Dashboard: **Firewall → Rules → Project rules**. Changes are **staged** and need
an explicit **Publish**; they apply without a redeploy.

| Rule | Match | Action |
|---|---|---|
| `Block AI crawlers (all tenant hosts)` | User Agent *matches expression* `[Mm]eta-[Ee]xternal[Aa]gent\|[Mm]eta-[Ww]eb[Ii]ndexer\|[Cc]laude[Bb]ot\|[Gg][Pp][Tt][Bb]ot\|[Oo][Aa][Ii]-[Ss]earch[Bb]ot\|[Bb]ytespider\|[Cc][Cc][Bb]ot\|[Aa]mazonbot\|[Pp]etal[Bb]ot\|[Ss]emrush[Bb]ot\|[Aa]hrefs[Bb]ot\|[Dd]ata[Ff]or[Ss]eo[Bb]ot` | **Deny** |
| `Rate-limit AI/SEO crawlers` (2026-10-25) | Meta-ExternalAgent, AhrefsBot | 30 req / 60 s per IP → 429 |

The rate-limit rule is now largely redundant behind the deny, but harmless.

**Vercel's regex engine does not accept `(?i)`.** Case-insensitivity has to be
written as character classes, which is why the expression looks the way it does.
A rule saved with `(?i)` fails validation in the form.

### Cloudflare WAF — both zones

Account `cd0533e7f970b37ee8c80d293389e169`.

| Order | Rule | Action | Zones |
|---|---|---|---|
| 1 | `Block AI crawlers and SEO scrapers (2026-11-20 DB saturation)` — `http.user_agent contains` each of the twelve agents above | **Block** | jpsrealtor.com, chatrealty.io |
| 2 | `Challenge non-search bots on listing pages` (2026-11-05) | Managed Challenge | both |

Cloudflare's historical preview when the rule was written: **532,180 requests /
29.5% of all traffic** on jpsrealtor.com, **59,320 / 4.2%** on chatrealty.io,
over 30 days.

**The order-2 rule cannot catch these crawlers, and that is worth understanding
before writing another one.** Its expression contains `not cf.client.bot`, and
`cf.client.bot` means **verified** bot. Meta's crawlers are on Cloudflare's
verified list, so the rule explicitly *exempted* the traffic that saturated the
database. Verified ≠ welcome.

## Hard constraints

- **Never match `facebookexternalhit` or `facebot`.** That is the link-preview
  fetcher — blocking it breaks the share card on every listing an agent posts.
  It is not `Meta-ExternalAgent`.
- **Keep `Googlebot`, `bingbot` and `Applebot`.** Applebot is Apple's *search*
  crawler (Siri, Spotlight); `Applebot-Extended` is the AI-training token and is
  a robots.txt directive, not a user agent, so matching it in a WAF rule does
  nothing.
- **Do not enable Cloudflare Bot Fight Mode.** On the free plan it cannot be
  scoped by path and would challenge Stripe webhooks, the MCP bridge and the VPS
  scripts, which all call `/api/*` with non-browser user agents.
- **Do not block `User-Agent: node` blindly** — our own integrations use it.
- robots.txt is advisory. It has **no `Crawl-delay`** today and did not stop any
  of this; enforcement belongs at the firewall.

## Adding a new tenant

A new agent subdomain or custom domain is **covered by the Vercel Firewall the
moment it points at the deployment** — no per-tenant rule, nothing to remember.
That is the whole reason the deny rule lives there.

Only if a tenant's domain is later put behind Cloudflare (orange-cloud) does it
need the zone-level rule added, and even then the Vercel rule is already
protecting it.

## Verifying

Blocked agents must 403 on **every** host, and good agents must 200:

```sh
for H in jpsrealtor.com www.chatrealty.io josephsardella.chatrealty.io; do
  for UA in "meta-webindexer/1.1" "Mozilla/5.0 (compatible; Googlebot/2.1)" "facebookexternalhit/1.1"; do
    printf '%-32s %-40s %s\n' "$H" "$UA" \
      "$(curl -s -o /dev/null -m 45 -w '%{http_code}' -A "$UA" "https://$H/")"
  done
done
```

Verified 2026-11-20 — `meta-webindexer` 403 on `jpsrealtor.com`,
`www.chatrealty.io`, `josephsardella.chatrealty.io` and
`bethanyklier.chatrealty.io`; `Googlebot` and `facebookexternalhit` 200 on all.

**Test on `/` rather than `/mls-listings/`.** The order-2 Managed Challenge
returns 403 to any non-verified client on that path, including curl with a
spoofed Googlebot UA, so a listing-path test cannot distinguish "my block
worked" from "the challenge fired".

## Rolling back

- **Vercel:** Firewall → Rules → toggle the rule off, then **Publish**.
- **Cloudflare:** Security rules → the rule's `…` menu → disable. Or set the
  four proxied records back to DNS-only, which removes the Cloudflare layer
  entirely and leaves the Vercel Firewall still protecting everything.

## API access

`CLOUDFLARE_API_TOKEN` in `.env.local` has **DNS and zone-settings rights but
not Rulesets** — WAF rules cannot be created or read with it (`Authentication
error`, code 10000). Zone listing and settings work fine. WAF changes are
dashboard-only unless a token with **Zone → Zone WAF → Edit** is minted.

## What this does not solve

Blocking removes the load; it does not make the pages cheap. The underlying
exposure is that `/mls-listings/[slugAddress]` is **0% CDN-cached** — 84,564
pages, each a fresh database read — because `getCatalogBaseUrlFromHeaders()`
calls `headers()` and the output varies by host. Until that is addressed, any
crawler that is allowed through still costs a function invocation and a
document fetch per page. See
[../listings/caching-and-traffic.md](../listings/caching-and-traffic.md) and
[../incidents/2026-11-19-listings-saturation.md](../incidents/2026-11-19-listings-saturation.md).

## Related

- [../listings/caching-and-traffic.md](../listings/caching-and-traffic.md) — the
  2026-10-25 and 2026-11-05 history, cache headers, spend caps
- [../multi-tenant/README.md](../multi-tenant/README.md) — how one deployment
  serves every host
- [../incidents/2026-11-19-listings-saturation.md](../incidents/2026-11-19-listings-saturation.md)
  — the outage that produced these rules
