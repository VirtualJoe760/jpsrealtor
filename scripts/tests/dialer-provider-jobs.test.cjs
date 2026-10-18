const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const root = 'F:/web-clients/joseph-sardella/jpsrealtor';
function load(file, deps = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(`${root}/${file}`, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, Date, require: name => {
    if (name === 'server-only') return {};
    return deps[name] || require(name);
  } });
  return module.exports;
}
const { runProviderJob } = load('src/lib/dialer/provider-job-runner.ts');
let now = Date.now(), row, calls;
function matches(query) {
  return Object.entries(query).every(([key, value]) => {
    if (key === '$or') return value.some(matches);
    if (value && typeof value === 'object' && !(value instanceof Date)) {
      if ('$lte' in value) return row[key] <= value.$lte;
      if ('$gt' in value) return row[key] > value.$gt;
      if ('$in' in value) return value.$in.includes(row[key]);
    }
    return row[key] === value;
  });
}
const model = {
  updateMany: async (query, update) => { if (matches(query)) Object.assign(row, update.$set); },
  findOneAndUpdate(query, update) {
    return { lean: async () => {
      if (!matches(query)) return null;
      Object.assign(row, update.$set);
      return { ...row };
    } };
  },
  updateOne: async (query, update) => {
    if (!matches(query)) return { modifiedCount: 0, matchedCount: 0 };
    Object.assign(row, update.$set);
    return { modifiedCount: 1, matchedCount: 1 };
  },
};
const { providerJobStore } = load('src/lib/dialer/provider-job-store.ts', { '@/models/DialerProviderJob': model });
const store = providerJobStore();
function reset() { row = { _id: 'job', userId: 'owner', sessionId: 'session', attemptId: 'attempt', state: 'queued', providerCallId: null }; calls = 0; }
const prepare = async () => ({ dispatch: async () => { calls++; return { providerCallId: 'CAfake' }; } });
(async () => {
  reset();
  assert.equal(await runProviderJob(store, prepare), 'succeeded');
  assert.equal(row.providerCallId, 'CAfake');
  assert.equal(await runProviderJob(store, prepare), 'idle');
  assert.equal(calls, 1);
  reset();
  assert.equal(await runProviderJob(store, async () => { throw Error('Not funded'); }), 'deferred');
  assert.equal(calls, 0);
  row.leaseUntil = new Date(now - 1);
  assert.equal(await runProviderJob(store, prepare), 'succeeded');
  reset();
  assert.equal(await runProviderJob(store, async () => ({ dispatch: async () => { calls++; throw Error('Lost response'); } })), 'unknown');
  row.leaseUntil = new Date(now - 1);
  assert.equal(await runProviderJob(store, prepare), 'idle');
  assert.equal(calls, 1, 'ambiguous create must never retry');
  reset();
  assert.equal(await runProviderJob(store, async () => ({ dispatch: async () => ({ providerCallId: 123 }) })), 'unknown');
  assert.equal(await store.claim(), null, 'malformed provider response must not redial');
  reset();
  const stale = await store.claim();
  row.leaseUntil = new Date(now - 1);
  const fresh = await store.claim();
  assert.notEqual(stale.leaseToken, fresh.leaseToken);
  assert.equal(await store.beginDispatch(stale), false);
  assert.equal(await store.beginDispatch(fresh), true);
  row.leaseUntil = new Date(now - 1);
  assert.equal(await store.claim(), null);
  assert.equal(row.state, 'unknown', 'crash after intent requires reconciliation');
  assert.equal(await store.succeed(stale, 'CAwrong'), false);
  assert.equal(await store.succeed(fresh, 'CAlate'), true);
  assert.equal(row.providerCallId, 'CAlate');
  assert.equal(await store.succeed(fresh, 'CAlate'), true, 'same fenced REST success can follow callback binding');
  assert.equal(await store.succeed(fresh, 'CAother'), false, 'REST response must not replace a callback-bound identity');
  reset();
  const expired = await store.claim();
  row.leaseUntil = new Date(now - 1);
  assert.equal(await store.beginDispatch(expired), false);
  reset();
  const competing = await Promise.all([store.claim(), store.claim()]);
  assert.equal(competing.filter(Boolean).length, 1, 'one job has one worker');
  reset();
  assert.equal(await runProviderJob(store, async () => {
    row.leaseUntil = new Date(now - 1);
    await store.claim();
    return { dispatch: async () => { calls++; return { providerCallId: 'CAstale' }; } };
  }), 'lost-lease');
  assert.equal(calls, 0, 'worker losing its lease during preparation must not dispatch');
  const mongoose = require('mongoose');
  const Job = load('src/models/DialerProviderJob.ts').default;
  const doc = new Job({ userId: new mongoose.Types.ObjectId(), sessionId: new mongoose.Types.ObjectId(), attemptId: new mongoose.Types.ObjectId(), key: 'one', requestHash: 'hash', provider: 'twilio', providerAccountId: 'AC' + 'a'.repeat(32), command: 'create-call' });
  assert.equal(doc.validateSync(), undefined);
  assert.ok(Job.schema.indexes().some(([keys, options]) => keys.userId === 1 && keys.key === 1 && options.unique));
  assert.ok(Job.schema.indexes().every(([, options]) => options.expireAfterSeconds === undefined));
  console.log('Provider job tests passed: fencing, expiry, ambiguous response, late success, schema. No provider requests.');
})().catch(error => { console.error(error); process.exitCode = 1; });
