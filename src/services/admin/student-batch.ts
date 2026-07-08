import { ENTITIES } from '@/config/constants/entities'
import { GM_CODES } from '@/config/constants/ui'
import type { College } from '@/types/college'
import type { StudentBatch } from '@/types/student-batch'
import { buildQuery, domainCreate, domainList, domainUpdate } from '../crud'
import { listGeneralDetailsByMaster } from '../examination'
import { listCoursesByUniversity } from '../pre-examination'

type AnyRow = Record<string, unknown>

function n(v: unknown): number {
  const x = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(x) ? x : 0
}

function nested(row: AnyRow, key: string): AnyRow {
  const v = row[key]
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as AnyRow) : {}
}

function pickNum(row: AnyRow, keys: string[]): number {
  for (const key of keys) {
    const parts = key.split('.')
    let cur: unknown = row
    for (const p of parts) {
      if (!cur || typeof cur !== 'object') {
        cur = undefined
        break
      }
      cur = (cur as AnyRow)[p]
    }
    const parsed = n(cur)
    if (parsed > 0) return parsed
  }
  return 0
}

function pickText(row: AnyRow, keys: string[]): string {
  for (const key of keys) {
    const parts = key.split('.')
    let cur: unknown = row
    for (const p of parts) {
      if (!cur || typeof cur !== 'object') {
        cur = undefined
        break
      }
      cur = (cur as AnyRow)[p]
    }
    if (typeof cur === 'string' && cur.trim()) return cur.trim()
    if (typeof cur === 'number' && Number.isFinite(cur)) return String(cur)
  }
  return ''
}

function normalizeStudentBatch(row: StudentBatch | AnyRow): StudentBatch {
  const r = row as AnyRow
  const college = nested(r, 'college')
  const course = nested(r, 'course')
  const subjectType = nested(r, 'subjecttype') ?? nested(r, 'subjectType') ?? nested(r, 'subtype')

  const subtypeId =
    pickNum(r, [
      'subtypeId',
      'subtype',
      'subjectTypeId',
      'fk_subject_type_id',
      'subjecttype.generalDetailId',
      'subjectType.generalDetailId',
    ])
    || pickNum(subjectType, ['generalDetailId', 'subtypeId'])

  const capacityRaw = r.capacity ?? r.Capacity
  const sortRaw = r.sortOrder ?? r.orderNo ?? r.sort_order ?? r.order_no

  return {
    ...(row as StudentBatch),
    studentbatchId: pickNum(r, ['studentbatchId', 'studentBatchId', 'pk_student_batch_id']),
    collegeId:
      pickNum(r, ['collegeId', 'fk_college_id', 'College.collegeId', 'college.collegeId'])
      || pickNum(college, ['collegeId']),
    courseId:
      pickNum(r, ['courseId', 'fk_course_id', 'Course.courseId', 'course.courseId'])
      || pickNum(course, ['courseId']),
    subtypeId,
    subtype: subtypeId,
    batchName: pickText(r, ['batchName', 'batch_name', 'name']),
    capacity: capacityRaw == null || capacityRaw === '' ? null : n(capacityRaw),
    sortOrder: sortRaw == null || sortRaw === '' ? null : n(sortRaw),
    isActive: r.isActive !== false && r.is_active !== false,
    reason: pickText(r, ['reason']) || undefined,
    universityId:
      pickNum(r, ['universityId', 'fk_university_id', 'Universities.universityId'])
      || pickNum(college, ['universityId', 'fk_university_id']),
    collegeName:
      pickText(r, ['collegeName', 'college_name'])
      || pickText(college, ['collegeName', 'college_name']),
    collegeCode:
      pickText(r, ['collegeCode', 'college_code'])
      || pickText(college, ['collegeCode', 'college_code']),
    courseName:
      pickText(r, ['courseName', 'course_name'])
      || pickText(course, ['courseName', 'course_name']),
    courseCode:
      pickText(r, ['courseCode', 'course_code'])
      || pickText(course, ['courseCode', 'course_code']),
    subjecttypeName:
      pickText(r, ['subjecttypeName', 'subjectTypeName', 'subject_type_name', 'subtypeName'])
      || pickText(subjectType, [
        'generalDetailDisplayName',
        'generalDetailName',
        'displayName',
        'name',
      ]),
  }
}

/** Active colleges for page filter / modal (Angular `collegeCrudUrl` + isActive). */
export async function listActiveCollegesForStudentBatches(): Promise<College[]> {
  return domainList<College>(ENTITIES.COLLEGE.name, buildQuery({ isActive: true }))
}

/**
 * List student batches for a college — Angular
 * `listDetailsById(Studentbatch, collegeId, College.collegeId)`.
 */
export async function listStudentBatches(collegeId?: number): Promise<StudentBatch[]> {
  const where: Record<string, unknown> = {}
  if (collegeId && collegeId > 0) where['College.collegeId'] = collegeId
  const rows = await domainList<StudentBatch>(
    ENTITIES.STUDENT_BATCH.name,
    buildQuery(where, { field: 'createdDt', direction: 'DESC' }),
  )
  return rows.map(normalizeStudentBatch).filter((r) => (r.studentbatchId ?? 0) > 0)
}

/** Courses by university — Angular modal `getDetailsByUniversityIdUrl` + isActive. */
export async function listCoursesForStudentBatches(universityId: number): Promise<AnyRow[]> {
  if (!universityId) return []
  return listCoursesByUniversity(universityId)
}

/** Subject types — Angular `SUBTYPE` general details. */
export async function listSubjectTypesForStudentBatches(): Promise<AnyRow[]> {
  return listGeneralDetailsByMaster(GM_CODES.SUBJECT_TYPE) as Promise<AnyRow[]>
}

export async function createStudentBatch(
  data: Omit<StudentBatch, 'studentbatchId'>,
): Promise<StudentBatch> {
  const payload = {
    collegeId: data.collegeId,
    courseId: data.courseId,
    subtypeId: data.subtypeId,
    subtype: data.subtypeId,
    batchName: data.batchName,
    capacity: data.capacity ?? null,
    sortOrder: data.sortOrder ?? null,
    isActive: data.isActive !== false,
    reason: data.reason ?? (data.isActive === false ? '' : 'active'),
  }
  const created = await domainCreate<StudentBatch>(ENTITIES.STUDENT_BATCH.name, payload)
  return normalizeStudentBatch(created as unknown as AnyRow)
}

export async function updateStudentBatch(
  studentbatchId: number,
  data: Partial<Omit<StudentBatch, 'studentbatchId'>>,
): Promise<StudentBatch> {
  const payload = {
    studentbatchId,
    ...data,
    subtypeId: data.subtypeId,
    subtype: data.subtypeId ?? data.subtype,
  }
  const updated = await domainUpdate<StudentBatch>(
    ENTITIES.STUDENT_BATCH.name,
    ENTITIES.STUDENT_BATCH.pk,
    studentbatchId,
    payload,
  )
  return normalizeStudentBatch(updated as unknown as AnyRow)
}
