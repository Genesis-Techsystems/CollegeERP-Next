"use client";

import type { ProfileField } from "./profile-utils";
import {
  pickDisplay,
  pickText,
  studentFullName,
  studentPhotoSrc,
} from "./profile-utils";
import {
  STUDENT_PROFILE_VIEW,
  formatAdmissionDate,
  studentProfileStatusClass,
} from "./profile-view-styles";

type AnyRow = Record<string, any>;

export interface StudentProfileHeaderProps {
  student: AnyRow;
  feeLedger?: AnyRow | null;
}

export function StudentProfileHeader({ student }: StudentProfileHeaderProps) {
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
    student.section ? `Section ${student.section}` : "Section",
  ]
    .filter(Boolean)
    .join(" / ");

  const metaFields: ProfileField[] = [
    {
      label: "Admission Date",
      value: formatAdmissionDate(
        student.adminssionDate ??
          student.admissionDate ??
          student.admission_date,
      ),
    },
    {
      label: "Quota",
      value: pickDisplay(student, ["quotaDisplayName", "quotaName"]),
    },
    { label: "Student Status", value: statusLabel },
  ];

  return (
    <div className="app-card overflow-hidden">
      <div
        className="border-2 p-3 sm:p-4"
        style={{
          borderColor: STUDENT_PROFILE_VIEW.photoBoxBorder,
          backgroundColor: `${STUDENT_PROFILE_VIEW.photoBoxBg}55`,
        }}
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
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

          <div className="min-w-0 flex-1 space-y-1 text-[13px]">
            <p
              className="text-[15px] font-bold uppercase leading-snug"
              style={{ color: STUDENT_PROFILE_VIEW.darkBlue }}
            >
              {studentFullName(student)}{" "}
              <span>({isLateral ? "LATERAL" : "REGULAR"})</span>
            </p>
            {pathLine ? (
              <p style={{ color: STUDENT_PROFILE_VIEW.label }}>{pathLine}</p>
            ) : null}
            <p style={{ color: STUDENT_PROFILE_VIEW.label }}>
              {pickDisplay(student, [
                "mobile",
                "mobileNumber",
                "student_mobile_no",
              ])}
            </p>
          </div>

          <div className="space-y-1 text-[13px] lg:min-w-[210px]">
            {metaFields.map((field) => (
              <p
                key={field.label}
                style={{ color: STUDENT_PROFILE_VIEW.label }}
              >
                <span>{field.label} : </span>
                {field.label === "Student Status" ? (
                  <span className={studentProfileStatusClass(statusCode)}>
                    {field.value}
                  </span>
                ) : (
                  <span
                    className="font-medium"
                    style={{ color: STUDENT_PROFILE_VIEW.linkBlue }}
                  >
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
