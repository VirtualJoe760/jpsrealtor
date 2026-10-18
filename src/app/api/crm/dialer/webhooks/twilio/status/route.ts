import { NextRequest, NextResponse } from 'next/server';
import { receiveTwilioStatus } from '@/lib/dialer/twilio-status-inbox';
import { TwilioStatusValidationError } from '@/lib/dialer/twilio-status';
import { twilioVoiceConfiguration } from '@/lib/dialer/twilio-voice-config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const LIMIT = 16_384;
const reply = (status: number) => new NextResponse(null, { status, headers: { 'Cache-Control': 'no-store' } });

export async function POST(request: NextRequest) {
  const config = twilioVoiceConfiguration();
  if (!config.accountConfigured || !config.signatureSecretConfigured || !config.callbackBaseConfigured) return reply(503);
  if (!request.headers.get('x-twilio-signature')) return reply(403);
  const contentType = request.headers.get('content-type') || '';
  if (contentType.split(';')[0].trim().toLowerCase() !== 'application/x-www-form-urlencoded') return reply(415);
  if (Number(request.headers.get('content-length')) > LIMIT) return reply(413);
  // Bound the stream itself; content-length is not trustworthy.
  const reader = request.body?.getReader();
  if (!reader) return reply(400);
  let body = '';
  try {
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > LIMIT) { await reader.cancel(); return reply(413); }
      chunks.push(chunk.value);
    }
    body = new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks));
  } catch { return reply(400); }
  finally { reader.releaseLock(); }
  try {
    await receiveTwilioStatus({ url: request.url, method: request.method, contentType,
      signature: request.headers.get('x-twilio-signature') || '', body });
    // Acknowledge only after durable commit. No raw callback data or credentials in logs.
    return reply(204);
  } catch (error) {
    return reply(error instanceof TwilioStatusValidationError ? 403 : 503);
  }
}
