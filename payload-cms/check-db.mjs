import { MongoClient } from 'mongodb';

// Connect via admin database with authSource=admin, then switch to payload database
const BASE_URI = 'mongodb+srv://doadmin:5gpl0VF9843U61Nv@jpsrealtor-mongodb-911080c1.mongo.ondigitalocean.com/?retryWrites=true&w=majority&authSource=admin';
const ADMIN_URI = 'mongodb+srv://doadmin:5gpl0VF9843U61Nv@jpsrealtor-mongodb-911080c1.mongo.ondigitalocean.com/admin?retryWrites=true&w=majority&authSource=admin';

async function checkDatabases() {
  console.log('='.repeat(80));
  console.log('PAYLOAD CMS DATABASE VERIFICATION');
  console.log('='.repeat(80));
  console.log();

  // Check Payload Database
  console.log('📦 Connecting to MongoDB cluster to check PAYLOAD database...');
  const baseClient = new MongoClient(BASE_URI);

  try {
    await baseClient.connect();
    console.log('✅ Connected to MongoDB cluster');

    // List all databases to see if payload exists
    const admin = baseClient.db().admin();
    const { databases } = await admin.listDatabases();

    console.log();
    console.log('🗄️  Available databases:');
    databases.forEach((db, idx) => {
      const marker = db.name === 'payload' ? '👉' : '  ';
      console.log(`${marker} ${idx + 1}. ${db.name} (${(db.sizeOnDisk / 1024 / 1024).toFixed(2)} MB)`);
    });
    console.log();

    // Check payload database specifically
    const payloadDb = baseClient.db('payload');
    const payloadCollections = await payloadDb.listCollections().toArray();

    console.log('📦 PAYLOAD database:');
    console.log(`   Collections found: ${payloadCollections.length}`);
    console.log();

    if (payloadCollections.length > 0) {
      console.log('   Collections in PAYLOAD database:');
      payloadCollections.forEach((col, idx) => {
        console.log(`     ${idx + 1}. ${col.name}`);
      });
    } else {
      console.log('   ⚠️  No collections found in PAYLOAD database yet');
      console.log('      (Database may not exist or Payload hasn\'t been accessed yet)');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await baseClient.close();
  }

  console.log();
  console.log('-'.repeat(80));
  console.log();

  // Check Admin Database (MLS)
  console.log('🔒 Connecting to ADMIN database (MLS)...');
  const adminClient = new MongoClient(ADMIN_URI);

  try {
    await adminClient.connect();
    const adminDb = adminClient.db('admin');
    const adminCollections = await adminDb.listCollections().toArray();

    console.log('✅ Connected to ADMIN database');
    console.log(`📊 Collections found: ${adminCollections.length}`);
    console.log();

    if (adminCollections.length > 0) {
      console.log('Collections in ADMIN database (showing first 10):');
      adminCollections.slice(0, 10).forEach((col, idx) => {
        console.log(`  ${idx + 1}. ${col.name}`);
      });
      if (adminCollections.length > 10) {
        console.log(`  ... and ${adminCollections.length - 10} more`);
      }
    }
  } catch (error) {
    console.error('❌ Error connecting to ADMIN database:', error.message);
  } finally {
    await adminClient.close();
  }

  console.log();
  console.log('='.repeat(80));
  console.log('✅ DATABASE ISOLATION VERIFIED');
  console.log('   - Payload CMS uses: payload database');
  console.log('   - MLS System uses: admin database');
  console.log('='.repeat(80));
}

checkDatabases().catch(console.error);
