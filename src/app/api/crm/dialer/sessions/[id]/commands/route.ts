import { NextRequest } from 'next/server';
import { dialerJson, dialerOwner } from '@/lib/dialer/session-server';
import { DialerCommandError, runSimulationCommand, validSimulationCommand } from '@/lib/dialer/simulation-controller';

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const owner = await dialerOwner();
    if (!owner) return dialerJson({ error: 'Unauthorized' }, 401);
    const { id } = await context.params;
    const body = await req.json().catch(() => null), key = req.headers.get('Idempotency-Key');
    if (!validSimulationCommand(body, key) || body.command === 'save') return dialerJson({ error: 'Invalid call command' }, 400);
    return dialerJson(await runSimulationCommand(String(owner), id, body, key));
  } catch (failure: any) {
    if (failure instanceof DialerCommandError) return dialerJson({ error: failure.message, resumeSessionId: failure.resumeSessionId }, failure.status);
    if (failure?.code === 11000) return dialerJson({ error: 'Another tab changed this calling session. Reopen it to recover.' }, 409);
    return dialerJson({ error: 'Call command could not be saved. Reconcile or retry the same command; no provider call was placed.' }, 503);
  }
}
