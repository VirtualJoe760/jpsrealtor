/**
 * Contact Model
 *
 * Stores contact information for CRM system with Twilio integration.
 */

import mongoose, { Document, Schema } from 'mongoose';

export interface IContact extends Document {
  // Owner
  userId: mongoose.Types.ObjectId;  // Reference to User who owns this contact

  // Basic Info
  firstName: string;
  lastName: string;
  middleName?: string;
  nickname?: string;
  email?: string;
  phone: string;  // Primary phone number (E.164 format)

  // Additional Contact Info
  alternatePhones?: string[];  // All additional phone numbers
  alternateEmails?: string[];  // All additional emails
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
  source?: string;  // Where did they come from? (website, referral, etc.)
  status?: 'new' | 'contacted' | 'qualified' | 'nurturing' | 'client' | 'inactive';
  tags?: string[];  // Categories (buyer, seller, investor, etc.)
  labels?: string[];  // Google labels (myContacts, starred, etc.)

  // Contact Age Tracking (for cleaning)
  importedAt?: Date;  // When this contact was imported
  originalCreatedDate?: Date;  // Original creation date from source (if available)
  lastModified?: Date;  // Last modification date from source

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
  lastContactDate?: Date;
  lastContactMethod?: 'sms' | 'email' | 'phone' | 'in-person';

  // Assigned To
  assignedAgent?: string;  // User ID of assigned agent

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
    email: {
      type: String,
      trim: true,
      lowercase: true,
      sparse: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },

    // Additional Contact Info
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
      default: 'manual',
    },
    status: {
      type: String,
      enum: ['new', 'contacted', 'qualified', 'nurturing', 'client', 'inactive'],
      default: 'new',
    },
    tags: [String],
    labels: [String],

    // Contact Age Tracking
    importedAt: Date,
    originalCreatedDate: Date,
    lastModified: Date,

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
    lastContactDate: Date,
    lastContactMethod: {
      type: String,
      enum: ['sms', 'email', 'phone', 'in-person'],
    },

    // Assigned To
    assignedAgent: String,
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
