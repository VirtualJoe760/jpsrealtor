import { NextResponse } from "next/server";
import axios from "axios";
import * as cheerio from "cheerio";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const mlsUrl = searchParams.get("mlsUrl");

    if (!mlsUrl) {
      return NextResponse.json({ error: "No MLS URL provided" }, { status: 400 });
    }

    // Fetch the MLS page from the backend (avoiding CORS issues)
    const { data } = await axios.get(mlsUrl, {
      headers: { "User-Agent": "Mozilla/5.0" }, // This works on the server
    });

    // Parse with Cheerio
    const $ = cheerio.load(data);
    const address = $(".listing-address-selector").text().trim() || "Unknown Address";
    const beds = $("div.listing-detail-field-label:contains('Total Bedrooms')").next().text().trim();
    const baths = $("div.listing-detail-field-label:contains('Total Baths')").next().text().trim();
    const sqft = $("div.listing-detail-field-label:contains('Approx SqFt')").next().text().replace(/,/g, "").trim();
    const lotSize = $("div.listing-detail-field-label:contains('Lot Size')").next().text().replace(/,/g, "").trim();

    // Extract images
    const images: string[] = [];
    $("img").each((_, img) => {
      const imgSrc = $(img).attr("src");
      if (imgSrc && imgSrc.includes("https://cdn.resize.sparkplatform.com/gps/")) {
        images.push(imgSrc);
      }
    });

    const listingData = {
      address,
      beds: parseInt(beds, 10) || 0,
      baths: parseInt(baths, 10) || 0,
      sqft: parseInt(sqft, 10) || 0,
      lotSize: parseInt(lotSize, 10) || 0,
      images,
      lastUsed: new Date().toISOString(),
    };

    return NextResponse.json(listingData);
  } catch (error) {
    console.error("Error scraping MLS listing:", error);
    return NextResponse.json({ error: "Failed to fetch listing data" }, { status: 500 });
  }
}
