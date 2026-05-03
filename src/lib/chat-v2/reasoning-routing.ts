// src/lib/chat-v2/reasoning-routing.ts
// Phase 4 addendum: opt-in routing of multi-tool-call queries to a reasoning
// model (DeepSeek R1 distill / Qwen QwQ on Groq), with server-side stripping
// of <think>...</think> chain-of-thought blocks so they don't reach the user.
//
// Disabled by default. Enable by setting CHAT_REASONING_MODEL in the env to
// the Groq model id (e.g. "deepseek-r1-distill-llama-70b"). Empty/unset →
// every query uses the primary model and no stripping runs.

/**
 * Resolved model + stripping flag for a single request.
 * Read once at the start of route.ts and passed into the agent loop.
 */
export interface ReasoningRouting {
  model: string;
  stripThinkBlocks: boolean;
  reason: "primary" | "reasoning-heuristic" | "reasoning-disabled";
}

const PRIMARY_MODEL = "openai/gpt-oss-120b";

/**
 * Heuristic for "this query probably needs ≥2 tool calls".
 *
 * Conservative on purpose — false negatives are fine (we just stay on the
 * primary model, which already handles chained calls reasonably). False
 * positives are worse: they'd add reasoning-model latency to simple queries.
 *
 * Triggers on explicit multi-call signals only:
 *   - Comparison phrasing: "compare", "vs", "versus", "than"
 *   - Sequencing phrasing: "and then", "then tell", "then show", "then find",
 *     "after that", "also tell", "also show", "along with"
 *   - Coverage phrasing: "both", "each of", "across", "between"
 *
 * NOT triggered by single-conjunction "and" (too noisy — "homes in Indio
 * with a pool and a view" is one query, not two).
 */
const MULTI_CALL_PATTERN = new RegExp(
  [
    "\\b(compare|comparing|comparison)\\b",
    "\\bvs\\.?\\b",
    "\\bversus\\b",
    "\\b(better|worse|cheaper|pricier|nicer)\\s+than\\b",
    "\\b(and|but)\\s+then\\b",
    "\\bthen\\s+(tell|show|find|look|check|compare)\\b",
    "\\bafter\\s+that\\b",
    "\\balso\\s+(tell|show|find|check|include)\\b",
    "\\balong\\s+with\\b",
    "\\bin\\s+addition\\b",
    "\\bboth\\s+\\w+\\s+and\\b",
    "\\beach\\s+of\\b",
    "\\bacross\\s+(neighborhoods|cities|subdivisions|areas)\\b",
    "\\bbetween\\s+\\w+\\s+and\\b",
  ].join("|"),
  "i"
);

export function shouldUseReasoningModel(userMessage: string): boolean {
  if (!userMessage) return false;
  return MULTI_CALL_PATTERN.test(userMessage);
}

/**
 * Pick the model + stripping config for a request.
 * The env var is read here so callers don't need to know about it.
 */
export function resolveRouting(userMessage: string): ReasoningRouting {
  const reasoningModel = process.env.CHAT_REASONING_MODEL?.trim();
  if (!reasoningModel) {
    return { model: PRIMARY_MODEL, stripThinkBlocks: false, reason: "reasoning-disabled" };
  }
  if (shouldUseReasoningModel(userMessage)) {
    return {
      model: reasoningModel,
      stripThinkBlocks: true,
      reason: "reasoning-heuristic",
    };
  }
  return { model: PRIMARY_MODEL, stripThinkBlocks: false, reason: "primary" };
}

// =============================================================================
// <think>...</think> stripper
// =============================================================================
//
// Reasoning models on Groq emit chain-of-thought as regular streamed content
// wrapped in <think>...</think> tags. Stripping happens server-side before
// the SSE token event ships, so the frontend renderer is unchanged.
//
// The streaming protocol delivers content in arbitrary chunk sizes, so the
// tag could split across chunks ("<thi" + "nk>"). The stripper is a small
// state machine that buffers enough tail to detect partial tags and only
// emits content confirmed to be outside any think block.

const OPEN_TAG = "<think>";
const CLOSE_TAG = "</think>";
const HOLDBACK = Math.max(OPEN_TAG.length, CLOSE_TAG.length); // 8

export class ThinkStripper {
  private inside = false;
  private buf = ""; // unprocessed content (may contain partial tag)

  /**
   * Feed a chunk of streamed content. Returns the portion safe to forward
   * to the client. Holds back up to HOLDBACK chars in case a tag is mid-arrival.
   */
  process(chunk: string): string {
    this.buf += chunk;
    let out = "";

    while (this.buf.length > 0) {
      if (!this.inside) {
        const start = this.buf.indexOf(OPEN_TAG);
        if (start !== -1) {
          // Forward everything before the tag, drop the tag, enter think mode
          out += this.buf.slice(0, start);
          this.buf = this.buf.slice(start + OPEN_TAG.length);
          this.inside = true;
          continue;
        }
        // No complete tag in buffer — forward all but a HOLDBACK-1 tail in
        // case a tag is in the middle of arriving.
        if (this.buf.length <= HOLDBACK) {
          // Hold the whole buffer; might be the start of a tag
          break;
        }
        const safe = this.buf.length - (HOLDBACK - 1);
        out += this.buf.slice(0, safe);
        this.buf = this.buf.slice(safe);
        break;
      } else {
        const end = this.buf.indexOf(CLOSE_TAG);
        if (end !== -1) {
          // Drop the think content + closing tag, exit think mode
          this.buf = this.buf.slice(end + CLOSE_TAG.length);
          this.inside = false;
          continue;
        }
        // Inside think and no end tag yet — discard everything except a
        // HOLDBACK-1 tail (the close tag could be partway here).
        if (this.buf.length <= HOLDBACK) break;
        this.buf = this.buf.slice(this.buf.length - (HOLDBACK - 1));
        break;
      }
    }

    return out;
  }

  /**
   * Called when the stream ends. Returns any remaining safe content. If we
   * end mid-think (model never closed the tag), we drop the content silently
   * — the user shouldn't see it.
   */
  flush(): string {
    if (this.inside) {
      this.buf = "";
      return "";
    }
    const out = this.buf;
    this.buf = "";
    return out;
  }
}
