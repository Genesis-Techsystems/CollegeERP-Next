import { buildQuery, domainCreate, domainList, domainUpdate, fetchDetails, getAllRecords, postDetails } from '@/services/crud'
import { EXAM_API } from '@/config/constants/api'
import { GM_CODES } from '@/config/constants/ui'

type AnyRow = Record<string, any>

export async function listActiveColleges(): Promise<AnyRow[]> {
  return domainList<AnyRow>('College', buildQuery({ isActive: true }))
}

export async function listAcademicYearsByUniversity(universityId: number): Promise<AnyRow[]> {
  return domainList<AnyRow>(
    'AcademicYear',
    buildQuery({ 'University.universityId': universityId, isActive: true }, { field: 'fromDate', direction: 'DESC' }),
  )
}

export async function listCoursesByUniversity(universityId: number): Promise<AnyRow[]> {
  return domainList<AnyRow>('Course', buildQuery({ 'University.universityId': universityId, isActive: true }))
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
          examDate: examDate.slice(0, 10),
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

export async function listExamRoomAllotments(collegeId: number, examId: number, examTimetableId: number): Promise<AnyRow[]> {
  const { NEXT_API } = await import('@/config/constants/api')
  const queries = [
    `examMaster.examId==${examId}.and.ExamTimetable.examTimetableId==${examTimetableId}.and.College.collegeId==${collegeId}`,
    `examMaster.examId==${examId}.and.ExamTimetable.examTimetableId==${examTimetableId}`,
    `examMasterId==${examId}.and.examTimetableId==${examTimetableId}`,
  ]

  for (const query of queries) {
    try {
      const res = await fetch(
        NEXT_API.PROXY(`/domain/list/ExamRoomAllotment?size=99999&query=${encodeURIComponent(query)}`),
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
      if (Array.isArray(rows) && rows.length > 0) return rows
    } catch {
      // try next query shape
    }
  }

  return []
}

export async function listExamInvigilationAllotments(examTimetableId: number, collegeId: number): Promise<AnyRow[]> {
  return domainList<AnyRow>(
    'ExamInvigilationAllotment',
    buildQuery({ 'ExamTimetable.examTimetableId': examTimetableId, 'College.collegeId': collegeId, isActive: true }),
  )
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
  return domainList<AnyRow>('Student', buildQuery({ isActive: true, firstName: term }))
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
  const variants = ['examSubjectStudents', 'examsubjectstudents']
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
  const variants = ['registeredStudentForExam', 'registeredstudentforexam']
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

export async function listStudentExamFeeRegistrations(params: {
  collegeId: number
  examId: number
  studentId: number
}): Promise<AnyRow[]> {
  const queries = [
    buildQuery({
      'college.collegeId': params.collegeId,
      'examMaster.examId': params.examId,
      'studentDetail.studentId': params.studentId,
      isActive: true,
    }),
    buildQuery({
      'College.collegeId': params.collegeId,
      'ExamMaster.examId': params.examId,
      'StudentDetail.studentId': params.studentId,
      isActive: true,
    }),
    buildQuery({
      collegeId: params.collegeId,
      examId: params.examId,
      studentId: params.studentId,
      isActive: true,
    }),
  ]

  const entities = ['ExamStudentRegistration', 'ExamStudent']

  for (const entity of entities) {
    for (const query of queries) {
      try {
        const rows = await domainList<AnyRow>(entity, query)
        if (Array.isArray(rows) && rows.length > 0) return rows
      } catch {
        // try next fallback
      }
    }
  }
  return []
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
      const out: AnyRow[] = []
      for (const row of rows) {
        const details = row.examStudentDetailDTOs ?? row.examStudentDetails ?? row.examStudentDetailList ?? []
        if (Array.isArray(details) && details.length > 0) {
          for (const d of details) {
            out.push({
              ...d,
              courseYearId: row.courseYearId ?? d.courseYearId,
              courseYearName: row.courseYearName ?? d.courseYearName,
              examtypeCatCode: row.examtypeCatCode ?? d.examtypeCatCode,
            })
          }
        }
      }
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

  for (const q of rawQueries) {
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
      if (Array.isArray(rows) && rows.length > 0) return rows
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
    if (Array.isArray(rows) && rows.length > 0) return rows
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
      'student.studentId': params.studentId,
      'exam.examId': params.examId,
      isActive: true,
    }),
    buildQuery({
      'Student.studentId': params.studentId,
      'Exam.examId': params.examId,
      isActive: true,
    }),
    buildQuery({
      'examMaster.examId': params.examId,
      studentId: params.studentId,
      isActive: true,
    }),
    buildQuery({
      examId: params.examId,
      studentId: params.studentId,
      isActive: true,
    }),
    buildQuery({
      studentId: params.studentId,
      examId: params.examId,
      isActive: true,
    }),
  ]

  for (const q of queries) {
    try {
      const rows = await domainList<AnyRow>('ExamFeeReceipt', q)
      if (Array.isArray(rows) && rows.length > 0) return rows
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
