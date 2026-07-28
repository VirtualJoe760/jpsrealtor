// src/models/PendingPost.ts
//
// A generated social post waiting for the agent to approve it.
//
// Instagram's Content Publishing API has no drafts and no scheduling — verified
// against Meta's live docs 2026-07-26; the container endpoint accepts no
// `scheduled_publish_time` and exposes no drafts endpoint. So the "review it
// before it goes out, and schedule it" step has to live here instead.
//
// NOTHING PUBLISHES WITHOUT `approvedAt` BEING SET. The publish job treats the
// absence of an approval as a hard stop, not a default-yes after a timeout.
//
// Scoped by `agentId` from day one. This is a user feature that Joseph happens
// to be tenant one of — never key anything off a hardcoded identity.
//
// See docs/content-templates/auto-posting.md for the pipeline this belongs to.

import mongoose, { Schema, Document, Model } from "mongoose";

export type PendingPostStatus =
  | "generating"       // build in flight
  | "awaiting_review"  // slides ready, agent notified
  | "approved"         // agent said yes; waiting for its slot
  | "posted"           // live on Instagram
  | "declined"         // agent said no
  | "expired"          // rolled past its retry budget, never approved
  | "failed";          // generation or publish errored

export type PendingPostTemplate = "simple-luxury-carousel";

export interface IPendingPostSlide {
  /** Position in the carousel, 1-based. Instagram publishes in this order. */
  n: number;
  /** Cloudinary public_id — what the cleanup sweep deletes. */
  publicId: string;
  /** Public https URL — what Instagram fetches. */
  url: string;
  /** Which slide type produced it, for the review UI to label. */
  kind: "cover" | "room" | "cma" | "text" | "cta";
}

export interface IPendingPost extends Document {
  /** The agent who owns this post. Every query filters on it. */
  agentId: mongoose.Types.ObjectId;

  template: PendingPostTemplate;
  status: PendingPostStatus;

  // --- subject ---------------------------------------------------------
  listingKey: string;
  /**
   * Snapshot of the listing at build time. Denormalized on purpose: the review
   * UI shouldn't refetch, and the record must still read correctly months later
   * even after the listing changes price or goes off-market.
   */
  listingSnapshot: {
    address?: string;
    city?: string;
    price?: string;
    beds?: number;
    baths?: number;
    sqft?: number;
    listAgentName?: string;
    listOfficeName?: string;
  };

  // --- content ---------------------------------------------------------
  slides: IPendingPostSlide[];
  caption: string;

  // --- approval --------------------------------------------------------
  /**
   * Short code shown in the SMS ("reply POST A4"). Disambiguates when several
   * posts are pending at once — at 3 slots a week that is the normal case, not
   * the edge case.
   */
  approvalCode: string;
  approvedAt?: Date | null;
  /** How the yes arrived — useful for knowing whether the SMS loop is used. */
  approvedVia?: "dashboard" | "sms" | null;
  declinedAt?: Date | null;
  declineReason?: string | null;
  /**
   * Per-slide notes from the agent — "blank space at the bottom", "same posture
   * as slide 2", "don't compare it to another market".
   *
   * Slide-level rather than post-level because that is how the feedback
   * actually arrives: a post is rarely wholly bad, it is slide 2 and slide 7.
   * Post-level notes lose which slide they were about, which is exactly the
   * information needed to regenerate just that one.
   */
  slideFeedback?: Array<{ n: number; note: string }>;

  // --- scheduling ------------------------------------------------------
  /** The slot this post is aimed at. Rolls forward when a slot is missed. */
  scheduledFor?: Date | null;
  /**
   * Slots missed so far. A post that is never approved must eventually stop
   * rolling and expire rather than resurface forever.
   */
  rollCount: number;

  // --- notifications ---------------------------------------------------
  notifiedAt?: Date | null;
  /** Reminder sent at the slot itself, before the grace window elapses. */
  remindedAt?: Date | null;

  // --- result ----------------------------------------------------------
  postedAt?: Date | null;
  igPostId?: string | null;
  permalink?: string | null;
  error?: string | null;
  /** Publish attempts that threw. Caps retries so a permanently broken post
   *  stops being retried every morning forever. */
  failedAttempts?: number;

  /** True once the Cloudinary slide assets have been swept. */
  assetsDeletedAt?: Date | null;

  /**
   * Everything needed to rebuild this post differently — which photos were
   * staged and with what direction. "Regenerate" re-runs from here rather than
   * starting over, so a bad room pick can be swapped without re-picking copy.
   */
  generation: {
    photoIndexes?: number[];
    poses?: string[];
    hook?: string;
    accentColor?: string;
    /** Bumped each time the agent asks for another take. */
    attempt: number;
  };

  createdAt: Date;
  updatedAt: Date;
}

const SlideSchema = new Schema<IPendingPostSlide>(
  {
    n: { type: Number, required: true },
    publicId: { type: String, required: true },
    url: { type: String, required: true },
    kind: {
      type: String,
      enum: ["cover", "room", "cma", "text", "cta"],
      required: true,
    },
  },
  { _id: false }
);

const PendingPostSchema = new Schema<IPendingPost>(
  {
    agentId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    template: { type: String, default: "simple-luxury-carousel" },
    status: {
      type: String,
      enum: [
        "generating",
        "awaiting_review",
        "approved",
        "posted",
        "declined",
        "expired",
        "failed",
      ],
      default: "generating",
      index: true,
    },

    listingKey: { type: String, required: true, index: true },
    listingSnapshot: {
      address: String,
      city: String,
      price: String,
      beds: Number,
      baths: Number,
      sqft: Number,
      listAgentName: String,
      listOfficeName: String,
    },

    slides: { type: [SlideSchema], default: [] },
    caption: { type: String, default: "" },

    approvalCode: { type: String, required: true },
    approvedAt: { type: Date, default: null },
    approvedVia: { type: String, enum: ["dashboard", "sms", null], default: null },
    declinedAt: { type: Date, default: null },
    declineReason: { type: String, default: null },
    slideFeedback: {
      type: [{ n: Number, note: String }],
      default: undefined,
      _id: false,
    },

    scheduledFor: { type: Date, default: null },
    rollCount: { type: Number, default: 0 },

    notifiedAt: { type: Date, default: null },
    remindedAt: { type: Date, default: null },

    postedAt: { type: Date, default: null },
    igPostId: { type: String, default: null },
    permalink: { type: String, default: null },
    error: { type: String, default: null },
    failedAttempts: { type: Number, default: 0 },

    assetsDeletedAt: { type: Date, default: null },

    generation: {
      photoIndexes: { type: [Number], default: undefined },
      poses: { type: [String], default: undefined },
      hook: String,
      accentColor: String,
      attempt: { type: Number, default: 1 },
    },
  },
  { timestamps: true }
);

// The review queue: an agent's posts awaiting them, newest first.
PendingPostSchema.index({ agentId: 1, status: 1, createdAt: -1 });
// The publish job: what is approved and due.
PendingPostSchema.index({ status: 1, scheduledFor: 1 });
// SMS approval: resolve "POST A4" to a post for THIS agent. Codes are only
// unique per agent among posts still awaiting review, so the handler must
// filter on status too — a stale code from a posted item must not match.
PendingPostSchema.index({ agentId: 1, approvalCode: 1 });

/**
 * Two characters, unambiguous to read aloud or type on a phone: no O/0, I/1,
 * S/5. Collisions are handled by the caller retrying against the agent's
 * currently-pending codes rather than by making the code longer.
 */
export function generateApprovalCode(): string {
  const L = "ABCDEFGHJKLMNPQRTUVWXYZ";
  const D = "23456789";
  return L[Math.floor(Math.random() * L.length)] + D[Math.floor(Math.random() * D.length)];
}

const PendingPost: Model<IPendingPost> =
  (mongoose.models.PendingPost as Model<IPendingPost>) ||
  mongoose.model<IPendingPost>("PendingPost", PendingPostSchema);

export default PendingPost;
