/**
 * In-memory hand-off for exam-fee print pages (Angular ParametersService.Studentexamfeereceipt).
 */

export const EXAM_FEE_PRINT_STORAGE_KEY = "collegeerp.examFeePrintPayload";

export type ExamFeePrintPayload = Record<string, any>;

export function saveExamFeePrintPayload(data: ExamFeePrintPayload): void {
  try {
    sessionStorage.setItem(EXAM_FEE_PRINT_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore quota / private mode
  }
}

export function loadExamFeePrintPayload(): ExamFeePrintPayload | null {
  try {
    const raw = sessionStorage.getItem(EXAM_FEE_PRINT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object"
      ? (parsed as ExamFeePrintPayload)
      : null;
  } catch {
    return null;
  }
}

export function clearExamFeePrintPayload(): void {
  try {
    sessionStorage.removeItem(EXAM_FEE_PRINT_STORAGE_KEY);
  } catch {
    // ignore
  }
}

/** Preserve collection filters + working data across print → Back. */
export const EXAM_FEE_RETURN_STATE_KEY = "collegeerp.examFeeReturnState";

export const EXAM_FEE_COLLECTION_HREF =
  "/admin-examination-management/pre-examination/student-exam-fee-registration";

export type ExamFeeReturnState = {
  students: Record<string, any>[];
  studentId: number | null;
  student: Record<string, any>;
  examsList: Record<string, any>[];
  examId: number | null;
  flag: boolean;
  allCourseYears: Record<string, any>[];
  courseYearsList: Record<string, any>[];
  examDetailsList: Record<string, any>[];
  courseYears: Record<string, any>[];
  courseYearId: number | null;
  checkExam: 1 | 2;
  studentCurrentCourseYearId: number | null;
  studentSubjects: Record<string, any>[];
  checksubject: boolean;
  searchText: string;
  examFeeStructure: Record<string, any>[];
  courseYearFee: Record<string, any>[];
  paymentModeCatId: number | null;
  chequeNo: string;
  ddno: string;
  referenceNumber: string;
  transactionNo: string;
  receiptDate: string | null;
  feeComments: string;
  feeReceipts: Record<string, any>[];
  coursesYearList: Record<string, any>[];
};

export function saveExamFeeReturnState(data: ExamFeeReturnState): void {
  try {
    sessionStorage.setItem(EXAM_FEE_RETURN_STATE_KEY, JSON.stringify(data));
  } catch {
    // ignore quota / private mode
  }
}

export function loadExamFeeReturnState(): ExamFeeReturnState | null {
  try {
    const raw = sessionStorage.getItem(EXAM_FEE_RETURN_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object"
      ? (parsed as ExamFeeReturnState)
      : null;
  } catch {
    return null;
  }
}

export function clearExamFeeReturnState(): void {
  try {
    sessionStorage.removeItem(EXAM_FEE_RETURN_STATE_KEY);
  } catch {
    // ignore
  }
}

/** Build back-link for returning to Exam Fee Collection (keeps filters via return-state). */
export function examFeeCollectionReturnHref(
  _data?: ExamFeePrintPayload | null,
): string {
  return EXAM_FEE_COLLECTION_HREF;
}
