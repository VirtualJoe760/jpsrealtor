// Shown on EVERY page while CHATREALTY_TEST_DATA=true. Server component — it
// reads the env directly. Do not remove this banner while in test mode: the
// sample listings are fictitious, and a public site presenting them as real
// inventory would misrepresent the market and violate MLS/IDX display rules.
// It disappears on its own once you switch to real data (set
// CHATREALTY_API_TOKEN and remove CHATREALTY_TEST_DATA from .env.local).

import { isTestDataMode } from "@/lib/test-data";

export default function TestDataBanner() {
  if (!isTestDataMode()) return null;
  return (
    <div className="sticky top-0 z-50 border-b border-amber-300 bg-amber-100 px-4 py-2 text-center text-sm font-semibold text-amber-900">
      ⚠ TEST DATA — the listings on this site are fictitious samples for
      preview only. Connect your own MLS feed before launching publicly.
    </div>
  );
}
