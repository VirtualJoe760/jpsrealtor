// Windowed pagination: never render one button per page.
//
// A 20-page list emitted 20 buttons, which overflowed the viewport on
// mobile and pushed the page horizontally. This returns a compact run —
// first page, a window around the current page, last page — with "…"
// markers where pages were skipped.
//
//   getPageWindow(1, 12)  → [1, 2, 3, "…", 12]
//   getPageWindow(6, 12)  → [1, "…", 5, 6, 7, "…", 12]
//   getPageWindow(12, 12) → [1, "…", 10, 11, 12]
//   getPageWindow(2, 3)   → [1, 2, 3]          (no gaps to collapse)

export type PageItem = number | "ellipsis";

export function getPageWindow(
  current: number,
  total: number,
  /** Pages shown on each side of the current page. 1 keeps it phone-safe. */
  siblings = 1
): PageItem[] {
  if (total <= 1) return total === 1 ? [1] : [];

  // first + last + current + 2 ellipses + siblings on both sides
  const maxSlots = siblings * 2 + 5;
  if (total <= maxSlots) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const left = Math.max(current - siblings, 1);
  const right = Math.min(current + siblings, total);

  const items: PageItem[] = [1];
  if (left > 2) items.push("ellipsis");

  for (let p = Math.max(left, 2); p <= Math.min(right, total - 1); p++) {
    items.push(p);
  }

  if (right < total - 1) items.push("ellipsis");
  items.push(total);

  return items;
}
