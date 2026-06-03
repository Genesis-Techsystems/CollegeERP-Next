export type EventTypeRow = {
  eventTypeId?: number
  collegeId?: number
  collegeCode?: string
  eventTypeName?: string
  isActive?: boolean
  reason?: string
}

export type CollegeEventRow = {
  eventId?: number
  collegeId?: number
  academicYearId?: number
  universityId?: number
  eventTypeId?: number
  eventStatusId?: number
  eventName?: string
  startDate?: string
  eventDate?: string
  endDate?: string
  publishDate?: string
  isPublished?: boolean
  organizerDetails?: string
  description?: string
  isHoliday?: boolean
  isActive?: boolean
  reason?: string
  createdDt?: string
  weekday?: string
  audienceTypeCode?: string
  eventTypeName?: string
  eventStatusDisplayName?: string
  audienceTypeDisplayName?: string
  eventAudiences?: EventAudienceRow[]
}

export type EventAudienceRow = {
  eventAudienceId?: number
  audienceTypeId?: number
  audienceTypeName?: string
  courseId?: number
  courseGroupId?: number
  courseYearId?: number
  groupSectionId?: number
  departmentId?: number
  categoryName?: string
  isActive?: boolean
}

export type DepartmentEventRow = {
  deptEventId?: number
  collegeId?: number
  academicYearId?: number
  departmentId?: number
  departmentName?: string
  deptEventName?: string
  deptEventDescription?: string
  venue?: string
  startDate?: string
  endDate?: string
  totalRegisrationAmount?: number
  totalExpenditure?: number
  totalFeeCollected?: number
  isActive?: boolean
  reason?: string
  academicYear?: string
}
