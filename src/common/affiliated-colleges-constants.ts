/** University bulk-upload file type IDs (Angular CONSTANTS.*BulkUpload). */
export const UNIV_BULK_UPLOAD_TYPES = {
  STUDENT: 718,
  SUBJECT: 719,
  ATTENDANCE: 720,
  STUDENT_FEE: 721,
  EXAM_REGISTRATION: 722,
  EXAM_FEE: 723,
  EXAM_MARKS: 724,
  DOST: 725,
} as const;

export type UnivBulkUploadTypeId =
  (typeof UNIV_BULK_UPLOAD_TYPES)[keyof typeof UNIV_BULK_UPLOAD_TYPES];
