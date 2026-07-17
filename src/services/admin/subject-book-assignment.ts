import { buildQuery, domainList, fetchDetails, postDetails } from '@/services/crud'

type AnyRow = Record<string, any>

function asArray(payload: unknown): AnyRow[] {
  if (Array.isArray(payload)) return payload as AnyRow[]
  if (!payload || typeof payload !== 'object') return []
  const obj = payload as Record<string, unknown>
  if (Array.isArray(obj.resultList)) return obj.resultList as AnyRow[]
  if (Array.isArray(obj.data)) return obj.data as AnyRow[]
  if (obj.data && typeof obj.data === 'object') {
    const data = obj.data as Record<string, unknown>
    if (Array.isArray(data.resultList)) return data.resultList as AnyRow[]
  }
  return []
}

/**
 * Angular assign modal: `paginatorByTwoIds('Book', page, size, 'page', 'size')`
 * → GET domain/list/Book?page=&size=
 */
export async function listBooksPage(
  page: number,
  size: number,
): Promise<{ rows: AnyRow[]; totalCount: number; page: number }> {
  try {
    const data = await fetchDetails<{
      resultList?: AnyRow[] | null
      totalCount?: number
      page?: number
    }>('domain/list/Book', { page, size })
    const rows = asArray(data)
    const totalCount = Number(data?.totalCount ?? rows.length) || 0
    const pageNum = Number(data?.page ?? page) || 0
    return { rows, totalCount, page: pageNum }
  } catch {
    return { rows: [], totalCount: 0, page }
  }
}

export async function listBooksPage50(): Promise<AnyRow[]> {
  const result = await listBooksPage(0, 50)
  return result.rows
}

/**
 * Angular: domain/list/SubjectBook?
 * query=Subjectregulation.subjectRegulationId=={id}.and.isActive==true
 */
export async function listActiveSubjectBooksByRegulation(subjectRegulationId: number): Promise<AnyRow[]> {
  if (!subjectRegulationId) return []
  const query = buildQuery({
    'Subjectregulation.subjectRegulationId': subjectRegulationId,
    isActive: true,
  })
  try {
    return await domainList<AnyRow>('SubjectBook', query)
  } catch {
    return []
  }
}

/**
 * Angular `assignBookDialog` → `crudService.add('subjectbooks', books)`.
 * Payload is the modal book rows (checked / deactivated).
 */
export async function saveSubjectBookAssignments(books: AnyRow[]): Promise<void> {
  if (!Array.isArray(books) || books.length === 0) {
    throw new Error('No Book is Checked')
  }
  await postDetails('subjectbooks', books)
}

/** @deprecated Prefer saveSubjectBookAssignments (Angular batch POST). */
export async function saveSubjectBookAssignment(payload: AnyRow): Promise<void> {
  await saveSubjectBookAssignments([payload])
}

/** Kept for barrel compatibility — main list uses listSubjectRegulationsByCourseYear. */
export async function listSubjectBookAssignments(_params: {
  collegeId: number
  academicYearId: number
  groupSectionId: number
}): Promise<AnyRow[]> {
  return []
}

export async function listBooksForAssignment(_searchText: string): Promise<AnyRow[]> {
  const { rows } = await listBooksPage(0, 50)
  return rows
}
