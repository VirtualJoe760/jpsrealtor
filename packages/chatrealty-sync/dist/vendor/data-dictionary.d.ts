/** Catalog version. Bump when fields are added/renamed so consumers can gate. */
export declare const DATA_DICTIONARY_VERSION: "2026-06-25.1";
/** The RESO resources this catalog describes. */
export type ResoResource = "Property" | "Member" | "Office" | "Media";
/**
 * The TS-level type of a field's DTO value. This is the abstract type the
 * adapter/DTO uses; `pgType` carries the concrete Postgres column type.
 */
export type ResoFieldType = "string" | "number" | "integer" | "boolean" | "date" | "enum" | "geography" | "json";
/** One field in a resource's catalog. */
export interface ResoField {
    /** camelCase TS/DTO field name (build_plan §3.4). Unique within a resource. */
    readonly name: string;
    /** PascalCase RESO Data Dictionary source name. Hand-mapped, never derived. */
    readonly resoName: string;
    /** snake_case Postgres column name. Hand-mapped, never derived. */
    readonly pgColumn: string;
    /** Concrete Postgres column type (consumed by the DDL generator, Agent 04). */
    readonly pgType: string;
    /** Abstract TS/DTO type. */
    readonly type: ResoFieldType;
    /** Whether the column is nullable. Attribution fields are NOT nullable. */
    readonly nullable: boolean;
    /** Whether the field is REQUIRED on every serving surface (§3.8 attribution). */
    readonly required: boolean;
    /** Whether the column carries an index (or participates in a compound one). */
    readonly indexed: boolean;
    /** Allowed values for an `enum` field. Present iff `type === "enum"`. */
    readonly enumValues?: readonly string[];
    /** One-line human note (surfaced in the generated markdown doc). */
    readonly description?: string;
}
/** A resource: its primary key plus its ordered field catalog. */
export interface ResoResourceDef {
    readonly resource: ResoResource;
    /** Postgres table name (snake_case, singular). */
    readonly table: string;
    /** The `name` of the primary-key field within `fields`. */
    readonly primaryKey: string;
    readonly fields: readonly ResoField[];
}
export declare const RESOURCES: Readonly<Record<ResoResource, ResoResourceDef>>;
/** All resource names, in catalog order. */
export declare const RESOURCE_NAMES: readonly ResoResource[];
/** Return a resource definition, or `undefined` for an unknown resource. */
export declare function getResource(resource: ResoResource): ResoResourceDef | undefined;
/**
 * Resolve a single field by its camelCase `name`, its PascalCase `resoName`, or
 * its snake_case `pgColumn` within a resource. Returns `undefined` on miss.
 *
 * Accepting all three casings is intentional: the sync mapper looks up by
 * `resoName`, the DDL generator by `name`, the OData layer by `resoName`, and
 * raw-SQL consumers by `pgColumn`.
 */
export declare function getField(resource: ResoResource, nameOrResoOrColumn: string): ResoField | undefined;
/** All fields for a resource (empty array for an unknown resource). */
export declare function getFields(resource: ResoResource): readonly ResoField[];
/** The REQUIRED attribution/serving fields for a resource (§3.8). */
export declare function getRequiredFields(resource: ResoResource): readonly ResoField[];
/** The indexed fields for a resource (consumed by the DDL generator). */
export declare function getIndexedFields(resource: ResoResource): readonly ResoField[];
/** Map a PascalCase RESO source name to its camelCase DTO field name. */
export declare function resoNameToFieldName(resource: ResoResource, resoName: string): string | undefined;
/** Map a camelCase DTO field name to its snake_case Postgres column. */
export declare function fieldNameToColumn(resource: ResoResource, name: string): string | undefined;
