// src/app/api/site-setup/[id]/intake/route.ts
// PUT — the agent's intake form for a paid setup (style, service areas, logo,
// example sites). Editable until the build starts; first submit notifies admin.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import SiteSetupOrder from "@/models/SiteSetupOrder";
import { serializeOrder } from "@/lib/site-setup";
import { sendSiteSetupAdminNotification } from "@/lib/site-setup-emails";
import { SITE_SETUP_STYLES } from "@/config/site-setup";

export const dynamic = "force-dynamic";

const str = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "");
const list = (v: unknown, max: number, n: number) =>
  (Array.isArray(v) ? v : typeof v === "string" ? v.split(/[\n,]/) : [])
    .map((x) => str(x, n))
    .filter(Boolean)
    .slice(0, max);

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await dbConnect();
  const user = await User.findOne({ email: session.user.email }).select("_id name email").lean<any>();
  const order = user ? await SiteSetupOrder.findOne({ _id: id, agentId: user._id }) : null;
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!["intake_pending", "intake_received"].includes(order.status)) {
    return NextResponse.json({ error: "This setup can no longer be edited here — reply to our email with changes." }, { status: 409 });
  }

  const body = await request.json().catch(() => ({}));
  const style = str(body.style, 40);
  if (style && !SITE_SETUP_STYLES.some((s) => s.id === style)) {
    return NextResponse.json({ error: "Unknown style" }, { status: 400 });
  }
  const serviceAreas = list(body.serviceAreas, 30, 80);
  if (!style || serviceAreas.length === 0) {
    return NextResponse.json({ error: "Pick a style and at least one service area." }, { status: 400 });
  }
  const logoUrl = str(body.logoUrl, 500);
  if (logoUrl && !/^https:\/\//i.test(logoUrl)) return NextResponse.json({ error: "Logo must be an uploaded image" }, { status: 400 });
  const exampleSites = list(body.exampleSites, 10, 300).filter((u) => /^https?:\/\/\S+\.\S+/i.test(u) || /^[\w-]+(\.[\w-]+)+/.test(u));

  const firstSubmit = order.status === "intake_pending";
  const now = new Date();
  order.intake = {
    style,
    styleNotes: str(body.styleNotes, 1000) || undefined,
    serviceAreas,
    logoUrl: logoUrl || undefined,
    exampleSites,
    colors: str(body.colors, 200) || undefined,
    notes: str(body.notes, 3000) || undefined,
    submittedAt: now,
  };
  if (firstSubmit) {
    order.status = "intake_received";
    order.history.push({ status: "intake_received", at: now, by: "agent" });
  }
  await order.save();

  if (firstSubmit) sendSiteSetupAdminNotification(user.name || user.email, user.email, "intake").catch(() => {});
  return NextResponse.json({ success: true, order: serializeOrder(order) });
}
