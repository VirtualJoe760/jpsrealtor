// src/app/components/developers/FieldTable.tsx
//
// Renders a field/parameter reference table (name, type, required, description)
// for the /developers reference docs. Server component — no client JS.

import type { ReactNode } from "react";

export type FieldRow = {
  /** Field or parameter name (rendered monospace). */
  name: string;
  /** Type label, e.g. "string", "number", "boolean", "string | null". */
  type: string;
  /** Whether the field is required. Optional — column hidden if no row sets it. */
  required?: boolean;
  /** Human description. May contain inline JSX (e.g. emphasis). */
  description: ReactNode;
};

type FieldTableProps = {
  rows: FieldRow[];
  /** Header for the first column. Defaults to "Field". */
  nameHeader?: string;
  /** Show the Required column. Defaults to true. */
  showRequired?: boolean;
};

export default function FieldTable({
  rows,
  nameHeader = "Field",
  showRequired = true,
}: FieldTableProps) {
  return (
    <div className="my-4 overflow-x-auto rounded-lg border border-border">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-muted/60 text-left">
            <th className="px-4 py-2 font-semibold text-foreground">{nameHeader}</th>
            <th className="px-4 py-2 font-semibold text-foreground">Type</th>
            {showRequired && (
              <th className="px-4 py-2 font-semibold text-foreground">Required</th>
            )}
            <th className="px-4 py-2 font-semibold text-foreground">Description</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name} className="border-t border-border align-top">
              <td className="px-4 py-2 font-mono text-xs text-foreground whitespace-nowrap">
                {row.name}
              </td>
              <td className="px-4 py-2 font-mono text-xs text-muted-foreground whitespace-nowrap">
                {row.type}
              </td>
              {showRequired && (
                <td className="px-4 py-2 text-xs">
                  {row.required ? (
                    <span className="font-medium text-foreground">Required</span>
                  ) : (
                    <span className="text-muted-foreground">Optional</span>
                  )}
                </td>
              )}
              <td className="px-4 py-2 text-muted-foreground">{row.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
