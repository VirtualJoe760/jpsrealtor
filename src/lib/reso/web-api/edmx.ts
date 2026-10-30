// src/lib/reso/web-api/edmx.ts
//
// Builds the CSDL/EDMX `$metadata` document for /api/skill/reso. Follows the
// conventions of RESO's own generator (reso-common `generateEdmx`): namespace
// `org.reso.metadata`, container `Default`, string-mode enumerations
// (Edm.String + `RESO.OData.Metadata.LookupName` annotation), integers as
// Edm.Int64. Matching those keeps `reso-cert` auto-detecting the enum mode
// rather than guessing.
//
// Media is an EntityType reachable only through Property's `Media` navigation
// property — deliberately NOT an EntitySet. Photos are embedded per listing
// (~2M rows); a top-level Media set would invite `reso-cert` to filter and page
// across all of them.

import {
  RESOURCES,
  PROPERTY_NAV_MEDIA,
  type ResoResourceName,
  type ResoWebField,
} from "./fields";

const NS = "org.reso.metadata";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function propertyXml(f: ResoWebField): string {
  const attrs = [`Name="${esc(f.name)}"`, `Type="${f.type}"`];
  if (f.nullable === false) attrs.push('Nullable="false"');
  if (f.type === "Edm.Decimal" && f.precision !== undefined) attrs.push(`Precision="${f.precision}"`);
  if (f.type === "Edm.Decimal" && f.scale !== undefined) attrs.push(`Scale="${f.scale}"`);
  if (f.type === "Edm.String" && f.maxLength !== undefined) attrs.push(`MaxLength="${f.maxLength}"`);
  if (f.lookupName) {
    return `        <Property ${attrs.join(" ")}>\n          <Annotation Term="RESO.OData.Metadata.LookupName" String="${esc(f.lookupName)}"/>\n        </Property>`;
  }
  return `        <Property ${attrs.join(" ")}/>`;
}

function entityTypeXml(name: ResoResourceName): string {
  const { key, fields } = RESOURCES[name];
  const nav =
    name === "Property"
      ? `\n        <NavigationProperty Name="${PROPERTY_NAV_MEDIA}" Type="Collection(${NS}.Media)"/>`
      : "";
  return `      <EntityType Name="${name}">
        <Key>
          <PropertyRef Name="${key}"/>
        </Key>
${fields.map(propertyXml).join("\n")}${nav}
      </EntityType>`;
}

let cached: string | null = null;

export function buildEdmx(): string {
  if (cached) return cached;
  const names: ResoResourceName[] = ["Property", "Media", "Lookup"];
  cached = `<?xml version="1.0" encoding="UTF-8"?>
<edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
  <edmx:DataServices>
    <Schema Namespace="${NS}" xmlns="http://docs.oasis-open.org/odata/ns/edm">
${names.map(entityTypeXml).join("\n")}
      <EntityContainer Name="Default">
        <EntitySet Name="Property" EntityType="${NS}.Property"/>
        <EntitySet Name="Lookup" EntityType="${NS}.Lookup"/>
      </EntityContainer>
    </Schema>
  </edmx:DataServices>
</edmx:Edmx>`;
  return cached;
}
