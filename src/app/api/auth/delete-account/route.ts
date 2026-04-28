// src/app/api/auth/delete-account/route.ts
// DELETE: Permanently delete user account with password confirmation

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-12-15.clover",
});

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { password } = await request.json();

    if (!password) {
      return NextResponse.json({ error: "Password required to delete account" }, { status: 400 });
    }

    await dbConnect();

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify password (OAuth users without password can't delete this way)
    if (!user.password) {
      return NextResponse.json(
        { error: "OAuth accounts must be deleted by contacting support" },
        { status: 400 }
      );
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return NextResponse.json({ error: "Incorrect password" }, { status: 403 });
    }

    // Cancel any active Stripe subscriptions
    if (user.stripeSubscriptionId) {
      try {
        await stripe.subscriptions.cancel(user.stripeSubscriptionId);
        console.log(`[delete-account] Cancelled Stripe subscription: ${user.stripeSubscriptionId}`);
      } catch (err) {
        console.error("[delete-account] Stripe cancel failed:", err);
      }
    }

    // Delete the user
    await User.findByIdAndDelete(user._id);

    console.log(`[delete-account] Account deleted: ${session.user.email}`);

    return NextResponse.json({
      success: true,
      message: "Account deleted successfully",
    });
  } catch (error: any) {
    console.error("[delete-account] Error:", error);
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
  }
}
