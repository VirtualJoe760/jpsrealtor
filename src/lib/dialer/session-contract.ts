export const MAX_SESSION_CONTACTS = 250;
export const DIALER_OUTCOMES = ['Connected', 'Interested', 'Follow up', 'No answer', 'Bad line', 'Voicemail', 'Wrong number', 'Do not call', 'Skipped'] as const;
export type DialerOutcome = typeof DIALER_OUTCOMES[number];
export interface SavedDialerAttempt {
  _id: string;
  contactId: string;
  state: 'ringing' | 'connected' | 'wrap-up' | 'completed';
  startedAt: string;
  answeredAt?: string;
  endedAt?: string;
}
/** UI elapsed time only; provider billing uses independent metered usage. */
export function attemptElapsedSeconds(attempt?: SavedDialerAttempt | null, now = Date.now()) {
  if (!attempt?.answeredAt) return 0;
  const start = Date.parse(attempt.answeredAt), end = attempt.endedAt ? Date.parse(attempt.endedAt) : now;
  return Number.isFinite(start) && Number.isFinite(end) ? Math.max(0, Math.floor((end - start) / 1000)) : 0;
}
export interface SavedDialerItem {
  contactId: string;
  phone: string;
  outcome?: DialerOutcome;
  notes: string;
}
export interface SavedDialerSession {
  _id: string;
  name: string;
  version: number;
  status: 'ready' | 'running' | 'wrap-up' | 'paused' | 'completed';
  activeAttemptId?: string | null;
  activeAttempt?: SavedDialerAttempt | null;
  items: SavedDialerItem[];
  updatedAt: string;
}

/** Normalize only unambiguous NANP or explicit international numbers. */
export function dialerPhone(raw: string): string | null {
  const clean = raw.trim().replace(/[\s().-]/g, '');
  if (/^[2-9]\d{9}$/.test(clean)) return '+1' + clean;
  if (/^1[2-9]\d{9}$/.test(clean)) return '+' + clean;
  return /^\+[1-9]\d{7,14}$/.test(clean) ? clean : null;
}

export function validateSessionSelection(value: unknown): value is string[] {
  return Array.isArray(value) && value.length > 0 && value.length <= MAX_SESSION_CONTACTS
    && value.every(id => typeof id === 'string' && /^[a-f\d]{24}$/i.test(id))
    && new Set(value).size === value.length;
}
