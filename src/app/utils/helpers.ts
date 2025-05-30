export function boolRecordToString(input?: Record<string, boolean> | string): string | undefined {
  if (!input) return undefined;
  if (typeof input === "string") return input;
  return Object.entries(input)
    .filter(([_, v]) => v)
    .map(([k]) => k)
    .join(", ");
}
