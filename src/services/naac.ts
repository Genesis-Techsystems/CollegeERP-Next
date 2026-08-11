/**
 * Staff NAAC — Angular `staff-naac` / Course Assessment parity.
 * Cascade + studentsList match `StaffNaacSubjectAssessmentComponent`.
 */
import { SETUP_API } from "@/config/constants/api";
import { buildQuery, domainList, fetchDetails } from "@/services/crud";

export type NaacCollege = {
  collegeId: number;
  collegeCode?: string;
  collegeName?: string;
};

export type NaacAcademicYear = {
  academicYearId: number;
  academicYear?: string;
  fromDate?: string;
};

export type NaacCourse = {
  courseId: number;
  courseCode?: string;
  courseName?: string;
};

export type NaacCourseGroup = {
  courseGroupId: number;
  groupCode?: string;
  groupName?: string;
};

export type NaacCourseYear = {
  courseYearId: number;
  courseYearName?: string;
  courseYearCode?: string;
  sortOrder?: number;
};

export type NaacSection = {
  groupSectionId: number;
  section?: string;
};

export type NaacSubjectOption = {
  subjectId: number;
  collegeId?: number;
  subjectName?: string;
  subjectCode?: string;
};

export type NaacCourseOutcomeRow = {
  subjectId?: number;
  collegeId?: number;
  subjectName?: string;
  subjectCode?: string;
  employeeName?: string;
  employeeDetail?: { employeeId?: number };
};

export type NaacStudentRow = {
  studentId?: number;
  firstName?: string;
  hallticketNumber?: string;
  studentPhotoPath?: string;
  [key: string]: unknown;
};

export type NaacMarksQuestion = { marks: number };

export type NaacStudentMarks = NaacStudentRow & {
  questions: NaacMarksQuestion[];
  secATotal: number;
  caseStudy: number;
  shortAnswers: number;
  subTotal1: number;
  continuousAssessment: number;
  onlineAssessment: number;
  attendence: number;
  subTotal2: number;
  grandTotal: number;
};

/** Angular default marks assigned in `getStudents()` after studentsList. */
export function withDefaultNaacMarks(
  student: NaacStudentRow,
): NaacStudentMarks {
  return {
    ...student,
    questions: [
      { marks: 4 },
      { marks: 4 },
      { marks: 4 },
      { marks: 4 },
      { marks: 3 },
      { marks: 3 },
      { marks: 3 },
    ],
    secATotal: 20,
    caseStudy: 10,
    shortAnswers: 10,
    subTotal1: 40,
    continuousAssessment: 35,
    onlineAssessment: 20,
    attendence: 5,
    subTotal2: 60,
    grandTotal: 100,
  };
}

export function getSectionATotal(questions: NaacMarksQuestion[]): number {
  return questions.reduce((sum, q) => sum + (Number(q.marks) || 0), 0);
}

export function getSubTotal1(student: NaacStudentMarks): number {
  return (
    getSectionATotal(student.questions) +
    (Number(student.caseStudy) || 0) +
    (Number(student.shortAnswers) || 0)
  );
}

export function getSubTotal2(student: NaacStudentMarks): number {
  return (
    (Number(student.continuousAssessment) || 0) +
    (Number(student.onlineAssessment) || 0) +
    (Number(student.attendence) || 0)
  );
}

export function getGrandTotal(student: NaacStudentMarks): number {
  return getSubTotal1(student) + getSubTotal2(student);
}

function asRows<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    if (Array.isArray(o.resultList)) return o.resultList as T[];
    if (Array.isArray(o.content)) return o.content as T[];
    if (Array.isArray(o.result)) return o.result as T[];
  }
  return [];
}

/** Angular: `listDetailsById(College, 'true', isActive)` */
export async function listNaacColleges(): Promise<NaacCollege[]> {
  return domainList<NaacCollege>("College", buildQuery({ isActive: true }));
}

/**
 * Angular: `listDetailsByTwoIdsWithSort(AcademicYear, collegeId, true, DESC,
 * College.collegeId, isActive, fromDate)`
 */
export async function listNaacAcademicYears(
  collegeId: number,
): Promise<NaacAcademicYear[]> {
  if (!collegeId) return [];
  return domainList<NaacAcademicYear>(
    "AcademicYear",
    buildQuery(
      { "College.collegeId": collegeId, isActive: true },
      { field: "fromDate", direction: "DESC" },
    ),
  );
}

/**
 * Angular: `listDetailsByTwoIds(Course, collegeId, true, College.collegeId, isActive)`
 */
export async function listNaacCourses(
  collegeId: number,
): Promise<NaacCourse[]> {
  if (!collegeId) return [];
  return domainList<NaacCourse>(
    "Course",
    buildQuery({ "College.collegeId": collegeId, isActive: true }),
  );
}

/**
 * Angular: `listDetailsByTwoIds(CourseGroup, courseId, true, Course.courseId, isActive)`
 */
export async function listNaacCourseGroups(
  courseId: number,
): Promise<NaacCourseGroup[]> {
  if (!courseId) return [];
  return domainList<NaacCourseGroup>(
    "CourseGroup",
    buildQuery({ "Course.courseId": courseId, isActive: true }),
  );
}

/**
 * Angular: `listDetailsByTwoIdsWithSortLtd(CourseYear, courseId, true, ASC,
 * Course.courseId, isActive, sortOrder)` ΓÇö size=100 in Angular.
 */
export async function listNaacCourseYears(
  courseId: number,
): Promise<NaacCourseYear[]> {
  if (!courseId) return [];
  // Angular `listDetailsByTwoIdsWithSortLtd` uses size=100; default domain list size is fine.
  return domainList<NaacCourseYear>(
    "CourseYear",
    buildQuery(
      { "Course.courseId": courseId, isActive: true },
      { field: "sortOrder", direction: "ASC" },
    ),
  );
}

/**
 * Angular: `listDetailsByFourIds(GroupSection, courseYearId, academicYearId,
 * courseGroupId, true, CourseYearΓÇª, AcademicYearΓÇª, CourseGroupΓÇª, isActive)`
 */
export async function listNaacSections(params: {
  courseYearId: number;
  academicYearId: number;
  courseGroupId: number;
}): Promise<NaacSection[]> {
  const { courseYearId, academicYearId, courseGroupId } = params;
  if (!courseYearId || !academicYearId || !courseGroupId) return [];
  return domainList<NaacSection>(
    "GroupSection",
    buildQuery({
      "CourseYear.courseYearId": courseYearId,
      "AcademicYear.academicYearId": academicYearId,
      "CourseGroup.courseGroupId": courseGroupId,
      isActive: true,
    }),
  );
}

/**
 * Angular: `listDetailsByTwoIds(CmCourseOutcome, employeeId, true,
 * employeeDetail.employeeId, isActive)`
 */
export async function listNaacCourseOutcomes(
  employeeId: number,
): Promise<NaacCourseOutcomeRow[]> {
  if (!employeeId) return [];
  return domainList<NaacCourseOutcomeRow>(
    SETUP_API.COURSE_OUTCOME,
    buildQuery({
      "employeeDetail.employeeId": employeeId,
      isActive: true,
    }),
  );
}

/** Deduplicate subjects from CmCourseOutcome rows (Angular loop). */
export function subjectsFromCourseOutcomes(
  rows: NaacCourseOutcomeRow[],
): NaacSubjectOption[] {
  const subjects: NaacSubjectOption[] = [];
  for (const row of rows) {
    const subjectId = Number(row.subjectId);
    if (!subjectId) continue;
    if (subjects.some((s) => s.subjectId === subjectId)) continue;
    subjects.push({
      subjectId,
      collegeId: Number(row.collegeId) || undefined,
      subjectName: row.subjectName,
      subjectCode: row.subjectCode,
    });
  }
  return subjects;
}

/**
 * Angular: `listByThreeIds(studentsList, collegeId, courseGroupId, groupSectionId,
 * collegeId, courseGroupId, groupSectionId)`
 * ΓåÆ GET `studentsList?collegeId=&courseGroupId=&groupSectionId=`
 */
export async function listNaacStudents(params: {
  collegeId: number;
  courseGroupId: number;
  groupSectionId: number;
}): Promise<NaacStudentRow[]> {
  const { collegeId, courseGroupId, groupSectionId } = params;
  if (!collegeId || !courseGroupId || !groupSectionId) return [];
  const data = await fetchDetails<unknown>("studentsList", {
    collegeId,
    courseGroupId,
    groupSectionId,
  });
  return asRows<NaacStudentRow>(data);
}
