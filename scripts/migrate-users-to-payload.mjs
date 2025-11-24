/**
 * Migrate NextAuth users to PayloadCMS
 *
 * This script reads existing NextAuth users from MongoDB and creates
 * PayloadCMS-compatible user records via the PayloadCMS API.
 */

import fetch from 'node-fetch';
import mongoose from 'mongoose';

const MONGODB_URI = 'mongodb+srv://doadmin:5gpl0VF9843U61Nv@jpsrealtor-mongodb-911080c1.mongo.ondigitalocean.com/admin?retryWrites=true&w=majority';
const PAYLOAD_CMS_URL = 'https://cms.chatrealty.io';
// For local testing: const PAYLOAD_CMS_URL = 'http://localhost:3002';

// PayloadCMS API key for server-to-server auth (you'll need to create this in PayloadCMS)
// For now, we'll create users without auth - Payload allows public signup
const PAYLOAD_API_KEY = process.env.PAYLOAD_API_KEY || '';

async function main() {
  console.log('🚀 Starting user migration from NextAuth to PayloadCMS...\n');

  try {
    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Fetch all NextAuth users
    console.log('📥 Fetching NextAuth users...');
    const nextAuthUsers = await mongoose.connection.db
      .collection('users')
      .find({})
      .toArray();

    console.log(`✅ Found ${nextAuthUsers.length} NextAuth users\n`);

    // Map NextAuth roles to PayloadCMS roles
    const roleMapping = {
      'admin': 'admin',
      'agent': 'agent',
      'endUser': 'client',
      'broker': 'broker',
      'investor': 'investor',
      'provider': 'provider',
      'host': 'host'
    };

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    // Migrate each user
    for (const user of nextAuthUsers) {
      console.log(`\n👤 Processing: ${user.email}`);

      try {
        // Check if user already exists in PayloadCMS
        const existingUserCheck = await fetch(
          `${PAYLOAD_CMS_URL}/api/users?where[email][equals]=${encodeURIComponent(user.email)}`,
          {
            headers: PAYLOAD_API_KEY ? {
              'Authorization': `Bearer ${PAYLOAD_API_KEY}`
            } : {}
          }
        );

        const existingUsers = await existingUserCheck.json();

        if (existingUsers.docs && existingUsers.docs.length > 0) {
          console.log(`   ⏭️  User already exists in PayloadCMS, skipping`);
          skipCount++;
          continue;
        }

        // Determine primary role (first role in array, or 'client' as default)
        const nextAuthRole = user.roles && user.roles.length > 0 ? user.roles[0] : 'endUser';
        const payloadRole = roleMapping[nextAuthRole] || 'client';

        // Extract name parts
        const nameParts = (user.name || '').split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        // Create PayloadCMS user
        const payloadUser = {
          email: user.email,
          password: user.password, // Already bcrypt hashed from NextAuth
          role: payloadRole,
          profile: {
            firstName,
            lastName,
          },
          // Preserve Stripe data if exists
          ...(user.stripeCustomerId && { stripeCustomerId: user.stripeCustomerId }),
          ...(user.stripeSubscriptionId && { stripeSubscriptionId: user.stripeSubscriptionId }),
          ...(user.subscriptionTier && { subscriptionTier: user.subscriptionTier }),
          ...(user.subscriptionStatus && { subscriptionStatus: user.subscriptionStatus }),
        };

        console.log(`   📤 Creating PayloadCMS user with role: ${payloadRole}`);

        const response = await fetch(`${PAYLOAD_CMS_URL}/api/users`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(PAYLOAD_API_KEY ? { 'Authorization': `Bearer ${PAYLOAD_API_KEY}` } : {})
          },
          body: JSON.stringify(payloadUser)
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error(`   ❌ Failed to create user: ${JSON.stringify(errorData)}`);
          errorCount++;
          continue;
        }

        const createdUser = await response.json();
        console.log(`   ✅ Successfully migrated! PayloadCMS ID: ${createdUser.doc.id}`);
        successCount++;

      } catch (error) {
        console.error(`   ❌ Error migrating user: ${error.message}`);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Migration Summary:');
    console.log(`   ✅ Successfully migrated: ${successCount}`);
    console.log(`   ⏭️  Skipped (already exist): ${skipCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   📋 Total processed: ${nextAuthUsers.length}`);
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

main();
