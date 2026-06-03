import { ENTITIES } from '@/config/constants/entities'
import type { Weekday } from '@/types/weekday'
import { buildQuery, domainCreate, domainList, domainUpdate } from '../crud'

export async function listWeekdays(): Promise<Weekday[]> {
  return domainList<Weekday>(
    ENTITIES.WEEKDAY.name,
    buildQuery({}, { field: 'createdDt', direction: 'DESC' }),
  )
}

export async function createWeekday(data: Omit<Weekday, 'weekdayId'>): Promise<Weekday> {
  return domainCreate<Weekday>(ENTITIES.WEEKDAY.name, data)
}

export async function updateWeekday(
  weekdayId: number,
  data: Partial<Omit<Weekday, 'weekdayId'>>,
): Promise<Weekday> {
  return domainUpdate<Weekday>(ENTITIES.WEEKDAY.name, ENTITIES.WEEKDAY.pk, weekdayId, {
    weekdayId,
    ...data,
  })
}

