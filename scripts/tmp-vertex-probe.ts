// Scratch: can the SAME Gemini model be reached through Vertex AI on the GCP
// service account, instead of AI Studio on GEMINI_API_KEY? AI Studio has been
// 403ing "outstanding balance" since 2026-10-24 and Vertex bills to the GCP
// project, which is a different account. Read-only probe, no pipeline change.
// Safe to delete.
import dotenv from "dotenv";
dotenv.config({ path: "F:/web-clients/joseph-sardella/jpsrealtor/.env.local" });
import fs from "fs";
import os from "os";
import path from "path";
import { GoogleGenAI } from "@google/genai";

(async () => {
  const project = process.env.GOOGLE_CLOUD_PROJECT;
  console.log("project:", project, "| creds path:", process.env.GOOGLE_APPLICATION_CREDENTIALS);

  // The path form may not exist on this machine; fall back to the b64 copy.
  const p = process.env.GOOGLE_APPLICATION_CREDENTIALS || "";
  if (!p || !fs.existsSync(p)) {
    const b64 = process.env.GOOGLE_SERVICE_ACCOUNT_B64;
    if (!b64) throw new Error("no service account available");
    const tmp = path.join(os.tmpdir(), "sa-probe.json");
    fs.writeFileSync(tmp, Buffer.from(b64, "base64").toString("utf8"));
    process.env.GOOGLE_APPLICATION_CREDENTIALS = tmp;
    const sa = JSON.parse(fs.readFileSync(tmp, "utf8"));
    console.log("using b64 service account:", sa.client_email, "project:", sa.project_id);
  }

  const url = process.argv[2];
  const r = await fetch(url);
  const buf = await r.arrayBuffer();
  console.log("photo fetch:", r.status);

  for (const location of ["us-central1", "global"]) {
    try {
      const ai = new GoogleGenAI({ vertexai: true, project, location });
      const res: any = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [
          { inlineData: { data: Buffer.from(buf).toString("base64"), mimeType: "image/jpeg" } },
          { text: "Name the room in this photo in one word." },
        ] }],
      });
      console.log(`OK (${location}):`, res?.candidates?.[0]?.content?.parts?.find((x: any) => x?.text)?.text);
      return;
    } catch (e: any) {
      console.log(`FAILED (${location}):`, e?.status || "", String(e?.message || e).slice(0, 400));
    }
  }
})().catch((e) => console.error("FAILED:", e?.status || "", e?.message || e));
