import mongoose from 'mongoose';
import dbConnect from '@/lib/mongoose';
import CreditLedger from '@/models/CreditLedger';
import CreditReservation from '@/models/CreditReservation';

function identifier(id: string) {
  if (!/^[a-f\d]{24}$/i.test(id)) throw new Error('Invalid billing reference');
  return new mongoose.Types.ObjectId(id);
}
function units(value: number, allowZero = false) {
  if (!Number.isSafeInteger(value) || value < (allowZero ? 0 : 1)) throw new Error('Credit units must be safe integer millicredits');
  return value / 1000;
}

/** Server-only primitive. A transaction error leaves both wallet and hold unchanged. */
export async function reserveDialerCredits(input: { userId: string; attemptId: string; key: string; amountMilliCredits: number }) {
  const userId = identifier(input.userId), attemptId = identifier(input.attemptId);
  const amount = units(input.amountMilliCredits);
  if (!/^[\w:-]{16,100}$/.test(input.key)) throw new Error('Invalid reservation key');
  await dbConnect();
  return mongoose.connection.transaction(async session => {
    const existing = await CreditReservation.findOne({ userId, key: input.key }).session(session).lean();
    if (existing) {
      if (String(existing.attemptId) !== String(attemptId) || existing.amountMilliCredits !== input.amountMilliCredits) throw new Error('Reservation key conflict');
      return existing;
    }
    const ledger = await CreditLedger.findOneAndUpdate({ userId, $expr: { $gte: [
      { $round: [{ $subtract: ['$balance', { $ifNull: ['$reservedCredits', 0] }] }, 3] }, amount,
    ] } }, [{ $set: {
      reservedCredits: { $round: [{ $add: [{ $ifNull: ['$reservedCredits', 0] }, amount] }, 3] },
      __v: { $add: [{ $ifNull: ['$__v', 0] }, 1] },
    } }], { new: true, session });
    if (!ledger) throw new Error('Insufficient available credits');
    const [hold] = await CreditReservation.create([{ userId, attemptId, key: input.key, amountMilliCredits: input.amountMilliCredits, state: 'held' }], { session });
    return hold.toObject();
  });
}

/** Zero usage releases the hold. Unknown provider outcomes must retain the hold. */
export async function settleDialerCredits(input: { userId: string; key: string; settledMilliCredits: number }) {
  const userId = identifier(input.userId), charge = units(input.settledMilliCredits, true);
  await dbConnect();
  return mongoose.connection.transaction(async session => {
    const hold = await CreditReservation.findOne({ userId, key: input.key }).session(session);
    if (!hold) throw new Error('Reservation not found');
    if (hold.state !== 'held') {
      if (hold.settledMilliCredits !== input.settledMilliCredits) throw new Error('Settlement conflict');
      return hold.toObject();
    }
    if (input.settledMilliCredits > hold.amountMilliCredits) throw new Error('Usage exceeds reserved funds; reconcile before settlement');
    const reserved = hold.amountMilliCredits / 1000;
    const transaction = { _id: new mongoose.Types.ObjectId(), type: 'voice_usage', amount: -charge,
      description: 'Dialer usage', channel: 'voice', adSpendValue: charge * 0.1,
      metadata: { reservationKey: input.key, attemptId: String(hold.attemptId) }, createdAt: new Date() };
    const update: any[] = [{ $set: {
      balance: { $round: [{ $subtract: ['$balance', charge] }, 3] },
      reservedCredits: { $round: [{ $subtract: ['$reservedCredits', reserved] }, 3] },
      totalSpent: { $round: [{ $add: [{ $ifNull: ['$totalSpent', 0] }, charge] }, 3] },
      __v: { $add: [{ $ifNull: ['$__v', 0] }, 1] },
    } }];
    if (charge) update.push({ $set: { transactions: { $concatArrays: [
      { $ifNull: ['$transactions', []] }, [{ $mergeObjects: [{ $literal: transaction }, { balanceAfter: '$balance' }] }],
    ] } } });
    const ledger = await CreditLedger.findOneAndUpdate({ userId, balance: { $gte: charge }, reservedCredits: { $gte: reserved } }, update, { new: true, session });
    if (!ledger) throw new Error('Wallet reservation mismatch; reconciliation required');
    hold.state = charge ? 'settled' : 'released'; hold.settledMilliCredits = input.settledMilliCredits;
    await hold.save({ session });
    return hold.toObject();
  });
}
