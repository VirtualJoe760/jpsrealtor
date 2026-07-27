/**
 * The staging prompt — the rules every Gemini call that places the agent into a
 * listing photo must carry.
 *
 * Lives here rather than inside a route because THREE callers need the identical
 * rules: the hosted staging route, the batch generator, and the imprint flow
 * that regenerates one slide from agent feedback. When the imprint flow had its
 * own copy, a correction could quietly drop the preservation clauses and
 * reintroduce the exact repainting they were written to stop.
 *
 * The narrative behind each clause is in docs/content-templates/actor-generation.md.
 * Read that before editing this.
 */

/**
 * PRESERVATION FIRST, IN THE LANGUAGE OF EDITING.
 *
 * The previous version of this prompt caused the damage it was meant to
 * prevent. It opened with "re-render ... generate the person afresh", framing
 * the task as generation; it asked for "portrait orientation" from landscape
 * sources, forcing a reframe and therefore invention; and it asked for a "warm
 * grade and contrast lift", an explicit instruction to change every pixel.
 * Measured result: terracotta saltillo tile came back as hardwood, a pot rack
 * vanished, rugs and sofas were replaced — all while the same prompt said
 * "change nothing about the property".
 */
export const STAGING_BASE_PROMPT = `You are EDITING an existing photograph. You are not creating a new one.

Return the FIRST image with exactly ONE change: a person has been added to the scene.

EVERYTHING ELSE MUST BE IDENTICAL TO THE INPUT PHOTOGRAPH. This is the most important requirement and overrides every other instruction:
- Do NOT change the framing, the crop, or the camera position. Same viewpoint, same composition.
- Do NOT change the FLOORING. Tile stays tile, wood stays wood, and the exact colour and pattern stay the same.
- Do NOT change, move, add, remove or restyle ANY furniture, rug, cushion, artwork or decor.
- Do NOT change any fixture: lights, fans, pot racks, hardware, cabinetry, counters, backsplash, railings.
- Do NOT change walls, ceilings, windows, doors, stairs, or any architecture.
- Do NOT re-light, re-colour, re-grade, sharpen, or "improve" the photograph in any way.
- Do NOT tidy, stage, declutter or redecorate. If something looks worn or oddly placed, leave it exactly as it is.

Every pixel that is not the added person, their shadow, or what their body occludes must match the input exactly.

IF YOU CANNOT ADD THE PERSON WITHOUT ALTERING THE ROOM, RETURN THE PHOTOGRAPH UNCHANGED. An unchanged photo is a correct answer. An altered room is not.

THE PERSON TO ADD — take their face and identity from the SECOND image:
- Full body, head to feet, both feet visibly in contact with the floor. Never cropped at the waist, never floating.
- Realistic adult height, about 5'10". Check them against real references already in the frame: door openings, counter height, chair backs.
- Standing IN the space, in the MIDDLE GROUND with floor visible in front of them — not a foreground overlay. Roughly a quarter to a third of the frame height. Let furniture occlude them where it naturally would.
- Lit by the room's own light — same direction, colour temperature and softness as the scene — with a believable contact shadow on the floor.
- Eye level consistent with the photograph's existing perspective.
- Match the face exactly: hair colour and texture, face shape, jawline, skin tone. Do not idealize, smooth or slim them.
- Dark grey suit jacket over a light blue collared shirt, no tie.

NEVER: place them in a bathroom, on or beside a bed, in a corner, in a hallway, on a staircase, or gesturing at a wall, a door, or empty space. If they gesture at all it must be toward a real feature of the room.

No text, watermarks, graphics, or blank bands at any edge.`;

/**
 * Per-slide posture and expression. A carousel where every slide has the same
 * stance reads as one pose with the background swapped — which is what a
 * reviewer called out. Cycled across a batch so no two slides match.
 */
export const POSTURE_VARIATIONS: string[] = [
  "STANDING, weight on one leg, hands relaxed. Warm, natural smile. Looking at the camera.",
  "SEATED, relaxed and leaning back, one arm along the furniture. Calm, neutral expression. Looking into the room, not at the lens.",
  "LEANING lightly against the counter or rail, arms loosely folded. Slight laugh, caught mid-conversation. Looking at the camera.",
  "SEATED, forward on the edge, forearms on knees. Warm, easy smile. Looking slightly off-camera.",
];

/** Compose the full instruction for one slide. */
export function buildStagingPrompt(opts: {
  /** Where in THIS frame the person goes, naming visible objects. */
  placement: string;
  /** Which posture/expression slot this slide occupies. */
  variationIndex?: number;
  /**
   * The agent's correction, when regenerating a slide they rejected.
   *
   * Appended LAST and framed as an override so it wins on the specific point
   * raised — but the preservation block above still governs, because a
   * correction like "put me on the rug instead" must never be read as
   * permission to repaint the room.
   */
  correction?: string;
}): string {
  const parts = [
    STAGING_BASE_PROMPT,
    `\n\nWHERE TO PUT THEM IN THIS SPECIFIC PHOTOGRAPH: ${opts.placement}`,
  ];
  if (opts.variationIndex !== undefined) {
    parts.push(
      `\n\nPOSTURE AND EXPRESSION FOR THIS SLIDE — must differ from the other slides in this set: ${
        POSTURE_VARIATIONS[opts.variationIndex % POSTURE_VARIATIONS.length]
      }`
    );
  }
  if (opts.correction?.trim()) {
    parts.push(
      `\n\nTHE AGENT REVIEWED YOUR PREVIOUS ATTEMPT AND ASKED FOR THIS CHANGE — it takes priority over the placement and posture notes above, but NOT over the preservation rules, which still apply in full:\n${opts.correction.trim()}`
    );
  }
  return parts.join("");
}
