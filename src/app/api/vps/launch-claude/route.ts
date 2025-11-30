// src/app/api/vps/launch-claude/route.ts
// API endpoint to launch Claude Code on VPS

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  launchClaudeOnVPS,
  checkClaudeInstallation,
  getActiveClaudeSessions,
  killClaudeSession,
} from "@/lib/vps-ssh";

// POST /api/vps/launch-claude - Launch Claude Code session
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!(session?.user as any)?.isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { prompt, articleId, category, mode = "create" } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    // Check if Claude is installed
    const installation = await checkClaudeInstallation();
    if (!installation.installed) {
      return NextResponse.json(
        {
          error: "Claude Code is not installed on VPS",
          suggestion: "Install with: npm install -g @anthropic-ai/claude-code",
        },
        { status: 500 }
      );
    }

    // Launch Claude session
    const result = await launchClaudeOnVPS(prompt, {
      articleId,
      category,
      mode,
    });

    return NextResponse.json({
      success: true,
      ...result,
      installation,
    });
  } catch (error: any) {
    console.error("Launch Claude error:", error);
    return NextResponse.json(
      {
        error: "Failed to launch Claude Code on VPS",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// GET /api/vps/launch-claude - Get active Claude sessions
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!(session?.user as any)?.isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 403 }
      );
    }

    const sessions = await getActiveClaudeSessions();
    const installation = await checkClaudeInstallation();

    return NextResponse.json({
      sessions,
      installation,
    });
  } catch (error: any) {
    console.error("Get Claude sessions error:", error);
    return NextResponse.json(
      {
        error: "Failed to get Claude sessions",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// DELETE /api/vps/launch-claude?pid=123 - Kill Claude session
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!(session?.user as any)?.isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 403 }
      );
    }

    const pid = req.nextUrl.searchParams.get("pid");
    if (!pid) {
      return NextResponse.json(
        { error: "PID is required" },
        { status: 400 }
      );
    }

    const success = await killClaudeSession(pid);

    if (success) {
      return NextResponse.json({
        success: true,
        message: `Claude session ${pid} terminated`,
      });
    } else {
      return NextResponse.json(
        {
          error: `Failed to terminate Claude session ${pid}`,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Kill Claude session error:", error);
    return NextResponse.json(
      {
        error: "Failed to kill Claude session",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
