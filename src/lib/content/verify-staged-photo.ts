/**
 * Post-generation QC: did anything change except the person being added?
 *
 * WHY THIS IS MANDATORY, NOT OPTIONAL
 * -----------------------------------
 * Gemini's image-to-image path REGENERATES THE WHOLE FRAME. It does not paste a
 * person into an unchanged photo. Measured on 53806 Ridge Road, 2026-07-26,
 * against a prompt that explicitly said "keep every architectural detail,
 * finish and fixture exactly as shown":
 *
 *   great room — terracotta saltillo tile became HARDWOOD; rug replaced; a sofa
 *                disappeared; the staircase changed
 *   kitchen    — the hanging pot rack vanished; the island was reshaped; stools
 *                appeared that were not there
 *   game room  — the rug pattern was replaced entirely; the sofa changed shape;
 *                the bar area disappeared
 *
 * Every one of those passed a human glance, because the eye goes to the person
 * and the room reads as "a nice room". You have to compare against the source
 * deliberately to see it.
 *
 * This matters beyond aesthetics: these are MLS listing photos used in
 * advertising. Materially altering a property's finishes — changing its floors
 * — misrepresents the home. It is a compliance problem, and it is another
 * agent's listing.
 *
 * UPDATE 2026-07-27: instructing the model better DOES largely fix it. The old
 * prompt was causing the damage — it asked for "portrait orientation" from a
 * landscape source (forcing a reframe, therefore invention), asked for a "warm
 * grade and contrast lift" (an explicit instruction to change every pixel), and
 * opened with "re-render ... generate afresh". Rewritten as an EDIT with
 * preservation stated first and an explicit out, the same rooms now come back
 * intact. This check stays regardless: prompts are not guarantees, and the cost
 * of one altered photo of someone else's listing is far higher than a check.
 */
import { GoogleGenAI } from "@google/genai";

export interface StagingVerdict {
  /** Safe to publish: the person was added and nothing else moved. */
  pass: boolean;
  /** Specific differences found, source → generated. */
  changes: string[];
  /** Model's confidence that the room is unaltered, 0-1. */
  confidence: number;
  /** Set when the check itself failed — treated as a FAIL, never a pass. */
  error?: string;
  /** Posture/expression of the added figure, so a batch can enforce variety. */
  posture?: string | null;
  expression?: string | null;
  /** Non-blocking observations — worth a glance, never a rejection. */
  notes?: string[];
  /** Both descriptions, for showing the agent WHY something was rejected. */
  details?: { original: any; staged: any };
}

/**
 * ASK IT TO DESCRIBE, NOT TO DIFF.
 *
 * The first version showed both images together and asked "what changed?". It
 * PASSED the frame where terracotta saltillo tile had become hardwood, and
 * rejected a different one over a missing coffee mug.
 *
 * The reason is structural: the source is a 2048x1600 landscape and the staged
 * output is a 1080x1350 portrait crop. Asked to compare, the model sees two
 * different framings, cannot align them, and falls back to a vague impression —
 * which is exactly where a floor swap hides.
 *
 * Describing each image independently against a fixed schema removes the
 * alignment problem entirely. Comparing the descriptions is then plain string
 * work, and a floor that reads "terracotta tile" in one and "hardwood" in the
 * other is unmissable.
 */
const DESCRIBE_PROMPT = `Describe this room photograph factually.

Describe the ROOM as if no person were present — if someone is standing in front of a sofa, the sofa is still there. Do not let a person's presence change how you describe the furniture, flooring or fixtures. Separately, report that person's posture and expression in the person_ fields.

Reply ONLY with JSON, no markdown fence:
{
  "flooring_material": "<tile|hardwood|carpet|concrete|laminate|stone|other|unknown>",
  "flooring_color": "<short>",
  "rug_present": <bool>,
  "rug_description": "<short, or empty>",
  "wall_color": "<short>",
  "ceiling": "<short: material/colour/beams/fan>",
  "major_furniture": ["<piece + colour>", ...],
  "fixtures": ["<light fittings, pot racks, fans, built-ins>", ...],
  "notable_features": ["<fireplace, island, staircase, neon sign, etc>", ...],
  "has_blank_band": <bool>,
  "person_posture": "<standing|seated|leaning|walking|none>",
  "person_expression": "<smiling|neutral|laughing|none>",
  "person_defects": ["<duplicated limb, malformed hand, second partial person, invented text, body fused with or clipping through furniture, anatomically impossible sitting position, legs merging into a chair>", ...]
}

"has_blank_band": true if ANY edge of the image has a strip of flat white or grey where the picture simply stops — a generation artifact, not part of the room. Check the bottom edge especially.

Be concrete and literal. Name materials, not moods.`;

/** Fields where a mismatch means the property itself was misrepresented. */
const CRITICAL_FIELDS: Array<{ key: string; label: string }> = [
  { key: "flooring_material", label: "flooring material" },
  { key: "rug_present", label: "rug present" },
];

async function toPart(url: string) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`fetch failed ${r.status}`);
  const buf = await r.arrayBuffer();
  const ct = r.headers.get("content-type") || "";
  return {
    inlineData: {
      data: Buffer.from(buf).toString("base64"),
      mimeType: ct.startsWith("image/") ? ct : "image/jpeg",
    },
  };
}

/**
 * Compare a staged image against its source.
 *
 * Fails CLOSED: any error checking is a fail, because the alternative is
 * publishing an altered photo of someone else's listing because a fetch
 * timed out.
 */
export async function describeImage(url: string): Promise<any> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });
  const part = await toPart(url);
  const res: any = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{ role: "user", parts: [part, { text: DESCRIBE_PROMPT }] }],
  });
  const text: string =
    res?.candidates?.[0]?.content?.parts?.find((p: any) => p?.text)?.text || "";
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("unparseable description");
  return JSON.parse(m[0]);
}

export async function verifyStagedPhoto(opts: {
  originalUrl: string;
  stagedUrl: string;
  /**
   * Pre-computed description of the ORIGINAL, from describeImage().
   *
   * Pass this when retrying the same source photo. The describer is not
   * deterministic — the same untouched frame came back "[tile, hardwood]" on
   * one call and "[tile, hardwood, terracotta]" on the next — so re-describing
   * the original each take means comparing against a baseline that moves,
   * which rejects good images for differences that exist only between two
   * descriptions of the same unchanged photo. It also halves the cost.
   */
  originalDescription?: any;
}): Promise<StagingVerdict> {
  if (!process.env.GEMINI_API_KEY) {
    return { pass: false, changes: [], confidence: 0, error: "GEMINI_API_KEY not set" };
  }
  try {

    // Describe independently — neither call sees the other image, so neither
    // can be talked into agreeing with it.
    const [orig, staged] = await Promise.all([
      opts.originalDescription ?? describeImage(opts.originalUrl),
      describeImage(opts.stagedUrl),
    ]);

    const changes: string[] = [];

    // Generation artifacts. Outright rejects — no judgement needed, and cheap to
    // check. A white strip along the bottom edge shipped in a reviewed post
    // because it is easy to miss on a small thumbnail.
    if (staged?.has_blank_band === true) {
      changes.push("BLANK BAND at an edge — generation artifact");
    }
    const defects: string[] = Array.isArray(staged?.person_defects) ? staged.person_defects : [];
    if (defects.length) {
      changes.push(`figure defects: ${defects.slice(0, 3).join("; ")}`);
    }

    // Flooring is compared as a SET of materials, not a string. The model
    // answers "hardwood and tile" one run and "hardwood" the next for the same
    // photo, so string equality is flaky in both directions. Set difference
    // survives the rephrasing and still catches terracotta tile becoming wood.
    const MATERIALS = ["tile", "hardwood", "wood", "carpet", "concrete", "laminate", "stone", "terracotta", "saltillo"];
    const materialSet = (s: any) => {
      const t = String(s ?? "").toLowerCase();
      const found = new Set(MATERIALS.filter((m) => t.includes(m)));
      // "hardwood" implies "wood"; don't report that as a difference.
      if (found.has("hardwood")) found.delete("wood");
      if (found.has("saltillo") || found.has("terracotta")) found.add("tile");
      return found;
    };
    const fo = materialSet(orig?.flooring_material + " " + orig?.flooring_color);
    const fs = materialSet(staged?.flooring_material + " " + staged?.flooring_color);
    const lostMaterials = [...fo].filter((m) => !fs.has(m));
    const gainedMaterials = [...fs].filter((m) => !fo.has(m));
    if (lostMaterials.length || gainedMaterials.length) {
      changes.push(
        `FLOORING changed: original had [${[...fo].join(", ")}], staged has [${[...fs].join(", ")}]`
      );
    }

    if (orig?.rug_present === true && staged?.rug_present === false) {
      changes.push("a rug present in the original is missing from the staged image");
    }

    // Furniture disappearing is the other substantive alteration. Match on
    // distinctive nouns rather than whole phrases, since two independent
    // descriptions word the same sofa differently.
    const NOUNS = ["sofa", "couch", "sectional", "armchair", "chair", "table", "island", "bench", "console", "bed", "desk", "stool", "fireplace", "piano"];
    const nounCount = (arr: any) => {
      const counts: Record<string, number> = {};
      for (const s of Array.isArray(arr) ? arr : []) {
        const t = String(s).toLowerCase();
        for (const n of NOUNS) if (t.includes(n)) counts[n] = (counts[n] || 0) + 1;
      }
      return counts;
    };
    const co = nounCount(orig?.major_furniture);
    const cs = nounCount(staged?.major_furniture);
    const vanished = Object.keys(co).filter((n) => (cs[n] || 0) === 0);
    if (vanished.length) {
      changes.push(`furniture missing from the staged image: ${vanished.join(", ")}`);
    }

    // Fixtures and features disappearing is the other common alteration (a pot
    // rack, a bar). Compare as sets of lowercased words rather than exact
    // strings, since phrasing varies between two independent descriptions.
    const words = (arr: any): Set<string> =>
      new Set(
        (Array.isArray(arr) ? arr : [])
          .flatMap((s: any) => String(s).toLowerCase().split(/[^a-z]+/))
          .filter((w) => w.length > 3)
      );
    // NOTE, not a gate. This fired on both images of a run where the room was
    // demonstrably preserved, listing "island, window, black" as missing —
    // they had simply fallen outside the tighter 4:5 crop. A check that
    // rejects correct output is worse than no check, because it trains you to
    // ignore rejections. Reported for a human to glance at; never fails the
    // image on its own.
    const stagedWords = words(staged?.notable_features);
    const lostFeatures = [...words(orig?.notable_features)].filter((w) => !stagedWords.has(w));
    const notes: string[] =
      lostFeatures.length >= 4
        ? [`outside the crop, or possibly missing: ${lostFeatures.slice(0, 5).join(", ")}`]
        : [];

    return {
      pass: changes.length === 0,
      changes,
      notes,
      confidence: changes.length === 0 ? 1 : 0,
      posture: staged?.person_posture || null,
      expression: staged?.person_expression || null,
      details: { original: orig, staged },
    };
  } catch (err: any) {
    return { pass: false, changes: [], confidence: 0, error: err?.message || String(err) };
  }
}

/**
 * Verify a batch, returning only the images that survived.
 *
 * Callers should treat a short `passed` list as normal and regenerate, not as
 * an error — with full-frame regeneration, some proportion of takes will alter
 * the room no matter what the prompt says.
 */
export async function verifyStagedBatch(
  items: Array<{ originalUrl: string; stagedUrl: string; label?: string }>
): Promise<{
  passed: typeof items;
  rejected: Array<(typeof items)[number] & { verdict: StagingVerdict }>;
}> {
  const verdicts = await Promise.all(
    items.map((it) => verifyStagedPhoto({ originalUrl: it.originalUrl, stagedUrl: it.stagedUrl }))
  );
  const passed: typeof items = [];
  const rejected: Array<(typeof items)[number] & { verdict: StagingVerdict }> = [];
  items.forEach((it, i) => {
    if (verdicts[i].pass) passed.push(it);
    else rejected.push({ ...it, verdict: verdicts[i] });
  });
  return { passed, rejected };
}
