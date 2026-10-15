// src/lib/skill-api/listing-party-filter.ts
//
// Who listed it — the optional search filters by listing party:
//   mine=true                 the token owner's own listings
//   agentIds=GPS:d22668,...   listed by these agents (`agents._id`)
//   brokerages=compass,...    listed by any office of these brands (`brokerages._id`)
//   listAgentMlsIds=a,b       raw agent ids, any MLS (listed or co-listed by)
//   listOfficeMlsIds=x,y      raw office ids
// None of them set → no clause, so a search without them is unchanged.
//
// The agents and brokerages collections are built on the VPS (chatrealty-backend
// docs/tools/agents.md). An agent id is only unique within one MLS, so an agent
// is matched as {mlsSource, listAgentMlsId ∈ agentMlsIdVariants} — the shape of
// the `agentlookup_listAgent` index. Listing-agent only: a co-list branch in the
// same $or has no index and would turn every lookup back into a scan.
//
// `mine` finds the owner's registrations by the licence on their profile (one
// person can hold several MLS registrations), then any mlsDataSources id, then
// the MLS roster as a last resort.

import mongoose from "mongoose";
import dbConnect from "@/lib/mongoose";
import { agentByLicense } from "@/lib/spark-roster";

const CACHE_MS = 60 * 60 * 1000;
const mineCache = new Map<string, { regs: Registration[]; at: number }>();

interface Registration {
  mlsSource: string | null;
  variants: string[];
}

function list(v: string | null): string[] {
  return (v || "").split(",").map((s) => s.trim()).filter(Boolean);
}

// The feed stores agent ids in mixed case ("d83203" beside "D78367"); an exact
// $in over the variants keeps the match indexable where a regex would not be.
function variants(ids: string[]): string[] {
  return [...new Set(ids.flatMap((id) => [id, id.toLowerCase(), id.toUpperCase()]))];
}

async function db() {
  await dbConnect();
  const conn = mongoose.connection.db;
  if (!conn) throw new Error("database not connected");
  return conn;
}

async function registrationsById(ids: string[]): Promise<Registration[]> {
  if (ids.length === 0) return [];
  const docs = await (await db())
    .collection("agents")
    .find({ _id: { $in: ids as any[] } }, { projection: { mlsSource: 1, agentMlsIdVariants: 1, agentMlsId: 1 } })
    .toArray();
  return docs.map((d: any) => ({
    mlsSource: d.mlsSource || null,
    variants: d.agentMlsIdVariants?.length ? d.agentMlsIdVariants : variants([d.agentMlsId].filter(Boolean)),
  }));
}

async function ownRegistrations(user: any): Promise<Registration[]> {
  const license: string = (user?.licenseNumber || "").trim();
  const key = license || String(user?._id || "");
  const hit = mineCache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.regs;

  const regs: Registration[] = [];
  if (license) {
    const docs = await (await db())
      .collection("agents")
      .find({ "identity.licenseNumber": license }, { projection: { _id: 1 } })
      .toArray();
    regs.push(...(await registrationsById(docs.map((d: any) => String(d._id)))));
  }
  const profileIds: string[] = (user?.agentProfile?.mlsDataSources || [])
    .map((s: any) => s?.mlsId)
    .filter((x: unknown): x is string => typeof x === "string" && x.trim() !== "");
  if (profileIds.length) regs.push({ mlsSource: null, variants: variants(profileIds) });

  if (regs.length === 0 && license) {
    try {
      const agent = await agentByLicense(license);
      if (agent?.shortId) regs.push({ mlsSource: null, variants: variants([agent.shortId]) });
    } catch {
      // Roster down or no Spark token: nothing else to try.
    }
  }
  mineCache.set(key, { regs, at: Date.now() });
  return regs;
}

function agentClause(regs: Registration[]): Record<string, any> {
  return {
    $or: regs.map((r) =>
      r.mlsSource
        ? { mlsSource: r.mlsSource, listAgentMlsId: { $in: r.variants } }
        : { listAgentMlsId: { $in: r.variants } }
    ),
  };
}

export type PartyFilterResult =
  | { ok: true; clauses: Record<string, any>[] }
  | { ok: false; error: string; message: string };

export async function listingPartyClauses(sp: URLSearchParams, user: any): Promise<PartyFilterResult> {
  const clauses: Record<string, any>[] = [];
  const mine = /^(true|1|yes)$/i.test(sp.get("mine")?.trim() || "");
  const agentIds = list(sp.get("agentIds"));
  const brokerages = list(sp.get("brokerages"));
  const rawAgents = list(sp.get("listAgentMlsIds"));
  const rawOffices = list(sp.get("listOfficeMlsIds"));

  if (mine) {
    const regs = await ownRegistrations(user);
    if (regs.length === 0) {
      return {
        ok: false,
        error: "no_agent_id",
        message: "mine=true needs a licence number or MLS id on the agent profile to find their listings.",
      };
    }
    clauses.push(agentClause(regs));
  }
  if (agentIds.length > 0) {
    const regs = await registrationsById(agentIds);
    if (regs.length === 0) {
      return { ok: false, error: "unknown_agents", message: "None of agentIds is in the agent database." };
    }
    clauses.push(agentClause(regs));
  }
  if (brokerages.length > 0) {
    const docs = await (await db())
      .collection("brokerages")
      .find({ _id: { $in: brokerages as any[] } }, { projection: { "offices.mlsId": 1 } })
      .toArray();
    const offices = docs.flatMap((d: any) => (d.offices || []).map((o: any) => o?.mlsId).filter(Boolean));
    if (offices.length === 0) {
      return { ok: false, error: "unknown_brokerages", message: "None of brokerages is in the brokerage database." };
    }
    clauses.push({ listOfficeMlsId: { $in: variants(offices) } });
  }
  if (rawAgents.length > 0) {
    const ids = variants(rawAgents);
    clauses.push({ $or: [{ listAgentMlsId: { $in: ids } }, { coListAgentMlsId: { $in: ids } }] });
  }
  if (rawOffices.length > 0) {
    clauses.push({ listOfficeMlsId: { $in: variants(rawOffices) } });
  }
  return { ok: true, clauses };
}
