// Scratch: call Gemini on ONE listing photo with the error surfaced. The
// selector's assessOne swallows every failure as `null`, which is
// indistinguishable from "not stageable" — this says which it was. Safe to delete.
import dotenv from "dotenv";
dotenv.config({ path: "F:/web-clients/joseph-sardella/jpsrealtor/.env.local" });
import { GoogleGenAI } from "@google/genai";
(async () => {
  const url = process.argv[2];
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });
  console.log("key present:", !!process.env.GEMINI_API_KEY, "len", (process.env.GEMINI_API_KEY || "").length);
  const r = await fetch(url);
  console.log("photo fetch:", r.status, r.headers.get("content-type"));
  const buf = await r.arrayBuffer();
  const res: any = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{ role: "user", parts: [
      { inlineData: { data: Buffer.from(buf).toString("base64"), mimeType: "image/jpeg" } },
      { text: "Name the room in this photo in one word." },
    ] }],
  });
  console.log("OK:", res?.candidates?.[0]?.content?.parts?.find((p: any) => p?.text)?.text);
})().catch((e) => { console.error("FAILED:", e?.status || "", e?.message || e); });
