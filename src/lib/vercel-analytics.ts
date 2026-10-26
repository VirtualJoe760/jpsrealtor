// src/lib/vercel-analytics.ts
// Vercel Web Analytics custom events for successful lead submissions.
// Properties are deliberately coarse: a form identifier and the hostname (so
// events split per tenant domain like page views do). Never pass name, email,
// phone, address, message text or a city the visitor typed — the dashboard is
// shared and these events are not a CRM. Custom events need a Pro/Enterprise
// Vercel plan; on Hobby, track() is a silent no-op.
import { track } from "@vercel/analytics";

function host(): string {
  return typeof window !== "undefined" ? window.location.hostname : "";
}

// form: buy_intake | sell_intake | contact_form | campaign_form
export function trackInquirySubmitted(form: string) {
  track("Inquiry Submitted", { form, hostname: host() });
}

// appointmentType is the booking-page enum (e.g. phone/video/in-person).
export function trackAppointmentBooked(appointmentType: string) {
  track("Appointment Booked", { appointmentType, hostname: host() });
}
