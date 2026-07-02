// apps/api/src/listings/listings.service.ts
//
// Thin service over the REAL per-tenant DbAdapter. It reuses the Next app's
// core end-to-end:
//   • resolveAdapter(tenantId)            (keystone connection resolver)
//   • buildTenantListingFilter(params)    (pure param → ListingFilter)
//   • adapter.listings.find / .get        (the actual data access)
//
// No business logic is re-implemented here — the service only orchestrates the
// reused pieces and mirrors the Next routes' response shapes. It is where the
// HARD MANDATE lives: the listings surface calls the real adapter, never a stub.

import { Injectable, NotFoundException } from "@nestjs/common";

import { getAdapterForTenant } from "../common/adapter.provider";
import { buildTenantListingFilter } from "@/lib/skill-api/tenant-listing-filter";
import type { ListingFilter, ListingDTO, Page } from "@/lib/db/adapter";

const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 20;

function num(v: string | undefined): number | undefined {
  if (v === undefined || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

@Injectable()
export class ListingsService {
  /**
   * GET /v1/listings — structured search over the tenant's own listings.
   * Reuses buildTenantListingFilter for the param→filter mapping and returns
   * the adapter's Page<ListingDTO> verbatim.
   */
  async search(
    tenantId: string,
    params: URLSearchParams,
  ): Promise<Page<ListingDTO>> {
    const adapter = await getAdapterForTenant(tenantId);

    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, num(params.get("limit") ?? undefined) || DEFAULT_LIMIT),
    );
    const skip = Math.max(0, num(params.get("skip") ?? undefined) || 0);

    const filter: ListingFilter = buildTenantListingFilter(params);

    return adapter.listings.find(filter, {
      limit,
      skip,
      sort: [{ field: "onMarketDate", dir: "desc" }],
    });
  }

  /**
   * GET /v1/listings/:listingKey — single listing; 404 when absent.
   */
  async getOne(tenantId: string, listingKey: string): Promise<ListingDTO> {
    const adapter = await getAdapterForTenant(tenantId);
    const dto = await adapter.listings.get(listingKey);
    if (!dto) {
      throw new NotFoundException({ error: "not_found" });
    }
    return dto;
  }

  /**
   * GET /v1/listings/:listingKey/comparables — closed comps for a subject.
   * Mirrors the Next comparables route: same area + ±20% price + ±1 bed/bath
   * filter against Closed listings, plus subject + stats.
   */
  async comparables(tenantId: string, listingKey: string) {
    const adapter = await getAdapterForTenant(tenantId);

    const subject = await adapter.listings.get(listingKey);
    if (!subject) {
      throw new NotFoundException({ error: "not_found" });
    }

    const filter: ListingFilter = {
      status: "Closed",
      ...(subject.subdivision
        ? { subdivision: subject.subdivision }
        : subject.city
          ? { city: subject.city }
          : {}),
      price:
        typeof subject.listPrice === "number"
          ? {
              min: Math.floor(subject.listPrice * 0.8),
              max: Math.ceil(subject.listPrice * 1.2),
            }
          : undefined,
      beds:
        subject.beds != null
          ? { min: subject.beds - 1, max: subject.beds + 1 }
          : undefined,
      baths:
        subject.baths != null
          ? { min: subject.baths - 1, max: subject.baths + 1 }
          : undefined,
    };

    const page = await adapter.listings.find(filter, { limit: 12 });
    const comps: readonly ListingDTO[] = page.items;

    const prices = comps
      .map((c) => c.currentPrice ?? c.listPrice)
      .filter((p): p is number => typeof p === "number");
    const median =
      prices.length > 0
        ? prices.slice().sort((a, b) => a - b)[Math.floor(prices.length / 2)]
        : null;

    return {
      subject: {
        listingKey: subject.listingKey,
        address: subject.address,
        listPrice: subject.listPrice,
        beds: subject.beds,
        baths: subject.baths,
        sqft: subject.sqft,
      },
      comparables: comps.map((c) => ({
        listingKey: c.listingKey,
        address: c.address,
        closePrice: c.currentPrice ?? c.listPrice ?? null,
        closeDate: c.onMarketDate ?? null,
        beds: c.beds,
        baths: c.baths,
        sqft: c.sqft,
        daysOnMarket: c.daysOnMarket,
        listAgentName: c.listAgentName,
        listOfficeName: c.listOfficeName,
      })),
      stats: {
        count: comps.length,
        medianClosePrice: median,
        scope: subject.subdivision ? ("subdivision" as const) : ("city" as const),
      },
    };
  }
}
