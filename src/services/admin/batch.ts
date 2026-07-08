import { ENTITIES } from '@/config/constants/entities'
import type { Batch } from '@/types/batch'
import type { College } from '@/types/college'
import { buildAngularBatchCreatePayload, buildAngularBatchUpdatePayload } from './academic-master-payload'
import { buildQuery, domainCreate, domainList, domainUpdate } from '../crud'

function n(v: unknown): number {
  const x = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(x) ? x : 0
}

function nested(row: Record<string, unknown>, key: string): Record<string, unknown> {
  const v = row[key]
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
}

function pickNum(row: Record<string, unknown>, keys: string[]): number {
  for (const key of keys) {
    const parts = key.split('.')
    let cur: unknown = row
    for (const p of parts) {
      if (!cur || typeof cur !== 'object') {
        cur = undefined
        break
      }
      cur = (cur as Record<string, unknown>)[p]
    }
    const parsed = n(cur)
    if (parsed > 0) return parsed
  }
  return 0
}

function pickText(row: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const parts = key.split('.')
    let cur: unknown = row
    for (const p of parts) {
      if (!cur || typeof cur !== 'object') {
        cur = undefined
        break
      }
      cur = (cur as Record<string, unknown>)[p]
    }
    if (typeof cur === 'string' && cur.trim()) return cur.trim()
    if (typeof cur === 'number' && Number.isFinite(cur)) return String(cur)
  }
  return ''
}

function normalizeBatch(row: Batch | Record<string, unknown>): Batch {
  const r = row as Record<string, unknown>
  const college = { ...nested(r, 'college'), ...nested(r, 'College') }
  const course = { ...nested(r, 'course'), ...nested(r, 'Course') }
  const regulation = { ...nested(r, 'regulation'), ...nested(r, 'Regulation') }

  const fromDate = pickText(r, ['fromDate', 'from_date', 'batchFrom', 'batch_from', 'fromDt', 'from_dt'])
  const toDate = pickText(r, ['toDate', 'to_date', 'batchTo', 'batch_to', 'toDt', 'to_dt'])

  return {
    ...(row as Batch),
    batchId: pickNum(r, ['batchId', 'fk_batch_id', 'batch_id', 'id']),
    collegeId:
      pickNum(r, [
        'collegeId', 'fk_college_id', 'college_id',
        'college.collegeId', 'College.collegeId',
        'course.collegeId', 'Course.collegeId',
        'course.college.collegeId', 'Course.College.collegeId',
      ])
      || pickNum(college, ['collegeId', 'fk_college_id', 'college_id'])
      || pickNum(course, ['collegeId', 'fk_college_id', 'college_id']),
    courseId:
      pickNum(r, ['courseId', 'fk_course_id', 'course_id', 'course.courseId', 'Course.courseId'])
      || pickNum(course, ['courseId', 'fk_course_id', 'course_id']),
    regulationId:
      pickNum(r, ['regulationId', 'fk_regulation_id', 'regulation_id', 'regulation.regulationId', 'Regulation.regulationId'])
      || pickNum(regulation, ['regulationId', 'fk_regulation_id', 'regulation_id']),
    courseCode: pickText(r, ['courseCode', 'course_code']) || pickText(course, ['courseCode', 'course_code']),
    courseName: pickText(r, ['courseName', 'course_name']) || pickText(course, ['courseName', 'course_name']),
    regulationName:
      pickText(r, ['regulationName', 'regulation_name'])
      || pickText(regulation, ['regulationName', 'regulation_name']),
    regulationCode:
      pickText(r, ['regulationCode', 'regulation_code'])
      || pickText(regulation, ['regulationCode', 'regulation_code']),
    fromDate,
    toDate,
    batchFrom: fromDate,
    batchTo: toDate,
    batchCode: String(
      pickText(r, ['batchCode', 'batch_code', 'code', 'batchCd', 'batch_cd'])
      || (row as Batch).batchCode
      || '',
    ),
    batchName: String(pickText(r, ['batchName', 'batch_name', 'name']) || (row as Batch).batchName || ''),
    isActive: Boolean((row as Batch).isActive ?? r.is_active ?? r.isActive ?? true),
    reason: (row as Batch).reason ?? (r.reason as string | undefined),
    collegeCode:
      pickText(r, ['collegeCode', 'college_code'])
      || pickText(college, ['collegeCode', 'college_code', 'collegeName', 'college_name'])
      || undefined,
  }
}

export async function listBatchesAdmin(): Promise<Batch[]> {
  const rows = await domainList<Batch>(
    ENTITIES.BATCH.name,
    buildQuery({}, { field: 'createdDt', direction: 'DESC' }),
  )
  return rows.map(normalizeBatch).filter((r) => r.batchId > 0)
}

/** Load a single batch for edit hydration (list payloads often omit college/batchCode). */
export async function getBatchById(batchId: number): Promise<Batch | null> {
  if (!batchId) return null
  const queries = [
    buildQuery({ [ENTITIES.BATCH.pk]: batchId }),
    buildQuery({ batchId }),
    buildQuery({ fk_batch_id: batchId }),
  ]
  for (const query of queries) {
    try {
      const rows = await domainList<Batch>(ENTITIES.BATCH.name, query)
      const match = rows.map(normalizeBatch).find((r) => r.batchId === batchId)
      if (match) return match
    } catch {
      // try next query shape
    }
  }
  return null
}

export async function listActiveCollegesForBatches(): Promise<College[]> {
  return domainList<College>(ENTITIES.COLLEGE.name, buildQuery({ isActive: true }))
}

export async function createBatch(data: Omit<Batch, 'batchId'>): Promise<Batch> {
  const collegeId = Number((data as Record<string, unknown>).collegeId ?? 0)
  const angular = buildAngularBatchCreatePayload(data as unknown as Record<string, unknown>)
  const payloads: Array<Record<string, unknown>> = [
    { ...angular },
    { ...angular, fk_college_id: collegeId },
    { ...angular, 'College.collegeId': collegeId },
    { ...angular, college: { collegeId } },
  ]
  for (const payload of payloads) {
    try {
      const created = await domainCreate<Batch>(ENTITIES.BATCH.name, payload)
      return normalizeBatch(created as unknown as Record<string, unknown>)
    } catch {
      // Try next payload shape for backend compatibility.
    }
  }
  const created = await domainCreate<Batch>(ENTITIES.BATCH.name, data)
  return normalizeBatch(created as unknown as Record<string, unknown>)
}

export async function updateBatch(
  batchId: number,
  data: Partial<Omit<Batch, 'batchId'>>,
  existing?: Batch,
): Promise<Batch> {
  const payload = buildAngularBatchUpdatePayload(batchId, data as Record<string, unknown>, existing)
  return domainUpdate<Batch>(ENTITIES.BATCH.name, ENTITIES.BATCH.pk, batchId, payload)
}
