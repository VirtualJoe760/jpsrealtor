import type { Metadata } from "next";
import PricingClient from "./PricingClient";

export const metadata: Metadata = {
  title: "Pricing | ChatRealty",
  description:
    "Choose the right plan for your real estate business. From free to enterprise, ChatRealty has a plan for every agent.",
  openGraph: {
    title: "Pricing | ChatRealty",
    description:
      "Choose the right plan for your real estate business. From free to enterprise, ChatRealty has a plan for every agent.",
  },
};

export default function PricingPage() {
  return <PricingClient />;
}
