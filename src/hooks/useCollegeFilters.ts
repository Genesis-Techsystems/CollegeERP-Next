'use client'

import { useState } from 'react'
import type { CollegeWiseFilterRow, Regulation } from '@/types/exam-master'

interface Options {
  withRegulations?: boolean
  autoSelectFirst?: boolean
}

export interface CollegeFiltersState {
  isLoading: boolean

  universities: CollegeWiseFilterRow[]
  selectedUniversityId: number | null
  setUniversityId: (id: number) => void

  courses: CollegeWiseFilterRow[]
  selectedCourseId: number | null
  setCourseId: (id: number) => void

  regulations: Regulation[]
  selectedRegulationId: number | null
  setRegulationId: (id: number | null) => void
}

/**
 * Cascading University → Course → Regulation filter state.
 *
 * NOTE: Data fetching is stubbed until the examination module services are
 * restored from todo/examination-module/services/. The hook compiles and
 * the panel renders — dropdowns will be empty until services are wired in.
 */
export function useCollegeFilters(_options: Options = {}): CollegeFiltersState {
  const [selectedUniversityId, setUniversityId] = useState<number | null>(null)
  const [selectedCourseId, setCourseId] = useState<number | null>(null)
  const [selectedRegulationId, setRegulationId] = useState<number | null>(null)

  return {
    isLoading: false,

    universities: [],
    selectedUniversityId,
    setUniversityId,

    courses: [],
    selectedCourseId,
    setCourseId,

    regulations: [],
    selectedRegulationId,
    setRegulationId,
  }
}
