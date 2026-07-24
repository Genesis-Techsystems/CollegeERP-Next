import { CERTIFICATE_API, FEE_API } from "@/config/constants/api";
import type { StudentFeeSearchRow } from "@/types/fees-collection";
import type { FeeReceiptRow } from "@/types/fees-collection";
import { fetchDetails, getAllRecords, postDetails } from "./crud";

/** Angular bonafied-certificate hardcoded `collegeCertificateId`. */
export const BONAFIDE_COLLEGE_CERTIFICATE_ID = 106;

/** Angular bonafied-certificate hardcoded `applicationStatusId`. */
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
  collegeCertificateId: number;
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
 * Angular `getStudentTcDetails` — `getAllRecords/s_get_fee_certificate_issue` with cert id 106.
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
      in_certificate_id: BONAFIDE_COLLEGE_CERTIFICATE_ID,
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
