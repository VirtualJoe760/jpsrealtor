import 'server-only';
import { randomUUID } from 'node:crypto';
import DialerProviderJob from '@/models/DialerProviderJob';
import type { ClaimedProviderJob, ProviderJobStore } from './provider-job-runner';

const LEASE_MS = 60_000;

/** Internal worker store. Caller must connect Mongo first. No HTTP endpoint exposes this. */
export function providerJobStore(): ProviderJobStore {
  const fence = (job: ClaimedProviderJob, state: string) => ({
    _id: job.id, userId: job.userId, sessionId: job.sessionId,
    attemptId: job.attemptId, leaseToken: job.leaseToken, state,
  });
  return {
    async claim() {
      const now = new Date();
      // A worker may have died after the external request. Expiry cannot imply failure.
      await DialerProviderJob.updateMany({ state: 'dispatching', leaseUntil: { $lte: now } },
        { $set: { state: 'unknown' } });
      const leaseToken = randomUUID();
      const job = await DialerProviderJob.findOneAndUpdate({ $or: [
        { state: 'queued' }, { state: 'leased', leaseUntil: { $lte: now } },
      ] }, { $set: { state: 'leased', leaseToken, leaseUntil: new Date(now.getTime() + LEASE_MS) } },
      { new: true, sort: { createdAt: 1 } }).lean();
      return job ? {
        id: String(job._id), userId: String(job.userId), sessionId: String(job.sessionId),
        attemptId: String(job.attemptId), leaseToken,
      } : null;
    },
    async beginDispatch(job) {
      const now = new Date();
      const result = await DialerProviderJob.updateOne({ ...fence(job, 'leased'), leaseUntil: { $gt: now } },
        { $set: { state: 'dispatching', dispatchStartedAt: now, leaseUntil: new Date(now.getTime() + LEASE_MS) } });
      return result.modifiedCount === 1;
    },
    async succeed(job, providerCallId) {
      // Late success is useful evidence, but only from the original fenced worker.
      const result = await DialerProviderJob.updateOne({ ...fence(job, 'dispatching'),
        state: { $in: ['dispatching', 'unknown', 'succeeded'] }, providerCallId: { $in: [null, providerCallId] } },
        { $set: { state: 'succeeded', providerCallId, completedAt: new Date(), leaseUntil: null } });
      return result.matchedCount === 1;
    },
    async markUnknown(job) {
      const result = await DialerProviderJob.updateOne(fence(job, 'dispatching'), { $set: { state: 'unknown' } });
      return result.modifiedCount === 1;
    },
  };
}
