/**
 * Alias labels for domain terminology.
 * Migrated from Angular: college_erp_angular_foundation_work/src/app/common/alias-labels.ts
 *
 * Allows institution-specific overrides (e.g., "Course Year" -> "Semester").
 * To customize for a different institution, change the values here.
 *
 * SUK variant (commented out for reference):
 *   organization: 'Organization'
 *   college: 'Faculty'
 *   academicYear: 'Exam Year'
 *   course: 'Program'
 *   courseGroup: 'Course Group'
 *   courseYear: 'Semister'
 *   subject: 'Course'
 */

export const ALIASLABELS = {
  organization: 'Organization',
  university: 'University',
  college: 'College',
  academicYear: 'Academic Year',
  course: 'Course',
  courseGroup: 'Course Group',
  courseYear: 'Course Year',
  subject: 'Subject',
  exam: 'Exam',
  regulation: 'Regulation',
} as const

export type AliasLabelKey = keyof typeof ALIASLABELS
