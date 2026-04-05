/**
 * Public Remarks Parser
 *
 * Extracts property attributes from free-text listing descriptions.
 * Agents often include details in remarks that they skip in structured fields.
 *
 * Confidence: 85-95% when detected (with false-positive exclusions)
 */

import { ParsedRemarks } from "./types";

// ─── Pattern Definitions ───

interface PatternRule {
  // Positive matches (feature is present)
  patterns: RegExp[];
  // Negative exclusions (false positives to filter out)
  exclusions: RegExp[];
  // Explicit negatives ("no pool", "pool removed")
  negatives: RegExp[];
}

const POOL_RULES: PatternRule = {
  patterns: [
    /\b(?:private|heated|sparkling|saltwater|pebble[\s-]?tec|resort[\s-]?style|infinity|lap)\s+pool\b/i,
    /\bpool\s+(?:and|&|w\/)\s+spa\b/i,
    /\bswimming\s+pool\b/i,
    /\bpool\s+(?:w\/|with)\s+(?:waterfall|slide|grotto|heater)/i,
    /\bpool\b(?!.*\btable\b)(?!.*\broom\b)(?!.*\bhall\b)/i,  // "pool" not followed by "table", "room", "hall"
  ],
  exclusions: [
    /\bcommunity\s+pool\b/i,         // Shared amenity
    /\bpool\s+table\b/i,             // Billiards
    /\bcar\s*pool\b/i,               // Carpool
    /\bpool\s+house\b(?!.*\bpool\b)/i, // Pool house mention without actual pool context
  ],
  negatives: [
    /\bno\s+pool\b/i,
    /\bpool\s+(?:removed|filled|converted)\b/i,
    /\bwithout\s+(?:a\s+)?pool\b/i,
  ],
};

const SPA_RULES: PatternRule = {
  patterns: [
    /\b(?:private|heated|in[\s-]?ground)\s+spa\b/i,
    /\bhot\s+tub\b/i,
    /\bjacuzzi\b/i,
    /\bspa\b(?!.*\b(?:like|inspired|style|bathroom|retreat|day)\b)/i,
    /\bpool\s+(?:and|&|w\/)\s+spa\b/i,
  ],
  exclusions: [
    /\bspa[\s-]?like\b/i,           // "spa-like bathroom"
    /\bspa[\s-]?(?:inspired|style)\b/i,
    /\bday\s+spa\b/i,               // Nearby day spa
    /\bspa\s+(?:bathroom|bath|shower|tub\s+(?:in|inside))\b/i,
  ],
  negatives: [
    /\bno\s+spa\b/i,
    /\bspa\s+(?:removed|converted)\b/i,
  ],
};

const VIEW_PATTERNS: { category: string; patterns: RegExp[]; confidence: number }[] = [
  {
    category: "Golf",
    patterns: [
      /\bgolf\s+course\s+view/i,
      /\bview(?:s)?\s+(?:of|over(?:looking)?)\s+(?:the\s+)?golf/i,
      /\bon\s+(?:the\s+)?golf\s+course\b/i,
      /\bgolf\s+course\s+(?:lot|frontage)\b/i,
    ],
    confidence: 0.92,
  },
  {
    category: "Mountain",
    patterns: [
      /\bmountain\s+view/i,
      /\bview(?:s)?\s+(?:of|over(?:looking)?)\s+(?:the\s+)?mountain/i,
      /\bstunning\s+mountain/i,
      /\bsan\s+jacinto\s+(?:view|mountain)/i,
      /\bsan\s+gorgonio/i,
    ],
    confidence: 0.90,
  },
  {
    category: "Desert",
    patterns: [
      /\bdesert\s+view/i,
      /\bview(?:s)?\s+(?:of|over(?:looking)?)\s+(?:the\s+)?desert/i,
      /\bopen\s+desert\s+(?:view|vista)/i,
    ],
    confidence: 0.88,
  },
  {
    category: "Water",
    patterns: [
      /\bocean\s+view/i,
      /\blake\s+view/i,
      /\bwater\s+(?:view|front)/i,
      /\bbeach\s+(?:view|front)/i,
      /\bview(?:s)?\s+(?:of|over(?:looking)?)\s+(?:the\s+)?(?:ocean|lake|water|beach)/i,
    ],
    confidence: 0.92,
  },
  {
    category: "City",
    patterns: [
      /\bcity\s+light(?:s)?\s+view/i,
      /\bpanoramic\s+view/i,
      /\bview(?:s)?\s+(?:of|over(?:looking)?)\s+(?:the\s+)?city/i,
    ],
    confidence: 0.88,
  },
];

const GARAGE_RULES: PatternRule & { extractors: RegExp[] } = {
  patterns: [
    /\b\d[\s-]?car\s+garage\b/i,
    /\b(?:attached|detached)\s+garage\b/i,
    /\bgarage\b/i,
  ],
  exclusions: [
    /\bgarage\s+(?:sale|door\s+opener\s+only)\b/i,
  ],
  negatives: [
    /\bno\s+garage\b/i,
  ],
  extractors: [
    /\b(\d)[\s-]?car\s+garage\b/i,       // "3-car garage" → 3
    /\bgarage\s+(?:for|fits)\s+(\d)\b/i,  // "garage for 2" → 2
  ],
};

const GATED_RULES: PatternRule = {
  patterns: [
    /\bgated\s+community\b/i,
    /\bguard[\s-]?gated\b/i,
    /\bprivate\s+gate(?:s|d)?\b/i,
    /\b24[\s-]?(?:hour|hr)\s+(?:guard|security|gated)\b/i,
    /\bbehind\s+(?:the\s+)?gates\b/i,
  ],
  exclusions: [],
  negatives: [],
};

const GOLF_RULES: PatternRule = {
  patterns: [
    /\bgolf\s+(?:membership|course|club)\b/i,
    /\bon\s+(?:the\s+)?golf\s+course\b/i,
    /\bgolf\s+course\s+(?:lot|community|within)\b/i,
    /\bgolf\s+(?:equity|membership\s+available)\b/i,
  ],
  exclusions: [
    /\bnear\s+golf\b/i,              // Proximity, not on-course
    /\bclose\s+to\s+golf\b/i,
  ],
  negatives: [],
};

const REMODELED_RULES: PatternRule = {
  patterns: [
    /\b(?:recently|newly|completely|fully|totally|extensively)\s+(?:remodeled|renovated|updated|upgraded)\b/i,
    /\bremodel(?:ed)?\b/i,
    /\brenovate(?:d)?\b/i,
    /\bupdated\s+(?:kitchen|bath|throughout|home)\b/i,
    /\bturnkey\b/i,
  ],
  exclusions: [
    /\bneeds?\s+(?:remodel|renovation|updating)\b/i,  // Needs work = NOT remodeled
    /\bfixer\b/i,
    /\bas[\s-]?is\b/i,
  ],
  negatives: [
    /\boriginal\s+(?:condition|kitchen|bath)\b/i,
  ],
};

const FURNISHED_PATTERNS: { level: string; patterns: RegExp[] }[] = [
  {
    level: "Turnkey",
    patterns: [/\bturnkey\b/i, /\bturn[\s-]?key\b/i],
  },
  {
    level: "Furnished",
    patterns: [
      /\bfully\s+furnished\b/i,
      /\bfurnished\b(?!.*\bunfurnished\b)/i,
      /\bfurniture\s+(?:included|stays|conveys)\b/i,
    ],
  },
  {
    level: "Partially Furnished",
    patterns: [/\bpartially\s+furnished\b/i, /\bsome\s+furniture\b/i],
  },
];

// ─── Helper: Extract snippet around match ───

function extractSnippet(text: string, match: RegExpMatchArray, contextChars: number = 40): string {
  const idx = match.index ?? 0;
  const start = Math.max(0, idx - contextChars);
  const end = Math.min(text.length, idx + match[0].length + contextChars);
  let snippet = text.slice(start, end).trim();
  if (start > 0) snippet = "..." + snippet;
  if (end < text.length) snippet = snippet + "...";
  return snippet;
}

// ─── Helper: Test patterns with exclusions ───

function testPatterns(
  text: string,
  rules: PatternRule
): { detected: boolean; match: RegExpMatchArray | null; isNegative: boolean } {
  // Check for explicit negatives first
  for (const neg of rules.negatives) {
    const m = text.match(neg);
    if (m) return { detected: false, match: m, isNegative: true };
  }

  // Check positive patterns
  for (const pattern of rules.patterns) {
    const m = text.match(pattern);
    if (m) {
      // Check exclusions
      let excluded = false;
      for (const exc of rules.exclusions) {
        if (exc.test(text)) {
          excluded = true;
          break;
        }
      }
      if (!excluded) return { detected: true, match: m, isNegative: false };
    }
  }

  return { detected: false, match: null, isNegative: false };
}

// ─── Main Parser ───

export function parseRemarks(publicRemarks: string | null | undefined): ParsedRemarks {
  const text = (publicRemarks || "").trim();
  const negatives: string[] = [];

  if (!text) {
    return {
      pool: { detected: false, confidence: 0, snippet: "", isPrivate: false },
      spa: { detected: false, confidence: 0, snippet: "" },
      view: { detected: false, categories: [], confidence: 0, snippet: "" },
      garage: { detected: false, spaces: null, confidence: 0, snippet: "" },
      gated: { detected: false, confidence: 0, snippet: "" },
      golf: { detected: false, confidence: 0, snippet: "" },
      remodeled: { detected: false, confidence: 0, snippet: "" },
      furnished: { detected: false, level: null, confidence: 0, snippet: "" },
      negatives: [],
    };
  }

  // ── Pool ──
  const poolResult = testPatterns(text, POOL_RULES);
  const isPrivatePool = poolResult.detected && !/\bcommunity\s+pool\b/i.test(text);
  if (poolResult.isNegative) negatives.push("no pool");

  // ── Spa ──
  const spaResult = testPatterns(text, SPA_RULES);
  if (spaResult.isNegative) negatives.push("no spa");

  // ── View ──
  const viewCategories: string[] = [];
  let viewSnippet = "";
  let viewConfidence = 0;
  for (const vp of VIEW_PATTERNS) {
    for (const pattern of vp.patterns) {
      const m = text.match(pattern);
      if (m) {
        if (!viewCategories.includes(vp.category)) {
          viewCategories.push(vp.category);
        }
        if (vp.confidence > viewConfidence) {
          viewConfidence = vp.confidence;
          viewSnippet = extractSnippet(text, m);
        }
      }
    }
  }

  // ── Garage ──
  const garageResult = testPatterns(text, GARAGE_RULES);
  let garageSpaces: number | null = null;
  if (garageResult.detected) {
    for (const ext of GARAGE_RULES.extractors) {
      const m = text.match(ext);
      if (m && m[1]) {
        garageSpaces = parseInt(m[1], 10);
        break;
      }
    }
  }

  // ── Gated ──
  const gatedResult = testPatterns(text, GATED_RULES);

  // ── Golf ──
  const golfResult = testPatterns(text, GOLF_RULES);

  // ── Remodeled ──
  const remodeledResult = testPatterns(text, REMODELED_RULES);

  // ── Furnished ──
  let furnishedLevel: string | null = null;
  let furnishedConfidence = 0;
  let furnishedSnippet = "";
  for (const fp of FURNISHED_PATTERNS) {
    for (const pattern of fp.patterns) {
      const m = text.match(pattern);
      if (m) {
        furnishedLevel = fp.level;
        furnishedConfidence = 0.88;
        furnishedSnippet = extractSnippet(text, m);
        break;
      }
    }
    if (furnishedLevel) break;
  }

  return {
    pool: {
      detected: poolResult.detected,
      confidence: poolResult.detected ? 0.92 : 0,
      snippet: poolResult.match ? extractSnippet(text, poolResult.match) : "",
      isPrivate: isPrivatePool,
    },
    spa: {
      detected: spaResult.detected,
      confidence: spaResult.detected ? 0.90 : 0,
      snippet: spaResult.match ? extractSnippet(text, spaResult.match) : "",
    },
    view: {
      detected: viewCategories.length > 0,
      categories: viewCategories,
      confidence: viewConfidence,
      snippet: viewSnippet,
    },
    garage: {
      detected: garageResult.detected,
      spaces: garageSpaces,
      confidence: garageResult.detected ? 0.88 : 0,
      snippet: garageResult.match ? extractSnippet(text, garageResult.match) : "",
    },
    gated: {
      detected: gatedResult.detected,
      confidence: gatedResult.detected ? 0.92 : 0,
      snippet: gatedResult.match ? extractSnippet(text, gatedResult.match) : "",
    },
    golf: {
      detected: golfResult.detected,
      confidence: golfResult.detected ? 0.90 : 0,
      snippet: golfResult.match ? extractSnippet(text, golfResult.match) : "",
    },
    remodeled: {
      detected: remodeledResult.detected,
      confidence: remodeledResult.detected ? 0.85 : 0,
      snippet: remodeledResult.match ? extractSnippet(text, remodeledResult.match) : "",
    },
    furnished: {
      detected: !!furnishedLevel,
      level: furnishedLevel,
      confidence: furnishedConfidence,
      snippet: furnishedSnippet,
    },
    negatives,
  };
}
