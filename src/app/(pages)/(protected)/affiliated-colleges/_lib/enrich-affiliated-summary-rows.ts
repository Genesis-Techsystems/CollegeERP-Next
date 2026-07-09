import type { AffiliatedCollegeFilterRow, AffiliatedSummaryRow } from '@/types/affiliated-colleges'

type AnyRow = AffiliatedCollegeFilterRow

function pickNum(row: AnyRow | null | undefined, keys: string[]): number {
  if (!row) return 0
  for (const key of keys) {
    const n = Number(row[key])
    if (Number.isFinite(n) && n > 0) return n
  }
  return 0
}

export function pickAffiliatedText(row: AnyRow | null | undefined, keys: string[]): string {
  if (!row) return ''
  for (const key of keys) {
    const v = row[key]
    if (v != null && String(v).trim() !== '') return String(v)
  }
  return ''
}

function findFilterMatch(filtersData: AnyRow[], row: AnyRow): AnyRow | null {
  const collegeId = pickNum(row, ['fk_college_id', 'collegeId'])
  const courseId = pickNum(row, ['fk_course_id', 'courseId'])
  const groupId = pickNum(row, ['fk_course_group_id', 'courseGroupId'])
  const yearId = pickNum(row, ['fk_course_year_id', 'courseYearId'])

  return (
    filtersData.find((f) => {
      if (collegeId && pickNum(f, ['fk_college_id', 'collegeId']) !== collegeId) return false
      const fCourse = pickNum(f, ['fk_course_id', 'courseId'])
      if (courseId && fCourse > 0 && fCourse !== courseId) return false
      const fGroup = pickNum(f, ['fk_course_group_id', 'courseGroupId'])
      if (groupId && fGroup > 0 && fGroup !== groupId) return false
      const fYear = pickNum(f, ['fk_course_year_id', 'courseYearId'])
      if (yearId && fYear > 0 && fYear !== yearId) return false
      return true
    }) ?? null
  )
}

/** Fill regulation, batch, and group display fields — Angular summary grid parity. */
export function enrichAffiliatedSummaryRows(
  rows: AffiliatedSummaryRow[],
  filtersData: AnyRow[],
  batchesData: AnyRow[],
  regulationData: AnyRow[],
): AffiliatedSummaryRow[] {
  return rows.map((row) => {
    const match = findFilterMatch(filtersData, row)
    const regId =
      pickNum(row, ['fk_regulation_id', 'regulationId']) ||
      pickNum(match, ['fk_regulation_id', 'regulationId'])
    const batchId =
      pickNum(row, ['fk_batch_id', 'batchId']) || pickNum(match, ['fk_batch_id', 'batchId'])

    const regulationRow = regulationData.find(
      (r) => pickNum(r, ['fk_regulation_id', 'regulationId']) === regId,
    )
    const batchRow = batchesData.find((r) => pickNum(r, ['fk_batch_id', 'batchId']) === batchId)

    const regulation_code =
      pickAffiliatedText(row, ['regulation_code', 'regulationCode', 'regulationcode']) ||
      pickAffiliatedText(regulationRow, ['regulation_code', 'regulationCode']) ||
      pickAffiliatedText(match, ['regulation_code', 'regulationCode'])

    const batch_name =
      pickAffiliatedText(row, ['batch_name', 'batchName']) ||
      pickAffiliatedText(batchRow, ['batch_name', 'batchName']) ||
      pickAffiliatedText(match, ['batch_name', 'batchName'])

    const group_name =
      pickAffiliatedText(row, ['group_name', 'groupName']) ||
      pickAffiliatedText(match, ['group_name', 'groupName']) ||
      pickAffiliatedText(row, ['group_code', 'groupCode']) ||
      pickAffiliatedText(match, ['group_code', 'groupCode'])

    return {
      ...row,
      ...(regulation_code ? { regulation_code } : {}),
      ...(batch_name ? { batch_name } : {}),
      ...(group_name ? { group_name } : {}),
    }
  })
}
