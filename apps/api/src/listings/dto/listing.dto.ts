// apps/api/src/listings/dto/listing.dto.ts
//
// Swagger-documented mirror of the core ListingDTO (src/lib/db/adapter.ts).
// This class exists ONLY to describe the response shape in the OpenAPI doc;
// the actual objects returned by the adapter are the real ListingDTO — we do
// not re-map them, we just annotate the shape for /docs.
//
// ATTRIBUTION INVARIANT (build_plan §3.8): listAgentName + listOfficeName are
// REQUIRED on every listing (MLS/IDX display rule), so they are non-nullable
// here too.

import { ApiProperty } from "@nestjs/swagger";

export class ListingDto {
  // --- identity ---
  @ApiProperty({ description: "RESO ListingKey — the stable listing id." })
  listingKey!: string;

  @ApiProperty({ description: "Relative detail path, e.g. /mls-listings/<key>." })
  slug!: string;

  @ApiProperty({ description: "Absolute detail URL on the hub." })
  detailUrl!: string;

  // --- location ---
  @ApiProperty({ nullable: true, type: String })
  address!: string | null;

  @ApiProperty({ nullable: true, type: String })
  city!: string | null;

  @ApiProperty({ nullable: true, type: String })
  subdivision!: string | null;

  @ApiProperty({ nullable: true, type: Number })
  latitude!: number | null;

  @ApiProperty({ nullable: true, type: Number })
  longitude!: number | null;

  // --- classification ---
  @ApiProperty({
    nullable: true,
    type: String,
    description: "Property-type label / bucket.",
  })
  propertyType!: string | null;

  @ApiProperty({ nullable: true, type: String, description: "standardStatus." })
  status!: string | null;

  // --- price ---
  @ApiProperty({ nullable: true, type: Number })
  listPrice!: number | null;

  @ApiProperty({
    nullable: true,
    type: Number,
    description: "Current (post-reduction) price when available.",
  })
  currentPrice!: number | null;

  // --- facts ---
  @ApiProperty({ nullable: true, type: Number })
  beds!: number | null;

  @ApiProperty({ nullable: true, type: Number })
  baths!: number | null;

  @ApiProperty({ nullable: true, type: Number, description: "Living area sqft." })
  sqft!: number | null;

  @ApiProperty({ nullable: true, type: Number })
  yearBuilt!: number | null;

  @ApiProperty({ description: "Whether the listing has a pool." })
  pool!: boolean;

  // --- market timing ---
  @ApiProperty({ nullable: true, type: Number })
  daysOnMarket!: number | null;

  @ApiProperty({
    nullable: true,
    type: String,
    description: "onMarketDate as an ISO-8601 string.",
  })
  onMarketDate!: string | null;

  // --- media ---
  @ApiProperty({ nullable: true, type: String })
  primaryPhotoUrl!: string | null;

  @ApiProperty({
    nullable: true,
    type: String,
    description: "Render-ready optimized thumbnail URL.",
  })
  thumbUrl!: string | null;

  // --- ATTRIBUTION (REQUIRED — IDX display rule) ---
  @ApiProperty({ description: "Listing agent name (required attribution)." })
  listAgentName!: string;

  @ApiProperty({ description: "Listing office / brokerage name (required attribution)." })
  listOfficeName!: string;

  @ApiProperty({ nullable: true, type: String })
  listAgentPreferredPhone!: string | null;

  @ApiProperty({ nullable: true, type: String })
  listOfficePhone!: string | null;
}

/** A page of listings — mirrors Page<ListingDTO> from the core adapter. */
export class ListingPageDto {
  @ApiProperty({ type: [ListingDto] })
  items!: ListingDto[];

  @ApiProperty({
    nullable: true,
    type: Number,
    description: "Exact total when a count was requested, else null.",
  })
  total!: number | null;

  @ApiProperty()
  skip!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  hasMore!: boolean;
}
