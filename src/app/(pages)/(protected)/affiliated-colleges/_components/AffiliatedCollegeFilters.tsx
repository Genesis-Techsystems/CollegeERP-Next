"use client";

import type { ReactNode } from "react";
import { FilterCard } from "@/common/components/feedback";
import { Select } from "@/common/components/select";
import { Button } from "@/components/ui/button";
import type { useAffiliatedCascade } from "../_lib/use-affiliated-cascade";

type Cascade = ReturnType<typeof useAffiliatedCascade>;

function pickId(row: Record<string, unknown>, keys: string[]): number {
  for (const key of keys) {
    const n = Number(row[key]);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

function optLabel(row: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (v != null && String(v).trim() !== "") return String(v);
  }
  return "";
}

type AffiliatedCollegeFiltersProps = {
  title: string;
  cascade: Cascade;
  onGetDetails: () => void;
  loadingDetails?: boolean;
  showExam?: boolean;
  allowAllGroupYear?: boolean;
  /** College uploads approval — college, academic year, course only. */
  hideGroupYear?: boolean;
  /** Student Dost summary — college + academic year only (Angular parity). */
  hideCourse?: boolean;
  /** Student Dost summary/upload — show university filter before college. */
  showUniversity?: boolean;
  getDetailsLabel?: string;
  showBack?: boolean;
  onBack?: () => void;
  /** Bulk upload — filters are pre-filled from Student Summary and read-only. */
  readOnly?: boolean;
  hideGetDetails?: boolean;
  footerExtra?: ReactNode;
  /** Omit FilterCard wrapper (for FilteredListPage filters slot). */
  bare?: boolean;
};

export function AffiliatedCollegeFilters({
  title,
  cascade,
  onGetDetails,
  loadingDetails,
  showExam,
  allowAllGroupYear,
  hideGroupYear,
  hideCourse,
  showUniversity,
  getDetailsLabel = "Get Details",
  showBack,
  onBack,
  readOnly,
  hideGetDetails,
  footerExtra,
  bare,
}: AffiliatedCollegeFiltersProps) {
  const {
    isLoading,
    universityId,
    collegeId,
    academicYearId,
    courseId,
    courseGroupId,
    courseYearId,
    examId,
    setExamId,
    universities,
    colleges,
    academicYears,
    courses,
    courseGroups,
    courseYears,
    exams,
    onUniversityChange,
    onCollegeChange,
    onAcademicYearChange,
    onCourseChange,
    onCourseGroupChange,
    onCourseYearChange,
    filtersValid,
  } = cascade;

  const allOpt = { value: "0", label: "All" };
  const showCourse = !hideCourse;
  const showGroupYear = showCourse && !hideGroupYear;

  const content = (
    <>
      <div
        className={
          showUniversity && hideCourse
            ? "grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
            : hideCourse
              ? "grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
              : hideGroupYear
                ? "grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
                : "grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
        }
      >
        {showUniversity ? (
          <Select
            label="University"
            value={universityId != null ? String(universityId) : null}
            onChange={(v) => onUniversityChange(Number(v))}
            options={universities.map((u) => ({
              value: String(pickId(u, ["fk_university_id", "universityId"])),
              label: optLabel(u, "university_code", "universityCode"),
            }))}
            isLoading={isLoading}
            searchable
            disabled={readOnly}
          />
        ) : null}
        <Select
          label="College"
          value={collegeId != null ? String(collegeId) : null}
          onChange={(v) => onCollegeChange(Number(v))}
          options={colleges.map((c) => ({
            value: String(
              pickId(c, ["fk_college_id", "collegeId", "fk_collegeId"]),
            ),
            label: optLabel(c, "college_code", "collegeCode"),
          }))}
          isLoading={isLoading}
          searchable
          disabled={readOnly}
        />
        <Select
          label="Academic Year"
          value={academicYearId != null ? String(academicYearId) : null}
          onChange={(v) => onAcademicYearChange(Number(v))}
          options={academicYears.map((a) => ({
            value: String(pickId(a, ["fk_academic_year_id", "academicYearId"])),
            label: optLabel(a, "academic_year", "academicYear"),
          }))}
          disabled={readOnly || !collegeId}
          searchable
        />
        {showCourse ? (
          <Select
            label="Course"
            value={courseId != null ? String(courseId) : null}
            onChange={(v) => onCourseChange(Number(v))}
            options={courses.map((c) => ({
              value: String(pickId(c, ["fk_course_id", "courseId"])),
              label: optLabel(c, "course_code", "courseCode"),
            }))}
            disabled={readOnly || !academicYearId}
            searchable
          />
        ) : null}
        {showGroupYear ? (
          <>
            <Select
              label="Course Group"
              value={courseGroupId != null ? String(courseGroupId) : null}
              onChange={(v) => onCourseGroupChange(Number(v))}
              options={
                allowAllGroupYear
                  ? [
                      allOpt,
                      ...courseGroups.map((g) => ({
                        value: String(
                          pickId(g, ["fk_course_group_id", "courseGroupId"]),
                        ),
                        label: optLabel(
                          g,
                          "group_code",
                          "groupCode",
                          "group_name",
                          "groupName",
                        ),
                      })),
                    ]
                  : courseGroups.map((g) => ({
                      value: String(
                        pickId(g, ["fk_course_group_id", "courseGroupId"]),
                      ),
                      label: optLabel(
                        g,
                        "group_code",
                        "groupCode",
                        "group_name",
                        "groupName",
                      ),
                    }))
              }
              disabled={readOnly || !courseId}
            />
            <Select
              label="Course Year"
              value={courseYearId != null ? String(courseYearId) : null}
              onChange={(v) => onCourseYearChange(Number(v))}
              options={
                allowAllGroupYear
                  ? [
                      allOpt,
                      ...courseYears.map((y) => ({
                        value: String(
                          pickId(y, ["fk_course_year_id", "courseYearId"]),
                        ),
                        label: optLabel(
                          y,
                          "course_year_name",
                          "courseYearName",
                        ),
                      })),
                    ]
                  : courseYears.map((y) => ({
                      value: String(
                        pickId(y, ["fk_course_year_id", "courseYearId"]),
                      ),
                      label: optLabel(y, "course_year_name", "courseYearName"),
                    }))
              }
              disabled={readOnly || courseGroupId == null}
            />
          </>
        ) : null}
      </div>
      {showExam ? (
        <div className="mt-3 max-w-xl">
          <Select
            label="Exam"
            value={examId != null ? String(examId) : null}
            onChange={(v) => setExamId(v ? Number(v) : null)}
            options={exams.map((e) => ({
              value: String(pickId(e, ["fk_exam_id", "examId"])),
              label: optLabel(e, "exam_name", "examName"),
            }))}
            disabled={!courseYearId}
            searchable
          />
        </div>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2 justify-end">
        {footerExtra}
        {showBack && onBack ? (
          <Button type="button" variant="outline" onClick={onBack}>
            Back
          </Button>
        ) : null}
        {!hideGetDetails ? (
          <Button
            type="button"
            onClick={onGetDetails}
            disabled={!filtersValid || loadingDetails}
          >
            {loadingDetails ? "Loading…" : getDetailsLabel}
          </Button>
        ) : null}
      </div>
    </>
  );

  if (bare) return content;

  return (
    <FilterCard title={title} defaultOpen>
      {content}
    </FilterCard>
  );
}
