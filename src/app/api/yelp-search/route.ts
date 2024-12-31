import { NextResponse } from "next/server";

// Environment variables for Yelp Fusion API
const YELP_API_URL = "https://api.yelp.com/v3/businesses/search";
const YELP_API_KEY = process.env.YELP_FUSION_API_KEY;

export async function POST(req: Request) {
  try {
    // Parse the request body
    const body = await req.json();
    const { location, term } = body;

    if (!YELP_API_KEY) {
      return NextResponse.json(
        { error: "Missing Yelp API Key" },
        { status: 500 }
      );
    }

    // Construct the query parameters for Yelp's API
    const params = new URLSearchParams({
      location: location || "Coachella Valley",
      term: term || "restaurants",
      limit: "20", // Adjust as needed
    });

    // Make the API request to Yelp
    const response = await fetch(`${YELP_API_URL}?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${YELP_API_KEY}`,
      },
    });

    if (!response.ok) {
      const errorResponse = await response.json();
      return NextResponse.json(
        { error: "Failed to fetch data from Yelp", details: errorResponse },
        { status: response.status }
      );
    }

    // Parse and return the Yelp API response
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in Yelp API route:", error);
    return NextResponse.json(
      { error: "An error occurred while processing your request." },
      { status: 500 }
    );
  }
}
