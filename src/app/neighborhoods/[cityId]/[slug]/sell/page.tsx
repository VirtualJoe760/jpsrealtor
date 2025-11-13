// src/app/neighborhoods/[cityId]/[slug]/sell/page.tsx
import { Metadata } from "next";
import Link from "next/link";
import dbConnect from "@/lib/mongoose";
import Subdivision from "@/models/subdivisions";
import { findCityByName } from "@/app/constants/counties";
import { notFound } from "next/navigation";

interface SellSubdivisionPageProps {
  params: {
    cityId: string;
    slug: string;
  };
}

export async function generateMetadata({
  params,
}: SellSubdivisionPageProps): Promise<Metadata> {
  await dbConnect();

  const subdivision = await Subdivision.findOne({ slug: params.slug }).lean();

  if (!subdivision) {
    return {
      title: "Subdivision Not Found",
    };
  }

  // Validate cityId matches subdivision's city
  const cityData = findCityByName(subdivision.city);
  if (!cityData || cityData.city.id !== params.cityId) {
    return {
      title: "Subdivision Not Found",
    };
  }

  return {
    title: `Sell Your ${subdivision.name} Home | ${subdivision.city} Real Estate Expert`,
    description: `Selling your home in ${subdivision.name}? Get top dollar with Joey Sardella, your trusted ${subdivision.city} real estate expert. Professional marketing, expert pricing, and dedicated service.`,
    keywords: `sell my home ${subdivision.name}, sell my house ${subdivision.name}, ${subdivision.name} real estate agent, list my home ${subdivision.name}, ${subdivision.city} realtor, home value ${subdivision.name}`,
  };
}

export default async function SellSubdivisionPage({ params }: SellSubdivisionPageProps) {
  await dbConnect();

  const subdivision = await Subdivision.findOne({ slug: params.slug }).lean();

  if (!subdivision) {
    notFound();
  }

  // Validate cityId matches subdivision's city
  const cityData = findCityByName(subdivision.city);
  if (!cityData || cityData.city.id !== params.cityId) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-green-900/30 via-gray-900 to-black border-b border-gray-800 text-white py-16 md:py-24">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 drop-shadow-2xl">
              Sell Your {subdivision.name} Home for Top Dollar
            </h1>
            <p className="text-xl md:text-2xl text-gray-200 mb-4 leading-relaxed">
              {subdivision.city}, {subdivision.region}
            </p>
            <p className="text-lg text-gray-300 mb-8">
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
                href={`/neighborhoods/${params.cityId}/${params.slug}`}
                className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl text-lg"
              >
                View {subdivision.name} Market Data
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
              Maximize Your Home's Value in {subdivision.name}
            </h2>
            <p className="text-lg text-gray-200 leading-relaxed mb-6">
              Selling a home in {subdivision.name} requires specialized knowledge, strategic marketing, and expert negotiation. I'm <strong>Joey Sardella</strong>, a real estate professional with deep expertise in {subdivision.region} and exclusive communities like {subdivision.name}.
            </p>
            <p className="text-lg text-gray-200 leading-relaxed">
              I understand what makes {subdivision.name} special, what buyers are looking for, and how to position your home to attract the right buyers at the right price. With my proven marketing strategy and dedication to client success, I'll help you sell your home quickly and for top dollar.
            </p>
          </div>
        </section>

        {/* Current Market Stats */}
        <section className="mb-16">
          <h2 className="text-4xl font-bold text-white mb-8 text-center">
            {subdivision.name} Market Overview
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-gray-900 to-black border border-gray-700 rounded-xl p-6 shadow-lg text-center">
              <div className="text-sm text-gray-400 mb-2">Current Listings</div>
              <div className="text-4xl font-bold text-blue-500">{subdivision.listingCount}</div>
              <p className="text-xs text-gray-500 mt-2">Active homes for sale</p>
            </div>
            <div className="bg-gradient-to-br from-gray-900 to-black border border-gray-700 rounded-xl p-6 shadow-lg text-center">
              <div className="text-sm text-gray-400 mb-2">Average Sale Price</div>
              <div className="text-4xl font-bold text-green-500">
                ${subdivision.avgPrice >= 1000000
                  ? `${(subdivision.avgPrice / 1000000).toFixed(1)}M`
                  : `${(subdivision.avgPrice / 1000).toFixed(0)}k`}
              </div>
              <p className="text-xs text-gray-500 mt-2">Recent average</p>
            </div>
            <div className="bg-gradient-to-br from-gray-900 to-black border border-gray-700 rounded-xl p-6 shadow-lg text-center">
              <div className="text-sm text-gray-400 mb-2">Price Range</div>
              <div className="text-2xl font-bold text-purple-500">
                ${subdivision.priceRange.min >= 1000000
                  ? `${(subdivision.priceRange.min / 1000000).toFixed(1)}M`
                  : `${(subdivision.priceRange.min / 1000).toFixed(0)}k`}
                {' - '}
                ${subdivision.priceRange.max >= 1000000
                  ? `${(subdivision.priceRange.max / 1000000).toFixed(1)}M`
                  : `${(subdivision.priceRange.max / 1000).toFixed(0)}k`}
              </div>
              <p className="text-xs text-gray-500 mt-2">Current market range</p>
            </div>
          </div>
        </section>

        {/* Why Choose Joey for This Community */}
        <section className="mb-16">
          <h2 className="text-4xl font-bold text-white mb-8 text-center">
            Why List With Joey Sardella?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-green-900/20 to-black border border-green-800/30 rounded-xl p-6 shadow-lg">
              <div className="text-green-400 text-3xl mb-4">🏘️</div>
              <h3 className="text-2xl font-bold text-white mb-3">{subdivision.name} Expert</h3>
              <p className="text-gray-300 leading-relaxed">
                I specialize in {subdivision.name} and have deep knowledge of the community, recent sales, buyer demographics, and what homes are selling for. This expertise helps me price your home perfectly and market it to the right buyers.
              </p>
            </div>

            <div className="bg-gradient-to-br from-blue-900/20 to-black border border-blue-800/30 rounded-xl p-6 shadow-lg">
              <div className="text-blue-400 text-3xl mb-4">📈</div>
              <h3 className="text-2xl font-bold text-white mb-3">Data-Driven Pricing Strategy</h3>
              <p className="text-gray-300 leading-relaxed">
                I provide a comprehensive CMA (Comparative Market Analysis) specific to {subdivision.name}, analyzing recent sales, current competition, and market trends to determine the optimal listing price that maximizes your return.
              </p>
            </div>

            <div className="bg-gradient-to-br from-purple-900/20 to-black border border-purple-800/30 rounded-xl p-6 shadow-lg">
              <div className="text-purple-400 text-3xl mb-4">📸</div>
              <h3 className="text-2xl font-bold text-white mb-3">Premium Marketing Package</h3>
              <p className="text-gray-300 leading-relaxed">
                Professional photography, videography, virtual tours, and drone footage showcase your home's best features. I invest in high-quality marketing materials that make your property stand out in {subdivision.name}.
              </p>
            </div>

            <div className="bg-gradient-to-br from-orange-900/20 to-black border border-orange-800/30 rounded-xl p-6 shadow-lg">
              <div className="text-orange-400 text-3xl mb-4">🌐</div>
              <h3 className="text-2xl font-bold text-white mb-3">Maximum Exposure</h3>
              <p className="text-gray-300 leading-relaxed">
                Your home will be listed on all major real estate platforms, promoted through social media advertising, and featured in targeted marketing to buyers specifically looking for homes in {subdivision.name}.
              </p>
            </div>

            <div className="bg-gradient-to-br from-red-900/20 to-black border border-red-800/30 rounded-xl p-6 shadow-lg">
              <div className="text-red-400 text-3xl mb-4">💰</div>
              <h3 className="text-2xl font-bold text-white mb-3">Expert Negotiation</h3>
              <p className="text-gray-300 leading-relaxed">
                When offers come in, I negotiate aggressively to get you the highest price and best terms. I handle multiple offers, counteroffers, and contingencies with skill to protect your interests.
              </p>
            </div>

            <div className="bg-gradient-to-br from-yellow-900/20 to-black border border-yellow-800/30 rounded-xl p-6 shadow-lg">
              <div className="text-yellow-400 text-3xl mb-4">🎯</div>
              <h3 className="text-2xl font-bold text-white mb-3">Targeted Buyer Network</h3>
              <p className="text-gray-300 leading-relaxed">
                I have an extensive network of agents and buyers specifically interested in {subdivision.name}. Many of my buyers are pre-qualified and actively searching for homes in this community.
              </p>
            </div>
          </div>
        </section>

        {/* The Selling Process */}
        <section className="mb-16">
          <div className="bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-2xl p-8 md:p-12 shadow-2xl">
            <h2 className="text-4xl font-bold text-white mb-8 text-center">
              How I Sell Your {subdivision.name} Home
            </h2>
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-green-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                  1
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">In-Home Consultation & Valuation</h3>
                  <p className="text-gray-300 leading-relaxed">
                    I'll visit your home to assess its condition, unique features, and upgrades. I'll provide a detailed CMA showing what comparable homes in {subdivision.name} have sold for recently and recommend an optimal listing price.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-green-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                  2
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">Pre-Listing Preparation</h3>
                  <p className="text-gray-300 leading-relaxed">
                    I'll provide recommendations on staging, minor repairs, and improvements that will maximize your home's appeal and value. We'll create a pre-listing game plan to get your home show-ready.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-green-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                  3
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">Professional Media & Marketing Launch</h3>
                  <p className="text-gray-300 leading-relaxed">
                    Professional photographers, videographers, and drone operators will capture your home at its best. Your listing goes live across all platforms with premium placement and targeted advertising to buyers looking in {subdivision.name}.
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
                    I manage all showing schedules, host open houses, and collect feedback from potential buyers. You'll receive regular updates on activity, interest level, and market response.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-green-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                  5
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">Offer Review & Negotiation</h3>
                  <p className="text-gray-300 leading-relaxed">
                    When offers arrive, I'll review each one thoroughly, explain the terms and contingencies, and negotiate on your behalf to get you the best possible price and favorable closing terms.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-green-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                  6
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">Manage Inspections & Contingencies</h3>
                  <p className="text-gray-300 leading-relaxed">
                    I coordinate home inspections, manage repair negotiations, and work with the buyer's agent to resolve any issues that arise. I keep the transaction on track and protect your interests.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-green-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                  7
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">Close the Sale & Celebrate</h3>
                  <p className="text-gray-300 leading-relaxed">
                    I guide you through the final paperwork, coordinate with title and escrow, and ensure a smooth closing. You'll walk away with your proceeds and the satisfaction of a successful sale.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Community Benefits */}
        {subdivision.description && (
          <section className="mb-16">
            <div className="bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-2xl p-8 md:p-12 shadow-2xl">
              <h2 className="text-4xl font-bold text-white mb-6">
                Why Buyers Love {subdivision.name}
              </h2>
              <p className="text-lg text-gray-200 leading-relaxed mb-6">
                {subdivision.description}
              </p>
              <p className="text-lg text-gray-200 leading-relaxed">
                These are the selling points I emphasize when marketing your home to potential buyers. {subdivision.name}'s desirability means strong buyer demand and competitive offers for well-priced, well-presented homes.
              </p>
            </div>
          </section>
        )}

        {/* CTA Section */}
        <section className="mb-16">
          <div className="bg-gradient-to-br from-green-900/30 via-gray-900 to-black border-2 border-green-700/50 rounded-2xl p-8 md:p-12 shadow-2xl text-center">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Ready to Sell Your {subdivision.name} Home?
            </h2>
            <p className="text-xl text-gray-200 mb-8 leading-relaxed max-w-3xl mx-auto">
              Let's discuss your selling goals and create a customized strategy to get you top dollar for your {subdivision.name} home. Contact me today for a free, no-obligation home valuation and consultation.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <a
                href="/#contact"
                className="px-10 py-5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl text-lg"
              >
                Get Your Free Home Valuation
              </a>
              <Link
                href={`/neighborhoods/${params.cityId}/${params.slug}`}
                className="px-10 py-5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl text-lg"
              >
                View Recent Sales in {subdivision.name}
              </Link>
            </div>
          </div>
        </section>

        {/* Additional Links */}
        <section className="text-center">
          <div className="inline-flex flex-wrap gap-4 justify-center">
            <Link
              href={`/neighborhoods/${params.cityId}/${params.slug}/buy`}
              className="text-blue-400 hover:text-blue-300 underline text-lg"
            >
              Buying a Home in {subdivision.name}?
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
