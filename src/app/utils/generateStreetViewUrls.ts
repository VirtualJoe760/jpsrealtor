import subdivisions from '@/constants/subdivisions';

export const generateStreetViewUrls = (): Record<string, { name: string; streetViewUrl: string }[]> => {
  const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

  const streetViewData: Record<string, { name: string; streetViewUrl: string }[]> = {};

  for (const [key, neighborhoodArray] of Object.entries(subdivisions)) {
    streetViewData[key] = neighborhoodArray.map(({ name, coordinates }) => ({
      name,
      streetViewUrl: coordinates
        ? `https://maps.googleapis.com/maps/api/streetview?size=600x300&location=${coordinates.latitude},${coordinates.longitude}&key=${GOOGLE_MAPS_API_KEY}`
        : '/images/placeholder.jpg', // Fallback for missing coordinates
    }));
  }

  return streetViewData;
};
