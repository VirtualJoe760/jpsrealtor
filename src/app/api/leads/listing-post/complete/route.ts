// GET /api/leads/listing-post/complete
//
// Step 2 of registering with Google or Facebook. NextAuth has created (or found)
// the account and redirected here; this does the half OAuth cannot:
//
//   1. upsert the Contact in the POST AUTHOR's CRM, status "client"
//   2. record the consent captured BEFORE the redirect (text, date, IP)
//   3. mint the lp_access cookie so the gated half unlocks
//   4. send them back to the post
//
// Requires a session, so the default-deny API gate in src/proxy.ts is the auth
// check — by the time the provider bounces here, the session exists.
//
// Why a separate route and not the signIn callback in lib/auth.ts: that callback
// runs for every sign-in on the platform. Teaching it about listing posts would
// put CRM writes in the path of every agent and admin login. This runs only when
// a pending registration cookie is present.

import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import Article from "@/models/article";
import User from "@/models/User";
import Contact from "@/models/Contact";
import { notifyAgentLead } from "@/lib/messaging/notify-agent";
import {
  LP_PENDING_COOKIE,
  verifyPending,
} from "@/lib/listings/listing-post-pending";
import { setAccessCookie } from "@/lib/listings/listing-post-access";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const home = new URL("/", req.url);

  try {
    const pending = verifyPending(req.cookies.get(LP_PENDING_COOKIE)?.value);
    // No pending registration: nothing was agreed to, so nothing is written.
    // Someone hitting this URL directly just goes home.
    if (!pending) return NextResponse.redirect(home);

    const session = await getServerSession(authOptions);
    const email = session?.user?.email?.toLowerCase();
    if (!email) return NextResponse.redirect(home);

    await dbConnect();

    const post: any = await Article.findOne({ slug: pending.slug, category: "listing-post" })
      .select("slug title author.id listingPost")
      .lean();
    // The signed cookie already proves which agent this was for; re-reading the
    // post means a tampered-with agentId cannot redirect a contact into someone
    // else's CRM even if the signing key ever leaked.
    if (!post?.author?.id || String(post.author.id) !== pending.agentId) {
      return NextResponse.redirect(home);
    }

    const lp = post.listingPost || {};
    const postUrl = new URL(`/insights/listing-post/${post.slug}`, req.url);
    const isOpenHouse = lp.postType === "open-house";
    const now = new Date();

    const user: any = await User.findOne({ email }).select("_id name").lean();
    const fullName = session?.user?.name || user?.name || email.split("@")[0];
    const [firstName, ...rest] = String(fullName).trim().split(/\s+/);

    const tags = [
      "Web Generated Leads",
      isOpenHouse ? "Open House RSVP" : "Listing Post",
      lp.address,
      pending.wantsComps ? "Requested Sold Comps" : null,
    ].filter(Boolean) as string[];

    const noteLine =
      `${now.toISOString().slice(0, 10)}: ${isOpenHouse ? "Open house registration" : "Listing post registration"} ` +
      `— ${lp.address || lp.listingKey} via social sign-in` +
      `${pending.openHouseChoice ? ` (${pending.openHouseChoice})` : ""}. ` +
      `${pending.consentText} From ${pending.consentIp}.`;

    let contact: any = await Contact.findOne({
      userId: post.author.id,
      $or: [{ "emails.address": email }, { email }],
    });

    if (contact) {
      contact.tags = Array.from(new Set([...(contact.tags || []), ...tags]));
      if (contact.status === "uncontacted" || contact.status === "contacted") {
        contact.status = "client";
      }
      contact.consent = {
        ...(contact.consent?.toObject?.() || contact.consent || {}),
        marketingConsent: true,
        // OAuth hands us no phone number, so no call/text consent was given or
        // could have been. Whatever the contact already had stands.
        consentDate: now,
        consentIp: pending.consentIp,
      };
      contact.noteHistory = [...(contact.noteHistory || []), { content: noteLine, createdAt: now }];
      await contact.save();
    } else {
      contact = await Contact.create({
        userId: post.author.id,
        firstName: firstName || email.split("@")[0],
        lastName: rest.join(" "),
        email,
        emails: [{ address: email, label: "personal", isPrimary: true, isValid: true }],
        phones: [],
        source: "website",
        status: "client",
        tags,
        interests: { buying: true, locations: [lp.address].filter(Boolean) },
        preferences: { emailOptIn: true, smsOptIn: false, callOptIn: false, preferredContactMethod: "email" },
        consent: { marketingConsent: true, tcpaConsent: false, consentDate: now, consentIp: pending.consentIp },
        notes: noteLine,
      });
    }

    if (!contact.linkedUserId && user?._id) {
      await Contact.updateOne(
        { _id: contact._id },
        { $set: { linkedUserId: new mongoose.Types.ObjectId(String(user._id)) } }
      );
    }

    notifyAgentLead({
      agentId: String(post.author.id),
      kind: "new_lead",
      leadName: String(fullName),
      detail: [isOpenHouse ? "Open house RSVP" : "Listing post", lp.address, "social sign-in"]
        .filter(Boolean)
        .join(" • "),
    }).catch(() => {});

    const res = NextResponse.redirect(postUrl);
    setAccessCookie(res, String(post.author.id), String(contact._id), post.slug);
    // Single use: a stale pending cookie must not re-register them on the next
    // sign-in from this browser.
    res.cookies.delete(LP_PENDING_COOKIE);
    return res;
  } catch (err) {
    console.error("[leads/listing-post/complete] Error:", err);
    return NextResponse.redirect(home);
  }
}
