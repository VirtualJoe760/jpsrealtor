// IDX display rule: every card and detail view MUST show the listing's source
// attribution — the listing agent and brokerage. Renders nothing when absent
// (e.g. a non-tenant/dogfood token whose search rows omit it); the detail page
// always has it.

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
