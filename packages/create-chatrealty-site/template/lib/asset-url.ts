// Absolutize public/ asset paths (logo, headshot, any hand-placed image) so
// they load correctly when this site is reverse-proxied onto a ChatRealty
// subdomain. The proxy carries pages and API calls; static files must come
// from THIS deployment's origin (NEXT_PUBLIC_ASSET_ORIGIN — set automatically
// on Vercel via VERCEL_URL). Locally it's a no-op.
//
// CONVENTION: every src that points into public/ goes through assetUrl().
export function assetUrl(path: string): string {
  const origin = process.env.NEXT_PUBLIC_ASSET_ORIGIN;
  if (!origin || !path.startsWith("/")) return path;
  return `${origin}${path}`;
}
