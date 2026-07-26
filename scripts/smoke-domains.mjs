// scripts/smoke-domains.mjs — the anonymous smoke check.
//
//   node scripts/smoke-domains.mjs
//
// WHY THIS EXISTS: on 2026-07-25 we found THREE public surfaces that had been
// silently broken for three weeks by the 2026-07-02 API gate — the required
// agency treatment (401), the OG share cards (401 → text fallback), and the
// favorites/spotlight leak. None threw an error. Each failed by rendering
// something slightly wrong to logged-out visitors only, which is exactly the
// audience nobody on the team ever is.
//
// Every check here runs with NO cookies, the way a stranger sees the site.
// Run it before any launch-adjacent deploy.

const DOMAINS = [
  { host: "jpsrealtor.com", kind: "agent", primary: true },
  { host: "josephsardella.com", kind: "agent", canonicalTo: "jpsrealtor.com" },
  { host: "www.chatrealty.io", kind: "platform" },
  { host: "bethanyklier.chatrealty.io", kind: "agent-subdomain" },
];

const REDIRECTS = [
  { from: "chatrealty.io", expect: 308 },
  { from: "www.jpsrealtor.com", expect: 308 },
  { from: "www.josephsardella.com", expect: 308 },
];

let pass = 0;
let fail = 0;
const failures = [];

function ok(host, msg) {
  pass++;
  console.log(`  \x1b[32m✓\x1b[0m ${msg}`);
}
function bad(host, msg, detail) {
  fail++;
  failures.push(`${host}: ${msg}${detail ? ` — ${detail}` : ""}`);
  console.log(`  \x1b[31m✗\x1b[0m ${msg}${detail ? `\n      ${detail}` : ""}`);
}

async function get(url, opts = {}) {
  const res = await fetch(url, { redirect: "manual", ...opts });
  // Read the body for text, JSON and XML alike — an earlier version only read
  // `text/*`, so every application/json and application/xml response looked
  // empty and produced phantom failures.
  const ct = res.headers.get("content-type") || "";
  const readable = /text|json|xml|javascript/i.test(ct);
  const body = readable ? await res.text() : "";
  return { status: res.status, headers: res.headers, body };
}

async function checkDomain(d) {
  console.log(`\n\x1b[1m${d.host}\x1b[0m (${d.kind})`);
  const base = `https://${d.host}`;

  // --- homepage ---
  let home;
  try {
    home = await get(`${base}/`);
  } catch (err) {
    bad(d.host, "homepage unreachable", err.message);
    return;
  }
  home.status === 200
    ? ok(d.host, "homepage 200")
    : bad(d.host, `homepage ${home.status}`, "expected 200");

  const title = home.body.match(/<title>([^<]*)<\/title>/)?.[1] ?? "";
  if (!title) bad(d.host, "no <title>");
  else if (/^Real Estate Agent$/.test(title))
    bad(d.host, "generic title", `"${title}" — tenant resolution fell back to defaults`);
  else if (/(.+)\s\|\s\1/.test(title))
    bad(d.host, "duplicated brand suffix in title", title);
  else ok(d.host, `title: "${title}"`);

  // --- canonical: path-preserving + correct host ---
  const canonical = home.body.match(/rel="canonical" href="([^"]*)"/)?.[1] ?? "";
  const wantHost = d.canonicalTo || d.host;
  if (!canonical) bad(d.host, "no canonical on homepage");
  else if (!canonical.includes(wantHost))
    bad(d.host, "canonical points at the wrong host", `${canonical} (want ${wantHost})`);
  else ok(d.host, `canonical → ${canonical}`);

  // --- OG card: must be the real generated image, not the text fallback ---
  const og = home.body.match(/property="og:image" content="([^"]*)"/)?.[1] ?? "";
  if (!og) bad(d.host, "no og:image");
  else {
    try {
      const img = await fetch(og, { redirect: "follow" });
      const len = Number(img.headers.get("content-length") || 0);
      if (!img.ok) bad(d.host, `og:image ${img.status}`, og);
      // The text-only fallback card is ~14-18KB; a real branded card is 200KB+.
      else if (len > 0 && len < 50_000)
        bad(d.host, "og:image looks like the text fallback", `${len} bytes — branded card missing`);
      else ok(d.host, `og:image ${len ? `${Math.round(len / 1024)}KB` : "ok"}`);
    } catch (err) {
      bad(d.host, "og:image fetch failed", err.message);
    }
  }

  // --- Meta domain verification tag ---
  home.body.includes("facebook-domain-verification")
    ? ok(d.host, "facebook-domain-verification present")
    : bad(d.host, "facebook-domain-verification missing");

  // --- the agency treatment must be readable ANONYMOUSLY (the July 2 bug) ---
  if (d.kind !== "platform") {
    try {
      const b = await get(`${base}/api/agent-branding`);
      if (b.status !== 200) bad(d.host, `/api/agent-branding ${b.status}`, "must be 200 for guests");
      else {
        const j = JSON.parse(b.body || "{}");
        const br = j.branding || {};
        br.agentName
          ? ok(d.host, `branding: ${br.agentName}${br.licenseNumber ? ` · DRE# ${br.licenseNumber}` : ""}`)
          : bad(d.host, "branding payload has no agentName");
        if (!br.licenseNumber) bad(d.host, "no licenseNumber in branding (compliance)");
      }
    } catch (err) {
      bad(d.host, "/api/agent-branding failed", err.message);
    }
  }

  // --- per-user surfaces must STAY closed to guests (the favorites leak) ---
  for (const path of ["/api/insights/favorite-spotlight", "/api/insights/community-spotlight"]) {
    try {
      const r = await get(`${base}${path}`);
      r.status === 401
        ? ok(d.host, `${path} 401 for guests`)
        : bad(d.host, `${path} returned ${r.status}`, "per-user data must be 401 anonymously");
    } catch (err) {
      bad(d.host, `${path} failed`, err.message);
    }
  }

  // --- no per-user component should appear in logged-out HTML ---
  /Favorite Spotlight|Community Spotlight/i.test(home.body)
    ? bad(d.host, "per-user spotlight rendered for a guest")
    : ok(d.host, "no per-user spotlight in guest HTML");

  // --- robots.txt / sitemap point at the canonical host ---
  try {
    const r = await get(`${base}/robots.txt`);
    const hostLine = r.body.match(/^Host:\s*(.+)$/m)?.[1]?.trim() ?? "";
    hostLine.includes(wantHost)
      ? ok(d.host, `robots Host: ${hostLine}`)
      : bad(d.host, "robots Host is wrong", `${hostLine} (want ${wantHost})`);
  } catch (err) {
    bad(d.host, "robots.txt failed", err.message);
  }

  if (d.primary) {
    try {
      const sm = await get(`${base}/sitemap.xml`);
      const locs = (sm.body.match(/<loc>/g) || []).length;
      const foreign = (sm.body.match(/<loc>https:\/\/(?!jpsrealtor\.com)/g) || []).length;
      locs > 500
        ? ok(d.host, `sitemap ${locs} URLs`)
        : bad(d.host, `sitemap only ${locs} URLs`, "expected the full agent sitemap");
      foreign === 0
        ? ok(d.host, "sitemap has no cross-host URLs")
        : bad(d.host, `${foreign} cross-host <loc> entries`, "sitemap protocol violation");
    } catch (err) {
      bad(d.host, "sitemap failed", err.message);
    }
  }
}

async function checkRedirects() {
  console.log(`\n\x1b[1mredirects\x1b[0m`);
  for (const r of REDIRECTS) {
    try {
      const res = await get(`https://${r.from}/`);
      res.status === r.expect
        ? ok(r.from, `${r.from} → ${res.status} ${res.headers.get("location") || ""}`)
        : bad(r.from, `${r.from} returned ${res.status}`, `expected ${r.expect} (permanent)`);
    } catch (err) {
      bad(r.from, "redirect check failed", err.message);
    }
  }
}

const t0 = Date.now();
console.log("Anonymous smoke check — no cookies, the way a stranger sees it.");
for (const d of DOMAINS) await checkDomain(d);
await checkRedirects();

console.log(
  `\n\x1b[1m${pass} passed, ${fail} failed\x1b[0m  (${((Date.now() - t0) / 1000).toFixed(1)}s)`
);
if (failures.length) {
  console.log("\nFailures:");
  for (const f of failures) console.log(`  • ${f}`);
}
process.exitCode = fail > 0 ? 1 : 0;
