import type { Metadata } from "next";
import MissionClient from "./MissionClient";

export const metadata: Metadata = {
  alternates: { canonical: "https://www.chatrealty.io/mission" },
  title: { absolute: "Our Mission | ChatRealty" },
  description:
    "ChatRealty brings the CRM, dialer and agent website into one platform built by an agent — the alternative to pay-to-play real estate leads.",
};

export default function MissionPage() {
  return <MissionClient />;
}
