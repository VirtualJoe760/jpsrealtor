import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables FIRST, before importing Payload config
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function createAdmin() {
  console.log('='.repeat(80));
  console.log('PAYLOAD CMS - CREATE FIRST ADMIN USER');
  console.log('='.repeat(80));
  console.log();

  // Debug: Check environment variables
  console.log('🔍 Environment Check:');
  console.log(`   PAYLOAD_SECRET: ${process.env.PAYLOAD_SECRET ? '✅ Set' : '❌ Missing'}`);
  console.log(`   MONGODB_URI: ${process.env.MONGODB_URI ? '✅ Set' : '❌ Missing'}`);
  console.log();

  try {
    console.log('📦 Initializing Payload CMS...');

    // Dynamically import Payload and config AFTER env vars are loaded
    const { default: payload } = await import('payload');
    const { default: config } = await import('../payload.config.js');

    // Initialize Payload without starting the server
    await payload.init({
      config,
      local: true,
    });

    console.log('✅ Payload initialized successfully');
    console.log();

    const email = 'admin@jpsrealtor.com';
    const password = 'ChangeThisPassword123!';

    console.log('👤 Creating admin user...');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log();

    const user = await payload.create({
      collection: 'users',
      data: {
        email,
        password,
      },
    });

    console.log('✅ Admin user created successfully!');
    console.log();
    console.log('User Details:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Created At: ${user.createdAt}`);
    console.log(`   Updated At: ${user.updatedAt}`);
    console.log();
    console.log('='.repeat(80));
    console.log('✅ SUCCESS - Admin user created');
    console.log('='.repeat(80));

    process.exit(0);
  } catch (err) {
    console.error('❌ Error creating admin user:');
    console.error(err);
    process.exit(1);
  }
}

createAdmin();
