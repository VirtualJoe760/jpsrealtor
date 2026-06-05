// src/lib/cover-templates/index.ts
//
// Cover template registry. Add new templates by:
//   1. Create src/lib/cover-templates/<name>.ts with a buildXTransformations
//      function returning Cloudinary transformation arrays
//   2. Add an entry to TEMPLATES here
//   3. Optionally extend the input data interface if your template needs
//      fields the others don't
//
// MCP tools and the cover-slide route resolve by template id ("simple-luxury",
// future: "dark-modern", "magazine", "minimal", etc.).

import {
  buildSimpleLuxuryTransformations,
  type SimpleLuxuryData,
  type CloudinaryTransformation,
} from "./simple-luxury";

export type CoverTemplateId = "simple-luxury";

export interface CoverTemplate {
  id: CoverTemplateId;
  label: string;
  description: string;
  build: (data: SimpleLuxuryData) => CloudinaryTransformation[];
}

export const TEMPLATES: Record<CoverTemplateId, CoverTemplate> = {
  "simple-luxury": {
    id: "simple-luxury",
    label: "Simple Luxury",
    description:
      "Editorial 4:5 cover with a left accent panel, large light hook, city subtitle, price, address, specs, italic body copy, agent headshot at bottom, and a thin Listed-by banner. Accent color is configurable per call.",
    build: buildSimpleLuxuryTransformations,
  },
};

export function getTemplate(id: string): CoverTemplate | null {
  return (TEMPLATES as any)[id] || null;
}

export type { SimpleLuxuryData, CloudinaryTransformation };
