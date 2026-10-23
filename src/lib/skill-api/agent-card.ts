// src/lib/skill-api/agent-card.ts
//
// One agent as a search row or a profile header, from an `agents` doc (chatrealty-backend docs/tools/agents.md).
// Counts come from `production`, which every doc carries; `active`/`escrow`/`offMarket` are omitted on most docs.
// With a city slug, that city's own figures come back as `inCity` — a city match means "has worked there", and the
// whole-window totals can belong mostly to other cities.

export function agentCard(a: any, citySlug?: string) {
  const local = citySlug ? (a.location?.cities || []).find((c: any) => c?.slug === citySlug) : null;
  return {
    id: a._id,
    slug: a.slug || null,
    name: a.identity?.name || a._id,
    mlsSource: a.mlsSource || null,
    brokerage: a.brokerage?.name || null,
    brokerageId: a.brokerage?.slug || null,
    market: a.location?.marketLabel || null,
    photoUrl: a.identity?.photoUrl || null,
    activeListings: a.production?.activeListings ?? 0,
    last12moDeals: a.production?.last12moDeals ?? 0,
    last12moVolume: a.production?.last12moVolume ?? 0,
    windowDeals: a.production?.windowDeals ?? 0,
    windowVolume: a.production?.windowVolume ?? 0,
    status: a.activity?.status || null,
    confidence: a.coverage?.confidence || null,
    otherRegistrations: (a.identity?.alsoKnownAs || []).map((x: any) => x?._id).filter(Boolean),
    ...(local ? { inCity: { closed: local.closed ?? 0, active: local.active ?? 0, total: local.total ?? 0 } } : {}),
  };
}
