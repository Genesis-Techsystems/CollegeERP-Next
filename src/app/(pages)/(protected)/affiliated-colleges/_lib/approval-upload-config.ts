import type { TableColumn } from '@/common/components/table'
import { APPROVAL_UPLOAD_STORAGE } from './approval-upload-storage'

type AnyRow = Record<string, unknown>

export type ApprovalUploadDetailKind =
  | 'view-student-data'
  | 'view-std-subjects'
  | 'view-std-attendance'
  | 'view-std-registration'
  | 'view-std-examfee'
  | 'view-std-fee'
  | 'view-std-marks'

export type ApprovalUploadDetailConfig = {
  title: string
  breadcrumbLabel: string
  storageKey: (typeof APPROVAL_UPLOAD_STORAGE)[keyof typeof APPROVAL_UPLOAD_STORAGE]
  detailProc: string
  loadProc: string
  exportFileName: string
  tableMode?: 'fixed' | 'subjects' | 'attendance'
  columns?: TableColumn<AnyRow>[]
  extraDetailParams?: (row: AnyRow) => Partial<{
    examId: number
    fromDate: string
    toDate: string
    studentId: number
    fkUnivCollegewisePaymentId: number
  }>
}

function col(id: string, label: string, width = 12): TableColumn<AnyRow> {
  return { id, label, width }
}

export const APPROVAL_UPLOAD_DETAIL_CONFIG: Record<ApprovalUploadDetailKind, ApprovalUploadDetailConfig> = {
  'view-student-data': {
    title: 'Student Data',
    breadcrumbLabel: 'Students Data',
    storageKey: APPROVAL_UPLOAD_STORAGE.student,
    detailProc: 's_pop_univ_upload_std_bulk',
    loadProc: 's_pop_univ_upload_std_bulk',
    exportFileName: 'Students_Data',
    columns: [
      col('sno', 'SI.No', 5),
      col('hallticket', 'Hall Ticket', 10),
      col('firstName', 'Student', 14),
      col('course', 'Program', 18),
      col('batch', 'Batch', 8),
      col('dateOfBirth', 'D.O.B', 10),
      col('studentEmailID', 'Student Email', 14),
      col('mobile', 'Mobile', 10),
      col('fatherName', 'Father Name', 12),
      col('fatherMobile', 'Father Mobile', 10),
    ],
  },
  'view-std-subjects': {
    title: 'Subjects Data',
    breadcrumbLabel: 'Subjects Data',
    storageKey: APPROVAL_UPLOAD_STORAGE.subject,
    detailProc: 's_pop_univ_upload_std_subjects',
    loadProc: 's_pop_univ_upload_std_subjects',
    exportFileName: 'Subjects_Data',
    tableMode: 'subjects',
  },
  'view-std-attendance': {
    title: 'Attendance Data',
    breadcrumbLabel: 'Attendance Data',
    storageKey: APPROVAL_UPLOAD_STORAGE.attendance,
    detailProc: 's_pop_univ_upload_std_attendance',
    loadProc: 's_pop_univ_upload_std_attendance',
    exportFileName: 'Attendance_Data',
    tableMode: 'attendance',
  },
  'view-std-registration': {
    title: 'Exam Registration Data',
    breadcrumbLabel: 'Exam Registration Data',
    storageKey: APPROVAL_UPLOAD_STORAGE.examReg,
    detailProc: 's_pop_univ_upload_std_exam_registration',
    loadProc: 's_pop_univ_upload_std_exam_registration',
    exportFileName: 'Exam_Registration_Data',
    extraDetailParams: (row) => ({ examId: Number(row.fk_exam_id ?? 0) }),
    columns: [
      col('sno', 'SNo', 5),
      col('hallticketno', 'Hall Ticket No', 12),
      col('courseyearcode', 'Course Year', 10),
      col('academicyear', 'Academic Year', 10),
      col('regulationcode', 'Regulation', 10),
      col('subjectcode', 'Subject Code', 10),
    ],
  },
  'view-std-examfee': {
    title: 'Exam Fee Data',
    breadcrumbLabel: 'Exam Fee Data',
    storageKey: APPROVAL_UPLOAD_STORAGE.examFee,
    detailProc: 's_pop_univ_upload_std_wise_exam_fee',
    loadProc: 's_pop_univ_upload_std_wise_exam_fee',
    exportFileName: 'Exam_Fee_Data',
    extraDetailParams: (row) => ({
      examId: Number(row.fk_exam_id ?? 0),
      fkUnivCollegewisePaymentId: 0,
    }),
    columns: [
      col('sno', 'SNo', 5),
      col('hallticketno', 'Hall Ticket No', 12),
      col('courseyearcode', 'Course Year', 10),
      col('examType', 'Exam Type', 10),
      col('subjectcode', 'Subject Code', 10),
      col('Amount', 'Amount', 8),
    ],
  },
  'view-std-fee': {
    title: 'Student Fee Data',
    breadcrumbLabel: 'Student Fee Data',
    storageKey: APPROVAL_UPLOAD_STORAGE.studentFee,
    detailProc: 's_pop_univ_upload_std_wise_fee',
    loadProc: 's_pop_univ_upload_std_wise_fee',
    exportFileName: 'Student_Fee_Data',
    columns: [
      col('sno', 'SNo', 5),
      col('hallticketno', 'Hall Ticket No', 12),
      col('amount', 'Amount', 10),
    ],
  },
  'view-std-marks': {
    title: 'Student Marks Data',
    breadcrumbLabel: 'Student Marks Data',
    storageKey: APPROVAL_UPLOAD_STORAGE.examMarks,
    detailProc: 's_pop_univ_upload_std_exam_marks',
    loadProc: 's_pop_univ_upload_std_exam_marks',
    exportFileName: 'Student_Marks_Data',
    extraDetailParams: (row) => ({ examId: Number(row.fk_exam_id ?? 0) }),
    columns: [
      col('sno', 'SNo', 5),
      col('hallticketno', 'Hall Ticket No', 12),
      col('courseyearcode', 'Course Year', 10),
      col('examType', 'Exam Type', 10),
      col('subjectcode', 'Subject Code', 10),
      col('marks', 'Marks', 8),
    ],
  },
}

export function approvalDetailKindFromSlug(slug: string): ApprovalUploadDetailKind | null {
  const suffix = slug.replace(/^college-uploads-approval\//, '')
  if (suffix in APPROVAL_UPLOAD_DETAIL_CONFIG) {
    return suffix as ApprovalUploadDetailKind
  }
  return null
}
