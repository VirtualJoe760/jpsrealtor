/**
 * Test script to check userId field type in messages
 */

require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;
const USER_ID = '691604b0d2b9d5140af67b4c';

console.log('=== User ID Type Diagnostic ===\n');
console.log('Looking for userId:', USER_ID);
console.log('Type:', typeof USER_ID);
console.log();

const smsMessageSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.Mixed, // Allow any type
  from: String,
  to: String,
  body: String,
  direction: String,
}, { collection: 'smsmessages', strict: false });

const SMSMessage = mongoose.model('SMSMessage', smsMessageSchema);

async function check() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✓ Connected to MongoDB\n');

    // Get all messages without filter
    const allMessages = await SMSMessage.find({}).limit(10);
    console.log(`Total messages in collection: ${allMessages.length}\n`);

    if (allMessages.length === 0) {
      console.log('No messages at all!');
      await mongoose.disconnect();
      return;
    }

    console.log('Checking userId field types:\n');
    allMessages.forEach((msg, i) => {
      console.log(`Message ${i + 1}:`);
      console.log(`  userId value: ${msg.userId}`);
      console.log(`  userId type: ${typeof msg.userId}`);
      console.log(`  userId is ObjectId: ${msg.userId instanceof mongoose.Types.ObjectId}`);
      console.log(`  userId toString(): ${msg.userId?.toString()}`);
      console.log(`  Matches target: ${msg.userId?.toString() === USER_ID}`);
      console.log(`  Body: ${msg.body?.substring(0, 30)}...`);
      console.log();
    });

    // Try querying with string
    console.log('='.repeat(80));
    console.log('Query 1: userId as STRING');
    const withString = await SMSMessage.find({ userId: USER_ID });
    console.log(`Found: ${withString.length} messages\n`);

    // Try querying with ObjectId
    console.log('Query 2: userId as ObjectId');
    const withObjectId = await SMSMessage.find({ userId: new mongoose.Types.ObjectId(USER_ID) });
    console.log(`Found: ${withObjectId.length} messages\n`);

    // Try converting userId toString in aggregation
    console.log('Query 3: Using aggregation with $toString');
    const withToString = await SMSMessage.aggregate([
      {
        $addFields: {
          userIdString: { $toString: '$userId' }
        }
      },
      {
        $match: {
          userIdString: USER_ID
        }
      }
    ]);
    console.log(`Found: ${withToString.length} messages\n`);

    await mongoose.disconnect();
    console.log('✓ Disconnected from MongoDB\n');

  } catch (error) {
    console.error('ERROR:', error.message);
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
    process.exit(1);
  }
}

check();
