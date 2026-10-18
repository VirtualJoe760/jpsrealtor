const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const mongoose = require('mongoose');
const root = path.resolve(__dirname, '../..');
const owner = 'a'.repeat(24), contactId = 'b'.repeat(24), first = 'c'.repeat(24), second = 'd'.repeat(24);
let data, sequence = 1, failOn = '', indexesReady = true, gate = Promise.resolve();
const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
function reset() {
  data = { sessions: [first, second].map(_id => ({ _id, userId: owner, provider: 'simulation', version: 0, status: 'ready', activeAttemptId: null, items: [{ contactId, phone: '+17605550101', notes: '' }] })),
    attempts: [], agents: [], actions: [], contacts: [{ _id: contactId, userId: owner, phone: '+17605550101' }] };
  failOn = ''; indexesReady = true;
}
function model(name) {
  function document(row) {
    if (!row) return null;
    const value = clone(row);
    value.save = async () => {
      if (failOn === name) throw Error('Injected write failure');
      data[name][data[name].findIndex(item => item._id === value._id)] = clone(value);
      return value;
    };
    return value;
  }
  return {
    schema: { path: field => field === 'status' ? { options: { enum: ['running'] } } : {} },
    init: async () => {},
    collection: { indexes: async () => indexesReady ? [{ unique: true, key: name === 'agents' ? { userId: 1 } : { userId: 1, key: 1 } }] : [] },
    findOne(query) {
      assert.ok(query.userId, name + ' reads must be owner scoped');
      const read = () => data[name].find(row => Object.entries(query).every(([key, value]) => String(row[key]) === String(value)));
      return { session() { return this; }, select() { return this; }, lean: async () => clone(read()), then(resolve) { resolve(document(read())); } };
    },
    async create(rows) {
      if (failOn === name) throw Error('Injected write failure');
      return rows.map(row => {
        const stored = { _id: (sequence++).toString(16).padStart(24, '0'), ...clone(row) };
        data[name].push(stored); return document(stored);
      });
    },
  };
}
function projection(session, attempt) {
  return { ...clone(session), activeAttemptId: session.activeAttemptId || null, activeAttempt: clone(attempt) || null };
}
const mocks = {
  mongoose: { __esModule: true, default: { Types: mongoose.Types, connection: { transaction(callback) {
    const result = gate.then(async () => {
      const previous = clone(data);
      try { return await callback({}); } catch (error) { data = previous; throw error; }
    });
    gate = result.catch(() => {}); return result;
  } } } },
  '@/models/DialerSession': { __esModule: true, default: model('sessions') },
  '@/models/DialerAttempt': { __esModule: true, default: model('attempts') },
  '@/models/DialerAgentState': { __esModule: true, default: model('agents') },
  '@/models/DialerAction': { __esModule: true, default: model('actions') },
  '@/models/Contact': { __esModule: true, default: model('contacts') },
  './session-server': { sessionDTO: projection },
};
function load(file) {
  const compiled = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017, esModuleInterop: true } }).outputText;
  const context = { exports: {}, require: name => mocks[name] || require(name), console, Date };
  vm.runInNewContext(compiled, context); return context.exports;
}
mocks['./session-contract'] = load('src/lib/dialer/session-contract.ts');
const { runSimulationCommand: run, validSimulationCommand, DialerCommandError } = load('src/lib/dialer/simulation-controller.ts');
const start = (session = first, key = 'start-operation-123') => run(owner, session, { command: 'start', version: 0, contactId }, key);
(async () => {
  reset();
  assert.equal(validSimulationCommand({ command: 'start', version: 0, contactId }, null), false);
  const begun = await start();
  const attemptId = begun.session.activeAttempt._id;
  assert.equal(begun.session.activeAttempt.state, 'ringing'); assert.equal(data.attempts.length, 1);
  assert.equal((await start()).replayed, true); assert.equal(data.attempts.length, 1);
  await assert.rejects(run(owner, first, { command: 'end', version: 1, attemptId }, 'start-operation-123'), /already used/);
  await assert.rejects(start(second, 'second-start-1234'), error => error.resumeSessionId === first);
  await assert.rejects(run(owner, first, { command: 'save', version: 1, contactId, notes: 'Draft', outcome: 'Connected' }, 'save-too-early-123'), /End the call/);
  await run(owner, first, { command: 'save', version: 1, contactId, notes: 'Draft' }, 'save-notes-only-123');
  assert.equal(data.sessions[0].status, 'running'); assert.equal(data.attempts[0].notes, 'Draft');
  await run(owner, first, { command: 'answer', version: 2, attemptId }, 'answer-operation-123');
  assert.ok(data.attempts[0].answeredAt);
  await run(owner, first, { command: 'end', version: 3, attemptId }, 'end-operation-123');
  assert.equal(data.attempts[0].state, 'wrap-up'); assert.equal(data.agents[0].activeAttemptId, attemptId);
  await assert.rejects(start(second, 'second-start-5678'), /unfinished/);
  const finalSave = { command: 'save', version: 4, contactId, notes: 'Final note', outcome: 'Connected' };
  const completed = await run(owner, first, finalSave, 'save-outcome-1234');
  assert.equal(completed.session.activeAttempt, null); assert.equal(completed.session.status, 'completed');
  assert.equal(data.agents[0].activeAttemptId, null); assert.equal(data.attempts[0].outcome, 'Connected');
  assert.equal((await run(owner, first, finalSave, 'save-outcome-1234')).replayed, true);
  await start(second, 'allowed-second-start'); assert.equal(data.attempts.length, 2);
  reset();
  const removed = await start();
  data.contacts = [];
  await run(owner, first, { command: 'end', version: 1, attemptId: removed.session.activeAttempt._id }, 'end-deleted-contact');
  await run(owner, first, { command: 'save', version: 2, contactId, notes: 'Historical wrap-up', outcome: 'Connected' }, 'save-deleted-contact');
  assert.equal(data.agents[0].activeAttemptId, null, 'Deleted contact must not strand the agent lock');
  reset(); data.contacts[0].doNotContact = true;
  await assert.rejects(start(), /blocked/); assert.equal(data.attempts.length, 0);
  reset(); data.contacts[0].phone = '+17605550109';
  await assert.rejects(start(), /phone changed/);
  reset(); indexesReady = false;
  await assert.rejects(start(), error => error instanceof DialerCommandError && error.status === 503);
  reset(); failOn = 'actions'; const before = clone(data);
  await assert.rejects(start(), /Injected/); assert.deepEqual(data, before, 'Failed action write must roll back attempt and lock');
  reset();
  await assert.rejects(run('e'.repeat(24), first, { command: 'start', version: 0, contactId }, 'other-owner-start'), error => error.status === 404);
  await assert.rejects(run(owner, first, { command: 'start', version: 3, contactId }, 'stale-version-start'), /another tab/);
  const races = await Promise.allSettled([start(first, 'first-tab-start-123'), start(second, 'second-tab-start-123')]);
  assert.equal(races.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(data.attempts.length, 1); assert.equal(data.agents.length, 1);
  require('tsx/cjs');
  const AgentModel = require(path.join(root, 'src/models/DialerAgentState.ts')).default;
  const AttemptModel = require(path.join(root, 'src/models/DialerAttempt.ts')).default;
  assert.ok(AgentModel.schema.indexes().some(([key, options]) => key.userId === 1 && options.unique));
  assert.ok(AgentModel.schema.indexes().every(([, options]) => options.expireAfterSeconds === undefined));
  assert.ok(new AttemptModel({ userId: owner, sessionId: first, contactId, phone: '+17605550101', provider: 'twilio', state: 'ringing', startedAt: new Date() }).validateSync());
  console.log('PASS: durable simulation transitions, request replay/conflicts, agent lock through wrap-up, contact revalidation, required indexes, rollback and competing-session starts.');
  console.log('Transactions are simulated; Mongo replica-set concurrency and index installation still require integration verification.');
})().catch(error => { console.error(error); process.exitCode = 1; });
