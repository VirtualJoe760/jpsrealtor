/**
 * MLS Discovery Script
 *
 * Purpose: Discover which MLS associations are accessible via Spark API data share
 * Based on Diego's guidance (REPLICATION_GUIDE.md lines 136-146)
 *
 * Usage:
 *   npx ts-node src/scripts/mls/discover-mls-access.ts
 *
 * Or add to package.json:
 *   "scripts": { "discover:mls": "ts-node src/scripts/mls/discover-mls-access.ts" }
 *   Then run: npm run discover:mls
 */

import fetch from 'node-fetch';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

interface SparkMLSResponse {
  D: {
    Success: boolean;
    Results: MLSAssociation[];
    Pagination?: {
      TotalRows: number;
      PageSize: number;
      PageNumber: number;
    };
  };
}

interface MLSAssociation {
  MlsId: string;
  MlsName?: string;
  Name?: string;
  Label?: string;
  Value?: string;
}

async function discoverAvailableMLSs() {
  console.log('🔍 Discovering available MLS associations via Spark API...\n');

  // Validate environment variables
  const sparkAccessToken = process.env.SPARK_ACCESS_TOKEN;
  const sparkOAuthKey = process.env.SPARK_OAUTH_KEY;

  if (!sparkAccessToken && !sparkOAuthKey) {
    console.error('❌ ERROR: Missing Spark API credentials in .env.local');
    console.error('   Please ensure SPARK_ACCESS_TOKEN or SPARK_OAUTH_KEY is set.');
    process.exit(1);
  }

  try {
    // Method 1: Get MLS IDs from StandardFields endpoint (Diego's method)
    console.log('📡 Fetching MLS IDs from Spark API...');

    const url = 'https://sparkapi.com/v1/standardfields/MlsId';

    const headers: Record<string, string> = {
      'X-SparkApi-User-Agent': 'JPSRealtor MLS Discovery',
      'Accept': 'application/json',
    };

    // Use OAuth key for authentication (Spark API standard)
    if (sparkOAuthKey) {
      headers['Authorization'] = `OAuth ${sparkOAuthKey}`;
    } else if (sparkAccessToken) {
      headers['Authorization'] = `Bearer ${sparkAccessToken}`;
    }

    const response = await fetch(url, { headers });

    if (!response.ok) {
      throw new Error(`Spark API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json() as SparkMLSResponse;

    if (!data.D || !data.D.Success) {
      throw new Error('Spark API request failed');
    }

    const mlsAssociations = data.D.Results;

    if (!mlsAssociations || mlsAssociations.length === 0) {
      console.log('⚠️  No MLS associations found. This may mean:');
      console.log('   1. Your Spark API account doesn\'t have data share access');
      console.log('   2. The API credentials are incorrect');
      console.log('   3. The endpoint structure has changed\n');
      return;
    }

    // Display results
    console.log(`\n✅ Found ${mlsAssociations.length} MLS association(s):\n`);
    console.log('═'.repeat(80));

    mlsAssociations.forEach((mls, index) => {
      const mlsId = mls.MlsId || mls.Value || 'Unknown';
      const mlsName = mls.MlsName || mls.Name || mls.Label || 'Unknown Name';

      console.log(`\n${index + 1}. ${mlsName}`);
      console.log(`   MLS ID: ${mlsId}`);
      console.log(`   Filter example: _filter=MlsId Eq '${mlsId}'`);
    });

    console.log('\n' + '═'.repeat(80));

    // Method 2: Test actual listing counts per MLS
    console.log('\n📊 Testing listing counts per MLS association...\n');

    for (const mls of mlsAssociations) {
      const mlsId = mls.MlsId || mls.Value;
      const mlsName = mls.MlsName || mls.Name || mls.Label || 'Unknown';

      try {
        const testUrl = `https://replication.sparkapi.com/v1/listings?_filter=MlsId Eq '${mlsId}'&_limit=1`;
        const testResponse = await fetch(testUrl, { headers });

        if (testResponse.ok) {
          const testData = await testResponse.json() as any;
          const count = testData.D?.Results?.length || 0;

          if (count > 0) {
            console.log(`✅ ${mlsName}: Has accessible listings`);
          } else {
            console.log(`⚠️  ${mlsName}: No listings found (may be empty or access restricted)`);
          }
        }
      } catch (error) {
        console.log(`❌ ${mlsName}: Failed to test access`);
      }
    }

    // Known MLS mappings (based on your current data)
    console.log('\n📝 Known MLS ID Mappings:\n');
    console.log('   GPS MLS:   20190211172710340762000000');
    console.log('   CRMLS:     20200218121507636729000000');

    // Check if your known MLSs are in the results
    const knownMLSs = [
      { id: '20190211172710340762000000', name: 'GPS MLS' },
      { id: '20200218121507636729000000', name: 'CRMLS' }
    ];

    console.log('\n🔍 Verifying your current MLS access:\n');

    for (const known of knownMLSs) {
      const found = mlsAssociations.find(
        mls => (mls.MlsId || mls.Value) === known.id
      );

      if (found) {
        console.log(`   ✅ ${known.name}: Access confirmed`);
      } else {
        console.log(`   ❌ ${known.name}: NOT found in data share`);
      }
    }

    // Recommendations
    console.log('\n💡 Next Steps:\n');
    console.log('1. Update your sync scripts to use these MLS IDs');
    console.log('2. Add new MLS associations to your unified collection');
    console.log('3. Test fetching listings from each MLS:');
    console.log('   curl "https://replication.sparkapi.com/v1/listings?_filter=MlsId Eq \'[MLS_ID]\'&_limit=5"');
    console.log('\n4. For unified collection, all listings will use the same RESO field names:');
    console.log('   - BedroomsTotal (not bedsTotal/bedroomsTotal)');
    console.log('   - BathroomsTotalInteger (not bathroomsFull/bathroomsTotalDecimal)');
    console.log('   - ListPrice (consistent across all MLSs)');
    console.log('   - StandardStatus (Active, Pending, Closed, Expired)\n');

  } catch (error: any) {
    console.error('\n❌ ERROR discovering MLS associations:');
    console.error(`   ${error.message}`);

    if (error.message.includes('401') || error.message.includes('403')) {
      console.error('\n💡 Authentication issue. Please check:');
      console.error('   1. SPARK_ACCESS_TOKEN is valid');
      console.error('   2. SPARK_OAUTH_KEY is correct');
      console.error('   3. Your Spark API account has data share access enabled');
    }

    process.exit(1);
  }
}

// Run the discovery
discoverAvailableMLSs()
  .then(() => {
    console.log('\n✅ MLS discovery complete!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Unexpected error:', error);
    process.exit(1);
  });
