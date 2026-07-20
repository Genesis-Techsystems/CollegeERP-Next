import type { ColDef } from "ag-grid-community";
import type { AffiliatedExamMarksPivotRow } from "./affiliated-exam-marks-upload-excel";

type AnyRow = Record<string, unknown>;

function text(row: AnyRow | undefined, ...keys: string[]): string {
  if (!row) return "";
  for (const key of keys) {
    const v = row[key];
    if (v != null && String(v).trim() !== "") return String(v);
  }
  return "";
}

export const AFFILIATED_EXAM_MARKS_STAGING_BASE_COLS: ColDef<AffiliatedExamMarksPivotRow>[] =
  [
    { headerName: "SNo", field: "sno", width: 70, flex: 0 },
    { headerName: "Hallticket No.", field: "hallticketno", minWidth: 130 },
    { headerName: "CourseYear Code", field: "courseyearcode", minWidth: 130 },
  ];

export function buildAffiliatedExamMarksStagingColDefs(
  subjectCodes: string[],
): ColDef<AffiliatedExamMarksPivotRow>[] {
  return [
    ...AFFILIATED_EXAM_MARKS_STAGING_BASE_COLS,
    ...subjectCodes.map(
      (code) =>
        ({
          headerName: code,
          field: code,
          minWidth: 90,
          flex: 0,
          cellClass: "ag-center-aligned-cell",
        }) as ColDef<AffiliatedExamMarksPivotRow>,
    ),
  ];
}

export const AFFILIATED_EXAM_MARKS_LOADED_COLS: ColDef<AnyRow>[] = [
  {
    headerName: "SNo",
    valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1,
    width: 70,
    flex: 0,
  },
  {
    headerName: "Hallticket No.",
    minWidth: 130,
    valueGetter: (p) =>
      text(p.data, "hallticketno", "HallticketNo", "hall_ticket_number"),
  },
  {
    headerName: "CourseYear Code",
    minWidth: 130,
    valueGetter: (p) =>
      text(p.data, "courseyearcode", "course_year_code", "CourseYearCode"),
  },
  {
    headerName: "Subject Code",
    minWidth: 140,
    valueGetter: (p) =>
      text(p.data, "subjectcode", "subject_code", "subjectCode"),
  },
  {
    headerName: "Marks",
    minWidth: 100,
    valueGetter: (p) => text(p.data, "marks", "Marks"),
  },
];

export const AFFILIATED_EXAM_MARKS_VERIFY_COLS: ColDef<AnyRow>[] = [
  {
    headerName: "SNo",
    valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1,
    width: 70,
    flex: 0,
  },
  {
    headerName: "Problems",
    minWidth: 280,
    flex: 1,
    valueGetter: (p) =>
      text(p.data, "Problems", "problems", "message", "Message", "Flag", "flag"),
  },
];
