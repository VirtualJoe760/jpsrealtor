/**
 * Manually sync messages from Twilio with the correct userId format
 */

require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');
const twilio = require('twilio');

const MONGODB_URI = process.env.MONGODB_URI;
const USER_ID = '691604b0d2b9d5140af67b4c';
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE = process.env.TWILIO_PHONE_NUMBER;

console.log('=== Manual Twilio Sync ===\n');

const smsMessageSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  twilioMessageSid: { type: String, unique: true },
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
  updatedAt: Date,
}, { collection: 'smsmessages', timestamps: true });

const SMSMessage = mongoose.model('SMSMessage', smsMessageSchema);

const contactSchema = new mongoose.Schema({
  userId: String,
  firstName: String,
  lastName: String,
  phone: String,
}, { collection: 'contacts' });

const Contact = mongoose.model('Contact', contactSchema);

async function sync() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✓ Connected to MongoDB\n');

    // Convert userId to ObjectId
    const userObjectId = new mongoose.Types.ObjectId(USER_ID);
    console.log('User ID (string):', USER_ID);
    console.log('User ID (ObjectId):', userObjectId);
    console.log();

    // Initialize Twilio client
    const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

    // Fetch all messages from Twilio
    console.log('Fetching messages from Twilio...');
    const twilioMessages = await client.messages.list({ limit: 100 });
    console.log(`✓ Found ${twilioMessages.length} messages in Twilio\n`);

    // Get test contacts
    const testPhones = ['+17603333676', '+17603977807', '+17607024667'];
    const contacts = await Contact.find({
      userId: USER_ID,
      phone: { $in: testPhones },
    });

    console.log(`✓ Found ${contacts.length} test contacts in database\n`);

    // Create contact map
    const contactMap = new Map();
    contacts.forEach(c => {
      contactMap.set(c.phone, c);
      console.log(`  ${c.phone} → ${c.firstName} ${c.lastName} (ID: ${c._id})`);
    });
    console.log();

    // Sync messages
    let syncedCount = 0;
    let skippedCount = 0;

    for (const twilioMsg of twilioMessages) {
      try {
        // Check if already exists
        const existing = await SMSMessage.findOne({
          twilioMessageSid: twilioMsg.sid,
        });

        if (existing) {
          skippedCount++;
          continue;
        }

        // Determine contact
        const phoneNumber = twilioMsg.direction.includes('inbound') ? twilioMsg.from : twilioMsg.to;
        const contact = contactMap.get(phoneNumber);

        // Create message with ObjectId userId
        const messageData = {
          userId: userObjectId,  // ✅ ObjectId
          twilioMessageSid: twilioMsg.sid,
          from: twilioMsg.from,
          to: twilioMsg.to,
          body: twilioMsg.body || '',
          direction: twilioMsg.direction.includes('inbound') ? 'inbound' : 'outbound',
          status: twilioMsg.status,
          contactId: contact?._id?.toString(),
          price: twilioMsg.price ? parseFloat(twilioMsg.price) : undefined,
          priceUnit: twilioMsg.priceUnit || 'USD',
          twilioCreatedAt: twilioMsg.dateSent || twilioMsg.dateCreated,
          createdAt: twilioMsg.dateSent || twilioMsg.dateCreated,
        };

        await SMSMessage.create(messageData);
        syncedCount++;

        console.log(`✓ Synced: ${twilioMsg.direction} - ${twilioMsg.body.substring(0, 40)}...`);
        if (contact) {
          console.log(`  → Linked to: ${contact.firstName} ${contact.lastName}`);
        } else {
          console.log(`  → No contact found for: ${phoneNumber}`);
        }

      } catch (error) {
        console.error(`❌ Error syncing message ${twilioMsg.sid}:`, error.message);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('SYNC COMPLETE');
    console.log('='.repeat(80));
    console.log(`✓ Synced: ${syncedCount} new messages`);
    console.log(`⊘ Skipped: ${skippedCount} existing messages`);
    console.log();

    // Verify what's in the database now
    const dbMessages = await SMSMessage.find({ userId: userObjectId }).sort({ createdAt: -1 });
    console.log(`Database now has ${dbMessages.length} messages for this user\n`);

    if (dbMessages.length > 0) {
      console.log('Sample messages:');
      dbMessages.slice(0, 3).forEach((msg, i) => {
        console.log(`${i + 1}. ${msg.direction}: ${msg.body.substring(0, 50)}...`);
        console.log(`   From: ${msg.from}, To: ${msg.to}`);
        console.log(`   Contact ID: ${msg.contactId || 'NONE'}`);
        console.log();
      });
    }

    await mongoose.disconnect();
    console.log('✓ Disconnected from MongoDB\n');
    console.log('🎉 Messages synced! Now go to /agent/messages and they should appear!');

  } catch (error) {
    console.error('ERROR:', error.message);
    console.error(error.stack);
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
    process.exit(1);
  }
}

sync();
