import {
  buildQuery,
  domainList,
  domainListPaginated,
  fetchDetailsEnvelope,
  postDetails,
} from "@/services/crud";

type AnyRow = Record<string, any>;

function asArray(payload: unknown): AnyRow[] {
  if (Array.isArray(payload)) return payload as AnyRow[];
  if (!payload || typeof payload !== "object") return [];
  const obj = payload as Record<string, unknown>;
  if (Array.isArray(obj.resultList)) return obj.resultList as AnyRow[];
  if (Array.isArray(obj.data)) return obj.data as AnyRow[];
  if (obj.data && typeof obj.data === "object") {
    const data = obj.data as Record<string, unknown>;
    if (Array.isArray(data.resultList)) return data.resultList as AnyRow[];
  }
  return [];
}

/**
 * Angular assign modal:
 * `paginatorByTwoIds('Book', page, size, 'page', 'size')`
 * → GET domain/list/Book?page=&size=
 *
 * Fallback matches `listAllMasterDetailsWithPageNation('Book', page, size, …)`
 * → GET Book?page=&size=
 */
export async function listBooksPage(
  page: number,
  size: number,
): Promise<{ rows: AnyRow[]; totalCount: number; page: number }> {
  // Prefer Angular paginatorByTwoIds path; use envelope so empty/success:false still surfaces a network call.
  const domainEnv = await fetchDetailsEnvelope<{
    resultList?: AnyRow[] | null;
    totalCount?: number;
    page?: number;
  }>("domain/list/Book", { page, size }).catch(() => null);

  if (domainEnv?.success) {
    const data = domainEnv.data;
    const rows = asArray(data ?? domainEnv);
    const totalCount =
      Number(
        (data && typeof data === "object" ? data.totalCount : undefined) ??
          rows.length,
      ) || 0;
    const pageNum =
      Number(
        (data && typeof data === "object" ? data.page : undefined) ?? page,
      ) || 0;
    if (rows.length > 0 || totalCount > 0) {
      return { rows, totalCount, page: pageNum };
    }
  }

  // Fallback: non-domain Book?page=&size=
  const bookEnv = await fetchDetailsEnvelope<{
    resultList?: AnyRow[] | null;
    totalCount?: number;
    page?: number;
  }>("Book", { page, size }).catch(() => null);

  if (bookEnv?.success) {
    const data = bookEnv.data;
    const rows = asArray(data ?? bookEnv);
    const totalCount =
      Number(
        (data && typeof data === "object" ? data.totalCount : undefined) ??
          (bookEnv as { totalCount?: number }).totalCount ??
          rows.length,
      ) || 0;
    const pageNum =
      Number(
        (data && typeof data === "object" ? data.page : undefined) ??
          (bookEnv as { page?: number }).page ??
          page,
      ) || 0;
    return { rows, totalCount, page: pageNum };
  }

  // Last resort: domainListPaginated (throws on success:false)
  try {
    const result = await domainListPaginated<AnyRow>("Book", page, size);
    return {
      rows: result.rows,
      totalCount: result.totalCount,
      page: result.page,
    };
  } catch {
    return { rows: [], totalCount: 0, page };
  }
}

export async function listBooksPage50(): Promise<AnyRow[]> {
  const result = await listBooksPage(0, 50);
  return result.rows;
}

/**
 * Angular: domain/list/SubjectBook?
 * query=Subjectregulation.subjectRegulationId=={id}.and.isActive==true
 */
export async function listActiveSubjectBooksByRegulation(
  subjectRegulationId: number,
): Promise<AnyRow[]> {
  if (!subjectRegulationId) return [];
  const query = buildQuery({
    "Subjectregulation.subjectRegulationId": subjectRegulationId,
    isActive: true,
  });
  try {
    return await domainList<AnyRow>("SubjectBook", query);
  } catch {
    return [];
  }
}

/**
 * Angular `assignBookDialog` → `crudService.add('subjectbooks', books)`.
 * Payload is the modal book rows (checked / deactivated).
 */
export async function saveSubjectBookAssignments(
  books: AnyRow[],
): Promise<void> {
  if (!Array.isArray(books) || books.length === 0) {
    throw new Error("No Book is Checked");
  }
  await postDetails("subjectbooks", books);
}

/** @deprecated Prefer saveSubjectBookAssignments (Angular batch POST). */
export async function saveSubjectBookAssignment(
  payload: AnyRow,
): Promise<void> {
  await saveSubjectBookAssignments([payload]);
}

/** Kept for barrel compatibility — main list uses listSubjectRegulationsByCourseYear. */
export async function listSubjectBookAssignments(_params: {
  collegeId: number;
  academicYearId: number;
  groupSectionId: number;
}): Promise<AnyRow[]> {
  return [];
}

export async function listBooksForAssignment(
  _searchText: string,
): Promise<AnyRow[]> {
  const { rows } = await listBooksPage(0, 50);
  return rows;
}
