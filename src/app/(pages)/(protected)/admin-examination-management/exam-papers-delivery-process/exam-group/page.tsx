'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { BookMarked, ChevronDown, Filter, Pencil, Plus } from 'lucide-react'
import { PageContainer, PageHeader } from '@/components/layout'
import { DataTable } from '@/common/components/table'
import { Select, type SelectOption } from '@/common/components/select'
import { FormModal } from '@/common/components/feedback'
import { StatusBadge } from '@/common/components/data-display'
import { ActiveStatusField } from '@/common/components/forms'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { rowIndexGetter } from '@/lib/utils'
import { toastError, toastSuccess } from '@/lib/toast'
import { listAcademicYearsByUniversity } from '@/services/pre-examination'
import {
  createExamGrouping,
  listUniversitiesForExamGroup,
  listExamGroupingsByUniversity,
  pickExamGroupingId,
  updateExamGrouping,
  type AnyRow,
} from '@/services/exam-papers-delivery'

type GroupRow = AnyRow

function num(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function pickUniversityId(u: AnyRow): number {
  return num(u.universityId ?? u.university_id ?? u.fk_university_id)
}

function pickUniversityLabel(u: AnyRow): string {
  return String(
    u.university_code ?? u.universityCode ?? u.university_name ?? u.universityName ?? u.universityId ?? '-',
  )
}

/** FK used for links and payloads — list rows often nest `university` instead of flat `universityId`. */
function pickUniversityIdFromGroup(row: GroupRow): number {
  const nested = row.university ?? row.University ?? row.Universities
  if (nested && typeof nested === 'object') {
    return num(
      (nested as AnyRow).universityId ??
        (nested as AnyRow).university_id ??
        (nested as AnyRow).id,
    )
  }
  return num(row.universityId ?? row.university_id ?? row.fk_university_id)
}

function pickUniCell(row: GroupRow): string {
  const nested = 'university' in row ? row.university : undefined
  if (nested && typeof nested === 'object') {
    return String(
      nested.universityName ??
        nested.university_name ??
        nested.universityCode ??
        nested.university_code ??
        '-',
    )
  }
  return String(
    row.university_name ??
      row.universityName ??
      row.university_code ??
      row.universityCode ??
      '-',
  )
}

function pickAy(row: GroupRow): string {
  const nested = row.academicYear ?? row.AcademicYear ?? row.academic_year
  if (nested && typeof nested === 'object') {
    const o = nested as AnyRow
    const s = o.academic_year ?? o.academicYear ?? o.academicYearName ?? o.academic_year_name
    if (typeof s === 'string' && s.trim()) return s
  }
  return String(row.academic_year ?? row.academicYear ?? row.academicYearName ?? row.academic_year_name ?? '-')
}

function pickAcademicYearIdFromRow(row: GroupRow): number {
  const flat = num(row.academicYearId ?? row.academic_year_id ?? row.fk_academic_year_id)
  if (flat > 0) return flat
  const nested = row.academicYear ?? row.AcademicYear ?? row.academic_year
  if (nested && typeof nested === 'object') {
    return num(
      (nested as AnyRow).academicYearId ??
        (nested as AnyRow).academic_year_id ??
        (nested as AnyRow).id,
    )
  }
  return 0
}

function pickAcademicYearLabelFromRow(row: GroupRow): string {
  const nested = row.academicYear ?? row.AcademicYear ?? row.academic_year
  if (nested && typeof nested === 'object') {
    const s =
      (nested as AnyRow).academic_year ??
      (nested as AnyRow).academicYear ??
      (nested as AnyRow).academicYearName ??
      (nested as AnyRow).academic_year_name
    if (typeof s === 'string' && s.trim()) return s
  }
  const s = row.academic_year ?? row.academicYear ?? row.academicYearName ?? row.academic_year_name
  return typeof s === 'string' ? s : ''
}

function pickExamMonthYr(row: GroupRow): string {
  return String(row.exam_month_yr ?? row.examMonthYr ?? row.examMonthYear ?? '-')
}

function pickCode(row: GroupRow): string {
  return String(row.examGroupCode ?? row.examGroupingCode ?? row.exam_group_code ?? '-')
}

function pickName(row: GroupRow): string {
  return String(row.examGroupName ?? row.examGroupingName ?? row.exam_group_name ?? '-')
}

function statusRenderer(p: ICellRendererParams<GroupRow>) {
  return <StatusBadge status={Boolean(p.data?.isActive)} />
}

function detailsLinkRenderer(p: ICellRendererParams<GroupRow>) {
  const row = p.data
  if (!row) return null
  const id = pickExamGroupingId(row)
  if (!id) return <span className="text-muted-foreground">—</span>
  const uni = pickUniversityIdFromGroup(row)
  const uniQs = uni > 0 ? `&universityId=${uni}` : ''
  return (
    <Link
      href={`/admin-examination-management/exam-papers-delivery-process/exam-group/group-details?univExamGroupId=${id}${uniQs}`}
      className="text-[13px] text-blue-700 hover:underline"
    >
      Group Details
    </Link>
  )
}

function makeEditRenderer(onEdit: (row: GroupRow) => void) {
  return (p: ICellRendererParams<GroupRow>) => {
    const row = p.data
    if (!row) return null
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-blue-700"
        aria-label="Edit"
        onClick={() => onEdit(row)}
      >
        <Pencil className="h-4 w-4" />
      </Button>
    )
  }
}

export default function ExamGroupPage() {
  const orgId = Number(globalThis?.localStorage?.getItem('organizationId') ?? 0)
  const employeeId = Number(globalThis?.localStorage?.getItem('employeeId') ?? 0)
  const [loadingUni, setLoadingUni] = useState(true)
  const [universities, setUniversities] = useState<AnyRow[]>([])
  const [universityId, setUniversityId] = useState<number | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(true)

  const [loadingList, setLoadingList] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [rows, setRows] = useState<GroupRow[]>([])

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<GroupRow | null>(null)
  const [saving, setSaving] = useState(false)
  const [academicYears, setAcademicYears] = useState<AnyRow[]>([])

  const [form, setForm] = useState({
    examGroupCode: '',
    examGroupName: '',
    academicYearId: '' as string,
    examMonthYr: '',
    isActive: true,
    reason: '',
  })

  const universityOptions: SelectOption[] = useMemo(
    () =>
      universities.map((u) => ({
        value: String(pickUniversityId(u)),
        label: pickUniversityLabel(u),
      })),
    [universities],
  )

  const academicYearOptions: SelectOption[] = useMemo(() => {
    const base = academicYears
      .map((y) => {
        const nested = y.academicYear ?? y.AcademicYear ?? y.academic_year
        const nestedId =
          nested && typeof nested === 'object'
            ? num((nested as AnyRow).academicYearId ?? (nested as AnyRow).academic_year_id ?? (nested as AnyRow).id)
            : 0
        const id = num(y.academicYearId ?? y.academic_year_id ?? y.fk_academic_year_id) || nestedId
        const nestedLabel =
          nested && typeof nested === 'object'
            ? (nested as AnyRow).academic_year ??
              (nested as AnyRow).academicYear ??
              (nested as AnyRow).academicYearName ??
              (nested as AnyRow).academic_year_name
            : ''
        const label = String(y.academic_year ?? y.academicYear ?? y.academicYearName ?? nestedLabel ?? '-')
        return { value: String(id), label }
      })
      .filter((o) => o.value !== '0' && o.value !== '')

    const sel = form.academicYearId.trim()
    if (!sel || base.some((o) => o.value === sel)) return base
    const labelFromEditing = editing ? pickAcademicYearLabelFromRow(editing).trim() : ''
    return [{ value: sel, label: labelFromEditing || `Academic year #${sel}` }, ...base]
  }, [academicYears, form.academicYearId, editing])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoadingUni(true)
      try {
        const list = await listUniversitiesForExamGroup(orgId, employeeId)
        if (cancelled) return
        setUniversities(Array.isArray(list) ? list : [])
      } catch (e) {
        toastError(e, 'Failed to load universities')
        setUniversities([])
      } finally {
        if (!cancelled) setLoadingUni(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [orgId, employeeId])

  useEffect(() => {
    if (!universities.length || universityId != null) return
    const first = pickUniversityId(universities[0])
    if (first > 0) setUniversityId(first)
  }, [universities, universityId])

  useEffect(() => {
    let cancelled = false
    async function loadAy() {
      if (!universityId) {
        setAcademicYears([])
        return
      }
      try {
        const list = await listAcademicYearsByUniversity(universityId)
        if (cancelled) return
        setAcademicYears(Array.isArray(list) ? list : [])
      } catch {
        if (!cancelled) setAcademicYears([])
      }
    }
    void loadAy()
    return () => {
      cancelled = true
    }
  }, [universityId])

  const fetchList = useCallback(async () => {
    if (!universityId) {
      toastError('Please select a university.')
      return
    }
    setLoadingList(true)
    try {
      const list = await listExamGroupingsByUniversity(universityId)
      setRows(Array.isArray(list) ? list : [])
      setHasLoaded(true)
    } catch (e) {
      toastError(e, 'Failed to load exam groups')
      setRows([])
      setHasLoaded(true)
    } finally {
      setLoadingList(false)
    }
  }, [universityId])

  const handleEditRow = useCallback(
    (row: GroupRow) => {
      const rowUniversityId = pickUniversityIdFromGroup(row)
      if (rowUniversityId > 0 && rowUniversityId !== universityId) {
        setUniversityId(rowUniversityId)
      }
      setEditing(row)
      setForm({
        examGroupCode: pickCode(row),
        examGroupName: pickName(row),
        academicYearId: String(pickAcademicYearIdFromRow(row) || ''),
        examMonthYr: pickExamMonthYr(row),
        isActive: Boolean(row.isActive),
        reason: String(row.reason ?? ''),
      })
      setModalOpen(true)
    },
    [],
  )

  const columnDefs = useMemo<ColDef<GroupRow>[]>(
    () => [
      { headerName: 'Sl No.', valueGetter: rowIndexGetter, width: 80, flex: 0 },
      { headerName: 'University', minWidth: 110, valueGetter: (p) => pickUniCell(p.data) },
      { headerName: 'Academic Year', minWidth: 120, valueGetter: (p) => pickAy(p.data ?? {}) },
      { headerName: 'Exam Month Year', minWidth: 130, valueGetter: (p) => pickExamMonthYr(p.data ?? {}) },
      { headerName: 'Exam Group Code', minWidth: 150, valueGetter: (p) => pickCode(p.data ?? {}) },
      { headerName: 'Exam Group Name', minWidth: 180, valueGetter: (p) => pickName(p.data ?? {}) },
      { headerName: 'Details', minWidth: 120, flex: 0, cellRenderer: detailsLinkRenderer },
      {
        field: 'isActive',
        headerName: 'Status',
        minWidth: 100,
        cellRenderer: statusRenderer,
      },
      {
        headerName: 'Actions',
        minWidth: 72,
        flex: 0,
        width: 72,
        cellRenderer: makeEditRenderer(handleEditRow),
      },
    ],
    [handleEditRow],
  )

  function openCreate() {
    if (!universityId) {
      toastError('Please select a university.')
      return
    }
    setEditing(null)
    setForm({
      examGroupCode: '',
      examGroupName: '',
      academicYearId: academicYearOptions[0]?.value ?? '',
      examMonthYr: '',
      isActive: true,
      reason: '',
    })
    setModalOpen(true)
  }

  async function onSubmitModal(e: { preventDefault: () => void }) {
    e.preventDefault()
    if (!universityId) return
    if (!form.examGroupCode.trim() || !form.examGroupName.trim()) {
      toastError('Exam group code and name are required.')
      return
    }
    if (!form.academicYearId) {
      toastError('Select an academic year.')
      return
    }
    if (!form.isActive && !form.reason.trim()) {
      toastError('Reason is required when inactive.')
      return
    }

    const payload: Record<string, unknown> = {
      universityId,
      examGroupCode: form.examGroupCode.trim(),
      examGroupName: form.examGroupName.trim(),
      academicYearId: Number(form.academicYearId),
      examMonthYr: form.examMonthYr.trim(),
      isActive: form.isActive,
      reason: form.isActive ? '' : form.reason.trim(),
    }

    setSaving(true)
    try {
      const id = pickExamGroupingId(editing ?? {})
      if (id > 0) {
        await updateExamGrouping(id, { ...payload, univExamGroupId: id })
        toastSuccess('Exam group updated.')
      } else {
        await createExamGrouping(payload)
        toastSuccess('Exam group created.')
      }
      setModalOpen(false)
      await fetchList()
    } catch (err) {
      toastError(err, 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <PageContainer className="space-y-5">
      <PageHeader
        title="Exam group"
        subtitle="Exam papers delivery · Group exams by university"
      />

      <div className="app-card p-3 border-t-[3px] border-t-amber-300">
        <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2 min-w-0">
            <BookMarked className="h-4 w-4 text-blue-700 shrink-0" aria-hidden />
            <h2 className="text-[15px] font-semibold leading-tight text-[hsl(var(--card-title))] truncate">
              Exam Group
            </h2>
          </div>
          <button
            type="button"
            className="flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground"
            onClick={() => setFiltersOpen((v) => !v)}
            aria-expanded={filtersOpen}
          >
            <span>Filter</span>
            <Filter className="h-4 w-4" aria-hidden />
            <ChevronDown className={`h-4 w-4 transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {filtersOpen && (
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <div className="space-y-1 min-w-[200px] flex-1">
              <Label>
                University <span className="text-destructive">*</span>
              </Label>
              <Select
                options={universityOptions}
                value={universityId === null ? '' : String(universityId)}
                onChange={(v) => setUniversityId(v ? Number(v) : null)}
                placeholder={loadingUni ? 'Loading…' : 'Select university'}
                disabled={loadingUni || universityOptions.length === 0}
              />
            </div>
            <Button type="button" onClick={() => void fetchList()} disabled={loadingList || universityId == null}>
              Get List
            </Button>
          </div>
        )}
      </div>

      {hasLoaded && (
        <div className="app-card overflow-hidden">
          <div className="p-2">
            <DataTable
              rowData={rows}
              columnDefs={columnDefs}
              loading={loadingList}
              pagination
              toolbar={{
                search: true,
                searchPlaceholder: 'Search…',
                pdfDocumentTitle: 'Exam Group',
              }}
              toolbarTrailing={
                <Button type="button" className="h-[30px] px-3 text-[12px]" onClick={openCreate}>
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add Exam Group
                </Button>
              }
            />
          </div>
        </div>
      )}

      <FormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit exam group' : 'Add exam group'}
        onSubmit={onSubmitModal}
        isSubmitting={saving}
        size="xl"
        titleClassName="text-primary"
        showCloseButton={false}
        showHeaderDivider
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Exam group code</Label>
            <Input
              value={form.examGroupCode}
              onChange={(e) => setForm((f) => ({ ...f, examGroupCode: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-1">
            <Label>Exam group name</Label>
            <Input
              value={form.examGroupName}
              onChange={(e) => setForm((f) => ({ ...f, examGroupName: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-1">
            <Label>Academic year</Label>
            <Select
              options={academicYearOptions}
              value={form.academicYearId}
              onChange={(v) => setForm((f) => ({ ...f, academicYearId: v }))}
              placeholder="Select academic year"
              disabled={academicYearOptions.length === 0}
            />
          </div>
          <div className="space-y-1">
            <Label>Exam month year</Label>
            <Input
              value={form.examMonthYr}
              onChange={(e) => setForm((f) => ({ ...f, examMonthYr: e.target.value }))}
              placeholder="e.g. Mar, 2026"
            />
          </div>
        </div>
        <ActiveStatusField
          isActive={form.isActive}
          reason={form.reason}
          onActiveChange={(v) => setForm((f) => ({ ...f, isActive: v === true }))}
          onReasonChange={(v) => setForm((f) => ({ ...f, reason: v }))}
        />
      </FormModal>
    </PageContainer>
  )
}
