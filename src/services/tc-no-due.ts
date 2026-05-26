/**
 * TC & No Due Approval — mirrors Angular `apps/certificates/` (TC subset).
 */

import { ENTITIES } from '@/config/constants/entities'
import { CERTIFICATE_API, FEE_API } from '@/config/constants/api'
import { GM_CODES } from '@/config/constants/ui'
import type { CollegeCertificate } from '@/types/college-certificate'
import type {
  CertificateSummaryReportRow,
  FeeCertificateIssueRow,
  FeeCertificateWorkflowRow,
  TcApplyCertificatePayload,
  TcStudentCertificatePrintRow,
} from '@/types/tc-no-due'
import type { StudentFeeSearchRow } from '@/types/fees-collection'
import type { GeneralDetail } from '@/types/exam-master'
import { format } from 'date-fns'
import {
  buildQuery,
  domainList,
  fetchDetails,
  getAllRecords,
  postDetails,
} from './crud'
import { getGeneralDetails } from './exam-master'
import { listActiveCollegesForCollegeCertificates } from './admin/college-certificate'
import { listAcademicYearsForCollege } from './timetable-management'

export { listActiveCollegesForCollegeCertificates, listAcademicYearsForCollege }

export async function listCertificateIssueStatuses(): Promise<GeneralDetail[]> {
  return getGeneralDetails(GM_CODES.CERTIFICATE_STATUS)
}

export async function listStudentStatuses(): Promise<GeneralDetail[]> {
  return getGeneralDetails(GM_CODES.STUDENT_STATUS)
}

export async function listCollegeCertificatesByCollege(
  collegeId: number,
  certCode?: 'TC' | 'NODUE',
): Promise<CollegeCertificate[]> {
  if (!collegeId) return []
  const queries = [
    buildQuery({ 'College.collegeId': collegeId, isActive: true }),
    buildQuery({ collegeId, isActive: true }),
  ]
  for (const query of queries) {
    try {
      const rows = await domainList<CollegeCertificate>(ENTITIES.COLLEGE_CERTIFICATE.name, query)
      if (rows.length === 0) continue
      if (!certCode) return rows
      return rows.filter((r) => (r.certifcateCode ?? '').toUpperCase() === certCode)
    } catch {
      // try next query shape
    }
  }
  return []
}

export async function searchStudentsForTc(params: {
  collegeId: number
  academicYearId?: number
  q: string
}): Promise<StudentFeeSearchRow[]> {
  const q = params.q.trim()
  if (q.length < 2 || !params.collegeId) return []
  const base: Record<string, string> = {
    isActive: 'true',
    q,
    collegeId: String(params.collegeId),
  }
  if (params.academicYearId) base.academicYearId = String(params.academicYearId)
  const data = await fetchDetails<StudentFeeSearchRow[]>(FEE_API.STUDENT_FEE_SEARCH, base)
  return Array.isArray(data) ? data : []
}

export async function listFeeCertificateIssuesByCertificate(
  collegeCertificateId: number,
): Promise<FeeCertificateIssueRow[]> {
  if (!collegeCertificateId) return []
  const queries = [
    buildQuery(
      { 'CollegeCertificate.collegeCertificateId': collegeCertificateId, isActive: true },
      { field: 'feeCertificateIssueId', direction: 'DESC' },
    ),
    buildQuery(
      { collegeCertificateId, isActive: true },
      { field: 'feeCertificateIssueId', direction: 'DESC' },
    ),
  ]
  for (const query of queries) {
    try {
      const rows = await domainList<FeeCertificateIssueRow>(ENTITIES.FEE_CERTIFICATE_ISSUE.name, query)
      if (rows.length > 0) return rows
    } catch {
      // try next
    }
  }
  return []
}

export async function listFeeCertificateIssuesByStudentAndCertificate(
  studentId: number,
  collegeCertificateId: number,
): Promise<FeeCertificateIssueRow[]> {
  if (!studentId || !collegeCertificateId) return []
  const queries = [
    buildQuery(
      {
        'StudentDetail.studentId': studentId,
        'CollegeCertificate.collegeCertificateId': collegeCertificateId,
      },
      { field: 'feeCertificateIssueId', direction: 'DESC' },
    ),
    buildQuery({ studentId, collegeCertificateId }, { field: 'feeCertificateIssueId', direction: 'DESC' }),
  ]
  for (const query of queries) {
    try {
      const rows = await domainList<FeeCertificateIssueRow>(ENTITIES.FEE_CERTIFICATE_ISSUE.name, query)
      if (rows.length > 0) return rows
    } catch {
      // try next
    }
  }
  return []
}

export async function listFeeCertificateWorkflows(
  feeCertificateIssueId: number,
): Promise<FeeCertificateWorkflowRow[]> {
  if (!feeCertificateIssueId) return []
  const queries = [
    buildQuery({ 'FeeCertificateIssue.feeCertificateIssueId': feeCertificateIssueId }),
    buildQuery({ feeCertificateIssueId }),
  ]
  for (const query of queries) {
    try {
      const rows = await domainList<FeeCertificateWorkflowRow>(
        ENTITIES.FEE_CERTIFICATE_WORKFLOW.name,
        query,
      )
      if (rows.length > 0) return rows
    } catch {
      // try next
    }
  }
  return []
}

export async function applyTcCertificateWorkflow(
  payloads: TcApplyCertificatePayload[],
): Promise<void> {
  await postDetails(FEE_API.CERTIFICATE_ISSUE_WORKFLOW, payloads)
}

export async function updateCertificateIssueAmount(
  payload: FeeCertificateIssueRow | FeeCertificateIssueRow[],
): Promise<void> {
  await postDetails(FEE_API.CERTIFICATE_ISSUE_AMOUNT, payload)
}

export async function getStudentDetailForTc(studentId: number): Promise<Record<string, unknown> | null> {
  if (!studentId) return null
  try {
    const data = await fetchDetails<Record<string, unknown> | Record<string, unknown>[]>('studentdetail', {
      studentId,
    })
    if (data && typeof data === 'object' && !Array.isArray(data)) return data
    if (Array.isArray(data) && data.length > 0) return data[0] as Record<string, unknown>
  } catch {
    return null
  }
  return null
}

export async function getTcCertificateIssueProc(params: {
  collegeId: number
  studentId: number
  certificateId?: number
}): Promise<Record<string, unknown> | null> {
  const { collegeId, studentId, certificateId = 108 } = params
  if (!collegeId || !studentId) return null
  try {
    const data = await getAllRecords<{ result?: unknown[][] }>(FEE_API.GET_FEE_CERTIFICATE_ISSUE, {
      in_flag: 'tc_certificate',
      in_clg_id: collegeId,
      in_std_id: studentId,
      in_certificate_id: certificateId,
    })
    const row = data?.result?.[0]?.[0]
    return row && typeof row === 'object' ? (row as Record<string, unknown>) : null
  } catch {
    return null
  }
}

export async function getStudentCertificatePrintDetails(
  collegeId: number,
  studentId: number,
): Promise<TcStudentCertificatePrintRow | null> {
  if (!collegeId || !studentId) return null
  try {
    const data = await getAllRecords<{ result?: TcStudentCertificatePrintRow[][] }>(
      FEE_API.GET_STUDENT_CERT_DETAILS,
      { in_collegeId: collegeId, in_studentId: studentId },
    )
    const row = data?.result?.[0]?.[0]
    return row ?? null
  } catch {
    return null
  }
}

export async function generateTransferCertificate(payload: Record<string, unknown>): Promise<void> {
  await postDetails(CERTIFICATE_API.GENERATE_TC, payload)
}

export async function postStudentTc(payload: Record<string, unknown>): Promise<void> {
  await postDetails(CERTIFICATE_API.STUDENT_TC, payload)
}

export async function getCertificateSummaryReport(params: {
  collegeId: number
  fromDate: string
  toDate: string
}): Promise<CertificateSummaryReportRow[]> {
  const { collegeId, fromDate, toDate } = params
  if (!collegeId) return []
  try {
    const data = await getAllRecords<{ result?: CertificateSummaryReportRow[][] }>(
      FEE_API.GET_CERTIFICATE_SUMMARY,
      { in_clg_id: collegeId, in_from_Date: fromDate, in_to_Date: toDate },
    )
    const rows = data?.result?.[0]
    return Array.isArray(rows) ? rows.map((r, i) => ({ ...r, id: i + 1 })) : []
  } catch {
    return []
  }
}

export function appliedOnNow(): string {
  return format(new Date(), 'yyyy-MM-dd HH:mm:ss')
}
