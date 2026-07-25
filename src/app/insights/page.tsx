import { permanentRedirect } from "next/navigation";

// The homepage IS the insights feed, so /insights is a permanent alias —
// not a temporary detour. `redirect()` emits 307 (temporary), which tells
// Google to keep the old URL indexed and pass no equity; 308 consolidates
// it into the homepage. (The 45 /insights/{category}/{slug} articles are
// real pages and are unaffected — only this bare index redirects.)
export default function InsightsPage() {
  permanentRedirect("/");
}
