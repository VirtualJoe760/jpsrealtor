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
            The package runs under <code>tsx</code> (no build step). Its deps are{" "}
            <code>commander</code>, <code>zod</code>, <code>pg</code>, and{" "}
            <code>dotenv</code>.
          </p>
        </Prose>
        <CodeBlock
          language="bash"
          code={`cd packages/chatrealty-sync
npm install`}
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
            { name: "TENANT_NEON_CONN_URI", type: "string", required: true, description: "Your tenant Neon pooled connection string." },
            { name: "RESO_BASE_URL", type: "string", required: true, description: "RESO Web API OData base, e.g. https://api.bridgedataoutput.com/api/v2/OData." },
            { name: "RESO_TOKEN_URL", type: "string", required: true, description: "OAuth2 token endpoint (client-credentials grant)." },
            { name: "RESO_CLIENT_ID", type: "string", required: true, description: "Your MLS RESO client id." },
            { name: "RESO_CLIENT_SECRET", type: "string", required: true, description: "Your MLS RESO client secret." },
            { name: "RESO_SCOPE", type: "string", required: false, description: "OAuth2 scope, if your MLS requires one." },
            { name: "RESO_RESOURCE", type: "string", required: false, description: "Resource name (default Property)." },
            { name: "RESO_PAGE_SIZE", type: "number", required: false, description: "OData page size (default 200)." },
            { name: "SYNC_STATE_PATH", type: "string", required: false, description: "Watermark file path (default ./.sync-state)." },
            { name: "SYNC_OVERLAP_HOURS", type: "number", required: false, description: "Incremental lookback (default 26)." },
            { name: "SYNC_BATCH_SIZE", type: "number", required: false, description: "Upsert batch size (default 400)." },
          ]}
        />
        <CodeBlock
          language="dotenv"
          title=".env.local (do not commit)"
          code={`TENANT_NEON_CONN_URI=postgresql://USER:PASS@ep-xxxx-pooler.us-west-2.aws.neon.tech/neondb?sslmode=require
RESO_BASE_URL=https://api.bridgedataoutput.com/api/v2/OData
RESO_TOKEN_URL=https://api.bridgedataoutput.com/oauth2/token
RESO_CLIENT_ID=your-client-id
RESO_CLIENT_SECRET=your-client-secret`}
        />
      </DocsSection>

      <DocsSection title="Run it">
        <Prose>
          <p>Default behavior is a full seed on the first run, incremental on every run after.</p>
        </Prose>
        <CodeBlock
          language="bash"
          code={`# Full seed on first run, incremental thereafter.
npx chatrealty-sync run

# Dry run — pull + map everything, write NOTHING (safe to inspect).
npx chatrealty-sync run --dry-run

# Single bounded pass (smoke test): cap records and exit.
npx chatrealty-sync run --once --max 50`}
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
            Run it once a day. The watermark in <code>./.sync-state</code> is what makes each
            run incremental — keep it on persistent disk. Delete it to force a full re-seed.
          </p>
        </Prose>
        <CodeBlock
          language="cron"
          title="crontab — 6 AM daily"
          code={`0 6 * * *  cd /path/to/packages/chatrealty-sync && npx chatrealty-sync run >> sync.log 2>&1`}
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
