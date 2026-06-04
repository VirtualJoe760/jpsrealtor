// src/app/api/claude/draft-landing-page/route.ts
//
// Multi-turn streaming chat with Claude, using the AGENT'S OWN Anthropic key
// (decrypted from user.agentProfile.aiIntegrations.anthropic).
//
// Claude has tool access so it can populate the landing-page form fields
// AS the conversation progresses — the client renders text deltas in chat
// bubbles AND applies tool_use events as live form updates.
//
// Tools:
//   set_article_field     — title, excerpt, content (MDX), seo.*
//   set_landing_page_option — heroType, themeOverride, formEnabled, formHeading, ...
//   add_form_field        — append a single form field
//   remove_form_field     — by id
//   finalize              — signal the draft is ready
//
// SSE event shapes (chosen to be compatible with chat-v3 applyEvent):
//   { token: "..." }                                    — text delta
//   { tool_use: { name: "...", input: {...} } }         — Claude fired a tool
//   { done: true }                                      — stream complete
//   { error: "..." }                                    — fatal

import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import Anthropic from "@anthropic-ai/sdk";
import { decryptSecret } from "@/lib/secrets";

const SYSTEM_PROMPT = `You are an expert real estate landing-page designer working with a licensed real estate agent. Your job is to help them build a high-converting landing page on their ChatRealty site through a short, focused conversation.

How to work:
1. Open with ONE short question that gets to the core: what is this page for? (a listing, a community, a buyer/seller lead magnet, an event, a service)
2. Ask follow-ups one at a time. Each follow-up should narrow the design: audience, hero imagery, primary call-to-action, whether they want a lead-capture form, theme preference.
3. As soon as you have enough to decide a field (even just the title), call the relevant tool to populate the form. Don't wait until the end. The agent watches the form fill in as you talk.
4. Generate the MDX content body when you have the goal, audience, and CTA confirmed. Real-estate landing pages should be punchy: a strong headline, 1-3 short paragraphs, scannable bullets, a clear CTA. Aim for 400-900 words of MDX.
5. When done, call the finalize tool with a short summary.

Style rules for the landing page itself:
- Conversion-focused, not blog-like. No fluff.
- Speak in second person to the visitor ("you", "your").
- Tie to the local market specifics the agent gives you. Use real subdivision / city / community names when offered.
- If the agent doesn't have a hero photo URL, suggest "photo" hero type and tell them to upload an image in the CMS after they review.

Style rules for your replies to the agent (the chat messages):
- Concise. 1-3 sentences per turn unless you're explaining the finalize summary.
- Friendly, conversational, no headers/markdown in your replies.
- After firing a tool, briefly tell them what you set ("Set the title to X — sound right?") so they can correct course.

Important: you do NOT have access to the agent's images. If they don't give you a Cloudinary URL, set featuredImage as a placeholder ({ url: "", alt: "..." }) and remind them to add one before publishing.`;

const TOOLS: Anthropic.Tool[] = [
  {
    name: "set_article_field",
    description:
      "Update one of the top-level article fields shown in the form (title, excerpt, content body in MDX, SEO fields). Call this incrementally as you decide each field — don't wait for the end.",
    input_schema: {
      type: "object",
      properties: {
        field: {
          type: "string",
          enum: ["title", "excerpt", "content", "seo.title", "seo.description", "seo.keywords"],
        },
        value: {
          oneOf: [{ type: "string" }, { type: "array", items: { type: "string" } }],
          description:
            "String for most fields. For seo.keywords pass an array of strings.",
        },
      },
      required: ["field", "value"],
    } as any,
  },
  {
    name: "set_landing_page_option",
    description:
      "Update a landing-page-specific option (hero type, theme override, form configuration). Call this as soon as the agent answers a question that decides one of these.",
    input_schema: {
      type: "object",
      properties: {
        option: {
          type: "string",
          enum: [
            "standalone",
            "heroType",
            "youtubeUrl",
            "videoAutoplay",
            "themeOverride",
            "formEnabled",
            "formHeading",
            "formButtonText",
            "formRecipients",
            "formDisclaimer",
          ],
        },
        value: {
          oneOf: [{ type: "string" }, { type: "boolean" }],
        },
      },
      required: ["option", "value"],
    } as any,
  },
  {
    name: "add_form_field",
    description:
      "Append a lead-capture form field. Use only when the agent has agreed to a form. Common fields: name, email, phone, message.",
    input_schema: {
      type: "object",
      properties: {
        id: { type: "string", description: "lowercase identifier, e.g. 'email'" },
        label: { type: "string" },
        type: {
          type: "string",
          enum: ["text", "email", "tel", "textarea", "select"],
        },
        required: { type: "boolean" },
        options: {
          type: "array",
          items: { type: "string" },
          description: "Only for type=select",
        },
      },
      required: ["id", "label", "type", "required"],
    } as any,
  },
  {
    name: "remove_form_field",
    description: "Remove a form field by id.",
    input_schema: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    } as any,
  },
  {
    name: "finalize",
    description:
      "Call once you and the agent agree the draft is ready. Provide a short 1-2 sentence summary of what was built.",
    input_schema: {
      type: "object",
      properties: { summary: { type: "string" } },
      required: ["summary"],
    } as any,
  },
];

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return jsonError(401, "Unauthorized");
  }

  let body: {
    messages?: Array<{ role: "user" | "assistant"; content: string }>;
    currentDraft?: any;
  };
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "Invalid JSON");
  }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  if (messages.length === 0) {
    return jsonError(400, "messages required");
  }

  await dbConnect();
  const user = await User.findById(session.user.id)
    .select("agentProfile.aiIntegrations.anthropic agentProfile.serviceAreas agentProfile.specializations agentProfile.bio name")
    .lean();
  const anthropicCfg = (user as any)?.agentProfile?.aiIntegrations?.anthropic;
  if (!anthropicCfg?.apiKeyEncrypted || anthropicCfg.status !== "connected") {
    return jsonError(
      400,
      "no_anthropic_key",
      "Add your Anthropic API key in Settings → Integrations to use this feature."
    );
  }

  let apiKey: string;
  try {
    apiKey = decryptSecret(anthropicCfg.apiKeyEncrypted);
  } catch {
    return jsonError(500, "decrypt_failed", "Stored key could not be decrypted.");
  }

  // Provide agent context to Claude so it tailors locally without us having
  // to ask the agent the same question every session.
  const agentCtx = (() => {
    const ap = (user as any)?.agentProfile || {};
    const parts: string[] = [];
    if ((user as any)?.name) parts.push(`Agent: ${(user as any).name}`);
    if (ap.bio) parts.push(`Bio: ${ap.bio.slice(0, 400)}`);
    if (Array.isArray(ap.serviceAreas) && ap.serviceAreas.length) {
      parts.push(
        `Service areas: ${ap.serviceAreas.map((a: any) => a.name).filter(Boolean).slice(0, 8).join(", ")}`
      );
    }
    if (Array.isArray(ap.specializations) && ap.specializations.length) {
      parts.push(`Specializations: ${ap.specializations.slice(0, 8).join(", ")}`);
    }
    return parts.length ? `\n\nAgent context (use to make the page specific to them):\n${parts.join("\n")}` : "";
  })();

  // Optionally include the current draft snapshot the user has already
  // accepted, so Claude doesn't overwrite things needlessly.
  const draftCtx = body.currentDraft
    ? `\n\nCurrent draft state (don't overwrite unless asked):\n${JSON.stringify(body.currentDraft, null, 2)}`
    : "";

  const systemPrompt = SYSTEM_PROMPT + agentCtx + draftCtx;
  const model = anthropicCfg.model || "claude-sonnet-4-5-20250929";
  const client = new Anthropic({ apiKey });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: any) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));

      try {
        const messageStream = await client.messages.create({
          model,
          max_tokens: 4096,
          system: systemPrompt,
          tools: TOOLS,
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          stream: true,
        });

        // Track partial tool inputs (Anthropic streams tool_use.input as
        // input_json_delta partials).
        const toolPartials = new Map<number, { name: string; jsonAccum: string }>();

        for await (const event of messageStream) {
          // Text delta
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            send({ token: event.delta.text });
            continue;
          }

          // Tool use block start — remember name + index
          if (event.type === "content_block_start" && event.content_block.type === "tool_use") {
            toolPartials.set(event.index, {
              name: event.content_block.name,
              jsonAccum: "",
            });
            continue;
          }

          // Tool use input delta — accumulate JSON
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "input_json_delta"
          ) {
            const partial = toolPartials.get(event.index);
            if (partial) {
              partial.jsonAccum += event.delta.partial_json;
            }
            continue;
          }

          // Tool use block done — parse + emit
          if (event.type === "content_block_stop") {
            const partial = toolPartials.get(event.index);
            if (partial) {
              let parsed: any = {};
              try {
                parsed = partial.jsonAccum ? JSON.parse(partial.jsonAccum) : {};
              } catch {
                // Malformed JSON — pass raw for debugging on the client.
                parsed = { _raw: partial.jsonAccum };
              }
              send({ tool_use: { name: partial.name, input: parsed } });
              toolPartials.delete(event.index);
            }
            continue;
          }

          if (event.type === "message_stop") {
            send({ done: true });
          }
        }
        controller.close();
      } catch (err: any) {
        const status = err?.status || 0;
        let reason: string;
        if (status === 401 || status === 403) reason = "Invalid Anthropic key — update it in Settings.";
        else if (status === 429) reason = "Anthropic rate-limited your key. Wait a moment.";
        else reason = "Stream failed.";
        send({ error: reason });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store",
      Connection: "keep-alive",
    },
  });
}

function jsonError(status: number, code: string, message?: string): Response {
  return new Response(
    JSON.stringify({ error: code, message: message || code }),
    {
      status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    }
  );
}
