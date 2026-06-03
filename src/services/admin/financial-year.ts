import { ENTITIES } from '@/config/constants/entities'
import type { FinancialYear } from '@/types/financial-year'
import { buildQuery, domainCreate, domainList, domainUpdate } from '../crud'

export async function listFinancialYears(): Promise<FinancialYear[]> {
  return domainList<FinancialYear>(
    ENTITIES.FINANCIAL_YEAR.name,
    buildQuery({}, { field: 'createdDt', direction: 'DESC' }),
  )
}

export async function createFinancialYear(data: Omit<FinancialYear, 'financialYearId'>): Promise<FinancialYear> {
  return domainCreate<FinancialYear>(ENTITIES.FINANCIAL_YEAR.name, data)
}

export async function updateFinancialYear(
  financialYearId: number,
  data: Partial<Omit<FinancialYear, 'financialYearId'>>,
): Promise<FinancialYear> {
  return domainUpdate<FinancialYear>(ENTITIES.FINANCIAL_YEAR.name, ENTITIES.FINANCIAL_YEAR.pk, financialYearId, {
    financialYearId,
    ...data,
  })
}
