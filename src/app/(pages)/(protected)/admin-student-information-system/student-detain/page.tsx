'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, Filter } from 'lucide-react'
import { PageContainer, PageHeader } from '@/components/layout'
import { Select } from '@/common/components/select'
import { useSessionContext } from '@/context/SessionContext'
import { toastError, toastSuccess } from '@/lib/toast'
import { listStudents } from '@/services/pre-examination'
import { getStudentInfoFilters, listStudentsBySection, normalizeStudentRow, submitStudentDetain } from '@/services'

type AnyRow = Record<string, any>

function pickNum(row: AnyRow | null | undefined, keys: string[]): number {
  if (!row) return 0
  for (const k of keys) {
    const n = Number(row[k] ?? 0)
    if (Number.isFinite(n) && n > 0) return n
  }
  return 0
}

function pickText(row: AnyRow | null | undefined, keys: string[]): string {
  if (!row) return ''
  for (const k of keys) {
    const v = row[k]
    if (v != null && String(v).trim() !== '') return String(v)
  }
  return ''
}

function studentId(row: AnyRow, fallback: number): number {
  return pickNum(row, ['studentId', 'fk_student_id', 'student_id', 'id', 'studentDetailId']) || fallback
}

function dedupeBy<T>(rows: T[], keyFn: (row: T) => string | number): T[] {
  const seen = new Set<string | number>()
  return rows.filter((row) => {
    const key = keyFn(row)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export default function StudentDetainPage() {
  const { user } = useSessionContext()

  const [mode, setMode] = useState<'student' | 'section'>('student')
  const [filterOpen, setFilterOpen] = useState(true)
  const [studentOptions, setStudentOptions] = useState<AnyRow[]>([])
  const [sectionRows, setSectionRows] = useState<AnyRow[]>([])
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null)
  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(null)
  const [rows, setRows] = useState<AnyRow[]>([])
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [reasonById, setReasonById] = useState<Record<number, string>>({})
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [loadingRows, setLoadingRows] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const studentsSelectOptions = useMemo(
    () =>
      studentOptions.map((row, i) => ({
        value: String(studentId(row, i + 1)),
        label: `${pickText(row, ['studentName', 'firstName']) || '-'}(${pickText(row, ['hallticketNumber', 'rollNumber']) || '-'})`,
      })),
    [studentOptions],
  )

  const sectionOptions = useMemo(
    () =>
      sectionRows.map((row, i) => ({
        value: String(pickNum(row, ['fk_group_section_id', 'groupSectionId', 'group_section_id']) || i + 1),
        label: pickText(row, ['group_section_name', 'groupSectionName', 'sectionName', 'group_section_code']) || 'Section',
      })),
    [sectionRows],
  )

  const selectedRows = useMemo(
    () => rows.filter((row, i) => selectedIds.includes(studentId(row, i + 1))),
    [rows, selectedIds],
  )

  const canSubmit = useMemo(() => {
    if (selectedRows.length === 0 || submitting) return false
    return selectedRows.every((row, index) => {
      const sid = studentId(row, index + 1)
      return (reasonById[sid] ?? '').trim().length > 0
    })
  }, [reasonById, selectedRows, submitting])

  useEffect(() => {
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
    void loadSections()
  }, [user?.employeeId, user?.organizationId])

  async function onSearchStudents(term: string) {
    const q = term.trim()
    if (q.length === 0) {
      setStudentOptions([])
      return
    }
    if (q.length < 3) return
    setLoadingStudents(true)
    try {
      const fetched = await listStudents(q).catch(() => [])
      setStudentOptions(Array.isArray(fetched) ? fetched : [])
    } finally {
      setLoadingStudents(false)
    }
  }

  useEffect(() => {
    async function loadByStudent() {
      if (mode !== 'student' || !selectedStudentId) {
        setRows([])
        setSelectedIds([])
        setReasonById({})
        return
      }
      const match = studentOptions.find((row, idx) => studentId(row, idx + 1) === selectedStudentId) ?? null
      if (!match) {
        setRows([])
        setSelectedIds([])
        setReasonById({})
        return
      }
      const normalized = normalizeStudentRow(match)
      setRows([normalized])
      setSelectedIds([])
      setReasonById({})
    }
    void loadByStudent()
  }, [mode, selectedStudentId, studentOptions])

  useEffect(() => {
    async function loadBySection() {
      if (mode !== 'section') return
      if (!selectedSectionId) {
        setRows([])
        setSelectedIds([])
        setReasonById({})
        return
      }
      setLoadingRows(true)
      try {
        const fetched = await listStudentsBySection(selectedSectionId)
        const normalized = fetched.map((row) => normalizeStudentRow(row))
        setRows(normalized)
        setSelectedIds([])
        setReasonById({})
      } catch {
        setRows([])
        setSelectedIds([])
        setReasonById({})
      } finally {
        setLoadingRows(false)
      }
    }
    void loadBySection()
  }, [mode, selectedSectionId])

  function toggleSelected(id: number, checked: boolean) {
    setSelectedIds((prev) => {
      if (checked) return prev.includes(id) ? prev : [...prev, id]
      return prev.filter((x) => x !== id)
    })
  }

  function statusCode(row: AnyRow): string {
    return String(row.studentStatusCode ?? row.student_status_code ?? '').trim().toUpperCase()
  }

  function canDetain(row: AnyRow): boolean {
    const code = statusCode(row)
    if (!code) return true
    return code !== 'DTND' && code !== 'DETAINRECOMMENDED'
  }

  function setReason(id: number, reason: string) {
    setReasonById((prev) => ({ ...prev, [id]: reason }))
  }

  async function onSubmitDetain() {
    if (!canSubmit) return
    const selected = rows.filter((row, i) => selectedIds.includes(studentId(row, i + 1)))
    if (selected.length === 0) return

    const payloadRows = selected.map((row, i) => {
      const sid = studentId(row, i + 1)
      return {
        ...row,
        studentId: sid,
        reason: (reasonById[sid] ?? '').trim(),
        studentStatusCode: 'DETAINRECOMMENDED',
        isPresent: true,
        isActive: true,
      }
    })

    const payloadVariants: Array<Record<string, unknown> | Record<string, unknown>[]> = [
      { students: payloadRows },
      { studentList: payloadRows },
      { detainsList: payloadRows },
      { detainList: payloadRows },
      { details: payloadRows },
      payloadRows,
    ]

    setSubmitting(true)
    try {
      let success = false
      let lastError: unknown = null
      for (const payload of payloadVariants) {
        try {
          await submitStudentDetain(payload)
          success = true
          break
        } catch (error) {
          lastError = error
        }
      }
      if (!success) throw lastError ?? new Error('Submit failed')

      toastSuccess('Student detain submitted successfully')
      if (mode === 'student') {
        setRows((prev) =>
          prev.map((row, i) =>
            selectedIds.includes(studentId(row, i + 1))
              ? { ...row, studentStatusCode: 'DETAINRECOMMENDED' }
              : row,
          ),
        )
      } else if (selectedSectionId) {
        setLoadingRows(true)
        try {
          const fetched = await listStudentsBySection(selectedSectionId)
          setRows(fetched.map((row) => normalizeStudentRow(row)))
        } catch {
          // Keep current list on refresh failure.
        } finally {
          setLoadingRows(false)
        }
      }
      setSelectedIds([])
      setReasonById({})
    } catch (error) {
      toastError(error, 'Failed to submit student detain')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PageContainer className="space-y-4">
      <PageHeader title="Students Detain" subtitle="Student Information System" />

      <div className="flex flex-wrap items-center gap-6 text-sm">
        <label className="inline-flex items-center gap-2">
          <input
            type="radio"
            checked={mode === 'student'}
            onChange={() => {
              setMode('student')
              setSelectedSectionId(null)
              setRows([])
              setSelectedIds([])
              setReasonById({})
            }}
          />
          Search By Student
        </label>
        <label className="inline-flex items-center gap-2">
          <input
            type="radio"
            checked={mode === 'section'}
            onChange={() => {
              setMode('section')
              setSelectedStudentId(null)
              setRows([])
              setSelectedIds([])
              setReasonById({})
            }}
          />
          Search By Section
        </label>
      </div>

      <div className="app-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/40 flex items-center justify-between gap-2">
          <h2 className="app-card-title">Student Detain</h2>
          <button
            type="button"
            className="inline-flex items-center text-[12px] text-slate-700"
            onClick={() => setFilterOpen((v) => !v)}
          >
            <Filter className="mr-1.5 h-3.5 w-3.5" />
            Filter
            <ChevronDown className={`ml-1.5 h-3.5 w-3.5 transition-transform ${filterOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {filterOpen && (
          <div className="p-3">
            {mode === 'student' ? (
              <div className="max-w-md">
                <Select
                  label="Student"
                  placeholder="Search student"
                  value={selectedStudentId ? String(selectedStudentId) : null}
                  options={studentsSelectOptions}
                  searchable
                  clearable
                  isLoading={loadingStudents}
                  onSearch={(term) => void onSearchStudents(term)}
                  onChange={(v) => setSelectedStudentId(v ? Number(v) : null)}
                  className="[&_label]:text-xs [&_label]:font-medium [&_button[role='combobox']]:h-8 [&_button[role='combobox']]:text-[12px]"
                />
              </div>
            ) : (
              <div className="max-w-md">
                <Select
                  label="Section"
                  placeholder="Select section"
                  value={selectedSectionId ? String(selectedSectionId) : null}
                  options={sectionOptions}
                  searchable
                  onChange={(v) => setSelectedSectionId(v ? Number(v) : null)}
                  className="[&_label]:text-xs [&_label]:font-medium [&_button[role='combobox']]:h-8 [&_button[role='combobox']]:text-[12px]"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {rows.length > 0 && (
        <div className="app-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/40">
            <h2 className="app-card-title">Detain</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2">
            <div className="p-3 border-b lg:border-b-0 lg:border-r">
              <div className="overflow-auto rounded border">
                <table className="w-full text-[12px]">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="px-2 py-1 text-left">Sl.No</th>
                      <th className="px-2 py-1 text-left">Hallticket No</th>
                      <th className="px-2 py-1 text-left">Student Name</th>
                      <th className="px-2 py-1 text-left">Select</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, index) => {
                      const sid = studentId(row, index + 1)
                      const disabled = !canDetain(row)
                      return (
                        <tr key={`detain-row-${sid}-${index}`} className="border-t">
                          <td className="px-2 py-1">{index + 1}</td>
                          <td className="px-2 py-1">{pickText(row, ['hallticketNumber', 'rollNumber']) || '-'}</td>
                          <td className="px-2 py-1">{pickText(row, ['studentName', 'firstName']) || '-'}</td>
                          <td className="px-2 py-1">
                            <input
                              type="checkbox"
                              disabled={disabled}
                              checked={selectedIds.includes(sid)}
                              onChange={(e) => toggleSelected(sid, e.target.checked)}
                            />
                            {disabled && (
                              <span className="ml-2 text-[11px] text-amber-700">
                                {statusCode(row)}
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-3">
              <div className="border rounded overflow-hidden">
                <div className="bg-muted/40 px-3 py-2 border-b flex items-center justify-between text-[12px] font-semibold">
                  <span>SELECTED STUDENT LIST</span>
                  <span>{selectedRows.length}</span>
                </div>
                <div className="p-3 text-[12px] text-slate-700">
                  {selectedRows.length === 0 ? (
                    <p>No Students Detain.</p>
                  ) : (
                    <ul className="space-y-2">
                      {selectedRows.map((row, index) => (
                        <li key={`selected-${studentId(row, index + 1)}-${index}`} className="space-y-1">
                          <div>
                            {pickText(row, ['studentName', 'firstName']) || '-'} ({pickText(row, ['hallticketNumber', 'rollNumber']) || '-'})
                          </div>
                          <textarea
                            value={reasonById[studentId(row, index + 1)] ?? ''}
                            onChange={(e) => setReason(studentId(row, index + 1), e.target.value)}
                            placeholder="Detain reason"
                            className="w-full rounded border border-input px-2 py-1 text-[12px]"
                            rows={2}
                          />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {rows.length > 0 && selectedRows.length > 0 && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => void onSubmitDetain()}
            disabled={!canSubmit}
            className="inline-flex items-center rounded bg-[hsl(var(--primary))] px-3 py-1.5 text-[12px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Submitting…' : 'Submit'}
          </button>
        </div>
      )}
    </PageContainer>
  )
}
