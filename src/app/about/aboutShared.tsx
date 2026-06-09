"use client";

// Shared data normalization + a Reveal helper for the About page. AboutClient
// fetches the agent and picks the layout (desktop scroll vs mobile swipe panels);
// both layouts read the same normalized AboutData.

import { motion } from "framer-motion";
import { Facebook, Instagram, Linkedin, Youtube } from "lucide-react";

export interface AboutData {
  name: string;
  firstName: string;
  brand: string;
  isLight: boolean;
  headshot?: string;
  heroBg?: string;
  headline: string;
  tagline: string;
  brokerageName?: string;
  licenseNumber?: string;
  phone?: string;
  email?: string;
  officeAddress?: string;
  storyParas: string[];
  stats: { value?: string; label?: string }[];
  valueProps: { title?: string; description?: string }[];
  specializations: string[];
  certifications: { name?: string; issuedBy?: string; year?: number }[];
  serviceAreas: { name?: string }[];
  testimonials: { text?: string; clientName?: string; rating?: number; propertyAddress?: string }[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  socials: { href: string; Icon: any }[];
}

export function getAboutData(agent: any, isLight: boolean): AboutData {
  const ap = agent?.agentProfile || {};
  const name: string = agent?.name || "Your Agent";
  return {
    name,
    firstName: name.split(" ")[0],
    brand: ap.brandColor || "#2563eb",
    isLight,
    headshot: ap.headshot || ap.profilePhoto,
    heroBg: isLight ? (ap.heroImage || ap.heroPhoto) : (ap.heroImageDark || ap.heroPhotoDark || ap.heroImage || ap.heroPhoto),
    headline: ap.headline || `Meet ${name.split(" ")[0]}`,
    tagline: ap.tagline || "",
    brokerageName: agent?.brokerageName || ap.brokerageName,
    licenseNumber: agent?.licenseNumber || ap.licenseNumber,
    phone: ap.cellPhone || ap.officePhone || agent?.phone,
    email: agent?.email,
    officeAddress: ap.officeAddress,
    storyParas: String(ap.personalStory || ap.bio || "").split(/\n+/).filter(Boolean),
    stats: (ap.stats || []).filter((s: any) => s && (s.value || s.label)),
    valueProps: (ap.valuePropositions || []).filter((v: any) => v && (v.title || v.description)),
    specializations: (ap.specializations || []).filter(Boolean),
    certifications: (ap.certifications || []).filter((c: any) => c && c.name),
    serviceAreas: (ap.serviceAreas || []).filter((a: any) => a && a.name),
    testimonials: (ap.testimonials || []).filter((t: any) => t && t.text),
    socials: [
      { href: ap.facebook, Icon: Facebook },
      { href: ap.instagram, Icon: Instagram },
      { href: ap.linkedin, Icon: Linkedin },
      { href: ap.youtube, Icon: Youtube },
    ].filter((s) => s.href),
  };
}

/** Fade + rise into view once, on scroll (desktop). */
export function Reveal({
  children,
  className = "",
  delay = 0,
  y = 40,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
