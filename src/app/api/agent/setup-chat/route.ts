// POST /api/agent/setup-chat — the conversational agent setup.
//
// Replaces the form wizard as the default first-run experience: a Groq
// tool-calling loop that collects exactly what the classic wizard collects
// (identity, COMPLIANCE must-haves, contact + gating preference, market,
// specializations, brand color) and writes it to agentProfile through a
// WHITELISTED $set — the model never writes arbitrary paths. The classic
// wizard remains at /agent/settings?onboarding=true as the fallback.
//
// Stateless per request: the client sends the whole visible transcript; we
// return the assistant reply + a fresh profile snapshot for the progress card.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";

export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store" };

const GROQ_KEY = process.env.GROQ_API_KEY || "";
const MODEL = process.env.SETUP_CHAT_MODEL || "llama-3.3-70b-versatile";

// The only fields the model may write, mapped to their schema paths.
const FIELD_PATHS: Record<string, string> = {
  name: "name",
  teamName: "teamName", // top-level
  licenseNumber: "licenseNumber", // TOP-LEVEL legacy field (NOT agentProfile.*)
  brokerageName: "brokerageName", // top-level
  phone: "phone",
  contactVisibility: "contactVisibility", // top-level; "public" | "gated"
  serviceAreas: "agentProfile.serviceAreas",
  specializations: "agentProfile.specializations",
  brandColor: "agentProfile.brandColors.primary",
  subdomain: "agentProfile.subdomain",
};

const TOOLS = [
  {
    type: "function",
    function: {
      name: "save_profile",
      description:
        "Save one or more collected profile fields. Call as soon as the agent provides a value — don't batch everything to the end.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Display name, e.g. 'Jane Smith' or the team brand if they go by one" },
          teamName: { type: "string" },
          licenseNumber: { type: "string" },
          brokerageName: { type: "string" },
          phone: { type: "string" },
          contactVisibility: { type: "string", enum: ["public", "gated"] },
          serviceAreas: { type: "array", items: { type: "string" }, description: "Cities/areas served" },
          specializations: { type: "array", items: { type: "string" } },
          brandColor: { type: "string", description: "Hex like #1e3a5f" },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "finish_setup",
      description:
        "Mark setup complete. Only call once license number AND brokerage are saved (compliance must-haves) and the agent has confirmed their summary.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
] as const;

function snapshot(u: any) {
  const ap = u.agentProfile || {};
  return {
    name: u.name || null,
    teamName: u.teamName || null,
    licenseNumber: u.licenseNumber || null,
    brokerageName: u.brokerageName || null,
    phone: u.phone || null,
    email: u.email || null,
    contactVisibility: u.contactVisibility || null,
    serviceAreas: Array.isArray(ap.serviceAreas)
      ? ap.serviceAreas.map((a: any) => (typeof a === "string" ? a : a?.name)).filter(Boolean)
      : [],
    specializations: ap.specializations || [],
    brandColor: ap.brandColors?.primary || null,
    onboardingComplete: Boolean(u.agentProfile?.onboardingComplete),
  };
}

function systemPrompt(snap: ReturnType<typeof snapshot>): string {
  return [
    "You are ChatRealty's setup assistant, talking to a real-estate agent setting up their account.",
    "VOICE: confident consultant, plain English. Never mention tools, fields, databases, or that you are saving anything — just have the conversation. Short messages; ONE topic per message; prefer checklists / either-or choices over open-ended questions.",
    "GOAL — collect what's missing, in this order:",
    "1. How they go by: their own name ('Jane Smith, Real Estate Agent') or a team/group name.",
    "2. COMPLIANCE MUST-HAVES (cannot finish without): license ID number and brokerage. Team name too if one exists.",
    "3. Phone, then one question: contact info shown publicly on their site, or gated behind a contact form?",
    "4. The market/cities they serve.",
    "5. Their focus (offer a checklist: luxury · investment · senior living · family & first-time · vacation homes).",
    "6. A brand color if they have one (hex or a plain description you convert).",
    "CRITICAL RULE: when the agent's latest message contains ANY collectible fact (name/team, license number, brokerage, phone, contact-visibility choice, cities, focus/specializations, color), your FIRST action MUST be a save_profile call carrying every fact from that message — write your reply only after the tool result. Never answer without saving first; unsaved answers are lost.",
    "Skip anything already known below — NEVER re-ask it.",
    "The contact-visibility choice (public vs gated) is itself a fact to SAVE (contactVisibility). If it is still null after their phone answer, ask that one question before moving on.",
    "When the must-haves are in, give a tight one-line summary and ask to confirm; on confirmation call finish_setup and tell them they're set — their profile drives their ChatRealty page and any site Claude builds them.",
    "If they want forms instead, tell them the classic setup is at Settings.",
    `ALREADY KNOWN (do not re-ask): ${JSON.stringify(snap)}`,
  ].join("\n");
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
  }
  if (!GROQ_KEY) {
    return NextResponse.json({ error: "setup chat unavailable" }, { status: 503, headers: NO_STORE });
  }

  const body = await req.json().catch(() => ({}));
  const clientMessages = Array.isArray(body?.messages) ? body.messages.slice(-30) : [];

  await dbConnect();
  let user = await User.findOne({ email: session.user.email });
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
  }

  const messages: any[] = [
    { role: "system", content: systemPrompt(snapshot(user)) },
    ...clientMessages
      .filter((m: any) => (m?.role === "user" || m?.role === "assistant") && typeof m?.content === "string")
      .map((m: any) => ({ role: m.role, content: m.content.slice(0, 4000) })),
  ];

  let done = false;

  // Deterministic fallback for the one binary field the model reliably
  // under-saves: contact visibility. Only when the PREVIOUS assistant message
  // asked that exact question and the answer is unambiguous — never guess.
  const lastUser = [...clientMessages].reverse().find((m: any) => m?.role === "user");
  const priorAssistant = [...clientMessages].reverse().find((m: any) => m?.role === "assistant");
  if (
    !user.contactVisibility &&
    typeof lastUser?.content === "string" &&
    typeof priorAssistant?.content === "string" &&
    /publicly|gated|contact form/i.test(priorAssistant.content)
  ) {
    const ans = lastUser.content.toLowerCase();
    const gated = /gate|behind|form only|contact form/.test(ans) && !/public/.test(ans);
    const pub = /public|show/.test(ans) && !/gate|behind/.test(ans);
    if (gated || pub) {
      await User.updateOne({ _id: user._id }, { $set: { contactVisibility: gated ? "gated" : "public" } });
      user = await User.findOne({ email: session.user.email });
    }
  }

  // Tool loop (max 4 rounds — save_profile calls + final text)
  for (let round = 0; round < 6; round++) {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${GROQ_KEY}` },
      body: JSON.stringify({ model: MODEL, messages, tools: TOOLS, tool_choice: "auto", temperature: 0.4 }),
    });
    let data: any = null;
    if (res.ok) {
      data = await res.json();
    } else {
      // One retry — Groq occasionally 4xx/5xxes on tool-call generations.
      await new Promise((r) => setTimeout(r, 800));
      const retry = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${GROQ_KEY}` },
        body: JSON.stringify({ model: MODEL, messages, tools: TOOLS, tool_choice: "auto", temperature: 0.4 }),
      });
      if (!retry.ok) {
        return NextResponse.json(
          { reply: "Sorry — I hiccuped there. Say that once more?", profile: snapshot(await User.findById(user._id)), done: false },
          { headers: NO_STORE }
        );
      }
      data = await retry.json();
    }
    const msg = data?.choices?.[0]?.message;
    if (!msg) break;

    if (msg.tool_calls?.length) {
      messages.push(msg);
      for (const tc of msg.tool_calls.slice(0, 4)) {
        let result: any = { ok: true };
        try {
          const args = JSON.parse(tc.function?.arguments || "{}");
          if (tc.function?.name === "save_profile") {
            const $set: Record<string, any> = {};
            for (const [k, v] of Object.entries(args)) {
              if (!(k in FIELD_PATHS) || v == null) continue;
              if (k === "serviceAreas" && Array.isArray(v)) {
                $set[FIELD_PATHS[k]] = v.slice(0, 20).map((n: any) => ({ name: String(n).slice(0, 80) }));
              } else if (k === "specializations" && Array.isArray(v)) {
                $set[FIELD_PATHS[k]] = v.slice(0, 10).map((n: any) => String(n).slice(0, 60));
              } else if (typeof v === "string") {
                $set[FIELD_PATHS[k]] = v.slice(0, 200);
              }
            }
            if (Object.keys($set).length) {
              await User.updateOne({ _id: user._id }, { $set });
            }
          } else if (tc.function?.name === "finish_setup") {
            const fresh = await User.findById(user._id, { licenseNumber: 1, brokerageName: 1 }).lean<any>();
            if (!fresh?.licenseNumber || !fresh?.brokerageName) {
              result = { ok: false, error: "license number and brokerage are required before finishing" };
            } else {
              await User.updateOne({ _id: user._id }, { $set: { "agentProfile.onboardingComplete": true } });
              done = true;
            }
          } else {
            result = { ok: false, error: "unknown tool" };
          }
        } catch (e) {
          result = { ok: false, error: "save failed" };
        }
        messages.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(result) });
      }
      continue; // let the model produce its user-facing reply
    }

    // Plain text reply — we're done this turn.
    user = await User.findById(user._id);
    return NextResponse.json(
      { reply: msg.content || "…", profile: snapshot(user), done },
      { headers: NO_STORE }
    );
  }

  user = await User.findById(user._id);
  return NextResponse.json(
    { reply: done ? "You're all set!" : "Noted — and could you repeat that last part once more?", profile: snapshot(user), done },
    { headers: NO_STORE }
  );
}
