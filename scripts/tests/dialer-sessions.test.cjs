// Offline route tests: no database, credentials, provider calls or payments.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { NextResponse } = require('next/server');
const root = path.resolve(__dirname, '../..');
const owner = 'a'.repeat(24), first = 'b'.repeat(24), second = 'c'.repeat(24), third = 'd'.repeat(24), id = 'e'.repeat(24);
let authenticated = true, stored = null, queryLog = [], delegated = [];
let contacts = [
  { _id: first, phones: [{ number: '(760) 555-0101', isValid: true }] },
  { _id: second, phone: '+17605550101' },
  { _id: third, phone: '+17605550103', doNotContact: true },
];
function chain(value) { return { select() { return this; }, sort() { return this; }, limit() { return this; }, lean: async () => value }; }
const sessions = {
  find(query) { queryLog.push(query); return chain(stored ? [stored] : []); },
  findOne(query) { queryLog.push(query); return chain(stored && (!query.creationKey || query.creationKey === stored.creationKey) ? structuredClone(stored) : null); },
  findOneAndUpdate(query, update) {
    queryLog.push(query);
    if (update.$setOnInsert && !stored) stored = { _id: id, updatedAt: new Date(), ...structuredClone(update.$setOnInsert) };
    else if (update.$inc && stored.version === query.version) {
      for (const [key, value] of Object.entries(update.$set)) {
        if (key.startsWith('items.')) { const [, index, field] = key.split('.'); stored.items[index][field] = value; }
        else stored[key] = value;
      }
      stored.version++;
    } else if (update.$inc) return chain(null);
    return chain(structuredClone(stored));
  },
};
const mocks = {
  'next/server': { NextResponse },
  '@/models/DialerAttempt': { __esModule: true, default: { findOne: () => chain(null) } },
  '@/lib/dialer/simulation-controller': {
    DialerCommandError: class extends Error {},
    validSimulationCommand: (body, key) => !!key && key.length >= 16 && body && Number.isSafeInteger(body.version) && body.version >= 0 && (body.command === 'start' ? !!body.contactId : body.command === 'save' && typeof body.notes === 'string' && body.notes.length <= 10000 && (!body.outcome || contract.DIALER_OUTCOMES.includes(body.outcome))),
    runSimulationCommand: async (...args) => { delegated.push(args); return { session: stored }; },
  },
  '@/models/DialerSession': { __esModule: true, default: sessions },
  '@/models/Contact': { __esModule: true, default: {
    find(query) { queryLog.push(query); return chain(contacts.filter(contact => query._id.$in.includes(contact._id))); },
    findOne(query) { queryLog.push(query); return chain(contacts.find(contact => contact._id === query._id)); },
  } },
  '@/lib/dialer/session-server': {
    dialerOwner: async () => authenticated ? owner : null,
    dialerJson: (body, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } }),
    sessionDTO: record => ({ _id: record._id, name: record.name, version: record.version, items: record.items, status: record.status }),
  },
};
function load(relative) {
  const code = ts.transpileModule(fs.readFileSync(path.join(root, relative), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
  const context = { exports: {}, require: name => mocks[name] || require(name), console, Set, Map, Date };
  vm.runInNewContext(code, context); return context.exports;
}
const contract = load('src/lib/dialer/session-contract.ts');
mocks['@/lib/dialer/session-contract'] = contract;
const collection = load('src/app/api/crm/dialer/sessions/route.ts');
const detail = load('src/app/api/crm/dialer/sessions/[id]/route.ts');
const request = (body, key = 'test-request-key-123') => ({ json: async () => body, headers: new Headers({ 'Idempotency-Key': key }) });
const context = { params: Promise.resolve({ id }) };
(async () => {
  assert.equal(contract.dialerPhone('(760) 555-0101'), '+17605550101');
  assert.equal(contract.dialerPhone('7605550101 ext 4'), null);
  assert.equal(contract.validateSessionSelection(Array(251).fill(first)), false);
  authenticated = false;
  assert.equal((await collection.GET()).status, 401);
  assert.equal((await collection.POST(request({}))).status, 401);
  assert.equal((await detail.PATCH(request({}), context)).status, 401);
  assert.equal(queryLog.length, 0);
  authenticated = true;
  assert.equal((await collection.POST(request({ name: 'Test', contactIds: [first, first] }))).status, 400);
  assert.equal((await collection.POST(request({ name: 'Test', contactIds: ['f'.repeat(24)] }))).status, 400);
  const body = { name: 'Test', contactIds: [first, second, third] };
  const created = await collection.POST(request(body));
  assert.equal(created.status, 201);
  const data = await created.json();
  assert.equal(data.session.items.length, 1);
  assert.equal(data.excluded.length, 2);
  assert.equal(created.headers.get('Cache-Control'), 'no-store');
  assert.equal((await collection.POST(request(body))).status, 200);
  assert.equal((await collection.POST(request({ ...body, name: 'Changed' }))).status, 409);
  assert.equal((await detail.PATCH(request({ version: 0, contactId: first, notes: 'Draft' }), context)).status, 200);
  assert.equal(delegated.length, 1); assert.equal(delegated[0][0], owner);
  assert.equal(delegated[0][2].command, 'save'); assert.equal(delegated[0][2].notes, 'Draft');
  assert.equal((await detail.PATCH(request({ version: -1, contactId: first, notes: 'Bad' }), context)).status, 400);
  assert.equal((await detail.PATCH(request({ version: 1, contactId: first, notes: '', outcome: 'invented' }), context)).status, 400);
  const commands = load('src/app/api/crm/dialer/sessions/[id]/commands/route.ts');
  authenticated = false; assert.equal((await commands.POST(request({ command: 'start', version: 0, contactId: first }), context)).status, 401);
  authenticated = true; assert.equal((await commands.POST(request({ command: 'start', version: 0, contactId: first }), context)).status, 200);
  assert.equal((await commands.POST(request({ command: 'save', version: 0, contactId: first, notes: '' }), context)).status, 400);
  assert.equal((await detail.GET({}, context)).status, 200);
  assert.ok(queryLog.every(query => query.userId === owner), 'Every private query includes owner');
  require.extensions['.css'] = () => {};
  require('tsx/cjs');
  const SessionModel = require(path.join(root, 'src/models/DialerSession.ts')).default;
  const invalidModel = new SessionModel({ userId: owner, creationKey: 'schema-test', selectionHash: 'hash', name: 'Invalid', items: [{ contactId: first, phone: '+17605550101', outcome: 'invented' }] });
  assert.ok(invalidModel.validateSync(), 'Schema must reject undeclared outcomes');
  const validModel = new SessionModel({ userId: owner, creationKey: 'schema-test', selectionHash: 'hash', name: 'Valid', items: [{ contactId: first, phone: '+17605550101', notes: 'Kept', outcome: 'Connected' }] });
  assert.equal(validModel.validateSync(), undefined);
  assert.equal(validModel.toObject().items[0].notes, 'Kept');
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const Dialer = require(path.join(root, 'src/app/components/crm/DialerMockup.tsx')).default;
  const html = renderToStaticMarkup(React.createElement(Dialer, {
    isLight: true,
    contacts: [{ _id: first, firstName: 'First', phone: '+17605550101' }, { _id: second, firstName: 'Next', phone: '+17605550102' }],
    savedSession: { _id: id, name: 'Restored', version: 1, items: [{ contactId: first, phone: '+17605550101', notes: '', outcome: 'Connected' }, { contactId: second, phone: '+17605550102', notes: 'Recovered draft' }] },
    onCheckpoint: async () => { throw new Error('Rendering must not save or call'); },
  }));
  assert.ok(html.includes('CONTACT 2 OF 2'));
  assert.ok(html.includes('Recovered draft'));
  assert.ok(html.includes('Saved queue'));
  assert.ok(!html.includes('Reset preview'), 'Saved workspaces must not expose a local reset');
  assert.equal(contract.attemptElapsedSeconds({ answeredAt: '2026-10-18T00:00:00Z', endedAt: '2026-10-18T00:02:31Z' }), 151);
  assert.ok(html.includes('Start dialer'));
  console.log('PASS: saved sessions auth, ownership filters, selection limits, suppression/dedup, idempotency, checkpoint validation/delegation and call-command auth.');
  console.log('PASS: restored workspace starts at unfinished contact with saved notes and no automatic call/save.');
})().catch(error => { console.error(error); process.exitCode = 1; });
