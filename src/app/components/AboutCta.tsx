import { HomeIcon, KeyIcon, ShoppingBagIcon } from "@heroicons/react/20/solid";
import Link from "next/link";

const cards = [
  {
    name: "About Me",
    description:
      "Learn more about my background, experience, and commitment to helping you achieve your real estate goals.",
    icon: HomeIcon,
    href: "/about",
  },
  {
    name: "Buying",
    description:
      "Discover how I can guide you through the buying process, ensuring a smooth and stress-free experience.",
    icon: KeyIcon,
    href: "/buying",
  },
  {
    name: "Selling",
    description:
      "Get insights on how I can help you list and sell your property efficiently for the best price.",
    icon: ShoppingBagIcon,
    href: "/selling",
  },
];

export default function AboutCta() {
  return (
    <div className="relative isolate overflow-hidden bg-black py-12 sm:py-12">
      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:mx-0">
          <h2 className="text-5xl font-semibold tracking-tight text-white sm:text-5xl">
            Joseph Sardella | eXp Realty | DRE# 02106916
          </h2>
          <p className="mt-8 text-lg font-medium text-gray-400 sm:text-xl">
            Whether you&apos;re buying, selling, or just learning about my services, I&apos;m here to provide expertise and
            support every step of the way.
          </p>
        </div>

        {/* Cards */}
        <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-6 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-3 lg:gap-8">
          {cards.map((card) => (
            <div
              key={card.name}
              className="flex flex-col gap-y-4 rounded-xl bg-white/5 p-6 ring-1 ring-inset ring-white/10 hover:bg-white/10 transition"
            >
              <card.icon aria-hidden="true" className="h-8 w-8 text-indigo-400" />
              <div>
                <h3 className="text-xl font-semibold text-white">{card.name}</h3>
                <p className="mt-2 text-gray-300">{card.description}</p>
              </div>
              <Link
                href={card.href}
                className="mt-auto inline-block text-indigo-400 font-medium hover:text-indigo-300"
              >
                Learn More →
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
