// GET /api/agent/application-status — where the signed-in user is in agent
// onboarding (apply → pay → verify ID → admin confirms → site live).
// Read by the application page and the dashboard's onboarding card.
// (/api/user/profile returns neither roles nor the application.)

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await dbConnect();
  const u = await User.findOne({ email: session.user.email })
    .select("roles isAdmin agentApplication agentProfile.grandfathered agentProfile.mlsMembership agentProfile.siteForceActive")
    .lean<any>();
  if (!u) return NextResponse.json({ error: "User not found" }, { status: 404 });
  const app = u.agentApplication || {};
  const m = u.agentProfile?.mlsMembership || {};
  return NextResponse.json(
    {
      isAgent: (u.roles || []).includes("realEstateAgent"),
      isAdmin: !!(u.isAdmin || (u.roles || []).includes("admin")),
      grandfathered: !!u.agentProfile?.grandfathered,
      phase: app.phase || null,
      identityStatus: app.identityStatus || null,
      siteApproved: !!app.siteApprovedAt || !!u.agentProfile?.siteForceActive,
      application: {
        licenseNumber: app.licenseNumber || "",
        licenseState: app.licenseState || "",
        brokerageName: app.brokerageName || "",
      },
      mls: {
        associationName: m.associationName || app.mlsAssociation || "",
        mlsId: m.mlsId || app.mlsId || "",
        contactName: m.contactName || "",
        contactPhone: m.contactPhone || "",
        contactEmail: m.contactEmail || "",
        website: m.website || "",
      },
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
