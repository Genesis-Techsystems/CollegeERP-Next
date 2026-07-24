import { MENTORSHIP_API } from "@/config/constants/api";
import { ENTITIES } from "@/config/constants/entities";
import {
  buildQuery,
  domainCreate,
  domainList,
  domainUpdate,
  fetchDetails,
  postDetails,
} from "./crud";
import {
  listCourseGroupsByCourse,
  listCourseYearsByCourse,
} from "./admin/college-courses-groups";
import { listAcademicYearsForCollege } from "./timetable-management";
import { searchEmployeesForHr } from "./hr-payroll";
import { searchStudentsByKeyword } from "./student-information";

export type MentorshipRow = Record<string, unknown>;

export type CounselorActivityType = MentorshipRow & {
  counselorActivityTypeId?: number;
  collegeId?: number;
  collegeCode?: string;
  activityTypeCode?: string;
  activityTypeName?: string;
  isActive?: boolean;
  reason?: string;
};

function asRows(data: unknown): MentorshipRow[] {
  if (Array.isArray(data)) return data as MentorshipRow[];
  if (data && typeof data === "object" && "resultList" in data) {
    const list = (data as { resultList?: unknown }).resultList;
    if (Array.isArray(list)) return list as MentorshipRow[];
  }
  return [];
}

/** Activity rows nested under first counselormappings result. */
export function extractCounselorActivities(data: unknown): MentorshipRow[] {
  const rows = asRows(data);
  if (rows.length === 0) return [];
  const first = rows[0];
  const dtos = first.counselorActivityDTOs;
  if (!Array.isArray(dtos)) return [];
  const counselorId = first.counselorId;
  const collegeId = first.collegeId;
  const studentId = first.studentId;
  return [...(dtos as MentorshipRow[])]
    .map((a) => ({
      ...a,
      counselorId: a.counselorId ?? counselorId,
      collegeId: a.collegeId ?? collegeId,
      studentId: a.studentId ?? studentId,
    }))
    .sort((a, b) => {
      const ad = new Date(String(a.nextScheduledActivityDate ?? 0)).getTime();
      const bd = new Date(String(b.nextScheduledActivityDate ?? 0)).getTime();
      return bd - ad;
    });
}

/** Students assigned to a counselor/employee — `counselormappings?collegeId&employeeId`. */
export async function listCounselorStudentsForEmployee(
  collegeId: number,
  employeeId: number,
): Promise<MentorshipRow[]> {
  return asRows(
    await fetchDetails(MENTORSHIP_API.COUNSELOR_MAPPINGS, {
      collegeId,
      employeeId,
    }),
  );
}

/** Counselors mapped to a student — `counselormappings?collegeId&studentId`. */
export async function listCounselorMappingsForStudent(
  collegeId: number,
  studentId: number,
): Promise<MentorshipRow[]> {
  return asRows(
    await fetchDetails(MENTORSHIP_API.COUNSELOR_MAPPINGS, {
      collegeId,
      studentId,
    }),
  );
}

/** Staff meetings — activities for college + employee + student. */
export async function listCounselorActivitiesForStudent(
  collegeId: number,
  employeeId: number,
  studentId: number,
): Promise<{ activities: MentorshipRow[]; counselorId: number | null }> {
  const data = await fetchDetails(MENTORSHIP_API.COUNSELOR_MAPPINGS, {
    collegeId,
    employeeId,
    studentId,
  });
  const mapping = asRows(data)[0];
  return {
    activities: extractCounselorActivities(data),
    counselorId: Number(mapping?.counselorId ?? 0) || null,
  };
}

/** Admin student meetings — date range on counselormappings. */
export async function listCounselorActivitiesInDateRange(params: {
  collegeId: number;
  employeeId: number;
  studentId: number;
  fromDate: string;
  toDate: string;
}): Promise<{ activities: MentorshipRow[]; counselorId: number | null }> {
  const data = await fetchDetails(MENTORSHIP_API.COUNSELOR_MAPPINGS, {
    collegeId: params.collegeId,
    employeeId: params.employeeId,
    studentId: params.studentId,
    fromDate: params.fromDate,
    toDate: params.toDate,
  });
  const mapping = asRows(data)[0];
  return {
    activities: extractCounselorActivities(data),
    counselorId: Number(mapping?.counselorId ?? 0) || null,
  };
}

/** Students for counselor in date range — `counselordetails`. */
export async function listCounselorStudentsInDateRange(params: {
  collegeId: number;
  employeeId: number;
  fromDate: string;
  toDate: string;
}): Promise<MentorshipRow[]> {
  return asRows(
    await fetchDetails(MENTORSHIP_API.COUNSELOR_DETAILS, {
      collegeId: params.collegeId,
      fromDate: params.fromDate,
      toDate: params.toDate,
      employeeId: params.employeeId,
      status: "true",
    }),
  );
}

export async function searchEmployeesForMentorship(
  collegeId: number,
  term: string,
): Promise<MentorshipRow[]> {
  return searchEmployeesForHr(term, collegeId);
}

export async function searchStudentsForMentorship(
  term: string,
): Promise<MentorshipRow[]> {
  return searchStudentsByKeyword(term);
}

// ── Activity type CRUD ─────────────────────────────────────────────────────────

/** Angular `listAllDetails(CounselorActivityType)` — all rows for admin grid. */
export async function listCounselorActivityTypes(): Promise<
  CounselorActivityType[]
> {
  return domainList<CounselorActivityType>(
    ENTITIES.COUNSELOR_ACTIVITY_TYPE.name,
    buildQuery({}),
  );
}

/**
 * Angular schedule modal:
 * `listDetailsByTwoIds(CounselorActivityType, collegeId, true, getDetailsByCollegeId, isActive)`
 */
export async function listCounselorActivityTypesByCollege(
  collegeId: number,
): Promise<CounselorActivityType[]> {
  if (!collegeId) return [];
  return domainList<CounselorActivityType>(
    ENTITIES.COUNSELOR_ACTIVITY_TYPE.name,
    buildQuery({ "College.collegeId": collegeId, isActive: true }),
  );
}

/** Angular `addMasterDetails(counseloractivitys, rows)`. */
export async function createCounselorActivities(
  rows: MentorshipRow[],
): Promise<void> {
  await postDetails(MENTORSHIP_API.COUNSELOR_ACTIVITIES, rows);
}

/** Angular `updateDetails(CounselorActivity, details, counselorActivityId)`. */
export async function updateCounselorActivity(
  counselorActivityId: number,
  payload: MentorshipRow,
): Promise<MentorshipRow> {
  return domainUpdate<MentorshipRow>(
    ENTITIES.COUNSELOR_ACTIVITY.name,
    ENTITIES.COUNSELOR_ACTIVITY.pk,
    counselorActivityId,
    { ...payload, counselorActivityId },
  );
}

export async function createCounselorActivityType(
  payload: Omit<CounselorActivityType, "counselorActivityTypeId">,
): Promise<CounselorActivityType> {
  return domainCreate<CounselorActivityType>(
    ENTITIES.COUNSELOR_ACTIVITY_TYPE.name,
    payload,
  );
}

export async function updateCounselorActivityType(
  counselorActivityTypeId: number,
  payload: Partial<CounselorActivityType>,
): Promise<CounselorActivityType> {
  return domainUpdate<CounselorActivityType>(
    ENTITIES.COUNSELOR_ACTIVITY_TYPE.name,
    ENTITIES.COUNSELOR_ACTIVITY_TYPE.pk,
    counselorActivityTypeId,
    { ...payload, counselorActivityTypeId },
  );
}

export {
  listCourseGroupsByCourse,
  listCourseYearsByCourse,
  listAcademicYearsForCollege,
};

/** Angular `listByFiveIds(studentsList, college, ay, course, group, year)`. */
export async function listStudentsForCounselorAssignment(params: {
  collegeId: number;
  academicYearId: number;
  courseId: number;
  courseGroupId: number;
  courseYearId: number;
}): Promise<MentorshipRow[]> {
  const p = params;
  const paramSets: Record<string, string | number>[] = [
    {
      collegeId: p.collegeId,
      academicYearId: p.academicYearId,
      courseId: p.courseId,
      courseGroupId: p.courseGroupId,
      courseYearId: p.courseYearId,
    },
  ];
  for (const query of paramSets) {
    try {
      const data = await fetchDetails<unknown>("studentsList", query);
      const rows = asRows(data);
      if (rows.length > 0) return rows;
    } catch {
      // try next
    }
  }
  try {
    const data = await fetchDetails<unknown>("studentsList", paramSets[0]!);
    return asRows(data);
  } catch {
    return [];
  }
}

/** Existing counselor mappings for section — `mappedcounselorstudents`. */
export async function listMappedCounselorStudents(params: {
  collegeId: number;
  courseGroupId: number;
  courseYearId: number;
}): Promise<MentorshipRow[]> {
  return asRows(
    await fetchDetails(MENTORSHIP_API.MAPPED_COUNSELOR_STUDENTS, {
      collegeId: params.collegeId,
      courseGroupId: params.courseGroupId,
      courseYearId: params.courseYearId,
    }),
  );
}

/** Angular `add(counselormappings, rows)`. */
export async function saveCounselorMappings(
  rows: MentorshipRow[],
): Promise<void> {
  await postDetails(MENTORSHIP_API.COUNSELOR_MAPPINGS, rows);
}

/** Students assigned to counselor — `domain/list/CounselorMapping?employeeDetail.employeeId==`. */
export async function listCounselorStudentsByEmployee(
  employeeId: number,
): Promise<MentorshipRow[]> {
  if (!employeeId) return [];
  return domainList<MentorshipRow>(
    ENTITIES.COUNSELOR_MAPPING.name,
    buildQuery({ "employeeDetail.employeeId": employeeId }),
  );
}

export function activityTypeDuplicate(
  rows: CounselorActivityType[],
  code: string,
  collegeId: number,
  excludeId?: number,
): boolean {
  const key = code.trim().toLowerCase();
  return rows.some(
    (r) =>
      r.counselorActivityTypeId !== excludeId &&
      Number(r.collegeId) === collegeId &&
      String(r.activityTypeCode ?? "")
        .trim()
        .toLowerCase() === key,
  );
}
