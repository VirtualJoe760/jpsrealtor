/**
 * Pull the MLS agent roster into `mlsagents` — the invitation list.
 *
 *   npx ts-node -O '{"module":"commonjs"}' scripts/sync-mls-agents.ts [--dry]
 *
 * WHY THE ROSTER AND NOT THE LISTINGS
 * -----------------------------------
 * Listing records barely carry contact data: across 85,701 active listings
 * `listAgentEmail` is populated on 1.1% and `coListAgentEmail` on 0%. The
 * roster resource has the real thing — email, phone, licence, brokerage — and
 * it is small enough to take whole: 4,720 members, ~48 pages. Enriching
 * agent-by-agent off the listings would have meant tens of thousands of calls
 * to rebuild what one paginated sweep returns.
 *
 * SCOPE, HONESTLY. Our closed history names ~29k distinct listing agents
 * across several MLSs, but this token covers ONE association, so only its
 * 4,720 members can be enriched. For everyone else we have a name and nothing
 * to contact them with — `listingsSeen` records who we have transaction
 * history for, so an invitation list can be ordered by relevance rather than
 * blasted.
 *
 * This writes a roster. It does not email anyone.
 */
import dotenv from "dotenv";
dotenv.config({ path: "F:/web-clients/joseph-sardella/jpsrealtor/.env.local" });

import mongoose from "mongoose";

const HOST = "https://replication.sparkapi.com/v1";
const PAGE = 100;

interface Row {
  sparkId: string;
  mlsId: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string | null;
  emailsAll: string[];
  phone: string | null;
  licenseNumber: string | null;
  officeName: string | null;
  officeId: string | null;
  companyName: string | null;
  isTeam: boolean;
  active: boolean;
  photoUrl: string | null;
  bio: string | null;
}

function shape(a: any): Row {
  const emails: any[] = Array.isArray(a.Emails) ? a.Emails : [];
  const phones: any[] = Array.isArray(a.Phones) ? a.Phones : [];
  const primaryEmail = emails.find((e) => e?.Primary) || emails[0] || null;
  const primaryPhone = phones.find((p) => p?.Primary) || phones[0] || null;
  const img = (Array.isArray(a.Images) ? a.Images : []).find((i: any) =>
    /headshot|profile/i.test(i?.Type || "")
  );
  return {
    sparkId: a.Id,
    mlsId: a.MlsId,
    name: a.Name || [a.FirstName, a.LastName].filter(Boolean).join(" "),
    firstName: a.FirstName || "",
    lastName: a.LastName || "",
    email: primaryEmail?.Address || null,
    emailsAll: emails.map((e) => e?.Address).filter(Boolean),
    phone: primaryPhone?.Number || null,
    licenseNumber: a.LicenseNumber || null,
    officeName: a.Office || null,
    officeId: a.OfficeId || null,
    companyName: a.Company || null,
    isTeam: /team/i.test(a.LocalType || ""),
    active: a.Active !== false,
    photoUrl: img?.Uri || img?.UriLarge || null,
    bio: a.Biography || null,
  };
}

async function page(n: number): Promise<{ rows: Row[]; total: number }> {
  const token = process.env.SPARK_ACCESS_TOKEN;
  const url =
    `${HOST}/accounts?_filter=${encodeURIComponent("UserType Eq 'Member'")}` +
    `&_limit=${PAGE}&_page=${n}&_pagination=1`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const d: any = (await res.json())?.D || {};
  if (d.Success === false) throw new Error(JSON.stringify(d.Message));
  return { rows: (d.Results || []).map(shape), total: d.Pagination?.TotalRows ?? 0 };
}

(async () => {
  const dry = process.argv.includes("--dry");
  await mongoose.connect(process.env.MONGODB_URI as string);
  const db = mongoose.connection.db!;
  const col = db.collection("mlsagents");

  const first = await page(1);
  const total = first.total;
  const pages = Math.ceil(total / PAGE);
  console.log(`roster: ${total} members across ${pages} pages`);

  let rows: Row[] = [...first.rows];
  for (let p = 2; p <= pages; p++) {
    const r = await page(p);
    rows = rows.concat(r.rows);
    if (p % 10 === 0 || p === pages) console.log(`  page ${p}/${pages} — ${rows.length} rows`);
  }

  const withEmail = rows.filter((r) => r.email).length;
  const withPhone = rows.filter((r) => r.phone).length;
  const withLic = rows.filter((r) => r.licenseNumber).length;
  const teams = rows.filter((r) => r.isTeam).length;
  console.log(
    `\npulled ${rows.length} | email ${withEmail} (${((100 * withEmail) / rows.length).toFixed(0)}%)` +
      ` | phone ${withPhone} (${((100 * withPhone) / rows.length).toFixed(0)}%)` +
      ` | licence ${withLic} (${((100 * withLic) / rows.length).toFixed(0)}%)` +
      ` | teams ${teams}`
  );

  // How much transaction history do we hold for each? Lets an invitation list
  // lead with the agents we can actually reference a shared deal with.
  console.log("\ncounting listing history…");
  const counts = new Map<string, number>();
  for (const [coll, fields] of [
    ["unifiedlistings", ["listAgentId", "coListAgentId"]],
    ["unified_closed_listings", ["listAgentId", "coListAgentId"]],
  ] as const) {
    for (const f of fields) {
      const agg = await db
        .collection(coll)
        .aggregate([{ $match: { [f]: { $nin: [null, ""] } } }, { $group: { _id: `$${f}`, n: { $sum: 1 } } }], {
          allowDiskUse: true,
        })
        .toArray();
      for (const r of agg as any[]) counts.set(r._id, (counts.get(r._id) || 0) + r.n);
    }
  }
  const matched = rows.filter((r) => counts.has(r.sparkId)).length;
  console.log(`  ${matched} of ${rows.length} roster members appear in our listing history`);

  if (dry) {
    console.log("\n--dry: nothing written. Sample:");
    rows.filter((r) => r.email).slice(0, 3).forEach((r) =>
      console.log(`  ${r.name} | ${r.email} | ${r.phone || "-"} | lic ${r.licenseNumber || "-"} | ${r.officeName}`)
    );
    await mongoose.disconnect();
    return;
  }

  const now = new Date();
  const ops = rows.map((r) => ({
    updateOne: {
      filter: { sparkId: r.sparkId },
      update: {
        $set: { ...r, listingsSeen: counts.get(r.sparkId) || 0, syncedAt: now },
        // Invitation state lives here but is never set by this job — seeding a
        // roster and inviting people are deliberately separate steps.
        $setOnInsert: { invitedAt: null, accountId: null, firstSeenAt: now },
      },
      upsert: true,
    },
  }));
  for (let i = 0; i < ops.length; i += 500) {
    await col.bulkWrite(ops.slice(i, i + 500), { ordered: false });
  }
  await col.createIndex({ sparkId: 1 }, { unique: true });
  await col.createIndex({ email: 1 });
  await col.createIndex({ listingsSeen: -1 });
  console.log(`\nwrote ${ops.length} rows to mlsagents`);
  await mongoose.disconnect();
})();
