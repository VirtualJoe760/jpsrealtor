import { MongoClient } from 'mongodb';

const MONGODB_URI = 'mongodb+srv://doadmin:5gpl0VF9843U61Nv@jpsrealtor-mongodb-911080c1.mongo.ondigitalocean.com/payload?retryWrites=true&w=majority&authSource=admin';

async function verifyAdminUser() {
  console.log('='.repeat(80));
  console.log('VERIFY ADMIN USER IN PAYLOAD DATABASE');
  console.log('='.repeat(80));
  console.log();

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
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
        console.log(`   Password Hash: ${user.password ? user.password.substring(0, 20) + '...' : 'N/A'}`);
        console.log(`   Created At: ${user.createdAt}`);
        console.log(`   Updated At: ${user.updatedAt}`);
        console.log();
      });
    } else {
      console.log('⚠️  No users found in the database');
    }

    // Also check database stats
    console.log('-'.repeat(80));
    console.log('📦 Database Collections:');
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

verifyAdminUser();
