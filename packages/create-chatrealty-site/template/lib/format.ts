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
