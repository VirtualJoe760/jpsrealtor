// src/app/api/ai/runway/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import { RunwayTask } from "@/models/RunwayTask";
import RunwayML from "@runwayml/sdk";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();

    const task = await RunwayTask.findById(params.id);
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    if (["complete", "failed"].includes(task.status)) {
      return NextResponse.json({
        status: task.status,
        videoUrl: task.videoUrl || null,
      });
    }

    const apiKey = process.env.RUNWAY_API_KEY;
    if (!apiKey) {
      throw new Error("Missing RUNWAY_API_KEY in environment variables");
    }

    const client = new RunwayML({ apiKey }); // ✅ FIX: Pass as object

    if (!task.predictionId) {
      return NextResponse.json({ error: "Missing predictionId" }, { status: 400 });
    }

    const runwayTask = await client.tasks.retrieve(task.predictionId);


    const status = runwayTask.status;
    const output = runwayTask.output;

    if (status === "SUCCEEDED") {
      task.status = "complete";
      task.videoUrl = Array.isArray(output) ? output[0] : output;
      await task.save();
    } else if (status === "FAILED") {
      task.status = "failed";
      await task.save();
    }

    return NextResponse.json({
      status: task.status,
      videoUrl: task.videoUrl || null,
    });
  } catch (err: any) {
    console.error("[RUNWAY_STATUS_ERROR]", err?.response?.data || err.message || err);
    return NextResponse.json(
      { error: "Runway task status fetch failed" },
      { status: 500 }
    );
  }
}
