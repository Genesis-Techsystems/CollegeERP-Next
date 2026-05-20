/**
 * Scholarship filter helpers for `collegeWiseDetails` proc data.
 * Reuses fee-masters filter parsing (fk_college_id, college_code, etc.).
 */
export type { FilterRow } from '@/app/(pages)/(protected)/accounts-and-fees/fee-masters/_lib/fee-master-filters'
export {
  academicYearOption,
  batchOption,
  collegeOption,
  courseGroupOption,
  courseOption,
  courseYearOption,
  filterAcademicYears,
  filterBatches,
  filterColleges,
  filterCourseGroups,
  filterCourseYears,
  filterCourses,
  filterUniversities,
  pickNum,
  pickText,
  universityOption,
} from '@/app/(pages)/(protected)/accounts-and-fees/fee-masters/_lib/fee-master-filters'

import {
  pickNum,
  type FilterRow,
} from '@/app/(pages)/(protected)/accounts-and-fees/fee-masters/_lib/fee-master-filters'

const COL = ['fk_college_id', 'collegeId', 'fk_collegeId']
const UNI = ['fk_university_id', 'universityId', 'Universities.universityId']

/** Resolve university id from proc filter rows or domain college list rows. */
export function getUniversityIdForCollege(colleges: FilterRow[], collegeId: number): number {
  const row = colleges.find((c) => pickNum(c, COL) === collegeId)
  return pickNum(row, UNI)
}
