import axios from "axios";

/**
 * Fetches MLS listing data via the backend API to bypass CORS restrictions.
 * Extracts address, beds, baths, sqft, lot size, and images.
 * @param {string} mlsUrl - The URL of the MLS listing.
 * @returns {Promise<object>} - Returns listing data as an object.
 */
export async function scrapeMLS(mlsUrl: string) {
  try {
    // Request data from the backend API
    const { data } = await axios.get(`/api/scrapeMLS?mlsUrl=${encodeURIComponent(mlsUrl)}`);
    
    if (data.error) {
      throw new Error(data.error);
    }
    
    return data;
  } catch (error) {
    console.error("Error scraping MLS listing:", error);
    return null;
  }
}
