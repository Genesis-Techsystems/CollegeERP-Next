'use client'

/**
 * useCollegeFilters — shared hook for University → Course (→ Regulation) cascading filters.
 *
 * Backs the CollegeFilterPanel component and all pages that need the standard
 * college-level filter dropdowns (grade setup, max marks setup, etc.).
 *
 * Usage (university + course only):
 *   const filters = useCollegeFilters()
 *
 * Usage (with regulation cascade):
 *   const filters = useCollegeFilters({ withRegulations: true })
 */

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSessionContext } from '@/context/SessionContext'
import { getCollegeFilters, getRegulations } from '@/services/exam-master.service'
import { distinct } from '@/lib/utils'
import type { CollegeWiseFilterRow, Regulation } from '@/types/exam-master'

export interface CollegeFiltersState {
  isLoading: boolean

  universities: CollegeWiseFilterRow[]
  selectedUniversityId: number | null
  setUniversityId: (id: number) => void

  courses: CollegeWiseFilterRow[]
  selectedCourseId: number | null
  setCourseId: (id: number) => void

  /** Populated only when `withRegulations: true` */
  regulations: Regulation[]
  selectedRegulationId: number | null
  setRegulationId: (id: number | null) => void
}

interface Options {
  /** When true, automatically loads regulations via `getRegulations(courseId)` */
  withRegulations?: boolean
  /** When true (default), auto-selects the first item in each list */
  autoSelectFirst?: boolean
}

export function useCollegeFilters({
  withRegulations = false,
  autoSelectFirst = true,
}: Options = {}): CollegeFiltersState {
  const { user } = useSessionContext()

  const [filtersData, setFiltersData] = useState<CollegeWiseFilterRow[]>([])
  const [universities, setUniversities] = useState<CollegeWiseFilterRow[]>([])
  const [selectedUniversityId, setSelectedUniversityId] = useState<number | null>(null)
  const [courses, setCourses] = useState<CollegeWiseFilterRow[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null)
  const [regulations, setRegulations] = useState<Regulation[]>([])
  const [selectedRegulationId, setSelectedRegulationId] = useState<number | null>(null)

  // ── College filter data ────────────────────────────────────────────────────
  const { isLoading, data: filtersResult } = useQuery({
    queryKey: ['college-filters', user?.organizationId, user?.employeeId],
    queryFn: () => getCollegeFilters(user?.organizationId ?? 0, user?.employeeId ?? 0),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  })

  useEffect(() => {
    if (!filtersResult) return
    const fd = filtersResult.filtersData
    setFiltersData(fd)
    const unis = distinct(fd, (r) => r.fk_university_id)
    setUniversities(unis)
    if (autoSelectFirst && unis.length > 0) {
      applyUniversityChange(unis[0].fk_university_id, fd)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersResult])

  // ── Regulation loading (when withRegulations: true) ───────────────────────
  const { data: regulationsResult } = useQuery({
    queryKey: ['regulations', selectedCourseId],
    queryFn: () => getRegulations(selectedCourseId!),
    enabled: withRegulations && selectedCourseId != null,
    staleTime: 5 * 60 * 1000,
  })

  useEffect(() => {
    if (!withRegulations) return
    if (!regulationsResult) {
      setRegulations([])
      setSelectedRegulationId(null)
      return
    }
    setRegulations(regulationsResult)
    setSelectedRegulationId(
      autoSelectFirst && regulationsResult.length > 0
        ? regulationsResult[0].regulationId
        : null,
    )
  }, [regulationsResult, withRegulations, autoSelectFirst])

  // ── Cascade handlers ──────────────────────────────────────────────────────

  function applyUniversityChange(universityId: number, fdRef = filtersData) {
    setSelectedUniversityId(universityId)
    setSelectedCourseId(null)
    setSelectedRegulationId(null)
    setCourses([])
    setRegulations([])

    const filtered = fdRef.filter((r) => r.fk_university_id === universityId)
    const distinctCourses = distinct(filtered, (r) => r.fk_course_id)
    setCourses(distinctCourses)

    if (autoSelectFirst && distinctCourses.length > 0) {
      setSelectedCourseId(distinctCourses[0].fk_course_id)
      // Regulations load automatically via the useQuery above
    }
  }

  function applyCourseChange(courseId: number) {
    setSelectedCourseId(courseId)
    setSelectedRegulationId(null)
    setRegulations([])
    // Regulations reload automatically via the useQuery above
  }

  return {
    isLoading,

    universities,
    selectedUniversityId,
    setUniversityId: applyUniversityChange,

    courses,
    selectedCourseId,
    setCourseId: applyCourseChange,

    regulations,
    selectedRegulationId,
    setRegulationId: setSelectedRegulationId,
  }
}
