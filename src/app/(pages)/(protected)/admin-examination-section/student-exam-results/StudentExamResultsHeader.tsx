"use client";

import {
  formatProfileDate,
  pickDisplay,
  pickText,
  studentFullName,
  studentPhotoSrc,
  studentStatusClass,
} from "@/app/(pages)/(protected)/admin-student-information-system/students-profile/profile-utils";

type AnyRow = Record<string, unknown>;

export function StudentExamResultsHeader({
  student,
}: {
  readonly student: AnyRow;
}) {
  const isLateral = student.isLateral === true;
  const statusCode = pickText(student, ["studentStatusCode", "statusCode"]);
  const statusLabel = pickDisplay(student, [
    "studentStatusDisplayName",
    "studentStatusName",
    "statusName",
  ]);

  const pathLine = [
    pickText(student, ["collegeCode", "college_code"]),
    pickText(student, ["academicYear", "academic_year"]),
    pickText(student, ["courseName", "course_code", "courseCode"]),
    pickText(student, ["groupCode", "group_code", "courseGroupCode"]),
    pickText(student, ["courseYearName", "course_year_name"]),
    student.section ? `Section ${String(student.section)}` : "",
  ]
    .filter(Boolean)
    .join(" / ");

  return (
    <div className="overflow-hidden border-[3px] border-[#c3d9ff] bg-white">
      <div className="flex flex-col sm:flex-row sm:items-stretch">
        <div className="flex shrink-0 items-center justify-center bg-[#c3d9ff] p-1.5 sm:w-[110px]">
          <img
            src={studentPhotoSrc(
              String(
                student.studentPhotoPath ?? student.student_photo_path ?? "",
              ),
            )}
            alt=""
            className="h-[88px] w-[88px] bg-white object-cover"
            onError={(e) => {
              const img = e.currentTarget;
              if (!img.src.includes("female_icon.png")) {
                img.src = "/assets/images/avatars/female_icon.png";
              }
            }}
          />
        </div>

        <div className="min-w-0 flex-1 space-y-1 px-5 py-3 text-[12px] leading-[1.35]">
          <p className="text-[13px] font-medium text-[#222]">
            {studentFullName(student)}{" "}
            <span className="font-semibold text-[#00008b]">
              ({isLateral ? "LATERAL" : "REGULAR"})
            </span>
          </p>
          <p className="text-[#777]">
            {pickDisplay(student, ["hallticketNumber", "rollNumber"])}
          </p>
          {pathLine ? <p className="text-[#777]">{pathLine}</p> : null}
          <p className="text-[#777]">
            {pickDisplay(student, [
              "mobile",
              "mobileNumber",
              "student_mobile_no",
            ])}
          </p>
        </div>

        <div className="space-y-1 px-5 py-3 text-[12px] leading-[1.35] sm:min-w-[235px]">
          <p className="text-[#222]">
            <span>Admission Date : </span>
            <span className="font-medium text-[#00008b]">
              {formatProfileDate(
                student.adminssionDate ??
                  student.admissionDate ??
                  student.admission_date,
              )}
            </span>
          </p>
          <p className="text-[#222]">
            <span>Quota : </span>
            <span className="font-medium uppercase text-[#00008b]">
              {pickDisplay(student, ["quotaDisplayName", "quotaName"], "")}
            </span>
          </p>
          <p className="text-[#222]">
            <span>Student Status : </span>
            <span className={studentStatusClass(statusCode)}>
              {statusLabel}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
