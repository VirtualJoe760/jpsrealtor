"use client";

// src/app/dashboard/settings/join-us/page.tsx
// Agent application form (Phase 1) - accessible to all users

import { useState } from "react";
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
  const { data: session, status } = useSession();
  const router = useRouter();

  const [formData, setFormData] = useState({
    licenseNumber: "",
    licenseState: "",
    mlsId: "",
    mlsAssociation: "",
    brokerageName: "",
    brokerageAddress: "",
    yearsExperience: "",
    whyJoin: "",
    references: "",
  });

  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [coverLetterFile, setCoverLetterFile] = useState<File | null>(null);
  const [resumeUrl, setResumeUrl] = useState<string>("");
  const [coverLetterUrl, setCoverLetterUrl] = useState<string>("");

  const [uploadingResume, setUploadingResume] = useState(false);
  const [uploadingCoverLetter, setUploadingCoverLetter] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileUpload = async (file: File, type: "resume" | "coverLetter") => {
    try {
      if (type === "resume") {
        setUploadingResume(true);
      } else {
        setUploadingCoverLetter(true);
      }

      const uploadFormData = new FormData();
      uploadFormData.append("file", file);

      const response = await fetch("/api/upload/document", {
        method: "POST",
        body: uploadFormData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to upload file");
      }

      if (type === "resume") {
        setResumeUrl(data.url);
      } else {
        setCoverLetterUrl(data.url);
      }

      return data.url;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      if (type === "resume") {
        setUploadingResume(false);
      } else {
        setUploadingCoverLetter(false);
      }
    }
  };

  const handleResumeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setResumeFile(file);
      await handleFileUpload(file, "resume");
    }
  };

  const handleCoverLetterChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverLetterFile(file);
      await handleFileUpload(file, "coverLetter");
    }
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
        body: JSON.stringify({
          ...formData,
          yearsExperience: parseInt(formData.yearsExperience),
          resumeUrl: resumeUrl || undefined,
          coverLetterUrl: coverLetterUrl || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit application");
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/dashboard");
      }, 3000);
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

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
            <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Application Submitted!</h2>
          <p className="text-gray-600 mb-4">
            Thank you for applying to join the ChatRealty team. We'll review your application and notify you of our decision within 2-3 business days.
          </p>
          <p className="text-sm text-gray-500">Redirecting to dashboard...</p>
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
            <h1 className="text-3xl font-bold text-white">Join Our Team</h1>
            <p className="mt-2 text-blue-100">
              Apply to become a ChatRealty agent. Complete the form below to get started.
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

            {/* License Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">License Information</h3>

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

            {/* MLS Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">MLS Information</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="mlsId" className="block text-sm font-medium text-gray-700 mb-1">
                    MLS ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="mlsId"
                    name="mlsId"
                    required
                    value={formData.mlsId}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

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
              </div>
            </div>

            {/* Brokerage Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Brokerage Information</h3>

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

              <div>
                <label htmlFor="brokerageAddress" className="block text-sm font-medium text-gray-700 mb-1">
                  Brokerage Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="brokerageAddress"
                  name="brokerageAddress"
                  required
                  value={formData.brokerageAddress}
                  onChange={handleChange}
                  placeholder="Street, City, State, ZIP"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="yearsExperience" className="block text-sm font-medium text-gray-700 mb-1">
                  Years of Experience <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="yearsExperience"
                  name="yearsExperience"
                  required
                  min="0"
                  max="50"
                  value={formData.yearsExperience}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Documents Upload */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Documents (Optional)</h3>

              <div>
                <label htmlFor="resume" className="block text-sm font-medium text-gray-700 mb-1">
                  Resume (PDF, DOC, DOCX, or TXT - Max 5MB)
                </label>
                <input
                  type="file"
                  id="resume"
                  name="resume"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={handleResumeChange}
                  disabled={uploadingResume}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                {uploadingResume && (
                  <p className="mt-1 text-sm text-blue-600">Uploading resume...</p>
                )}
                {resumeUrl && (
                  <p className="mt-1 text-sm text-green-600">Resume uploaded successfully</p>
                )}
              </div>

              <div>
                <label htmlFor="coverLetter" className="block text-sm font-medium text-gray-700 mb-1">
                  Cover Letter (PDF, DOC, DOCX, or TXT - Max 5MB)
                </label>
                <input
                  type="file"
                  id="coverLetter"
                  name="coverLetter"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={handleCoverLetterChange}
                  disabled={uploadingCoverLetter}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                {uploadingCoverLetter && (
                  <p className="mt-1 text-sm text-blue-600">Uploading cover letter...</p>
                )}
                {coverLetterUrl && (
                  <p className="mt-1 text-sm text-green-600">Cover letter uploaded successfully</p>
                )}
              </div>
            </div>

            {/* Motivation */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Tell Us About Yourself</h3>

              <div>
                <label htmlFor="whyJoin" className="block text-sm font-medium text-gray-700 mb-1">
                  Why do you want to join ChatRealty? <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="whyJoin"
                  name="whyJoin"
                  required
                  rows={4}
                  value={formData.whyJoin}
                  onChange={handleChange}
                  placeholder="Tell us about your goals and why you're interested in joining our team..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="references" className="block text-sm font-medium text-gray-700 mb-1">
                  Professional References (Optional)
                </label>
                <textarea
                  id="references"
                  name="references"
                  rows={3}
                  value={formData.references}
                  onChange={handleChange}
                  placeholder="Names and contact information of professional references..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={loading || uploadingResume || uploadingCoverLetter}
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
                  "Submit Application"
                )}
              </button>
            </div>

            <p className="text-xs text-gray-500 text-center">
              By submitting this application, you agree to our terms and conditions.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
