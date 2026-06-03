'use client'

import { useEffect, useMemo, useState } from 'react'
import { Filter, RefreshCw } from 'lucide-react'
import { PageContainer } from '@/components/layout'
import { Select, type SelectOption } from '@/common/components/select'
import { Button } from '@/components/ui/button'
import { useSessionContext } from '@/context/SessionContext'
import {
  getDigitalOnlineSyncFilters,
  getCourseYearsForDigitalSync,
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
  const [subjectRegulationIds, setSubjectRegulationIds] = useState<Array<{ subjectRegulationId: number }>>([])

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
    setSubjectRegulationIds([])
    if (courses.length > 0) setCourseId(num((courses[0] as Record<string, unknown>).fk_course_id))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collegeId])

  useEffect(() => {
    setCourseGroupId(null)
    setAcademicYearId(null)
    setSubjectRegulationIds([])
    if (courseGroups.length > 0) setCourseGroupId(num((courseGroups[0] as Record<string, unknown>).fk_course_group_id))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId])

  useEffect(() => {
    setAcademicYearId(null)
    setSubjectRegulationIds([])
    if (academicYears.length > 0) setAcademicYearId(num((academicYears[0] as Record<string, unknown>).fk_academic_year_id))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseGroupId, selectedUniversityId])

  useEffect(() => {
    async function loadCourseYears() {
      if (!collegeId || !courseId || !courseGroupId || !academicYearId) {
        setSubjectRegulationIds([])
        return
      }
      const rows = await getCourseYearsForDigitalSync({
        collegeId,
        courseId,
        courseGroupId,
        academicYearId,
      }).catch(() => [])

      const ids: Array<{ subjectRegulationId: number }> = []
      for (const row of rows) {
        const regs = (row as { subjectregulations?: Array<{ subjectRegulationId?: number }> }).subjectregulations
        if (!Array.isArray(regs)) continue
        for (const reg of regs) {
          if (reg?.subjectRegulationId) ids.push({ subjectRegulationId: reg.subjectRegulationId })
        }
      }
      setSubjectRegulationIds(ids)
    }

    void loadCourseYears()
  }, [collegeId, courseId, courseGroupId, academicYearId])

  async function handleSync() {
    if (subjectRegulationIds.length === 0) return
    setSyncing(true)
    try {
      await syncSubjectRegulationIds(subjectRegulationIds)
    } finally {
      setSyncing(false)
    }
  }

  return (
    <PageContainer className="space-y-4">
      <div className="app-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/40 flex items-center justify-between">
          <h2 className="app-card-title">Digital Online Sync</h2>
          <div className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Filter className="h-3.5 w-3.5" />
            Filter
          </div>
        </div>

        <div className="p-3">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
            <Select
              label="College"
              value={collegeId ? String(collegeId) : null}
              onChange={(v) => setCollegeId(v ? Number(v) : null)}
              options={collegeOptions}
              placeholder="Select college"
              searchable
              isLoading={loadingFilters}
            />
            <Select
              label="Course"
              value={courseId ? String(courseId) : null}
              onChange={(v) => setCourseId(v ? Number(v) : null)}
              options={courseOptions}
              placeholder="Select course"
              searchable
              disabled={!collegeId}
            />
            <Select
              label="Course Group"
              value={courseGroupId ? String(courseGroupId) : null}
              onChange={(v) => setCourseGroupId(v ? Number(v) : null)}
              options={groupOptions}
              placeholder="Select group"
              searchable
              disabled={!courseId}
            />
            <Select
              label="Academic Year"
              value={academicYearId ? String(academicYearId) : null}
              onChange={(v) => setAcademicYearId(v ? Number(v) : null)}
              options={yearOptions}
              placeholder="Select year"
              searchable
              disabled={!courseGroupId}
            />
            <Button
              type="button"
              onClick={handleSync}
              disabled={syncing || subjectRegulationIds.length === 0}
              className="h-9"
            >
              {syncing ? <RefreshCw className="mr-1 h-4 w-4 animate-spin" /> : null}
              Sync
            </Button>
          </div>
        </div>
      </div>
    </PageContainer>
  )
}
