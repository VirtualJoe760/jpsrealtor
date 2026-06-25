// src/lib/skill-api/odata/parse.ts
//
// OData query parser for the /api/skill/* REST surface (build_plan Agent 05,
// section 6.6). Parses the OData-style query params into a structured
// `OdataQuery` that the DB adapter's `find(resource, OdataQuery)` consumes.
//
// PURE LOGIC — this file imports NOTHING from Next.js or any DB driver. It is
// the contract everyone else codes against; keep it dependency-free and
// unit-testable.
//
// Supported params:
//   $filter   — AND-only flat grammar (see below). `or`/parentheses rejected.
//   $select   — comma list of field names.
//   $orderby  — comma list of "field [asc|desc]".
//   $top      — non-negative integer (page size).
//   $skip     — non-negative integer (offset).
//   $count    — "true" enables @odata.count in the envelope.
//
// DESIGN — AND-only flat filter grammar (build_plan section 6.6): keeping the
// grammar flat (no `or`, no parentheses, no nested expression tree) makes
// parsing total and injection-safe, and frees the SQL adapter from
// building/walking an expression tree. A filter is a list of comparisons
// joined by " and ".
//
//   <filter>      ::= <comparison> ( " and " <comparison> )*
//   <comparison>  ::= <field> <ws> <operator> <ws> <literal>
//   <operator>    ::= eq | ne | gt | ge | lt | le
//   <literal>     ::= '<string>' | <number> | true | false | null
//
// Unknown fields and malformed filters throw `InvalidOdataError` with the
// offending `param` set (e.g. "$filter"), per the acceptance criteria.

import { InvalidOdataError } from "@/lib/skill-api/errors";

// ---------------------------------------------------------------------------
// Public types — the OdataQuery contract
// ---------------------------------------------------------------------------

/** Comparison operators in the AND-only grammar. */
export type OdataOperator = "eq" | "ne" | "gt" | "ge" | "lt" | "le";

/** A single parsed comparison: `field op value`. */
export interface OdataFilterCondition {
  field: string;
  operator: OdataOperator;
  /** Parsed literal: string, number, boolean, or null. */
  value: string | number | boolean | null;
}

/** Sort direction for an $orderby clause. */
export type OdataSortDir = "asc" | "desc";

/** A single parsed $orderby clause. */
export interface OdataOrderBy {
  field: string;
  direction: OdataSortDir;
}

/**
 * The structured result of parsing an OData query string. Every field is
 * normalized; the adapter never re-parses raw strings.
 */
export interface OdataQuery {
  /** AND-joined comparisons. Empty array = no filter. */
  filter: OdataFilterCondition[];
  /** Selected field names, or null for "all fields". */
  select: string[] | null;
  /** Ordered sort clauses. Empty array = default order. */
  orderby: OdataOrderBy[];
  /** Page size. Defaults applied by the caller; null = unspecified. */
  top: number | null;
  /** Row offset. null = unspecified (treat as 0 downstream). */
  skip: number | null;
  /** True when `$count=true` was passed — emit @odata.count only then. */
  count: boolean;
}

/**
 * The raw input. Accepts either a `URLSearchParams` (typical in a route) or a
 * plain record (convenient for tests). Values are read by `$`-prefixed key.
 */
export type OdataInput = URLSearchParams | Record<string, string | undefined>;

/** Optional constraints — chiefly the allow-list of queryable field names. */
export interface ParseOdataOptions {
  /**
   * The set of field names valid for $filter / $select / $orderby. When
   * provided, any field outside it (case-insensitively) yields an
   * `invalid_odata` error naming the param. When omitted, field names are NOT
   * validated here (the handler validates against its ResourceFieldMap later).
   */
  allowedFields?: Iterable<string>;
  /**
   * Hard ceiling on $top. A request above it is clamped (not rejected) to keep
   * the surface forgiving. Defaults to 200.
   */
  maxTop?: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const OPERATORS: ReadonlySet<string> = new Set([
  "eq",
  "ne",
  "gt",
  "ge",
  "lt",
  "le",
]);

const DEFAULT_MAX_TOP = 200;

// A bare field identifier: letters, digits, underscore, dot (for `extras.x`).
// Anchored so embedded junk is rejected.
const FIELD_RE = /^[A-Za-z_][A-Za-z0-9_.]*$/;

const SINGLE_QUOTE = String.fromCharCode(39); // "'"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getParam(input: OdataInput, key: string): string | undefined {
  if (input instanceof URLSearchParams) {
    const v = input.get(key);
    return v === null ? undefined : v;
  }
  return input[key];
}

function fail(message: string, param: string, details?: Record<string, unknown>): never {
  throw new InvalidOdataError(message, { param, details });
}

/**
 * Build a case-insensitive lookup that maps a lowercased field name back to its
 * canonical spelling, so we both validate and normalize casing in one pass.
 */
function buildFieldLookup(allowed?: Iterable<string>): Map<string, string> | null {
  if (!allowed) return null;
  const map = new Map<string, string>();
  for (const f of allowed) map.set(f.toLowerCase(), f);
  return map;
}

/**
 * Validate (and canonicalize the casing of) a field name. Throws invalid_odata
 * naming `param` when the field is unknown or syntactically invalid.
 */
function resolveField(
  raw: string,
  lookup: Map<string, string> | null,
  param: string
): string {
  const name = raw.trim();
  if (!FIELD_RE.test(name)) {
    fail(`Invalid field name '${raw}' in ${param}.`, param, { field: raw });
  }
  if (!lookup) return name;
  const canonical = lookup.get(name.toLowerCase());
  if (!canonical) {
    fail(`Unknown field '${name}' in ${param}.`, param, { field: name });
  }
  return canonical;
}

/**
 * Parse a single OData literal token into its JS value.
 *   'quoted string'  -> string (single-quotes; '' escapes a literal quote)
 *   123 / 1.5 / -4   -> number
 *   true / false     -> boolean
 *   null             -> null
 */
function parseLiteral(raw: string, param: string): string | number | boolean | null {
  const tok = raw.trim();
  if (tok.length === 0) {
    fail(`Missing value in ${param}.`, param);
  }

  // String literal: single-quoted, OData-style doubled-quote escaping.
  if (tok.startsWith(SINGLE_QUOTE)) {
    if (tok.length < 2 || !tok.endsWith(SINGLE_QUOTE)) {
      fail(`Unterminated string literal in ${param}: ${raw}`, param, { token: raw });
    }
    const inner = tok.slice(1, -1);
    // OData escaping: a literal single-quote is written as two single-quotes.
    // Walk the inner content; every quote MUST be part of a doubled pair.
    let out = "";
    for (let i = 0; i < inner.length; i += 1) {
      const ch = inner[i];
      if (ch === SINGLE_QUOTE) {
        if (inner[i + 1] === SINGLE_QUOTE) {
          out += SINGLE_QUOTE;
          i += 1; // consume the pair
          continue;
        }
        // A lone, un-doubled quote means the literal is malformed.
        fail(`Malformed string literal in ${param}: ${raw}`, param, { token: raw });
      }
      out += ch;
    }
    return out;
  }

  // Keyword literals.
  if (tok === "true") return true;
  if (tok === "false") return false;
  if (tok === "null") return null;

  // Numeric literal (integer or decimal, optional sign). Reject anything else.
  if (/^[+-]?(?:\d+\.\d+|\d+|\.\d+)$/.test(tok)) {
    const n = Number(tok);
    if (Number.isFinite(n)) return n;
  }

  fail(
    `Invalid literal '${raw}' in ${param}. Strings must be single-quoted (e.g. 'Palm Desert').`,
    param,
    { token: raw }
  );
}

// ---------------------------------------------------------------------------
// $filter
// ---------------------------------------------------------------------------

/**
 * Split a $filter on the top-level " and " separator. Because the grammar
 * forbids parentheses and `or`, this is a simple split — but we must NOT split
 * inside a string literal (which may contain the word "and").
 */
function splitConjuncts(filter: string, param: string): string[] {
  const parts: string[] = [];
  let buf = "";
  let inString = false;
  let i = 0;

  while (i < filter.length) {
    const ch = filter[i];

    if (inString) {
      buf += ch;
      if (ch === SINGLE_QUOTE) {
        // Doubled quote = escaped quote, stay in string.
        if (filter[i + 1] === SINGLE_QUOTE) {
          buf += SINGLE_QUOTE;
          i += 2;
          continue;
        }
        inString = false;
      }
      i += 1;
      continue;
    }

    if (ch === SINGLE_QUOTE) {
      inString = true;
      buf += ch;
      i += 1;
      continue;
    }

    // Look for a delimiter " and " at the current position (case-insensitive),
    // bounded by whitespace so we don't clip a field like "brand".
    const rest = filter.slice(i);
    const m = /^\s+and\s+/i.exec(rest);
    if (m) {
      parts.push(buf);
      buf = "";
      i += m[0].length;
      continue;
    }

    buf += ch;
    i += 1;
  }

  if (inString) {
    fail(`Unterminated string literal in ${param}.`, param);
  }

  parts.push(buf);
  return parts;
}

/**
 * Reject the unsupported constructs (`or`, parentheses) with a clear,
 * actionable message BEFORE attempting to parse conjuncts. This keeps the
 * AND-only contract explicit instead of failing with a confusing "unknown
 * field" later. Scans outside string literals only.
 */
function rejectUnsupportedFilter(filter: string, param: string): void {
  let inString = false;
  for (let i = 0; i < filter.length; i += 1) {
    const ch = filter[i];
    if (inString) {
      if (ch === SINGLE_QUOTE) {
        if (filter[i + 1] === SINGLE_QUOTE) {
          i += 1;
          continue;
        }
        inString = false;
      }
      continue;
    }
    if (ch === SINGLE_QUOTE) {
      inString = true;
      continue;
    }
    if (ch === "(" || ch === ")") {
      fail(
        `Parentheses are not supported in ${param}. Use a flat 'A eq 1 and B eq 2' filter (AND-only).`,
        param,
        { construct: ch }
      );
    }
    // Standalone " or " (whitespace-bounded), case-insensitive.
    const prev = filter[i - 1] ?? " ";
    if ((ch === "o" || ch === "O") && /\s/.test(prev)) {
      const m = /^or\s/i.exec(filter.slice(i));
      if (m) {
        fail(
          `'or' is not supported in ${param}. Only AND-joined comparisons are allowed.`,
          param,
          { construct: "or" }
        );
      }
    }
  }
}

function parseFilter(
  raw: string,
  lookup: Map<string, string> | null
): OdataFilterCondition[] {
  const param = "$filter";
  const filter = raw.trim();
  if (filter.length === 0) return [];

  rejectUnsupportedFilter(filter, param);

  const conjuncts = splitConjuncts(filter, param);
  const conditions: OdataFilterCondition[] = [];

  for (const rawConjunct of conjuncts) {
    const conjunct = rawConjunct.trim();
    if (conjunct.length === 0) {
      fail(`Empty comparison in ${param} (a dangling 'and'?).`, param);
    }

    // Tokenize: <field> <op> <rest-as-literal>. Split on the first run of
    // whitespace for the field, then the operator, then the remainder is the
    // literal (which may itself contain spaces inside a quoted string).
    const fieldMatch = /^(\S+)\s+(\S+)\s+([\s\S]+)$/.exec(conjunct);
    if (!fieldMatch) {
      fail(
        `Malformed comparison '${conjunct}' in ${param}. Expected '<field> <op> <value>'.`,
        param,
        { comparison: conjunct }
      );
    }

    const [, rawField, rawOp, rawValue] = fieldMatch;
    const op = rawOp.toLowerCase();
    if (!OPERATORS.has(op)) {
      fail(
        `Unsupported operator '${rawOp}' in ${param}. Allowed: eq, ne, gt, ge, lt, le.`,
        param,
        { operator: rawOp }
      );
    }

    const field = resolveField(rawField, lookup, param);
    const value = parseLiteral(rawValue, param);

    conditions.push({ field, operator: op as OdataOperator, value });
  }

  return conditions;
}

// ---------------------------------------------------------------------------
// $select
// ---------------------------------------------------------------------------

function parseSelect(
  raw: string,
  lookup: Map<string, string> | null
): string[] | null {
  const param = "$select";
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;

  const fields = trimmed
    .split(",")
    .map((f) => f.trim())
    .filter((f) => f.length > 0);

  if (fields.length === 0) return null;

  return fields.map((f) => resolveField(f, lookup, param));
}

// ---------------------------------------------------------------------------
// $orderby
// ---------------------------------------------------------------------------

function parseOrderBy(
  raw: string,
  lookup: Map<string, string> | null
): OdataOrderBy[] {
  const param = "$orderby";
  const trimmed = raw.trim();
  if (trimmed.length === 0) return [];

  const clauses = trimmed
    .split(",")
    .map((c) => c.trim())
    .filter((c) => c.length > 0);

  return clauses.map((clause) => {
    const parts = clause.split(/\s+/);
    if (parts.length > 2) {
      fail(
        `Malformed clause '${clause}' in ${param}. Expected '<field> [asc|desc]'.`,
        param,
        { clause }
      );
    }
    const field = resolveField(parts[0], lookup, param);
    let direction: OdataSortDir = "asc";
    if (parts.length === 2) {
      const dir = parts[1].toLowerCase();
      if (dir !== "asc" && dir !== "desc") {
        fail(
          `Invalid sort direction '${parts[1]}' in ${param}. Use 'asc' or 'desc'.`,
          param,
          { direction: parts[1] }
        );
      }
      direction = dir;
    }
    return { field, direction };
  });
}

// ---------------------------------------------------------------------------
// $top / $skip
// ---------------------------------------------------------------------------

function parseNonNegativeInt(raw: string, param: string): number {
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) {
    fail(
      `${param} must be a non-negative integer (got '${raw}').`,
      param,
      { value: raw }
    );
  }
  const n = Number(trimmed);
  if (!Number.isSafeInteger(n)) {
    fail(`${param} is out of range (got '${raw}').`, param, { value: raw });
  }
  return n;
}

// ---------------------------------------------------------------------------
// $count
// ---------------------------------------------------------------------------

function parseCount(raw: string): boolean {
  const v = raw.trim().toLowerCase();
  if (v === "true") return true;
  if (v === "false" || v === "") return false;
  fail(`$count must be 'true' or 'false' (got '${raw}').`, "$count", { value: raw });
}

// ---------------------------------------------------------------------------
// Top-level parse
// ---------------------------------------------------------------------------

/**
 * Parse an OData query string into a structured, validated `OdataQuery`.
 *
 * Throws `InvalidOdataError` (code `invalid_odata`, with `param` set to the
 * offending query parameter) on any malformed input or unknown field.
 *
 * @example
 *   parseOdata(new URL(req.url).searchParams, { allowedFields: FIELD_MAP });
 */
export function parseOdata(input: OdataInput, opts: ParseOdataOptions = {}): OdataQuery {
  const lookup = buildFieldLookup(opts.allowedFields);
  const maxTop = opts.maxTop ?? DEFAULT_MAX_TOP;

  const rawFilter = getParam(input, "$filter");
  const rawSelect = getParam(input, "$select");
  const rawOrderBy = getParam(input, "$orderby");
  const rawTop = getParam(input, "$top");
  const rawSkip = getParam(input, "$skip");
  const rawCount = getParam(input, "$count");

  const filter = rawFilter !== undefined ? parseFilter(rawFilter, lookup) : [];
  const select = rawSelect !== undefined ? parseSelect(rawSelect, lookup) : null;
  const orderby = rawOrderBy !== undefined ? parseOrderBy(rawOrderBy, lookup) : [];

  let top: number | null = null;
  if (rawTop !== undefined) {
    top = parseNonNegativeInt(rawTop, "$top");
    if (top > maxTop) top = maxTop; // clamp, don't reject
  }

  let skip: number | null = null;
  if (rawSkip !== undefined) {
    skip = parseNonNegativeInt(rawSkip, "$skip");
  }

  const count = rawCount !== undefined ? parseCount(rawCount) : false;

  return { filter, select, orderby, top, skip, count };
}
