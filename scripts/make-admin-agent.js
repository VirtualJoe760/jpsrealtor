// scripts/make-admin-agent.js
// Add realEstateAgent role to admin account

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

// User schema
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

// Team schema
const TeamSchema = new mongoose.Schema(
  {
    name: String,
  },
  { collection: 'teams' }
);

async function makeAdminAgent() {
  try {
    log('\n🎯 Making Admin an Agent\n', colors.blue);
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

    // Get models
    const User = mongoose.models.User || mongoose.model('User', UserSchema);
    const Team = mongoose.models.Team || mongoose.model('Team', TeamSchema);

    // Find the user
    log('\n🔍 Looking for user: josephsardella@gmail.com', colors.blue);
    const user = await User.findOne({ email: 'josephsardella@gmail.com' });

    if (!user) {
      log('❌ User not found', colors.red);
      await mongoose.disconnect();
      process.exit(1);
    }

    log('✅ User found!', colors.green);

    // Check if already has the role
    if (user.roles?.includes('realEstateAgent')) {
      log('\n⚠️  User already has the "realEstateAgent" role', colors.yellow);
    } else {
      // Add the role
      log('\n📝 Adding "realEstateAgent" role...', colors.blue);
      if (!user.roles) {
        user.roles = [];
      }
      user.roles.push('realEstateAgent');
      await user.save();
      log('✅ "realEstateAgent" role added!', colors.green);
    }

    // Find chatRealty team
    log('\n🔍 Looking for chatRealty team...', colors.blue);
    const team = await Team.findOne({ name: 'chatRealty' });

    if (team) {
      log('✅ chatRealty team found!', colors.green);

      if (!user.team) {
        log('📝 Assigning user to chatRealty team...', colors.blue);
        user.team = team._id;
        await user.save();
        log('✅ User assigned to team!', colors.green);
      } else {
        log('⚠️  User already assigned to a team', colors.yellow);
      }
    } else {
      log('⚠️  chatRealty team not found. Skipping team assignment.', colors.yellow);
    }

    // Display final status
    log('\n✨ Final User Status:', colors.blue);
    log('═'.repeat(60), colors.blue);
    log(`Name: ${user.name}`, colors.reset);
    log(`Email: ${user.email}`, colors.reset);
    log(`Roles: ${user.roles.join(', ')}`, colors.green);
    log(`Team: ${team ? team.name : 'Not assigned'}`, colors.reset);
    log('═'.repeat(60), colors.blue);

    // Disconnect
    log('\n📡 Disconnecting from MongoDB...', colors.blue);
    await mongoose.disconnect();
    log('✅ Disconnected', colors.green);

    log('\n🎉 Admin is now an agent!\n', colors.green);

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
makeAdminAgent();
