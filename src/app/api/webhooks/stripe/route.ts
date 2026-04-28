// src/app/api/webhooks/stripe/route.ts
// Stripe subscription webhook handler
// Events: checkout.session.completed, customer.subscription.updated,
//         customer.subscription.deleted, invoice.payment_succeeded,
//         invoice.payment_failed

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import AgentSubscription from "@/models/AgentSubscription";
import { tierFromPriceId } from "@/config/stripe-prices";
import type { SubscriptionTier, SubscriptionStatus, BillingInterval } from "@/models/AgentSubscription";
import PointsLedger, { POINTS_TIERS } from "@/models/PointsLedger";
import type { PointsTier } from "@/models/PointsLedger";
import { sendSubscriptionEmail } from "@/lib/email-resend";

// ---------------------------------------------------------------------------
// Stripe SDK — lazy init (same pattern as stripe-identity webhook)
// ---------------------------------------------------------------------------

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not defined");
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2025-12-15.clover",
  });
}

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Helper: map Stripe subscription status to our model status
// ---------------------------------------------------------------------------

function mapStripeStatus(stripeStatus: string): SubscriptionStatus {
  switch (stripeStatus) {
    case "active":
      return "active";
    case "trialing":
      return "trialing";
    case "past_due":
      return "past_due";
    case "canceled":
    case "cancelled":
    case "unpaid":
    case "incomplete_expired":
      return "cancelled";
    case "paused":
      return "paused";
    default:
      return "active";
  }
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature")!;

  let event: Stripe.Event;

  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[stripe-webhook] Signature verification failed:", message);
    return NextResponse.json(
      { error: "Webhook signature verification failed" },
      { status: 400 }
    );
  }

  await dbConnect();

  try {
    switch (event.type) {
      // -----------------------------------------------------------------
      // Checkout completed — create/activate subscription
      // -----------------------------------------------------------------
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        // Handle points top-up (one-time payment)
        if (session.mode === "payment" && session.metadata?.type === "points_topup") {
          const topupUserId = session.metadata.userId;
          const topupPoints = parseInt(session.metadata.points || "0", 10);
          const topupTier = (session.metadata.tier || "beginner") as PointsTier;
          const topupAmount = parseFloat(session.metadata.amount || "0");

          if (topupUserId && topupPoints > 0) {
            const topupTierConfig = POINTS_TIERS[topupTier];
            let ledger = await PointsLedger.findOne({ userId: topupUserId });
            if (!ledger) {
              ledger = new PointsLedger({
                userId: topupUserId,
                balance: 0,
                totalEarned: 0,
                totalSpent: 0,
                tier: topupTier,
                transactions: [],
              });
            }

            ledger.creditPoints(
              topupPoints,
              "topup_purchase",
              `Credits top-up — ${topupPoints.toLocaleString()} credits ($${topupAmount})`,
              {
                adSpendValue: topupPoints * (topupTierConfig?.adValuePerPoint ?? 0.125),
                stripePaymentIntentId: typeof session.payment_intent === "string"
                  ? session.payment_intent
                  : (session.payment_intent as any)?.id,
              }
            );
            await ledger.save();

            console.log(
              `[stripe-webhook] Top-up: ${topupPoints} points credited to user=${topupUserId} ($${topupAmount})`
            );
          }
          break;
        }

        if (session.mode !== "subscription") break;

        // Handle user Pro subscription (non-agent)
        if (session.metadata?.tier === "pro") {
          const proUserId = session.metadata.userId;
          const proSubId = typeof session.subscription === "string"
            ? session.subscription
            : (session.subscription as Stripe.Subscription)?.id;
          const proCustomerId = typeof session.customer === "string"
            ? session.customer
            : (session.customer as Stripe.Customer)?.id;

          if (proUserId) {
            const proUser = await User.findById(proUserId);
            if (proUser) {
              proUser.subscriptionTier = "pro";
              proUser.subscriptionStatus = "active";
              proUser.stripeSubscriptionId = proSubId;
              proUser.stripeCustomerId = proCustomerId;

              if (proSubId) {
                const s = getStripe();
                const sub = await s.subscriptions.retrieve(proSubId);
                proUser.subscriptionExpiresAt = new Date((sub as any).current_period_end * 1000);
              }

              await proUser.save();

              // Send welcome email
              sendSubscriptionEmail(
                proUser.email,
                proUser.name || "",
                "subscribed",
              ).catch((err) => console.error("[stripe-webhook] Pro subscribe email failed:", err));

              console.log(`[stripe-webhook] User Pro subscription activated: user=${proUserId}`);
            }
          }
          break;
        }

        const userId = session.metadata?.userId;
        const tierMeta = session.metadata?.tier as Exclude<SubscriptionTier, "free"> | undefined;
        const intervalMeta = (session.metadata?.billingInterval || "monthly") as BillingInterval;

        if (!userId) {
          console.error("[stripe-webhook] checkout.session.completed: no userId in metadata");
          break;
        }

        const stripeSubscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : (session.subscription as Stripe.Subscription)?.id;

        const stripeCustomerId =
          typeof session.customer === "string"
            ? session.customer
            : (session.customer as Stripe.Customer)?.id;

        // Retrieve full subscription to get period dates & price
        const stripe = getStripe();
        const stripeSub = await stripe.subscriptions.retrieve(stripeSubscriptionId!);
        const priceId = stripeSub.items.data[0]?.price?.id;
        const mapped = priceId ? tierFromPriceId(priceId) : null;

        const tier: Exclude<SubscriptionTier, "free"> = mapped?.tier ?? tierMeta ?? "beginner";
        const billingInterval: BillingInterval = mapped?.interval ?? intervalMeta;

        // Upsert AgentSubscription
        const subDoc = await AgentSubscription.findOneAndUpdate(
          { agentId: userId },
          {
            $set: {
              tier,
              status: mapStripeStatus(stripeSub.status),
              billingInterval,
              stripeCustomerId,
              stripeSubscriptionId,
              stripePriceId: priceId,
              isTrialing: stripeSub.status === "trialing",
              trialStartDate:
                stripeSub.trial_start
                  ? new Date(stripeSub.trial_start * 1000)
                  : undefined,
              trialEndDate:
                stripeSub.trial_end
                  ? new Date(stripeSub.trial_end * 1000)
                  : undefined,
              startDate: new Date(stripeSub.start_date * 1000),
              currentPeriodStart: new Date((stripeSub.items.data[0]?.current_period_start ?? stripeSub.start_date) * 1000),
              currentPeriodEnd: new Date((stripeSub.items.data[0]?.current_period_end ?? stripeSub.start_date) * 1000),
            },
          },
          { upsert: true, new: true }
        );

        // Sync to User model
        await User.findByIdAndUpdate(userId, {
          $set: {
            subscriptionTier: tier,
            subscriptionStatus: mapStripeStatus(stripeSub.status),
            subscriptionExpiresAt: new Date((stripeSub.items.data[0]?.current_period_end ?? stripeSub.start_date) * 1000),
            stripeSubscriptionId,
          },
        });

        // Credit monthly credits for the subscription tier
        const pointsTier = tier as string as PointsTier;
        const tierConfig = POINTS_TIERS[pointsTier];
        if (tierConfig && tierConfig.monthlyPoints > 0) {
          let ledger = await PointsLedger.findOne({ userId });
          if (!ledger) {
            ledger = new PointsLedger({
              userId,
              balance: 0,
              totalEarned: 0,
              totalSpent: 0,
              tier: pointsTier,
              stripeCustomerId,
              transactions: [],
            });
          } else {
            ledger.tier = pointsTier;
          }

          ledger.creditPoints(
            tierConfig.monthlyPoints,
            "subscription_credit",
            `${tierConfig.name} plan — ${tierConfig.monthlyPoints.toLocaleString()} credits`,
            { adSpendValue: tierConfig.monthlyPoints * tierConfig.adValuePerPoint }
          );
          ledger.lastSubscriptionCredit = new Date();
          await ledger.save();

          console.log(
            `[stripe-webhook] Credited ${tierConfig.monthlyPoints} points to user=${userId} (${tierConfig.name})`
          );
        }

        // Send agent subscription confirmation email
        const subscribedUser = await User.findById(userId).select("email name").lean();
        if (subscribedUser?.email) {
          sendSubscriptionEmail(
            subscribedUser.email,
            subscribedUser.name || "",
            "subscribed",
          ).catch((err) => console.error("[stripe-webhook] Agent subscribe email failed:", err));
        }

        console.log(
          `[stripe-webhook] Subscription created: user=${userId} tier=${tier} sub=${stripeSubscriptionId}`
        );
        break;
      }

      // -----------------------------------------------------------------
      // Subscription updated — sync tier, status, period dates
      // -----------------------------------------------------------------
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.userId;

        if (!userId) {
          console.warn("[stripe-webhook] subscription.updated: no userId in metadata");
          break;
        }

        const priceId = sub.items.data[0]?.price?.id;
        const mapped = priceId ? tierFromPriceId(priceId) : null;
        const status = mapStripeStatus(sub.status);

        const itemPeriodStart = sub.items.data[0]?.current_period_start ?? sub.start_date;
        const itemPeriodEnd = sub.items.data[0]?.current_period_end ?? sub.start_date;

        const updateFields: Record<string, unknown> = {
          status,
          currentPeriodStart: new Date(itemPeriodStart * 1000),
          currentPeriodEnd: new Date(itemPeriodEnd * 1000),
          isTrialing: sub.status === "trialing",
          stripePriceId: priceId,
        };

        if (mapped) {
          updateFields.tier = mapped.tier;
          updateFields.billingInterval = mapped.interval;
        }

        if (sub.cancel_at) {
          updateFields.cancelAt = new Date(sub.cancel_at * 1000);
        } else {
          updateFields.cancelAt = null;
        }

        if (sub.canceled_at) {
          updateFields.cancelledAt = new Date(sub.canceled_at * 1000);
        }

        await AgentSubscription.findOneAndUpdate(
          { stripeSubscriptionId: sub.id },
          { $set: updateFields }
        );

        // Sync to User model
        const userUpdate: Record<string, unknown> = {
          subscriptionStatus: status,
          subscriptionExpiresAt: new Date(itemPeriodEnd * 1000),
        };
        if (mapped) {
          userUpdate.subscriptionTier = mapped.tier;
        }

        await User.findByIdAndUpdate(userId, { $set: userUpdate });

        console.log(
          `[stripe-webhook] Subscription updated: user=${userId} status=${status} tier=${mapped?.tier}`
        );
        break;
      }

      // -----------------------------------------------------------------
      // Subscription deleted — cancel and downgrade to free
      // -----------------------------------------------------------------
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.userId;

        await AgentSubscription.findOneAndUpdate(
          { stripeSubscriptionId: sub.id },
          {
            $set: {
              status: "cancelled",
              cancelledAt: new Date(),
              tier: "free",
            },
          }
        );

        if (userId) {
          await User.findByIdAndUpdate(userId, {
            $set: {
              subscriptionTier: "free",
              subscriptionStatus: "cancelled",
              stripeSubscriptionId: null,
            },
          });
        }

        console.log(
          `[stripe-webhook] Subscription deleted: user=${userId} sub=${sub.id}`
        );
        break;
      }

      // -----------------------------------------------------------------
      // Invoice payment succeeded — log to billing history
      // -----------------------------------------------------------------
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const parentSub = invoice.parent?.subscription_details?.subscription;
        const stripeSubscriptionId =
          typeof parentSub === "string"
            ? parentSub
            : (parentSub as Stripe.Subscription)?.id;

        if (!stripeSubscriptionId) break;

        await AgentSubscription.findOneAndUpdate(
          { stripeSubscriptionId },
          {
            $push: {
              invoices: {
                invoiceId: invoice.id,
                amount: (invoice.amount_paid ?? 0) / 100, // cents → dollars
                currency: (invoice.currency ?? "usd").toUpperCase(),
                status: "paid",
                paidAt: new Date(),
                dueDate: invoice.due_date
                  ? new Date(invoice.due_date * 1000)
                  : new Date(),
                invoiceUrl: invoice.hosted_invoice_url ?? undefined,
              },
            },
          }
        );

        // Credit monthly credits on recurring subscription invoice
        if (stripeSubscriptionId) {
          const subForPoints = await AgentSubscription.findOne({ stripeSubscriptionId }).lean();
          if (subForPoints) {
            const invoiceTier = subForPoints.tier as string as PointsTier;
            const invoiceTierConfig = POINTS_TIERS[invoiceTier];
            if (invoiceTierConfig && invoiceTierConfig.monthlyPoints > 0) {
              const ledger = await PointsLedger.findOne({ userId: subForPoints.agentId });
              if (ledger) {
                // Prevent double-credit: skip if last credit was within 25 days
                const daysSinceLastCredit = ledger.lastSubscriptionCredit
                  ? (Date.now() - new Date(ledger.lastSubscriptionCredit).getTime()) / (1000 * 60 * 60 * 24)
                  : 999;

                if (daysSinceLastCredit > 25) {
                  ledger.creditPoints(
                    invoiceTierConfig.monthlyPoints,
                    "subscription_credit",
                    `${invoiceTierConfig.name} plan renewal — ${invoiceTierConfig.monthlyPoints.toLocaleString()} credits`,
                    { adSpendValue: invoiceTierConfig.monthlyPoints * invoiceTierConfig.adValuePerPoint }
                  );
                  ledger.lastSubscriptionCredit = new Date();
                  await ledger.save();

                  console.log(
                    `[stripe-webhook] Renewal: ${invoiceTierConfig.monthlyPoints} points credited to user=${subForPoints.agentId}`
                  );
                }
              }
            }
          }
        }

        console.log(
          `[stripe-webhook] Invoice paid: ${invoice.id} amount=${(invoice.amount_paid ?? 0) / 100}`
        );
        break;
      }

      // -----------------------------------------------------------------
      // Invoice payment failed — mark past_due, log failure
      // -----------------------------------------------------------------
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const parentSubFailed = invoice.parent?.subscription_details?.subscription;
        const stripeSubscriptionId =
          typeof parentSubFailed === "string"
            ? parentSubFailed
            : (parentSubFailed as Stripe.Subscription)?.id;

        if (!stripeSubscriptionId) break;

        await AgentSubscription.findOneAndUpdate(
          { stripeSubscriptionId },
          {
            $set: { status: "past_due" },
            $push: {
              paymentFailures: {
                attemptedAt: new Date(),
                amount: (invoice.amount_due ?? 0) / 100,
                reason:
                  invoice.last_finalization_error?.message ??
                  "Payment failed",
                resolved: false,
              },
              invoices: {
                invoiceId: invoice.id,
                amount: (invoice.amount_due ?? 0) / 100,
                currency: (invoice.currency ?? "usd").toUpperCase(),
                status: "failed",
                dueDate: invoice.due_date
                  ? new Date(invoice.due_date * 1000)
                  : new Date(),
                invoiceUrl: invoice.hosted_invoice_url ?? undefined,
              },
            },
          }
        );

        // Sync past_due to User
        const subDoc = await AgentSubscription.findOne({ stripeSubscriptionId });
        if (subDoc?.agentId) {
          await User.findByIdAndUpdate(subDoc.agentId, {
            $set: { subscriptionStatus: "past_due" },
          });
        }

        console.error(
          `[stripe-webhook] Payment failed: invoice=${invoice.id} sub=${stripeSubscriptionId}`
        );
        break;
      }

      default:
        // Unhandled event type — log and acknowledge
        console.log(`[stripe-webhook] Unhandled event type: ${event.type}`);
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`[stripe-webhook] Error processing ${event.type}:`, message);
    // Return 200 to prevent Stripe from retrying indefinitely on app errors.
    // The error is logged for investigation.
    return NextResponse.json({ received: true, error: message }, { status: 200 });
  }

  return NextResponse.json({ received: true });
}
