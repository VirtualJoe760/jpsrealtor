"use client";

import Link from "next/link";
import { useThemeClasses } from "@/app/contexts/ThemeContext";

interface BuyPageClientProps {
  cityName: string;
  cityId: string;
  countyName: string;
  population?: number;
}

export default function BuyPageClient({
  cityName,
  cityId,
  countyName,
  population,
}: BuyPageClientProps) {
  const {
    cardBg,
    cardBorder,
    textPrimary,
    textSecondary,
    textMuted,
    buttonPrimary,
    buttonSecondary,
    shadow,
  } = useThemeClasses();

  return (
    <div className="min-h-screen py-12 px-4" data-page="neighborhoods-buy">
      <div className="max-w-5xl mx-auto">
        {/* Hero Section */}
        <div className={`${cardBg} ${cardBorder} border rounded-3xl p-8 md:p-16 ${shadow} mb-12 text-center`}>
          <h1 className={`text-5xl md:text-6xl font-bold ${textPrimary} mb-6 drop-shadow-2xl`}>
            Buy Your Dream Home in {cityName}
          </h1>
          <p className={`text-xl md:text-2xl ${textSecondary} mb-8 leading-relaxed`}>
            Your Trusted Real Estate Expert in {countyName}
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href={`/neighborhoods/${cityId}`}
              className={`px-8 py-4 ${buttonPrimary} font-semibold rounded-xl transition-all duration-200 ${shadow} hover:shadow-2xl text-lg`}
            >
              View {cityName} Listings
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
              Why Choose Joey Sardella to Buy Your {cityName} Home?
            </h2>
            <p className={`text-lg ${textSecondary} leading-relaxed mb-6`}>
              Buying a home in {cityName} is one of the most important decisions you'll make, and having the right real estate agent by your side makes all the difference. I'm <strong>Joey Sardella</strong>, a dedicated real estate professional serving {countyName} and the surrounding areas. With years of local market expertise and a commitment to personalized service, I'll guide you through every step of the home-buying journey.
            </p>
            <p className={`text-lg ${textSecondary} leading-relaxed`}>
              Whether you're a first-time homebuyer, relocating to {cityName}, or looking for an investment property, I have the knowledge, resources, and negotiation skills to help you find the perfect home at the right price.
            </p>
          </div>
        </section>

        {/* What Sets Me Apart */}
        <section className="mb-12">
          <h2 className={`text-4xl font-bold ${textPrimary} mb-8 text-center`}>
            What Sets Me Apart
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className={`${cardBg} ${cardBorder} border rounded-xl p-6 ${shadow}`}>
              <div className="text-4xl mb-4">🏡</div>
              <h3 className={`text-2xl font-bold ${textPrimary} mb-3`}>Local Market Expert</h3>
              <p className={`${textSecondary} leading-relaxed`}>
                I live and breathe {countyName} real estate. I know {cityName}'s neighborhoods, market trends, schools, and amenities inside and out. This insider knowledge helps you make informed decisions and find hidden gems.
              </p>
            </div>

            <div className={`${cardBg} ${cardBorder} border rounded-xl p-6 ${shadow}`}>
              <div className="text-4xl mb-4">💰</div>
              <h3 className={`text-2xl font-bold ${textPrimary} mb-3`}>Expert Negotiator</h3>
              <p className={`${textSecondary} leading-relaxed`}>
                Your money matters. I use proven negotiation strategies to ensure you get the best possible deal. From initial offer to closing, I'll fight for your interests and protect your investment.
              </p>
            </div>

            <div className={`${cardBg} ${cardBorder} border rounded-xl p-6 ${shadow}`}>
              <div className="text-4xl mb-4">📋</div>
              <h3 className={`text-2xl font-bold ${textPrimary} mb-3`}>White-Glove Service</h3>
              <p className={`${textSecondary} leading-relaxed`}>
                From your first property tour to closing day and beyond, I provide attentive, personalized service. I'm always available to answer questions, schedule showings, and keep you informed throughout the process.
              </p>
            </div>

            <div className={`${cardBg} ${cardBorder} border rounded-xl p-6 ${shadow}`}>
              <div className="text-4xl mb-4">🔍</div>
              <h3 className={`text-2xl font-bold ${textPrimary} mb-3`}>Access to Exclusive Listings</h3>
              <p className={`${textSecondary} leading-relaxed`}>
                As a well-connected agent in {countyName}, I have access to exclusive listings and off-market properties that aren't available to the general public. Get first dibs on the best homes in {cityName}.
              </p>
            </div>
          </div>
        </section>

        {/* The Process */}
        <section className="mb-12">
          <div className={`${cardBg} ${cardBorder} border rounded-2xl p-8 md:p-12 ${shadow}`}>
            <h2 className={`text-4xl font-bold ${textPrimary} mb-8 text-center`}>
              Your Home-Buying Journey with Joey
            </h2>
            <div className="space-y-6">
              {[
                {
                  num: 1,
                  title: "Initial Consultation",
                  desc: `We'll discuss your needs, budget, must-haves, and nice-to-haves. I'll help you get pre-approved for a mortgage and understand what you can afford in ${cityName}.`
                },
                {
                  num: 2,
                  title: "Property Search",
                  desc: `I'll curate a personalized list of homes that match your criteria and arrange tours. You'll get instant alerts when new properties hit the market in ${cityName}.`
                },
                {
                  num: 3,
                  title: "Market Analysis & Offer",
                  desc: "I'll provide a detailed comparative market analysis (CMA) to determine fair market value. Together, we'll craft a competitive offer that stands out to sellers."
                },
                {
                  num: 4,
                  title: "Negotiation & Inspections",
                  desc: "I'll negotiate on your behalf and coordinate home inspections, appraisals, and any necessary repairs or credits."
                },
                {
                  num: 5,
                  title: "Closing & Beyond",
                  desc: `I'll guide you through the closing process, ensure all paperwork is in order, and be there to hand you the keys to your new ${cityName} home. Even after closing, I'm here to help with any questions or referrals you need.`
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

        {/* About the Area */}
        <section className="mb-12">
          <div className={`${cardBg} ${cardBorder} border rounded-2xl p-8 md:p-12 ${shadow}`}>
            <h2 className={`text-4xl font-bold ${textPrimary} mb-6`}>
              Why Live in {cityName}?
            </h2>
            <p className={`text-lg ${textSecondary} leading-relaxed mb-6`}>
              {cityName} offers an exceptional quality of life in the heart of {countyName}.
              {population && (
                <> With a population of {population.toLocaleString()}, it's a vibrant community that offers the perfect balance of amenities and charm.</>
              )}
            </p>
            <p className={`text-lg ${textSecondary} leading-relaxed mb-6`}>
              From excellent schools and parks to shopping, dining, and entertainment options, {cityName} has everything you need. Whether you're looking for a family-friendly neighborhood, a luxury estate, or an investment property, I can help you find the perfect home in this wonderful community.
            </p>
            <div className="text-center mt-8">
              <Link
                href={`/neighborhoods/${cityId}`}
                className={`px-8 py-4 ${buttonPrimary} font-semibold rounded-xl transition-all duration-200 ${shadow} hover:shadow-2xl inline-block text-lg`}
              >
                Explore Homes for Sale in {cityName}
              </Link>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="mb-12">
          <div className={`${cardBg} ${cardBorder} border-2 rounded-2xl p-8 md:p-12 ${shadow} text-center`}>
            <h2 className={`text-4xl md:text-5xl font-bold ${textPrimary} mb-6`}>
              Ready to Buy Your Dream Home in {cityName}?
            </h2>
            <p className={`text-xl ${textSecondary} mb-8 leading-relaxed max-w-3xl mx-auto`}>
              Don't navigate the {cityName} real estate market alone. Let me put my expertise, local knowledge, and dedication to work for you. Contact me today for a free consultation and let's find your perfect home.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <a
                href="/#contact"
                className="px-10 py-5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl transition-all duration-200 shadow-lg hover:shadow-2xl text-lg"
              >
                Schedule Your Free Consultation
              </a>
              <Link
                href={`/neighborhoods/${cityId}`}
                className={`px-10 py-5 ${buttonSecondary} font-bold rounded-xl transition-all duration-200 ${shadow} hover:shadow-2xl text-lg`}
              >
                Browse {cityName} Listings
              </Link>
            </div>
          </div>
        </section>

        {/* Additional Links */}
        <section className="text-center">
          <div className="inline-flex flex-wrap gap-4 justify-center">
            <Link
              href={`/neighborhoods/${cityId}/sell`}
              className={`${textSecondary} hover:${textPrimary} underline text-lg`}
            >
              Selling a Home in {cityName}?
            </Link>
            <Link
              href="/neighborhoods"
              className={`${textSecondary} hover:${textPrimary} underline text-lg`}
            >
              Explore Other Areas
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
