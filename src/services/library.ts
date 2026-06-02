import { LIBRARY_API } from '@/config/constants/api'
import { ENTITIES } from '@/config/constants/entities'
import type { Campus } from '@/types/campus'
import { GM_CODES } from '@/config/constants/ui'
import type { GeneralDetail } from '@/types/exam-master'
import {
  buildQuery,
  domainCreate,
  domainList,
  domainUpdate,
  fetchDetails,
  fetchDetailsById,
  getAllRecords,
  postDetails,
  putDetails,
} from '@/services/crud'
import type {
  LibraryAuthor,
  LibraryAuthorPayload,
  LibraryBookCategory,
  LibraryBookCategoryPayload,
  LibraryCategory,
  LibraryCategoryPayload,
  LibraryDetail,
  LibraryDetailPayload,
  LibraryMembership,
  LibraryMembershipPayload,
  LibraryPublisher,
  LibraryPublisherPayload,
  LibraryRack,
  LibraryRackPayload,
  LibrarySupplier,
  LibrarySupplierPayload,
} from '@/types/library'

type AnyRow = Record<string, unknown>

/** Unwraps stored-proc / fetchDetails payloads into a flat row array. */
function unwrapLibraryRows(data: unknown): AnyRow[] {
  if (Array.isArray(data)) {
    const first = data[0]
    if (Array.isArray(first)) return first as AnyRow[]
    if (first && typeof first === 'object') return [first as AnyRow]
    return data as AnyRow[]
  }
  if (data && typeof data === 'object' && 'result' in data) {
    const result = (data as { result?: unknown }).result
    if (Array.isArray(result) && result.length > 0) {
      const block = result[0]
      if (Array.isArray(block)) return block as AnyRow[]
      if (block && typeof block === 'object') return [block as AnyRow]
    }
  }
  if (data && typeof data === 'object') return [data as AnyRow]
  return []
}

function isObjectRow(item: unknown): item is AnyRow {
  return item != null && typeof item === 'object' && !Array.isArray(item)
}

/** Unwrap `libraryMemberSearch` / similar GET payloads (nested arrays, resultList, tabular). */
function unwrapMemberSearchRows(data: unknown, depth = 0): AnyRow[] {
  if (data == null || depth > 8) return []

  if (Array.isArray(data)) {
    if (data.length === 0) return []
    if (data.every((item) => Array.isArray(item))) {
      return (data as unknown[][]).flat().filter(isObjectRow) as AnyRow[]
    }
    if (data.length > 0 && Array.isArray(data[0])) {
      return (data as unknown[][]).flat().filter(isObjectRow) as AnyRow[]
    }
    if (data.every(isObjectRow)) return data as AnyRow[]
    return data.flatMap((item) => unwrapMemberSearchRows(item, depth + 1))
  }

  if (typeof data === 'object') {
    const o = data as AnyRow
    const names = o.columnNames ?? o.column_names ?? o.columns
    const values = o.data ?? o.rows ?? o.values
    if (Array.isArray(names) && Array.isArray(values)) {
      const cols = names.map((c) => String(c))
      const out: AnyRow[] = []
      for (const row of values) {
        if (Array.isArray(row)) {
          const obj: AnyRow = {}
          cols.forEach((col, i) => {
            obj[col] = row[i]
          })
          out.push(obj)
        } else if (isObjectRow(row)) {
          out.push(row)
        }
      }
      if (out.length > 0) return out
    }

    for (const k of [
      'resultList',
      'result',
      'data',
      'rows',
      'list',
      'records',
      'members',
      'memberList',
      'membershipList',
      'libMembers',
    ]) {
      const v = o[k]
      if (v == null) continue
      const rows = unwrapMemberSearchRows(v, depth + 1)
      if (rows.length > 0) return rows
    }
  }

  return unwrapLibraryRows(data)
}

function filterMembershipByTerm(rows: LibraryMembership[], term: string): LibraryMembership[] {
  const q = term.trim().toLowerCase()
  if (!q) return rows
  return rows.filter((r) => {
    const id = String(r.membershipNo ?? r.memberShipId ?? '').toLowerCase()
    const name = String(r.memberName ?? '').toLowerCase()
    const hall = String(r.hallticketNumber ?? '').toLowerCase()
    const roll = String(r.rollNumber ?? '').toLowerCase()
    const emp = String(r.empNumber ?? '').toLowerCase()
    return [id, name, hall, roll, emp].some((s) => s.includes(q))
  })
}

function normalizeMembershipRow(row: AnyRow): LibraryMembership {
  const first = String(row.firstName ?? row.first_name ?? '').trim()
  const last = String(row.lastName ?? row.last_name ?? '').trim()
  const fullName = [first, last].filter(Boolean).join(' ')

  return {
    ...row,
    memberShipId:
      Number(
        row.memberShipId ??
          row.membershipId ??
          row.member_ship_id ??
          row.libMemberId ??
          row.id ??
          0,
      ) || undefined,
    membershipNo: String(
      row.membershipNo ??
        row.memberCode ??
        row.memberShipCode ??
        row.member_ship_no ??
        row.memberShipNo ??
        row.libMembershipNo ??
        '',
    ),
    memberName: String(
      row.memberName ??
        row.member_name ??
        row.libMemberName ??
        row.name ??
        row.studentName ??
        row.employeeName ??
        fullName ??
        '',
    ),
    memberType: String(row.memberType ?? row.member_type ?? ''),
    hallticketNumber: String(row.hallticketNumber ?? row.hallTicketNo ?? ''),
    rollNumber: String(row.rollNumber ?? row.rollNo ?? ''),
    empNumber: String(row.empNumber ?? row.emp_number ?? ''),
    collegeCode: String(row.collegeCode ?? row.college_code ?? ''),
    isActive: row.isActive !== false && row.is_active !== false,
  }
}

// ── Cascade lookups (org → campus → college) ────────────────────────────────────

export async function listCampusesByOrganization(organizationId: number): Promise<Campus[]> {
  if (!organizationId) return []
  return domainList<Campus>(
    ENTITIES.CAMPUS.name,
    buildQuery({ 'Organization.organizationId': organizationId, isActive: true }),
  )
}

export async function listCollegesByCampus(campusId: number): Promise<AnyRow[]> {
  if (!campusId) return []
  return domainList<AnyRow>(
    ENTITIES.COLLEGE.name,
    buildQuery({ 'Campus.campusId': campusId, isActive: true }),
  )
}

// ── Library details ───────────────────────────────────────────────────────────

export async function listLibraryDetails(): Promise<LibraryDetail[]> {
  return domainList<LibraryDetail>(ENTITIES.LIBRARY_DETAIL.name)
}

export async function listLibraryDetailsByOrganization(organizationId: number): Promise<LibraryDetail[]> {
  if (!organizationId) return []
  return domainList<LibraryDetail>(
    ENTITIES.LIBRARY_DETAIL.name,
    buildQuery({ 'Organization.organizationId': organizationId, isActive: true }),
  )
}

export async function createLibraryDetail(data: LibraryDetailPayload): Promise<LibraryDetail> {
  return domainCreate<LibraryDetail>(ENTITIES.LIBRARY_DETAIL.name, data)
}

export async function updateLibraryDetail(
  libraryId: number,
  data: Partial<LibraryDetailPayload>,
): Promise<LibraryDetail> {
  return domainUpdate<LibraryDetail>(
    ENTITIES.LIBRARY_DETAIL.name,
    ENTITIES.LIBRARY_DETAIL.pk,
    libraryId,
    data,
  )
}

// ── Authors ───────────────────────────────────────────────────────────────────

export async function listLibraryAuthors(): Promise<LibraryAuthor[]> {
  return domainList<LibraryAuthor>(ENTITIES.LIB_AUTHOR.name)
}

export async function createLibraryAuthor(data: LibraryAuthorPayload): Promise<LibraryAuthor> {
  return domainCreate<LibraryAuthor>(ENTITIES.LIB_AUTHOR.name, data)
}

export async function updateLibraryAuthor(
  authorId: number,
  data: Partial<LibraryAuthorPayload>,
): Promise<LibraryAuthor> {
  return domainUpdate<LibraryAuthor>(ENTITIES.LIB_AUTHOR.name, ENTITIES.LIB_AUTHOR.pk, authorId, data)
}

// ── Publishers ────────────────────────────────────────────────────────────────

export async function listLibraryPublishers(): Promise<LibraryPublisher[]> {
  return domainList<LibraryPublisher>(ENTITIES.LIB_PUBLISHER.name)
}

export async function createLibraryPublisher(data: LibraryPublisherPayload): Promise<LibraryPublisher> {
  return domainCreate<LibraryPublisher>(ENTITIES.LIB_PUBLISHER.name, data)
}

export async function updateLibraryPublisher(
  publisherId: number,
  data: Partial<LibraryPublisherPayload>,
): Promise<LibraryPublisher> {
  return domainUpdate<LibraryPublisher>(
    ENTITIES.LIB_PUBLISHER.name,
    ENTITIES.LIB_PUBLISHER.pk,
    publisherId,
    data,
  )
}

// ── Racks (shelves) ───────────────────────────────────────────────────────────

export async function listLibraryRacks(): Promise<LibraryRack[]> {
  return domainList<LibraryRack>(ENTITIES.LIB_RACK.name)
}

export async function createLibraryRack(data: LibraryRackPayload): Promise<LibraryRack> {
  return domainCreate<LibraryRack>(ENTITIES.LIB_RACK.name, data)
}

export async function updateLibraryRack(
  shelveId: number,
  data: Partial<LibraryRackPayload>,
): Promise<LibraryRack> {
  return domainUpdate<LibraryRack>(ENTITIES.LIB_RACK.name, ENTITIES.LIB_RACK.pk, shelveId, data)
}

// ── Book department (book category) ───────────────────────────────────────────

export async function listLibraryBookCategories(): Promise<LibraryBookCategory[]> {
  return domainList<LibraryBookCategory>(ENTITIES.LIB_BOOK_CATEGORY.name)
}

export async function listLibraryCategories(): Promise<LibraryCategory[]> {
  return domainList<LibraryCategory>(ENTITIES.LIB_LIBRARY_CATEGORY.name)
}

export async function createLibraryBookCategory(data: LibraryBookCategoryPayload): Promise<LibraryBookCategory> {
  return domainCreate<LibraryBookCategory>(ENTITIES.LIB_BOOK_CATEGORY.name, data)
}

export async function updateLibraryBookCategory(
  bookcatId: number,
  data: Partial<LibraryBookCategoryPayload>,
): Promise<LibraryBookCategory> {
  return domainUpdate<LibraryBookCategory>(
    ENTITIES.LIB_BOOK_CATEGORY.name,
    ENTITIES.LIB_BOOK_CATEGORY.pk,
    bookcatId,
    data,
  )
}

// ── Department details (library category) ─────────────────────────────────────

export async function createLibraryCategory(data: LibraryCategoryPayload): Promise<LibraryCategory> {
  return domainCreate<LibraryCategory>(ENTITIES.LIB_LIBRARY_CATEGORY.name, data)
}

export async function updateLibraryCategory(
  libCategoryId: number,
  data: Partial<LibraryCategoryPayload>,
): Promise<LibraryCategory> {
  return domainUpdate<LibraryCategory>(
    ENTITIES.LIB_LIBRARY_CATEGORY.name,
    ENTITIES.LIB_LIBRARY_CATEGORY.pk,
    libCategoryId,
    data,
  )
}

// ── Suppliers ─────────────────────────────────────────────────────────────────

export async function listLibrarySuppliers(): Promise<LibrarySupplier[]> {
  return domainList<LibrarySupplier>(ENTITIES.LIB_SUPPLIER.name)
}

export async function createLibrarySupplier(data: LibrarySupplierPayload): Promise<LibrarySupplier> {
  return domainCreate<LibrarySupplier>(ENTITIES.LIB_SUPPLIER.name, data)
}

export async function updateLibrarySupplier(
  supplierId: number,
  data: Partial<LibrarySupplierPayload>,
): Promise<LibrarySupplier> {
  return domainUpdate<LibrarySupplier>(
    ENTITIES.LIB_SUPPLIER.name,
    ENTITIES.LIB_SUPPLIER.pk,
    supplierId,
    data,
  )
}

// ── Membership ───────────────────────────────────────────────────────────────

export async function listLibraryMemberships(): Promise<LibraryMembership[]> {
  const rows = await domainList<AnyRow>(ENTITIES.LIB_MEMBERSHIP.name)
  return rows.map(normalizeMembershipRow)
}

export async function getLibraryMembershipById(memberShipId: number): Promise<LibraryMembership | null> {
  if (!memberShipId) return null
  try {
    const row = await fetchDetailsById<AnyRow>(LIBRARY_API.MEMBERSHIP, memberShipId)
    return normalizeMembershipRow(row)
  } catch {
    return null
  }
}

/** Typeahead search — `libraryMemberSearch` (membership id or member name). */
export async function searchLibraryMembers(
  searchText: string,
  collegeId?: number,
): Promise<LibraryMembership[]> {
  const term = searchText.trim()
  if (term.length < 2) return []

  const params: Record<string, string | number> = { isActive: 'true', q: term }
  if (collegeId) {
    params.in_college_id = collegeId
    params.collegeId = collegeId
  }

  try {
    const data = await fetchDetails<unknown>(LIBRARY_API.MEMBER_SEARCH, params)
    const rows = unwrapMemberSearchRows(data).map(normalizeMembershipRow)
    if (rows.length > 0) return rows
  } catch {
    // fall through to domain list filter
  }

  try {
    const all = await listLibraryMemberships()
    return filterMembershipByTerm(all, term)
  } catch {
    return []
  }
}

export async function listStudentsWithoutLibraryMembership(
  collegeId?: number,
): Promise<LibraryMembership[]> {
  const params: Record<string, string | number> = {}
  if (collegeId) params.in_college_id = collegeId
  const data = await getAllRecords<unknown>(LIBRARY_API.NO_MEMBERSHIP, params)
  return unwrapLibraryRows(data).map(normalizeMembershipRow)
}

export async function listEmployeeLibraryMemberships(
  collegeId?: number,
): Promise<LibraryMembership[]> {
  const params: Record<string, string | number> = {}
  if (collegeId) params.in_college_id = collegeId
  const data = await getAllRecords<unknown>(LIBRARY_API.EMPLOYEES_LIB_MEMBERSHIP, params)
  return unwrapLibraryRows(data).map(normalizeMembershipRow)
}

export async function createLibraryMembership(
  data: LibraryMembershipPayload,
): Promise<LibraryMembership> {
  const row = await domainCreate<AnyRow>(ENTITIES.LIB_MEMBERSHIP.name, data)
  return normalizeMembershipRow(row)
}

export async function updateLibraryMembership(
  memberShipId: number,
  data: Partial<LibraryMembershipPayload>,
): Promise<LibraryMembership> {
  const row = await domainUpdate<AnyRow>(
    ENTITIES.LIB_MEMBERSHIP.name,
    ENTITIES.LIB_MEMBERSHIP.pk,
    memberShipId,
    data,
  )
  return normalizeMembershipRow(row)
}

// ── Books & periodicals ───────────────────────────────────────────────────────

export type LibraryRow = Record<string, unknown>

function normalizeBookRow(row: AnyRow): LibraryRow {
  return {
    ...row,
    bookId: Number(row.bookId ?? 0) || undefined,
    title: String(row.title ?? row.bookTitle ?? ''),
    bookTitle: String(row.bookTitle ?? row.title ?? ''),
    libraryCode: String(row.libraryCode ?? ''),
    noofcopies: row.noofcopies ?? row.noOfCopies,
    availableCopies: row.availableCopies,
    issuedCopies: row.issuedCopies,
  }
}

export async function listCollegesForLibrary(): Promise<AnyRow[]> {
  return domainList<AnyRow>(ENTITIES.COLLEGE.name, buildQuery({ isActive: true }))
}

export async function listLibrariesByCollege(collegeId: number): Promise<LibraryDetail[]> {
  if (!collegeId) return []
  const queries = [
    buildQuery({ 'College.collegeId': collegeId, isActive: true }),
    buildQuery({ collegeId, isActive: true }),
  ]
  for (const q of queries) {
    try {
      const rows = await domainList<LibraryDetail>(ENTITIES.LIBRARY_DETAIL.name, q)
      if (rows.length > 0) return rows
    } catch {
      // try next query shape
    }
  }
  return []
}

export async function listBookCategoriesByLibrary(libraryId: number): Promise<LibraryBookCategory[]> {
  if (!libraryId) return []
  const queries = [
    buildQuery({ 'LibraryDetail.libraryId': libraryId, isActive: true }),
    buildQuery({ libraryId, isActive: true }),
  ]
  for (const q of queries) {
    try {
      const rows = await domainList<LibraryBookCategory>(ENTITIES.LIB_BOOK_CATEGORY.name, q)
      if (rows.length > 0) return rows
    } catch {
      // try next query shape
    }
  }
  return []
}

export async function listBooksByLibraryAndCategory(
  libraryId: number,
  bookcatId: number,
): Promise<LibraryRow[]> {
  if (!libraryId || !bookcatId) return []
  const queries = [
    buildQuery({
      'LibraryDetail.libraryId': libraryId,
      'BookCategory.bookcatId': bookcatId,
      isActive: true,
    }),
    buildQuery({ libraryId, bookcatId, isActive: true }),
  ]
  for (const q of queries) {
    try {
      const rows = await domainList<LibraryRow>(ENTITIES.LIB_BOOK.name, q)
      if (rows.length > 0) return rows.map(normalizeBookRow)
    } catch {
      // try next query shape
    }
  }
  return []
}

/** Angular `booksearch` — library + category + title (min 4 chars). */
export async function searchBooksInLibraryCategory(
  libraryId: number,
  bookcatId: number,
  searchText: string,
): Promise<LibraryRow[]> {
  const q = searchText.trim()
  if (!libraryId || !bookcatId || q.length < 4) return []

  const paramVariants: Record<string, string | number>[] = [
    { libraryId, bookcatId, q, isActive: 'true' },
    { libraryId, bookcatId, searchText: q, isActive: 'true' },
  ]

  for (const params of paramVariants) {
    try {
      const data = await fetchDetails<unknown>(LIBRARY_API.BOOK_SEARCH, params)
      const rows = unwrapMemberSearchRows(data).map(normalizeBookRow)
      if (rows.length > 0) return rows
    } catch {
      // try next param shape
    }
  }

  const all = await listBooksByLibraryAndCategory(libraryId, bookcatId)
  const needle = q.toLowerCase()
  return all.filter((r) => {
    const title = String(r.title ?? r.bookTitle ?? '').toLowerCase()
    return title.includes(needle)
  })
}

export async function listLibraryBooks(): Promise<LibraryRow[]> {
  const rows = await domainList<LibraryRow>(ENTITIES.LIB_BOOK.name)
  return rows.map(normalizeBookRow)
}

export async function searchLibraryBooks(searchText: string): Promise<LibraryRow[]> {
  const q = searchText.trim()
  if (q.length < 2) return []
  try {
    const data = await fetchDetails<unknown>(LIBRARY_API.BOOK_SEARCH, { isActive: 'true', q })
    return unwrapMemberSearchRows(data).map(normalizeBookRow)
  } catch {
    const all = await listLibraryBooks()
    const needle = q.toLowerCase()
    return all.filter((r) => {
      const title = String(r.title ?? r.bookTitle ?? '').toLowerCase()
      const code = String(r.libraryCode ?? '').toLowerCase()
      return title.includes(needle) || code.includes(needle)
    })
  }
}

export async function listLibraryPeriodicals(): Promise<LibraryRow[]> {
  return domainList<LibraryRow>(ENTITIES.LIB_PERIODICAL.name)
}

export async function listLibraryBookDetails(): Promise<LibraryRow[]> {
  return domainList<LibraryRow>(ENTITIES.LIB_BOOK_DETAIL.name)
}

function dedupeBookDetailsByAccession(rows: LibraryRow[]): LibraryRow[] {
  const seen = new Set<string>()
  return rows.filter((r) => {
    const acc = String(r.accessionno ?? r.accessionNo ?? '').trim()
    if (!acc) return true
    if (seen.has(acc)) return false
    seen.add(acc)
    return true
  })
}

/** `bookdetailsearch` — accession, barcode, or title (Angular book issue / books search). */
export async function searchLibraryBookDetails(
  searchText: string,
  libraryId?: number,
): Promise<LibraryRow[]> {
  const q = searchText.trim()
  if (q.length < 2) return []

  const paramVariants: Record<string, string | number>[] = [
    { isActive: 'true', q },
    { q, isActive: 'true' },
  ]
  if (libraryId) {
    paramVariants.push(
      { isActive: 'true', q, libraryId },
      { q, libraryId },
    )
  }

  for (const params of paramVariants) {
    try {
      const data = await fetchDetails<unknown>(LIBRARY_API.BOOK_DETAIL_SEARCH, params)
      const rows = unwrapMemberSearchRows(data).map(normalizeBookDetailRow)
      if (rows.length > 0) return dedupeBookDetailsByAccession(rows)
    } catch {
      // try next param shape
    }
  }

  try {
    const all = await listLibraryBookDetails()
    const needle = q.toLowerCase()
    const filtered = all.filter((r) => {
      const title = String(r.bookTitle ?? r.title ?? '').toLowerCase()
      const acc = String(r.accessionno ?? r.accessionNo ?? '').toLowerCase()
      const barcode = String(r.barcode ?? '').toLowerCase()
      return title.includes(needle) || acc.includes(needle) || barcode.includes(needle)
    })
    return dedupeBookDetailsByAccession(filtered.map(normalizeBookDetailRow))
  } catch {
    return []
  }
}

export async function listReservedBooks(): Promise<LibraryRow[]> {
  try {
    const data = await fetchDetails<unknown>(LIBRARY_API.RESERVE_BOOK, { isActive: 'true' })
    return unwrapMemberSearchRows(data)
  } catch {
    return []
  }
}

export type BookReturnSearchRow = LibraryMembership & { bookDetail?: LibraryRow }

function normalizeBookReturnRow(row: AnyRow): BookReturnSearchRow {
  const bookDetailRaw = (row.bookDetail ?? row.book_detail) as AnyRow | undefined
  return {
    ...normalizeMembershipRow(row),
    bookDetail: bookDetailRaw ? normalizeBookDetailRow(bookDetailRaw) : undefined,
  }
}

/** `bookReturnSearch` — member + issued book by membership id, name, or accession. */
export async function searchBookReturn(
  searchText: string,
  libraryId?: number,
): Promise<BookReturnSearchRow[]> {
  const q = searchText.trim()
  if (q.length < 2) return []

  const paramVariants: Record<string, string | number>[] = [
    { q, isActive: 'true' },
    { q },
  ]
  if (libraryId) {
    paramVariants.push({ q, libraryId }, { q, libraryId, isActive: 'true' })
  }

  for (const params of paramVariants) {
    try {
      const data = await fetchDetails<unknown>(LIBRARY_API.BOOK_RETURN_SEARCH, params)
      const rows = unwrapMemberSearchRows(data).map(normalizeBookReturnRow)
      if (rows.length > 0) {
        const exact = rows.filter(
          (r) =>
            String(r.membershipNo ?? r.memberCode ?? '') === q ||
            String(r.bookDetail?.accessionno ?? r.bookDetail?.accessionNo ?? '') === q,
        )
        return exact.length > 0 ? exact : rows
      }
    } catch {
      // try next param shape
    }
  }
  return []
}

function normalizeIssuedBookRow(row: AnyRow): LibraryRow {
  const detail = (row.bookDetail ?? row.book_detail) as AnyRow | undefined
  return {
    ...row,
    bookIssuedetailsId: Number(row.bookIssuedetailsId ?? row.bookIssueDetailsId ?? 0) || undefined,
    accessionno: String(row.accessionno ?? detail?.accessionno ?? detail?.accessionNo ?? ''),
    bookTitle: String(row.bookTitle ?? detail?.bookTitle ?? detail?.title ?? ''),
    issueFromdate: row.issueFromdate ?? row.issueFromDate,
    issueTodate: row.issueTodate ?? row.issueToDate,
    issueDuedate: row.issueDuedate ?? row.issueDueDate,
    fineTypeName: row.fineTypeName ?? row.fineType,
    isreturned: row.isreturned ?? row.isReturned,
    isrenewaled: row.isrenewaled ?? row.isRenewaled,
    fineTypeCode: row.fineTypeCode,
  }
}

/** Issued books for a member — Angular `BookIssuedetail` by `libMember.memberCode`. */
export async function listIssuedBooksByMemberCode(memberCode: string): Promise<LibraryRow[]> {
  const code = memberCode.trim()
  if (!code) return []

  const paramVariants: Record<string, string | number>[] = [
    { 'libMember.memberCode': code },
    { memberCode: code },
    { q: code },
  ]

  for (const params of paramVariants) {
    try {
      const data = await fetchDetails<unknown>(LIBRARY_API.BOOK_ISSUE_DETAILS, params)
      const rows = unwrapMemberSearchRows(data).map(normalizeIssuedBookRow)
      if (rows.length > 0) return rows
    } catch {
      // try next
    }
  }
  return []
}

export async function listBooksDue(page = 0, size = 50): Promise<LibraryRow[]> {
  try {
    const data = await fetchDetails<unknown>(LIBRARY_API.BOOK_DUE_LIST, { page, size })
    const rows = unwrapMemberSearchRows(data)
    return rows.map((row) => {
      const detail = (row.bookDetail ?? row.book_detail) as AnyRow | undefined
      return {
        ...row,
        accessionno: row.accessionno ?? detail?.accessionno ?? detail?.accessionNo,
        bookTitle: row.bookTitle ?? detail?.bookTitle ?? detail?.title,
      }
    })
  } catch {
    return []
  }
}

export async function listLibrarySettings(): Promise<LibraryRow[]> {
  return domainList<LibraryRow>(ENTITIES.LIB_SETTING.name)
}

export async function listBookRegistrationTypes(): Promise<GeneralDetail[]> {
  return domainList<GeneralDetail>(
    ENTITIES.GENERAL_DETAIL.name,
    buildQuery({ 'GeneralMaster.generalMasterCode': GM_CODES.BOOK_REG_TYPE, isActive: true }),
  )
}

export async function listLanguageCategories(): Promise<GeneralDetail[]> {
  return domainList<GeneralDetail>(
    ENTITIES.GENERAL_DETAIL.name,
    buildQuery({ 'GeneralMaster.generalMasterCode': GM_CODES.LANGUAGE, isActive: true }),
  )
}

export async function listBookBindTypes(): Promise<GeneralDetail[]> {
  return domainList<GeneralDetail>(
    ENTITIES.GENERAL_DETAIL.name,
    buildQuery({ 'GeneralMaster.generalMasterCode': GM_CODES.BOOK_BIND_TYPE, isActive: true }),
  )
}

export async function listActiveLibraryDetails(): Promise<LibraryDetail[]> {
  return domainList<LibraryDetail>(ENTITIES.LIBRARY_DETAIL.name, buildQuery({ isActive: true }))
}

export type UpdateLibraryBookPayload = {
  libraryId: number
  title: string
  bookcatId: number
  languageId: number
  noOfPages?: number | string
  libraryRefPrefix?: string
  tags?: string
  customTags?: string
  isbn?: string
  year?: number | string
  edition?: string
  vol?: string
  bindingTypeId?: number
  subjectHeadings?: string
  callNumber?: string
  authorId?: unknown
  isActive?: boolean
}

export async function updateLibraryBook(
  bookId: number,
  data: UpdateLibraryBookPayload,
): Promise<LibraryRow> {
  const row = await domainUpdate<AnyRow>(ENTITIES.LIB_BOOK.name, ENTITIES.LIB_BOOK.pk, bookId, data)
  return normalizeBookRow(row)
}

export async function listLibraryCurrencyTypes(): Promise<GeneralDetail[]> {
  return domainList<GeneralDetail>(
    ENTITIES.GENERAL_DETAIL.name,
    buildQuery({ 'GeneralMaster.generalMasterCode': GM_CODES.CURRENCY_TYPE, isActive: true }),
  )
}

function normalizeBookDetailRow(row: AnyRow): LibraryRow {
  return {
    ...row,
    bookDetailsId: Number(row.bookDetailsId ?? row.bookDetailId ?? 0) || undefined,
    accessionno: String(row.accessionno ?? row.accessionNo ?? ''),
    bookTitle: String(row.bookTitle ?? row.title ?? ''),
    bookregTypeCode: String(row.bookregTypeCode ?? row.bookregType ?? ''),
    shelveCode: String(row.shelveCode ?? ''),
    bookPosition: String(row.bookPosition ?? ''),
    bookBarcode: row.bookBarcode ?? row.barcode,
    barcode: row.barcode ?? row.bookBarcode,
    isActive: row.isActive !== false && row.is_active !== false,
  }
}

/** Copies by accession — Angular `BookDetail` list by `accessionno`. */
export async function listBookDetailsByAccession(accessionno: string): Promise<LibraryRow[]> {
  const code = accessionno.trim()
  if (!code) return []

  const queries = [
    buildQuery({ accessionno: code, isActive: true }),
    buildQuery({ accessionNo: code, isActive: true }),
  ]
  for (const q of queries) {
    try {
      const rows = await domainList<AnyRow>(ENTITIES.LIB_BOOK_DETAIL.name, q)
      if (rows.length > 0) return rows.map(normalizeBookDetailRow)
    } catch {
      // try next
    }
  }

  try {
    const data = await fetchDetails<unknown>(LIBRARY_API.BOOK_DETAIL, { accessionno: code, q: code })
    const rows = unwrapMemberSearchRows(data).map(normalizeBookDetailRow)
    const exact = rows.filter(
      (r) => String(r.accessionno ?? '').toLowerCase() === code.toLowerCase(),
    )
    return exact.length > 0 ? exact : rows
  } catch {
    return []
  }
}

/** Copies for a title — Angular `BookDetail` list by `book.bookId`. */
export async function listBookDetailsByBookId(bookId: number): Promise<LibraryRow[]> {
  if (!bookId) return []

  const queries = [
    buildQuery({ 'Book.bookId': bookId }),
    buildQuery({ bookId }),
  ]
  for (const q of queries) {
    try {
      const rows = await domainList<AnyRow>(ENTITIES.LIB_BOOK_DETAIL.name, q)
      if (rows.length > 0) return rows.map(normalizeBookDetailRow)
    } catch {
      // try next
    }
  }

  try {
    const data = await fetchDetails<unknown>(LIBRARY_API.BOOK_DETAIL, {
      bookId,
      'book.bookId': bookId,
    })
    return unwrapMemberSearchRows(data).map(normalizeBookDetailRow)
  } catch {
    return []
  }
}

export async function getLibraryBookDetailById(bookDetailsId: number): Promise<LibraryRow | null> {
  if (!bookDetailsId) return null
  try {
    const data = await fetchDetailsById<unknown>(LIBRARY_API.BOOK_DETAIL, bookDetailsId)
    const rows = unwrapMemberSearchRows(data)
    if (rows.length > 0) return normalizeBookDetailRow(rows[0]!)
    if (data && typeof data === 'object') return normalizeBookDetailRow(data as AnyRow)
    return null
  } catch {
    try {
      const rows = await domainList<AnyRow>(
        ENTITIES.LIB_BOOK_DETAIL.name,
        buildQuery({ bookDetailsId }),
      )
      if (rows.length > 0) return normalizeBookDetailRow(rows[0]!)
    } catch {
      // fall through
    }
    return null
  }
}

export async function getLibraryBookById(bookId: number): Promise<LibraryRow | null> {
  if (!bookId) return null
  try {
    const data = await fetchDetailsById<unknown>(LIBRARY_API.BOOK, bookId)
    const rows = unwrapMemberSearchRows(data)
    if (rows.length > 0) return normalizeBookRow(rows[0]!)
    if (data && typeof data === 'object') return normalizeBookRow(data as AnyRow)
    return null
  } catch {
    return null
  }
}

export async function getLibrarySettingValueByName(settingName: string): Promise<string> {
  if (!settingName) return ''
  const queries = [
    buildQuery({ settingName, isActive: true }),
    buildQuery({ settingName }),
  ]
  for (const q of queries) {
    try {
      const rows = await domainList<AnyRow>(ENTITIES.LIB_SETTING.name, q)
      if (rows.length > 0) return String(rows[0]?.value ?? '')
    } catch {
      // try next
    }
  }
  return ''
}

/** Angular `addnewbooks` — add copies / purchase details for an existing title. */
export async function addMoreBooks(bookPayload: AnyRow): Promise<void> {
  await postDetails(LIBRARY_API.ADD_NEW_BOOKS, bookPayload)
}

export async function generateLibraryMemberBarcode(): Promise<void> {
  await putDetails(LIBRARY_API.GENERATE_MEMBER_BARCODE, null)
}

export async function generateBooksBarcode(): Promise<void> {
  await putDetails(LIBRARY_API.GENERATE_BOOK_BARCODE, null)
}
