"use client";

import Link from "next/link";
import { useThemeClasses } from "@/app/contexts/ThemeContext";

interface SellPageClientProps {
  cityName: string;
  cityId: string;
  countyName: string;
  population?: number;
}

export default function SellPageClient({
  cityName,
  cityId,
  countyName,
  population,
}: SellPageClientProps) {
  const {
    cardBg,
    cardBorder,
    textPrimary,
    textSecondary,
    buttonPrimary,
    buttonSecondary,
    shadow,
  } = useThemeClasses();

  const strategies = [
    {
      emoji: "📊",
      title: "Strategic Pricing",
      desc: `I provide a comprehensive Comparative Market Analysis (CMA) using the latest ${cityName} market data. Price it right from the start to attract serious buyers and maximize your profit. No guesswork – just data-driven pricing strategy.`
    },
    {
      emoji: "📸",
      title: "Professional Marketing",
      desc: "Your home deserves to shine. I invest in professional photography, virtual tours, drone footage, and targeted digital advertising to showcase your property to thousands of potential buyers across multiple platforms."
    },
    {
      emoji: "🌐",
      title: "Maximum Exposure",
      desc: `I list your home on all major real estate platforms (MLS, Zillow, Realtor.com, Redfin, and more), leverage social media marketing, and tap into my extensive network of agents and buyers to get maximum visibility for your ${cityName} property.`
    },
    {
      emoji: "🤝",
      title: "Expert Negotiation",
      desc: "When offers come in, I negotiate aggressively on your behalf to secure the highest price and best terms. I handle counteroffers, contingencies, and buyer requests with skill and professionalism."
    },
    {
      emoji: "🏠",
      title: "Home Staging Guidance",
      desc: "First impressions matter. I provide expert advice on staging, repairs, and improvements that will increase your home's appeal and value. I can also connect you with trusted contractors and stagers if needed."
    },
    {
      emoji: "✅",
      title: "Seamless Transaction Management",
      desc: "Selling a home involves lots of paperwork and deadlines. I manage every detail – from disclosures and inspections to appraisals and closing – ensuring a smooth, stress-free process from listing to sold."
    }
  ];

  const process = [
    {
      num: 1,
      title: "Free Home Valuation & Consultation",
      desc: `We'll meet at your property to discuss your goals, timeline, and get an accurate picture of your home's market value. I'll provide a detailed CMA showing recent sales of comparable homes in ${cityName}.`
    },
    {
      num: 2,
      title: "Prepare Your Home to Sell",
      desc: "I'll provide recommendations on staging, minor repairs, and curb appeal improvements that will boost your home's value and attract buyers. We'll create a pre-listing checklist to get your home market-ready."
    },
    {
      num: 3,
      title: "Professional Photography & Marketing",
      desc: "I'll coordinate professional photography, videography, and virtual tours. Your home will be listed on the MLS and promoted across social media, real estate websites, and my professional network."
    },
    {
      num: 4,
      title: "Showings & Open Houses",
      desc: "I'll manage all showings, host open houses, and provide you with feedback from potential buyers. You'll receive regular updates on showing activity and market interest."
    },
    {
      num: 5,
      title: "Review Offers & Negotiate",
      desc: "When offers arrive, I'll review each one with you, explain the terms, and advise on the best course of action. I'll negotiate on your behalf to get you the highest price and most favorable terms."
    },
    {
      num: 6,
      title: "Navigate Inspections & Appraisal",
      desc: "I'll coordinate home inspections, manage repair negotiations, and ensure the appraisal comes in at or above the sale price. I'll handle any issues that arise with professionalism and expertise."
    },
    {
      num: 7,
      title: "Close the Sale",
      desc: "I'll guide you through the final paperwork, coordinate with title and escrow, and ensure a smooth closing. You'll walk away with a check and peace of mind knowing you got the best deal possible."
    }
  ];

  return (
    <div className="min-h-screen py-12 px-4" data-page="neighborhoods-sell">
      <div className="max-w-5xl mx-auto">
        {/* Hero Section */}
        <div className={`${cardBg} ${cardBorder} border rounded-3xl p-8 md:p-16 ${shadow} mb-12 text-center`}>
          <h1 className={`text-5xl md:text-6xl font-bold ${textPrimary} mb-6 drop-shadow-2xl`}>
            Sell Your {cityName} Home for Top Dollar
          </h1>
          <p className={`text-xl md:text-2xl ${textSecondary} mb-8 leading-relaxed`}>
            Expert Marketing. Strategic Pricing. Maximum Results.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <a
              href="/#contact"
              className="px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-2xl text-lg"
            >
              Get Your Free Home Valuation
            </a>
            <Link
              href={`/neighborhoods/${cityId}`}
              className={`px-8 py-4 ${buttonSecondary} font-semibold rounded-xl transition-all duration-200 ${shadow} hover:shadow-2xl text-lg`}
            >
              View {cityName} Market Data
            </Link>
          </div>
        </div>

        {/* Introduction */}
        <section className="mb-12">
          <div className={`${cardBg} ${cardBorder} border rounded-2xl p-8 md:p-12 ${shadow}`}>
            <h2 className={`text-4xl font-bold ${textPrimary} mb-6`}>
              Why Choose Joey Sardella to Sell Your {cityName} Home?
            </h2>
            <p className={`text-lg ${textSecondary} leading-relaxed mb-6`}>
              Selling your home in {cityName} is a major financial decision, and you deserve an agent who will maximize your return while minimizing your stress. I'm <strong>Joey Sardella</strong>, a dedicated real estate professional with deep roots in {countyName}. I don't just list homes – I create customized marketing strategies that attract qualified buyers and drive competition for your property.
            </p>
            <p className={`text-lg ${textSecondary} leading-relaxed`}>
              With my proven track record, cutting-edge marketing techniques, and expert negotiation skills, I'll help you sell your {cityName} home quickly and for the best possible price. Let's make your home sale a success story.
            </p>
          </div>
        </section>

        {/* My Proven Selling Strategy */}
        <section className="mb-12">
          <h2 className={`text-4xl font-bold ${textPrimary} mb-8 text-center`}>
            My Proven Selling Strategy
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {strategies.map((strategy, idx) => (
              <div key={idx} className={`${cardBg} ${cardBorder} border rounded-xl p-6 ${shadow}`}>
                <div className="text-4xl mb-4">{strategy.emoji}</div>
                <h3 className={`text-2xl font-bold ${textPrimary} mb-3`}>{strategy.title}</h3>
                <p className={`${textSecondary} leading-relaxed`}>{strategy.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* The Selling Process */}
        <section className="mb-12">
          <div className={`${cardBg} ${cardBorder} border rounded-2xl p-8 md:p-12 ${shadow}`}>
            <h2 className={`text-4xl font-bold ${textPrimary} mb-8 text-center`}>
              How I Sell Your {cityName} Home
            </h2>
            <div className="space-y-6">
              {process.map((step) => (
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

        {/* Market Knowledge */}
        <section className="mb-12">
          <div className={`${cardBg} ${cardBorder} border rounded-2xl p-8 md:p-12 ${shadow}`}>
            <h2 className={`text-4xl font-bold ${textPrimary} mb-6`}>
              The {cityName} Market Advantage
            </h2>
            <p className={`text-lg ${textSecondary} leading-relaxed mb-6`}>
              {cityName} is a sought-after location in {countyName}
              {population && (
                <>, with a population of {population.toLocaleString()}</>
              )}
              . Buyers are actively searching for homes in this area, and I know exactly how to position your property to stand out in the marketplace.
            </p>
            <p className={`text-lg ${textSecondary} leading-relaxed mb-6`}>
              My deep knowledge of {cityName}'s neighborhoods, recent sales data, and buyer preferences means I can accurately price your home, market it effectively, and attract serious, qualified buyers who are ready to make competitive offers.
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
              Ready to Sell Your {cityName} Home?
            </h2>
            <p className={`text-xl ${textSecondary} mb-8 leading-relaxed max-w-3xl mx-auto`}>
              Let's discuss your home sale goals and create a winning strategy. Contact me today for a free, no-obligation home valuation and personalized marketing plan.
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
                Explore {cityName} Listings
              </Link>
            </div>
          </div>
        </section>

        {/* Additional Links */}
        <section className="text-center">
          <div className="inline-flex flex-wrap gap-4 justify-center">
            <Link
              href={`/neighborhoods/${cityId}/buy`}
              className={`${textSecondary} hover:${textPrimary} underline text-lg`}
            >
              Looking to Buy in {cityName}?
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
