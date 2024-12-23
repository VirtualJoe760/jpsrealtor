import { NextRequest, NextResponse } from "next/server";

const curatedData: Record<string, string> = {
  "Indian Wells Country Club": "/images/indian-wells-country-club.jpg",
  "Toscana Country Club": "/images/toscana-country-club.jpg",
  "Casa Dorado": "/images/casa-dorado.jpg",
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const placeName = searchParams.get("name");
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const searchEngineId = process.env.NEXT_PUBLIC_GOOGLE_CUSTOM_SEARCH_ENGINE_ID;

  if (!placeName || !apiKey || !searchEngineId) {
    return NextResponse.json(
      { error: "Missing required parameters or API configuration." },
      { status: 400 }
    );
  }

  // Check curated data first
  if (curatedData[placeName]) {
    return NextResponse.json({ photoUrl: curatedData[placeName] });
  }

  try {
    const refinedQuery = `${placeName}, Indian Wells, CA`; // Add context
    const searchUrl = `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(
      refinedQuery
    )}&cx=${searchEngineId}&searchType=image&key=${apiKey}`;

    console.log("Custom Search API Request URL:", searchUrl);

    const response = await fetch(searchUrl);
    const data = await response.json();

    console.log("Custom Search API Response:", JSON.stringify(data, null, 2));

    if (!data.items || data.items.length === 0) {
      return NextResponse.json(
        { error: `No images found for "${placeName}".` },
        { status: 404 }
      );
    }

    return NextResponse.json({ photoUrl: data.items[0].link });
  } catch (error) {
    console.error("Custom Search API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch data from Custom Search API." },
      { status: 500 }
    );
  }
}
