import type { ColDef } from "ag-grid-community";
import type { AffiliatedExamRegPivotRow } from "./affiliated-exam-reg-upload-excel";

type AnyRow = Record<string, unknown>;

function text(row: AnyRow | undefined, ...keys: string[]): string {
  if (!row) return "";
  for (const key of keys) {
    const v = row[key];
    if (v != null && String(v).trim() !== "") return String(v);
  }
  return "";
}

export const AFFILIATED_EXAM_REG_STAGING_BASE_COLS: ColDef<AffiliatedExamRegPivotRow>[] =
  [
    { headerName: "SNo", field: "sno", width: 70, flex: 0 },
    { headerName: "Hallticket No.", field: "hallticketno", minWidth: 130 },
    { headerName: "CourseYear Code", field: "courseyearcode", minWidth: 130 },
    { headerName: "Academic Year", field: "academicyear", minWidth: 120 },
    { headerName: "Regulation Code", field: "regulationcode", minWidth: 130 },
  ];

export function buildAffiliatedExamRegStagingColDefs(
  subjectCodes: string[],
): ColDef<AffiliatedExamRegPivotRow>[] {
  return [
    ...AFFILIATED_EXAM_REG_STAGING_BASE_COLS,
    ...subjectCodes.map(
      (code) =>
        ({
          headerName: code,
          field: code,
          minWidth: 80,
          flex: 0,
          cellClass: "ag-center-aligned-cell",
        }) as ColDef<AffiliatedExamRegPivotRow>,
    ),
  ];
}

export const AFFILIATED_EXAM_REG_LOADED_COLS: ColDef<AnyRow>[] = [
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
      text(
        p.data,
        "hallticketno",
        "HallticketNo",
        "HallTicketNo",
        "hall_ticket_number",
        "StudentHallticket",
      ),
  },
  {
    headerName: "CourseYear Code",
    minWidth: 130,
    valueGetter: (p) => text(p.data, "courseyearcode", "course_year_code"),
  },
  {
    headerName: "Academic Year",
    minWidth: 120,
    valueGetter: (p) => text(p.data, "academicyear", "academic_year"),
  },
  {
    headerName: "Regulation Code",
    minWidth: 130,
    valueGetter: (p) =>
      text(p.data, "regulationcode", "regulation_code", "regulationCode"),
  },
  {
    headerName: "Subject Code",
    minWidth: 140,
    valueGetter: (p) =>
      text(
        p.data,
        "subjectcode",
        "subject_code",
        "subjectCode",
        "subjectcodes",
      ),
  },
];

export const AFFILIATED_EXAM_REG_VERIFY_COLS: ColDef<AnyRow>[] = [
  {
    headerName: "SNo",
    valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1,
    width: 70,
    flex: 0,
  },
  {
    headerName: "Hall Ticket No.",
    minWidth: 140,
    valueGetter: (p) => text(p.data, "hallticket_number", "hallticketno"),
  },
  {
    headerName: "Problem",
    minWidth: 280,
    flex: 1,
    valueGetter: (p) => text(p.data, "problem", "Problem"),
  },
];
