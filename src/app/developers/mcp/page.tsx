// src/app/developers/mcp/page.tsx
//
// Connecting the MCP — hosted connector URL + paste-token OAuth flow + the read
// tools. Grounded in docs/mcp/README.md, docs/mcp/hosting.md, docs/mcp/tools.md,
// and packages/mcp-server/src/build-guide/prompts.ts.

import Link from "next/link";
import CodeBlock from "@/components/developers/CodeBlock";
import Callout from "@/components/developers/Callout";
import FieldTable from "@/components/developers/FieldTable";
import { DocsHeader, DocsSection, Prose } from "@/components/developers/DocsPage";

export default function McpPage() {
  return (
    <>
      <DocsHeader
        eyebrow="Integrate"
        title="MCP connector"
        intro="Connect ChatRealty to your existing Claude subscription as a custom MCP connector. Claude can then search your MLS, pull a listing, and run comparables in natural language — no Anthropic API key, no extra infrastructure. Your crt_live_ token drives identity, scopes, and rate limits."
      />

      <DocsSection title="Hosted connector (paste-token flow)">
        <Prose>
          <p>
            The hosted MCP server is served over Streamable HTTP from the ChatRealty app,
            behind a minimal OAuth 2.1 shim. Add it once in the Claude apps and it works
            from your phone or the web client. The connector URL is:
          </p>
        </Prose>
        <CodeBlock language="text" title="Connector URL" code={`https://www.chatrealty.io/api/mcp/mcp`} />
        <Callout variant="warning" title="Use the www host">
          Always give clients the <code>www</code> URL. The bare apex{" "}
          <code>chatrealty.io</code> 307-redirects to <code>www</code>, and a redirect on
          the connector URL breaks the OAuth handshake.
        </Callout>

        <h3 className="mb-2 mt-6 text-base font-semibold text-foreground">Steps</h3>
        <Prose>
          <ol className="ml-5 list-decimal space-y-1">
            <li>
              Mint a token at <strong>Settings → Integrations</strong> with at least{" "}
              <code>listings:read</code> and <code>market:read</code> (add{" "}
              <code>contacts:read</code> only if you want lead PII to reach Claude). See{" "}
              <Link className="underline" href="/developers/authentication">
                Authentication
              </Link>
              .
            </li>
            <li>
              In the Claude app: <strong>Settings → Connectors → Add custom connector</strong>.
            </li>
            <li>
              Enter the connector URL <code>https://www.chatrealty.io/api/mcp/mcp</code>.
            </li>
            <li>
              The OAuth consent screen opens — <strong>paste your crt_live_… token</strong>{" "}
              and approve. The access token resolves server-side to that token (encrypted at
              rest).
            </li>
            <li>
              Ask, e.g.: <em>&quot;Search active listings in La Quinta under $800k with a
              pool.&quot;</em>
            </li>
          </ol>
        </Prose>
        <Callout variant="info" title="How the credential resolves">
          The OAuth layer advertises one coarse <code>chatrealty</code> scope; real gating
          is your token&apos;s own scopes, enforced downstream at the{" "}
          <code>/api/skill/*</code> routes. Access tokens last 24h, refresh tokens 90d
          (rotated on use). Revoke the underlying <code>crt_live_</code> token to kill a
          connection.
        </Callout>
      </DocsSection>

      <DocsSection title="Local (stdio) alternative">
        <Prose>
          <p>
            For Claude Desktop / Claude Code you can run the server locally instead — a
            small Node process that speaks MCP over stdio and reads the token from an
            environment variable. The hosted connector is the headline path; stdio is the
            power-user fallback.
          </p>
        </Prose>
        <CodeBlock
          language="bash"
          title="stdio server"
          code={`CHATREALTY_API_TOKEN=crt_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx \\
  npx @chatrealty/mcp-server`}
        />
      </DocsSection>

      <DocsSection title="Read tools available">
        <Prose>
          <p>
            Every tool is a thin wrapper over a <code>/api/skill/*</code> route — the JSON
            Schema and result rendering live in the MCP layer, the logic in the route. The
            read tools most relevant to a data integration:
          </p>
        </Prose>
        <FieldTable
          nameHeader="Tool"
          showRequired={false}
          rows={[
            { name: "search_listings", type: "listings:read", description: "Filter listings by city, subdivision, beds, baths, price, type, status, radius." },
            { name: "get_listing", type: "listings:read", description: "Full detail for one listing by listingKey." },
            { name: "find_comparables", type: "listings:read", description: "Closed comps for a listing — area + ±1 bed/bath + ±20% price, last 6 months." },
            { name: "search_closed_listings", type: "listings:read", description: "Same filters as search, against closed/sold history (CMA narratives)." },
            { name: "get_market_stats", type: "market:read", description: "City / ZIP / subdivision medians, days-on-market, inventory, YoY." },
            { name: "get_subdivision_cma", type: "market:read", description: "Full CMA stats for a subdivision (precomputed model)." },
            { name: "get_neighborhood_info", type: "market:read", description: "POIs, demographics, schools for a neighborhood." },
            { name: "get_mortgage_rates", type: "market:read", description: "Live mortgage rates." },
          ]}
        />
        <Callout variant="info" title="Neutral, factual presentation">
          ChatRealty tools return public-record MLS data for licensed real-estate use.
          Report metrics (price, days-on-market, price-per-sqft) as plain facts. Don&apos;t
          editorialize about another agent&apos;s listing — days-on-market is a neutral
          metric, not a defect.
        </Callout>
      </DocsSection>

      <DocsSection title="Build-guide prompts">
        <Prose>
          <p>
            ChatRealty ships a library of copy-paste Claude prompts — a guided build that
            walks from connecting your MLS feed through scaffolding a listings page, adding a
            map, wiring favorites + lead capture, and building neighborhood pages. Paste one
            into a fresh Claude session that has the ChatRealty MCP connected. They are
            served as <code>guide://chatrealty/*</code> MCP resources (Claude reads them
            in-loop) and mirror the same source the build guide uses. The build order:
          </p>
          <ol className="ml-5 list-decimal space-y-1">
            <li>Connect your MLS feed</li>
            <li>Seed your database</li>
            <li>Scaffold a listings page</li>
            <li>Add the map</li>
            <li>Wire favorites + lead capture</li>
            <li>Build neighborhoods</li>
          </ol>
        </Prose>
        <Callout variant="required" title="Attribution in scaffolded UIs">
          Every prompt that generates listing UI requires the output to display{" "}
          <code>listAgentName</code> and <code>listOfficeName</code> on each card and detail
          view (&quot;Listed by {"{office}"} — {"{agent}"}&quot;). This is the same hard IDX
          display rule the API enforces — see the{" "}
          <Link className="underline" href="/developers/schema">
            Listing schema
          </Link>
          .
        </Callout>
      </DocsSection>
    </>
  );
}
