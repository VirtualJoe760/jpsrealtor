import { headers } from 'next/headers';
import { resolveDomainOwner } from '@/lib/resolveDomainOwner';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';
import { composeAgentPrivacy, agentLegalInfoFromUser } from '@/lib/legal/agent-legal';
import AgentLegalDoc from '@/app/components/legal/AgentLegalDoc';
import PlatformPrivacy from './PlatformPrivacy';

export const dynamic = 'force-dynamic';

/**
 * Platform domains (primary agent) → the full approved master Privacy Policy.
 * An agent's branded domain → that agent's generated Privacy Policy (standard or
 * their custom body + the mandatory SMS clause & platform note).
 */
export default async function PrivacyPage() {
  const h = await headers();
  const host = h.get('host') || '';
  const subdomain = h.get('x-agent-subdomain') || '';
  const req = new Request(
    `https://${host || 'localhost'}/privacy-policy${subdomain ? `?subdomain=${encodeURIComponent(subdomain)}` : ''}`,
    { headers: { host, ...(subdomain ? { 'x-agent-subdomain': subdomain } : {}) } }
  );

  const primaryEmail = (process.env.PRIMARY_AGENT_EMAIL || 'josephsardella@gmail.com').toLowerCase();
  try {
    const { ownerId } = await resolveDomainOwner(req);
    if (ownerId) {
      await dbConnect();
      const user = await User.findById(ownerId)
        .select('name email phone agentProfile brokerageName licenseNumber businessName legal')
        .lean();
      if (user && (user as any).email?.toLowerCase() !== primaryEmail) {
        const info = agentLegalInfoFromUser(user);
        return (
          <AgentLegalDoc
            title="Privacy Policy"
            markdown={composeAgentPrivacy(info, (user as any).legal?.customPrivacy)}
          />
        );
      }
    }
  } catch {
    // fall through to the platform master doc
  }
  return <PlatformPrivacy />;
}
