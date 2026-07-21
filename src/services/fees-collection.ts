import { ENTITIES } from "@/config/constants/entities";
import {
  EMPLOYEE_API,
  FEE_API,
  NEXT_API,
  TRANSPORT_API,
} from "@/config/constants/api";
import type {
  EmployeeProfileRow,
  EmployeeSearchRow,
  FeeDueNotificationRow,
  FeeConcessionRow,
  FeeStudentWiseDiscountPayload,
  FeeReceiptPaymentPayload,
  FeeReceiptRow,
  FeeStudentData,
  FinancialYearRow,
  StudentFeeDueRow,
  FeeManagementSavePayload,
  FeeManagementStdDetailDto,
  FeeManagementStudentRow,
  StudentFeeSearchRow,
  StudentFeeStructureRow,
  TransportAllocationRow,
  FeeParticularWiseReceiptRow,
  FeeStudentParticularRow,
} from "@/types/fees-collection";
import type { GeneralDetail } from "@/types/exam-master";
import type { ApiResponse } from "@/types/api";
import { AppError, parseApiError } from "@/lib/errors";
import { format } from "date-fns";
import { GM_CODES } from "@/config/constants/ui";
import {
  buildQuery,
  domainList,
  domainUpdate,
  fetchDetails,
  getAllRecords,
  postDetails,
  putDetails,
} from "./crud";
import { getGeneralDetails } from "./exam-master";
import { listQuotaOptions } from "./fee-masters";

export type PaginatedStudentFeeDue = {
  rows: StudentFeeDueRow[];
  totalCount: number;
  page: number;
  pageSize: number;
};

export async function listStudentFeeDue(params: {
  collegeId: number;
  academicYearId?: number | null;
  courseId?: number | null;
  courseGroupId?: number | null;
  courseYearId?: number | null;
  quotaId?: number | null;
  page?: number;
  size?: number;
}): Promise<PaginatedStudentFeeDue> {
  const page = params.page ?? 0;
  const size = params.size ?? 50;
  const query = new URLSearchParams({
    collegeId: String(params.collegeId),
    balance: "true",
    page: String(page),
    size: String(size),
    status: "true",
  });

  if (params.academicYearId)
    query.set("academicYearId", String(params.academicYearId));
  if (params.courseId) query.set("courseId", String(params.courseId));
  if (params.courseGroupId)
    query.set("courseGroupId", String(params.courseGroupId));
  if (params.courseYearId)
    query.set("courseYearId", String(params.courseYearId));
  if (params.quotaId) query.set("quotaId", String(params.quotaId));

  const res = await fetch(
    NEXT_API.PROXY(FEE_API.STUDENT_FEE_LIST) + `?${query}`,
    {
      cache: "no-store",
      credentials: "include",
    },
  );

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw parseApiError(res, body);
  }

  const body = (await res.json()) as ApiResponse<StudentFeeDueRow[]> & {
    totalCount?: number;
    page?: number;
    pageSize?: number;
  };

  if (!body.success) {
    throw new AppError(
      "API_ERROR",
      body.message ?? "Failed to load student fee due list",
    );
  }

  const rows = Array.isArray(body.data) ? body.data : [];
  return {
    rows,
    totalCount: Number(body.totalCount ?? rows.length) || rows.length,
    page: Number(body.page ?? page) || page,
    pageSize: Number(body.pageSize ?? size) || size,
  };
}

export async function listStudentFeeStructuresByStudent(
  studentId: number,
  options?: {
    /** Pass `null` to omit status (Angular allocate-structure-to-student). */ status?:
      | string
      | null;
  },
): Promise<StudentFeeStructureRow[]> {
  if (!studentId) return [];
  const params: Record<string, string | number> = { studentId };
  if (options?.status !== null) {
    params.status = options?.status ?? "true";
  }
  const data = await fetchDetails<StudentFeeStructureRow[]>(
    FEE_API.STUDENT_FEE_LIST,
    params,
  );
  const rows = Array.isArray(data) ? data : [];
  return [...rows].sort(
    (a, b) => Number(a.courseYearNo ?? 0) - Number(b.courseYearNo ?? 0),
  );
}

export async function searchStudentsForFeeCollection(
  term: string,
): Promise<StudentFeeSearchRow[]> {
  const q = term.trim();
  if (q.length < 2) return [];
  const data = await fetchDetails<StudentFeeSearchRow[]>(
    FEE_API.STUDENT_FEE_SEARCH,
    {
      isActive: "true",
      q,
    },
  );
  return Array.isArray(data) ? data : [];
}

export async function listCourseYearsForFeeCollection(courseId: number) {
  if (!courseId) return [];
  const queries = [
    buildQuery(
      { "Course.courseId": courseId, isActive: true },
      { field: "sortOrder", direction: "ASC" },
    ),
    buildQuery(
      { courseId, isActive: true },
      { field: "sortOrder", direction: "ASC" },
    ),
  ];
  for (const query of queries) {
    try {
      const rows = await domainList<Record<string, unknown>>(
        ENTITIES.COURSE_YEAR.name,
        query,
      );
      if (rows.length > 0) return rows;
    } catch {
      // try next query shape
    }
  }
  return [];
}

export { listQuotaOptions as listFeeCollectionQuotaOptions };

export async function getFeeStudentData(params: {
  collegeId: number;
  academicYearId: number;
  studentId: number;
  feeStructureId: number;
}): Promise<FeeStudentData | null> {
  const { collegeId, academicYearId, studentId, feeStructureId } = params;
  if (!collegeId || !academicYearId || !studentId || !feeStructureId)
    return null;

  const data = await fetchDetails<FeeStudentData[] | FeeStudentData>(
    FEE_API.FEE_STUDENT_DATA,
    {
      collegeId,
      academicYearId,
      studentId,
      feeStructureId,
    },
  );

  if (Array.isArray(data)) return data[0] ?? null;
  return data ?? null;
}

export async function getFinancialYearForReceiptDate(
  collegeId: number,
  receiptDate: Date,
): Promise<FinancialYearRow[]> {
  if (!collegeId) return [];
  const checkDate = format(receiptDate, "yyyy-MM-dd");
  const data = await fetchDetails<FinancialYearRow[] | FinancialYearRow>(
    FEE_API.FINANCIAL_YEAR_DATE,
    {
      collegeId,
      checkDate,
    },
  );
  return Array.isArray(data) ? data : data ? [data] : [];
}

export type FeePaymentLookups = {
  paymentModes: GeneralDetail[];
  paymentTypes: GeneralDetail[];
  payerTypes: GeneralDetail[];
};

export async function getFeePaymentLookups(): Promise<FeePaymentLookups> {
  const [modes, types, payers] = await Promise.all([
    getGeneralDetails(GM_CODES.PAYMENT_MODE),
    getGeneralDetails(GM_CODES.FEE_PAYMENT_TYPE),
    getGeneralDetails(GM_CODES.PAYER_TYPE),
  ]);
  const withoutOnline = (rows: GeneralDetail[]) =>
    rows.filter(
      (r) => String(r.generalDetailCode ?? "").toUpperCase() !== "ONLINE",
    );
  return {
    paymentModes: withoutOnline(modes),
    paymentTypes: withoutOnline(types),
    payerTypes: payers,
  };
}

export async function listFeeStructureParticularsForPayment(
  feeStructureId: number,
): Promise<Record<string, unknown>[]> {
  if (!feeStructureId) return [];
  const queries = [
    buildQuery({
      "feeStructure.feeStructureId": feeStructureId,
      isActive: true,
    }),
    buildQuery({
      "FeeStructure.feeStructureId": feeStructureId,
      isActive: true,
    }),
    buildQuery({ feeStructureId, isActive: true }),
  ];
  for (const query of queries) {
    try {
      const rows = await domainList<Record<string, unknown>>(
        "FeeStructureParticular",
        query,
      );
      if (rows.length > 0) return rows;
    } catch {
      // try next shape
    }
  }
  return [];
}

export async function generateFeeTransactions(
  feeStdDataId: number,
): Promise<void> {
  if (!feeStdDataId) return;
  await putDetails(`${FEE_API.GENERATE_TRANSACTIONS}/${feeStdDataId}`, {});
}

export async function submitFeeReceipt(
  payload: FeeReceiptPaymentPayload,
): Promise<unknown> {
  return postDetails<unknown>(FEE_API.FEE_RECEIPTS, payload);
}

/** Angular `feeparticularwisepayments` — receipts for one student particular. */
export async function listParticularWiseReceipts(params: {
  feeStructureId: number;
  collegeId: number;
  studentId: number;
  feeParticularsId: number;
  feeStdDataParticularsId: number;
}): Promise<FeeParticularWiseReceiptRow[]> {
  const {
    feeStructureId,
    collegeId,
    studentId,
    feeParticularsId,
    feeStdDataParticularsId,
  } = params;
  if (
    !feeStructureId ||
    !collegeId ||
    !studentId ||
    !feeParticularsId ||
    !feeStdDataParticularsId
  ) {
    return [];
  }
  const data = await fetchDetails<FeeParticularWiseReceiptRow[]>(
    FEE_API.FEE_PARTICULAR_WISE_PAYMENTS,
    {
      feeStructureId,
      collegeId,
      studentId,
      feeParticularsId,
      feeStdDataParticularsId,
    },
  );
  return Array.isArray(data) ? data : [];
}

/** Angular `feestudentwiseparticularlists` — create category particular before first pay. */
export async function createStudentWiseParticulars(
  payload: FeeStudentParticularRow[],
): Promise<FeeStudentParticularRow[]> {
  if (payload.length === 0) {
    throw new AppError("VALIDATION", "Particular details are required");
  }
  const data = await postDetails<
    FeeStudentParticularRow[] | FeeStudentParticularRow
  >(FEE_API.FEE_STUDENT_WISE_PARTICULARS, payload);
  if (Array.isArray(data)) return data;
  return data ? [data] : [];
}

/** Angular `transportallocationforstudent` — current student/employee route info. */
export async function listTransportAllocationForStudent(params: {
  studentId?: number;
  employeeId?: number;
  academicYearId?: number;
  date: string;
}): Promise<TransportAllocationRow[]> {
  const { studentId, employeeId, academicYearId, date } = params;
  if ((!studentId && !employeeId) || !date) return [];
  const query: Record<string, string | number> = { date };
  if (studentId) query.studentId = studentId;
  if (employeeId) query.employeeId = employeeId;
  if (academicYearId) query.academicYearId = academicYearId;
  const data = await fetchDetails<
    TransportAllocationRow[] | TransportAllocationRow
  >(TRANSPORT_API.TRANSPORT_ALLOCATION, query);
  if (Array.isArray(data)) return data;
  return data ? [data] : [];
}

export async function deleteFeeStudentWiseDiscount(
  feeStdDiscountId: number,
): Promise<void> {
  if (!feeStdDiscountId) return;
  const res = await fetch(
    NEXT_API.PROXY(FEE_API.FEE_STUDENT_WISE_DISCOUNT) + `/${feeStdDiscountId}`,
    { method: "DELETE", credentials: "include" },
  );
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw parseApiError(res, body);
  }
  const body = (await res.json()) as ApiResponse<unknown>;
  if (!body.success) {
    throw new AppError(
      "API_ERROR",
      body.message ?? "Failed to delete fee discount",
    );
  }
}

async function openPdfBlobPrint(blob: Blob): Promise<void> {
  const blobUrl = URL.createObjectURL(blob);
  const iframe = document.createElement("iframe");
  iframe.style.display = "none";
  iframe.src = blobUrl;
  document.body.appendChild(iframe);
  iframe.onload = () => {
    iframe.contentWindow?.print();
  };
}

/** Open fee receipt PDF print dialog (`feeReceiptDownload?receiptId=`). */
export async function printFeeReceiptById(receiptId: number): Promise<void> {
  if (!receiptId) return;
  const res = await fetch(
    NEXT_API.PROXY(FEE_API.FEE_RECEIPT_DOWNLOAD) + `?receiptId=${receiptId}`,
    { credentials: "include" },
  );
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw parseApiError(res, body);
  }
  await openPdfBlobPrint(await res.blob());
}

/** Angular fee-receipt-update download: `studentFeeReceiptDownload?studentId=`. */
export async function printStudentFeeReceiptDownload(
  studentId: number,
): Promise<void> {
  if (!studentId) return;
  const res = await fetch(
    NEXT_API.PROXY(FEE_API.STUDENT_FEE_RECEIPT_DOWNLOAD) +
      `?studentId=${studentId}`,
    { credentials: "include" },
  );
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw parseApiError(res, body);
  }
  await openPdfBlobPrint(await res.blob());
}

export async function searchStudentsInCollege(
  collegeId: number,
  term: string,
  options?: { courseId?: number; courseGroupId?: number; includeActive?: boolean },
): Promise<StudentFeeSearchRow[]> {
  const q = term.trim();
  if (!collegeId || q.length < 5) return [];
  const params: Record<string, string> = {
    collegeId: String(collegeId),
    q,
  };
  if (options?.includeActive !== false) params.isActive = "true";
  if (options?.courseId) params.courseId = String(options.courseId);
  if (options?.courseGroupId)
    params.courseGroupId = String(options.courseGroupId);
  const data = await fetchDetails<StudentFeeSearchRow[]>(
    FEE_API.STUDENT_FEE_SEARCH,
    params,
  );
  return Array.isArray(data) ? data : [];
}

/** Fee structures available for a student's course group / year / quota (Angular `feeStructureCourseyrUrl`). */
export async function listFeeStructuresForStudentCourseYear(params: {
  courseGroupId: number;
  courseYearId: number;
  quotaId: number;
  academicYearId?: number;
}): Promise<Record<string, unknown>[]> {
  const { courseGroupId, courseYearId, quotaId, academicYearId } = params;
  if (!courseGroupId || !courseYearId || !quotaId) return [];

  const queries = [
    buildQuery(
      {
        "courseGroup.courseGroupId": courseGroupId,
        "courseYear.courseYearId": courseYearId,
        "quota.generalDetailId": quotaId,
        isActive: true,
      },
      { field: "createdDt", direction: "DESC" },
    ),
    buildQuery(
      {
        courseGroupId,
        courseYearId,
        quotaId,
        isActive: true,
      },
      { field: "createdDt", direction: "DESC" },
    ),
  ];

  for (const query of queries) {
    try {
      const rows = await domainList<Record<string, unknown>>(
        FEE_API.FEE_STRUCTURE_COURSEYR,
        query,
      );
      if (rows.length === 0) continue;
      if (academicYearId) {
        return rows.filter(
          (r) => Number(r.academicYearId ?? 0) === academicYearId,
        );
      }
      return rows;
    } catch {
      // try next query shape
    }
  }
  return [];
}

export async function listFeeReceiptsForStudent(params: {
  studentId: number;
  collegeId: number;
  academicYearId: number;
}): Promise<FeeReceiptRow[]> {
  const { studentId, collegeId, academicYearId } = params;
  if (!studentId || !collegeId || !academicYearId) return [];
  const data = await fetchDetails<FeeReceiptRow[]>(FEE_API.FEE_RECEIPTS, {
    studentId,
    collegeId,
    academicYearId,
  });
  return Array.isArray(data) ? data : [];
}

export async function listStudentFeeReceiptDetails(params: {
  collegeId: number;
  academicYearId: number;
  studentId: number;
  courseYearId?: number;
}): Promise<FeeReceiptRow[]> {
  const { collegeId, academicYearId, studentId, courseYearId = 0 } = params;
  if (!collegeId || !academicYearId || !studentId) return [];

  const data = await getAllRecords<{ result: FeeReceiptRow[][] }>(
    "s_rep_fee_studentdetails",
    {
      in_flag: "fee_student_receipt_details",
      in_college_id: collegeId,
      in_academic_year: academicYearId,
      in_course_id: 0,
      in_course_group_id: 0,
      in_course_year_id: courseYearId,
      in_loginuser_empid: 0,
      in_student_id: studentId,
      in_category_code: "",
      in_particular_code: "",
    },
  );

  const rows = data?.result?.[0];
  return Array.isArray(rows) ? rows : [];
}

/**
 * Angular fee-receipt-update: `DELETE feereceipts/{feeReceiptsId}/{reason}`.
 * When reason is omitted, deletes by id only (legacy callers).
 */
export async function deleteFeeReceipt(
  feeReceiptsId: number,
  reason?: string,
): Promise<void> {
  if (!feeReceiptsId) return;
  const path =
    reason != null && reason.trim() !== ""
      ? `${FEE_API.FEE_RECEIPTS}/${feeReceiptsId}/${encodeURIComponent(reason.trim())}`
      : `${FEE_API.FEE_RECEIPTS}/${feeReceiptsId}`;
  const res = await fetch(NEXT_API.PROXY(path), {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw parseApiError(res, body);
  }
  const body = (await res.json()) as ApiResponse<unknown>;
  if (!body.success) {
    throw new AppError(
      "API_ERROR",
      body.message ?? "Failed to delete fee receipt",
    );
  }
}

export async function syncInitiatedFeePayments(): Promise<string> {
  const data = await fetchDetails<unknown[] | { message?: string }>(
    FEE_API.UPDATE_INITIATED_PAYMENTS,
  );
  if (
    Array.isArray(data) &&
    data[0] &&
    typeof data[0] === "object" &&
    data[0] !== null
  ) {
    const msg = (data[0] as { message?: string }).message;
    if (msg) return msg;
  }
  return "Payment status sync completed.";
}

export async function syncAdmissionInitiatedPayments(): Promise<string> {
  const data = await fetchDetails<{ message?: string } | string>(
    FEE_API.UPDATE_INITIATED_PAYMENTS_ADMISSION,
  );
  if (typeof data === "string") return data;
  if (data && typeof data === "object" && "message" in data) {
    return String(
      (data as { message?: string }).message ??
        "Admission payment sync completed.",
    );
  }
  return "Admission payment sync completed.";
}

export async function saveFeeStudentWiseDiscount(
  payload: FeeStudentWiseDiscountPayload[],
): Promise<unknown> {
  if (payload.length === 0) {
    throw new AppError("VALIDATION", "Discount details are required");
  }
  return postDetails(FEE_API.FEE_STUDENT_WISE_DISCOUNT, payload);
}

export async function saveFeeStudentWiseParticulars(
  payload: Record<string, unknown>[],
): Promise<unknown> {
  if (payload.length === 0) {
    throw new AppError("VALIDATION", "Particular details are required");
  }
  return postDetails(FEE_API.FEE_STUDENT_WISE_PARTICULAR_LIST, payload);
}

export async function deleteFeeStudentWiseParticular(
  feeStdParticularId: number,
): Promise<void> {
  if (!feeStdParticularId) return;
  const res = await fetch(
    NEXT_API.PROXY(FEE_API.FEE_STUDENT_WISE_PARTICULARS) +
      `/${feeStdParticularId}`,
    { method: "DELETE", credentials: "include" },
  );
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw parseApiError(res, body);
  }
  const body = (await res.json()) as ApiResponse<unknown>;
  if (!body.success) {
    throw new AppError(
      "API_ERROR",
      body.message ?? "Failed to delete particular",
    );
  }
}

export async function saveFeeStudentWiseFines(
  payload: Record<string, unknown>[],
): Promise<unknown> {
  if (payload.length === 0) {
    throw new AppError("VALIDATION", "Fine details are required");
  }
  return postDetails(FEE_API.FEE_STUDENT_WISE_FINES, payload);
}

export async function deleteFeeStudentWiseFine(
  feeStdFineId: number,
): Promise<void> {
  if (!feeStdFineId) return;
  const res = await fetch(
    NEXT_API.PROXY(FEE_API.FEE_STUDENT_WISE_FINES) + `/${feeStdFineId}`,
    {
      method: "DELETE",
      credentials: "include",
    },
  );
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw parseApiError(res, body);
  }
  const body = (await res.json()) as ApiResponse<unknown>;
  if (!body.success) {
    throw new AppError("API_ERROR", body.message ?? "Failed to delete fine");
  }
}

export async function saveFeeStudentWiseScholarship(
  payload: Record<string, unknown>[],
): Promise<unknown> {
  if (payload.length === 0) {
    throw new AppError("VALIDATION", "RTF details are required");
  }
  return postDetails(FEE_API.FEE_STUDENT_WISE_SCHOLARSHIP, payload);
}

export async function deleteFeeStudentWiseScholarship(
  feeStdScholorshipId: number,
): Promise<void> {
  if (!feeStdScholorshipId) return;
  const res = await fetch(
    NEXT_API.PROXY(FEE_API.FEE_STUDENT_WISE_SCHOLARSHIP_DELETE) +
      `/${feeStdScholorshipId}`,
    { method: "DELETE", credentials: "include" },
  );
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw parseApiError(res, body);
  }
  const body = (await res.json()) as ApiResponse<unknown>;
  if (!body.success) {
    throw new AppError("API_ERROR", body.message ?? "Failed to delete RTF");
  }
}

export async function updateMinFeePercent(payload: {
  studentId: number;
  academicYearId: number;
  minFeePercent: number;
}): Promise<unknown> {
  return putDetails(FEE_API.UPDATE_MIN_FEE_PERCENT, payload);
}

export async function listFeeConcessions(params: {
  collegeId: number;
  academicYearId?: number | null;
  employeeId?: number;
  page?: number;
  size?: number;
  status?: boolean | string;
}): Promise<{
  rows: FeeConcessionRow[];
  totalCount: number;
  totalValue: number;
}> {
  const page = params.page ?? 0;
  const size = params.size ?? 1000;
  const query = new URLSearchParams({
    collegeId: String(params.collegeId),
    academicYearId: String(params.academicYearId),
    employeeId: String(params.employeeId || 0),
    page: String(page),
    size: String(size),
    status: String(params.status ?? true),
  });
  if (params.employeeId != null && params.employeeId > 0) {
    query.set("employeeId", String(params.employeeId));
  }

  const res = await fetch(
    NEXT_API.PROXY(FEE_API.FEE_CONCESSION_LIST) + `?${query}`,
    {
      cache: "no-store",
      credentials: "include",
    },
  );

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw parseApiError(res, body);
  }

  const body = (await res.json()) as ApiResponse<FeeConcessionRow[]> & {
    totalCount?: number;
    totalValue?: number;
  };

  if (!body.success) {
    throw new AppError(
      "API_ERROR",
      body.message ?? "Failed to load fee concessions",
    );
  }

  return {
    rows: Array.isArray(body.data) ? body.data : [],
    totalCount: Number(body.totalCount ?? 0),
    totalValue: Number(body.totalValue ?? 0),
  };
}

export async function searchEmployeesForTransport(
  term: string,
  collegeId?: number,
): Promise<EmployeeSearchRow[]> {
  const q = term.trim();
  if (q.length < 5) return [];
  const params: Record<string, string | number> = {
    q,
    empStatus: "ACTV",
  };
  if (collegeId) params.collegeId = collegeId;
  const data = await fetchDetails<EmployeeSearchRow[]>(
    FEE_API.EMPLOYEE_SEARCH,
    params,
  );
  return Array.isArray(data) ? data : [];
}

/** Angular `employeedetailsbyid?employeeId=` on faculty transport payment. */
export async function getEmployeeDetailsForTransport(
  employeeId: number,
): Promise<EmployeeProfileRow | null> {
  if (!employeeId) return null;
  const data = await fetchDetails<EmployeeProfileRow>(
    EMPLOYEE_API.DETAILS_BY_USER_ID,
    {
      employeeId,
    },
  );
  return data && typeof data === "object" ? data : null;
}

export async function listTransportAllocationsByEmployee(
  employeeId: number,
): Promise<TransportAllocationRow[]> {
  if (!employeeId) return [];
  try {
    const rows = await domainList<TransportAllocationRow>(
      FEE_API.TRANSPORT_ALLOCATION,
      buildQuery({ "employeeDetail.employeeId": employeeId }),
    );
    if (rows.length > 0) return rows;
  } catch {
    // domain list shape may differ per env — try legacy fetchDetails
  }
  const data = await fetchDetails<
    TransportAllocationRow[] | { resultList?: TransportAllocationRow[] }
  >(FEE_API.TRANSPORT_ALLOCATION, { employeeId, status: "true" });
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object" && Array.isArray(data.resultList))
    return data.resultList;
  return [];
}

export async function listFeeStructuresForAllocation(params: {
  collegeId: number;
  quotaId: number;
  courseId: number;
  batchId?: number;
  academicYearId?: number;
  isAcademicFee: boolean;
}): Promise<Record<string, unknown>[]> {
  const filters: Record<string, string | number | boolean> = {
    "college.collegeId": params.collegeId,
    "course.courseId": params.courseId,
    isAcademicFee: params.isAcademicFee,
    isActive: true,
  };
  if (params.quotaId) filters["quota.generalDetailId"] = params.quotaId;
  if (params.batchId) filters["batch.batchId"] = params.batchId;
  if (params.academicYearId)
    filters["academicYear.academicYearId"] = params.academicYearId;

  const query = buildQuery(filters, { field: "createdDt", direction: "DESC" });
  return domainList<Record<string, unknown>>("FeeStructure", query);
}

export async function mapFeeStructureToStudents(
  payload: unknown,
): Promise<unknown> {
  return postDetails(FEE_API.MAP_FEE_STRUCTURE, payload);
}

/** Angular allocate-structure-to-student: domain update `FeeStudentData` status/reason. */
export async function updateFeeStudentDataStatus(
  feeStdDataId: number,
  payload: Record<string, unknown>,
): Promise<unknown> {
  if (!feeStdDataId) {
    throw new AppError("VALIDATION", "Fee student data id is required");
  }
  return domainUpdate("FeeStudentData", "feeStdDataId", feeStdDataId, payload);
}

/** Angular allocate-fee: `s_pop_student_fee_Structure` with batch_fee_load / ay_fee_load. */
export async function loadStudentFeeStructureAllocation(params: {
  mode: "batch" | "academic";
  feeStructureIds: number[];
}): Promise<void> {
  const ids = params.feeStructureIds.filter((id) => id > 0);
  if (ids.length === 0) {
    throw new AppError("VALIDATION", "Select at least one fee structure");
  }
  const inFlag = params.mode === "academic" ? "ay_fee_load" : "batch_fee_load";
  await getAllRecords("s_pop_student_fee_Structure", {
    in_flag: inFlag,
    in_structure_ids: ids.join(","),
    in_course_group_ids: "",
    in_student_ids: "",
  });
}

export async function sendFeePaymentMailNotification(
  payload: unknown,
): Promise<unknown> {
  return postDetails(FEE_API.SEND_PAYMENT_MAIL, payload);
}

export type FeePaylinkCollegeFilters = {
  filtersData: Record<string, unknown>[];
  academicData: Record<string, unknown>[];
  generalDetails: Record<string, unknown>[];
};

function splitPaylinkFilterGroups(
  groups: Record<string, unknown>[][],
): FeePaylinkCollegeFilters {
  let filtersData: Record<string, unknown>[] = [];
  let academicData: Record<string, unknown>[] = [];
  let generalDetails: Record<string, unknown>[] = [];

  for (const group of groups) {
    if (!Array.isArray(group) || group.length === 0) continue;
    const first = group[0] ?? {};
    if (first.flag === "clg_filters") filtersData = group;
    if (first.clg_filters_ay === "clg_filters_ay") academicData = group;
    if (first.flag === "gm_codes") generalDetails = group;
  }

  if (filtersData.length === 0) {
    const clgGroup = groups.find(
      (g) =>
        Array.isArray(g) &&
        g.length > 0 &&
        String(g[0]?.flag ?? "") === "clg_filters",
    );
    if (clgGroup?.length) filtersData = clgGroup;
  }

  return { filtersData, academicData, generalDetails };
}

/** Angular generate-paylink `getfilterDetails` — college cascade + QUOTA/STUDENTSTATUS gm codes. */
export async function getFeePaylinkCollegeFilters(
  orgId: number,
  employeeId: number,
): Promise<FeePaylinkCollegeFilters> {
  const data = await getAllRecords<{ result: Record<string, unknown>[][] }>(
    "s_get_collegewisedetails_bycode",
    {
      in_flag: "clg_filters,gm_codes",
      in_org_id: orgId || 0,
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
      in_subject: "",
      in_employee: "",
      in_gm_codes: "QUOTA,STUDENTSTATUS",
    },
  );

  const groups = Array.isArray(data?.result) ? data.result : [];
  return splitPaylinkFilterGroups(groups);
}

export async function listFeeDueNotifications(params: {
  collegeId: number;
  courseId: number;
  courseGroupId?: number;
  courseYearId?: number;
  quotaId?: number;
  batchId?: number;
  studentStatusId?: number;
  feeCategoryId?: number;
  feeParticularId?: number;
  studentId?: number;
}): Promise<FeeDueNotificationRow[]> {
  const data = await getAllRecords<{ result: FeeDueNotificationRow[][] }>(
    "s_get_fee_duenotifications",
    {
      in_flag: "Student_due_nofitications",
      in_clg_id: params.collegeId,
      in_course_id: params.courseId,
      in_group_id: params.courseGroupId ?? 0,
      in_year_id: params.courseYearId ?? 0,
      // Angular mistakenly reused collegeId here; keep 0 for section/academic year.
      in_section_id: 0,
      in_ac_yr_id: 0,
      in_quota_id: params.quotaId ?? 0,
      in_fee_type_id: 0,
      in_std_id: params.studentId ?? 0,
      in_category_id: params.feeCategoryId ?? 0,
      in_particulars_id: params.feeParticularId ?? 0,
      in_StdStatus_id: params.studentStatusId ?? 0,
      in_Batch_id: params.batchId ?? 0,
      in_include_expired: 0,
      in_fromdate: "1990-01-01",
      in_todate: "1990-01-01",
    },
  );

  const block = data?.result?.[0];
  return Array.isArray(block) ? block : [];
}

/** Angular `sendPaymentMailNotification` — POST array of `pk_fee_stdduepayment_id`. */
export async function sendFeeDueNotifications(ids: number[]): Promise<unknown> {
  const list = ids.filter((id) => id > 0);
  if (list.length === 0) {
    throw new AppError("VALIDATION", "No due records to notify");
  }
  return postDetails(FEE_API.SEND_PAYMENT_MAIL, list);
}

function readFeeMgmtStr(
  row: Record<string, unknown>,
  ...keys: string[]
): string {
  for (const k of keys) {
    const v = row[k];
    if (v != null) {
      const s = String(v).trim();
      if (s && s !== "-") return s;
    }
  }
  return "";
}

/** Map Spring / proc aliases to the shape used by the fee management grid. */
export function normalizeFeeManagementStudent(
  raw: Record<string, unknown>,
): FeeManagementStudentRow | null {
  const studentId = Number(
    raw.studentId ?? raw.student_id ?? raw.pk_student_id ?? raw.in_std_id ?? 0,
  );
  if (!studentId) return null;

  const dtosRaw =
    raw.feeManagmentStdDetailsDtos ??
    raw.feeManagmentStdDetailsDTOs ??
    raw.fee_management_std_details_dtos;
  const feeManagmentStdDetailsDtos = Array.isArray(dtosRaw)
    ? (dtosRaw as FeeManagementStdDetailDto[])
    : [];

  return {
    ...raw,
    studentId,
    firstName: readFeeMgmtStr(
      raw,
      "firstName",
      "first_name",
      "studentName",
      "student_name",
      "name",
    ),
    hallticketNumber: readFeeMgmtStr(
      raw,
      "hallticketNumber",
      "hall_ticket_number",
      "hallticket_number",
    ),
    rollNumber: readFeeMgmtStr(raw, "rollNumber", "roll_number"),
    admissionNumber: readFeeMgmtStr(
      raw,
      "admissionNumber",
      "admission_number",
      "admission_no",
    ),
    collegeCode: readFeeMgmtStr(raw, "collegeCode", "college_code"),
    academicYear: readFeeMgmtStr(raw, "academicYear", "academic_year"),
    courseCode: readFeeMgmtStr(raw, "courseCode", "course_code"),
    groupCode: readFeeMgmtStr(raw, "groupCode", "group_code"),
    courseYearName: readFeeMgmtStr(raw, "courseYearName", "course_year_name"),
    section: readFeeMgmtStr(raw, "section"),
    mobile: readFeeMgmtStr(
      raw,
      "mobile",
      "mobileNo",
      "mobile_no",
      "student_mobile",
    ),
    fatherName: readFeeMgmtStr(raw, "fatherName", "father_name"),
    studentStatusCode: readFeeMgmtStr(
      raw,
      "studentStatusCode",
      "student_status_code",
    ),
    studentStatusDisplayName: readFeeMgmtStr(
      raw,
      "studentStatusDisplayName",
      "student_status_display_name",
    ),
    collegeId:
      Number(raw.collegeId ?? raw.college_id ?? raw.fk_college_id ?? 0) ||
      undefined,
    academicYearId:
      Number(
        raw.academicYearId ??
          raw.academic_year_id ??
          raw.fk_academic_year_id ??
          0,
      ) || undefined,
    courseGroupId:
      Number(
        raw.courseGroupId ?? raw.course_group_id ?? raw.fk_course_group_id ?? 0,
      ) || undefined,
    courseYearId:
      Number(
        raw.courseYearId ?? raw.course_year_id ?? raw.fk_course_year_id ?? 0,
      ) || undefined,
    studentAppId:
      Number(raw.studentAppId ?? raw.student_app_id ?? 0) || undefined,
    isLateral:
      raw.isLateral != null
        ? Boolean(raw.isLateral)
        : raw.is_lateral != null
          ? Boolean(raw.is_lateral)
          : undefined,
    feeManagmentStdDetailsDtos,
  };
}

export function normalizeFeeManagementStudents(
  rows: unknown,
): FeeManagementStudentRow[] {
  const list = Array.isArray(rows) ? rows : rows != null ? [rows] : [];
  return list
    .map((r) =>
      r && typeof r === "object"
        ? normalizeFeeManagementStudent(r as Record<string, unknown>)
        : null,
    )
    .filter((r): r is FeeManagementStudentRow => r != null);
}

export async function searchFeeManagementStudents(
  term: string,
): Promise<FeeManagementStudentRow[]> {
  const q = term.trim();
  if (q.length < 5) return [];
  const data = await fetchDetails<unknown>(FEE_API.FEE_MANAGEMENT_SEARCH, {
    q,
  });
  return normalizeFeeManagementStudents(data);
}

export async function listFeeManagementStudentsByFilters(params: {
  collegeId: number;
  academicYearId: number;
  courseYearId: number;
  courseGroupId: number;
}): Promise<FeeManagementStudentRow[]> {
  const { collegeId, academicYearId, courseYearId, courseGroupId } = params;
  if (!collegeId || !academicYearId || !courseYearId || !courseGroupId)
    return [];
  const data = await fetchDetails<unknown>(
    FEE_API.GET_FEE_MANAGEMENT_STD_DETAILS,
    {
      collegeId: String(collegeId),
      academicYearId: String(academicYearId),
      courseYearId: String(courseYearId),
      courseGroupId: String(courseGroupId),
    },
  );
  return normalizeFeeManagementStudents(data);
}

export async function listPaySchedulesForFeeManagement(): Promise<
  GeneralDetail[]
> {
  return getGeneralDetails(GM_CODES.PAY_SCHEDULE);
}

export async function saveFeeManagementStudentDetails(
  payload: FeeManagementSavePayload[],
): Promise<unknown> {
  if (payload.length === 0) {
    throw new AppError("VALIDATION", "Please select the students");
  }
  return postDetails(FEE_API.FEE_MANAGEMENT_SAVE, payload);
}

export function patchFeeManagementStudentDetail(
  row: FeeManagementStudentRow,
  patch: Partial<FeeManagementStdDetailDto>,
): FeeManagementStudentRow {
  const dtos = [...(row.feeManagmentStdDetailsDtos ?? [])];
  dtos[0] = { ...(dtos[0] ?? {}), ...patch };
  return { ...row, feeManagmentStdDetailsDtos: dtos };
}

export function buildFeeManagementSavePayloads(
  rows: FeeManagementStudentRow[],
  employeeId: number,
): FeeManagementSavePayload[] {
  return rows.map((row) => {
    const dto = row.feeManagmentStdDetailsDtos?.[0] ?? {};
    const gross =
      dto.grossAmount != null && String(dto.grossAmount).trim() !== ""
        ? Number(dto.grossAmount)
        : null;
    return {
      allotementDate: new Date().toISOString(),
      feeParticularsId: dto.feeParticularsId,
      feeCategoryId: dto.feeCategoryId,
      payScheduleId: dto.payScheduleId,
      employeeId,
      studentId: row.studentId,
      studentName: row.firstName,
      mobileNo: row.mobile,
      fatherName: row.fatherName,
      collegeId: row.collegeId,
      academicYearId: row.academicYearId,
      courseGroupId: row.courseGroupId,
      courseYearId: row.courseYearId,
      isActive: true,
      grossAmount: Number.isFinite(gross) ? gross : null,
      paidAmount: dto.paidAmount ?? null,
      courseAmount: dto.courseAmount ?? null,
      dueAmount: dto.dueAmount ?? null,
      instructions: dto.instructions ?? null,
      isProcessed: dto.isProcessed ?? null,
      enquiryId: dto.enquiryId ?? null,
      studentAppId: row.studentAppId ?? null,
      feeStdDataParticularsId: dto.feeStdDataParticularsId ?? null,
    };
  });
}
