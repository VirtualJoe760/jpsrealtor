/**
 * Test script to check messages in MongoDB database
 */

require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

console.log('=== MongoDB Message Database Test ===\n');
console.log('MongoDB URI:', MONGODB_URI ? `${MONGODB_URI.substring(0, 30)}...` : 'MISSING');
console.log('\n');

if (!MONGODB_URI) {
  console.error('ERROR: Missing MONGODB_URI in .env.local');
  process.exit(1);
}

// Define SMS Message schema
const smsMessageSchema = new mongoose.Schema({
  userId: String,
  twilioMessageSid: String,
  twilioAccountSid: String,
  from: String,
  to: String,
  body: String,
  direction: String,
  status: String,
  contactId: String,
  price: Number,
  priceUnit: String,
  twilioCreatedAt: Date,
  createdAt: Date,
}, { collection: 'smsmessages' });

const SMSMessage = mongoose.model('SMSMessage', smsMessageSchema);

async function checkDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✓ Connected to MongoDB\n');

    // Get total count
    const totalCount = await SMSMessage.countDocuments();
    console.log(`Total SMS messages in database: ${totalCount}\n`);

    if (totalCount === 0) {
      console.log('⚠️  No messages found in database. They need to be synced from Twilio.\n');
      await mongoose.disconnect();
      return;
    }

    // Get all messages
    const messages = await SMSMessage.find().sort({ createdAt: -1 }).limit(20);

    console.log('='.repeat(80));
    console.log(`\nShowing ${messages.length} most recent messages:\n`);

    messages.forEach((msg, index) => {
      console.log(`Message ${index + 1}:`);
      console.log('  SID:', msg.twilioMessageSid);
      console.log('  From:', msg.from);
      console.log('  To:', msg.to);
      console.log('  Direction:', msg.direction);
      console.log('  Status:', msg.status);
      console.log('  User ID:', msg.userId || 'MISSING');
      console.log('  Contact ID:', msg.contactId || 'MISSING');
      console.log('  Date:', msg.createdAt);
      console.log('  Body:', msg.body ? msg.body.substring(0, 80) : 'EMPTY');
      console.log('  -'.repeat(40));
    });

    // Group by user
    const byUser = {};
    const allMessages = await SMSMessage.find();
    allMessages.forEach(msg => {
      const userId = msg.userId || 'NO_USER_ID';
      if (!byUser[userId]) byUser[userId] = 0;
      byUser[userId]++;
    });

    console.log('\n' + '='.repeat(80));
    console.log('\nMessages by User ID:');
    Object.keys(byUser).forEach(userId => {
      console.log(`  ${userId}: ${byUser[userId]} messages`);
    });

    // Group by phone
    const byPhone = {};
    allMessages.forEach(msg => {
      const otherPhone = msg.direction === 'inbound' ? msg.from : msg.to;
      if (!byPhone[otherPhone]) byPhone[otherPhone] = 0;
      byPhone[otherPhone]++;
    });

    console.log('\nMessages by Phone Number:');
    Object.keys(byPhone).forEach(phone => {
      console.log(`  ${phone}: ${byPhone[phone]} messages`);
    });

    await mongoose.disconnect();
    console.log('\n✓ Disconnected from MongoDB\n');

  } catch (error) {
    console.error('ERROR:', error.message);
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
    process.exit(1);
  }
}

checkDatabase();
