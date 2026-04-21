'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, Filter } from 'lucide-react'
import { PageContainer, PageHeader } from '@/components/layout'
import { Select } from '@/common/components/select'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useSessionContext } from '@/context/SessionContext'
import { listStudents } from '@/services/pre-examination'
import {
  getStudentInfoFilters,
  listStudentsBySection,
  normalizeStudentRow,
} from '@/services'

type AnyRow = Record<string, any>

function dedupeBy<T>(rows: T[], keyFn: (row: T) => string | number): T[] {
  const seen = new Set<string | number>()
  return rows.filter((row) => {
    const key = keyFn(row)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function pickText(row: AnyRow, keys: string[]): string {
  for (const key of keys) {
    const out = String(row?.[key] ?? '').trim()
    if (out) return out
  }
  return '-'
}

function pickNum(row: AnyRow, keys: string[]): number {
  for (const key of keys) {
    const value = Number(row?.[key] ?? 0)
    if (Number.isFinite(value) && value > 0) return value
  }
  return 0
}

function getStudentRowId(s: AnyRow, fallback: number): number {
  const id = Number(
    s.studentId ?? s.id ?? s.fk_student_id ?? s.student_detail_id ?? s.studentDetailId ?? 0,
  )
  return id > 0 ? id : fallback
}

export default function StudentDetailsPage() {
  const { user } = useSessionContext()

  const [filterOpen, setFilterOpen] = useState(true)
  const [mode, setMode] = useState<'student' | 'section'>('student')
  const [studentOptions, setStudentOptions] = useState<AnyRow[]>([])
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null)
  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(null)
  const [sectionRows, setSectionRows] = useState<AnyRow[]>([])
  const [rows, setRows] = useState<AnyRow[]>([])
  const [loading, setLoading] = useState(false)
  const [studentSearchLoading, setStudentSearchLoading] = useState(false)

  const sectionOptions = useMemo(
    () =>
      sectionRows.map((row, i) => ({
        value: String(pickNum(row, ['fk_group_section_id', 'groupSectionId', 'group_section_id']) || i + 1),
        label: pickText(row, ['group_section_name', 'groupSectionName', 'sectionName', 'group_section_code']),
      })),
    [sectionRows],
  )

  const studentsSelectOptions = useMemo(
    () =>
      studentOptions.map((row, i) => ({
        value: String(getStudentRowId(row, i + 1)),
        label: `${row.hallticketNumber ?? row.rollNumber ?? '-'} - ${row.firstName ?? row.studentName ?? '-'}`,
      })),
    [studentOptions],
  )

  async function loadSections() {
    const employeeId = Number(user?.employeeId ?? 0)
    const organizationId = Number(user?.organizationId ?? 0)
    try {
      const filterRows = await getStudentInfoFilters(organizationId, employeeId)
      const sections = dedupeBy(
        filterRows.filter((row) => pickNum(row, ['fk_group_section_id', 'groupSectionId', 'group_section_id']) > 0),
        (row) => pickNum(row, ['fk_group_section_id', 'groupSectionId', 'group_section_id']),
      )
      setSectionRows(sections)
    } catch {
      setSectionRows([])
    }
  }

  async function onSearchStudents(term: string) {
    const q = term.trim()
    if (q.length === 0) {
      setStudentOptions([])
      return
    }
    if (q.length < 3) return
    setStudentSearchLoading(true)
    try {
      const rows = await listStudents(q).catch(() => [])
      setStudentOptions(Array.isArray(rows) ? rows : [])
    } finally {
      setStudentSearchLoading(false)
    }
  }

  function onStudentSelect(nextId: number | null) {
    setSelectedStudentId(nextId)
  }

  async function onGet() {
    setLoading(true)
    try {
      if (mode === 'student') {
        const sid = selectedStudentId
        if (sid) {
          const match =
            studentOptions.find((row, idx) => getStudentRowId(row, idx + 1) === Number(sid)) ?? null
          if (match) {
            setRows([normalizeStudentRow(match)])
            return
          }
        }
        setRows([])
        return
      }

      const sectionId = Number(selectedSectionId ?? 0)
      if (!sectionId) {
        setRows([])
        return
      }
      const sectionStudents = await listStudentsBySection(sectionId)
      setRows(sectionStudents.map(normalizeStudentRow))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSections()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.employeeId, user?.organizationId])

  return (
    <PageContainer className="space-y-4">
      <PageHeader title="Student Details" subtitle="Student Information System" />

      <div className="app-card overflow-hidden">
        <div className="px-3 py-2.5 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between gap-2">
          <h2 className="text-[14px] font-semibold text-[hsl(var(--primary))]">Students Search</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-6 px-2.5 text-[12px]"
            onClick={() => setFilterOpen((v) => !v)}
            aria-expanded={filterOpen}
          >
            <Filter className="mr-1.5 h-3.5 w-3.5" />
            Filter
            <ChevronDown className={`ml-1.5 h-3.5 w-3.5 transition-transform ${filterOpen ? 'rotate-180' : ''}`} />
          </Button>
        </div>

        {filterOpen && (
          <div className="p-3 space-y-3">
            <div className="flex flex-wrap items-center gap-5 text-xs">
              <label className="inline-flex items-center gap-1.5">
                <input
                  type="radio"
                  checked={mode === 'student'}
                  onChange={() => {
                    setMode('student')
                    setRows([])
                    setStudentOptions([])
                    setSelectedStudentId(null)
                  }}
                />
                <span>Search By Student</span>
              </label>
              <label className="inline-flex items-center gap-1.5">
                <input
                  type="radio"
                  checked={mode === 'section'}
                  onChange={() => {
                    setMode('section')
                    setRows([])
                    setSelectedStudentId(null)
                    setStudentOptions([])
                  }}
                />
                <span>Search By Section</span>
              </label>
            </div>

            {mode === 'student' ? (
              <div className="flex flex-wrap items-end gap-2">
                <div className="w-full max-w-xs sm:max-w-sm shrink-0 space-y-0.5">
                  <Select
                    label="Student"
                    placeholder="Search by student name / hallticket"
                    value={selectedStudentId ? String(selectedStudentId) : null}
                    options={studentsSelectOptions}
                    searchable
                    clearable
                    isLoading={studentSearchLoading}
                    className="w-full [&_label]:text-xs [&_label]:font-medium [&_button[role='combobox']]:h-8 [&_button[role='combobox']]:text-[12px]"
                    onSearch={(term) => void onSearchStudents(term)}
                    onChange={(v) => onStudentSelect(v ? Number(v) : null)}
                  />
                </div>
                <Button type="button" className="h-8 shrink-0 px-4 text-[12px]" onClick={onGet} disabled={loading}>
                  Get
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                <div className="md:col-span-11 space-y-0.5">
                  <Label className="text-xs font-medium">Section</Label>
                  <Select
                    value={selectedSectionId ? String(selectedSectionId) : null}
                    onChange={(value) => setSelectedSectionId(value ? Number(value) : null)}
                    options={sectionOptions}
                    placeholder="Select Section"
                    searchable
                    className="[&_button[role='combobox']]:h-7 [&_button[role='combobox']]:min-h-7 [&_button[role='combobox']]:py-0 [&_button[role='combobox']]:text-[11px] [&_button[role='combobox']]:px-2"
                  />
                </div>
                <div className="md:col-span-1">
                  <Button type="button" className="h-7 text-[11px] w-full px-2" onClick={onGet} disabled={loading}>
                    Get
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {rows.length > 0 && (
        <div className="app-card p-4">
          <div className="overflow-auto rounded border">
            <table className="w-full text-[12px]">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-2 py-1">SI.No</th>
                  <th className="text-left px-2 py-1">Hallticket No</th>
                  <th className="text-left px-2 py-1">Student Name</th>
                  <th className="text-left px-2 py-1">Course</th>
                  <th className="text-left px-2 py-1">Section</th>
                  <th className="text-left px-2 py-1">Mobile</th>
                  <th className="text-left px-2 py-1">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={`row-${pickNum(row, ['studentId']) || index}`} className="border-t">
                    <td className="px-2 py-1">{index + 1}</td>
                    <td className="px-2 py-1">{pickText(row, ['hallticketNumber', 'rollNumber'])}</td>
                    <td className="px-2 py-1">{pickText(row, ['studentName', 'firstName'])}</td>
                    <td className="px-2 py-1">{pickText(row, ['courseName', 'course_code'])}</td>
                    <td className="px-2 py-1">{pickText(row, ['sectionName', 'group_section_name'])}</td>
                    <td className="px-2 py-1">{pickText(row, ['mobileNumber', 'mobile_number'])}</td>
                    <td className="px-2 py-1">{row.isActive === false ? 'Inactive' : 'Active'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </PageContainer>
  )
}
