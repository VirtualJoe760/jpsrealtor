// src/lib/meta-capi.ts
// Server-side Meta Conversions API integration
// Use this in API routes (NOT client components)

import crypto from "crypto";

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || "";
const ACCESS_TOKEN = process.env.META_CAPI_ACCESS_TOKEN || "";
const API_VERSION = "v20.0";

function hash(value: string): string {
  return crypto.createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

interface UserData {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  city?: string;
  state?: string;
  zip?: string;
  clientIp?: string;
  clientUserAgent?: string;
  fbc?: string;
  fbp?: string;
}

interface CAPIEvent {
  eventName: string;
  eventSourceUrl?: string;
  userData: UserData;
  customData?: Record<string, any>;
  eventId?: string;
}

export async function sendCAPIEvent(event: CAPIEvent): Promise<{ success: boolean; error?: string }> {
  if (!PIXEL_ID || !ACCESS_TOKEN) {
    console.warn("[CAPI] Missing PIXEL_ID or ACCESS_TOKEN — skipping");
    return { success: false, error: "Missing config" };
  }

  const hashedUserData: Record<string, any> = {};

  if (event.userData.email) hashedUserData.em = [hash(event.userData.email)];
  if (event.userData.phone) hashedUserData.ph = [hash(event.userData.phone)];
  if (event.userData.firstName) hashedUserData.fn = [hash(event.userData.firstName)];
  if (event.userData.lastName) hashedUserData.ln = [hash(event.userData.lastName)];
  if (event.userData.city) hashedUserData.ct = [hash(event.userData.city)];
  if (event.userData.state) hashedUserData.st = [hash(event.userData.state)];
  if (event.userData.zip) hashedUserData.zp = [hash(event.userData.zip)];

  // Non-hashed fields
  if (event.userData.clientIp) hashedUserData.client_ip_address = event.userData.clientIp;
  if (event.userData.clientUserAgent) hashedUserData.client_user_agent = event.userData.clientUserAgent;
  if (event.userData.fbc) hashedUserData.fbc = event.userData.fbc;
  if (event.userData.fbp) hashedUserData.fbp = event.userData.fbp;

  const payload = {
    data: [
      {
        event_name: event.eventName,
        event_time: Math.floor(Date.now() / 1000),
        action_source: "website",
        event_source_url: event.eventSourceUrl || "https://chatrealty.io",
        event_id: event.eventId || `${event.eventName}_${Date.now()}`,
        user_data: hashedUserData,
        ...(event.customData && { custom_data: event.customData }),
      },
    ],
    access_token: ACCESS_TOKEN,
  };

  try {
    const res = await fetch(
      `https://graph.facebook.com/${API_VERSION}/${PIXEL_ID}/events`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    const data = await res.json();

    if (data.error) {
      console.error("[CAPI] Error:", data.error.message);
      return { success: false, error: data.error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error("[CAPI] Fetch error:", err.message);
    return { success: false, error: err.message };
  }
}

// Convenience wrappers for common events

export function sendLeadEvent(userData: UserData, customData?: Record<string, any>) {
  return sendCAPIEvent({ eventName: "Lead", userData, customData });
}

export function sendCompleteRegistrationEvent(userData: UserData) {
  return sendCAPIEvent({ eventName: "CompleteRegistration", userData });
}

export function sendSubscribeEvent(userData: UserData) {
  return sendCAPIEvent({ eventName: "Subscribe", userData });
}
