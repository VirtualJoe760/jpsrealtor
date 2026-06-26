// src/lib/tenant/custom-fields.ts
//
// Agent 17 — the per-tenant custom-field registry + the `extras` filter helper
// (Spec 4 Task C — build_plan §4 / §6.4).
//
// WHAT THIS IS. A tenant may declare custom fields beyond the core RESO Data
// Dictionary (Agent 03). Those fields are stored in the listing's `extras` JSONB
// blob and catalogued in the per-tenant `custom_field_registry` table (shipped
// by `0001_init.sql`, Agent 04; Drizzle shape in `schema/contacts.ts`, Agent 09).
// This module is the ONLY place that table is written/read and the ONLY place a
// custom-field name is validated.
//
// THE TWO HARD INVARIANTS (build_plan §7 risk row "Custom-field shadows core
// RESO column / SQL injection via extras"):
//
//   1. A custom field MUST NEVER shadow a core RESO column. `registerCustomField`
//      rejects any `name` that resolves to a core Property/Member/Office/Media
//      field in the data dictionary (by camelCase name, PascalCase resoName, OR
//      snake_case pgColumn) — otherwise an `extras->>'x'` predicate could collide
//      with / be confused for a real typed column.
//
//   2. The field name MUST be a safe Postgres/JSON identifier. We enforce
//      `^[a-z_][a-z0-9_]*$` (lowercase, starts with a letter/underscore) so the
//      name can never carry a quote, a paren, or whitespace — it is the only part
//      of an `extras` predicate that is ever embedded into SQL text (the VALUE is
//      always a bound parameter). This is the anti-injection gate.
//
// TENANT SCOPING (build_plan §3.3). This module NEVER opens a connection. It
// operates through an INJECTED handle (`TenantDb`) — the per-tenant `DbAdapter`
// returned by the keystone resolver, or any object exposing the same
// `query<T>(sql, params)` raw runner. There is no module-level `db`, no
// `new Pool()`, no `dbConnect()` here. Tests pass a stubbed `TenantDb`; live code
// passes a real `DbAdapter`.
//
// PARAMETERIZATION (build_plan §6.4 gotcha). `extrasFilterClause` returns a
// `{ text, params }` pair where the comparison VALUE is a bound positional
// parameter (`$N`) — never string-interpolated — and the operator comes from a
// fixed allow-list, never from caller input verbatim. The `extras` key is the
// validated identifier above, embedded as a single-quoted JSON path key.

import {
  RESOURCE_NAMES,
  getField,
  type ResoResource,
} from "../reso/data-dictionary.ts";

// -----------------------------------------------------------------------------
// The injected tenant DB handle (the ONLY seam — no global connection, §3.3)
// -----------------------------------------------------------------------------
//
// A minimal structural type satisfied by the keystone's `DbAdapter` (its
// `query<T>(sql, params)` raw runner — see `src/lib/db/adapter.ts`). Typing the
// dependency this narrowly keeps the registry unit-testable with a tiny stub and
// makes a global connection structurally impossible to reach from here.

export interface TenantDb {
  /**
   * Run a parameterized statement with positional (`$1`, `$2`, …) params and
   * return its rows. Params are ALWAYS bound, never interpolated. This is exactly
   * the `DbAdapter.query` contract (Agent 01).
   */
  query<T = unknown>(sql: string, params?: readonly unknown[]): Promise<T[]>;
}

// -----------------------------------------------------------------------------
// Field types + the public registration shape
// -----------------------------------------------------------------------------

/** The declared TS/JSON type of a custom field's `extras` value. */
export type CustomFieldType = "string" | "number" | "boolean" | "enum";

const CUSTOM_FIELD_TYPES: ReadonlySet<string> = new Set([
  "string",
  "number",
  "boolean",
  "enum",
]);

/** Input to `registerCustomField`. */
export interface RegisterCustomFieldInput {
  /** camelCase/snake_case field name. Validated `^[a-z_][a-z0-9_]*$`. */
  readonly name: string;
  /** Declared type. `enum` requires non-empty `enumValues`. */
  readonly type: CustomFieldType;
  /** Human label (surfaced in discovery/UIs). Optional. */
  readonly label?: string;
  /** Whether the field is queryable (joins the searchable field set). */
  readonly searchable?: boolean;
  /** Allowed values — REQUIRED and non-empty iff `type === "enum"`. */
  readonly enumValues?: readonly string[];
  /**
   * Which RESO resource the field hangs off. Defaults to "Property" (the only
   * resource with an `extras` filter surface today). Shadowing is checked
   * against this resource's core fields.
   */
  readonly resource?: ResoResource;
}

/** A row of the `custom_field_registry` table (snake_case → camelCase). */
export interface CustomFieldRecord {
  readonly resource: ResoResource;
  readonly name: string;
  readonly type: CustomFieldType;
  readonly label: string | null;
  readonly searchable: boolean;
  readonly enumValues: readonly string[] | null;
}

// -----------------------------------------------------------------------------
// Validation
// -----------------------------------------------------------------------------
//
// The identifier gate is the anti-injection boundary: the name is the only piece
// of a custom-field predicate that is ever embedded in SQL text. Keep it to a
// conservative snake/lower identifier so it can never carry a quote or paren.

/** Anti-injection: lowercase identifier, starts with letter/underscore. */
export const CUSTOM_FIELD_NAME_RE = /^[a-z_][a-z0-9_]*$/;

/** A name length cap (defensive; jsonb keys can be long, but registry names stay short). */
const MAX_NAME_LEN = 63;

export class CustomFieldError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "CustomFieldError";
    this.code = code;
  }
}

/**
 * Validate a custom-field name: it must (a) be a safe identifier and (b) NOT
 * shadow any core RESO column on the target resource (checked across all three
 * casings via `getField`). Returns nothing on success; throws `CustomFieldError`
 * on rejection.
 */
export function validateCustomFieldName(
  name: string,
  resource: ResoResource = "Property",
): void {
  if (typeof name !== "string" || name.length === 0) {
    throw new CustomFieldError("invalid_name", "Custom field name is required.");
  }
  if (name.length > MAX_NAME_LEN) {
    throw new CustomFieldError(
      "invalid_name",
      `Custom field name exceeds ${MAX_NAME_LEN} characters.`,
    );
  }
  if (!CUSTOM_FIELD_NAME_RE.test(name)) {
    throw new CustomFieldError(
      "invalid_name",
      `Custom field name "${name}" is not a valid identifier (must match ${CUSTOM_FIELD_NAME_RE}).`,
    );
  }
  // Shadowing check: reject if the name collides with a core field on the target
  // resource by ANY casing (camelCase name / PascalCase resoName / snake_case
  // pgColumn). `getField` resolves all three.
  if (getField(resource, name)) {
    throw new CustomFieldError(
      "shadows_core_field",
      `Custom field name "${name}" shadows a core RESO ${resource} column.`,
    );
  }
}

/**
 * True iff `name` would shadow a core RESO field on ANY resource (a broader,
 * boolean-returning check used by discovery/preview before a write). The
 * registration path uses the throwing `validateCustomFieldName` against the
 * single target resource.
 */
export function shadowsCoreField(name: string): boolean {
  return RESOURCE_NAMES.some((r) => getField(r, name) !== undefined);
}

// -----------------------------------------------------------------------------
// registerCustomField — upsert into custom_field_registry
// -----------------------------------------------------------------------------

/**
 * Register (upsert) a custom field for the tenant.
 *
 * Rejects (throwing `CustomFieldError`):
 *   • a name that shadows a core RESO column on the target resource,
 *   • a name that is not a valid identifier (`^[a-z_][a-z0-9_]*$`),
 *   • an `enum` field with no `enumValues`.
 *
 * On success it UPSERTS into `custom_field_registry` on the `(resource, name)`
 * unique key (so re-registering the same name updates type/label/searchable
 * rather than erroring) and returns the stored record.
 *
 * The write is parameterized: every value is a bound `$N` param; `enum_values`
 * is sent as JSON text cast to jsonb.
 */
export async function registerCustomField(
  db: TenantDb,
  input: RegisterCustomFieldInput,
): Promise<CustomFieldRecord> {
  const resource: ResoResource = input.resource ?? "Property";

  if (!CUSTOM_FIELD_TYPES.has(input.type)) {
    throw new CustomFieldError("invalid_type", `Unknown custom field type "${input.type}".`);
  }

  // Name validation (identifier shape + core-field shadowing). Throws on reject.
  validateCustomFieldName(input.name, resource);

  // enum fields MUST carry a non-empty enumValues set.
  let enumValues: readonly string[] | null = null;
  if (input.type === "enum") {
    if (!Array.isArray(input.enumValues) || input.enumValues.length === 0) {
      throw new CustomFieldError(
        "enum_values_required",
        `Custom field "${input.name}" is an enum and requires a non-empty enumValues list.`,
      );
    }
    enumValues = input.enumValues;
  }

  const searchable = input.searchable === true;
  const label = input.label ?? null;

  // Parameterized upsert on the (resource, name) unique key. enum_values is bound
  // as JSON text and cast to jsonb (NULL when not an enum).
  const enumJson = enumValues ? JSON.stringify(enumValues) : null;

  const rows = await db.query<RegistryDbRow>(
    `INSERT INTO custom_field_registry (resource, name, field_type, label, searchable, enum_values)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)
     ON CONFLICT (resource, name) DO UPDATE SET
       field_type = EXCLUDED.field_type,
       label = EXCLUDED.label,
       searchable = EXCLUDED.searchable,
       enum_values = EXCLUDED.enum_values
     RETURNING resource, name, field_type, label, searchable, enum_values`,
    [resource, input.name, input.type, label, searchable, enumJson],
  );

  const row = rows[0];
  if (!row) {
    throw new CustomFieldError("write_failed", "Custom field upsert returned no row.");
  }
  return toRecord(row);
}

// -----------------------------------------------------------------------------
// listCustomFields / getSearchableCustomFields
// -----------------------------------------------------------------------------

/** List ALL registered custom fields (default resource "Property" unless `all`). */
export async function listCustomFields(
  db: TenantDb,
  resource: ResoResource | "all" = "Property",
): Promise<CustomFieldRecord[]> {
  const rows =
    resource === "all"
      ? await db.query<RegistryDbRow>(
          `SELECT resource, name, field_type, label, searchable, enum_values
           FROM custom_field_registry ORDER BY resource, name`,
        )
      : await db.query<RegistryDbRow>(
          `SELECT resource, name, field_type, label, searchable, enum_values
           FROM custom_field_registry WHERE resource = $1 ORDER BY name`,
          [resource],
        );
  return rows.map(toRecord);
}

/** Only the `searchable` custom fields — the set the OData layer may filter on. */
export async function getSearchableCustomFields(
  db: TenantDb,
  resource: ResoResource | "all" = "Property",
): Promise<CustomFieldRecord[]> {
  const rows =
    resource === "all"
      ? await db.query<RegistryDbRow>(
          `SELECT resource, name, field_type, label, searchable, enum_values
           FROM custom_field_registry WHERE searchable = true ORDER BY resource, name`,
        )
      : await db.query<RegistryDbRow>(
          `SELECT resource, name, field_type, label, searchable, enum_values
           FROM custom_field_registry WHERE searchable = true AND resource = $1 ORDER BY name`,
          [resource],
        );
  return rows.map(toRecord);
}

// -----------------------------------------------------------------------------
// extrasFilterClause — a PARAMETERIZED jsonb predicate
// -----------------------------------------------------------------------------
//
// Builds an `extras->>'name' <op> $N` predicate where the VALUE is a bound
// parameter and the OPERATOR is drawn from a fixed allow-list. The key is the
// validated identifier (re-validated here so the helper is safe even if called
// directly). The placeholder index is caller-controlled (`paramIndex`) so the
// clause can be spliced into a larger statement's `$N` sequence.
//
// Numeric/boolean comparisons cast the jsonb text accessor so `>=`/`<=` order
// correctly instead of comparing lexically:
//   • number  → (extras->>'name')::numeric <op> $N
//   • boolean → (extras->>'name')::boolean  <op> $N   (only eq/ne are meaningful)
//   • string  → extras->>'name' <op> $N

/** The comparison operators the `extras` filter supports (OData subset). */
export type ExtrasFilterOp = "eq" | "ne" | "gt" | "ge" | "lt" | "le";

const OP_SQL: Readonly<Record<ExtrasFilterOp, string>> = {
  eq: "=",
  ne: "<>",
  gt: ">",
  ge: ">=",
  lt: "<",
  le: "<=",
};

/** Cast a value into a JS primitive and pick the matching jsonb accessor cast. */
type ExtrasValueKind = "string" | "number" | "boolean";

function kindOf(value: string | number | boolean): ExtrasValueKind {
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  return "string";
}

/** A parameterized SQL fragment: the predicate text + the single bound param. */
export interface ExtrasClause {
  /** SQL predicate text with one `$N` placeholder for the value. */
  readonly text: string;
  /** The single bound parameter (the comparison value, JS-typed). */
  readonly params: readonly [string | number | boolean];
  /** The next free positional-parameter index after this clause. */
  readonly nextParamIndex: number;
}

/**
 * Build a parameterized `extras` predicate for `name <op> value`.
 *
 * @param name        Registered custom-field name — re-validated as a safe
 *                    identifier; throws `CustomFieldError` on a bad name (the
 *                    name is the only token embedded in SQL text).
 * @param op          One of `eq|ne|gt|ge|lt|le`. Mapped through a fixed table;
 *                    an unknown op throws (never embedded verbatim).
 * @param value       The comparison value. Bound as `$paramIndex` — NEVER
 *                    interpolated.
 * @param paramIndex  The positional placeholder number to emit (default 1).
 *
 * Returns `{ text, params, nextParamIndex }`. The caller binds `params` at the
 * matching position when it runs the statement via `db.query(text, params)`.
 */
export function extrasFilterClause(
  name: string,
  op: ExtrasFilterOp,
  value: string | number | boolean,
  paramIndex = 1,
): ExtrasClause {
  // Re-validate the identifier here — defense in depth. The name is embedded as a
  // single-quoted jsonb key; only a safe identifier may reach SQL text.
  if (typeof name !== "string" || !CUSTOM_FIELD_NAME_RE.test(name)) {
    throw new CustomFieldError(
      "invalid_name",
      `extrasFilterClause: "${name}" is not a valid identifier.`,
    );
  }
  const sqlOp = OP_SQL[op];
  if (!sqlOp) {
    throw new CustomFieldError("invalid_op", `extrasFilterClause: unknown operator "${op}".`);
  }
  if (!Number.isInteger(paramIndex) || paramIndex < 1) {
    throw new CustomFieldError(
      "invalid_param_index",
      `extrasFilterClause: paramIndex must be a positive integer (got ${paramIndex}).`,
    );
  }

  const kind = kindOf(value);
  // The key is a validated identifier, so single-quoting it is injection-safe.
  const keyRef = `extras->>'${name}'`;
  const placeholder = `$${paramIndex}`;

  let text: string;
  switch (kind) {
    case "number":
      text = `(${keyRef})::numeric ${sqlOp} ${placeholder}`;
      break;
    case "boolean":
      text = `(${keyRef})::boolean ${sqlOp} ${placeholder}`;
      break;
    case "string":
    default:
      text = `${keyRef} ${sqlOp} ${placeholder}`;
      break;
  }

  return { text, params: [value], nextParamIndex: paramIndex + 1 };
}

// -----------------------------------------------------------------------------
// Row mapping
// -----------------------------------------------------------------------------

/** The raw snake_case row shape `custom_field_registry` SELECTs return. */
interface RegistryDbRow {
  readonly resource: string;
  readonly name: string;
  readonly field_type: string;
  readonly label: string | null;
  readonly searchable: boolean;
  /** jsonb — driver hands back a parsed array (or null), or a JSON string. */
  readonly enum_values: unknown;
}

function toRecord(row: RegistryDbRow): CustomFieldRecord {
  return {
    resource: row.resource as ResoResource,
    name: row.name,
    type: row.field_type as CustomFieldType,
    label: row.label ?? null,
    searchable: row.searchable === true,
    enumValues: parseEnumValues(row.enum_values),
  };
}

/** jsonb may arrive as a parsed array (node-postgres) or a JSON string. */
function parseEnumValues(raw: unknown): readonly string[] | null {
  if (raw == null) return null;
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.map(String) : null;
    } catch {
      return null;
    }
  }
  return null;
}
