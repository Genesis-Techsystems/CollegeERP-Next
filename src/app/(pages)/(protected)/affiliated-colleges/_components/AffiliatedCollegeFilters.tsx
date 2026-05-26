'use client'

import { FilterCard } from '@/common/components/feedback'
import { Select } from '@/common/components/select'
import { Button } from '@/components/ui/button'
import type { useAffiliatedCascade } from '../_lib/use-affiliated-cascade'

type Cascade = ReturnType<typeof useAffiliatedCascade>

function num(row: Record<string, unknown>, key: string): number {
  return Number(row[key] ?? 0)
}

function optLabel(row: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = row[k]
    if (v != null && String(v).trim() !== '') return String(v)
  }
  return ''
}

type AffiliatedCollegeFiltersProps = {
  title: string
  cascade: Cascade
  onGetDetails: () => void
  loadingDetails?: boolean
  showExam?: boolean
  allowAllGroupYear?: boolean
  /** College uploads approval — college, academic year, course only. */
  hideGroupYear?: boolean
  showBack?: boolean
  onBack?: () => void
}

export function AffiliatedCollegeFilters({
  title,
  cascade,
  onGetDetails,
  loadingDetails,
  showExam,
  allowAllGroupYear,
  hideGroupYear,
  showBack,
  onBack,
}: AffiliatedCollegeFiltersProps) {
  const {
    isLoading,
    collegeId,
    academicYearId,
    courseId,
    courseGroupId,
    courseYearId,
    examId,
    setExamId,
    colleges,
    academicYears,
    courses,
    courseGroups,
    courseYears,
    exams,
    onCollegeChange,
    onAcademicYearChange,
    onCourseChange,
    onCourseGroupChange,
    onCourseYearChange,
    filtersValid,
  } = cascade

  const allOpt = { value: '0', label: 'All' }

  return (
    <FilterCard title={title} defaultOpen>
      <div
        className={
          hideGroupYear
            ? 'grid gap-3 sm:grid-cols-2 lg:grid-cols-4'
            : 'grid gap-3 sm:grid-cols-2 lg:grid-cols-5'
        }
      >
        <Select
          label="College"
          value={collegeId != null ? String(collegeId) : null}
          onChange={(v) => onCollegeChange(Number(v))}
          options={colleges.map((c) => ({
            value: String(num(c, 'fk_college_id')),
            label: optLabel(c, 'college_code', 'collegeCode'),
          }))}
          isLoading={isLoading}
          searchable
        />
        <Select
          label="Academic Year"
          value={academicYearId != null ? String(academicYearId) : null}
          onChange={(v) => onAcademicYearChange(Number(v))}
          options={academicYears.map((a) => ({
            value: String(num(a, 'fk_academic_year_id')),
            label: optLabel(a, 'academic_year', 'academicYear'),
          }))}
          disabled={!collegeId}
          searchable
        />
        <Select
          label="Course"
          value={courseId != null ? String(courseId) : null}
          onChange={(v) => onCourseChange(Number(v))}
          options={courses.map((c) => ({
            value: String(num(c, 'fk_course_id')),
            label: optLabel(c, 'course_code', 'courseCode'),
          }))}
          disabled={!academicYearId}
          searchable
        />
        {!hideGroupYear ? (
          <>
            <Select
              label="Course Group"
              value={courseGroupId != null ? String(courseGroupId) : null}
              onChange={(v) => onCourseGroupChange(Number(v))}
              options={
                allowAllGroupYear
                  ? [allOpt, ...courseGroups.map((g) => ({
                      value: String(num(g, 'fk_course_group_id')),
                      label: optLabel(g, 'group_code', 'groupCode'),
                    }))]
                  : courseGroups.map((g) => ({
                      value: String(num(g, 'fk_course_group_id')),
                      label: optLabel(g, 'group_code', 'groupCode'),
                    }))
              }
              disabled={!courseId}
            />
            <Select
              label="Course Year"
              value={courseYearId != null ? String(courseYearId) : null}
              onChange={(v) => onCourseYearChange(Number(v))}
              options={
                allowAllGroupYear
                  ? [allOpt, ...courseYears.map((y) => ({
                      value: String(num(y, 'fk_course_year_id')),
                      label: optLabel(y, 'course_year_name', 'courseYearName'),
                    }))]
                  : courseYears.map((y) => ({
                      value: String(num(y, 'fk_course_year_id')),
                      label: optLabel(y, 'course_year_name', 'courseYearName'),
                    }))
              }
              disabled={courseGroupId == null}
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
              value: String(num(e, 'fk_exam_id')),
              label: optLabel(e, 'exam_name', 'examName'),
            }))}
            disabled={!courseYearId}
            searchable
          />
        </div>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2 justify-end">
        {showBack && onBack ? (
          <Button type="button" variant="outline" onClick={onBack}>
            Back
          </Button>
        ) : null}
        <Button
          type="button"
          onClick={onGetDetails}
          disabled={!filtersValid || loadingDetails}
        >
          {loadingDetails ? 'Loading…' : 'Get Details'}
        </Button>
      </div>
    </FilterCard>
  )
}
