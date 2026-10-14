// src/lib/skill-api/listing-party-filter.ts
//
// Who listed it — the optional search filters by listing party:
//   mine=true                 the token owner's own listings
//   listAgentMlsIds=a,b       listed or co-listed by these agents
//   listOfficeMlsIds=x,y      listed by these offices
// None of them set → no clause, so a search without them is unchanged.
//
// Listings carry no licence number, only listAgentMlsId, and the user record
// usually holds a licence and no MLS id. `mine` bridges the two through the
// MLS roster (agentByLicense), with any mlsDataSources id on the profile as well.

import { agentByLicense } from "@/lib/spark-roster";

const CACHE_MS = 24 * 60 * 60 * 1000;
const mineCache = new Map<string, { ids: string[]; at: number }>();

function list(v: string | null): string[] {
  return (v || "").split(",").map((s) => s.trim()).filter(Boolean);
}

// The feed stores agent ids in mixed case ("d83203" beside "D78367"); an exact
// $in over the variants keeps the match indexable where a regex would not be.
function variants(ids: string[]): string[] {
  return [...new Set(ids.flatMap((id) => [id, id.toLowerCase(), id.toUpperCase()]))];
}

async function ownAgentIds(user: any): Promise<string[]> {
  const fromProfile: string[] = (user?.agentProfile?.mlsDataSources || [])
    .map((s: any) => s?.mlsId)
    .filter((x: unknown): x is string => typeof x === "string" && x.trim() !== "");
  const license: string = user?.licenseNumber || "";
  if (!license) return fromProfile;

  const hit = mineCache.get(license);
  if (hit && Date.now() - hit.at < CACHE_MS) return [...new Set([...fromProfile, ...hit.ids])];
  let ids: string[] = [];
  try {
    const agent = await agentByLicense(license);
    ids = agent?.shortId ? [agent.shortId] : [];
    mineCache.set(license, { ids, at: Date.now() });
  } catch {
    // Roster down or no Spark token: the profile's ids are all there is.
  }
  return [...new Set([...fromProfile, ...ids])];
}

export type PartyFilterResult =
  | { ok: true; clauses: Record<string, any>[] }
  | { ok: false; error: string; message: string };

export async function listingPartyClauses(sp: URLSearchParams, user: any): Promise<PartyFilterResult> {
  const clauses: Record<string, any>[] = [];
  const mine = /^(true|1|yes)$/i.test(sp.get("mine")?.trim() || "");
  const agents = list(sp.get("listAgentMlsIds"));
  const offices = list(sp.get("listOfficeMlsIds"));

  if (mine) {
    const own = await ownAgentIds(user);
    if (own.length === 0) {
      return {
        ok: false,
        error: "no_agent_id",
        message: "mine=true needs a licence number or MLS id on the agent profile to find their listings.",
      };
    }
    const ids = variants(own);
    clauses.push({ $or: [{ listAgentMlsId: { $in: ids } }, { coListAgentMlsId: { $in: ids } }] });
  }
  if (agents.length > 0) {
    const ids = variants(agents);
    clauses.push({ $or: [{ listAgentMlsId: { $in: ids } }, { coListAgentMlsId: { $in: ids } }] });
  }
  if (offices.length > 0) {
    clauses.push({ listOfficeMlsId: { $in: variants(offices) } });
  }
  return { ok: true, clauses };
}
