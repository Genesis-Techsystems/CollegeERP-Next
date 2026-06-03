import { getSecuredValue, setSecuredValue } from '@/common/generic-functions'
import type { AffiliatedSummaryRow } from '@/types/affiliated-colleges'

export const UNIV_AFFILIATED_STORAGE = {
  uploadedFilesSummary: 'univAffiliated.uploadedFilesSummary',
  studentBulk: 'univAffiliated.studentBulk',
  subjectBulk: 'univAffiliated.subjectBulk',
  attendanceBulk: 'univAffiliated.attendanceBulk',
  examRegBulk: 'univAffiliated.examRegBulk',
  examFeeBulk: 'univAffiliated.examFeeBulk',
  studentFeeBulk: 'univAffiliated.studentFeeBulk',
  examMarksBulk: 'univAffiliated.examMarksBulk',
} as const

export type UnivAffiliatedContextRow = AffiliatedSummaryRow

export function setUnivAffiliatedContext(
  key: (typeof UNIV_AFFILIATED_STORAGE)[keyof typeof UNIV_AFFILIATED_STORAGE],
  row: UnivAffiliatedContextRow,
): void {
  setSecuredValue(key, row)
}

export function getUnivAffiliatedContext(
  key: (typeof UNIV_AFFILIATED_STORAGE)[keyof typeof UNIV_AFFILIATED_STORAGE],
): UnivAffiliatedContextRow | null {
  const v = getSecuredValue<UnivAffiliatedContextRow>(key)
  return v === false ? null : v
}

export function buildUnivDataDetails(row: UnivAffiliatedContextRow, extra?: string): string {
  const parts = [
    row.college_code,
    row.academic_year,
    row.course_code,
    row.group_code,
    row.course_year_code,
    extra ?? row.file_name,
  ].filter((p) => p != null && String(p).trim() !== '')
  return parts.map(String).join(' / ')
}
