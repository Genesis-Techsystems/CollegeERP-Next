"use client";

import { studentPhotoSrc } from "@/app/(pages)/(protected)/admin-student-information-system/students-profile/profile-utils";
import type { StudentFeeSearchRow } from "@/types/fees-collection";

export function CertificateStudentProfile({
  student,
}: {
  student: StudentFeeSearchRow;
}) {
  return (
    <div className="rounded-sm border-4 border-[#c3d9ff] bg-white px-4 py-3">
      <div className="flex flex-col gap-4 sm:flex-row">
        <img
          src={studentPhotoSrc(
            String(
              student.studentPhotoPath ?? student.student_photo_path ?? "",
            ),
          )}
          alt=""
          className="h-28 w-[80%] max-w-[120px] rounded border-4 border-[#c3d9ff] bg-[#c3d9ff] object-cover p-1.5 sm:h-auto"
          onError={(e) => {
            const img = e.currentTarget;
            if (!img.src.includes("default_Student.png")) {
              img.src = "/assets/images/avatars/default_Student.png";
            }
          }}
        />
        <div className="space-y-1 py-2.5 text-sm font-medium">
          <p>
            {student.firstName ?? "Student"} (
            <span className="text-blue-600">
              {student.quotaDisplayName ?? ""}
            </span>
            )
          </p>
          <p className="text-[#8c8c8c]">
            {student.rollNumber ?? student.hallticketNumber ?? "—"}
          </p>
          <p className="text-[#8c8c8c]">
            {student.collegeCode ?? "—"} / {student.academicYear ?? "—"} /{" "}
            {student.courseCode ?? "—"} / {student.groupCode ?? "—"} /{" "}
            {student.courseYearName ?? "—"} / Section {student.section ?? "—"}
          </p>
          <p className="text-[#8c8c8c]">{student.mobile ?? "—"}</p>
        </div>
      </div>
    </div>
  );
}
