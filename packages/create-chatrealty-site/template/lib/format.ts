export function money(n: number | null | undefined): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export function moneyShort(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return money(n);
}

export function num(n: number | null | undefined): string {
  return n == null ? "—" : new Intl.NumberFormat("en-US").format(n);
}

// A median over a handful of listings is not a market statistic, it is one
// listing's price wearing a statistic's label. Below this, show the COUNT —
// true at any size — and drop the medians rather than publish a number that
// misinforms.
//
// This lives here, and every surface imports it, because it did not: the
// homepage suppressed and the neighborhood pages didn't, so a judged build told
// a visitor "too few active listings here to quote a meaningful median" on the
// homepage and then quoted a $5,000,000 median on /neighborhoods/rancho-mirage
// — same city, same three listings, two contradictory answers one click apart.
// A threshold that only one page honors is worse than no threshold: it makes
// the site look like it is hiding something on the page that got it right.
export const MIN_MEDIAN_SAMPLE = 5;

export function medianIsMeaningful(activeCount: number | null | undefined): boolean {
  return (activeCount ?? 0) >= MIN_MEDIAN_SAMPLE;
}

// A license number is a compliance element, and a bare 8-digit number is not
// recognizable as one. The footer always said "License #02189476" while /about
// and /contact printed "02189476" on its own — a visitor reading the About page
// saw an unexplained number. One helper so every surface agrees.
//
// A value that already carries its own label ("DRE #01234567", "CA DRE
// 01234567" — agents type it that way) is passed through untouched.
export function license(n: string | null | undefined): string | null {
  const v = (n ?? "").trim();
  if (!v) return null;
  return /(dre|lic|license|#)/i.test(v) ? v : `License #${v}`;
}
