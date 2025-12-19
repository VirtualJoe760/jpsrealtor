// src/lib/chat/utils/test-subdivision-query.ts
// Test subdivision data fetching

import { getSubdivisionData, checkShortTermRentals } from './subdivision-data';
import connectToDatabase from '@/lib/mongodb';

async function testSubdivisionQueries() {
  console.log("=== Testing Subdivision Data Utilities ===\n");

  await connectToDatabase();

  // Test 1: Palm Desert Country Club (PDCC)
  console.log("Test 1: Palm Desert Country Club");
  console.log("---");

  const pdccData = await getSubdivisionData("Palm Desert Country Club");
  if (pdccData.found) {
    console.log(`✅ Found: ${pdccData.subdivision?.name}`);
    console.log(`   City: ${pdccData.subdivision?.city}`);
    console.log(`   Listings: ${pdccData.subdivision?.listingCount}`);
    console.log(`   HOA: $${pdccData.subdivision?.hoaMonthlyMin}-$${pdccData.subdivision?.hoaMonthlyMax}/month`);
    console.log(`   STR Allowed: ${pdccData.subdivision?.shortTermRentalsAllowed || 'unknown'}`);
  } else {
    console.log(`❌ Not found: ${pdccData.error}`);
  }
  console.log("");

  // Test 2: Check STR status for PDCC
  console.log("Test 2: STR Status for PDCC");
  console.log("---");

  const pdccSTR = await checkShortTermRentals("Palm Desert Country Club");
  console.log(`   Allowed: ${pdccSTR.allowed}`);
  console.log(`   Details: ${pdccSTR.details || 'N/A'}`);
  console.log(`   Source: ${pdccSTR.source}`);
  console.log(`   Confidence: ${pdccSTR.confidence}`);
  console.log("");

  // Test 3: PGA West (abbreviation test)
  console.log("Test 3: PGA West (via entity recognition)");
  console.log("---");

  const pgaData = await getSubdivisionData("PGA West");
  if (pgaData.found) {
    console.log(`✅ Found: ${pgaData.subdivision?.name}`);
    console.log(`   Community Type: ${pgaData.subdivision?.communityType || 'N/A'}`);
    console.log(`   Golf Courses: ${pgaData.subdivision?.golfCourses || 'N/A'}`);
  } else {
    console.log(`❌ Not found: ${pgaData.error}`);
  }
  console.log("");

  // Test 4: Nonexistent subdivision
  console.log("Test 4: Nonexistent Subdivision");
  console.log("---");

  const fakeData = await getSubdivisionData("Fake Subdivision XYZ");
  if (fakeData.found) {
    console.log(`✅ Found: ${fakeData.subdivision?.name}`);
  } else {
    console.log(`❌ Not found (expected): ${fakeData.error}`);
  }
  console.log("");

  console.log("=== Tests Complete ===");
  process.exit(0);
}

testSubdivisionQueries().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
