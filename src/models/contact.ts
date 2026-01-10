/**
 * Contact Model
 *
 * Stores contact information for CRM system with Twilio integration.
 */

import mongoose, { Document, Schema } from 'mongoose';
import type { CampaignType } from './Campaign';

// Phone interface for structured phone data
export interface IPhone {
  number: string;  // E.164 format (+17603333676)
  label: 'mobile' | 'home' | 'work' | 'other';
  isPrimary: boolean;
  isValid: boolean;
  country?: string;
}

// Email interface for structured email data
export interface IEmail {
  address: string;
  label: 'personal' | 'work' | 'other';
  isPrimary: boolean;
  isValid: boolean;
}

export interface IContact extends Document {
  // Owner
  userId: mongoose.Types.ObjectId;  // Reference to User who owns this contact
  teamId?: mongoose.Types.ObjectId;  // Reference to Team (if shared)

  // Basic Info
  firstName: string;
  lastName: string;
  middleName?: string;
  nickname?: string;
  originalName?: string;  // Name before cleaning (e.g., "🔥Firekat🔥" or "/ Campbell")

  // Enhanced Contact Info (Prospect Discovery)
  phones: IPhone[];  // Structured phone array with labels
  emails: IEmail[];  // Structured email array with labels

  // Legacy fields (deprecated - keeping for backward compatibility)
  phone?: string;  // Primary phone number (E.164 format) - DEPRECATED
  email?: string;  // Primary email - DEPRECATED
  alternatePhones?: string[];  // DEPRECATED - use phones array
  alternateEmails?: string[];  // DEPRECATED - use emails array

  birthday?: Date;
  photo?: string;  // URL to contact photo

  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };

  // Additional address
  alternateAddress?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };

  // Organization/Work Info
  organization?: string;  // Company name
  jobTitle?: string;
  department?: string;
  website?: string;

  // Lead Info
  source?: 'manual' | 'csv_import' | 'google_contacts' | 'outlook' | 'api' | 'website' | 'referral';
  status?: 'uncontacted' | 'contacted' | 'qualified' | 'nurturing' | 'client' | 'inactive';
  tags?: string[];  // Freeform tags (buyer, seller, investor, etc.)

  // Prospect Discovery - Enhanced Labels
  labels: mongoose.Types.ObjectId[];  // References to Label model
  legacyLabels?: string[];  // Old string-based labels (myContacts, starred, etc.) - DEPRECATED

  // Prospect Discovery - Contact Classification
  contactType?: 'person' | 'organization' | 'personal' | 'business';
  isPersonal: boolean;  // Flagged as personal contact (emoji, family, etc.)

  // Prospect Discovery - Data Quality
  dataQuality?: {
    score: number;  // 0-100 quality score
    issues: string[];  // ['emoji_in_name', 'multiple_phones', 'no_email', etc.]
    cleanedAt?: Date;  // When data was last cleaned
    verifiedAt?: Date;  // When data was last verified
  };

  // Prospect Discovery - Import Tracking
  importBatchId?: mongoose.Types.ObjectId;  // Reference to ImportBatch
  importedAt?: Date;  // When this contact was imported
  originalData?: any;  // Raw import data for debugging
  originalCreatedDate?: Date;  // Original creation date from source (if available)
  lastModified?: Date;  // Last modification date from source

  // Prospect Discovery - Duplicate Tracking
  duplicateOf?: mongoose.Types.ObjectId;  // If this contact was merged
  relatedContacts?: mongoose.Types.ObjectId[];  // Associated contacts

  // Real Estate Specific
  interests?: {
    buying?: boolean;
    selling?: boolean;
    propertyTypes?: string[];  // Single Family, Condo, etc.
    locations?: string[];  // Cities, subdivisions
    priceRange?: {
      min?: number;
      max?: number;
    };
    timeframe?: string;  // Immediate, 3-6 months, 6-12 months, etc.
  };

  // Communication Preferences
  preferences?: {
    smsOptIn: boolean;  // TCPA compliance
    emailOptIn: boolean;
    callOptIn: boolean;
    preferredContactMethod?: 'sms' | 'email' | 'phone';
  };

  // Consent & Compliance
  consent?: {
    marketingConsent: boolean;
    tcpaConsent: boolean;
    consentDate?: Date;
    consentIp?: string;
  };

  // Notes & Activity
  notes?: string;
  noteHistory?: Array<{
    _id?: mongoose.Types.ObjectId;
    content: string;
    createdAt: Date;
    updatedAt?: Date;
  }>;
  lastContactDate?: Date;
  lastContactMethod?: 'sms' | 'email' | 'phone' | 'in-person';

  // Assigned To
  assignedAgent?: string;  // User ID of assigned agent

  // Drop Cowboy Campaign History
  campaignHistory?: {
    totalCampaigns: number;
    lastCampaignDate?: Date;
    campaigns: Array<{
      campaignId: mongoose.Types.ObjectId;
      campaignName: string;
      campaignType: CampaignType;
      sentAt: Date;
      delivered: boolean;
      listened: boolean;
    }>;
  };

  // Anti-Spam Flags
  doNotContact?: boolean;
  unsubscribedAt?: Date;
  voicemailOptOut?: boolean;

  // Property Information (for real estate contacts)
  // Geographic coordinates
  latitude?: number;
  longitude?: number;
  lat?: number;  // Alternate field name
  lng?: number;  // Alternate field name
  long?: number; // Alternate field name

  // Property details
  bedrooms?: number;
  bedroomsTotal?: number;  // Alternate field name
  bathrooms?: number;
  bathroomsFull?: number;  // Alternate field name
  bathroomsHalf?: number;
  bathroomsTotalDecimal?: number;
  bathroomsTotalInteger?: number;
  sqft?: number;
  squareFeet?: number;  // Alternate field name
  yearBuilt?: number;
  propertyType?: string;
  lotSize?: string;
  lotSizeAcres?: number;
  lotSizeSqFt?: number;

  // Property pricing
  purchasePrice?: number;
  purchaseDate?: Date;
  salePrice?: number;
  homeValue?: number;
  propertyValue?: number;
  assessedValue?: number;
  marketValue?: number;

  // Mailing/Property address fields (separate from residential address)
  mailingAddress?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

const ContactSchema: Schema = new Schema(
  {
    // Owner
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      index: true,
    },

    // Basic Info
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: false,  // Optional - organizations may not have last names
      default: '',
      trim: true,
    },
    middleName: String,
    nickname: String,
    originalName: String,  // Name before cleaning

    // Enhanced Contact Info (Prospect Discovery)
    phones: [{
      number: { type: String, required: true },
      label: {
        type: String,
        enum: ['mobile', 'home', 'work', 'other'],
        default: 'mobile',
      },
      isPrimary: { type: Boolean, default: false },
      isValid: { type: Boolean, default: true },
      country: { type: String, default: 'US' },
    }],
    emails: [{
      address: { type: String, required: true, lowercase: true },
      label: {
        type: String,
        enum: ['personal', 'work', 'other'],
        default: 'personal',
      },
      isPrimary: { type: Boolean, default: false },
      isValid: { type: Boolean, default: true },
    }],

    // Legacy fields (deprecated - for backward compatibility)
    email: {
      type: String,
      trim: true,
      lowercase: true,
      sparse: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    alternatePhones: [String],
    alternateEmails: [String],

    birthday: Date,
    photo: String,

    address: {
      street: String,
      city: String,
      state: String,
      zip: String,
      country: String,
    },

    alternateAddress: {
      street: String,
      city: String,
      state: String,
      zip: String,
      country: String,
    },

    // Organization/Work Info
    organization: String,
    jobTitle: String,
    department: String,
    website: String,

    // Lead Info
    source: {
      type: String,
      enum: ['manual', 'csv_import', 'google_contacts', 'outlook', 'api', 'website', 'referral'],
      default: 'manual',
    },
    status: {
      type: String,
      enum: ['uncontacted', 'contacted', 'qualified', 'nurturing', 'client', 'inactive'],
      default: 'uncontacted',
    },
    tags: [String],

    // Prospect Discovery - Enhanced Labels
    labels: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Label',
      index: true,
    }],
    legacyLabels: [String],  // DEPRECATED - old string-based labels

    // Prospect Discovery - Contact Classification
    contactType: {
      type: String,
      enum: ['person', 'organization', 'personal', 'business'],
      default: 'person',
    },
    isPersonal: {
      type: Boolean,
      default: false,
      index: true,
    },

    // Prospect Discovery - Data Quality
    dataQuality: {
      score: {
        type: Number,
        min: 0,
        max: 100,
        default: 50,
      },
      issues: [String],
      cleanedAt: Date,
      verifiedAt: Date,
    },

    // Prospect Discovery - Import Tracking
    importBatchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ImportBatch',
      index: true,
    },
    importedAt: Date,
    originalData: mongoose.Schema.Types.Mixed,
    originalCreatedDate: Date,
    lastModified: Date,

    // Prospect Discovery - Duplicate Tracking
    duplicateOf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contact',
    },
    relatedContacts: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contact',
    }],

    // Real Estate Specific
    interests: {
      buying: Boolean,
      selling: Boolean,
      propertyTypes: [String],
      locations: [String],
      priceRange: {
        min: Number,
        max: Number,
      },
      timeframe: String,
    },

    // Communication Preferences
    preferences: {
      smsOptIn: {
        type: Boolean,
        default: false,
      },
      emailOptIn: {
        type: Boolean,
        default: false,
      },
      callOptIn: {
        type: Boolean,
        default: false,
      },
      preferredContactMethod: {
        type: String,
        enum: ['sms', 'email', 'phone'],
        default: 'sms',
      },
    },

    // Consent & Compliance
    consent: {
      marketingConsent: {
        type: Boolean,
        default: false,
      },
      tcpaConsent: {
        type: Boolean,
        default: false,
      },
      consentDate: Date,
      consentIp: String,
    },

    // Notes & Activity
    notes: String,
    noteHistory: [{
      content: {
        type: String,
        required: true,
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
      updatedAt: Date,
    }],
    lastContactDate: Date,
    lastContactMethod: {
      type: String,
      enum: ['sms', 'email', 'phone', 'in-person'],
    },

    // Assigned To
    assignedAgent: String,

    // Drop Cowboy Campaign History
    campaignHistory: {
      totalCampaigns: {
        type: Number,
        default: 0,
      },
      lastCampaignDate: Date,
      campaigns: [
        {
          campaignId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Campaign',
          },
          campaignName: String,
          campaignType: {
            type: String,
            enum: [
              'sphere_of_influence',
              'past_clients',
              'neighborhood_expireds',
              'high_equity',
              'custom',
            ],
          },
          sentAt: Date,
          delivered: Boolean,
          listened: Boolean,
        },
      ],
    },

    // Anti-Spam Flags
    doNotContact: {
      type: Boolean,
      default: false,
      index: true,
    },
    unsubscribedAt: Date,
    voicemailOptOut: {
      type: Boolean,
      default: false,
    },

    // Property Information (for real estate contacts)
    // Geographic coordinates
    latitude: Number,
    longitude: Number,
    lat: Number,  // Alternate field name
    lng: Number,  // Alternate field name
    long: Number, // Alternate field name

    // Property details
    bedrooms: Number,
    bedroomsTotal: Number,  // Alternate field name
    bathrooms: Number,
    bathroomsFull: Number,  // Alternate field name
    bathroomsHalf: Number,
    bathroomsTotalDecimal: Number,
    bathroomsTotalInteger: Number,
    sqft: Number,
    squareFeet: Number,  // Alternate field name
    yearBuilt: Number,
    propertyType: String,
    lotSize: String,
    lotSizeAcres: Number,
    lotSizeSqFt: Number,

    // Property pricing
    purchasePrice: Number,
    purchaseDate: Date,
    salePrice: Number,
    homeValue: Number,
    propertyValue: Number,
    assessedValue: Number,
    marketValue: Number,

    // Mailing/Property address fields (separate from residential address)
    mailingAddress: {
      street: String,
      city: String,
      state: String,
      zip: String,
      country: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
ContactSchema.index({ userId: 1, phone: 1 }, { unique: true });  // Prevent duplicate contacts per user
ContactSchema.index({ userId: 1, email: 1 }, { sparse: true });
ContactSchema.index({ userId: 1, status: 1 });
ContactSchema.index({ userId: 1, 'preferences.smsOptIn': 1 });
ContactSchema.index({ userId: 1, createdAt: -1 });
ContactSchema.index({ assignedAgent: 1 });
ContactSchema.index({ firstName: 1, lastName: 1 });

// Text search index
ContactSchema.index({
  firstName: 'text',
  lastName: 'text',
  email: 'text',
  phone: 'text',
  notes: 'text',
});

// Virtual for full name
ContactSchema.virtual('fullName').get(function (this: IContact) {
  return `${this.firstName} ${this.lastName}`;
});

// Ensure virtuals are included when converting to JSON
ContactSchema.set('toJSON', { virtuals: true });
ContactSchema.set('toObject', { virtuals: true });

export default mongoose.models.Contact || mongoose.model<IContact>('Contact', ContactSchema);
