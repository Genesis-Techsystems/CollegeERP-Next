"use client";

import { Monitor } from "lucide-react";
import type { ProfileField } from "./profile-utils";
import {
  formatProfileDate,
  pickDisplay,
  pickText,
  studentFullName,
  studentPhotoSrc,
  studentStatusClass,
} from "./profile-utils";

type AnyRow = Record<string, any>;

export interface StudentProfileHeaderProps {
  student: AnyRow;
  feeLedger?: AnyRow | null;
}

export function StudentProfileHeader({
  student,
  feeLedger,
}: StudentProfileHeaderProps) {
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
    student.section ? `Section ${student.section}` : "",
  ]
    .filter(Boolean)
    .join(" / ");

  const metaFields: ProfileField[] = [
    {
      label: "Admission Date",
      value: formatProfileDate(
        student.adminssionDate ??
          student.admissionDate ??
          student.admission_date,
      ),
    },
    {
      label: "Quota",
      value: pickDisplay(student, ["quotaDisplayName", "quotaName"]),
    },
    {
      label: "Category",
      value: pickDisplay(feeLedger, [
        "scholarship_type_code",
        "scholarshipTypeCode",
      ]),
    },
    { label: "Student Status", value: statusLabel },
  ];

  return (
    <div className="app-card overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-4 py-2.5">
        <Monitor className="h-4 w-4 text-primary" aria-hidden />
        <h2 className="text-[15px] font-semibold text-primary">Student Details</h2>
      </div>

      <div className="border-4 border-sky-200/80 bg-sky-50/20 p-3 sm:p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          <div className="shrink-0">
            <img
              src={studentPhotoSrc(
                student.studentPhotoPath ?? student.student_photo_path,
              )}
              alt=""
              className="h-28 w-28 rounded border-4 border-sky-200 bg-white object-cover sm:h-32 sm:w-32"
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
            <p className="text-muted-foreground">
              {pickDisplay(student, ["hallticketNumber", "rollNumber"])}
            </p>
            {pathLine ? (
              <p className="text-muted-foreground">{pathLine}</p>
            ) : null}
            <p className="text-muted-foreground">
              {pickDisplay(student, [
                "mobile",
                "mobileNumber",
                "student_mobile_no",
              ])}
            </p>
          </div>

          <div className="space-y-1 text-sm lg:min-w-[200px]">
            {metaFields.map((field) => (
              <p key={field.label} className="text-foreground">
                <span>{field.label} : </span>
                {field.label === "Student Status" ? (
                  <span className={studentStatusClass(statusCode)}>
                    {field.value}
                  </span>
                ) : (
                  <span className="font-medium text-primary">
                    {field.value}
                  </span>
                )}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
