import { buildQuery, domainList, getAllRecords, putDetails } from '@/services/crud'
import { EXAM_REVAL_API } from '@/config/constants/api'
import { GM_CODES } from '@/config/constants/ui'

type AnyRow = Record<string, any>

function procNameFromExamRevalPath(path: string): string {
  return path.replace(/^getAllRecords\//, '')
}

function numFrom(row: AnyRow | null | undefined, keys: string[]): number {
  for (const key of keys) {
    const val = Number(row?.[key])
    if (Number.isFinite(val) && val > 0) return val
  }
  return 0
}

function strFrom(row: AnyRow | null | undefined, keys: string[]): string {
  for (const key of keys) {
    const val = String(row?.[key] ?? '').trim()
    if (val) return val
  }
  return ''
}

/** Angular: `s_get_exam_filters_bycode` + `in_flag=std_exam_filters`, `in_param1=studentId`. */
export async function listStudentExamsForRevaluationFee(studentId: number, employeeId: number): Promise<AnyRow[]> {
  const data = await getAllRecords<{ result: AnyRow[][] }>('s_get_exam_filters_bycode', {
    in_flag: 'std_exam_filters',
    in_flag_type: '',
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
    in_sub_flag_type: '',
    in_param1: studentId,
    in_param2: 0,
  })
  const rows = data?.result?.[0] ?? []
  if (!Array.isArray(rows)) return []
  const seen = new Set<number>()
  const out: AnyRow[] = []
  for (const row of rows) {
    const id = numFrom(row, ['fk_exam_id', 'examId'])
    if (!id || seen.has(id)) continue
    seen.add(id)
    out.push(row)
  }
  return out
}

/** Angular: `GeneralDetail` under GM `REVISIONTYPE` (revision / photocopy types). */
export async function listExamRevisionTypes(): Promise<AnyRow[]> {
  return domainList<AnyRow>(
    'GeneralDetail',
    buildQuery({ 'GeneralMaster.generalMasterCode': GM_CODES.REVISION_TYPE, isActive: true }),
  )
}

/** Angular: `examStudentRevisedDetailsUrl` + `in_flag=examrevision_std_details`. */
export async function getExamRevisionStdDetailsBundle(params: {
  examId: number
  studentId: number
}): Promise<{ detailsList: AnyRow[]; receiptRows: AnyRow[] }> {
  const proc = procNameFromExamRevalPath(EXAM_REVAL_API.GET_STUDENT_REVISED_DETAILS)
  const data = await getAllRecords<{ result: AnyRow[][] }>(proc, {
    in_flag: 'examrevision_std_details',
    in_exam_id: params.examId,
    in_course_id: 0,
    in_course_group_id: 0,
    in_course_year_id: 0,
    in_student_id: params.studentId,
    in_loginemp_id: 0,
    in_subject_id: 0,
  })
  const result = data?.result ?? []
  return {
    detailsList: Array.isArray(result[0]) ? result[0] : [],
    receiptRows: Array.isArray(result[1]) ? result[1] : [],
  }
}

/**
 * Angular `studentFeeRevaluationUrl` + `in_flag=student_revision_request`.
 * Tries the same proc as revised details first, then a small set of legacy proc name fallbacks.
 */
export async function getStudentRevisionRequestHistory(params: {
  examId: number
  studentId: number
}): Promise<AnyRow[]> {
  const baseParams = {
    in_flag: 'student_revision_request',
    in_exam_id: params.examId,
    in_student_id: params.studentId,
    in_subject_id: 0,
  }
  const primary = procNameFromExamRevalPath(EXAM_REVAL_API.GET_STUDENT_REVISED_DETAILS)
  const fallbacks = [primary, 's_get_student_fee_revaluation', 's_get_exam_student_fee_revaluation']
  const tried = new Set<string>()
  for (const proc of fallbacks) {
    if (tried.has(proc)) continue
    tried.add(proc)
    try {
      const data = await getAllRecords<{ result: AnyRow[][] }>(proc, baseParams)
      const first = data?.result?.[0]
      if (Array.isArray(first)) return first
    } catch {
      // try next proc name
    }
  }
  return []
}

/**
 * Angular `studentFeeRevaluationUrl` + `in_flag=student_evaluation_details` (photocopy / evaluation view).
 */
export async function listStudentPhotocopyEvaluationDetails(params: {
  examId: number
  studentId: number
}): Promise<AnyRow[]> {
  const baseParams = {
    in_flag: 'student_evaluation_details',
    in_exam_id: params.examId,
    in_student_id: params.studentId,
    in_subject_id: 0,
  }
  const primary = procNameFromExamRevalPath(EXAM_REVAL_API.GET_STUDENT_REVISED_DETAILS)
  const fallbacks = [primary, 's_get_student_fee_revaluation', 's_get_exam_student_fee_revaluation']
  const tried = new Set<string>()
  for (const proc of fallbacks) {
    if (tried.has(proc)) continue
    tried.add(proc)
    try {
      const data = await getAllRecords<{ result: AnyRow[][] }>(proc, baseParams)
      const first = data?.result?.[0]
      if (Array.isArray(first)) return first
    } catch {
      // try next proc name
    }
  }
  return []
}

/** Angular: college timetable filter bundle for revised marks screens. */
export async function getReevaluationMarksFilters(args: {
  organizationId: number
  employeeId: number
}): Promise<AnyRow[]> {
  const data = await getAllRecords<{ result: AnyRow[][] }>('s_get_collegewisedetails_bycode', {
    in_flag: 'clg_exam_timetable_filters',
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
    in_employee: '',
    in_subject: '',
    in_gm_codes: 'SUBTYPE',
  })
  const groups = data?.result ?? []
  return (
    groups.find((g) => Array.isArray(g) && String(g?.[0]?.flag ?? '') === 'clg_exam_timetable_filters') ??
    groups[0] ??
    []
  )
}

/** Angular: examStudentRevisedDetailsUrl + in_flag=examrevision_std_marks_list. */
export async function getExamRevisionMarksBundle(params: {
  examId: number
  subjectId: number
}): Promise<{ studentRows: AnyRow[]; marksSetupRows: AnyRow[] }> {
  const proc = procNameFromExamRevalPath(EXAM_REVAL_API.GET_STUDENT_REVISED_DETAILS)
  const data = await getAllRecords<{ result: AnyRow[][] }>(proc, {
    in_flag: 'examrevision_std_marks_list',
    in_exam_id: params.examId,
    in_course_id: 0,
    in_course_group_id: 0,
    in_course_year_id: 0,
    in_subject_id: params.subjectId,
    in_student_id: 0,
    in_loginemp_id: 0,
  })
  const groups = data?.result ?? []
  const studentRows =
    groups.find((g) => Array.isArray(g) && String(g?.[0]?.flag ?? '') === 'examrevision_std_marks_list') ?? []
  const marksSetupRows =
    groups.find((g) => Array.isArray(g) && String(g?.[0]?.flag ?? '') === 'marks_setup') ?? []
  return { studentRows, marksSetupRows }
}

/** Angular: updateRevisedMarksUrl. */
export async function updateExamRevisedMarks(
  rows: Array<{
    examRevisionSubId: number
    revisedMarks: number
    revisedByEmpId: number
    revisedByEmpName: string
  }>,
): Promise<AnyRow> {
  return putDetails<AnyRow>(EXAM_REVAL_API.UPDATE_REVISED_MARKS, rows)
}

export type MergedRevaluationReceipt = {
  fk_exam_addt_fee_receipt_id: number
  fee_receipt_no: string
  receipt_date: string
  exam_total_amount: number | null
  payment_mode: string
  course_year_code: string
  subjects: AnyRow[]
}

function pickReceiptTotalAmount(curr: AnyRow): number | null {
  const a = curr.exam_total_amount
  const hasA = a !== undefined && a !== null && String(a).length > 0
  if (hasA) return Number(a)
  const b = curr.examTotalAmount
  const hasB = b !== undefined && b !== null && String(b).length > 0
  if (hasB) return Number(b)
  return null
}

/** Mirrors Angular `receiptsLists` aggregation keyed by `fk_exam_addt_fee_receipt_id`. */
export function mergeRevaluationReceiptRows(receiptRows: AnyRow[]): MergedRevaluationReceipt[] {
  if (!Array.isArray(receiptRows) || receiptRows.length === 0) return []
  const acc = new Map<number, MergedRevaluationReceipt>()
  for (const curr of receiptRows) {
    const id = Number(curr.fk_exam_addt_fee_receipt_id ?? curr.fkExamAddtFeeReceiptId ?? 0)
    if (!Number.isFinite(id) || id <= 0) continue
    if (!acc.has(id)) {
      acc.set(id, {
        fk_exam_addt_fee_receipt_id: id,
        fee_receipt_no: strFrom(curr, ['fee_receipt_no', 'feeReceiptNo']),
        receipt_date: strFrom(curr, ['receipt_date', 'receiptDate']),
        exam_total_amount: pickReceiptTotalAmount(curr),
        payment_mode: strFrom(curr, ['payment_mode', 'paymentMode']),
        course_year_code: strFrom(curr, ['course_year_code', 'courseYearCode']),
        subjects: [],
      })
    }
    const bucket = acc.get(id)
    if (bucket) bucket.subjects.push({ ...curr })
  }
  return [...acc.values()].sort((a, b) => String(b.receipt_date).localeCompare(String(a.receipt_date)))
}
