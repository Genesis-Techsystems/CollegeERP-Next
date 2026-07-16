"use client";

import { Monitor } from "lucide-react";
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
    <div className="app-card overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-4 py-2.5">
        <Monitor className="h-4 w-4 text-primary" aria-hidden />
        <h2 className="text-[15px] font-semibold text-primary">Exam Results</h2>
      </div>

      <div className="border-4 border-[#c3d9ff] bg-[#f8fbff] p-3 sm:p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          <div className="shrink-0">
            <img
              src={studentPhotoSrc(
                String(
                  student.studentPhotoPath ?? student.student_photo_path ?? "",
                ),
              )}
              alt=""
              className="h-28 w-28 rounded border-4 border-[#c3d9ff] bg-white object-cover sm:h-32 sm:w-32"
              onError={(e) => {
                const img = e.currentTarget;
                if (!img.src.includes("default_Student.png")) {
                  img.src = "/assets/images/avatars/default_Student.png";
                }
              }}
            />
          </div>

          <div className="min-w-0 flex-1 space-y-1 text-sm">
            <p className="font-medium text-foreground">
              {studentFullName(student)}{" "}
              <span className="font-semibold text-primary">
                ({isLateral ? "LATERAL" : "REGULAR"})
              </span>
            </p>
            <p className="text-[#8c8c8c]">
              {pickDisplay(student, ["hallticketNumber", "rollNumber"])}
            </p>
            {pathLine ? <p className="text-[#8c8c8c]">{pathLine}</p> : null}
            <p className="text-[#8c8c8c]">
              {pickDisplay(student, [
                "mobile",
                "mobileNumber",
                "student_mobile_no",
              ])}
            </p>
          </div>

          <div className="space-y-1 text-sm lg:min-w-[220px]">
            <p className="text-foreground">
              <span>Admission Date : </span>
              <span className="font-medium text-primary">
                {formatProfileDate(
                  student.adminssionDate ??
                    student.admissionDate ??
                    student.admission_date,
                )}
              </span>
            </p>
            <p className="text-foreground">
              <span>Quota : </span>
              <span className="font-medium text-primary">
                {pickDisplay(student, ["quotaDisplayName", "quotaName"], "")}
              </span>
            </p>
            <p className="text-foreground">
              <span>Student Status : </span>
              <span className={studentStatusClass(statusCode)}>
                {statusLabel}
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
