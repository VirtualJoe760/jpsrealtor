/**
 * Agent lead-alert SMS (Phase 3).
 *
 * Platform → agent notification: text the AGENT's own phone when a new/hot lead
 * arrives or an AI surfaces an update. Sent from the platform number (NOT the
 * agent's client-facing Twilio number). Always best-effort — never throws into
 * the caller (lead intake must succeed even if the alert fails).
 */
import User from '@/models/User';
import { sendSMS, formatPhoneNumber } from '@/lib/twilio';

export type LeadAlertKind = 'new_lead' | 'hot_lead' | 'client_update';

export async function notifyAgentLead(opts: {
  agentId: string;
  kind?: LeadAlertKind;
  leadName?: string;
  detail?: string;     // e.g. "Buyer • Palm Desert • $500k–$700k"
  leadPhone?: string;
}): Promise<void> {
  try {
    const agent = await User.findById(opts.agentId)
      .select('phone name agentProfile messaging')
      .lean();
    if (!agent) return;

    // Per-agent opt-out: messaging.leadAlertsSms === false disables alerts.
    if ((agent as any).messaging?.leadAlertsSms === false) return;

    const ap: any = (agent as any).agentProfile || {};
    const rawTarget = ap.cellPhone || ap.officePhone || (agent as any).phone;
    if (!rawTarget) return; // no alert number on file → nothing to do

    const to = formatPhoneNumber(rawTarget);
    if (!to) return;

    const kind = opts.kind || 'new_lead';
    const head =
      kind === 'hot_lead' ? '🔥 Hot lead'
        : kind === 'client_update' ? '💬 Client update'
          : '🏡 New lead';

    const body = [
      `${head}: ${opts.leadName || 'New contact'}`,
      opts.detail || undefined,
      opts.leadPhone ? `📞 ${opts.leadPhone}` : undefined,
      'Open ChatRealty to follow up. Reply STOP to mute alerts.',
    ].filter(Boolean).join('\n');

    await sendSMS({ to, body }); // from the platform env number
  } catch (err) {
    console.error('[notifyAgentLead] failed:', err);
  }
}
