/**
 * TC & No Due Approval — mirrors Angular `apps/certificates/` (TC subset).
 */

import { ENTITIES } from "@/config/constants/entities";
import { CERTIFICATE_API, FEE_API } from "@/config/constants/api";
import { GM_CODES } from "@/config/constants/ui";
import type { CollegeCertificate } from "@/types/college-certificate";
import type {
  ApplyCertificateRequestPayload,
  CertificateSummaryReportRow,
  FeeCertificateIssueRow,
  FeeCertificateWorkflowRow,
  TcApplyCertificatePayload,
  TcStudentCertificatePrintRow,
} from "@/types/tc-no-due";
import type { StudentFeeSearchRow } from "@/types/fees-collection";
import type { GeneralDetail } from "@/types/exam-master";
import { format } from "date-fns";
import {
  buildQuery,
  domainList,
  fetchDetails,
  fetchDetailsEnvelope,
  getAllRecords,
  postDetails,
} from "./crud";
import { getGeneralDetails } from "./exam-master";
import {
  listActiveCollegesForCollegeCertificates,
  listCollegeCertificates,
} from "./admin/college-certificate";
import { listAcademicYearsForCollege } from "./timetable-management";

export {
  listActiveCollegesForCollegeCertificates,
  listAcademicYearsForCollege,
};

export async function listCertificateIssueStatuses(): Promise<GeneralDetail[]> {
  return getGeneralDetails(GM_CODES.CERTIFICATE_STATUS);
}

export async function listStudentStatuses(): Promise<GeneralDetail[]> {
  return getGeneralDetails(GM_CODES.STUDENT_STATUS);
}

function certificateCodeOf(row: Record<string, unknown>): string {
  for (const key of [
    "certifcateCode",
    "certificateCode",
    "certifcate_code",
    "certificate_code",
  ]) {
    const value = String(row[key] ?? "").trim();
    if (value) return value.toUpperCase();
  }
  return "";
}

function filterCollegeCertificatesByCode(
  rows: CollegeCertificate[],
  certCode: "TC" | "NODUE",
): CollegeCertificate[] {
  const target = certCode.toUpperCase();
  const byCode = rows.filter(
    (row) =>
      certificateCodeOf(row as unknown as Record<string, unknown>) === target,
  );
  if (byCode.length > 0) return byCode;

  return rows.filter((row) => {
    const name = String(row.certificateName ?? "").toUpperCase();
    if (certCode === "TC") {
      return (
        name.includes("TRANSFER") ||
        name.includes("T.C") ||
        name === "TC" ||
        name.includes("TRANSFER CERTIFICATE")
      );
    }
    return name.includes("NO DUE") || name.includes("NODUE");
  });
}

/** Angular client filter: `resultList.filter(x => x.certifcateCode === 'TC')`. */
export function pickCollegeCertificateByCode(
  rows: CollegeCertificate[],
  certCode: "TC" | "NODUE",
): CollegeCertificate | undefined {
  const exact = rows.filter((row) => row.certifcateCode === certCode);
  if (exact.length > 0) return exact[0];
  const matches = filterCollegeCertificatesByCode(rows, certCode);
  return matches[0];
}

function collegeIdOf(row: CollegeCertificate): number {
  const raw = row as CollegeCertificate & Record<string, unknown>;
  return Number(raw.collegeId ?? raw["College.collegeId"] ?? 0);
}

function activeCollegeCertificates(
  rows: CollegeCertificate[],
): CollegeCertificate[] {
  return rows.filter((row) => {
    const active = row.isActive as boolean | string | undefined;
    return active !== false && active !== "false";
  });
}

function resolveCollegeCertificates(
  rows: CollegeCertificate[],
  collegeId: number,
  certCode?: "TC" | "NODUE",
): CollegeCertificate[] {
  const forCollege = activeCollegeCertificates(rows).filter(
    (row) => collegeIdOf(row) === collegeId,
  );
  if (!certCode) return forCollege;
  const picked = pickCollegeCertificateByCode(forCollege, certCode);
  return picked ? [picked] : [];
}

/** Angular `listDetailsByTwoIds(CollegeCertificate, true, collegeId, isActive, College.collegeId)`. */
export async function listCollegeCertificatesByCollege(
  collegeId: number,
  certCode?: "TC" | "NODUE",
): Promise<CollegeCertificate[]> {
  if (!collegeId) return [];

  // Angular exact: domain/list/CollegeCertificate?query=isActive==true.and.College.collegeId=={id}
  const angularQuery = buildQuery({
    isActive: true,
    "College.collegeId": collegeId,
  });
  try {
    const rows = await domainList<CollegeCertificate>(
      ENTITIES.COLLEGE_CERTIFICATE.name,
      angularQuery,
    );
    const resolved = resolveCollegeCertificates(rows, collegeId, certCode);
    if (resolved.length > 0) return resolved;
  } catch {
    // fall through to full-list client filter
  }

  // Fallback: same as admin College Certificates page (avoids filtered-query 404 on some deployments)
  try {
    const all = await listCollegeCertificates();
    return resolveCollegeCertificates(all, collegeId, certCode);
  } catch {
    return [];
  }
}

/**
 * Angular certificate-requests `getCertificatesForPricipal`:
 * `listDetailsByThreeIds(CollegeCertificate, organizationId, collegeId, true, Organization.organizationId, College.collegeId, isActive)`.
 */
export async function listCollegeCertificatesByOrgAndCollege(
  organizationId: number,
  collegeId: number,
): Promise<CollegeCertificate[]> {
  if (!organizationId || !collegeId) return [];
  const queries = [
    buildQuery({
      "Organization.organizationId": organizationId,
      "College.collegeId": collegeId,
      isActive: true,
    }),
    buildQuery({
      organizationId,
      "College.collegeId": collegeId,
      isActive: true,
    }),
  ];
  for (const query of queries) {
    try {
      const rows = await domainList<CollegeCertificate>(
        ENTITIES.COLLEGE_CERTIFICATE.name,
        query,
      );
      if (rows.length > 0) return rows;
    } catch {
      // try next
    }
  }
  return listCollegeCertificatesByCollege(collegeId);
}

/**
 * Angular apply-certificate `getData` certificate picker:
 * exclude TC, then remove NODUE / MARKSMEMO / STDIDCRD.
 */
export function filterCertificatesForApply(
  rows: CollegeCertificate[],
): CollegeCertificate[] {
  return rows.filter((row) => {
    const code = String(row.certifcateCode ?? "").toUpperCase();
    return (
      code !== "TC" &&
      code !== "NODUE" &&
      code !== "MARKSMEMO" &&
      code !== "STDIDCRD"
    );
  });
}

/** Angular FeeStudentDataParticular four-id list for Income Tax / Bank particulars. */
export async function listFeeStudentDataParticulars(params: {
  collegeId: number;
  studentId: number;
  feeStructureId: number;
}): Promise<Array<Record<string, unknown>>> {
  const { collegeId, studentId, feeStructureId } = params;
  if (!collegeId || !studentId || !feeStructureId) return [];
  const queries = [
    buildQuery({
      "College.collegeId": collegeId,
      "studentDetail.studentId": studentId,
      "feeStructure.feeStructureId": feeStructureId,
      isActive: true,
    }),
    buildQuery({
      collegeId,
      "studentDetail.studentId": studentId,
      "feeStructure.feeStructureId": feeStructureId,
      isActive: true,
    }),
  ];
  for (const query of queries) {
    try {
      const rows = await domainList<Record<string, unknown>>(
        FEE_API.FEE_STUDENT_DATA_PARTICULAR,
        query,
      );
      if (rows.length > 0) return rows;
    } catch {
      // try next
    }
  }
  return [];
}

export async function searchStudentsForTc(params: {
  collegeId: number;
  academicYearId?: number;
  q: string;
}): Promise<StudentFeeSearchRow[]> {
  const q = params.q.trim();
  // Angular enteredStudent: search only when length > 4
  if (q.length < 5 || !params.collegeId) return [];
  // Angular: studentsearch?q=&collegeId= (no isActive param)
  const query: Record<string, string> = {
    q,
    collegeId: String(params.collegeId),
  };
  if (params.academicYearId) {
    query.academicYearId = String(params.academicYearId);
  }
  const data = await fetchDetails<StudentFeeSearchRow[]>(
    FEE_API.STUDENT_FEE_SEARCH,
    query,
  );
  return Array.isArray(data) ? data : [];
}

export async function listFeeCertificateIssuesByCertificate(
  collegeCertificateId: number,
): Promise<FeeCertificateIssueRow[]> {
  if (!collegeCertificateId) return [];
  const queries = [
    buildQuery(
      {
        "collegeCertificate.collegeCertificateId": collegeCertificateId,
        isActive: true,
      },
      { field: "feeCertificateIssueId", direction: "DESC" },
    ),
    buildQuery(
      { collegeCertificateId, isActive: true },
      { field: "feeCertificateIssueId", direction: "DESC" },
    ),
  ];
  const loaders = [domainList<FeeCertificateIssueRow>];
  for (const query of queries) {
    for (const load of loaders) {
      try {
        const rows = await load(ENTITIES.FEE_CERTIFICATE_ISSUE.name, query);
        if (rows.length > 0) return rows;
      } catch {
        // try next
      }
    }
  }
  return [];
}

export async function listFeeCertificateIssuesByStudentAndCertificate(
  studentId: number,
  collegeCertificateId: number,
): Promise<FeeCertificateIssueRow[]> {
  if (!studentId || !collegeCertificateId) return [];
  const queries = [
    buildQuery(
      {
        "studentDetail.studentId": studentId,
        "CollegeCertificate.collegeCertificateId": collegeCertificateId,
      },
      { field: "feeCertificateIssueId", direction: "DESC" },
    ),
    buildQuery(
      {
        "studentDetail.studentId": studentId,
        "collegeCertificate.collegeCertificateId": collegeCertificateId,
      },
      { field: "feeCertificateIssueId", direction: "DESC" },
    ),
    buildQuery(
      { studentId, collegeCertificateId },
      { field: "feeCertificateIssueId", direction: "DESC" },
    ),
  ];
  const loaders = [domainList<FeeCertificateIssueRow>];
  for (const query of queries) {
    for (const load of loaders) {
      try {
        const rows = await load(ENTITIES.FEE_CERTIFICATE_ISSUE.name, query);
        if (rows.length > 0) return rows;
      } catch {
        // try next
      }
    }
  }
  return [];
}

/**
 * Angular student-requests `getStudentCertificateList`:
 * `getDetailsByIdWithSortOrder(FeeCertificateIssue, studentId, 'studentDetail.studentId')`.
 */
export async function listFeeCertificateIssuesByStudent(
  studentId: number,
): Promise<FeeCertificateIssueRow[]> {
  if (!studentId) return [];
  const queries = [
    buildQuery(
      { "studentDetail.studentId": studentId },
      { field: "feeCertificateIssueId", direction: "DESC" },
    ),
    buildQuery(
      { studentId },
      { field: "feeCertificateIssueId", direction: "DESC" },
    ),
  ];
  for (const query of queries) {
    try {
      const rows = await domainList<FeeCertificateIssueRow>(
        ENTITIES.FEE_CERTIFICATE_ISSUE.name,
        query,
      );
      if (rows.length > 0) return rows;
    } catch {
      // try next
    }
  }
  return [];
}

export async function listFeeCertificateWorkflows(
  feeCertificateIssueId: number,
): Promise<FeeCertificateWorkflowRow[]> {
  if (!feeCertificateIssueId) return [];
  const queries = [
    buildQuery({
      "FeeCertificateIssue.feeCertificateIssueId": feeCertificateIssueId,
    }),
    buildQuery({ feeCertificateIssueId }),
  ];
  for (const query of queries) {
    try {
      const rows = await domainList<FeeCertificateWorkflowRow>(
        ENTITIES.FEE_CERTIFICATE_WORKFLOW.name,
        query,
      );
      if (rows.length > 0) return rows;
    } catch {
      // try next
    }
  }
  return [];
}

export async function applyTcCertificateWorkflow(
  payloads: TcApplyCertificatePayload[],
): Promise<void> {
  await postDetails(FEE_API.CERTIFICATE_ISSUE_WORKFLOW, payloads);
}

export async function updateCertificateIssueAmount(
  payload: FeeCertificateIssueRow | FeeCertificateIssueRow[],
): Promise<void> {
  await postDetails(FEE_API.CERTIFICATE_ISSUE_AMOUNT, payload);
}

/**
 * Angular student-requests apply:
 * `addMasterDetails(feeCertificateIssueRequest, request[])`.
 */
export async function submitCertificateIssueRequest(
  payload: ApplyCertificateRequestPayload | ApplyCertificateRequestPayload[],
): Promise<void> {
  await postDetails(FEE_API.CERTIFICATE_ISSUE_REQUEST, payload);
}

export async function getStudentDetailForTc(
  studentId: number,
): Promise<Record<string, unknown> | null> {
  if (!studentId) return null;
  try {
    const data = await fetchDetails<
      Record<string, unknown> | Record<string, unknown>[]
    >("studentdetail", {
      studentId,
    });
    if (data && typeof data === "object" && !Array.isArray(data)) return data;
    if (Array.isArray(data) && data.length > 0)
      return data[0] as Record<string, unknown>;
  } catch {
    return null;
  }
  return null;
}

export async function getTcCertificateIssueProc(params: {
  collegeId: number;
  studentId: number;
  certificateId?: number;
}): Promise<Record<string, unknown> | null> {
  const { collegeId, studentId, certificateId = 108 } = params;
  if (!collegeId || !studentId) return null;
  try {
    const data = await getAllRecords<{ result?: unknown[][] }>(
      FEE_API.GET_FEE_CERTIFICATE_ISSUE,
      {
        in_flag: "tc_certificate",
        in_clg_id: collegeId,
        in_std_id: studentId,
        in_certificate_id: certificateId,
      },
    );
    const row = data?.result?.[0]?.[0];
    return row && typeof row === "object"
      ? (row as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

export async function getStudentCertificatePrintDetails(
  collegeId: number,
  studentId: number,
): Promise<TcStudentCertificatePrintRow | null> {
  if (!collegeId || !studentId) return null;
  try {
    const data = await getAllRecords<{
      result?: TcStudentCertificatePrintRow[][];
    }>(FEE_API.GET_STUDENT_CERT_DETAILS, {
      in_collegeId: collegeId,
      in_studentId: studentId,
    });
    const row = data?.result?.[0]?.[0];
    return row ?? null;
  } catch {
    return null;
  }
}

/**
 * Angular `listByThreeIds(feecertificateissueUrl, studentId, nodueCertId, duration, …)`.
 * TC pages use duration 30; student-requests no-due-certificate uses 3000.
 */
export async function getNoDueCertificateIssue(params: {
  studentId: number;
  collegeCertificateId: number;
  /** Angular `duration` query param — defaults to 30. */
  duration?: number;
}): Promise<{
  details: Record<string, unknown> | null;
  message: string | null;
}> {
  const { studentId, collegeCertificateId, duration = 30 } = params;
  if (!studentId || !collegeCertificateId) {
    return { details: null, message: null };
  }
  try {
    const envelope = await fetchDetailsEnvelope<Record<string, unknown>>(
      FEE_API.CERTIFICATE_ISSUE_POST,
      {
        studentId,
        clgcertificateId: collegeCertificateId,
        duration,
      },
    );
    if (envelope.success) {
      return { details: envelope.data ?? null, message: null };
    }
    return { details: null, message: envelope.message ?? null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unable to load no-due status";
    return { details: null, message: msg };
  }
}

/** Angular `generateTransferCertificateUrl` — returns created issue when present. */
export async function generateTransferCertificate(
  payload: Record<string, unknown>,
): Promise<Record<string, unknown> | null> {
  const data = await postDetails<Record<string, unknown> | null>(
    CERTIFICATE_API.GENERATE_TC,
    payload,
  );
  return data ?? null;
}

/** Angular `generateTcCertificateUrl` + flag `tc_certificate`. */
export async function generateTcCertificatePdf(payload: {
  flag: "tc_certificate";
  collegeId: number;
  studentId: number;
  collegeCertificateId: number;
  feeCertificateIssueId: number;
}): Promise<void> {
  await postDetails(CERTIFICATE_API.GENERATE_TC_CERTIFICATE, payload);
}

export async function postStudentTc(
  payload: Record<string, unknown>,
): Promise<void> {
  await postDetails(CERTIFICATE_API.STUDENT_TC, payload);
}

export async function getCertificateSummaryReport(params: {
  collegeId: number;
  fromDate: string;
  toDate: string;
}): Promise<CertificateSummaryReportRow[]> {
  const { collegeId, fromDate, toDate } = params;
  if (!collegeId) return [];
  try {
    const data = await getAllRecords<{
      result?: CertificateSummaryReportRow[][];
    }>(FEE_API.GET_CERTIFICATE_SUMMARY, {
      in_clg_id: collegeId,
      in_from_Date: fromDate,
      in_to_Date: toDate,
    });
    const rows = data?.result?.[0];
    return Array.isArray(rows) ? rows.map((r, i) => ({ ...r, id: i + 1 })) : [];
  } catch {
    return [];
  }
}

export function appliedOnNow(): string {
  return format(new Date(), "yyyy-MM-dd'T'HH:mm:ssXXX");
}

export function tcTransferDateValue(date: Date): string {
  return format(date, "yyyy-MM-dd'T'HH:mm:ssXXX");
}
