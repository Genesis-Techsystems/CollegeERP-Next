import type { TableColumn } from '@/common/components/table'
import {
  getAffiliatedAttendanceUploadDetails,
  getAffiliatedExamFeeUploadDetails,
  getAffiliatedExamMarksUploadDetails,
  getAffiliatedExamRegUploadDetails,
  getAffiliatedStudentUploadDetails,
  getAffiliatedSubjectUploadDetails,
} from '@/services'
import { UNIV_AFFILIATED_STORAGE } from './univ-affiliated-storage'

type AnyRow = Record<string, unknown>

export type UnivUploadDetailKind =
  | 'view-students-data'
  | 'view-subjects-data'
  | 'view-attendance-data'
  | 'view-exam-reg-data'
  | 'view-exam-fee-data'
  | 'view-student-fee-data'
  | 'view-student-marks-data'

export type UnivUploadDetailConfig = {
  title: string
  breadcrumbLabel: string
  storageKey: (typeof UNIV_AFFILIATED_STORAGE)[keyof typeof UNIV_AFFILIATED_STORAGE]
  exportFileName: string
  loadRows: (univUploadFileId: number) => Promise<AnyRow[]>
  /** `subjects` builds dynamic subject-code columns from raw rows. */
  tableMode?: 'fixed' | 'subjects'
  columns?: TableColumn<AnyRow>[]
}

function col(id: string, label: string, width = 12): TableColumn<AnyRow> {
  return { id, label, width }
}

export const UNIV_UPLOAD_DETAIL_CONFIG: Record<UnivUploadDetailKind, UnivUploadDetailConfig> = {
  'view-students-data': {
    title: 'Students Data',
    breadcrumbLabel: 'Students Data',
    storageKey: UNIV_AFFILIATED_STORAGE.studentBulk,
    exportFileName: 'Student_Data',
    loadRows: getAffiliatedStudentUploadDetails,
    columns: [
      col('sno', 'SNo', 5),
      col('hallticket', 'Hall Ticket No', 10),
      col('firstName', 'Student Name', 14),
      col('course', 'Course', 10),
      col('batch', 'Batch', 8),
      col('dateOfBirth', 'Date Of Birth', 10),
      col('studentEmailID', 'Email', 14),
      col('mobile', 'Mobile', 10),
      col('fatherName', 'Father Name', 12),
      col('fatherMobile', 'Father Mobile', 10),
    ],
  },
  'view-subjects-data': {
    title: 'Subjects Data',
    breadcrumbLabel: 'Subjects Data',
    storageKey: UNIV_AFFILIATED_STORAGE.subjectBulk,
    exportFileName: 'Subjects_Data',
    loadRows: getAffiliatedSubjectUploadDetails,
    tableMode: 'subjects',
  },
  'view-attendance-data': {
    title: 'Attendance Data',
    breadcrumbLabel: 'Attendance Data',
    storageKey: UNIV_AFFILIATED_STORAGE.attendanceBulk,
    exportFileName: 'Attendance_Data',
    loadRows: getAffiliatedAttendanceUploadDetails,
    columns: [
      col('sno', 'SNo', 5),
      col('hallticketno', 'Hall Ticket No', 12),
      col('courseyearcode', 'Course Year', 10),
      col('academicyear', 'Academic Year', 10),
      col('regulationcode', 'Regulation', 10),
      col('from_date', 'From Date', 10),
      col('to_date', 'To Date', 10),
    ],
  },
  'view-exam-reg-data': {
    title: 'Exam Registration Data',
    breadcrumbLabel: 'Exam Registration Data',
    storageKey: UNIV_AFFILIATED_STORAGE.examRegBulk,
    exportFileName: 'Exam_Registration_Data',
    loadRows: getAffiliatedExamRegUploadDetails,
    columns: [
      col('sno', 'SNo', 5),
      col('hallticketno', 'Hall Ticket No', 12),
      col('courseyearcode', 'Course Year', 10),
      col('academicyear', 'Academic Year', 10),
      col('regulationcode', 'Regulation', 10),
      col('subjectcode', 'Subject Code', 10),
    ],
  },
  'view-exam-fee-data': {
    title: 'Exam Fee Data',
    breadcrumbLabel: 'Exam Fee Data',
    storageKey: UNIV_AFFILIATED_STORAGE.examFeeBulk,
    exportFileName: 'Exam_Fee_Data',
    loadRows: getAffiliatedExamFeeUploadDetails,
    columns: [
      col('sno', 'SNo', 5),
      col('hallticketno', 'Hall Ticket No', 12),
      col('courseyearcode', 'Course Year', 10),
      col('academicyear', 'Academic Year', 10),
      col('regulationcode', 'Regulation', 10),
      col('examType', 'Exam Type', 10),
      col('regyear', 'Reg Year', 8),
      col('subjectcode', 'Subject Code', 10),
      col('Amount', 'Amount', 8),
    ],
  },
  'view-student-fee-data': {
    title: 'Student Fee Data',
    breadcrumbLabel: 'Student Fee Data',
    storageKey: UNIV_AFFILIATED_STORAGE.studentFeeBulk,
    exportFileName: 'Student_Fee_Data',
    loadRows: async () => [],
    columns: [col('sno', 'SNo', 5)],
  },
  'view-student-marks-data': {
    title: 'Student Marks Data',
    breadcrumbLabel: 'Student Marks Data',
    storageKey: UNIV_AFFILIATED_STORAGE.examMarksBulk,
    exportFileName: 'Student_Marks_Data',
    loadRows: getAffiliatedExamMarksUploadDetails,
    columns: [
      col('sno', 'SNo', 5),
      col('hallticketno', 'Hall Ticket No', 12),
      col('courseyearcode', 'Course Year', 10),
      col('academicyear', 'Academic Year', 10),
      col('regulationcode', 'Regulation', 10),
      col('examType', 'Exam Type', 10),
      col('subjectcode', 'Subject Code', 10),
      col('marks', 'Marks', 8),
    ],
  },
}
