/**
 * In-memory hand-off for exam-fee print pages (Angular ParametersService.Studentexamfeereceipt).
 */

export const EXAM_FEE_PRINT_STORAGE_KEY = 'collegeerp.examFeePrintPayload'

export type ExamFeePrintPayload = Record<string, any>

export function saveExamFeePrintPayload(data: ExamFeePrintPayload): void {
  try {
    sessionStorage.setItem(EXAM_FEE_PRINT_STORAGE_KEY, JSON.stringify(data))
  } catch {
    // ignore quota / private mode
  }
}

export function loadExamFeePrintPayload(): ExamFeePrintPayload | null {
  try {
    const raw = sessionStorage.getItem(EXAM_FEE_PRINT_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? (parsed as ExamFeePrintPayload) : null
  } catch {
    return null
  }
}

export function clearExamFeePrintPayload(): void {
  try {
    sessionStorage.removeItem(EXAM_FEE_PRINT_STORAGE_KEY)
  } catch {
    // ignore
  }
}

/** Build back-link query string for returning to Exam Fee Collection. */
export function examFeeCollectionReturnHref(data: ExamFeePrintPayload | null): string {
  const base = '/admin-examination-management/pre-examination/student-exam-fee-registration'
  if (!data) return base
  const q = new URLSearchParams()
  const studentId = Number(data.studentId ?? 0)
  const examId = Number(data.examId ?? 0)
  const courseYearId = Number(data.courseYearId ?? 0)
  const roll = String(data.stdRollNumber ?? data.hallticketNumber ?? '').trim()
  if (studentId) q.set('studentId', String(studentId))
  if (examId) q.set('examId', String(examId))
  if (courseYearId) q.set('courseYearId', String(courseYearId))
  if (roll) q.set('stdRollNumber', roll)
  const qs = q.toString()
  return qs ? `${base}?${qs}` : base
}
