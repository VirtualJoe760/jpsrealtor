import 'server-only';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongoose';
import DialerProviderJob from '@/models/DialerProviderJob';
import DialerProviderEvent from '@/models/DialerProviderEvent';
import { verifyTwilioStatus } from './twilio-status';
import type { VoiceEnvironment } from './twilio-voice-config';

/** Signed ingress boundary shared by the status route and offline fixtures. */
export async function receiveTwilioStatus(input: Parameters<typeof verifyTwilioStatus>[0], env: VoiceEnvironment = process.env) {
  // Reject unauthenticated traffic before connecting to the database.
  const event = verifyTwilioStatus(input, env);
  await dbConnect();
  await DialerProviderEvent.init();
  const indexes = await DialerProviderEvent.collection.indexes();
  if (!indexes.some(index => index.unique && !index.sparse && !index.partialFilterExpression &&
    Object.keys(index.key).length === 3 && index.key.jobId === 1 && index.key.providerCallId === 1 && index.key.sequence === 1)) {
    throw new Error('Provider event indexes unavailable');
  }
  const persist = () => mongoose.connection.transaction(async session => {
    const job = await DialerProviderJob.findOne({ _id: event.jobId, provider: 'twilio', command: 'create-call' }).session(session);
    if (!job || job.providerAccountId !== env.TWILIO_ACCOUNT_SID || !job.dispatchStartedAt || !['dispatching', 'unknown', 'succeeded'].includes(job.state) ||
      (job.providerCallId && job.providerCallId !== event.providerCallId)) {
      throw new Error('Provider callback does not match a dispatched job');
    }
    const identity = { jobId: job._id, providerCallId: event.providerCallId, sequence: event.sequence };
    const existing = await DialerProviderEvent.findOne(identity).session(session).lean();
    if (existing) {
      if (existing.payloadHash !== event.payloadHash) throw new Error('Provider event identity conflict');
      return { duplicate: true, jobId: String(job._id) };
    }
    await DialerProviderEvent.create([{
      ...identity, userId: job.userId, sessionId: job.sessionId, attemptId: job.attemptId,
      provider: 'twilio', status: event.status, durationSeconds: event.durationSeconds, payloadHash: event.payloadHash,
    }], { session });
    // A signed callback proves call creation even when the REST response was lost.
    // Succeeded describes the create command, not the conversation's outcome.
    job.providerCallId = event.providerCallId;
    job.state = 'succeeded';
    job.completedAt ||= new Date();
    job.leaseUntil = null;
    await job.save({ session });
    return { duplicate: false, jobId: String(job._id) };
  });
  try { return await persist(); } catch (error) {
    // Concurrent exact delivery can race the unique index; re-read transactionally.
    if ((error as { code?: number }).code === 11000) return persist();
    throw error;
  }
}
