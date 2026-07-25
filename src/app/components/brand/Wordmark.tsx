// The ChatRealty wordmark — "The Two-Weight Wordmark" (from the identity
// exploration artifact, sans the period per Joseph). No symbol: the brand is
// the typography. CHAT set thin (Jost 200), REALTY set medium (Jost 500),
// uppercase with wide tracking.
//
// Rendered as TEXT, not an image: pixel-crisp at every size and theme-aware
// for free (inherits the surrounding text color). `compact` renders the lone
// thin C monogram for collapsed/tight contexts.
//
// Optical corrections: letter-spacing adds a phantom 0.3em AFTER the final
// glyph (the span's box is wider than the visible text), so we pull it back
// with a negative right margin — without this the mark never looks centered.
// The slight translateY centers the uppercase cap-height optically inside
// flex rows.

export default function Wordmark({
  className = "",
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <span
      className={`inline-block select-none whitespace-nowrap uppercase leading-none ${className}`}
      style={{
        fontFamily: "'Jost', system-ui, sans-serif",
        letterSpacing: "0.3em",
        marginRight: "-0.3em",
        transform: "translateY(0.05em)",
      }}
      aria-label="ChatRealty"
    >
      {compact ? (
        <span style={{ fontWeight: 200 }}>C</span>
      ) : (
        <>
          <span style={{ fontWeight: 200 }}>Chat</span>
          <span style={{ fontWeight: 500 }}>Realty</span>
        </>
      )}
    </span>
  );
}
