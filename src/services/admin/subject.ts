import { GM_CODES } from '@/config/constants/ui'
import { NEXT_API } from '@/config/constants/api'
import { ENTITIES } from '@/config/constants/entities'
import { buildQuery, domainCreate, domainList, domainUpdate } from '../crud'

type AnyRow = Record<string, any>

export async function listSubjectsByCourse(courseId: number): Promise<AnyRow[]> {
  if (!courseId) return []
  const queries = [
    buildQuery({ 'Course.courseId': courseId }, { field: 'subjectId', direction: 'DESC' }),
    buildQuery({ 'course.courseId': courseId }, { field: 'subjectId', direction: 'DESC' }),
    buildQuery({ courseId }, { field: 'subjectId', direction: 'DESC' }),
  ]
  for (const query of queries) {
    try {
      const rows = await domainList<AnyRow>(ENTITIES.SUBJECT.name, query)
      if (rows.length > 0) return rows
    } catch {
      // Try next query shape.
    }
  }
  return []
}

export async function listSubjectTypes(): Promise<AnyRow[]> {
  const queries = [
    buildQuery({ 'GeneralMaster.generalMasterCode': GM_CODES.SUBJECT_TYPE, isActive: true }),
    buildQuery({ 'generalMaster.generalMasterCode': GM_CODES.SUBJECT_TYPE, isActive: true }),
  ]
  for (const q of queries) {
    try {
      const rows = await domainList<AnyRow>(ENTITIES.GENERAL_DETAIL.name, q)
      if (rows.length > 0) return rows
    } catch {
      // fallback
    }
  }
  return []
}

export async function listSubjectCategories(): Promise<AnyRow[]> {
  const queries = [
    buildQuery({ 'GeneralMaster.generalMasterCode': GM_CODES.SUBJECT_CATEGORY, isActive: true }),
    buildQuery({ 'generalMaster.generalMasterCode': GM_CODES.SUBJECT_CATEGORY, isActive: true }),
  ]
  for (const q of queries) {
    try {
      const rows = await domainList<AnyRow>(ENTITIES.GENERAL_DETAIL.name, q)
      if (rows.length > 0) return rows
    } catch {
      // fallback
    }
  }
  return []
}

async function uploadSubjectMultipart(path: string, formData: FormData): Promise<AnyRow> {
  const res = await fetch(NEXT_API.PROXY(path), { method: 'POST', body: formData })
  const body = await res.json().catch(() => null)
  if (!res.ok || body?.success === false) throw new Error(body?.message ?? 'Subject upload failed')
  return (body?.data ?? body ?? {}) as AnyRow
}

export async function createSubjectWithOptionalFile(payload: AnyRow, file?: File | null): Promise<AnyRow> {
  if (!file) return domainCreate<AnyRow>(ENTITIES.SUBJECT.name, payload)
  const formData = new FormData()
  formData.append('data', new Blob([JSON.stringify(payload)], { type: 'application/json' }))
  formData.append('file', file, file.name)
  const paths = ['addSubjectAndUploadFile', 'addsubjectanduploadfile']
  let lastError: unknown = null
  for (const p of paths) {
    try {
      return await uploadSubjectMultipart(p, formData)
    } catch (e) {
      lastError = e
    }
  }
  throw lastError ?? new Error('Failed to create subject')
}

export async function updateSubjectWithOptionalFile(
  subjectId: number,
  payload: AnyRow,
  file?: File | null,
): Promise<AnyRow> {
  const data = { subjectId, ...payload }
  if (!file) return domainUpdate<AnyRow>(ENTITIES.SUBJECT.name, ENTITIES.SUBJECT.pk, subjectId, data)

  const formData = new FormData()
  formData.append('updatedData', new Blob([JSON.stringify(data)], { type: 'application/json' }))
  formData.append('updatedFile', file, file.name)
  const paths = ['updateSubjectAndUploadFile', 'updatesubjectanduploadfile']
  let lastError: unknown = null
  for (const p of paths) {
    try {
      return await uploadSubjectMultipart(p, formData)
    } catch (e) {
      lastError = e
    }
  }
  throw lastError ?? new Error('Failed to update subject')
}

