// Script to debug campaign contacts
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function debugCampaignContacts() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected!');

    // Get collections directly
    const db = mongoose.connection.db;
    const campaignsCol = db.collection('campaigns');
    const contactCampaignsCol = db.collection('contactcampaigns');
    const contactsCol = db.collection('contacts');

    console.log('\n=== Campaigns ===');
    const campaigns = await campaignsCol.find().limit(5).toArray();
    campaigns.forEach(c => {
      console.log(`Campaign: ${c.name} (${c._id})`);
      console.log(`  - User: ${c.userId}`);
      console.log(`  - Status: ${c.status}`);
      console.log(`  - Total Contacts (from stats): ${c.stats?.totalContacts || 0}`);
    });

    // Check each campaign for ContactCampaign records
    for (const campaign of campaigns) {
      console.log(`\n=== ContactCampaign records for campaign "${campaign.name}" (${campaign._id}) ===`);
      const contactCampaigns = await contactCampaignsCol.find({ campaignId: campaign._id }).toArray();
      console.log(`Found ${contactCampaigns.length} ContactCampaign records`);

      if (contactCampaigns.length > 0) {
        contactCampaigns.forEach(cc => {
          console.log(`  - ContactCampaign: ${cc._id}`);
          console.log(`    * contactId: ${cc.contactId}`);
          console.log(`    * campaignId: ${cc.campaignId}`);
          console.log(`    * status: ${cc.status}`);
          console.log(`    * source: ${cc.source}`);
        });

        // Get contact details
        console.log(`  Looking up contact details...`);
        const contactIds = contactCampaigns.map(cc => cc.contactId);
        const contactDetails = await contactsCol.find({ _id: { $in: contactIds } }).toArray();
        console.log(`  Found ${contactDetails.length} contact details`);
        contactDetails.forEach(c => {
          console.log(`    - ${c.firstName} ${c.lastName} (${c._id})`);
        });
      }
    }

    console.log('\n=== All Contacts ===');
    const contacts = await contactsCol.find().limit(10).toArray();
    console.log(`Found ${contacts.length} total contacts`);
    contacts.forEach(c => {
      console.log(`  - ${c.firstName} ${c.lastName} (${c._id}) - User: ${c.userId}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

debugCampaignContacts();
