/**
 * Spark agent roster (the `accounts` resource).
 *
 * WHY THIS EXISTS SEPARATELY FROM THE LISTING FEED
 * -----------------------------------------------
 * Listing records barely carry agent contact data. Measured across 85,701
 * active listings: `listAgentEmail` is populated on 1.1%, and
 * `coListAgentEmail` on 0% — never once. So "get the agent's details off the
 * listing" does not work, and anything built on it would silently produce
 * empty accounts.
 *
 * The roster endpoint does have it: real email, licence number, office,
 * company, biography, photos. It lives at replication.sparkapi.com (the plain
 * sparkapi.com host rejects our key), and `_filter` is mandatory — with
 * `UserType` a required filter field, which is not obvious from the error you
 * get without it.
 *
 * TEAMS. A listing's co-list slot often holds a TEAM rather than a person
 * (`LocalType: "Teams/Partners"`), which is how 53806 Ridge Road credits "The
 * Obsidian Group" instead of a second agent. Spark's account object has no
 * team-membership field, so members are resolved from our own listing data via
 * `listAgentTeamKey`. Note what that actually means: it returns the agents who
 * LIST under the team, which is not the same as everyone on it — the second
 * agent on Ridge Road does not appear. Treat the result as a picklist for a
 * human, never as an automatic credit.
 */
import type { Db } from "mongodb";

const HOST = "https://replication.sparkapi.com/v1";

export interface RosterAgent {
  sparkId: string;
  mlsId: string;
  name: string;
  firstName: string;
  lastName: string;
  marketingName: string;
  email: string | null;
  phone: string | null;
  licenseNumber: string | null;
  officeName: string | null;
  officeId: string | null;
  companyName: string | null;
  bio: string | null;
  photoUrl: string | null;
  isTeam: boolean;
}

function pick<T>(arr: T[] | undefined, pred: (x: any) => boolean): any {
  if (!Array.isArray(arr)) return null;
  return arr.find(pred) || arr[0] || null;
}

function shape(a: any): RosterAgent {
  const email = pick(a.Emails, (e) => e?.Primary);
  const phone = pick(a.Phones, (p) => p?.Primary);
  const img = pick(a.Images, (i) => /headshot|profile/i.test(i?.Type || ""));
  return {
    sparkId: a.Id,
    mlsId: a.MlsId,
    name: a.Name || [a.FirstName, a.LastName].filter(Boolean).join(" "),
    firstName: a.FirstName || "",
    lastName: a.LastName || "",
    marketingName: a.MarketingName || a.Name || "",
    email: email?.Address || null,
    phone: phone?.Number || null,
    licenseNumber: a.LicenseNumber || null,
    officeName: a.Office || null,
    officeId: a.OfficeId || null,
    companyName: a.Company || null,
    bio: a.Biography || null,
    photoUrl: img?.Uri || img?.UriLarge || null,
    isTeam: /team/i.test(a.LocalType || ""),
  };
}

async function query(filter: string, limit = 25): Promise<RosterAgent[]> {
  const token = process.env.SPARK_ACCESS_TOKEN;
  if (!token) throw new Error("SPARK_ACCESS_TOKEN not set");
  const url = `${HOST}/accounts?_filter=${encodeURIComponent(filter)}&_limit=${limit}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const body: any = await res.json().catch(() => ({}));
  const d = body?.D || {};
  if (d.Success === false) {
    throw new Error(`spark roster: ${JSON.stringify(d.Message || d.Code)}`);
  }
  return (d.Results || []).map(shape);
}

/** Look an agent up by their Spark account id (a listing's listAgentId). */
export async function agentById(sparkId: string): Promise<RosterAgent | null> {
  if (!sparkId) return null;
  const r = await query(`UserType Eq 'Member' And Id Eq '${sparkId.replace(/'/g, "")}'`, 1);
  return r[0] || null;
}

/** Fall back to name when a listing carries no usable id. */
export async function agentByName(first: string, last: string): Promise<RosterAgent | null> {
  if (!first || !last) return null;
  const esc = (s: string) => s.replace(/'/g, "");
  const r = await query(
    `UserType Eq 'Member' And FirstName Eq '${esc(first)}' And LastName Eq '${esc(last)}'`,
    5
  );
  return r[0] || null;
}

/**
 * Agents who LIST under a team, most active first.
 *
 * Sourced from our own listing data, because Spark accounts carry no team
 * membership. This is a candidate list for a human to choose from — it is
 * demonstrably not the full team roster.
 */
export async function teamMembers(
  db: Db,
  teamSparkId: string,
  limit = 12
): Promise<Array<{ sparkId: string; name: string; listings: number }>> {
  if (!teamSparkId) return [];
  const rows = await db
    .collection("unifiedlistings")
    .aggregate([
      { $match: { $or: [{ listAgentTeamKey: teamSparkId }, { coListAgentId: teamSparkId }] } },
      { $group: { _id: { id: "$listAgentId", n: "$listAgentName" }, c: { $sum: 1 } } },
      { $sort: { c: -1 } },
      { $limit: limit },
    ])
    .toArray();
  return rows
    .filter((r: any) => r._id?.id && r._id?.n)
    .map((r: any) => ({ sparkId: r._id.id, name: r._id.n, listings: r.c }));
}

export interface ListingCredits {
  /** Primary listing agent — always present when the feed has one. */
  primary: { sparkId: string; name: string } | null;
  /** Second credit. Null when the listing has no co-list agent. */
  secondary: { sparkId: string; name: string } | null;
  /** True when `secondary` is a TEAM entity rather than a person. */
  secondaryIsTeam: boolean;
  /** Candidates when the co-list is a team, for a human to pick from. */
  teamCandidates: Array<{ sparkId: string; name: string; listings: number }>;
}

/**
 * Who should this post credit?
 *
 * Returns what the MLS actually says, plus — when the second credit is a team —
 * the candidate members. It deliberately does NOT pick one: the MLS never said
 * which member co-listed, and guessing would put a name on a client's marketing
 * on the strength of an inference.
 */
export async function listingCredits(db: Db, listing: any): Promise<ListingCredits> {
  const primary = listing?.listAgentName
    ? { sparkId: listing.listAgentId || "", name: listing.listAgentName }
    : null;

  const coName = listing?.coListAgentName || "";
  if (!coName) {
    return { primary, secondary: null, secondaryIsTeam: false, teamCandidates: [] };
  }

  const isTeam = /team/i.test(listing?.coListAgentMemberType || "");
  const secondary = { sparkId: listing.coListAgentId || "", name: coName };
  const teamCandidates = isTeam ? await teamMembers(db, listing.coListAgentId) : [];
  return { primary, secondary, secondaryIsTeam: isTeam, teamCandidates };
}
