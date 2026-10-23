import * as cheerio from 'cheerio';
export type PhotoAddress = { street?: string; city?: string; state?: string; zip?: string };
export type DiscoveredPhoto = { url: string; source: string; sourcePage: string; caption: string; order: number; discoveredAt: Date };
const providers = ['zillow.com', 'redfin.com', 'realtor.com'];
export function allowedPropertyPage(value: string) {
  try { if (value.length > 4096) return false; const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password && !u.port && providers.some(host => u.hostname === host || u.hostname === 'www.' + host); } catch { return false; }
}
export function allowedPhotoUrl(value: string) {
  try { if (value.length > 4096) return false; const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password && !u.port && ['zillowstatic.com', 'cdn-redfin.com', 'rdcpix.com', 'realtor.com'].some(host => u.hostname === host || u.hostname.endsWith('.' + host)); } catch { return false; }
}
export function normalizedAddress(value: string) {
  const aliases: Record<string, string> = { street:'st', avenue:'ave', road:'rd', drive:'dr', court:'ct', boulevard:'blvd', lane:'ln', place:'pl', circle:'cir', north:'n', south:'s', east:'e', west:'w', apartment:'unit', apt:'unit', suite:'unit' };
  return value.toLowerCase().replace(/#/g, ' unit ').replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/).map(word => aliases[word] || word).join(' ');
}
export function addressKey(address: PhotoAddress) { return [address.street, address.city, address.state, address.zip?.slice(0,5)].map(value => normalizedAddress(value || '')).join('|'); }
export function matchesAddress(text: string, address: PhotoAddress) {
  if (!address.street || !address.city || !address.state) return false;
  const normalized = ' ' + normalizedAddress(text) + ' ';
  const expected = [address.street, address.city, address.state, address.zip?.slice(0,5)].filter(Boolean).join(' ');
  return normalized.includes(' ' + normalizedAddress(expected) + ' ');
}
export function extractPropertyPhotos(html: string, sourcePage: string, address: PhotoAddress): DiscoveredPhoto[] {
  if (!allowedPropertyPage(sourcePage)) return [];
  const $ = cheerio.load(html), urls: string[] = [];
  const add = (value: unknown) => {
    if (typeof value === 'string') urls.push(value);
    else if (Array.isArray(value)) value.forEach(add);
    else if (value && typeof value === 'object') add((value as { url?: unknown; contentUrl?: unknown }).url || (value as { contentUrl?: unknown }).contentUrl);
  };
  function walk(value: unknown) {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) { value.forEach(walk); return; }
    const node = value as Record<string, unknown>;
    const addr = node.address as Record<string, unknown> | undefined;
    if (addr && typeof addr === 'object') {
      const text = [addr.streetAddress, addr.addressLocality, addr.addressRegion, addr.postalCode].join(' ');
      if (matchesAddress(text, address)) add(node.image || node.photo);
    }
    if (node['@graph']) walk(node['@graph']);
    if (node.mainEntity) walk(node.mainEntity);
  }
  $('script[type="application/ld+json"]').each((_, el) => { try { walk(JSON.parse($(el).text())); } catch {} });
  // Only page-level metadata can identify the subject; arbitrary body images often belong to nearby homes.
  const heading = [$('title').text(), $('meta[property="og:title"]').attr('content'), $('meta[property="og:description"]').attr('content')].join(' ');
  if (matchesAddress(heading, address)) add($('meta[property="og:image"]').attr('content'));
  return [...new Set(urls)].filter(url => allowedPhotoUrl(url) && !/logo|placeholder|no[-_]?photo/i.test(new URL(url).pathname)).slice(0, 8).map((url, order) => ({ url, order, source: new URL(sourcePage).hostname.replace('www.', ''), sourcePage, caption: [address.street,address.city,address.state,address.zip].filter(Boolean).join(', '), discoveredAt: new Date() }));
}
async function textResponse(url: string, allowed: (value: string) => boolean, maxBytes = 1500000, signal?: AbortSignal): Promise<string> {
  for (let hop = 0; hop < 4; hop++) {
    if (!allowed(url)) throw new Error('Unsupported source URL');
    const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.any([AbortSignal.timeout(7000), ...(signal ? [signal] : [])]), headers: { 'User-Agent': 'ChatRealtyPropertyPhotos/1.0', Accept: 'text/html,application/xml,text/xml' }, cache: 'no-store' });
    if (response.status >= 300 && response.status < 400) { const location = response.headers.get('location'); await response.body?.cancel(); if (!location) throw new Error('Source redirect failed'); url = new URL(location, url).href; continue; }
    if (!response.ok) { await response.body?.cancel(); throw new Error(response.status === 403 || response.status === 429 ? 'Source blocked automated requests' : 'Source unavailable'); }
    const reader = response.body?.getReader(); if (!reader) return '';
    let length = 0, text = ''; const decoder = new TextDecoder();
    try { while (true) { const part = await reader.read(); if (part.done) break; length += part.value.byteLength; if (length > maxBytes) throw new Error('Source page too large'); text += decoder.decode(part.value, { stream: true }); } } finally { await reader.cancel(); }
    return text;
  }
  throw new Error('Too many source redirects');
}
export async function discoverPropertyPages(address: PhotoAddress, signal?: AbortSignal) {
  const query = [address.street, address.city, address.state, address.zip, '(site:zillow.com OR site:redfin.com OR site:realtor.com)'].filter(Boolean).join(' ');
  const links: string[] = [];
  // Ordinary public search requests only. No paid API, proxies, CAPTCHA solving or block bypass.
  for (const engine of ['google', 'bing']) {
    try {
      const url = engine === 'google' ? 'https://www.google.com/search?q=' + encodeURIComponent(query) : 'https://www.bing.com/search?format=rss&q=' + encodeURIComponent(query);
      const html = await textResponse(url, value => { const u = new URL(value); return u.protocol === 'https:' && ['www.google.com','www.bing.com'].includes(u.hostname); }, 500000, signal);
      const $ = cheerio.load(html, { xml: engine === 'bing' });
      $('a, item > link').each((_, element) => {
        let link = $(element).attr('href') || $(element).text();
        if (link.startsWith('/url?')) link = new URLSearchParams(link.slice(5)).get('q') || '';
        if (allowedPropertyPage(link)) links.push(link);
      });
      if (links.length) break;
    } catch {}
  }
  const score = (url: string) => { const text = normalizedAddress(decodeURIComponent(new URL(url).pathname)); return (text.includes(normalizedAddress(address.street || '')) ? 2 : 0) + (address.zip && text.includes(address.zip.slice(0,5)) ? 1 : 0); };
  return [...new Set(links)].sort((a, b) => score(b) - score(a)).slice(0, 3);
}
export async function crawlPropertyPhotos(address: PhotoAddress, sourceUrl?: string) {
  const signal = AbortSignal.timeout(40000);
  const pages = sourceUrl ? [sourceUrl] : await discoverPropertyPages(address, signal);
  const issues: string[] = [], photos: DiscoveredPhoto[] = [];
  for (const page of pages) {
    if (signal.aborted) break;
    try {
      const html = await textResponse(page, allowedPropertyPage, 1500000, signal);
      const candidates = extractPropertyPhotos(html, page, address);
      for (const photo of candidates) {
        try { const response = await fetch(photo.url, { method: 'HEAD', redirect: 'manual', signal: AbortSignal.any([signal, AbortSignal.timeout(4000)]), cache: 'no-store' }); if (response.ok && response.headers.get('content-type')?.startsWith('image/')) photos.push(photo); } catch {}
      }
    } catch (error) { issues.push(error instanceof Error ? error.message : 'Source unavailable'); }
    if (photos.length) break;
  }
  return { photos, message: photos.length ? 'Address-matched property photos found.' : issues.includes('Source blocked automated requests') ? 'The source blocked automated access. Open the source website to view its photos.' : 'Free search found no accessible, address-matched photos. You can try a direct Zillow, Redfin or Realtor property-page link.' };
}
