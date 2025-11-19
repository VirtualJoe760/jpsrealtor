// src/app/api/mortgage-rates/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const apiKey = process.env.API_NINJAS_KEY;

    if (!apiKey) {
      console.error("❌ API_NINJAS_KEY not configured");
      // Return fallback rates
      return NextResponse.json({
        success: false,
        fallback: true,
        data: {
          frm_30: 6.85,
          frm_15: 6.10,
          date: new Date().toISOString().split('T')[0],
        }
      });
    }

    const response = await fetch(
      "https://api.api-ninjas.com/v1/mortgagerate",
      {
        headers: {
          "X-Api-Key": apiKey,
        },
        next: {
          revalidate: 3600, // Cache for 1 hour
        },
      }
    );

    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      fallback: false,
      data,
    });
  } catch (error) {
    console.error("❌ Error fetching mortgage rates:", error);

    // Return fallback rates on error
    return NextResponse.json({
      success: false,
      fallback: true,
      data: {
        frm_30: 6.85,
        frm_15: 6.10,
        date: new Date().toISOString().split('T')[0],
      },
    });
  }
}
