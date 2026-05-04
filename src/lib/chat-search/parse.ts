// src/lib/chat-search/parse.ts
//
// Layer 0 of the search-first chat architecture. Thin re-export of the
// chat-v2 query parser — kept as its own module so future parser swaps
// (e.g., LLM-based intent classifier) only touch one import surface.

import { parseQuery } from "@/lib/chat-v2/query-parser";
import type { ParsedQuery } from "./types";

export async function parse(message: string): Promise<ParsedQuery> {
  return parseQuery(message);
}

export type { ParsedQuery };
