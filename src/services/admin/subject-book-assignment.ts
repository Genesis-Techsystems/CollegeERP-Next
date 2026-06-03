import { CERTIFICATE_API } from '@/config/constants/api'
import { domainCreate, domainUpdate, fetchDetails } from '@/services/crud'

type AnyRow = Record<string, any>

function normalizeRows(payload: unknown): AnyRow[] {
  if (Array.isArray(payload)) return payload as AnyRow[]
  if (!payload || typeof payload !== 'object') return []
  const obj = payload as Record<string, unknown>

  const directResultList = obj.resultList
  if (Array.isArray(directResultList)) return directResultList as AnyRow[]
  if (directResultList && typeof directResultList === 'object') {
    const nested = (directResultList as Record<string, unknown>).resultList
    if (Array.isArray(nested)) return nested as AnyRow[]
  }

  const data = obj.data
  if (Array.isArray(data)) return data as AnyRow[]
  if (data && typeof data === 'object') {
    const nestedList = (data as Record<string, unknown>).resultList
    if (Array.isArray(nestedList)) return nestedList as AnyRow[]
    const content = (data as Record<string, unknown>).content
    if (Array.isArray(content)) return content as AnyRow[]
  }

  return []
}

export async function listSubjectBookAssignments(params: {
  collegeId: number
  academicYearId: number
  groupSectionId: number
}): Promise<AnyRow[]> {
  const { collegeId, academicYearId, groupSectionId } = params
  if (!collegeId || !academicYearId || !groupSectionId) return []
  return []
}

export async function saveSubjectBookAssignment(payload: AnyRow): Promise<void> {
  const subjectBookId = Number(payload.subjectBookId ?? payload.pk_subject_book_id ?? 0)
  const regulationId = Number(payload.subjectRegulationId ?? payload.subjectregulationId ?? payload.subjectregulation?.subjectRegulationId ?? 0)
  const bookId = Number(payload.bookId ?? payload.book?.bookId ?? payload.Book?.bookId ?? 0)

  const candidateBodies: AnyRow[] = [
    {
      ...payload,
      isActive: payload.isActive ?? true,
      isTextBook: payload.isTextBook ?? false,
      isOnlineCourse: payload.isOnlineCourse ?? false,
      isReference: payload.isReference ?? false,
      Subjectregulation: regulationId ? { subjectRegulationId: regulationId } : undefined,
      Book: bookId ? { bookId } : undefined,
    },
    {
      ...payload,
      isActive: payload.isActive ?? true,
      isTextBook: payload.isTextBook ?? false,
      isOnlineCourse: payload.isOnlineCourse ?? false,
      isReference: payload.isReference ?? false,
      subjectregulation: regulationId ? { subjectRegulationId: regulationId } : undefined,
      book: bookId ? { bookId } : undefined,
    },
  ]

  let lastError: unknown = null
  for (const body of candidateBodies) {
    try {
      if (subjectBookId > 0) {
        await domainUpdate('SubjectBook', 'subjectBookId', subjectBookId, body)
      } else {
        await domainCreate('SubjectBook', body)
      }
      return
    } catch (error) {
      lastError = error
    }
  }

  throw (lastError ?? new Error('Failed to save subject book assignment'))
}

export async function listBooksForAssignment(searchText: string): Promise<AnyRow[]> {
  const text = searchText.trim()
  const paths = [
    CERTIFICATE_API.BOOK_DETAIL_SEARCH_REPORT,
    'bookdetailsearchreport',
    'bookdetails',
    'books',
  ]
  const queries: Array<Record<string, string | number>> = [
    { query: text, size: 50 },
    { searchText: text, size: 50 },
    { bookName: text, size: 50 },
    { search: text, size: 50 },
  ]

  for (const path of paths) {
    for (const query of queries) {
      try {
        const rows = await fetchDetails<AnyRow[]>(path, query)
        if (Array.isArray(rows)) return rows
      } catch {
        // next variant
      }
    }
  }

  return []
}

export async function listBooksPage50(): Promise<AnyRow[]> {
  const result = await listBooksPage(0, 50)
  return result.rows
}

export async function listBooksPage(
  page: number,
  size: number,
): Promise<{ rows: AnyRow[]; totalCount: number }> {
  const path = 'domain/list/Book'
  const params = { page, size }
  const payload = await fetchDetails<unknown>(path, params).catch(() => null)
  const rows = normalizeRows(payload)

  let totalCount = rows.length
  if (payload && typeof payload === 'object') {
    const obj = payload as Record<string, unknown>
    const direct = Number(obj.totalCount)
    const dataObj = obj.data && typeof obj.data === 'object' ? (obj.data as Record<string, unknown>) : null
    const nested = Number(dataObj?.totalCount)
    if (Number.isFinite(direct) && direct >= 0) totalCount = direct
    else if (Number.isFinite(nested) && nested >= 0) totalCount = nested
  }

  return { rows, totalCount }
}

export async function listActiveSubjectBooksByRegulation(subjectRegulationId: number): Promise<AnyRow[]> {
  if (!subjectRegulationId) return []
  const path = 'domain/list/SubjectBook'
  const params = {
    size: 99999,
    query: `Subjectregulation.subjectRegulationId==${subjectRegulationId}.and.isActive==true`,
  }
  const payload = await fetchDetails<unknown>(path, params).catch(() => null)
  return normalizeRows(payload)
}

