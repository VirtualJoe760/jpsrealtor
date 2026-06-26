// src/app/developers/page.tsx
//
// Overview / Getting Started for the ChatRealty developer reference.

import Link from "next/link";
import CodeBlock from "@/components/developers/CodeBlock";
import Callout from "@/components/developers/Callout";
import { DocsHeader, DocsSection, Prose } from "@/components/developers/DocsPage";

export default function DevelopersOverviewPage() {
  return (
    <>
      <DocsHeader
        eyebrow="ChatRealty API"
        title="Developer Reference"
        intro="ChatRealty is a tenant-isolated real-estate backend. You bring your own MLS feed, sync it into your own database, and query it through a typed REST API and an MCP connector — every token is hard-bound to one tenant, so a request only ever sees that customer's own data."
      />

      <DocsSection title="What the API is">
        <Prose>
          <p>
            ChatRealty turns an MLS RESO feed into a queryable backend. The product is
            built around two principles:
          </p>
          <ul className="ml-5 list-disc space-y-1">
            <li>
              <strong>BYOD — Bring Your Own Data.</strong> You point{" "}
              <code>@chatrealty/sync</code> at your MLS RESO Web API feed and it writes
              listings into <em>your</em> per-tenant database (Neon / Postgres + PostGIS).
              ChatRealty never touches your raw feed.
            </li>
            <li>
              <strong>BYOK — Bring Your Own Key (model).</strong> The MCP connector runs
              against your existing Claude subscription — you never paste an Anthropic API
              key into ChatRealty. Inference billing stays on your Claude account; we just
              expose typed tools.
            </li>
            <li>
              <strong>Tenant isolation.</strong> A <code>crt_live_*</code> token is bound to
              exactly one tenant. The same endpoints (<code>/api/skill/listings/*</code>)
              fork on that binding and read the bound customer&apos;s own data.
            </li>
          </ul>
        </Prose>
      </DocsSection>

      <DocsSection title="The customer flow">
        <Prose>
          <p>End-to-end, onboarding a tenant is five steps:</p>
          <ol className="ml-5 list-decimal space-y-1">
            <li>
              <strong>Sign up</strong> for a ChatRealty tenant (provisions your isolated
              database).
            </li>
            <li>
              <strong>Get a token</strong> — mint a <code>crt_live_*</code> API token in
              Settings → Integrations, scoped to what you need (e.g.{" "}
              <code>listings:read</code>, <code>market:read</code>). See{" "}
              <Link className="underline" href="/developers/authentication">
                Authentication
              </Link>
              .
            </li>
            <li>
              <strong>Connect your MLS + sync</strong> — run{" "}
              <code>@chatrealty/sync</code> to pull your RESO feed into your database. See{" "}
              <Link className="underline" href="/developers/sync">
                Sync your MLS data
              </Link>
              .
            </li>
            <li>
              <strong>Connect the MCP</strong> — add ChatRealty as a custom connector in
              Claude and query in natural language. See{" "}
              <Link className="underline" href="/developers/mcp">
                MCP connector
              </Link>
              .
            </li>
            <li>
              <strong>Query your data</strong> — over REST or MCP. Every listing comes back
              with the required agent/brokerage attribution baked in.
            </li>
          </ol>
        </Prose>
      </DocsSection>

      <DocsSection title="Base URL">
        <Prose>
          <p>
            All REST endpoints live under <code>/api/skill</code> on the canonical host.
            Use the <code>www</code> host — the bare apex 307-redirects, and a redirect on
            an authenticated request can drop the <code>Authorization</code> header.
          </p>
        </Prose>
        <CodeBlock language="text" code={`https://www.chatrealty.io/api/skill`} />
      </DocsSection>

      <DocsSection title="Quickstart">
        <Prose>
          <p>
            Authenticate with a bearer token and hit the listings search endpoint. This
            returns active listings in a city as JSON.
          </p>
        </Prose>
        <CodeBlock
          language="bash"
          title="curl — search active listings"
          code={`curl -s "https://www.chatrealty.io/api/skill/listings/search?city=Palm%20Desert&status=Active&minBeds=3&hasPool=true&limit=5" \\
  -H "Authorization: Bearer crt_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"`}
        />
        <Prose>
          <p>A successful response is a paginated envelope:</p>
        </Prose>
        <CodeBlock
          language="json"
          title="200 OK (truncated)"
          code={`{
  "items": [
    {
      "listingKey": "219100000",
      "address": "73-000 Example Dr",
      "city": "Palm Desert",
      "status": "Active",
      "listPrice": 749000,
      "beds": 3,
      "baths": 2,
      "sqft": 1840,
      "pool": true,
      "listAgentName": "Jane Agent",
      "listOfficeName": "Example Realty",
      "detailUrl": "https://www.chatrealty.io/mls-listings/219100000"
    }
  ],
  "total": 1,
  "skip": 0,
  "limit": 5,
  "hasMore": false
}`}
        />
        <Callout variant="required" title="Attribution is mandatory">
          Every listing carries <code>listAgentName</code> and <code>listOfficeName</code>.
          This is an MLS/IDX display requirement (§3.8) — when you render listing data, you
          must show the listing agent and brokerage. See the{" "}
          <Link className="underline" href="/developers/schema">
            Listing schema
          </Link>
          .
        </Callout>
      </DocsSection>

      <DocsSection title="Next steps">
        <Prose>
          <ul className="ml-5 list-disc space-y-1">
            <li>
              <Link className="underline" href="/developers/authentication">
                Authentication
              </Link>{" "}
              — tokens, the Authorization header, scopes.
            </li>
            <li>
              <Link className="underline" href="/developers/endpoints">
                Listings API
              </Link>{" "}
              — search, get, and comparables, with params and response shapes.
            </li>
            <li>
              <Link className="underline" href="/developers/schema">
                Listing schema
              </Link>{" "}
              — every field on a listing.
            </li>
            <li>
              <Link className="underline" href="/developers/mcp">
                MCP connector
              </Link>{" "}
              — connect Claude to your data.
            </li>
            <li>
              <Link className="underline" href="/developers/sync">
                Sync your MLS data
              </Link>{" "}
              — the BYOD pipeline.
            </li>
          </ul>
        </Prose>
      </DocsSection>
    </>
  );
}
