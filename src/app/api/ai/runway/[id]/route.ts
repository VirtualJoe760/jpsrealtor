// src/app/api/ai/runway/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import { RunwayTask } from "@/models/RunwayTask";
import axios from "axios";

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

    const runwayRes = await axios.get(
      `https://api.runwayml.com/v1/tasks/${task.predictionId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.RUNWAY_API_KEY}`,
        },
      }
    );

    const status = runwayRes.data.status;
    const output = runwayRes.data.output;

    if (status === "SUCCEEDED") {
      task.status = "complete";
      task.videoUrl = Array.isArray(output) ? output[0] : output; // might be array
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
    console.error("[RUNWAY_STATUS_ERROR]", err?.response?.data || err.message);
    return NextResponse.json({ error: "Runway task status fetch failed" }, { status: 500 });
  }
}
