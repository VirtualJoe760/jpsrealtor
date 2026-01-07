// scripts/update-team-affiliation.js
// Update Joseph's team affiliation to Obsidian Group

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

const userSchema = new mongoose.Schema({}, { strict: false, collection: 'users' });
const teamSchema = new mongoose.Schema({}, { strict: false, collection: 'teams' });

const User = mongoose.models.User || mongoose.model('User', userSchema);
const Team = mongoose.models.Team || mongoose.model('Team', teamSchema);

async function updateTeamAffiliation() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find Obsidian Group team
    const obsidianGroup = await Team.findOne({ name: /obsidian group/i });

    if (!obsidianGroup) {
      console.log('Obsidian Group team not found. Available teams:');
      const teams = await Team.find({}, 'name');
      teams.forEach(team => console.log(`  - ${team.name} (ID: ${team._id})`));

      console.log('\nCreating Obsidian Group team...');
      const newTeam = await Team.create({
        name: 'Obsidian Group',
        description: 'Real estate team',
        isActive: true,
        agents: [],
        pendingApplications: [],
        totalAgents: 0,
        totalClients: 0,
        createdBy: null
      });
      console.log(`Created Obsidian Group team with ID: ${newTeam._id}`);

      // Update Joseph's team
      const joseph = await User.findOne({ email: 'josephsardella@gmail.com' });
      if (joseph) {
        joseph.team = newTeam._id;
        await joseph.save();
        console.log(`✓ Updated Joseph's team to Obsidian Group`);
      }
    } else {
      console.log(`Found Obsidian Group team: ${obsidianGroup._id}`);

      // Update Joseph's team
      const joseph = await User.findOne({ email: 'josephsardella@gmail.com' });
      if (joseph) {
        joseph.team = obsidianGroup._id;
        await joseph.save();
        console.log(`✓ Updated Joseph's team to Obsidian Group`);
      } else {
        console.log('Joseph not found');
      }
    }

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

updateTeamAffiliation();
