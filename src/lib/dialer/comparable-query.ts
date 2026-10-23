function coordinate(value: unknown, max: number) {
  if ((typeof value !== 'number' && typeof value !== 'string') || String(value).trim() === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && Math.abs(parsed) <= max ? parsed : undefined;
}

export function comparableCoordinates(contact?: { latitude?: unknown; longitude?: unknown; lat?: unknown; lng?: unknown; long?: unknown }, geocode?: { lat: number; lng: number }) {
  return {
    latitude: [contact?.latitude, contact?.lat, geocode?.lat].map(value => coordinate(value, 90)).find(value => value !== undefined),
    longitude: [contact?.longitude, contact?.lng, contact?.long, geocode?.lng].map(value => coordinate(value, 180)).find(value => value !== undefined),
  };
}

/** Match ContactViewPanel's nearby-sales query unless the agent explicitly filters. */
export function comparableQuery(input: { latitude: number; longitude: number; radius: string; period: string; similar: boolean;
  bedrooms?: number; bathrooms?: number; sqft?: number }) {
  const query = new URLSearchParams({ latitude: String(input.latitude), longitude: String(input.longitude), radius: input.radius, limit: '10' });
  if (input.period !== 'all') query.set('days', input.period);
  if (input.similar) {
    for (const key of ['bedrooms', 'bathrooms', 'sqft'] as const) {
      const value = input[key];
      if (typeof value === 'number' && Number.isFinite(value) && value > 0) query.set(key, String(value));
    }
  }
  // Imported tax-record types such as Rsfr are not MLS propertyType identifiers.
  return query;
}
