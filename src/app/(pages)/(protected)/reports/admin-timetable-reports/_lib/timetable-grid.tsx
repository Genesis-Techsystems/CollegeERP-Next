/**
 * AG Grid helpers for timetable matrix reports.
 */

import type {
  ColDef,
  ICellRendererParams,
  IHeaderParams,
} from "ag-grid-community";
import type {
  PeriodKey,
  StatisticalPeriodKey,
  WeekdayKey,
} from "./timetable-matrix";
import { statisticalPeriodField, weekdayField } from "./timetable-matrix";

/** Angular `daily-statistical-report` cell / header colors. */
const STAT_COL_FIRST = "blue";
const STAT_COL_CAPTURED = "green";
const STAT_COL_NOT_CAPTURED = "red";
const STAT_COL_TIME = "#c76d2f";
const STAT_COL_BREAK_BG = "#dedede";

export type MatrixGridRow = {
  __rowId: string;
  rowLabel: string;
} & Record<string, string>;

export type StatisticalGridRow = {
  __rowId: string;
  rowLabel: string;
} & Record<string, string | number>;

export function periodField(period: string | number): string {
  return `p_${String(period).replace(/[^a-zA-Z0-9_-]/g, "_")}`;
}

export function labelCellRenderer(p: ICellRendererParams<MatrixGridRow>) {
  return <span className="font-medium text-blue-600">{p.value ?? ""}</span>;
}

export function buildMatrixColumnDefs(
  firstColHeader: string,
  keys: PeriodKey[],
): ColDef<MatrixGridRow>[] {
  const cols: ColDef<MatrixGridRow>[] = [
    {
      colId: "rowLabel",
      field: "rowLabel",
      headerName: firstColHeader,
      minWidth: 160,
      pinned: "left",
      lockVisible: true,
      cellRenderer: labelCellRenderer,
    },
  ];

  for (const key of keys) {
    const field = periodField(key.Period);
    const time = String(key.Period_Time ?? "").trim();
    cols.push({
      colId: field,
      field,
      headerName: time ? `${key.Period}\n${time}` : String(key.Period),
      wrapHeaderText: true,
      autoHeaderHeight: true,
      minWidth: 120,
      flex: 1,
      cellClass: (p) => {
        const v = String(p.value ?? "");
        return !v || v === "-" ? "bg-muted/20" : "";
      },
    });
  }

  return cols;
}

export function toMatrixGridRows(
  rows: { label: string; cells: string[] }[],
  keys: PeriodKey[],
): MatrixGridRow[] {
  return rows.map((row, i) => {
    const out: MatrixGridRow = {
      __rowId: `${i}-${row.label}`,
      rowLabel: row.label,
    };
    keys.forEach((key, idx) => {
      out[periodField(key.Period)] = row.cells[idx] ?? "";
    });
    return out;
  });
}

function statisticalLabelRenderer(p: ICellRendererParams<StatisticalGridRow>) {
  return (
    <span
      className="block text-center font-medium"
      style={{ color: STAT_COL_FIRST }}
    >
      {String(p.value ?? "")}
    </span>
  );
}

function statisticalCellRenderer(p: ICellRendererParams<StatisticalGridRow>) {
  const field = p.colDef?.field ?? "";
  const att = Number(p.data?.[`${field}_att`] ?? 0);
  const text = String(p.value ?? "");
  if (!text) return null;
  return (
    <span
      className="block whitespace-pre-wrap text-center font-medium"
      style={{
        color: att === 1 ? STAT_COL_CAPTURED : STAT_COL_NOT_CAPTURED,
        paddingBottom: 10,
      }}
    >
      {text}
    </span>
  );
}

function StatisticalPeriodHeader(
  p: IHeaderParams<StatisticalGridRow> & { periodTime?: string },
) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center text-center leading-tight">
      <span className="font-medium" style={{ color: STAT_COL_FIRST }}>
        {p.displayName}
      </span>
      {p.periodTime ? (
        <span style={{ color: STAT_COL_TIME }}>{p.periodTime}</span>
      ) : null}
    </div>
  );
}

export function buildStatisticalColumnDefs(
  keys: StatisticalPeriodKey[],
): ColDef<StatisticalGridRow>[] {
  const cols: ColDef<StatisticalGridRow>[] = [
    {
      colId: "rowLabel",
      field: "rowLabel",
      headerName: "Days/Hours",
      minWidth: 160,
      pinned: "left",
      lockVisible: true,
      cellRenderer: statisticalLabelRenderer,
      cellStyle: { textAlign: "center" },
    },
  ];

  for (const key of keys) {
    const field = statisticalPeriodField(key.periodno);
    const time = String(key.Period_TIme ?? "").trim();
    cols.push({
      colId: field,
      field,
      headerName: String(key.periodno),
      headerComponent: StatisticalPeriodHeader,
      headerComponentParams: { periodTime: time },
      wrapHeaderText: true,
      autoHeaderHeight: true,
      minWidth: 120,
      flex: 1,
      wrapText: true,
      autoHeight: true,
      cellRenderer: statisticalCellRenderer,
      cellStyle: (p) => {
        const v = String(p.value ?? "");
        return {
          textAlign: "center",
          ...(v ? {} : { backgroundColor: STAT_COL_BREAK_BG }),
        };
      },
    });
  }

  return cols;
}

export function toStatisticalGridRows(
  rows: { label: string; cells: { text: string; attendanceTaken: number }[] }[],
  keys: StatisticalPeriodKey[],
): StatisticalGridRow[] {
  return rows.map((row, i) => {
    const out: StatisticalGridRow = {
      __rowId: `${i}-${row.label}`,
      rowLabel: row.label,
    };
    keys.forEach((key, idx) => {
      const field = statisticalPeriodField(key.periodno);
      const cell = row.cells[idx];
      out[field] = cell?.text ?? "";
      out[`${field}_att`] = cell?.attendanceTaken ?? 0;
    });
    return out;
  });
}

export function buildDepartmentWiseColumnDefs(
  keys: WeekdayKey[],
): ColDef<MatrixGridRow>[] {
  const cols: ColDef<MatrixGridRow>[] = [
    {
      colId: "rowLabel",
      field: "rowLabel",
      headerName: "Employee",
      minWidth: 160,
      pinned: "left",
      lockVisible: true,
      cellRenderer: labelCellRenderer,
    },
  ];

  for (const key of keys) {
    const field = weekdayField(key.weekday_name);
    cols.push({
      colId: field,
      field,
      headerName: key.weekday_name,
      minWidth: 140,
      flex: 1,
      wrapText: true,
      autoHeight: true,
      cellClass: (p) => {
        const v = String(p.value ?? "");
        return !v ? "bg-muted/20" : "";
      },
    });
  }

  return cols;
}

export function toDepartmentWiseGridRows(
  rows: { label: string; cells: string[] }[],
  keys: WeekdayKey[],
): MatrixGridRow[] {
  return rows.map((row, i) => {
    const out: MatrixGridRow = {
      __rowId: `${i}-${row.label}`,
      rowLabel: row.label,
    };
    keys.forEach((key, idx) => {
      out[weekdayField(key.weekday_name)] = row.cells[idx] ?? "";
    });
    return out;
  });
}
