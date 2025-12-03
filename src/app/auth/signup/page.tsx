// src/app/auth/signup/page.tsx
"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { ChevronDown, ChevronUp } from "lucide-react";
import { STATES } from "@/app/constants/states";
import { useTheme } from '@/app/contexts/ThemeContext';
import SpaticalBackground from '@/app/components/backgrounds/SpaticalBackground';

export default function SignUpPage() {
  const router = useRouter();
  const { currentTheme } = useTheme();
  const isLight = currentTheme === 'lightgradient';

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Marketing consent fields (optional)
  const [showMarketingConsent, setShowMarketingConsent] = useState(false);
  const [marketingData, setMarketingData] = useState({
    phone: "",
    address: "",
    city: "",
    state: "California",
    zipCode: "",
    ownsRealEstate: "",
    timeframe: "",
    realEstateGoals: "",
    smsConsent: false,
    newsletterConsent: false,
  });

  const timeframeOptions = [
    { value: 'asap', label: 'ASAP' },
    { value: '0-3', label: '0-3 months' },
    { value: '3-6', label: '3-6 months' },
    { value: '6-12', label: '6 months - 1 year' },
    { value: '1+', label: '+1 Year' },
  ];

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    // Validate password strength
    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters long");
      setIsLoading(false);
      return;
    }

    // If marketing consent section is expanded, validate phone number if SMS consent is checked
    if (showMarketingConsent && marketingData.smsConsent && !marketingData.phone) {
      setError("Phone number is required for SMS consent");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          // Include marketing consent data if the section was filled out
          ...(showMarketingConsent && {
            phone: marketingData.phone,
            address: marketingData.address,
            city: marketingData.city,
            state: marketingData.state,
            zipCode: marketingData.zipCode,
            ownsRealEstate: marketingData.ownsRealEstate,
            timeframe: marketingData.timeframe,
            realEstateGoals: marketingData.realEstateGoals,
            smsConsent: marketingData.smsConsent,
            newsletterConsent: marketingData.newsletterConsent,
          }),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to create account");
        return;
      }

      // Registration successful - redirect to verification page
      router.push(`/auth/verify-email?email=${encodeURIComponent(formData.email)}`);
    } catch (error) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SpaticalBackground showGradient={true}>
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl">
          <div className={`shadow-2xl rounded-2xl border p-8 ${
            isLight ? 'bg-white/95 backdrop-blur-sm border-gray-200' : 'bg-gray-800/95 backdrop-blur-sm border-gray-700'
          }`}>
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className={`text-3xl font-bold mb-2 ${isLight ? 'text-gray-900' : 'text-white'}`}>
                Create Account
              </h1>
              <p className={isLight ? 'text-gray-600' : 'text-gray-400'}>
                Join us today
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className={`mb-6 p-4 rounded-lg border ${
                isLight ? 'bg-red-50 border-red-200 text-red-700' : 'bg-red-500/10 border-red-500/50 text-red-400'
              }`}>
                <p className="text-sm">{error}</p>
              </div>
            )}

            {/* Sign Up Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="name" className={`block text-sm font-medium mb-2 ${
                  isLight ? 'text-gray-900' : 'text-gray-300'
                }`}>
                  Full Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className={`w-full px-4 py-3 rounded-lg border transition-all ${
                    isLight
                      ? 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                      : 'bg-gray-900 border-gray-600 text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500'
                  }`}
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label htmlFor="email" className={`block text-sm font-medium mb-2 ${
                  isLight ? 'text-gray-900' : 'text-gray-300'
                }`}>
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className={`w-full px-4 py-3 rounded-lg border transition-all ${
                    isLight
                      ? 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                      : 'bg-gray-900 border-gray-600 text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500'
                  }`}
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label htmlFor="password" className={`block text-sm font-medium mb-2 ${
                  isLight ? 'text-gray-900' : 'text-gray-300'
                }`}>
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  minLength={8}
                  className={`w-full px-4 py-3 rounded-lg border transition-all ${
                    isLight
                      ? 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                      : 'bg-gray-900 border-gray-600 text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500'
                  }`}
                  placeholder="At least 8 characters"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className={`block text-sm font-medium mb-2 ${
                  isLight ? 'text-gray-900' : 'text-gray-300'
                }`}>
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  required
                  minLength={8}
                  className={`w-full px-4 py-3 rounded-lg border transition-all ${
                    isLight
                      ? 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                      : 'bg-gray-900 border-gray-600 text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500'
                  }`}
                  placeholder="Re-enter password"
                />
              </div>

              {/* Marketing Consent Section (Optional) */}
              <div className={`border-t pt-5 ${isLight ? 'border-gray-200' : 'border-gray-700'}`}>
                <button
                  type="button"
                  onClick={() => setShowMarketingConsent(!showMarketingConsent)}
                  className={`w-full flex items-center justify-between text-left transition-colors mb-4 ${
                    isLight ? 'text-gray-700 hover:text-gray-900' : 'text-gray-300 hover:text-white'
                  }`}
                >
                  <div>
                    <h3 className={`text-lg font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>
                      Marketing Preferences (Optional)
                    </h3>
                    <p className={`text-sm ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                      Complete now or update later in your settings
                    </p>
                  </div>
                  {showMarketingConsent ? (
                    <ChevronUp className="w-5 h-5 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 flex-shrink-0" />
                  )}
                </button>

                {showMarketingConsent && (
                  <div className="space-y-4 pt-4">
                    {/* Phone Number */}
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${
                        isLight ? 'text-gray-900' : 'text-gray-300'
                      }`}>
                        Phone Number {marketingData.smsConsent && <span className="text-red-400">*</span>}
                      </label>
                      <input
                        type="tel"
                        value={marketingData.phone}
                        onChange={(e) => setMarketingData({ ...marketingData, phone: e.target.value })}
                        placeholder="(123) 456-7890"
                        className={`w-full px-4 py-3 rounded-lg border transition-all ${
                          isLight
                            ? 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                            : 'bg-gray-900 border-gray-600 text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500'
                        }`}
                      />
                    </div>

                    {/* Address */}
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${
                        isLight ? 'text-gray-900' : 'text-gray-300'
                      }`}>
                        Street Address
                      </label>
                      <input
                        type="text"
                        value={marketingData.address}
                        onChange={(e) => setMarketingData({ ...marketingData, address: e.target.value })}
                        className={`w-full px-4 py-3 rounded-lg border transition-all ${
                          isLight
                            ? 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                            : 'bg-gray-900 border-gray-600 text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500'
                        }`}
                      />
                    </div>

                    {/* City, State, ZIP */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${
                          isLight ? 'text-gray-900' : 'text-gray-300'
                        }`}>City</label>
                        <input
                          type="text"
                          value={marketingData.city}
                          onChange={(e) => setMarketingData({ ...marketingData, city: e.target.value })}
                          className={`w-full px-4 py-3 rounded-lg border transition-all ${
                            isLight
                              ? 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                              : 'bg-gray-900 border-gray-600 text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500'
                          }`}
                        />
                      </div>
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${
                          isLight ? 'text-gray-900' : 'text-gray-300'
                        }`}>State</label>
                        <select
                          value={marketingData.state}
                          onChange={(e) => setMarketingData({ ...marketingData, state: e.target.value })}
                          className={`w-full px-4 py-3 rounded-lg border transition-all ${
                            isLight
                              ? 'bg-white border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                              : 'bg-gray-900 border-gray-600 text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500'
                          }`}
                        >
                          {STATES.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${
                          isLight ? 'text-gray-900' : 'text-gray-300'
                        }`}>ZIP Code</label>
                        <input
                          type="text"
                          value={marketingData.zipCode}
                          onChange={(e) => setMarketingData({ ...marketingData, zipCode: e.target.value })}
                          className={`w-full px-4 py-3 rounded-lg border transition-all ${
                            isLight
                              ? 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                              : 'bg-gray-900 border-gray-600 text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500'
                          }`}
                        />
                      </div>
                    </div>

                    {/* Real Estate Questions */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${
                          isLight ? 'text-gray-900' : 'text-gray-300'
                        }`}>
                          Do you currently own real estate?
                        </label>
                        <select
                          value={marketingData.ownsRealEstate}
                          onChange={(e) => setMarketingData({ ...marketingData, ownsRealEstate: e.target.value })}
                          className={`w-full px-4 py-3 rounded-lg border transition-all ${
                            isLight
                              ? 'bg-white border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                              : 'bg-gray-900 border-gray-600 text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500'
                          }`}
                        >
                          <option value="">Select...</option>
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </select>
                      </div>
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${
                          isLight ? 'text-gray-900' : 'text-gray-300'
                        }`}>
                          When do you plan to buy/sell?
                        </label>
                        <select
                          value={marketingData.timeframe}
                          onChange={(e) => setMarketingData({ ...marketingData, timeframe: e.target.value })}
                          className={`w-full px-4 py-3 rounded-lg border transition-all ${
                            isLight
                              ? 'bg-white border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                              : 'bg-gray-900 border-gray-600 text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500'
                          }`}
                        >
                          <option value="">Select timeframe...</option>
                          {timeframeOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Real Estate Goals */}
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${
                        isLight ? 'text-gray-900' : 'text-gray-300'
                      }`}>
                        What are your real estate goals?
                      </label>
                      <textarea
                        value={marketingData.realEstateGoals}
                        onChange={(e) => setMarketingData({ ...marketingData, realEstateGoals: e.target.value })}
                        rows={3}
                        placeholder="Tell us about your real estate goals, preferences, or any specific needs..."
                        className={`w-full px-4 py-3 rounded-lg border transition-all resize-none ${
                          isLight
                            ? 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                            : 'bg-gray-900 border-gray-600 text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500'
                        }`}
                      />
                    </div>

                    {/* Consent Checkboxes */}
                    <div className="space-y-3">
                      {/* SMS Consent */}
                      <div className={`flex items-start gap-3 p-4 rounded-lg border-2 ${
                        isLight ? 'bg-blue-50 border-blue-200' : 'bg-blue-900/20 border-blue-700'
                      }`}>
                        <input
                          id="smsConsent"
                          type="checkbox"
                          checked={marketingData.smsConsent}
                          onChange={(e) => setMarketingData({ ...marketingData, smsConsent: e.target.checked })}
                          className="mt-1 w-5 h-5 rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="smsConsent" className={`text-sm ${
                          isLight ? 'text-gray-700' : 'text-gray-200'
                        }`}>
                          <strong className={isLight ? 'text-blue-900' : 'text-blue-300'}>SMS Text Messaging:</strong> I agree to receive <strong>both automated and person-to-person</strong> text messages from Joseph Sardella / JPS & Company LLC. I understand that I can opt out at any time by replying STOP. Message and data rates may apply.
                        </label>
                      </div>

                      {/* Newsletter Consent */}
                      <div className={`flex items-start gap-3 p-4 rounded-lg border-2 ${
                        isLight ? 'bg-emerald-50 border-emerald-200' : 'bg-emerald-900/20 border-emerald-700'
                      }`}>
                        <input
                          id="newsletterConsent"
                          type="checkbox"
                          checked={marketingData.newsletterConsent}
                          onChange={(e) => setMarketingData({ ...marketingData, newsletterConsent: e.target.checked })}
                          className="mt-1 w-5 h-5 rounded border-gray-600 text-emerald-600 focus:ring-emerald-500"
                        />
                        <label htmlFor="newsletterConsent" className={`text-sm ${
                          isLight ? 'text-gray-700' : 'text-gray-200'
                        }`}>
                          <strong className={isLight ? 'text-emerald-900' : 'text-emerald-300'}>Email Newsletter:</strong> I agree to receive email newsletters from Joseph Sardella / JPS & Company LLC. I can unsubscribe at any time using the link in the emails.
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <p className={`text-xs text-center ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                By creating an account, you agree to our{' '}
                <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className={
                  isLight ? 'text-blue-600 hover:text-blue-700 underline' : 'text-blue-400 hover:text-blue-300 underline'
                }>
                  Privacy Policy
                </a>.
              </p>

              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-3 px-4 font-semibold rounded-lg shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                  isLight
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                {isLoading ? "Creating account..." : "Create Account"}
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className={`w-full border-t ${isLight ? 'border-gray-200' : 'border-gray-700'}`}></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className={`px-2 ${
                  isLight ? 'bg-white/95 text-gray-500' : 'bg-gray-800/95 text-gray-400'
                }`}>
                  Or continue with
                </span>
              </div>
            </div>

            {/* Social Login Buttons */}
            <div className="space-y-3">
              {/* Google Sign Up */}
              <button
                type="button"
                onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
                className="w-full py-3 px-4 bg-white hover:bg-gray-100 text-gray-900 font-semibold rounded-lg shadow-lg transition-all duration-200 flex items-center justify-center gap-3 border border-gray-300"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Sign up with Google
              </button>
            </div>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className={`w-full border-t ${isLight ? 'border-gray-200' : 'border-gray-700'}`}></div>
              </div>
            </div>

            {/* Sign In Link */}
            <div className="text-center">
              <p className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                Already have an account?{" "}
                <Link
                  href="/auth/signin"
                  className={`font-medium transition-colors ${
                    isLight ? 'text-blue-600 hover:text-blue-700' : 'text-emerald-400 hover:text-emerald-300'
                  }`}
                >
                  Sign in
                </Link>
              </p>
            </div>
          </div>

          {/* Back to Home */}
          <div className="text-center mt-6">
            <Link
              href="/"
              className={`text-sm transition-colors ${
                isLight ? 'text-gray-600 hover:text-gray-900' : 'text-gray-400 hover:text-white'
              }`}
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </SpaticalBackground>
  );
}
