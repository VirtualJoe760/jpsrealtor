/**
 * CMS Fetch Utility
 *
 * Base fetch function for making requests to Payload CMS REST API
 * from the Next.js frontend.
 *
 * @example
 * const cities = await cmsFetch('/cities');
 * const city = await cmsFetch('/cities/san-diego');
 */

export async function cmsFetch(path: string, options: RequestInit = {}) {
  const base = process.env.PAYLOAD_PUBLIC_SERVER_URL;
  if (!base) throw new Error("PAYLOAD_PUBLIC_SERVER_URL is not set");

  const url = `${base}/api${path}`;

  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options,
  });

  if (!res.ok) {
    console.error("CMS Fetch Error:", res.status, url);
    throw new Error(`Failed CMS request: ${url}`);
  }

  return res.json();
}
