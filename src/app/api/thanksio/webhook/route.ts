import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import DirectMailPiece from '@/models/DirectMailPiece';
import Campaign from '@/models/Campaign';
/**
 * POST /api/thanksio/webhook
 *
 * Handles thanks.io webhook events:
 * - order_item.delivered — mail piece confirmed delivered
 * - order_item.status_update — mail piece status change
 * - order.status_update — batch order status change
 * - scans.scan_update — recipient scanned QR code
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();

    // Validate webhook — check for a shared secret in query param or header
    // Thanks.io allows configuring a webhook URL with a secret token
    const webhookSecret = process.env.THANKSIO_WEBHOOK_SECRET;
    if (webhookSecret) {
      const url = new URL(req.url);
      const tokenParam = url.searchParams.get('token');
      const tokenHeader = req.headers.get('x-webhook-secret');
      if (tokenParam !== webhookSecret && tokenHeader !== webhookSecret) {
        return NextResponse.json({ error: 'Invalid webhook token' }, { status: 401 });
      }
    }

    const event = JSON.parse(rawBody);

    await connectDB();

    // Extract order ID from various event payload formats
    const orderId = event.order_id || event.data?.order_id || event.id;

    switch (event.event) {
      case 'order_item.status_update':
      case 'order.status_update': {
        // Generic status update — update pieces based on new status
        const newStatus = event.data?.status || event.status;
        if (newStatus === 'mailed' || newStatus === 'in_transit') {
          const mailedResult = await DirectMailPiece.updateMany(
            { thanksioOrderId: String(orderId), status: { $in: ['submitted', 'printing'] } },
            { $set: { status: 'mailed', mailedAt: new Date() } }
          );
          if (mailedResult.modifiedCount > 0) {
            const piece = await DirectMailPiece.findOne({ thanksioOrderId: String(orderId) });
            if (piece) {
              await Campaign.findByIdAndUpdate(piece.campaignId, {
                $inc: { 'stats.mailSent': mailedResult.modifiedCount },
              });
            }
          }
        }
        break;
      }

      case 'order_item.delivered': {
        const deliveredResult = await DirectMailPiece.updateMany(
          { thanksioOrderId: String(orderId), status: { $in: ['submitted', 'printing', 'mailed'] } },
          { $set: { status: 'delivered', deliveredAt: new Date() } }
        );
        if (deliveredResult.modifiedCount > 0) {
          const piece = await DirectMailPiece.findOne({ thanksioOrderId: String(orderId) });
          if (piece) {
            await Campaign.findByIdAndUpdate(piece.campaignId, {
              $inc: { 'stats.mailDelivered': deliveredResult.modifiedCount },
            });
          }
        }
        break;
      }

      case 'scans.scan_update': {
        const scannedPiece = await DirectMailPiece.findOneAndUpdate(
          { thanksioOrderId: String(orderId) },
          {
            $set: { qrScannedAt: new Date() },
            $inc: { qrScanCount: 1 },
          },
          { new: true }
        );
        if (scannedPiece) {
          await Campaign.findByIdAndUpdate(scannedPiece.campaignId, {
            $inc: { 'stats.qrScans': 1 },
          });
        }
        break;
      }

      default:
        console.log(`[thanksio webhook] Unknown event type: ${(event as any).event}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[thanksio webhook] Error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
