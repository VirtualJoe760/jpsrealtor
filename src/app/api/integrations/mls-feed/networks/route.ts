// src/app/api/integrations/mls-feed/networks/route.ts
//
// Which associations (data networks) the agent's stored MLS key reaches, and
// which of them their site should use.
//
// POST → re-discover from the MLS with the STORED key (decrypted server-side;
//        never returned) and cache the list + counts on the record.
// PUT  → save the pick: { networks: string[] }. Names must come from the last
//        discovery. Empty = everything the key reaches (RESO_NETWORKS semantics).
//
// The cached list and the pick come back in GET /api/integrations/mls-feed.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { refreshMlsNetworks, setMlsNetworks } from "@/lib/mls-feed";

// One request per association plus one count each. A key reaching many
// networks can outrun the default function timeout.
export const maxDuration = 60;

const NO_STORE = { "Cache-Control": "no-store" };

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE });
  }
  const { result, status } = await refreshMlsNetworks(session.user.id);
  if ("reason" in result) {
    return NextResponse.json({ ...status, ...result }, { headers: NO_STORE });
  }
  return NextResponse.json({ ...status, ok: true, capped: result.capped }, { headers: NO_STORE });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE });
  }
  let body: { networks?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400, headers: NO_STORE });
  }
  const picked = body?.networks;
  if (
    !Array.isArray(picked) ||
    picked.length > 50 ||
    picked.some((n) => typeof n !== "string" || n.length === 0 || n.length > 200)
  ) {
    return NextResponse.json({ ok: false, message: "networks must be a list of association names." }, { status: 400, headers: NO_STORE });
  }
  const saved = await setMlsNetworks(session.user.id, picked as string[]);
  if ("error" in saved) {
    return NextResponse.json({ ok: false, message: saved.error }, { status: 400, headers: NO_STORE });
  }
  return NextResponse.json({ ...saved, ok: true }, { headers: NO_STORE });
}
