import { NextRequest, NextResponse } from "next/server";

export async function handleCors(req: NextRequest, res: NextResponse): Promise<void> {
  const allowedOrigins = [
    "http://localhost:3000", // Development
    "https://www.jpsrealtor.com", // Production
  ];

  const origin = req.headers.get("origin") || "";

  if (allowedOrigins.includes(origin)) {
    res.headers.set("Access-Control-Allow-Origin", origin);
  } else {
    res.headers.set("Access-Control-Allow-Origin", "https://www.jpsrealtor.com");
  }

  res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
}
