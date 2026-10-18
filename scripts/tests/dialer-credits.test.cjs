// Offline financial invariants. No Stripe requests, DB connection or real money.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const mongoose = require('mongoose');
const root = path.resolve(__dirname, '../..');
const owner = 'a'.repeat(24), attempt = 'b'.repeat(24);
let wallet, sandboxWallet = null, holds, failCreate = false;
function reset(balance = 10) { wallet = { userId: owner, balance, reservedCredits: 0, totalEarned: 0, totalSpent: 0, __v: 0, transactions: [] }; holds = []; }
// Interpret only the Mongo expression operators exercised by these pipelines.
// Unknown operators fail the test instead of silently accepting malformed updates.
function expr(value, row) {
  if (typeof value === 'string') return value.startsWith('$') ? row[value.slice(1)] : value;
  if (Array.isArray(value)) return value.map(item => expr(item, row));
  if (!value || typeof value !== 'object' || value instanceof mongoose.Types.ObjectId || value instanceof Date) return value;
  const keys = Object.keys(value);
  if (keys.length === 1 && keys[0].startsWith('$')) {
    const [operator] = keys, input = value[operator];
    if (operator === '$literal') return input;
    const args = expr(input, row);
    if (operator === '$ifNull') return args[0] ?? args[1];
    if (operator === '$add') return args.reduce((a, b) => a + b, 0);
    if (operator === '$subtract') return args[0] - args[1];
    if (operator === '$gte') return args[0] >= args[1];
    if (operator === '$round') return Math.round(args[0] * 10 ** args[1]) / 10 ** args[1];
    if (operator === '$concatArrays') { assert.ok(args.every(Array.isArray)); return args.flat(); }
    if (operator === '$mergeObjects') return Object.assign({}, ...args);
    throw Error('Unsupported Mongo expression ' + operator);
  }
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, expr(entry, row)]));
}
function apply(pipeline, target = wallet) { for (const stage of pipeline) Object.assign(target, expr(stage.$set, target)); }
function matches(query, target) {
  assert.equal(String(query.userId), owner, 'Wallet query must be owner-scoped');
  if (!target) return false;
  if (query.$expr && !expr(query.$expr, target)) return false;
  if (query.balance && target.balance < query.balance.$gte) return false;
  if (query.reservedCredits && target.reservedCredits < query.reservedCredits.$gte) return false;
  if (query.transactions) {
    const expected = query.transactions.$not.$elemMatch;
    if (target.transactions.some(entry => entry.type === expected.type && entry.stripePaymentIntentId === expected.stripePaymentIntentId)) return false;
  }
  return true;
}
function makeLedgerMock(read, write) {
 return {
  findOne(query) { assert.equal(String(query.userId), owner); return { select() { return this; }, lean: async () => !query.transactions ? read() : read()?.transactions.some(entry => entry.type === 'topup_purchase' && entry.stripePaymentIntentId === query.transactions.$elemMatch.stripePaymentIntentId) ? { _id: owner } : null }; },
  async updateOne(query, update) { assert.equal(String(query.userId), owner); if (!read()) write({ ...update.$setOnInsert }); },
  async findOneAndUpdate(query, pipeline) { if (!matches(query, read())) return null; apply(pipeline, read()); return structuredClone(read()); },
 };
}
const ledgerMock = makeLedgerMock(() => wallet, value => { wallet = value; });
const sandboxMock = makeLedgerMock(() => sandboxWallet, value => { sandboxWallet = value; });
function holdDoc(row) { return row && { ...row, async save() { Object.assign(holds.find(item => item.key === row.key), this); }, toObject() { const { save, toObject, ...data } = this; return data; } }; }
const reservationMock = {
  findOne(query) {
    assert.equal(String(query.userId), owner);
    const value = holds.find(item => item.key === query.key);
    return { session() { return this; }, lean: async () => value ? { ...value } : null, then(resolve) { resolve(holdDoc(value)); } };
  },
  async create(rows) { if (failCreate) throw Error('Injected write failure'); holds.push(...rows); return rows.map(holdDoc); },
};
const fakeMongoose = { Types: mongoose.Types, connection: { async transaction(callback) {
  const before = { wallet: structuredClone(wallet), holds: holds.map(row => ({ ...row })) };
  try { return await callback({}); } catch (error) { wallet = before.wallet; holds = before.holds; throw error; }
} } };
const mocks = {
  mongoose: { __esModule: true, default: fakeMongoose },
  '@/lib/mongoose': { __esModule: true, default: async () => {} },
  '@/models/CreditLedger': { __esModule: true, default: ledgerMock },
  '@/lib/credit-wallet-mode': { creditWalletForMode: mode => { if (!['live','test'].includes(mode)) throw Error('Unknown mode'); return mode === 'test' ? sandboxMock : ledgerMock; } },
  '@/models/CreditReservation': { __esModule: true, default: reservationMock },
};
function load(relative) {
  const output = ts.transpileModule(fs.readFileSync(path.join(root, relative), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
  const context = { exports: {}, require: key => mocks[key] || require(key), console: { ...console, error() {} }, Date, Math, Number, URL, process: { env: { STRIPE_SECRET_KEY: 'sk_test_offline_fixture', STRIPE_WEBHOOK_SECRET: 'whsec_offline_fixture' } } };
  vm.runInNewContext(output, context); return context.exports;
}
mocks['@/lib/stripe-mode'] = load('src/lib/stripe-mode.ts');
mocks['@/config/credits'] = load('src/config/credits.ts');
mocks['@/lib/credit-topup-quote'] = load('src/lib/credit-topup-quote.ts');
const { quoteCreditTopup } = mocks['@/lib/credit-topup-quote'];
const { fulfillCreditTopup } = load('src/lib/credit-topup-fulfillment.ts');
const { reserveDialerCredits, settleDialerCredits } = load('src/lib/dialer/credit-reservations.ts');
(async () => {
  const { stripeConfiguration } = mocks['@/lib/stripe-mode'];
  assert.equal(stripeConfiguration({ STRIPE_SECRET_KEY: 'sk_test_fixture' }).checkoutConfigured, false);
  assert.equal(stripeConfiguration({ STRIPE_SECRET_KEY: 'sk_test_fixture', STRIPE_WEBHOOK_SECRET: 'whsec_fixture' }).checkoutConfigured, true);
  assert.equal(stripeConfiguration({ STRIPE_SECRET_KEY: 'sk_test_fixture', STRIPE_PUBLISHABLE_KEY: 'pk_live_fixture', STRIPE_WEBHOOK_SECRET: 'whsec_fixture' }).checkoutConfigured, false);
  assert.equal(stripeConfiguration({}).mode, 'missing');
  for (const value of [null, '10', NaN, Infinity, -1, 9.99, 10.001, 10000.01]) assert.throws(() => quoteCreditTopup(value, null));
  assert.equal(quoteCreditTopup(10, null).points, 80);
  assert.equal(quoteCreditTopup(1000, null).points, 8695);
  assert.equal(quoteCreditTopup(10, 'topagent', true).points, 100);
  assert.equal(quoteCreditTopup(500, 'beginner').tier, 'experienced');
  reset();
  const checkout = { livemode: true, id: 'cs_fixture', mode: 'payment', payment_status: 'unpaid', currency: 'usd', amount_total: 1000, payment_intent: 'pi_fixture', metadata: { type: 'points_topup', userId: owner, points: '80', tier: 'beginner' } };
  await fulfillCreditTopup(checkout); assert.equal(wallet.balance, 10);
  checkout.payment_status = 'paid';
  await fulfillCreditTopup(checkout); await fulfillCreditTopup(checkout);
  assert.equal(wallet.balance, 90); assert.equal(wallet.transactions.length, 1);
  assert.equal(wallet.transactions[0].balanceAfter, 90);
  await assert.rejects(fulfillCreditTopup({ ...checkout, metadata: { ...checkout.metadata, pricingVersion: 'credits-v1', markupPercent: '25', amount: '10', points: '81' } }), /mismatch/);
  await fulfillCreditTopup({ ...checkout, metadata: { ...checkout.metadata, pricingVersion: 'credits-v1', markupPercent: '25', amount: '10' } });
  assert.equal(wallet.balance, 90);
  await assert.rejects(fulfillCreditTopup({ ...checkout, metadata: { ...checkout.metadata, points: '12junk' } }));
  reset();
  const input = { userId: owner, attemptId: attempt, key: 'reserve-fixture-123', amountMilliCredits: 8000 };
  await reserveDialerCredits(input); await reserveDialerCredits(input);
  assert.equal(wallet.balance, 10); assert.equal(wallet.reservedCredits, 8); assert.equal(holds.length, 1);
  await assert.rejects(reserveDialerCredits({ ...input, amountMilliCredits: 7000 }), /conflict/);
  await assert.rejects(reserveDialerCredits({ ...input, key: 'second-fixture-123' }), /Insufficient/);
  assert.equal(wallet.reservedCredits, 8);
  await settleDialerCredits({ userId: owner, key: input.key, settledMilliCredits: 1250 });
  await settleDialerCredits({ userId: owner, key: input.key, settledMilliCredits: 1250 });
  assert.equal(wallet.balance, 8.75); assert.equal(wallet.reservedCredits, 0); assert.equal(wallet.totalSpent, 1.25);
  assert.equal(wallet.transactions.length, 1); assert.equal(wallet.transactions[0].balanceAfter, 8.75);
  await assert.rejects(settleDialerCredits({ userId: owner, key: input.key, settledMilliCredits: 1251 }), /conflict/);
  reset(); failCreate = true;
  await assert.rejects(reserveDialerCredits(input), /Injected/);
  assert.equal(wallet.reservedCredits, 0); failCreate = false;
  await reserveDialerCredits(input);
  await assert.rejects(settleDialerCredits({ userId: owner, key: input.key, settledMilliCredits: 8001 }), /exceeds/);
  assert.equal(wallet.reservedCredits, 8);
  await settleDialerCredits({ userId: owner, key: input.key, settledMilliCredits: 0 });
  assert.equal(wallet.balance, 10); assert.equal(wallet.transactions.length, 0); assert.equal(wallet.reservedCredits, 0);
  require('tsx/cjs');
  const Ledger = require(path.join(root, 'src/models/CreditLedger.ts')).default;
  const ReservationModel = require(path.join(root, 'src/models/CreditReservation.ts')).default;
  const SandboxLedger = require(path.join(root, 'src/models/SandboxCreditLedger.ts')).default;
  assert.equal(SandboxLedger.collection.collectionName, 'sandbox_credit_ledgers');
  assert.notEqual(SandboxLedger.collection.collectionName, Ledger.collection.collectionName);
  assert.ok(new ReservationModel({ userId: owner, attemptId: attempt, key: input.key, amountMilliCredits: 1.2 }).validateSync());
  const instance = new Ledger({ userId: owner, balance: 10, reservedCredits: 8 });
  assert.throws(() => instance.debitPoints(3, 'sms_send', 'Blocked'), /Insufficient/);
  assert.throws(() => instance.debitPoints(NaN, 'sms_send', 'Invalid'));
  assert.equal(Ledger.schema.options.optimisticConcurrency, true);
  // Exercise the real atomic debit builder against the expression interpreter.
  reset(); wallet.reservedCredits = 8;
  const originalFind = Ledger.findOneAndUpdate, originalOne = Ledger.findOne;
  Ledger.findOneAndUpdate = ledgerMock.findOneAndUpdate;
  Ledger.findOne = () => ({ select() { return this; }, lean: async () => wallet });
  try {
    assert.equal((await Ledger.debitAtomic({ userId: new mongoose.Types.ObjectId(owner), amount: 3, type: 'sms_send', description: '$balance' })).ok, false);
    assert.equal((await Ledger.debitAtomic({ userId: new mongoose.Types.ObjectId(owner), amount: 1, type: 'sms_send', description: '$balance' })).ok, true);
    assert.equal(wallet.balance, 9); assert.equal(wallet.reservedCredits, 8);
    assert.equal(wallet.transactions[0].description, '$balance', 'Text must remain literal in Mongo pipelines');
    assert.equal(wallet.__v, 1);
  } finally { Ledger.findOneAndUpdate = originalFind; Ledger.findOne = originalOne; }
  let event, signedIn = true, checkouts = [];
  class StripeFixture {
    webhooks = { constructEvent(_body, signature) { if (signature !== 'fixture-valid') throw Error('Invalid signature'); return event; } };
    checkout = { sessions: { async create(params, options) { checkouts.push({ params, options }); return { id: 'cs_offline', url: 'https://checkout.example.invalid' }; } } };
  }
  mocks.stripe = { __esModule: true, default: StripeFixture };
  mocks['next/server'] = require('next/server');
  mocks['next-auth'] = { getServerSession: async () => signedIn ? { user: { id: owner } } : null };
  mocks['@/lib/auth'] = { authOptions: {} };
  mocks['@/models/User'] = { __esModule: true, default: { findById(id) { assert.equal(id, owner); return { select() { return this; }, lean: async () => ({ _id: owner, email: 'fixture@example.invalid', stripeCustomerId: 'cus_fixture', roles: [] }) }; }, findOne() { return { select() { return this; }, lean: async () => ({ _id: owner }) }; } } };
  mocks['@/models/CreditBillingCustomer'] = { __esModule: true, default: { findOne() { return { lean: async () => ({ customerId: 'cus_test_fixture' }) }; } } };
  mocks['@/models/AgentSubscription'] = { __esModule: true, default: {} };
  mocks['@/models/PointsLedger'] = { __esModule: true, default: ledgerMock, POINTS_TIERS: { beginner: {} }, pointsToAdSpend: points => points * 0.1 };
  mocks['@/config/stripe-prices'] = {};
  mocks['@/models/ProcessedStripeEvent'] = { __esModule: true, default: { create() { throw Error('Top-up must not use a pre-work event claim'); } } };
  mocks['@/lib/email-resend'] = { sendSubscriptionEmail() { throw Error('Top-up must not send mail during this test'); } };
  mocks['@/lib/credit-topup-fulfillment'] = { fulfillCreditTopup };
  const topupRoute = load('src/app/api/points/topup/route.ts');
  const webhook = load('src/app/api/webhooks/stripe/route.ts');
  const purchaseRequest = amount => ({ json: async () => ({ amount, points: 999999 }), headers: new Headers({ 'Idempotency-Key': 'offline-purchase-key' }) });
  signedIn = false;
  assert.equal((await topupRoute.POST(purchaseRequest(10))).status, 401);
  signedIn = true;
  const modeHelpers = mocks['@/lib/stripe-mode'];
  const originalConfiguration = modeHelpers.stripeConfiguration;
  modeHelpers.stripeConfiguration = () => ({ ...originalConfiguration(), checkoutConfigured: false });
  assert.equal((await topupRoute.POST(purchaseRequest(10))).status, 503);
  modeHelpers.stripeConfiguration = originalConfiguration;
  assert.equal((await topupRoute.POST(purchaseRequest('10'))).status, 400);
  assert.equal((await topupRoute.POST(purchaseRequest(10))).status, 200);
  assert.equal(checkouts.length, 1);
  assert.equal(checkouts[0].params.metadata.points, '80');
  assert.equal(checkouts[0].params.line_items[0].price_data.unit_amount, 1000);
  assert.equal(checkouts[0].params.allow_promotion_codes, undefined);
  assert.ok(checkouts[0].options.idempotencyKey.includes(owner));
  reset();
  event = { id: 'evt_fixture', livemode: false, type: 'checkout.session.completed', data: { object: { ...checkout, livemode: false, payment_status: 'unpaid' } } };
  const delivery = (signature = 'fixture-valid') => ({ text: async () => '{}', headers: new Headers({ 'stripe-signature': signature }) });
  assert.equal((await webhook.POST(delivery('invalid'))).status, 400);
  assert.equal((await webhook.POST(delivery())).status, 200);
  assert.equal(wallet.balance, 10);
  event = { ...event, id: 'evt_delayed', type: 'checkout.session.async_payment_succeeded', data: { object: { ...checkout, livemode: false } } };
  assert.equal((await webhook.POST(delivery())).status, 200);
  assert.equal((await webhook.POST(delivery())).status, 200);
  assert.equal(wallet.balance, 10, 'Test fulfillment must not fund the live wallet');
  assert.equal(sandboxWallet.balance, 80);
  mocks['next-auth'].getServerSession = async () => ({ user: { id: owner, email: 'fixture@example.invalid' } });
  const pointsRoute = load('src/app/api/points/route.ts');
  const view = await pointsRoute.GET({ url: 'https://fixture.invalid/api/points' });
  const viewData = await view.json();
  assert.equal(view.status, 200);
  assert.equal(viewData.mode, 'test'); assert.equal(viewData.balance, 80);
  assert.equal((await pointsRoute.POST(purchaseRequest(10))).status, 409);
  mocks['@/lib/dialer/session-server'] = { dialerOwner: async () => owner, dialerJson: body => mocks['next/server'].NextResponse.json(body) };
  const billing = await load('src/app/api/crm/dialer/billing/route.ts').GET();
  const billingData = await billing.json();
  assert.equal(billingData.sandbox, true); assert.equal(billingData.availableCredits, 80); assert.equal(billingData.voiceEnabled, false);
  event.livemode = true;
  assert.equal((await webhook.POST(delivery())).status, 400);
  assert.equal(wallet.balance, 10);
  console.log('PASS: top-up quotes, paid-only payment-key grants, reservation replay/conflicts, failed-write rollback, bounded settlement, release, reserved-fund debit guards and literal text handling.');
  console.log('PASS: checkout auth/server pricing/idempotency and webhook signature rejection/delayed-payment dispatch.');
  console.log('PASS: Stripe mode readiness, mismatched-key rejection and isolated test-purchase fulfillment.');
  console.log('Mongo transactions and Stripe delivery are simulated; live replica-set/index/payment validation remains required.');
})().catch(error => { console.error(error); process.exitCode = 1; });
