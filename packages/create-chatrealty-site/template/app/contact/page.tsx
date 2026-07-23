import { getAgentProfile } from "@/lib/chatrealty";
import InquiryForm from "@/components/InquiryForm";

export const dynamic = "force-dynamic";

export const metadata = { title: "Contact" };

export default async function ContactPage() {
  const agent = await getAgentProfile();

  return (
    <div className="mx-auto grid max-w-4xl gap-10 md:grid-cols-2">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Contact {agent.name || "us"}</h1>
        <p className="mt-2 text-gray-600">
          Questions about a listing, a neighborhood, or the market? Send a note —
          it goes straight to {agent.name ? agent.name.split(" ")[0] : "your agent"}.
        </p>
        <div className="mt-6 space-y-2 text-sm text-gray-700">
          {agent.phone && <p><span className="font-medium">Phone:</span> {agent.phone}</p>}
          {agent.email && <p><span className="font-medium">Email:</span> {agent.email}</p>}
          {agent.brokerageName && (
            <p><span className="font-medium">Brokerage:</span> {agent.brokerageName}</p>
          )}
          {agent.licenseNumber && <p className="text-gray-400">{agent.licenseNumber}</p>}
        </div>
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <InquiryForm source="contact-page" />
      </div>
    </div>
  );
}
