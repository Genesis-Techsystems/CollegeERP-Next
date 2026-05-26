import { getSecuredValue, setSecuredValue } from '@/common/generic-functions'
import { UNIV_BULK_UPLOAD_TYPES } from '@/common/affiliated-colleges-constants'
import type { AffiliatedSummaryRow } from '@/types/affiliated-colleges'

export const APPROVAL_UPLOAD_STORAGE = {
  student: 'approvalUpload.student',
  subject: 'approvalUpload.subject',
  attendance: 'approvalUpload.attendance',
  examReg: 'approvalUpload.examReg',
  examFee: 'approvalUpload.examFee',
  studentFee: 'approvalUpload.studentFee',
  examMarks: 'approvalUpload.examMarks',
} as const

export type ApprovalUploadContextRow = AffiliatedSummaryRow

export function setApprovalUploadContext(
  key: (typeof APPROVAL_UPLOAD_STORAGE)[keyof typeof APPROVAL_UPLOAD_STORAGE],
  row: ApprovalUploadContextRow,
): void {
  setSecuredValue(key, row)
}

export function getApprovalUploadContext(
  key: (typeof APPROVAL_UPLOAD_STORAGE)[keyof typeof APPROVAL_UPLOAD_STORAGE],
): ApprovalUploadContextRow | null {
  const v = getSecuredValue<ApprovalUploadContextRow>(key)
  return v === false ? null : v
}

export function storageKeyForFileType(typeId: number): (typeof APPROVAL_UPLOAD_STORAGE)[keyof typeof APPROVAL_UPLOAD_STORAGE] | null {
  switch (typeId) {
    case UNIV_BULK_UPLOAD_TYPES.STUDENT:
      return APPROVAL_UPLOAD_STORAGE.student
    case UNIV_BULK_UPLOAD_TYPES.SUBJECT:
      return APPROVAL_UPLOAD_STORAGE.subject
    case UNIV_BULK_UPLOAD_TYPES.ATTENDANCE:
      return APPROVAL_UPLOAD_STORAGE.attendance
    case UNIV_BULK_UPLOAD_TYPES.EXAM_REGISTRATION:
      return APPROVAL_UPLOAD_STORAGE.examReg
    case UNIV_BULK_UPLOAD_TYPES.EXAM_FEE:
      return APPROVAL_UPLOAD_STORAGE.examFee
    case UNIV_BULK_UPLOAD_TYPES.STUDENT_FEE:
      return APPROVAL_UPLOAD_STORAGE.studentFee
    case UNIV_BULK_UPLOAD_TYPES.EXAM_MARKS:
      return APPROVAL_UPLOAD_STORAGE.examMarks
    default:
      return null
  }
}

export function buildApprovalDataDetails(row: ApprovalUploadContextRow): string {
  const parts = [
    row.college_code,
    row.academic_year,
    row.course_code,
    row.group_code,
    row.course_year_code,
    row.type_name,
  ].filter((p) => p != null && String(p).trim() !== '')
  return parts.map(String).join(' / ')
}
