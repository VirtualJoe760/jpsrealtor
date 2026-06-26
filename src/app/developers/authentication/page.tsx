// src/app/developers/authentication/page.tsx
//
// Authentication reference — crt_live_* tokens, the Authorization header, and
// the scope catalog. Grounded in src/lib/skill-auth.ts and src/lib/skill-scopes.ts.

import CodeBlock from "@/components/developers/CodeBlock";
import Callout from "@/components/developers/Callout";
import FieldTable from "@/components/developers/FieldTable";
import { DocsHeader, DocsSection, Prose } from "@/components/developers/DocsPage";

export default function AuthenticationPage() {
  return (
    <>
      <DocsHeader
        eyebrow="Reference"
        title="Authentication"
        intro="The ChatRealty REST API authenticates with bearer tokens. Each token is prefixed crt_live_, is hard-bound to one tenant, and carries an explicit set of scopes that gate which endpoints it can call."
      />

      <DocsSection title="Bearer tokens">
        <Prose>
          <p>
            Pass your token in the <code>Authorization</code> header on every request.
            Tokens look like <code>crt_live_</code> followed by a 32-byte base64url secret.
            The server SHA-256-hashes the incoming token and matches it against a
            non-revoked entry — the raw token is never stored.
          </p>
        </Prose>
        <CodeBlock
          language="text"
          title="Authorization header"
          code={`Authorization: Bearer crt_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`}
        />
        <Callout variant="info" title="Tokens are credentials">
          Treat a <code>crt_live_*</code> token like a password. Anyone holding it can read
          your tenant&apos;s data within the token&apos;s scopes. Revoke a leaked token from
          Settings → Integrations to kill access immediately.
        </Callout>
      </DocsSection>

      <DocsSection title="Minting a token">
        <Prose>
          <p>
            Create tokens in the dashboard under <strong>Settings → Integrations</strong>.
            When you mint a token you pick a <em>preset</em> (a bundle of scopes) or
            choose Custom and select scopes individually. The token secret is shown once at
            creation time — copy it then; only the last 4 characters are stored for display.
          </p>
        </Prose>
      </DocsSection>

      <DocsSection title="Scopes">
        <Prose>
          <p>
            Scopes are checked on every request. If a token lacks the scope an endpoint
            requires, the request fails with <code>403 missing_scope</code> and the response
            tells you which scope to re-mint with. The scopes relevant to the read API:
          </p>
        </Prose>
        <FieldTable
          nameHeader="Scope"
          showRequired={false}
          rows={[
            {
              name: "listings:read",
              type: "read",
              description: (
                <>
                  Read MLS listings — search, get one, and comparables. Required by every{" "}
                  <code>/api/skill/listings/*</code> endpoint.
                </>
              ),
            },
            {
              name: "market:read",
              type: "read",
              description:
                "Read aggregated market data — market stats, subdivision CMA, neighborhood info, mortgage rates.",
            },
            {
              name: "research:read",
              type: "read",
              description: (
                <>
                  Client-research read surface plus the saved-search / lead-signal write
                  path. Read-only and gated to the dedicated <code>research</code> rate
                  tier. Only granted by the <code>client_research</code> preset — never
                  folded into an agent preset.
                </>
              ),
            },
          ]}
        />
        <Prose>
          <p>
            Other scopes exist for CMS, CRM, campaigns, analytics, and social posting
            (e.g. <code>landing_pages:write</code>, <code>contacts:read</code>,{" "}
            <code>campaigns:send</code>). They are out of scope for the listings reference
            here.
          </p>
        </Prose>
      </DocsSection>

      <DocsSection title="Presets">
        <Prose>
          <p>
            Presets are convenience bundles shown when minting a token. The two most
            relevant for read/research integrations:
          </p>
        </Prose>
        <FieldTable
          nameHeader="Preset"
          showRequired={false}
          rows={[
            {
              name: "client_research",
              type: "preset",
              description: (
                <>
                  Read-only research surface:{" "}
                  <code>research:read</code>, <code>listings:read</code>,{" "}
                  <code>market:read</code>. No CRM, CMS, campaigns, or social posting.
                </>
              ),
            },
            {
              name: "content_drafting",
              type: "preset",
              description: (
                <>
                  Content tooling: landing-page and article read/write plus{" "}
                  <code>listings:read</code>, <code>market:read</code>,{" "}
                  <code>analytics:read</code>.
                </>
              ),
            },
          ]}
        />
        <Callout variant="info" title="Legacy tokens">
          Tokens minted before scopes existed fall back to a read-only default set
          (landing-page read/write, <code>listings:read</code>, <code>market:read</code>,{" "}
          <code>analytics:read</code>) so older integrations keep working. New writes
          require a fresh token with explicit scopes.
        </Callout>
      </DocsSection>

      <DocsSection title="Rate limits">
        <Prose>
          <p>
            Requests are rate-limited per token, by tier. The read API sits in the{" "}
            <code>read</code> tier; the research surface in the <code>research</code> tier:
          </p>
        </Prose>
        <FieldTable
          nameHeader="Tier"
          showRequired={false}
          rows={[
            { name: "identity", type: "200 / min", description: "whoami and my_* identity calls." },
            { name: "read", type: "100 / min", description: "Any :read scope — including the listings API." },
            { name: "research", type: "60 / min", description: "The research:read surface." },
            { name: "write", type: "30 / min", description: "Any :write scope (draft-only)." },
            { name: "send", type: "5 / min", description: "campaigns:send only (spends real money)." },
          ]}
        />
        <Prose>
          <p>
            A throttled request returns <code>429 rate_limited</code> with a{" "}
            <code>Retry-After</code> header and a <code>retryAfter</code> field in the body.
          </p>
        </Prose>
      </DocsSection>

      <DocsSection title="Error responses">
        <Prose>
          <p>Auth and scope failures return a JSON body with an <code>error</code> code:</p>
        </Prose>
        <CodeBlock
          language="json"
          title="403 — missing scope"
          code={`{
  "error": "missing_scope",
  "message": "This token does not have the 'listings:read' scope. Re-mint with that scope from Settings → Integrations.",
  "required": "listings:read",
  "tokenScopes": ["market:read"],
  "isLegacyToken": false
}`}
        />
        <FieldTable
          nameHeader="error"
          showRequired={false}
          rows={[
            { name: "missing_or_malformed_token", type: "401", description: "No Bearer token, or it does not match the crt_live_ format." },
            { name: "token_not_found", type: "401", description: "Token does not match any active token hash." },
            { name: "token_revoked", type: "403", description: "Token was revoked in Settings → Integrations." },
            { name: "missing_scope", type: "403", description: "Token is valid but lacks the scope this endpoint requires." },
            { name: "rate_limited", type: "429", description: "Per-token rate limit exceeded for this tier." },
          ]}
        />
      </DocsSection>
    </>
  );
}
