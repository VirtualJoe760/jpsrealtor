// src/app/api/domains/registry/check-nameservers/route.ts
// Poll Cloudflare to check if nameservers have been updated at the registrar.
// When zone status changes to "active", marks nameserversUpdated = true.
//
// POST /api/domains/registry/check-nameservers
//   { registryId: "..." }  — check one domain
//   { all: true }          — check all pending domains

import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import dbConnect from "@/lib/mongoose";
import DomainRegistry from "@/models/DomainRegistry";
import { checkZoneStatus } from "@/lib/cloudflare";

export async function POST(req: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin.authorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await dbConnect();

  const body = await req.json();

  // Check all pending domains
  if (body.all) {
    const pending = await DomainRegistry.find({
      "cloudflare.registered": true,
      "cloudflare.nameserversUpdated": { $ne: true },
      "cloudflare.zoneId": { $exists: true, $ne: null },
    });

    const results: Array<{ domain: string; status: string; active: boolean }> = [];

    for (const record of pending) {
      try {
        const zoneStatus = await checkZoneStatus(record.cloudflare.zoneId!);
        const isActive = zoneStatus.status === "active";

        record.cloudflare.status = zoneStatus.status;
        record.cloudflare.nameserverCheckedAt = new Date();
        if (isActive) {
          record.cloudflare.nameserversUpdated = true;
        }
        record.markModified("cloudflare");
        await record.save();

        results.push({ domain: record.domain, status: zoneStatus.status, active: isActive });
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        results.push({ domain: record.domain, status: `error: ${msg}`, active: false });
      }
    }

    const activated = results.filter((r) => r.active).length;
    return NextResponse.json({
      message: `Checked ${results.length} domains. ${activated} now active.`,
      results,
    });
  }

  // Check single domain
  const { registryId } = body;
  if (!registryId) {
    return NextResponse.json(
      { error: "Provide { registryId } or { all: true }" },
      { status: 400 }
    );
  }

  const registry = await DomainRegistry.findById(registryId);
  if (!registry) {
    return NextResponse.json({ error: "Domain not found" }, { status: 404 });
  }

  if (!registry.cloudflare.registered || !registry.cloudflare.zoneId) {
    return NextResponse.json(
      { error: "Domain is not registered on Cloudflare" },
      { status: 400 }
    );
  }

  try {
    const zoneStatus = await checkZoneStatus(registry.cloudflare.zoneId);
    const isActive = zoneStatus.status === "active";

    registry.cloudflare.status = zoneStatus.status;
    registry.cloudflare.nameserverCheckedAt = new Date();
    if (isActive) {
      registry.cloudflare.nameserversUpdated = true;
    }
    registry.markModified("cloudflare");
    await registry.save();

    return NextResponse.json({
      domain: registry.domain,
      cloudflare: {
        status: zoneStatus.status,
        nameservers: zoneStatus.nameservers,
        nameserversUpdated: registry.cloudflare.nameserversUpdated,
        active: isActive,
      },
      message: isActive
        ? `${registry.domain} is active on Cloudflare! Nameservers confirmed.`
        : `${registry.domain} is still pending. Nameservers at registrar need to be updated to: ${zoneStatus.nameservers.join(", ")}`,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
