import { buildQuery, domainList, getAllRecords, getAllRecordsEnvelope, postDetails, putDetails } from '@/services/crud'
import { EXAM_EVAL_API } from '@/config/constants/api'
import { GM_CODES } from '@/config/constants/ui'
import {
  getUnivExamFiltersByType,
  getUnivExamRestNoTtBundle,
  getUnivExamSubjectInss,
  getUnivExamSubjectUc,
} from '@/services/pre-examination'

type AnyRow = Record<string, any>

function firstNonEmptyGroup(groups: AnyRow[][]): AnyRow[] {
  return groups.find((g) => Array.isArray(g) && g.length > 0) ?? []
}

function firstGroupByFlag(groups: AnyRow[][], flags: string[]): AnyRow[] {
  const normalized = new Set(flags.map((f) => f.toLowerCase()))
  return (
    groups.find((g) => {
      const flag = String(g?.[0]?.flag ?? '').toLowerCase()
      return normalized.has(flag)
    }) ?? []
  )
}

export interface AttendanceFilterParams {
  courseId: number
  examId: number
  academicYearId: number
  collegeId: number
  courseGroupId: number
  courseYearId: number
  regulationId: number
  subjectId: number
  sectionId?: number
  labBatchId?: number
}

export async function getInternalAttendanceFilters(employeeId: number): Promise<AnyRow[]> {
  return getUnivExamFiltersByType(employeeId, 'INT')
}

export async function listInternalExamAverageColleges(): Promise<AnyRow[]> {
  return domainList<AnyRow>('College', buildQuery({ isActive: true }))
}

export async function listInternalExamAverageAcademicYears(universityId: number): Promise<AnyRow[]> {
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

export async function listInternalExamAverageCourses(universityId: number): Promise<AnyRow[]> {
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

export async function listInternalExamAverageCourseGroups(courseId: number): Promise<AnyRow[]> {
  return domainList<AnyRow>('CourseGroup', buildQuery({ 'Course.courseId': courseId, isActive: true }))
}

export async function listInternalExamAverageCourseYears(courseId: number): Promise<AnyRow[]> {
  return domainList<AnyRow>('CourseYear', buildQuery({ 'Course.courseId': courseId, isActive: true }, { field: 'sortOrder', direction: 'ASC' }))
}

export async function listInternalExamAverageExamTypes(): Promise<AnyRow[]> {
  const codes = [GM_CODES.INTERNAL_EXAM_MARKS_TYPE, GM_CODES.SUBJECT_TYPE]
  for (const code of codes) {
    try {
      const rows = await domainList<AnyRow>(
        'GeneralDetail',
        buildQuery({ 'GeneralMaster.generalMasterCode': code, isActive: true }),
      )
      if (Array.isArray(rows) && rows.length > 0) return rows
    } catch {
      // try next code
    }
  }
  return []
}

export async function listInternalExamAverageExams(params: {
  collegeId: number
  courseId: number
  academicYearId: number
  courseGroupId: number
  courseYearId: number
}): Promise<AnyRow[]> {
  const queries = [
    buildQuery(
      {
        'college.collegeId': params.collegeId,
        'examMaster.course.courseId': params.courseId,
        'examMaster.academicYear.academicYearId': params.academicYearId,
        'studentDetail.courseGroup.courseGroupId': params.courseGroupId,
        'courseYear.courseYearId': params.courseYearId,
        'examtypeCat.generalDetailCode': 'Internal',
        isActive: true,
      },
      { field: 'createdDt', direction: 'DESC' },
    ),
    buildQuery(
      {
        'College.collegeId': params.collegeId,
        'ExamMaster.course.courseId': params.courseId,
        'ExamMaster.academicYear.academicYearId': params.academicYearId,
        'studentDetail.courseGroup.courseGroupId': params.courseGroupId,
        'courseYear.courseYearId': params.courseYearId,
        'examtypeCat.generalDetailCode': 'Internal',
        isActive: true,
      },
      { field: 'createdDt', direction: 'DESC' },
    ),
  ]
  for (const query of queries) {
    try {
      const rows = await domainList<AnyRow>('ExamStudent', query)
      if (Array.isArray(rows) && rows.length > 0) return rows
    } catch {
      // try next query shape
    }
  }

  // Fallback to procedure-driven filters when ExamStudent query returns empty in some deployments.
  const attempts = [
    { in_flag: 'univ_exam_inep_filters', in_flag_type: 'OFF_INT_EVAL' },
    { in_flag: 'univ_exam_inep_filters', in_flag_type: 'QUESTION_SETTER' },
    { in_flag: 'univ_exam_inep_filters', in_flag_type: 'REGSUP' },
    { in_flag: 'univ_exam_filters', in_flag_type: 'OFF_INT_EVAL' },
    { in_flag: 'univ_exam_filters', in_flag_type: 'REGSUP' },
  ]
  for (const attempt of attempts) {
    try {
      const data = await getAllRecords<{ result: AnyRow[][] }>('s_get_exam_filters_bycode', {
        in_flag: attempt.in_flag,
        in_flag_type: attempt.in_flag_type,
        in_university_id: 0,
        in_univ_examcenter_id: 0,
        in_college_id: params.collegeId,
        in_course_id: params.courseId,
        in_course_group_id: params.courseGroupId,
        in_course_year_id: params.courseYearId,
        in_exam_id: 0,
        in_academic_year_id: params.academicYearId,
        in_regulation_id: 0,
        in_subject_id: 0,
        in_sub_flag_type: '',
        in_param1: 0,
        in_param2: 'REGSUP',
        in_loginuser_roleid: 0,
        in_loginuser_empid: 0,
      })
      const groups = data?.result ?? []
      const rows = groups.flatMap((g) => g ?? [])
      const filtered = rows.filter((r) => {
        const isInternal = Boolean(r?.is_internal_exam) || String(r?.exam_type ?? '').toLowerCase() === 'internal'
        return isInternal
      })
      if (filtered.length > 0) return filtered
    } catch {
      // continue next attempt
    }
  }
  return []
}

export async function getRegulationById(regulationId: number): Promise<AnyRow | null> {
  const rows = await domainList<AnyRow>('Regulation', buildQuery({ regulationId }))
  return rows?.[0] ?? null
}

export async function getInternalExamAverageMarks(params: {
  examIds: number[]
  collegeId: number
  courseGroupId: number
  courseYearId: number
  finalTypeId: number
}): Promise<AnyRow[]> {
  const data = await getAllRecords<{ result: AnyRow[][] }>('s_get_exam_internal_final_marks', {
    in_exam_ids: params.examIds.join(','),
    in_college_id: params.collegeId,
    in_course_group_id: params.courseGroupId,
    in_course_year_id: params.courseYearId,
    in_subject_id: 0,
    in_std_id: 0,
    in_final_type: params.finalTypeId,
  })
  const groups = data?.result ?? []
  return groups[0] ?? []
}

export async function saveInternalExamAverageMarks(rows: AnyRow[]): Promise<any> {
  return postDetails<any>('finalinternalmarks', rows)
}

export async function getGradeMemoIssueFilters(employeeId: number): Promise<AnyRow[]> {
  const attempts = [
    { in_flag: 'univ_exam_filters', in_flag_type: 'REGSUP' },
    { in_flag: 'univ_exam_filters', in_flag_type: 'ALL' },
  ]
  for (const attempt of attempts) {
    try {
      const data = await getAllRecords<{ result: AnyRow[][] }>('s_get_exam_filters_bycode', {
        ...attempt,
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
      const picked = firstGroupByFlag(groups, ['univ_exam_filters'])
      if (picked.length > 0) return picked
      const fallback = firstNonEmptyGroup(groups)
      if (fallback.length > 0) return fallback
    } catch {
      // try next
    }
  }
  return []
}

export async function getGradeMemoIssueRestFilters(params: {
  courseId: number
  examId: number
  academicYearId: number
  employeeId: number
}): Promise<AnyRow[]> {
  const attempts = ['ALL', 'REGSUP']
  for (const flagType of attempts) {
    try {
      const data = await getAllRecords<{ result: AnyRow[][] }>('s_get_exam_filters_bycode', {
        in_flag: 'univ_exam_rest_in_regexamstd',
        in_flag_type: flagType,
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
      const picked = firstGroupByFlag(groups, ['univ_exam_rest_filters'])
      if (picked.length > 0) return picked
      const fallback = firstNonEmptyGroup(groups)
      if (fallback.length > 0) return fallback
    } catch {
      // try next
    }
  }
  return []
}

export async function getGradeMemoIssueResult(params: {
  organizationId: number
  examId: number
  collegeId: number
  courseId: number
  courseGroupId: number
  courseYearId: number
  studentId: number
}): Promise<{ resultRows: AnyRow[]; gradesRows: AnyRow[] }> {
  const data = await getAllRecords<{ result: AnyRow[][] }>('s_get_exam_result_memos', {
    in_flag: 'list_exam_student_gradecard',
    in_orgid: params.organizationId,
    in_fdate: '1990-01-01',
    in_tdate: '1990-01-01',
    in_exam_id: params.examId,
    in_clg_id: params.collegeId,
    in_course_id: params.courseId,
    in_course_group_id: params.courseGroupId,
    in_course_year_id: params.courseYearId,
    in_subject_id: 0,
    in_evalutor_profileid: 0,
    in_exam_date: '1990-01-01',
    in_regulation_id: 0,
    in_emp_id: 0,
    in_questionpaper_id: 0,
    in_student_id: params.studentId || 0,
  })
  const groups = data?.result ?? []
  const resultRows = firstGroupByFlag(groups, ['list_exam_student_gradecard'])
  const gradesRows = firstGroupByFlag(groups, ['grades_course'])
  return { resultRows, gradesRows }
}

export async function getCompleteExamProcessFilters(employeeId: number): Promise<AnyRow[]> {
  return getGradeMemoIssueFilters(employeeId)
}

/**
 * These pop procs report their real outcome via the envelope `message`, not the
 * `success` flag — same HTTP-200/`message` contract as the result-processing
 * procs below. Using {@link getAllRecordsEnvelope} (which does not throw on
 * `success: false`) and returning `message` lets the page surface the true
 * outcome instead of a false success.
 */
export async function runCompleteExamSetupAssignments(examId: number): Promise<string> {
  const body = await getAllRecordsEnvelope('s_pop_exam_evaluatorassignment', {
    in_flag: 'popstudentassignment',
    in_profileids: '',
    in_exam_evaluationassignment_ids: '',
    in_omr_serial_nos: '',
    in_timetable_det_ids: '',
    in_exam_id: examId,
    in_subject_id: 0,
    in_course_year_id: 0,
  })
  return body.message ?? ''
}

export async function runCompleteExamReEvaluationAssignments(examId: number): Promise<string> {
  const body = await getAllRecordsEnvelope('s_pop_exam_evaluatorassignment', {
    in_flag: 're_evaluation_assignment_pop',
    in_profileids: '',
    in_exam_evaluationassignment_ids: '',
    in_omr_serial_nos: '',
    in_timetable_det_ids: '',
    in_exam_id: examId,
    in_subject_id: 0,
    in_course_year_id: 0,
  })
  return body.message ?? ''
}

export async function runCompleteExamFinalizeAction(flag: string, examId: number): Promise<string> {
  const body = await getAllRecordsEnvelope('s_pop_exam_evaluationmarksfinalise', {
    in_flag: flag,
    in_examid: examId,
  })
  return body.message ?? ''
}

export async function runCompleteExamFinalizeProfiles(): Promise<string> {
  const body = await getAllRecordsEnvelope('s_pop_exam_committees', { in_flag: 'exam_committees' })
  return body.message ?? ''
}

/**
 * Angular complete-exam-fee-registration `resultPro()`: any HTTP-200 body is
 * treated as completed and `result.message` is surfaced to the user — these
 * pop procs report their outcome via `message`, not the `success` flag.
 * Returns the backend message for the page to toast.
 */
export async function runCompleteExamResultProcessing(examId: number): Promise<string> {
  const body = await getAllRecordsEnvelope('s_pop_exam_resultprocessing_v4', { in_exam_id: examId })
  return body.message ?? ''
}

/** Angular `resultProPublish()` — same HTTP-200/`message` contract as {@link runCompleteExamResultProcessing}. */
export async function runCompleteExamResultProcessingPublish(examId: number): Promise<string> {
  const body = await getAllRecordsEnvelope('s_pop_exam_resultprocessing_publish_v4', { in_exam_id: examId })
  return body.message ?? ''
}

export type VerifyExamMarksMode = 'internal' | 'external' | 'evaluation' | 'all'

export async function getVerifyExamMarksFilters(params: {
  organizationId: number
  employeeId: number
}): Promise<AnyRow[]> {
  const data = await getAllRecords<{ result: AnyRow[][] }>('s_get_collegewisedetails_bycode', {
    in_flag: 'clg_exam_timetable_filters',
    in_org_id: params.organizationId || 0,
    in_college_id: 0,
    in_course_id: 0,
    in_course_group_id: 0,
    in_course_year_id: 0,
    in_group_section_id: 0,
    in_academic_year_id: 0,
    in_dept_id: 0,
    in_isadmin: 0,
    in_loginuser_empid: params.employeeId || 0,
    in_loginuser_roleid: 0,
    in_employee: '',
    in_subject: '',
    in_gm_codes: '',
  })
  const groups = data?.result ?? []
  const picked = firstGroupByFlag(groups, ['clg_exam_timetable_filters'])
  if (picked.length > 0) return picked
  return firstNonEmptyGroup(groups)
}

export async function getVerifyExamMarksColleges(): Promise<AnyRow[]> {
  return domainList<AnyRow>('College', buildQuery({ isActive: true }))
}

export async function getVerifyExamMarksExams(employeeId: number): Promise<AnyRow[]> {
  return getCompleteExamProcessFilters(employeeId)
}

export async function getVerifyExamMarksReport(params: {
  mode: VerifyExamMarksMode
  examId: number
  collegeId: number
  courseGroupId: number
  subjectId: number
}): Promise<AnyRow[]> {
  const inFlag =
    params.mode === 'internal' ? 'int_exam_marks_entered_count' : 'ext_int_exam_marks_entered_count'

  const payload = {
    in_flag: inFlag,
    in_exam_id: params.examId,
    in_college_id: params.collegeId,
    in_course_id: 0,
    in_course_group_id: params.courseGroupId || 0,
    in_course_year_id: 0,
    in_academic_year_id: 0,
    in_regulation_id: 0,
    in_subject_id: params.subjectId || 0,
  }

  const procAttempts = [
    's_get_exam_premoderation_reports_bycodes',
    's_get_exam_premoderation',
    's_get_exam_resultprocessing',
    's_get_exam_result_processing',
  ]
  for (const proc of procAttempts) {
    try {
      const data = await getAllRecords<any>(proc, payload)
      const result = data?.result

      if (Array.isArray(result)) {
        if (result.length > 0 && Array.isArray(result[0])) {
          const groups = result as AnyRow[][]
          const rows = firstNonEmptyGroup(groups)
          if (rows.length > 0) return rows
        } else if (result.length > 0 && typeof result[0] === 'object') {
          return result as AnyRow[]
        }
      }

      if (Array.isArray(data?.resultList) && data.resultList.length > 0) {
        return data.resultList as AnyRow[]
      }
    } catch {
      // fallback to next proc name variant
    }
  }

  return []
}

export async function getInternalAttendanceStudents(
  params: AttendanceFilterParams,
): Promise<AnyRow[]> {
  const payload = {
    in_flag: '',
    in_college_id: params.collegeId,
    in_course_id: params.courseId,
    in_exam_id: params.examId,
    in_course_group_id: params.courseGroupId,
    in_course_year_id: params.courseYearId,
    in_regulation_id: params.regulationId,
    in_subject_id: params.subjectId,
    in_group_section_id: params.sectionId ?? 0,
    in_stdbatch_id: params.labBatchId ?? 0,
    in_eaxm_labbatch_id: params.labBatchId ?? 0,
    is_extenalperson_approve: 0,
    in_exam_date: '1999-01-01',
  }
  const data = await getAllRecords<{ result: AnyRow[][] }>('s_get_exam_internal_marksdetail', payload)
  const groups = data?.result ?? []
  const first = groups[0] ?? []
  return Array.isArray(first) ? first : []
}

export async function saveInternalAttendance(rows: AnyRow[]): Promise<void> {
  await putDetails('examstudentdetails', rows)
}

export async function getExternalAttendanceFilters(employeeId: number): Promise<AnyRow[]> {
  return getUnivExamFiltersByType(employeeId, 'REGSUP')
}

export async function getExternalAttendanceSubjects(params: {
  courseId: number
  examId: number
  academicYearId: number
  employeeId: number
}): Promise<AnyRow[]> {
  const data = await getAllRecords<{ result: AnyRow[][] }>('s_get_exam_filters_bycode', {
    in_flag: 'univ_exam_subject_regexamstd',
    in_flag_type: 'REGSUP',
    in_university_id: 0,
    in_univ_examcenter_id: 0,
    in_college_id: 0,
    in_course_id: params.courseId,
    in_course_group_id: 0,
    in_course_year_id: 0,
    in_exam_id: params.examId,
    in_academic_year_id: params.academicYearId,
    in_regulation_id: 0,
    in_sub_flag_type: 'ALL',
    in_subject_id: 0,
    in_param1: 0,
    in_param2: 0,
    in_loginuser_roleid: 0,
    in_loginuser_empid: params.employeeId || 0,
  })
  const groups = data?.result ?? []
  return groups.flatMap((g) => g || [])
}

export async function getExternalAttendanceRestFilters(params: {
  courseId: number
  examId: number
  academicYearId: number
  regulationId: number
  subjectId: number
  employeeId: number
}): Promise<AnyRow[]> {
  const data = await getAllRecords<{ result: AnyRow[][] }>('s_get_exam_filters_bycode', {
    in_flag: 'univ_exam_rest_in_regexamstd',
    in_flag_type: 'ALL',
    in_university_id: 0,
    in_univ_examcenter_id: 0,
    in_college_id: 0,
    in_course_id: params.courseId,
    in_course_group_id: 0,
    in_course_year_id: 0,
    in_exam_id: params.examId,
    in_academic_year_id: params.academicYearId,
    in_regulation_id: params.regulationId,
    in_subject_id: params.subjectId,
    in_sub_flag_type: '',
    in_param1: 0,
    in_param2: 0,
    in_loginuser_roleid: 0,
    in_loginuser_empid: params.employeeId || 0,
  })
  const groups = data?.result ?? []
  return groups.flatMap((g) => g || [])
}

export async function listExternalAttendanceStudents(params: {
  examId: number
  courseId: number
  courseGroupId: number
  courseYearId: number
  roomId: number
  regulationId: number
  examDate: string
  subjectId: number
}): Promise<AnyRow[]> {
  const data = await getAllRecords<{ result: AnyRow[][] }>('s_get_exam_allotment_details_invigilator', {
    in_flag: 'invigilator_room_details',
    in_clg_id: 0,
    in_exam_id: params.examId,
    in_course_id: params.courseId,
    in_course_group_id: params.courseGroupId,
    in_course_year_id: params.courseYearId,
    in_room_id: params.roomId,
    in_std_id: 0,
    in_invgilator_emp_id: 0,
    in_regulation_id: params.regulationId,
    from_exam_date: params.examDate,
    to_exam_date: params.examDate,
    in_subject_id: params.subjectId,
    in_session_id: 0,
    in_exam_labbatch_id: 0,
  })
  const groups = data?.result ?? []
  const first = groups[0] ?? []
  return Array.isArray(first) ? first : []
}

export async function listActiveRooms(): Promise<AnyRow[]> {
  return domainList<AnyRow>('Room', buildQuery({ isActive: true }))
}

export async function getInternalMarksEntryFilters(employeeId: number): Promise<AnyRow[]> {
  return getUnivExamFiltersByType(employeeId, 'INT')
}

export async function getInternalMarksEntryRestFilters(params: {
  courseId: number
  examId: number
  academicYearId: number
  employeeId: number
}): Promise<AnyRow[]> {
  const data = await getAllRecords<{ result: AnyRow[][] }>('s_get_exam_filters_bycode', {
    in_flag: 'univ_exam_rest_in_regexamstd',
    in_flag_type: 'INT',
    in_university_id: 0,
    in_univ_examcenter_id: 0,
    in_college_id: 0,
    in_course_id: params.courseId,
    in_course_group_id: 0,
    in_course_year_id: 0,
    in_exam_id: params.examId,
    in_academic_year_id: params.academicYearId,
    in_regulation_id: 0,
    in_subject_id: 0,
    in_sub_flag_type: '',
    in_param1: 0,
    in_param2: 0,
    in_loginuser_roleid: 0,
    in_loginuser_empid: params.employeeId || 0,
  })
  return (data?.result ?? []).flatMap((g) => g ?? [])
}

export async function getInternalMarksEntrySubjects(params: {
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
    in_flag: 'univ_exam_subject_regexamstd',
    in_flag_type: 'INT',
    in_university_id: 0,
    in_univ_examcenter_id: 0,
    in_college_id: params.collegeId,
    in_course_id: params.courseId,
    in_course_group_id: params.courseGroupId,
    in_course_year_id: params.courseYearId,
    in_exam_id: params.examId,
    in_academic_year_id: params.academicYearId,
    in_regulation_id: params.regulationId,
    in_sub_flag_type: 'ALL',
    in_subject_id: 0,
    in_param1: 0,
    in_param2: 0,
    in_loginuser_roleid: 0,
    in_loginuser_empid: params.employeeId || 0,
  })
  return (data?.result ?? []).flatMap((g) => g ?? [])
}

export async function getInternalMarksEntryStudents(params: {
  collegeId: number
  courseId: number
  examId: number
  courseGroupId: number
  courseYearId: number
  regulationId: number
  subjectId: number
  labBatchId: number
  examDate: string
}): Promise<AnyRow[]> {
  const payload = {
    in_flag: 'marks_entry',
    in_college_id: params.collegeId,
    in_course_id: params.courseId,
    in_exam_id: params.examId,
    in_course_group_id: params.courseGroupId,
    in_course_year_id: params.courseYearId,
    in_regulation_id: params.regulationId,
    in_subject_id: params.subjectId,
    in_eaxm_labbatch_id: params.labBatchId || 0,
    is_extenalperson_approve: 0,
    in_exam_date: params.examDate,
  }

  const procs = ['s_get_exam_markdetails', 's_get_exam_mark_details']
  for (const proc of procs) {
    try {
      const data = await getAllRecords<{ result: AnyRow[][] }>(proc, payload)
      const groups = data?.result ?? []
      const firstNonEmpty = groups.find((g) => Array.isArray(g) && g.length > 0) ?? []
      if (firstNonEmpty.length > 0) return firstNonEmpty
    } catch {
      // try next proc variant
    }
  }
  return []
}

/**
 * Same `marks_entry` proc as {@link getInternalMarksEntryStudents}, but returns
 * all three result sets Angular uses: students (result[0], deduped by hallticket
 * like Angular), external evaluator names (result[1]), internal evaluator names
 * (result[2]). Used to populate the printable marks sheet.
 */
export async function getMarksEntryStudentsBundle(params: {
  collegeId: number
  courseId: number
  examId: number
  courseGroupId: number
  courseYearId: number
  regulationId: number
  subjectId: number
  labBatchId: number
  examDate: string
}): Promise<{ students: AnyRow[]; externalEvaluators: AnyRow[]; internalEvaluators: AnyRow[] }> {
  const payload = {
    in_flag: 'marks_entry',
    in_college_id: params.collegeId,
    in_course_id: params.courseId,
    in_exam_id: params.examId,
    in_course_group_id: params.courseGroupId,
    in_course_year_id: params.courseYearId,
    in_regulation_id: params.regulationId,
    in_subject_id: params.subjectId,
    in_eaxm_labbatch_id: params.labBatchId || 0,
    is_extenalperson_approve: 0,
    in_exam_date: params.examDate,
  }
  const procs = ['s_get_exam_markdetails', 's_get_exam_mark_details']
  for (const proc of procs) {
    try {
      const data = await getAllRecords<{ result: AnyRow[][] }>(proc, payload)
      const groups = data?.result ?? []
      const rawStudents = Array.isArray(groups[0]) ? groups[0] : []
      if (rawStudents.length > 0) {
        // Angular dedupes students by hallticketNumber (Map keyed on it).
        const byHt = new Map<string, AnyRow>()
        for (const s of rawStudents) byHt.set(String(s.hallticketNumber ?? s.hallticket_number), s)
        return {
          students: Array.from(byHt.values()),
          externalEvaluators: Array.isArray(groups[1]) ? groups[1] : [],
          internalEvaluators: Array.isArray(groups[2]) ? groups[2] : [],
        }
      }
    } catch {
      // try next proc variant
    }
  }
  return { students: [], externalEvaluators: [], internalEvaluators: [] }
}

export async function saveInternalMarksEntry(rows: AnyRow[]): Promise<void> {
  await postDetails('examstudentinternalmarks', rows)
}

export async function getSecureMarksFilters(employeeId: number): Promise<AnyRow[]> {
  const common = {
    in_university_id: 0,
    in_univ_examcenter_id: 0,
    in_college_id: 0,
    in_course_id: 0,
    in_course_group_id: 0,
    in_course_year_id: 0,
    in_exam_id: 0,
    in_academic_year_id: 0,
    in_regulation_id: 0,
    in_subject_id: 0,
    in_sub_flag_type: '',
    in_param1: 0,
    in_param2: 'REGSUP',
    in_loginuser_roleid: 0,
    in_loginuser_empid: employeeId || 0,
  }

  const attempts: Array<{ in_flag: string; in_flag_type: string; pickFlag?: string }> = [
    { in_flag: 'univ_exam_inep_filters', in_flag_type: 'OFF_EXT_EVAL', pickFlag: 'univ_exam_inep_filters' },
    { in_flag: 'univ_exam_inep_filters', in_flag_type: 'QUESTION_SETTER', pickFlag: 'univ_exam_inep_filters' },
    { in_flag: 'univ_exam_filters', in_flag_type: 'REGSUP', pickFlag: 'univ_exam_filters' },
  ]

  for (const attempt of attempts) {
    try {
      const data = await getAllRecords<{ result: AnyRow[][] }>('s_get_exam_filters_bycode', {
        ...common,
        in_flag: attempt.in_flag,
        in_flag_type: attempt.in_flag_type,
      })
      const groups = data?.result ?? []
      const picked =
        groups.find((g) => (g?.[0]?.flag ?? '') === (attempt.pickFlag ?? '')) ??
        groups.find((g) => Array.isArray(g) && g.length > 0) ??
        []
      if (picked.length > 0) return picked
    } catch {
      // try next attempt
    }
  }

  return []
}

export async function getSecureMarksRestFilters(params: {
  courseId: number
  examId: number
  academicYearId: number
  employeeId: number
}): Promise<{ restFilters: AnyRow[]; regulations: AnyRow[] }> {
  const common = {
    in_university_id: 0,
    in_univ_examcenter_id: 0,
    in_college_id: 0,
    in_course_id: params.courseId,
    in_course_group_id: 0,
    in_course_year_id: 0,
    in_exam_id: params.examId,
    in_academic_year_id: params.academicYearId,
    in_regulation_id: 0,
    in_subject_id: 0,
    in_sub_flag_type: '',
    in_param1: 0,
    in_param2: 'REGSUP',
    in_loginuser_roleid: 0,
    in_loginuser_empid: params.employeeId || 0,
  }

  const attempts: Array<{ in_flag: string; in_flag_type: string }> = [
    { in_flag: 'univ_exam_rest_inep_uc', in_flag_type: 'OFF_EXT_EVAL' },
    { in_flag: 'univ_exam_rest_in_regexamstd', in_flag_type: 'REGSUP' },
    { in_flag: 'univ_exam_rest_in_regexamstd', in_flag_type: 'ALL' },
  ]

  for (const attempt of attempts) {
    try {
      const data = await getAllRecords<{ result: AnyRow[][] }>('s_get_exam_filters_bycode', {
        ...common,
        in_flag: attempt.in_flag,
        in_flag_type: attempt.in_flag_type,
      })
      const groups = data?.result ?? []
      const restFilters = groups.find((g) => (g?.[0]?.flag ?? '') === 'univ_exam_rest_filters') ?? []
      const regulations = groups.find((g) => (g?.[0]?.flag ?? '') === 'regulations') ?? []
      if (restFilters.length > 0 || regulations.length > 0) return { restFilters, regulations }
    } catch {
      // try next attempt
    }
  }

  return { restFilters: [], regulations: [] }
}

export async function getSecureMarksSubjects(params: {
  collegeId: number
  courseId: number
  courseGroupId: number
  courseYearId: number
  examId: number
  academicYearId: number
  regulationId: number
  employeeId: number
}): Promise<AnyRow[]> {
  const common = {
    in_university_id: 0,
    in_univ_examcenter_id: 0,
    in_college_id: params.collegeId,
    in_course_id: params.courseId,
    in_course_group_id: params.courseGroupId,
    in_course_year_id: params.courseYearId,
    in_exam_id: params.examId,
    in_academic_year_id: params.academicYearId,
    in_regulation_id: params.regulationId,
    in_sub_flag_type: 'ALL',
    in_subject_id: 0,
    in_param1: 0,
    in_param2: 0,
    in_loginuser_roleid: 0,
    in_loginuser_empid: params.employeeId || 0,
  }

  const attempts = ['REGSUP', 'ALL']
  for (const flagType of attempts) {
    try {
      const data = await getAllRecords<{ result: AnyRow[][] }>('s_get_exam_filters_bycode', {
        ...common,
        in_flag: 'univ_exam_subject_regexamstd',
        in_flag_type: flagType,
      })
      const groups = data?.result ?? []
      const picked =
        groups.find((g) => (g?.[0]?.flag ?? '') === 'univ_exam_sub_regexamstd') ??
        groups.find((g) => Array.isArray(g) && g.length > 0) ??
        []
      if (picked.length > 0) return picked
    } catch {
      // try next flag type
    }
  }
  return []
}

export async function generateMarksEntrySecretCode(userId: number): Promise<void> {
  // Angular: this.http.post(MAINAPI + 'api/generateSecretCodeForMarksEntry' + '/' + userId, ' ')
  // → POST cms/api/generateSecretCodeForMarksEntry/{userId} (NOT GET, and the
  // `api/` segment is required — without it Spring 404s).
  const res = await fetch(`/api/proxy/${EXAM_EVAL_API.GENERATE_SECRET_CODE_MARKS}/${userId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '" "',
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.message ?? `Failed to generate secret code (${res.status})`)
  }
}

export async function validateMarksEntrySecretCode(userId: number, secretCode: string): Promise<boolean> {
  // Angular getDetailsByRequestApi(validateSecretCodeForMarksEntryUrl, …) →
  // GET cms/api/validateSecretCodeForMarksEntry?userId=…&secretCode=…
  const search = new URLSearchParams({ userId: String(userId), secretCode })
  const res = await fetch(`/api/proxy/${EXAM_EVAL_API.VALIDATE_SECRET_CODE_MARKS}?${search.toString()}`)
  const body = await res.json().catch(() => null)
  return body?.data === true || body?.data === 'true'
}

export async function getExamMarksEntryFilters(employeeId: number): Promise<AnyRow[]> {
  const common = {
    in_university_id: 0,
    in_univ_examcenter_id: 0,
    in_college_id: 0,
    in_course_id: 0,
    in_course_group_id: 0,
    in_course_year_id: 0,
    in_exam_id: 0,
    in_academic_year_id: 0,
    in_regulation_id: 0,
    in_subject_id: 0,
    in_sub_flag_type: '',
    in_param1: 0,
    in_param2: 'REGSUP',
    in_loginuser_roleid: 0,
    in_loginuser_empid: employeeId || 0,
  }
  const attempts = [
    { in_flag: 'univ_exam_inep_filters', in_flag_type: 'OFF_INT_EVAL' },
    { in_flag: 'univ_exam_inep_filters', in_flag_type: 'QUESTION_SETTER' },
    { in_flag: 'univ_exam_inep_filters', in_flag_type: 'REGSUP' },
    { in_flag: 'univ_exam_filters', in_flag_type: 'OFF_INT_EVAL' },
    { in_flag: 'univ_exam_filters', in_flag_type: 'REGSUP' },
  ]
  for (const a of attempts) {
    try {
      const data = await getAllRecords<{ result: AnyRow[][] }>('s_get_exam_filters_bycode', { ...common, ...a })
      const groups = data?.result ?? []
      const picked = firstGroupByFlag(groups, ['univ_exam_inep_filters', 'univ_exam_filters'])
      if (picked.length > 0) return picked
      const fallback = firstNonEmptyGroup(groups)
      if (fallback.length > 0) return fallback
    } catch {
      // try next fallback
    }
  }
  return []
}

export async function getExamMarksEntryRestFilters(params: {
  courseId: number
  examId: number
  academicYearId: number
  employeeId: number
}): Promise<{ restFilters: AnyRow[]; regulations: AnyRow[] }> {
  const common = {
    in_university_id: 0,
    in_univ_examcenter_id: 0,
    in_college_id: 0,
    in_course_id: params.courseId,
    in_course_group_id: 0,
    in_course_year_id: 0,
    in_exam_id: params.examId,
    in_academic_year_id: params.academicYearId,
    in_regulation_id: 0,
    in_subject_id: 0,
    in_sub_flag_type: '',
    in_param1: 0,
    in_param2: 'REGSUP',
    in_loginuser_roleid: 0,
    in_loginuser_empid: params.employeeId || 0,
  }
  const attempts = [
    { in_flag: 'univ_exam_rest_inep_uc', in_flag_type: 'OFF_INT_EVAL' },
    { in_flag: 'univ_exam_rest_inep_uc', in_flag_type: 'QUESTION_SETTER' },
    { in_flag: 'univ_exam_rest_in_regexamstd', in_flag_type: 'REGSUP' },
    { in_flag: 'univ_exam_rest_in_regexamstd', in_flag_type: 'ALL' },
  ]
  for (const a of attempts) {
    try {
      const data = await getAllRecords<{ result: AnyRow[][] }>('s_get_exam_filters_bycode', { ...common, ...a })
      const groups = data?.result ?? []
      const restFilters = firstGroupByFlag(groups, ['univ_exam_rest_filters', 'univ_exam_rest_inep_uc'])
      const regulations = firstGroupByFlag(groups, ['regulations'])
      if (restFilters.length > 0 || regulations.length > 0) return { restFilters, regulations }
      const fallback = firstNonEmptyGroup(groups)
      if (fallback.length > 0) return { restFilters: fallback, regulations: [] }
    } catch {
      // try next fallback
    }
  }
  return { restFilters: [], regulations: [] }
}

export async function getExamMarksEntrySubjects(params: {
  collegeId: number
  courseId: number
  courseGroupId: number
  courseYearId: number
  examId: number
  academicYearId: number
  regulationId: number
  employeeId: number
}): Promise<AnyRow[]> {
  const common = {
    in_university_id: 0,
    in_univ_examcenter_id: 0,
    in_college_id: params.collegeId,
    in_course_id: params.courseId,
    in_course_group_id: params.courseGroupId,
    in_course_year_id: params.courseYearId,
    in_exam_id: params.examId,
    in_academic_year_id: params.academicYearId,
    in_regulation_id: params.regulationId,
    in_sub_flag_type: 'ALL',
    in_subject_id: 0,
    in_param1: 0,
    in_param2: 0,
    in_loginuser_roleid: 0,
    in_loginuser_empid: params.employeeId || 0,
  }
  const attempts = [
    { in_flag: 'univ_exam_subject_inep', in_flag_type: 'OFF_INT_EVAL' },
    { in_flag: 'univ_exam_subject_inep', in_flag_type: 'QUESTION_SETTER' },
    { in_flag: 'univ_exam_subject_regexamstd', in_flag_type: 'REGSUP' },
    { in_flag: 'univ_exam_subject_regexamstd', in_flag_type: 'ALL' },
  ]
  for (const a of attempts) {
    try {
      const data = await getAllRecords<{ result: AnyRow[][] }>('s_get_exam_filters_bycode', { ...common, ...a })
      const groups = data?.result ?? []
      const picked = firstGroupByFlag(groups, ['univ_exam_sub_inep', 'univ_exam_sub_regexamstd'])
      if (picked.length > 0) return picked
      const fallback = firstNonEmptyGroup(groups)
      if (fallback.length > 0) return fallback
    } catch {
      // try next fallback
    }
  }
  return []
}

export async function getExamTypeMarkDetails(params: {
  collegeId: number
  courseId: number
  examId: number
  courseGroupId: number
  courseYearId: number
  regulationId: number
  subjectId: number
  labBatchId: number
  examDate: string
  examTypeId: number
}): Promise<AnyRow[]> {
  const payload = {
    in_flag: 'marks_entry',
    in_college_id: params.collegeId,
    in_course_id: params.courseId,
    in_exam_id: params.examId,
    in_course_group_id: params.courseGroupId,
    in_course_year_id: params.courseYearId,
    in_regulation_id: params.regulationId,
    in_subject_id: params.subjectId,
    in_eaxm_labbatch_id: params.labBatchId || 0,
    is_extenalperson_approve: 0,
    in_exam_date: params.examDate,
    in_exam_type: params.examTypeId || 0,
  }
  const procedures = ['s_get_exam_markdetails_bytype', 's_get_exam_markdetails', 's_get_exam_mark_details']
  for (const proc of procedures) {
    try {
      const data = await getAllRecords<{ result: AnyRow[][] }>(proc, payload)
      const groups = data?.result ?? []
      const students =
        groups.find((g) => Array.isArray(g) && g.some((row) => row?.hallticketNumber || row?.studentId)) ??
        firstNonEmptyGroup(groups)
      if (students.length > 0) return students
    } catch {
      // try next procedure
    }
  }
  return []
}

export async function getInternalAttendanceRestFilters(params: {
  courseId: number
  examId: number
  academicYearId: number
  employeeId: number
}): Promise<AnyRow[]> {
  try {
    const data = await getAllRecords<{ result: AnyRow[][] }>('s_get_exam_filters_bycode', {
      in_flag: 'univ_exam_rest_in_regexamstd',
      in_flag_type: 'ALL',
      in_university_id: 0,
      in_univ_examcenter_id: 0,
      in_college_id: 0,
      in_course_id: params.courseId,
      in_course_group_id: 0,
      in_course_year_id: 0,
      in_exam_id: params.examId,
      in_academic_year_id: params.academicYearId,
      in_regulation_id: 0,
      in_subject_id: 0,
      in_sub_flag_type: '',
      in_param1: 0,
      in_param2: 0,
      in_loginuser_roleid: 0,
      in_loginuser_empid: params.employeeId || 0,
    })
    const groups = data?.result ?? []
    const flat = groups.flatMap((g) => g || [])
    if (flat.length > 0) return flat
  } catch {
    // fallback below
  }

  const bundle = await getUnivExamRestNoTtBundle(params)
  const rest = Array.isArray(bundle?.restFilters) ? bundle.restFilters : []
  const regs = Array.isArray(bundle?.regulations) ? bundle.regulations : []
  const regsTagged = regs.map((r) => ({ ...r, flag: r.flag ?? 'regulations' }))
  return [...rest, ...regsTagged]
}

export async function getInternalAttendanceSubjects(params: {
  collegeId: number
  courseId: number
  courseGroupId: number
  courseYearId: number
  examId: number
  academicYearId: number
  regulationId: number
  employeeId: number
}): Promise<AnyRow[]> {
  try {
    const data = await getAllRecords<{ result: AnyRow[][] }>('s_get_exam_filters_bycode', {
      in_flag: 'univ_exam_subject_regexamstd',
      in_flag_type: 'ALL',
      in_university_id: 0,
      in_univ_examcenter_id: 0,
      in_college_id: params.collegeId,
      in_course_id: params.courseId,
      in_course_group_id: params.courseGroupId,
      in_course_year_id: params.courseYearId,
      in_exam_id: params.examId,
      in_academic_year_id: params.academicYearId,
      in_regulation_id: params.regulationId,
      in_sub_flag_type: 'ALL',
      in_subject_id: 0,
      in_param1: 0,
      in_param2: 0,
      in_loginuser_roleid: 0,
      in_loginuser_empid: params.employeeId || 0,
    })
    const groups = data?.result ?? []
    const flat = groups.flatMap((g) => g || [])
    if (flat.length > 0) return flat
  } catch {
    // fallback below
  }

  const fromUc = await getUnivExamSubjectUc(params).catch(() => [])
  if (Array.isArray(fromUc) && fromUc.length > 0) return fromUc

  const fromInss = await getUnivExamSubjectInss({
    collegeId: params.collegeId,
    courseId: params.courseId,
    courseGroupId: params.courseGroupId,
    courseYearId: params.courseYearId,
    examId: params.examId,
    academicYearId: params.academicYearId,
    employeeId: params.employeeId,
  }).catch(() => [])
  return Array.isArray(fromInss) ? fromInss : []
}

