export type AffiliatedPageKind = 'summary' | 'bulk-upload' | 'report' | 'approval' | 'assign' | 'view'

export type AffiliatedPageConfig = {
  slug: string
  title: string
  kind: AffiliatedPageKind
  /** Summary grid → upload navigation target (Angular `openPage`). */
  uploadPath?: string
  /** Stored proc `in_flag` for `s_get_affilated_college_summary_details` (report pages). */
  summaryProcFlag?: string
  showBackToHub?: boolean
  /** Student subject summary — regulation filter + `s_pop_univ_upload_std_subjects`. */
  trackRegulation?: boolean
}

export const AFFILIATED_HUB_CARDS: {
  step: number
  title: string
  description: string
  href: string
}[] = [
  { step: 1, title: 'Student Data Upload', description: 'Upload Affiliated College Students Data.', href: '/affiliated-colleges/student-summary' },
  { step: 2, title: 'Student Dost Upload', description: 'Upload Affiliated College Student Dost.', href: '/affiliated-colleges/student-dost-upload-summary' },
  { step: 3, title: 'Student Subjects Upload', description: 'Upload Affiliated College Student Subjects.', href: '/affiliated-colleges/student-subject-summary' },
  { step: 4, title: 'Students Attendance Data Upload', description: 'Upload Affiliated College Students Attendance Data.', href: '/affiliated-colleges/student-attendance-summary' },
  { step: 5, title: 'Students Fee Data Upload', description: 'Upload Affiliated College Students Fee Data.', href: '/affiliated-colleges/college-student-fee-bulk-upload' },
  { step: 6, title: 'Students Exam Registration Data Upload', description: 'Upload Affiliated College Students Exam Registration.', href: '/affiliated-colleges/student-exam-registration-summary' },
  { step: 7, title: 'Students Exam Fee Data Upload', description: 'Upload Affiliated College Students Exam Fee Data.', href: '/affiliated-colleges/student-exam-fee-summary' },
  { step: 8, title: 'Students Internal Exam Marks Upload', description: 'Upload Affiliated College Students Internal Exam Data.', href: '/affiliated-colleges/student-internal-maks-summary' },
  { step: 9, title: 'Students External Exam Marks Upload', description: 'Upload Affiliated College Students External Theory Marks.', href: '/affiliated-colleges/student-external-marks-summary' },
  { step: 10, title: 'Students Signatures Upload', description: 'Affiliated Colleges Students Signatures Upload.', href: '/affiliated-colleges/student-signature-summary' },
  { step: 11, title: 'Students Exam Form Upload', description: 'Affiliated Colleges Students Exam Form Upload.', href: '/affiliated-colleges/student-examform-summary' },
  { step: 12, title: 'Students Photo Upload', description: 'Affiliated Colleges Students Photo Upload.', href: '/affiliated-colleges/student-photo-summary' },
]

const SUMMARY_UPLOAD: Record<string, string> = {
  'student-summary': 'college-student-bulk-upload',
  'student-dost-upload-summary': 'college-student-dost-upload',
  'student-subject-summary': 'college-student-subjects',
  'student-attendance-summary': 'college-student-attendance-upload',
  'student-exam-registration-summary': 'college-student-exam-fee-registration',
  'student-exam-fee-summary': 'college-student-exam-fee-bulk-upload',
  'student-internal-maks-summary': 'college-student-internalexam-data-upload',
  'student-external-marks-summary': 'college-student-externalexam-data-upload',
  'student-signature-summary': 'signature-bulk-upload',
  'student-examform-summary': 'student-exam-form-bulk-upload',
  'student-photo-summary': 'photos-signature-bulk-upload',
}

function summaryPage(
  slug: string,
  title: string,
  extras?: Partial<AffiliatedPageConfig>,
): AffiliatedPageConfig {
  return {
    slug,
    title,
    kind: 'summary',
    uploadPath: SUMMARY_UPLOAD[slug],
    showBackToHub: true,
    ...extras,
  }
}

export const AFFILIATED_PAGE_CONFIG: Record<string, AffiliatedPageConfig> = {
  'college-bulk-uploads': { slug: 'college-bulk-uploads', title: 'Affiliated College Bulk Uploads', kind: 'summary' },
  ...Object.fromEntries(
    (
      [
        ['student-summary', 'Student Summary'],
        ['student-dost-upload-summary', 'Student Dost Upload Summary'],
        [
          'student-subject-summary',
          'Student Subject Summary',
          { trackRegulation: true },
        ],
        ['student-attendance-summary', 'Student Attendance Summary'],
        ['student-exam-registration-summary', 'Student Exam Registration Summary'],
        ['student-exam-fee-summary', 'Student Exam Fee Summary'],
        ['student-internal-maks-summary', 'Student Internal Marks Summary'],
        ['student-external-marks-summary', 'Student External Marks Summary'],
        ['student-signature-summary', 'Student Signature Summary'],
        ['student-examform-summary', 'Student Exam Form Summary'],
        ['student-photo-summary', 'Student Photo Summary'],
      ] as [string, string, Partial<AffiliatedPageConfig>?][]
    ).map(([slug, title, extras]) => [slug, summaryPage(slug, title, extras)]),
  ),
  'affiliated-college-exam-payments': {
    slug: 'affiliated-college-exam-payments',
    title: 'Affiliated College Exam Payments',
    kind: 'report',
  },
  'university-affiliated-colleges': {
    slug: 'university-affiliated-colleges',
    title: 'University Affiliated Colleges Summary',
    kind: 'report',
    summaryProcFlag: 'uploaded_files_summary',
  },
  'college-uploads-approval': {
    slug: 'college-uploads-approval',
    title: 'College Uploads Approval',
    kind: 'approval',
  },
  'assign-student-subjects': { slug: 'assign-student-subjects', title: 'Assign Student Subjects', kind: 'assign' },
  'update-student-subjects': { slug: 'update-student-subjects', title: 'Update Student Subjects', kind: 'assign' },
  'college-student-bulk-upload': { slug: 'college-student-bulk-upload', title: 'College Student Bulk Upload', kind: 'bulk-upload', showBackToHub: true },
  'college-student-dost-upload': { slug: 'college-student-dost-upload', title: 'College Student Dost Upload', kind: 'bulk-upload', showBackToHub: true },
  'college-student-subjects': { slug: 'college-student-subjects', title: 'College Student Subjects Upload', kind: 'bulk-upload', showBackToHub: true },
  'college-student-fee-bulk-upload': { slug: 'college-student-fee-bulk-upload', title: 'College Student Fee Bulk Upload', kind: 'bulk-upload', showBackToHub: true },
  'college-student-exam-fee-registration': { slug: 'college-student-exam-fee-registration', title: 'College Student Exam Fee Registration', kind: 'bulk-upload', showBackToHub: true },
  'college-student-exam-fee-bulk-upload': { slug: 'college-student-exam-fee-bulk-upload', title: 'College Student Exam Fee Bulk Upload', kind: 'bulk-upload', showBackToHub: true },
  'college-student-internalexam-data-upload': { slug: 'college-student-internalexam-data-upload', title: 'Internal Exam Data Upload', kind: 'bulk-upload', showBackToHub: true },
  'college-student-externalexam-data-upload': { slug: 'college-student-externalexam-data-upload', title: 'External Exam Data Upload', kind: 'bulk-upload', showBackToHub: true },
  'college-student-exaternal-labexam-data-upload': { slug: 'college-student-exaternal-labexam-data-upload', title: 'External Lab Exam Data Upload', kind: 'bulk-upload', showBackToHub: true },
  'college-student-attendance-upload': { slug: 'college-student-attendance-upload', title: 'College Student Attendance Upload', kind: 'bulk-upload', showBackToHub: true },
  'signature-bulk-upload': { slug: 'signature-bulk-upload', title: 'Signature Bulk Upload', kind: 'bulk-upload', showBackToHub: true },
  'photos-signature-bulk-upload': { slug: 'photos-signature-bulk-upload', title: 'Photos & Signature Bulk Upload', kind: 'bulk-upload', showBackToHub: true },
  'student-exam-form-bulk-upload': { slug: 'student-exam-form-bulk-upload', title: 'Student Exam Form Bulk Upload', kind: 'bulk-upload', showBackToHub: true },
  'university-affiliated-colleges/view-attendance-data': { slug: 'university-affiliated-colleges/view-attendance-data', title: 'View Attendance Data', kind: 'view' },
  'university-affiliated-colleges/view-students-data': { slug: 'university-affiliated-colleges/view-students-data', title: 'View Students Data', kind: 'view' },
  'university-affiliated-colleges/view-subjects-data': { slug: 'university-affiliated-colleges/view-subjects-data', title: 'View Subjects Data', kind: 'view' },
  'university-affiliated-colleges/view-exam-reg-data': { slug: 'university-affiliated-colleges/view-exam-reg-data', title: 'View Exam Registration Data', kind: 'view' },
  'university-affiliated-colleges/view-exam-fee-data': { slug: 'university-affiliated-colleges/view-exam-fee-data', title: 'View Exam Fee Data', kind: 'view' },
  'university-affiliated-colleges/view-student-fee-data': { slug: 'university-affiliated-colleges/view-student-fee-data', title: 'View Student Fee Data', kind: 'view' },
  'university-affiliated-colleges/view-student-marks-data': { slug: 'university-affiliated-colleges/view-student-marks-data', title: 'View Student Marks Data', kind: 'view' },
  'university-affiliated-colleges/view-uploaded-files': { slug: 'university-affiliated-colleges/view-uploaded-files', title: 'View Uploaded Files', kind: 'view' },
  'college-uploads-approval/view-std-subjects': { slug: 'college-uploads-approval/view-std-subjects', title: 'View Student Subjects', kind: 'view' },
  'college-uploads-approval/view-student-data': { slug: 'college-uploads-approval/view-student-data', title: 'View Student Data', kind: 'view' },
  'college-uploads-approval/view-std-attendance': { slug: 'college-uploads-approval/view-std-attendance', title: 'View Student Attendance', kind: 'view' },
  'college-uploads-approval/view-std-registration': { slug: 'college-uploads-approval/view-std-registration', title: 'View Student Registration', kind: 'view' },
  'college-uploads-approval/view-std-examfee': { slug: 'college-uploads-approval/view-std-examfee', title: 'View Student Exam Fee', kind: 'view' },
  'college-uploads-approval/view-std-fee': { slug: 'college-uploads-approval/view-std-fee', title: 'View Student Fee', kind: 'view' },
  'college-uploads-approval/view-std-marks': { slug: 'college-uploads-approval/view-std-marks', title: 'View Student Marks', kind: 'view' },
}

export function getAffiliatedConfig(slug: string): AffiliatedPageConfig {
  return (
    AFFILIATED_PAGE_CONFIG[slug] ?? {
      slug,
      title: slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      kind: 'view',
    }
  )
}
