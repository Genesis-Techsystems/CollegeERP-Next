"use client";

import type { ReactNode } from "react";
import { format } from "date-fns";
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

function formatExamOptionLabel(row: Record<string, unknown>): string {
  const name = optLabel(row, "exam_name", "examName");
  const fromRaw = row.from_date ?? row.fromDate;
  const toRaw = row.to_date ?? row.toDate;
  let range = "";
  if (fromRaw || toRaw) {
    const from = fromRaw ? new Date(String(fromRaw)) : null;
    const to = toRaw ? new Date(String(toRaw)) : null;
    const fromLabel =
      from && !Number.isNaN(from.getTime())
        ? format(from, "MMM d, yyyy")
        : "";
    const toLabel =
      to && !Number.isNaN(to.getTime()) ? format(to, "MMM d, yyyy") : "";
    if (fromLabel || toLabel) range = ` (${fromLabel} - ${toLabel})`;
  }
  const tags: string[] = [];
  if (row.is_internal_exam || row.isInternalExam) tags.push("(Internal)");
  if (row.is_regular_exam || row.isRegularExam) tags.push("(Regular)");
  if (row.is_supply_exam || row.isSupplyExam) tags.push("(Supple)");
  return `${name}${range}${tags.length ? ` ${tags.join("")}` : ""}`;
}

type AffiliatedCollegeFiltersProps = {
  title: string;
  cascade: Cascade;
  onGetDetails: () => void;
  loadingDetails?: boolean;
  showExam?: boolean;
  /**
   * Exam registration — Exam after Course (Angular order), before Group/Year.
   * Requires `showExam`.
   */
  examFirst?: boolean;
  /**
   * Internal/external marks — Angular order:
   * Course | Exam Year | Exam | College, then Group | Year.
   * Requires `showExam`.
   */
  courseFirst?: boolean;
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
  /** Subject upload — show regulation filter (Angular parity). */
  showRegulation?: boolean;
  /** Hide "All" regulation option — subject upload auto-picks a regulation. */
  hideAllRegulation?: boolean;
  hideGetDetails?: boolean;
  footerExtra?: ReactNode;
  /** Place `footerExtra` on the left; buttons stay on the right (attendance summary). */
  footerExtraAlign?: "start" | "end";
  /** Omit FilterCard wrapper (for FilteredListPage filters slot). */
  bare?: boolean;
};

export function AffiliatedCollegeFilters({
  title,
  cascade,
  onGetDetails,
  loadingDetails,
  showExam,
  examFirst,
  courseFirst,
  allowAllGroupYear,
  hideGroupYear,
  hideCourse,
  showUniversity,
  getDetailsLabel = "Get Details",
  showBack,
  onBack,
  readOnly,
  showRegulation,
  hideAllRegulation,
  hideGetDetails,
  footerExtra,
  footerExtraAlign = "end",
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
    regulations,
    regulationId,
    onRegulationChange,
    exams,
    onUniversityChange,
    onCollegeChange,
    onAcademicYearChange,
    onCourseChange,
    onCourseGroupChange,
    onCourseYearChange,
    onExamChange,
    filtersValid,
  } = cascade;

  const allOpt = { value: "0", label: "All" };
  const showCourse = !hideCourse;
  const showGroupYear = showCourse && !hideGroupYear;
  const examInPrimaryRow = Boolean(showExam && (examFirst || courseFirst));
  const marksLayout = Boolean(showExam && courseFirst);

  const examSelect = showExam ? (
    <Select
      label="Exam"
      value={examId != null ? String(examId) : null}
      onChange={(v) => {
        const id = v ? Number(v) : 0;
        if (onExamChange) onExamChange(id);
        else setExamId(id || null);
      }}
      options={exams.map((e) => ({
        value: String(pickId(e, ["fk_exam_id", "examId"])),
        label: formatExamOptionLabel(e),
      }))}
      disabled={
        readOnly ||
        (courseFirst
          ? !courseId || !academicYearId
          : examFirst
            ? !courseId
            : courseYearId == null || !courseYearId)
      }
      searchable
    />
  ) : null;

  const courseGroupSelect = showGroupYear ? (
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
      disabled={
        readOnly ||
        !courseId ||
        (courseFirst
          ? !collegeId || !examId
          : examFirst
            ? !examId
            : false)
      }
    />
  ) : null;

  const courseYearSelect = showGroupYear ? (
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
                label: optLabel(y, "course_year_name", "courseYearName"),
              })),
            ]
          : courseYears.map((y) => ({
              value: String(
                pickId(y, ["fk_course_year_id", "courseYearId"]),
              ),
              label: optLabel(y, "course_year_name", "courseYearName"),
            }))
      }
      disabled={
        readOnly ||
        courseGroupId == null ||
        (courseFirst
          ? !collegeId || !examId
          : examFirst
            ? !examId
            : false)
      }
    />
  ) : null;

  const actionButtons = (
    <div className="flex flex-wrap gap-2 items-end">
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
  );

  const content = (
    <>
      {/* Angular marks: row1 = Course | Exam Year | Exam | College */}
      {marksLayout ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Select
            label="Course"
            value={courseId != null ? String(courseId) : null}
            onChange={(v) => onCourseChange(Number(v))}
            options={courses.map((c) => ({
              value: String(pickId(c, ["fk_course_id", "courseId"])),
              label: optLabel(c, "course_code", "courseCode"),
            }))}
            isLoading={isLoading}
            searchable
            disabled={readOnly}
          />
          <Select
            label="Exam Year"
            value={academicYearId != null ? String(academicYearId) : null}
            onChange={(v) => onAcademicYearChange(Number(v))}
            options={academicYears.map((a) => ({
              value: String(
                pickId(a, ["fk_academic_year_id", "academicYearId"]),
              ),
              label: optLabel(a, "academic_year", "academicYear"),
            }))}
            disabled={readOnly || !courseId}
            searchable
          />
          {examSelect}
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
            disabled={readOnly || !examId}
            searchable
          />
        </div>
      ) : (
        <div
          className={
            examInPrimaryRow
              ? "grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
              : showUniversity && hideCourse
                ? "grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
                : hideCourse
                  ? "grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
                  : hideGroupYear
                    ? "grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
                    : showRegulation
                      ? "grid gap-3 sm:grid-cols-2 lg:grid-cols-6"
                      : "grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
          }
        >
          {showUniversity ? (
            <Select
              label="University"
              value={universityId != null ? String(universityId) : null}
              onChange={(v) => onUniversityChange(Number(v))}
              options={universities.map((u) => ({
                value: String(
                  pickId(u, ["fk_university_id", "universityId"]),
                ),
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
              value: String(
                pickId(a, ["fk_academic_year_id", "academicYearId"]),
              ),
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
          {examInPrimaryRow ? examSelect : null}
          {showRegulation ? (
            <Select
              label="Regulation"
              value={regulationId != null ? String(regulationId) : null}
              onChange={(v) => onRegulationChange(Number(v))}
              options={[
                ...(hideAllRegulation ? [] : [{ value: "0", label: "All" }]),
                ...regulations.map((r) => ({
                  value: String(
                    pickId(r, ["fk_regulation_id", "regulationId"]),
                  ),
                  label: optLabel(r, "regulation_code", "regulationCode"),
                })),
              ]}
              disabled={readOnly || !courseId}
            />
          ) : null}
          {!examInPrimaryRow && showGroupYear ? (
            <>
              {courseGroupSelect}
              {courseYearSelect}
            </>
          ) : null}
        </div>
      )}

      {/* Angular exam-reg / marks: row2 = Course Group | Course Year | Back | Get Details */}
      {examInPrimaryRow && showGroupYear ? (
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2 lg:max-w-xl">
            {courseGroupSelect}
            {courseYearSelect}
          </div>
          <div className="ml-auto flex flex-wrap items-end gap-2">
            {footerExtra}
            {actionButtons}
          </div>
        </div>
      ) : null}

      {showExam && !examFirst && !courseFirst ? (
        <div className="mt-3 max-w-xl">{examSelect}</div>
      ) : null}

      {!examInPrimaryRow ? (
        <div
          className={
            footerExtra && footerExtraAlign === "start"
              ? "mt-4 flex flex-wrap items-end justify-between gap-3"
              : "mt-4 flex flex-wrap gap-2 justify-end"
          }
        >
          {footerExtra ? (
            <div
              className={
                footerExtraAlign === "start"
                  ? "flex flex-wrap gap-3"
                  : undefined
              }
            >
              {footerExtra}
            </div>
          ) : null}
          {actionButtons}
        </div>
      ) : null}
    </>
  );

  if (bare) return content;

  return (
    <FilterCard title={title} defaultOpen>
      {content}
    </FilterCard>
  );
}
