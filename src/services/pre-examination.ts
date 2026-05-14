import { buildQuery, domainCreate, domainList, domainUpdate, fetchDetails, getAllRecords, postDetails } from '@/services/crud'
import { EXAM_API } from '@/config/constants/api'
import { GM_CODES } from '@/config/constants/ui'
import { toDateStr } from '@/common/generic-functions'

type AnyRow = Record<string, any>

/** Share one in-flight promise per key (Strict Mode double effects + overlapping UI cascades). */
function dedupeInflight<T>(cache: Map<string, Promise<T>>, key: string, run: () => Promise<T>): Promise<T> {
  const existing = cache.get(key)
  if (existing) return existing
  const p = run().finally(() => {
    if (cache.get(key) === p) cache.delete(key)
  })
  cache.set(key, p)
  return p
}

const inflightExamFeeAddlByType = new Map<string, Promise<AnyRow[]>>()
const inflightUnivExamSubjectInss = new Map<string, Promise<AnyRow[]>>()
const inflightExamSubjectStudents = new Map<string, Promise<AnyRow[]>>()
const inflightRegisteredStudentsForExam = new Map<string, Promise<AnyRow[]>>()

export async function listActiveColleges(): Promise<AnyRow[]> {
  return domainList<AnyRow>('College', buildQuery({ isActive: true }))
}

export async function listAcademicYearsByUniversity(universityId: number): Promise<AnyRow[]> {
  if (!universityId) return []
  const queries = [
    buildQuery({ 'Universities.universityId': universityId, isActive: true }, { field: 'fromDate', direction: 'DESC' }),
    buildQuery({ 'University.universityId': universityId, isActive: true }, { field: 'fromDate', direction: 'DESC' }),
  ]
  for (const query of queries) {
    try {
      const rows = await domainList<AnyRow>('AcademicYear', query)
      if (Array.isArray(rows) && rows.length > 0) return rows
    } catch {
      // try next query shape
    }
  }
  return []
}

export async function listCoursesByUniversity(universityId: number): Promise<AnyRow[]> {
  if (!universityId) return []
  const queries = [
    buildQuery({ 'Universities.universityId': universityId, isActive: true }),
    buildQuery({ 'University.universityId': universityId, isActive: true }),
  ]
  for (const query of queries) {
    try {
      const rows = await domainList<AnyRow>('Course', query)
      if (Array.isArray(rows) && rows.length > 0) return rows
    } catch {
      // try next query shape
    }
  }
  return []
}

export async function listExamMastersByCourseAndAy(courseId: number, academicYearId: number): Promise<AnyRow[]> {
  return domainList<AnyRow>(
    'ExamMaster',
    buildQuery(
      { 'Course.courseId': courseId, 'AcademicYear.academicYearId': academicYearId, isActive: true },
      { field: 'createdDt', direction: 'DESC' },
    ),
  )
}

export async function listExamTimetablesByExam(examId: number): Promise<AnyRow[]> {
  const normalize = (rows: AnyRow[]): AnyRow[] => {
    const map = new Map<number, AnyRow>()
    for (const row of rows) {
      const id = Number(row?.examTimetableId ?? row?.exam_timetable_id ?? row?.fk_exam_timetable_id ?? 0)
      const examDate = String(
        row?.examDate ?? row?.exam_date ?? row?.examdate ?? row?.exam_timetable_date ?? row?.timetableDate ?? '',
      ).trim()
      if (id <= 0 || !examDate) continue
      if (!map.has(id)) {
        map.set(id, {
          ...row,
          examTimetableId: id,
          examDate: toDateStr(examDate),
          examSessionName: String(
            row?.examSessionName ??
              row?.exam_session_name ??
              row?.examsessioninCatCode ??
              row?.sessionName ??
              row?.session_name ??
              row?.session ??
              'SESSION',
          )
            .trim()
            .toUpperCase(),
        })
      }
    }
    return [...map.values()].sort((a, b) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime())
  }

  const queries = [
    buildQuery({ 'examMaster.examId': examId, isActive: true }, { field: 'examDate', direction: 'ASC' }),
    buildQuery({ 'ExamMaster.examId': examId, isActive: true }, { field: 'examDate', direction: 'ASC' }),
    buildQuery({ examId, isActive: true }, { field: 'examDate', direction: 'ASC' }),
    buildQuery({ 'examMaster.examId': examId }, { field: 'examDate', direction: 'ASC' }),
    buildQuery({ 'ExamMaster.examId': examId }, { field: 'examDate', direction: 'ASC' }),
  ]

  for (const query of queries) {
    try {
      const rows = await domainList<AnyRow>('ExamTimetable', query)
      if (Array.isArray(rows) && rows.length > 0) return normalize(rows)
    } catch {
      // try next query shape
    }
  }

  // Legacy fallback source used across old exam flows.
  try {
    const data = await getAllRecords<{ result: AnyRow[][] }>('s_get_exam_allotment_details', {
      in_flag: 'roomwise_OMR_students',
      in_exam_id: examId,
      in_college_id: 0,
      in_course_id: 0,
      in_course_group_id: 0,
      in_course_year_id: 0,
      in_room_id: 0,
      in_std_id: 0,
      in_invgilator_emp_id: 0,
      in_regulation_id: 0,
      from_exam_date: '1999-01-01',
      to_exam_date: '1999-01-01',
      in_subject_id: 0,
      in_session_id: 0,
    })
    const groups = data?.result ?? []
    const flat = groups.flatMap((g) => g || [])
    if (flat.length > 0) return normalize(flat)
  } catch {
    // ignore fallback failure
  }
  return []
}

/** Angular parity: listByThreeIds(..., collegeId, examId, examTimetableId, collegeId/examMasterId/examTimetableId). */
export async function listExamRoomAllotments(collegeId: number, examId: number, examTimetableId: number): Promise<AnyRow[]> {
  const angularMatch = buildQuery({ collegeId, examMasterId: examId, examTimetableId })
  const fallbacksEmptyOnly = [
    buildQuery({
      'College.collegeId': collegeId,
      examMasterId: examId,
      examTimetableId,
    }),
    buildQuery({
      'examMaster.examId': examId,
      'ExamTimetable.examTimetableId': examTimetableId,
      'College.collegeId': collegeId,
    }),
  ]

  async function rowsFor(q: string): Promise<AnyRow[]> {
    try {
      const r = await domainList<AnyRow>('ExamRoomAllotment', q)
      return Array.isArray(r) ? r : []
    } catch {
      return []
    }
  }

  const primary = await rowsFor(angularMatch)
  if (primary.length > 0) return primary

  for (const q of fallbacksEmptyOnly) {
    const next = await rowsFor(q)
    if (next.length > 0) return next
  }

  return []
}

export async function listExamInvigilationAllotments(examTimetableId: number, collegeId: number): Promise<AnyRow[]> {
  try {
    return await domainList<AnyRow>(
      'ExamInvigilationAllotment',
      buildQuery({ examTimetableId, collegeId, isActive: true }),
    )
  } catch {
    try {
      return await domainList<AnyRow>(
        'ExamInvigilationAllotment',
        buildQuery({
          'ExamTimetable.examTimetableId': examTimetableId,
          'College.collegeId': collegeId,
          isActive: true,
        }),
      )
    } catch {
      return []
    }
  }
}

export async function listInvigilatorDesignations(): Promise<AnyRow[]> {
  return domainList<AnyRow>(
    'GeneralDetail',
    buildQuery({ 'GeneralMaster.generalMasterCode': GM_CODES.INVIGILATOR_DISG_TYPES, isActive: true }),
  )
}

export async function listEmployeesByCollege(collegeId: number): Promise<AnyRow[]> {
  return domainList<AnyRow>('Employee', buildQuery({ 'College.collegeId': collegeId, isActive: true }))
}

export async function createExamInvigilationAllotment(payload: AnyRow): Promise<AnyRow> {
  return domainCreate<AnyRow>('ExamInvigilationAllotment', payload)
}

export async function deactivateExamInvigilationAllotment(
  examInvgAllotmentId: number,
  payload: AnyRow,
): Promise<AnyRow> {
  return domainUpdate<AnyRow>('ExamInvigilationAllotment', 'examInvgAllotmentId', examInvgAllotmentId, payload)
}

export async function autoAssignInvigilators(examTimetableId: number): Promise<any> {
  return getAllRecords<any>('s_get_collegewisedetails_bycode', {
    in_flag: 'popexaminvigilator',
    in_timetable_det_id: examTimetableId,
  })
}

export async function listStudents(q: string): Promise<AnyRow[]> {
  if (!q?.trim()) return []
  const term = q.trim()
  try {
    // Legacy endpoint used by Angular app:
    // /studentsearch?isActive=true&q=<term>
    const data = await fetchDetails<any>('studentsearch', { isActive: 'true', q: term })
    if (Array.isArray(data)) return data
    if (Array.isArray(data?.resultList)) return data.resultList
    if (Array.isArray(data?.result)) return data.result
    if (Array.isArray(data?.data)) return data.data
  } catch {
    // fallback below
  }
  // Domain fallback in some environments uses StudentProfile (not Student).
  // Keep this best-effort and never throw from search.
  try {
    return await domainList<AnyRow>('StudentProfile', buildQuery({ isActive: true, firstName: term }))
  } catch {
    return []
  }
}

export async function getExamHalltickets(params: {
  examId: number
  courseYearId?: number
  collegeId?: number
  academicYearId?: number
  courseId?: number
  courseGroupId?: number
  studentId?: number
}): Promise<AnyRow[]> {
  const payload = {
    is_exam_id: params.examId,
    course_year_id: params.courseYearId ?? 0,
    in_college_Id: params.collegeId ?? 0,
    in_academic_year_id: params.academicYearId ?? 0,
    in_course_id: params.courseId ?? 0,
    in_course_group_id: params.courseGroupId ?? 0,
    in_student_id: params.studentId ?? 0,
  }

  try {
    const data = await getAllRecords<any>('s_get_exam_halltickets', payload)
    const first = data?.result?.[0]
    if (Array.isArray(first)) return first
    if (Array.isArray(data?.result)) return data.result
    if (Array.isArray(data)) return data
  } catch {
    // fall through to legacy endpoint path fallback
  }

  try {
    const data = await fetchDetails<any>('getExamHalltickets', payload)
    const first = data?.result?.[0]
    if (Array.isArray(first)) return first
    if (Array.isArray(data?.result)) return data.result
    if (Array.isArray(data)) return data
  } catch {
    // fall through
  }
  return []
}

export async function getUnivExamFiltersRegSup(employeeId: number): Promise<AnyRow[]> {
  const data = await getAllRecords<{ result: AnyRow[][] }>('s_get_exam_filters_bycode', {
    in_flag: 'univ_exam_filters',
    in_flag_type: 'REGSUP',
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
    in_sub_flag_type: 'ALL',
    in_param1: 0,
    in_param2: 0,
  })
  const groups = data?.result ?? []
  const flat = groups.flatMap((g) => g || [])
  return flat
}

export async function getUnivExamFiltersByType(
  employeeId: number,
  flagType: 'REGSUP' | 'INT' | 'ALL',
): Promise<AnyRow[]> {
  const data = await getAllRecords<{ result: AnyRow[][] }>('s_get_exam_filters_bycode', {
    in_flag: 'univ_exam_filters',
    in_flag_type: flagType,
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
    in_sub_flag_type: 'ALL',
    in_param1: 0,
    in_param2: 0,
  })
  const groups = data?.result ?? []
  const flat = groups.flatMap((g) => g || [])
  return flat
}

export async function getUnivExamRestNoTt(params: {
  courseId: number
  examId: number
  academicYearId: number
  employeeId: number
}): Promise<AnyRow[]> {
  const data = await getAllRecords<{ result: AnyRow[][] }>('s_get_exam_filters_bycode', {
    in_flag: 'univ_exam_rest_no_tt',
    in_flag_type: 'ALL',
    in_university_id: 0,
    in_college_id: 0,
    in_course_id: params.courseId,
    in_course_group_id: 0,
    in_course_year_id: 0,
    in_exam_id: params.examId,
    in_academic_year_id: params.academicYearId,
    in_regulation_id: 0,
    in_subject_id: 0,
    in_loginuser_empid: params.employeeId || 0,
    in_loginuser_roleid: 0,
    in_sub_flag_type: 'ALL',
    in_param1: 0,
    in_param2: 0,
  })
  const groups = data?.result ?? []
  const rest = groups.find((g) => (g?.[0]?.flag ?? '') === 'univ_exam_rest_filters') ?? []
  return rest
}

export async function getUnivExamRestNoTtBundle(params: {
  courseId: number
  examId: number
  academicYearId: number
  employeeId: number
}): Promise<{ restFilters: AnyRow[]; regulations: AnyRow[] }> {
  const data = await getAllRecords<{ result: AnyRow[][] }>('s_get_exam_filters_bycode', {
    in_flag: 'univ_exam_rest_no_tt',
    in_flag_type: 'ALL',
    in_university_id: 0,
    in_college_id: 0,
    in_course_id: params.courseId,
    in_course_group_id: 0,
    in_course_year_id: 0,
    in_exam_id: params.examId,
    in_academic_year_id: params.academicYearId,
    in_regulation_id: 0,
    in_subject_id: 0,
    in_loginuser_empid: params.employeeId || 0,
    in_loginuser_roleid: 0,
    in_sub_flag_type: 'ALL',
    in_param1: 0,
    in_param2: 0,
  })
  const groups = data?.result ?? []
  const restFilters = groups.find((g) => (g?.[0]?.flag ?? '') === 'univ_exam_rest_filters') ?? []
  const regulations = groups.find((g) => (g?.[0]?.flag ?? '') === 'regulations') ?? []
  return { restFilters, regulations }
}

export async function getUnivExamSubjectUc(params: {
  collegeId: number
  courseId: number
  courseGroupId: number
  courseYearId: number
  examId: number
  academicYearId: number
  regulationId: number
  employeeId: number
}): Promise<AnyRow[]> {
  const data = await getAllRecords<{ result: AnyRow[][] }>('s_get_exam_filters_bycode', {
    in_flag: 'univ_exam_subject_uc',
    in_flag_type: 'ALL',
    in_university_id: 0,
    in_college_id: params.collegeId,
    in_course_id: params.courseId,
    in_course_group_id: params.courseGroupId,
    in_course_year_id: params.courseYearId,
    in_exam_id: params.examId,
    in_academic_year_id: params.academicYearId,
    in_regulation_id: params.regulationId,
    in_subject_id: 0,
    in_loginuser_empid: params.employeeId || 0,
    in_loginuser_roleid: 0,
    in_sub_flag_type: 'ALL',
    in_param1: 0,
    in_param2: 0,
  })
  const groups = data?.result ?? []
  const subUc = groups.find((g) => (g?.[0]?.flag ?? '') === 'univ_exam_sub_uc') ?? []
  return subUc
}

export async function getUnivExamSubjectInss(params: {
  collegeId: number
  courseId: number
  courseGroupId: number
  courseYearId: number
  examId: number
  academicYearId: number
  employeeId: number
}): Promise<AnyRow[]> {
  const key = `inss:${params.collegeId}:${params.courseId}:${params.courseGroupId}:${params.courseYearId}:${params.examId}:${params.academicYearId}:${params.employeeId}`
  return dedupeInflight(inflightUnivExamSubjectInss, key, async () => {
    const data = await getAllRecords<{ result: AnyRow[][] }>('s_get_exam_filters_bycode', {
      in_flag: 'univ_exam_subject_inss',
      in_flag_type: 'ALL',
      in_university_id: 0,
      in_college_id: params.collegeId,
      in_course_id: params.courseId,
      in_course_group_id: params.courseGroupId,
      in_course_year_id: params.courseYearId,
      in_exam_id: params.examId,
      in_academic_year_id: params.academicYearId,
      in_regulation_id: 0,
      in_subject_id: 0,
      in_loginuser_empid: params.employeeId || 0,
      in_loginuser_roleid: 0,
      in_sub_flag_type: 'ALL',
      in_param1: 0,
      in_param2: 0,
    })
    const groups = data?.result ?? []
    const subInss = groups.find((g) => (g?.[0]?.flag ?? '') === 'univ_exam_sub_inss') ?? []
    return subInss
  })
}

export async function listExamSubjectStudents(params: {
  collegeId: number
  academicYearId: number
  courseId: number
  courseGroupId: number
  courseYearId: number
  regulationId: number
  subjectId: number
  subjectTypeId: number
}): Promise<AnyRow[]> {
  const key = `ess:${params.collegeId}:${params.academicYearId}:${params.courseId}:${params.courseGroupId}:${params.courseYearId}:${params.regulationId}:${params.subjectId}:${params.subjectTypeId}`
  return dedupeInflight(inflightExamSubjectStudents, key, async () => {
    const variants = ['examsubjectstudents', 'examSubjectStudents']
    for (const path of variants) {
      try {
        const rows = await fetchDetails<any>(path, {
          collegeId: params.collegeId,
          academicYearId: params.academicYearId,
          courseId: params.courseId,
          courseGroupId: params.courseGroupId,
          courseYearId: params.courseYearId,
          regulationId: params.regulationId,
          subjectId: params.subjectId,
          subjectTypeId: params.subjectTypeId,
        })
        if (Array.isArray(rows)) return rows
        if (Array.isArray(rows?.resultList)) return rows.resultList
        if (Array.isArray(rows?.result)) return rows.result
        if (Array.isArray(rows?.data)) return rows.data
      } catch {
        // try next path
      }
    }
    return []
  })
}

export async function listRegisteredStudentsForExam(params: {
  collegeId: number
  academicYearId: number
  courseId: number
  courseGroupId: number
  courseYearId: number
  regulationId: number
  subjectId: number
  examId: number
}): Promise<AnyRow[]> {
  const key = `rsfe:${params.collegeId}:${params.academicYearId}:${params.courseId}:${params.courseGroupId}:${params.courseYearId}:${params.regulationId}:${params.subjectId}:${params.examId}`
  return dedupeInflight(inflightRegisteredStudentsForExam, key, async () => {
    const variants = ['registeredstudentforexam', 'registeredStudentForExam']
    for (const path of variants) {
      try {
        const rows = await fetchDetails<any>(path, {
          collegeId: params.collegeId,
          academicYearId: params.academicYearId,
          courseId: params.courseId,
          courseGroupId: params.courseGroupId,
          courseYearId: params.courseYearId,
          regulationId: params.regulationId,
          subjectId: params.subjectId,
          examId: params.examId,
        })
        if (Array.isArray(rows)) return rows
        if (Array.isArray(rows?.resultList)) return rows.resultList
        if (Array.isArray(rows?.result)) return rows.result
        if (Array.isArray(rows?.data)) return rows.data
      } catch {
        // try next path
      }
    }

    // Fallback: derive registered students from ExamStudent domain records.
    // Some environments don't expose the legacy endpoint but keep domain data consistent.
    const queries = [
      buildQuery({
        'College.collegeId': params.collegeId,
        'courseGroupId': params.courseGroupId,
        'courseYearId': params.courseYearId,
        'regulationId': params.regulationId,
        'examId': params.examId,
        isActive: true,
      }),
      buildQuery({
        'college.collegeId': params.collegeId,
        courseGroupId: params.courseGroupId,
        courseYearId: params.courseYearId,
        regulationId: params.regulationId,
        examId: params.examId,
        isActive: true,
      }),
    ]

    for (const q of queries) {
      try {
        const rows = await domainList<AnyRow>('ExamStudent', q)
        if (!Array.isArray(rows) || rows.length === 0) continue
        const out: AnyRow[] = []
        for (const row of rows) {
          const details = row.examStudentDetailDTOs ?? row.examStudentDetails ?? row.examStudentDetailList ?? []
          const hasSubject = Array.isArray(details) && details.some((d: AnyRow) => Number(d.subjectId ?? d.fk_subject_id ?? d.subject_id ?? 0) === Number(params.subjectId))
          if (!hasSubject) continue
          out.push({
            ...row,
            studentId: row.studentId ?? row.fk_student_id ?? row.student_id ?? row.std_id,
            firstName: row.firstName ?? row.studentName ?? row.stdName ?? row.student_name,
            hallticketNumber: row.hallticketNumber ?? row.rollNumber ?? row.roll_number,
          })
        }
        if (out.length > 0) return out
      } catch {
        // try next fallback query
      }
    }
    return []
  })
}

export async function getExamOmrStudents(params: {
  examId: number
  collegeId: number
  courseGroupId: number
  courseYearId: number
  regulationId: number
  subjectId: number
}): Promise<AnyRow[]> {
  const data = await fetchDetails<{ result: AnyRow[][] }>(EXAM_API.GET_EXAM_ALLOTMENT_DETAILS, {
    in_flag: 'exam_OMR_students',
    in_exam_id: params.examId,
    in_college_id: params.collegeId,
    in_course_id: 0,
    in_course_group_id: params.courseGroupId,
    in_course_year_id: params.courseYearId,
    in_room_id: 0,
    in_std_id: 0,
    in_invgilator_emp_id: 0,
    in_regulation_id: params.regulationId,
    from_exam_date: '1999-01-01',
    to_exam_date: '1999-01-01',
    in_subject_id: params.subjectId,
    in_session_id: 0,
  })
  return data?.result?.[0] ?? []
}

export async function generateBarcodesForExamStudents(examStdDetIds: number[]): Promise<any> {
  return fetchDetails<any>('generateBarCode', {
    examStdDetIds: examStdDetIds.join(','),
  })
}

export async function listStudentExamFeeRegistrationPayments(params: {
  collegeId: number
  examId: number
}): Promise<AnyRow[]> {
  return domainList<AnyRow>(
    'ExamStudentRegistrationPayment',
    buildQuery({
      'College.collegeId': params.collegeId,
      'ExamMaster.examId': params.examId,
      isActive: true,
    }),
  )
}

function flattenExamStudentDetailRows(rows: AnyRow[]): AnyRow[] {
  const out: AnyRow[] = []
  for (const row of rows) {
    const details = row.examStudentDetailDTOs ?? row.examStudentDetails ?? row.examStudentDetailList ?? []
    if (!Array.isArray(details)) continue
    for (const d of details) {
      out.push({
        ...d,
        courseYearId: row.courseYearId ?? d.courseYearId,
        courseYearName: row.courseYearName ?? d.courseYearName,
        examtypeCatCode: row.examtypeCatCode ?? d.examtypeCatCode,
      })
    }
  }
  return out
}

/**
 * One ordered pass over ExamStudent query shapes (with optional college filter).
 * Replaces duplicate parallel ExamStudent list calls across fee registration + subject lists.
 */
export async function listExamStudentRowsForStudentAndExam(
  studentId: number,
  examId: number,
  collegeId?: number | null,
): Promise<AnyRow[]> {
  const queryStrings: string[] = []
  const cid = collegeId != null ? Number(collegeId) : 0
  if (cid > 0) {
    queryStrings.push(
      buildQuery({
        'College.collegeId': cid,
        'ExamMaster.examId': examId,
        'StudentDetail.studentId': studentId,
        isActive: true,
      }),
      buildQuery({
        'college.collegeId': cid,
        'examMaster.examId': examId,
        'studentDetail.studentId': studentId,
        isActive: true,
      }),
      buildQuery({ collegeId: cid, examId, studentId, isActive: true }),
    )
  }
  queryStrings.push(
    buildQuery({ 'studentDetail.studentId': studentId, 'examMaster.examId': examId, isActive: true }),
    buildQuery({ 'StudentDetail.studentId': studentId, 'ExamMaster.examId': examId, isActive: true }),
    buildQuery({ studentId, examId, isActive: true }),
  )
  const seen = new Set<string>()
  for (const q of queryStrings) {
    if (seen.has(q)) continue
    seen.add(q)
    try {
      const rows = await domainList<AnyRow>('ExamStudent', q)
      if (Array.isArray(rows) && rows.length > 0) return rows
    } catch {
      // try next query shape
    }
  }
  return []
}

async function listStudentExamFeeRegistrationsRegistrationOnly(params: {
  collegeId: number
  examId: number
  studentId: number
}): Promise<AnyRow[]> {
  const queries = [
    buildQuery({
      'College.collegeId': params.collegeId,
      'ExamMaster.examId': params.examId,
      'StudentDetail.studentId': params.studentId,
      isActive: true,
    }),
    buildQuery({
      'college.collegeId': params.collegeId,
      'examMaster.examId': params.examId,
      'studentDetail.studentId': params.studentId,
      isActive: true,
    }),
    buildQuery({
      collegeId: params.collegeId,
      examId: params.examId,
      studentId: params.studentId,
      isActive: true,
    }),
  ]
  for (const query of queries) {
    try {
      const rows = await domainList<AnyRow>('ExamStudentRegistration', query)
      if (Array.isArray(rows) && rows.length > 0) return rows
    } catch {
      // try next
    }
  }
  return []
}

export async function listStudentExamFeeRegistrations(params: {
  collegeId: number
  examId: number
  studentId: number
}): Promise<AnyRow[]> {
  const reg = await listStudentExamFeeRegistrationsRegistrationOnly(params)
  if (reg.length > 0) return reg
  return listExamStudentRowsForStudentAndExam(params.studentId, params.examId, params.collegeId)
}

export async function listRegisteredExamSubjects(studentId: number, examId: number): Promise<AnyRow[]> {
  const queries = [
    buildQuery({ 'studentDetail.studentId': studentId, 'examMaster.examId': examId, isActive: true }),
    buildQuery({ 'StudentDetail.studentId': studentId, 'ExamMaster.examId': examId, isActive: true }),
    buildQuery({ studentId, examId, isActive: true }),
  ]
  for (const q of queries) {
    try {
      const rows = await domainList<AnyRow>('ExamStudent', q)
      if (!Array.isArray(rows) || rows.length === 0) continue
      const out = flattenExamStudentDetailRows(rows)
      if (out.length > 0) return out
    } catch {
      // try next query
    }
  }
  return []
}

export async function getExamRegistrationForm(params: {
  collegeId: number
  examId: number
  studentId: number
}): Promise<AnyRow | null> {
  // Legacy endpoint used by Angular screen:
  // getExamRegForms?collegeId=<>&examId=<>&studentId=<>
  try {
    const row = await fetchDetails<any>('getExamRegForms', {
      collegeId: params.collegeId,
      examId: params.examId,
      studentId: params.studentId,
    })
    if (row && typeof row === 'object' && !Array.isArray(row)) return row
    if (Array.isArray(row) && row.length > 0) return row[0]
  } catch {
    // fallback below
  }

  // Fallback via ExamStudent domain query.
  const queries = [
    buildQuery({
      'College.collegeId': params.collegeId,
      examId: params.examId,
      studentId: params.studentId,
      isActive: true,
    }),
    buildQuery({
      'college.collegeId': params.collegeId,
      examId: params.examId,
      studentId: params.studentId,
      isActive: true,
    }),
  ]
  for (const q of queries) {
    try {
      const rows = await domainList<AnyRow>('ExamStudent', q)
      if (Array.isArray(rows) && rows.length > 0) return rows[0]
    } catch {
      // try next
    }
  }
  return null
}

export async function listStudentSubjects(params: {
  collegeId: number
  academicYearId: number
  studentId: number
  courseYearId: number
}): Promise<AnyRow[]> {
  const { NEXT_API } = await import('@/config/constants/api')
  const rawQueries = [
    `college.collegeId==${params.collegeId}.and.academicYear.academicYearId==${params.academicYearId}.and.studentDetail.studentId==${params.studentId}.and.courseYear.courseYearId==${params.courseYearId}.and.isActive==true`,
    `College.collegeId==${params.collegeId}.and.AcademicYear.academicYearId==${params.academicYearId}.and.StudentDetail.studentId==${params.studentId}.and.CourseYear.courseYearId==${params.courseYearId}.and.isActive==true`,
  ]

  for (let i = 0; i < rawQueries.length; i += 1) {
    const q = rawQueries[i]!
    try {
      const res = await fetch(
        NEXT_API.PROXY(`/domain/list/StudentSubject?size=99999&query=${encodeURIComponent(q)}`),
      )
      const body = await res.json().catch(() => null)
      const rows = (
        body?.data?.resultList ??
        body?.resultList ??
        body?.data ??
        body?.result ??
        body ??
        []
      ) as AnyRow[]
      if (Array.isArray(rows)) {
        if (rows.length > 0) return rows
        // Same as domain list: empty with OK + success means no rows — skip redundant casing retry.
        if (res.ok && body?.success !== false) return []
      }
    } catch {
      // try next query variant
    }
  }
  return []
}

export async function saveRegisteredExamSubjects(payload: AnyRow[]): Promise<any> {
  try {
    // Angular app uses /cms/examstudent for exam student registration.
    return await postDetails<any>('examstudent', payload)
  } catch {
    // fallback below
  }

  try {
    // Legacy path used by Angular screen
    return await postDetails<any>('saveExamStudentDetails', payload)
  } catch {
    // Fallback: create one-by-one through domain create
    const created: AnyRow[] = []
    for (const row of payload) {
      try {
        const one = await domainCreate<AnyRow>('ExamStudent', row)
        created.push(one)
      } catch {
        // continue best-effort
      }
    }
    return { success: created.length > 0, data: created }
  }
}

export async function listExamFeeAdditionalStructureByExamType(examTypeGeneralDetailId: number): Promise<AnyRow[]> {
  const key = `efa:${examTypeGeneralDetailId}`
  return dedupeInflight(inflightExamFeeAddlByType, key, async () => {
    try {
      return await domainList<AnyRow>(
        'ExamFeeAdditionalStructure',
        buildQuery(
          { 'examTypeCat.generalDetailId': examTypeGeneralDetailId, isActive: true },
          { field: 'createdDt', direction: 'DESC' },
        ),
      )
    } catch {
      return []
    }
  })
}
export async function deactivateRegisteredExamSubject(examStdDetId: number, reason?: string): Promise<any> {
  const { NEXT_API } = await import('@/config/constants/api')
  const reqBody = { isActive: false, examStdDetId, reason: reason ?? '' }

  // Legacy update endpoint first
  try {
    const res = await fetch(NEXT_API.PROXY('/updateExamStudentRegistrationDetails'), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reqBody),
    })
    const body = await res.json().catch(() => null)
    if (res.ok && (body?.success ?? true)) return body
  } catch {
    // fallback
  }

  // Domain fallback shapes
  try {
    return await domainUpdate<AnyRow>('ExamStudentDetail', 'examStdDetId', examStdDetId, { isActive: false, reason })
  } catch {
    return domainUpdate<AnyRow>('ExamStudentDetails', 'examStdDetId', examStdDetId, { isActive: false, reason })
  }
}

export async function listExamFeeReceipts(params: {
  studentId: number
  examId: number
}): Promise<AnyRow[]> {
  // Exact Angular query parity:
  // /domain/list/ExamFeeReceipt?size=99999&query=exam.examId==<id>.and.studentDetail.studentId==<id>.and.isActive==true
  try {
    const { NEXT_API } = await import('@/config/constants/api')
    const rawQuery = `exam.examId==${params.examId}.and.studentDetail.studentId==${params.studentId}.and.isActive==true`
    const res = await fetch(
      NEXT_API.PROXY(`/domain/list/ExamFeeReceipt?size=99999&query=${encodeURIComponent(rawQuery)}`),
    )
    const body = await res.json().catch(() => null)
    const rows = (
      body?.data?.resultList ??
      body?.resultList ??
      body?.data ??
      body?.result ??
      body ??
      []
    ) as AnyRow[]
    if (Array.isArray(rows)) {
      if (rows.length > 0) return rows
      // Successful empty list — do not fan out through every fallback query.
      if (res.ok && body?.success !== false) return []
    }
  } catch {
    // continue to fallback variants
  }

  const queries = [
    buildQuery({
      'studentDetail.studentId': params.studentId,
      'exam.examId': params.examId,
      isActive: true,
    }),
    buildQuery({
      'StudentDetail.studentId': params.studentId,
      'Exam.examId': params.examId,
      isActive: true,
    }),
    buildQuery({
      'examMaster.examId': params.examId,
      studentId: params.studentId,
      isActive: true,
    }),
  ]

  for (const q of queries) {
    try {
      const rows = await domainList<AnyRow>('ExamFeeReceipt', q)
      if (Array.isArray(rows)) return rows
    } catch {
      // fallback query shape
    }
  }

  // Legacy endpoint fallback used by old Angular flow
  try {
    const data = await fetchDetails<any>('examFeeReceipt', {
      examId: params.examId,
      studentId: params.studentId,
      isActive: 'true',
    })
    if (Array.isArray(data)) return data
    if (Array.isArray(data?.resultList)) return data.resultList
    if (Array.isArray(data?.result)) return data.result
    if (Array.isArray(data?.data)) return data.data
  } catch {
    // ignore
  }
  return []
}

/**
 * Single “Get list” bundle for student exam fee registration: one ExamStudent list pass
 * (shared with subject flattening) + ExamStudentRegistration in parallel with receipts.
 */
export async function fetchStudentExamFeeRegistrationGridData(params: {
  collegeId: number
  examId: number
  studentId: number
}): Promise<{
  receipts: AnyRow[]
  registrations: AnyRow[]
  registeredSubjects: AnyRow[]
}> {
  const [receipts, examRows, regRows] = await Promise.all([
    listExamFeeReceipts({ studentId: params.studentId, examId: params.examId }),
    listExamStudentRowsForStudentAndExam(params.studentId, params.examId, params.collegeId),
    listStudentExamFeeRegistrationsRegistrationOnly(params),
  ])
  let registeredSubjects = flattenExamStudentDetailRows(examRows)
  if (registeredSubjects.length === 0) {
    registeredSubjects = await listRegisteredExamSubjects(params.studentId, params.examId)
  }
  const registrations = regRows.length > 0 ? regRows : examRows
  return { receipts, registrations, registeredSubjects }
}

export async function listAdditionalExamFeeTypes(): Promise<AnyRow[]> {
  return domainList<AnyRow>(
    'GeneralDetail',
    buildQuery({ 'GeneralMaster.generalMasterCode': GM_CODES.ADDITIONAL_FEE_TYPE, isActive: true }),
  )
}

export async function addExamAdditionalFeeReceipt(payload: AnyRow): Promise<any> {
  return postDetails<any>('addExamAdditionalFeeReceipt', payload)
}

// ---------------------------------------------------------------------------
// Student Exam Lab Batches
// ---------------------------------------------------------------------------

export async function listExamFeeTypes(): Promise<AnyRow[]> {
  return domainList<AnyRow>(
    'GeneralDetail',
    buildQuery({ 'GeneralMaster.generalMasterCode': GM_CODES.EXAM_FEE_TYPE, isActive: true }),
  )
}

export async function getUnivExamSubjectUcLab(params: {
  collegeId: number
  courseId: number
  courseGroupId: number
  courseYearId: number
  examId: number
  academicYearId: number
  regulationId: number
  employeeId: number
}): Promise<AnyRow[]> {
  const data = await getAllRecords<{ result: AnyRow[][] }>('s_get_exam_filters_bycode', {
    in_flag: 'univ_exam_subject_uc',
    in_flag_type: 'ALL',
    in_university_id: 0,
    in_college_id: params.collegeId,
    in_course_id: params.courseId,
    in_course_group_id: params.courseGroupId,
    in_course_year_id: params.courseYearId,
    in_exam_id: params.examId,
    in_academic_year_id: params.academicYearId,
    in_regulation_id: params.regulationId,
    in_subject_id: 0,
    in_loginuser_empid: params.employeeId || 0,
    in_loginuser_roleid: 0,
    in_sub_flag_type: 'LAB',
    in_param1: 0,
    in_param2: 0,
  })
  const groups = data?.result ?? []
  const subUc = groups.find((g) => (g?.[0]?.flag ?? '') === 'univ_exam_sub_uc') ?? []
  return subUc
}

export async function listStudentExamLabBatches(params: {
  collegeId: number
  examId: number
  courseYearId: number
  courseGroupId: number
  regulationId: number
  subjectId: number
  examTypeId: number
}): Promise<AnyRow[]> {
  const queries = [
    buildQuery({
      'college.collegeId': params.collegeId,
      'examMaster.examId': params.examId,
      'courseYear.courseYearId': params.courseYearId,
      'courseGroup.courseGroupId': params.courseGroupId,
      'Regulation.regulationId': params.regulationId,
      'subject.subjectId': params.subjectId,
      'examtypeCatdet.generalDetailId': params.examTypeId,
    }),
    buildQuery({
      'College.collegeId': params.collegeId,
      'ExamMaster.examId': params.examId,
      'CourseYear.courseYearId': params.courseYearId,
      'CourseGroup.courseGroupId': params.courseGroupId,
      'Regulation.regulationId': params.regulationId,
      'Subject.subjectId': params.subjectId,
      'examtypeCatdet.generalDetailId': params.examTypeId,
    }),
  ]
  for (const q of queries) {
    try {
      const rows = await domainList<AnyRow>('ExamLabBatches', q)
      if (Array.isArray(rows) && rows.length > 0) return rows
    } catch {
      // try next shape
    }
  }
  return []
}

export async function getExamLabBatchesReport(params: {
  examId: number
  collegeId: number
  courseId: number
  academicYearId: number
  courseGroupId: number
  courseYearId: number
  subjectId: number
  examTypeId: number
}): Promise<AnyRow[]> {
  const payload = {
    in_flag: '',
    in_exam_id: params.examId,
    in_college_id: params.collegeId,
    in_course_id: params.courseId,
    in_academic_year_id: params.academicYearId,
    in_course_group_id: params.courseGroupId,
    in_course_year_id: params.courseYearId,
    in_subject_id: params.subjectId,
    in_exam_labbatch_id: 0,
    in_exam_type: params.examTypeId,
  }

  const paths = ['getexamLabBatchesReport', 'getExamLabBatchesReport']
  for (const p of paths) {
    try {
      const data = await fetchDetails<any>(p, payload)
      const rows = data?.result?.[0] ?? data?.result ?? data?.data ?? data ?? []
      if (Array.isArray(rows)) return rows
    } catch {
      // try next path
    }
  }
  return []
}

export async function addExamLabBatchesStudentsList(payload: AnyRow[]): Promise<any> {
  return postDetails<any>('addExamLabBatchesStudentsList', payload)
}

export async function updateExamLabBatchesStudents(payload: AnyRow[]): Promise<any> {
  const { NEXT_API } = await import('@/config/constants/api')
  const res = await fetch(NEXT_API.PROXY('/updateExamLabBatchesStudents'), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const body = await res.json().catch(() => null)
  if (!res.ok) throw new Error(body?.message ?? 'Failed to update lab batch student')
  return body
}

// ---------------------------------------------------------------------------
// Additional Exam Fee Structure (parity with Angular)
// ---------------------------------------------------------------------------

export async function getStudentExamFeeStructure(params: {
  collegeId: number
  examId: number
  courseGroupId: number
  courseYearId: number
}): Promise<AnyRow | null> {
  // Exact legacy endpoint parity:
  // /getStudentExamFeeStructure?collegeId=&examId=&courseGroupId=&courseYearId=
  try {
    const { NEXT_API } = await import('@/config/constants/api')
    const query = new URLSearchParams({
      collegeId: String(params.collegeId),
      examId: String(params.examId),
      courseGroupId: String(params.courseGroupId),
      courseYearId: String(params.courseYearId),
    })
    const res = await fetch(NEXT_API.PROXY(`/getStudentExamFeeStructure?${query.toString()}`))
    const body = await res.json().catch(() => null)
    const row = body?.data ?? body?.result ?? body
    if (row && typeof row === 'object' && !Array.isArray(row)) return row
  } catch {
    // fall through
  }

  // Legacy API used by Angular: getStudentExamFeeStructure?collegeId=&examId=&courseGroupId=&courseYearId=
  try {
    const data = await fetchDetails<any>('getStudentExamFeeStructure', {
      collegeId: params.collegeId,
      examId: params.examId,
      courseGroupId: params.courseGroupId,
      courseYearId: params.courseYearId,
    })
    if (data && typeof data === 'object') return data
  } catch {
    // fall through
  }
  // Fallback to domain shape if available
  try {
    const rows = await domainList<AnyRow>(
      'ExamFeeStructure',
      buildQuery(
        {
          'College.collegeId': params.collegeId,
          'ExamMaster.examId': params.examId,
          'CourseGroup.courseGroupId': params.courseGroupId,
          'CourseYear.courseYearId': params.courseYearId,
          isActive: true,
        },
        { field: 'createdDt', direction: 'DESC' },
      ),
    )
    const one = Array.isArray(rows) && rows.length > 0 ? rows[0] : null
    return one ?? null
  } catch {
    return null
  }
}
