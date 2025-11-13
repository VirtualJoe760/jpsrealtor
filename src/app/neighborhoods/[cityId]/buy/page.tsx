// src/app/neighborhoods/[cityId]/buy/page.tsx
import React from "react";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { findCityById } from "@/app/constants/counties";

interface BuyPageProps {
  params: Promise<{ cityId: string }>;
}

export async function generateMetadata({ params }: BuyPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const cityData = findCityById(resolvedParams.cityId);

  if (!cityData) {
    return {
      title: "City Not Found",
    };
  }

  const { city, countyName } = cityData;

  return {
    title: `Buy a Home in ${city.name}, ${countyName} | Expert Real Estate Agent`,
    description: `Looking to buy a home in ${city.name}? Work with Joey Sardella, your trusted ${countyName} real estate expert. Get personalized service, market insights, and find your dream home today.`,
    keywords: `buy a home in ${city.name}, buy a house in ${city.name}, ${city.name} real estate agent, homes for sale ${city.name}, ${countyName} realtor, buying property ${city.name}`,
  };
}

export default async function BuyInCityPage({ params }: BuyPageProps) {
  const resolvedParams = await params;
  const cityData = findCityById(resolvedParams.cityId);

  if (!cityData) {
    notFound();
  }

  const { city, countyName } = cityData;

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-900/30 via-gray-900 to-black border-b border-gray-800 text-white py-16 md:py-24">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 drop-shadow-2xl">
              Buy Your Dream Home in {city.name}
            </h1>
            <p className="text-xl md:text-2xl text-gray-200 mb-8 leading-relaxed">
              Your Trusted Real Estate Expert in {countyName}
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link
                href={`/neighborhoods/${resolvedParams.cityId}`}
                className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl text-lg"
              >
                View {city.name} Listings
              </Link>
              <a
                href="/#contact"
                className="px-8 py-4 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl text-lg"
              >
                Contact Joey Today
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12 max-w-5xl">
        {/* Introduction */}
        <section className="mb-16">
          <div className="bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-2xl p-8 md:p-12 shadow-2xl">
            <h2 className="text-4xl font-bold text-white mb-6">
              Why Choose Joey Sardella to Buy Your {city.name} Home?
            </h2>
            <p className="text-lg text-gray-200 leading-relaxed mb-6">
              Buying a home in {city.name} is one of the most important decisions you'll make, and having the right real estate agent by your side makes all the difference. I'm <strong>Joey Sardella</strong>, a dedicated real estate professional serving {countyName} and the surrounding areas. With years of local market expertise and a commitment to personalized service, I'll guide you through every step of the home-buying journey.
            </p>
            <p className="text-lg text-gray-200 leading-relaxed">
              Whether you're a first-time homebuyer, relocating to {city.name}, or looking for an investment property, I have the knowledge, resources, and negotiation skills to help you find the perfect home at the right price.
            </p>
          </div>
        </section>

        {/* Why Work With Me */}
        <section className="mb-16">
          <h2 className="text-4xl font-bold text-white mb-8 text-center">
            What Sets Me Apart
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-blue-900/20 to-black border border-blue-800/30 rounded-xl p-6 shadow-lg">
              <div className="text-blue-400 text-3xl mb-4">🏡</div>
              <h3 className="text-2xl font-bold text-white mb-3">Local Market Expert</h3>
              <p className="text-gray-300 leading-relaxed">
                I live and breathe {countyName} real estate. I know {city.name}'s neighborhoods, market trends, schools, and amenities inside and out. This insider knowledge helps you make informed decisions and find hidden gems.
              </p>
            </div>

            <div className="bg-gradient-to-br from-green-900/20 to-black border border-green-800/30 rounded-xl p-6 shadow-lg">
              <div className="text-green-400 text-3xl mb-4">💰</div>
              <h3 className="text-2xl font-bold text-white mb-3">Expert Negotiator</h3>
              <p className="text-gray-300 leading-relaxed">
                Your money matters. I use proven negotiation strategies to ensure you get the best possible deal. From initial offer to closing, I'll fight for your interests and protect your investment.
              </p>
            </div>

            <div className="bg-gradient-to-br from-purple-900/20 to-black border border-purple-800/30 rounded-xl p-6 shadow-lg">
              <div className="text-purple-400 text-3xl mb-4">📋</div>
              <h3 className="text-2xl font-bold text-white mb-3">White-Glove Service</h3>
              <p className="text-gray-300 leading-relaxed">
                From your first property tour to closing day and beyond, I provide attentive, personalized service. I'm always available to answer questions, schedule showings, and keep you informed throughout the process.
              </p>
            </div>

            <div className="bg-gradient-to-br from-orange-900/20 to-black border border-orange-800/30 rounded-xl p-6 shadow-lg">
              <div className="text-orange-400 text-3xl mb-4">🔍</div>
              <h3 className="text-2xl font-bold text-white mb-3">Access to Exclusive Listings</h3>
              <p className="text-gray-300 leading-relaxed">
                As a well-connected agent in {countyName}, I have access to exclusive listings and off-market properties that aren't available to the general public. Get first dibs on the best homes in {city.name}.
              </p>
            </div>
          </div>
        </section>

        {/* The Process */}
        <section className="mb-16">
          <div className="bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-2xl p-8 md:p-12 shadow-2xl">
            <h2 className="text-4xl font-bold text-white mb-8 text-center">
              Your Home-Buying Journey with Joey
            </h2>
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                  1
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">Initial Consultation</h3>
                  <p className="text-gray-300 leading-relaxed">
                    We'll discuss your needs, budget, must-haves, and nice-to-haves. I'll help you get pre-approved for a mortgage and understand what you can afford in {city.name}.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                  2
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">Property Search</h3>
                  <p className="text-gray-300 leading-relaxed">
                    I'll curate a personalized list of homes that match your criteria and arrange tours. You'll get instant alerts when new properties hit the market in {city.name}.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                  3
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">Market Analysis & Offer</h3>
                  <p className="text-gray-300 leading-relaxed">
                    I'll provide a detailed comparative market analysis (CMA) to determine fair market value. Together, we'll craft a competitive offer that stands out to sellers.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                  4
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">Negotiation & Inspections</h3>
                  <p className="text-gray-300 leading-relaxed">
                    I'll negotiate on your behalf and coordinate home inspections, appraisals, and any necessary repairs or credits.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                  5
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">Closing & Beyond</h3>
                  <p className="text-gray-300 leading-relaxed">
                    I'll guide you through the closing process, ensure all paperwork is in order, and be there to hand you the keys to your new {city.name} home. Even after closing, I'm here to help with any questions or referrals you need.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* About the Area */}
        <section className="mb-16">
          <div className="bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-2xl p-8 md:p-12 shadow-2xl">
            <h2 className="text-4xl font-bold text-white mb-6">
              Why Live in {city.name}?
            </h2>
            <p className="text-lg text-gray-200 leading-relaxed mb-6">
              {city.name} offers an exceptional quality of life in the heart of {countyName}.
              {city.population && (
                <> With a population of {city.population.toLocaleString()}, it's a vibrant community that offers the perfect balance of amenities and charm.</>
              )}
            </p>
            <p className="text-lg text-gray-200 leading-relaxed mb-6">
              From excellent schools and parks to shopping, dining, and entertainment options, {city.name} has everything you need. Whether you're looking for a family-friendly neighborhood, a luxury estate, or an investment property, I can help you find the perfect home in this wonderful community.
            </p>
            <div className="text-center mt-8">
              <Link
                href={`/neighborhoods/${resolvedParams.cityId}`}
                className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl inline-block text-lg"
              >
                Explore Homes for Sale in {city.name}
              </Link>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="mb-16">
          <div className="bg-gradient-to-br from-green-900/30 via-gray-900 to-black border-2 border-green-700/50 rounded-2xl p-8 md:p-12 shadow-2xl text-center">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Ready to Buy Your Dream Home in {city.name}?
            </h2>
            <p className="text-xl text-gray-200 mb-8 leading-relaxed max-w-3xl mx-auto">
              Don't navigate the {city.name} real estate market alone. Let me put my expertise, local knowledge, and dedication to work for you. Contact me today for a free consultation and let's find your perfect home.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <a
                href="/#contact"
                className="px-10 py-5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl text-lg"
              >
                Schedule Your Free Consultation
              </a>
              <Link
                href={`/neighborhoods/${resolvedParams.cityId}`}
                className="px-10 py-5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl text-lg"
              >
                Browse {city.name} Listings
              </Link>
            </div>
          </div>
        </section>

        {/* Additional Links */}
        <section className="text-center">
          <div className="inline-flex flex-wrap gap-4 justify-center">
            <Link
              href={`/neighborhoods/${resolvedParams.cityId}/sell`}
              className="text-blue-400 hover:text-blue-300 underline text-lg"
            >
              Selling a Home in {city.name}?
            </Link>
            <Link
              href="/neighborhoods"
              className="text-blue-400 hover:text-blue-300 underline text-lg"
            >
              Explore Other Areas
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
