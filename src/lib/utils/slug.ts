/**
 * Shared slug utility for generating URL-safe slugs from names.
 * Used across neighborhoods, cities, subdivisions, etc.
 */
export function createSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();
}
