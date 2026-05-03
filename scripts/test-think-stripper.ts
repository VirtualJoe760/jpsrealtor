// scripts/test-think-stripper.ts
// Sanity test for ThinkStripper — verifies chunk-boundary tag detection.
// Run: npx tsx scripts/test-think-stripper.ts

import { ThinkStripper } from "../src/lib/chat-v2/reasoning-routing";

interface Case {
  name: string;
  // Sequence of chunks fed to the stripper, simulating streamed delivery
  chunks: string[];
  expected: string; // Expected output (tokens concatenated)
}

const CASES: Case[] = [
  {
    name: "no think block",
    chunks: ["Hello ", "world"],
    expected: "Hello world",
  },
  {
    name: "single block, all in one chunk",
    chunks: ["<think>plan ahead</think>Here is the answer."],
    expected: "Here is the answer.",
  },
  {
    name: "block split across chunks (open tag)",
    chunks: ["<thi", "nk>plan</think>Visible"],
    expected: "Visible",
  },
  {
    name: "block split across chunks (close tag)",
    chunks: ["<think>plan</thi", "nk>Visible"],
    expected: "Visible",
  },
  {
    name: "block split across many small chunks",
    chunks: ["<", "th", "i", "nk", ">", "p", "l", "a", "n", "<", "/", "think>", "OK"],
    expected: "OK",
  },
  {
    name: "prose before and after",
    chunks: ["Pre. ", "<think>thoughts</think>", " Post."],
    expected: "Pre.  Post.",
  },
  {
    name: "two blocks",
    chunks: ["<think>a</think>X<think>b</think>Y"],
    expected: "XY",
  },
  {
    name: "no block but content with < character",
    chunks: ["price < $1M"],
    expected: "price < $1M",
  },
  {
    name: "unclosed block (model crashed mid-think) — content dropped",
    chunks: ["<think>still thinking"],
    expected: "",
  },
  {
    name: "trailing prose held back across chunks",
    chunks: ["<think>x</think>", "ABC", "DEF"],
    expected: "ABCDEF",
  },
  {
    name: "literal '<think' in normal prose (no closing >)",
    chunks: ["I would <think about> this"],
    // The stripper sees "<think" as a possible tag start but it's not followed
    // by ">" — current implementation treats "<think" as starting a block once
    // it sees the full "<think>" text. Without a "<think>" exact match, it's
    // forwarded. This case is the model writing "<think " (with space) and
    // should be passed through unchanged.
    expected: "I would <think about> this",
  },
];

function feedAndCollect(c: Case): string {
  const stripper = new ThinkStripper();
  let out = "";
  for (const chunk of c.chunks) {
    out += stripper.process(chunk);
  }
  out += stripper.flush();
  return out;
}

let pass = 0;
let fail = 0;

for (const c of CASES) {
  const got = feedAndCollect(c);
  const ok = got === c.expected;
  if (ok) {
    pass++;
    console.log(`  PASS  ${c.name}`);
  } else {
    fail++;
    console.log(`  FAIL  ${c.name}`);
    console.log(`        expected: ${JSON.stringify(c.expected)}`);
    console.log(`        got:      ${JSON.stringify(got)}`);
  }
}

console.log("");
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
