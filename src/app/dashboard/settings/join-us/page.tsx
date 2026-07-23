"use client";

// src/app/dashboard/settings/join-us/page.tsx
// Agent product signup — license verification form.
// Agents are CUSTOMERS using the ChatRealty framework, not recruits: we
// collect just enough to verify their license, an admin approves manually at
// /admin/applications/agents, and their site + CRM unlock on approval.
// See docs/agent-onboarding/README.md.

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
];

export default function JoinUsPage() {
  const { status } = useSession();
  const router = useRouter();

  const [formData, setFormData] = useState({
    licenseNumber: "",
    licenseState: "",
    mlsAssociation: "",
    mlsId: "",
    brokerageName: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [hasExistingApplication, setHasExistingApplication] = useState(false);

  // Check if user already has an application on mount
  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/user/profile")
        .then((res) => res.json())
        .then((data) => {
          if (data.user?.agentApplication?.phase) {
            setHasExistingApplication(true);
          }
          if (data.user?.roles?.includes("realEstateAgent")) {
            router.push("/agent/dashboard");
          }
        })
        .catch(() => {});
    }
  }, [status, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/agent/apply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        // If they already have an application, show the success state instead of an error
        if (data.error?.includes("already have an application")) {
          setHasExistingApplication(true);
          return;
        }
        throw new Error(data.error || "Failed to submit application");
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    router.push("/auth/signin");
    return null;
  }

  if (success || hasExistingApplication) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
            <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            {success ? "Application Submitted" : "Application Under Review"}
          </h2>
          <p className="text-gray-600 mb-6">
            {success
              ? "Thanks — we have your license details. We review every application manually and will email you as soon as your account is approved."
              : "We already have your application on file and it's in the review queue. We'll email you the moment it's approved."}
          </p>
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 text-left space-y-2">
            <p className="text-sm text-blue-800 font-medium">What happens next?</p>
            <ul className="text-sm text-blue-700 space-y-1.5">
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-0.5">1.</span>
                We verify your license and MLS details
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-0.5">2.</span>
                You get an approval email with your ChatRealty subdomain
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-0.5">3.</span>
                Set up your site, branding, and CRM in minutes
              </li>
            </ul>
          </div>
          <button
            onClick={() => router.push("/dashboard")}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-blue-600 px-6 py-8">
            <h1 className="text-3xl font-bold text-white">Get your ChatRealty agent account</h1>
            <p className="mt-2 text-blue-100">
              Verify your real-estate license to launch your agent site and CRM. Takes under a minute — we review and approve manually.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-6 py-8 space-y-6">
            {error && (
              <div className="rounded-md bg-red-50 border border-red-200 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">{error}</h3>
                  </div>
                </div>
              </div>
            )}

            {/* License */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">License</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="licenseNumber" className="block text-sm font-medium text-gray-700 mb-1">
                    License Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="licenseNumber"
                    name="licenseNumber"
                    required
                    value={formData.licenseNumber}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="licenseState" className="block text-sm font-medium text-gray-700 mb-1">
                    License State <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="licenseState"
                    name="licenseState"
                    required
                    value={formData.licenseState}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select State</option>
                    {US_STATES.map(state => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* MLS */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">MLS</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="mlsAssociation" className="block text-sm font-medium text-gray-700 mb-1">
                    MLS Association <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="mlsAssociation"
                    name="mlsAssociation"
                    required
                    value={formData.mlsAssociation}
                    onChange={handleChange}
                    placeholder="e.g., California Regional MLS"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="mlsId" className="block text-sm font-medium text-gray-700 mb-1">
                    MLS Agent ID <span className="text-gray-400">(optional)</span>
                  </label>
                  <input
                    type="text"
                    id="mlsId"
                    name="mlsId"
                    value={formData.mlsId}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Brokerage */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Brokerage</h3>

              <div>
                <label htmlFor="brokerageName" className="block text-sm font-medium text-gray-700 mb-1">
                  Brokerage Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="brokerageName"
                  name="brokerageName"
                  required
                  value={formData.brokerageName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Submitting...
                  </>
                ) : (
                  "Submit for review"
                )}
              </button>
            </div>

            <p className="text-xs text-gray-500 text-center">
              By submitting, you agree to our terms and conditions.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
