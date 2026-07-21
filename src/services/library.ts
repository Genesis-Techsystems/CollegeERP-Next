import { AFFILIATED_COLLEGES_API, LIBRARY_API } from "@/config/constants/api";
import { ENTITIES } from "@/config/constants/entities";
import type { Campus } from "@/types/campus";
import type { Organization } from "@/types/organization";
import { GM_CODES } from "@/config/constants/ui";
import type { GeneralDetail } from "@/types/exam-master";
import {
  buildQuery,
  domainCreate,
  domainGetRawQuery,
  domainList,
  domainListPaginated,
  domainListRawQuery,
  domainUpdate,
  fetchDetails,
  fetchDetailsById,
  getAllRecords,
  postDetails,
  putDetails,
} from "@/services/crud";
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
} from "@/types/library";

type AnyRow = Record<string, unknown>;

/** Unwraps stored-proc / fetchDetails payloads into a flat row array. */
function unwrapLibraryRows(data: unknown): AnyRow[] {
  if (Array.isArray(data)) {
    const first = data[0];
    if (Array.isArray(first)) return first as AnyRow[];
    return data.filter(isObjectRow) as AnyRow[];
  }
  if (data && typeof data === "object" && "result" in data) {
    const result = (data as { result?: unknown }).result;
    if (Array.isArray(result) && result.length > 0) {
      const block = result[0];
      if (Array.isArray(block)) return block as AnyRow[];
      if (block && typeof block === "object") return [block as AnyRow];
    }
  }
  if (data && typeof data === "object") return [data as AnyRow];
  return [];
}

function isObjectRow(item: unknown): item is AnyRow {
  return item != null && typeof item === "object" && !Array.isArray(item);
}

/** Unwrap `libraryMemberSearch` / similar GET payloads (nested arrays, resultList, tabular). */
function unwrapMemberSearchRows(data: unknown, depth = 0): AnyRow[] {
  if (data == null || depth > 8) return [];

  if (Array.isArray(data)) {
    if (data.length === 0) return [];
    if (data.every((item) => Array.isArray(item))) {
      return (data as unknown[][]).flat().filter(isObjectRow) as AnyRow[];
    }
    if (data.length > 0 && Array.isArray(data[0])) {
      return (data as unknown[][]).flat().filter(isObjectRow) as AnyRow[];
    }
    if (data.every(isObjectRow)) return data as AnyRow[];
    return data.flatMap((item) => unwrapMemberSearchRows(item, depth + 1));
  }

  if (typeof data === "object") {
    const o = data as AnyRow;
    const names = o.columnNames ?? o.column_names ?? o.columns;
    const values = o.data ?? o.rows ?? o.values;
    if (Array.isArray(names) && Array.isArray(values)) {
      const cols = names.map((c) => String(c));
      const out: AnyRow[] = [];
      for (const row of values) {
        if (Array.isArray(row)) {
          const obj: AnyRow = {};
          cols.forEach((col, i) => {
            obj[col] = row[i];
          });
          out.push(obj);
        } else if (isObjectRow(row)) {
          out.push(row);
        }
      }
      if (out.length > 0) return out;
    }

    for (const k of [
      "resultList",
      "result",
      "data",
      "rows",
      "list",
      "records",
      "members",
      "memberList",
      "membershipList",
      "libMembers",
    ]) {
      const v = o[k];
      if (v == null) continue;
      const rows = unwrapMemberSearchRows(v, depth + 1);
      if (rows.length > 0) return rows;
    }
  }

  return unwrapLibraryRows(data);
}

function normalizeMembershipRow(row: AnyRow): LibraryMembership {
  const student = isObjectRow(row.studentDetail)
    ? row.studentDetail
    : undefined;
  const employee = isObjectRow(row.employeeDetail)
    ? row.employeeDetail
    : undefined;
  const first = String(row.firstName ?? row.first_name ?? "").trim();
  const last = String(row.lastName ?? row.last_name ?? "").trim();
  const fullName = [first, last].filter(Boolean).join(" ");
  const directMemberName = String(
    row.memberName ?? row.member_name ?? "",
  ).trim();
  const memberName =
    directMemberName ||
    String(
      student?.firstName ??
        employee?.firstName ??
        row.libMemberName ??
        row.name ??
        fullName ??
        "",
    );
  const membertype = String(row.membertype ?? row.memberType ?? "");
  const activeValue = row.isActive ?? row.is_active;
  const isInactive =
    activeValue === false ||
    activeValue === 0 ||
    activeValue === "0" ||
    activeValue === "false";

  return {
    ...row,
    libMemberId:
      Number(row.libMemberId ?? row.memberShipId ?? row.membershipId ?? 0) ||
      undefined,
    memberShipId:
      Number(
        row.libMemberId ??
          row.memberShipId ??
          row.membershipId ??
          row.member_ship_id ??
          row.libMemberId ??
          row.id ??
          0,
      ) || undefined,
    membershipNo: String(
      row.memberCode ??
        row.membershipNo ??
        row.memberCode ??
        row.memberShipCode ??
        row.member_ship_no ??
        row.memberShipNo ??
        row.libMembershipNo ??
        "",
    ),
    memberCode: String(row.memberCode ?? row.membershipNo ?? ""),
    memberName,
    membertype,
    memberType:
      membertype === "S"
        ? "Student"
        : membertype === "E"
          ? "Employee"
          : membertype,
    hallticketNumber: String(
      row.hallticketNumber ??
        row.hallTicketNo ??
        student?.hallticketNumber ??
        "",
    ),
    rollNumber: String(
      row.rollNumber ?? row.rollNo ?? student?.rollNumber ?? "",
    ),
    empNumber: String(
      row.empNumber ?? row.emp_number ?? employee?.empNumber ?? "",
    ),
    empDeptName: String(row.empDeptName ?? employee?.empDeptName ?? ""),
    collegeCode: String(row.collegeCode ?? row.college_code ?? ""),
    libraryCode: String(row.libraryCode ?? ""),
    libraryName: String(row.libraryName ?? row.libraryCode ?? ""),
    studentDetail: student ?? null,
    employeeDetail: employee ?? null,
    isActive: !isInactive,
  };
}

// ── Cascade lookups (org → campus → college) ────────────────────────────────────

export async function listActiveOrganizationsForLibrary(): Promise<
  Organization[]
> {
  return domainListRawQuery<Organization>(
    ENTITIES.ORGANIZATION.name,
    buildQuery({ isActive: true }),
  );
}

export async function listCampusesByOrganization(
  organizationId: number,
): Promise<Campus[]> {
  if (!organizationId) return [];
  return domainList<Campus>(
    ENTITIES.CAMPUS.name,
    buildQuery({
      "Organization.organizationId": organizationId,
      isActive: true,
    }),
  );
}

export async function listCollegesByCampus(
  campusId: number,
): Promise<AnyRow[]> {
  if (!campusId) return [];
  return domainList<AnyRow>(
    ENTITIES.COLLEGE.name,
    buildQuery({ "Campus.campusId": campusId, isActive: true }),
  );
}

// ── Library details ───────────────────────────────────────────────────────────

export async function listLibraryDetails(): Promise<LibraryDetail[]> {
  return domainList<LibraryDetail>(ENTITIES.LIBRARY_DETAIL.name);
}

export async function listLibraryDetailsByOrganization(
  organizationId: number,
): Promise<LibraryDetail[]> {
  if (!organizationId) return [];
  return domainListRawQuery<LibraryDetail>(
    ENTITIES.LIBRARY_DETAIL.name,
    buildQuery({
      "Organization.organizationId": organizationId,
      isActive: true,
    }),
  );
}

export async function createLibraryDetail(
  data: LibraryDetailPayload,
): Promise<LibraryDetail> {
  return domainCreate<LibraryDetail>(ENTITIES.LIBRARY_DETAIL.name, data);
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
  );
}

// ── Authors ───────────────────────────────────────────────────────────────────

export async function listLibraryAuthors(): Promise<LibraryAuthor[]> {
  return domainListRawQuery<LibraryAuthor>(
    ENTITIES.LIB_AUTHOR.name,
    "order(createdDt=desc)",
    true,
  );
}

export async function createLibraryAuthor(
  data: LibraryAuthorPayload,
): Promise<LibraryAuthor> {
  return domainCreate<LibraryAuthor>(ENTITIES.LIB_AUTHOR.name, data);
}

export async function updateLibraryAuthor(
  authorId: number,
  data: Partial<LibraryAuthorPayload>,
): Promise<LibraryAuthor> {
  return domainUpdate<LibraryAuthor>(
    ENTITIES.LIB_AUTHOR.name,
    LIBRARY_API.AUTHOR_BY_ID,
    authorId,
    data,
  );
}

// ── Publishers ────────────────────────────────────────────────────────────────

export async function listLibraryPublishers(): Promise<LibraryPublisher[]> {
  return domainListRawQuery<LibraryPublisher>(
    ENTITIES.LIB_PUBLISHER.name,
    "order(createdDt=desc)",
    true,
  );
}

export async function createLibraryPublisher(
  data: LibraryPublisherPayload,
): Promise<LibraryPublisher> {
  return domainCreate<LibraryPublisher>(ENTITIES.LIB_PUBLISHER.name, data);
}

export async function updateLibraryPublisher(
  publisherId: number,
  data: Partial<LibraryPublisherPayload>,
): Promise<LibraryPublisher> {
  return domainUpdate<LibraryPublisher>(
    ENTITIES.LIB_PUBLISHER.name,
    LIBRARY_API.PUBLISHER_BY_ID,
    publisherId,
    data,
  );
}

// ── Racks (shelves) ───────────────────────────────────────────────────────────

export async function listLibraryRacks(): Promise<LibraryRack[]> {
  return domainList<LibraryRack>(ENTITIES.LIB_RACK.name);
}

export async function createLibraryRack(
  data: LibraryRackPayload,
): Promise<LibraryRack> {
  return domainCreate<LibraryRack>(ENTITIES.LIB_RACK.name, data);
}

export async function updateLibraryRack(
  shelveId: number,
  data: Partial<LibraryRackPayload>,
): Promise<LibraryRack> {
  return domainUpdate<LibraryRack>(
    ENTITIES.LIB_RACK.name,
    ENTITIES.LIB_RACK.pk,
    shelveId,
    data,
  );
}

// ── Book department (book category) ───────────────────────────────────────────

export async function listLibraryBookCategories(): Promise<
  LibraryBookCategory[]
> {
  return domainListRawQuery<LibraryBookCategory>(
    ENTITIES.LIB_BOOK_CATEGORY.name,
    "order(createdDt=desc)",
    true,
  );
}

export async function listLibraryCategories(): Promise<LibraryCategory[]> {
  return domainList<LibraryCategory>(ENTITIES.LIB_LIBRARY_CATEGORY.name);
}

export async function listLibraryCategoriesByOrganization(
  organizationId: number,
): Promise<LibraryCategory[]> {
  if (!organizationId) return [];
  return domainListRawQuery<LibraryCategory>(
    ENTITIES.LIB_LIBRARY_CATEGORY.name,
    buildQuery({
      "Organization.organizationId": organizationId,
      isActive: true,
    }),
  );
}

export async function createLibraryBookCategory(
  data: LibraryBookCategoryPayload,
): Promise<LibraryBookCategory> {
  return domainCreate<LibraryBookCategory>(
    ENTITIES.LIB_BOOK_CATEGORY.name,
    data,
  );
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
  );
}

// ── Department details (library category) ─────────────────────────────────────

export async function createLibraryCategory(
  data: LibraryCategoryPayload,
): Promise<LibraryCategory> {
  return domainCreate<LibraryCategory>(
    ENTITIES.LIB_LIBRARY_CATEGORY.name,
    data,
  );
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
  );
}

// ── Suppliers ─────────────────────────────────────────────────────────────────

export async function listLibrarySuppliers(): Promise<LibrarySupplier[]> {
  return domainListRawQuery<LibrarySupplier>(
    ENTITIES.LIB_SUPPLIER.name,
    "order(createdDt=desc)",
    true,
  );
}

export async function createLibrarySupplier(
  data: LibrarySupplierPayload,
): Promise<LibrarySupplier> {
  return domainCreate<LibrarySupplier>(ENTITIES.LIB_SUPPLIER.name, data);
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
  );
}

// ── Membership ───────────────────────────────────────────────────────────────

export async function listLibraryMemberships(
  collegeId?: number,
  membertype?: "S" | "E",
): Promise<LibraryMembership[]> {
  const filters: Record<string, string | number | boolean> = {};
  if (collegeId) filters["library.college.collegeId"] = collegeId;
  if (membertype) filters.membertype = membertype;
  const query =
    Object.keys(filters).length > 0 ? buildQuery(filters) : undefined;
  const rows = query
    ? await domainListRawQuery<AnyRow>(LIBRARY_API.LIB_MEMBER, query)
    : await domainList<AnyRow>(LIBRARY_API.LIB_MEMBER);
  return rows.map(normalizeMembershipRow);
}

export async function listLibraryMembershipsPaginated(
  page: number,
  size: number,
  collegeId?: number,
): Promise<{ rows: LibraryMembership[]; totalCount: number; page: number }> {
  const query = collegeId
    ? buildQuery({ "library.college.collegeId": collegeId })
    : undefined;
  const result = await domainListPaginated<AnyRow>(
    LIBRARY_API.LIB_MEMBER,
    page,
    size,
    query,
  );
  return {
    ...result,
    rows: result.rows.map(normalizeMembershipRow),
  };
}

export async function getLibraryMembershipById(
  memberShipId: number,
): Promise<LibraryMembership | null> {
  if (!memberShipId) return null;
  try {
    const rows = await domainListRawQuery<AnyRow>(
      LIBRARY_API.LIB_MEMBER,
      buildQuery({ libMemberId: memberShipId }),
    );
    const row = rows[0];
    if (!row) return null;
    return normalizeMembershipRow(row);
  } catch {
    return null;
  }
}

/** Typeahead search — `libraryMemberSearch` (membership id or member name). */
export async function searchLibraryMembers(
  searchText: string,
  libraryId?: number,
): Promise<LibraryMembership[]> {
  const term = searchText.trim();
  if (term.length < 5) return [];

  const params: Record<string, string | number> = { q: term };
  if (libraryId) params.libraryId = libraryId;
  const data = await fetchDetails<unknown>(LIBRARY_API.MEMBER_SEARCH, params);
  return unwrapMemberSearchRows(data).map(normalizeMembershipRow);
}

export async function getLibrarySecurityLibraryId(
  organizationId: number,
  employeeId: number,
): Promise<number | undefined> {
  const data = await getAllRecords<unknown>(
    AFFILIATED_COLLEGES_API.COLLEGE_WISE_DETAILS,
    {
      in_flag: "lib_filters",
      in_org_id: organizationId,
      in_college_id: 0,
      in_course_id: 0,
      in_course_group_id: 0,
      in_course_year_id: 0,
      in_group_section_id: 0,
      in_academic_year_id: 0,
      in_dept_id: 0,
      in_isadmin: 0,
      in_loginuser_empid: employeeId,
      in_loginuser_roleid: 0,
      in_subject: "",
      in_employee: "",
      in_gm_codes: "",
    },
  );
  const result =
    data && typeof data === "object" && "result" in data
      ? (data as { result?: unknown }).result
      : data;
  if (!Array.isArray(result)) return undefined;
  for (const group of result) {
    if (
      !Array.isArray(group) ||
      !isObjectRow(group[0]) ||
      group[0].flag !== "library_list"
    )
      continue;
    const libraryId = Number(group[0].fk_library_id ?? 0);
    return libraryId || undefined;
  }
  return undefined;
}

export async function searchStudentsForLibraryMembership(
  searchText: string,
): Promise<LibraryMembership[]> {
  const term = searchText.trim();
  if (term.length < 5) return [];
  const data = await fetchDetails<unknown>(LIBRARY_API.STUDENT_SEARCH, {
    q: term,
  });
  return unwrapLibraryRows(data).map(normalizeMembershipRow);
}

export async function searchEmployeesForLibraryMembership(
  searchText: string,
): Promise<LibraryMembership[]> {
  const term = searchText.trim();
  if (term.length < 5) return [];
  const data = await fetchDetails<unknown>(LIBRARY_API.EMPLOYEE_SEARCH, {
    q: term,
    empStatus: "ACTV",
  });
  return unwrapLibraryRows(data).map(normalizeMembershipRow);
}

export async function listStudentLibraryMemberships(
  collegeId?: number,
): Promise<LibraryMembership[]> {
  return listLibraryMemberships(collegeId, "S");
}

export async function listEmployeeLibraryMemberships(
  collegeId?: number,
): Promise<LibraryMembership[]> {
  return listLibraryMemberships(collegeId, "E");
}

export async function listStudentsWithoutLibraryMembership(
  collegeId: number,
): Promise<LibraryMembership[]> {
  if (!collegeId) return [];
  const data = await fetchDetails<unknown>(LIBRARY_API.NO_MEMBERSHIP, {
    collegeId,
  });
  return unwrapMemberSearchRows(data).map(normalizeMembershipRow);
}

export async function listEmployeesWithoutLibraryMembership(
  collegeId: number,
): Promise<LibraryMembership[]> {
  if (!collegeId) return [];
  const data = await fetchDetails<unknown>(
    LIBRARY_API.EMPLOYEES_LIB_MEMBERSHIP,
    { collegeId },
  );
  return unwrapMemberSearchRows(data).map(normalizeMembershipRow);
}

export async function findLibraryMembershipForPerson(
  personId: number,
  membertype: "S" | "E",
): Promise<LibraryMembership | null> {
  if (!personId) return null;
  const field =
    membertype === "S" ? "memberStudent.studentId" : "memberEmp.employeeId";
  const rows = await domainListRawQuery<AnyRow>(
    LIBRARY_API.LIB_MEMBER,
    buildQuery({ [field]: personId, isActive: true }),
  );
  return rows.length > 0 ? normalizeMembershipRow(rows[0]!) : null;
}

export async function createLibraryMembership(
  data: LibraryMembershipPayload,
): Promise<LibraryMembership> {
  const row = await domainCreate<AnyRow>(LIBRARY_API.LIB_MEMBER, data);
  return normalizeMembershipRow(row);
}

export async function updateLibraryMembership(
  memberShipId: number,
  data: Partial<LibraryMembershipPayload>,
): Promise<LibraryMembership> {
  const row = await domainUpdate<AnyRow>(
    LIBRARY_API.LIB_MEMBER,
    LIBRARY_API.LIB_MEMBER_BY_ID,
    memberShipId,
    data,
  );
  return normalizeMembershipRow(row);
}

// ── Books & periodicals ───────────────────────────────────────────────────────

export type LibraryRow = Record<string, unknown>;

function normalizeBookRow(row: AnyRow): LibraryRow {
  return {
    ...row,
    bookId: Number(row.bookId ?? 0) || undefined,
    title: String(row.title ?? row.bookTitle ?? ""),
    bookTitle: String(row.bookTitle ?? row.title ?? ""),
    libraryCode: String(row.libraryCode ?? ""),
    noofcopies: row.noofcopies ?? row.noOfCopies,
    availableCopies: row.availableCopies,
    issuedCopies: row.issuedCopies,
  };
}

export async function listCollegesForLibrary(
  organizationId = 0,
  employeeId = 0,
): Promise<AnyRow[]> {
  const procName = AFFILIATED_COLLEGES_API.COLLEGE_WISE_DETAILS.replace(
    "getAllRecords/",
    "",
  );
  const data = await getAllRecords<unknown>(procName, {
    in_flag: "clg_filters",
    in_org_id: organizationId,
    in_college_id: 0,
    in_course_id: 0,
    in_course_group_id: 0,
    in_course_year_id: 0,
    in_group_section_id: 0,
    in_academic_year_id: 0,
    in_dept_id: 0,
    in_isadmin: 0,
    in_loginuser_empid: employeeId,
    in_loginuser_roleid: 0,
    in_subject: "",
    in_employee: "",
    in_gm_codes: "",
  });
  const root = data && typeof data === "object" ? (data as AnyRow) : {};
  const groups = Array.isArray(root.result)
    ? root.result
    : Array.isArray(data)
      ? data
      : [];
  const collegeGroup = groups.find(
    (group) =>
      Array.isArray(group) &&
      group.length > 0 &&
      String((group[0] as AnyRow)?.flag ?? "") === "clg_filters",
  );
  if (!Array.isArray(collegeGroup)) return [];
  const seen = new Set<number>();
  return collegeGroup.reduce<AnyRow[]>((result, rawRow) => {
    const row = rawRow as AnyRow;
    const id = Number(row.fk_college_id ?? row.collegeId ?? 0);
    if (!id || seen.has(id)) return result;
    seen.add(id);
    result.push({
      ...row,
      collegeId: id,
      collegeCode: row.college_code ?? row.collegeCode,
      collegeName: row.college_name ?? row.collegeName,
    });
    return result;
  }, []);
}

export async function listLibrariesByCollege(
  collegeId: number,
): Promise<LibraryDetail[]> {
  if (!collegeId) return [];
  return domainListRawQuery<LibraryDetail>(
    ENTITIES.LIBRARY_DETAIL.name,
    buildQuery({ "College.collegeId": collegeId, isActive: true }),
  );
}

export async function listBookCategoriesByLibrary(
  libraryId: number,
): Promise<LibraryBookCategory[]> {
  if (!libraryId) return [];
  return domainListRawQuery<LibraryBookCategory>(
    ENTITIES.LIB_BOOK_CATEGORY.name,
    `LibraryDetail.libraryId==${libraryId}.and.isActive==true`,
  );
}

export async function listBooksByLibraryAndCategory(
  libraryId: number,
  bookcatId: number,
): Promise<LibraryRow[]> {
  if (!libraryId || !bookcatId) return [];
  const rows = await domainListRawQuery<LibraryRow>(
    ENTITIES.LIB_BOOK.name,
    `libraryDetail.libraryId==${libraryId}.and.bookCategory.bookcatId==${bookcatId}`,
  );
  return rows.map(normalizeBookRow);
}

/** Angular `booksearch` — library + category + title (min 4 chars). */
export async function searchBooksInLibraryCategory(
  libraryId: number,
  bookcatId: number,
  searchText: string,
): Promise<LibraryRow[]> {
  const q = searchText.trim();
  if (!libraryId || !bookcatId || q.length < 4) return [];

  const data = await fetchDetails<unknown>(LIBRARY_API.BOOK_SEARCH, {
    libraryId,
    bookcatId,
    q,
  });
  return unwrapMemberSearchRows(data).map(normalizeBookRow);
}

export async function listLibraryBooks(): Promise<LibraryRow[]> {
  const rows = await domainList<LibraryRow>(ENTITIES.LIB_BOOK.name);
  return rows.map(normalizeBookRow);
}

export async function searchLibraryBooks(
  searchText: string,
): Promise<LibraryRow[]> {
  const q = searchText.trim();
  if (q.length < 2) return [];
  try {
    const data = await fetchDetails<unknown>(LIBRARY_API.BOOK_SEARCH, {
      isActive: "true",
      q,
    });
    return unwrapMemberSearchRows(data).map(normalizeBookRow);
  } catch {
    const all = await listLibraryBooks();
    const needle = q.toLowerCase();
    return all.filter((r) => {
      const title = String(r.title ?? r.bookTitle ?? "").toLowerCase();
      const code = String(r.libraryCode ?? "").toLowerCase();
      return title.includes(needle) || code.includes(needle);
    });
  }
}

export async function listLibraryPeriodicals(): Promise<LibraryRow[]> {
  return domainList<LibraryRow>(ENTITIES.LIB_PERIODICAL.name);
}

export async function listLibraryBookDetails(): Promise<LibraryRow[]> {
  return domainList<LibraryRow>(ENTITIES.LIB_BOOK_DETAIL.name);
}

/** Angular Books Barcode page: records that do not yet have generated barcodes. */
export async function listBooksWithoutGeneratedBarcodes(): Promise<
  LibraryRow[]
> {
  try {
    const data = await fetchDetails<unknown>(
      LIBRARY_API.GET_BOOKS_BARCODE_NOT_GENERATED_RECORDS,
    );
    return unwrapMemberSearchRows(data).map(normalizeBookDetailRow);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/no\s+record(?:\(s\)|s)?/i.test(message)) return [];
    throw error;
  }
}

function dedupeBookDetailsByAccession(rows: LibraryRow[]): LibraryRow[] {
  const seen = new Set<string>();
  return rows.filter((r) => {
    const acc = String(r.accessionno ?? r.accessionNo ?? "").trim();
    if (!acc) return true;
    if (seen.has(acc)) return false;
    seen.add(acc);
    return true;
  });
}

/** `bookdetailsearch` — accession, barcode, or title (Angular book issue / books search). */
export async function searchLibraryBookDetails(
  searchText: string,
  libraryId?: number,
): Promise<LibraryRow[]> {
  const q = searchText.trim();
  if (q.length < 2) return [];

  const paramVariants: Record<string, string | number>[] = [
    { isActive: "true", q },
    { q, isActive: "true" },
  ];
  if (libraryId) {
    paramVariants.push({ isActive: "true", q, libraryId }, { q, libraryId });
  }

  for (const params of paramVariants) {
    try {
      const data = await fetchDetails<unknown>(
        LIBRARY_API.BOOK_DETAIL_SEARCH,
        params,
      );
      const rows = unwrapMemberSearchRows(data).map(normalizeBookDetailRow);
      if (rows.length > 0) return dedupeBookDetailsByAccession(rows);
    } catch {
      // try next param shape
    }
  }

  try {
    const all = await listLibraryBookDetails();
    const needle = q.toLowerCase();
    const filtered = all.filter((r) => {
      const title = String(r.bookTitle ?? r.title ?? "").toLowerCase();
      const acc = String(r.accessionno ?? r.accessionNo ?? "").toLowerCase();
      const barcode = String(r.barcode ?? "").toLowerCase();
      return (
        title.includes(needle) ||
        acc.includes(needle) ||
        barcode.includes(needle)
      );
    });
    return dedupeBookDetailsByAccession(filtered.map(normalizeBookDetailRow));
  } catch {
    return [];
  }
}

export async function listReservedBooks(): Promise<LibraryRow[]> {
  try {
    const data = await fetchDetails<unknown>(LIBRARY_API.RESERVE_BOOK, {
      isActive: "true",
    });
    return unwrapMemberSearchRows(data);
  } catch {
    return [];
  }
}

export type BookReturnSearchRow = LibraryMembership & {
  bookDetail?: LibraryRow;
};

function normalizeBookReturnRow(row: AnyRow): BookReturnSearchRow {
  const bookDetailRaw = (row.bookDetail ?? row.book_detail) as
    | AnyRow
    | undefined;
  return {
    ...normalizeMembershipRow(row),
    bookDetail: bookDetailRaw
      ? normalizeBookDetailRow(bookDetailRaw)
      : undefined,
  };
}

/** `bookReturnSearch` — member + issued book by membership id, name, or accession. */
export async function searchBookReturn(
  searchText: string,
  libraryId?: number,
): Promise<BookReturnSearchRow[]> {
  const q = searchText.trim();
  if (q.length < 2) return [];

  const paramVariants: Record<string, string | number>[] = [
    { q, isActive: "true" },
    { q },
  ];
  if (libraryId) {
    paramVariants.push({ q, libraryId }, { q, libraryId, isActive: "true" });
  }

  for (const params of paramVariants) {
    try {
      const data = await fetchDetails<unknown>(
        LIBRARY_API.BOOK_RETURN_SEARCH,
        params,
      );
      const rows = unwrapMemberSearchRows(data).map(normalizeBookReturnRow);
      if (rows.length > 0) {
        const exact = rows.filter(
          (r) =>
            String(r.membershipNo ?? r.memberCode ?? "") === q ||
            String(
              r.bookDetail?.accessionno ?? r.bookDetail?.accessionNo ?? "",
            ) === q,
        );
        return exact.length > 0 ? exact : rows;
      }
    } catch {
      // try next param shape
    }
  }
  return [];
}

function normalizeIssuedBookRow(row: AnyRow): LibraryRow {
  const detail = (row.bookDetail ?? row.book_detail) as AnyRow | undefined;
  return {
    ...row,
    bookIssuedetailsId:
      Number(row.bookIssuedetailsId ?? row.bookIssueDetailsId ?? 0) ||
      undefined,
    accessionno: String(
      row.accessionno ?? detail?.accessionno ?? detail?.accessionNo ?? "",
    ),
    bookTitle: String(
      row.bookTitle ?? detail?.bookTitle ?? detail?.title ?? "",
    ),
    issueFromdate: row.issueFromdate ?? row.issueFromDate,
    issueTodate: row.issueTodate ?? row.issueToDate,
    issueDuedate: row.issueDuedate ?? row.issueDueDate,
    fineTypeName: row.fineTypeName ?? row.fineType,
    isreturned: row.isreturned ?? row.isReturned,
    isrenewaled: row.isrenewaled ?? row.isRenewaled,
    fineTypeCode: row.fineTypeCode,
  };
}

/** Issued books for a member — Angular `BookIssuedetail` by `libMember.memberCode`. */
export async function listIssuedBooksByMemberCode(
  memberCode: string,
): Promise<LibraryRow[]> {
  const code = memberCode.trim();
  if (!code) return [];

  const paramVariants: Record<string, string | number>[] = [
    { "libMember.memberCode": code },
    { memberCode: code },
    { q: code },
  ];

  for (const params of paramVariants) {
    try {
      const data = await fetchDetails<unknown>(
        LIBRARY_API.BOOK_ISSUE_DETAILS,
        params,
      );
      const rows = unwrapMemberSearchRows(data).map(normalizeIssuedBookRow);
      if (rows.length > 0) return rows;
    } catch {
      // try next
    }
  }
  return [];
}

export async function listBooksDue(page = 0, size = 50): Promise<LibraryRow[]> {
  try {
    const data = await fetchDetails<unknown>(LIBRARY_API.BOOK_DUE_LIST, {
      page,
      size,
    });
    const rows = unwrapMemberSearchRows(data);
    return rows.map((row) => {
      const detail = (row.bookDetail ?? row.book_detail) as AnyRow | undefined;
      return {
        ...row,
        accessionno:
          row.accessionno ?? detail?.accessionno ?? detail?.accessionNo,
        bookTitle: row.bookTitle ?? detail?.bookTitle ?? detail?.title,
      };
    });
  } catch {
    return [];
  }
}

export async function listLibrarySettings(): Promise<LibraryRow[]> {
  return domainList<LibraryRow>(ENTITIES.LIB_SETTING.name);
}

export async function listBookRegistrationTypes(): Promise<GeneralDetail[]> {
  return domainListRawQuery<GeneralDetail>(
    ENTITIES.GENERAL_DETAIL.name,
    `GeneralMaster.generalMasterCode==${GM_CODES.BOOK_REG_TYPE}.and.isActive==true`,
  );
}

export async function listLanguageCategories(): Promise<GeneralDetail[]> {
  return domainListRawQuery<GeneralDetail>(
    ENTITIES.GENERAL_DETAIL.name,
    `GeneralMaster.generalMasterCode==${GM_CODES.LANGUAGE}.and.isActive==true`,
  );
}

export async function listBookBindTypes(): Promise<GeneralDetail[]> {
  return domainListRawQuery<GeneralDetail>(
    ENTITIES.GENERAL_DETAIL.name,
    `GeneralMaster.generalMasterCode==${GM_CODES.BOOK_BIND_TYPE}.and.isActive==true`,
  );
}

export async function listLibraryAuthorsByLibrary(
  libraryId: number,
): Promise<LibraryAuthor[]> {
  if (!libraryId) return [];
  return domainListRawQuery<LibraryAuthor>(
    ENTITIES.LIB_AUTHOR.name,
    `LibraryDetail.libraryId==${libraryId}.and.isActive==true`,
  );
}

export async function listLibraryPublishersByLibrary(
  libraryId: number,
): Promise<LibraryPublisher[]> {
  if (!libraryId) return [];
  return domainListRawQuery<LibraryPublisher>(
    ENTITIES.LIB_PUBLISHER.name,
    `LibraryDetail.libraryId==${libraryId}.and.isActive==true`,
  );
}

export async function listLibraryRacksByLibrary(
  libraryId: number,
): Promise<LibraryRack[]> {
  if (!libraryId) return [];
  return domainListRawQuery<LibraryRack>(
    ENTITIES.LIB_RACK.name,
    `LibraryDetail.libraryId==${libraryId}.and.isActive==true`,
  );
}

export async function listReturnBookConditions(): Promise<GeneralDetail[]> {
  return domainListRawQuery<GeneralDetail>(
    ENTITIES.GENERAL_DETAIL.name,
    `GeneralMaster.generalMasterCode==${GM_CODES.RETURN_BOOK_CONDITION}.and.isActive==true`,
  );
}

export async function listActiveLibraryDetails(): Promise<LibraryDetail[]> {
  return domainListRawQuery<LibraryDetail>(
    ENTITIES.LIBRARY_DETAIL.name,
    "isActive==true",
  );
}

export type UpdateLibraryBookPayload = {
  bookId?: number;
  libraryId: number;
  title: string;
  bookcatId: number;
  languageId: number;
  noOfPages?: number | string;
  libraryRefPrefix?: string;
  tags?: string;
  customTags?: string;
  isbn?: string;
  year?: number | string;
  edition?: string;
  vol?: string;
  bindingTypeId?: number;
  subjectHeadings?: string;
  callNumber?: string;
  authorId?: unknown;
  publisherId?: unknown;
  isActive?: boolean;
};

export async function updateLibraryBook(
  bookId: number,
  data: UpdateLibraryBookPayload,
): Promise<LibraryRow> {
  const row = await domainUpdate<AnyRow>(
    ENTITIES.LIB_BOOK.name,
    ENTITIES.LIB_BOOK.pk,
    bookId,
    data,
  );
  return normalizeBookRow(row);
}

export async function listLibraryCurrencyTypes(): Promise<GeneralDetail[]> {
  return domainListRawQuery<GeneralDetail>(
    ENTITIES.GENERAL_DETAIL.name,
    `GeneralMaster.generalMasterCode==${GM_CODES.CURRENCY_TYPE}.and.isActive==true`,
  );
}

function normalizeBookDetailRow(row: AnyRow): LibraryRow {
  return {
    ...row,
    bookDetailsId:
      Number(row.bookDetailsId ?? row.bookDetailId ?? 0) || undefined,
    accessionno: String(row.accessionno ?? row.accessionNo ?? ""),
    bookTitle: String(row.bookTitle ?? row.title ?? ""),
    bookregTypeCode: String(row.bookregTypeCode ?? row.bookregType ?? ""),
    shelveCode: String(row.shelveCode ?? ""),
    bookPosition: String(row.bookPosition ?? ""),
    bookBarcode: row.bookBarcode ?? row.barcode,
    barcode: row.barcode ?? row.bookBarcode,
    isActive: row.isActive !== false && row.is_active !== false,
  };
}

/** Copies by accession — Angular `BookDetail` list by `accessionno`. */
export async function listBookDetailsByAccession(
  accessionno: string,
): Promise<LibraryRow[]> {
  const code = accessionno.trim();
  if (!code) return [];

  const queries = [
    buildQuery({ accessionno: code, isActive: true }),
    buildQuery({ accessionNo: code, isActive: true }),
  ];
  for (const q of queries) {
    try {
      const rows = await domainList<AnyRow>(ENTITIES.LIB_BOOK_DETAIL.name, q);
      if (rows.length > 0) return rows.map(normalizeBookDetailRow);
    } catch {
      // try next
    }
  }

  try {
    const data = await fetchDetails<unknown>(LIBRARY_API.BOOK_DETAIL, {
      accessionno: code,
      q: code,
    });
    const rows = unwrapMemberSearchRows(data).map(normalizeBookDetailRow);
    const exact = rows.filter(
      (r) => String(r.accessionno ?? "").toLowerCase() === code.toLowerCase(),
    );
    return exact.length > 0 ? exact : rows;
  } catch {
    return [];
  }
}

/** Copies for a title — Angular `BookDetail` list by `book.bookId`. */
export async function listBookDetailsByBookId(
  bookId: number,
): Promise<LibraryRow[]> {
  if (!bookId) return [];

  const queries = [
    buildQuery({ "Book.bookId": bookId }),
    buildQuery({ bookId }),
  ];
  for (const q of queries) {
    try {
      const rows = await domainList<AnyRow>(ENTITIES.LIB_BOOK_DETAIL.name, q);
      if (rows.length > 0) return rows.map(normalizeBookDetailRow);
    } catch {
      // try next
    }
  }

  try {
    const data = await fetchDetails<unknown>(LIBRARY_API.BOOK_DETAIL, {
      bookId,
      "book.bookId": bookId,
    });
    return unwrapMemberSearchRows(data).map(normalizeBookDetailRow);
  } catch {
    return [];
  }
}

export async function getLibraryBookDetailById(
  bookDetailsId: number,
): Promise<LibraryRow | null> {
  if (!bookDetailsId) return null;
  try {
    const data = await fetchDetailsById<unknown>(
      LIBRARY_API.BOOK_DETAIL,
      bookDetailsId,
    );
    const rows = unwrapMemberSearchRows(data);
    if (rows.length > 0) return normalizeBookDetailRow(rows[0]!);
    if (data && typeof data === "object")
      return normalizeBookDetailRow(data as AnyRow);
    return null;
  } catch {
    try {
      const rows = await domainList<AnyRow>(
        ENTITIES.LIB_BOOK_DETAIL.name,
        buildQuery({ bookDetailsId }),
      );
      if (rows.length > 0) return normalizeBookDetailRow(rows[0]!);
    } catch {
      // fall through
    }
    return null;
  }
}

export async function getLibraryBookById(
  bookId: number,
): Promise<LibraryRow | null> {
  if (!bookId) return null;
  try {
    const rows = await domainListRawQuery<AnyRow>(
      ENTITIES.LIB_BOOK.name,
      `bookId==${bookId}`,
    );
    return rows.length > 0 ? normalizeBookRow(rows[0]!) : null;
  } catch {
    return null;
  }
}

export async function getLibrarySettingValueByName(
  settingName: string,
): Promise<string> {
  if (!settingName) return "";
  const queries = [
    buildQuery({ settingName, isActive: true }),
    buildQuery({ settingName }),
  ];
  for (const q of queries) {
    try {
      const rows = await domainList<AnyRow>(ENTITIES.LIB_SETTING.name, q);
      if (rows.length > 0) return String(rows[0]?.value ?? "");
    } catch {
      // try next
    }
  }
  return "";
}

export async function getLibraryBookSetting(
  settingName: string,
  libraryId: number,
): Promise<LibraryRow | null> {
  if (!settingName || !libraryId) return null;
  const setting = await domainGetRawQuery<LibraryRow>(
    ENTITIES.LIB_SETTING.name,
    `settingName==${settingName}.and.LibraryDetail.libraryId==${libraryId}.and.isActive==true`,
  );
  return setting;
}

/** Angular `addbook` — creates a title, copies, and purchase details together. */
export async function createLibraryBook(
  bookPayload: LibraryRow,
): Promise<void> {
  await postDetails(LIBRARY_API.ADD_BOOK, bookPayload);
}

/** Angular `addnewbooks` — add copies / purchase details for an existing title. */
export async function addMoreBooks(bookPayload: AnyRow): Promise<void> {
  await postDetails(LIBRARY_API.ADD_NEW_BOOKS, bookPayload);
}

export async function generateLibraryMemberBarcode(): Promise<void> {
  await putDetails(LIBRARY_API.GENERATE_MEMBER_BARCODE, null);
}

export async function generateBooksBarcode(
  accessionNumbers?: string[],
): Promise<void> {
  await putDetails(
    LIBRARY_API.GENERATE_BOOK_BARCODE,
    accessionNumbers?.length ? accessionNumbers : null,
  );
}
