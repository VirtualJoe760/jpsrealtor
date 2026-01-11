/**
 * Script to add test contacts for Twilio phone numbers
 */

require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;
const USER_ID = '691604b0d2b9d5140af67b4c'; // Your user ID from the messages

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
  createdAt: Date,
  updatedAt: Date,
}, { collection: 'contacts' });

const Contact = mongoose.model('Contact', contactSchema);

const testContacts = [
  {
    userId: USER_ID,
    firstName: 'Test',
    lastName: 'Contact 1',
    email: 'test1@example.com',
    phone: '+17603333676',
    status: 'new',
    tags: ['test'],
    preferences: {
      smsOptIn: true,
      emailOptIn: true,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    userId: USER_ID,
    firstName: 'Mom',
    lastName: 'Sardella',
    email: 'mom@example.com',
    phone: '+17603977807',
    status: 'client',
    tags: ['family'],
    preferences: {
      smsOptIn: true,
      emailOptIn: true,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    userId: USER_ID,
    firstName: 'Peyson',
    lastName: 'Friend',
    email: 'peyson@example.com',
    phone: '+17607024667',
    status: 'new',
    tags: ['test'],
    preferences: {
      smsOptIn: true,
      emailOptIn: true,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

async function addTestContacts() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✓ Connected to MongoDB\n');

    console.log('Adding test contacts for Twilio phone numbers...\n');

    for (const contactData of testContacts) {
      // Check if contact already exists
      const existing = await Contact.findOne({ phone: contactData.phone, userId: USER_ID });

      if (existing) {
        console.log(`⚠️  Contact already exists for ${contactData.phone}`);
        console.log(`   Name: ${existing.firstName} ${existing.lastName}`);
        console.log(`   ID: ${existing._id}\n`);
      } else {
        const contact = await Contact.create(contactData);
        console.log(`✓ Created contact for ${contactData.phone}`);
        console.log(`   Name: ${contact.firstName} ${contact.lastName}`);
        console.log(`   ID: ${contact._id}\n`);
      }
    }

    console.log('✓ Done! Test contacts added.\n');
    console.log('Now you can:');
    console.log('1. Refresh your Messages page');
    console.log('2. Click "Sync" or open a conversation to sync messages from Twilio');
    console.log('3. You should see the conversations appear!\n');

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

addTestContacts();
