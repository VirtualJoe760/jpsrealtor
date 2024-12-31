import axios from "axios";

/**
 * Fetches the final URL for a Google Places photo reference.
 * @param photoReference - The photo reference string from Google Places API.
 * @param apiKey - Your Google Maps API Key.
 * @returns The resolved image URL or null if unavailable.
 */
export async function getPhotoUrl(photoReference: string, apiKey: string): Promise<string | null> {
  const photoApiUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photoReference}&key=${apiKey}`;

  try {
    const response = await axios.get(photoApiUrl, { maxRedirects: 0, validateStatus: (status) => status === 302 });

    // Check for redirect location header
    const resolvedUrl = response.headers["location"];
    if (resolvedUrl) {
      return resolvedUrl;
    }

    console.warn("Photo redirect location not found.");
    return null;
  } catch (error) {
    console.error("Error resolving photo URL:", error);
    return null;
  }
}
