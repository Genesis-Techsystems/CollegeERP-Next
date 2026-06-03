import { ENTITIES } from '@/config/constants/entities'
import type { Bank } from '@/types/bank'
import type { Campus } from '@/types/campus'
import type { College } from '@/types/college'
import { buildQuery, domainCreate, domainList, domainUpdate } from '../crud'

export async function listBanks(): Promise<Bank[]> {
  return domainList<Bank>(
    ENTITIES.BANK.name,
    buildQuery({}, { field: 'createdDt', direction: 'DESC' }),
  )
}

export async function createBank(data: Omit<Bank, 'bankId'>): Promise<Bank> {
  return domainCreate<Bank>(ENTITIES.BANK.name, data)
}

export async function updateBank(
  bankId: number,
  data: Partial<Omit<Bank, 'bankId'>>,
): Promise<Bank> {
  return domainUpdate<Bank>(ENTITIES.BANK.name, ENTITIES.BANK.pk, bankId, {
    bankId,
    ...data,
  })
}

export async function listActiveCollegesForBanks(): Promise<College[]> {
  return domainList<College>(ENTITIES.COLLEGE.name, buildQuery({ isActive: true }))
}

export async function listActiveCampusesForBanks(): Promise<Campus[]> {
  return domainList<Campus>(ENTITIES.CAMPUS.name, buildQuery({ isActive: true }))
}
