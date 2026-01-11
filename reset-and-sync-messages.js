/**
 * Reset messages and resync from Twilio with the fixed userId
 */

require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

console.log('=== Reset and Resync Messages ===\n');

const smsMessageSchema = new mongoose.Schema({}, { collection: 'smsmessages', strict: false });
const SMSMessage = mongoose.model('SMSMessage', smsMessageSchema);

async function reset() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✓ Connected to MongoDB\n');

    // Delete all existing messages
    const deleteResult = await SMSMessage.deleteMany({});
    console.log(`✓ Deleted ${deleteResult.deletedCount} existing messages\n`);

    console.log('Now the messages page will sync messages from Twilio when you:');
    console.log('1. Navigate to /agent/messages');
    console.log('2. Select a conversation');
    console.log('3. The sync API will automatically fetch messages from Twilio');
    console.log('4. Messages will be created with the correct userId (ObjectId)\n');

    console.log('Or you can manually call the sync API from the browser console:');
    console.log(`
fetch('/api/crm/sms/sync', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    phoneNumber: '+17603333676',
    contactId: '6962c561b49f194e98b142c1'
  })
}).then(r => r.json()).then(console.log);
`);

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

reset();
