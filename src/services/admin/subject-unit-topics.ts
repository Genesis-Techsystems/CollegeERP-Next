import { SUBJECT_API } from '@/config/constants/api'
import { buildQuery } from '@/services/query'
import { domainCreate, domainList, domainUpdate, fetchDetails, postDetails } from '@/services/crud'
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

function isListPayload(data: unknown): boolean {
  if (Array.isArray(data)) return true
  if (data && typeof data === 'object') {
    const o = data as AnyRow
    if (Array.isArray(o.resultList)) return true
    if (Array.isArray(o.content)) return true
  }
  return false
}

export async function listSubjectUnitTopics(params: {
  collegeId: number
  academicYearId: number
  groupSectionId: number
}): Promise<AnyRow[]> {
  const { collegeId, academicYearId, groupSectionId } = params
  if (!collegeId || !academicYearId || !groupSectionId) return []

  const paths = ['subjectunittopics', 'subjectunitdetails', 'subjectunit']
  const queries: Array<Record<string, string | number>> = [
    { collegeId, academicYearId, groupSectionId },
    { college_id: collegeId, academic_year_id: academicYearId, group_section_id: groupSectionId },
  ]

  for (const path of paths) {
    for (const query of queries) {
      try {
        const rows = await fetchDetails<AnyRow[]>(path, query)
        if (Array.isArray(rows)) return rows
      } catch {
        // try next path/query
      }
    }
  }
  return []
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
  /** Angular/CMS-only: compound filter on SubjectUnit — no Subjectregulation/subjectunit GET probes */
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
 * Matches CMS: `/domain/list/SubjectUnit?query=CourseYear...and.Regulation...and.Subject...and.isActive==true.order(sortOrder=ASC)`
 * At most two HTTP calls (`SubjectUnit` then legacy-cased entity name).
 */
export async function listSubjectUnits(params: ListSubjectUnitsParams): Promise<AnyRow[]> {
  const courseYearId = n(params.courseYearId)
  const regulationId = n(params.regulationId)
  const subjectId = n(params.subjectId)
  if (!courseYearId || !regulationId || !subjectId) return []

  const query = buildSubjectUnitCyRegSubjectQuery(courseYearId, regulationId, subjectId)
  try {
    return await domainList<AnyRow>('SubjectUnit', query)
  } catch {
    try {
      return await domainList<AnyRow>('Subjectunit', query)
    } catch {
      return []
    }
  }
}

/** Unused: listing no longer filters by regulation id alone (avoid extra domain/GET spam). */
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

/**
 * Create or update a subject unit via domain API, with Angular-style POST fallback.
 * Returns a row shape suitable for the grid (IDs from server when present).
 */
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

export async function listGroupYearRegulationDetails(params: {
  coursegroupId: number
  courseyearId: number
  regulationId: number
}): Promise<AnyRow[]> {
  const { coursegroupId, courseyearId, regulationId } = params
  if (!coursegroupId || !courseyearId || !regulationId) return []

  const paths = [
    SUBJECT_API.GROUP_YR_REGULATION_DETAILS,
    'groupyrregulationdetails',
    'groupYrRegulationDetails',
  ]
  const queries: Array<Record<string, string | number>> = [
    { coursegroupId, courseyearId, regulationId },
    { courseGroupId: coursegroupId, courseYearId: courseyearId, regulationId },
    { course_group_id: coursegroupId, course_year_id: courseyearId, regulation_id: regulationId },
    { courseGroupId: coursegroupId, courseYearId: courseyearId, regulationid: regulationId },
  ]

  for (const path of paths) {
    for (const query of queries) {
      try {
        const raw = await fetchDetails<unknown>(path, query)
        if (isListPayload(raw)) return unwrapGroupYearListPayload(raw)
      } catch {
        // try next variant
      }
    }
  }

  return []
}

/**
 * Angular "Assign Units" needs `subjectRegulationId`. The group-year-regulation DTO often only
 * carries `subjectId` + regulation context — match the university curriculum screen (`subjecttypeCode`).
 */
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

/**
 * Fill `subjectRegulationId` for Assign Units links.
 * Prefer GET `subjectregulations` (same as semester allocation) — it returns ids per subject for the college/AY/group/year/regulation.
 * Fallback: domain list `Subjectregulation` by subject + regulation.
 */
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

/** Resolve `subjectRegulationId` for Add Subject Units when the URL only has subject + filter context. */
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

