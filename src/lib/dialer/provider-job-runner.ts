import 'server-only';

export interface ClaimedProviderJob {
  id: string;
  userId: string;
  sessionId: string;
  attemptId: string;
  leaseToken: string;
}

export interface ProviderJobStore {
  claim(): Promise<ClaimedProviderJob | null>;
  beginDispatch(job: ClaimedProviderJob): Promise<boolean>;
  succeed(job: ClaimedProviderJob, providerCallId: string): Promise<boolean>;
  markUnknown(job: ClaimedProviderJob): Promise<boolean>;
}

export interface PreparedCall {
  // Must be prepared by trusted server code from owned records, never browser input.
  dispatch(): Promise<{ providerCallId: string }>;
}

/** One bounded work item. No scheduler or production adapter is connected yet. */
export async function runProviderJob(
  store: ProviderJobStore,
  prepare: (job: ClaimedProviderJob) => Promise<PreparedCall>,
): Promise<'idle' | 'deferred' | 'lost-lease' | 'succeeded' | 'unknown'> {
  const job = await store.claim();
  if (!job) return 'idle';
  let call: PreparedCall;
  try {
    // Eligibility, funding, caller identity and configuration checks precede intent.
    call = await prepare(job);
  } catch {
    // No provider request happened. The lease may expire and be claimed again.
    return 'deferred';
  }
  if (!await store.beginDispatch(job)) return 'lost-lease';
  try {
    const result = await call.dispatch();
    if (typeof result.providerCallId !== 'string' || !result.providerCallId.trim() || result.providerCallId.length > 128) {
      throw new Error('Missing provider identity');
    }
    return await store.succeed(job, result.providerCallId) ? 'succeeded' : 'lost-lease';
  } catch {
    // Even a thrown SDK error can follow a successful call creation. Never redial.
    await store.markUnknown(job);
    return 'unknown';
  }
}
