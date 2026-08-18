"use client";

/**
 * Angular `no-due-certificate` student summary — avatar + name (dept), roll no, path, mobile.
 */

import {
  pickDisplay,
  pickText,
  studentFullName,
  studentPhotoSrc,
} from "@/app/(pages)/(protected)/admin-student-information-system/students-profile/profile-utils";
import { STUDENT_PROFILE_VIEW } from "@/app/(pages)/(protected)/admin-student-information-system/students-profile/profile-view-styles";

type AnyRow = Record<string, unknown>;

export function NoDueStudentProfile({
  student,
}: Readonly<{ student: AnyRow }>) {
  const deptLabel = pickText(student, [
    "groupCode",
    "group_code",
    "courseGroupCode",
    "deptCode",
    "deptName",
  ]);

  const pathLine = [
    pickText(student, ["collegeCode", "college_code"]),
    pickText(student, ["academicYear", "academic_year"]),
    pickText(student, ["courseName", "course_code", "courseCode"]),
    pickText(student, ["groupCode", "group_code", "courseGroupCode"]),
    pickText(student, ["courseYearName", "course_year_name"]),
    student.section ? `Section ${student.section}` : "",
  ]
    .filter(Boolean)
    .join(" / ");

  return (
    <div
      className="rounded-sm border-2 p-3 sm:p-4"
      style={{
        borderColor: STUDENT_PROFILE_VIEW.photoBoxBorder,
        backgroundColor: `${STUDENT_PROFILE_VIEW.photoBoxBg}55`,
      }}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="shrink-0">
          <img
            src={studentPhotoSrc(
              student.studentPhotoPath ?? student.student_photo_path,
            )}
            alt=""
            className="h-[110px] w-[110px] border-2 bg-white object-cover sm:h-[120px] sm:w-[120px]"
            style={{ borderColor: STUDENT_PROFILE_VIEW.photoBoxBorder }}
            onError={(e) => {
              const img = e.currentTarget;
              if (!img.src.includes("default_Student.png")) {
                img.src = "/assets/images/avatars/default_Student.png";
              }
            }}
          />
        </div>

        <div className="min-w-0 flex-1 space-y-0.5 text-[13px]">
          <p
            className="text-[15px] font-bold leading-snug"
            style={{ color: STUDENT_PROFILE_VIEW.darkBlue }}
          >
            {studentFullName(student)}
            {deptLabel ? ` (${deptLabel})` : ""}
          </p>
          <p className="text-[#666]">
            {pickDisplay(student, [
              "rollNumber",
              "studentRollNo",
              "roll_number",
            ])}
          </p>
          {pathLine ? <p className="text-[#666]">{pathLine}</p> : null}
          <p className="text-[#666]">
            {pickDisplay(student, [
              "mobile",
              "mobileNumber",
              "student_mobile_no",
            ])}
          </p>
        </div>
      </div>
    </div>
  );
}
