// Where a listing link goes: THIS site.
//
// The API returns `detailUrl` for every listing, and it points at the
// ChatRealty hub (https://www.chatrealty.io/mls-listings/{key}) — useful when
// Claude renders a listing in a chat artifact, wrong on the agent's own site.
// Three surfaces linked straight to it (CHAP result cards, the swipe deck's
// "View details", the detail page's "View all photos"), so a visitor who
// engaged with the site's flagship features was handed to another domain. A
// judge flagged it as the site funnelling away its own traffic.
//
// Every in-site listing link goes through here. If you add a surface that shows
// a listing, use this — never `listing.detailUrl`.
export function listingHref(listingKey: string, backHref?: string): string {
  const base = `/listings/${encodeURIComponent(listingKey)}`;
  return backHref ? `${base}?back=${encodeURIComponent(backHref)}` : base;
}
