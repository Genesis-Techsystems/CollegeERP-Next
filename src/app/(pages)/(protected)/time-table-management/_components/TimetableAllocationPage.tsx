'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { BookOpen, ChevronDown, ChevronUp, Timer } from 'lucide-react'
import { PageContainer } from '@/components/layout'
import { Select, type SelectOption } from '@/common/components/select'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { toastError, toastInfo, toastSuccess } from '@/lib/toast'
import {
  fetchTimetableFilterRows,
  getTimingSetById,
  listCourseYearsByCourse,
  listGroupSectionsByFilters,
  listSchedulesForTimetable,
  listTimingSetsForAllocation,
  saveTimetableAllocation,
} from '@/services'
import {
  coursesFromAllocationFilters,
  courseGroupsFromAllocationFilters,
  formatDateHeader,
  num,
  text,
} from '../_lib/timetable-filters'
import {
  hasTimetableAllocationContext,
  parseTimetablePageParams,
} from '../_lib/timetable-query'
import { TimetableAllocationPicker } from './TimetableAllocationPicker'
import { AllocateTimetableDialog, type AllocateSectionItem } from './AllocateTimetableDialog'
import { TimingSetStructurePreview } from './TimingSetStructurePreview'

type AnyRow = Record<string, unknown>
type SectionOption = { groupSectionId: number; name: string; checked: boolean }

export function TimetableAllocationPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const pageParams = useMemo(() => parseTimetablePageParams(searchParams), [searchParams])
  const hasContext = hasTimetableAllocationContext(pageParams)

  const [filterRows, setFilterRows] = useState<AnyRow[]>([])
  const [filtersLoading, setFiltersLoading] = useState(true)
  const [courseId, setCourseId] = useState<number | null>(null)
  const [courseGroupId, setCourseGroupId] = useState<number | null>(null)
  const [timingsetId, setTimingsetId] = useState<number | null>(null)
  const [timingSets, setTimingSets] = useState<AnyRow[]>([])
  const [timingDetail, setTimingDetail] = useState<AnyRow | null>(null)
  const [sections, setSections] = useState<SectionOption[]>([])
  const [existingSchedules, setExistingSchedules] = useState<AnyRow[]>([])
  const [panelOpen, setPanelOpen] = useState(true)
  const [saving, setSaving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [loadingSections, setLoadingSections] = useState(false)

  useEffect(() => {
    if (!pageParams.collegeId) {
      setFiltersLoading(false)
      return
    }
    setFiltersLoading(true)
    void fetchTimetableFilterRows('clg_filters', pageParams.collegeId)
      .then(setFilterRows)
      .finally(() => setFiltersLoading(false))
  }, [pageParams.collegeId])

  useEffect(() => {
    if (!pageParams.collegeId || !pageParams.academicYearId) {
      setTimingSets([])
      return
    }
    void listTimingSetsForAllocation(pageParams.collegeId, pageParams.academicYearId).then(setTimingSets)
  }, [pageParams.collegeId, pageParams.academicYearId])

  useEffect(() => {
    if (!pageParams.timetableId) return
    void listSchedulesForTimetable(pageParams.timetableId).then(setExistingSchedules)
  }, [pageParams.timetableId])

  const courses = useMemo(
    () => coursesFromAllocationFilters(filterRows, pageParams.collegeId),
    [filterRows, pageParams.collegeId],
  )

  const courseGroups = useMemo(
    () =>
      courseId
        ? courseGroupsFromAllocationFilters(filterRows, pageParams.collegeId, courseId)
        : [],
    [filterRows, pageParams.collegeId, courseId],
  )

  const courseOptions = useMemo<SelectOption[]>(
    () =>
      courses.map((c) => ({
        value: String(c.fk_course_id),
        label: text(c, ['course_code', 'courseCode']) || String(c.fk_course_id),
      })),
    [courses],
  )

  const courseGroupOptions = useMemo<SelectOption[]>(
    () =>
      courseGroups.map((g) => ({
        value: String(g.fk_course_group_id),
        label: text(g, ['group_code', 'groupCode']) || String(g.fk_course_group_id),
      })),
    [courseGroups],
  )

  const timingSetOptions = useMemo<SelectOption[]>(
    () =>
      timingSets.map((t) => ({
        value: String(t.timingsetId ?? t.timingset_id),
        label: String(t.timingsetName ?? t.timingset_name ?? t.timingsetId),
      })),
    [timingSets],
  )

  const loadSections = useCallback(async () => {
    if (!courseId || !courseGroupId || !pageParams.collegeId || !pageParams.academicYearId) {
      setSections([])
      return
    }
    setLoadingSections(true)
    try {
      const courseYears = await listCourseYearsByCourse(courseId)
      const allocatedIds = new Set(
        existingSchedules.map((s) =>
          num(s.groupSectionId ?? s.fk_group_section_id ?? s.group_section_id),
        ),
      )
      const next: SectionOption[] = []

      for (const cy of courseYears) {
        const courseYearId = num(cy.courseYearId ?? cy.fk_course_year_id)
        const courseYearName = text(cy, ['courseYearName', 'course_year_name', 'yearName'])
        const groupSections = await listGroupSectionsByFilters({
          collegeId: pageParams.collegeId,
          academicYearId: pageParams.academicYearId,
          courseGroupId,
          courseYearId,
        })
        for (const sec of groupSections) {
          const groupSectionId = num(sec.groupSectionId ?? sec.fk_group_section_id)
          const sectionLabel = text(sec, ['section', 'groupSectionName', 'group_section_name'])
          next.push({
            groupSectionId,
            name: `${courseYearName} - ${sectionLabel}`,
            checked: allocatedIds.has(groupSectionId),
          })
        }
      }
      setSections(next)
    } finally {
      setLoadingSections(false)
    }
  }, [
    courseId,
    courseGroupId,
    pageParams.collegeId,
    pageParams.academicYearId,
    existingSchedules,
  ])

  useEffect(() => {
    void loadSections()
  }, [loadSections])

  useEffect(() => {
    if (!timingsetId) {
      setTimingDetail(null)
      return
    }
    void getTimingSetById(timingsetId).then(setTimingDetail)
  }, [timingsetId])

  const classWeekdays = useMemo(() => {
    const raw = timingDetail?.classWeekdays
    return Array.isArray(raw) ? (raw as AnyRow[]) : []
  }, [timingDetail])

  const courseName = courses.find((c) => num(c.fk_course_id) === courseId)
  const groupName = courseGroups.find((g) => num(g.fk_course_group_id) === courseGroupId)
  const timingSetName =
    timingSets.find((t) => num(t.timingsetId ?? t.timingset_id) === timingsetId)?.timingsetName ??
    ''

  const canSave = existingSchedules.length === 0
  const dateRangeLabel = `${formatDateHeader(pageParams.startDate)} - ${formatDateHeader(pageParams.endDate)}`

  function toggleSection(id: number, checked: boolean) {
    setSections((prev) => prev.map((s) => (s.groupSectionId === id ? { ...s, checked } : s)))
  }

  function openConfirm() {
    const selected = sections.filter((s) => s.checked)
    if (selected.length === 0) {
      toastInfo('Select atleast one group section.')
      return
    }
    if (!timingsetId) {
      toastInfo('Select a timing set.')
      return
    }
    setConfirmOpen(true)
  }

  async function handleSave() {
    const selected = sections.filter((s) => s.checked)
    if (!timingsetId || selected.length === 0) return
    setSaving(true)
    try {
      await saveTimetableAllocation({
        collegeId: pageParams.collegeId,
        academicYearId: pageParams.academicYearId,
        timetableId: pageParams.timetableId,
        timingsetId,
        groupSectionId: selected.map((s) => s.groupSectionId),
      })
      toastSuccess('Timetable allocated successfully.')
      setConfirmOpen(false)
      router.push('/time-table-management/manage-timetable')
    } catch (err: unknown) {
      toastError(err instanceof Error ? err : new Error('Allocation failed'))
    } finally {
      setSaving(false)
    }
  }

  const confirmSections: AllocateSectionItem[] = sections
    .filter((s) => s.checked)
    .map((s) => ({ groupSectionId: s.groupSectionId, name: s.name }))

  if (!hasContext) {
    return <TimetableAllocationPicker />
  }

  return (
    <PageContainer className="space-y-4">
      <div className="app-card space-y-4 p-4">
        <h1 className="inline-flex items-center gap-2 text-[15px] font-semibold text-[#5da394]">
          <BookOpen className="h-4 w-4" aria-hidden />
          Timetable allocation
          {dateRangeLabel.trim() !== '-' ? (
            <span className="font-normal text-[#002b5c]">- ({dateRangeLabel})</span>
          ) : null}
        </h1>

        <div className="grid gap-2 rounded-sm border border-[#9ec5e8] px-4 py-3 text-[12px] sm:grid-cols-2">
          <p>
            <span className="font-semibold text-[#b45309]">College :</span>{' '}
            <span className="font-medium text-[#002b5c]">{pageParams.collegeName}</span>
          </p>
          <p>
            <span className="font-semibold text-[#b45309]">Academic Year :</span>{' '}
            <span className="font-medium text-[#002b5c]">{pageParams.academicYear}</span>
          </p>
        </div>

        <div className="rounded-md border border-slate-200">
          <button
            type="button"
            className="flex w-full items-center justify-between px-4 py-3 text-left text-[13px] font-semibold text-[#002b5c]"
            onClick={() => setPanelOpen((o) => !o)}
          >
            <span className="inline-flex items-center gap-2">
              <Timer className="h-4 w-4 text-[#5da394]" aria-hidden />
              Select Timing Set
            </span>
            {panelOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {panelOpen ? (
            <div className="grid gap-3 border-t border-slate-200 p-4 sm:grid-cols-3">
              <div className="space-y-1">
                <Label className="text-[12px]">Course</Label>
                <Select
                  value={courseId ? String(courseId) : ''}
                  onChange={(v) => {
                    setCourseId(num(v))
                    setCourseGroupId(null)
                    setTimingsetId(null)
                    setTimingDetail(null)
                  }}
                  options={courseOptions}
                  placeholder="Select course"
                  searchable
                  clearable
                  disabled={filtersLoading}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[12px]">Course Group</Label>
                <Select
                  value={courseGroupId ? String(courseGroupId) : ''}
                  onChange={(v) => {
                    setCourseGroupId(num(v))
                    setTimingsetId(null)
                    setTimingDetail(null)
                  }}
                  options={courseGroupOptions}
                  placeholder="Select course group"
                  searchable
                  clearable
                  disabled={!courseId}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[12px]">Timing Set</Label>
                <Select
                  value={timingsetId ? String(timingsetId) : ''}
                  onChange={(v) => setTimingsetId(num(v))}
                  options={timingSetOptions}
                  placeholder="Select timing set"
                  searchable
                  clearable
                  disabled={!courseGroupId}
                />
              </div>
            </div>
          ) : null}
        </div>

        {timingDetail && classWeekdays.length > 0 ? (
          <div className="space-y-3">
            <h2 className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#002b5c]">
              <Timer className="h-4 w-4" aria-hidden />
              Timetable Structure for {text(courseName ?? {}, ['course_code'])} -{' '}
              {text(groupName ?? {}, ['group_code'])} ({String(timingSetName)})
            </h2>
            <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
              <TimingSetStructurePreview
                classWeekdays={classWeekdays.map((w) => ({
                  weekdayName: String(w.weekdayName ?? ''),
                  classTimings: Array.isArray(w.classTimings)
                    ? (w.classTimings as AnyRow[]).map((t) => ({
                        name: String(t.name ?? t.classTimingName ?? ''),
                        isBreak: Boolean(t.isBreak ?? t.is_break),
                        startTime: String(t.startTime ?? t.start_time ?? ''),
                        endTime: String(t.endTime ?? t.end_time ?? ''),
                      }))
                    : [],
                }))}
              />
              <div className="rounded-md border border-slate-200 bg-slate-50/50 p-3">
                <h3 className="mb-2 text-[13px] font-semibold text-[#002b5c]">Select Group Section</h3>
                <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
                  {loadingSections ? (
                    <p className="text-[12px] text-muted-foreground">Loading sections…</p>
                  ) : sections.length === 0 ? (
                    <p className="text-[12px] text-muted-foreground">
                      Select course and course group to list sections.
                    </p>
                  ) : (
                    sections.map((sec) => (
                      <label
                        key={sec.groupSectionId}
                        className="flex cursor-pointer items-center gap-2 text-[12px]"
                      >
                        <Checkbox
                          checked={sec.checked}
                          onCheckedChange={(v) => toggleSection(sec.groupSectionId, v === true)}
                        />
                        <span>{sec.name}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
          <Button type="button" variant="outline" size="sm" onClick={() => router.back()}>
            Back
          </Button>
          {canSave ? (
            <Button
              type="button"
              size="sm"
              disabled={!timingsetId || sections.every((s) => !s.checked)}
              onClick={openConfirm}
            >
              Save
            </Button>
          ) : (
            <p className="self-center text-[12px] text-muted-foreground">
              Timetable already has allocations; save is disabled.
            </p>
          )}
        </div>
      </div>

      <AllocateTimetableDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void handleSave()}
        isSubmitting={saving}
        timetableName={pageParams.timetableName}
        startDate={pageParams.startDate}
        endDate={pageParams.endDate}
        sections={confirmSections}
      />
    </PageContainer>
  )
}
