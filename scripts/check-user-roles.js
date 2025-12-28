// scripts/check-user-roles.js
// Check user roles and agent status

require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

// User schema (minimal version)
const UserSchema = new mongoose.Schema(
  {
    email: String,
    name: String,
    roles: [String],
    isAdmin: Boolean,
    team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    licenseNumber: String,
    brokerageName: String,
  },
  { collection: 'users' }
);

async function checkUserRoles() {
  try {
    log('\n🔍 Checking User Roles\n', colors.blue);
    log('═'.repeat(60), colors.blue);

    // Get MongoDB URI from environment
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      log('\n❌ Error: MONGODB_URI not found in environment', colors.red);
      process.exit(1);
    }

    // Connect to MongoDB
    log('\n📡 Connecting to MongoDB...', colors.blue);
    await mongoose.connect(mongoUri);
    log('✅ Connected to MongoDB', colors.green);

    // Get or create model
    const User = mongoose.models.User || mongoose.model('User', UserSchema);

    // Find the user
    log('\n🔍 Looking for user: josephsardella@gmail.com', colors.blue);
    const user = await User.findOne({ email: 'josephsardella@gmail.com' }).populate('team');

    if (!user) {
      log('❌ User not found', colors.red);
      await mongoose.disconnect();
      process.exit(1);
    }

    log('\n✅ User found!', colors.green);
    log('\n📋 User Details:', colors.blue);
    log('═'.repeat(60), colors.blue);
    log(`Name: ${user.name || 'Not set'}`, colors.reset);
    log(`Email: ${user.email}`, colors.reset);
    log(`User ID: ${user._id}`, colors.reset);
    log(`Is Admin: ${user.isAdmin ? 'Yes ✓' : 'No ✗'}`, user.isAdmin ? colors.green : colors.yellow);
    log(`Roles: ${user.roles && user.roles.length > 0 ? user.roles.join(', ') : 'None'}`, colors.reset);
    log(`Has realEstateAgent role: ${user.roles?.includes('realEstateAgent') ? 'Yes ✓' : 'No ✗'}`, user.roles?.includes('realEstateAgent') ? colors.green : colors.red);
    log(`License Number: ${user.licenseNumber || 'Not set'}`, colors.reset);
    log(`Brokerage: ${user.brokerageName || 'Not set'}`, colors.reset);
    log(`Team: ${user.team ? user.team.name || user.team._id : 'Not assigned'}`, colors.reset);

    log('\n═'.repeat(60), colors.blue);

    if (!user.roles?.includes('realEstateAgent')) {
      log('\n⚠️  This user does NOT have the "realEstateAgent" role', colors.yellow);
      log('To see the agent profile, they need to have "realEstateAgent" in their roles array.', colors.yellow);
    } else {
      log('\n✅ This user HAS the "realEstateAgent" role', colors.green);
    }

    // Disconnect
    log('\n📡 Disconnecting from MongoDB...', colors.blue);
    await mongoose.disconnect();
    log('✅ Disconnected\n', colors.green);

  } catch (error) {
    log(`\n❌ Error: ${error.message}`, colors.red);
    console.error(error);

    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }

    process.exit(1);
  }
}

// Run the script
checkUserRoles();
