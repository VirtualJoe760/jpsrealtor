const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { NextResponse } = require('next/server');
const root = 'F:/web-clients/joseph-sardella/jpsrealtor';
function load(file, deps = {}) {
  const module = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(root + '/src/' + file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText,
    { module, exports: module.exports, console, require: key => deps[key] });
  return module.exports;
}
const helper = load('lib/contact-edit.ts');
const normalize = helper.contactDetailUpdates;
assert.throws(() => normalize({ phones: [{ number: 'bad' }] }));
assert.throws(() => normalize({ emails: [{ address: 'invalid' }] }));
assert.throws(() => normalize({ firstName: ' ' }));
assert.throws(() => normalize({ phones: [{ number: '7605550101', isPrimary: true }, { number: '7605550102', isPrimary: true }] }));
const details = normalize({ userId: 'intruder', preferences: { emailOptIn: true }, phones: [{ number: '7605550101', isValid: false }], emails: [{ address: ' PERSON@EXAMPLE.COM ' }] });
assert.equal(details.phone, '7605550101'); assert.equal(details.phones[0].isValid, false);
assert.equal(details.email, 'person@example.com'); assert.equal(details.emails[0].isPrimary, true);
assert.equal(details.userId, undefined); assert.equal(details.preferences, undefined);
let authenticated = true, calls = [], missing = false;
const route = load('app/api/crm/contacts/[id]/route.ts', {
  'next/server': { NextResponse }, 'next-auth': { getServerSession: async () => authenticated ? { user: { id: 'owner' } } : null },
  '@/app/api/auth/[...nextauth]/route': { authOptions: {} }, '@/lib/mongodb': { __esModule: true, default: async () => {} },
  '@/lib/contact-edit': helper, '@/models/Contact': { __esModule: true, default: { findOneAndUpdate: async (...args) => { calls.push(args); return missing ? null : { _id: 'a'.repeat(24), ...args[1].$set }; } } },
});
const context = { params: Promise.resolve({ id: 'a'.repeat(24) }) };
const request = body => ({ json: async () => body });
(async () => {
  authenticated = false; assert.equal((await route.PATCH(request({ firstName: 'Test' }), context)).status, 401); assert.equal(calls.length, 0);
  authenticated = true; assert.equal((await route.PATCH(request({ phones: [{ number: 'bad' }] }), context)).status, 400); assert.equal(calls.length, 0);
  const response = await route.PATCH(request({ phones: [], emails: [{ address: 'test@example.com' }], address: { street: 'New street' }, userId: 'intruder' }), context);
  assert.equal(response.status, 200); assert.equal(calls[0][0].userId, 'owner');
  assert.equal(calls[0][1].$set.userId, undefined); assert.equal(calls[0][1].$unset.phone, 1);
  for (const field of ['latitude', 'longitude', 'lat', 'lng', 'long']) assert.equal(calls[0][1].$unset[field], 1);
  assert.equal(calls[0][1].$set.email, 'test@example.com'); assert.equal(calls[0][2].runValidators, true);
  missing = true; assert.equal((await route.PATCH(request({ firstName: 'Test' }), context)).status, 404);
  console.log('PASS: detail validation, primary synchronization, suppression metadata, auth/ownership, sparse phone removal and stale coordinate invalidation. No database writes.');
})().catch(error => { console.error(error); process.exitCode = 1; });
