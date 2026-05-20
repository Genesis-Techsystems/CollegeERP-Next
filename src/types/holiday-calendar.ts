export interface HolidayCalendar {
  collegeCalendarId: number
  collegeId: number
  academicYearId: number
  eventName: string
  eventTypeName?: string
  eventDate?: string
  startDate?: string
  audienceTypeDisplayName?: string
  eventAudiences?: Array<{
    audienceTypeDisplayName?: string
  }>
  eventStatusDisplayName?: string
  isHoliday: boolean
  isActive?: boolean
}
