"use client";

import Link from "next/link";
import { useThemeClasses } from "@/app/contexts/ThemeContext";

interface SubdivisionSellPageClientProps {
  subdivisionName: string;
  cityName: string;
  cityId: string;
  slug: string;
  region: string;
}

export default function SubdivisionSellPageClient({
  subdivisionName,
  cityName,
  cityId,
  slug,
  region,
}: SubdivisionSellPageClientProps) {
  const {
    cardBg,
    cardBorder,
    textPrimary,
    textSecondary,
    buttonPrimary,
    buttonSecondary,
    shadow,
  } = useThemeClasses();

  const advantages = [
    {
      emoji: "🎯",
      title: "Community-Specific Marketing",
      desc: `I create targeted marketing campaigns that highlight what makes ${subdivisionName} special, attracting buyers specifically looking for this exclusive community.`
    },
    {
      emoji: "📊",
      title: "Accurate Pricing Strategy",
      desc: `Using recent sales data from ${subdivisionName} and comparable communities, I'll price your home competitively to attract serious buyers while maximizing your return.`
    },
    {
      emoji: "🏆",
      title: "Professional Presentation",
      desc: "Professional photography, virtual tours, and strategic staging advice ensure your home stands out from other listings in the community."
    },
    {
      emoji: "🌐",
      title: "Maximum Exposure",
      desc: `Your home will be featured on all major real estate platforms, social media, and through my network of agents and buyers looking specifically in ${cityName}.`
    },
    {
      emoji: "🤝",
      title: "Expert Negotiation",
      desc: "I negotiate aggressively to get you the highest price and best terms, handling all offers, counteroffers, and contingencies with skill."
    },
    {
      emoji: "✅",
      title: "Smooth Transaction",
      desc: "From listing to closing, I manage every detail - showings, inspections, appraisals, and paperwork - for a stress-free selling experience."
    }
  ];

  return (
    <div className="min-h-screen py-12 px-4" data-page="subdivision-sell">
      <div className="max-w-5xl mx-auto">
        {/* Hero Section */}
        <div className={`${cardBg} ${cardBorder} border rounded-3xl p-8 md:p-16 ${shadow} mb-12 text-center`}>
          <h1 className={`text-5xl md:text-6xl font-bold ${textPrimary} mb-6 drop-shadow-2xl`}>
            Sell Your {subdivisionName} Home for Top Dollar
          </h1>
          <p className={`text-xl md:text-2xl ${textSecondary} mb-8 leading-relaxed`}>
            {cityName}, {region} • Expert Marketing • Maximum Results
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <a
              href="/#contact"
              className="px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-2xl text-lg"
            >
              Get Your Free Home Valuation
            </a>
            <Link
              href={`/neighborhoods/${cityId}/${slug}`}
              className={`px-8 py-4 ${buttonSecondary} font-semibold rounded-xl transition-all duration-200 ${shadow} hover:shadow-2xl text-lg`}
            >
              View {subdivisionName} Market Data
            </Link>
          </div>
        </div>

        {/* Introduction */}
        <section className="mb-12">
          <div className={`${cardBg} ${cardBorder} border rounded-2xl p-8 md:p-12 ${shadow}`}>
            <h2 className={`text-4xl font-bold ${textPrimary} mb-6`}>
              Why Choose Me to Sell Your {subdivisionName} Home?
            </h2>
            <p className={`text-lg ${textSecondary} leading-relaxed mb-6`}>
              Selling your home in {subdivisionName} requires an agent who understands the unique appeal of this exclusive community. I'm <strong>Joey Sardella</strong>, a dedicated real estate professional specializing in {cityName}'s premier neighborhoods. I don't just list homes – I create comprehensive marketing strategies that showcase what makes {subdivisionName} special.
            </p>
            <p className={`text-lg ${textSecondary} leading-relaxed`}>
              With deep knowledge of {subdivisionName}'s market dynamics, recent sales data, and buyer preferences, I'll help you sell your home quickly and for the best possible price. Your success is my priority.
            </p>
          </div>
        </section>

        {/* My Selling Advantages */}
        <section className="mb-12">
          <h2 className={`text-4xl font-bold ${textPrimary} mb-8 text-center`}>
            My {subdivisionName} Selling Advantage
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {advantages.map((advantage, idx) => (
              <div key={idx} className={`${cardBg} ${cardBorder} border rounded-xl p-6 ${shadow}`}>
                <div className="text-4xl mb-4">{advantage.emoji}</div>
                <h3 className={`text-2xl font-bold ${textPrimary} mb-3`}>{advantage.title}</h3>
                <p className={`${textSecondary} leading-relaxed`}>{advantage.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* The Selling Process */}
        <section className="mb-12">
          <div className={`${cardBg} ${cardBorder} border rounded-2xl p-8 md:p-12 ${shadow}`}>
            <h2 className={`text-4xl font-bold ${textPrimary} mb-8 text-center`}>
              How I Sell Your {subdivisionName} Home
            </h2>
            <div className="space-y-6">
              {[
                {
                  num: 1,
                  title: "Free Home Valuation & Strategy Session",
                  desc: `We'll meet at your ${subdivisionName} home to discuss your goals and timeline. I'll provide a detailed market analysis showing recent sales in the community and develop a custom pricing strategy.`
                },
                {
                  num: 2,
                  title: "Prepare Your Home to Shine",
                  desc: "I'll provide expert staging advice and recommend any improvements that will increase your home's appeal and value to buyers looking in this premium community."
                },
                {
                  num: 3,
                  title: "Professional Marketing Campaign",
                  desc: "Professional photography, virtual tours, and targeted advertising will showcase your home's best features and reach qualified buyers actively searching in this area."
                },
                {
                  num: 4,
                  title: "Showings & Open Houses",
                  desc: "I'll manage all showings professionally, collect feedback, and keep you informed about buyer interest and market response."
                },
                {
                  num: 5,
                  title: "Review & Negotiate Offers",
                  desc: "When offers come in, I'll review each one with you and negotiate aggressively to secure the highest price and best terms for your sale."
                },
                {
                  num: 6,
                  title: "Manage Inspections & Appraisal",
                  desc: "I'll coordinate inspections, handle any repair negotiations, and work to ensure the appraisal supports your sale price."
                },
                {
                  num: 7,
                  title: "Close Successfully",
                  desc: "I'll guide you through all closing paperwork and coordinate with title/escrow to ensure a smooth transaction from contract to keys."
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

        {/* Community Advantage */}
        <section className="mb-12">
          <div className={`${cardBg} ${cardBorder} border rounded-2xl p-8 md:p-12 ${shadow}`}>
            <h2 className={`text-4xl font-bold ${textPrimary} mb-6`}>
              The {subdivisionName} Market Advantage
            </h2>
            <p className={`text-lg ${textSecondary} leading-relaxed mb-6`}>
              {subdivisionName} is one of the most desirable communities in {cityName}, {region}. Buyers are actively searching for homes in this exclusive neighborhood, and properties here tend to hold their value exceptionally well.
            </p>
            <p className={`text-lg ${textSecondary} leading-relaxed mb-6`}>
              My deep knowledge of {subdivisionName}'s unique features, amenities, HOA dynamics, and buyer preferences means I can position your home to attract serious buyers and generate competitive offers.
            </p>
            <div className="text-center mt-8">
              <a
                href="/#contact"
                className="px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-2xl inline-block text-lg"
              >
                Get Your Free Home Valuation
              </a>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="mb-12">
          <div className={`${cardBg} ${cardBorder} border-2 rounded-2xl p-8 md:p-12 ${shadow} text-center`}>
            <h2 className={`text-4xl md:text-5xl font-bold ${textPrimary} mb-6`}>
              Ready to Sell Your {subdivisionName} Home?
            </h2>
            <p className={`text-xl ${textSecondary} mb-8 leading-relaxed max-w-3xl mx-auto`}>
              Let's discuss your home sale goals and create a winning strategy tailored to {subdivisionName}. Contact me today for a free consultation and home valuation.
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
              href={`/neighborhoods/${cityId}/${slug}/buy`}
              className={`${textSecondary} hover:${textPrimary} underline text-lg`}
            >
              Looking to Buy in {subdivisionName}?
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
