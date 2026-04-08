import { getAllRecords, domainList, domainCreate, domainUpdate, buildQuery } from '@/services/crud'

type AnyRow = Record<string, any>

export async function getUnivExamFilters(empId: number): Promise<AnyRow[]> {
  const data = await getAllRecords<{ result?: AnyRow[][]; data?: { result?: AnyRow[][] } }>(
    's_get_exam_filters_bycode',
    {
      in_flag: 'univ_exam_filters',
      in_flag_type: 'ALL',
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
      in_loginuser_empid: empId,
    },
  )
  const result = (data?.result ?? data?.data?.result ?? []) as AnyRow[][]
  return Array.isArray(result) ? result.flat() : []
}

export async function getUnivExamRestNoTimetable(params: {
  courseId: number
  examId: number
  academicYearId: number
  empId: number
}): Promise<AnyRow[]> {
  const data = await getAllRecords<{ result?: AnyRow[][]; data?: { result?: AnyRow[][] } }>(
    's_get_exam_filters_bycode',
    {
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
      in_loginuser_empid: params.empId,
      in_loginuser_roleid: 0,
      in_sub_flag_type: 'ALL',
      in_param1: 0,
      in_param2: 0,
    },
  )
  const result = (data?.result ?? data?.data?.result ?? []) as AnyRow[][]
  return Array.isArray(result) ? result.flat() : []
}

export async function getLabSubjects(params: {
  collegeId: number
  courseId: number
  courseGroupId: number
  courseYearId: number
  examId: number
  academicYearId: number
  regulationId: number
  empId: number
}): Promise<AnyRow[]> {
  const data = await getAllRecords<{ result?: AnyRow[][]; data?: { result?: AnyRow[][] } }>(
    's_get_exam_filters_bycode',
    {
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
      in_loginuser_empid: params.empId,
      in_loginuser_roleid: 0,
      in_sub_flag_type: 'LAB',
      in_param1: 0,
      in_param2: 0,
    },
  )
  const result = (data?.result ?? data?.data?.result ?? []) as AnyRow[][]
  return Array.isArray(result) ? result.flat() : []
}

async function listEntity(query: string): Promise<AnyRow[]> {
  try {
    return await domainList<AnyRow>('EaxmLabBatches', query)
  } catch {
    return domainList<AnyRow>('ExamLabBatches', query)
  }
}

export async function listExamLabBatches(filters: {
  collegeId: number
  examId: number
  courseYearId: number
  courseGroupId: number
  regulationId: number
  subjectId: number
}): Promise<AnyRow[]> {
  const q = buildQuery({
    'college.collegeId': filters.collegeId,
    'examMaster.examId': filters.examId,
    'courseYear.courseYearId': filters.courseYearId,
    'courseGroup.courseGroupId': filters.courseGroupId,
    'Regulation.regulationId': filters.regulationId,
    'subject.subjectId': filters.subjectId,
  })
  return listEntity(q)
}

export async function createExamLabBatch(payload: AnyRow): Promise<AnyRow> {
  try {
    return await domainCreate<AnyRow>('EaxmLabBatches', payload)
  } catch {
    return domainCreate<AnyRow>('ExamLabBatches', payload)
  }
}

export async function updateExamLabBatch(id: number, payload: AnyRow): Promise<AnyRow> {
  try {
    return await domainUpdate<AnyRow>('EaxmLabBatches', 'eaxmLabBatchId', id, payload)
  } catch {
    return domainUpdate<AnyRow>('ExamLabBatches', 'eaxmLabBatchId', id, payload)
  }
}

