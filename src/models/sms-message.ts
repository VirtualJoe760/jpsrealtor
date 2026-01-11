/**
 * SMS Message Model
 *
 * Stores SMS message history for Twilio integration.
 */

import mongoose, { Document, Schema } from 'mongoose';

export interface ISMSMessage extends Document {
  // Owner
  userId: mongoose.Types.ObjectId;  // Reference to User who owns this message

  // Twilio IDs
  twilioMessageSid: string;  // Unique Twilio message identifier
  twilioAccountSid?: string;

  // Participants
  from: string;  // Phone number (E.164 format)
  to: string;    // Phone number (E.164 format)

  // Message Content
  body: string;
  mediaUrls?: string[];  // MMS attachments

  // Direction & Status
  direction: 'inbound' | 'outbound';
  status: 'queued' | 'sending' | 'sent' | 'delivered' | 'undelivered' | 'failed' | 'received';

  // Linked Contact
  contactId?: string;  // Reference to Contact model

  // Campaign/Thread
  campaignId?: string;  // Optional campaign reference
  threadId?: string;    // Conversation thread ID

  // Error Handling
  errorCode?: number;
  errorMessage?: string;

  // Pricing
  price?: number;
  priceUnit?: string;  // Currency (USD)

  // Metadata
  sentBy?: string;  // User ID who sent the message (for outbound)
  tags?: string[];  // Categorization

  // Timestamps
  twilioCreatedAt?: Date;  // When Twilio created the message
  deliveredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SMSMessageSchema: Schema = new Schema(
  {
    // Owner
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // Twilio IDs
    twilioMessageSid: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    twilioAccountSid: String,

    // Participants
    from: {
      type: String,
      required: true,
      trim: true,
    },
    to: {
      type: String,
      required: true,
      trim: true,
    },

    // Message Content
    body: {
      type: String,
      required: true,
    },
    mediaUrls: [String],

    // Direction & Status
    direction: {
      type: String,
      enum: ['inbound', 'outbound'],
      required: true,
    },
    status: {
      type: String,
      enum: ['queued', 'sending', 'sent', 'delivered', 'undelivered', 'failed', 'received'],
      default: 'queued',
    },

    // Linked Contact
    contactId: {
      type: String,
      index: true,
    },

    // Campaign/Thread
    campaignId: String,
    threadId: {
      type: String,
      index: true,
    },

    // Error Handling
    errorCode: Number,
    errorMessage: String,

    // Pricing
    price: Number,
    priceUnit: String,

    // Metadata
    sentBy: String,
    tags: [String],

    // Timestamps
    twilioCreatedAt: Date,
    deliveredAt: Date,
  },
  {
    timestamps: true,
  }
);

// Compound indexes for queries
SMSMessageSchema.index({ userId: 1, from: 1, createdAt: -1 });
SMSMessageSchema.index({ userId: 1, to: 1, createdAt: -1 });
SMSMessageSchema.index({ userId: 1, contactId: 1, createdAt: -1 });
SMSMessageSchema.index({ userId: 1, threadId: 1, createdAt: 1 });  // Ascending for chronological threads
SMSMessageSchema.index({ userId: 1, status: 1, direction: 1 });
SMSMessageSchema.index({ campaignId: 1 });

// Text search for message content
SMSMessageSchema.index({ body: 'text' });

// TTL index - optionally delete messages after X days (e.g., 90 days for compliance)
// Uncomment if you want automatic deletion:
// SMSMessageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 }); // 90 days

export default (mongoose.models.SMSMessage ||
  mongoose.model<ISMSMessage>('SMSMessage', SMSMessageSchema)) as mongoose.Model<ISMSMessage>;
