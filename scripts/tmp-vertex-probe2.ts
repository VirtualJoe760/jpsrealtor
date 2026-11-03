// Scratch: follow-up to tmp-vertex-probe.ts — is the Vertex 404 a model-name
// problem, a disabled API, or no billing? Tries several model ids and reads the
// Service Usage API for aiplatform. Safe to delete.
import dotenv from "dotenv";
dotenv.config({ path: "F:/web-clients/joseph-sardella/jpsrealtor/.env.local" });
import { GoogleAuth } from "google-auth-library";

(async () => {
  const project = process.env.GOOGLE_CLOUD_PROJECT;
  const auth = new GoogleAuth({ scopes: ["https://www.googleapis.com/auth/cloud-platform"] });
  const client = await auth.getClient();
  const token = (await client.getAccessToken()).token;

  for (const svc of ["aiplatform.googleapis.com", "generativelanguage.googleapis.com"]) {
    const r = await fetch(
      `https://serviceusage.googleapis.com/v1/projects/${project}/services/${svc}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const j: any = await r.json();
    console.log(`${svc}: http ${r.status} state=${j?.state || JSON.stringify(j?.error?.message || j).slice(0, 180)}`);
  }

  const r2 = await fetch(
    `https://cloudbilling.googleapis.com/v1/projects/${project}/billingInfo`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const b: any = await r2.json();
  console.log(`billing: http ${r2.status} enabled=${b?.billingEnabled} acct=${b?.billingAccountName ? "set" : String(b?.error?.message || "").slice(0, 160)}`);

  for (const m of ["gemini-2.0-flash", "gemini-flash-latest", "gemini-2.5-flash-lite"]) {
    const r3 = await fetch(
      `https://us-central1-aiplatform.googleapis.com/v1/projects/${project}/locations/us-central1/publishers/google/models/${m}:generateContent`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: "say ok" }] }] }),
      }
    );
    const j: any = await r3.json();
    console.log(`${m}: http ${r3.status} ${r3.ok ? "OK" : String(j?.error?.message || "").slice(0, 200)}`);
  }
})().catch((e) => console.error("FAILED:", e?.message || e));
