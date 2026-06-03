import type { AcademicYear } from '@/types/academic-year'
import type { College } from '@/types/college'
import type { HolidayCalendar } from '@/types/holiday-calendar'
import { fetchDetails } from '../crud'
import { listAcademicYears } from './academic-year'
import { listColleges } from './college'

export async function listActiveCollegesForHolidayCalendar(): Promise<College[]> {
  const rows = await listColleges()
  return rows.filter((row) => row.isActive)
}

export async function listAcademicYearsByUniversityForHolidayCalendar(
  universityId: number,
): Promise<AcademicYear[]> {
  const rows = await listAcademicYears()
  return rows
    .filter((row) => row.isActive && row.universityId === universityId)
    .sort((a, b) => new Date(b.fromDate).getTime() - new Date(a.fromDate).getTime())
}

export async function listHolidayCalendarByCollegeAndAcademicYear(
  collegeId: number,
  academicYearId: number,
): Promise<HolidayCalendar[]> {
  return fetchDetails<HolidayCalendar[]>('collegecalendar', {
    collegeId,
    academicYearId,
    isHoliday: 'true',
  })
}
