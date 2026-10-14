// Server-rendered community facts for a subdivision page.
//
// Subdivision pages had nothing on them a city page did not also have: a photo
// carousel, an About paragraph, the same four stat tiles, a map, a client-side
// listings widget. Nothing stated what the community actually IS — whether it is
// gated, age-restricted, on a golf course, what the HOA costs, or whether it
// carries a Mello-Roos assessment. Those are the facts a buyer searches for by
// name ("Sun City Shadow Hills HOA fees"), and they are the only thing that
// makes one of 1,426 community pages distinguishable from the next.
//
// Two sources, in priority order:
//   1. `communityFacts` on the Subdivision document — curated and precise, but
//      present for only 146 of 1,426 communities.
//   2. Computed from the active listings (lib/market-stats getPlaceProfile) —
//      always available where there is inventory, less precise.
// Curated wins where both exist; neither is invented where both are absent.

import type { PlaceProfile } from "@/lib/market-stats";

export interface CommunityFacts {
  communityType?: string | null;
  hoaMonthlyMin?: number | null;
  hoaMonthlyMax?: number | null;
  hoaIncludes?: string | null;
  melloRoos?: boolean | null;
  melloRoosAmount?: number | null;
  lidAssessment?: boolean | null;
  golfCourses?: number | null;
  golfCoursesNames?: string | null;
  securityType?: string | null;
  shortTermRentalsAllowed?: string | null;
  minimumLeaseLength?: string | null;
  yearBuiltRange?: string | null;
}

interface Props {
  subdivisionName: string;
  facts?: CommunityFacts | null;
  profile?: PlaceProfile | null;
  seniorCommunity?: boolean;
}

function fmtMoney(n: number): string {
  return `$${Math.round(n).toLocaleString()}`;
}

function fmtRange(min?: number | null, max?: number | null, fmt = (n: number) => String(n)) {
  if (min == null && max == null) return null;
  if (min != null && max != null) return min === max ? fmt(min) : `${fmt(min)} – ${fmt(max)}`;
  return fmt((min ?? max) as number);
}

const COMMUNITY_TYPE_LABELS: Record<string, string> = {
  "equity-club": "Equity country club",
  "non-equity-club": "Non-equity country club",
  "golf-community": "Golf community",
  "gated-non-golf": "Gated, non-golf",
  "55plus": "55+ active adult",
  "luxury-gated": "Luxury gated",
  "non-gated": "Non-gated",
};

export default function SubdivisionFacts({
  subdivisionName,
  facts,
  profile,
  seniorCommunity,
}: Props) {
  const rows: { label: string; value: string; note?: string }[] = [];

  const type = facts?.communityType;
  if (type) {
    rows.push({ label: "Community type", value: COMMUNITY_TYPE_LABELS[type] || type });
  }

  // Age restriction. The curated `communityType: '55plus'` is definitive; the
  // computed share is a fallback, and the threshold is high because a handful
  // of mis-flagged listings must not label a community age-restricted when it
  // is not — that is a fair-housing-adjacent claim, not a nice-to-have.
  const seniorShare = profile?.seniorShare ?? null;
  if (type === "55plus" || seniorCommunity) {
    rows.push({ label: "Age restriction", value: "55+" });
  } else if (seniorShare != null && seniorShare >= 0.8 && (profile?.sampleSize ?? 0) >= 5) {
    rows.push({
      label: "Age restriction",
      value: "55+",
      note: `${Math.round(seniorShare * 100)}% of current listings are flagged as senior community`,
    });
  }

  // HOA: curated figures first, then what the listings report.
  const curatedHoa = fmtRange(facts?.hoaMonthlyMin, facts?.hoaMonthlyMax, fmtMoney);
  const computedHoa = fmtRange(profile?.hoaMonthlyMin, profile?.hoaMonthlyMax, fmtMoney);
  if (curatedHoa) {
    rows.push({
      label: "HOA dues",
      value: `${curatedHoa}/mo`,
      note: facts?.hoaIncludes || undefined,
    });
  } else if (computedHoa) {
    rows.push({
      label: "HOA dues",
      value: `${computedHoa}/mo`,
      note: "Range across current listings",
    });
  }

  // Mello-Roos / CFD. Only stated when the curated data says so either way —
  // absence of a flag is not evidence of absence of an assessment, and telling
  // a buyer "no Mello-Roos" when nobody checked is the kind of wrong that ends
  // up in a disclosure dispute.
  if (facts?.melloRoos === true) {
    rows.push({
      label: "Mello-Roos / CFD",
      value: facts.melloRoosAmount ? `Yes, ~${fmtMoney(facts.melloRoosAmount)}/yr` : "Yes",
    });
  } else if (facts?.melloRoos === false) {
    rows.push({ label: "Mello-Roos / CFD", value: "None reported" });
  }
  if (facts?.lidAssessment === true) {
    rows.push({ label: "LID assessment", value: "Yes" });
  }

  const yearBuilt =
    fmtRange(profile?.yearBuiltMin, profile?.yearBuiltMax) || facts?.yearBuiltRange || null;
  if (yearBuilt) {
    rows.push({ label: "Homes built", value: String(yearBuilt) });
  }

  const lot = fmtRange(profile?.lotSqFtMin, profile?.lotSqFtMax, (n) =>
    `${Math.round(n).toLocaleString()} sq ft`,
  );
  if (lot) rows.push({ label: "Lot sizes", value: lot });

  const area = fmtRange(profile?.livingAreaMin, profile?.livingAreaMax, (n) =>
    `${Math.round(n).toLocaleString()} sq ft`,
  );
  if (area) rows.push({ label: "Home sizes", value: area });

  if (facts?.golfCourses) {
    rows.push({
      label: "Golf",
      value: `${facts.golfCourses} course${facts.golfCourses === 1 ? "" : "s"}`,
      note: facts.golfCoursesNames || undefined,
    });
  }
  if (facts?.securityType) {
    rows.push({ label: "Security", value: facts.securityType.replace(/-/g, " ") });
  }
  if (facts?.shortTermRentalsAllowed && facts.shortTermRentalsAllowed !== "unknown") {
    const map: Record<string, string> = {
      "yes-unrestricted": "Permitted",
      "yes-limited": "Permitted with limits",
      "no-hoa": "Not permitted (HOA)",
      "no-city": "Not permitted (city ordinance)",
    };
    rows.push({
      label: "Short-term rentals",
      value: map[facts.shortTermRentalsAllowed] || facts.shortTermRentalsAllowed,
      note: facts.minimumLeaseLength || undefined,
    });
  }

  if (!rows.length) return null;

  return (
    <section
      aria-labelledby="community-facts-heading"
      className="rounded-2xl border border-neutral-200 bg-white/60 p-6 md:p-8 dark:border-neutral-800 dark:bg-neutral-900/40"
    >
      <h2
        id="community-facts-heading"
        className="text-2xl font-bold text-neutral-900 md:text-3xl dark:text-neutral-50"
      >
        {subdivisionName} at a Glance
      </h2>
      <dl className="mt-5 grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.label} className="border-b border-neutral-200 pb-3 dark:border-neutral-800">
            <dt className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              {row.label}
            </dt>
            <dd className="mt-1 text-base font-semibold text-neutral-900 dark:text-neutral-50">
              {row.value}
            </dd>
            {row.note ? (
              <dd className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{row.note}</dd>
            ) : null}
          </div>
        ))}
      </dl>
      <p className="mt-5 text-xs text-neutral-400 dark:text-neutral-500">
        HOA dues, assessments and community rules change. Verify with the
        association before relying on any figure here.
      </p>
    </section>
  );
}
