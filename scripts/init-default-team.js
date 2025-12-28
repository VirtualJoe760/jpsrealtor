// scripts/init-default-team.js
// Initialize the default "chatRealty" team

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

// Team schema (mirroring the TypeScript model)
const TeamSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    logo: { type: String },
    teamLeader: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    parentTeam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
    },
    agents: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    pendingApplications: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    isActive: { type: Boolean, default: true },
    autoApprove: { type: Boolean, default: false },
    totalAgents: { type: Number, default: 0 },
    totalClients: { type: Number, default: 0 },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
    collection: 'teams',
  }
);

// User schema (minimal version for finding admin)
const UserSchema = new mongoose.Schema(
  {
    email: String,
    name: String,
    isAdmin: Boolean,
  },
  { collection: 'users' }
);

async function initializeDefaultTeam() {
  try {
    log('\n🚀 Initializing Default Team\n', colors.blue);
    log('═'.repeat(60), colors.blue);

    // Get MongoDB URI from environment
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      log('\n❌ Error: MONGODB_URI not found in environment', colors.red);
      log('Please ensure .env.local is properly configured', colors.yellow);
      process.exit(1);
    }

    // Connect to MongoDB
    log('\n📡 Connecting to MongoDB...', colors.blue);
    await mongoose.connect(mongoUri);
    log('✅ Connected to MongoDB', colors.green);

    // Get or create models
    const Team = mongoose.models.Team || mongoose.model('Team', TeamSchema);
    const User = mongoose.models.User || mongoose.model('User', UserSchema);

    // Find admin user
    log('\n🔍 Finding admin user...', colors.blue);
    const adminUser = await User.findOne({
      email: 'josephsardella@gmail.com',
      isAdmin: true
    });

    if (!adminUser) {
      log('❌ Admin user not found', colors.red);
      log('Please ensure the admin user exists in the database', colors.yellow);
      await mongoose.disconnect();
      process.exit(1);
    }

    log(`✅ Found admin user: ${adminUser.name || adminUser.email} (${adminUser._id})`, colors.green);

    // Check if chatRealty team already exists
    log('\n🔍 Checking for existing chatRealty team...', colors.blue);
    const existingTeam = await Team.findOne({ name: 'chatRealty' });

    if (existingTeam) {
      log('⚠️  chatRealty team already exists', colors.yellow);
      log(`   Team ID: ${existingTeam._id}`, colors.yellow);
      log(`   Team Leader: ${existingTeam.teamLeader}`, colors.yellow);
      log(`   Total Agents: ${existingTeam.totalAgents}`, colors.yellow);
      log(`   Active: ${existingTeam.isActive}`, colors.yellow);

      log('\n✨ Team Details:', colors.blue);
      log(JSON.stringify(existingTeam, null, 2), colors.reset);
    } else {
      // Create chatRealty team
      log('\n📝 Creating chatRealty team...', colors.blue);

      const newTeam = new Team({
        name: 'chatRealty',
        description: 'The default ChatRealty team for all approved agents',
        teamLeader: adminUser._id,
        agents: [],
        pendingApplications: [],
        isActive: true,
        autoApprove: false,
        totalAgents: 0,
        totalClients: 0,
        createdBy: adminUser._id,
      });

      await newTeam.save();

      log('✅ chatRealty team created successfully!', colors.green);
      log(`   Team ID: ${newTeam._id}`, colors.green);
      log(`   Team Leader: ${adminUser.name || adminUser.email}`, colors.green);
      log(`   Created At: ${newTeam.createdAt}`, colors.green);

      log('\n✨ Team Details:', colors.blue);
      log(JSON.stringify(newTeam, null, 2), colors.reset);
    }

    // Disconnect
    log('\n📡 Disconnecting from MongoDB...', colors.blue);
    await mongoose.disconnect();
    log('✅ Disconnected', colors.green);

    log('\n═'.repeat(60), colors.blue);
    log('🎉 Default team initialization complete!\n', colors.green);

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
initializeDefaultTeam();
