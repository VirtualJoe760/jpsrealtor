// scripts/make-team-leader.js
// Make admin a team leader

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
    isTeamLeader: Boolean,
  },
  { collection: 'users' }
);

async function makeTeamLeader() {
  try {
    log('\n👑 Making Admin a Team Leader\n', colors.blue);
    log('═'.repeat(60), colors.blue);

    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      log('\n❌ Error: MONGODB_URI not found in environment', colors.red);
      process.exit(1);
    }

    log('\n📡 Connecting to MongoDB...', colors.blue);
    await mongoose.connect(mongoUri);
    log('✅ Connected to MongoDB', colors.green);

    const User = mongoose.models.User || mongoose.model('User', UserSchema);

    log('\n🔍 Looking for user: josephsardella@gmail.com', colors.blue);
    const user = await User.findOne({ email: 'josephsardella@gmail.com' });

    if (!user) {
      log('❌ User not found', colors.red);
      await mongoose.disconnect();
      process.exit(1);
    }

    log('✅ User found!', colors.green);

    if (user.isTeamLeader) {
      log('\n⚠️  User is already a team leader', colors.yellow);
    } else {
      log('\n📝 Setting isTeamLeader to true...', colors.blue);
      user.isTeamLeader = true;
      await user.save();
      log('✅ User is now a team leader!', colors.green);
    }

    log('\n✨ Final Status:', colors.blue);
    log('═'.repeat(60), colors.blue);
    log(`Name: ${user.name}`, colors.reset);
    log(`Email: ${user.email}`, colors.reset);
    log(`Is Team Leader: ${user.isTeamLeader ? 'Yes ✓' : 'No ✗'}`, colors.green);
    log('═'.repeat(60), colors.blue);

    log('\n📡 Disconnecting from MongoDB...', colors.blue);
    await mongoose.disconnect();
    log('✅ Disconnected', colors.green);

    log('\n🎉 Admin is now a team leader!\n', colors.green);

  } catch (error) {
    log(`\n❌ Error: ${error.message}`, colors.red);
    console.error(error);

    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }

    process.exit(1);
  }
}

makeTeamLeader();
