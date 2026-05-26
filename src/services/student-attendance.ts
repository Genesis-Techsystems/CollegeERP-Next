type AnyRow = Record<string, unknown>

export type StudentAttendanceView = {
  totalClasses: number
  present: number
  absent: number
  totalAttendancePct: number
  subjects: AnyRow[]
}

function num(row: AnyRow, keys: string[]): number {
  for (const key of keys) {
    const value = Number(row[key] ?? 0)
    if (Number.isFinite(value) && value >= 0) return value
  }
  return 0
}

function text(row: AnyRow, keys: string[]): string {
  for (const key of keys) {
    const value = row[key]
    if (value != null && String(value).trim() !== '') return String(value).trim()
  }
  return ''
}

function hasSubjectRow(row: AnyRow): boolean {
  return Boolean(
    text(row, [
      'Subject_name',
      'Subject_Code',
      'subjectName',
      'subject_name',
      'subjectCode',
      'subject_code',
      'courseName',
      'course_name',
    ]),
  )
}

const HELD_KEYS = ['Total_classes', 'classesHeld', 'classes_held', 'totalClasses', 'total_classes', 'classHeld']
const PRESENT_KEYS = ['Present_classes', 'present', 'presentCount', 'present_count', 'noOfPresent', 'presentDays']
const ABSENT_KEYS = ['Absent_classes', 'absent', 'absentCount', 'absent_count', 'noOfAbsent', 'absentDays']
const PCT_KEYS = [
  'Percentage',
  'attendancePercentage',
  'attendance_percent',
  'presentPercentage',
  'present_percent',
  'attendancePer',
]

function rowHeld(row: AnyRow): number {
  const held = num(row, HELD_KEYS)
  if (held > 0) return held
  const p = num(row, PRESENT_KEYS)
  const a = num(row, ABSENT_KEYS)
  return p + a > 0 ? p + a : 0
}

/** Angular students-profile attendance tab — donut totals + per-subject grid. */
export function buildStudentAttendanceView(rowsInput: unknown): StudentAttendanceView {
  const rows = Array.isArray(rowsInput) ? (rowsInput as AnyRow[]) : []
  const subjects = rows.filter(hasSubjectRow)

  const summaryCandidates = rows.filter((r) => !hasSubjectRow(r) && rowHeld(r) > 0)
  const summaryRow = summaryCandidates[0]

  let totalClasses = 0
  let present = 0
  let absent = 0

  if (summaryRow) {
    totalClasses = rowHeld(summaryRow)
    present = num(summaryRow, PRESENT_KEYS)
    absent = num(summaryRow, ABSENT_KEYS)
  } else {
    for (const row of subjects.length > 0 ? subjects : rows) {
      const held = rowHeld(row)
      const p = num(row, PRESENT_KEYS)
      const a = num(row, ABSENT_KEYS)
      totalClasses += held
      present += p
      absent += a > 0 ? a : Math.max(0, held - p)
    }
  }

  if (absent <= 0 && totalClasses > present) absent = totalClasses - present
  if (totalClasses <= 0 && present + absent > 0) totalClasses = present + absent

  const pctFromRow = summaryRow ? num(summaryRow, PCT_KEYS) : 0
  const totalAttendancePct =
    pctFromRow > 0
      ? Math.round(pctFromRow)
      : totalClasses > 0
        ? Math.round((present / totalClasses) * 100)
        : 0

  return {
    totalClasses,
    present,
    absent,
    totalAttendancePct,
    subjects: subjects.length > 0 ? subjects : rows,
  }
}
