/**
 * Choosing WHICH listing photos the agent can be placed into.
 *
 * This is the automated form of the affordance rule in
 * docs/content-templates/actor-generation.md: *pick the pose from what is in
 * the photo, never the photo to fit a pose.* A frame can only host a person if
 * it contains somewhere a person would naturally be — a chair, a sofa, an
 * island with standing room, a lounger, genuinely open floor.
 *
 * WHY A VISION CALL AND NOT A HEURISTIC: photo ORDER carries no reliable
 * signal. MLS feeds routinely lead with drone shots — on 53806 Ridge Road the
 * first three were aerials, so "take the first N" produced a giant agent
 * floating over a hillside and another standing in a roofline. Three of four
 * images were unusable. Nothing about position, filename or count would have
 * predicted that; you have to look at the picture.
 *
 * Classification is ~$0.0001/photo on gemini-2.5-flash — trivial next to the
 * ~$0.04/photo the staging generation itself costs, and it stops us paying
 * that $0.04 on frames that were never going to work.
 */
import { GoogleGenAI } from "@google/genai";

export type RoomKind =
  | "living" | "kitchen" | "dining" | "primary_bedroom" | "bedroom"
  | "outdoor_living" | "pool" | "entry" | "office" | "game_room"
  | "bathroom" | "hallway" | "detail" | "exterior" | "aerial" | "other";

/** Placements from actor-generation.md §2. */
export type Placement =
  | "seated_chair" | "seated_sofa" | "standing_counter" | "leaning_counter"
  | "poolside" | "seated_dining" | "standing_open";

export interface PhotoAssessment {
  index: number;
  room: RoomKind;
  /** Can a person plausibly stand or sit here, in this frame? */
  stageable: boolean;
  /** Best placement for THIS frame, or null when it can't host anyone. */
  placement: Placement | null;
  /** 0-1. How good a marketing frame this is, independent of staging. */
  appeal: number;
  reason: string;
}

/**
 * Rooms the agent is never placed in, per actor-generation.md §3.
 *
 * `entry` is here for the reason in §2b: entries are circulation, not living
 * space, and contain nothing worth gesturing at. The image that proved it
 * passed every physical check — correct scale, feet on the tile, lighting
 * matched — and was still unusable, because he was presenting a closed front
 * door. Technically perfect, semantically empty.
 */
const BANNED_ROOMS: RoomKind[] = ["bathroom", "hallway", "detail", "aerial", "entry"];

/**
 * Rooms where only SOME placements are acceptable.
 *
 * Bedrooms read as intrusive unless the agent is clearly seated in a chair in a
 * sitting area — never standing over the bed, which is what the model proposed
 * on a first pass (it returned `standing_open` for a bedroom and was happy with
 * it). actor-generation.md §3 already said this; the code has to enforce it,
 * because the model will not.
 */
const ROOM_PLACEMENT_WHITELIST: Partial<Record<RoomKind, Placement[]>> = {
  bedroom: ["seated_chair"],
  primary_bedroom: ["seated_chair"],
};

/**
 * What actually sells a house, in order. Used to break appeal ties so the
 * carousel leads with the rooms buyers care about — without this, four
 * equally-rated photos let the entry hall beat the kitchen purely on array
 * order, which is how the first run picked no kitchen at all from four good
 * kitchen frames.
 */
const ROOM_PRIORITY: RoomKind[] = [
  "living", "kitchen", "pool", "outdoor_living", "primary_bedroom",
  "dining", "game_room", "office", "bedroom", "entry", "exterior", "other",
];

function roomRank(r: RoomKind): number {
  const i = ROOM_PRIORITY.indexOf(r);
  return i === -1 ? ROOM_PRIORITY.length : i;
}

const PROMPT = `You are selecting real-estate photos to composite a real-estate agent into.

Classify THIS ONE photo and reply with ONLY a JSON object, no markdown fence:

{"room":"<kind>","stageable":<bool>,"placement":<string|null>,"appeal":<0-1>,"reason":"<short>"}

room must be one of: living, kitchen, dining, primary_bedroom, bedroom, outdoor_living, pool, entry, office, game_room, bathroom, hallway, detail, exterior, aerial, other

"stageable" means a real adult could plausibly BE in this frame — standing on a visible floor, or sitting on visible furniture — at a believable size, without blocking the feature the photo is selling.

stageable MUST be false when:
- it is a drone/aerial shot or a distant exterior (no floor plane, no human-scale reference)
- it is a close-up or detail shot (fixtures, tile, hardware)
- it is a bathroom or shower, any bathroom, no exceptions
- it is a narrow hallway, a corner, or a staircase
- the only open space is a doorway facing a closed door
- a person would have to stand where they'd hide the main subject

- it is an entry, foyer or landing — circulation space, nothing in it worth showing
- the person would be gesturing at a wall, a door, or nothing at all. Name the thing they would be presenting; if you cannot, or it is not the feature this photo is selling, it is NOT stageable. A technically perfect composite of someone presenting a closed door is still a failure.

placement must be one of these when stageable, else null:
- seated_chair       (a visible armchair or accent chair with clear space)
- seated_sofa        (a sofa shot front or three-quarter)
- standing_counter   (kitchen island or counter with standing room camera-side)
- leaning_counter    (counter, bar or balcony rail at waist height)
- poolside           (pool deck with loungers or open decking)
- seated_dining      (dining table with an open or pulled-out chair)
- standing_open      (genuinely open floor with furniture behind, room to stand)

"appeal" is how good the photo is as a marketing image: light, composition, how much of the room it shows.`;

async function assessOne(
  ai: any,
  url: string,
  index: number
): Promise<PhotoAssessment | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const buf = await r.arrayBuffer();
    const mimeType = r.headers.get("content-type")?.startsWith("image/")
      ? r.headers.get("content-type")!
      : "image/jpeg";

    const res: any = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { data: Buffer.from(buf).toString("base64"), mimeType } },
            { text: PROMPT },
          ],
        },
      ],
    });

    const text: string =
      res?.candidates?.[0]?.content?.parts?.find((p: any) => p?.text)?.text || "";
    // Models add fences despite instructions; take the first object rather than
    // trusting the whole response to be clean JSON.
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return null;
    const j = JSON.parse(m[0]);

    const room: RoomKind = j.room || "other";
    const placement = (j.placement || null) as Placement | null;

    // Trust the model on what the room IS; enforce the rules ourselves. A model
    // that calls a bathroom stageable must not be able to put the agent there,
    // and one that wants him standing over a bed must not get to.
    const allowed = ROOM_PLACEMENT_WHITELIST[room];
    const placementOk = !!placement && (!allowed || allowed.includes(placement));
    const stageable = !!j.stageable && !BANNED_ROOMS.includes(room) && placementOk;

    return {
      index,
      room,
      stageable,
      placement: stageable ? placement : null,
      appeal: typeof j.appeal === "number" ? Math.max(0, Math.min(1, j.appeal)) : 0.5,
      reason: String(j.reason || "").slice(0, 200),
    };
  } catch {
    return null;
  }
}

/**
 * Assess up to `sample` photos and return the best `want` to stage.
 *
 * Selection prefers ROOM VARIETY over raw appeal: four slides of the same man
 * in four angles of the same living room reads as a template, not a
 * walkthrough. One photo per room kind first, then fill remaining slots with
 * the next-best regardless of room.
 */
export async function selectStagingPhotos(opts: {
  photoUrls: string[];
  want?: number;
  sample?: number;
}): Promise<{ selected: PhotoAssessment[]; assessed: PhotoAssessment[] }> {
  const want = opts.want ?? 4;
  const sample = Math.min(opts.sample ?? 24, opts.photoUrls.length);
  if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not set.");

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const urls = opts.photoUrls.slice(0, sample);

  const assessed = (
    await Promise.all(urls.map((u, i) => assessOne(ai, u, i)))
  ).filter(Boolean) as PhotoAssessment[];

  // Room priority first, appeal second. Appeal alone clusters at 0.9 for most
  // decent photos, so it cannot separate a kitchen from an entry hall.
  const usable = assessed
    .filter((a) => a.stageable)
    .sort((a, b) => roomRank(a.room) - roomRank(b.room) || b.appeal - a.appeal);

  const selected: PhotoAssessment[] = [];
  const seenRooms = new Set<RoomKind>();

  for (const a of usable) {
    if (selected.length >= want) break;
    if (seenRooms.has(a.room)) continue;
    seenRooms.add(a.room);
    selected.push(a);
  }
  for (const a of usable) {
    if (selected.length >= want) break;
    if (selected.includes(a)) continue;
    selected.push(a);
  }

  return { selected, assessed };
}

/** Map a placement to the staging direction sent to the image model. */
export function placementDirection(p: Placement): string {
  switch (p) {
    case "seated_chair":
      return "Seated in the armchair, relaxed and turned slightly toward the camera, one arm on the armrest.";
    case "seated_sofa":
      return "Sitting comfortably on the sofa, leaning back, at ease — as though mid-conversation with someone off-camera.";
    case "standing_counter":
      return "Standing behind the island or counter with both hands resting lightly on it, facing the camera.";
    case "leaning_counter":
      return "Leaning casually against the counter or rail, arms loosely folded, looking toward the camera.";
    case "poolside":
      return "Standing at the edge of the pool deck looking out over the water, or seated on a lounger — relaxed, jacket open.";
    case "seated_dining":
      return "Seated at the dining table, turned toward the camera with one arm over the chair back.";
    case "standing_open":
      return "Standing in the open floor space with the room behind them, weight on one leg, hands relaxed.";
  }
}
