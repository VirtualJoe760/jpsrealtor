"use client";

import Link from "next/link";
import { useThemeClasses } from "@/app/contexts/ThemeContext";

interface SubdivisionBuyPageClientProps {
  subdivisionName: string;
  cityName: string;
  cityId: string;
  slug: string;
  region: string;
}

export default function SubdivisionBuyPageClient({
  subdivisionName,
  cityName,
  cityId,
  slug,
  region,
}: SubdivisionBuyPageClientProps) {
  const {
    cardBg,
    cardBorder,
    textPrimary,
    textSecondary,
    buttonPrimary,
    buttonSecondary,
    shadow,
  } = useThemeClasses();

  return (
    <div className="min-h-screen py-12 px-4" data-page="subdivision-buy">
      <div className="max-w-5xl mx-auto">
        {/* Hero Section */}
        <div className={`${cardBg} ${cardBorder} border rounded-3xl p-8 md:p-16 ${shadow} mb-12 text-center`}>
          <h1 className={`text-5xl md:text-6xl font-bold ${textPrimary} mb-6 drop-shadow-2xl`}>
            Buy Your Dream Home in {subdivisionName}
          </h1>
          <p className={`text-xl md:text-2xl ${textSecondary} mb-8 leading-relaxed`}>
            {cityName}, {region} • Your Trusted Real Estate Expert
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href={`/neighborhoods/${cityId}/${slug}`}
              className={`px-8 py-4 ${buttonPrimary} font-semibold rounded-xl transition-all duration-200 ${shadow} hover:shadow-2xl text-lg`}
            >
              View {subdivisionName} Listings
            </Link>
            <a
              href="/#contact"
              className="px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-2xl text-lg"
            >
              Contact Joey Today
            </a>
          </div>
        </div>

        {/* Introduction */}
        <section className="mb-12">
          <div className={`${cardBg} ${cardBorder} border rounded-2xl p-8 md:p-12 ${shadow}`}>
            <h2 className={`text-4xl font-bold ${textPrimary} mb-6`}>
              Why Choose {subdivisionName}?
            </h2>
            <p className={`text-lg ${textSecondary} leading-relaxed mb-6`}>
              {subdivisionName} is one of the most sought-after communities in {cityName}, {region}. This exclusive neighborhood offers the perfect blend of luxury, convenience, and community living. Whether you're a first-time homebuyer or looking to upgrade, {subdivisionName} provides an exceptional lifestyle in a prime location.
            </p>
            <p className={`text-lg ${textSecondary} leading-relaxed`}>
              As your dedicated real estate professional, I'm <strong>Joey Sardella</strong>, and I specialize in helping buyers find their perfect home in {subdivisionName}. With deep knowledge of this community and the local market, I'll guide you through every step of the home-buying process.
            </p>
          </div>
        </section>

        {/* Community Benefits */}
        <section className="mb-12">
          <h2 className={`text-4xl font-bold ${textPrimary} mb-8 text-center`}>
            {subdivisionName} Lifestyle Benefits
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className={`${cardBg} ${cardBorder} border rounded-xl p-6 ${shadow}`}>
              <div className="text-4xl mb-4">🏘️</div>
              <h3 className={`text-2xl font-bold ${textPrimary} mb-3`}>Exclusive Community</h3>
              <p className={`${textSecondary} leading-relaxed`}>
                Living in {subdivisionName} means being part of an exclusive community with well-maintained properties, engaged neighbors, and a strong sense of belonging.
              </p>
            </div>

            <div className={`${cardBg} ${cardBorder} border rounded-xl p-6 ${shadow}`}>
              <div className="text-4xl mb-4">🎯</div>
              <h3 className={`text-2xl font-bold ${textPrimary} mb-3`}>Prime Location</h3>
              <p className={`${textSecondary} leading-relaxed`}>
                Conveniently located in {cityName}, you'll have easy access to shopping, dining, entertainment, top-rated schools, and major employment centers.
              </p>
            </div>

            <div className={`${cardBg} ${cardBorder} border rounded-xl p-6 ${shadow}`}>
              <div className="text-4xl mb-4">✨</div>
              <h3 className={`text-2xl font-bold ${textPrimary} mb-3`}>Quality Construction</h3>
              <p className={`${textSecondary} leading-relaxed`}>
                Homes in {subdivisionName} are built to high standards with quality materials and modern design, ensuring long-term value and enjoyment.
              </p>
            </div>

            <div className={`${cardBg} ${cardBorder} border rounded-xl p-6 ${shadow}`}>
              <div className="text-4xl mb-4">📈</div>
              <h3 className={`text-2xl font-bold ${textPrimary} mb-3`}>Strong Investment</h3>
              <p className={`${textSecondary} leading-relaxed`}>
                Properties in {subdivisionName} have shown consistent appreciation, making it not just a great place to live, but also a smart investment.
              </p>
            </div>
          </div>
        </section>

        {/* Why Work With Me */}
        <section className="mb-12">
          <div className={`${cardBg} ${cardBorder} border rounded-2xl p-8 md:p-12 ${shadow}`}>
            <h2 className={`text-4xl font-bold ${textPrimary} mb-6 text-center`}>
              Your {subdivisionName} Buying Expert
            </h2>
            <p className={`text-lg ${textSecondary} leading-relaxed mb-6`}>
              As a real estate professional specializing in {cityName} and its premier communities, I have extensive knowledge of {subdivisionName}'s market dynamics, property values, and available homes.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
              <div className="text-center">
                <div className="text-4xl mb-3">🏡</div>
                <h3 className={`text-xl font-bold ${textPrimary} mb-2`}>Community Expert</h3>
                <p className={`${textSecondary} text-sm`}>
                  Deep knowledge of {subdivisionName}'s amenities, HOA, and lifestyle
                </p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-3">💰</div>
                <h3 className={`text-xl font-bold ${textPrimary} mb-2`}>Market Insights</h3>
                <p className={`${textSecondary} text-sm`}>
                  Up-to-date pricing data and market trends specific to this community
                </p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-3">🤝</div>
                <h3 className={`text-xl font-bold ${textPrimary} mb-2`}>Dedicated Service</h3>
                <p className={`${textSecondary} text-sm`}>
                  Personalized attention from initial search to closing and beyond
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* The Process */}
        <section className="mb-12">
          <div className={`${cardBg} ${cardBorder} border rounded-2xl p-8 md:p-12 ${shadow}`}>
            <h2 className={`text-4xl font-bold ${textPrimary} mb-8 text-center`}>
              Your Home-Buying Journey
            </h2>
            <div className="space-y-6">
              {[
                {
                  num: 1,
                  title: "Initial Consultation",
                  desc: `We'll discuss your needs, budget, and what you're looking for in a ${subdivisionName} home. I'll help you understand the current market and get pre-approved.`
                },
                {
                  num: 2,
                  title: "Find Your Perfect Home",
                  desc: `I'll curate a personalized list of available homes in ${subdivisionName} and arrange private showings. You'll get instant alerts when new properties become available.`
                },
                {
                  num: 3,
                  title: "Make a Competitive Offer",
                  desc: "I'll provide market analysis to help you craft a strong offer that gets accepted, while protecting your interests and negotiating favorable terms."
                },
                {
                  num: 4,
                  title: "Inspections & Due Diligence",
                  desc: "I'll coordinate home inspections, review HOA documents, and ensure you have all the information needed to make an informed decision."
                },
                {
                  num: 5,
                  title: "Close with Confidence",
                  desc: `I'll manage all closing details and be there when you receive the keys to your new ${subdivisionName} home.`
                }
              ].map((step) => (
                <div key={step.num} className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center text-black font-bold text-xl">
                    {step.num}
                  </div>
                  <div>
                    <h3 className={`text-2xl font-bold ${textPrimary} mb-2`}>{step.title}</h3>
                    <p className={`${textSecondary} leading-relaxed`}>{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="mb-12">
          <div className={`${cardBg} ${cardBorder} border-2 rounded-2xl p-8 md:p-12 ${shadow} text-center`}>
            <h2 className={`text-4xl md:text-5xl font-bold ${textPrimary} mb-6`}>
              Ready to Call {subdivisionName} Home?
            </h2>
            <p className={`text-xl ${textSecondary} mb-8 leading-relaxed max-w-3xl mx-auto`}>
              Let's find your perfect home in this exceptional community. Contact me today for a free consultation and personalized home search.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <a
                href="/#contact"
                className="px-10 py-5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl transition-all duration-200 shadow-lg hover:shadow-2xl text-lg"
              >
                Schedule Your Free Consultation
              </a>
              <Link
                href={`/neighborhoods/${cityId}/${slug}`}
                className={`px-10 py-5 ${buttonSecondary} font-bold rounded-xl transition-all duration-200 ${shadow} hover:shadow-2xl text-lg`}
              >
                View {subdivisionName} Listings
              </Link>
            </div>
          </div>
        </section>

        {/* Additional Links */}
        <section className="text-center">
          <div className="inline-flex flex-wrap gap-4 justify-center">
            <Link
              href={`/neighborhoods/${cityId}/${slug}/sell`}
              className={`${textSecondary} hover:${textPrimary} underline text-lg`}
            >
              Selling a Home in {subdivisionName}?
            </Link>
            <Link
              href={`/neighborhoods/${cityId}`}
              className={`${textSecondary} hover:${textPrimary} underline text-lg`}
            >
              Explore Other {cityName} Communities
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
