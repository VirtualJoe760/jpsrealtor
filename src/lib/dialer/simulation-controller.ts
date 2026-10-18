import { createHash } from 'crypto';
import mongoose from 'mongoose';
import DialerSession from '@/models/DialerSession';
import DialerAttempt from '@/models/DialerAttempt';
import DialerAgentState from '@/models/DialerAgentState';
import DialerAction from '@/models/DialerAction';
import Contact from '@/models/Contact';
import { DIALER_OUTCOMES, dialerPhone, type DialerOutcome } from './session-contract';
import { sessionDTO } from './session-server';

export class DialerCommandError extends Error {
  constructor(message: string, public status = 409, public resumeSessionId?: string) { super(message); }
}
type Command = {
  command: 'start' | 'answer' | 'end' | 'save'; version: number; contactId?: string;
  attemptId?: string; notes?: string; outcome?: DialerOutcome;
};
const validId = (value: unknown): value is string => typeof value === 'string' && /^[a-f\d]{24}$/i.test(value);

export function validSimulationCommand(body: any, key: string | null): body is Command {
  if (!body || !key || !/^[\w:-]{16,100}$/.test(key) || !Number.isSafeInteger(body.version) || body.version < 0) return false;
  if (body.command === 'start') return validId(body.contactId);
  if (body.command === 'answer' || body.command === 'end') return validId(body.attemptId);
  return body.command === 'save' && validId(body.contactId) && typeof body.notes === 'string' && body.notes.length <= 10000
    && (body.outcome === undefined || DIALER_OUTCOMES.includes(body.outcome));
}

/** No provider or wallet dependency. Transactional simulation is the controller's first adapter. */
export async function runSimulationCommand(user: string, id: string, body: Command, key: string) {
  if (!validId(user) || !validId(id) || !validSimulationCommand(body, key)) throw new DialerCommandError('Invalid dialer command', 400);
  if (!DialerSession.schema.path('activeAttemptId') || !(DialerSession.schema.path('status') as any)?.options.enum.includes('running')) {
    throw new DialerCommandError('Restart the application to load the updated dialer schemas', 503);
  }
  // init() may not build indices when autoIndex is disabled. Inspect the actual
  // constraints before relying on them for two concurrent first-time starts.
  await Promise.all([DialerAgentState.init(), DialerAction.init()]);
  const [agentIndexes, actionIndexes] = await Promise.all([DialerAgentState.collection.indexes(), DialerAction.collection.indexes()]);
  if (!agentIndexes.some(index => index.unique && !index.sparse && !index.partialFilterExpression && JSON.stringify(index.key) === '{"userId":1}')
    || !actionIndexes.some(index => index.unique && !index.sparse && !index.partialFilterExpression && JSON.stringify(index.key) === '{"userId":1,"key":1}')) {
    throw new DialerCommandError('Dialer storage indexes must be installed before calling', 503);
  }
  const userId = new mongoose.Types.ObjectId(user), sessionId = new mongoose.Types.ObjectId(id);
  const hash = createHash('sha256').update(JSON.stringify([id, body.command, body.version, body.contactId, body.attemptId, body.notes, body.outcome])).digest('hex');
  return mongoose.connection.transaction(async transaction => {
    const current = await DialerSession.findOne({ _id: sessionId, userId }).session(transaction);
    if (!current) throw new DialerCommandError('Session not found', 404);
    if (current.provider !== 'simulation') throw new DialerCommandError('This controller supports simulated calls only');
    let attempt = current.activeAttemptId ? await DialerAttempt.findOne({ _id: current.activeAttemptId, userId, sessionId }).session(transaction) : null;
    if (current.activeAttemptId && !attempt) throw new DialerCommandError('Attempt needs reconciliation', 503);
    const previous = await DialerAction.findOne({ userId, key }).session(transaction).lean();
    if (previous) {
      if (previous.requestHash !== hash) throw new DialerCommandError('Request key already used for another command');
      return { session: sessionDTO(current, attempt), replayed: true };
    }
    if (current.version !== body.version) throw new DialerCommandError('Session changed in another tab. Reopen it before continuing.');
    const now = new Date();
    if (body.command === 'start') {
      if (attempt || current.status === 'completed') throw new DialerCommandError('Finish the current attempt before starting another', 409, id);
      const item = current.items.find(item => String(item.contactId) === body.contactId);
      if (!item || item.outcome) throw new DialerCommandError('Queue item is already completed or unavailable');
      const contact = await Contact.findOne({ _id: item.contactId, userId }).select('phones phone doNotContact').session(transaction).lean();
      const selected = contact?.phones?.find(phone => phone.isPrimary) || contact?.phones?.[0];
      if (!contact || contact.doNotContact || selected?.isValid === false || dialerPhone(selected?.number || contact.phone || '') !== item.phone) {
        throw new DialerCommandError('Contact is blocked, deleted or its selected phone changed. Review the contact before calling.');
      }
      let agent = await DialerAgentState.findOne({ userId }).session(transaction);
      if (agent?.activeAttemptId) throw new DialerCommandError('Another session has an unfinished call or wrap-up. Resume it first.', 409, String(agent.activeSessionId));
      [attempt] = await DialerAttempt.create([{ userId, sessionId, contactId: item.contactId, phone: item.phone,
        provider: 'simulation', state: 'ringing', startedAt: now, notes: item.notes }], { session: transaction });
      if (!agent) [agent] = await DialerAgentState.create([{ userId, activeSessionId: sessionId, activeAttemptId: attempt._id }], { session: transaction });
      else { agent.activeSessionId = sessionId; agent.activeAttemptId = attempt._id; await agent.save({ session: transaction }); }
      current.activeAttemptId = attempt._id; current.status = 'running';
    } else if (body.command === 'answer' || body.command === 'end') {
      if (!attempt || String(attempt._id) !== body.attemptId) throw new DialerCommandError('The requested attempt is no longer active');
      if (body.command === 'answer') {
        if (attempt.state !== 'ringing') throw new DialerCommandError('This attempt is no longer ringing');
        attempt.state = 'connected'; attempt.answeredAt = now;
      } else {
        if (attempt.state === 'completed') throw new DialerCommandError('Attempt already completed');
        attempt.state = 'wrap-up'; attempt.endedAt ||= now; current.status = 'wrap-up';
      }
      await attempt.save({ session: transaction });
    } else {
      const item = current.items.find(item => String(item.contactId) === body.contactId);
      if (!item || item.outcome) throw new DialerCommandError('Queue item is already completed or unavailable');
      // Wrap-up is owned history, not a Contact mutation. A deleted/transferred
      // contact must not strand the agent lock after an already-started attempt.
      if (attempt && String(attempt.contactId) !== body.contactId) throw new DialerCommandError('Finish the active contact first');
      if (body.outcome && attempt && attempt.state !== 'wrap-up') throw new DialerCommandError('End the call before saving its outcome');
      item.notes = body.notes;
      if (attempt) attempt.notes = body.notes;
      if (body.outcome) {
        item.outcome = body.outcome;
        if (attempt) {
          const agent = await DialerAgentState.findOne({ userId, activeSessionId: sessionId, activeAttemptId: attempt._id }).session(transaction);
          if (!agent) throw new DialerCommandError('Agent state needs reconciliation', 503);
          agent.activeAttemptId = null; agent.activeSessionId = null; await agent.save({ session: transaction });
          attempt.state = 'completed'; attempt.completedAt = now; attempt.outcome = body.outcome;
          current.activeAttemptId = null;
        }
        current.status = current.items.every(item => !!item.outcome) ? 'completed' : 'paused';
      } else if (!attempt) current.status = 'paused';
      if (attempt) await attempt.save({ session: transaction });
    }
    current.version += 1;
    await current.save({ session: transaction });
    await DialerAction.create([{ userId, sessionId, key, requestHash: hash, command: body.command, attemptId: attempt?._id || null }], { session: transaction });
    return { session: sessionDTO(current, current.activeAttemptId ? attempt : null), replayed: false };
  });
}
