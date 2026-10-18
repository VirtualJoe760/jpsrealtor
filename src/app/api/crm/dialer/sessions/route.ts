import { createHash } from 'crypto';
import { NextRequest } from 'next/server';
import DialerSession from '@/models/DialerSession';
import Contact from '@/models/Contact';
import { dialerJson, dialerOwner, sessionDTO } from '@/lib/dialer/session-server';
import { dialerPhone, validateSessionSelection } from '@/lib/dialer/session-contract';

export async function GET() {
  try {
    const userId = await dialerOwner();
    if (!userId) return dialerJson({ error: 'Unauthorized' }, 401);
    const records = await DialerSession.find({ userId }).sort({ updatedAt: -1 }).limit(20).lean();
    return dialerJson({ sessions: records.map(record => sessionDTO(record)) });
  } catch { return dialerJson({ error: 'Unable to load saved sessions' }, 500); }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await dialerOwner();
    if (!userId) return dialerJson({ error: 'Unauthorized' }, 401);
    const body = await req.json().catch(() => null);
    const key = req.headers.get('Idempotency-Key');
    if (!body || !validateSessionSelection(body.contactIds) || typeof body.name !== 'string'
      || !body.name.trim() || body.name.length > 120 || !key || !/^[\w-]{16,80}$/.test(key)) {
      return dialerJson({ error: 'Choose 1–250 unique contacts and provide a valid session name and request key' }, 400);
    }
    body.contactIds = body.contactIds.map((id: string) => id.toLowerCase());
    if (new Set(body.contactIds).size !== body.contactIds.length) return dialerJson({ error: 'Choose unique contacts' }, 400);
    const hash = createHash('sha256').update(JSON.stringify([body.name.trim(), body.contactIds])).digest('hex');
    const existing = await DialerSession.findOne({ userId, creationKey: key }).lean();
    if (existing) return existing.selectionHash === hash
      ? dialerJson({ session: sessionDTO(existing) }) : dialerJson({ error: 'Request key already used for another selection' }, 409);
    const records = await Contact.find({ userId, _id: { $in: body.contactIds } }).select('_id phones phone doNotContact').lean();
    // Reject mixed ownership instead of silently creating a different queue.
    if (records.length !== body.contactIds.length) return dialerJson({ error: 'One or more contacts are unavailable' }, 400);
    const byId = new Map(records.map(record => [String(record._id), record]));
    const seen = new Set<string>();
    const items: { contactId: string; phone: string; notes: string }[] = [];
    const excluded: { contactId: string; reason: string }[] = [];
    for (const contactId of body.contactIds) {
      const record = byId.get(contactId)!;
      const selected = record.phones?.find(phone => phone.isPrimary) || record.phones?.[0];
      const phone = dialerPhone(selected?.number || record.phone || '');
      const reason = record.doNotContact ? 'Do not contact' : selected?.isValid === false || !phone ? 'Missing or invalid phone' : seen.has(phone) ? 'Duplicate phone' : null;
      if (reason) { excluded.push({ contactId, reason }); continue; }
      seen.add(phone!); items.push({ contactId, phone: phone!, notes: '' });
    }
    if (!items.length) return dialerJson({ error: 'No eligible contacts in this selection', excluded }, 400);
    // Unique index plus upsert makes repeat clicks/retries converge on one session.
    const saved = await DialerSession.findOneAndUpdate({ userId, creationKey: key }, { $setOnInsert: {
      userId, creationKey: key, selectionHash: hash, name: body.name.trim(), provider: 'simulation', status: 'ready', version: 0, items,
    } }, { upsert: true, new: true, runValidators: true }).lean();
    if (saved.selectionHash !== hash) return dialerJson({ error: 'Request key conflict' }, 409);
    return dialerJson({ session: sessionDTO(saved), excluded }, 201);
  } catch { return dialerJson({ error: 'Unable to save session; retry with the same request key' }, 500); }
}
