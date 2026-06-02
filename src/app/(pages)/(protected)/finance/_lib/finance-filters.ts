import type { FinanceEntityFilterRow } from '@/types/finance'

export function distinctFinanceColleges(rows: FinanceEntityFilterRow[]) {
  const seen = new Set<number>()
  return rows
    .filter((r) => {
      const id = Number(r.fk_college_id)
      if (!id || seen.has(id)) return false
      seen.add(id)
      return true
    })
    .sort((a, b) => (a.clg_sort_order ?? 0) - (b.clg_sort_order ?? 0))
}

export function filterFinanceEntities(rows: FinanceEntityFilterRow[], collegeId: number) {
  const seen = new Set<number>()
  return rows
    .filter((r) => Number(r.fk_college_id) === collegeId)
    .filter((r) => {
      const id = Number(r.pk_acc_entity_id)
      if (!id || seen.has(id)) return false
      seen.add(id)
      return true
    })
}

export function filterFinanceYears(
  rows: FinanceEntityFilterRow[],
  collegeId: number,
  accountEntityId: number,
) {
  const seen = new Set<number>()
  return rows
    .filter(
      (r) =>
        Number(r.fk_college_id) === collegeId &&
        Number(r.pk_acc_entity_id) === accountEntityId,
    )
    .filter((r) => {
      const id = Number(r.pk_financial_year_id)
      if (!id || seen.has(id)) return false
      seen.add(id)
      return true
    })
}

export function filterFinanceAccountTypes(
  rows: FinanceEntityFilterRow[],
  collegeId: number,
  accountEntityId: number,
  financialYearId: number,
) {
  const seen = new Set<number>()
  return rows
    .filter(
      (r) =>
        Number(r.fk_college_id) === collegeId &&
        Number(r.pk_acc_entity_id) === accountEntityId &&
        Number(r.pk_financial_year_id) === financialYearId,
    )
    .filter((r) => {
      const id = Number(r.pk_account_type_id)
      if (!id || seen.has(id)) return false
      seen.add(id)
      return true
    })
}
