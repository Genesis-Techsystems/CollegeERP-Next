"use client";

import { BookOpen } from "lucide-react";
import { DIGITAL_LIBRARY_SUBJECT_COLORS } from "@/config/constants/api";
import type { OnlineCourseAcademicMapRow } from "@/services";
import { cn } from "@/lib/utils";

export function applySubjectCardColors(
  rows: OnlineCourseAcademicMapRow[],
  /** Angular manage/view cycle to 6; upload-course-content cycles to 5. */
  cycleAt = 6,
): OnlineCourseAcademicMapRow[] {
  let x = 1;
  return rows.map((row) => {
    const style =
      DIGITAL_LIBRARY_SUBJECT_COLORS[
        (x - 1) % DIGITAL_LIBRARY_SUBJECT_COLORS.length
      ] ?? DIGITAL_LIBRARY_SUBJECT_COLORS[0];
    if (x === cycleAt) x = 1;
    else x += 1;
    return { ...row, style };
  });
}

type SubjectCardsProps = {
  subjects: OnlineCourseAcademicMapRow[];
  onSelect: (row: OnlineCourseAcademicMapRow) => void;
  /** Angular cards show `onlineCourseDesc` on manage; other screens show subjectName. */
  titleKey?: "onlineCourseDesc" | "subjectName" | "onlineCourseName";
  className?: string;
};

export function OnlineCourseSubjectCards({
  subjects,
  onSelect,
  titleKey = "onlineCourseDesc",
  className,
}: SubjectCardsProps) {
  if (subjects.length === 0) return null;

  return (
    <div className={cn(className)}>
      <p className="m-0 bg-white px-3 py-2 text-[19px] font-semibold">
        <span className="text-blue-600"> Upload</span> Video Class
      </p>
      <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {subjects.map((row) => {
          const title =
            (titleKey === "onlineCourseDesc"
              ? row.onlineCourseDesc
              : titleKey === "onlineCourseName"
                ? row.onlineCourseName
                : row.subjectName) ||
            row.onlineCourseName ||
            row.subjectName ||
            "Subject";
          const key =
            row.onlinecourseAcademicmapId ??
            `${row.onlineCourseId}-${row.subjectId}-${title}`;
          return (
            <button
              key={String(key)}
              type="button"
              onClick={() => onSelect(row)}
              className="flex min-h-[140px] flex-col items-center justify-center rounded-lg px-3 py-4 text-center text-white shadow-sm transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              style={{
                background: row.style ?? DIGITAL_LIBRARY_SUBJECT_COLORS[0],
              }}
            >
              <BookOpen className="mb-2 h-8 w-8 opacity-90" aria-hidden />
              <span className="text-sm font-semibold leading-snug">
                {title}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
