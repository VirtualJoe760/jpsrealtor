// src/app/api/fub/sync/route.ts
// POST: Manually trigger FUB lead sync from the agent dashboard

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import Contact from "@/models/Contact";
import { FubClient } from "@/lib/services/fub-client";
import { mapFubPersonToContact } from "@/lib/services/fub-mapper";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const user = await User.findOne({ email: session.user.email }).select("_id roles").lean();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!user.roles?.includes("realEstateAgent")) {
      return NextResponse.json({ error: "Agent role required" }, { status: 403 });
    }

    const fubApiKey = process.env.FUB_API_KEY;
    if (!fubApiKey) {
      return NextResponse.json({ error: "FUB_API_KEY not configured" }, { status: 500 });
    }

    const agentId = parseInt(process.env.FUB_AGENT_ID || "31", 10);
    const userId = user._id.toString();

    // Parse request body for options
    let fullSync = false;
    try {
      const body = await request.json();
      fullSync = body?.full === true;
    } catch {
      // No body or invalid JSON — default to incremental
    }

    // Get last sync time for incremental
    let lastActivityAfter: string | undefined;
    if (!fullSync) {
      const lastSynced = await Contact.findOne(
        { userId: user._id, source: "followupboss" },
        { fubSyncedAt: 1 },
        { sort: { fubSyncedAt: -1 } }
      ).lean();

      if (lastSynced?.fubSyncedAt) {
        lastActivityAfter = new Date(lastSynced.fubSyncedAt).toISOString();
      }
    }

    // Fetch from FUB
    const client = new FubClient(fubApiKey);
    const people = await client.getAllPeople({
      assignedUserId: agentId,
      lastActivityAfter,
      sort: "updated",
    });

    if (people.length === 0) {
      return NextResponse.json({
        success: true,
        synced: 0,
        created: 0,
        updated: 0,
        message: "No new leads to sync",
      });
    }

    // Map and upsert
    let created = 0;
    let updated = 0;
    let errors = 0;

    const bulkOps = [];

    for (const person of people) {
      try {
        const doc = mapFubPersonToContact(person, userId);
        const fubId = doc.fubId;
        delete doc.fubId; // Remove from $set, put in filter

        bulkOps.push({
          updateOne: {
            filter: { userId: user._id, fubId },
            update: {
              $set: { ...doc, fubId },
              $setOnInsert: {
                importedAt: new Date(),
                createdAt: new Date(),
              },
            },
            upsert: true,
          },
        });
      } catch (err) {
        errors++;
        console.error(`[fub-sync] Error mapping fubId=${person.id}:`, err);
      }
    }

    if (bulkOps.length > 0) {
      const result = await Contact.bulkWrite(bulkOps, { ordered: false });
      created = result.upsertedCount;
      updated = result.modifiedCount;
    }

    console.log(
      `[fub-sync] Manual sync: ${people.length} fetched, ${created} created, ${updated} updated, ${errors} errors`
    );

    return NextResponse.json({
      success: true,
      synced: people.length,
      created,
      updated,
      errors,
    });
  } catch (error: any) {
    console.error("[fub-sync] Error:", error);
    return NextResponse.json(
      { error: "Sync failed", details: error.message },
      { status: 500 }
    );
  }
}
