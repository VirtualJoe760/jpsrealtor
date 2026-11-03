// The CMS Live Preview iframe (/articles/preview) used to receive the whole
// article in its query string. A full-length article pushes the URL past
// Vercel's ~14 KB request-line limit, and the iframe showed
// "An error occurred / URI_TOO_LONG" (2026-10-30, a public-golf-courses guide).
//
// Long previews now go through localStorage: the editor stashes the params and
// the iframe gets a short URL that names the stash. Same origin, so the iframe
// can read it. Short previews keep the plain query string.

export const PREVIEW_STASH_KEY = "cms-article-preview";

// Comfortably under Vercel's limit once the path and headers are added.
const MAX_QUERY_LENGTH = 4000;

function hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/** The iframe src for a CMS preview. Call from client components only. */
export function previewSrc(params: Record<string, string>): string {
  const qs = new URLSearchParams(params).toString();
  if (qs.length <= MAX_QUERY_LENGTH || typeof window === "undefined") {
    return `/articles/preview?${qs}`;
  }
  try {
    window.localStorage.setItem(PREVIEW_STASH_KEY, JSON.stringify(params));
    // `v` changes with the content, so the iframe reloads when the article does.
    const short = new URLSearchParams({ stash: "1", theme: params.theme || "", v: hash(qs) });
    return `/articles/preview?${short.toString()}`;
  } catch {
    // Storage blocked or full: fall back to the long URL (old behaviour).
    return `/articles/preview?${qs}`;
  }
}

/** Read the stashed params on the preview page. Null if absent or unreadable. */
export function readPreviewStash(): Record<string, string> | null {
  try {
    const raw = window.localStorage.getItem(PREVIEW_STASH_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : null;
  } catch {
    return null;
  }
}
