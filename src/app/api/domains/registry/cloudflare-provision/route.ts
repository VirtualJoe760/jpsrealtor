// src/app/api/domains/registry/cloudflare-provision/route.ts
// Admin API to provision domains on Cloudflare with the same caching setup as jpsrealtor.com
//
// POST /api/domains/registry/cloudflare-provision
//   { domain: "specific-domain.com" }       — provision one domain
//   { all: true }                           — provision all unregistered domains
//   { domain: "example.com", dryRun: true } — preview what would happen

import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import dbConnect from "@/lib/mongoose";
import {
  provisionCloudflareForDomain,
  provisionAllUnregisteredDomains,
} from "@/lib/domain-registry/cloudflare-provision";

export async function POST(req: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin.authorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await dbConnect();

  const body = await req.json();

  // Bulk provision all unregistered domains
  if (body.all) {
    try {
      const results = await provisionAllUnregisteredDomains();
      return NextResponse.json({
        message: `Provisioned ${results.succeeded}/${results.total} domains on Cloudflare`,
        ...results,
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

  // Single domain provision
  if (!body.domain) {
    return NextResponse.json(
      { error: "Provide { domain } for single provision or { all: true } for bulk" },
      { status: 400 }
    );
  }

  try {
    const result = await provisionCloudflareForDomain(body.domain, {
      dryRun: body.dryRun,
      skipWorkerRoutes: body.skipWorkerRoutes,
      skipPageRules: body.skipPageRules,
    });

    return NextResponse.json({
      message: result.success
        ? `${body.domain} provisioned on Cloudflare`
        : `${body.domain} provisioning failed`,
      result,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
