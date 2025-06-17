// src/app/api/ai/runway/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import { RunwayTask } from "@/models/RunwayTask";
import axios from "axios";

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const body = await req.json();
    const { imageUrl, prompt } = body;

    if (!imageUrl) {
      return NextResponse.json({ error: "Image URL required" }, { status: 400 });
    }

    const task = await RunwayTask.create({
      imageUrl,
      prompt,
      status: "processing",
    });

    const runwayRes = await axios.post(
      "https://api.runwayml.com/v1/image-to-video",
      {
        model: "gen4_turbo",
        promptImage: imageUrl,
        promptText: prompt || "Cinematic real estate animation",
        ratio: "1280:720",
        duration: 5,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.RUNWAY_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    task.predictionId = runwayRes.data.id;
    await task.save();

    return NextResponse.json({ taskId: task._id });
  } catch (err: any) {
    console.error("[RUNWAY_CREATE_ERROR]", err?.response?.data || err.message);
    return NextResponse.json({ error: "Runway task creation failed" }, { status: 500 });
  }
}
