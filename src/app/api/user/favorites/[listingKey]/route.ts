// src/app/api/user/favorites/[listingKey]/route.ts
// Remove a specific favorite

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import User from "@/models/user";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ listingKey: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { listingKey } = await params;

    await dbConnect();

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Remove the favorite
    const initialCount = user.likedListings.length;
    user.likedListings = user.likedListings.filter(
      (fav: any) => fav.listingKey !== listingKey
    );

    if (user.likedListings.length === initialCount) {
      return NextResponse.json(
        { error: "Favorite not found" },
        { status: 404 }
      );
    }

    await user.save();

    return NextResponse.json({
      success: true,
      message: "Favorite removed successfully",
      remainingCount: user.likedListings.length,
    });
  } catch (error) {
    console.error("Error removing favorite:", error);
    return NextResponse.json(
      { error: "Failed to remove favorite" },
      { status: 500 }
    );
  }
}
