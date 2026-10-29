"use client";

// src/app/dashboard/settings/join-us/page.tsx
// Become a ChatRealty agent (2026-10-28 flow):
//   1. this form — license, MLS association (+ the association's contact
//      details, so we can ask them about IDX data access), brokerage
//   2. pay for Basic via Stripe Checkout (promo codes accepted there)
//   3. the webhook makes them an agent → this page polls, then sends them to
//      the setup wizard. ID verification + admin review happen after that;
//      their public site stays offline until the admin confirms them.
// See docs/agent-onboarding/README.md and src/lib/agent-onboarding.ts.

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { TIER_DETAILS } from "@/config/stripe-prices";

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
];

const PRICE = TIER_DETAILS.beginner.monthlyPrice;

const input =
  "w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500";
const label = "block text-sm font-medium text-gray-700 mb-1";

type Stage = "loading" | "form" | "activating" | "rejected";

function JoinUsPage() {
  const { status, update } = useSession();
  const router = useRouter();
  const params = useSearchParams();
  const returnedFromPayment = params.get("paid") === "1";

  const [formData, setFormData] = useState({
    licenseNumber: "",
    licenseState: "",
    mlsAssociation: "",
    mlsId: "",
    mlsContactName: "",
    mlsContactPhone: "",
    mlsContactEmail: "",
    mlsWebsite: "",
    brokerageName: "",
  });
  const [stage, setStage] = useState<Stage>("loading");
  const [resuming, setResuming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadProfile = useCallback(async () => {
    // { isAgent, phase, application, mls } — see /api/agent/application-status
    return fetch("/api/agent/application-status").then((r) => (r.ok ? r.json() : null)).catch(() => null);
  }, []);

  useEffect(() => {
    if (status !== "authenticated") return;
    (async () => {
      const user = await loadProfile();
      if (user?.isAgent) {
        await update();
        router.push("/agent/dashboard");
        return;
      }
      const app = user?.application || {};
      const mls = user?.mls || {};
      if (user?.phase === "final_rejected") return setStage("rejected");
      if (returnedFromPayment) return setStage("activating");
      if (user?.phase === "awaiting_payment") {
        setResuming(true);
        setFormData((f) => ({
          ...f,
          licenseNumber: app.licenseNumber || "",
          licenseState: app.licenseState || "",
          mlsAssociation: mls.associationName || "",
          mlsId: mls.mlsId || "",
          mlsContactName: mls.contactName || "",
          mlsContactPhone: mls.contactPhone || "",
          mlsContactEmail: mls.contactEmail || "",
          mlsWebsite: mls.website || "",
          brokerageName: app.brokerageName || "",
        }));
      }
      setStage("form");
    })();
  }, [status, loadProfile, returnedFromPayment, router, update]);

  // Back from Stripe: the webhook grants the agent role a moment later.
  useEffect(() => {
    if (stage !== "activating") return;
    let tries = 0;
    const timer = setInterval(async () => {
      tries++;
      const user = await loadProfile();
      if (user?.isAgent) {
        clearInterval(timer);
        await update(); // refresh the JWT so the portal opens without re-login
        router.push("/agent/settings?onboarding=true");
      } else if (tries > 40) {
        clearInterval(timer);
        setError("Your payment went through, but setting up your account is taking longer than usual. Refresh in a minute — or reply to your receipt email and we'll sort it out.");
      }
    }, 3000);
    return () => clearInterval(timer);
  }, [stage, loadProfile, router, update]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const applyRes = await fetch("/api/agent/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const applyData = await applyRes.json();
      if (!applyRes.ok) throw new Error(applyData.error || "Failed to submit application");

      const origin = window.location.origin;
      const payRes = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier: "beginner",
          billingInterval: "monthly",
          successUrl: `${origin}/dashboard/settings/join-us?paid=1`,
          cancelUrl: `${origin}/dashboard/settings/join-us`,
        }),
      });
      const payData = await payRes.json();
      if (!payRes.ok || !payData.url) throw new Error(payData.error || "Couldn't start checkout");
      window.location.href = payData.url;
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  if (status === "loading" || stage === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }
  if (status === "unauthenticated") {
    router.push("/auth/signin");
    return null;
  }

  if (stage === "activating" || stage === "rejected") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          {stage === "activating" ? (
            <>
              {!error && <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-6" />}
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Payment received</h2>
              <p className="text-gray-600">{error || "Setting up your agent account…"}</p>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">About your application</h2>
              <p className="text-gray-600 mb-6">
                We weren&apos;t able to approve your agent account. Check your email for details — reply to it if
                anything looks wrong and we&apos;ll take another look.
              </p>
              <button onClick={() => router.push("/dashboard")} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium">
                Back to Dashboard
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="bg-blue-600 px-6 py-8">
            <h1 className="text-3xl font-bold text-white">Get your ChatRealty agent account</h1>
            <p className="mt-2 text-blue-100">
              Your own agent website, CRM and AI tools — ${PRICE}/month on the Basic plan. Tell us about your license,
              then check out.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="px-6 py-8 space-y-6">
            {resuming && (
              <div className="rounded-md bg-blue-50 border border-blue-200 p-4 text-sm text-blue-800">
                We have your application. Check your details below, then continue to payment to activate your account.
              </div>
            )}
            {error && (
              <div className="rounded-md bg-red-50 border border-red-200 p-4 text-sm font-medium text-red-800">{error}</div>
            )}

            {/* License */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">License</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="licenseNumber" className={label}>License Number <span className="text-red-500">*</span></label>
                  <input type="text" id="licenseNumber" name="licenseNumber" required value={formData.licenseNumber} onChange={handleChange} className={input} />
                </div>
                <div>
                  <label htmlFor="licenseState" className={label}>License State <span className="text-red-500">*</span></label>
                  <select id="licenseState" name="licenseState" required value={formData.licenseState} onChange={handleChange} className={input}>
                    <option value="">Select State</option>
                    {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* MLS association */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">MLS association</h3>
              <p className="text-sm text-gray-600">
                We&apos;re working with each MLS association to bring their listings onto ChatRealty. Tell us yours and
                how to reach them, and we&apos;ll handle the data-access conversation.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label htmlFor="mlsAssociation" className={label}>Association name <span className="text-red-500">*</span></label>
                  <input type="text" id="mlsAssociation" name="mlsAssociation" required value={formData.mlsAssociation} onChange={handleChange} placeholder="e.g., California Desert Association of REALTORS®" className={input} />
                </div>
                <div>
                  <label htmlFor="mlsId" className={label}>Your MLS ID number <span className="text-red-500">*</span></label>
                  <input type="text" id="mlsId" name="mlsId" required value={formData.mlsId} onChange={handleChange} className={input} />
                </div>
                <div>
                  <label htmlFor="mlsContactName" className={label}>Association contact person <span className="text-gray-400">(optional)</span></label>
                  <input type="text" id="mlsContactName" name="mlsContactName" value={formData.mlsContactName} onChange={handleChange} className={input} />
                </div>
                <div>
                  <label htmlFor="mlsContactPhone" className={label}>Association phone</label>
                  <input type="tel" id="mlsContactPhone" name="mlsContactPhone" value={formData.mlsContactPhone} onChange={handleChange} className={input} />
                </div>
                <div>
                  <label htmlFor="mlsContactEmail" className={label}>Association email</label>
                  <input type="email" id="mlsContactEmail" name="mlsContactEmail" value={formData.mlsContactEmail} onChange={handleChange} className={input} />
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="mlsWebsite" className={label}>Association website <span className="text-gray-400">(optional)</span></label>
                  <input type="text" id="mlsWebsite" name="mlsWebsite" value={formData.mlsWebsite} onChange={handleChange} className={input} />
                </div>
              </div>
              <p className="text-xs text-gray-500">The association&apos;s phone or email is required.</p>
            </div>

            {/* Brokerage */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Brokerage</h3>
              <div>
                <label htmlFor="brokerageName" className={label}>Brokerage Name <span className="text-red-500">*</span></label>
                <input type="text" id="brokerageName" name="brokerageName" required value={formData.brokerageName} onChange={handleChange} className={input} />
              </div>
            </div>

            <div className="rounded-md bg-gray-50 border border-gray-200 p-4 text-sm text-gray-700 space-y-1">
              <p className="font-medium text-gray-900">What happens next</p>
              <p>1. Pay for Basic (${PRICE}/month — have a promo code? enter it on the payment page).</p>
              <p>2. Your agent account opens right away. Verify your ID and set up your profile.</p>
              <p>3. We confirm your license and MLS details, then your public site goes live.</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Opening secure checkout…" : `Continue to payment — $${PRICE}/month`}
            </button>
            <p className="text-xs text-gray-500 text-center">
              Cancel anytime from Billing. By continuing, you agree to our terms and conditions.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

// useSearchParams (?paid=1 after checkout) needs a Suspense boundary.
export default function JoinUsRoute() {
  return (
    <Suspense>
      <JoinUsPage />
    </Suspense>
  );
}
