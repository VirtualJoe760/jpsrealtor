/**
 * Test script to diagnose conversations API
 */

require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;
const USER_ID = '691604b0d2b9d5140af67b4c';

console.log('=== Conversations API Diagnostic ===\n');

const smsMessageSchema = new mongoose.Schema({
  userId: String,
  twilioMessageSid: String,
  from: String,
  to: String,
  body: String,
  direction: String,
  status: String,
  contactId: String,
  createdAt: Date,
}, { collection: 'smsmessages' });

const contactSchema = new mongoose.Schema({
  userId: String,
  firstName: String,
  lastName: String,
  phone: String,
  preferences: {
    smsOptIn: Boolean,
  },
}, { collection: 'contacts' });

const SMSMessage = mongoose.model('SMSMessage', smsMessageSchema);
const Contact = mongoose.model('Contact', contactSchema);

async function diagnose() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✓ Connected to MongoDB\n');

    // Step 1: Check messages
    console.log('STEP 1: Checking SMS Messages');
    console.log('='.repeat(80));

    const allMessages = await SMSMessage.find({ userId: USER_ID }).sort({ createdAt: -1 });
    console.log(`Total messages for user: ${allMessages.length}\n`);

    if (allMessages.length === 0) {
      console.log('❌ NO MESSAGES FOUND');
      console.log('The conversations API needs messages to exist in the database.');
      console.log('Recommendation: Run the sync API or send a test message.\n');
      await mongoose.disconnect();
      return;
    }

    allMessages.forEach((msg, i) => {
      console.log(`Message ${i + 1}:`);
      console.log(`  From: ${msg.from}`);
      console.log(`  To: ${msg.to}`);
      console.log(`  Direction: ${msg.direction}`);
      console.log(`  Contact ID: ${msg.contactId || 'MISSING ❌'}`);
      console.log(`  User ID: ${msg.userId || 'MISSING ❌'}`);
      console.log(`  Body: ${msg.body.substring(0, 50)}...`);
      console.log();
    });

    // Step 2: Simulate conversations aggregation
    console.log('\nSTEP 2: Simulating Conversations Aggregation');
    console.log('='.repeat(80));

    const conversations = await SMSMessage.aggregate([
      { $match: { userId: USER_ID } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ['$direction', 'inbound'] },
              '$from',
              '$to'
            ]
          },
          lastMessage: { $first: '$$ROOT' },
          messageCount: { $sum: 1 },
          unreadCount: { $sum: { $cond: [{ $eq: ['$direction', 'inbound'] }, 1, 0] } },
        }
      },
      { $sort: { 'lastMessage.createdAt': -1 } },
      { $limit: 100 },
    ]);

    console.log(`Conversations found: ${conversations.length}\n`);

    if (conversations.length === 0) {
      console.log('❌ NO CONVERSATIONS CREATED');
      console.log('The aggregation pipeline returned no results.');
      console.log('This should not happen if messages exist.\n');
      await mongoose.disconnect();
      return;
    }

    conversations.forEach((conv, i) => {
      console.log(`Conversation ${i + 1}:`);
      console.log(`  Phone Number: ${conv._id}`);
      console.log(`  Message Count: ${conv.messageCount}`);
      console.log(`  Unread Count: ${conv.unreadCount}`);
      console.log(`  Last Message: ${conv.lastMessage.body.substring(0, 50)}...`);
      console.log();
    });

    // Step 3: Check contacts
    console.log('\nSTEP 3: Checking Contact Linkage');
    console.log('='.repeat(80));

    const phoneNumbers = conversations.map(c => c._id);
    console.log(`Looking for contacts with phones: ${phoneNumbers.join(', ')}\n`);

    const contacts = await Contact.find({
      userId: USER_ID,
      phone: { $in: phoneNumbers },
    });

    console.log(`Contacts found: ${contacts.length}\n`);

    if (contacts.length === 0) {
      console.log('❌ NO CONTACTS MATCH THE PHONE NUMBERS');
      console.log('Contacts exist but phone numbers don\'t match message phone numbers.');
      console.log('\nPhone numbers in messages:');
      phoneNumbers.forEach(phone => console.log(`  ${phone}`));

      console.log('\nChecking what phone format contacts use:');
      const sampleContacts = await Contact.find({ userId: USER_ID }).limit(5);
      sampleContacts.forEach(c => {
        console.log(`  ${c.firstName} ${c.lastName}: ${c.phone}`);
      });
      console.log();
    } else {
      contacts.forEach(contact => {
        console.log(`✓ ${contact.firstName} ${contact.lastName}`);
        console.log(`  Phone: ${contact.phone}`);
        console.log(`  SMS Opt-in: ${contact.preferences?.smsOptIn || false}`);
        console.log();
      });
    }

    // Step 4: Format like the API would
    console.log('\nSTEP 4: Final Formatted Conversations');
    console.log('='.repeat(80));

    const contactMap = new Map();
    contacts.forEach(contact => {
      contactMap.set(contact.phone, contact);
    });

    const formattedConversations = conversations.map((conv) => {
      const phoneNumber = conv._id;
      const contact = contactMap.get(phoneNumber);

      return {
        phoneNumber,
        contactId: contact?._id?.toString(),
        contactName: contact ? `${contact.firstName} ${contact.lastName}` : null,
        hasContact: !!contact,
        messageCount: conv.messageCount,
        unreadCount: conv.unreadCount,
        lastMessage: conv.lastMessage.body.substring(0, 50),
      };
    });

    console.log(JSON.stringify(formattedConversations, null, 2));

    console.log('\n' + '='.repeat(80));
    console.log('SUMMARY:');
    console.log('='.repeat(80));
    console.log(`Messages in DB: ${allMessages.length}`);
    console.log(`Conversations created: ${conversations.length}`);
    console.log(`Contacts matched: ${contacts.length}`);
    console.log(`Conversations with contact info: ${formattedConversations.filter(c => c.hasContact).length}`);
    console.log(`Conversations without contact info: ${formattedConversations.filter(c => !c.hasContact).length}`);
    console.log();

    await mongoose.disconnect();
    console.log('✓ Disconnected from MongoDB\n');

  } catch (error) {
    console.error('ERROR:', error.message);
    console.error(error.stack);
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
    process.exit(1);
  }
}

diagnose();
