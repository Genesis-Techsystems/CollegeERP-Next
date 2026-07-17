import { SUBJECT_API } from '@/config/constants/api'
import { buildQuery } from '@/services/query'
import {
  domainCreate,
  domainList,
  domainUpdate,
  fetchDetails,
  getAllRecords,
  postDetails,
  putDetails,
} from '@/services/crud'
import { listSubjectRegulationsByRegulation } from './semester-subject-allocation'

type AnyRow = Record<string, any>

const n = (v: unknown) => Number(v) || 0

/** Spring sometimes returns the list as `data` or nested `resultList` / `content`. */
function unwrapGroupYearListPayload(data: unknown): AnyRow[] {
  if (Array.isArray(data)) return data as AnyRow[]
  if (data && typeof data === 'object') {
    const o = data as AnyRow
    if (Array.isArray(o.resultList)) return o.resultList as AnyRow[]
    if (Array.isArray(o.content)) return o.content as AnyRow[]
  }
  return []
}

/**
 * Angular assign-subject-unit `getfilterDetails`:
 * `s_get_collegewisedetails_bycode` with `in_flag: univ_curr_filters`
 * (includes `fk_regulation_id` / `regulation_code` on cascade rows).
 */
export async function getUnivCurrFilters(
  organizationId: number,
  employeeId: number,
): Promise<{ filtersData: AnyRow[] }> {
  const data = await getAllRecords<{ result?: AnyRow[][] }>('s_get_collegewisedetails_bycode', {
    in_flag: 'univ_curr_filters',
    in_org_id: organizationId || 0,
    in_college_id: 0,
    in_course_id: 0,
    in_course_group_id: 0,
    in_course_year_id: 0,
    in_group_section_id: 0,
    in_academic_year_id: 0,
    in_dept_id: 0,
    in_isadmin: 0,
    in_loginuser_empid: employeeId || 0,
    in_loginuser_roleid: 0,
    in_subject: '',
    in_employee: '',
    in_gm_codes: '',
  }).catch(() => ({ result: [] as AnyRow[][] }))

  const groups = Array.isArray(data?.result) ? data.result : []
  let filtersData: AnyRow[] = []
  for (const arr of groups) {
    if (Array.isArray(arr) && arr.length > 0 && arr[0]?.flag === 'univ_curr_filters') {
      filtersData = arr
      break
    }
  }
  if (filtersData.length === 0) {
    const first = groups.find((g) => Array.isArray(g) && g.length > 0)
    if (first) filtersData = first
  }
  return { filtersData }
}

export async function listSubjectUnitTopics(params: {
  collegeId: number
  academicYearId: number
  groupSectionId: number
}): Promise<AnyRow[]> {
  const { collegeId, academicYearId, groupSectionId } = params
  if (!collegeId || !academicYearId || !groupSectionId) return []

  try {
    const rows = await fetchDetails<AnyRow[]>('subjectunittopics', {
      collegeId,
      academicYearId,
      groupSectionId,
    })
    return Array.isArray(rows) ? rows : []
  } catch {
    return []
  }
}

export async function saveSubjectUnitTopic(payload: AnyRow): Promise<void> {
  const paths = [
    SUBJECT_API.UPLOAD_SUBJECT_UNIT,
    'subjectunit',
    'subjectunittopics',
  ]
  let lastError: unknown = null
  for (const path of paths) {
    try {
      await postDetails(path, payload)
      return
    } catch (error) {
      lastError = error
    }
  }
  throw (lastError ?? new Error('Failed to save subject unit topics'))
}

function subjectUnitPk(row: AnyRow): number {
  return Number(
    row.subjectUnitId
    ?? row.subjectunitId
    ?? row.pk_subject_unit_id
    ?? row.pkSubjectUnitId
    ?? 0,
  ) || 0
}

export type ListSubjectUnitsParams = {
  courseYearId?: number
  regulationId?: number
  subjectId?: number
}

function buildSubjectUnitCyRegSubjectQuery(
  courseYearId: number,
  regulationId: number,
  subjectId: number,
): string {
  return buildQuery(
    {
      'CourseYear.courseYearId': courseYearId,
      'Regulation.regulationId': regulationId,
      'Subject.subjectId': subjectId,
      isActive: true,
    },
    { field: 'sortOrder', direction: 'ASC' },
  )
}

/**
 * Angular `listDetailsByFourIds(SubjectUnit, courseYearId, regulationId, subjectId, true,
 * CourseYear.courseYearId, Regulation.regulationId, Subject.subjectId, isActive)`.
 */
export async function listSubjectUnits(params: ListSubjectUnitsParams): Promise<AnyRow[]> {
  const courseYearId = n(params.courseYearId)
  const regulationId = n(params.regulationId)
  const subjectId = n(params.subjectId)
  if (!courseYearId || !regulationId || !subjectId) return []

  const query = buildSubjectUnitCyRegSubjectQuery(courseYearId, regulationId, subjectId)
  try {
    const rows = await domainList<AnyRow>('SubjectUnit', query)
    return sortSubjectUnits(rows)
  } catch {
    try {
      return sortSubjectUnits(await domainList<AnyRow>('Subjectunit', query))
    } catch {
      return []
    }
  }
}

function sortSubjectUnits(rows: AnyRow[]): AnyRow[] {
  return [...rows].sort((a, b) => {
    const ao = a.sortOrder
    const bo = b.sortOrder
    if (ao == null && bo == null) return 0
    if (ao == null) return 1
    if (bo == null) return -1
    return Number(ao) - Number(bo)
  })
}

/**
 * Angular `addSubjectUnits` → `crudService.add('subjectunits', units)`.
 */
export async function saveSubjectUnitsBatch(units: AnyRow[]): Promise<void> {
  if (!Array.isArray(units) || units.length === 0) {
    throw new Error('No subject units to save')
  }
  await postDetails(SUBJECT_API.SUBJECT_UNITS, units)
}

/**
 * Angular lesson planning → `crudService.update('updateSubjectUnitTopic', payload)`.
 */
export async function updateSubjectUnitTopics(
  rows: Array<{ subjectUnitTopicId: number; fromPeriod: number; toPeriod: number }>,
): Promise<void> {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error('No session numbers entered.')
  }
  await putDetails(SUBJECT_API.UPDATE_SUBJECT_UNIT_TOPIC, rows)
}

export async function listSubjectUnitsBySubjectRegulation(_subjectRegulationId: number): Promise<AnyRow[]> {
  return []
}

function finalizeSavedUnitRow(
  subjectRegulationId: number,
  core: AnyRow,
  intendedPk: number,
  serverRow: AnyRow | null,
): AnyRow {
  const fromServer = serverRow && typeof serverRow === 'object' ? serverRow : {}
  const pk = subjectUnitPk(fromServer) || (intendedPk > 0 ? intendedPk : 0)
  const tempId = pk > 0 ? pk : -Math.abs(Date.now())
  return {
    ...fromServer,
    ...core,
    subjectRegulationId,
    subjectUnitId: pk > 0 ? pk : tempId,
    subjectunitId: pk > 0 ? pk : tempId,
  }
}

export async function saveSubjectUnit(payload: AnyRow): Promise<AnyRow> {
  const subjectRegulationId = Number(
    payload.subjectRegulationId
    ?? payload.subjectregulation?.subjectRegulationId
    ?? payload.Subjectregulation?.subjectRegulationId
    ?? 0,
  ) || 0
  const subjectUnitId = subjectUnitPk(payload)

  const core = {
    unitCode: String(payload.unitCode ?? '').trim(),
    unitName: String(payload.unitName ?? '').trim(),
    description: String(payload.description ?? '').trim(),
    sortOrder: Number(payload.sortOrder) || 0,
    isActive: payload.isActive !== false,
  }

  const bodies: AnyRow[] = [
    {
      ...core,
      Subjectregulation: subjectRegulationId ? { subjectRegulationId } : undefined,
    },
    {
      ...core,
      subjectregulation: subjectRegulationId ? { subjectRegulationId } : undefined,
    },
  ]

  const entities: Array<{ name: string; pk: string }> = [
    { name: 'SubjectUnit', pk: 'subjectUnitId' },
    { name: 'Subjectunit', pk: 'subjectunitId' },
    { name: 'SubjectUnit', pk: 'subjectunitId' },
    { name: 'Subjectunit', pk: 'subjectUnitId' },
  ]

  for (const { name, pk } of entities) {
    for (const body of bodies) {
      try {
        if (subjectUnitId > 0) {
          const updated = await domainUpdate<AnyRow>(name, pk, subjectUnitId, body)
          return finalizeSavedUnitRow(subjectRegulationId, core, subjectUnitId, updated ?? null)
        } else {
          const created = await domainCreate<AnyRow>(name, body)
          const newPk = subjectUnitPk(created ?? {})
          return finalizeSavedUnitRow(subjectRegulationId, core, newPk, created ?? null)
        }
      } catch {
        // try next
      }
    }
  }

  await saveSubjectUnitTopic({
    ...payload,
    ...core,
    subjectRegulationId,
    subjectUnitId: subjectUnitId || undefined,
  })
  return finalizeSavedUnitRow(subjectRegulationId, core, subjectUnitId, payload)
}

/**
 * Angular `getSubjectsByRegulation`:
 * GET groupyrregulationdetails?coursegroupId=&courseyearId=&regulationId=
 */
export async function listGroupYearRegulationDetails(params: {
  coursegroupId: number
  courseyearId: number
  regulationId: number
}): Promise<AnyRow[]> {
  const { coursegroupId, courseyearId, regulationId } = params
  if (!coursegroupId || !courseyearId || !regulationId) return []

  try {
    const raw = await fetchDetails<unknown>(SUBJECT_API.GROUP_YR_REGULATION_DETAILS, {
      coursegroupId,
      courseyearId,
      regulationId,
    })
    return unwrapGroupYearListPayload(raw)
  } catch {
    return []
  }
}

export async function findSubjectRegulationIdBySubjectAndRegulation(
  subjectId: number,
  regulationId: number,
): Promise<number> {
  if (!subjectId || !regulationId) return 0
  const entities = ['Subjectregulation', 'SubjectRegulation']
  const queries = [
    buildQuery({ subjectId, regulationId, isActive: true }),
    buildQuery({ subjectId, regulationId }),
    buildQuery({ 'Subject.subjectId': subjectId, 'Regulation.regulationId': regulationId, isActive: true }),
    buildQuery({ 'subject.subjectId': subjectId, 'regulation.regulationId': regulationId, isActive: true }),
  ]
  for (const entity of entities) {
    for (const q of queries) {
      try {
        const rows = await domainList<AnyRow>(entity, q)
        const first = rows[0]
        const id = n(
          first?.subjectRegulationId
          ?? first?.subjectregulationId
          ?? first?.pk_subject_regulation_id
          ?? first?.pkSubjectRegulationId,
        )
        if (id) return id
      } catch {
        // next
      }
    }
  }
  return 0
}

export interface EnrichGroupYearRegulationRowsParams {
  regulationId: number
  collegeId: number
  academicYearId: number
  courseGroupId: number
  courseYearId: number
}

function subjectIdFromSubjectRegulationApiRow(sr: AnyRow): number {
  return n(
    sr.subjectId
    ?? sr.fk_subject_id
    ?? sr.pk_subject_id
    ?? sr.subject?.subjectId
    ?? sr.Subject?.subjectId,
  )
}

function subjectRegulationIdFromSubjectRegulationApiRow(sr: AnyRow): number {
  return n(
    sr.subjectRegulationId
    ?? sr.subjectregulationId
    ?? sr.pk_subject_regulation_id
    ?? sr.pkSubjectRegulationId
    ?? sr.subjectRegulation?.subjectRegulationId
    ?? sr.subjectregulation?.subjectRegulationId,
  )
}

export async function enrichGroupYearRegulationRows(
  rows: AnyRow[],
  params: EnrichGroupYearRegulationRowsParams,
): Promise<AnyRow[]> {
  const { regulationId, collegeId, academicYearId, courseGroupId, courseYearId } = params
  if (!regulationId || !Array.isArray(rows) || rows.length === 0) return rows

  const bySubjectId = new Map<number, number>()
  if (collegeId && academicYearId && courseGroupId && courseYearId) {
    const regulationIndex = await listSubjectRegulationsByRegulation({
      collegeId,
      academicYearId,
      courseGroupId,
      courseYearId,
      regulationId,
    }).catch(() => [])
    for (const sr of regulationIndex) {
      const merged = {
        ...sr,
        ...(sr.subject && typeof sr.subject === 'object' ? sr.subject : {}),
        ...(sr.Subject && typeof sr.Subject === 'object' ? sr.Subject : {}),
      }
      const subId = subjectIdFromSubjectRegulationApiRow(merged)
      const regId = subjectRegulationIdFromSubjectRegulationApiRow(merged)
      if (subId && regId) bySubjectId.set(subId, regId)
    }
  }

  const out = rows.map((r) => ({ ...r }))
  const domainCache = new Map<number, number>()
  for (const row of out) {
    const existing = n(
      row.subjectRegulationId
      ?? row.subjectregulationId
      ?? row.subjectRegulation?.subjectRegulationId
      ?? row.subjectregulation?.subjectRegulationId,
    )
    if (existing) {
      row.subjectRegulationId = existing
      continue
    }
    const subjectId = n(
      row.subjectId
      ?? row.fk_subject_id
      ?? row.pk_subject_id
      ?? row.Subject?.subjectId
      ?? row.subject?.subjectId,
    )
    if (!subjectId) continue

    let resolved = bySubjectId.get(subjectId) ?? 0
    if (!resolved) {
      let cached = domainCache.get(subjectId)
      if (cached === undefined) {
        // eslint-disable-next-line no-await-in-loop
        cached = await findSubjectRegulationIdBySubjectAndRegulation(subjectId, regulationId) || 0
        domainCache.set(subjectId, cached)
      }
      resolved = cached
    }
    if (resolved) row.subjectRegulationId = resolved
  }
  return out
}

export async function resolveSubjectRegulationForAssignUnits(params: {
  subjectRegulationId?: number
  subjectId?: number
  regulationId?: number
  collegeId?: number
  academicYearId?: number
  courseGroupId?: number
  courseYearId?: number
}): Promise<number> {
  const direct = n(params.subjectRegulationId)
  if (direct) return direct
  const subjectId = n(params.subjectId)
  const regulationId = n(params.regulationId)
  if (!subjectId || !regulationId) return 0

  const collegeId = n(params.collegeId)
  const academicYearId = n(params.academicYearId)
  const courseGroupId = n(params.courseGroupId)
  const courseYearId = n(params.courseYearId)

  if (collegeId && academicYearId && courseGroupId && courseYearId) {
    const regulationIndex = await listSubjectRegulationsByRegulation({
      collegeId,
      academicYearId,
      courseGroupId,
      courseYearId,
      regulationId,
    }).catch(() => [])
    for (const sr of regulationIndex) {
      const merged = {
        ...sr,
        ...(sr.subject && typeof sr.subject === 'object' ? sr.subject : {}),
        ...(sr.Subject && typeof sr.Subject === 'object' ? sr.Subject : {}),
      }
      if (subjectIdFromSubjectRegulationApiRow(merged) === subjectId) {
        const id = subjectRegulationIdFromSubjectRegulationApiRow(merged)
        if (id) return id
      }
    }
  }
  return findSubjectRegulationIdBySubjectAndRegulation(subjectId, regulationId)
}
