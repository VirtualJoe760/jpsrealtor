// src/app/developers/sync/page.tsx
//
// BYOD sync setup — bring your MLS feed, run @chatrealty/sync, it writes to your
// own database. Grounded in packages/chatrealty-sync/README.md.

import Link from "next/link";
import CodeBlock from "@/components/developers/CodeBlock";
import Callout from "@/components/developers/Callout";
import FieldTable from "@/components/developers/FieldTable";
import { DocsHeader, DocsSection, Prose } from "@/components/developers/DocsPage";

export default function SyncPage() {
  return (
    <>
      <DocsHeader
        eyebrow="Integrate"
        title="Sync your MLS data"
        intro="Bring Your Own Data: @chatrealty/sync pulls your MLS RESO Web API feed into your own ChatRealty tenant database (Neon / Postgres + PostGIS) and keeps it fresh on a daily cron. Run it on your machine or your server — ChatRealty never touches your raw feed."
      />

      <DocsSection title="How it works">
        <Prose>
          <p>The pipeline is a straight line from your feed to your database:</p>
        </Prose>
        <CodeBlock
          language="text"
          title="pipeline"
          code={`RESO Web API feed  →  reso-fetch  →  map  →  write  →  your Neon "property" table
   (your MLS)         (OData pull)   (RESO→snake)  (upsert)      (PostGIS)`}
        />
        <Prose>
          <ul className="ml-5 list-disc space-y-1">
            <li>
              <strong>Full seed</strong> on the first run (no watermark yet) — pulls the
              whole <code>Property</code> feed.
            </li>
            <li>
              <strong>Incremental</strong> thereafter —{" "}
              <code>$filter=ModificationTimestamp gt &lt;watermark&gt;</code> with a 26-hour
              overlap window so a boundary record is never missed.
            </li>
            <li>
              <strong>Upsert-only, never deletes.</strong>{" "}
              <code>INSERT … ON CONFLICT (listing_key) DO UPDATE</code>. Listings leave
              &quot;Active&quot; only via status transitions in the feed.
            </li>
            <li>
              <strong>Nothing silently lost.</strong> Unmodeled RESO fields fall into the{" "}
              <code>extras</code> JSONB column; the full raw payload is kept in{" "}
              <code>raw</code>.
            </li>
          </ul>
        </Prose>
        <Callout variant="required" title="Attribution is guaranteed at write time">
          Every row carries <code>list_agent_name</code> + <code>list_office_name</code>{" "}
          (plus phones and MLS ids). These columns are <code>NOT NULL</code>: the mapper
          substitutes a placeholder rather than ever emitting null, and always preserves real
          attribution when the feed provides it. See the{" "}
          <Link className="underline" href="/developers/schema">
            Listing schema
          </Link>
          .
        </Callout>
      </DocsSection>

      <DocsSection title="Install">
        <Prose>
          <p>
            Published on npm as <code>@chatrealty/sync</code>. Always invoke it{" "}
            <em>scoped</em> — <code>npx chatrealty-sync</code> is a registry 404, because
            no unscoped package by that name exists; <code>chatrealty-sync</code> is only
            the bin name once installed.
          </p>
        </Prose>
        <CodeBlock
          language="bash"
          code={`# Nothing to install — npx fetches it. The package is SCOPED:
# there is no unscoped "chatrealty-sync" on npm.
npx @chatrealty/sync init --token crt_live_…   # provisions your DB, writes CHATREALTY_DB_URL
npx @chatrealty/sync doctor                     # validates DB + feed credentials`}
        />
      </DocsSection>

      <DocsSection title="Environment">
        <Prose>
          <p>
            Secrets come from the environment only — never a checked-in config file, never
            logged. The CLI auto-loads <code>.env.local</code> then <code>.env</code>.
          </p>
        </Prose>
        <FieldTable
          nameHeader="Variable"
          rows={[
            { name: "CHATREALTY_DB_URL", type: "string", required: true, description: "Your tenant database URL (pooled). Written for you by `npx @chatrealty/sync init` — you should never have to paste it." },
            { name: "RESO_BASE_URL", type: "string", required: true, description: "RESO Web API OData base, e.g. https://replication.sparkapi.com/Reso/OData (Spark) or your MLS's own base." },
            { name: "RESO_BEARER_TOKEN", type: "string", required: false, description: "Static access token (a Spark access token goes here). Set this and skip the three OAuth vars below." },
            { name: "RESO_TOKEN_URL", type: "string", required: false, description: "OAuth2 token endpoint (client-credentials grant). Required unless RESO_BEARER_TOKEN is set." },
            { name: "RESO_CLIENT_ID", type: "string", required: false, description: "Your MLS RESO client id. Required unless RESO_BEARER_TOKEN is set." },
            { name: "RESO_CLIENT_SECRET", type: "string", required: false, description: "Your MLS RESO client secret. Required unless RESO_BEARER_TOKEN is set." },
            { name: "RESO_SCOPE", type: "string", required: false, description: "OAuth2 scope, if your MLS requires one." },
            { name: "RESO_RESOURCE", type: "string", required: false, description: "Resource name (default Property)." },
            { name: "RESO_PAGE_SIZE", type: "number", required: false, description: "OData page size (default 200)." },
            { name: "RESO_NETWORKS", type: "string", required: false, description: "Comma-separated associations to sync (see `sync networks`). Unset = every association the key can see." },
            { name: "SYNC_STATE_PATH", type: "string", required: false, description: "Watermark file for capped/dry runs only (default ./.sync-state). A real run checkpoints in your database." },
            { name: "SYNC_OVERLAP_HOURS", type: "number", required: false, description: "Incremental lookback (default 26)." },
            { name: "SYNC_BATCH_SIZE", type: "number", required: false, description: "Upsert batch size (default 400)." },
          ]}
        />
        <CodeBlock
          language="dotenv"
          title=".env.local (do not commit)"
          code={`# Written by \`npx @chatrealty/sync init --token crt_live_…\`
CHATREALTY_DB_URL=postgresql://USER:PASS@ep-xxxx-pooler.us-west-2.aws.neon.tech/neondb?sslmode=require

# Mode A — a static access token (Spark and similar):
RESO_BASE_URL=https://replication.sparkapi.com/Reso/OData
RESO_BEARER_TOKEN=your-access-token

# Mode B — RESO Web API OAuth2 client-credentials:
# RESO_BASE_URL=https://api.bridgedataoutput.com/api/v2/OData
# RESO_TOKEN_URL=https://api.bridgedataoutput.com/oauth2/token
# RESO_CLIENT_ID=your-client-id
# RESO_CLIENT_SECRET=your-client-secret`}
        />
      </DocsSection>

      <DocsSection title="Run it">
        <Prose>
          <p>Default behavior is a full seed on the first run, incremental on every run after.</p>
        </Prose>
        <CodeBlock
          language="bash"
          code={`# Full seed on first run, incremental thereafter.
npx @chatrealty/sync run

# Dry run — pull + map everything, write NOTHING (safe to inspect).
npx @chatrealty/sync run --dry-run

# Single bounded pass (smoke test): cap records and exit.
npx @chatrealty/sync run --once --max 50`}
        />
        <Prose>
          <p>
            The CLI prints a one-line summary (mode, pulled/mapped/upserted counts, the new
            watermark) and exits non-zero on failure. It never prints secrets.
          </p>
        </Prose>
      </DocsSection>

      <DocsSection title="Daily cadence">
        <Prose>
          <p>
            Run it once a day. The watermark lives in your own database (the{" "}
            <code>sync_state</code> table), written after every page, so a run is safe to
            interrupt and resumes where it stopped — and a local run and the hosted cron
            share the same checkpoint. Capped (<code>--once</code>/<code>--max</code>) and
            dry runs deliberately leave it untouched.
          </p>
        </Prose>
        <CodeBlock
          language="cron"
          title="crontab — 6 AM daily"
          code={`0 6 * * *  cd /path/to/packages/chatrealty-sync && npx @chatrealty/sync run >> sync.log 2>&1`}
        />
      </DocsSection>

      <DocsSection title="Gotchas">
        <Prose>
          <ul className="ml-5 list-disc space-y-1">
            <li>
              <strong>Use the pooled URI for runtime.</strong> The <code>-pooler</code> Neon
              endpoint is for the sync. DDL / <code>CREATE EXTENSION</code> happen at
              provision time over the direct URI, not here.
            </li>
            <li>
              <strong>Never <code>--purge</code>.</strong> This package has no delete path
              by design (after the April 6 2026 incident).
            </li>
            <li>
              <strong><code>list_price</code> doubles as rent</strong> for rentals
              (<code>property_type = &quot;B&quot;</code>) — there is no separate rent column.
            </li>
            <li>
              <strong><code>geom</code> is derived</strong> from longitude/latitude as a
              GeoJSON point. No coordinates → null geom.
            </li>
            <li>
              <strong>Rate limits are per API key, not per run.</strong> A fresh seed can
              get <code>429</code> on its first request because an earlier run spent the
              quota. The client retries (honoring <code>Retry-After</code>); if it still
              gives up, wait and re-run — the checkpoint means nothing is lost.
            </li>
            <li>
              <strong>Row count is not inventory count.</strong> The feed is walked
              oldest-first, so a partial seed is mostly Closed archival sales. What decides
              whether a site shows homes is the <em>Active for-sale</em> count, which{" "}
              <code>doctor</code> reports specifically.
            </li>
          </ul>
        </Prose>
        <Callout variant="info" title="Column naming is not guessed">
          The mapper reads column names from the canonical RESO Data Dictionary — the same
          source the tenant DB schema is built from — so the three casings
          (<code>ListingKey</code> / <code>listingKey</code> / <code>listing_key</code>)
          never drift. Once your data is synced, query it via the{" "}
          <Link className="underline" href="/developers/endpoints">
            Listings API
          </Link>{" "}
          or the{" "}
          <Link className="underline" href="/developers/mcp">
            MCP connector
          </Link>
          .
        </Callout>
      </DocsSection>
    </>
  );
}
