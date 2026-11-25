import { timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { sendPostcardScanAlert } from '@/lib/email-resend';
import { getScannedMailPiece } from '@/lib/thanksio';

export async function POST(req: NextRequest) {
  const secret = process.env.THANKSIO_SCAN_WEBHOOK_SECRET;
  const email = process.env.THANKSIO_SCAN_ALERT_EMAIL;
  if (!secret || !email) return new NextResponse(null, { status: 503 });

  const token = Buffer.from(req.nextUrl.searchParams.get('token') ?? '');
  const expected = Buffer.from(secret);
  if (token.length !== expected.length || !timingSafeEqual(token, expected)) {
    return new NextResponse(null, { status: 401 });
  }

  const event = await req.json().catch(() => null);
  const orderId = event?.data?.['order.id'];
  const itemId = event?.data?.['order_item.id'];
  const scans = event?.data?.['order_item.scans'];
  const orders = (process.env.THANKSIO_SCAN_ALERT_ORDER_IDS ?? '').split(',').map(id => id.trim());
  if (
    event?.event_type !== 'scans.scan_update' ||
    !Number.isSafeInteger(orderId) || !orders.includes(String(orderId)) ||
    !Number.isSafeInteger(itemId) || itemId <= 0 ||
    !Number.isSafeInteger(scans) || scans <= 0
  ) {
    return new NextResponse(null, { status: 204 });
  }

  try {
    const piece = await getScannedMailPiece(orderId, itemId, scans);
    if (!piece) return new NextResponse(null, { status: 204 });
    const timestamp = event?.timestamp;
    const scannedAt = Number.isSafeInteger(timestamp) && timestamp > 0 && timestamp < 8.64e12
      ? new Date(timestamp * 1000)
      : undefined;
    await sendPostcardScanAlert(email, orderId, itemId, scans, piece, scannedAt);
    return new NextResponse(null, { status: 204 });
  } catch {
    console.error('[thanksio scan] Could not verify or send scan alert', { orderId, itemId, scans });
    return new NextResponse(null, { status: 502 });
  }
}
