// apps/api/src/listings/dto/comparables.dto.ts
//
// Swagger shapes for GET /v1/listings/:listingKey/comparables. Mirrors the Next
// route's { subject, comparables[], stats } response (including the §3.8
// agent/brokerage attribution carried on each comp).

import { ApiProperty } from "@nestjs/swagger";

export class ComparableSubjectDto {
  @ApiProperty()
  listingKey!: string;

  @ApiProperty({ nullable: true, type: String })
  address!: string | null;

  @ApiProperty({ nullable: true, type: Number })
  listPrice!: number | null;

  @ApiProperty({ nullable: true, type: Number })
  beds!: number | null;

  @ApiProperty({ nullable: true, type: Number })
  baths!: number | null;

  @ApiProperty({ nullable: true, type: Number })
  sqft!: number | null;
}

export class ComparableDto {
  @ApiProperty()
  listingKey!: string;

  @ApiProperty({ nullable: true, type: String })
  address!: string | null;

  @ApiProperty({ nullable: true, type: Number })
  closePrice!: number | null;

  @ApiProperty({ nullable: true, type: String })
  closeDate!: string | null;

  @ApiProperty({ nullable: true, type: Number })
  beds!: number | null;

  @ApiProperty({ nullable: true, type: Number })
  baths!: number | null;

  @ApiProperty({ nullable: true, type: Number })
  sqft!: number | null;

  @ApiProperty({ nullable: true, type: Number })
  daysOnMarket!: number | null;

  @ApiProperty({ description: "Listing agent name (required attribution)." })
  listAgentName!: string;

  @ApiProperty({ description: "Listing office name (required attribution)." })
  listOfficeName!: string;
}

export class ComparablesStatsDto {
  @ApiProperty()
  count!: number;

  @ApiProperty({ nullable: true, type: Number })
  medianClosePrice!: number | null;

  @ApiProperty({ enum: ["subdivision", "city"] })
  scope!: "subdivision" | "city";
}

export class ComparablesResponseDto {
  @ApiProperty({ type: ComparableSubjectDto })
  subject!: ComparableSubjectDto;

  @ApiProperty({ type: [ComparableDto] })
  comparables!: ComparableDto[];

  @ApiProperty({ type: ComparablesStatsDto })
  stats!: ComparablesStatsDto;
}
