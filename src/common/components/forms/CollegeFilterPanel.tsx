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
import { useMemo, useState } from 'react'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'

interface CollegeFilterPanelProps {
  /** Optional card title shown above filters */
  title?: string
  /** Optional short description shown under the title */
  description?: string
  /** Optional className to control the title color (defaults to slate-900) */
  titleColorClassName?: string
  /** Enables a "Filter" toggle that collapses/expands the filter grid */
  collapsible?: boolean
  /** Initial collapsed state when collapsible */
  defaultCollapsed?: boolean

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
  title,
  description,
  titleColorClassName,
  collapsible = true,
  defaultCollapsed = false,
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
  const inlineActionWithDisabled = onIsForDisabledChange !== undefined && children !== undefined
  const [collapsed, setCollapsed] = useState(defaultCollapsed)
  const showHeader = title !== undefined || collapsible
  const headerTitle = useMemo(() => title ?? 'Filter', [title])

  return (
    <div className="app-card overflow-hidden">
      {showHeader && (
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/40">
          <div className="flex items-center gap-2 min-w-0">
            <div className="min-w-0">
              <div className="min-w-0">
                <p
                  className={cn(
                    'text-[16px] font-semibold truncate',
                    titleColorClassName ?? 'text-[hsl(var(--card-title))]',
                  )}
                >
                  {headerTitle}
                </p>
                {/* Description intentionally hidden globally per UI preference */}
              </div>
            </div>
          </div>

          {collapsible && (
            <button
              type="button"
              onClick={() => setCollapsed((v) => !v)}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-[12px] font-medium text-slate-700 hover:bg-slate-100 transition-colors"
              aria-expanded={!collapsed}
            >
              <span>Filter</span>
              <ChevronDown className={cn('h-4 w-4 transition-transform', !collapsed && 'rotate-180')} aria-hidden="true" />
            </button>
          )}
        </div>
      )}

      {!collapsed && (
        <div className="p-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 items-end">
        {/* University */}
        <div className="space-y-1">
          <Label className="text-[12px] font-semibold text-slate-900">University</Label>
          <Select
            value={selectedUniversityId != null ? String(selectedUniversityId) : undefined}
            onValueChange={(v) => onUniversityChange(Number(v))}
            disabled={isLoading}
          >
            <SelectTrigger className="h-8 rounded-lg px-3 text-[12px] text-slate-900 bg-white">
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
          <Label className="text-[12px] font-semibold text-slate-900">Course</Label>
          <Select
            value={selectedCourseId != null ? String(selectedCourseId) : undefined}
            onValueChange={(v) => onCourseChange(Number(v))}
            disabled={courses.length === 0}
          >
            <SelectTrigger className="h-8 rounded-lg px-3 text-[12px] text-slate-900 bg-white">
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
            <Label className="text-[12px] font-semibold text-slate-900">Regulation</Label>
            <Select
              value={selectedRegulationId != null ? String(selectedRegulationId) : undefined}
              onValueChange={(v) => onRegulationChange(Number(v))}
              disabled={regulations.length === 0}
            >
              <SelectTrigger className="h-8 rounded-lg px-3 text-[12px] text-slate-900 bg-white">
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
          <div className="flex items-center justify-between gap-3 pb-1">
            <div className="flex items-center gap-2">
              <Checkbox
                id="isForDisabledFilter"
                checked={isForDisabled}
                onCheckedChange={(v) => onIsForDisabledChange(Boolean(v))}
              />
              <Label
                htmlFor="isForDisabledFilter"
                className="cursor-pointer text-[12px] font-semibold text-slate-900"
              >
                For Disabled Students
              </Label>
            </div>

            {/* If caller passed an action button (e.g. Get List), render it inline on the right */}
            {inlineActionWithDisabled && (
              <div className="flex items-center justify-end">
                {children}
              </div>
            )}
          </div>
        )}

        {/* Default slot: render extras as their own grid cell unless inlined with disabled checkbox */}
        {!inlineActionWithDisabled && children}
      </div>
        </div>
      )}
    </div>
  )
}
