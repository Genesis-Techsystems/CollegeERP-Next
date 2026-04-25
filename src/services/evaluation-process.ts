import { buildQuery, domainCreate, domainList, domainUpdate, fetchDetails, getAllRecords, postDetails } from '@/services/crud'
import { EXAM_EVAL_API, NEXT_API, QUESTION_PAPER_API } from '@/config/constants/api'
import { getUnivExamFiltersByType, getUnivExamRestNoTtBundle, getUnivExamSubjectUc } from '@/services/pre-examination'
import { toDateOnlyISO } from '@/common/generic-functions'

type AnyRow = Record<string, any>

export async function getEvaluationExamFilters(employeeId: number): Promise<AnyRow[]> {
  return getUnivExamFiltersByType(employeeId, 'ALL')
}

export async function getEvaluationExamRestFilters(params: {
  courseId: number
  examId: number
  academicYearId: number
  employeeId: number
}): Promise<AnyRow[]> {
  const bundle = await getUnivExamRestNoTtBundle(params)
  return Array.isArray(bundle.restFilters) ? bundle.restFilters : []
}

export async function getEvaluationExamRestBundle(params: {
  courseId: number
  examId: number
  academicYearId: number
  employeeId: number
}): Promise<{ restFilters: AnyRow[]; regulations: AnyRow[] }> {
  const bundle = await getUnivExamRestNoTtBundle(params)
  return {
    restFilters: Array.isArray(bundle.restFilters) ? bundle.restFilters : [],
    regulations: Array.isArray(bundle.regulations) ? bundle.regulations : [],
  }
}

export async function listEvaluationSubjects(params: {
  collegeId: number
  courseId: number
  courseGroupId: number
  courseYearId: number
  examId: number
  academicYearId: number
  regulationId: number
  employeeId: number
}): Promise<AnyRow[]> {
  return getUnivExamSubjectUc(params)
}

export async function listExamQuestionPapers(filters?: {
  examId?: number
  courseYearId?: number
  courseGroupId?: number
  subjectId?: number
  subjectTypeId?: number
  examDate?: string
  isActive?: boolean
}): Promise<AnyRow[]> {
  const where: Record<string, string | number | boolean> = {}
  if (filters?.examId) where.examId = filters.examId
  if (filters?.courseYearId) where.courseYearId = filters.courseYearId
  if (filters?.courseGroupId) where.courseGroupId = filters.courseGroupId
  if (filters?.subjectId) where.subjectId = filters.subjectId
  if (filters?.subjectTypeId) where.subjectTypeId = filters.subjectTypeId
  if (filters?.examDate) where.examDate = filters.examDate
  if (filters?.isActive !== undefined) where.isActive = filters.isActive

  const queries = Object.keys(where).length > 0 ? [buildQuery(where)] : [undefined]
  const entities = ['ExamQuestionPaper', 'ExamQuestionPapers']

  for (const entity of entities) {
    for (const q of queries) {
      try {
        const rows = await domainList<AnyRow>(entity, q)
        if (Array.isArray(rows)) return rows
      } catch {
        // try next
      }
    }
  }
  return []
}

export async function createExamQuestionPaper(payload: Record<string, unknown>): Promise<AnyRow> {
  const entities = ['ExamQuestionPaper', 'ExamQuestionPapers']
  for (const entity of entities) {
    try {
      return await domainCreate<AnyRow>(entity, payload)
    } catch {
      // try next entity name
    }
  }
  throw new Error('Unable to create exam question paper.')
}

export async function getAssignQuestionPaperTemplateList(params: {
  examId: number
  courseYearId: number
  regulationId: number
  subjectId?: number
}): Promise<AnyRow[]> {
  const unpackRows = (payload: unknown): AnyRow[] => {
    if (Array.isArray(payload)) return payload as AnyRow[]
    const obj = (payload ?? {}) as Record<string, unknown>
    const result0 = (obj.result as unknown[] | undefined)?.[0]
    if (Array.isArray(result0)) return result0 as AnyRow[]
    const nestedData = (obj.data ?? {}) as Record<string, unknown>
    const nestedResult0 = (nestedData.result as unknown[] | undefined)?.[0]
    if (Array.isArray(nestedResult0)) return nestedResult0 as AnyRow[]
    return []
  }

  const payload = {
    in_exam_id: params.examId,
    in_course_year_id: params.courseYearId,
    in_regulation_id: params.regulationId,
    in_subject_id: params.subjectId ?? 0,
  }

  // Primary backend proc (confirmed): s_get_question_paper_assignments
  try {
    const primary = await getAllRecords<unknown>('s_get_question_paper_assignments', payload)
    const rows = unpackRows(primary)
    if (rows.length > 0) return rows
  } catch {
    // fall through to legacy endpoint/proc candidates
  }

  const endpointCandidates = ['getQuestionPaperAssignments', 'getQPAssignments']
  for (const endpoint of endpointCandidates) {
    try {
      const data = await fetchDetails<unknown>(endpoint, payload)
      const rows = unpackRows(data)
      if (rows.length > 0) return rows
    } catch {
      // try next candidate
    }
  }

  const procCandidates = ['s_get_examquestionpaper_details', 's_get_examevaluation_bycodes']
  for (const proc of procCandidates) {
    try {
      const data = await getAllRecords<unknown>(proc, {
        in_flag: 'getQuestionPaperAssignments',
        ...payload,
      })
      const rows = unpackRows(data)
      if (rows.length > 0) return rows
    } catch {
      // try next proc
    }
  }
  return []
}

export async function getQuestionPaperTemplateViewRows(templateId: number): Promise<AnyRow[]> {
  if (!templateId) return []
  const payload = {
    in_flag: 'list_exam_questionpaper_details',
    in_orgid: 1,
    in_fdate: '1990-01-01',
    in_tdate: '1990-01-01',
    in_exam_questionpaper_template_id: templateId,
    in_exam_questionpaper_id: 0,
    in_exam_id: 0,
    in_course_year_id: 0,
    in_subject_id: 0,
    in_evalutor_profileid: 0,
    in_exam_date: '1990-01-01',
    in_regulation_id: 0,
    in_emp_id: 0,
    in_questionpaper_id: 0,
    in_evaluator_role_id: 0,
    in_exam_evaluationassignment_id: 0,
  }
  const data = await getAllRecords<{ result?: AnyRow[][] }>('s_get_examquestionpaper_details', payload).catch(() => ({ result: [] }))
  return Array.isArray(data?.result?.[0]) ? data.result?.[0] ?? [] : []
}

export async function listQuestionPaperTemplates(): Promise<AnyRow[]> {
  const entities = [
    EXAM_EVAL_API.QP_TEMPLATE,
    'ExamQuestionpaperTemplate',
    'ExamQuestionPaperTemplate',
    'ExamQpTemplate',
  ].filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
  const queries = ['order(examQuestionPaperTemplateId=ASC)', buildQuery({ isActive: true })]
  for (const entity of entities) {
    for (const query of queries) {
      try {
        const rows = await domainList<AnyRow>(entity, query)
        if (Array.isArray(rows) && rows.length > 0) return rows
      } catch {
        // try next entity/query
      }
    }
  }
  return []
}

export async function createQuestionPaperTemplateAssignment(payload: {
  examMasterId: number
  regulationId: number
  subjectId: number
  examQuestionpaperTemplateId: number
  courseYearId: number
  isActive: boolean
}): Promise<AnyRow> {
  return domainCreate<AnyRow>(QUESTION_PAPER_API.QP_TEMP_ASSIGN, payload)
}

export async function updateQuestionPaperTemplateAssignment(
  assignmentId: number,
  payload: {
    examQptempAssignId: number
    examMasterId: number
    regulationId: number
    subjectId: number
    examQuestionpaperTemplateId: number
    courseYearId: number
    isActive: boolean
  },
): Promise<AnyRow> {
  return domainUpdate<AnyRow>(QUESTION_PAPER_API.QP_TEMP_ASSIGN, 'examQptempAssignId', assignmentId, payload)
}

export async function getEvaluationApprovalsFilters(employeeId: number): Promise<AnyRow[]> {
  const data = await getAllRecords<{ result: AnyRow[][] }>('s_get_exam_filters_bycode', {
    in_flag: 'filter_univexam_evaluator_moderator',
    in_orgid: 0,
    in_fdate: '1990-01-01',
    in_tdate: '1990-01-01',
    in_evalutor_profileid: 0,
    in_exam_date: '1990-01-01',
    in_emp_id: 0,
    in_questionpaper_id: 0,
    in_evaluator_role_id: 0,
    in_academic_year: '',
    in_exam_short_name: '',
    in_affiliatedto_catdet_id: 0,
    in_exam_id: 0,
    in_course_year_id: 0,
    in_subject_id: 0,
    in_regulation_id: 0,
    in_course_id: 0,
    in_academic_year_id: 0,
    in_loginuser_empid: employeeId || 0,
  })
  const groups = data?.result ?? []
  return (groups[0] ?? []).filter(Boolean)
}

export async function listEvaluationApprovals(params: {
  employeeId: number
  courseId?: number
  examId?: number
  evaluatorProfileId?: number
  academicYearId?: number
  courseYearId?: number
  subjectId?: number
  regulationId?: number
}): Promise<AnyRow[]> {
  const data = await getAllRecords<{ result: AnyRow[][] }>('s_get_exam_filters_bycode', {
    in_flag: 'list_evaluationApprovalstudent_list',
    in_orgid: 0,
    in_fdate: '1990-01-01',
    in_tdate: '1990-01-01',
    in_evalutor_profileid: params.evaluatorProfileId ?? 0,
    in_exam_date: '1990-01-01',
    in_emp_id: 0,
    in_questionpaper_id: 0,
    in_evaluator_role_id: 0,
    in_academic_year: '',
    in_exam_short_name: '',
    in_affiliatedto_catdet_id: 0,
    in_exam_id: params.examId ?? 0,
    in_course_year_id: params.courseYearId ?? 0,
    in_subject_id: params.subjectId ?? 0,
    in_regulation_id: params.regulationId ?? 0,
    in_course_id: params.courseId ?? 0,
    in_academic_year_id: params.academicYearId ?? 0,
    in_loginuser_empid: params.employeeId || 0,
  })
  const groups = data?.result ?? []
  return (groups[0] ?? []).filter(Boolean)
}

export async function approveEvaluationAssignments(payload: Record<string, unknown>[]): Promise<AnyRow> {
  return postDetails<AnyRow>(EXAM_EVAL_API.UPDATE_EVAL_ASSIGNMENT_STATUS, payload)
}

export async function getFinalizeQuestionPaperFilters(employeeId: number): Promise<AnyRow[]> {
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
  return groups.find((g) => (g?.[0]?.flag ?? '') === 'univ_exam_filters') ?? []
}

export async function getFinalizeRegulations(params: {
  courseId: number
  employeeId: number
}): Promise<AnyRow[]> {
  const data = await getAllRecords<{ result: AnyRow[][] }>('s_get_exam_filters_bycode', {
    in_flag: 'univ_exam_rest_regulations',
    in_flag_type: 'ALL',
    in_university_id: 0,
    in_college_id: 0,
    in_course_id: params.courseId,
    in_course_group_id: 0,
    in_course_year_id: 0,
    in_exam_id: 0,
    in_academic_year_id: 0,
    in_regulation_id: 0,
    in_subject_id: 0,
    in_loginuser_empid: params.employeeId || 0,
    in_loginuser_roleid: 0,
    in_sub_flag_type: 'NoLAB',
    in_param1: 0,
    in_param2: 0,
  })
  const groups = data?.result ?? []
  return groups.find((g) => (g?.[0]?.flag ?? '') === 'regulations') ?? []
}

export async function getFinalizeSubjectUc(params: {
  courseId: number
  examId: number
  academicYearId: number
  regulationId: number
  employeeId: number
}): Promise<AnyRow[]> {
  return getUnivExamSubjectUc({
    collegeId: 0,
    courseId: params.courseId,
    courseGroupId: 0,
    courseYearId: 0,
    examId: params.examId,
    academicYearId: params.academicYearId,
    regulationId: params.regulationId,
    employeeId: params.employeeId,
  })
}

export async function listFinalizableQuestionPapers(params: {
  employeeId: number
  examId: number
  courseId?: number
  academicYearId?: number
  courseYearId?: number
  subjectId?: number
  regulationId?: number
}): Promise<AnyRow[]> {
  const data = await getAllRecords<{ result: AnyRow[][] }>('s_get_examevaluation_bycodes', {
    in_flag: 'list_questionpaper_list',
    in_orgid: 0,
    in_fdate: '1990-01-01',
    in_tdate: '1990-01-01',
    in_evalutor_profileid: 0,
    in_exam_date: '1990-01-01',
    in_emp_id: 0,
    in_questionpaper_id: 0,
    in_evaluator_role_id: 0,
    in_academic_year: '',
    in_exam_short_name: '',
    in_affiliatedto_catdet_id: 0,
    in_exam_id: params.examId,
    in_course_year_id: params.courseYearId ?? 0,
    in_subject_id: params.subjectId ?? 0,
    in_regulation_id: params.regulationId ?? 0,
    in_course_id: params.courseId ?? 0,
    in_academic_year_id: params.academicYearId ?? 0,
    in_loginuser_empid: params.employeeId || 0,
  })
  const groups = data?.result ?? []
  return (groups[0] ?? []).filter(Boolean)
}

export async function finalizeOneQuestionPaper(params: {
  questionPaperId: number
  approvedByEmpId: number
  statusCatDetId?: number
}): Promise<AnyRow> {
  const payload = {
    questionPaperStatusCatDetId: params.statusCatDetId ?? 623,
    approvedByEmpId: params.approvedByEmpId || 0,
    approvedDate: toDateOnlyISO(new Date()),
    isActive: true,
  }
  const entities = ['ExamQuestionPaper', 'ExamQuestionPapers']
  const pks = ['questionPaperId', 'examQuestionPaperId', 'pk_exam_questionpaper_id']
  for (const entity of entities) {
    for (const pk of pks) {
      try {
        return await domainUpdate<AnyRow>(entity, pk, params.questionPaperId, payload)
      } catch {
        // try next variant
      }
    }
  }
  throw new Error('Unable to finalize question paper.')
}

export async function listViewFinalQuestionPapers(params: {
  employeeId: number
  courseId?: number
  examId?: number
  academicYearId?: number
}): Promise<AnyRow[]> {
  const rows = await listFinalizableQuestionPapers({
    employeeId: params.employeeId,
    examId: params.examId ?? 0,
    courseId: params.courseId ?? 0,
    academicYearId: params.academicYearId ?? 0,
    courseYearId: undefined,
    subjectId: undefined,
    regulationId: undefined,
  })
  return rows.filter((r) => String(r?.question_status ?? r?.questionPaperStatus ?? '').toLowerCase() === 'approved')
}

export async function publishQuestionPaperColleges(payload: Record<string, unknown>[]): Promise<AnyRow> {
  return postDetails<AnyRow>(EXAM_EVAL_API.ADD_QP_COLLEGES_LIST, payload)
}

export async function getQuestionPaperPublishDetails(questionPaperId: number): Promise<{
  publishedList: AnyRow[]
  roles: AnyRow[]
  employees: AnyRow[]
}> {
  const data = await getAllRecords<{ result: AnyRow[][] }>('s_get_examquestionpaper_details', {
    in_flag: 'list_questionpaper_publish',
    in_orgid: 0,
    in_fdate: '1990-01-01',
    in_tdate: '1990-01-01',
    in_exam_questionpaper_template_id: 1,
    in_exam_questionpaper_id: 0,
    in_exam_id: 0,
    in_course_year_id: 0,
    in_subject_id: 0,
    in_evalutor_profileid: 0,
    in_exam_date: '1990-01-01',
    in_regulation_id: 0,
    in_emp_id: 0,
    in_questionpaper_id: questionPaperId,
    in_evaluator_role_id: 0,
    in_exam_evaluationassignment_id: 0,
  })
  const groups = data?.result ?? []
  return {
    publishedList: groups[0] ?? [],
    roles: groups[1] ?? [],
    employees: groups[2] ?? [],
  }
}

function pickNumSafe(row: AnyRow | null | undefined, keys: string[]): number {
  if (!row) return 0
  for (const k of keys) {
    const n = Number(row[k])
    if (n > 0) return n
  }
  return 0
}

export async function listPublishedExamQuestionPapers(params: {
  employeeId: number
  examId: number
  orgId?: number
}): Promise<AnyRow[]> {
  const data = await getAllRecords<{ result: AnyRow[][] }>('s_get_examquestionpaper_details', {
    in_flag: 'list_questionpaper_incharge',
    in_orgid: params.orgId ?? 0,
    in_fdate: '1990-01-01',
    in_tdate: '1990-01-01',
    in_exam_questionpaper_template_id: 1,
    in_exam_questionpaper_id: 0,
    in_exam_id: params.examId,
    in_course_year_id: 0,
    in_subject_id: 0,
    in_evalutor_profileid: 0,
    in_exam_date: '1990-01-01',
    in_regulation_id: 0,
    in_emp_id: params.employeeId || 0,
    in_questionpaper_id: 0,
    in_evaluator_role_id: 0,
    in_exam_evaluationassignment_id: 0,
  })
  const groups = data?.result ?? []
  return (groups[0] ?? []).filter(Boolean)
}

export async function generateSecretCodeForPublishedQp(payload: {
  examQuestionPaperCollegeId: number
  empId: number
  examName: string
  subjectName: string
  subjectCode: string
  examDate: string
}): Promise<AnyRow> {
  return postDetails<AnyRow>(EXAM_EVAL_API.GENERATE_SECRET_CODE, payload)
}

export async function validateSecretCodeForPublishedQp(params: {
  code: string
  examQuestionPaperCollegeId: number
  empId: number
}): Promise<any> {
  return fetchDetails<any>(EXAM_EVAL_API.VALIDATE_SECRET_CODE, params)
}

export async function getEvaluationModerationFilters(employeeId: number): Promise<AnyRow[]> {
  const data = await getAllRecords<{ result: AnyRow[][] }>('s_get_exam_filters_bycode', {
    in_flag: 'univ_exam_filters',
    in_flag_type: 'REGSUP',
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
    in_param2: 0,
    in_loginuser_roleid: 0,
    in_loginuser_empid: employeeId || 0,
  })
  const groups = data?.result ?? []
  return groups.find((g) => (g?.[0]?.flag ?? '') === 'univ_exam_filters') ?? []
}

export async function getEvaluationModerationRest(params: {
  employeeId: number
  courseId: number
  academicYearId: number
  examId: number
}): Promise<AnyRow[]> {
  const data = await getAllRecords<{ result: AnyRow[][] }>('s_get_exam_filters_bycode', {
    in_flag: 'univ_exam_rest_in_regexamstd',
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
    in_subject_id: 0,
    in_sub_flag_type: '',
    in_param1: 0,
    in_param2: 0,
    in_loginuser_roleid: 0,
    in_loginuser_empid: params.employeeId || 0,
  })
  const groups = data?.result ?? []
  return groups.find((g) => (g?.[0]?.flag ?? '') === 'univ_exam_rest_filters') ?? []
}

export async function getEvaluationModerationSubjects(params: {
  employeeId: number
  courseId: number
  academicYearId: number
  examId: number
  courseYearId: number
  regulationId: number
}): Promise<AnyRow[]> {
  const data = await getAllRecords<{ result: AnyRow[][] }>('s_get_exam_filters_bycode', {
    in_flag: 'univ_exam_subject_regexamstd',
    in_flag_type: 'REGSUP',
    in_university_id: 0,
    in_univ_examcenter_id: 0,
    in_college_id: 0,
    in_course_id: params.courseId,
    in_course_group_id: 0,
    in_course_year_id: params.courseYearId,
    in_exam_id: params.examId,
    in_academic_year_id: params.academicYearId,
    in_regulation_id: params.regulationId,
    in_sub_flag_type: 'NoLAB',
    in_subject_id: 0,
    in_param1: 0,
    in_param2: 0,
    in_loginuser_roleid: 0,
    in_loginuser_empid: params.employeeId || 0,
  })
  const groups = data?.result ?? []
  return groups.find((g) => (g?.[0]?.flag ?? '') === 'univ_exam_sub_regexamstd') ?? []
}

export async function listEvaluationModerationData(params: {
  employeeId: number
  courseId: number
  academicYearId: number
  examId: number
  courseYearId: number
  subjectId: number
  regulationId: number
}): Promise<{ evaluators: AnyRow[]; totals: AnyRow[]; omrRows: AnyRow[]; students: AnyRow[] }> {
  const common = {
    in_orgid: 1,
    in_fdate: '1990-01-01',
    in_tdate: '1990-01-01',
    in_evalutor_profileid: 0,
    in_exam_date: '1990-01-01',
    in_emp_id: 0,
    in_questionpaper_id: 0,
    in_academic_year: '',
    in_exam_short_name: '',
    in_affiliatedto_catdet_id: 0,
    in_exam_id: params.examId,
    in_course_year_id: params.courseYearId,
    in_subject_id: params.subjectId,
    in_regulation_id: params.regulationId,
    in_course_id: params.courseId,
    in_academic_year_id: params.academicYearId,
    in_loginuser_empid: params.employeeId || 0,
  }
  const toResultGroups = async (
    flag: 'list_evaluatorassignment_list' | 'list_evaluationstudent_list',
    evaluatorRoleId: number,
  ): Promise<AnyRow[][]> => {
    try {
      const data = await getAllRecords<{ result: AnyRow[][] }>('s_get_examevaluation_bycodes', {
        in_flag: flag,
        ...common,
        in_evaluator_role_id: evaluatorRoleId,
      })
      return data?.result ?? []
    } catch (error: any) {
      // "No Records(s) found." is a valid empty-state for this flow.
      const msg = String(error?.message ?? '')
      if (msg.toLowerCase().includes('no records')) return []
      throw error
    }
  }

  const evaluatorGroups = await toResultGroups('list_evaluatorassignment_list', 64)
  const studentGroups = await toResultGroups('list_evaluationstudent_list', 0)
  return {
    evaluators: evaluatorGroups[0] ?? [],
    totals: studentGroups[1] ?? [],
    omrRows: evaluatorGroups[2] ?? [],
    students: studentGroups[0] ?? [],
  }
}

export async function assignModerationEvaluation(params: {
  profileId: number
  examId: number
  subjectId: number
  courseYearId: number
  omrSerialNos: string
}): Promise<AnyRow> {
  return getAllRecords<AnyRow>('s_get_examevaluation_bycodes', {
    in_flag: 'AssignModerationEvaluation',
    in_profileids: params.profileId,
    in_exam_evaluationassignment_ids: '',
    in_omr_serial_nos: params.omrSerialNos,
    in_timetable_det_ids: '',
    in_exam_id: params.examId,
    in_subject_id: params.subjectId,
    in_course_year_id: params.courseYearId,
  })
}

export async function getChiefEvaluationFilters(employeeId: number): Promise<AnyRow[]> {
  const data = await getAllRecords<{ result: AnyRow[][] }>('s_get_exam_filters_bycode', {
    in_flag: 'univ_exam_inep_filters',
    in_flag_type: 'CHIEF_EVAL',
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
    in_param2: 'REGSUP',
  }).catch(() => ({ result: [] }))
  const groups = data?.result ?? []
  return groups.find((g) => (g?.[0]?.flag ?? '') === 'univ_exam_inep_filters') ?? []
}

export async function getChiefEvaluationSubjectFilters(params: {
  courseId: number
  examId: number
  academicYearId: number
  employeeId: number
}): Promise<AnyRow[]> {
  const data = await getAllRecords<{ result: AnyRow[][] }>('s_get_exam_filters_bycode', {
    in_flag: 'univ_exam_subject_inep',
    in_flag_type: 'CHIEF_EVAL',
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
    in_sub_flag_type: 'NoLAB',
    in_param1: 0,
    in_param2: 0,
  }).catch(() => ({ result: [] }))
  const groups = data?.result ?? []
  return groups.find((g) => (g?.[0]?.flag ?? '') === 'univ_exam_sub_inep') ?? []
}

export async function listChiefEvaluationRows(params: {
  employeeId: number
  organizationId: number
  examId: number
  courseId: number
  academicYearId: number
  courseYearId: number
  regulationId: number
  subjectId: number
}): Promise<AnyRow[]> {
  const data = await getAllRecords<{ result: AnyRow[][] }>('s_get_examevaluation_bycodes', {
    in_flag: 'list_evaluationApprovalstudent_list',
    in_orgid: params.organizationId || 1,
    in_fdate: '1990-01-01',
    in_tdate: '1990-01-01',
    in_evalutor_profileid: 0,
    in_exam_date: '1990-01-01',
    in_emp_id: 0,
    in_questionpaper_id: 0,
    in_evaluator_role_id: 0,
    in_academic_year: '',
    in_exam_short_name: '',
    in_affiliatedto_catdet_id: 0,
    in_exam_id: params.examId,
    in_course_year_id: params.courseYearId,
    in_subject_id: params.subjectId,
    in_regulation_id: params.regulationId,
    in_course_id: params.courseId,
    in_academic_year_id: params.academicYearId,
    in_loginuser_empid: params.employeeId || 0,
  }).catch(() => ({ result: [] }))
  return (data?.result?.[0] ?? []).filter(Boolean)
}

export async function getChiefEvaluatorDetails(params: {
  employeeId: number
  organizationId: number
  examId: number
  courseId: number
  academicYearId: number
  courseYearId: number
  regulationId: number
  subjectId: number
}): Promise<AnyRow[]> {
  const data = await getAllRecords<{ result: AnyRow[][] }>('s_get_examevaluation_bycodes', {
    in_flag: 'chief_evaluator_details',
    in_orgid: params.organizationId || 1,
    in_fdate: '1990-01-01',
    in_tdate: '1990-01-01',
    in_evalutor_profileid: 0,
    in_exam_date: '1990-01-01',
    in_emp_id: 0,
    in_questionpaper_id: 0,
    in_evaluator_role_id: 0,
    in_academic_year: '',
    in_exam_short_name: '',
    in_affiliatedto_catdet_id: 0,
    in_exam_id: params.examId,
    in_course_year_id: params.courseYearId,
    in_subject_id: params.subjectId,
    in_regulation_id: params.regulationId,
    in_course_id: params.courseId,
    in_academic_year_id: params.academicYearId,
    in_loginuser_empid: params.employeeId || 0,
  }).catch(() => ({ result: [] }))
  return (data?.result?.[0] ?? []).filter(Boolean)
}

export async function assignChiefEvaluation(params: {
  evaluatorProfileId: number
  evaluatorProfileDetId: number
  examEvaluationAssignmentId: number
  omrSerialNo: string
}): Promise<AnyRow> {
  const payload = {
    in_flag: 'chief_eval_assignment',
    in_evaluator_profile_id: params.evaluatorProfileId,
    in_evaluator_profiledet_id: params.evaluatorProfileDetId,
    in_exam_evaluationassignment_id: params.examEvaluationAssignmentId,
    in_omr_serial_no: params.omrSerialNo,
  }
  const procs = ['s_pop_exam_chief_eval_assignment', 's_pop_exam_chiefeval_assign']
  let lastError: unknown = null
  for (const proc of procs) {
    try {
      return await getAllRecords<AnyRow>(proc, payload)
    } catch (error) {
      lastError = error
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Failed to assign chief evaluation.')
}

export async function getAssignSubjectsEvaluatorRoles(): Promise<AnyRow[]> {
  const params = {
    in_viewname: 'v_get_exam_eval_roles',
    in_select: '',
    in_whereclause: '',
  }
  const procs = ['s_get_viewdetails_bycode', 's_get_view_details_bycode', 's_get_viewdetails']
  for (const proc of procs) {
    try {
      const data = await getAllRecords<{ result: AnyRow[][] }>(proc, params)
      const groups = data?.result ?? []
      const rows = (groups[0] ?? []).filter(Boolean)
      if (rows.length > 0) return rows
    } catch {
      // try next proc variant
    }
  }
  return [
    { pk_role_id: 64, role_name: 'Evaluator' },
    { pk_role_id: 96, role_name: 'Moderator' },
    { pk_role_id: 97, role_name: 'Chief Evaluator' },
  ]
}

export async function getAssignSubjectsEvaluatorRegulationSubjects(params: {
  courseId: number
  examId: number
  academicYearId: number
  employeeId: number
}): Promise<AnyRow[]> {
  const data = await getAllRecords<{ result: AnyRow[][] }>('s_get_univ_exam_details', {
    in_flag: 'clg_exam_subject_filters',
    in_flag_type: '',
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
  return groups.flatMap((g) => g ?? []).filter(Boolean)
}

/** Initial cascade rows — Angular `univ_exam_filters` / REGSUP (assign-evaluator-subjectroles). */
export async function getEvaluatorSubjectRolesExamFilters(employeeId: number): Promise<AnyRow[]> {
  const data = await getAllRecords<{ result: AnyRow[][] }>('s_get_exam_filters_bycode', {
    in_flag: 'univ_exam_filters',
    in_flag_type: 'REGSUP',
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
    in_loginuser_empid: employeeId || 0,
    in_loginuser_roleid: 0,
    in_sub_flag_type: 'ALL',
    in_param1: 0,
    in_param2: 0,
  })
  const groups = data?.result ?? []
  return groups.find((g) => (g?.[0]?.flag ?? '') === 'univ_exam_filters') ?? []
}

/** Subjects after regulation — `univ_exam_subject_regexamstd` (matches Angular subject-roles). */
export async function getEvaluatorSubjectRolesSubjects(params: {
  courseId: number
  examId: number
  academicYearId: number
  regulationId: number
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
    in_regulation_id: params.regulationId,
    in_sub_flag_type: 'ALL',
    in_subject_id: 0,
    in_param1: 0,
    in_param2: 0,
    in_loginuser_roleid: 0,
    in_loginuser_empid: params.employeeId || 0,
  })
  const groups = data?.result ?? []
  return groups.find((g) => (g?.[0]?.flag ?? '') === 'univ_exam_sub_regexamstd') ?? []
}

/** Child rows for an evaluator profile (domain list; entity name may vary by backend). */
export async function listExamEvaluatorProfileDetails(profileId: number): Promise<AnyRow[]> {
  const q = buildQuery({ examEvaluatorProfileId: profileId })
  const entities = ['ExamEvaluatorProfileDetails', 'ExamEvaluatorProfileDetail']
  for (const entity of entities) {
    try {
      const rows = await domainList<AnyRow>(entity, q)
      if (Array.isArray(rows) && rows.length) return rows
    } catch {
      // try next entity name
    }
  }
  return []
}

export async function saveAssignSubjectsEvaluator(payload: Record<string, unknown>[]): Promise<void> {
  const res = await fetch(NEXT_API.PROXY(EXAM_EVAL_API.UPDATE_EVALUATOR_PROFILES), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const body = await res.json().catch(() => null)
  if (!res.ok || body?.success === false) {
    throw new Error(body?.message ?? 'Failed to save assign subjects evaluator details.')
  }
}

export async function getExamEvaluationSettingsFilters(employeeId: number): Promise<AnyRow[]> {
  return getFinalizeQuestionPaperFilters(employeeId)
}

export async function listExamEvaluationSettings(examId: number): Promise<AnyRow[]> {
  return domainList<AnyRow>(
    EXAM_EVAL_API.EVALUATION_SETTINGS,
    buildQuery({ 'ExamMaster.examId': examId, isActive: true }),
  )
}

export async function createExamEvaluationSetting(payload: Record<string, unknown>): Promise<AnyRow> {
  return domainCreate<AnyRow>(EXAM_EVAL_API.EVALUATION_SETTINGS, payload)
}

export async function updateExamEvaluationSetting(
  evaluationSettingId: number,
  payload: Record<string, unknown>,
): Promise<AnyRow> {
  return domainUpdate<AnyRow>(
    EXAM_EVAL_API.EVALUATION_SETTINGS,
    'evaluationSettingId',
    evaluationSettingId,
    payload,
  )
}

export async function listEvaluatorProfiles(): Promise<AnyRow[]> {
  return domainList<AnyRow>(EXAM_EVAL_API.EVALUATOR_PROFILES)
}

export async function createEvaluatorProfile(payload: Record<string, unknown>): Promise<AnyRow> {
  return postDetails<AnyRow>(EXAM_EVAL_API.ADD_EVALUATOR_PROFILES, payload)
}

export async function updateEvaluatorProfile(payload: Record<string, unknown>): Promise<void> {
  const res = await fetch(NEXT_API.PROXY(EXAM_EVAL_API.UPDATE_EVALUATOR_PROFILES), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const body = await res.json().catch(() => null)
  if (!res.ok || body?.success === false) {
    throw new Error(body?.message ?? 'Failed to update evaluator profile.')
  }
}

export async function sendEvaluatorCredentials(payload: Record<string, unknown> | Record<string, unknown>[]): Promise<AnyRow> {
  return postDetails<AnyRow>(EXAM_EVAL_API.SEND_EVALUATOR_CREDENTIALS, payload)
}

/** Active courses — Angular preferences modal `listDetailsByIdsWithSort` on Course. */
export async function listActiveCourses(): Promise<AnyRow[]> {
  return domainList<AnyRow>('Course', buildQuery({ isActive: true }))
}

/** Subjects for a course — Angular `listDetailsByTwoIds` Subject × course. */
export async function listSubjectsByCourseForPreferences(courseId: number): Promise<AnyRow[]> {
  return domainList<AnyRow>('Subject', buildQuery({ 'Course.courseId': courseId, isActive: true }))
}

/** Saved preferences for an evaluator profile. */
export async function listExamEvaluatorPreferences(profileId: number): Promise<AnyRow[]> {
  const queries = [
    buildQuery({ 'ExamEvaluatorProfiles.examEvaluatorProfileId': profileId, isActive: true }),
    buildQuery({ examEvaluatorProfileId: profileId, isActive: true }),
  ]
  const entities = ['ExamEvaluatorPreferences', 'ExamEvaluatorPreference']
  for (const entity of entities) {
    for (const q of queries) {
      try {
        const rows = await domainList<AnyRow>(entity, q)
        if (Array.isArray(rows) && rows.length) return rows
      } catch {
        // try next
      }
    }
  }
  return []
}

/**
 * Bulk replace/update preferences — Angular `updateMasterDetails(updateexamevaluatorereferencesUrl, details)`.
 * Spring path is often `updateexamevaluatorereferences` (typo in legacy name); not `updateExamEvaluatorReferences`.
 */
export async function updateExamEvaluatorPreferences(payload: AnyRow[]): Promise<void> {
  const paths = [
    EXAM_EVAL_API.UPDATE_EVALUATOR_PREFERENCES,
    'updateexamevaluatorreferences',
    'updateExamEvaluatorReferences',
    'updateExamEvaluatorPreferences',
  ]
  const methods: ('POST' | 'PUT')[] = ['POST', 'PUT']

  let lastMessage = 'Failed to save evaluator preferences.'
  for (const path of paths) {
    for (const method of methods) {
      const res = await fetch(NEXT_API.PROXY(path), {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const body = (await res.json().catch(() => null)) as { success?: boolean; message?: string } | null
      if (res.ok && body?.success !== false) {
        return
      }
      if (body?.message) lastMessage = body.message
      if (res.status !== 404) {
        throw new Error(body?.message ?? `Save failed (${res.status})`)
      }
    }
  }
  throw new Error(lastMessage)
}

