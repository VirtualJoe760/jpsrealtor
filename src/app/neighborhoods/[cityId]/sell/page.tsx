// src/app/neighborhoods/[cityId]/sell/page.tsx
import React from "react";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { findCityById } from "@/app/constants/counties";

interface SellPageProps {
  params: Promise<{ cityId: string }>;
}

export async function generateMetadata({ params }: SellPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const cityData = findCityById(resolvedParams.cityId);

  if (!cityData) {
    return {
      title: "City Not Found",
    };
  }

  const { city, countyName } = cityData;

  return {
    title: `Sell Your ${city.name} Home | Expert Real Estate Agent - Joey Sardella`,
    description: `Ready to sell your home in ${city.name}? Get top dollar with Joey Sardella, your trusted ${countyName} real estate expert. Professional marketing, expert pricing, and dedicated service.`,
    keywords: `sell my home ${city.name}, sell my house ${city.name}, ${city.name} real estate agent, list my home ${city.name}, ${countyName} realtor, selling property ${city.name}, home value ${city.name}`,
  };
}

export default async function SellInCityPage({ params }: SellPageProps) {
  const resolvedParams = await params;
  const cityData = findCityById(resolvedParams.cityId);

  if (!cityData) {
    notFound();
  }

  const { city, countyName } = cityData;

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-green-900/30 via-gray-900 to-black border-b border-gray-800 text-white py-16 md:py-24">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 drop-shadow-2xl">
              Sell Your {city.name} Home for Top Dollar
            </h1>
            <p className="text-xl md:text-2xl text-gray-200 mb-8 leading-relaxed">
              Expert Marketing. Strategic Pricing. Maximum Results.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <a
                href="/#contact"
                className="px-8 py-4 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl text-lg"
              >
                Get Your Free Home Valuation
              </a>
              <Link
                href={`/neighborhoods/${resolvedParams.cityId}`}
                className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl text-lg"
              >
                View {city.name} Market Data
              </Link>
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
              Why Choose Joey Sardella to Sell Your {city.name} Home?
            </h2>
            <p className="text-lg text-gray-200 leading-relaxed mb-6">
              Selling your home in {city.name} is a major financial decision, and you deserve an agent who will maximize your return while minimizing your stress. I'm <strong>Joey Sardella</strong>, a dedicated real estate professional with deep roots in {countyName}. I don't just list homes – I create customized marketing strategies that attract qualified buyers and drive competition for your property.
            </p>
            <p className="text-lg text-gray-200 leading-relaxed">
              With my proven track record, cutting-edge marketing techniques, and expert negotiation skills, I'll help you sell your {city.name} home quickly and for the best possible price. Let's make your home sale a success story.
            </p>
          </div>
        </section>

        {/* My Selling Advantages */}
        <section className="mb-16">
          <h2 className="text-4xl font-bold text-white mb-8 text-center">
            My Proven Selling Strategy
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-green-900/20 to-black border border-green-800/30 rounded-xl p-6 shadow-lg">
              <div className="text-green-400 text-3xl mb-4">📊</div>
              <h3 className="text-2xl font-bold text-white mb-3">Strategic Pricing</h3>
              <p className="text-gray-300 leading-relaxed">
                I provide a comprehensive Comparative Market Analysis (CMA) using the latest {city.name} market data. Price it right from the start to attract serious buyers and maximize your profit. No guesswork – just data-driven pricing strategy.
              </p>
            </div>

            <div className="bg-gradient-to-br from-blue-900/20 to-black border border-blue-800/30 rounded-xl p-6 shadow-lg">
              <div className="text-blue-400 text-3xl mb-4">📸</div>
              <h3 className="text-2xl font-bold text-white mb-3">Professional Marketing</h3>
              <p className="text-gray-300 leading-relaxed">
                Your home deserves to shine. I invest in professional photography, virtual tours, drone footage, and targeted digital advertising to showcase your property to thousands of potential buyers across multiple platforms.
              </p>
            </div>

            <div className="bg-gradient-to-br from-purple-900/20 to-black border border-purple-800/30 rounded-xl p-6 shadow-lg">
              <div className="text-purple-400 text-3xl mb-4">🌐</div>
              <h3 className="text-2xl font-bold text-white mb-3">Maximum Exposure</h3>
              <p className="text-gray-300 leading-relaxed">
                I list your home on all major real estate platforms (MLS, Zillow, Realtor.com, Redfin, and more), leverage social media marketing, and tap into my extensive network of agents and buyers to get maximum visibility for your {city.name} property.
              </p>
            </div>

            <div className="bg-gradient-to-br from-orange-900/20 to-black border border-orange-800/30 rounded-xl p-6 shadow-lg">
              <div className="text-orange-400 text-3xl mb-4">🤝</div>
              <h3 className="text-2xl font-bold text-white mb-3">Expert Negotiation</h3>
              <p className="text-gray-300 leading-relaxed">
                When offers come in, I negotiate aggressively on your behalf to secure the highest price and best terms. I handle counteroffers, contingencies, and buyer requests with skill and professionalism.
              </p>
            </div>

            <div className="bg-gradient-to-br from-red-900/20 to-black border border-red-800/30 rounded-xl p-6 shadow-lg">
              <div className="text-red-400 text-3xl mb-4">🏠</div>
              <h3 className="text-2xl font-bold text-white mb-3">Home Staging Guidance</h3>
              <p className="text-gray-300 leading-relaxed">
                First impressions matter. I provide expert advice on staging, repairs, and improvements that will increase your home's appeal and value. I can also connect you with trusted contractors and stagers if needed.
              </p>
            </div>

            <div className="bg-gradient-to-br from-yellow-900/20 to-black border border-yellow-800/30 rounded-xl p-6 shadow-lg">
              <div className="text-yellow-400 text-3xl mb-4">✅</div>
              <h3 className="text-2xl font-bold text-white mb-3">Seamless Transaction Management</h3>
              <p className="text-gray-300 leading-relaxed">
                Selling a home involves lots of paperwork and deadlines. I manage every detail – from disclosures and inspections to appraisals and closing – ensuring a smooth, stress-free process from listing to sold.
              </p>
            </div>
          </div>
        </section>

        {/* The Selling Process */}
        <section className="mb-16">
          <div className="bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-2xl p-8 md:p-12 shadow-2xl">
            <h2 className="text-4xl font-bold text-white mb-8 text-center">
              How I Sell Your {city.name} Home
            </h2>
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-green-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                  1
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">Free Home Valuation & Consultation</h3>
                  <p className="text-gray-300 leading-relaxed">
                    We'll meet at your property to discuss your goals, timeline, and get an accurate picture of your home's market value. I'll provide a detailed CMA showing recent sales of comparable homes in {city.name}.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-green-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                  2
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">Prepare Your Home to Sell</h3>
                  <p className="text-gray-300 leading-relaxed">
                    I'll provide recommendations on staging, minor repairs, and curb appeal improvements that will boost your home's value and attract buyers. We'll create a pre-listing checklist to get your home market-ready.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-green-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                  3
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">Professional Photography & Marketing</h3>
                  <p className="text-gray-300 leading-relaxed">
                    I'll coordinate professional photography, videography, and virtual tours. Your home will be listed on the MLS and promoted across social media, real estate websites, and my professional network.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-green-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                  4
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">Showings & Open Houses</h3>
                  <p className="text-gray-300 leading-relaxed">
                    I'll manage all showings, host open houses, and provide you with feedback from potential buyers. You'll receive regular updates on showing activity and market interest.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-green-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                  5
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">Review Offers & Negotiate</h3>
                  <p className="text-gray-300 leading-relaxed">
                    When offers arrive, I'll review each one with you, explain the terms, and advise on the best course of action. I'll negotiate on your behalf to get you the highest price and most favorable terms.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-green-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                  6
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">Navigate Inspections & Appraisal</h3>
                  <p className="text-gray-300 leading-relaxed">
                    I'll coordinate home inspections, manage repair negotiations, and ensure the appraisal comes in at or above the sale price. I'll handle any issues that arise with professionalism and expertise.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-green-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                  7
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">Close the Sale</h3>
                  <p className="text-gray-300 leading-relaxed">
                    I'll guide you through the final paperwork, coordinate with title and escrow, and ensure a smooth closing. You'll walk away with a check and peace of mind knowing you got the best deal possible.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Market Knowledge */}
        <section className="mb-16">
          <div className="bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-2xl p-8 md:p-12 shadow-2xl">
            <h2 className="text-4xl font-bold text-white mb-6">
              Deep Knowledge of the {city.name} Market
            </h2>
            <p className="text-lg text-gray-200 leading-relaxed mb-6">
              As a {countyName} real estate specialist, I have my finger on the pulse of the {city.name} market. I track trends, monitor inventory levels, understand buyer demographics, and know what homes are selling for in your neighborhood.
            </p>
            <p className="text-lg text-gray-200 leading-relaxed mb-6">
              This local expertise allows me to price your home competitively, market it to the right audience, and time the listing for maximum impact. Whether the market is hot or cooling down, I adjust my strategy to get you the best results.
            </p>
            <div className="text-center mt-8">
              <a
                href="/#contact"
                className="px-8 py-4 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl inline-block text-lg"
              >
                Request a Free Market Analysis
              </a>
            </div>
          </div>
        </section>

        {/* Testimonial Placeholder */}
        <section className="mb-16">
          <div className="bg-gradient-to-br from-blue-900/20 to-black border border-blue-800/30 rounded-2xl p-8 md:p-12 shadow-2xl">
            <h2 className="text-3xl font-bold text-white mb-6 text-center">
              Trusted by {city.name} Homeowners
            </h2>
            <p className="text-lg text-gray-300 leading-relaxed text-center italic">
              "Selling our home in {city.name} was seamless thanks to Joey. His marketing strategy was top-notch, and he negotiated a price well above our expectations. We couldn't be happier with the results!"
            </p>
            <p className="text-center text-gray-400 mt-4">— Happy {city.name} Home Seller</p>
          </div>
        </section>

        {/* CTA Section */}
        <section className="mb-16">
          <div className="bg-gradient-to-br from-green-900/30 via-gray-900 to-black border-2 border-green-700/50 rounded-2xl p-8 md:p-12 shadow-2xl text-center">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Ready to Sell Your {city.name} Home?
            </h2>
            <p className="text-xl text-gray-200 mb-8 leading-relaxed max-w-3xl mx-auto">
              Let's get started! Contact me today for a free, no-obligation home valuation and consultation. I'll show you exactly what your home is worth and how I'll help you sell it for top dollar.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <a
                href="/#contact"
                className="px-10 py-5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl text-lg"
              >
                Get Your Free Home Valuation
              </a>
              <Link
                href={`/neighborhoods/${resolvedParams.cityId}`}
                className="px-10 py-5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl text-lg"
              >
                View {city.name} Market Trends
              </Link>
            </div>
          </div>
        </section>

        {/* Additional Links */}
        <section className="text-center">
          <div className="inline-flex flex-wrap gap-4 justify-center">
            <Link
              href={`/neighborhoods/${resolvedParams.cityId}/buy`}
              className="text-blue-400 hover:text-blue-300 underline text-lg"
            >
              Buying a Home in {city.name}?
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
