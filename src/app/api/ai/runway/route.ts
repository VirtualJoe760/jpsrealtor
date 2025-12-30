// src/app/api/ai/runway/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import { RunwayTask } from "@/models/RunwayTask";
import RunwayML from "@runwayml/sdk";

// Lazy-load client to prevent build errors when API key is missing
let client: RunwayML | null = null;
function getClient() {
  if (!client) {
    client = new RunwayML({
      apiKey: process.env.RUNWAY_API_KEY || "placeholder-key",
    });
  }
  return client;
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const body = await req.json();
    const { imageUrl, prompt } = body;

    if (!imageUrl) {
      return NextResponse.json({ error: "Image URL required" }, { status: 400 });
    }

    // Check if API key is configured
    if (!process.env.RUNWAY_API_KEY) {
      return NextResponse.json({ error: "Runway API not configured" }, { status: 503 });
    }

    // Create local task entry
    const task = await RunwayTask.create({
      imageUrl,
      prompt,
      status: "processing",
    });

    // Create a Runway task
    const runwayTask = await getClient().imageToVideo.create({
      model: "gen4_turbo",
      promptImage: imageUrl,
      promptText: prompt || "Cinematic real estate animation",
      ratio: "1280:720",
      duration: 5,
    });

    // Store prediction ID
    task.predictionId = runwayTask.id;
    await task.save();

    return NextResponse.json({ taskId: task._id });
  } catch (err: any) {
    console.error("[RUNWAY_CREATE_ERROR]", err);
    return NextResponse.json({ error: "Runway task creation failed" }, { status: 500 });
  }
}
