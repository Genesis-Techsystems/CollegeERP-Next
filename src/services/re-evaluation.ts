import {
  buildQuery,
  domainList,
  getAllRecords,
  putDetails,
} from "@/services/crud";
import { EXAM_REVAL_API } from "@/config/constants/api";
import { GM_CODES } from "@/config/constants/ui";

type AnyRow = Record<string, any>;

function procNameFromExamRevalPath(path: string): string {
  return path.replace(/^getAllRecords\//, "");
}

function numFrom(row: AnyRow | null | undefined, keys: string[]): number {
  for (const key of keys) {
    const val = Number(row?.[key]);
    if (Number.isFinite(val) && val > 0) return val;
  }
  return 0;
}

function strFrom(row: AnyRow | null | undefined, keys: string[]): string {
  for (const key of keys) {
    const val = String(row?.[key] ?? "").trim();
    if (val) return val;
  }
  return "";
}

/** Angular: `s_get_exam_filters_bycode` + `in_flag=std_exam_filters`, `in_param1=studentId`. */
export async function listStudentExamsForRevaluationFee(
  studentId: number,
  employeeId: number,
): Promise<AnyRow[]> {
  const data = await getAllRecords<{ result: AnyRow[][] }>(
    "s_get_exam_filters_bycode",
    {
      in_flag: "std_exam_filters",
      in_flag_type: "",
      in_university_id: 0,
      in_college_id: 0,
      in_course_id: 0,
      in_course_group_id: 0,
      in_course_year_id: 0,
      in_exam_id: 0,
      in_academic_year_id: 0,
      in_regulation_id: 0,
      in_subject_id: 0,
      in_loginuser_empid: employeeId || 0,
      in_loginuser_roleid: 0,
      in_sub_flag_type: "",
      in_param1: studentId,
      in_param2: 0,
    },
  );
  const rows = data?.result?.[0] ?? [];
  if (!Array.isArray(rows)) return [];
  const seen = new Set<number>();
  const out: AnyRow[] = [];
  for (const row of rows) {
    const id = numFrom(row, ["fk_exam_id", "examId"]);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(row);
  }
  return out;
}

/** Angular: `GeneralDetail` under GM `REVISIONTYPE` (revision / photocopy types). */
export async function listExamRevisionTypes(): Promise<AnyRow[]> {
  return domainList<AnyRow>(
    "GeneralDetail",
    buildQuery({
      "GeneralMaster.generalMasterCode": GM_CODES.REVISION_TYPE,
      isActive: true,
    }),
  );
}

/** Angular: `examStudentRevisedDetailsUrl` + `in_flag=examrevision_std_details`. */
export async function getExamRevisionStdDetailsBundle(params: {
  examId: number;
  studentId: number;
}): Promise<{ detailsList: AnyRow[]; receiptRows: AnyRow[] }> {
  const proc = procNameFromExamRevalPath(
    EXAM_REVAL_API.GET_STUDENT_REVISED_DETAILS,
  );
  const data = await getAllRecords<{ result: AnyRow[][] }>(proc, {
    in_flag: "examrevision_std_details",
    in_exam_id: params.examId,
    in_course_id: 0,
    in_course_group_id: 0,
    in_course_year_id: 0,
    in_student_id: params.studentId,
    in_loginemp_id: 0,
    in_subject_id: 0,
  });
  const result = data?.result ?? [];
  return {
    detailsList: Array.isArray(result[0]) ? result[0] : [],
    receiptRows: Array.isArray(result[1]) ? result[1] : [],
  };
}

/** Angular `studentFeeRevaluationUrl` → `s_get_student_fee_revaluation`. */
function studentFeeRevaluationProc(): string {
  return procNameFromExamRevalPath(EXAM_REVAL_API.GET_STUDENT_FEE_REVALUATION);
}

/**
 * Angular callRevisionHistory dedupe:
 * keep the last row for each `fk_exam_fee_receipt_id`
 * (`!ids.includes(id, index + 1)`).
 */
export function dedupeRevisionHistoryRows(rows: AnyRow[]): AnyRow[] {
  if (!Array.isArray(rows) || rows.length === 0) return [];
  const ids = rows.map((row) => numFrom(row, ["fk_exam_fee_receipt_id"]));
  return rows.filter((row, index) => {
    const id = numFrom(row, ["fk_exam_fee_receipt_id"]);
    if (!id) return true;
    return !ids.includes(id, index + 1);
  });
}

function unwrapFeeRevaluationRows(
  data: { result?: unknown } | null | undefined,
): AnyRow[] {
  const raw = data?.result;
  if (!Array.isArray(raw) || raw.length === 0) return [];
  const first = raw[0];
  if (Array.isArray(first)) {
    return first.filter((r): r is AnyRow => !!r && typeof r === "object");
  }
  if (first && typeof first === "object") return [first as AnyRow];
  for (const group of raw) {
    if (
      Array.isArray(group) &&
      group.length > 0 &&
      typeof group[0] === "object"
    ) {
      return group.filter((r): r is AnyRow => !!r && typeof r === "object");
    }
  }
  return [];
}

async function fetchStudentRevisionRequestRows(params: {
  examId: number;
  studentId: number;
}): Promise<AnyRow[]> {
  // Angular callRevisionHistory request2 params (exact names)
  const data = await getAllRecords<{ result: unknown }>(
    studentFeeRevaluationProc(),
    {
      in_flag: "student_revision_request",
      in_exam_id: params.examId,
      in_student_id: params.studentId,
      in_subject_id: 0,
    },
  );
  return unwrapFeeRevaluationRows(data);
}

/**
 * Angular `studentFeeRevaluationUrl` + `in_flag=student_revision_request`.
 */
export async function getStudentRevisionRequestHistory(params: {
  examId: number;
  studentId: number;
}): Promise<AnyRow[]> {
  const rows = await fetchStudentRevisionRequestRows(params);
  return dedupeRevisionHistoryRows(rows);
}

/** Full revision-request rows (Angular `revisionPaymentDetails`) for view-details modal. */
export async function getStudentRevisionPaymentDetails(params: {
  examId: number;
  studentId: number;
}): Promise<AnyRow[]> {
  return fetchStudentRevisionRequestRows(params);
}

/**
 * Angular `studentFeeRevaluationUrl` + `in_flag=student_evaluation_details` (photocopy / evaluation view).
 */
export async function listStudentPhotocopyEvaluationDetails(params: {
  examId: number;
  studentId: number;
}): Promise<AnyRow[]> {
  const data = await getAllRecords<{ result: unknown }>(
    studentFeeRevaluationProc(),
    {
      in_flag: "student_evaluation_details",
      in_exam_id: params.examId,
      in_student_id: params.studentId,
      in_subject_id: 0,
    },
  );
  return unwrapFeeRevaluationRows(data);
}

/** Angular: college timetable filter bundle for revised marks screens. */
export async function getReevaluationMarksFilters(args: {
  organizationId: number;
  employeeId: number;
}): Promise<AnyRow[]> {
  const data = await getAllRecords<{ result: AnyRow[][] }>(
    "s_get_collegewisedetails_bycode",
    {
      in_flag: "clg_exam_timetable_filters",
      in_org_id: args.organizationId || 0,
      in_college_id: 0,
      in_course_id: 0,
      in_course_group_id: 0,
      in_course_year_id: 0,
      in_group_section_id: 0,
      in_academic_year_id: 0,
      in_dept_id: 0,
      in_isadmin: 0,
      in_loginuser_empid: args.employeeId || 0,
      in_loginuser_roleid: 0,
      in_employee: "",
      in_subject: "",
      in_gm_codes: "SUBTYPE",
    },
  );
  const groups = data?.result ?? [];
  return (
    groups.find(
      (g) =>
        Array.isArray(g) &&
        String(g?.[0]?.flag ?? "") === "clg_exam_timetable_filters",
    ) ??
    groups[0] ??
    []
  );
}

/** Angular: examStudentRevisedDetailsUrl + in_flag=examrevision_std_marks_list. */
export async function getExamRevisionMarksBundle(params: {
  examId: number;
  subjectId: number;
}): Promise<{ studentRows: AnyRow[]; marksSetupRows: AnyRow[] }> {
  const proc = procNameFromExamRevalPath(
    EXAM_REVAL_API.GET_STUDENT_REVISED_DETAILS,
  );
  const data = await getAllRecords<{ result: AnyRow[][] }>(proc, {
    in_flag: "examrevision_std_marks_list",
    in_exam_id: params.examId,
    in_course_id: 0,
    in_course_group_id: 0,
    in_course_year_id: 0,
    in_subject_id: params.subjectId,
    in_student_id: 0,
    in_loginemp_id: 0,
  });
  const groups = data?.result ?? [];
  const studentRows =
    groups.find(
      (g) =>
        Array.isArray(g) &&
        String(g?.[0]?.flag ?? "") === "examrevision_std_marks_list",
    ) ?? [];
  const marksSetupRows =
    groups.find(
      (g) => Array.isArray(g) && String(g?.[0]?.flag ?? "") === "marks_setup",
    ) ?? [];
  return { studentRows, marksSetupRows };
}

/** Angular: updateRevisedMarksUrl. */
export async function updateExamRevisedMarks(
  rows: Array<{
    examRevisionSubId: number;
    revisedMarks: number;
    revisedByEmpId: number;
    revisedByEmpName: string;
  }>,
): Promise<AnyRow> {
  return putDetails<AnyRow>(EXAM_REVAL_API.UPDATE_REVISED_MARKS, rows);
}

export type MergedRevaluationReceipt = {
  fk_exam_addt_fee_receipt_id: number;
  fee_receipt_no: string;
  receipt_date: string;
  exam_total_amount: number | null;
  exam_fee_amount: number | null;
  exam_addt_fee: number | null;
  exam_fine_amount: number | null;
  payment_mode: string;
  course_year_code: string;
  hallticket_number: string;
  course_code: string;
  student_name: string;
  exam_name: string;
  exam_type_name: string;
  subjects: AnyRow[];
};

function pickNumOrNull(v: unknown): number | null {
  if (v === undefined || v === null || String(v).length === 0) return null;
  const num = Number(v);
  return Number.isFinite(num) ? num : null;
}

function pickReceiptTotalAmount(curr: AnyRow): number | null {
  const a = curr.exam_total_amount;
  const hasA = a !== undefined && a !== null && String(a).length > 0;
  if (hasA) return Number(a);
  const b = curr.examTotalAmount;
  const hasB = b !== undefined && b !== null && String(b).length > 0;
  if (hasB) return Number(b);
  return null;
}

/** Mirrors Angular `receiptsLists` aggregation keyed by `fk_exam_addt_fee_receipt_id`. */
export function mergeRevaluationReceiptRows(
  receiptRows: AnyRow[],
): MergedRevaluationReceipt[] {
  if (!Array.isArray(receiptRows) || receiptRows.length === 0) return [];
  const acc = new Map<number, MergedRevaluationReceipt>();
  for (const curr of receiptRows) {
    const id = Number(
      curr.fk_exam_addt_fee_receipt_id ?? curr.fkExamAddtFeeReceiptId ?? 0,
    );
    if (!Number.isFinite(id) || id <= 0) continue;
    if (!acc.has(id)) {
      acc.set(id, {
        fk_exam_addt_fee_receipt_id: id,
        fee_receipt_no: strFrom(curr, ["fee_receipt_no", "feeReceiptNo"]),
        receipt_date: strFrom(curr, ["receipt_date", "receiptDate"]),
        exam_total_amount: pickReceiptTotalAmount(curr),
        exam_fee_amount: pickNumOrNull(
          curr.exam_fee_amount ?? curr.examFeeAmount,
        ),
        exam_addt_fee: pickNumOrNull(curr.exam_addt_fee ?? curr.examAddtFee),
        exam_fine_amount: pickNumOrNull(
          curr.exam_fine_amount ?? curr.examFineAmount,
        ),
        payment_mode: strFrom(curr, ["payment_mode", "paymentMode"]),
        course_year_code: strFrom(curr, ["course_year_code", "courseYearCode"]),
        hallticket_number: strFrom(curr, [
          "hallticket_number",
          "hallticketNumber",
        ]),
        course_code: strFrom(curr, ["course_code", "courseCode"]),
        student_name: strFrom(curr, ["student_name", "studentName"]),
        exam_name: strFrom(curr, ["exam_name", "examName"]),
        exam_type_name: strFrom(curr, [
          "exam_type_name",
          "examtypeCatDisplayName",
        ]),
        subjects: [],
      });
    }
    const bucket = acc.get(id);
    if (bucket) bucket.subjects.push({ ...curr });
  }
  return [...acc.values()].sort((a, b) =>
    String(b.receipt_date).localeCompare(String(a.receipt_date)),
  );
}
