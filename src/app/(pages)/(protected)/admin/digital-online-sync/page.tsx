'use client'

import { useEffect, useMemo, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { FilteredPage } from '@/components/layout'
import { Select, type SelectOption } from '@/common/components/select'
import { GlobalFilterBarRow, GlobalFilterField } from '@/common/components/forms'
import { Button } from '@/components/ui/button'
import { useSessionContext } from '@/context/SessionContext'
import { toastError, toastInfo, toastSuccess } from '@/lib/toast'
import {
  collectSubjectRegulationIdsForSync,
  getDigitalOnlineSyncFilters,
  syncSubjectRegulationIds,
  type ClgFilterRow,
  type ClgFilterAcademicYearRow,
} from '@/services'

function num(val: unknown): number {
  const n = Number(val)
  return Number.isFinite(n) ? n : 0
}

function text(val: unknown): string {
  if (typeof val === 'string') return val
  if (typeof val === 'number') return String(val)
  return ''
}

function readLocalNumber(keys: string[], fallback = 0): number {
  if (typeof globalThis === 'undefined' || !globalThis.localStorage) return fallback
  for (const key of keys) {
    const raw = globalThis.localStorage.getItem(key)
    const n = Number(raw ?? '')
    if (Number.isFinite(n) && n > 0) return n
  }
  return fallback
}

function uniqueBy<T>(rows: T[], key: (row: T) => number): T[] {
  const seen = new Set<number>()
  return rows.filter((row) => {
    const k = key(row)
    if (!k || seen.has(k)) return false
    seen.add(k)
    return true
  })
}

function asOptions<T>(rows: T[], getValue: (r: T) => number, getLabel: (r: T) => string): SelectOption[] {
  return rows.map((row) => ({ value: String(getValue(row)), label: getLabel(row) }))
}

export default function DigitalOnlineSyncPage() {
  const { user } = useSessionContext()
  const [loadingFilters, setLoadingFilters] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [filtersData, setFiltersData] = useState<ClgFilterRow[]>([])
  const [academicYearData, setAcademicYearData] = useState<ClgFilterAcademicYearRow[]>([])

  const [collegeId, setCollegeId] = useState<number | null>(null)
  const [courseId, setCourseId] = useState<number | null>(null)
  const [courseGroupId, setCourseGroupId] = useState<number | null>(null)
  const [academicYearId, setAcademicYearId] = useState<number | null>(null)

  const courseRows = useMemo(
    () => filtersData.filter((row) => num((row as Record<string, unknown>).fk_college_id) === num(collegeId)),
    [filtersData, collegeId],
  )
  const courses = useMemo(
    () => uniqueBy(courseRows, (row) => num((row as Record<string, unknown>).fk_course_id)),
    [courseRows],
  )
  const courseGroupRows = useMemo(
    () => courseRows.filter((row) => num((row as Record<string, unknown>).fk_course_id) === num(courseId)),
    [courseRows, courseId],
  )
  const courseGroups = useMemo(
    () => uniqueBy(courseGroupRows, (row) => num((row as Record<string, unknown>).fk_course_group_id)),
    [courseGroupRows],
  )

  const selectedUniversityId = useMemo(
    () =>
      num(
        filtersData.find((row) => num((row as Record<string, unknown>).fk_college_id) === num(collegeId))
          ?.fk_university_id,
      ) || null,
    [filtersData, collegeId],
  )
  const yearRows = useMemo(
    () => academicYearData.filter((row) => num((row as Record<string, unknown>).fk_university_id) === num(selectedUniversityId)),
    [academicYearData, selectedUniversityId],
  )
  const academicYears = useMemo(
    () => uniqueBy(yearRows, (row) => num((row as Record<string, unknown>).fk_academic_year_id)),
    [yearRows],
  )

  const collegeOptions = useMemo(
    () => asOptions(
      uniqueBy(filtersData, (r) => num((r as Record<string, unknown>).fk_college_id)),
      (r) => num((r as Record<string, unknown>).fk_college_id),
      (r) => text((r as Record<string, unknown>).college_code),
    ),
    [filtersData],
  )
  const courseOptions = useMemo(
    () =>
      asOptions(
        courses,
        (r) => num((r as Record<string, unknown>).fk_course_id),
        (r) => text((r as Record<string, unknown>).course_code),
      ),
    [courses],
  )
  const groupOptions = useMemo(
    () =>
      asOptions(
        courseGroups,
        (r) => num((r as Record<string, unknown>).fk_course_group_id),
        (r) => text((r as Record<string, unknown>).group_code),
      ),
    [courseGroups],
  )
  const yearOptions = useMemo(
    () =>
      asOptions(
        academicYears,
        (r) => num((r as Record<string, unknown>).fk_academic_year_id),
        (r) => text((r as Record<string, unknown>).academic_year),
      ),
    [academicYears],
  )

  const canSync = Boolean(collegeId && courseId && courseGroupId && academicYearId)

  async function loadFilters() {
    const organizationId = Number(
      user?.organizationId ??
        readLocalNumber(['organizationId', 'orgId', 'orgID'], 0),
    )
    const employeeId = Number(
      user?.employeeId ??
        readLocalNumber(['employeeId', 'empId', 'userId', 'loginUserId'], Number(user?.userId ?? 0)),
    )
    if (!organizationId || !employeeId) return

    setLoadingFilters(true)
    try {
      const data = await getDigitalOnlineSyncFilters(organizationId, employeeId)
      setFiltersData(data.filtersData)
      setAcademicYearData(data.academicYearData)

      const colleges = uniqueBy(data.filtersData, (r) => num((r as Record<string, unknown>).fk_college_id)).sort(
        (a, b) =>
          num((a as Record<string, unknown>).clg_sort_order) - num((b as Record<string, unknown>).clg_sort_order),
      )
      if (colleges.length > 0) {
        setCollegeId(num((colleges[0] as Record<string, unknown>).fk_college_id))
      }
    } catch (error) {
      toastError(error, 'Failed to load filters')
    } finally {
      setLoadingFilters(false)
    }
  }

  useEffect(() => {
    void loadFilters()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.organizationId, user?.employeeId])

  useEffect(() => {
    setCourseId(null)
    setCourseGroupId(null)
    setAcademicYearId(null)
    if (courses.length > 0) setCourseId(num((courses[0] as Record<string, unknown>).fk_course_id))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collegeId])

  useEffect(() => {
    setCourseGroupId(null)
    setAcademicYearId(null)
    if (courseGroups.length > 0) setCourseGroupId(num((courseGroups[0] as Record<string, unknown>).fk_course_group_id))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId])

  useEffect(() => {
    setAcademicYearId(null)
    if (academicYears.length > 0) setAcademicYearId(num((academicYears[0] as Record<string, unknown>).fk_academic_year_id))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseGroupId, selectedUniversityId])

  async function handleSync() {
    if (!collegeId || !courseId || !courseGroupId || !academicYearId) {
      toastInfo('Please select College, Course, Course Group, and Academic Year.')
      return
    }

    setSyncing(true)
    try {
      const subjectRegulationIds = await collectSubjectRegulationIdsForSync({
        collegeId,
        courseId,
        courseGroupId,
        academicYearId,
      })

      if (subjectRegulationIds.length === 0) {
        toastInfo('No subject regulations found for the selected filters.')
        return
      }

      const message = await syncSubjectRegulationIds(subjectRegulationIds)
      toastSuccess(message)
    } catch (error) {
      toastError(error, 'Digital online sync failed')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <FilteredPage
      title="Digital Online Sync"
      filters={(
        <GlobalFilterBarRow>
          <GlobalFilterField label="College">
            <Select
              value={collegeId ? String(collegeId) : null}
              onChange={(v) => setCollegeId(v ? Number(v) : null)}
              options={collegeOptions}
              placeholder="Select college"
              searchable
              isLoading={loadingFilters}
            />
          </GlobalFilterField>
          <GlobalFilterField label="Course">
            <Select
              value={courseId ? String(courseId) : null}
              onChange={(v) => setCourseId(v ? Number(v) : null)}
              options={courseOptions}
              placeholder="Select course"
              searchable
              disabled={!collegeId}
            />
          </GlobalFilterField>
          <GlobalFilterField label="Course Group">
            <Select
              value={courseGroupId ? String(courseGroupId) : null}
              onChange={(v) => setCourseGroupId(v ? Number(v) : null)}
              options={groupOptions}
              placeholder="Select group"
              searchable
              disabled={!courseId}
            />
          </GlobalFilterField>
          <GlobalFilterField label="Academic Year">
            <Select
              value={academicYearId ? String(academicYearId) : null}
              onChange={(v) => setAcademicYearId(v ? Number(v) : null)}
              options={yearOptions}
              placeholder="Select year"
              searchable
              disabled={!courseGroupId}
            />
          </GlobalFilterField>
          <GlobalFilterField label=" " className="global-filter-field--action">
            <Button
              type="button"
              onClick={() => { void handleSync() }}
              disabled={syncing || !canSync}
              className="h-9 w-full shrink-0"
            >
              {syncing ? <RefreshCw className="mr-1 h-4 w-4 animate-spin" /> : null}
              Sync
            </Button>
          </GlobalFilterField>
        </GlobalFilterBarRow>
      )}
    />
  )
}
