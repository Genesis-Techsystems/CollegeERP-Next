import { CERTIFICATE_API, FEE_API } from "@/config/constants/api";
import type { StudentFeeSearchRow } from "@/types/fees-collection";
import type { FeeReceiptRow } from "@/types/fees-collection";
import { fetchDetails, getAllRecords, postDetails } from "./crud";

/** Angular typo kept — same code used on generate payload. */
export const BONAFIDE_CERTIFICATE_CODE = "Bonafied";

/** Angular bonafied-certificate hardcoded `applicationStatusId` (status, not cert type). */
export const BONAFIDE_APPLICATION_STATUS_ID = 113;

export type BonafideCertificateIssueRow = {
  tc_number?: string;
  batch_name?: string;
  relationLabel?: string;
  course?: string;
  year?: string;
  academicYear?: string;
  dob?: string;
  dobString?: string;
  [key: string]: unknown;
};

export type GenerateBonafideCertificatePayload = {
  isActive: boolean;
  collegeId: number;
  courseYearId: number;
  studentId: number;
  certifcateCode: string;
  applicationStatusId: number;
};

/**
 * Angular `listByIds(studentSearchUrl, q, 'q')` — `studentsearch?q=` only (no collegeId).
 */
export async function searchStudentsForCertificate(
  q: string,
): Promise<StudentFeeSearchRow[]> {
  const term = q.trim();
  if (term.length < 5) return [];
  const data = await fetchDetails<StudentFeeSearchRow[]>(
    FEE_API.STUDENT_FEE_SEARCH,
    { q: term },
  );
  return Array.isArray(data) ? data : [];
}

/** @deprecated Use {@link searchStudentsForCertificate} */
export const searchStudentsForBonafideCertificate =
  searchStudentsForCertificate;

/**
 * Angular `getStudentTcDetails` — `getAllRecords/s_get_fee_certificate_issue`.
 * Was hardcoded `in_certificate_id: 106`; now sends `certifcateCode` like generate.
 */
export async function getBonafideCertificateIssue(params: {
  collegeId: number;
  studentId: number;
}): Promise<BonafideCertificateIssueRow | null> {
  const { collegeId, studentId } = params;
  if (!collegeId || !studentId) return null;
  try {
    const data = await getAllRecords<{
      result?: BonafideCertificateIssueRow[][];
    }>(FEE_API.GET_FEE_CERTIFICATE_ISSUE, {
      in_flag: "tc_certificate",
      in_clg_id: collegeId,
      in_std_id: studentId,
      certifcateCode: BONAFIDE_CERTIFICATE_CODE,
    });
    const row = data?.result?.[0]?.[0];
    return row ?? null;
  } catch {
    return null;
  }
}

/** Angular `listByIds(feeReceiptsUrl, studentId, 'studentId')`. */
export async function listFeeReceiptsByStudent(
  studentId: number,
): Promise<FeeReceiptRow[]> {
  if (!studentId) return [];
  try {
    const data = await fetchDetails<FeeReceiptRow[]>(FEE_API.FEE_RECEIPTS, {
      studentId,
    });
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

/** Angular `add(generateAllStdCertificatesUrl, payload)`. */
export async function generateBonafideCertificate(
  payload: GenerateBonafideCertificatePayload,
): Promise<{ message?: string } | null> {
  const data = await postDetails<{ message?: string } | null>(
    CERTIFICATE_API.GENERATE_ALL_STD_CERTIFICATES,
    payload,
  );
  return data ?? null;
}
