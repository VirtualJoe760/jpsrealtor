import southPalmSpringsEnd from "./palm-springs-south-end.json";
import southCathedralCity from "./south-cathedral-city.json";
import northCathedralCity from "./cathedral-city-north.json";
import centralPalmSprings from "./palm-springs-central.json";
import northPalmSprings from "./palm-springs-north-end.json";
import ranchoMirage from "./rancho-mirage.json";
import indianWells from "./indian-wells.json";
import bermudaDunes from "./bermuda-dunes.json";
import coachella from "./coachella.json";
import thermal from "./thermal.json";
import palmDesertNE from "./palm-desert-ne.json";
import palmDesertNorth from "./palm-desert-north.json";
import palmDesertSouth from "./palm-desert-south.json";
import laQuintaNorth from "./la-quinta-no-of-hwy-111.json";
import laQuintaSouth from "./la-quinta-south-of-hwy-111.json";
import indioNorthOfI10 from "./indio-north-of-i10.json";
import indioCentral from "./indio-central.json";
import indioSouthOfHwy111 from "./indio-south-of-hwy-111.json";
import desertHotSprings from "./desert-hot-springs.json";
import thousandPalms from "./thousand-palms.json";
import palmDesertEast from "./palm-desert-east.json";

interface AreaData {
  area: string;
  quarter: string;
  slug: string;
  closed_data_metrics: {
    list_price: {
      average: number;
      median: number;
      min: number;
      max: number;
    };
    sale_price: {
      average: number;
      median: number;
      min: number;
      max: number;
    };
    days_on_market: {
      average: number;
      median: number;
      min: number;
      max: number;
    };
    list_price_per_sqft: {
      average: number;
      median: number;
      min: number;
      max: number;
    };
    sale_price_per_sqft: {
      average: number;
      median: number;
      min: number;
      max: number;
    };
  };
  expired_data_metrics?: {
    list_price?: {
      average: number;
      median: number;
      min: number;
      max: number;
    };
    days_on_market?: {
      average: number;
      median: number;
      min: number;
      max: number;
    };
    list_price_per_sqft?: {
      average: number;
      median: number;
      min: number;
      max: number;
    };
    square_footage?: {
      average: number;
      median: number;
      min: number;
      max: number;
    };
    lot_size?: {
      average: number;
      median: number;
      min: number;
      max: number;
    };
    bedrooms?: {
      average: number;
      median: number;
      min: number;
      max: number;
    };
    bathrooms?: {
      average: number;
      median: number;
      min: number;
      max: number;
    };
  };
  price_ranges: Record<string, number>;
  total_sales: number;
  expired_listings: number;
  highest_sale_price: number;
  lowest_sale_price: number;
}

export const q4Data: Record<string, AreaData> = {
    "palm-springs-south-end": southPalmSpringsEnd,
    "south-cathedral-city": southCathedralCity,
    "north-cathedral-city": northCathedralCity,
    "palm-springs-central": centralPalmSprings,
    "palm-springs-north-end": northPalmSprings,
    "rancho-mirage": ranchoMirage,
    "indian-wells": indianWells,
    "bermuda-dunes": bermudaDunes,
    "coachella": coachella,
    "thermal": thermal,
    "palm-desert-ne": palmDesertNE,
    "palm-desert-north": palmDesertNorth,
    "palm-desert-south": palmDesertSouth,
    "la-quinta-no-of-hwy-111": laQuintaNorth,
    "la-quinta-south-of-hwy-111": laQuintaSouth,
    "indio-north-of-i-10": indioNorthOfI10,
    "indio-central": indioCentral,
    "indio-south-of-hwy-111": indioSouthOfHwy111,
    "desert-hot-springs": desertHotSprings,
    "thousand-palms": thousandPalms,
    "palm-desert-east": palmDesertEast
  };
