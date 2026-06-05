// src/app/api/newsletter/unsubscribe/route.ts
//
// One-click unsubscribe. GET renders a small confirmation page (the link in the
// email footer); POST satisfies RFC 8058 List-Unsubscribe-Post=One-Click for
// Gmail/Yahoo bulk-sender compliance. Both look the subscriber up by their
// unique unsubscribeToken — no auth needed, the token IS the credential.
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import NewsletterSubscriber from "@/models/NewsletterSubscriber";

export const dynamic = "force-dynamic";

async function unsubscribeByToken(token: string | null): Promise<boolean> {
  if (!token) return false;
  try {
    await dbConnect();
    const sub = await NewsletterSubscriber.findOne({ unsubscribeToken: token });
    if (!sub) return false;
    if (sub.status !== "unsubscribed") {
      sub.status = "unsubscribed";
      sub.unsubscribedAt = new Date();
      await sub.save();
    }
    return true;
  } catch (err) {
    console.error("[newsletter/unsubscribe]", err);
    return false;
  }
}

export async function GET(request: NextRequest) {
  const token = new URL(request.url).searchParams.get("token");
  const ok = await unsubscribeByToken(token);

  const html = `<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${ok ? "Unsubscribed" : "Link not found"}</title>
<style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:#000;color:#fff;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0}
.box{max-width:440px;padding:2rem;text-align:center;line-height:1.5}h1{font-size:1.5rem;margin:0 0 .75rem}p{color:#a3a3a3}a{color:#10b981;text-decoration:none}</style>
</head><body><div class="box">
<h1>${ok ? "You're unsubscribed" : "Link not found"}</h1>
<p>${
    ok
      ? "You won't receive any more newsletter emails. You can re-subscribe anytime from the site."
      : "This unsubscribe link is invalid or has already been used."
  }</p>
<p><a href="/">Return to the site</a></p>
</div></body></html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

// RFC 8058 one-click unsubscribe (List-Unsubscribe-Post). Mail clients POST here.
export async function POST(request: NextRequest) {
  const token = new URL(request.url).searchParams.get("token");
  await unsubscribeByToken(token);
  return new NextResponse(null, {
    status: 204,
    headers: { "Cache-Control": "no-store" },
  });
}
