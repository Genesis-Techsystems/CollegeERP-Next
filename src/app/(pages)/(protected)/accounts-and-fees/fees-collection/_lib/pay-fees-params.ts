import type { StudentFeeSearchRow, StudentFeeStructureRow } from '@/types/fees-collection'

function pickStr(...values: unknown[]): string | undefined {
  for (const v of values) {
    if (v == null) continue
    const s = String(v).trim()
    if (s) return s
  }
  return undefined
}

function pickNum(...values: unknown[]): number | undefined {
  for (const v of values) {
    const n = Number(v)
    if (Number.isFinite(n) && n > 0) return n
  }
  return undefined
}

/** Build a student row from list/pay URL query params (back-navigation / deep links). */
export function studentFromPayQueryParams(sp: URLSearchParams): StudentFeeSearchRow | null {
  const studentId = pickNum(sp.get('studentId'))
  if (!studentId) return null
  return {
    studentId,
    collegeId: pickNum(sp.get('collegeId')),
    firstName: pickStr(sp.get('firstName'), sp.get('studentName')),
    rollNumber: pickStr(sp.get('rollNumber')),
    hallticketNumber: pickStr(sp.get('hallTicketNo'), sp.get('hallticketNumber')),
    collegeCode: pickStr(sp.get('collegeCode')),
    academicYear: pickStr(sp.get('academicYear')),
    courseCode: pickStr(sp.get('courseCode')),
    groupCode: pickStr(sp.get('groupCode')),
    courseYearName: pickStr(sp.get('courseYearName')),
    section: pickStr(sp.get('section')),
    quotaDisplayName: pickStr(sp.get('quotaDisplayName')),
    studentStatusCode: pickStr(sp.get('studentStatusCode')),
    studentStatusDisplayName: pickStr(sp.get('studentStatusDisplayName')),
    isLateral: sp.get('isLateral') === 'true' ? true : sp.get('isLateral') === 'false' ? false : undefined,
  }
}

/**
 * Query params for `/payment/pay-fees`.
 * Pulls IDs/labels from student search row and fee-structure row so pay screen
 * works even when some student fields are missing.
 */
export function buildPayFeesSearchParams(
  student: StudentFeeSearchRow,
  row: StudentFeeStructureRow,
  page = 'fee-payment',
): URLSearchParams {
  const collegeId = pickNum(student.collegeId, row.collegeId)
  const studentId = pickNum(row.studentId, student.studentId)
  const academicYearId = pickNum(row.academicYearId)
  const feeStructureId = pickNum(row.feeStructureId)

  const params = new URLSearchParams({ page })
  if (collegeId) params.set('collegeId', String(collegeId))
  if (studentId) params.set('studentId', String(studentId))
  if (academicYearId) params.set('academicYearId', String(academicYearId))
  if (feeStructureId) params.set('feeStructureId', String(feeStructureId))

  const academicYear = pickStr(row.academicYear, student.academicYear)
  if (academicYear) params.set('academicYear', academicYear)

  const collegeCode = pickStr(student.collegeCode, row.collegeCode)
  if (collegeCode) params.set('collegeCode', collegeCode)

  const rollNumber = pickStr(student.rollNumber, row.rollNumber)
  if (rollNumber) params.set('rollNumber', rollNumber)

  const hallTicket = pickStr(student.hallticketNumber, row.hallticketNumber, row.hallTicketNo)
  if (hallTicket) params.set('hallTicketNo', hallTicket)

  const quota = pickStr(student.quotaDisplayName, row.quotaDisplayName)
  if (quota) params.set('quotaDisplayName', quota)

  const courseCode = pickStr(row.courseName, row.courseCode, student.courseCode)
  if (courseCode) params.set('courseCode', courseCode)

  const groupCode = pickStr(row.groupName, row.groupCode, student.groupCode)
  if (groupCode) params.set('groupCode', groupCode)

  const courseYearName = pickStr(row.courseYearName, student.courseYearName)
  if (courseYearName) params.set('courseYearName', courseYearName)

  const section = pickStr(row.section, student.section)
  if (section) params.set('section', section)

  const firstName = pickStr(row.firstName, student.firstName)
  if (firstName) params.set('firstName', firstName)

  const statusCode = pickStr(student.studentStatusCode, row.studentStatusCode)
  if (statusCode) params.set('studentStatusCode', statusCode)

  const statusName = pickStr(student.studentStatusDisplayName, row.studentStatusDisplayName)
  if (statusName) params.set('studentStatusDisplayName', statusName)

  if (student.isLateral != null) params.set('isLateral', String(student.isLateral))
  else if (row.isLateral != null) params.set('isLateral', String(row.isLateral))

  return params
}

/** True when pay-fees has the minimum IDs needed to load fee student data. */
export function hasRequiredPayFeesIds(sp: URLSearchParams): boolean {
  return (
    pickNum(sp.get('collegeId')) != null &&
    pickNum(sp.get('academicYearId')) != null &&
    pickNum(sp.get('studentId')) != null &&
    pickNum(sp.get('feeStructureId')) != null
  )
}
