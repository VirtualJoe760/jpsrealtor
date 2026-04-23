import { NextRequest, NextResponse } from "next/server";

export async function handleCors(req: NextRequest, res: NextResponse): Promise<void> {
  const allowedOrigins = [
    "http://localhost:3000",
    "https://jpsrealtor.com",
    "https://www.jpsrealtor.com",
    "https://josephsardella.com",
    "https://www.josephsardella.com",
    "https://chatrealty.io",
    "https://www.chatrealty.io",
  ];

  const origin = req.headers.get("origin") || "";

  if (allowedOrigins.includes(origin)) {
    res.headers.set("Access-Control-Allow-Origin", origin);
  } else {
    res.headers.set("Access-Control-Allow-Origin", "https://jpsrealtor.com");
  }

  res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
}
