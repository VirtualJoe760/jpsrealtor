// GET /api/crm/contacts/[id]/activity
// What a contact has looked at on the signed-in agent's own sites: pages,
// time on each, visits. Scoped twice — the contact must belong to the agent,
// and only PageView rows whose host the agent owns are counted, so an agent
// never sees the same person's browsing on another agent's site.
//
// A contact is tied to a site account by linkedUserId (set at signup by
// linkUserToAgent); older contacts fall back to an account with the same email.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import Contact from "@/models/Contact";
import User from "@/models/User";
import { summarizeVisitorActivity } from "@/lib/visitor-activity";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE });
  }
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: "Invalid contact" }, { status: 400, headers: NO_STORE });
  }

  await dbConnect();
  const contact: any = await Contact.findOne({ _id: id, userId: session.user.id })
    .select("linkedUserId email emails")
    .lean();
  if (!contact) return NextResponse.json({ error: "Not found" }, { status: 404, headers: NO_STORE });

  let visitorId: string | null = contact.linkedUserId ? String(contact.linkedUserId) : null;
  if (!visitorId) {
    const emails = [contact.email, ...(contact.emails || []).map((e: any) => e?.address)]
      .filter((e): e is string => typeof e === "string" && e.length > 0)
      .map((e) => e.toLowerCase());
    if (emails.length) {
      const u: any = await User.findOne({ email: { $in: emails } }).select("_id").lean();
      visitorId = u ? String(u._id) : null;
    }
  }

  if (!visitorId) {
    return NextResponse.json({ linked: false, activity: null }, { headers: NO_STORE });
  }

  const visitor: any = await User.findById(visitorId).select("signupOrigin").lean();
  const signedUpHere = String(visitor?.signupOrigin?.agentId || "") === session.user.id;
  const activity = await summarizeVisitorActivity({ userId: visitorId, agentId: session.user.id });
  return NextResponse.json(
    {
      linked: true,
      signedUpOnYourSite: signedUpHere,
      signupDomain: signedUpHere ? visitor?.signupOrigin?.domain || null : null,
      activity,
    },
    { headers: NO_STORE }
  );
}
