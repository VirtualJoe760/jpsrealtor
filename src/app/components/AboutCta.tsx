import { HomeIcon, KeyIcon, ShoppingBagIcon } from "@heroicons/react/20/solid";
import Link from "next/link";

const cards = [
  {
    name: "About Me",
    description:
      "Get to know me—my journey, expertise, and unwavering dedication to helping you succeed in the real estate market.",
    icon: HomeIcon,
    href: "/about",
    image: "/misc/about-cta-1.png",
  },
  {
    name: "Buying",
    description:
      "Let me guide you through buying your dream home. Together, we’ll make the process seamless, exciting, and rewarding.",
    icon: KeyIcon,
    href: "/insights/real-estate-tips/ultimate-buyers-guide-coachella-valley",
    image: "/misc/buying.jpeg",
  },
  {
    name: "Selling",
    description:
      "Selling your property? I’ll help you navigate the market, maximize value, and achieve the best results, stress-free.",
    icon: ShoppingBagIcon,
    href: "insights/real-estate-tips/ultimate-sellers-guide-coachella-valley",
    image: "/misc/about-cta-3.png",
  },
];

export default function AboutCta() {
  return (
    <div className="relative isolate overflow-hidden bg-black py-12 sm:py-12">
      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:mx-0">
          <h2 className="text-5xl mt-2 font-semibold tracking-tight text-white sm:text-5xl">
            Joseph Sardella
          </h2>
          <p className="text-2xl mt-2 tracking-tight text-white sm:text-5xl">
            Coachella Valley Realtor
          </p>
          <p className="text-xl mt-2 tracking-tight text-white sm:text-5xl">
            eXp Realty | DRE# 02106916
          </p>
          <p className="mt-8 text-lg font-medium text-gray-200 sm:text-xl">
          Whether you&apos;re looking to buy your dream home, sell your property for maximum value, or simply explore the possibilities within the real estate market, I&apos;m here to guide you with expert advice and unwavering support. My goal is to ensure every step of the process is smooth, informed, and tailored to meet your unique needs.
          </p>
        </div>

        {/* Cards */}
        <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-6 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-3 lg:gap-8">
          {cards.map((card) => (
            <div
              key={card.name}
              className="relative flex flex-col gap-y-4 rounded-xl p-6 ring-1 ring-inset ring-white/10 transition group"
              style={{
                backgroundImage: `url(${card.image})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              {/* Overlay */}
              <div className="absolute inset-0 bg-black/60 group-hover:bg-black/80 transition-opacity rounded-xl" />

              {/* Card Content */}
              <div className="relative z-10">
                <card.icon aria-hidden="true" className="h-8 w-8 text-indigo-400" />
                <div>
                  <h3 className="text-2xl font-semibold text-white">{card.name}</h3>
                  <p className="mt-2 text-xl text-gray-300">{card.description}</p>
                </div>
                <Link
                  href={card.href}
                  className="mt-auto inline-block text-indigo-400 font-medium hover:text-indigo-300"
                >
                  Learn More →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
