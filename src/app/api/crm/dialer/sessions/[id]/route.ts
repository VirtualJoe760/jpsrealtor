import { NextRequest } from 'next/server';
import DialerSession from '@/models/DialerSession';
import Contact from '@/models/Contact';
import { dialerJson, dialerOwner, sessionDTO } from '@/lib/dialer/session-server';
import DialerAttempt from '@/models/DialerAttempt';
import { DialerCommandError, runSimulationCommand, validSimulationCommand } from '@/lib/dialer/simulation-controller';

type Context = { params: Promise<{ id: string }> };
export async function GET(_req: NextRequest, context: Context) {
  try {
    const userId = await dialerOwner();
    if (!userId) return dialerJson({ error: 'Unauthorized' }, 401);
    const { id } = await context.params;
    if (!/^[a-f\d]{24}$/i.test(id)) return dialerJson({ error: 'Invalid session' }, 400);
    const saved = await DialerSession.findOne({ _id: id, userId }).lean();
    if (!saved) return dialerJson({ error: 'Session not found' }, 404);
    const contacts = await Contact.find({ userId, _id: { $in: saved.items.map((item: any) => item.contactId) } })
      .select('_id firstName lastName organization photo phones phone emails email address notes noteHistory status labels tags doNotContact lastContactDate latitude longitude bedrooms bedroomsTotal bathrooms bathroomsFull bathroomsHalf bathroomsTotalDecimal bathroomsTotalInteger sqft squareFeet yearBuilt propertyType lotSize purchasePrice purchaseDate propertyValue homeValue assessedValue').lean();
    const attempt = saved.activeAttemptId ? await DialerAttempt.findOne({ _id: saved.activeAttemptId, userId, sessionId: saved._id }).lean() : null;
    if (saved.activeAttemptId && !attempt) return dialerJson({ error: 'Saved attempt needs reconciliation' }, 503);
    return dialerJson({ session: sessionDTO(saved, attempt), contacts });
  } catch { return dialerJson({ error: 'Unable to restore session' }, 500); }
}

export async function PATCH(req: NextRequest, context: Context) {
  try {
    const userId = await dialerOwner();
    if (!userId) return dialerJson({ error: 'Unauthorized' }, 401);
    const { id } = await context.params;
    const body = await req.json().catch(() => null), key = req.headers.get('Idempotency-Key');
    const command = body && { ...body, command: 'save' };
    if (!validSimulationCommand(command, key)) return dialerJson({ error: 'Invalid checkpoint' }, 400);
    return dialerJson(await runSimulationCommand(String(userId), id, command, key));
  } catch (failure: any) {
    if (failure instanceof DialerCommandError) return dialerJson({ error: failure.message }, failure.status);
    if (failure?.code === 11000) return dialerJson({ error: 'Session changed in another tab. Reopen it before saving.' }, 409);
    return dialerJson({ error: 'Checkpoint failed; your notes remain in this tab. Retry the same save or reopen to reconcile.' }, 503);
  }
}
