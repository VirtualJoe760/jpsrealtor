import { headers } from 'next/headers';
import { resolveDomainOwner } from '@/lib/resolveDomainOwner';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';
import { composeAgentTerms, agentLegalInfoFromUser } from '@/lib/legal/agent-legal';
import AgentLegalDoc from '@/app/components/legal/AgentLegalDoc';
import PlatformTerms from './PlatformTerms';

export const dynamic = 'force-dynamic';

/**
 * On the platform domains (Joseph / primary agent) → render the full approved
 * master Terms. On an agent's branded domain → render that agent's generated
 * Terms (standard or their custom body + the mandatory platform & SMS clauses).
 */
export default async function TermsPage() {
  const h = await headers();
  const host = h.get('host') || '';
  const subdomain = h.get('x-agent-subdomain') || '';
  const req = new Request(
    `https://${host || 'localhost'}/terms-of-service${subdomain ? `?subdomain=${encodeURIComponent(subdomain)}` : ''}`,
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
            title="Terms of Service"
            markdown={composeAgentTerms(info, (user as any).legal?.customTerms)}
          />
        );
      }
    }
  } catch {
    // fall through to the platform master doc
  }
  return <PlatformTerms />;
}
