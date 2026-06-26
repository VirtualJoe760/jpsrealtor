// src/app/developers/endpoints/page.tsx
//
// Listings API reference — search / get / comparables. Grounded in:
//   src/app/api/skill/listings/search/route.ts
//   src/app/api/skill/listings/[listingKey]/route.ts
//   src/app/api/skill/listings/[listingKey]/comparables/route.ts

import Link from "next/link";
import CodeBlock from "@/components/developers/CodeBlock";
import Callout from "@/components/developers/Callout";
import FieldTable from "@/components/developers/FieldTable";
import { DocsHeader, DocsSection, Prose } from "@/components/developers/DocsPage";

function EndpointBadge({ method, path }: { method: string; path: string }) {
  return (
    <div className="my-3 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
      <span className="rounded bg-foreground px-2 py-0.5 font-mono text-xs font-semibold text-background">
        {method}
      </span>
      <code className="font-mono text-sm text-foreground">{path}</code>
    </div>
  );
}

export default function EndpointsPage() {
  return (
    <>
      <DocsHeader
        eyebrow="Reference"
        title="Listings API"
        intro="Read MLS listings from your tenant's data. Three endpoints: search a filtered list, fetch a single listing in full, and pull closed comparables for a listing. All require the listings:read scope."
      />

      <Callout variant="info" title="Tenant-scoped reads">
        A token bound to a tenant reads that customer&apos;s own listings. The same
        endpoints serve the ChatRealty hub&apos;s shared MLS for unbound (dogfood) tokens.
        Either way the request only ever sees data the token is entitled to.
      </Callout>

      {/* ───────────────────────── Search ───────────────────────── */}
      <DocsSection id="search" title="Search listings">
        <EndpointBadge method="GET" path="/api/skill/listings/search" />
        <Prose>
          <p>
            Returns a paginated list of listings matching the query filters. Defaults to{" "}
            <code>status=Active</code> and to residential sale listings (property type{" "}
            <code>A</code>) so rentals don&apos;t pollute price-based searches — pass{" "}
            <code>propertyType=all</code> to mix, or a rental type to search rentals only.
            <code>limit</code> caps at 50 (default 20).
          </p>
        </Prose>

        <h3 className="mb-2 mt-6 text-base font-semibold text-foreground">Query parameters</h3>
        <FieldTable
          nameHeader="Param"
          showRequired={false}
          rows={[
            { name: "city", type: "string", description: "Exact city match." },
            { name: "subdivision", type: "string", description: "Exact subdivision name match." },
            {
              name: "propertyType",
              type: "string",
              description: (
                <>
                  Property bucket: <code>A</code> sale (default), <code>B</code> rental,{" "}
                  <code>C</code> multifamily, <code>D</code> land. Pass <code>all</code> to
                  mix. Friendly aliases like <code>Residential Lease</code> /{" "}
                  <code>Rental</code> are also accepted.
                </>
              ),
            },
            { name: "status", type: "string", description: "RESO standardStatus. Defaults to Active." },
            { name: "minPrice / maxPrice", type: "number", description: "Inclusive list-price range." },
            { name: "minBeds / maxBeds", type: "number", description: "Inclusive bedrooms range." },
            { name: "minBaths / maxBaths", type: "number", description: "Inclusive bathrooms range." },
            { name: "minYearBuilt / maxYearBuilt", type: "number", description: "Inclusive year-built range (era queries)." },
            {
              name: "hasPool",
              type: "boolean",
              description: "true requires a non-empty pool feature; false excludes pools.",
            },
            {
              name: "near",
              type: "string",
              description: (
                <>
                  Center for a radius search — a ZIP, city, neighborhood, street address, or{" "}
                  <code>lat,lng</code>. Anything but <code>lat,lng</code> is geocoded.
                </>
              ),
            },
            {
              name: "radiusMiles",
              type: "number",
              description: "Radius for near (default 10, max 50). Ignored without near.",
            },
            {
              name: "maxDaysOnMarket",
              type: "number",
              description: "Only listings on-market at most N days (new listings).",
            },
            {
              name: "minDaysOnMarket",
              type: "number",
              description: "Only listings on-market at least N days.",
            },
            { name: "limit", type: "number", description: "Page size, 1–50 (default 20)." },
            { name: "skip", type: "number", description: "Offset for pagination (default 0)." },
          ]}
        />

        <h3 className="mb-2 mt-6 text-base font-semibold text-foreground">Example request</h3>
        <CodeBlock
          language="bash"
          title="curl"
          code={`curl -s "https://www.chatrealty.io/api/skill/listings/search?city=La%20Quinta&maxPrice=800000&hasPool=true&limit=2" \\
  -H "Authorization: Bearer crt_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"`}
        />

        <h3 className="mb-2 mt-6 text-base font-semibold text-foreground">Example response</h3>
        <CodeBlock
          language="json"
          title="200 OK"
          code={`{
  "items": [
    {
      "listingKey": "219100000",
      "address": "54-000 Avenida Example",
      "city": "La Quinta",
      "subdivision": "La Quinta Cove",
      "propertyType": "Residential",
      "status": "Active",
      "listPrice": 749000,
      "beds": 3,
      "baths": 2,
      "sqft": 1840,
      "yearBuilt": 1998,
      "pool": true,
      "poolFeatures": "In Ground, Private",
      "currentPrice": 749000,
      "latitude": 33.6803,
      "longitude": -116.3100,
      "daysOnMarket": 12,
      "onMarketDate": "2026-06-13T07:18:17Z",
      "primaryPhotoUrl": "https://.../original.jpg",
      "thumbUrl": "https://www.chatrealty.io/_next/image?url=...&w=640&q=75",
      "slug": "/mls-listings/219100000",
      "detailUrl": "https://www.chatrealty.io/mls-listings/219100000"
    }
  ],
  "total": 1,
  "skip": 0,
  "limit": 2,
  "hasMore": false,
  "appliedPropertyType": "A",
  "propertyTypeRecognized": true
}`}
        />
        <Prose>
          <p>
            When <code>near</code> is supplied, results are sorted by distance and each item
            gains a <code>distanceMiles</code> field; the envelope also echoes back{" "}
            <code>center</code>, <code>radiusMiles</code>, and{" "}
            <code>sortedBy: &quot;distance&quot;</code>. A center that can&apos;t be located
            returns <code>422 could_not_geocode</code>.
          </p>
        </Prose>
        <Callout variant="required" title="Attribution on every item">
          Tenant-bound responses return the canonical listing shape, which carries{" "}
          <code>listAgentName</code> and <code>listOfficeName</code> on every item — the
          required IDX attribution. See the{" "}
          <Link className="underline" href="/developers/schema">
            Listing schema
          </Link>
          .
        </Callout>
      </DocsSection>

      {/* ───────────────────────── Get one ───────────────────────── */}
      <DocsSection id="get" title="Get a listing">
        <EndpointBadge method="GET" path="/api/skill/listings/{listingKey}" />
        <Prose>
          <p>
            Returns the full detail for one listing by its RESO <code>listingKey</code>.
            Includes the fields you need to write content about a property: address,
            price (and original/current), beds/baths/sqft, year, HOA, public remarks,
            pool/spa, view, parking, photo count, coordinates, and attribution. Returns{" "}
            <code>404 not_found</code> for an unknown key.
          </p>
        </Prose>

        <h3 className="mb-2 mt-6 text-base font-semibold text-foreground">Path parameters</h3>
        <FieldTable
          nameHeader="Param"
          rows={[
            {
              name: "listingKey",
              type: "string",
              required: true,
              description: "The unique MLS listing key (the listingKey from a search result).",
            },
          ]}
        />

        <h3 className="mb-2 mt-6 text-base font-semibold text-foreground">Example request</h3>
        <CodeBlock
          language="bash"
          title="curl"
          code={`curl -s "https://www.chatrealty.io/api/skill/listings/219100000" \\
  -H "Authorization: Bearer crt_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"`}
        />

        <h3 className="mb-2 mt-6 text-base font-semibold text-foreground">Example response</h3>
        <CodeBlock
          language="json"
          title="200 OK (truncated)"
          code={`{
  "listingKey": "219100000",
  "address": "54-000 Avenida Example",
  "city": "La Quinta",
  "state": "CA",
  "postalCode": "92253",
  "subdivision": "La Quinta Cove",
  "propertyType": "Residential",
  "propertySubType": "Single Family Residence",
  "status": "Active",
  "listPrice": 749000,
  "currentPrice": 749000,
  "originalListPrice": 775000,
  "beds": 3,
  "baths": 2,
  "bathsDecimal": 2.0,
  "sqft": 1840,
  "lotSize": 6098,
  "lotSizeUnits": "Square Feet",
  "yearBuilt": 1998,
  "levels": "One",
  "hoaFee": 0,
  "hoaFeeFrequency": null,
  "communityFeatures": null,
  "pool": true,
  "poolFeatures": "In Ground, Private",
  "spa": true,
  "spaFeatures": "In Ground",
  "view": "Mountain(s)",
  "garageSpaces": 2,
  "parkingTotal": 4,
  "heating": "Central",
  "cooling": "Central Air",
  "daysOnMarket": 12,
  "onMarketDate": "2026-06-13T07:18:17Z",
  "publicRemarks": "...",
  "supplement": null,
  "photoCount": 31,
  "primaryPhotoUrl": "https://.../original.jpg",
  "thumbUrl": "https://www.chatrealty.io/_next/image?url=...&w=640&q=75",
  "latitude": 33.6803,
  "longitude": -116.3100,
  "listAgentName": "Jane Agent",
  "listOfficeName": "Example Realty",
  "hasOpenHouses": false,
  "slug": "/mls-listings/219100000",
  "detailUrl": "https://www.chatrealty.io/mls-listings/219100000"
}`}
        />
      </DocsSection>

      {/* ───────────────────────── Comparables ───────────────────────── */}
      <DocsSection id="comparables" title="Get comparables">
        <EndpointBadge method="GET" path="/api/skill/listings/{listingKey}/comparables" />
        <Prose>
          <p>
            Returns a simple closed-comp set for a listing — recently sold properties in the
            same subdivision (or city), same property type, within ±1 bed, ±1 bath, ±20% of
            list price, sold within the last 6 months. Capped at 12, sorted most-recent
            first. The response includes the subject, the comparables, and quick stats
            (count, median close price, scope).
          </p>
        </Prose>

        <h3 className="mb-2 mt-6 text-base font-semibold text-foreground">Path parameters</h3>
        <FieldTable
          nameHeader="Param"
          rows={[
            {
              name: "listingKey",
              type: "string",
              required: true,
              description: "The listing to find comparables for.",
            },
          ]}
        />

        <h3 className="mb-2 mt-6 text-base font-semibold text-foreground">Example request</h3>
        <CodeBlock
          language="bash"
          title="curl"
          code={`curl -s "https://www.chatrealty.io/api/skill/listings/219100000/comparables" \\
  -H "Authorization: Bearer crt_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"`}
        />

        <h3 className="mb-2 mt-6 text-base font-semibold text-foreground">Example response</h3>
        <CodeBlock
          language="json"
          title="200 OK (truncated)"
          code={`{
  "subject": {
    "listingKey": "219100000",
    "address": "54-000 Avenida Example",
    "listPrice": 749000,
    "beds": 3,
    "baths": 2,
    "sqft": 1840
  },
  "comparables": [
    {
      "listingKey": "219099111",
      "address": "53-900 Avenida Sample",
      "closePrice": 735000,
      "closeDate": "2026-04-18",
      "beds": 3,
      "baths": 2,
      "sqft": 1795,
      "daysOnMarket": 24
    }
  ],
  "stats": {
    "count": 1,
    "medianClosePrice": 735000,
    "scope": "subdivision"
  }
}`}
        />
        <Callout variant="info" title="Tenant comps carry attribution too">
          On a tenant-bound token, each comparable additionally includes{" "}
          <code>listAgentName</code> and <code>listOfficeName</code>. For a richer CMA with
          narrative and stats, the agent dashboard&apos;s CMA flow is the deeper tool — this
          endpoint is the lightweight comp set.
        </Callout>
      </DocsSection>
    </>
  );
}
