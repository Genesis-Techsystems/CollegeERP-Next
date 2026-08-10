import type { ColDef } from "ag-grid-community";
import { rowIndexGetter } from "@/lib/utils";

export type AnyRow = Record<string, unknown>;

/** Angular dynamic MatTable columns from Object.keys(firstRow). */
export function buildDynamicColDefs(rows: AnyRow[]): ColDef<AnyRow>[] {
  if (rows.length === 0) return [];
  const keys = Object.keys(rows[0] ?? {});
  return keys.map(
    (key) =>
      ({
        field: key,
        headerName: key,
        minWidth: 120,
        flex: 1,
        valueGetter: (p) => {
          const v = p.data?.[key];
          return v == null || String(v).trim() === "" ? "-" : String(v);
        },
      }) as ColDef<AnyRow>,
  );
}

export function buildDynamicExcelColumns(
  rows: AnyRow[],
): { key: string; header: string }[] {
  if (rows.length === 0) return [];
  return Object.keys(rows[0] ?? {}).map((key) => ({ key, header: key }));
}

export function buildDynamicExcelRows(rows: AnyRow[]): AnyRow[] {
  return rows.map((row) => {
    const out: AnyRow = {};
    for (const [k, v] of Object.entries(row)) {
      out[k] = v == null || String(v).trim() === "" ? "-" : String(v);
    }
    return out;
  });
}

export { rowIndexGetter };
