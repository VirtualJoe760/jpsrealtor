import mongoose, { Schema, model, models, Document, Types } from 'mongoose';

export type MailType = 'postcard_4x6' | 'postcard_6x9' | 'postcard_6x11' | 'letter' | 'notecard';

export type DirectMailStatus =
  | 'pending'
  | 'submitted'
  | 'printing'
  | 'mailed'
  | 'delivered'
  | 'returned'
  | 'cancelled';

export interface IDirectMailPiece extends Document {
  _id: Types.ObjectId;
  campaignId: Types.ObjectId;
  contactId?: Types.ObjectId;
  userId: Types.ObjectId;

  // Mail type
  mailType: MailType;
  thanksioOrderId?: string;

  // Content
  frontImageUrl: string;
  backImageUrl?: string;
  message?: string;
  handwritingStyle?: number;

  // Recipient
  recipientName: string;
  recipientAddress: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };

  // Return address
  returnAddress?: {
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
  };

  // Status lifecycle
  status: DirectMailStatus;
  submittedAt?: Date;
  printedAt?: Date;
  mailedAt?: Date;
  deliveredAt?: Date;
  returnedAt?: Date;

  // QR Tracking
  qrUrl?: string;
  qrScannedAt?: Date;
  qrScanCount: number;

  // Cost
  cost: number;

  // Radius send (no contact, sent to address directly)
  isRadiusSend: boolean;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const DirectMailPieceSchema = new Schema<IDirectMailPiece>(
  {
    campaignId: {
      type: Schema.Types.ObjectId,
      ref: 'Campaign',
      required: true,
      index: true,
    },
    contactId: {
      type: Schema.Types.ObjectId,
      ref: 'Contact',
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // Mail type
    mailType: {
      type: String,
      enum: ['postcard_4x6', 'postcard_6x9', 'postcard_6x11', 'letter', 'notecard'],
      required: true,
    },
    thanksioOrderId: String,

    // Content
    frontImageUrl: {
      type: String,
      required: true,
    },
    backImageUrl: String,
    message: String,
    handwritingStyle: Number,

    // Recipient
    recipientName: {
      type: String,
      required: true,
    },
    recipientAddress: {
      street: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      zip: { type: String, default: '' },
    },

    // Return address
    returnAddress: {
      name: String,
      address: String,
      city: String,
      state: String,
      zip: String,
    },

    // Status lifecycle
    status: {
      type: String,
      enum: ['pending', 'submitted', 'printing', 'mailed', 'delivered', 'returned', 'cancelled'],
      default: 'pending',
      index: true,
    },
    submittedAt: Date,
    printedAt: Date,
    mailedAt: Date,
    deliveredAt: Date,
    returnedAt: Date,

    // QR Tracking
    qrUrl: String,
    qrScannedAt: Date,
    qrScanCount: {
      type: Number,
      default: 0,
    },

    // Cost
    cost: {
      type: Number,
      default: 0,
    },

    // Radius send flag
    isRadiusSend: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
DirectMailPieceSchema.index({ campaignId: 1, status: 1 });
DirectMailPieceSchema.index({ userId: 1, createdAt: -1 });
DirectMailPieceSchema.index({ thanksioOrderId: 1 });

export default (models.DirectMailPiece ||
  model<IDirectMailPiece>('DirectMailPiece', DirectMailPieceSchema)) as mongoose.Model<IDirectMailPiece>;
