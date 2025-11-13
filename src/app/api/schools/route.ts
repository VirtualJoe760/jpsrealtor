import { NextResponse } from "next/server";
import axios from "axios";

export async function GET(req: Request) {
  try {
    // Extract query parameters
    const { searchParams } = new URL(req.url);
    const latitude = searchParams.get("latitude");
    const longitude = searchParams.get("longitude");
    const photoReference = searchParams.get("photo_reference");

    // Handle photo redirection requests
    if (photoReference) {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photoReference}&key=${apiKey}`;

      try {
        const photoResponse = await axios.get(photoUrl, {
          maxRedirects: 0,
          validateStatus: null,
        });
        const actualUrl = photoResponse.headers.location;

        if (actualUrl) {
          return NextResponse.json({ imageUrl: actualUrl });
        } else {
          return NextResponse.json(
            { error: "No image URL found." },
            { status: 404 }
          );
        }
      } catch (photoError) {
        console.error("Error resolving photo URL:", photoError);
        return NextResponse.json(
          { error: "Failed to resolve photo URL." },
          { status: 500 }
        );
      }
    }

    // Validate latitude and longitude
    if (!latitude || !longitude) {
      return NextResponse.json(
        { error: "Latitude and longitude are required." },
        { status: 400 }
      );
    }

    // Prepare Google Places API request for schools
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.error("Google Maps API key is missing in environment variables.");
      return NextResponse.json(
        { error: "Google Maps API key is missing." },
        { status: 500 }
      );
    }

    const radius = 10000; // Search within a 10km radius
    const type = "school";
    const placesUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=${radius}&type=${type}&key=${apiKey}`;


    // Make the API request
    const response = await axios.get(placesUrl);

    // Check for API errors
    if (response.data.status !== "OK") {
      console.error(
        `Google API Error: ${response.data.status} - ${response.data.error_message || "No additional details"}`
      );
      return NextResponse.json(
        { error: `Google API Error: ${response.data.status}` },
        { status: 500 }
      );
    }

    // Return results to the client
    return NextResponse.json(response.data.results);
  } catch (error) {
    console.error("Unexpected error in API route:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again later." },
      { status: 500 }
    );
  }
}
