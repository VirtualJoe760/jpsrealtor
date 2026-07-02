// apps/api/src/listings/dto/search-listings.query.ts
//
// Query params for GET /v1/listings. Documents the SAME params the Next search
// route accepts. Values arrive as strings (query string); we keep them as
// strings and hand them to the reused buildTenantListingFilter() via
// URLSearchParams so the param→ListingFilter mapping is not duplicated here.

import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class SearchListingsQuery {
  @ApiPropertyOptional({ description: "Exact city match." })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: "Exact subdivision match." })
  @IsOptional()
  @IsString()
  subdivision?: string;

  @ApiPropertyOptional({
    description: "Property-type bucket. A=sale (default), B=rental, C=multifamily, D=land.",
  })
  @IsOptional()
  @IsString()
  propertyType?: string;

  @ApiPropertyOptional({ description: "standardStatus (default 'Active')." })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: "Minimum list price." })
  @IsOptional()
  @IsString()
  minPrice?: string;

  @ApiPropertyOptional({ description: "Maximum list price." })
  @IsOptional()
  @IsString()
  maxPrice?: string;

  @ApiPropertyOptional({ description: "Minimum beds." })
  @IsOptional()
  @IsString()
  minBeds?: string;

  @ApiPropertyOptional({ description: "Maximum beds." })
  @IsOptional()
  @IsString()
  maxBeds?: string;

  @ApiPropertyOptional({ description: "Minimum baths." })
  @IsOptional()
  @IsString()
  minBaths?: string;

  @ApiPropertyOptional({ description: "Maximum baths." })
  @IsOptional()
  @IsString()
  maxBaths?: string;

  @ApiPropertyOptional({ description: "Minimum year built." })
  @IsOptional()
  @IsString()
  minYearBuilt?: string;

  @ApiPropertyOptional({ description: "Maximum year built." })
  @IsOptional()
  @IsString()
  maxYearBuilt?: string;

  @ApiPropertyOptional({
    description: "Pool presence: true|false|1|0|yes|no.",
  })
  @IsOptional()
  @IsString()
  hasPool?: string;

  @ApiPropertyOptional({ description: "On-market at most N days (new listings)." })
  @IsOptional()
  @IsString()
  maxDaysOnMarket?: string;

  @ApiPropertyOptional({ description: "On-market at least N days." })
  @IsOptional()
  @IsString()
  minDaysOnMarket?: string;

  @ApiPropertyOptional({ description: "Page size (1–50, default 20)." })
  @IsOptional()
  @IsString()
  limit?: string;

  @ApiPropertyOptional({ description: "Offset (default 0)." })
  @IsOptional()
  @IsString()
  skip?: string;
}
