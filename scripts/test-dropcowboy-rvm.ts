/**
 * Test script to send Drop Cowboy RVM directly
 * Bypasses UI to test API integration
 *
 * Usage: npx tsx scripts/test-dropcowboy-rvm.ts
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const DROP_COWBOY_TEAM_ID = process.env.DROP_COWBOY_TEAM_ID;
const DROP_COWBOY_SECRET = process.env.DROP_COWBOY_SECRET;
const DROP_COWBOY_BRAND_ID = process.env.DROP_COWBOY_BRAND_ID;
const DROP_COWBOY_NUMBER_POOL_ID = process.env.DROP_COWBOY_NUMBER_POOL_ID;
const DROP_COWBOY_API_URL = 'https://api.dropcowboy.com/v1';
const MONGODB_URI = process.env.MONGODB_URI;

// Campaign details
const CAMPAIGN_ID = '69600352ef0980454e798432';
const RECORDING_ID = 'a5c81ac5-d018-4fd0-9a9d-90a767192e4e'; // "Reconnecting with Friends"
const RECORDING_NAME = 'Reconnecting with Friends';
const FORWARDING_NUMBER = '+17603333676'; // Joseph's number

interface Contact {
  _id: string;
  firstName: string;
  lastName: string;
  phone: string;
}

/**
 * Format phone number to E.164 format
 */
function formatPhoneE164(phone: string): string {
  const digits = phone.replace(/\D/g, '');

  if (digits.length === 10) {
    return `+1${digits}`;
  }

  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }

  return digits.startsWith('+') ? digits : `+${digits}`;
}

/**
 * Send RVM via Drop Cowboy API
 */
async function sendRVM(
  phone: string,
  contactName: string,
  contactId: string
): Promise<{ success: boolean; response?: any; error?: string }> {
  try {
    console.log(`\n📞 Sending to: ${contactName} (${phone})`);

    const payload = {
      team_id: DROP_COWBOY_TEAM_ID,
      secret: DROP_COWBOY_SECRET,
      brand_id: DROP_COWBOY_BRAND_ID,
      pool_id: DROP_COWBOY_NUMBER_POOL_ID,  // ← Fixed: was "number_pool_id"
      phone_number: phone,
      forwarding_number: FORWARDING_NUMBER,
      recording_id: RECORDING_ID,
      foreign_id: `TEST-${contactId}`,
    };

    console.log('📦 Payload:', JSON.stringify(payload, null, 2));

    const response = await fetch(`${DROP_COWBOY_API_URL}/rvm`, {
      method: 'POST',
      headers: {
        'x-team-id': DROP_COWBOY_TEAM_ID!,
        'x-secret': DROP_COWBOY_SECRET!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    console.log(`📡 Response status: ${response.status} ${response.statusText}`);

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Response data:', JSON.stringify(data, null, 2));
      return { success: true, response: data };
    } else {
      const errorText = await response.text();
      console.error('❌ Error response:', errorText);
      return { success: false, error: errorText };
    }
  } catch (error: any) {
    console.error('❌ Exception:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Main test function
 */
async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🧪 DROP COWBOY RVM TEST SCRIPT');
  console.log('═══════════════════════════════════════════════════════════\n');

  // 1. Validate environment variables
  console.log('1️⃣ Validating environment variables...');
  if (!DROP_COWBOY_TEAM_ID || !DROP_COWBOY_SECRET || !DROP_COWBOY_BRAND_ID || !DROP_COWBOY_NUMBER_POOL_ID) {
    console.error('❌ Missing Drop Cowboy credentials in .env.local');
    process.exit(1);
  }
  if (!MONGODB_URI) {
    console.error('❌ Missing MONGODB_URI in .env.local');
    process.exit(1);
  }
  console.log('✅ Credentials verified\n');

  // 2. Connect to MongoDB
  console.log('2️⃣ Connecting to MongoDB...');
  try {
    const mongoose = await import('mongoose');
    await mongoose.default.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
  } catch (error: any) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }

  // 3. Load models
  console.log('3️⃣ Loading models...');
  const { default: Campaign } = await import('../src/models/Campaign');
  const { default: ContactCampaign } = await import('../src/models/ContactCampaign');
  const { default: Contact } = await import('../src/models/contact');
  console.log('✅ Models loaded\n');

  // 4. Find campaign
  console.log('4️⃣ Finding campaign...');
  const campaign = await Campaign.findById(CAMPAIGN_ID);
  if (!campaign) {
    console.error('❌ Campaign not found');
    await mongoose.disconnect();
    process.exit(1);
  }
  console.log(`✅ Campaign found: ${campaign.name}\n`);

  // 5. Get contacts for campaign
  console.log('5️⃣ Fetching contacts...');
  const mongoose = await import('mongoose');
  const contactCampaigns = await ContactCampaign.find({
    campaignId: new mongoose.default.Types.ObjectId(CAMPAIGN_ID),
  }).populate('contactId').lean();

  const contacts = contactCampaigns
    .map((cc: any) => cc.contactId)
    .filter((c: any) => c);

  console.log(`✅ Found ${contacts.length} contacts\n`);

  if (contacts.length === 0) {
    console.error('❌ No contacts found for campaign');
    await mongoose.disconnect();
    process.exit(1);
  }

  // 6. Display contact list
  console.log('📋 Contact List:');
  contacts.forEach((contact: any, index: number) => {
    console.log(`   ${index + 1}. ${contact.firstName} ${contact.lastName} - ${contact.phone}`);
  });
  console.log('');

  // 7. Send RVMs
  console.log('6️⃣ Sending RVMs...');
  console.log(`   Recording: ${RECORDING_NAME}`);
  console.log(`   Recording ID: ${RECORDING_ID}`);
  console.log(`   Forwarding: ${FORWARDING_NUMBER}\n`);

  let successCount = 0;
  let failureCount = 0;

  for (const contact of contacts) {
    const phone = formatPhoneE164(contact.phone);
    const contactName = `${contact.firstName} ${contact.lastName}`;

    const result = await sendRVM(phone, contactName, contact._id.toString());

    if (result.success) {
      successCount++;
    } else {
      failureCount++;
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // 8. Summary
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📊 TEST COMPLETE');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${failureCount}`);
  console.log(`📱 Total contacts: ${contacts.length}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  // 9. Disconnect
  const mongoose2 = await import('mongoose');
  await mongoose2.default.disconnect();
  console.log('👋 Disconnected from MongoDB\n');
}

// Run the test
main().catch((error) => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
