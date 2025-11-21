import { MongoClient } from 'mongodb';

const MONGODB_URI = 'mongodb+srv://doadmin:5gpl0VF9843U61Nv@jpsrealtor-mongodb-911080c1.mongo.ondigitalocean.com/payload?retryWrites=true&w=majority&authSource=admin';

async function verifyUsersSchema() {
  console.log('='.repeat(80));
  console.log('VERIFY USERS COLLECTION SCHEMA - STEP 5');
  console.log('='.repeat(80));
  console.log();

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB payload database');
    console.log();

    const db = client.db('payload');
    const usersCollection = db.collection('users');

    // Get all users
    const users = await usersCollection.find({}).toArray();

    console.log(`📊 Total users in collection: ${users.length}`);
    console.log();

    if (users.length > 0) {
      console.log('👥 Users found:');
      console.log();

      users.forEach((user, index) => {
        console.log(`User #${index + 1}:`);
        console.log(`   ID: ${user._id}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Role: ${user.role || 'NOT SET (pre-Step 5 user)'}`);
        console.log(`   Subscription Tier: ${user.subscriptionTier || 'NOT SET'}`);
        console.log(`   Profile: ${user.profile ? 'Present' : 'Not set'}`);
        if (user.profile) {
          console.log(`      - First Name: ${user.profile.firstName || 'N/A'}`);
          console.log(`      - Last Name: ${user.profile.lastName || 'N/A'}`);
          console.log(`      - Company: ${user.profile.company || 'N/A'}`);
          console.log(`      - Phone: ${user.profile.phone || 'N/A'}`);
        }
        console.log(`   Password Hash: ${user.password ? user.password.substring(0, 20) + '...' : 'N/A'}`);
        console.log(`   Created At: ${user.createdAt}`);
        console.log(`   Updated At: ${user.updatedAt}`);
        console.log();
      });
    }

    // Check collection schema by examining one document
    if (users.length > 0) {
      const sampleUser = users[0];
      console.log('-'.repeat(80));
      console.log('📋 Collection Schema (Fields Present in Sample Document):');
      console.log();

      Object.keys(sampleUser).forEach((key) => {
        const value = sampleUser[key];
        const type = Array.isArray(value) ? 'array' : typeof value;
        console.log(`   ${key}: ${type}`);
      });
      console.log();
    }

    // Get collection stats
    const stats = await db.command({ collStats: 'users' });
    console.log('-'.repeat(80));
    console.log('📦 Collection Statistics:');
    console.log(`   Document Count: ${stats.count}`);
    console.log(`   Average Document Size: ${(stats.avgObjSize / 1024).toFixed(2)} KB`);
    console.log(`   Total Size: ${(stats.size / 1024).toFixed(2)} KB`);
    console.log(`   Storage Size: ${(stats.storageSize / 1024).toFixed(2)} KB`);
    console.log();

    // List all collections in payload database
    console.log('-'.repeat(80));
    console.log('🗄️  All Collections in Payload Database:');
    const collections = await db.listCollections().toArray();
    collections.forEach((col, idx) => {
      console.log(`   ${idx + 1}. ${col.name}`);
    });
    console.log();

    console.log('='.repeat(80));
    console.log('✅ VERIFICATION COMPLETE');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

verifyUsersSchema();
