import {
  pickNum,
  pickText,
  type FilterRow,
} from '../../_lib/admission-filters'
import type { AnyRow } from '@/app/(pages)/(protected)/admin-student-information-system/edit-student/edit-student-utils'

export {
  DEFAULT_STUDENT_PHOTO,
  addressesMatch,
  buildLangStatus,
  calcAge,
  ensureArray,
  entityOptions,
  gdOptions,
  initLanguageFlags,
  mergeStudentDocuments,
  num,
  parseDate,
  photoSrc,
  toIsoDate,
  txt,
  type AnyRow,
  type StudentDocumentRow,
} from '@/app/(pages)/(protected)/admin-student-information-system/edit-student/edit-student-utils'

export { GM_EDIT_CODES } from '@/app/(pages)/(protected)/admin-student-information-system/edit-student/edit-student-utils'

// Progress ends at the active step chip (6 evenly spaced steps → i/6 of the bar).
export const APP_STEPS = [
  { id: 'office', label: 'Office Use', progress: 17 },
  { id: 'personal', label: 'Personal Info', progress: 33 },
  { id: 'education', label: 'Educational Record', progress: 50 },
  { id: 'activities', label: 'Activities', progress: 67 },
  { id: 'certificates', label: 'Certificates', progress: 83 },
  { id: 'terms', label: 'Terms & Conditions', progress: 100 },
] as const

export type AppStepId = (typeof APP_STEPS)[number]['id']

/** Normalize clg_filters college rows for OfficeUseStep entityOptions. */
export function asCollegeRows(rows: FilterRow[]): AnyRow[] {
  return rows.map((r) => ({
    ...r,
    collegeId: pickNum(r, ['fk_college_id', 'collegeId']),
    collegeCode: pickText(r, ['college_code', 'collegeCode']),
    collegeName: pickText(r, ['college_name', 'collegeName']),
  }))
}

export function asAcademicYearRows(rows: FilterRow[]): AnyRow[] {
  return rows.map((r) => ({
    ...r,
    academicYearId: pickNum(r, ['fk_academic_year_id', 'academicYearId']),
    academicYear: pickText(r, ['academic_year', 'academicYear']),
  }))
}

export function asCourseRows(rows: FilterRow[]): AnyRow[] {
  return rows.map((r) => ({
    ...r,
    courseId: pickNum(r, ['fk_course_id', 'courseId']),
    courseCode: pickText(r, ['course_code', 'courseCode']),
    courseName: pickText(r, ['course_name', 'courseName']),
  }))
}

export function asCourseGroupRows(rows: FilterRow[]): AnyRow[] {
  return rows.map((r) => ({
    ...r,
    courseGroupId: pickNum(r, ['fk_course_group_id', 'courseGroupId']),
    groupCode: pickText(r, ['group_code', 'groupCode', 'courseGroupCode']),
  }))
}

export function asCourseYearRows(rows: FilterRow[]): AnyRow[] {
  return rows.map((r) => ({
    ...r,
    courseYearId: pickNum(r, ['fk_course_year_id', 'courseYearId']),
    courseYearName: pickText(r, ['course_year_name', 'courseYearName']),
  }))
}

export type FieldErrors = Record<string, string>

/** Office Use step required-field validation — returns { fieldKey: message }. */
export function validateOfficeStep(data: AnyRow): FieldErrors {
  const errors: FieldErrors = {}
  const numOf = (k: string) => Number(data[k] ?? 0)
  if (!numOf('collegeId')) errors.collegeId = 'College is required'
  if (!numOf('academicYearId')) errors.academicYearId = 'Academic Year is required'
  if (!numOf('courseId')) errors.courseId = 'Course is required'
  if (!numOf('courseGroupId')) errors.courseGroupId = 'Course Group is required'
  if (!numOf('courseYearId')) errors.courseYearId = 'Course Year is required'
  if (!numOf('quotaId')) errors.quotaId = 'Quota is required'
  if (!numOf('regulationId')) errors.regulationId = 'Regulation is required'
  if (!numOf('batchId')) errors.batchId = 'Batch is required'
  return errors
}

/** Personal Info step validation — required fields + basic patterns (Angular parity). */
export function validatePersonalStep(data: AnyRow): FieldErrors {
  const errors: FieldErrors = {}
  const str = (k: string) => String(data[k] ?? '').trim()
  if (!str('firstName')) errors.firstName = 'Full Name is required'
  if (!data.dob) errors.dob = 'Date Of Birth is required'
  if (!str('sscNo')) errors.sscNo = 'SSC/CBSE/ICSC is required'
  if (!str('identificationMarks')) errors.identificationMarks = 'Identification Marks are required'
  if (!str('mobile')) errors.mobile = 'Student Mobile is required'
  else if (!/^\d{10}$/.test(str('mobile'))) errors.mobile = 'Enter a valid 10-digit mobile number'
  if (!Number(data.casteId ?? 0)) errors.casteId = 'Caste is required'
  if (!str('aadharCardNo')) errors.aadharCardNo = 'Aadhar Card Number is required'
  else if (!/^\d{12}$/.test(str('aadharCardNo')))
    errors.aadharCardNo = 'Enter a valid 12-digit Aadhar number'
  if (!str('fatherName')) errors.fatherName = 'Father Name is required'
  if (!str('fatherMobileNo')) errors.fatherMobileNo = 'Mobile Number is required'
  else if (!/^\d{10}$/.test(str('fatherMobileNo')))
    errors.fatherMobileNo = 'Enter a valid 10-digit mobile number'
  if (!str('permanentAddress')) errors.permanentAddress = 'Address Line 1 is required'
  return errors
}

export function emptyEducationRow(): AnyRow {
  return {
    nameOfInstitution: '',
    board: '',
    medium: '',
    address: '',
    majorSubjects: '',
    gradeClassSecured: '',
    yearOfCompletion: '',
    precentage: '',
    isActive: true,
  }
}

export function emptyActivityRow(): AnyRow {
  return {
    particulars: '',
    level: '',
    sponsoredBy: '',
    isActive: true,
  }
}
