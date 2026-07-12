import { EXAM_API, STUDENT_API } from '@/config/constants/api'
import { buildQuery, domainCreate, domainList, domainUpdate, getAllRecords, postDetails } from '@/services/crud'
import { listCourseYearsByCourse } from '@/services/admin/college-courses-groups'
import { fetchStudentDetail, listGeneralDetailsByCode } from '@/services/student-information'
import { unwrapFeeLedgerRows } from '@/services/student-fee'
import { getStudentProfileContext, fetchStudentProfileFeeLedgerSummary } from '@/services/student-profile'

type AnyRow = Record<string, unknown>

export type PrincipalActivityCategory = 'PROJECTEXECUTED' | 'COCIRCULAR' | 'EXTRACIRCULAR'

function text(row: AnyRow, keys: string[]): string {
  for (const key of keys) {
    const value = row[key]
    if (value === null || value === undefined) continue
    const out = String(value).trim()
    if (out) return out
  }
  return ''
}

function procName(path: string): string {
  return path.startsWith('getAllRecords/') ? path.slice('getAllRecords/'.length) : path
}

function flattenRows(data: unknown): AnyRow[] {
  return unwrapFeeLedgerRows(data) as AnyRow[]
}

export type PrincipalStudentProfileExamSemester = {
  courseYearCode: string
  subjects: AnyRow[]
}

export type PrincipalStudentProfileData = {
  student: AnyRow
  feeLedger: AnyRow | null
  educationDetails: AnyRow[]
  examSemesters: PrincipalStudentProfileExamSemester[]
  projects: AnyRow[]
  activities: AnyRow[]
  extraActivities: AnyRow[]
}

/** Angular `studentProfileCrudUrl` — StudentProfile rows for a student. */
export async function listStudentProfileActivities(studentId: number): Promise<AnyRow[]> {
  if (!studentId) return []
  const queries = [
    buildQuery({ 'studentdetail.studentId': studentId, isActive: true }),
    buildQuery({ 'StudentDetail.studentId': studentId, isActive: true }),
    buildQuery({ studentId, isActive: true }),
  ]
  for (const q of queries) {
    try {
      const rows = await domainList<AnyRow>('StudentProfile', q)
      if (rows.length > 0) return rows
    } catch {
      // try next query shape
    }
  }
  return []
}

export function splitStudentProfileActivities(rows: AnyRow[]): {
  projects: AnyRow[]
  activities: AnyRow[]
  extraActivities: AnyRow[]
} {
  const projects: AnyRow[] = []
  const activities: AnyRow[] = []
  const extraActivities: AnyRow[] = []
  for (const row of rows) {
    const code = text(row, ['eventMasterCatdetCode', 'event_master_catdet_code']).toUpperCase()
    if (code === 'COCIRCULAR') activities.push(row)
    else if (code === 'EXTRACIRCULAR') extraActivities.push(row)
    else projects.push(row)
  }
  return { projects, activities, extraActivities }
}

/** Angular principal profile `getCourseYearSubjects` — all semesters (`courseYearId` = 0). */
export async function loadPrincipalStudentProfileExamination(student: AnyRow): Promise<AnyRow[]> {
  const ctx = getStudentProfileContext(student as Record<string, unknown>)
  if (!ctx.studentId || !ctx.collegeId) return []

  try {
    const raw = await getAllRecords<unknown>(procName(EXAM_API.GET_EXAM_STUDENT_RESULTS), {
      in_flag: 'exam_std_result_detail',
      in_exam_id: 0,
      in_course_id: 0,
      in_college_id: ctx.collegeId,
      in_course_group_id: 0,
      in_course_year_id: 0,
      in_std_id: ctx.studentId,
      in_regulation_id: 0,
      in_ispass: '-1',
      in_subject_id: 0,
      in_above_fail_subjects: '-1',
      in_below_credits: '-1',
    })
    return flattenRows(raw)
  } catch {
    return []
  }
}

export function groupPrincipalExamResults(rows: AnyRow[]): PrincipalStudentProfileExamSemester[] {
  const order: string[] = []
  const map = new Map<string, AnyRow[]>()
  for (const row of rows) {
    const code = text(row, [
      'course_year_code',
      'courseYearCode',
      'course_year_name',
      'courseYearName',
    ])
    if (!code) continue
    if (!map.has(code)) {
      map.set(code, [])
      order.push(code)
    }
    map.get(code)!.push(row)
  }
  return order.map((courseYearCode) => ({
    courseYearCode,
    subjects: map.get(courseYearCode) ?? [],
  }))
}

/** Angular principal `student-details` page payload. */
export async function loadPrincipalStudentProfile(
  studentId: number,
): Promise<PrincipalStudentProfileData | null> {
  const student = await fetchStudentDetail(studentId)
  if (!student) return null

  const [activityRows, examRows, feeLedger] = await Promise.all([
    listStudentProfileActivities(studentId),
    loadPrincipalStudentProfileExamination(student as AnyRow),
    fetchStudentProfileFeeLedgerSummary(studentId).catch(() => null),
  ])

  const { projects, activities, extraActivities } = splitStudentProfileActivities(activityRows)
  const educationRaw = (student as AnyRow).studentEducationDetails
  const educationDetails = Array.isArray(educationRaw) ? (educationRaw as AnyRow[]) : []

  return {
    student: student as AnyRow,
    feeLedger: (feeLedger as AnyRow | null) ?? null,
    educationDetails,
    examSemesters: groupPrincipalExamResults(examRows),
    projects,
    activities,
    extraActivities,
  }
}

function num(row: AnyRow, keys: string[]): number {
  for (const key of keys) {
    const value = Number(row[key] ?? 0)
    if (Number.isFinite(value) && value > 0) return value
  }
  return 0
}

/** Angular add-activity modal — activity titles + semesters for a category. */
export async function loadPrincipalActivityFormOptions(
  courseId: number,
  categoryCode: PrincipalActivityCategory,
): Promise<{ activities: AnyRow[]; courseYears: AnyRow[] }> {
  const [activities, courseYears] = await Promise.all([
    listGeneralDetailsByCode(categoryCode),
    listCourseYearsByCourse(courseId),
  ])
  return { activities, courseYears }
}

export type PrincipalActivitySavePayload = {
  eventTitleCatdetId: number
  courseYearId: number
  studentId: number
  isActive: boolean
  reason: string
  studentProfileId?: number
}

/** Angular `addDetails` / `updateDetails` on `studentProfileCrudUrl`. */
export async function savePrincipalStudentProfileActivity(
  payload: PrincipalActivitySavePayload,
  activityOptions: AnyRow[],
): Promise<void> {
  const selected = activityOptions.find(
    (row) => num(row, ['generalDetailId', 'general_detail_id']) === payload.eventTitleCatdetId,
  )
  const body: Record<string, unknown> = {
    eventTitleCatdetId: payload.eventTitleCatdetId,
    courseYearId: payload.courseYearId,
    studentId: payload.studentId,
    isActive: payload.isActive,
    reason: payload.reason,
    eventMasterCatdetId: selected
      ? num(selected, ['generalMasterId', 'general_master_id', 'fk_general_master_id'])
      : 0,
  }

  if (payload.studentProfileId) {
    await domainUpdate(
      'StudentProfile',
      'studentProfileId',
      payload.studentProfileId,
      body,
    )
    return
  }

  try {
    await domainCreate('StudentProfile', body)
  } catch {
    await postDetails(STUDENT_API.PROFILE, body)
  }
}
