require("dotenv").config({ path: "F:/web-clients/joseph-sardella/jpsrealtor/.env.local" });
const { MongoClient } = require("mongodb");

// A leading directional is part of the street NAME in one feed and part of the
// number segment in another, so "N Chuperosa Road" must compare as "chuperosa".
// The previous version replaced a bare "n" with "" and then compared against the
// empty string, which matched nothing, fell through to the unfiltered list, and
// offered every 3010 in Palm Springs as a candidate relist for 3010 N Chuperosa.
// Comparing only the FIRST token is also wrong, because in a Spanish-convention
// name the first token is the street TYPE: "Avenida Caballeros" and "Avenida
// Granada" both reduce to "avenida" and read as the same street. Compare the
// whole name instead, minus a trailing type suffix so "Chuperosa Road" still
// equals "Chuperosa" and "Hepburn Drive" still equals "Hepburn Dr".
const DIRECTIONAL = /^(n|s|e|w|ne|nw|se|sw|north|south|east|west)\.?$/i;
const SUFFIX = /^(road|rd|drive|dr|street|st|lane|ln|avenue|ave|trail|trl|way|court|ct|place|pl|circle|cir|boulevard|blvd|terrace|ter|path|run|loop)\.?$/i;
function streetToken(name) {
  const parts = String(name || "").trim().toLowerCase().split(/\s+/).filter(Boolean);
  while (parts.length > 1 && DIRECTIONAL.test(parts[0])) parts.shift();
  while (parts.length > 1 && SUFFIX.test(parts[parts.length - 1])) parts.pop();
  return parts.join(" ");
}

// "255 S Avenida Caballeros, 313, Palm Springs, CA 92262" -> "313".
// Without this a condo relist check compares two different doors in one complex
// and reads as a match: U5 (#313, $354,900, Alan E Mckeefry) was offered #305
// ($320,000, a non-team agent) as its relist.
function unitOf(unparsed) {
  const seg = String(unparsed || "").split(",").map(s => s.trim());
  return seg.length >= 3 && /^[A-Za-z]?\d+[A-Za-z]?$/.test(seg[1]) ? seg[1] : "";
}

(async () => {
  const c = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 120000, socketTimeoutMS: 900000 });
  await c.connect(); const db = c.db();
  const posts = await db.collection("pendingposts").find({ status: "awaiting_review" }).project({approvalCode:1,listingKey:1,"listingSnapshot.address":1,"listingSnapshot.city":1,"listingSnapshot.price":1,"listingSnapshot.sqft":1,"listingSnapshot.listAgentName":1,slides:1,createdAt:1}).toArray();
  const active = new Set(await db.collection("unifiedlistings").distinct("listingKey", { standardStatus: "Active" }));
  const stale = posts.filter(p => !active.has(p.listingKey));
  console.log("stale awaiting_review:", stale.length, "\n");
  for (const p of stale) {
    const s = p.listingSnapshot || {};
    const num = String(s.address||"").trim().split(/\s+/)[0];
    const rest = String(s.address||"").trim().split(/\s+/).slice(1).join(" ");
    console.log("=====", p.approvalCode, "|", s.address, ",", s.city, "|", s.price, "|", s.sqft, "sqft |", s.listAgentName, "| slides", (p.slides||[]).length, "| built", String(p.createdAt).slice(0,10));
    const rel = await db.collection("unifiedlistings").find({ streetNumber: num, city: s.city })
      .project({listingKey:1,streetNumber:1,streetName:1,unparsedAddress:1,city:1,standardStatus:1,listPrice:1,onMarketDate:1,livingArea:1,listAgentName:1,coListAgentName:1,photos:{$size:{$ifNull:["$media",[]]}}}).toArray();
    const want = streetToken(rest);
    const hits = rel.filter(r => streetToken(r.streetName) === want);
    if (!hits.length) {
      console.log("   NO active/any row for", num, rest, s.city,
        rel.length ? `(${rel.length} other listing(s) at this street number, different street)` : "");
    }
    // Same street. Price, sqft and the listing agents are what separate a relist
    // of THIS house from the unit next door -- print them and judge on all three.
    for (const r of hits) {
      const u = unitOf(r.unparsedAddress);
      console.log("   ->", r.listingKey, r.standardStatus, "$"+r.listPrice,
        [r.streetNumber, r.streetName].join(" ") + (u ? " #" + u : ""), r.city,
        "ph"+r.photos, r.livingArea+"sf", String(r.onMarketDate).slice(0,10),
        "|", r.listAgentName, "/", r.coListAgentName);
      const sameSqft = String(r.livingArea||"") === String(s.sqft||"");
      const samePrice = "$" + Number(r.listPrice||0).toLocaleString() === String(s.price||"");
      console.log("      sqft", sameSqft ? "MATCH" : "DIFFERS", "| price", samePrice ? "MATCH" : "MOVED " + s.price + " -> $" + Number(r.listPrice||0).toLocaleString());
    }
    const closed = await db.collection("unified_closed_listings").countDocuments({ listingKey: p.listingKey });
    console.log("   original key in closed collection:", closed);
  }
  await c.close();
})().catch(e=>{console.error("ERR",e.message);process.exit(1);});
