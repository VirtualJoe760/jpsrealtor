import { getAgentProfile } from "@/lib/chatrealty";

export const dynamic = "force-dynamic";

export const metadata = { title: "About" };

export default async function AboutPage() {
  const agent = await getAgentProfile();

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center gap-5">
        {agent.headshot ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={agent.headshot}
            alt={agent.name || "Agent"}
            className="h-24 w-24 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-brand text-3xl font-bold text-white">
            {(agent.name || "A").slice(0, 1)}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{agent.name || "Your Agent"}</h1>
          {agent.headline && <p className="text-gray-600">{agent.headline}</p>}
          {agent.brokerageName && (
            <p className="mt-1 text-sm text-gray-500">{agent.brokerageName}</p>
          )}
          {agent.licenseNumber && (
            <p className="text-xs text-gray-400">{agent.licenseNumber}</p>
          )}
        </div>
      </div>

      {agent.bio && <p className="mt-8 leading-relaxed text-gray-700">{agent.bio}</p>}

      {agent.serviceAreas.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Service areas
          </h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {agent.serviceAreas.map((a) => (
              <span
                key={a.name}
                className="rounded-full border border-gray-200 bg-white px-3 py-1 text-sm text-gray-700"
              >
                {a.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {agent.specializations.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Specializations
          </h2>
          <p className="mt-2 text-gray-700">{agent.specializations.join(" · ")}</p>
        </div>
      )}

      <div className="mt-10 rounded-xl bg-brand px-6 py-8 text-center text-white">
        <p className="text-lg font-semibold">Ready to talk real estate?</p>
        <a
          href="/contact"
          className="mt-4 inline-block rounded-lg bg-white px-6 py-2.5 text-sm font-semibold text-brand"
        >
          Get in touch
        </a>
      </div>
    </div>
  );
}
