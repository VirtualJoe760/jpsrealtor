// src/collections/CommunityFacts.ts
// Community-specific facts, amenities, and deep data for AI chat

import { CollectionConfig } from 'payload';

export const CommunityFacts: CollectionConfig = {
  slug: 'community-facts',
  admin: {
    useAsTitle: 'communityName',
    defaultColumns: ['communityName', 'city', 'type', 'lastUpdated'],
    group: 'Real Estate Data',
  },
  access: {
    read: () => true,
    create: ({ req: { user } }) => !!user,
    update: ({ req: { user } }) => !!user,
    delete: ({ req: { user } }) => !!user,
  },
  fields: [
    // === CORE IDENTITY ===
    {
      name: 'communityName',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'Exact community/subdivision name (e.g., "Bighorn Golf Club", "PGA West")',
      },
    },
    {
      name: 'alternateNames',
      type: 'array',
      admin: {
        description: 'Common variations (e.g., "PDCC" for "Palm Desert Country Club")',
      },
      fields: [
        {
          name: 'name',
          type: 'text',
        },
      ],
    },
    {
      name: 'city',
      type: 'select',
      required: true,
      options: [
        { label: 'Palm Springs', value: 'Palm Springs' },
        { label: 'Cathedral City', value: 'Cathedral City' },
        { label: 'Rancho Mirage', value: 'Rancho Mirage' },
        { label: 'Palm Desert', value: 'Palm Desert' },
        { label: 'Indian Wells', value: 'Indian Wells' },
        { label: 'La Quinta', value: 'La Quinta' },
        { label: 'Indio', value: 'Indio' },
        { label: 'Coachella', value: 'Coachella' },
        { label: 'Desert Hot Springs', value: 'Desert Hot Springs' },
      ],
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      options: [
        { label: 'Equity Country Club', value: 'equity-club' },
        { label: 'Non-Equity Country Club', value: 'non-equity-club' },
        { label: 'Golf Community (No Membership)', value: 'golf-community' },
        { label: 'Gated Non-Golf', value: 'gated-non-golf' },
        { label: '55+ Active Adult', value: '55plus' },
        { label: 'Luxury Gated', value: 'luxury-gated' },
        { label: 'Non-Gated', value: 'non-gated' },
      ],
    },

    // === FINANCIAL DETAILS ===
    {
      name: 'financials',
      type: 'group',
      fields: [
        {
          name: 'hoaMonthlyMin',
          type: 'number',
          admin: {
            description: 'Minimum monthly HOA fee (USD)',
          },
        },
        {
          name: 'hoaMonthlyMax',
          type: 'number',
          admin: {
            description: 'Maximum monthly HOA fee (USD)',
          },
        },
        {
          name: 'hoaIncludes',
          type: 'textarea',
          admin: {
            description: 'What HOA covers (e.g., "landscaping, gate security, community pools")',
          },
        },
        {
          name: 'initiationFee',
          type: 'number',
          admin: {
            description: 'Golf/club initiation fee (USD, for country clubs)',
          },
        },
        {
          name: 'monthlyDues',
          type: 'number',
          admin: {
            description: 'Monthly club dues (USD, separate from HOA)',
          },
        },
        {
          name: 'transferFee',
          type: 'number',
          admin: {
            description: 'Fee to transfer membership on resale (USD)',
          },
        },
        {
          name: 'melloRoos',
          type: 'checkbox',
          admin: {
            description: 'Has Mello-Roos or CFD assessment?',
          },
        },
        {
          name: 'melloRoosAmount',
          type: 'number',
          admin: {
            description: 'Annual Mello-Roos/CFD amount (USD)',
          },
        },
        {
          name: 'lidAssessment',
          type: 'checkbox',
          admin: {
            description: 'Has Landscape & Lighting District assessment?',
          },
        },
        {
          name: 'lidAmount',
          type: 'number',
          admin: {
            description: 'Annual LID assessment (USD)',
          },
        },
        {
          name: 'foodMinimum',
          type: 'number',
          admin: {
            description: 'Required monthly food/beverage minimum (USD)',
          },
        },
      ],
    },

    // === MEMBERSHIP & RESTRICTIONS ===
    {
      name: 'membership',
      type: 'group',
      fields: [
        {
          name: 'waitingList',
          type: 'select',
          options: [
            { label: 'None', value: 'none' },
            { label: 'Short (< 6 months)', value: 'short' },
            { label: 'Medium (6-18 months)', value: 'medium' },
            { label: 'Long (18+ months)', value: 'long' },
            { label: 'Unknown', value: 'unknown' },
          ],
        },
        {
          name: 'waitingListNotes',
          type: 'textarea',
          admin: {
            description: 'Details about current wait times, categories, etc.',
          },
        },
        {
          name: 'allowsSecondaryMembers',
          type: 'checkbox',
          admin: {
            description: 'Can unmarried partners be secondary members?',
          },
        },
        {
          name: 'resaleRestrictionsText',
          type: 'textarea',
          admin: {
            description: 'Notes on membership transfer rules when home is sold',
          },
        },
      ],
    },

    // === AMENITIES ===
    {
      name: 'amenities',
      type: 'group',
      fields: [
        {
          name: 'golfCourses',
          type: 'number',
          admin: {
            description: 'Number of golf courses',
          },
        },
        {
          name: 'golfCoursesNames',
          type: 'textarea',
          admin: {
            description: 'List course names and designers (e.g., "Nicklaus Tournament, Palmer Private")',
          },
        },
        {
          name: 'pickleballCourts',
          type: 'number',
          admin: {
            description: 'Number of pickleball courts',
          },
        },
        {
          name: 'pickleballReservationSystem',
          type: 'textarea',
          admin: {
            description: 'How reservations work (app, first-come, etc.)',
          },
        },
        {
          name: 'tennisCourts',
          type: 'number',
        },
        {
          name: 'pools',
          type: 'number',
          admin: {
            description: 'Number of community pools',
          },
        },
        {
          name: 'fitnessCenter',
          type: 'checkbox',
        },
        {
          name: 'spa',
          type: 'checkbox',
        },
        {
          name: 'restaurant',
          type: 'checkbox',
        },
        {
          name: 'restaurantNames',
          type: 'textarea',
          admin: {
            description: 'Names of on-site restaurants/clubhouses',
          },
        },
        {
          name: 'otherAmenities',
          type: 'textarea',
          admin: {
            description: 'Additional amenities (bocce, croquet, equestrian, etc.)',
          },
        },
      ],
    },

    // === LOCATION & ENVIRONMENT ===
    {
      name: 'environment',
      type: 'group',
      fields: [
        {
          name: 'viewsAvailable',
          type: 'array',
          fields: [
            {
              name: 'view',
              type: 'select',
              options: [
                { label: 'Mountain', value: 'mountain' },
                { label: 'Golf Course', value: 'golf' },
                { label: 'Lake/Water', value: 'lake' },
                { label: 'City Lights', value: 'city-lights' },
                { label: 'Desert', value: 'desert' },
                { label: 'Fairway', value: 'fairway' },
              ],
            },
          ],
        },
        {
          name: 'bestViewCorridors',
          type: 'textarea',
          admin: {
            description: 'Which streets/lots have the best views',
          },
        },
        {
          name: 'airportNoise',
          type: 'select',
          options: [
            { label: 'None', value: 'none' },
            { label: 'Minimal', value: 'minimal' },
            { label: 'Moderate', value: 'moderate' },
            { label: 'Significant', value: 'significant' },
          ],
        },
        {
          name: 'airportNoiseDetails',
          type: 'textarea',
          admin: {
            description: 'Which areas are affected, flight path notes',
          },
        },
        {
          name: 'prevailingWindDirection',
          type: 'text',
          admin: {
            description: 'e.g., "West in summer, variable in winter"',
          },
        },
        {
          name: 'floodZone',
          type: 'checkbox',
          admin: {
            description: 'Any part of community in FEMA flood zone?',
          },
        },
        {
          name: 'floodHistory',
          type: 'textarea',
          admin: {
            description: 'Actual flooding events (2018, 2019, 2023, etc.)',
          },
        },
        {
          name: 'golfCartAccessToRetail',
          type: 'checkbox',
          admin: {
            description: 'Can you golf cart to Starbucks, groceries, etc.?',
          },
        },
        {
          name: 'golfCartPathDetails',
          type: 'textarea',
          admin: {
            description: 'Where paths go, what\'s accessible',
          },
        },
      ],
    },

    // === SECURITY ===
    {
      name: 'security',
      type: 'group',
      fields: [
        {
          name: 'securityType',
          type: 'select',
          options: [
            { label: '24-Hour Guard Gate', value: '24hr-guard' },
            { label: 'Daytime Guard Gate', value: 'daytime-guard' },
            { label: 'Roving Patrol Only', value: 'roving-patrol' },
            { label: 'Unmanned Gate', value: 'unmanned' },
            { label: 'No Gate', value: 'none' },
          ],
        },
        {
          name: 'securityNotes',
          type: 'textarea',
        },
      ],
    },

    // === RESTRICTIONS ===
    {
      name: 'restrictions',
      type: 'group',
      fields: [
        {
          name: 'shortTermRentalsAllowed',
          type: 'select',
          required: true,
          options: [
            { label: 'Yes - No Restrictions', value: 'yes-unrestricted' },
            { label: 'Yes - With Limits', value: 'yes-limited' },
            { label: 'No - HOA Prohibited', value: 'no-hoa' },
            { label: 'No - City Prohibited', value: 'no-city' },
            { label: 'Unknown', value: 'unknown' },
          ],
        },
        {
          name: 'shortTermRentalDetails',
          type: 'textarea',
          admin: {
            description: 'Minimum stay, permit requirements, etc.',
          },
        },
        {
          name: 'minimumLeaseLength',
          type: 'text',
          admin: {
            description: 'e.g., "30 days", "6 months"',
          },
        },
        {
          name: 'petRestrictions',
          type: 'textarea',
        },
        {
          name: 'architecturalReview',
          type: 'checkbox',
          admin: {
            description: 'Strict architectural review for renovations?',
          },
        },
      ],
    },

    // === DEMOGRAPHICS & SOCIAL ===
    {
      name: 'demographics',
      type: 'group',
      fields: [
        {
          name: 'averageMemberAge',
          type: 'number',
          admin: {
            description: 'Average age of club members (if known)',
          },
        },
        {
          name: 'socialCalendar',
          type: 'select',
          options: [
            { label: 'Very Active', value: 'very-active' },
            { label: 'Active', value: 'active' },
            { label: 'Moderate', value: 'moderate' },
            { label: 'Quiet', value: 'quiet' },
          ],
        },
        {
          name: 'socialCalendarNotes',
          type: 'textarea',
          admin: {
            description: 'Events, wine dinners, golf tournaments, etc.',
          },
        },
        {
          name: 'golfProgramQuality',
          type: 'select',
          options: [
            { label: 'Excellent', value: 'excellent' },
            { label: 'Good', value: 'good' },
            { label: 'Average', value: 'average' },
            { label: 'Limited', value: 'limited' },
          ],
        },
      ],
    },

    // === MARKET DATA ===
    {
      name: 'marketData',
      type: 'group',
      fields: [
        {
          name: 'resaleVelocity',
          type: 'select',
          options: [
            { label: 'Very Fast (< 30 days avg)', value: 'very-fast' },
            { label: 'Fast (30-60 days)', value: 'fast' },
            { label: 'Moderate (60-120 days)', value: 'moderate' },
            { label: 'Slow (120+ days)', value: 'slow' },
          ],
        },
        {
          name: 'avgDaysOnMarket',
          type: 'number',
          admin: {
            description: 'Current average DOM for this community',
          },
        },
        {
          name: 'avgPricePerSqFt',
          type: 'number',
          admin: {
            description: 'Current average $/sqft',
          },
        },
        {
          name: 'appreciationTrend36Months',
          type: 'textarea',
          admin: {
            description: 'Price trend notes for past 3 years',
          },
        },
        {
          name: 'hiddenGem',
          type: 'checkbox',
          admin: {
            description: 'Is this an underrated/hidden gem community?',
          },
        },
        {
          name: 'overrated',
          type: 'checkbox',
          admin: {
            description: 'Is this community overpriced relative to value?',
          },
        },
        {
          name: 'marketNotes',
          type: 'textarea',
        },
      ],
    },

    // === PROPERTY SPECIFICS ===
    {
      name: 'propertyDetails',
      type: 'group',
      fields: [
        {
          name: 'yearBuilt',
          type: 'text',
          admin: {
            description: 'Range (e.g., "1998-2005") or decade',
          },
        },
        {
          name: 'avgRoofAge',
          type: 'number',
          admin: {
            description: 'Average roof age in years (for 55+ communities)',
          },
        },
        {
          name: 'roofReplacementStatus',
          type: 'textarea',
          admin: {
            description: 'Any pending HOA roof assessments?',
          },
        },
        {
          name: 'avgHVACAge',
          type: 'number',
          admin: {
            description: 'Average HVAC age in years',
          },
        },
        {
          name: 'solarMandateCompliance',
          type: 'select',
          options: [
            { label: 'Grandfathered (No Requirement)', value: 'grandfathered' },
            { label: 'Required for New Builds Only', value: 'new-builds' },
            { label: 'Required for All', value: 'all' },
            { label: 'Unknown', value: 'unknown' },
          ],
        },
        {
          name: 'casitaCommon',
          type: 'checkbox',
          admin: {
            description: 'Are guest casitas common in this community?',
          },
        },
      ],
    },

    // === GENERAL INFO ===
    {
      name: 'description',
      type: 'richText',
      admin: {
        description: 'General overview of the community',
      },
    },
    {
      name: 'prosCons',
      type: 'group',
      fields: [
        {
          name: 'pros',
          type: 'textarea',
          admin: {
            description: 'Bullet points of main advantages',
          },
        },
        {
          name: 'cons',
          type: 'textarea',
          admin: {
            description: 'Bullet points of main drawbacks',
          },
        },
      ],
    },
    {
      name: 'bestFor',
      type: 'textarea',
      admin: {
        description: 'Who is this community ideal for? (e.g., "serious golfers", "active retirees", "families")',
      },
    },

    // === METADATA ===
    {
      name: 'dataSource',
      type: 'textarea',
      admin: {
        description: 'Where this info came from (broker, HOA docs, prospectus, etc.)',
      },
    },
    {
      name: 'lastVerified',
      type: 'date',
      admin: {
        description: 'When was this data last verified?',
      },
    },
    {
      name: 'needsUpdate',
      type: 'checkbox',
      admin: {
        description: 'Flag if data is stale or needs verification',
      },
    },
  ],
  timestamps: true,
};

export default CommunityFacts;
