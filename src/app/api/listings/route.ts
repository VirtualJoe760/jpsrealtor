// src/app/api/listings/route.ts
import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET() {
  try {
    const client = await pool.connect();
    const result = await client.query("SELECT * FROM listings LIMIT 20");
    client.release();
    return NextResponse.json(result.rows);
  } catch (err) {
    console.error("DB fetch error:", err);
    return new NextResponse("Error fetching listings", { status: 500 });
  }
}
