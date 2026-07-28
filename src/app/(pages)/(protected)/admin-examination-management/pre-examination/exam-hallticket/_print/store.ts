/**
 * Angular ParametersService hand-off for exam-hallticket bulk print.
 * Uses in-memory first (avoids QuotaExceededError from large subject payloads),
 * with a slim sessionStorage backup for refresh.
 */

export const EXAM_HALLTICKET_PRINT_STORAGE_KEY =
  "collegeerp.examHallticketPrintPayload";

export type ExamHallticketPrintPayload = {
  rows: Record<string, unknown>[];
  universityCode: string;
  formValues?: {
    collegeId?: number;
    academicYearId?: number;
    courseId?: number;
    courseGroupId?: number;
    courseYearId?: number;
    examId?: number;
  };
};

/** Drop bulky / unused fields so sessionStorage does not overflow. */
function slimRows(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return rows.map((r) => {
    const {
      omrBarcode: _o1,
      omr_barcode: _o2,
      studentPhotoBase64: _p1,
      student_photo_base64: _p2,
      ...rest
    } = r;
    return rest;
  });
}

let memoryPayload: ExamHallticketPrintPayload | null = null;

export function saveExamHallticketPrintPayload(
  data: ExamHallticketPrintPayload,
): void {
  const payload: ExamHallticketPrintPayload = {
    ...data,
    rows: slimRows(data.rows ?? []),
  };
  memoryPayload = payload;
  try {
    sessionStorage.setItem(
      EXAM_HALLTICKET_PRINT_STORAGE_KEY,
      JSON.stringify(payload),
    );
  } catch {
    // QuotaExceeded — in-memory payload still works for same-tab navigation.
  }
}

export function loadExamHallticketPrintPayload(): ExamHallticketPrintPayload | null {
  if (memoryPayload?.rows?.length) return memoryPayload;
  try {
    const raw = sessionStorage.getItem(EXAM_HALLTICKET_PRINT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object"
      ? (parsed as ExamHallticketPrintPayload)
      : null;
  } catch {
    return null;
  }
}

export function clearExamHallticketPrintPayload(): void {
  memoryPayload = null;
  try {
    sessionStorage.removeItem(EXAM_HALLTICKET_PRINT_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export const EXAM_HALLTICKET_RETURN_HREF =
  "/admin-examination-management/pre-examination/exam-hallticket";
