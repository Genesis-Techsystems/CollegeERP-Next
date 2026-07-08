import { SUBJECT_API } from '@/config/constants/api'
import { ENTITIES } from '@/config/constants/entities'
import { buildQuery, domainList, domainSoftDelete, fetchDetails, postDetails } from '../crud'

type AnyRow = Record<string, any>

export async function listActiveCourseGroupsByCourse(courseId: number): Promise<AnyRow[]> {
  if (!courseId) return []
  const queries = [
    buildQuery({ 'Course.courseId': courseId, isActive: true }),
    buildQuery({ 'course.courseId': courseId, isActive: true }),
    buildQuery({ courseId, isActive: true }),
  ]
  for (const q of queries) {
    try {
      const rows = await domainList<AnyRow>(ENTITIES.COURSE_GROUP.name, q)
      if (rows.length > 0) return rows
    } catch {
      // Try next variant
    }
  }
  return []
}

export async function listActiveRegulationsByCourse(courseId: number): Promise<AnyRow[]> {
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
      // Try next variant
    }
  }
  return []
}

export async function listActiveCourseYearsByCourse(courseId: number): Promise<AnyRow[]> {
  if (!courseId) return []
  const queries = [
    buildQuery({ 'Course.courseId': courseId, isActive: true }, { field: 'sortOrder', direction: 'ASC' }),
    buildQuery({ 'course.courseId': courseId, isActive: true }, { field: 'sortOrder', direction: 'ASC' }),
    buildQuery({ courseId, isActive: true }, { field: 'sortOrder', direction: 'ASC' }),
  ]
  for (const q of queries) {
    try {
      const rows = await domainList<AnyRow>(ENTITIES.COURSE_YEAR.name, q)
      if (rows.length > 0) return rows
    } catch {
      // Try next variant
    }
  }
  return []
}

function unwrapGroupYearSubjects(data: unknown): AnyRow[] {
  if (Array.isArray(data)) return data as AnyRow[]
  if (data && typeof data === 'object') {
    const o = data as AnyRow
    if (Array.isArray(o.resultList)) return o.resultList as AnyRow[]
    if (Array.isArray(o.content)) return o.content as AnyRow[]
    if (Array.isArray(o.data)) return o.data as AnyRow[]
  }
  return []
}

function subjectDetailPk(row: AnyRow): number {
  return (
    Number(
      row.groupyrRegDetailId ??
        row.groupYrRegDetailId ??
        row.groupyrRegulationDetailId ??
        row.pk_groupyr_reg_detail_id ??
        0,
    ) || 0
  )
}

/**
 * Collapse exact duplicate regulation-subject rows.
 * Keeps genuine L/T/P variants of the same subject code.
 */
function dedupeGroupYearSubjects(rows: AnyRow[]): AnyRow[] {
  const seenPk = new Set<number>()
  const seenContent = new Set<string>()
  const out: AnyRow[] = []

  for (const row of rows) {
    const pk = subjectDetailPk(row)
    if (pk > 0) {
      if (seenPk.has(pk)) continue
      seenPk.add(pk)
    }

    const contentKey = [
      String(row.subjectId ?? row.fk_subject_id ?? row.subjectCode ?? '').trim().toLowerCase(),
      String(row.subjectCode ?? '').trim().toLowerCase(),
      String(row.subjecttypeCode ?? row.subjectTypeCode ?? '').trim().toLowerCase(),
      String(row.lectures ?? ''),
      String(row.tutorials ?? ''),
      String(row.practicals ?? ''),
      String(row.credits ?? ''),
      String(row.internalmarks ?? row.internalMarks ?? ''),
      String(row.externalmarks ?? row.externalMarks ?? ''),
      String(row.subjectCategoryCatDetId ?? ''),
      String(row.isBridgeCourse ?? false),
    ].join('|')

    if (seenContent.has(contentKey)) continue
    seenContent.add(contentKey)
    out.push(row)
  }

  return out
}

export async function listGroupYearRegulationSubjects(
  courseGroupId: number,
  courseYearId: number,
  regulationId: number,
): Promise<AnyRow[]> {
  if (!courseGroupId || !courseYearId || !regulationId) return []

  // Angular `getSubjectsByRegulation` uses lowercase param names first.
  // Trying camelCase first can return a broader/unfiltered list (duplicates across years).
  const paramCombos: Array<Record<string, string | number>> = [
    { coursegroupId: courseGroupId, courseyearId: courseYearId, regulationId },
    { courseGroupId, courseYearId, regulationId },
    { course_group_id: courseGroupId, course_year_id: courseYearId, regulation_id: regulationId },
  ]

  for (const params of paramCombos) {
    try {
      const raw = await fetchDetails<unknown>(SUBJECT_API.GROUP_YR_REGULATION_DETAILS, params)
      const rows = unwrapGroupYearSubjects(raw)
      if (rows.length > 0) return dedupeGroupYearSubjects(rows)
    } catch {
      // Try next param names
    }
  }
  return []
}

export async function saveGroupYearRegulationSubjects(rows: AnyRow[]): Promise<void> {
  if (!Array.isArray(rows) || rows.length === 0) return
  const paths = [SUBJECT_API.GROUP_YR_REGULATION_DETAILS, 'groupYrRegulationDetails']
  let lastError: unknown = null
  for (const path of paths) {
    try {
      await postDetails(path, rows)
      return
    } catch (error) {
      lastError = error
    }
  }
  throw (lastError ?? new Error('Failed to save curriculum subjects'))
}

export async function softDeleteGroupYearRegulationDetail(groupyrRegDetailId: number): Promise<void> {
  if (!groupyrRegDetailId) return
  await domainSoftDelete(SUBJECT_API.GROUP_YR_REGULATION, 'groupyrRegDetailId', groupyrRegDetailId)
}

