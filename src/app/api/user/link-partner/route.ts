// src/app/api/user/link-partner/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import User, { IUser } from "@/models/user";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { partnerEmail } = body;

    if (!partnerEmail) {
      return NextResponse.json(
        { error: "Partner email is required" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Find current user
    const user: IUser | null = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Find partner
    const partner: IUser | null = await User.findOne({ email: partnerEmail.toLowerCase() });
    if (!partner) {
      return NextResponse.json(
        { error: "Partner account not found" },
        { status: 404 }
      );
    }

    // Can't link to self
    if (user._id.toString() === partner._id.toString()) {
      return NextResponse.json(
        { error: "Cannot link to your own account" },
        { status: 400 }
      );
    }

    // Link both accounts
    user.significantOther = partner._id;
    partner.significantOther = user._id;

    await user.save();
    await partner.save();

    return NextResponse.json({
      success: true,
      message: "Accounts linked successfully",
      partner: {
        name: partner.name,
        email: partner.email,
      },
    });
  } catch (error) {
    console.error("Error linking partner:", error);
    return NextResponse.json(
      { error: "Failed to link partner" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    await dbConnect();

    // Find current user
    const user: IUser | null = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // If there's a linked partner, unlink them too
    if (user.significantOther) {
      const partner = await User.findById(user.significantOther);
      if (partner) {
        partner.significantOther = undefined;
        await partner.save();
      }
    }

    // Unlink current user
    user.significantOther = undefined;
    await user.save();

    return NextResponse.json({
      success: true,
      message: "Accounts unlinked successfully",
    });
  } catch (error) {
    console.error("Error unlinking partner:", error);
    return NextResponse.json(
      { error: "Failed to unlink partner" },
      { status: 500 }
    );
  }
}
