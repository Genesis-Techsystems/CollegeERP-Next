import { SUBJECT_API } from '@/config/constants/api'
import { ENTITIES } from '@/config/constants/entities'
import { buildQuery, domainList, fetchDetails, postDetails, putDetails } from '../crud'

type AnyRow = Record<string, any>

function unwrapDataArray(data: unknown): AnyRow[] {
  if (Array.isArray(data)) return data as AnyRow[]
  if (data && typeof data === 'object') {
    const o = data as AnyRow
    if (Array.isArray(o.resultList)) return o.resultList as AnyRow[]
    if (Array.isArray(o.content)) return o.content as AnyRow[]
  }
  return []
}

export async function listRegulationsByCourse(courseId: number): Promise<AnyRow[]> {
  if (!courseId) return []
  const queries = [
    buildQuery({ 'Course.courseId': courseId, isActive: true }, { field: 'regulationCode', direction: 'DESC' }),
    buildQuery({ 'course.courseId': courseId, isActive: true }, { field: 'regulationCode', direction: 'DESC' }),
    buildQuery({ courseId, isActive: true }, { field: 'regulationCode', direction: 'DESC' }),
  ]
  for (const q of queries) {
    try {
      const rows = await domainList<AnyRow>(ENTITIES.REGULATION.name, q)
      if (rows.length > 0) return rows
    } catch {
      // Try next.
    }
  }
  return []
}

export async function listGroupSections(
  courseYearId: number,
  academicYearId: number,
  courseGroupId: number,
): Promise<AnyRow[]> {
  if (!courseYearId || !academicYearId || !courseGroupId) return []
  const queries = [
    buildQuery({
      'CourseYear.courseYearId': courseYearId,
      'AcademicYear.academicYearId': academicYearId,
      'CourseGroup.courseGroupId': courseGroupId,
      isActive: true,
    }),
    buildQuery({ courseYearId, academicYearId, courseGroupId, isActive: true }),
  ]
  for (const q of queries) {
    try {
      const rows = await domainList<AnyRow>(ENTITIES.GROUP_SECTION.name, q)
      return rows
    } catch {
      // Try next.
    }
  }
  return []
}

export async function listSubjectRegulationsByRegulation(params: {
  collegeId: number
  academicYearId: number
  courseGroupId: number
  courseYearId: number
  regulationId: number
}): Promise<AnyRow[]> {
  const { collegeId, academicYearId, courseGroupId, courseYearId, regulationId } = params
  if (!collegeId || !academicYearId || !courseGroupId || !courseYearId || !regulationId) return []
  const variants: Array<Record<string, string | number>> = [
    { collegeId, academicYearId, courseGroupId, courseYearId, regulationId },
    { collegeId, academicYearId, coursegroupId: courseGroupId, courseyearId: courseYearId, regulationId },
    { collegeId, academicYearId, coursegroupId: courseGroupId, courseyearId: courseYearId, regulationid: regulationId },
  ]
  for (const v of variants) {
    try {
      const raw = await fetchDetails<unknown>(SUBJECT_API.SUBJECT_REGULATIONS, v)
      const rows = unwrapDataArray(raw)
      if (rows.length > 0 || Array.isArray(raw) || (raw && typeof raw === 'object' && (Array.isArray((raw as AnyRow).resultList) || Array.isArray((raw as AnyRow).content)))) {
        return rows
      }
    } catch {
      // try next
    }
  }
  return []
}

export async function listSubjectRegulationsByCourseYear(params: {
  collegeId: number
  academicYearId: number
  courseGroupId: number
  courseYearId: number
}): Promise<AnyRow[]> {
  const { collegeId, academicYearId, courseGroupId, courseYearId } = params
  if (!collegeId || !academicYearId || !courseGroupId || !courseYearId) return []
  const variants: Array<Record<string, string | number>> = [
    { collegeId, academicYearId, courseGroupId, courseYearId },
    { collegeId, academicYearId, coursegroupId: courseGroupId, courseyearId: courseYearId },
  ]
  for (const v of variants) {
    try {
      const raw = await fetchDetails<unknown>(SUBJECT_API.SUBJECT_REGULATIONS, v)
      const rows = unwrapDataArray(raw)
      if (rows.length > 0 || Array.isArray(raw) || (raw && typeof raw === 'object' && (Array.isArray((raw as AnyRow).resultList) || Array.isArray((raw as AnyRow).content)))) {
        return rows
      }
    } catch {
      // try next
    }
  }
  return []
}

export async function saveSubjectRegulations(rows: AnyRow[]): Promise<void> {
  if (!Array.isArray(rows) || rows.length === 0) return
  await postDetails(SUBJECT_API.SUBJECT_REGULATIONS, rows)
}

export async function updateSubjectRegulations(rows: AnyRow[]): Promise<void> {
  if (!Array.isArray(rows) || rows.length === 0) return
  await putDetails(SUBJECT_API.SUBJECT_REGULATIONS, rows)
}

export async function listMapRegulationSubjects(params: {
  universityId: number
  courseId: number
  courseGroupId: number
  courseYearId: number
  regulationId: number
}): Promise<AnyRow[]> {
  const { universityId, courseId, courseGroupId, courseYearId, regulationId } = params
  if (!universityId || !courseId || !courseGroupId || !courseYearId || !regulationId) return []
  const variants: Array<Record<string, string | number>> = [
    { universityId, courseId, coursegroupId: courseGroupId, courseyearId: courseYearId, regulationId },
    { universityId, courseId, courseGroupId, courseYearId, regulationId },
  ]
  for (const query of variants) {
    try {
      const rows = await fetchDetails<AnyRow[]>(SUBJECT_API.GROUP_YR_REGULATION_DETAILS, query)
      if (Array.isArray(rows)) return rows
    } catch {
      // next shape
    }
  }
  return []
}

export async function listSubjectCourseYearsBySection(params: {
  collegeId: number
  academicYearId: number
  groupSectionId: number
}): Promise<AnyRow[]> {
  const { collegeId, academicYearId, groupSectionId } = params
  if (!collegeId || !academicYearId || !groupSectionId) return []
  const paths = ['subjectcourseyears', 'subjectcourseyrs', 'subjectCourseYears']
  const queryVariants: Array<Record<string, string | number>> = [
    { collegeId, academicYearId, groupSectionId },
    { collegeId, academicYearId, groupsectionId: groupSectionId },
    { collegeId, academicYearId, group_section_id: groupSectionId },
  ]
  for (const path of paths) {
    for (const query of queryVariants) {
      try {
        const rows = await fetchDetails<AnyRow[]>(path, query)
        if (Array.isArray(rows)) return rows
      } catch {
        // next
      }
    }
  }
  return []
}

export async function listProgramOutcomeCategories(): Promise<AnyRow[]> {
  const gmCodes = [
    'PROGRAM_OUTCOME_CATEGORY',
    'PROGRAM_OUTCOMES_CATEGORY',
    'PO_CATEGORY',
    'PO_CAT',
    'PO',
  ]
  for (const code of gmCodes) {
    try {
      const rows = await domainList<AnyRow>(
        'GeneralDetail',
        buildQuery({ 'GeneralMaster.generalMasterCode': code, isActive: true }),
      )
      if (rows.length > 0) return rows
    } catch {
      // try next code variant
    }
  }
  return []
}

