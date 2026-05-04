'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { format, isValid, parse } from 'date-fns'
import { List, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { DatePicker } from '@/common/components/date-picker'
import { Select, type SelectOption } from '@/common/components/select'
import { Table } from '@/common/components/table'
import { PageContainer, PageHeader } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { toastError, toastSuccess } from '@/lib/toast'
import { listAcademicYearsByUniversity } from '@/services/pre-examination'
import {
  createExamGroupExamLine,
  getExamGroupByCodeRows,
  getExamGroupingById,
  listExamGroupExamLines,
  listExamsForExamGroupPicker,
  pickExamGroupLineId,
  pickLineExamId,
  pickLineExamLabel,
  removeExamGroupExamLine,
  updateExamGrouping,
  type AnyRow,
} from '@/services/exam-papers-delivery'

const BACK = '/admin-examination-management/exam-papers-delivery-process/exam-group'

function num(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function pickUniversityIdFromGroup(row: AnyRow): number {
  const nested = row.university ?? row.University ?? row.Universities
  if (nested && typeof nested === 'object') {
    const o = nested as AnyRow
    return num(o.universityId ?? o.university_id ?? o.id)
  }
  return num(row.universityId ?? row.university_id ?? row.fk_university_id)
}

function pickGroupDisplayName(row: AnyRow): string {
  return String(row.examGroupName ?? row.examGroupingName ?? row.exam_group_name ?? 'Exam group')
}

function groupTitleParts(titleSuffix: string): { base: string; name: string } {
  if (!titleSuffix.trim()) return { base: 'Edit Exam Group Details', name: '' }
  return { base: 'Edit Exam Group Details', name: titleSuffix.trim() }
}

/** API may expose only nested `academicYear` / `AcademicYear` (JPA), not flat `academicYearId`. */
function pickAcademicYearId(row: AnyRow): number {
  const flat = num(row.academicYearId ?? row.academic_year_id ?? row.fk_academic_year_id)
  if (flat > 0) return flat
  const nested = row.academicYear ?? row.AcademicYear ?? row.academic_year
  if (nested && typeof nested === 'object') {
    const o = nested as AnyRow
    return num(o.academicYearId ?? o.academic_year_id ?? o.id)
  }
  return 0
}

function pickAcademicYearLabelFromGroup(row: AnyRow): string {
  const nested = row.academicYear ?? row.AcademicYear ?? row.academic_year
  if (nested && typeof nested === 'object') {
    const o = nested as AnyRow
    const s = o.academic_year ?? o.academicYear ?? o.academicYearName ?? o.academic_year_name
    if (typeof s === 'string' && s.trim()) return s
  }
  const s = row.academic_year ?? row.academicYear ?? row.academicYearName ?? row.academic_year_name
  return typeof s === 'string' ? s : ''
}

function parseExamMonthYr(raw: string): Date | null {
  const s = raw.trim()
  if (!s) return null
  const direct = new Date(s)
  if (!Number.isNaN(direct.getTime())) return direct
  const formats = ['dd/MM/yyyy', 'MM/dd/yyyy', 'yyyy-MM-dd', 'MMM, yyyy', 'MMM yyyy']
  for (const f of formats) {
    const d = parse(s, f, new Date())
    if (isValid(d)) return d
  }
  return null
}

/** ISO `yyyy-MM-dd` for `in_exam_month_yr` on `s_get_exam_group_bycode`. */
function toIsoExamMonthYr(examMonthDate: Date | null, examMonthRaw: string): string {
  if (examMonthDate) return format(examMonthDate, 'yyyy-MM-dd')
  const p = parseExamMonthYr(examMonthRaw.trim())
  if (p) return format(p, 'yyyy-MM-dd')
  return '1990-01-01'
}

export default function ExamGroupDetailsPage() {
  const searchParams = useSearchParams()
  const id = num(searchParams.get('univExamGroupId') ?? searchParams.get('examGroupingId') ?? 0)

  const [groupRow, setGroupRow] = useState<AnyRow | null>(null)
  const [lines, setLines] = useState<AnyRow[]>([])
  const [loading, setLoading] = useState(true)
  const [linesLoading, setLinesLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const [academicYears, setAcademicYears] = useState<AnyRow[]>([])
  const [academicYearId, setAcademicYearId] = useState<string>('')
  const [examMonthDate, setExamMonthDate] = useState<Date | null>(null)
  const [examOptions, setExamOptions] = useState<AnyRow[]>([])
  const [selectedExamId, setSelectedExamId] = useState<string>('')

  const universityIdFromRow = groupRow ? pickUniversityIdFromGroup(groupRow) : 0
  const universityIdFromQuery = num(searchParams.get('universityId') ?? 0)
  const effectiveUniversityId = universityIdFromRow > 0 ? universityIdFromRow : universityIdFromQuery

  const loadLines = useCallback(async (groupId: number) => {
    setLinesLoading(true)
    try {
      const rows = await listExamGroupExamLines(groupId)
      setLines(Array.isArray(rows) ? rows : [])
    } catch (e) {
      toastError(e, 'Failed to load exams for this group')
      setLines([])
    } finally {
      setLinesLoading(false)
    }
  }, [])

  const loadGroup = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const uidFromQuery = num(searchParams.get('universityId') ?? 0)
      const orgId = Number(globalThis?.localStorage?.getItem('organizationId') ?? 0)
      const employeeId = Number(globalThis?.localStorage?.getItem('employeeId') ?? 0)
      const row = await getExamGroupingById(id, uidFromQuery, { orgId, employeeId })
      setGroupRow(row)
      if (!row) {
        toastError(
          'Could not load this exam group. Use Exam Group → Get List, then open Group Details from the row.',
        )
      }
      if (row) {
        const uidFromRow = pickUniversityIdFromGroup(row)
        const uidFromQuery = num(searchParams.get('universityId') ?? 0)
        const effectiveUid = uidFromRow > 0 ? uidFromRow : uidFromQuery

        const ayId = pickAcademicYearId(row)
        setAcademicYearId(ayId > 0 ? String(ayId) : '')
        setExamMonthDate(parseExamMonthYr(String(row.examMonthYr ?? row.examMonthYear ?? '')))

        if (effectiveUid > 0) {
          const ay = await listAcademicYearsByUniversity(effectiveUid).catch(() => [])
          setAcademicYears(Array.isArray(ay) ? ay : [])
        } else {
          setAcademicYears([])
        }
        await loadLines(id)
      }
    } catch (e) {
      toastError(e, 'Failed to load exam group')
      setGroupRow(null)
    } finally {
      setLoading(false)
    }
  }, [id, loadLines, searchParams])

  useEffect(() => {
    void loadGroup()
  }, [loadGroup])

  useEffect(() => {
    let cancelled = false
    async function loadExams() {
      if (!effectiveUniversityId || !academicYearId || !id) {
        setExamOptions([])
        setSelectedExamId('')
        return
      }
      const empId = Number(globalThis?.localStorage?.getItem('employeeId') ?? 0)
      const iso = toIsoExamMonthYr(
        examMonthDate,
        String(groupRow?.examMonthYr ?? groupRow?.examMonthYear ?? ''),
      )

      try {
        const procRows = await getExamGroupByCodeRows({
          universityId: effectiveUniversityId,
          examGroupId: id,
          academicYearId: Number(academicYearId),
          examMonthYrIso: iso,
          employeeId: empId,
        })
        if (cancelled) return
        const withExam = procRows.filter((r) => num(r.fk_exam_id ?? r.exam_id ?? r.examId) > 0)
        if (withExam.length > 0) {
          setExamOptions(withExam)
          return
        }
      } catch {
        /* fallback to ExamMaster list */
      }

      try {
        const list = await listExamsForExamGroupPicker(effectiveUniversityId, Number(academicYearId))
        if (!cancelled) setExamOptions(Array.isArray(list) ? list : [])
      } catch {
        if (!cancelled) setExamOptions([])
      }
    }
    void loadExams()
    return () => {
      cancelled = true
    }
  }, [effectiveUniversityId, academicYearId, id, examMonthDate, groupRow])

  const academicYearSelectOptions: SelectOption[] = useMemo(() => {
    const base = academicYears
      .map((y) => ({
        value: String(num(y.academicYearId ?? y.academic_year_id ?? y.fk_academic_year_id)),
        label: String(y.academic_year ?? y.academicYear ?? y.academicYearName ?? '-'),
      }))
      .filter((o) => o.value !== '0' && o.value !== '')

    const sel = academicYearId.trim()
    if (!groupRow || !sel) return base
    if (base.some((o) => o.value === sel)) return base

    const labelFromRow = pickAcademicYearLabelFromGroup(groupRow).trim()
    const label = labelFromRow || `Academic year #${sel}`
    return [{ value: sel, label }, ...base]
  }, [academicYears, academicYearId, groupRow])

  const examSelectOptions: SelectOption[] = useMemo(() => {
    const seen = new Set<string>()
    const out: SelectOption[] = []
    for (const e of examOptions) {
      const vid = String(num(e.examId ?? e.exam_id ?? e.fk_exam_id))
      if (!vid || vid === '0' || seen.has(vid)) continue
      seen.add(vid)
      out.push({
        value: vid,
        label: String(e.examName ?? e.exam_name ?? e.examShortName ?? e.exam_short_name ?? '-'),
      })
    }
    return out
  }, [examOptions])

  const lineExamIds = useMemo(() => new Set(lines.map((r) => pickLineExamId(r)).filter((x) => x > 0)), [lines])

  const titleSuffix = groupRow ? pickGroupDisplayName(groupRow) : ''
  const titleParts = groupTitleParts(titleSuffix)

  /** Persists academic year, exam month/year, and group header fields to `UnivExamGroup`. */
  async function persistGroupHeader(): Promise<boolean> {
    if (!id || !groupRow) return false
    if (!academicYearId) {
      toastError('Select an academic year.')
      return false
    }
    if (!examMonthDate) {
      toastError('Select exam month and year.')
      return false
    }
    const universityIdForPayload =
      pickUniversityIdFromGroup(groupRow) > 0 ? pickUniversityIdFromGroup(groupRow) : universityIdFromQuery
    if (!universityIdForPayload) {
      toastError('University is missing. Open Group Details from the exam group list, or add ?universityId= to the URL.')
      return false
    }
    await updateExamGrouping(id, {
      univExamGroupId: id,
      universityId: universityIdForPayload,
      examGroupCode: String(groupRow.examGroupCode ?? groupRow.exam_group_code ?? ''),
      examGroupName: String(groupRow.examGroupName ?? groupRow.exam_group_name ?? ''),
      academicYearId: Number(academicYearId),
      examMonthYr: format(examMonthDate, 'dd/MM/yyyy'),
      isActive: groupRow.isActive !== false,
      reason: String(groupRow.reason ?? ''),
    })
    return true
  }

  async function handleSave() {
    if (!id || !groupRow) return
    setSaving(true)
    try {
      const ok = await persistGroupHeader()
      if (!ok) return
      toastSuccess('Group details saved.')
      const oid = Number(globalThis?.localStorage?.getItem('organizationId') ?? 0)
      const eid = Number(globalThis?.localStorage?.getItem('employeeId') ?? 0)
      const refreshed = await getExamGroupingById(id, universityIdFromQuery, { orgId: oid, employeeId: eid })
      if (refreshed) setGroupRow(refreshed)
    } catch (e) {
      toastError(e, 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleAdd() {
    if (!id || !groupRow) return
    const examId = Number(selectedExamId)
    if (!examId) {
      toastError('Select an exam.')
      return
    }
    if (lineExamIds.has(examId)) {
      toastError('This exam is already in the list.')
      return
    }

    setSaving(true)
    try {
      if (!(await persistGroupHeader())) return
      await createExamGroupExamLine({
        univExamGroupId: id,
        examId: examId,
      })
      toastSuccess('Exam added to group.')
      setSelectedExamId('')
      await loadLines(id)
      const oid = Number(globalThis?.localStorage?.getItem('organizationId') ?? 0)
      const eid = Number(globalThis?.localStorage?.getItem('employeeId') ?? 0)
      const refreshed = await getExamGroupingById(id, universityIdFromQuery, { orgId: oid, employeeId: eid })
      if (refreshed) setGroupRow(refreshed)
    } catch (e) {
      toastError(e, 'Could not add exam — check UnivExamGroupDetails create payload with your API.')
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove(line: AnyRow) {
    const linePk = pickExamGroupLineId(line)
    if (!linePk) {
      toastError('Could not read line id for this row.')
      return
    }
    setSaving(true)
    try {
      await removeExamGroupExamLine(linePk)
      toastSuccess('Exam removed from group.')
      if (id) await loadLines(id)
    } catch (e) {
      toastError(e, 'Remove failed')
    } finally {
      setSaving(false)
    }
  }

  if (!id) {
    return (
      <PageContainer className="p-6">
        <p className="text-sm text-muted-foreground">Missing univExamGroupId.</p>
        <Button asChild variant="link" className="px-0">
          <Link href={BACK}>← Back to Exam Group</Link>
        </Button>
      </PageContainer>
    )
  }

  return (
    <PageContainer className="space-y-5 p-4 sm:p-6">
      <PageHeader
        title="Edit exam group details"
        subtitle={titleSuffix ? `Exam papers delivery · ${titleSuffix}` : 'Exam papers delivery · Exam group'}
      />

      <div className="app-card p-3 border-t-[3px] border-t-amber-300">
        <div className="flex items-center gap-2 min-w-0 border-b border-slate-200 pb-3">
          <List className="h-4 w-4 text-blue-700 shrink-0" aria-hidden />
          <h2 className="text-[15px] font-semibold leading-tight truncate">
            <span className="text-[hsl(var(--card-title))]">{titleParts.base}</span>
            {titleParts.name && <span className="text-muted-foreground"> | </span>}
            {titleParts.name && <span className="text-primary font-bold">{titleParts.name}</span>}
          </h2>
        </div>

        {loading && <p className="mt-4 text-muted-foreground text-sm">Loading…</p>}
        {!loading && groupRow === null && (
          <p className="mt-4 text-muted-foreground text-sm">No record found.</p>
        )}
        {!loading && groupRow !== null && (
          <div className="mt-4 flex flex-wrap items-end gap-4">
            <div className="space-y-1 min-w-[180px] flex-1">
              <Label>Academic year</Label>
              <Select
                options={academicYearSelectOptions}
                value={academicYearId}
                onChange={(v) => setAcademicYearId(v)}
                placeholder="Select academic year"
                disabled={academicYearSelectOptions.length === 0}
              />
            </div>
            <div className="space-y-1 min-w-[200px] flex-1">
              <DatePicker
                label="Exam month and year"
                value={examMonthDate}
                onChange={setExamMonthDate}
                placeholder="Pick date"
                clearable={false}
              />
            </div>
            <div className="space-y-1 min-w-[220px] flex-[2]">
              <Label>
                Exam <span className="text-destructive">*</span>
              </Label>
              <Select
                options={examSelectOptions}
                value={selectedExamId}
                onChange={(v) => setSelectedExamId(v)}
                placeholder={
                  effectiveUniversityId && academicYearId ? 'Select exam' : 'Set academic year first'
                }
                disabled={!effectiveUniversityId || !academicYearId || examSelectOptions.length === 0}
              />
            </div>
            <div className="flex flex-wrap gap-2 ml-auto">
              <Button type="button" onClick={() => void handleAdd()} disabled={saving}>
                Add
              </Button>
              <Button type="button" variant="secondary" asChild>
                <Link href={BACK}>Back</Link>
              </Button>
            </div>
          </div>
        )}
      </div>

      {groupRow && (
        <>
          <div className="app-card overflow-hidden border-t-[3px] border-t-amber-300">
            <div className="px-3 py-2 border-b border-border flex items-center gap-2">
              <List className="h-4 w-4 text-blue-700 shrink-0" aria-hidden />
              <h2 className="text-[15px] font-semibold">
                <span className="text-[hsl(var(--card-title))]">{titleParts.base}</span>
                {titleParts.name && <span className="text-muted-foreground"> | </span>}
                {titleParts.name && <span className="text-primary font-bold">{titleParts.name}</span>}
              </h2>
            </div>
            <div className="p-2">
              <Table
                density="compact"
                loading={linesLoading}
                pageSize={0}
                emptyText="No exams linked yet. Select an exam above and click Add."
                rows={lines}
                columns={[
                  {
                    id: 'exam',
                    label: 'Exam',
                    width: 85,
                    render: (row) => (
                      <span className="text-[12px] leading-snug">{pickLineExamLabel(row)}</span>
                    ),
                  },
                  {
                    id: 'actions',
                    label: 'Actions',
                    width: 15,
                    render: (row) => (
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0 text-destructive hover:text-destructive"
                          aria-label="Remove exam"
                          disabled={saving}
                          onClick={() => void handleRemove(row)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ),
                  },
                ]}
              />
            </div>
          </div>
          <div className="flex justify-end pt-3">
            <Button type="button" onClick={() => void handleSave()} disabled={saving || loading}>
              Save
            </Button>
          </div>
        </>
      )}
    </PageContainer>
  )
}
