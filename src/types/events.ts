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

export type DepartmentEventAudienceRow = {
  departmentEventAudienceId?: number
  /** Angular delete path uses `deptEventAudienceId`. */
  deptEventAudienceId?: number
  isCoordinator?: boolean
  employeeDetailId?: number
  employeeDetailName?: string
  employeeDetailNumber?: string
  studentDetailId?: number
  studentDetailName?: string
  studentDetailRollNumber?: string
  feeCollected?: number
  isActive?: boolean
}

export type DepartmentEventResourceRow = {
  deptResourceId?: number
  name?: string
  institute?: string
  profileUrl?: string
  /** Pending local file before upload (not sent in JSON body). */
  path?: File | null
  isActive?: boolean
}

export type DepartmentEventPhotoRow = {
  deptEventPhotoId?: number
  photoUrl?: string
}

export type DepartmentEventRow = {
  deptEventId?: number
  collegeId?: number
  academicYearId?: number
  departmentId?: number
  departmentName?: string
  departmentCode?: string
  deptEventName?: string
  deptEventDescription?: string
  venue?: string
  startDate?: string
  endDate?: string
  permissionLetter?: string
  broucherUrl?: string
  posterUrl?: string
  billsUrl?: string
  feedbackUrl?: string
  certificate1?: string
  certificate2?: string
  totalRegisrationAmount?: number
  totalExpenditure?: number
  totalFeeCollected?: number
  isActive?: boolean
  reason?: string
  academicYear?: string
  createdDt?: string
  createdUser?: string
  departmentEventAudienceDTOs?: DepartmentEventAudienceRow[]
  departmentEventResourceDTOS?: DepartmentEventResourceRow[]
  departmentEventPhotoDTOS?: DepartmentEventPhotoRow[]
}
