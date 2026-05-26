'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { QK } from '@/lib/query-keys'
import {
  getAffiliatedCollegeExamFilters,
  getAffiliatedCollegeFilters,
  resolveAffiliatedEmployeeId,
  resolveAffiliatedOrgId,
} from '@/services'
import type { AffiliatedCollegeFilterRow } from '@/types/affiliated-colleges'

type AnyRow = AffiliatedCollegeFilterRow

function num(row: AnyRow, key: string): number {
  const n = Number(row[key])
  return Number.isFinite(n) ? n : 0
}

function distinctBy<T extends AnyRow>(rows: T[], key: keyof T | string): T[] {
  const seen = new Set<number>()
  const out: T[] = []
  for (const row of rows) {
    const id = num(row, String(key))
    if (id <= 0 || seen.has(id)) continue
    seen.add(id)
    out.push(row)
  }
  return out
}

function label(row: AnyRow, ...keys: string[]): string {
  for (const k of keys) {
    const v = row[k]
    if (v != null && String(v).trim() !== '') return String(v)
  }
  return ''
}

export type AffiliatedCascadeOptions = {
  /** Use `clg_exam_filters` proc flag (exam payments, university report). */
  examFilters?: boolean
  /** Allow "All" (0) for group/year selects — Angular summary parity. */
  allowAllGroupYear?: boolean
  /** Auto-select first college on load (Angular default). */
  autoSelectFirst?: boolean
  /** College uploads approval only needs college / year / course (Angular staffForm). */
  requireGroupYear?: boolean
}

export function useAffiliatedCascade(options: AffiliatedCascadeOptions = {}) {
  const orgId = resolveAffiliatedOrgId()
  const empId = resolveAffiliatedEmployeeId()

  const { data: filterBundle, isLoading } = useQuery({
    queryKey: options.examFilters
      ? QK.affiliatedColleges.examFilters(orgId, empId)
      : QK.affiliatedColleges.collegeFilters(orgId, empId),
    queryFn: () =>
      options.examFilters
        ? getAffiliatedCollegeExamFilters(orgId, empId)
        : getAffiliatedCollegeFilters(orgId, empId).then((r) => ({
            filtersData: r.filtersData,
            regulationData: [] as AnyRow[],
          })),
  })

  const filtersData = filterBundle?.filtersData ?? []

  const [collegeId, setCollegeId] = useState<number | null>(null)
  const [academicYearId, setAcademicYearId] = useState<number | null>(null)
  const [courseId, setCourseId] = useState<number | null>(null)
  const [courseGroupId, setCourseGroupId] = useState<number | null>(null)
  const [courseYearId, setCourseYearId] = useState<number | null>(null)
  const [examId, setExamId] = useState<number | null>(null)

  const colleges = useMemo(
    () =>
      distinctBy(filtersData, 'fk_college_id').sort(
        (a, b) => num(a, 'clg_sort_order') - num(b, 'clg_sort_order'),
      ),
    [filtersData],
  )

  const academicYears = useMemo(() => {
    if (!collegeId) return []
    return distinctBy(
      filtersData.filter((r) => num(r, 'fk_college_id') === collegeId),
      'fk_academic_year_id',
    )
  }, [filtersData, collegeId])

  const courses = useMemo(() => {
    if (!collegeId || !academicYearId) return []
    return distinctBy(
      filtersData.filter(
        (r) => num(r, 'fk_college_id') === collegeId && num(r, 'fk_academic_year_id') === academicYearId,
      ),
      'fk_course_id',
    )
  }, [filtersData, collegeId, academicYearId])

  const courseGroups = useMemo(() => {
    if (!collegeId || !academicYearId || !courseId) return []
    return distinctBy(
      filtersData.filter(
        (r) =>
          num(r, 'fk_college_id') === collegeId &&
          num(r, 'fk_academic_year_id') === academicYearId &&
          num(r, 'fk_course_id') === courseId,
      ),
      'fk_course_group_id',
    )
  }, [filtersData, collegeId, academicYearId, courseId])

  const courseYears = useMemo(() => {
    if (!collegeId || !academicYearId || !courseId || courseGroupId == null) return []
    const base = filtersData.filter(
      (r) =>
        num(r, 'fk_college_id') === collegeId &&
        num(r, 'fk_academic_year_id') === academicYearId &&
        num(r, 'fk_course_id') === courseId &&
        (courseGroupId === 0 || num(r, 'fk_course_group_id') === courseGroupId),
    )
    return distinctBy(base, 'fk_course_year_id').sort(
      (a, b) => num(a, 'year_order') - num(b, 'year_order'),
    )
  }, [filtersData, collegeId, academicYearId, courseId, courseGroupId])

  const exams = useMemo(() => {
    if (!collegeId || !academicYearId || !courseId || courseGroupId == null || !courseYearId) return []
    return distinctBy(
      filtersData.filter(
        (r) =>
          num(r, 'fk_college_id') === collegeId &&
          num(r, 'fk_academic_year_id') === academicYearId &&
          num(r, 'fk_course_id') === courseId &&
          num(r, 'fk_course_group_id') === courseGroupId &&
          num(r, 'fk_course_year_id') === courseYearId,
      ),
      'fk_exam_id',
    )
  }, [filtersData, collegeId, academicYearId, courseId, courseGroupId, courseYearId])

  useEffect(() => {
    if (!options.autoSelectFirst || colleges.length === 0 || collegeId != null) return
    setCollegeId(num(colleges[0], 'fk_college_id'))
  }, [options.autoSelectFirst, colleges, collegeId])

  useEffect(() => {
    if (!options.autoSelectFirst || academicYears.length === 0) return
    if (academicYearId == null) setAcademicYearId(num(academicYears[0], 'fk_academic_year_id'))
  }, [options.autoSelectFirst, academicYears, academicYearId])

  useEffect(() => {
    if (!options.autoSelectFirst || courses.length === 0) return
    if (courseId == null) setCourseId(num(courses[0], 'fk_course_id'))
  }, [options.autoSelectFirst, courses, courseId])

  useEffect(() => {
    if (!options.autoSelectFirst || courseGroups.length === 0) return
    if (courseGroupId == null) {
      setCourseGroupId(
        options.allowAllGroupYear ? 0 : num(courseGroups[0], 'fk_course_group_id'),
      )
    }
  }, [options.autoSelectFirst, courseGroups, courseGroupId, options.allowAllGroupYear])

  useEffect(() => {
    if (!options.autoSelectFirst || courseYears.length === 0) return
    if (courseYearId == null) {
      setCourseYearId(
        options.allowAllGroupYear ? 0 : num(courseYears[0], 'fk_course_year_id'),
      )
    }
  }, [options.autoSelectFirst, courseYears, courseYearId, options.allowAllGroupYear])

  useEffect(() => {
    if (!options.examFilters || exams.length === 0 || examId != null) return
    setExamId(num(exams[0], 'fk_exam_id'))
  }, [options.examFilters, exams, examId])

  const onCollegeChange = useCallback((id: number) => {
    setCollegeId(id)
    setAcademicYearId(null)
    setCourseId(null)
    setCourseGroupId(null)
    setCourseYearId(null)
    setExamId(null)
  }, [])

  const onAcademicYearChange = useCallback((id: number) => {
    setAcademicYearId(id)
    setCourseId(null)
    setCourseGroupId(null)
    setCourseYearId(null)
    setExamId(null)
  }, [])

  const onCourseChange = useCallback((id: number) => {
    setCourseId(id)
    setCourseGroupId(null)
    setCourseYearId(null)
    setExamId(null)
  }, [])

  const onCourseGroupChange = useCallback((id: number) => {
    setCourseGroupId(id)
    setCourseYearId(null)
    setExamId(null)
  }, [])

  const onCourseYearChange = useCallback((id: number) => {
    setCourseYearId(id)
    setExamId(null)
  }, [])

  const contextLabel = useMemo(() => {
    const parts: string[] = []
    const college = colleges.find((c) => num(c, 'fk_college_id') === collegeId)
    if (college) parts.push(label(college, 'college_code', 'collegeCode'))
    const ay = academicYears.find((a) => num(a, 'fk_academic_year_id') === academicYearId)
    if (ay) parts.push(label(ay, 'academic_year', 'academicYear'))
    const course = courses.find((c) => num(c, 'fk_course_id') === courseId)
    if (course) parts.push(label(course, 'course_code', 'courseCode'))
    const grp = courseGroups.find((g) => num(g, 'fk_course_group_id') === courseGroupId)
    if (grp) parts.push(label(grp, 'group_code', 'groupCode'))
    const yr = courseYears.find((y) => num(y, 'fk_course_year_id') === courseYearId)
    if (yr) parts.push(label(yr, 'course_year_name', 'courseYearName'))
    const ex = exams.find((e) => num(e, 'fk_exam_id') === examId)
    if (ex) parts.push(label(ex, 'exam_name', 'examName'))
    return parts.filter(Boolean).join(' / ')
  }, [
    colleges,
    collegeId,
    academicYears,
    academicYearId,
    courses,
    courseId,
    courseGroups,
    courseGroupId,
    courseYears,
    courseYearId,
    exams,
    examId,
  ])

  const requireGroupYear = options.requireGroupYear !== false

  const filtersValid = requireGroupYear
    ? collegeId != null &&
      collegeId > 0 &&
      academicYearId != null &&
      academicYearId > 0 &&
      courseId != null &&
      courseId > 0 &&
      courseGroupId != null &&
      courseYearId != null
    : collegeId != null &&
      collegeId > 0 &&
      academicYearId != null &&
      academicYearId > 0 &&
      courseId != null &&
      courseId > 0

  return {
    isLoading,
    filtersData,
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
    contextLabel,
    filtersValid,
    toFilterParams: () => ({
      collegeId: collegeId ?? 0,
      academicYearId: academicYearId ?? 0,
      courseId: courseId ?? 0,
      courseGroupId: courseGroupId ?? 0,
      courseYearId: courseYearId ?? 0,
    }),
  }
}
