/**
 * Exam Controller Dashboard — Angular `vc-dashboard/ec-dashboard` API parity.
 */
import { EXAM_EVAL_API } from "@/config/constants/api";
import { getAllRecordsEnvelope } from "./crud";

export type ExamControllerDashRow = Record<string, unknown>;

export type ExamControllerReportType = "All_SUMMARY" | "EVAL_SUMMARY";

export type ExamControllerReport = {
  title: string;
  filters: string;
  rows: ExamControllerDashRow[];
  columns: string[];
};

function procName(path: string): string {
  return path.startsWith("getAllRecords/")
    ? path.slice("getAllRecords/".length)
    : path;
}

function firstGroup(result: unknown): ExamControllerDashRow[] {
  if (!Array.isArray(result) || result.length === 0) return [];
  const first = result[0];
  if (Array.isArray(first)) {
    return first.filter(
      (row): row is ExamControllerDashRow =>
        !!row && typeof row === "object" && !Array.isArray(row),
    );
  }
  if (first && typeof first === "object") {
    return result.filter(
      (row): row is ExamControllerDashRow =>
        !!row && typeof row === "object" && !Array.isArray(row),
    );
  }
  return [];
}

function str(value: unknown): string {
  if (value == null) return "";
  return String(value).trim();
}

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function dropIdKeys(row: ExamControllerDashRow): ExamControllerDashRow {
  const next: ExamControllerDashRow = {};
  for (const key of Object.keys(row)) {
    if (!key.toLowerCase().endsWith("id")) next[key] = row[key];
  }
  return next;
}

/** Angular `getFiltersData` — `s_get_exam_center_filters` `in_flag=exam_evaluation_center`. */
export async function listExamControllerEvaluationCenters(
  employeeId: number,
): Promise<ExamControllerDashRow[]> {
  try {
    const envelope = await getAllRecordsEnvelope<{ result?: unknown[] }>(
      procName(EXAM_EVAL_API.GET_EXAM_CENTER_FILTERS),
      {
        in_flag: "exam_evaluation_center",
        in_univ_examcenter_id: 0,
        in_exam_group_id: 0,
        in_college_id: 0,
        in_course_id: 0,
        in_course_group_id: 0,
        in_course_year_id: 0,
        in_academic_year_id: 0,
        in_exam_id: 0,
        in_regulation_id: 0,
        in_subject_id: 0,
        in_university_id: 0,
        in_exam_date: "1900-01-01",
        in_questionpaper_code: "",
        in_loginuser_empid: employeeId || 0,
        in_loginuser_id: 0,
        in_loginuser_roleid: 0,
        in_param1: 0,
        in_param2: "",
      },
    );
    if (!envelope.success) return [];
    return firstGroup(envelope.data?.result);
  } catch {
    return [];
  }
}

export function examControllerCenterId(row: ExamControllerDashRow): number {
  return num(
    row.pk_univ_evaluation_center_id ??
      row.exam_evaluation_center_id ??
      row.univ_evaluation_center_id,
  );
}

export function examControllerCenterCode(row: ExamControllerDashRow): string {
  return (
    str(row.evalution_center_code) ||
    str(row.evaluation_center_code) ||
    str(row.exam_evaluation_center_code)
  );
}

export function examControllerCenterName(row: ExamControllerDashRow): string {
  return (
    str(row.evalution_center_name) ||
    str(row.evaluation_center_name) ||
    str(row.exam_evaluation_center_name)
  );
}

/**
 * Angular `selectedUnivEvaluationCenter` / `getReportData` —
 * `s_exam_controller_reports` with `p_report_type` All_SUMMARY | EVAL_SUMMARY.
 */
export async function getExamControllerReport(params: {
  reportType: ExamControllerReportType;
  evaluationCenterId: number;
  employeeId: number;
}): Promise<ExamControllerReport> {
  const empty: ExamControllerReport = {
    title: "",
    filters: "",
    rows: [],
    columns: [],
  };
  try {
    const envelope = await getAllRecordsEnvelope<{ result?: unknown[] }>(
      procName(EXAM_EVAL_API.GET_EXAM_CONTROLLER_REPORTS),
      {
        p_report_type: params.reportType,
        p_exam_group_id: 0,
        p_exam_id: 0,
        p_subject_id: 0,
        p_questionpaper_code: "",
        p_evaluator_profile_id: 0,
        p_moderator_profile_id: 0,
        p_evaluation_center_id: params.evaluationCenterId || 0,
        p_scan_profile_id: 0,
        p_user_id: params.employeeId || 0,
        p_exam_from_date: "1990-01-01",
        p_exam_to_date: "1990-01-01",
        p_scan_from_date: "1990-01-01",
        p_scan_to_date: "1990-01-01",
        p_status: 0,
        p_omr_serial_no: "",
        p_ec_seatno: "",
      },
    );
    if (!envelope.success) return empty;
    const raw = firstGroup(envelope.data?.result);
    if (raw.length === 0) return empty;
    const rows = raw.map(dropIdKeys);
    const first = rows[0] ?? {};
    return {
      title: str(raw[0]?.ReportTitle ?? first.ReportTitle),
      filters: str(raw[0]?.Filters ?? first.Filters),
      rows,
      columns: Object.keys(first).filter((column) => column !== "ReportTitle"),
    };
  } catch {
    return empty;
  }
}
