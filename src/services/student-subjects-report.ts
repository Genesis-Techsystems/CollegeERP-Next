import { MISC_REPORT_API } from "@/config/constants/api";
import { AppError } from "@/lib/errors";
import { getAllRecordsEnvelope } from "./crud";

export type StudentSubjectReportRawRow = {
  hallticket_number?: string;
  student_name?: string;
  regulation_code?: string;
  subject_code?: string;
  subject_name?: string;
  sort_order?: number | null;
  [key: string]: unknown;
};

export type StudentSubjectGroupedRow = {
  hallticket_number: string;
  regulation_code: string;
  student_name: string;
  subjects: string[];
};

export type StudentSubjectReportResult = {
  rows: StudentSubjectReportRawRow[];
  subjectCodes: string[];
  subjectsTable: StudentSubjectReportRawRow[];
  grouped: StudentSubjectGroupedRow[];
};

export type StudentSubjectReportParams = {
  collegeId: number;
  courseId: number;
  courseGroupId: number;
  courseYearId: number;
  academicYearId: number;
  batchId: number;
};

/**
 * Angular students-subject-report `getStudents` + `makeSubjectGroupping`:
 * GET `getAllRecords/s_get_std_sub_report`
 */
export async function fetchStudentSubjectsReport(
  params: StudentSubjectReportParams,
): Promise<StudentSubjectReportResult> {
  const envelope = await getAllRecordsEnvelope<{
    result?: StudentSubjectReportRawRow[][];
  }>(MISC_REPORT_API.STUDENT_SUBJECT_REPORT, {
    in_flag: "std_subjects",
    in_college_id: params.collegeId,
    in_course_id: params.courseId,
    in_course_group_id: params.courseGroupId,
    in_course_year_id: params.courseYearId,
    in_academic_year_id: params.academicYearId,
    in_batch_id: params.batchId,
  });

  const message = envelope.message ?? "";
  if (!envelope.success) {
    if (/no\s+record(?:\(s\)|s)?/i.test(message)) {
      return { rows: [], subjectCodes: [], subjectsTable: [], grouped: [] };
    }
    throw new AppError(
      "API_ERROR",
      message || "Failed to load student subjects report",
    );
  }

  const block = envelope.data?.result?.[0];
  const rows = Array.isArray(block) ? block : [];
  if (rows.length === 0) {
    return { rows: [], subjectCodes: [], subjectsTable: [], grouped: [] };
  }

  // Unique subjects by subject_code (Angular subjectsTable dedupe)
  const seenCodes = new Set<string>();
  const subjectsTable: StudentSubjectReportRawRow[] = [];
  for (const row of rows) {
    const code = String(row.subject_code ?? "");
    if (!code || seenCodes.has(code)) continue;
    seenCodes.add(code);
    subjectsTable.push(row);
  }

  // subjectCodes sorted by sort_order (Angular makeSubjectGroupping)
  const subjectMap = new Map<string, number | null>();
  for (const row of rows) {
    const code = String(row.subject_code ?? "");
    if (!code || subjectMap.has(code)) continue;
    const order =
      row.sort_order == null || Number.isNaN(Number(row.sort_order))
        ? null
        : Number(row.sort_order);
    subjectMap.set(code, order);
  }
  const subjectCodes = [...subjectMap.entries()]
    .sort(([, a], [, b]) => {
      if (a != null && b != null) return a - b;
      if (a != null) return -1;
      if (b != null) return 1;
      return 0;
    })
    .map(([code]) => code);

  const temp = new Map<
    string,
    {
      hallticket_number: string;
      regulation_code: string;
      student_name: string;
      subjects: Set<string>;
    }
  >();
  for (const item of rows) {
    const ht = String(item.hallticket_number ?? "");
    if (!ht) continue;
    let entry = temp.get(ht);
    if (!entry) {
      entry = {
        hallticket_number: ht,
        regulation_code: String(item.regulation_code ?? ""),
        student_name: String(item.student_name ?? ""),
        subjects: new Set(),
      };
      temp.set(ht, entry);
    }
    const code = String(item.subject_code ?? "");
    if (code) entry.subjects.add(code);
  }

  const grouped: StudentSubjectGroupedRow[] = [...temp.values()].map((e) => ({
    hallticket_number: e.hallticket_number,
    regulation_code: e.regulation_code,
    student_name: e.student_name,
    subjects: Array.from(e.subjects),
  }));

  return { rows, subjectCodes, subjectsTable, grouped };
}
