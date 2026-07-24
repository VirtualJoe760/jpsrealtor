// The ChatRealty wordmark — "The Two-Weight Wordmark" (studio pick from the
// identity exploration artifact). No symbol: the brand is the typography.
// CHAT set thin (Jost 200), REALTY set medium (Jost 500), uppercase with wide
// tracking, and a single emerald period as the entire color story.
//
// Rendered as TEXT, not an image: pixel-crisp at every size, and theme-aware
// for free — the letters inherit the surrounding text color while the period
// stays emerald in both themes. `compact` renders the "C." monogram for
// collapsed/tight contexts.

const EMERALD = "#10B981";

export default function Wordmark({
  className = "",
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <span
      className={`select-none whitespace-nowrap uppercase leading-none ${className}`}
      style={{ fontFamily: "'Jost', system-ui, sans-serif", letterSpacing: "0.3em" }}
      aria-label="ChatRealty"
    >
      {compact ? (
        <>
          <span style={{ fontWeight: 200 }}>C</span>
          <span style={{ color: EMERALD, fontWeight: 500, letterSpacing: 0 }}>.</span>
        </>
      ) : (
        <>
          <span style={{ fontWeight: 200 }}>Chat</span>
          <span style={{ fontWeight: 500 }}>Realty</span>
          <span style={{ color: EMERALD, fontWeight: 500, letterSpacing: 0 }}>.</span>
        </>
      )}
    </span>
  );
}
