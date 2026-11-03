// Scratch: probe the IMAGE model's quota and print the raw error body.
//
// Why this exists separately from tmp-gemini-probe.ts: that probe calls
// gemini-2.5-flash (text), which is a different quota bucket from
// gemini-2.5-flash-image (staging). On 2026-11-01 the text model answered
// fine while every staging call 429'd, so a green text probe proves only that
// billing is restored, not that a build can run.
//
// stage_geometric.py calls raise_for_status() and build-pending-post.ts
// swallows the exception as "rejected", so the body — which names the quota
// that was hit and whether it is per-minute or per-day — never reaches the
// log. This prints it verbatim. Safe to delete.
import dotenv from "dotenv";
dotenv.config({ path: "F:/web-clients/joseph-sardella/jpsrealtor/.env.local" });

(async () => {
  const key = process.env.GEMINI_API_KEY as string;
  console.log("key present:", !!key, "len", (key || "").length);

  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/" +
      "gemini-2.5-flash-image:generateContent?key=" + key,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: "A plain grey square." }] }],
        generationConfig: { imageConfig: { aspectRatio: "4:5", imageSize: "2K" } },
      }),
    }
  );

  console.log("status:", res.status, res.statusText);
  const text = await res.text();
  if (res.ok) {
    // Don't dump base64 image bytes into the log.
    try {
      const j = JSON.parse(text);
      const parts = j?.candidates?.[0]?.content?.parts || [];
      const img = parts.find((p: any) => p?.inlineData?.data || p?.inline_data?.data);
      console.log("OK: image returned,", img ? "bytes present" : "NO IMAGE PART");
    } catch {
      console.log("OK but unparseable:", text.slice(0, 400));
    }
  } else {
    console.log("BODY:", text.slice(0, 4000));
  }
})().catch((e) => console.error("FAILED:", e?.message || e));
