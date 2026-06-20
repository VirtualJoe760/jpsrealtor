/**
 * Per-agent email domain provisioning via Resend (Phase B).
 *
 * Platform-managed: under our single Resend account we create + verify a sending
 * DOMAIN per agent. The agent adds the returned DNS records (SPF/DKIM/DMARC) to
 * their domain, then we verify. UNVERIFIED end-to-end against a live Resend
 * account — the SDK response shapes are handled defensively.
 */
import { Resend } from 'resend';

function client(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY is not set');
  return new Resend(apiKey);
}

export interface ResendDnsRecord {
  record?: string;
  name?: string;
  type?: string;
  value?: string;
  ttl?: string;
  priority?: number;
  status?: string;
}

export interface ResendDomainResult {
  id: string;
  name: string;
  status: string; // not_started | pending | verified | failed | temporary_failure
  records: ResendDnsRecord[];
}

function normalize(data: any): ResendDomainResult {
  return {
    id: data?.id,
    name: data?.name,
    status: data?.status ?? 'not_started',
    records: (data?.records as ResendDnsRecord[]) ?? [],
  };
}

/** Create a sending domain on Resend; returns the DNS records the agent must add. */
export async function createResendDomain(domain: string): Promise<ResendDomainResult> {
  const { data, error } = await client().domains.create({ name: domain });
  if (error || !data) throw new Error((error as any)?.message || 'Failed to create domain');
  return normalize(data);
}

/** Fetch a domain's current status + records. */
export async function getResendDomain(domainId: string): Promise<ResendDomainResult> {
  const { data, error } = await client().domains.get(domainId);
  if (error || !data) throw new Error((error as any)?.message || 'Failed to load domain');
  return normalize(data);
}

/** Trigger verification, then return the refreshed status. */
export async function verifyResendDomain(domainId: string): Promise<ResendDomainResult> {
  const { error } = await client().domains.verify(domainId);
  if (error) throw new Error((error as any)?.message || 'Failed to verify domain');
  return getResendDomain(domainId);
}

/** Remove a domain (used if an agent disconnects/changes). */
export async function removeResendDomain(domainId: string): Promise<void> {
  await client().domains.remove(domainId).catch(() => {});
}
