/**
 * Angular ParametersService hand-off for exam-forms print routes
 * (FormData / AFormData / dFormData).
 */

export const EXAM_FORMS_PRINT_STORAGE_KEY = "collegeerp.examFormsPrintPayload";

export type ExamFormsPrintVariant = "form" | "formA" | "dform";

export type ExamFormsPrintPayload = {
  variant: ExamFormsPrintVariant;
  students: Record<string, unknown>[];
  courseYear: string;
  examName: string;
  logoUrl?: string;
  groupName?: string;
  collegeId?: number;
  academicYearId?: number;
  courseId?: number;
  courseGroupId?: number;
  courseYearId?: number;
  examId?: number;
  subjectId?: number;
  regulationId?: number;
};

export function saveExamFormsPrintPayload(data: ExamFormsPrintPayload): void {
  try {
    sessionStorage.setItem(EXAM_FORMS_PRINT_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore quota / private mode
  }
}

export function loadExamFormsPrintPayload(): ExamFormsPrintPayload | null {
  try {
    const raw = sessionStorage.getItem(EXAM_FORMS_PRINT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object"
      ? (parsed as ExamFormsPrintPayload)
      : null;
  } catch {
    return null;
  }
}

export function clearExamFormsPrintPayload(): void {
  try {
    sessionStorage.removeItem(EXAM_FORMS_PRINT_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export const EXAM_FORMS_RETURN_HREF =
  "/admin-examination-management/pre-examination/exam-forms";
