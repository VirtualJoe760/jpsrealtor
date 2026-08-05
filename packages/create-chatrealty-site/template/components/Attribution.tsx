// IDX display rule: every card and detail view MUST show the listing's source
// attribution — the listing agent and brokerage. Search and detail both carry
// it. Renders nothing when the feed itself has neither name for that listing,
// which is the only case where a blank line is correct — if attribution is
// missing across EVERY card, that is a data problem worth reporting, not a
// styling one.

export default function Attribution({
  agent,
  office,
  className = "",
}: {
  agent?: string | null;
  office?: string | null;
  className?: string;
}) {
  if (!agent && !office) return null;
  const label = [office, agent].filter(Boolean).join(" — ");
  return (
    <p className={`text-[11px] leading-tight text-gray-500 ${className}`}>
      Listed by {label}
    </p>
  );
}
