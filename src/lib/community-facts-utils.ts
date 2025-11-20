// src/lib/community-facts-utils.ts
// Utilities for fetching and formatting community facts for AI

export async function getCommunityFacts(communityName: string, city?: string) {
  try {
    const params = new URLSearchParams({ name: communityName });
    if (city) params.set('city', city);

    const response = await fetch(`/api/chat/community-facts?${params.toString()}`);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.found ? data.community : null;
  } catch (error) {
    console.error('Error fetching community facts:', error);
    return null;
  }
}

export function formatCommunityFactsForAI(community: any): string {
  if (!community) return '';

  const facts = community.facts;
  if (!facts) {
    return `**${community.name}** is in ${community.city}. Current avg price: $${community.avgPrice?.toLocaleString()}. ${community.listingCount} active listings.`;
  }

  const sections: string[] = [];

  // Basic info
  sections.push(`**${community.name}** (${community.city})`);
  if (facts.communityType) {
    sections.push(`Type: ${formatCommunityType(facts.communityType)}`);
  }

  // Financials
  if (facts.hoaMonthlyMin || facts.hoaMonthlyMax) {
    const hoaRange = facts.hoaMonthlyMax
      ? `$${facts.hoaMonthlyMin || 0}-$${facts.hoaMonthlyMax}/month`
      : `~$${facts.hoaMonthlyMin}/month`;
    sections.push(`HOA: ${hoaRange}${facts.hoaIncludes ? ` (includes: ${facts.hoaIncludes})` : ''}`);
  }

  if (facts.initiationFee) {
    sections.push(`Golf Initiation: $${facts.initiationFee.toLocaleString()}`);
  }

  if (facts.monthlyDues) {
    sections.push(`Monthly Dues: $${facts.monthlyDues.toLocaleString()}`);
  }

  if (facts.melloRoos && facts.melloRoosAmount) {
    sections.push(`Mello-Roos: $${facts.melloRoosAmount.toLocaleString()}/year`);
  }

  // Membership
  if (facts.waitingList && facts.waitingList !== 'unknown') {
    sections.push(`Wait List: ${formatWaitingList(facts.waitingList)}${facts.waitingListNotes ? ` (${facts.waitingListNotes})` : ''}`);
  }

  // Short-term rentals
  if (facts.shortTermRentalsAllowed && facts.shortTermRentalsAllowed !== 'unknown') {
    sections.push(`Short-Term Rentals: ${formatSTRStatus(facts.shortTermRentalsAllowed)}${facts.shortTermRentalDetails ? ` - ${facts.shortTermRentalDetails}` : ''}`);
  }

  // Amenities
  const amenities: string[] = [];
  if (facts.golfCourses) {
    amenities.push(`${facts.golfCourses} golf course${facts.golfCourses > 1 ? 's' : ''}${facts.golfCoursesNames ? ` (${facts.golfCoursesNames})` : ''}`);
  }
  if (facts.pickleballCourts) {
    amenities.push(`${facts.pickleballCourts} pickleball court${facts.pickleballCourts > 1 ? 's' : ''}`);
  }
  if (facts.tennisCourts) {
    amenities.push(`${facts.tennisCourts} tennis court${facts.tennisCourts > 1 ? 's' : ''}`);
  }
  if (facts.pools) {
    amenities.push(`${facts.pools} pool${facts.pools > 1 ? 's' : ''}`);
  }
  if (amenities.length > 0) {
    sections.push(`Amenities: ${amenities.join(', ')}`);
  }

  // Environment
  if (facts.airportNoise && facts.airportNoise !== 'none') {
    sections.push(`Airport Noise: ${facts.airportNoise}${facts.airportNoiseDetails ? ` - ${facts.airportNoiseDetails}` : ''}`);
  }

  if (facts.golfCartAccessToRetail) {
    sections.push(`Golf Cart Access: ${facts.golfCartPathDetails || 'Yes, to retail areas'}`);
  }

  if (facts.floodZone) {
    sections.push(`⚠️ Flood Zone: ${facts.floodHistory || 'In FEMA flood zone'}`);
  }

  // Security
  if (facts.securityType) {
    sections.push(`Security: ${formatSecurityType(facts.securityType)}`);
  }

  // Market data
  if (facts.resaleVelocity) {
    sections.push(`Resale Velocity: ${formatResaleVelocity(facts.resaleVelocity)}`);
  }

  if (facts.avgDaysOnMarket) {
    sections.push(`Avg Days on Market: ${facts.avgDaysOnMarket}`);
  }

  if (facts.avgPricePerSqFt) {
    sections.push(`Avg $/sqft: $${facts.avgPricePerSqFt}`);
  }

  if (facts.hiddenGem) {
    sections.push(`✨ Hidden Gem - Great value!`);
  }

  if (facts.overrated) {
    sections.push(`⚠️ May be overpriced relative to comparable communities`);
  }

  // Best for
  if (facts.bestFor) {
    sections.push(`Best For: ${facts.bestFor}`);
  }

  // Pros/Cons
  if (facts.pros) {
    sections.push(`Pros: ${facts.pros}`);
  }
  if (facts.cons) {
    sections.push(`Cons: ${facts.cons}`);
  }

  return sections.join('\n');
}

function formatCommunityType(type: string): string {
  const map: Record<string, string> = {
    'equity-club': 'Equity Country Club',
    'non-equity-club': 'Non-Equity Country Club',
    'golf-community': 'Golf Community',
    'gated-non-golf': 'Gated (Non-Golf)',
    '55plus': '55+ Active Adult',
    'luxury-gated': 'Luxury Gated',
    'non-gated': 'Non-Gated',
  };
  return map[type] || type;
}

function formatWaitingList(status: string): string {
  const map: Record<string, string> = {
    none: 'No wait',
    short: 'Short (< 6 months)',
    medium: 'Medium (6-18 months)',
    long: 'Long (18+ months)',
    unknown: 'Unknown',
  };
  return map[status] || status;
}

function formatSTRStatus(status: string): string {
  const map: Record<string, string> = {
    'yes-unrestricted': 'Allowed',
    'yes-limited': 'Allowed with restrictions',
    'no-hoa': 'Prohibited by HOA',
    'no-city': 'Prohibited by city',
    unknown: 'Unknown',
  };
  return map[status] || status;
}

function formatSecurityType(type: string): string {
  const map: Record<string, string> = {
    '24hr-guard': '24-hour guard gate',
    'daytime-guard': 'Daytime guard gate',
    'roving-patrol': 'Roving patrol',
    unmanned: 'Unmanned gate',
    none: 'No gate',
  };
  return map[type] || type;
}

function formatResaleVelocity(velocity: string): string {
  const map: Record<string, string> = {
    'very-fast': 'Very Fast (< 30 days)',
    fast: 'Fast (30-60 days)',
    moderate: 'Moderate (60-120 days)',
    slow: 'Slow (120+ days)',
  };
  return map[velocity] || velocity;
}

export async function logMissingFact(
  communityName: string,
  missingDetail: string,
  city?: string,
  userId?: string
) {
  try {
    await fetch('/api/chat/community-facts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        communityName,
        missingDetail,
        city,
        userId,
      }),
    });
  } catch (error) {
    console.error('Failed to log missing fact:', error);
  }
}
