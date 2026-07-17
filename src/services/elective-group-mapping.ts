/**
 * Elective Group Mapping — Angular `ElectiveGroupMappingComponent` + add dialog.
 *
 * Ports:
 *   - elective subjects   → CrudService.getElectiveSubjects1('subjectregulations', ...)
 *   - staff (employees)   → CrudService.listBySevenIds('staffcourseyrsubjects', ...)
 *   - sections            → CrudService.listBySevenIds('staffSections', ...)
 *   - create mapping      → CrudService.add('electivegroupyrmapping', rows)
 *   - view / delete list  → CrudService.listByTwoIds('electivegroupyrmapping', isActive, code)
 *   - delete mapping      → domain soft-delete ElectiveGroupyrMapping (Angular deleteItem)
 */

import { domainSoftDelete, fetchDetails, postDetails } from '@/services/crud'

type AnyRow = Record<string, any>

/**
 * Elective subjects for the chosen course-group/year.
 * Angular: getElectiveSubjects1('subjectregulations', collegeId, academicYearId, courseGroupId, courseYearId, 'ELECTIVE')
 * GET subjectregulations?collegeId=&academicYearId=&coursegroupId=&courseyearId=&subjectTypeCode=ELECTIVE
 */
export async function listElectiveSubjectsForGroup(params: {
  collegeId: number
  academicYearId: number
  courseGroupId: number
  courseYearId: number
}): Promise<AnyRow[]> {
  const { collegeId, academicYearId, courseGroupId, courseYearId } = params
  if (!collegeId || !academicYearId || !courseGroupId || !courseYearId) return []

  const rows = await fetchDetails<AnyRow[]>('subjectregulations', {
    collegeId,
    academicYearId,
    coursegroupId: courseGroupId,
    courseyearId: courseYearId,
    subjectTypeCode: 'ELECTIVE',
  }).catch(() => [])

  return Array.isArray(rows) ? rows : []
}

/**
 * Staff (employees) mapped to the chosen elective subject.
 * Angular: listBySevenIds('staffcourseyrsubjects', collegeId, academicYearId, subjectId, subjectTypeId,
 *          courseGroupId, courseYearId, 'true', 'collegeId','academicYearId','subjectId','subjectTypeId',
 *          'courseGroupId','courseYearId','isActive')
 * GET staffcourseyrsubjects?collegeId=&academicYearId=&subjectId=&subjectTypeId=&courseGroupId=&courseYearId=&isActive=true
 */
export async function listElectiveGroupStaff(params: {
  collegeId: number
  academicYearId: number
  subjectId: number
  subjectTypeId: number | string
  courseGroupId: number
  courseYearId: number
}): Promise<AnyRow[]> {
  const { collegeId, academicYearId, subjectId, subjectTypeId, courseGroupId, courseYearId } = params
  if (!collegeId || !academicYearId || !subjectId || !courseGroupId || !courseYearId) return []

  const rows = await fetchDetails<AnyRow[]>('staffcourseyrsubjects', {
    collegeId,
    academicYearId,
    subjectId,
    subjectTypeId: subjectTypeId ?? '',
    courseGroupId,
    courseYearId,
    isActive: 'true',
  }).catch(() => [])

  return Array.isArray(rows) ? rows : []
}

/**
 * Sections available for the chosen subject + staff.
 * Angular: listBySevenIds('staffSections', collegeId, academicYearId, subjectId, empId, 'true',
 *          courseYearId, courseGroupId, 'collegeId','academicYearId','subjectId','employeeId','status',
 *          'courseYearId','courseGroupId')
 * GET staffSections?collegeId=&academicYearId=&subjectId=&employeeId=&status=true&courseYearId=&courseGroupId=
 */
export async function listElectiveGroupSections(params: {
  collegeId: number
  academicYearId: number
  subjectId: number
  employeeId: number
  courseYearId: number
  courseGroupId: number
}): Promise<AnyRow[]> {
  const { collegeId, academicYearId, subjectId, employeeId, courseYearId, courseGroupId } = params
  if (!collegeId || !academicYearId || !subjectId || !employeeId || !courseYearId || !courseGroupId) return []

  const rows = await fetchDetails<AnyRow[]>('staffSections', {
    collegeId,
    academicYearId,
    subjectId,
    employeeId,
    status: 'true',
    courseYearId,
    courseGroupId,
  }).catch(() => [])

  return Array.isArray(rows) ? rows : []
}

/**
 * Create elective group mapping(s).
 * Angular parent: postMapping(details) → crudService.add('electivegroupyrmapping', details)
 * POST electivegroupyrmapping  (body = array of per-section mapping rows)
 */
export async function createElectiveGroupMapping(rows: AnyRow[]): Promise<unknown> {
  return postDetails<unknown>('electivegroupyrmapping', rows)
}

/**
 * Mappings for one elective group code (view dialog + delete guard).
 * Angular: listByTwoIds('electivegroupyrmapping', 'true', electiveGroupCode, 'isActive', 'electiveGroupCode')
 * GET electivegroupyrmapping?isActive=true&electiveGroupCode={code}
 */
export async function listElectiveGroupMappingsByCode(electiveGroupCode: string): Promise<AnyRow[]> {
  const code = String(electiveGroupCode ?? '').trim()
  if (!code) return []

  const data = await fetchDetails<AnyRow[] | AnyRow>('electivegroupyrmapping', {
    isActive: 'true',
    electiveGroupCode: code,
  }).catch(() => [])

  if (Array.isArray(data)) return data
  if (data && typeof data === 'object') return [data as AnyRow]
  return []
}

/**
 * Soft-delete one ElectiveGroupyrMapping row.
 * Angular: deleteItem('ElectiveGroupyrMapping', electiveGroupyrMappingId, 'electiveGroupyrMappingId')
 */
export async function deleteElectiveGroupMapping(electiveGroupyrMappingId: number): Promise<void> {
  const id = Number(electiveGroupyrMappingId) || 0
  if (!id) return
  await domainSoftDelete('ElectiveGroupyrMapping', 'electiveGroupyrMappingId', id)
}
