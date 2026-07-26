// src/lib/crm/mirror-to-owner.ts
//
// THE BRIDGE between the tenant's database and the agent's dashboard.
//
// Tenant sites write visitors into the tenant's own Neon Postgres `contact`
// table ("THE DATABASE IS THE AGENT" — see upsert-contact-from-signup.ts).
// But the agent's Contacts dashboard and every MCP contact-read tool query the
// MONGO `Contact` collection scoped by `userId`. Two stores, and until now no
// bridge — so a real signup on a tenant site landed in Postgres and was
// invisible to the agent forever.
//
// This mirrors the same visitor into Mongo under the OWNING AGENT's userId
// (available on every /api/skill route because the crt_live token IS that
// agent's authority) and drops an entry in their activity feed.
//
// Deliberately best-effort and non-blocking: a CRM mirror must never fail a
// visitor's signup. Every path swallows its error and logs.

import mongoose from "mongoose";
import dbConnect from "@/lib/mongoose";
import Contact from "@/models/Contact";
import AgentActivity, { type AgentActivityType } from "@/models/AgentActivity";

export interface MirrorInput {
  /** The agent who owns the tenant site (auth.user._id on skill routes). */
  agentId: mongoose.Types.ObjectId | string;
  email: string;
  name?: string | null;
  phone?: string | null;
  /** Tenant-Postgres end_user id, stored for cross-referencing. */
  endUserId?: string | null;
  /** e.g. "chatrealty-site", "contact-page". */
  source?: string | null;
  tags?: string[];
  /** Feed classification — what the agent should read in their stream. */
  activityType: AgentActivityType;
}

function splitName(name: string | null | undefined, email: string) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || email.split("@")[0],
    lastName: parts.slice(1).join(" ") || "",
  };
}

/**
 * Mirror a tenant-site visitor into the owning agent's Mongo CRM, and log the
 * event to their activity feed. Returns the Mongo contact id when one was
 * created or matched, else null. NEVER throws.
 */
export async function mirrorContactToOwner(
  input: MirrorInput
): Promise<{ contactId: string | null; created: boolean }> {
  const email = (input.email || "").trim().toLowerCase();
  if (!email || !input.agentId) return { contactId: null, created: false };

  try {
    await dbConnect();
    const agentObjectId =
      typeof input.agentId === "string"
        ? new mongoose.Types.ObjectId(input.agentId)
        : input.agentId;

    // Dedup on the agent's own book: same agent + same email.
    let contact = await Contact.findOne({
      userId: agentObjectId,
      $or: [{ "emails.address": email }, { email }],
    });

    let created = false;

    if (!contact) {
      const { firstName, lastName } = splitName(input.name, email);
      contact = await Contact.create({
        userId: agentObjectId,
        firstName,
        lastName,
        emails: [{ address: email, label: "personal", isPrimary: true, isValid: true }],
        phones: input.phone
          ? [{ number: input.phone, label: "mobile", isPrimary: true, isValid: true }]
          : [],
        email,
        phone: input.phone || undefined,
        source: "website",
        status: "uncontacted",
        tags: input.tags?.length ? input.tags : ["Website Signup"],
        isPersonal: false,
        labels: [],
        notes: `Auto-created from ${input.source || "your website"}`,
      });
      created = true;
    } else if (input.phone && !contact.phone) {
      // Enrich an existing record rather than duplicating it.
      contact.phone = input.phone;
      await contact.save();
    }

    await logAgentActivity({
      agentId: agentObjectId,
      type: input.activityType,
      title: activityTitle(input.activityType, input.name, email),
      detail: email,
      contactId: contact?._id as mongoose.Types.ObjectId,
      endUserId: input.endUserId || undefined,
      source: input.source || undefined,
    });

    return { contactId: contact ? String(contact._id) : null, created };
  } catch (err) {
    console.error("[mirror-to-owner] failed (non-blocking):", err);
    return { contactId: null, created: false };
  }
}

function activityTitle(
  type: AgentActivityType,
  name: string | null | undefined,
  email: string
): string {
  const who = (name || "").trim() || email;
  switch (type) {
    case "signup":
      return `${who} created an account`;
    case "signin":
      return `${who} signed in`;
    case "lead":
      return `New lead from ${who}`;
    case "favorite":
      return `${who} saved a home`;
    default:
      return `${who} submitted a form`;
  }
}

/** Fire-and-forget feed entry. NEVER throws. */
export async function logAgentActivity(entry: {
  agentId: mongoose.Types.ObjectId | string;
  type: AgentActivityType;
  title: string;
  detail?: string;
  contactId?: mongoose.Types.ObjectId;
  endUserId?: string;
  listingKey?: string;
  source?: string;
}): Promise<void> {
  try {
    await dbConnect();
    await AgentActivity.create({
      ...entry,
      agentId:
        typeof entry.agentId === "string"
          ? new mongoose.Types.ObjectId(entry.agentId)
          : entry.agentId,
    });
  } catch (err) {
    console.error("[agent-activity] log failed (non-blocking):", err);
  }
}
