// src/app/api/chat/goals/route.ts
// API route for managing user goals extracted from chat

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import connectDB from "@/lib/db";
import UserGoals from "@/models/user-goals";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(req.url);

    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "Missing userId parameter" },
        { status: 400 }
      );
    }

    // Connect to database
    await connectDB();

    // Fetch user goals
    const userGoals = await UserGoals.findOne({ userId }).lean();

    if (!userGoals) {
      return NextResponse.json({
        success: true,
        goals: null,
      });
    }

    return NextResponse.json({
      success: true,
      goals: userGoals,
    });
  } catch (error) {
    console.error("Error fetching user goals:", error);
    return NextResponse.json(
      { error: "Failed to fetch user goals" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json();

    const { userId, goals, context, conversationSnippet } = body;

    // Validate required fields
    if (!userId || !goals) {
      return NextResponse.json(
        { error: "Missing required fields: userId, goals" },
        { status: 400 }
      );
    }

    // Connect to database
    await connectDB();

    // Update or create user goals
    const existingGoals = await UserGoals.findOne({ userId });

    if (existingGoals) {
      // Merge new goals with existing ones
      const mergedGoals = mergeGoals(existingGoals.goals, goals);

      existingGoals.goals = mergedGoals;
      existingGoals.lastUpdatedFrom = context || "general";
      existingGoals.extractionCount += 1;
      if (conversationSnippet) {
        existingGoals.lastConversationSnippet = conversationSnippet;
      }

      await existingGoals.save();

      return NextResponse.json({
        success: true,
        goals: existingGoals,
      });
    } else {
      // Create new goals document
      const newGoals = await UserGoals.create({
        userId,
        goals,
        lastUpdatedFrom: context || "general",
        extractionCount: 1,
        lastConversationSnippet: conversationSnippet,
      });

      return NextResponse.json({
        success: true,
        goals: newGoals,
      });
    }
  } catch (error) {
    console.error("Error saving user goals:", error);
    return NextResponse.json(
      { error: "Failed to save user goals" },
      { status: 500 }
    );
  }
}

/**
 * Merge new goals with existing goals intelligently
 * - Arrays: Add unique items
 * - Numbers: Use new value if provided
 * - Strings: Use new value if provided
 */
function mergeGoals(existing: any, newGoals: any): any {
  const merged = { ...existing };

  // Merge arrays (add unique items)
  const arrayFields = [
    "preferredCities",
    "preferredSubdivisions",
    "avoidCities",
    "mustHave",
    "niceToHave",
    "dealBreakers",
    "propertyTypes",
    "lifestylePreferences",
  ];

  for (const field of arrayFields) {
    if (newGoals[field] && Array.isArray(newGoals[field])) {
      const existingArray = merged[field] || [];
      const uniqueItems = new Set([...existingArray, ...newGoals[field]]);
      merged[field] = Array.from(uniqueItems);
    }
  }

  // Merge numbers (use new value if provided, or keep existing)
  const numberFields = [
    "minBudget",
    "maxBudget",
    "minBeds",
    "maxBeds",
    "minBaths",
    "maxBaths",
    "minSqft",
    "maxSqft",
    "familySize",
  ];

  for (const field of numberFields) {
    if (newGoals[field] !== undefined && newGoals[field] !== null) {
      merged[field] = newGoals[field];
    }
  }

  // Merge strings (use new value if provided)
  const stringFields = ["timeline"];
  for (const field of stringFields) {
    if (newGoals[field]) {
      merged[field] = newGoals[field];
    }
  }

  // Merge booleans
  const booleanFields = ["pets", "workFromHome"];
  for (const field of booleanFields) {
    if (newGoals[field] !== undefined) {
      merged[field] = newGoals[field];
    }
  }

  return merged;
}
