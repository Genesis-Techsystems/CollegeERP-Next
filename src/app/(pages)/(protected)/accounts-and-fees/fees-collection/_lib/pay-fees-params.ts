import type {
  StudentFeeSearchRow,
  StudentFeeStructureRow,
} from "@/types/fees-collection";

export function buildPayFeesSearchParams(
  student: StudentFeeSearchRow,
  row: StudentFeeStructureRow,
  page = "fee-payment",
): URLSearchParams {
  const params = new URLSearchParams({
    collegeId: String(student.collegeId ?? ""),
    studentId: String(row.studentId ?? student.studentId),
    page,
  });
  if (row.academicYearId)
    params.set("academicYearId", String(row.academicYearId));
  if (row.academicYear) params.set("academicYear", String(row.academicYear));
  if (row.feeStructureId)
    params.set("feeStructureId", String(row.feeStructureId));
  if (student.collegeCode)
    params.set("collegeCode", String(student.collegeCode));
  if (student.rollNumber) params.set("rollNumber", String(student.rollNumber));
  if (student.hallticketNumber)
    params.set("hallTicketNo", String(student.hallticketNumber));
  if (student.quotaDisplayName)
    params.set("quotaDisplayName", String(student.quotaDisplayName));
  if (row.courseName) params.set("courseCode", String(row.courseName));
  if (row.groupName) params.set("groupCode", String(row.groupName));
  if (row.courseYearName)
    params.set("courseYearName", String(row.courseYearName));
  if (row.courseYearId) params.set("courseYearId", String(row.courseYearId));
  if (row.courseYearNo != null)
    params.set("courseYearNo", String(row.courseYearNo));
  if (row.section) params.set("section", String(row.section));
  if (row.structureName) params.set("structureName", String(row.structureName));
  if (row.classGroupName)
    params.set("classGroupName", String(row.classGroupName));
  if (row.firstName ?? student.firstName) {
    params.set("firstName", String(row.firstName ?? student.firstName));
  }
  if (student.studentStatusCode)
    params.set("studentStatusCode", String(student.studentStatusCode));
  if (student.studentStatusDisplayName) {
    params.set(
      "studentStatusDisplayName",
      String(student.studentStatusDisplayName),
    );
  }
  if (student.isLateral != null)
    params.set("isLateral", String(student.isLateral));
  return params;
}

/** Inverse of buildPayFeesSearchParams — hydrate a student row from URL query. */
export function studentFromPayQueryParams(
  qs: URLSearchParams,
): StudentFeeSearchRow | null {
  const studentId = Number(qs.get("studentId") ?? 0);
  if (!studentId) return null;
  return {
    studentId,
    firstName: qs.get("firstName") ?? undefined,
    rollNumber: qs.get("rollNumber") ?? undefined,
    hallticketNumber: qs.get("hallTicketNo") ?? undefined,
    collegeId: Number(qs.get("collegeId") ?? 0) || undefined,
    collegeCode: qs.get("collegeCode") ?? undefined,
    academicYear: qs.get("academicYear") ?? undefined,
    courseCode: qs.get("courseCode") ?? undefined,
    groupCode: qs.get("groupCode") ?? undefined,
    courseYearName: qs.get("courseYearName") ?? undefined,
    section: qs.get("section") ?? undefined,
    quotaDisplayName: qs.get("quotaDisplayName") ?? undefined,
    studentStatusCode: qs.get("studentStatusCode") ?? undefined,
    studentStatusDisplayName: qs.get("studentStatusDisplayName") ?? undefined,
    isLateral: qs.get("isLateral") === "true",
  };
}
