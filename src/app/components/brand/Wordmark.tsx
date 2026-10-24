// The two-weight wordmark. Defaults to ChatRealty's own; any agent can supply
// their own pair (Brand settings → Nav Wordmark) and get the identical
// treatment — e.g. JPS + REALTOR. The styling is the brand, so it is defined
// once here rather than reimplemented per tenant.
//
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
  thin = "Chat",
  bold = "Realty",
  spaced = false,
}: {
  className?: string;
  compact?: boolean;
  /** First half, set light (Jost 200). */
  thin?: string;
  /** Second half, set medium (Jost 500). */
  bold?: string;
  /**
   * Put a word space between the halves. Brand pairs are set solid
   * (CHATREALTY, JPSREALTOR); a person's name is two words (GENE CRUCEAN).
   */
  spaced?: boolean;
}) {
  const label = spaced && thin && bold ? `${thin} ${bold}` : `${thin}${bold}`;
  return (
    <span
      className={`inline-block select-none whitespace-nowrap uppercase leading-none ${className}`}
      style={{
        fontFamily: "'Jost', system-ui, sans-serif",
        letterSpacing: "0.3em",
        marginRight: "-0.3em",
        transform: "translateY(0.05em)",
      }}
      aria-label={label}
    >
      {compact ? (
        // Collapsed rail: the lone thin initial, whatever the wordmark is.
        <span style={{ fontWeight: 200 }}>{(thin || label).charAt(0)}</span>
      ) : (
        <>
          <span style={{ fontWeight: 200 }}>{thin}</span>
          {spaced && thin && bold ? " " : null}
          <span style={{ fontWeight: 500 }}>{bold}</span>
        </>
      )}
    </span>
  );
}
