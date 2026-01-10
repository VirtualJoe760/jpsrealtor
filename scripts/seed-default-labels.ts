/**
 * Seed Default Labels Script
 *
 * Creates default system labels for a user.
 * These are common labels for real estate CRM usage.
 *
 * Usage: npx tsx scripts/seed-default-labels.ts <userId>
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not defined in environment variables');
  }
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB\n');
};

// Default system labels
const DEFAULT_LABELS = [
  {
    name: 'Hot Leads',
    description: 'High-priority prospects ready to transact',
    color: '#EF4444', // Red
    isSystem: true,
  },
  {
    name: 'Past Clients',
    description: 'Previous clients for referrals and repeat business',
    color: '#3B82F6', // Blue
    isSystem: true,
  },
  {
    name: 'Sphere of Influence',
    description: 'Personal network and connections',
    color: '#8B5CF6', // Purple
    isSystem: true,
  },
  {
    name: 'First Time Buyers',
    description: 'Buyers looking for their first home',
    color: '#22C55E', // Green
    isSystem: true,
  },
  {
    name: 'Sellers',
    description: 'Homeowners looking to sell',
    color: '#F97316', // Orange
    isSystem: true,
  },
  {
    name: 'Investors',
    description: 'Real estate investors and landlords',
    color: '#EAB308', // Yellow
    isSystem: true,
  },
  {
    name: 'Relocations',
    description: 'Clients moving to/from the area',
    color: '#06B6D4', // Cyan
    isSystem: true,
  },
  {
    name: 'Nurture',
    description: 'Long-term prospects not ready yet',
    color: '#84CC16', // Lime
    isSystem: true,
  },
  {
    name: 'Do Not Contact',
    description: 'Contacts who requested no communication',
    color: '#64748B', // Slate
    isSystem: true,
  },
];

async function seedLabels(userId: string) {
  try {
    // Import Label model dynamically
    const Label = (await import('../src/models/Label')).default;

    console.log(`📝 Creating default labels for user: ${userId}\n`);

    let created = 0;
    let skipped = 0;

    for (const labelData of DEFAULT_LABELS) {
      // Check if label already exists
      const existing = await Label.findOne({
        userId,
        name: labelData.name,
      });

      if (existing) {
        console.log(`⏭️  Skipped: "${labelData.name}" (already exists)`);
        skipped++;
        continue;
      }

      // Create label
      const label = new Label({
        userId,
        ...labelData,
        contactCount: 0,
        isArchived: false,
      });

      await label.save();
      console.log(`✅ Created: "${labelData.name}" (${labelData.color})`);
      created++;
    }

    console.log('\n═══════════════════════════════════════');
    console.log(`📊 Summary:`);
    console.log(`   Created: ${created}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Total:   ${DEFAULT_LABELS.length}`);
    console.log('═══════════════════════════════════════\n');
  } catch (error) {
    console.error('❌ Error seeding labels:', error);
    throw error;
  }
}

// Main execution
async function main() {
  const userId = process.argv[2];

  if (!userId) {
    console.error('❌ Error: User ID is required\n');
    console.log('Usage: npx tsx scripts/seed-default-labels.ts <userId>\n');
    process.exit(1);
  }

  // Validate userId format
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    console.error('❌ Error: Invalid user ID format\n');
    process.exit(1);
  }

  try {
    await connectDB();
    await seedLabels(userId);
    console.log('✅ Done!\n');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

main();
