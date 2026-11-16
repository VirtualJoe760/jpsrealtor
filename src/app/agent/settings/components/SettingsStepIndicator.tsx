"use client";

// The settings STEPS registry used by the settings sidebar (and formerly by the
// form wizard, removed 2026-11-04). Add a paidOnly step here, not ad-hoc.
import {
  UserCircle,
  Palette,
  Camera,
  FileText,
  Sparkles,
  Share2,
  Globe,
  MapPin,
  CalendarDays,
  Building2,
  Plug,
  CreditCard,
  Target,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type SettingsStep =
  | "identity"
  | "branding"
  | "photos"
  | "content"
  | "highlights"
  | "social"
  | "domain"
  | "areas"
  | "calendar"
  | "gbp"
  | "integrations"
  | "tracking"
  | "billing";

export interface SettingsStepDef {
  id: SettingsStep;
  label: string;
  icon: LucideIcon;
  /** Hidden from free-tier non-admin agents (paid-only feature). */
  paidOnly?: boolean;
}

const STEPS: SettingsStepDef[] = [
  { id: "identity", label: "Identity", icon: UserCircle },
  { id: "branding", label: "Branding", icon: Palette },
  { id: "photos", label: "Photos", icon: Camera },
  { id: "content", label: "Content", icon: FileText },
  { id: "highlights", label: "Highlights", icon: Sparkles },
  { id: "social", label: "Social", icon: Share2 },
  { id: "domain", label: "Domain & SEO", icon: Globe, paidOnly: true },
  { id: "areas", label: "Service Areas", icon: MapPin },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "gbp", label: "Google Business", icon: Building2 },
  { id: "integrations", label: "Integrations", icon: Plug },
  { id: "tracking", label: "Tracking & Ads", icon: Target },
  { id: "billing", label: "Billing", icon: CreditCard },
];

export { STEPS };

/**
 * Steps visible for a given tier. Free-tier non-admins don't see paid-only
 * sections (Domain & SEO); admins + paid agents see everything.
 */
export function getVisibleSteps(
  tier: string = "free",
  isAdmin = false,
): SettingsStepDef[] {
  const showPaid = isAdmin || tier !== "free";
  return STEPS.filter((s) => showPaid || !s.paidOnly);
}
