/**
 * Inbound SMS AI (Phase 4) — "any open houses near me?" over SMS.
 *
 * Policy: INTENT-MATCH ONLY. We reply ONLY when the text clearly asks about
 * open houses / homes for sale. Anything else returns null so the webhook stays
 * silent and the message is left for the agent (we never auto-reply to normal
 * agent↔client chatter). Gated per-agent by `User.messaging.aiInbound` (opt-in).
 */
import UnifiedListing from '@/models/unified-listing';

const OPEN_HOUSE_RE = /\bopen\s?houses?\b/i;
const LISTINGS_RE =
  /\b(?:homes?|houses?|condos?|properties|listings?)\s+(?:for\s+sale|available)\b|\bfor\s+sale\b|\bshow\s+me\s+(?:homes?|houses?|listings?)\b/i;

export interface InboundContactCtx {
  city?: string;
}

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function extractCity(text: string): string | undefined {
  const m = text.match(/\b(?:in|near|around|by|at)\s+([A-Za-z][A-Za-z .'-]{2,39})/i);
  if (!m) return undefined;
  let c = m[1].trim().replace(/[?.!,]+$/, '').trim();
  // Drop "near me"/filler and a trailing state.
  if (/^(me|my area|here)$/i.test(c)) return undefined;
  c = c.replace(/\s+(today|tomorrow|this\s+weekend|near\s+me|area)$/i, '').trim();
  c = c.replace(/\s+(?:ca|california)$/i, '').trim();
  return c || undefined;
}

function shortTime(t?: string): string | undefined {
  if (!t) return undefined;
  const d = new Date(t);
  if (!isNaN(d.getTime())) {
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }
  return t; // already human-ish (e.g. "1:00 PM")
}

function formatWhen(oh: { Date?: string; StartTime?: string; EndTime?: string }): string {
  const d = oh.Date ? new Date(oh.Date) : null;
  const day = d && !isNaN(d.getTime())
    ? d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    : (oh.Date || '');
  const times = [shortTime(oh.StartTime), shortTime(oh.EndTime)].filter(Boolean).join('–');
  return times ? `${day}, ${times}` : day;
}

/**
 * Returns an SMS reply string, or null if the message isn't a clear
 * open-house / listings question (→ stay silent, leave it for the agent).
 */
export async function handleInboundQuery(
  bodyText: string,
  ctx: InboundContactCtx = {}
): Promise<string | null> {
  const text = (bodyText || '').trim();
  if (!text) return null;

  const wantsOpenHouse = OPEN_HOUSE_RE.test(text);
  const wantsListings = LISTINGS_RE.test(text);
  if (!wantsOpenHouse && !wantsListings) return null; // no clear intent

  const city = extractCity(text) || ctx.city;
  if (!city) {
    return wantsOpenHouse
      ? 'Happy to help! Which city are you interested in? For example, text "open houses in Palm Desert".'
      : 'Happy to help! Which city are you interested in? For example, text "homes for sale in La Quinta".';
  }

  const base = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || 'https://chatrealty.io';
  const cityRe = new RegExp(`^${escapeRegex(city)}$`, 'i');

  if (wantsOpenHouse) {
    const rows = await UnifiedListing.find({
      city: cityRe,
      standardStatus: 'Active',
      'OpenHouses.0': { $exists: true },
    })
      .select('unparsedAddress city listPrice slugAddress OpenHouses')
      .limit(12)
      .lean();

    const now = Date.now();
    const items = (rows as any[])
      .map((r) => {
        const next = (r.OpenHouses || [])
          .map((oh: any) => ({ oh, t: Date.parse(oh.Date) }))
          .filter((x: any) => !isNaN(x.t) && x.t >= now - 86_400_000) // include today
          .sort((a: any, b: any) => a.t - b.t)[0];
        if (!next) return null;
        return {
          addr: r.unparsedAddress || r.slugAddress || 'Listing',
          when: formatWhen(next.oh),
          price: r.listPrice as number | undefined,
          slug: r.slugAddress as string | undefined,
          t: next.t as number,
        };
      })
      .filter(Boolean) as Array<{ addr: string; when: string; price?: number; slug?: string; t: number }>;

    if (!items.length) {
      return `No upcoming open houses in ${city} right now. Want me to text you when new ones are scheduled?`;
    }
    items.sort((a, b) => a.t - b.t);
    const lines = items.slice(0, 4).map(
      (i) =>
        `• ${i.addr}${i.price ? ` — $${i.price.toLocaleString()}` : ''}\n  ${i.when}` +
        (i.slug ? `\n  ${base}/mls-listings/${i.slug}` : '')
    );
    return `🏠 Open houses in ${city}:\n${lines.join('\n')}\n\nReply STOP to opt out.`;
  }

  // Homes for sale
  const rows = await UnifiedListing.find({ city: cityRe, standardStatus: 'Active' })
    .select('unparsedAddress listPrice slugAddress bedsTotal bathsTotal')
    .sort({ listPrice: 1 })
    .limit(5)
    .lean();

  if (!rows.length) {
    return `I didn't find active listings in ${city} right now. Try another city?`;
  }
  const lines = (rows as any[]).slice(0, 4).map(
    (r) =>
      `• ${r.unparsedAddress || 'Listing'}${r.listPrice ? ` — $${r.listPrice.toLocaleString()}` : ''}` +
      (r.slugAddress ? `\n  ${base}/mls-listings/${r.slugAddress}` : '')
  );
  return `🏡 Homes for sale in ${city}:\n${lines.join('\n')}\n\nReply STOP to opt out.`;
}
