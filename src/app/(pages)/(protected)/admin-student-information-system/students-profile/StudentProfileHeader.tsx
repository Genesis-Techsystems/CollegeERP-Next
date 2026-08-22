"use client";

import type { ProfileField } from "./profile-utils";
import {
  pickDisplay,
  pickText,
  studentFullName,
  studentPhotoSrc,
} from "./profile-utils";
import {
  formatAdmissionDate,
  studentProfileStatusClass,
} from "./profile-view-styles";

type AnyRow = Record<string, any>;

export interface StudentProfileHeaderProps {
  student: AnyRow;
  feeLedger?: AnyRow | null;
}

/** Angular `student-profile` header — photo | identity | admission/quota/category/status */
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
    student.section != null && String(student.section).trim() !== ""
      ? `Section ${student.section}`
      : "Section",
  ]
    .filter(Boolean)
    .join(" / ");

  const category =
    pickText(feeLedger, [
      "scholarship_type_code",
      "scholarshipTypeCode",
      "scholarship_type",
    ]) || "";
  const categoryTip = pickText(feeLedger, [
    "scholarship_type_desc",
    "scholarshipTypeDesc",
    "scholarship_type_description",
  ]);

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
      value: pickDisplay(student, ["quotaDisplayName", "quotaName"], ""),
    },
    { label: "Category", value: category },
    { label: "Student Status", value: statusLabel === "—" ? "" : statusLabel },
  ];

  return (
    <div className="mx-2 mb-2 overflow-hidden rounded-[3px] border-4 border-[#c3d9ff]">
      <div className="flex flex-col gap-3 p-2 sm:flex-row sm:items-start">
        <div className="w-full shrink-0 sm:w-[15%]">
          <img
            src={studentPhotoSrc(
              student.studentPhotoPath ?? student.student_photo_path,
            )}
            alt=""
            className="w-[80%] max-w-[140px] bg-[#c3d9ff] object-cover p-1.5"
            onError={(e) => {
              const img = e.currentTarget;
              if (!img.src.includes("default_Student.png")) {
                img.src = "/assets/images/avatars/default_Student.png";
              }
            }}
          />
        </div>

        <div className="min-w-0 flex-1 space-y-0.5 py-2.5 text-[13px] sm:w-[60%]">
          <p className="text-[15px] font-semibold uppercase leading-snug text-[#042956]">
            {studentFullName(student)}(
            <span className="text-[blue]">
              {isLateral ? "LATERAL" : "REGULAR"}
            </span>
            )
          </p>
          <p className="text-[#8c8c8c]">
            {pickText(student, [
              "hallticketNumber",
              "hallTicketNumber",
              "rollNumber",
            ])}
          </p>
          {pathLine ? <p className="text-[#8c8c8c]">{pathLine}</p> : null}
          <p className="text-[#8c8c8c]">
            {pickText(student, ["mobile", "mobileNumber", "student_mobile_no"])}
          </p>
        </div>

        <div className="space-y-0 text-[15px] text-black sm:min-w-[220px]">
          {metaFields.map((field) => (
            <div key={field.label} className="py-1.5">
              <span>{field.label} : </span>
              {field.label === "Student Status" ? (
                statusCode ? (
                  <span className={studentProfileStatusClass(statusCode)}>
                    {field.value}
                  </span>
                ) : null
              ) : (
                <span
                  className="text-[blue]"
                  title={
                    field.label === "Category" && categoryTip
                      ? categoryTip
                      : undefined
                  }
                >
                  {field.value}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
