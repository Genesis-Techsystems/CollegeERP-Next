import { EXAM_API } from "@/config/constants/api";
import { getAllRecordsEnvelope } from "@/services/crud";

type AnyRow = Record<string, unknown>;

function rowsFromProcResult(raw: unknown): AnyRow[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  const first = raw[0];
  if (Array.isArray(first)) {
    return first.filter((r): r is AnyRow => !!r && typeof r === "object");
  }
  if (first && typeof first === "object") return [first as AnyRow];
  return [];
}

/**
 * Angular `student-answerpaper-view` `getCourseYearSubjects`:
 * GET getAllRecords/s_get_exam_student_results
 *   in_flag=std_evaluations&in_exam_id=0&in_college_id=0&in_course_id=0
 *   &in_course_group_id=0&in_course_year_id=0&in_std_id={studentId}
 *   &in_regulation_id=0&in_ispass=0&in_subject_id=0
 *   &in_above_fail_subjects=0&in_below_credits=0
 * → data.result[0]
 *
 * Angular does not toast on success:false / empty rows — return [].
 */
export async function getStudentAnswerPaperEvaluations(
  studentId: number,
): Promise<AnyRow[]> {
  if (!studentId) return [];
  const envelope = await getAllRecordsEnvelope<{ result?: unknown }>(
    EXAM_API.GET_EXAM_STUDENT_RESULTS,
    {
      in_flag: "std_evaluations",
      in_exam_id: 0,
      in_college_id: 0,
      in_course_id: 0,
      in_course_group_id: 0,
      in_course_year_id: 0,
      in_std_id: studentId,
      in_regulation_id: 0,
      in_ispass: "0",
      in_subject_id: 0,
      in_above_fail_subjects: "0",
      in_below_credits: "0",
    },
  );
  if (envelope.statusCode && envelope.statusCode !== 200) {
    throw new Error(envelope.message || "Failed to load answer papers");
  }
  if (!envelope.success) return [];
  return rowsFromProcResult(envelope.data?.result);
}

/** Angular `view(path)` — popup PDF with chrome hidden. */
export function openStudentAnswerPaperPdf(url: string): void {
  const href = String(url ?? "").trim();
  if (!href) return;
  globalThis.window?.open(
    `${href}#toolbar=0&navpanes=0&scrollbar=0`,
    "pdfViewer",
    "width=500,height=500",
  );
}
