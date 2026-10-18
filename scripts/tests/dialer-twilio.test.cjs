const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const sdk = require('twilio');
const mongoose = require('mongoose');
const root = 'F:/web-clients/joseph-sardella/jpsrealtor';
function load(file, dependencies = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(`${root}/${file}`, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(code + (file === 'src/proxy.ts' ? '\nmodule.exports.testGate = handleApiGate;' : ''), { module, exports: module.exports, URL, URLSearchParams, Buffer, Date, TextDecoder, Uint8Array, process: { env: {} }, require: name => {
    if (name === 'server-only') return {};
    if (name in dependencies) return dependencies[name];
    return require(name);
  } });
  return module.exports;
}
const env = { TWILIO_ACCOUNT_SID: 'AC' + 'a'.repeat(32), TWILIO_AUTH_TOKEN: 'fixture-not-a-real-secret',
  TWILIO_VOICE_API_KEY_SID: 'SK' + 'b'.repeat(32), TWILIO_VOICE_API_KEY_SECRET: 'fixture-key', DIALER_PUBLIC_BASE_URL: 'https://dialer.example.test' };
const jobId = 'c'.repeat(24), callSid = 'CA' + 'd'.repeat(32);
const config = load('src/lib/dialer/twilio-voice-config.ts');
const status = load('src/lib/dialer/twilio-status.ts', { './twilio-voice-config': config });
let initialized = 0, fetched = 0;
let callResult = { sid: callSid, accountSid: env.TWILIO_ACCOUNT_SID, status: 'completed', duration: '42', price: '-0.01', priceUnit: 'USD' };
function fakeSdk(key, secret, options) {
  initialized++;
  assert.equal(key, env.TWILIO_VOICE_API_KEY_SID);
  assert.equal(options.autoRetry, false);
  assert.equal(options.timeout, 10000);
  return { calls: id => ({ fetch: async () => { fetched++; assert.equal(id, callSid); return callResult; } }) };
}
const voice = load('src/lib/dialer/twilio-voice.ts', { twilio: fakeSdk, './twilio-voice-config': config });
function callback(changes = {}, overrides = {}) {
  const fields = { AccountSid: env.TWILIO_ACCOUNT_SID, CallSid: callSid, CallStatus: 'ringing', SequenceNumber: '1', ...changes };
  const url = config.twilioCallbackUrl('status', jobId, env);
  return { url, method: 'POST', contentType: 'application/x-www-form-urlencoded; charset=utf-8',
    signature: sdk.getExpectedTwilioSignature(env.TWILIO_AUTH_TOKEN, url, fields), body: new URLSearchParams(fields).toString(), ...overrides };
}
let connects = 0, job, events, indexesReady = true, failWrite = false;
const index = { unique: true, key: { jobId: 1, providerCallId: 1, sequence: 1 } };
const eventModel = {
  init: async () => {}, collection: { indexes: async () => indexesReady ? [index] : [] },
  findOne: identity => ({ session() { return this; }, lean: async () => events.find(row => Object.entries(identity).every(([k, v]) => row[k] === v)) }),
  create: async rows => { if (failWrite) throw Error('Injected event failure'); events.push(...rows); },
};
const jobModel = { findOne: query => ({ session: async () => {
  assert.equal(query.provider, 'twilio');
  if (query._id !== jobId) return null;
  return { ...job, save: async function () { const { save, ...row } = this; job = row; } };
} }) };
let gate = Promise.resolve();
const fakeMongoose = { connection: { transaction: async work => {
  const previous = gate; let release; gate = new Promise(resolve => { release = resolve; }); await previous;
  const snapshot = { job: { ...job }, events: [...events] };
  try { return await work({}); } catch (error) { job = snapshot.job; events = snapshot.events; throw error; }
  finally { release(); }
} } };
const inbox = load('src/lib/dialer/twilio-status-inbox.ts', { mongoose: fakeMongoose,
  '@/lib/mongoose': async () => { connects++; }, '@/models/DialerProviderJob': jobModel,
  '@/models/DialerProviderEvent': eventModel, './twilio-status': status });
function reset() {
  job = { _id: jobId, userId: 'owner', sessionId: 'session', attemptId: 'attempt', provider: 'twilio',
    state: 'unknown', dispatchStartedAt: new Date(), providerCallId: null, providerAccountId: env.TWILIO_ACCOUNT_SID };
  events = []; failWrite = false; indexesReady = true;
}
(async () => {
  for (const base of ['http://dialer.example.test', 'https://user:pass@dialer.example.test', 'https://dialer.example.test/path', 'https://dialer.example.test/?x=1', 'invalid']) {
    assert.equal(config.publicDialerOrigin({ ...env, DIALER_PUBLIC_BASE_URL: base }), null);
  }
  assert.equal(config.twilioVoiceConfiguration({ ...env, DIALER_TWILIO_DISPATCH_ENABLED: 'true' }).liveCallingEnabled, false);
  const adapter = voice.twilioVoiceAdapter(env);
  assert.equal(initialized, 0, 'lazy import must not construct a client');
  const plan = { jobId, to: '+17605550101', from: '+17605550102', ringSeconds: 30, maxCallSeconds: 180 };
  const options = voice.twilioCallOptions(plan, env);
  assert.equal(options.statusCallback, config.twilioCallbackUrl('status', jobId, env));
  assert.equal(options.timeLimit, 180);
  assert.equal(options.record, false);
  assert.deepEqual(Array.from(options.statusCallbackEvent), ['initiated', 'ringing', 'answered', 'completed']);
  await assert.rejects(adapter.createCall(plan), /not activated/);
  await assert.rejects(voice.twilioVoiceAdapter({ ...env, DIALER_TWILIO_DISPATCH_ENABLED: 'true' }).createCall(plan), /not activated/);
  assert.equal(initialized, 0, 'disabled create must not initialize Twilio');
  for (const patch of [{ to: 'sip:bad' }, { from: plan.to }, { ringSeconds: 600 }, { maxCallSeconds: 0 }, { maxCallSeconds: 1.5 }, { jobId: 'bad' }]) {
    assert.throws(() => voice.twilioCallOptions({ ...plan, ...patch }, env));
  }
  await assert.rejects(adapter.fetchCall('bad'));
  assert.equal(initialized, 0);
  const fetchedCall = await adapter.fetchCall(callSid);
  assert.equal(fetchedCall.durationSeconds, 42);
  assert.equal(fetched, 1);
  callResult = { ...callResult, accountSid: 'AC' + 'f'.repeat(32) };
  await assert.rejects(adapter.fetchCall(callSid), /identity mismatch/);
  assert.equal(status.verifyTwilioStatus(callback(), env).sequence, 1);
  for (const CallStatus of ['queued', 'initiated', 'ringing', 'in-progress', 'completed', 'busy', 'failed', 'no-answer', 'canceled']) {
    assert.equal(status.verifyTwilioStatus(callback({ CallStatus }), env).status, CallStatus);
  }
  assert.equal(status.verifyTwilioStatus(callback({ CallDuration: '42', CallStatus: 'completed' }), env).durationSeconds, 42);
  for (const bad of [callback({}, { signature: 'wrong' }), callback({}, { method: 'GET' }),
    callback({}, { url: 'https://attacker.example.test' + new URL(callback().url).pathname + '?jobId=' + jobId }),
    callback({}, { contentType: 'application/json' }), callback({ AccountSid: 'AC' + 'f'.repeat(32) }),
    callback({ CallSid: 'bad' }), callback({ CallStatus: 'invented' }), callback({ SequenceNumber: '-1' }),
    callback({ CallDuration: '1.2' }), callback({}, { body: 'x'.repeat(16385) }),
    callback({}, { body: callback().body + '&CallStatus=completed' }),
    callback({}, { url: callback().url + '&extra=1' })]) {
    assert.throws(() => status.verifyTwilioStatus(bad, env), /Invalid Twilio/);
  }
  reset();
  await assert.rejects(inbox.receiveTwilioStatus(callback({}, { signature: 'bad' }), env));
  assert.equal(connects, 0, 'signature rejection precedes database access');
  assert.equal((await inbox.receiveTwilioStatus(callback(), env)).duplicate, false);
  assert.equal(job.state, 'succeeded');
  assert.equal(job.providerCallId, callSid);
  assert.equal(events[0].userId, 'owner');
  assert.ok(!('body' in events[0]) && !('To' in events[0]));
  assert.equal((await inbox.receiveTwilioStatus(callback({ To: '+17605559999', userId: 'attacker' }), env)).duplicate, true);
  assert.equal(events.length, 1);
  await assert.rejects(inbox.receiveTwilioStatus(callback({ CallStatus: 'completed' }), env), /identity conflict/);
  await assert.rejects(inbox.receiveTwilioStatus(callback({ CallSid: 'CA' + 'e'.repeat(32) }), env), /does not match/);
  await inbox.receiveTwilioStatus(callback({ SequenceNumber: '0', CallStatus: 'queued' }), env);
  assert.equal(events.length, 2, 'out-of-order evidence is retained without changing conversation state');
  reset(); job.state = 'queued'; job.dispatchStartedAt = null;
  await assert.rejects(inbox.receiveTwilioStatus(callback(), env), /does not match/);
  reset(); job.providerAccountId = 'AC' + 'e'.repeat(32);
  await assert.rejects(inbox.receiveTwilioStatus(callback(), env), /does not match/);
  reset(); failWrite = true;
  await assert.rejects(inbox.receiveTwilioStatus(callback(), env), /Injected/);
  assert.equal(job.state, 'unknown'); assert.equal(events.length, 0);
  reset(); indexesReady = false;
  await assert.rejects(inbox.receiveTwilioStatus(callback(), env), /indexes unavailable/);
  reset();
  const duplicates = await Promise.all([inbox.receiveTwilioStatus(callback(), env), inbox.receiveTwilioStatus(callback(), env)]);
  assert.equal(duplicates.filter(item => item.duplicate).length, 1);
  assert.equal(events.length, 1);
  const Model = load('src/models/DialerProviderEvent.ts').default;
  assert.ok(Model.schema.indexes().some(([keys, options]) => keys.jobId && keys.sequence && options.unique));
  assert.ok(Model.schema.indexes().every(([, options]) => options.expireAfterSeconds === undefined));
  const document = new Model({ userId: new mongoose.Types.ObjectId(), jobId, sessionId: new mongoose.Types.ObjectId(), attemptId: new mongoose.Types.ObjectId(), provider: 'twilio', providerCallId: callSid, sequence: 0, status: 'ringing', payloadHash: 'hash' });
  assert.equal(document.validateSync(), undefined);
  document.status = 'initiated';
  assert.equal(document.validateSync(), undefined);
  let configReady = true;
  const route = load('src/app/api/crm/dialer/webhooks/twilio/status/route.ts', {
    'next/server': { NextResponse: Response },
    '@/lib/dialer/twilio-status-inbox': { receiveTwilioStatus: input => inbox.receiveTwilioStatus(input, env) },
    '@/lib/dialer/twilio-status': status,
    '@/lib/dialer/twilio-voice-config': { twilioVoiceConfiguration: () => config.twilioVoiceConfiguration(configReady ? env : {}) },
  });
  const request = (input = callback(), headers = {}) => new Request(input.url, { method: 'POST',
    headers: { 'content-type': input.contentType, 'x-twilio-signature': input.signature, ...headers }, body: input.body });
  reset();
  let response = await route.POST(request());
  assert.equal(response.status, 204);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal((await route.POST(request())).status, 204);
  assert.equal(events.length, 1);
  assert.equal((await route.POST(request(callback({}, { signature: 'wrong' })))).status, 403);
  assert.equal((await route.POST(request(callback(), { 'x-twilio-signature': '' }))).status, 403);
  assert.equal((await route.POST(request(callback(), { 'content-type': 'application/json' }))).status, 415);
  assert.equal((await route.POST(request(callback(), { 'content-length': '99999' }))).status, 413);
  assert.equal((await route.POST(request(callback({}, { body: 'x'.repeat(20000) })))).status, 413);
  configReady = false;
  assert.equal((await route.POST(request())).status, 503);
  configReady = true; failWrite = true;
  assert.equal((await route.POST(request(callback({ SequenceNumber: '9' })))).status, 503, 'failed persistence must not acknowledge');
  const proxy = load('src/proxy.ts', { 'next/server': { NextResponse: {
    next: () => ({ status: 200 }), json: (_body, options) => ({ status: options.status }),
  } }, 'next-auth/jwt': { getToken: async () => null } });
  assert.equal((await proxy.testGate({}, config.TWILIO_STATUS_PATH)).status, 200);
  for (const path of [config.TWILIO_STATUS_PATH + '/other', '/api/crm/dialer/sessions', '/api/crm/dialer/webhooks/twilio/voice']) {
    assert.equal((await proxy.testGate({}, path)).status, 401, 'only exact status path bypasses session gate');
  }
  console.log('PASS: lazy/gated Twilio adapter, bounded call plans, account-bound lookup, signed status validation and transactional replay-safe inbox. No provider/database requests.');
})().catch(error => { console.error(error); process.exitCode = 1; });
