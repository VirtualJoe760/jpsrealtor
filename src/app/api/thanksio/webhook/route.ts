import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import DirectMailPiece from '@/models/DirectMailPiece';
import Campaign from '@/models/Campaign';
import { validateWebhookSignature, type ThanksioWebhookEvent } from '@/lib/thanksio';

/**
 * POST /api/thanksio/webhook
 *
 * Handles thanks.io webhook events:
 * - order.mailed — mail piece has been sent
 * - order.delivered — mail piece confirmed delivered
 * - order.returned — mail piece returned to sender
 * - qr.scanned — recipient scanned the QR code
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();

    // Validate webhook signature
    const signature = req.headers.get('x-thanksio-signature') || '';
    if (signature && !validateWebhookSignature(rawBody, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event: ThanksioWebhookEvent = JSON.parse(rawBody);

    await connectDB();

    switch (event.event) {
      case 'order.mailed': {
        // Update all pieces for this order to "mailed"
        const mailedResult = await DirectMailPiece.updateMany(
          { thanksioOrderId: event.order_id, status: { $in: ['submitted', 'printing'] } },
          {
            $set: {
              status: 'mailed',
              mailedAt: new Date(),
            },
          }
        );

        // Update campaign stats
        if (mailedResult.modifiedCount > 0) {
          const piece = await DirectMailPiece.findOne({ thanksioOrderId: event.order_id });
          if (piece) {
            await Campaign.findByIdAndUpdate(piece.campaignId, {
              $inc: { 'stats.mailSent': mailedResult.modifiedCount },
            });
          }
        }
        break;
      }

      case 'order.delivered': {
        const deliveredResult = await DirectMailPiece.updateMany(
          { thanksioOrderId: event.order_id, status: { $in: ['submitted', 'printing', 'mailed'] } },
          {
            $set: {
              status: 'delivered',
              deliveredAt: new Date(),
            },
          }
        );

        if (deliveredResult.modifiedCount > 0) {
          const piece = await DirectMailPiece.findOne({ thanksioOrderId: event.order_id });
          if (piece) {
            await Campaign.findByIdAndUpdate(piece.campaignId, {
              $inc: { 'stats.mailDelivered': deliveredResult.modifiedCount },
            });
          }
        }
        break;
      }

      case 'order.returned': {
        await DirectMailPiece.updateMany(
          { thanksioOrderId: event.order_id },
          {
            $set: {
              status: 'returned',
              returnedAt: new Date(),
            },
          }
        );
        break;
      }

      case 'qr.scanned': {
        // QR scan — update the specific piece and increment campaign qrScans
        const scannedPiece = await DirectMailPiece.findOneAndUpdate(
          { thanksioOrderId: event.order_id },
          {
            $set: { qrScannedAt: event.data?.scanned_at ? new Date(event.data.scanned_at) : new Date() },
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
