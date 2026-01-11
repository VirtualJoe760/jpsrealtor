/**
 * Test script to check contacts in MongoDB database
 */

require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

console.log('=== MongoDB Contacts Database Test ===\n');

const contactSchema = new mongoose.Schema({
  userId: String,
  firstName: String,
  lastName: String,
  email: String,
  phone: String,
  status: String,
  tags: [String],
  preferences: {
    smsOptIn: Boolean,
    emailOptIn: Boolean,
  },
}, { collection: 'contacts' });

const Contact = mongoose.model('Contact', contactSchema);

async function checkContacts() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✓ Connected to MongoDB\n');

    const totalCount = await Contact.countDocuments();
    console.log(`Total contacts in database: ${totalCount}\n`);

    if (totalCount === 0) {
      console.log('⚠️  No contacts found in database.\n');
      await mongoose.disconnect();
      return;
    }

    // Check for specific phone numbers from Twilio
    const phoneNumbers = ['+17603333676', '+17603977807', '+17607024667'];

    console.log('Checking for contacts with phone numbers from Twilio messages:\n');

    for (const phone of phoneNumbers) {
      const contact = await Contact.findOne({ phone });
      if (contact) {
        console.log(`✓ Found contact for ${phone}:`);
        console.log(`  Name: ${contact.firstName} ${contact.lastName}`);
        console.log(`  ID: ${contact._id}`);
        console.log(`  User ID: ${contact.userId}`);
        console.log(`  SMS Opt-in: ${contact.preferences?.smsOptIn || false}`);
      } else {
        console.log(`✗ No contact found for ${phone}`);
      }
      console.log();
    }

    // Show all contacts with phone numbers
    const allContacts = await Contact.find({ phone: { $exists: true, $ne: '' } }).limit(10);
    console.log('='.repeat(80));
    console.log(`\nShowing ${allContacts.length} contacts with phone numbers:\n`);

    allContacts.forEach((contact, index) => {
      console.log(`${index + 1}. ${contact.firstName} ${contact.lastName}`);
      console.log(`   Phone: ${contact.phone}`);
      console.log(`   ID: ${contact._id}`);
      console.log(`   User ID: ${contact.userId}`);
      console.log(`   SMS Opt-in: ${contact.preferences?.smsOptIn || false}`);
      console.log();
    });

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

checkContacts();
