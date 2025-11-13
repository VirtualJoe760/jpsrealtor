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

    const apiKey = process.env.RUNWAY_API_KEY;
    if (!apiKey) {
      throw new Error("Missing RUNWAY_API_KEY in environment variables");
    }

    const client = new RunwayML({ apiKey });

    if (!task.predictionId) {
      return NextResponse.json({ error: "Missing predictionId" }, { status: 400 });
    }

    let runwayTask = await client.tasks.retrieve(task.predictionId);
    let status = runwayTask.status;
    let output = runwayTask.output;

    
    if (status === "SUCCEEDED") {
      // Wait briefly to allow video to become available
      await new Promise((res) => setTimeout(res, 3000));

      const outputIsEmpty =
        !output ||
        (Array.isArray(output) && output.length === 0) ||
        (typeof output === "object" && output !== null && Object.keys(output).length === 0);

      if (outputIsEmpty) {
        const retry = await client.tasks.retrieve(task.predictionId);
        output = retry.output;
      }

      let videoUrl: string | null = null;

      if (Array.isArray(output)) {
        videoUrl = output[0] ?? null;
      } else if (typeof output === "object" && output !== null && "video" in output) {
        videoUrl = (output as { video?: string }).video ?? null;
      } else if (typeof output === "string") {
        videoUrl = output;
      }

      // Save in DB for history/tracking, but return live status immediately
      task.status = "complete";
      task.videoUrl = videoUrl ?? undefined;
      await task.save();

      return NextResponse.json({
        status: "complete",
        videoUrl: videoUrl ?? null,
      });
    }

    if (status === "FAILED") {
      task.status = "failed";
      await task.save();

      return NextResponse.json({
        status: "failed",
        videoUrl: null,
      });
    }

    // Still processing
    return NextResponse.json({
      status: "processing",
      videoUrl: null,
    });
  } catch (err: any) {
    console.error("[RUNWAY_STATUS_ERROR]", err?.response?.data || err.message || err);
    return NextResponse.json(
      { error: "Runway task status fetch failed" },
      { status: 500 }
    );
  }
}
