// src/lib/reso/web-api/filter-to-mongo.ts
//
// OData $filter → Mongo query for `unified_listings`. Parsing is RESO's own
// parser (@reso-standards/odata-expression-parser, the one their reference
// server uses); the walk below is ours, because our storage differs from
// theirs in one way that matters: dates and timestamps are ISO STRINGS.
//
// Why string comparison is correct here: every stored timestamp is exactly
// `YYYY-MM-DDTHH:MM:SSZ` and every date field starts `YYYY-MM-DD` (probed
// 2026-10-29), so lexical order is chronological. Literals are normalized to
// that same shape before comparing. Mongo comparison operators are also
// type-bracketed — `{$gt: "2020"}` only matches strings — so null/missing
// values never sneak into a range.
//
// `ne` excludes null, matching SQL three-valued logic (and RESO's reference
// server): `ListPrice ne 5` must not return listings with no price.

import { parseFilter, type FilterExpression } from "@reso-standards/odata-expression-parser";

import { badRequest, notImplemented } from "./errors";
import type { ResoWebField } from "./fields";

export type MongoQuery = Record<string, unknown>;

type Comparison = Extract<FilterExpression, { type: "comparison" }>;
type Op = "eq" | "ne" | "gt" | "ge" | "lt" | "le";

const FLIP: Record<Op, Op> = { eq: "eq", ne: "ne", gt: "lt", ge: "le", lt: "gt", le: "ge" };
const MONGO_OP: Record<Exclude<Op, "eq" | "ne">, string> = { gt: "$gt", ge: "$gte", lt: "$lt", le: "$lte" };

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** `YYYY-MM-DDTHH:MM:SSZ` — the one stored timestamp shape. */
function fmtSecond(ms: number): string {
  return new Date(ms).toISOString().replace(/\.\d{3}Z$/, "Z");
}

function nextDay(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** A literal's value as the field's stored type, or a 400. */
type Scalar = string | number | boolean | null;

function nullQuery(path: string, op: Op): MongoQuery {
  if (op === "eq") return { [path]: null };
  if (op === "ne") return { [path]: { $ne: null } };
  throw badRequest(`Operator '${op}' cannot compare against null`, path);
}

function plainCompare(path: string, op: Op, value: Scalar): MongoQuery {
  if (op === "eq") return { [path]: value };
  if (op === "ne") return { [path]: { $nin: [value, null] } };
  return { [path]: { [MONGO_OP[op]]: value } };
}

/** Edm.Date over a `YYYY-MM-DD…` string: compare whole days as half-open ranges. */
function dateCompare(path: string, op: Op, date: string): MongoQuery {
  const next = nextDay(date);
  switch (op) {
    case "eq": return { [path]: { $gte: date, $lt: next } };
    case "ne": return { $or: [{ [path]: { $lt: date } }, { [path]: { $gte: next } }] };
    case "gt": return { [path]: { $gte: next } };
    case "ge": return { [path]: { $gte: date } };
    case "lt": return { [path]: { $lt: date } };
    case "le": return { [path]: { $lt: next } };
  }
}

/**
 * Edm.DateTimeOffset over whole-second strings. A literal with a fraction
 * (`…:00.5Z`) or an offset is converted to UTC; a fraction can never equal a
 * stored whole second, so the bound rounds to the nearest whole second that
 * keeps the comparison exact.
 */
function timestampCompare(path: string, op: Op, ms: number): MongoQuery {
  const whole = ms % 1000 === 0;
  const floor = fmtSecond(Math.floor(ms / 1000) * 1000);
  if (whole) {
    if (op === "eq") return { [path]: floor };
    if (op === "ne") return { [path]: { $type: "string", $ne: floor } };
    return { [path]: { [MONGO_OP[op]]: floor } };
  }
  switch (op) {
    case "eq": return { [path]: { $in: [] } };
    case "ne": return { [path]: { $type: "string" } };
    case "gt": case "ge": return { [path]: { $gt: floor } };
    case "lt": case "le": return { [path]: { $lte: floor } };
  }
}

export function filterToMongo(filter: string, fields: Map<string, ResoWebField>): MongoQuery {
  let ast: FilterExpression;
  try {
    ast = parseFilter(filter);
  } catch (e) {
    throw badRequest(`Invalid $filter: ${(e as Error).message}`, "$filter");
  }

  const field = (expr: FilterExpression): ResoWebField => {
    if (expr.type !== "property") throw notImplemented("Only a field may be compared against a value", "$filter");
    const f = fields.get(expr.name);
    if (!f) throw badRequest(`Unknown field '${expr.name}'`, "$filter");
    return f;
  };

  const isValue = (e: FilterExpression) =>
    e.type === "literal" || (e.type === "function" && e.name === "now");

  /** Coerce one literal (or now()) to what's stored for `f`. Returns ms for timestamps. */
  const coerce = (f: ResoWebField, e: FilterExpression): Scalar | { ms: number } => {
    if (e.type === "function" && e.name === "now") {
      if (f.stored !== "isoTimestamp") throw badRequest(`now() compares only with a DateTimeOffset, not ${f.name}`, "$filter");
      return { ms: Date.now() };
    }
    if (e.type !== "literal") throw notImplemented("Unsupported comparison operand", "$filter");
    if (e.value === null) return null;
    switch (f.stored) {
      case "number":
        if (typeof e.value !== "number") throw badRequest(`${f.name} is numeric`, "$filter");
        return e.value;
      case "boolean":
        if (typeof e.value !== "boolean") throw badRequest(`${f.name} is Boolean`, "$filter");
        return e.value;
      case "string": {
        if (e.dataType === "enum") {
          // Namespace'Value' → Value (we serve string-mode enumerations).
          const m = /'(.*)'$/.exec(String(e.value));
          if (m) return m[1].replace(/''/g, "'");
        }
        if (typeof e.value !== "string" || e.dataType !== "string") throw badRequest(`${f.name} is a string`, "$filter");
        return e.value;
      }
      case "isoDatePrefix":
        if (e.dataType !== "date") throw badRequest(`${f.name} is an Edm.Date (yyyy-mm-dd)`, "$filter");
        return String(e.value);
      case "isoTimestamp": {
        if (e.dataType !== "datetimeoffset") throw badRequest(`${f.name} is an Edm.DateTimeOffset`, "$filter");
        const ms = Date.parse(String(e.value));
        if (Number.isNaN(ms)) throw badRequest(`Invalid DateTimeOffset '${e.value}'`, "$filter");
        return { ms };
      }
    }
  };

  const compareOne = (f: ResoWebField, op: Op, value: Scalar | { ms: number }): MongoQuery => {
    if (value === null) return nullQuery(f.source, op);
    if (typeof value === "object") return timestampCompare(f.source, op, value.ms);
    if (f.stored === "isoDatePrefix") return dateCompare(f.source, op, value as string);
    return plainCompare(f.source, op, value);
  };

  const comparison = (expr: Comparison): MongoQuery => {
    const { operator } = expr;
    if (operator === "has") throw notImplemented("'has' needs flag enumerations; this server uses string enumerations", "$filter");

    if (operator === "in") {
      const f = field(expr.left);
      if (expr.right.type !== "collection") throw badRequest("'in' needs a list: Field in ('a','b')", "$filter");
      const values = expr.right.items.map((i) => coerce(f, i));
      if (f.stored === "isoDatePrefix" || f.stored === "isoTimestamp") {
        return { $or: values.map((v) => compareOne(f, "eq", v)) };
      }
      return { [f.source]: { $in: values } };
    }

    // Field op value, or value op Field (flipped).
    let op = operator as Op;
    let left = expr.left;
    let right = expr.right;
    if (isValue(left) && right.type === "property") {
      [left, right] = [right, left];
      op = FLIP[op];
    }
    if (left.type !== "property" || !isValue(right)) {
      throw notImplemented("Only 'Field op value' comparisons are supported", "$filter");
    }
    const f = field(left);
    return compareOne(f, op, coerce(f, right));
  };

  const walk = (expr: FilterExpression): MongoQuery => {
    switch (expr.type) {
      case "comparison":
        return comparison(expr);
      case "logical":
        return { [expr.operator === "and" ? "$and" : "$or"]: [walk(expr.left), walk(expr.right)] };
      case "not":
        return { $nor: [walk(expr.operand)] };
      case "function": {
        const [a, b] = expr.args;
        if (expr.name === "contains" || expr.name === "startswith" || expr.name === "endswith") {
          const f = field(a!);
          if (f.stored !== "string") throw badRequest(`${expr.name}() needs a string field`, "$filter");
          if (b?.type !== "literal" || typeof b.value !== "string") throw badRequest(`${expr.name}() needs a string literal`, "$filter");
          const v = escapeRegex(b.value);
          const re = expr.name === "contains" ? v : expr.name === "startswith" ? `^${v}` : `${v}$`;
          return { [f.source]: { $regex: re } };
        }
        throw notImplemented(`Function '${expr.name}' is not supported in $filter`, "$filter");
      }
      case "lambda":
        throw badRequest("any()/all() need a collection field; none is declared", "$filter");
      case "literal":
        if (expr.value === true) return {};
        if (expr.value === false) return { _id: { $in: [] } };
        throw badRequest("A $filter must be a Boolean expression", "$filter");
      default:
        throw badRequest(`Unsupported $filter expression (${expr.type})`, "$filter");
    }
  };

  return walk(ast);
}
