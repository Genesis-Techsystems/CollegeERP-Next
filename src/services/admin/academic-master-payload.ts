/**
 * Shared create/update payload shaping for academic master entities (Course,
 * CourseGroup, CourseYear, GroupSection, Batch). Spring returns
 * `success: false` ("Unable to process your request…") when React sends raw
 * form values — empty reason, NaN numbers, or wrong FK key shapes.
 */
import {
  angularLowerActiveReason,
  asString,
} from '../angular-payload'

type WriteInput = Record<string, unknown>

function activeReason(
  data: WriteInput,
  existing?: object,
): { isActive: boolean; reason: string } {
  const prior = existing as WriteInput | undefined
  const isActive = data.isActive !== false
  return {
    isActive,
    reason: angularLowerActiveReason(isActive, data.reason, prior?.reason),
  }
}

function asFiniteNumber(value: unknown, fallback?: unknown): number {
  const num = Number(value ?? fallback)
  return Number.isFinite(num) ? num : 0
}

/** Angular Course modal update body — flat camelCase fields + courseId in body. */
export function buildAngularCourseUpdatePayload(
  courseId: number,
  data: WriteInput,
  existing?: object,
): Record<string, unknown> {
  const prior = existing as WriteInput | undefined
  const { isActive, reason } = activeReason(data, existing)

  return {
    universityId: asFiniteNumber(data.universityId, prior?.universityId),
    courseTypeId: asFiniteNumber(data.courseTypeId, prior?.courseTypeId),
    courseName: asString(data.courseName ?? prior?.courseName),
    courseCode: asString(data.courseCode ?? prior?.courseCode),
    courseShortName: asString(data.courseShortName ?? prior?.courseShortName),
    duration: asFiniteNumber(data.duration, prior?.duration),
    inTake: asFiniteNumber(data.inTake, prior?.inTake),
    prefix: asString(data.prefix ?? prior?.prefix),
    startingNo: asFiniteNumber(data.startingNo, prior?.startingNo),
    isActive,
    reason,
    courseId,
  }
}

/** Angular CourseGroup modal body — flat camelCase fields; update includes courseGroupId. */
function buildAngularCourseGroupPayload(
  data: WriteInput,
  existing?: object,
  courseGroupId?: number,
): Record<string, unknown> {
  const prior = existing as WriteInput | undefined
  const { isActive, reason } = activeReason(data, existing)
  const groupCode = asString(data.groupCode ?? prior?.groupCode)

  const payload: Record<string, unknown> = {
    universityId: asFiniteNumber(data.universityId, prior?.universityId),
    courseId: asFiniteNumber(data.courseId, prior?.courseId),
    groupName: asString(data.groupName ?? prior?.groupName),
    groupCode,
    shortName: asString(data.shortName ?? prior?.shortName ?? groupCode),
    enrollPrefix: asString(data.enrollPrefix ?? prior?.enrollPrefix),
    startingNo: asString(data.startingNo ?? prior?.startingNo),
    isActive,
    reason,
  }

  if (courseGroupId != null) {
    payload.courseGroupId = courseGroupId
  }

  return payload
}

export function buildAngularCourseGroupUpdatePayload(
  courseGroupId: number,
  data: WriteInput,
  existing?: object,
): Record<string, unknown> {
  return buildAngularCourseGroupPayload(data, existing, courseGroupId)
}

export function buildAngularCourseGroupCreatePayload(
  data: WriteInput,
): Record<string, unknown> {
  return buildAngularCourseGroupPayload(data)
}

/** Angular CourseYear (Semester) modal update body — flat camelCase fields + courseYearId in body. */
export function buildAngularCourseYearUpdatePayload(
  courseYearId: number,
  data: WriteInput,
  existing?: object,
): Record<string, unknown> {
  const prior = existing as WriteInput | undefined
  const { isActive, reason } = activeReason(data, existing)

  return {
    universityId: asFiniteNumber(data.universityId, prior?.universityId),
    courseId: asFiniteNumber(data.courseId, prior?.courseId),
    yearNo: asFiniteNumber(data.yearNo, prior?.yearNo ?? 1),
    sortOrder: asFiniteNumber(data.sortOrder, prior?.sortOrder),
    courseYearCode: asString(data.courseYearCode ?? prior?.courseYearCode),
    courseYearName: asString(data.courseYearName ?? prior?.courseYearName),
    isActive,
    reason,
    courseYearId,
  }
}

/** Angular GroupSection modal update body — flat camelCase fields + groupSectionId in body. */
export function buildAngularGroupSectionUpdatePayload(
  groupSectionId: number,
  data: WriteInput,
  existing?: object,
): Record<string, unknown> {
  const prior = existing as WriteInput | undefined
  const { isActive, reason } = activeReason(data, existing)

  return {
    collegeId: asFiniteNumber(data.collegeId, prior?.collegeId),
    academicYearId: asFiniteNumber(data.academicYearId, prior?.academicYearId),
    courseId: asFiniteNumber(data.courseId, prior?.courseId),
    courseGroupId: asFiniteNumber(data.courseGroupId, prior?.courseGroupId),
    courseYearId: asFiniteNumber(data.courseYearId, prior?.courseYearId),
    // Backend (Angular) uses `section` field for create/update.
    section: asString(data.section ?? data.groupSectionName ?? data.groupSectionCode ?? prior?.section ?? prior?.groupSectionName),
    sortOrder: asFiniteNumber(data.sortOrder, prior?.sortOrder),
    isActive,
    reason,
    groupSectionId,
  }
}

/** Angular GroupSection modal create body — flat camelCase fields + `section`. */
export function buildAngularGroupSectionCreatePayload(
  data: WriteInput,
  existing?: object,
): Record<string, unknown> {
  const prior = existing as WriteInput | undefined
  const { isActive, reason } = activeReason(data, existing)

  return {
    collegeId: asFiniteNumber(data.collegeId, prior?.collegeId),
    academicYearId: asFiniteNumber(data.academicYearId, prior?.academicYearId),
    courseId: asFiniteNumber(data.courseId, prior?.courseId),
    courseGroupId: asFiniteNumber(data.courseGroupId, prior?.courseGroupId),
    courseYearId: asFiniteNumber(data.courseYearId, prior?.courseYearId),
    section: asString(data.section ?? data.groupSectionName ?? data.groupSectionCode ?? prior?.section ?? prior?.groupSectionName),
    sortOrder: asFiniteNumber(data.sortOrder, prior?.sortOrder),
    isActive,
    reason,
  }
}

/** Angular Batch modal update body — flat camelCase fields + batchId in body. */
export function buildAngularBatchUpdatePayload(
  batchId: number,
  data: WriteInput,
  existing?: object,
): Record<string, unknown> {
  const prior = existing as WriteInput | undefined
  const { isActive, reason } = activeReason(data, existing)

  return {
    collegeId: asFiniteNumber(data.collegeId, prior?.collegeId),
    courseId: asFiniteNumber(data.courseId, prior?.courseId),
    regulationId: asFiniteNumber(data.regulationId, prior?.regulationId),
    // Angular APIs vary: some expect fromDate/toDate, others batchFrom/batchTo.
    fromDate: asString(data.fromDate ?? data.batchFrom ?? prior?.fromDate ?? prior?.batchFrom),
    toDate: asString(data.toDate ?? data.batchTo ?? prior?.toDate ?? prior?.batchTo),
    batchFrom: asString(data.batchFrom ?? data.fromDate ?? prior?.batchFrom ?? prior?.fromDate),
    batchTo: asString(data.batchTo ?? data.toDate ?? prior?.batchTo ?? prior?.toDate),
    batchName: asString(data.batchName ?? prior?.batchName),
    batchCode: asString(data.batchCode ?? prior?.batchCode),
    isActive,
    reason,
    batchId,
  }
}

export function buildAngularBatchCreatePayload(
  data: WriteInput,
  existing?: object,
): Record<string, unknown> {
  const prior = existing as WriteInput | undefined
  const { isActive, reason } = activeReason(data, existing)
  return {
    collegeId: asFiniteNumber(data.collegeId, prior?.collegeId),
    courseId: asFiniteNumber(data.courseId, prior?.courseId),
    regulationId: asFiniteNumber(data.regulationId, prior?.regulationId),
    fromDate: asString(data.fromDate ?? data.batchFrom ?? prior?.fromDate ?? prior?.batchFrom),
    toDate: asString(data.toDate ?? data.batchTo ?? prior?.toDate ?? prior?.batchTo),
    batchFrom: asString(data.batchFrom ?? data.fromDate ?? prior?.batchFrom ?? prior?.fromDate),
    batchTo: asString(data.batchTo ?? data.toDate ?? prior?.batchTo ?? prior?.toDate),
    batchName: asString(data.batchName ?? prior?.batchName),
    batchCode: asString(data.batchCode ?? prior?.batchCode),
    isActive,
    reason,
  }
}
