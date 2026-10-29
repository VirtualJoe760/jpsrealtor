// src/lib/reso/web-api/match.ts
//
// Evaluates the Mongo query that filter-to-mongo.ts emits against in-memory
// rows. Used for the Lookup resource, which is small and computed (no
// collection to query). Reusing the same translator keeps one set of OData
// semantics instead of two. Supports exactly the operators the translator
// emits: $and $or $nor $gt $gte $lt $lte $in $nin $ne $regex $type, equality.

type Row = Record<string, unknown>;

const typeBracket = (a: unknown, b: unknown) =>
  typeof a === typeof b && a !== null && b !== null;

function opMatch(value: unknown, op: string, arg: unknown): boolean {
  switch (op) {
    case "$gt": return typeBracket(value, arg) && (value as never) > (arg as never);
    case "$gte": return typeBracket(value, arg) && (value as never) >= (arg as never);
    case "$lt": return typeBracket(value, arg) && (value as never) < (arg as never);
    case "$lte": return typeBracket(value, arg) && (value as never) <= (arg as never);
    case "$ne": return (value ?? null) !== arg;
    case "$in": return (arg as unknown[]).some((v) => (value ?? null) === v);
    case "$nin": return !(arg as unknown[]).some((v) => (value ?? null) === v);
    case "$regex": return typeof value === "string" && new RegExp(arg as string).test(value);
    case "$type": return arg === "string" ? typeof value === "string" : false;
    default: throw new Error(`match: unsupported operator ${op}`);
  }
}

export function matches(row: Row, query: Record<string, unknown>): boolean {
  return Object.entries(query).every(([key, cond]) => {
    if (key === "$and") return (cond as Record<string, unknown>[]).every((q) => matches(row, q));
    if (key === "$or") return (cond as Record<string, unknown>[]).some((q) => matches(row, q));
    if (key === "$nor") return !(cond as Record<string, unknown>[]).some((q) => matches(row, q));
    const value = row[key];
    if (cond !== null && typeof cond === "object" && !Array.isArray(cond)) {
      return Object.entries(cond as Record<string, unknown>).every(([op, arg]) => opMatch(value, op, arg));
    }
    return (value ?? null) === cond;
  });
}
