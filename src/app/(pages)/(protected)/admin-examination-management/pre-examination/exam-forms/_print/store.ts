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

/** Angular ParametersService hand-off when returning from print → exam-forms. */
export const EXAM_FORMS_RETURN_STATE_KEY = "collegeerp.examFormsReturnState";

export type ExamFormsReturnState = {
  collegeId: number;
  academicYearId: number;
  courseId: number;
  courseGroupId: number;
  courseYearId: number;
  examId: number;
  subjectId: number;
  regulationId: number;
  students: Record<string, unknown>[];
  selectedData?: string;
};

export function saveExamFormsReturnState(data: ExamFormsReturnState): void {
  try {
    sessionStorage.setItem(EXAM_FORMS_RETURN_STATE_KEY, JSON.stringify(data));
  } catch {
    // ignore quota / private mode
  }
}

export function loadExamFormsReturnState(): ExamFormsReturnState | null {
  try {
    const raw = sessionStorage.getItem(EXAM_FORMS_RETURN_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object"
      ? (parsed as ExamFormsReturnState)
      : null;
  } catch {
    return null;
  }
}

export function clearExamFormsReturnState(): void {
  try {
    sessionStorage.removeItem(EXAM_FORMS_RETURN_STATE_KEY);
  } catch {
    // ignore
  }
}

/** Persist filter + student list before leaving a print page (Angular goBack parity). */
export function saveReturnStateFromPrintPayload(
  payload: ExamFormsPrintPayload,
): void {
  saveExamFormsReturnState({
    collegeId: Number(payload.collegeId ?? 0),
    academicYearId: Number(payload.academicYearId ?? 0),
    courseId: Number(payload.courseId ?? 0),
    courseGroupId: Number(payload.courseGroupId ?? 0),
    courseYearId: Number(payload.courseYearId ?? 0),
    examId: Number(payload.examId ?? 0),
    subjectId: Number(payload.subjectId ?? 0),
    regulationId: Number(payload.regulationId ?? 0),
    students: Array.isArray(payload.students) ? payload.students : [],
  });
}

export const EXAM_FORMS_RETURN_HREF =
  "/admin-examination-management/pre-examination/exam-forms";
