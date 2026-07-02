// apps/api/src/listings/listings.controller.ts
//
// GET /v1/listings                          — structured search
// GET /v1/listings/:listingKey              — single listing (404 if absent)
// GET /v1/listings/:listingKey/comparables  — closed comps + stats
//
// All routes are protected by CrtAuthGuard (bearer crt_live token → tenantId).
// The @Tenant() decorator supplies the resolved tenant id; the service does the
// real adapter work.

import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";

import { CrtAuthGuard } from "../common/crt-auth.guard";
import { Tenant } from "../common/tenant.decorator";
import { ListingsService } from "./listings.service";
import { SearchListingsQuery } from "./dto/search-listings.query";
import { ListingDto, ListingPageDto } from "./dto/listing.dto";
import { ComparablesResponseDto } from "./dto/comparables.dto";

@ApiTags("listings")
@ApiBearerAuth("crt_live")
@UseGuards(CrtAuthGuard)
@Controller("listings")
export class ListingsController {
  constructor(private readonly listings: ListingsService) {}

  @Get()
  @ApiOperation({
    summary: "Search listings",
    description:
      "Structured search over the tenant's own listings. Returns a page of ListingDTOs.",
  })
  @ApiOkResponse({ type: ListingPageDto })
  async search(@Tenant() tenantId: string, @Query() query: SearchListingsQuery) {
    // Rebuild a URLSearchParams so we can reuse the Next app's pure
    // buildTenantListingFilter() unchanged (it consumes URLSearchParams).
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null) params.set(k, String(v));
    }
    return this.listings.search(tenantId, params);
  }

  @Get(":listingKey")
  @ApiOperation({ summary: "Get a single listing by RESO listingKey." })
  @ApiParam({ name: "listingKey", description: "RESO ListingKey." })
  @ApiOkResponse({ type: ListingDto })
  @ApiNotFoundResponse({ description: "No listing with that key." })
  async getOne(
    @Tenant() tenantId: string,
    @Param("listingKey") listingKey: string,
  ) {
    return this.listings.getOne(tenantId, listingKey);
  }

  @Get(":listingKey/comparables")
  @ApiOperation({
    summary: "Closed comparables for a listing",
    description:
      "Closed comps in the same subdivision/city, ±20% price, ±1 bed/bath, plus subject + median stats.",
  })
  @ApiParam({ name: "listingKey", description: "RESO ListingKey of the subject." })
  @ApiOkResponse({ type: ComparablesResponseDto })
  @ApiNotFoundResponse({ description: "No subject listing with that key." })
  async comparables(
    @Tenant() tenantId: string,
    @Param("listingKey") listingKey: string,
  ) {
    return this.listings.comparables(tenantId, listingKey);
  }
}
