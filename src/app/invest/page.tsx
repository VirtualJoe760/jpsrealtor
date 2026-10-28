import type { Metadata } from "next";
import InvestClient from "./InvestClient";

export const metadata: Metadata = {
  title: { absolute: "Invest in ChatRealty" },
  description: "ChatRealty's planned pre-seed community round: $3M for 15%. Reserve a non-binding place.",
};

export default function InvestPage() {
  return <InvestClient />;
}
