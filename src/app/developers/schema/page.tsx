// src/app/developers/schema/page.tsx
//
// Listing schema reference — the canonical ListingDTO plus the underlying RESO
// Property field catalog. Grounded in:
//   src/lib/db/adapter.ts (ListingDTO)
//   src/lib/reso/data-dictionary.ts (RESO Property fields)

import Link from "next/link";
import Callout from "@/components/developers/Callout";
import FieldTable from "@/components/developers/FieldTable";
import { DocsHeader, DocsSection, Prose } from "@/components/developers/DocsPage";

export default function SchemaPage() {
  return (
    <>
      <DocsHeader
        eyebrow="Reference"
        title="Listing schema"
        intro="The canonical listing shape (ListingDTO) is camelCase and dialect-independent — a Mongo row and a Postgres row map to the same fields. Tenant-bound endpoints return this DTO. Below: the DTO fields, then the broader RESO Property catalog that backs your tenant database."
      />

      <Callout variant="required" title="§3.8 — attribution is never optional">
        <p>
          <code>listAgentName</code> and <code>listOfficeName</code> are{" "}
          <strong>required</strong> on every listing — not nullable, not optional. This is
          an MLS/IDX display rule: anywhere you show a listing, you must show the listing
          agent and the listing brokerage. A listing served without them is a compliance
          bug of the same severity as a tenant leak. The sync writer enforces a{" "}
          <code>NOT NULL</code> column and substitutes a placeholder rather than ever
          emitting null.
        </p>
      </Callout>

      <DocsSection title="ListingDTO">
        <Prose>
          <p>The fields returned for a listing, grouped by purpose.</p>
        </Prose>

        <h3 className="mb-2 mt-6 text-base font-semibold text-foreground">Identity</h3>
        <FieldTable
          rows={[
            { name: "listingKey", type: "string", required: true, description: "Unique MLS listing key (primary key)." },
            { name: "slug", type: "string", required: true, description: "Relative path on the ChatRealty hub, e.g. /mls-listings/{key}." },
            { name: "detailUrl", type: "string", required: true, description: "Absolute URL to the listing detail page." },
          ]}
        />

        <h3 className="mb-2 mt-6 text-base font-semibold text-foreground">Location</h3>
        <FieldTable
          rows={[
            { name: "address", type: "string | null", description: "Full street address (UnparsedAddress)." },
            { name: "city", type: "string | null", description: "City." },
            { name: "subdivision", type: "string | null", description: "Subdivision / community name." },
            { name: "latitude", type: "number | null", description: "WGS84 latitude." },
            { name: "longitude", type: "number | null", description: "WGS84 longitude." },
          ]}
        />

        <h3 className="mb-2 mt-6 text-base font-semibold text-foreground">Classification &amp; price</h3>
        <FieldTable
          rows={[
            {
              name: "propertyType",
              type: "string | null",
              description: "Normalized bucket — A=sale, B=rental, C=multifamily, D=land. For B, listPrice doubles as monthly rent.",
            },
            { name: "status", type: "string | null", description: "RESO standardStatus (Active, Pending, Closed, …)." },
            { name: "listPrice", type: "number | null", description: "List price (or monthly rent for rentals)." },
            { name: "currentPrice", type: "number | null", description: "Post-reduction current price; falls back to listPrice." },
          ]}
        />

        <h3 className="mb-2 mt-6 text-base font-semibold text-foreground">Facts</h3>
        <FieldTable
          rows={[
            { name: "beds", type: "number | null", description: "Bedrooms (the dual bedroomsTotal/bedsTotal columns collapsed)." },
            { name: "baths", type: "number | null", description: "Bathrooms (bathroomsTotalInteger/bathsTotal collapsed)." },
            { name: "sqft", type: "number | null", description: "Living area in square feet." },
            { name: "yearBuilt", type: "number | null", description: "Year built." },
            { name: "pool", type: "boolean", description: "Whether the listing has a pool." },
          ]}
        />

        <h3 className="mb-2 mt-6 text-base font-semibold text-foreground">Market timing</h3>
        <FieldTable
          rows={[
            { name: "daysOnMarket", type: "number | null", description: "Days on market (derived from onMarketDate where not stored)." },
            { name: "onMarketDate", type: "string | null", description: "ISO-8601 on-market timestamp." },
          ]}
        />

        <h3 className="mb-2 mt-6 text-base font-semibold text-foreground">Media</h3>
        <FieldTable
          rows={[
            { name: "primaryPhotoUrl", type: "string | null", description: "Raw original first-photo URL." },
            { name: "thumbUrl", type: "string | null", description: "Render-ready optimized webp thumbnail (use for <img> tags)." },
          ]}
        />

        <h3 className="mb-2 mt-6 text-base font-semibold text-foreground">Attribution (required)</h3>
        <FieldTable
          rows={[
            { name: "listAgentName", type: "string", required: true, description: "Listing agent full name. Never null (§3.8)." },
            { name: "listOfficeName", type: "string", required: true, description: "Listing brokerage name. Never null (§3.8)." },
            { name: "listAgentPreferredPhone", type: "string | null", description: "Listing agent phone, where the surface allows." },
            { name: "listOfficePhone", type: "string | null", description: "Listing brokerage phone, where the surface allows." },
          ]}
        />
      </DocsSection>

      <DocsSection title="RESO Property catalog">
        <Prose>
          <p>
            Behind the DTO, your tenant database stores the full RESO{" "}
            <code>Property</code> resource. Each field carries three casings — the camelCase
            DTO name, the PascalCase RESO source name, and the snake_case Postgres column —
            which never drift because they&apos;re hand-mapped in one catalog. A selection
            of the columns you can <code>$filter</code> / <code>$select</code> against:
          </p>
        </Prose>
        <FieldTable
          nameHeader="DTO name"
          showRequired={false}
          rows={[
            { name: "listingKey", type: "ListingKey · listing_key", description: "Primary key (string, indexed)." },
            { name: "mlsSource", type: "OriginatingSystemName · mls_source", description: "Human MLS name (GPS, CRMLS, …)." },
            { name: "propertyType", type: "PropertyType · property_type", description: "Bucket A/B/C/D (indexed)." },
            { name: "standardStatus", type: "StandardStatus · standard_status", description: "Enum: Active, Pending, Closed, Expired, … (indexed)." },
            { name: "listPrice", type: "ListPrice · list_price", description: "List price; rent for type B (indexed)." },
            { name: "bedroomsTotal", type: "BedroomsTotal · bedrooms_total", description: "Bedrooms (indexed; dual with bedsTotal)." },
            { name: "bathroomsTotalInteger", type: "BathroomsTotalInteger · bathrooms_total_integer", description: "Bathrooms (indexed)." },
            { name: "livingArea", type: "LivingArea · living_area", description: "Square feet." },
            { name: "yearBuilt", type: "YearBuilt · year_built", description: "Year built (indexed)." },
            { name: "poolYN", type: "PoolPrivateYN · pool_yn", description: "Canonical pool flag (indexed)." },
            { name: "city", type: "City · city", description: "City (indexed)." },
            { name: "subdivisionName", type: "SubdivisionName · subdivision_name", description: "Subdivision (indexed)." },
            { name: "postalCode", type: "PostalCode · postal_code", description: "ZIP (indexed)." },
            { name: "geom", type: "Geom · geom", description: "PostGIS point, GiST-indexed; derived from lon/lat." },
            { name: "onMarketDate", type: "OnMarketDate · on_market_date", description: "On-market timestamp (indexed)." },
            { name: "modificationTimestamp", type: "ModificationTimestamp · modification_timestamp", description: "Sync watermark source (indexed)." },
            { name: "publicRemarks", type: "PublicRemarks · public_remarks", description: "Listing description." },
            { name: "listAgentName", type: "ListAgentFullName · list_agent_name", description: "Attribution — NOT NULL (§3.8)." },
            { name: "listOfficeName", type: "ListOfficeName · list_office_name", description: "Attribution — NOT NULL (§3.8)." },
            { name: "extras", type: "Extras · extras", description: "Unmapped RESO fields, as JSONB (GIN-indexed, registry-validated)." },
          ]}
        />
        <Callout variant="info" title="Nothing is silently lost">
          RESO fields the catalog doesn&apos;t model land in the <code>extras</code> JSONB
          column, and the full raw source payload is retained in <code>raw</code>. The
          column names are read from the canonical data dictionary, not guessed — the same
          source the sync mapper and the tenant DB schema are built from. See{" "}
          <Link className="underline" href="/developers/sync">
            Sync your MLS data
          </Link>
          .
        </Callout>
      </DocsSection>
    </>
  );
}
