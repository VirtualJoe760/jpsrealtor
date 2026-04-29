import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPlatformConfig extends Document {
  _id: string; // "homepage" or other config keys
  hero: {
    headline: string;
    subheadline: string;
    ctaText: string;
    ctaLink: string;
    backgroundImage: string;
    backgroundImageDark: string;
  };
  valueProps: Array<{
    icon: string;
    title: string;
    description: string;
  }>;
  featuredAgentIds: mongoose.Types.ObjectId[];
  featuredCommunities: Array<{
    citySlug: string;
    name: string;
    photo: string;
  }>;
  testimonials: Array<{
    name: string;
    role: string;
    quote: string;
    photo: string;
    rating: number;
  }>;
  customStats: Array<{
    label: string;
    value: string;
  }>;
  seo: {
    metaTitle: string;
    metaDescription: string;
    ogImage: string;
  };
  updatedAt: Date;
  updatedBy: mongoose.Types.ObjectId;
}

const PlatformConfigSchema = new Schema<IPlatformConfig>(
  {
    _id: { type: String, required: true },
    hero: {
      headline: { type: String, default: "" },
      subheadline: { type: String, default: "" },
      ctaText: { type: String, default: "Get Started" },
      ctaLink: { type: String, default: "/auth/signin" },
      backgroundImage: String,
      backgroundImageDark: String,
    },
    valueProps: [{ icon: String, title: String, description: String }],
    featuredAgentIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
    featuredCommunities: [{ citySlug: String, name: String, photo: String }],
    testimonials: [{ name: String, role: String, quote: String, photo: String, rating: Number }],
    customStats: [{ label: String, value: String }],
    seo: {
      metaTitle: { type: String, default: "" },
      metaDescription: { type: String, default: "" },
      ogImage: String,
    },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true, collection: "platform_config" }
);

export default (mongoose.models.PlatformConfig ||
  mongoose.model<IPlatformConfig>("PlatformConfig", PlatformConfigSchema)) as Model<IPlatformConfig>;
