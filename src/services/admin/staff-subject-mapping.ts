import { EMPLOYEE_API, SUBJECT_API } from "@/config/constants/api";
import { GM_CODES } from "@/config/constants/ui";
import {
  buildQuery,
  domainList,
  fetchDetails,
  getAllRecords,
  postDetails,
} from "@/services/crud";

type AnyRow = Record<string, any>;

function unwrapEmployeeRows(data: unknown): AnyRow[] {
  if (Array.isArray(data)) return data as AnyRow[];
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.resultList)) return obj.resultList as AnyRow[];
    if (Array.isArray(obj.data)) return obj.data as AnyRow[];
  }
  return [];
}

/** Normalize employee id/name fields across EmployeeDetail / employeesearch. */
export function normalizeEmployeeRow(row: AnyRow): AnyRow {
  const employeeId =
    Number(
      row.employeeId ??
        row.empId ??
        row.employee_id ??
        row.employeeDetail?.employeeId ??
        row.employeeDetailId,
    ) || 0;
  const combinedName = String(
    row.empName ?? row.employeeName ?? row.name ?? "",
  ).trim();
  let firstName = row.firstName ?? row.empFirstName ?? row.first_name ?? "";
  let middleName = row.middleName ?? row.empMiddleName ?? "";
  let lastName = row.lastName ?? row.empLastName ?? row.last_name ?? "";
  if (!firstName && !lastName && combinedName) {
    firstName = combinedName;
  }
  return {
    ...row,
    employeeId,
    firstName,
    middleName,
    lastName,
    empNumber: row.empNumber ?? row.employeeNumber ?? row.emp_number ?? "",
  };
}

/**
 * Angular getSubjectCourseYears / Staff Subject Mapping list:
 * GET subjectcourseyrs/?collegeid=&academicYearId=&groupSectionid=
 * Browser: /api/proxy/subjectcourseyrs?... → upstream …/cms/subjectcourseyrs?...
 */
export async function listStaffSubjectRows(params: {
  collegeId: number;
  academicYearId: number;
  groupSectionId: number;
}): Promise<AnyRow[]> {
  const { collegeId, academicYearId, groupSectionId } = params;
  if (!collegeId || !academicYearId || !groupSectionId) return [];

  try {
    const rows = await fetchDetails<AnyRow[]>(
      SUBJECT_API.SUBJECT_COURSE_YEARS,
      {
        collegeid: collegeId,
        academicYearId,
        groupSectionid: groupSectionId,
      },
    );
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }

  return [];
}

/**
 * Angular active staff by college (staff-subject-unmapping / mapping):
 * `domain/list/EmployeeDetail?query=College.collegeId==…and.employeeStatus.generalDetailCode==ACTV.and.isActive==true`
 */
export async function listActiveEmployeesByCollege(
  collegeId: number,
): Promise<AnyRow[]> {
  if (!collegeId) return [];

  try {
    const rows = await domainList<AnyRow>(
      EMPLOYEE_API.EMPLOYEE_DETAIL,
      buildQuery({
        "College.collegeId": collegeId,
        "employeeStatus.generalDetailCode": GM_CODES.EMP_ACTIVE_STATUS,
        isActive: true,
      }),
    );
    return rows
      .map(normalizeEmployeeRow)
      .filter((r) => Number(r.employeeId) > 0);
  } catch {
    return [];
  }
}

/**
 * Angular `employeesearch?q=&empStatus=ACTV` (+ optional `collegeId`, min 4 chars).
 * Same search for every college: college-scoped first, then org-wide.
 */
export async function searchActiveEmployeesByCollege(
  collegeId: number,
  term: string,
): Promise<AnyRow[]> {
  const q = term.trim();
  if (q.length < 4) return [];

  const parse = (data: unknown) =>
    unwrapEmployeeRows(data)
      .map(normalizeEmployeeRow)
      .filter((r) => Number(r.employeeId) > 0);

  const trySearch = async (params: Record<string, string | number>) => {
    const paths = ["employeesearch", "cms/employeesearch"] as const;
    for (const path of paths) {
      try {
        const rows = parse(await fetchDetails<unknown>(path, params));
        if (rows.length > 0) return rows;
      } catch {
        // next path / fall through
      }
    }
    return [] as AnyRow[];
  };

  if (collegeId) {
    const scoped = await trySearch({
      collegeId,
      q,
      empStatus: GM_CODES.EMP_ACTIVE_STATUS,
    });
    if (scoped.length > 0) return scoped;
  }

  const orgWide = await trySearch({
    q,
    empStatus: GM_CODES.EMP_ACTIVE_STATUS,
  });

  // Prefer employees that belong to the selected college when the row carries a college id
  if (collegeId && orgWide.length > 0) {
    const matched = orgWide.filter((r) => {
      const cid =
        Number(
          r.collegeId ?? r.College?.collegeId ?? r.college?.collegeId ?? 0,
        ) || 0;
      return !cid || cid === collegeId;
    });
    if (matched.length > 0) return matched;
  }

  return orgWide;
}

export async function saveStaffSubjectMappings(rows: AnyRow[]): Promise<void> {
  if (!Array.isArray(rows) || rows.length === 0) return;
  const paths = [
    SUBJECT_API.STAFF_COURSEYR_SUBJECTS_CHECK,
    "staffCourseyrSubjectsCheck",
  ];
  let lastError: unknown = null;
  for (const path of paths) {
    try {
      await postDetails(path, rows);
      return;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error("Failed to save staff subject mapping");
}

export async function listStaffMappingSections(params: {
  organizationId: number;
  employeeId: number;
  collegeId: number;
  courseId: number;
  courseGroupId: number;
  courseYearId: number;
  academicYearId: number;
}): Promise<AnyRow[]> {
  const {
    organizationId,
    employeeId,
    collegeId,
    courseId,
    courseGroupId,
    courseYearId,
    academicYearId,
  } = params;
  if (
    !collegeId ||
    !courseId ||
    !courseGroupId ||
    !courseYearId ||
    !academicYearId
  )
    return [];

  const data = await getAllRecords<{ result?: unknown }>(
    "s_get_collegewisedetails_bycode",
    {
      in_flag: "clg_sec_filters",
      in_org_id: organizationId || 0,
      in_college_id: collegeId,
      in_course_id: courseId,
      in_course_group_id: courseGroupId,
      in_course_year_id: courseYearId,
      in_group_section_id: 0,
      in_academic_year_id: academicYearId,
      in_dept_id: 0,
      in_isadmin: 0,
      in_loginuser_empid: employeeId || 0,
      in_loginuser_roleid: 0,
      in_subject: "",
      in_employee: "",
      in_gm_codes: "",
    },
  ).catch(() => ({ result: [] as unknown }));

  const groups = Array.isArray(data?.result) ? (data.result as unknown[]) : [];
  for (const g of groups) {
    if (Array.isArray(g) && g.length > 0) return g as AnyRow[];
  }
  return [];
}

/** Angular course cell: collegeCode / academicYear / courseCode / groupCode / courseYearName / section */
function buildStaffSubjectCourseDisplay(row: AnyRow): string {
  const existing = String(row?.courseDisplay ?? "").trim();
  if (existing) return existing;
  const parts = [
    row?.collegeCode,
    row?.academicYear,
    row?.courseCode,
    row?.groupCode,
    row?.courseYearName,
    row?.section,
  ]
    .map((v) => (v == null ? "" : String(v).trim()))
    .filter((v) => v !== "");
  if (parts.length > 0) return parts.join(" / ");
  const fallback = String(row?.courseName ?? "").trim();
  return fallback || "-";
}

function normalizeStaffSubjectMappingRows(rows: AnyRow[]): AnyRow[] {
  return rows.map((r) => {
    const subject =
      r.subject ??
      r.subjectCourseyear?.subject ??
      r.subjectCourseYear?.subject ??
      {};
    const courseYear =
      r.subjectCourseyear ?? r.subjectCourseYear ?? r.courseYear ?? {};
    return {
      ...r,
      courseDisplay: buildStaffSubjectCourseDisplay(r),
      subjectName: r.subjectName ?? subject.subjectName ?? subject.name ?? "-",
      subjectCode: r.subjectCode ?? subject.subjectCode ?? subject.code ?? "",
      subjectType:
        r.subjectType ?? subject.subjectType ?? subject.subjectTypeName ?? "-",
      fromDate: r.fromDate ?? "",
      toDate: r.toDate ?? "",
      status: r.isActive === false ? "inactive" : "active",
      // keep nested refs useful for save payload
      subjectCourseyearId:
        Number(
          r.subjectCourseyearId ??
            courseYear.subjectCourseyearId ??
            courseYear.subjectCourseYearId,
        ) || r.subjectCourseyearId,
    };
  });
}

/**
 * Angular `selectedEmployee` →
 * `listDetailsById(StaffCourseyrSubject, employeeId, 'employeeDetail.employeeId')`
 * → GET domain/list/StaffCourseyrSubject?size=99999&query=employeeDetail.employeeId=={id}
 * (active + inactive; no college filter).
 */
export async function listEmployeeMappedSubjects(params: {
  collegeId: number;
  employeeId: number;
}): Promise<AnyRow[]> {
  const { employeeId } = params;
  if (!employeeId) return [];

  try {
    const rows = await domainList<AnyRow>(
      EMPLOYEE_API.STAFF_COURSE_YR_SUBJECT,
      buildQuery({ "employeeDetail.employeeId": employeeId }),
    );
    return normalizeStaffSubjectMappingRows(rows);
  } catch {
    // Angular treats "No records found" as an empty grid
    return [];
  }
}

export async function listSubjectSyllabusPlanReport(params: {
  subjectId: number;
  collegeId: number;
}): Promise<AnyRow[]> {
  const { subjectId, collegeId } = params;
  if (!subjectId || !collegeId) return [];

  const data = await getAllRecords<{ result?: unknown }>(
    "s_subject_syllabus_plan_report",
    {
      in_subject_id: subjectId,
      in_college_id: collegeId,
    },
  ).catch(() => ({ result: [] as unknown }));

  const result = data?.result;
  if (Array.isArray(result)) {
    for (const chunk of result) {
      if (Array.isArray(chunk)) return chunk as AnyRow[];
    }
    return result as AnyRow[];
  }
  return [];
}

export async function listElectiveGroupMappings(params: {
  collegeId: number;
  academicYearId: number;
}): Promise<AnyRow[]> {
  const { collegeId, academicYearId } = params;
  if (!collegeId || !academicYearId) return [];

  const query = buildQuery(
    {
      "College.collegeId": collegeId,
      "AcademicYear.academicYearId": academicYearId,
      isActive: true,
    },
    { field: "electiveGroupyrMappingId", direction: "DESC" },
  );

  return domainList<AnyRow>("ElectiveGroupyrMapping", query).catch(() => []);
}

export async function listStudentEnrollmentElectives(params: {
  collegeId: number;
  academicYearId: number;
  courseId?: number;
  courseGroupId?: number;
  courseYearId?: number;
  groupSectionId?: number;
}): Promise<AnyRow[]> {
  const {
    collegeId,
    academicYearId,
    courseId = 0,
    courseGroupId = 0,
    courseYearId = 0,
    groupSectionId = 0,
  } = params;

  if (!collegeId || !academicYearId) return [];

  const data = await getAllRecords<{ result?: unknown }>(
    "s_get_std_electives",
    {
      in_college_id: collegeId,
      in_academic_year_id: academicYearId,
      in_course_id: courseId,
      in_course_group_id: courseGroupId,
      in_course_year_id: courseYearId,
      in_group_section_id: groupSectionId,
    },
  ).catch(() => ({ result: [] as unknown }));

  const result = data?.result;
  if (Array.isArray(result)) {
    for (const chunk of result) {
      if (Array.isArray(chunk)) return chunk as AnyRow[];
    }
    return result as AnyRow[];
  }
  return [];
}
