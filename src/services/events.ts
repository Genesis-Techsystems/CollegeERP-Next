import { EVENTS_API } from '@/config/constants/api'
import { ENTITIES } from '@/config/constants/entities'
import {
  buildQuery,
  domainCreate,
  domainList,
  domainSoftDelete,
  domainUpdate,
  fetchDetails,
  postDetails,
} from './crud'
import { listAcademicYearsForCollege } from './timetable-management'
import type {
  CollegeEventRow,
  DepartmentEventRow,
  EventTypeRow,
} from '@/types/events'

export type { CollegeEventRow, DepartmentEventRow, EventTypeRow }

function asRows<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[]
  if (data && typeof data === 'object' && 'resultList' in data) {
    const list = (data as { resultList?: unknown }).resultList
    if (Array.isArray(list)) return list as T[]
  }
  return []
}

/** Angular `d/M/yyyy` style date param for college calendar APIs. */
export function formatEventCalendarDate(d: Date): string {
  const day = d.getDate()
  const month = d.getMonth() + 1
  const year = d.getFullYear()
  const monthStr = month < 10 ? `0${month}` : String(month)
  const yearStr = year < 10 ? `0${year}` : String(year)
  return `${day}/${monthStr}/${yearStr}`
}

export async function listEventTypes(): Promise<EventTypeRow[]> {
  return domainList<EventTypeRow>(ENTITIES.EVENT_TYPE.name, buildQuery({}))
}

export async function listEventTypesByCollege(collegeId: number): Promise<EventTypeRow[]> {
  return domainList<EventTypeRow>(
    ENTITIES.EVENT_TYPE.name,
    buildQuery({ 'College.collegeId': collegeId, isActive: true }),
  )
}

export async function createEventType(data: EventTypeRow): Promise<EventTypeRow> {
  return domainCreate<EventTypeRow>(ENTITIES.EVENT_TYPE.name, data)
}

export async function updateEventType(
  eventTypeId: number,
  data: Partial<EventTypeRow>,
): Promise<EventTypeRow> {
  return domainUpdate<EventTypeRow>(ENTITIES.EVENT_TYPE.name, ENTITIES.EVENT_TYPE.pk, eventTypeId, data)
}

export function eventTypeDuplicate(
  rows: EventTypeRow[],
  collegeId: number,
  name: string,
  excludeId?: number,
): boolean {
  const key = name.trim().toLowerCase()
  return rows.some(
    (r) =>
      Number(r.collegeId) === collegeId &&
      String(r.eventTypeName ?? '').trim().toLowerCase() === key &&
      Number(r.eventTypeId) !== excludeId,
  )
}

/** All events for college + academic year — `domain/list/Event`. */
export async function listEventsByCollegeAndYear(
  collegeId: number,
  academicYearId: number,
): Promise<CollegeEventRow[]> {
  return domainList<CollegeEventRow>(
    ENTITIES.EVENT.name,
    buildQuery({
      'College.collegeId': collegeId,
      'AcademicYear.academicYearId': academicYearId,
      isActive: true,
    }),
  )
}

/** Month/day events — `collegecalendar` five-param (Angular add-event). */
export async function listCollegeCalendarMonthEvents(params: {
  collegeId: number
  academicYearId: number
  date: Date
}): Promise<CollegeEventRow[]> {
  const data = await fetchDetails<unknown>(EVENTS_API.COLLEGE_CALENDAR, {
    collegeId: params.collegeId,
    academicYearId: params.academicYearId,
    eventsFor: 'month',
    date: formatEventCalendarDate(params.date),
    isActive: 'true',
  })
  return asRows<CollegeEventRow>(data)
}

/** School calendar / holidays list — `collegecalendar` with isHoliday. */
export async function listSchoolCalendarEvents(
  collegeId: number,
  academicYearId: number,
): Promise<CollegeEventRow[]> {
  const data = await fetchDetails<unknown>(EVENTS_API.COLLEGE_CALENDAR, {
    collegeId,
    academicYearId,
    isHoliday: 'true',
  })
  return asRows<CollegeEventRow>(data)
}

/** Staff audience events — `eventsByAudience` seven-param. */
export async function listStaffAudienceEvents(params: {
  collegeId: number
  academicYearId: number
  departmentId: number
  audienceTypeId: number
  date: Date
}): Promise<CollegeEventRow[]> {
  const data = await fetchDetails<unknown>(EVENTS_API.EVENTS_BY_AUDIENCE, {
    eventsFor: 'E',
    collegeId: params.collegeId,
    deptId: params.departmentId,
    eventAudienceId: params.audienceTypeId,
    date: formatEventCalendarDate(params.date),
    academicYearId: params.academicYearId,
    status: 'true',
  })
  return asRows<CollegeEventRow>(data)
}

/** Student audience events — `eventsByAudience` for student section. */
export async function listStudentAudienceEvents(params: {
  collegeId: number
  academicYearId: number
  groupSectionId: number
  audienceTypeId: number
  date: Date
}): Promise<CollegeEventRow[]> {
  const data = await fetchDetails<unknown>(EVENTS_API.EVENTS_BY_AUDIENCE, {
    eventsFor: 'S',
    collegeId: params.collegeId,
    academicYearId: params.academicYearId,
    sectionId: params.groupSectionId,
    eventAudienceId: params.audienceTypeId,
    date: formatEventCalendarDate(params.date),
    status: 'true',
  })
  return asRows<CollegeEventRow>(data)
}

export async function saveCollegeEvents(rows: CollegeEventRow[]): Promise<void> {
  await postDetails(EVENTS_API.EVENTS, rows)
}

export async function deleteCollegeEvent(eventId: number): Promise<void> {
  await domainSoftDelete(ENTITIES.EVENT.name, ENTITIES.EVENT.pk, eventId)
}

export async function listDepartmentEvents(): Promise<DepartmentEventRow[]> {
  return domainList<DepartmentEventRow>(ENTITIES.DEPARTMENT_EVENT.name, buildQuery({}))
}

export async function createDepartmentEvent(data: DepartmentEventRow): Promise<DepartmentEventRow> {
  return postDetails<DepartmentEventRow>(EVENTS_API.DEPARTMENT_EVENT, data)
}

export async function updateDepartmentEvent(data: DepartmentEventRow): Promise<DepartmentEventRow> {
  return postDetails<DepartmentEventRow>(EVENTS_API.DEPARTMENT_EVENT, data)
}

export { listAcademicYearsForCollege }
