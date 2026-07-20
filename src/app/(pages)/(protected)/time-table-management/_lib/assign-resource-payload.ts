import { toDateOnlyISO, utcMidnightIso } from '@/common/generic-functions'

type AnyRow = Record<string, unknown>

export type AssignResourceRow = {
  subjectResourceId?: number | null
  subjectCourseYearId?: number | null
  courseYearStaffId?: number | null
  roomId?: number | null
  fromDate?: string | Date | null
  toDate?: string | Date | null
  colorCode?: string
  collegeId?: number
  courseGroupId?: number
  courseYearId?: number
  groupSectionId?: number
  isStaffUpdate?: boolean
  studentBatchId?: number | null
  studentBatchName?: string
  isActive?: boolean
  subjectTypeId?: number
  timetableScheduleId?: number
  academicYearID?: number
  subjectTypeCode?: string
  subjectName?: string
  subjectCode?: string
  staff?: AnyRow[]
  createdDt?: string | null
  createdUser?: string | null
  cellGroupId?: string | number | null
  todayDate?: string | Date | null
}

function n(value: unknown): number {
  const x = Number(value ?? 0)
  return Number.isFinite(x) ? x : 0
}

function formatYmd(value: string | Date | null | undefined): string | null {
  if (value == null || value === '') return null
  if (value instanceof Date) return toDateOnlyISO(value)
  const d = new Date(String(value))
  if (!Number.isNaN(d.getTime())) return toDateOnlyISO(d)
  const raw = String(value).trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10)
  return raw
}

function formatStartDate(value: string | Date | null | undefined): string {
  if (value instanceof Date) return utcMidnightIso(value)
  const ymd = formatYmd(value)
  return ymd ? `${ymd}T00:00:00Z` : utcMidnightIso(new Date())
}

function findActualResource(
  actualSchedules: AnyRow[],
  timetableScheduleId: number,
  matcher: (res: AnyRow) => boolean,
): AnyRow | null {
  const schedule = actualSchedules.find((s) => n(s.timetableScheduleId) === timetableScheduleId)
  const resources = Array.isArray(schedule?.subjectResource)
    ? (schedule!.subjectResource as AnyRow[])
    : []
  return resources.find(matcher) ?? null
}

/**
 * Angular `AddResourceComponent.submit()` — builds POST body for `subjectresources`.
 */
export function buildSubjectResourceSavePayload(input: {
  subjectResources: AssignResourceRow[]
  periods: number[]
  subjectTypeName: string
  subjectTypeId: number
  actualSchedules: AnyRow[]
  timescheduleIdsSeed?: number
}): AnyRow[] {
  const {
    subjectResources,
    periods,
    subjectTypeName,
    subjectTypeId,
    actualSchedules,
    timescheduleIdsSeed = 0,
  } = input

  const resources: AnyRow[] = []
  let timescheduleIds = timescheduleIdsSeed

  for (const periodId of periods) {
    timescheduleIds += periodId

    for (const row of subjectResources) {
      const item: AssignResourceRow = { ...row }
      if (item.subjectResourceId) item.isStaffUpdate = false

      const fromYmd = formatYmd(item.fromDate)
      const toYmd = formatYmd(item.toDate)
      if (fromYmd) item.fromDate = fromYmd
      if (toYmd) item.toDate = toYmd

      if (!item.subjectResourceId) {
        item.subjectResourceId = null
        item.createdDt = null
        item.createdUser = null
        item.isStaffUpdate = true
        item.timetableScheduleId = periodId
      } else if (subjectTypeName === 'LAB') {
        const match = findActualResource(
          actualSchedules,
          periodId,
          (y) =>
            n(y.timetableScheduleId) === periodId &&
            n(y.studentBatchId) === n(item.studentBatchId) &&
            n(y.courseYearStaffId) === n(item.courseYearStaffId),
        )
        if (match) {
          item.subjectResourceId = n(match.subjectResourceId) || null
          item.createdDt = (match.createdDt as string) ?? null
          item.createdUser = (match.createdUser as string) ?? null
          item.timetableScheduleId = periodId
          item.isStaffUpdate = true
        }
      } else if (subjectTypeName !== 'ELECTIVE') {
        const match = findActualResource(
          actualSchedules,
          periodId,
          (y) =>
            n(y.timetableScheduleId) === periodId &&
            n(y.studentBatchId) === n(item.studentBatchId),
        )
        if (match) {
          item.subjectResourceId = n(match.subjectResourceId) || null
          item.createdDt = (match.createdDt as string) ?? null
          item.createdUser = (match.createdUser as string) ?? null
          item.timetableScheduleId = periodId
          item.isStaffUpdate = true
        }
      } else if (item.courseYearStaffId != null) {
        const match = findActualResource(
          actualSchedules,
          periodId,
          (y) =>
            n(y.timetableScheduleId) === periodId &&
            n(y.subjectCourseYearId) === n(item.subjectCourseYearId),
        )
        if (match) {
          item.subjectResourceId = n(match.subjectResourceId) || null
          item.createdDt = (match.createdDt as string) ?? null
          item.createdUser = (match.createdUser as string) ?? null
          item.timetableScheduleId = periodId
          item.isStaffUpdate = true
        }
      }

      if (subjectTypeName === 'LAB') {
        item.cellGroupId =
          periods.length === 1 ? null : `${n(item.subjectCourseYearId)}${timescheduleIds}`
      } else {
        item.cellGroupId = null
      }

      const typeCode = String(item.subjectTypeCode ?? subjectTypeName).toUpperCase()
      const includeNonTheory =
        item.subjectCourseYearId != null && typeCode !== 'THEORY' && item.toDate != null
      const includeTheory =
        (typeCode === 'THEORY' || typeCode === 'SEMINAR' || typeCode === 'LIBRARY') &&
        item.subjectCourseYearId != null

      if (!includeNonTheory && !includeTheory) continue

      resources.push({
        academicYearID: item.academicYearID,
        collegeId: item.collegeId,
        colorCode: item.colorCode,
        courseGroupId: item.courseGroupId,
        courseYearId: item.courseYearId,
        courseYearStaffId: item.courseYearStaffId,
        fromDate: formatStartDate(item.fromDate),
        groupSectionId: item.groupSectionId,
        isActive: item.isActive !== false,
        isStaffUpdate: item.isStaffUpdate !== false,
        roomId: item.roomId ?? null,
        studentBatchId: item.studentBatchId ?? null,
        subjectCourseYearId: item.subjectCourseYearId,
        subjectTypeCode: typeCode,
        subjectTypeId,
        timetableScheduleId: item.timetableScheduleId ?? periodId,
        subjectResourceId: item.subjectResourceId ?? null,
        createdDt: item.createdDt ?? null,
        createdUser: item.createdUser ?? null,
        toDate:
          typeCode === 'THEORY' || typeCode === 'SEMINAR' || typeCode === 'LIBRARY'
            ? formatStartDate(item.toDate)
            : formatYmd(item.toDate),
        cellGroupId: item.cellGroupId,
      })
    }
  }

  return resources
}
