// src/app/neighborhoods/[cityId]/[slug]/buy/page.tsx
import { Metadata } from "next";
import Link from "next/link";
import dbConnect from "@/lib/mongoose";
import Subdivision from "@/models/subdivisions";
import { findCityByName } from "@/app/constants/counties";
import { notFound } from "next/navigation";

interface BuySubdivisionPageProps {
  params: {
    cityId: string;
    slug: string;
  };
}

export async function generateMetadata({
  params,
}: BuySubdivisionPageProps): Promise<Metadata> {
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
    title: `Buy a Home in ${subdivision.name} | ${subdivision.city}, ${subdivision.region}`,
    description: `Looking to buy a home in ${subdivision.name}? Work with Joey Sardella, your trusted real estate expert for ${subdivision.city}. Find your dream home in this exclusive community today.`,
    keywords: `buy a home in ${subdivision.name}, buy a house in ${subdivision.name}, ${subdivision.name} real estate, ${subdivision.name} homes for sale, ${subdivision.city} realtor`,
  };
}

export default async function BuySubdivisionPage({ params }: BuySubdivisionPageProps) {
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
      <div className="bg-gradient-to-br from-blue-900/30 via-gray-900 to-black border-b border-gray-800 text-white py-16 md:py-24">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 drop-shadow-2xl">
              Buy Your Dream Home in {subdivision.name}
            </h1>
            <p className="text-xl md:text-2xl text-gray-200 mb-4 leading-relaxed">
              {subdivision.city}, {subdivision.region}
            </p>
            <p className="text-lg text-gray-300 mb-8">
              Your Trusted Real Estate Expert for Exclusive Communities
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link
                href={`/neighborhoods/${params.cityId}/${params.slug}`}
                className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl text-lg"
              >
                View {subdivision.name} Listings
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
              Your Guide to Buying in {subdivision.name}
            </h2>
            <p className="text-lg text-gray-200 leading-relaxed mb-6">
              {subdivision.name} is one of {subdivision.city}'s most sought-after communities, and finding the perfect home here requires expertise, dedication, and insider knowledge. I'm <strong>Joey Sardella</strong>, a real estate professional specializing in {subdivision.region} and exclusive communities like {subdivision.name}.
            </p>
            <p className="text-lg text-gray-200 leading-relaxed">
              With deep knowledge of {subdivision.name}'s unique features, current inventory, and market dynamics, I'll help you navigate the buying process with confidence. Whether you're looking for a primary residence, vacation home, or investment property, I'm committed to finding you the perfect home in this exceptional community.
            </p>
          </div>
        </section>

        {/* About the Subdivision */}
        {subdivision.description && (
          <section className="mb-16">
            <div className="bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-2xl p-8 md:p-12 shadow-2xl">
              <h2 className="text-4xl font-bold text-white mb-6">
                About {subdivision.name}
              </h2>
              <p className="text-lg text-gray-200 leading-relaxed mb-6">
                {subdivision.description}
              </p>
              {subdivision.features && subdivision.features.length > 0 && (
                <>
                  <h3 className="text-2xl font-bold text-white mb-4">Community Features</h3>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {subdivision.features.map((feature: string, index: number) => (
                      <li key={index} className="flex items-start gap-2 text-gray-300">
                        <span className="text-green-400 mt-1">✓</span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </section>
        )}

        {/* Market Stats */}
        <section className="mb-16">
          <h2 className="text-4xl font-bold text-white mb-8 text-center">
            {subdivision.name} Market Overview
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-gray-900 to-black border border-gray-700 rounded-xl p-6 shadow-lg text-center">
              <div className="text-sm text-gray-400 mb-2">Active Listings</div>
              <div className="text-4xl font-bold text-blue-500">{subdivision.listingCount}</div>
            </div>
            <div className="bg-gradient-to-br from-gray-900 to-black border border-gray-700 rounded-xl p-6 shadow-lg text-center">
              <div className="text-sm text-gray-400 mb-2">Average Price</div>
              <div className="text-4xl font-bold text-green-500">
                ${subdivision.avgPrice >= 1000000
                  ? `${(subdivision.avgPrice / 1000000).toFixed(1)}M`
                  : `${(subdivision.avgPrice / 1000).toFixed(0)}k`}
              </div>
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
            </div>
          </div>
        </section>

        {/* Why Work With Joey */}
        <section className="mb-16">
          <h2 className="text-4xl font-bold text-white mb-8 text-center">
            Why Work With Joey Sardella?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-blue-900/20 to-black border border-blue-800/30 rounded-xl p-6 shadow-lg">
              <div className="text-blue-400 text-3xl mb-4">🏘️</div>
              <h3 className="text-2xl font-bold text-white mb-3">Community Specialist</h3>
              <p className="text-gray-300 leading-relaxed">
                I specialize in {subdivision.name} and know this community inside out – from HOA rules and upcoming assessments to the best lots and most desirable floor plans. This insider knowledge is invaluable when making your buying decision.
              </p>
            </div>

            <div className="bg-gradient-to-br from-green-900/20 to-black border border-green-800/30 rounded-xl p-6 shadow-lg">
              <div className="text-green-400 text-3xl mb-4">🔔</div>
              <h3 className="text-2xl font-bold text-white mb-3">First Access to New Listings</h3>
              <p className="text-gray-300 leading-relaxed">
                Homes in {subdivision.name} can sell quickly. I'll set you up with instant alerts when new properties hit the market, giving you a competitive edge to secure your dream home before others even know it's available.
              </p>
            </div>

            <div className="bg-gradient-to-br from-purple-900/20 to-black border border-purple-800/30 rounded-xl p-6 shadow-lg">
              <div className="text-purple-400 text-3xl mb-4">💡</div>
              <h3 className="text-2xl font-bold text-white mb-3">Strategic Guidance</h3>
              <p className="text-gray-300 leading-relaxed">
                I provide data-driven advice on pricing, timing, and negotiation strategy specific to {subdivision.name}. My goal is to help you make the smartest investment while staying within your budget.
              </p>
            </div>

            <div className="bg-gradient-to-br from-orange-900/20 to-black border border-orange-800/30 rounded-xl p-6 shadow-lg">
              <div className="text-orange-400 text-3xl mb-4">🤝</div>
              <h3 className="text-2xl font-bold text-white mb-3">Personalized Service</h3>
              <p className="text-gray-300 leading-relaxed">
                You're not just another transaction to me. I take the time to understand your needs, preferences, and lifestyle to find the perfect home in {subdivision.name} that checks all your boxes.
              </p>
            </div>
          </div>
        </section>

        {/* The Buying Process */}
        <section className="mb-16">
          <div className="bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-2xl p-8 md:p-12 shadow-2xl">
            <h2 className="text-4xl font-bold text-white mb-8 text-center">
              Your Home-Buying Journey in {subdivision.name}
            </h2>
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                  1
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">Discovery & Pre-Approval</h3>
                  <p className="text-gray-300 leading-relaxed">
                    We'll discuss your goals and budget. I'll connect you with trusted lenders to get pre-approved, and we'll review current inventory in {subdivision.name} to understand what's available in your price range.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                  2
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">Property Tours</h3>
                  <p className="text-gray-300 leading-relaxed">
                    I'll schedule tours of homes that match your criteria in {subdivision.name}. I'll point out features, potential issues, and help you envision living in each property.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                  3
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">Comparative Analysis & Offer Strategy</h3>
                  <p className="text-gray-300 leading-relaxed">
                    For homes you're interested in, I'll provide a detailed market analysis and craft a competitive offer strategy to increase your chances of success.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                  4
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">Negotiation & Due Diligence</h3>
                  <p className="text-gray-300 leading-relaxed">
                    I'll negotiate on your behalf and coordinate inspections, HOA document review, and appraisals to ensure you're making a sound investment.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                  5
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">Closing & Welcome Home</h3>
                  <p className="text-gray-300 leading-relaxed">
                    I'll guide you through closing, ensure all paperwork is perfect, and celebrate with you when you get the keys to your new home in {subdivision.name}!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="mb-16">
          <div className="bg-gradient-to-br from-green-900/30 via-gray-900 to-black border-2 border-green-700/50 rounded-2xl p-8 md:p-12 shadow-2xl text-center">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Ready to Buy in {subdivision.name}?
            </h2>
            <p className="text-xl text-gray-200 mb-8 leading-relaxed max-w-3xl mx-auto">
              Let's find your perfect home in {subdivision.name}. Contact me today for a free consultation and personalized property search.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <a
                href="/#contact"
                className="px-10 py-5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl text-lg"
              >
                Schedule Your Free Consultation
              </a>
              <Link
                href={`/neighborhoods/${params.cityId}/${params.slug}`}
                className="px-10 py-5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl text-lg"
              >
                Browse {subdivision.name} Listings
              </Link>
            </div>
          </div>
        </section>

        {/* Additional Links */}
        <section className="text-center">
          <div className="inline-flex flex-wrap gap-4 justify-center">
            <Link
              href={`/neighborhoods/${params.cityId}/${params.slug}/sell`}
              className="text-blue-400 hover:text-blue-300 underline text-lg"
            >
              Selling a Home in {subdivision.name}?
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
