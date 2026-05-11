// scripts/seed-test-credits.js
// One-off: seed a test user's credit ledger so they can launch ads in dev.
//
// Usage:
//   node scripts/seed-test-credits.js              # seeds default user 10,000 credits
//   node scripts/seed-test-credits.js <email>      # seed by email
//   node scripts/seed-test-credits.js <email> 5000 # custom amount

require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

const DEFAULT_EMAIL = 'josephsardella@gmail.com';
const DEFAULT_AMOUNT = 10000; // 10,000 credits = $1,000 of authorized ad spend

async function main() {
  const email = process.argv[2] || DEFAULT_EMAIL;
  const amount = parseInt(process.argv[3] || DEFAULT_AMOUNT, 10);

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not set in .env.local');

  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const user = await db.collection('users').findOne({ email });
  if (!user) {
    console.error(`No user with email ${email}`);
    process.exit(1);
  }

  // Use the collection name from CreditLedger / PointsLedger model (kept as pointsledgers).
  const ledgers = db.collection('pointsledgers');
  const existing = await ledgers.findOne({ userId: user._id });

  const newTxn = {
    _id: new mongoose.Types.ObjectId(),
    type: 'bonus',
    amount,
    balanceAfter: (existing?.balance || 0) + amount,
    description: 'Dev seed — test launch credits',
    createdAt: new Date(),
  };

  if (existing) {
    await ledgers.updateOne(
      { userId: user._id },
      {
        $inc: { balance: amount, totalEarned: amount },
        $push: { transactions: newTxn },
        $set: { updatedAt: new Date() },
      }
    );
  } else {
    await ledgers.insertOne({
      userId: user._id,
      balance: amount,
      totalEarned: amount,
      totalSpent: 0,
      tier: 'topagent',
      transactions: [newTxn],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  const final = await ledgers.findOne({ userId: user._id }, { projection: { balance: 1 } });
  console.log(`Seeded ${amount} credits for ${email}. New balance: ${final.balance}`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
