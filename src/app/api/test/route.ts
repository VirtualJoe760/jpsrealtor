// src/app/api/test/route.ts
// Simple test route to verify API routes are working

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    message: "API routes are working!",
    time: new Date().toISOString(),
    status: "success"
  });
}

export async function POST() {
  return NextResponse.json({
    message: "POST works too",
    status: "success"
  });
}
