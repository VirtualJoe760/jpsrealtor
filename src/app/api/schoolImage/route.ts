import { NextResponse } from "next/server";
import axios from "axios";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const photoReference = searchParams.get("photo_reference");


    if (!photoReference) {
      console.error("No photo_reference provided.");
      return NextResponse.json(
        { error: "Photo reference is required." },
        { status: 400 }
      );
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      console.error("Google Maps API key is missing.");
      return NextResponse.json(
        { error: "Google Maps API key is missing." },
        { status: 500 }
      );
    }

    const url = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photoReference}&key=${apiKey}`;

    // Fetch the photo using the Google API
    const response = await axios.get(url, { responseType: "arraybuffer" });


    if (!response.headers['content-type'].startsWith('image')) {
      console.error(
        "Invalid content type returned:",
        response.headers['content-type']
      );
      return NextResponse.json(
        { error: "Invalid content type from Google Photo API." },
        { status: 500 }
      );
    }

    // Return the binary image data to the client
    return new Response(response.data, {
      headers: {
        'Content-Type': response.headers['content-type'],
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error("Error in schoolImage route:", error);

    if (axios.isAxiosError(error)) {
      console.error("Axios error details:", {
        status: error.response?.status,
        data: error.response?.data,
      });
    }

    return NextResponse.json(
      { error: "Failed to fetch school image." },
      { status: 500 }
    );
  }
}
