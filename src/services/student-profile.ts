import {
  ATTENDANCE_API,
  DASHBOARD_API,
  EXAM_API,
  FEE_API,
  MISC_REPORT_API,
} from '@/config/constants/api'
import {
  buildQuery,
  domainList,
  fetchDetails,
  getAllRecords,
} from '@/services/crud'
import { listCourseYearsByCourse } from '@/services/admin/college-courses-groups'
import {
  listAcademicBatchesOfStudent,
  listStudentSubjectsForStudent,
  listStudentSubjectsForStudentSemester,
} from '@/services/student-information'
import { fetchFeeLedgerRows, isCourseFeeSummaryRow, unwrapFeeLedgerRows } from '@/services/student-fee'
import {
  fetchStudentTimetableRows,
  fetchWeeklyTimetableReportRows,
  normalizeTimetableRows,
} from '@/services/student-timetable'

type AnyRow = Record<string, any>

export type StudentProfileTab =
  | 'curriculum'
  | 'timetable'
  | 'attendance'
  | 'fee'
  | 'counselor'
  | 'books'
  | 'exam_results'
  | 'backlogs'
  | 'placements'

export type StudentProfileContext = {
  studentId: number
  collegeId: number
  academicYearId: number
  courseId: number
  courseYearId: number
  courseGroupId: number
  groupSectionId: number
}

function text(row: AnyRow, keys: string[]): string {
  for (const key of keys) {
    const value = row?.[key]
    if (value === null || value === undefined) continue
    const out = String(value).trim()
    if (out) return out
  }
  return ''
}

function num(row: AnyRow, keys: string[]): number {
  for (const key of keys) {
    const value = Number(row?.[key] ?? 0)
    if (Number.isFinite(value) && value > 0) return value
  }
  return 0
}

function procName(path: string): string {
  return path.startsWith('getAllRecords/') ? path.slice('getAllRecords/'.length) : path
}

function nestedArrayFromDetail(student: AnyRow, keys: string[]): AnyRow[] {
  for (const k of keys) {
    const v = student[k]
    if (Array.isArray(v) && v.length > 0) return v as AnyRow[]
  }
  return []
}

/** Scan all `studentdetail` array properties (Angular embeds tab lists on the root DTO). */
function arraysFromStudentByPattern(student: AnyRow, patterns: RegExp[]): AnyRow[] {
  const rows: AnyRow[] = []
  for (const [key, val] of Object.entries(student)) {
    if (!Array.isArray(val) || val.length === 0) continue
    if (!patterns.some((p) => p.test(key))) continue
    for (const item of val) {
      if (item && typeof item === 'object' && !Array.isArray(item)) rows.push(item as AnyRow)
    }
  }
  return rows
}

function mergeProfileArrays(student: AnyRow, keys: string[], patterns: RegExp[]): AnyRow[] {
  const explicit = nestedArrayFromDetail(student, keys)
  if (explicit.length > 0) return explicit
  return arraysFromStudentByPattern(student, patterns)
}

function flattenRecordRows(data: unknown): AnyRow[] {
  return unwrapFeeLedgerRows(data)
}

function deepNum(root: AnyRow, keys: string[]): number {
  const direct = num(root, keys)
  if (direct > 0) return direct
  for (const value of Object.values(root)) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue
    const nested = deepNum(value as AnyRow, keys)
    if (nested > 0) return nested
  }
  return 0
}

/** Nested `course` / `Course` on studentdetail matches Angular/ Hibernate DTOs. */
function resolveCourseId(student: AnyRow): number {
  const course = student.course ?? student.Course
  if (course && typeof course === 'object' && !Array.isArray(course)) {
    const fromCourse = num(course as AnyRow, ['courseId', 'fk_course_id'])
    if (fromCourse) return fromCourse
  }
  return num(student, ['courseId', 'fk_course_id', 'course.courseId', 'Course.courseId'])
}

export function getStudentProfileContext(student: AnyRow): StudentProfileContext {
  return {
    studentId: deepNum(student, [
      'profileStudentId',
      'studentId',
      'fk_student_id',
      'student_id',
      'studentDetailId',
      'student_detail_id',
      'pk_student_detail_id',
      'id',
    ]),
    collegeId: deepNum(student, [
      'collegeId',
      'fk_college_id',
      'college.collegeId',
      'College.collegeId',
      'fk_collegeId',
    ]),
    academicYearId: deepNum(student, [
      'academicYearId',
      'fk_academic_year_id',
      'academicYear.academicYearId',
      'AcademicYear.academicYearId',
      'fk_academicYearId',
    ]),
    courseId: resolveCourseId(student),
    courseYearId: deepNum(student, [
      'courseYearId',
      'fk_course_year_id',
      'courseYear.courseYearId',
      'CourseYear.courseYearId',
    ]),
    courseGroupId: deepNum(student, [
      'courseGroupId',
      'fk_course_group_id',
      'courseGroup.courseGroupId',
      'CourseGroup.courseGroupId',
    ]),
    groupSectionId: deepNum(student, [
      'groupSectionId',
      'fk_group_section_id',
      'groupSection.groupSectionId',
      'GroupSection.groupSectionId',
      'groupSection.id',
      'GroupSection.id',
      'group_section_id',
      'sectionId',
      'fk_section_id',
      'fk_groupSectionId',
    ]),
  }
}

export type StudentCurriculumSemester = {
  courseYearId: number
  label: string
  sortOrder: number
}

export type StudentCurriculumSemesterPayload = {
  subjects: AnyRow[]
  electives: AnyRow[]
  labBatches: AnyRow[]
}

export type StudentCurriculumData = {
  semesters: StudentCurriculumSemester[]
  subjectsBySemester: Record<number, AnyRow[]>
  electivesBySemester: Record<number, AnyRow[]>
  labBatchesBySemester: Record<number, AnyRow[]>
  academicDetails: AnyRow[]
}

export type StudentCurriculumShell = {
  semesters: StudentCurriculumSemester[]
  academicDetails: AnyRow[]
}

function rowCourseYearId(row: AnyRow): number {
  const nestedYear = row.courseYear ?? row.CourseYear
  if (nestedYear && typeof nestedYear === 'object' && !Array.isArray(nestedYear)) {
    const fromNested = num(nestedYear as AnyRow, ['courseYearId', 'fk_course_year_id'])
    if (fromNested) return fromNested
  }
  return num(row, [
    'courseYearId',
    'fk_course_year_id',
    'course_year_id',
    'courseYear.courseYearId',
    'CourseYear.courseYearId',
    'toCourseYearId',
    'fk_to_course_year_id',
    'fromCourseYearId',
    'fk_from_course_year_id',
  ])
}

function stampCourseYearId(rows: AnyRow[], courseYearId: number): AnyRow[] {
  if (!courseYearId) return rows
  return rows.map((row) => {
    if (rowCourseYearId(row)) return row
    return { ...row, courseYearId, fk_course_year_id: courseYearId }
  })
}

function academicYearIdForSemester(
  courseYearId: number,
  academicDetails: AnyRow[],
  fallbackAcademicYearId: number,
): number {
  for (const row of academicDetails) {
    const toCy = num(row, ['toCourseYearId', 'fk_to_course_year_id', 'to_course_year_id'])
    const fromCy = num(row, ['fromCourseYearId', 'fk_from_course_year_id', 'from_course_year_id'])
    if (toCy === courseYearId || fromCy === courseYearId || rowCourseYearId(row) === courseYearId) {
      const ay = num(row, [
        'academicYearId',
        'fk_academic_year_id',
        'academicYear.academicYearId',
        'AcademicYear.academicYearId',
      ])
      if (ay) return ay
    }
  }
  return fallbackAcademicYearId
}

function isElectiveSubject(row: AnyRow): boolean {
  const code = text(row, [
    'subjectTypeCode',
    'subject_type_code',
    'subjectType',
    'subject_type',
    'subjectTypeName',
    'subject_type_name',
  ]).toUpperCase()
  return code.includes('ELECTIVE') || code === 'ELEC'
}

function semesterLabel(cy: AnyRow): string {
  return (
    text(cy, ['courseYearName', 'course_year_name', 'courseYearCode', 'course_year_code']) ||
    text(cy, ['yearSemName', 'semesterName', 'semester_name']) ||
    `Semester ${num(cy, ['courseYearId', 'fk_course_year_id'])}`
  )
}

function semesterSortOrder(cy: AnyRow): number {
  const year = num(cy, ['yearNo', 'year_no', 'courseYearOrder', 'year_order'])
  const sem = num(cy, ['semesterNo', 'semester_no', 'semNo', 'sem_no'])
  if (year || sem) return year * 10 + sem
  return num(cy, ['courseYearId', 'fk_course_year_id'])
}

function dedupeRows(rows: AnyRow[], keyFn: (row: AnyRow) => string): AnyRow[] {
  const seen = new Set<string>()
  return rows.filter((row) => {
    const key = keyFn(row)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

async function fetchSubjectsForSemester(
  student: AnyRow,
  ctx: StudentProfileContext,
  courseYearId: number,
  academicYearId: number,
): Promise<AnyRow[]> {
  if (!ctx.studentId || !courseYearId) return []

  const courseId = num(student, ['courseId', 'fk_course_id', 'course.courseId', 'Course.courseId'])
  const collected: AnyRow[] = []

  if (ctx.collegeId) {
    const domainRows = await listStudentSubjectsForStudentSemester({
      collegeId: ctx.collegeId,
      studentId: ctx.studentId,
      courseYearId,
      academicYearId: academicYearId || undefined,
    })
    collected.push(...stampCourseYearId(domainRows, courseYearId))
  }

  const paramSets: Record<string, string | number>[] = [
    { studentId: ctx.studentId, courseYearId },
    { studentId: ctx.studentId, collegeId: ctx.collegeId, courseYearId },
  ]
  if (academicYearId) {
    paramSets.push({ studentId: ctx.studentId, collegeId: ctx.collegeId, academicYearId, courseYearId })
  }
  if (courseId) {
    paramSets.push({ studentId: ctx.studentId, collegeId: ctx.collegeId, courseId, courseYearId })
    if (academicYearId) {
      paramSets.push({ studentId: ctx.studentId, collegeId: ctx.collegeId, academicYearId, courseId, courseYearId })
    }
  }
  for (const p of paramSets) {
    try {
      const data = await fetchDetails<unknown>('studentsubjects', p)
      const rows = stampCourseYearId(flattenRecordRows(data), courseYearId)
      if (rows.length > 0) collected.push(...rows)
    } catch {
      // try next
    }
  }

  return collected
}

async function fetchAllStudentSubjects(
  student: AnyRow,
  ctx: StudentProfileContext,
  semesters: StudentCurriculumSemester[],
  academicDetails: AnyRow[],
): Promise<AnyRow[]> {
  const nested = stampCourseYearId(
    mergeProfileArrays(
      student,
      [
        'studentSubjects',
        'studentSubjectList',
        'studentSubjectDTOList',
        'subjects',
        'subjectList',
        'curriculumSubjects',
        'semesterWiseSubjects',
        'studentSemesterSubjects',
      ],
      [/subject/i, /curriculum/i, /semester/i],
    ),
    0,
  )

  const merged: AnyRow[] = [...nested]
  const semesterList =
    semesters.length > 0
      ? semesters
      : ctx.courseYearId
        ? [{ courseYearId: ctx.courseYearId, label: '', sortOrder: 0 }]
        : []

  await Promise.all(
    semesterList.map(async (sem) => {
      const ayId = academicYearIdForSemester(sem.courseYearId, academicDetails, ctx.academicYearId)
      const rows = await fetchSubjectsForSemester(student, ctx, sem.courseYearId, ayId)
      merged.push(...rows)
    }),
  )

  return dedupeRows(merged, (r) => {
    const cy = rowCourseYearId(r)
    const id = num(r, ['studentSubjectId', 'student_subject_id', 'id'])
    return String(id || `${cy}-${text(r, ['subjectCode', 'subject_code'])}-${text(r, ['academicYear', 'academic_year'])}`)
  })
}

async function fetchElectivesForSemester(
  student: AnyRow,
  ctx: StudentProfileContext,
  courseYearId: number,
  semesterSubjects: AnyRow[],
): Promise<AnyRow[]> {
  const nested = nestedArrayFromDetail(student, [
    'studentElectives',
    'electiveSubjects',
    'electiveSubjectList',
    'electiveGroupList',
    'stdElectiveList',
  ]).filter((r) => {
    const rid = rowCourseYearId(r)
    return !rid || rid === courseYearId
  })

  const fromSubjects = semesterSubjects.filter(isElectiveSubject)

  const procParams: Record<string, string | number>[] = [{ in_student_id: ctx.studentId }]
  if (ctx.collegeId && ctx.academicYearId) {
    procParams.push({
      in_student_id: ctx.studentId,
      in_college_id: ctx.collegeId,
      in_academic_year_id: ctx.academicYearId,
      in_course_year_id: courseYearId,
    })
  }
  let procRows: AnyRow[] = []
  for (const p of procParams) {
    try {
      const raw = await getAllRecords<unknown>(procName(MISC_REPORT_API.GET_STD_ELECTIVES), p)
      const rows = flattenRecordRows(raw)
      if (rows.length > 0) {
        procRows = rows.filter((r) => {
          const rid = rowCourseYearId(r)
          return !rid || rid === courseYearId
        })
        break
      }
    } catch {
      // try next
    }
  }

  const queries = [
    buildQuery({ 'studentDetail.studentId': ctx.studentId, 'courseYear.courseYearId': courseYearId, isActive: true }),
    buildQuery({ 'StudentDetail.studentId': ctx.studentId, 'CourseYear.courseYearId': courseYearId, isActive: true }),
  ]
  let domainRows: AnyRow[] = []
  for (const entity of ['StudentElectiveEnrollment', 'StudentElectiveSubject', 'StdElectiveSubject']) {
    for (const q of queries) {
      try {
        const rows = await domainList<AnyRow>(entity, q)
        if (rows.length > 0) {
          domainRows = rows
          break
        }
      } catch {
        // try next
      }
    }
    if (domainRows.length > 0) break
  }

  return dedupeRows([...nested, ...fromSubjects, ...procRows, ...domainRows], (r) =>
    String(
      num(r, ['studentElectiveId', 'id']) ||
        `${text(r, ['electiveGroupName', 'elective_group_name'])}-${text(r, ['subjectCode', 'subject_code', 'subjectName', 'subject_name'])}`,
    ),
  )
}

async function fetchLabBatchesForSemester(
  student: AnyRow,
  ctx: StudentProfileContext,
  courseYearId: number,
): Promise<AnyRow[]> {
  const nested = nestedArrayFromDetail(student, [
    'labBatches',
    'studentLabBatches',
    'labBatchList',
    'studentLabBatchList',
  ]).filter((r) => {
    const rid = rowCourseYearId(r)
    return !rid || rid === courseYearId
  })
  if (nested.length > 0) return nested

  const queries = [
    buildQuery({ 'studentDetail.studentId': ctx.studentId, 'courseYear.courseYearId': courseYearId, isActive: true }),
    buildQuery({ 'StudentDetail.studentId': ctx.studentId, isActive: true }),
    buildQuery({ studentId: ctx.studentId, isActive: true }),
  ]
  for (const entity of ['StudentLabBatch', 'StudentLabbatch', 'Studentbatch']) {
    for (const q of queries) {
      try {
        const rows = await domainList<AnyRow>(entity, q)
        const filtered = rows.filter((r) => {
          const rid = rowCourseYearId(r)
          return !rid || rid === courseYearId
        })
        if (filtered.length > 0) return filtered
      } catch {
        // try next
      }
    }
  }

  const academic = await listAcademicBatchesOfStudent(ctx.studentId).catch(() => [])
  return academic.filter((r) => {
    const rid = rowCourseYearId(r)
    const hasBatch = Boolean(text(r, ['batchName', 'batchCode', 'batch', 'batch_name']))
    return hasBatch && (!rid || rid === courseYearId)
  })
}

/** Angular curriculum tab: semester tabs + subjects / electives / lab batches. */
/** Angular: semester tabs from CourseYear; academic batch table loaded once. */
export async function loadStudentCurriculumShell(student: AnyRow): Promise<StudentCurriculumShell> {
  const ctx = getStudentProfileContext(student)
  const courseId = resolveCourseId(student)
  const courseYears = courseId ? await listCourseYearsByCourse(courseId).catch(() => []) : []
  let semesters: StudentCurriculumSemester[] = courseYears
    .map((cy) => ({
      courseYearId: num(cy, ['courseYearId', 'fk_course_year_id']),
      label: semesterLabel(cy),
      sortOrder: semesterSortOrder(cy),
    }))
    .filter((s) => s.courseYearId > 0)
    .sort((a, b) => a.sortOrder - b.sortOrder)

  if (semesters.length === 0 && ctx.courseYearId) {
    semesters = [
      {
        courseYearId: ctx.courseYearId,
        label:
          text(student, ['courseYearName', 'course_year_name', 'courseYearCode']) || 'Current Semester',
        sortOrder: 1,
      },
    ]
  }

  const academicDetails = await fetchStudentAcademicDetails(student, ctx)
  return { semesters, academicDetails }
}

/** Angular: each semester tab click → studentsubjects / StudentSubject for that courseYearId. */
export async function loadStudentCurriculumSemester(
  student: AnyRow,
  courseYearId: number,
  academicDetails: AnyRow[],
): Promise<StudentCurriculumSemesterPayload> {
  const ctx = getStudentProfileContext(student)
  const ayId = academicYearIdForSemester(courseYearId, academicDetails, ctx.academicYearId)
  const rows = await fetchSubjectsForSemester(student, ctx, courseYearId, ayId)
  const subjects = rows.filter((r) => !isElectiveSubject(r))
  const electives = await fetchElectivesForSemester(student, ctx, courseYearId, rows)
  const labBatches = await fetchLabBatchesForSemester(student, ctx, courseYearId)
  return { subjects, electives, labBatches }
}

export async function loadStudentCurriculumData(student: AnyRow): Promise<StudentCurriculumData> {
  const ctx = getStudentProfileContext(student)
  const courseId = resolveCourseId(student)

  const courseYears = courseId ? await listCourseYearsByCourse(courseId).catch(() => []) : []
  let semesters: StudentCurriculumSemester[] = courseYears
    .map((cy) => ({
      courseYearId: num(cy, ['courseYearId', 'fk_course_year_id']),
      label: semesterLabel(cy),
      sortOrder: semesterSortOrder(cy),
    }))
    .filter((s) => s.courseYearId > 0)
    .sort((a, b) => a.sortOrder - b.sortOrder)

  if (semesters.length === 0 && ctx.courseYearId) {
    semesters = [
      {
        courseYearId: ctx.courseYearId,
        label:
          text(student, ['courseYearName', 'course_year_name', 'courseYearCode']) || 'Current Semester',
        sortOrder: 1,
      },
    ]
  }

  const academicDetails = await fetchStudentAcademicDetails(student, ctx)
  const allSubjects = await fetchAllStudentSubjects(student, ctx, semesters, academicDetails)

  const semesterIds = new Set(semesters.map((s) => s.courseYearId))
  for (const row of allSubjects) {
    const cyId = rowCourseYearId(row)
    if (!cyId || semesterIds.has(cyId)) continue
    semesterIds.add(cyId)
    semesters.push({
      courseYearId: cyId,
      label:
        text(row, ['courseYearName', 'course_year_name', 'courseYearCode', 'course_year_code']) ||
        `Semester ${cyId}`,
      sortOrder: cyId,
    })
  }
  semesters.sort((a, b) => a.sortOrder - b.sortOrder)

  const subjectsBySemester: Record<number, AnyRow[]> = {}
  const electivesBySemester: Record<number, AnyRow[]> = {}
  const labBatchesBySemester: Record<number, AnyRow[]> = {}

  for (const sem of semesters) {
    const cyId = sem.courseYearId
    const semesterSubjects = allSubjects.filter((r) => rowCourseYearId(r) === cyId)
    subjectsBySemester[cyId] = semesterSubjects.filter((r) => !isElectiveSubject(r))
    electivesBySemester[cyId] = await fetchElectivesForSemester(student, ctx, cyId, semesterSubjects)
    labBatchesBySemester[cyId] = await fetchLabBatchesForSemester(student, ctx, cyId)
  }

  return { semesters, subjectsBySemester, electivesBySemester, labBatchesBySemester, academicDetails }
}

async function fetchStudentAcademicDetails(student: AnyRow, ctx: StudentProfileContext): Promise<AnyRow[]> {
  const nested = mergeProfileArrays(
    student,
    [
      'studentAcademicbatchList',
      'academicBatches',
      'studentAcademicDetails',
      'academicDetails',
      'studentAcademicbatchDTOList',
    ],
    [/academicbatch/i, /academicDetail/i],
  )
  if (nested.length > 0) return nested
  if (!ctx.studentId) return []
  return listAcademicBatchesOfStudent(ctx.studentId).catch(() => [])
}

async function loadCurriculum(student: AnyRow, ctx: StudentProfileContext): Promise<AnyRow[]> {
  const data = await loadStudentCurriculumData(student)
  const all: AnyRow[] = []
  for (const sem of data.semesters) {
    all.push(...(data.subjectsBySemester[sem.courseYearId] ?? []))
  }
  return all
}

function timetablePayloadFromStudent(student: AnyRow): unknown {
  for (const [key, value] of Object.entries(student)) {
    if (!/timetable|timeTable/i.test(key)) continue
    if (Array.isArray(value) && value.length > 0) return value
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const keys = Object.keys(value as object)
      if (keys.length > 0) return value
    }
  }
  return null
}

async function loadTimetable(student: AnyRow, ctx: StudentProfileContext): Promise<AnyRow[]> {
  const { loadAngularStudentTimetable } = await import('@/services/student-timetable')
  const angular = await loadAngularStudentTimetable(student).catch(() => null)
  if (angular && angular.weekdays.length > 0) {
    const rows: AnyRow[] = []
    for (const day of angular.weekdays) {
      for (const timing of day.timings) {
        rows.push({
          weekDay: day.weekdayName,
          weekdayName: timing.weekdayName,
          startTime: timing.startTime,
          endTime: timing.endTime,
          isBreak: timing.isBreak,
          classTimingName: timing.classTimingName,
          subjectResource: timing.subBatches,
        })
      }
    }
    return rows
  }

  /**
   * Fallback: weekly report proc when schedule/timetablescurr path returns nothing.
   */
  if (ctx.collegeId && ctx.academicYearId && ctx.groupSectionId) {
    const weekly = await fetchWeeklyTimetableReportRows({
      collegeId: ctx.collegeId,
      courseId: ctx.courseId || 0,
      courseGroupId: ctx.courseGroupId || 0,
      courseYearId: ctx.courseYearId || 0,
      academicYearId: ctx.academicYearId,
      groupSectionId: ctx.groupSectionId,
    })
    if (weekly.length > 0) return weekly
  }

  const embedded = timetablePayloadFromStudent(student)
  if (embedded) {
    const rows = normalizeTimetableRows(embedded)
    if (rows.length > 0) return rows
  }

  const nested = mergeProfileArrays(
    student,
    [
      'timetable',
      'timeTable',
      'timeTableList',
      'timetableList',
      'sectionTimetable',
      'timetableCurr',
      'timetablescurr',
      'studentTimetable',
      'studentTimeTableList',
      'sectionTimeTableList',
      'timeTableDTOList',
    ],
    [/timetable/i, /timeTable/i],
  )
  const fromDetail = normalizeTimetableRows(nested)
  if (fromDetail.length > 0) return fromDetail

  return fetchStudentTimetableRows({
    studentId: ctx.studentId,
    collegeId: ctx.collegeId,
    academicYearId: ctx.academicYearId,
    groupSectionId: ctx.groupSectionId,
    courseGroupId: ctx.courseGroupId,
    courseYearId: ctx.courseYearId,
    check: 1,
  })
}

async function loadAttendance(student: AnyRow, ctx: StudentProfileContext): Promise<AnyRow[]> {
  const nested = mergeProfileArrays(
    student,
    [
      'attendance',
      'attendanceList',
      'attendanceDetails',
      'studentAttendance',
      'studentAttendanceList',
      'stdAttendanceList',
      'attendanceSummary',
    ],
    [/attendance/i],
  )
  if (nested.length > 0) return nested
  if (!ctx.studentId) return []

  /** Angular `attendance-information`: `s_rep_tt_std_attendance_per` + nine positional params. */
  if (
    ctx.collegeId &&
    ctx.courseYearId &&
    ctx.courseGroupId &&
    ctx.academicYearId &&
    ctx.groupSectionId
  ) {
    try {
      const raw = await getAllRecords<unknown>(procName('getAllRecords/s_rep_tt_std_attendance_per'), {
        in_collegeId: ctx.collegeId,
        in_course_year_id: ctx.courseYearId,
        in_course_group_id: ctx.courseGroupId,
        in_academic_year_id: ctx.academicYearId,
        in_sectionId: ctx.groupSectionId,
        in_studentId: ctx.studentId,
        in_empId: '0',
        in_from_percentage: 0,
        in_to_percentage: 100,
      })
      const rows = flattenRecordRows(raw)
      if (rows.length > 0) return rows
    } catch {
      // fall through to legacy procs
    }
  }

  const procParams: Record<string, string | number>[] = [{ in_student_id: ctx.studentId }]
  procParams.push({ in_student_detail_id: ctx.studentId })
  procParams.push({ studentDetailId: ctx.studentId })
  if (ctx.collegeId && ctx.academicYearId) {
    procParams.push({
      in_student_id: ctx.studentId,
      in_college_id: ctx.collegeId,
      in_academic_year_id: ctx.academicYearId,
    })
    procParams.push({
      studentId: ctx.studentId,
      collegeId: ctx.collegeId,
      academicYearId: ctx.academicYearId,
    })
    procParams.push({
      in_student_detail_id: ctx.studentId,
      in_college_id: ctx.collegeId,
      in_academic_year_id: ctx.academicYearId,
    })
  }

  const procPaths = [
    ATTENDANCE_API.GET_CLASSWISE_STD_ATTENDANCE,
    ATTENDANCE_API.GET_DAYWISE_STD_ATTENDANCE,
    ATTENDANCE_API.STD_ATTENDANCE_SUMMARY,
  ]
  for (const path of procPaths) {
    for (const p of procParams) {
      try {
        const raw = await getAllRecords<unknown>(procName(path), p)
        const rows = flattenRecordRows(raw)
        if (rows.length > 0) return rows
      } catch {
        // try next
      }
    }
  }

  return listAcademicBatchesOfStudent(ctx.studentId).catch(() => [])
}

async function loadFee(student: AnyRow, ctx: StudentProfileContext): Promise<AnyRow[]> {
  if (!ctx.studentId) return []

  /** Angular fee tab uses `s_fee_std_ledger` year summary — not per-head fee lines on studentdetail. */
  const ledgerParams: Record<string, string | number>[] = [
    { in_std_id: ctx.studentId },
    { in_student_id: ctx.studentId },
    { in_student_detail_id: ctx.studentId },
    { studentId: ctx.studentId },
    { studentDetailId: ctx.studentId },
  ]
  if (ctx.collegeId) {
    ledgerParams.push(
      { in_std_id: ctx.studentId, in_college_id: ctx.collegeId },
      { in_student_id: ctx.studentId, in_college_id: ctx.collegeId },
    )
  }

  for (const params of ledgerParams) {
    try {
      const rows = await fetchFeeLedgerRows(params)
      if (rows.length > 0) return rows
    } catch {
      // try next param set
    }
  }

  try {
    const raw = await getAllRecords<unknown>(procName(FEE_API.FEE_SUMMARY), { in_std_id: ctx.studentId })
    const rows = flattenRecordRows(raw)
    if (rows.length > 0) return rows
  } catch {
    // fall through
  }

  const nested = mergeProfileArrays(
    student,
    [
      'feeDetails',
      'feeDetailList',
      'studentFeeList',
      'feeManagementDetails',
      'studentFeeDetails',
      'studentFeeDetailList',
      'feeManagementStdDetails',
    ],
    [/fee/i],
  )
  const summaryRows = nested.filter(isCourseFeeSummaryRow)
  if (summaryRows.length > 0) return summaryRows

  const paramSets: Record<string, string | number>[] = [
    { studentId: ctx.studentId, collegeId: ctx.collegeId, academicYearId: ctx.academicYearId },
    { studentDetailId: ctx.studentId, collegeId: ctx.collegeId, academicYearId: ctx.academicYearId },
    { studentId: ctx.studentId, collegeId: ctx.collegeId },
    { studentDetailId: ctx.studentId, collegeId: ctx.collegeId },
    { studentId: ctx.studentId },
    { studentDetailId: ctx.studentId },
  ]
  for (const path of [FEE_API.GET_FEE_MANAGEMENT_STD_DETAILS, FEE_API.FEE_MANAGEMENT_STD_DETAIL]) {
    for (const p of paramSets) {
      try {
        const data = await fetchDetails<unknown>(path, p)
        const rows = flattenRecordRows(data)
        if (rows.length > 0) return rows
      } catch {
        // try next
      }
    }
  }

  try {
    const raw = await getAllRecords<unknown>(procName(FEE_API.COMPLETE_STD_FEE_REPORT), {
      in_student_id: ctx.studentId,
      in_college_id: ctx.collegeId,
      in_academic_year_id: ctx.academicYearId,
    })
    const rows = flattenRecordRows(raw)
    if (rows.length > 0) return rows
  } catch {
    // fall through
  }

  try {
    const raw = await getAllRecords<unknown>(procName(FEE_API.REP_FEE_STUDENT_DETAILS), {
      in_student_id: ctx.studentId,
      in_college_id: ctx.collegeId,
    })
    return flattenRecordRows(raw)
  } catch {
    return []
  }
}

function flattenCounselorActivities(rows: AnyRow[]): AnyRow[] {
  const out: AnyRow[] = []
  for (const row of rows) {
    const acts = row.counselorActivityDTOs ?? row.counselorActivities
    if (Array.isArray(acts) && acts.length > 0) {
      for (const a of acts) {
        if (a && typeof a === 'object' && !Array.isArray(a)) {
          out.push({ ...row, ...(a as AnyRow) })
        }
      }
    } else {
      out.push(row)
    }
  }
  return out
}

async function loadCounselor(student: AnyRow, ctx: StudentProfileContext): Promise<AnyRow[]> {
  const nested = mergeProfileArrays(
    student,
    [
      'counselorMeetings',
      'counselorMeetingList',
      'counselorDetails',
      'stdCounselorList',
      'counselorMeetingDetails',
      'mappedCounselorList',
    ],
    [/counselor/i],
  )
  if (nested.length > 0) return nested

  if (ctx.studentId) {
    try {
      const q = buildQuery(
        { 'studentDetail.studentId': ctx.studentId, isActive: true },
        { field: 'createdDt', direction: 'DESC' },
      )
      const rows = await domainList<AnyRow>('CounselorMapping', q)
      if (rows.length > 0) return flattenCounselorActivities(rows)
    } catch {
      // fall through
    }
  }

  const paramSets: Record<string, string | number>[] = [
    { studentId: ctx.studentId, collegeId: ctx.collegeId },
    { studentDetailId: ctx.studentId, collegeId: ctx.collegeId },
    { studentId: ctx.studentId },
    { studentDetailId: ctx.studentId },
    { StudentId: ctx.studentId },
  ]
  for (const p of paramSets) {
    try {
      const data = await fetchDetails<unknown>(DASHBOARD_API.MAPPED_COUNSELOR_STUDENTS, p)
      const rows = flattenRecordRows(data)
      if (rows.length > 0) return rows
    } catch {
      // try next
    }
  }
  return []
}

async function loadBooks(student: AnyRow, ctx: StudentProfileContext): Promise<AnyRow[]> {
  const nested = mergeProfileArrays(
    student,
    ['books', 'bookList', 'issuedBooks', 'bookIssuedList', 'libraryBooks', 'studentBookList', 'bookIssueDetails'],
    [/book/i, /library/i],
  )
  if (nested.length > 0) return nested
  if (!ctx.studentId) return []

  try {
    const data = await fetchDetails<unknown>('bookIssuedetails', { studentId: ctx.studentId })
    const rows = flattenRecordRows(data)
    if (rows.length > 0) return rows
  } catch {
    // fall through
  }

  const entities = [
    'BookIssuedDetails',
    'BookIssueDetails',
    'BookIssue',
    'LibraryBookIssue',
    'StudentBookIssue',
    'BookTransaction',
  ]
  const queries = [
    buildQuery({ 'studentDetail.studentId': ctx.studentId, isActive: true }),
    buildQuery({ 'StudentDetail.studentId': ctx.studentId, isActive: true }),
    buildQuery({ studentId: ctx.studentId, isActive: true }),
    buildQuery({ 'studentDetail.studentId': ctx.studentId }),
  ]
  for (const entity of entities) {
    for (const q of queries) {
      try {
        const rows = await domainList<AnyRow>(entity, q)
        if (rows.length > 0) return rows
      } catch {
        // try next
      }
    }
  }

  try {
    const raw = await getAllRecords<unknown>(procName(DASHBOARD_API.LIBRARY_SUMMARY), {
      in_student_id: ctx.studentId,
      in_college_id: ctx.collegeId,
    })
    const rows = flattenRecordRows(raw)
    if (rows.length > 0) return rows
  } catch {
    // fall through
  }

  try {
    const raw = await getAllRecords<unknown>(procName(DASHBOARD_API.LIBRARY_SUMMARY), {
      in_student_detail_id: ctx.studentId,
      in_college_id: ctx.collegeId,
    })
    return flattenRecordRows(raw)
  } catch {
    return []
  }
}

async function fetchExamResultRows(
  student: AnyRow,
  ctx: StudentProfileContext,
  options?: { in_ispass?: string },
): Promise<AnyRow[]> {
  if (!ctx.studentId) return []
  const inIspass = options?.in_ispass ?? '-1'

  if (ctx.collegeId && ctx.courseYearId) {
    try {
      const raw = await getAllRecords<unknown>(procName(EXAM_API.GET_EXAM_STUDENT_RESULTS), {
        in_flag: 'exam_std_result_detail',
        in_exam_id: 0,
        in_college_id: ctx.collegeId,
        in_course_id: ctx.courseId || 0,
        in_course_group_id: ctx.courseGroupId || 0,
        in_course_year_id: ctx.courseYearId,
        in_std_id: ctx.studentId,
        in_regulation_id: 0,
        in_ispass: inIspass,
        in_subject_id: 0,
        in_above_fail_subjects: '-1',
        in_below_credits: '-1',
      })
      const rows = flattenRecordRows(raw)
      if (rows.length > 0) return rows
    } catch {
      // fall through
    }
  }

  const procs = [EXAM_API.GET_EXAM_STUDENT_RESULTS, EXAM_API.GET_EXAMWISE_STUDENT_RESULT]
  const paramSets: Record<string, string | number>[] = [
    { in_student_id: ctx.studentId },
    { in_student_detail_id: ctx.studentId },
    { studentId: ctx.studentId },
    { studentDetailId: ctx.studentId },
  ]
  if (ctx.collegeId) {
    paramSets.push({ in_student_id: ctx.studentId, in_college_id: ctx.collegeId })
    paramSets.push({ studentId: ctx.studentId, collegeId: ctx.collegeId })
  }
  if (ctx.courseYearId) {
    paramSets.push({
      in_std_id: ctx.studentId,
      in_course_year_id: ctx.courseYearId,
      in_college_id: ctx.collegeId || 0,
    })
  }
  if (ctx.academicYearId) {
    paramSets.push({
      in_student_id: ctx.studentId,
      in_academic_year_id: ctx.academicYearId,
    })
  }

  for (const path of procs) {
    for (const p of paramSets) {
      try {
        const raw = await getAllRecords<unknown>(procName(path), p)
        const rows = flattenRecordRows(raw)
        if (rows.length > 0) return rows
      } catch {
        // try next
      }
    }
  }
  return []
}

function filterExamResultsBySemester(rows: AnyRow[], courseYearId: number): AnyRow[] {
  if (!courseYearId) return rows
  const filtered = rows.filter((r) => {
    const cy = rowCourseYearId(r)
    return cy === 0 || cy === courseYearId
  })
  return filtered.length > 0 ? filtered : rows
}

/** Semester-wise exam results for the profile Exam Results tab (Angular `s_get_exam_student_results`). */
export async function loadStudentExamResultsForSemester(
  student: AnyRow,
  courseYearId: number,
): Promise<AnyRow[]> {
  const ctx = getStudentProfileContext(student)
  const nested = mergeProfileArrays(
    student,
    [
      'examResults',
      'examStudentResults',
      'studentExamResults',
      'examResultList',
      'examWiseResults',
      'marksMemoList',
    ],
    [/exam.*result/i, /result.*mark/i, /marks.*memo/i],
  )
  if (nested.length > 0) return filterExamResultsBySemester(nested, courseYearId)

  const rows = await fetchExamResultRows(student, { ...ctx, courseYearId })
  return filterExamResultsBySemester(rows, courseYearId)
}

/** Print profile — passed subjects only (Angular profile Examination section). */
export async function loadStudentProfileExaminationForSemester(
  student: AnyRow,
  courseYearId: number,
): Promise<AnyRow[]> {
  const ctx = getStudentProfileContext(student)
  const nested = mergeProfileArrays(
    student,
    [
      'examResults',
      'examStudentResults',
      'studentExamResults',
      'examResultList',
      'examWiseResults',
      'marksMemoList',
    ],
    [/exam.*result/i, /result.*mark/i, /marks.*memo/i],
  )
  if (nested.length > 0) {
    const passed = nested.filter((r) => {
      const flag = text(r, ['isPass', 'is_pass', 'ispass', 'passed'])
      return !flag || flag === '1' || flag.toLowerCase() === 'true' || flag.toLowerCase() === 'pass'
    })
    return filterExamResultsBySemester(passed.length > 0 ? passed : nested, courseYearId)
  }

  const rows = await fetchExamResultRows(student, { ...ctx, courseYearId }, { in_ispass: '1' })
  const filtered = filterExamResultsBySemester(rows, courseYearId)
  if (filtered.length > 0) return filtered
  return filterExamResultsBySemester(
    await fetchExamResultRows(student, { ...ctx, courseYearId }),
    courseYearId,
  )
}

function isPreCollegeAcademicRow(row: AnyRow): boolean {
  const hasSchoolFields = Boolean(
    text(row, [
      'stateBoardName',
      'state_board_name',
      'stateBoard',
      'state_board',
      'boardName',
      'board_name',
      'className',
      'class_name',
      'class',
      'qualificationName',
      'qualification_name',
    ]),
  )
  const hasCollegeBatchFields = Boolean(
    text(row, ['fromCourseYearName', 'from_course_year_name', 'toCourseYearName', 'to_course_year_name']),
  )
  if (hasSchoolFields) return true
  if (hasCollegeBatchFields) return false
  return Boolean(
    text(row, ['yearOfStudy', 'year_of_study', 'percentage', 'cgpa', 'totalMarks', 'total_marks', 'monthYearOfPassing']),
  )
}

/** Pre-college academic rows for the print Student Profile page (Class X / XII, etc.). */
export async function fetchStudentProfileAcademicDetails(student: AnyRow): Promise<AnyRow[]> {
  const nested = mergeProfileArrays(
    student,
    [
      'studentAcademicDetailList',
      'studentAcademicDetails',
      'studentEducationList',
      'studentQualificationList',
      'stdAcademicList',
      'studentStdAcademicList',
      'academicDetailList',
      'preAcademicDetails',
      'studentSchoolAcademicList',
    ],
    [/education|qualification|stdacademic|schoolacademic|pre.*academic/i, /academicdetail/i],
  )
  const schoolRows = nested.filter(isPreCollegeAcademicRow)
  if (schoolRows.length > 0) return schoolRows

  const ctx = getStudentProfileContext(student)
  if (!ctx.studentId) return []

  const entities = ['StudentStdAcademic', 'StudentAcademicDetail', 'StudentEducation', 'StudentQualification']
  const queries = [
    buildQuery({ 'studentDetail.studentId': ctx.studentId, isActive: true }),
    buildQuery({ 'StudentDetail.studentId': ctx.studentId, isActive: true }),
    buildQuery({ studentId: ctx.studentId, isActive: true }),
  ]
  for (const entity of entities) {
    for (const q of queries) {
      try {
        const rows = await domainList<AnyRow>(entity, q)
        const filtered = rows.filter(isPreCollegeAcademicRow)
        if (filtered.length > 0) return filtered
        if (rows.length > 0 && entity !== 'StudentAcademicDetail') return rows
      } catch {
        // try next
      }
    }
  }
  return []
}

async function loadExamResults(student: AnyRow, ctx: StudentProfileContext): Promise<AnyRow[]> {
  const nested = mergeProfileArrays(
    student,
    [
      'examResults',
      'examStudentResults',
      'studentExamResults',
      'examResultList',
      'examWiseResults',
      'marksMemoList',
    ],
    [/exam.*result/i, /result.*mark/i, /marks.*memo/i],
  )
  if (nested.length > 0) return nested
  return fetchExamResultRows(student, ctx)
}

async function fetchBacklogRows(student: AnyRow, ctx: StudentProfileContext): Promise<AnyRow[]> {
  if (!ctx.studentId) return []

  if (ctx.collegeId && ctx.courseYearId) {
    try {
      const raw = await getAllRecords<unknown>(procName(EXAM_API.GET_EXAM_STUDENT_RESULTS), {
        in_flag: 'exam_std_result_detail',
        in_exam_id: 0,
        in_course_id: ctx.courseId || 0,
        in_college_id: ctx.collegeId,
        in_course_group_id: ctx.courseGroupId || 0,
        in_course_year_id: ctx.courseYearId,
        in_std_id: ctx.studentId,
        in_regulation_id: 0,
        in_ispass: '0',
        in_subject_id: 0,
        in_above_fail_subjects: '-1',
        in_below_credits: '-1',
      })
      const rows = flattenRecordRows(raw)
      if (rows.length > 0) return rows
    } catch {
      // fall through
    }
  }

  const fallbackProcs = [
    'getAllRecords/s_get_student_backlog_details',
    'getAllRecords/s_get_std_backlog_subjects',
  ]
  const paramSets: Record<string, string | number>[] = [
    { in_student_id: ctx.studentId },
    { in_student_detail_id: ctx.studentId },
    { studentId: ctx.studentId },
  ]
  if (ctx.courseYearId) {
    paramSets.push({
      in_std_id: ctx.studentId,
      in_course_year_id: ctx.courseYearId,
      in_college_id: ctx.collegeId || 0,
    })
  }

  for (const path of fallbackProcs) {
    for (const p of paramSets) {
      try {
        const raw = await getAllRecords<unknown>(procName(path), p)
        const rows = flattenRecordRows(raw)
        if (rows.length > 0) return rows
      } catch {
        // try next
      }
    }
  }
  return []
}

/** Semester-wise backlogs for the profile Back Logs tab (failed subjects via `s_get_exam_student_results`). */
export async function loadStudentBacklogsForSemester(
  student: AnyRow,
  courseYearId: number,
): Promise<AnyRow[]> {
  const ctx = getStudentProfileContext(student)
  const nested = mergeProfileArrays(
    student,
    [
      'studentBacklogs',
      'backlogSubjects',
      'backlogList',
      'failedSubjects',
      'arrearSubjects',
      'studentArrears',
    ],
    [/backlog/i, /arrear/i, /failed.*subject/i],
  )
  if (nested.length > 0) return filterExamResultsBySemester(nested, courseYearId)

  const rows = await fetchBacklogRows(student, { ...ctx, courseYearId })
  return filterExamResultsBySemester(rows, courseYearId)
}

async function loadBacklogs(student: AnyRow, ctx: StudentProfileContext): Promise<AnyRow[]> {
  const nested = mergeProfileArrays(
    student,
    [
      'studentBacklogs',
      'backlogSubjects',
      'backlogList',
      'failedSubjects',
      'arrearSubjects',
      'studentArrears',
    ],
    [/backlog/i, /arrear/i, /failed.*subject/i],
  )
  if (nested.length > 0) return nested
  return fetchBacklogRows(student, ctx)
}

async function loadPlacements(student: AnyRow, ctx: StudentProfileContext): Promise<AnyRow[]> {
  const embedded = mergeProfileArrays(
    student,
    [
      'placementDetails',
      'placementList',
      'campusPlacementList',
      'studentPlacements',
      'tnpDetails',
      'trainingPlacementList',
    ],
    [/placement/i, /campus.*drive/i, /recruit/i, /tnp/i],
  )
  if (embedded.length > 0) return embedded

  if (!ctx.studentId) return []

  try {
    const data = await fetchDetails<unknown>('stdregdetails', {
      studentId: ctx.studentId,
      isRegistered: 'true',
    })
    return flattenRecordRows(data)
  } catch {
    return []
  }
}

/** Loads tab rows from nested studentdetail payload and/or legacy Spring endpoints. */
export async function loadStudentProfileTabData(tab: StudentProfileTab, student: AnyRow): Promise<AnyRow[]> {
  const ctx = getStudentProfileContext(student)
  switch (tab) {
    case 'curriculum':
      return loadCurriculum(student, ctx)
    case 'timetable':
      return loadTimetable(student, ctx)
    case 'attendance':
      return loadAttendance(student, ctx)
    case 'fee':
      return loadFee(student, ctx)
    case 'counselor':
      return loadCounselor(student, ctx)
    case 'books':
      return loadBooks(student, ctx)
    case 'exam_results':
      return loadExamResults(student, ctx)
    case 'backlogs':
      return loadBacklogs(student, ctx)
    case 'placements':
      return loadPlacements(student, ctx)
    default:
      return []
  }
}

export function pickProfileCell(row: AnyRow, keys: string[]): string {
  return text(row, keys)
}
