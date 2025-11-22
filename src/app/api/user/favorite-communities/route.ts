// src/app/api/user/favorite-communities/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/user";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const user = await User.findOne({ email: session.user.email })
      .select('favoriteCommunities')
      .lean();

    return NextResponse.json({
      communities: user?.favoriteCommunities || [],
    });
  } catch (error) {
    console.error("Error fetching favorite communities:", error);
    return NextResponse.json({ error: "Failed to fetch favorite communities" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, id, type, cityId } = await req.json();

    if (!name || !id || !type) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await connectToDatabase();

    // Add the community to favorites (avoid duplicates)
    const user = await User.findOneAndUpdate(
      { email: session.user.email },
      {
        $addToSet: {
          favoriteCommunities: {
            name,
            id,
            type,
            cityId: type === 'subdivision' ? cityId : undefined,
          },
        },
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({
      success: true,
      communities: user.favoriteCommunities || [],
    });
  } catch (error) {
    console.error("Error adding favorite community:", error);
    return NextResponse.json({ error: "Failed to add favorite community" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const communityId = searchParams.get('id');

    if (!communityId) {
      return NextResponse.json({ error: "Missing community ID" }, { status: 400 });
    }

    await connectToDatabase();

    // Remove the community from favorites
    const user = await User.findOneAndUpdate(
      { email: session.user.email },
      {
        $pull: {
          favoriteCommunities: { id: communityId },
        },
      },
      { new: true }
    );

    return NextResponse.json({
      success: true,
      communities: user?.favoriteCommunities || [],
    });
  } catch (error) {
    console.error("Error removing favorite community:", error);
    return NextResponse.json({ error: "Failed to remove favorite community" }, { status: 500 });
  }
}
