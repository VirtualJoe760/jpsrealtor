// src/app/api/agent/create-team/route.ts
// API endpoint for team leaders to create their own teams

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import Team from "@/models/Team";

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    await dbConnect();

    // Get user
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Verify user is a team leader
    if (!user.isTeamLeader) {
      return NextResponse.json(
        { error: "You must be a team leader to create a team" },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { teamName, description, logo } = body;

    // Validate required fields
    if (!teamName || typeof teamName !== "string" || teamName.trim().length === 0) {
      return NextResponse.json(
        { error: "Team name is required" },
        { status: 400 }
      );
    }

    // Check if team name is already taken
    const existingTeam = await Team.findOne({ name: teamName.trim() });
    if (existingTeam) {
      return NextResponse.json(
        { error: "Team name already exists. Please choose a different name." },
        { status: 400 }
      );
    }

    // Check if user already leads a team
    const userLeadsTeam = await Team.findOne({ teamLeader: user._id });
    if (userLeadsTeam) {
      return NextResponse.json(
        { error: "You already lead a team. Each team leader can only create one primary team." },
        { status: 400 }
      );
    }

    // Create new team
    const newTeam = new Team({
      name: teamName.trim(),
      description: description?.trim() || undefined,
      logo: logo?.trim() || undefined,
      teamLeader: user._id,
      createdBy: user._id,
      agents: [user._id], // Team leader is automatically part of their team
      pendingApplications: [],
      isActive: true,
      autoApprove: false,
      totalAgents: 1,
      totalClients: 0,
    });

    await newTeam.save();

    // Update user's team assignment
    user.team = newTeam._id;
    await user.save();

    return NextResponse.json({
      success: true,
      message: "Team created successfully",
      teamId: newTeam._id.toString(),
      teamName: newTeam.name,
    });

  } catch (error: any) {
    console.error("Create team error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
