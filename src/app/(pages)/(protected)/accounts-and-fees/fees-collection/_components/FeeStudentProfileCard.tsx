"use client";

import { useState } from "react";
import type { StudentFeeSearchRow } from "@/types/fees-collection";

const DEFAULT_STUDENT_PHOTO = "/assets/images/avatars/default_Student.png";

function studentPhotoUrl(path?: string): string {
  const raw = String(path ?? "").trim();
  if (!raw) return "";
  return raw.includes("?") ? raw : `${raw}?${Date.now()}`;
}

function statusClass(code?: string): string {
  const c = String(code ?? "")
    .toUpperCase()
    .replace(/\s+/g, "");
  if (c.includes("INCOLLEGE")) return "text-emerald-700 font-semibold";
  if (c.includes("PASSEDOUT")) return "text-slate-600 font-medium";
  if (c.includes("DISCONTINUED")) return "text-amber-700 font-medium";
  if (c.includes("DETAIN")) return "text-orange-600 font-medium";
  if (c.includes("DTND")) return "text-red-600 font-medium";
  return "text-slate-700 font-medium";
}

export function FeeStudentProfileCard({
  student,
}: {
  readonly student: StudentFeeSearchRow;
}) {
  const [photoError, setPhotoError] = useState(false);
  const photoUrl = studentPhotoUrl(student.studentPhotoPath);

  const pathLine = [
    student.collegeCode,
    student.academicYear,
    student.courseCode,
    student.groupCode,
    student.courseYearName,
    student.section ? `Section ${student.section}` : "",
  ]
    .filter(Boolean)
    .join(" / ");

  return (
    <div className="rounded-sm border border-sky-200 bg-sky-50/30 p-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-sm border bg-white">
          {photoUrl && !photoError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoUrl}
              alt=""
              className="h-full w-full object-cover"
              onError={() => setPhotoError(true)}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={DEFAULT_STUDENT_PHOTO}
              alt=""
              className="h-full w-full object-cover"
            />
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-0.5 text-xs text-slate-500">
          <p className="text-sm font-medium text-slate-900">
            {student.firstName}{" "}
            <span className="text-blue-600 font-semibold">
              {student.isLateral ? "(LATERAL)" : "(REGULAR)"}
            </span>
          </p>
          <p>{student.hallticketNumber ?? student.rollNumber}</p>
          {pathLine ? <p>{pathLine}</p> : null}
          {student.mobile ? <p>{student.mobile}</p> : null}
        </div>
        <div className="space-y-1 text-xs sm:min-w-[160px]">
          {student.quotaDisplayName ? (
            <p className="text-slate-600">
              Quota:{" "}
              <span className="text-blue-600">{student.quotaDisplayName}</span>
            </p>
          ) : null}
          {student.studentStatusDisplayName ? (
            <p className="text-slate-600">
              Student Status:{" "}
              <span className={statusClass(student.studentStatusCode)}>
                {student.studentStatusDisplayName}
              </span>
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
