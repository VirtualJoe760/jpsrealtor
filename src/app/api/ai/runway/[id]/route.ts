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
        videoUrl: task.videoUrl ?? null,
      });
    }

    const apiKey = process.env.RUNWAY_API_KEY;
    if (!apiKey) {
      throw new Error("Missing RUNWAY_API_KEY in environment variables");
    }

    const client = new RunwayML({ apiKey });

    if (!task.predictionId) {
      return NextResponse.json({ error: "Missing predictionId" }, { status: 400 });
    }

    const runwayTask = await client.tasks.retrieve(task.predictionId);
    const status = runwayTask.status;
    const output = runwayTask.output;

    console.log("🎯 RUNWAY RESPONSE:", {
      predictionId: task.predictionId,
      status,
      output,
    });

    if (status === "SUCCEEDED") {
      await new Promise((res) => setTimeout(res, 3000));

      let videoUrl: string | null = null;

      if (Array.isArray(output)) {
        videoUrl = output[0] ?? null;
      } else if (typeof output === "object" && output !== null && "video" in output) {
        videoUrl = (output as { video?: string }).video ?? null;
      } else if (typeof output === "string") {
        videoUrl = output;
      }

      console.log("🎬 Parsed video URL:", videoUrl);

      task.status = "complete";
      task.videoUrl = videoUrl ?? undefined; // must match schema
      await task.save();
    } else if (status === "FAILED") {
      task.status = "failed";
      await task.save();
    }

    return NextResponse.json({
      status: task.status,
      videoUrl: task.videoUrl ?? null,
    });
  } catch (err: any) {
    console.error("[RUNWAY_STATUS_ERROR]", err?.response?.data || err.message || err);
    return NextResponse.json(
      { error: "Runway task status fetch failed" },
      { status: 500 }
    );
  }
}
