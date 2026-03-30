'use client'

/**
 * CollegeFilterPanel — reusable University → Course (→ Regulation) filter panel.
 *
 * Renders the standard filter grid used by grade-setup, max-marks-setup, and
 * similar pages that need college-level cascading filters.
 *
 * Usage:
 *   const filters = useCollegeFilters({ withRegulations: true })
 *   ...
 *   <CollegeFilterPanel
 *     {...filters}
 *     onUniversityChange={filters.setUniversityId}
 *     onCourseChange={filters.setCourseId}
 *     onRegulationChange={filters.setRegulationId}
 *   />
 */

import type { ReactNode } from 'react'
import type { CollegeWiseFilterRow, Regulation } from '@/types/exam-master'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'

interface CollegeFilterPanelProps {
  // University
  universities: CollegeWiseFilterRow[]
  selectedUniversityId: number | null
  onUniversityChange: (id: number) => void

  // Course
  courses: CollegeWiseFilterRow[]
  selectedCourseId: number | null
  onCourseChange: (id: number) => void

  // Regulation — render only when provided
  regulations?: Regulation[]
  selectedRegulationId?: number | null
  onRegulationChange?: (id: number) => void

  // "For Disabled Students" checkbox — render only when provided
  isForDisabled?: boolean
  onIsForDisabledChange?: (checked: boolean) => void

  // Loading state for the University dropdown
  isLoading?: boolean

  // Extra filter slots rendered after the standard ones
  children?: ReactNode
}

export function CollegeFilterPanel({
  universities,
  selectedUniversityId,
  onUniversityChange,
  courses,
  selectedCourseId,
  onCourseChange,
  regulations,
  selectedRegulationId,
  onRegulationChange,
  isForDisabled,
  onIsForDisabledChange,
  isLoading,
  children,
}: CollegeFilterPanelProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 mb-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
        {/* University */}
        <div className="space-y-1">
          <Label>University</Label>
          <Select
            value={selectedUniversityId != null ? String(selectedUniversityId) : undefined}
            onValueChange={(v) => onUniversityChange(Number(v))}
            disabled={isLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder={isLoading ? 'Loading…' : 'Select University'} />
            </SelectTrigger>
            <SelectContent>
              {universities.map((u) => (
                <SelectItem key={u.fk_university_id} value={String(u.fk_university_id)}>
                  {u.university_code ?? u.university_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Course */}
        <div className="space-y-1">
          <Label>Course</Label>
          <Select
            value={selectedCourseId != null ? String(selectedCourseId) : undefined}
            onValueChange={(v) => onCourseChange(Number(v))}
            disabled={courses.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Course" />
            </SelectTrigger>
            <SelectContent>
              {courses.map((c) => (
                <SelectItem key={c.fk_course_id} value={String(c.fk_course_id)}>
                  {c.course_code ?? c.course_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Regulation — only shown when caller provides the regulations array */}
        {regulations !== undefined && onRegulationChange !== undefined && (
          <div className="space-y-1">
            <Label>Regulation</Label>
            <Select
              value={selectedRegulationId != null ? String(selectedRegulationId) : undefined}
              onValueChange={(v) => onRegulationChange(Number(v))}
              disabled={regulations.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Regulation" />
              </SelectTrigger>
              <SelectContent>
                {regulations.map((r) => (
                  <SelectItem key={r.regulationId} value={String(r.regulationId)}>
                    {r.regulationCode}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* For Disabled Students checkbox — only shown when caller provides the handler */}
        {onIsForDisabledChange !== undefined && (
          <div className="flex items-center gap-2 pb-1">
            <Checkbox
              id="isForDisabledFilter"
              checked={isForDisabled}
              onCheckedChange={(v) => onIsForDisabledChange(Boolean(v))}
            />
            <Label htmlFor="isForDisabledFilter" className="cursor-pointer">
              For Disabled Students
            </Label>
          </div>
        )}

        {children}
      </div>
    </div>
  )
}
