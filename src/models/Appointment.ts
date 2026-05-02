import mongoose, { Schema, Document } from "mongoose";

export type AppointmentType =
  | "showing"
  | "consultation"
  | "call"
  | "open-house"
  | "listing-presentation"
  | "closing"
  | "other";

export type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "cancelled"
  | "completed"
  | "no-show";

export type AppointmentSource =
  | "booking-page"    // Public booking page visitor
  | "chat"            // AI chat scheduled
  | "crm"             // Agent created from CRM
  | "agent-manual"    // Agent created manually
  | "google-calendar"; // Synced from Google Calendar

export interface IAppointment extends Document {
  // Ownership
  agentId: mongoose.Types.ObjectId;
  contactId?: mongoose.Types.ObjectId;

  // Google Calendar link
  googleEventId?: string;
  googleCalendarId?: string; // Which calendar (default: "primary")

  // Appointment details
  title: string;
  description?: string;
  type: AppointmentType;
  status: AppointmentStatus;
  source: AppointmentSource;

  // Timing
  startTime: Date;
  endTime: Date;
  timezone: string;

  // Location
  location?: string;
  propertyListingKey?: string; // Link to a listing if it's a showing
  propertyAddress?: string;

  // Attendee (visitor/lead who booked — may not be a Contact yet)
  attendee?: {
    name: string;
    email: string;
    phone?: string;
  };

  // Metadata
  notes?: string;
  reminderSent?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AppointmentSchema = new Schema<IAppointment>(
  {
    agentId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    contactId: { type: Schema.Types.ObjectId, ref: "Contact", index: true },

    googleEventId: { type: String, sparse: true },
    googleCalendarId: { type: String, default: "primary" },

    title: { type: String, required: true },
    description: String,
    type: {
      type: String,
      enum: ["showing", "consultation", "call", "open-house", "listing-presentation", "closing", "other"],
      default: "consultation",
    },
    status: {
      type: String,
      enum: ["scheduled", "confirmed", "cancelled", "completed", "no-show"],
      default: "scheduled",
    },
    source: {
      type: String,
      enum: ["booking-page", "chat", "crm", "agent-manual", "google-calendar"],
      required: true,
    },

    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    timezone: { type: String, default: "America/Los_Angeles" },

    location: String,
    propertyListingKey: String,
    propertyAddress: String,

    attendee: {
      name: String,
      email: String,
      phone: String,
    },

    notes: String,
    reminderSent: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Compound indexes for common queries
AppointmentSchema.index({ agentId: 1, startTime: -1 });
AppointmentSchema.index({ agentId: 1, status: 1, startTime: 1 });
AppointmentSchema.index({ contactId: 1, startTime: -1 });
AppointmentSchema.index({ agentId: 1, googleEventId: 1 }, { unique: true, sparse: true });

export default (mongoose.models.Appointment ||
  mongoose.model<IAppointment>("Appointment", AppointmentSchema)) as mongoose.Model<IAppointment>;
