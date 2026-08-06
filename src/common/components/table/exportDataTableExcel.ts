import type { ColDef, Column, GridApi } from "ag-grid-community";
import { escapeHtml, exportHtmlTableAsExcel } from "@/common/export-html-table";

export interface ExportDataTableExcelOptions<T> {
  api: GridApi<T>;
  rows: T[];
  fileName?: string;
  /** Optional title row rendered above column headers. */
  title?: string;
}

function isActionsColumn(def: ColDef): boolean {
  const header = String(def.headerName ?? "")
    .trim()
    .toLowerCase();
  return header === "actions" || header === "action";
}

function cellDisplayText<T>(row: T, def: ColDef<T>, rowIndex: number): string {
  let value: unknown;
  try {
    if (typeof def.valueGetter === "function") {
      value = def.valueGetter({ data: row, node: { rowIndex } } as never);
    } else if (def.field) {
      value = (row as Record<string, unknown>)[def.field];
    }
    if (typeof def.valueFormatter === "function") {
      value = def.valueFormatter({
        value,
        data: row,
        node: { rowIndex },
      } as never);
    }
  } catch {
    value = "";
  }
  if (value == null) return "";
  return String(value);
}

function getHeaderPath(column: Column): string[] {
  const groups: string[] = [];
  let parent = column.getParent();
  while (parent) {
    const def = parent.getDefinition();
    if (def && "headerName" in def && def.headerName) {
      groups.unshift(String(def.headerName));
    }
    parent = parent.getParent?.() ?? null;
  }

  const leafDef = column.getColDef();
  const leaf = String(
    leafDef.headerName ?? leafDef.field ?? leafDef.colId ?? "",
  ).trim();
  if (!leaf) return groups.length ? groups : [""];
  if (groups.length === 0) return [leaf];
  return [...groups, leaf];
}

function buildMultiRowHeader(paths: string[][]): string {
  const numCols = paths.length;
  const depth = Math.max(...paths.map((p) => p.length), 1);
  const rows: string[] = [];

  for (let level = 0; level < depth; level++) {
    const cells: string[] = [];
    let col = 0;

    while (col < numCols) {
      const path = paths[col];

      if (path.length === 1 && depth > 1) {
        if (level === 0) {
          cells.push(
            `<th rowspan="${depth}">${escapeHtml(path[0] ?? "")}</th>`,
          );
        }
        col++;
        continue;
      }

      if (level >= path.length) {
        col++;
        continue;
      }

      const label = path[level] ?? "";
      let colspan = 1;
      while (col + colspan < numCols) {
        const next = paths[col + colspan];
        if (next.length <= level || next[level] !== label) break;
        let samePrefix = true;
        for (let l = 0; l < level; l++) {
          if ((next[l] ?? "") !== (path[l] ?? "")) {
            samePrefix = false;
            break;
          }
        }
        if (!samePrefix) break;
        colspan++;
      }

      cells.push(`<th colspan="${colspan}">${escapeHtml(label)}</th>`);
      col += colspan;
    }

    rows.push(`<tr>${cells.join("")}</tr>`);
  }

  return rows.join("");
}

function buildHeaderHtml(paths: string[][]): string {
  if (paths.length === 0) return "";
  const depth = Math.max(...paths.map((p) => p.length), 1);
  if (depth <= 1) {
    return `<tr>${paths
      .map((p) => `<th>${escapeHtml(p[0] ?? "")}</th>`)
      .join("")}</tr>`;
  }
  return buildMultiRowHeader(paths);
}

function getExportColumns<T>(api: GridApi<T>): Column[] {
  return (api.getAllDisplayedColumns() ?? []).filter((column) => {
    const def = column.getColDef();
    if (isActionsColumn(def)) return false;
    return (
      Boolean(def.field) ||
      typeof def.valueGetter === "function" ||
      Boolean(def.colId)
    );
  });
}

/** Export visible DataTable / AG Grid columns and rows as an HTML `.xls` workbook. */
export function exportDataTableAsExcel<T>(
  options: ExportDataTableExcelOptions<T>,
): void {
  const { api, rows, fileName = "Export.xls", title } = options;
  const columns = getExportColumns(api);
  if (columns.length === 0) return;

  const paths = columns.map((column) => getHeaderPath(column));
  const defs = columns.map((column) => column.getColDef() as ColDef<T>);
  const colCount = columns.length;

  const titleRow = title
    ? `<tr><th colspan="${colCount}" style="text-align:center;font-size:18px;font-weight:bold;background:#f2f2f2;">${escapeHtml(title)}</th></tr>`
    : "";

  const head = buildHeaderHtml(paths);
  const body = rows
    .map(
      (row, rowIndex) =>
        `<tr>${defs
          .map(
            (def) =>
              `<td>${escapeHtml(cellDisplayText(row, def, rowIndex))}</td>`,
          )
          .join("")}</tr>`,
    )
    .join("");

  const tableHtml = `<table border="1" cellspacing="0" cellpadding="4"><thead>${titleRow}${head}</thead><tbody>${body}</tbody></table>`;
  exportHtmlTableAsExcel(fileName, tableHtml);
}
