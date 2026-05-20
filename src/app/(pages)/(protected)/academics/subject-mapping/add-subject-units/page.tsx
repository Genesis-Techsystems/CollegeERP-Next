'use client'

import { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { ChevronDown, Pencil } from 'lucide-react'
import { DataTable } from '@/common/components/table'
import { StatusBadge } from '@/common/components/data-display'
import { FormField } from '@/common/components/forms'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { PageContainer, PageHeader } from '@/components/layout'
import { toastError, toastSuccess } from '@/lib/toast'
import { cn } from '@/lib/utils'
import {
  listSubjectUnits,
  resolveSubjectRegulationForAssignUnits,
  saveSubjectUnit,
  type ListSubjectUnitsParams,
} from '@/services'

type AnyRow = Record<string, any>
type LocalUnitRow = AnyRow & { __dirty?: boolean; __rowKey: string }
type LocalTopicRow = {
  topicName: string
  description: string
  noOfPeriods: number | null
  fromPage: string
  toPage: string
  sortOrder: number
  isActive: boolean
  __dirty?: boolean
}

const n = (v: unknown) => Number(v) || 0
const s = (v: unknown) => {
  if (typeof v === 'string') return v
  if (typeof v === 'number') return String(v)
  return ''
}

function subjectUnitPk(row: AnyRow): number {
  return n(
    row.subjectUnitId
    ?? row.subjectunitId
    ?? row.pk_subject_unit_id
    ?? row.pkSubjectUnitId,
  )
}

function makeRowKey(): string {
  return `unit-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`
}

/** Merge server list with row we just saved so the grid updates even when list API is empty/stale */
function mergeRowsAfterSave(server: LocalUnitRow[], saved: AnyRow, editingPk: number | null): LocalUnitRow[] {
  const order = (xs: LocalUnitRow[]) =>
    [...xs].sort((a, b) => n(a.sortOrder ?? a.sort_order) - n(b.sortOrder ?? b.sort_order))
  const keyOf = (r: AnyRow) => `${s(r.unitCode ?? r.unit_code).trim()}|${n(r.sortOrder ?? r.sort_order)}`
  const savedPk = subjectUnitPk(saved)
  const kSaved = keyOf(saved)

  if (editingPk != null && editingPk > 0) {
    let hit = false
    const mapped = server.map((r) => {
      if (subjectUnitPk(r) === editingPk) {
        hit = true
        return { ...r, ...saved, __dirty: false, __rowKey: r.__rowKey ?? makeRowKey() }
      }
      return r
    })
    if (!hit) return order([...server, { ...saved, __dirty: false, __rowKey: makeRowKey() } as LocalUnitRow])
    return order(mapped)
  }

  if (savedPk > 0) {
    let hit = false
    const mapped = server.map((r) => {
      if (subjectUnitPk(r) === savedPk) {
        hit = true
        return { ...r, ...saved, __dirty: false, __rowKey: r.__rowKey ?? makeRowKey() }
      }
      return r
    })
    if (!hit) return order([...server, { ...saved, __dirty: false, __rowKey: makeRowKey() } as LocalUnitRow])
    return order(mapped)
  }

  if (server.some((r) => keyOf(r) === kSaved)) {
    return order(server.map((r) => (keyOf(r) === kSaved ? { ...r, ...saved, __dirty: false, __rowKey: r.__rowKey ?? makeRowKey() } : r)))
  }

  return order([...server, { ...saved, __dirty: false, __rowKey: makeRowKey() } as LocalUnitRow])
}

function directSubjectRegulationIdFromSearch(search: URLSearchParams): number {
  return n(
    search.get('subjectRegulationId')
    ?? search.get('subjectregulationId')
    ?? search.get('sid'),
  )
}

function statusRenderer(p: ICellRendererParams<AnyRow>) {
  return <StatusBadge status={p.data?.isActive !== false} />
}

function makeActionsRenderer(handlers: React.MutableRefObject<{
  onAssignTopics: (row: AnyRow) => void
  onEdit: (row: AnyRow) => void
}>) {
  return (p: ICellRendererParams<AnyRow>) => {
    const row = p.data
    if (!row) return null
    return (
      <div className="inline-flex items-center gap-2 text-xs whitespace-nowrap">
        <button type="button" className="text-blue-700 font-medium hover:underline" onClick={() => handlers.current.onAssignTopics(row)}>
          Assign Topics
        </button>
        <span className="text-muted-foreground">|</span>
        <button
          type="button"
          className="inline-flex items-center justify-center rounded p-0.5 text-blue-700 hover:bg-blue-50"
          onClick={() => handlers.current.onEdit(row)}
          aria-label="Edit unit"
          title="Edit"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </div>
    )
  }
}

export default function AddSubjectUnitsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const directSrId = useMemo(() => directSubjectRegulationIdFromSearch(searchParams), [searchParams])
  const [resolvedSrId, setResolvedSrId] = useState(0)
  const [resolveDone, setResolveDone] = useState(false)

  const subjectRegulationId = directSrId || resolvedSrId

  const listUnitParams = useMemo((): ListSubjectUnitsParams => {
    const sid = n(searchParams.get('subjectId'))
    const regulationIdParam = n(searchParams.get('regulationId'))
    const courseYearIdParam = n(searchParams.get('courseYearId'))
    return {
      subjectId: sid > 0 ? sid : undefined,
      regulationId: regulationIdParam > 0 ? regulationIdParam : undefined,
      courseYearId: courseYearIdParam > 0 ? courseYearIdParam : undefined,
    }
  }, [searchParams])

  const hasUnitListTriple = !!(listUnitParams.courseYearId && listUnitParams.regulationId && listUnitParams.subjectId)

  const canListUnits = useMemo(
    () => resolveDone && hasUnitListTriple,
    [resolveDone, hasUnitListTriple],
  )

  useEffect(() => {
    if (directSrId) {
      setResolvedSrId(0)
      setResolveDone(true)
      return
    }
    const subjectId = n(searchParams.get('subjectId'))
    const regulationId = n(searchParams.get('regulationId'))
    if (!subjectId || !regulationId) {
      setResolvedSrId(0)
      setResolveDone(true)
      return
    }
    setResolveDone(false)
    let cancelled = false
    void resolveSubjectRegulationForAssignUnits({
      subjectId,
      regulationId,
      collegeId: n(searchParams.get('collegeId')),
      academicYearId: n(searchParams.get('academicYearId')),
      courseGroupId: n(searchParams.get('courseGroupId')),
      courseYearId: n(searchParams.get('courseYearId')),
    })
      .then((id) => {
        if (!cancelled) setResolvedSrId(id)
      })
      .finally(() => {
        if (!cancelled) setResolveDone(true)
      })
    return () => {
      cancelled = true
    }
  }, [searchParams, directSrId])

  const titleSuffix = useMemo(() => {
    const ctx = searchParams.get('ctx')?.trim()
    const sub = searchParams.get('sub')?.trim()
    const reg = searchParams.get('reg')?.trim()
    const parts = [ctx, sub, reg].filter(Boolean) as string[]
    return parts.length ? parts.join(' / ') : subjectRegulationId ? `Regulation subject #${subjectRegulationId}` : ''
  }, [searchParams, subjectRegulationId])

  const [rows, setRows] = useState<LocalUnitRow[]>([])
  const [loading, setLoading] = useState(false)
  const [formOpen, setFormOpen] = useState(true)
  const [unitCode, setUnitCode] = useState('')
  const [unitName, setUnitName] = useState('')
  const [description, setDescription] = useState('')
  const [sortOrder, setSortOrder] = useState<string>('1')
  const [isActive, setIsActive] = useState(true)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingRowKey, setEditingRowKey] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [topicsByUnitKey, setTopicsByUnitKey] = useState<Record<number, LocalTopicRow[]>>({})
  const [topicsModalOpen, setTopicsModalOpen] = useState(false)
  const [selectedTopicUnit, setSelectedTopicUnit] = useState<LocalUnitRow | null>(null)
  const [topicsDraft, setTopicsDraft] = useState<LocalTopicRow[]>([])
  const [topicName, setTopicName] = useState('')
  const [topicDescription, setTopicDescription] = useState('')
  const [topicNoOfPeriods, setTopicNoOfPeriods] = useState('')
  const [topicFromPage, setTopicFromPage] = useState('')
  const [topicToPage, setTopicToPage] = useState('')
  const [topicSortOrder, setTopicSortOrder] = useState('1')
  const [topicActive, setTopicActive] = useState(true)

  const actionHandlers = useRef({
    onAssignTopics: (_row: AnyRow) => {},
    onEdit: (_row: AnyRow) => {},
  })

  const loadRows = useCallback(async (): Promise<number> => {
    if (!canListUnits) {
      if (!resolveDone) return 0
      setRows([])
      return 0
    }
    setLoading(true)
    try {
      const list = await listSubjectUnits(listUnitParams)
      const next = (Array.isArray(list) ? list : []).map((r) => ({ ...r, __dirty: false, __rowKey: makeRowKey() }))
      setRows(next)
      return next.length
    } catch {
      setRows([])
      toastError('Failed to load subject units')
      return 0
    } finally {
      setLoading(false)
    }
  }, [canListUnits, listUnitParams, resolveDone])

  useEffect(() => {
    void loadRows()
  }, [loadRows])

  function resetForm(nextSortOrder?: number) {
    setUnitCode('')
    setUnitName('')
    setDescription('')
    setSortOrder(String(nextSortOrder ?? rows.length + 1))
    setIsActive(true)
    setEditingId(null)
    setEditingRowKey(null)
  }

  useEffect(() => {
    if (editingId == null && rows.length && !unitCode && !unitName) {
      setSortOrder(String(rows.length + 1))
    }
  }, [rows.length, editingId, unitCode, unitName])

  function performAddToTable() {
    if (!resolveDone) {
      toastError('Still loading subject regulation. Please wait.')
      return
    }
    if (!subjectRegulationId) {
      toastError('Missing subject regulation')
      return
    }
    const code = unitCode.trim()
    const name = unitName.trim()
    if (!code || !name) {
      toastError('Unit code and unit name are required')
      return
    }
    const sortRaw = String(sortOrder).trim()
    if (sortRaw === '') {
      toastError('Sort order is required')
      return
    }
    const so = Number(sortRaw)
    if (!Number.isFinite(so)) {
      toastError('Sort order must be a valid number')
      return
    }
    const editingPk = editingId != null && editingId > 0 ? editingId : null
    const draft: LocalUnitRow = {
      __rowKey: editingRowKey ?? makeRowKey(),
      subjectRegulationId,
      subjectUnitId: editingPk ?? -Math.abs(Date.now()),
      subjectunitId: editingPk ?? -Math.abs(Date.now()),
      unitCode: code,
      unitName: name,
      description: description.trim(),
      sortOrder: so,
      isActive,
      __dirty: true,
    }

    if (editingRowKey) {
      setRows((prev) => prev.map((r) => (r.__rowKey === editingRowKey ? { ...r, ...draft } : r)))
      toastSuccess('Updated in table. Click Save to persist.')
    } else {
      setRows((prev) => [...prev, draft])
      toastSuccess('Added to table. Click Save to persist.')
    }
    resetForm(rows.length + 1)
  }

  async function persistToDb() {
    if (saving) return
    if (!subjectRegulationId) {
      toastError('Missing subject regulation')
      return
    }
    const dirtyRows = rows.filter((r) => r.__dirty)
    if (dirtyRows.length === 0) {
      toastSuccess('No pending changes')
      return
    }

    setSaving(true)
    try {
      for (const row of dirtyRows) {
        const pk = subjectUnitPk(row)
        // eslint-disable-next-line no-await-in-loop
        await saveSubjectUnit({
          ...row,
          subjectRegulationId,
          subjectUnitId: pk > 0 ? pk : undefined,
          sortOrder: n(row.sortOrder ?? row.sort_order),
          isActive: row.isActive !== false,
        })
      }

      const serverRows = await listSubjectUnits(listUnitParams)
      const merged = (Array.isArray(serverRows) ? serverRows : []).map((r) => ({ ...r, __dirty: false, __rowKey: makeRowKey() }))
      setRows(merged)
      resetForm(merged.length + 1)
      toastSuccess('Saved to database')
    } catch {
      toastError('Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault()
    performAddToTable()
  }

  function resetTopicForm(nextSortOrder?: number) {
    setTopicName('')
    setTopicDescription('')
    setTopicNoOfPeriods('')
    setTopicFromPage('')
    setTopicToPage('')
    setTopicSortOrder(String(nextSortOrder ?? topicsDraft.length + 1))
    setTopicActive(true)
  }

  function addTopicToDraft() {
    const name = topicName.trim()
    if (!name) {
      toastError('Topic name is required')
      return
    }
    const sort = Number(String(topicSortOrder).trim())
    if (!Number.isFinite(sort)) {
      toastError('Sort order is required')
      return
    }
    const periodsRaw = String(topicNoOfPeriods).trim()
    const periods = periodsRaw === '' ? null : Number(periodsRaw)
    if (periodsRaw !== '' && !Number.isFinite(periods)) {
      toastError('No of periods must be a valid number')
      return
    }
    setTopicsDraft((prev) => [
      ...prev,
      {
        topicName: name,
        description: topicDescription.trim(),
        noOfPeriods: periods,
        fromPage: topicFromPage.trim(),
        toPage: topicToPage.trim(),
        sortOrder: sort,
        isActive: topicActive,
        __dirty: true,
      },
    ])
    resetTopicForm(topicsDraft.length + 2)
  }

  async function performSave() {
    await persistToDb()
  }

  actionHandlers.current.onAssignTopics = (row: AnyRow) => {
    const unit = row as LocalUnitRow
    const key = subjectUnitPk(unit)
    setSelectedTopicUnit(unit)
    setTopicsDraft([...(topicsByUnitKey[key] ?? [])])
    setTopicsModalOpen(true)
    resetTopicForm((topicsByUnitKey[key]?.length ?? 0) + 1)
  }
  actionHandlers.current.onEdit = (row: AnyRow) => {
    const id = subjectUnitPk(row)
    setEditingId(id || null)
    setEditingRowKey((row as LocalUnitRow).__rowKey ?? null)
    setUnitCode(s(row.unitCode ?? row.unit_code))
    setUnitName(s(row.unitName ?? row.unit_name))
    setDescription(s(row.description ?? row.unitDescription))
    setSortOrder(String(n(row.sortOrder ?? row.sort_order ?? 1)))
    setIsActive(row.isActive !== false)
    setFormOpen(true)
  }
  const columnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      { headerName: 'Sl.No', valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1, minWidth: 72, maxWidth: 80, flex: 0 },
      { field: 'unitCode', headerName: 'Unit Code', minWidth: 110, valueGetter: (p) => s(p.data?.unitCode ?? p.data?.unit_code) },
      { field: 'unitName', headerName: 'Unit Name', minWidth: 160, flex: 1, valueGetter: (p) => s(p.data?.unitName ?? p.data?.unit_name) },
      { field: 'description', headerName: 'Description', minWidth: 160, flex: 1.2 },
      { field: 'sortOrder', headerName: 'sortOrder', minWidth: 100, valueGetter: (p) => n(p.data?.sortOrder ?? p.data?.sort_order) },
      { headerName: 'Status', minWidth: 100, cellRenderer: statusRenderer },
      { headerName: 'Actions', minWidth: 160, flex: 0, cellRenderer: makeActionsRenderer(actionHandlers) },
    ],
    [],
  )

  const topicColumnDefs = useMemo<ColDef<LocalTopicRow>[]>(
    () => [
      { headerName: 'No.', valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1, minWidth: 60, maxWidth: 70, flex: 0 },
      { field: 'topicName', headerName: 'Topic Name', minWidth: 180, flex: 1.2 },
      { field: 'noOfPeriods', headerName: 'No of Periods', minWidth: 110, flex: 0.8, valueGetter: (p) => s(p.data?.noOfPeriods ?? '') },
      { field: 'fromPage', headerName: 'From Page', minWidth: 100, flex: 0.8 },
      { field: 'toPage', headerName: 'To Page', minWidth: 90, flex: 0.8 },
      { field: 'sortOrder', headerName: 'sortOrder', minWidth: 100, flex: 0.8 },
      { headerName: 'Status', minWidth: 90, flex: 0.8, cellRenderer: (p: ICellRendererParams<LocalTopicRow>) => <StatusBadge status={p.data?.isActive ?? false} /> },
      {
        headerName: 'Actions',
        minWidth: 90,
        flex: 0.8,
        cellRenderer: (p: ICellRendererParams<LocalTopicRow>) => (
          <button
            type="button"
            className="text-red-600 font-semibold hover:underline"
            onClick={() => {
              const idx = p.node?.rowIndex ?? -1
              if (idx < 0) return
              setTopicsDraft((prev) => prev.filter((_, i) => i !== idx))
            }}
          >
            X
          </button>
        ),
      },
    ],
    [],
  )

  if (!resolveDone && !directSrId) {
    return (
      <PageContainer>
        <PageHeader title="Subjects Units" />
        <div className="app-card p-6 text-sm text-muted-foreground">Resolving subject regulation…</div>
      </PageContainer>
    )
  }

  if (resolveDone && !subjectRegulationId) {
    return (
      <PageContainer>
        <PageHeader title="Subjects Units" />
        <div className="app-card p-6 text-sm text-muted-foreground">
          <p className="mb-4">
            No subject regulation could be resolved. Open this page from <strong>Subject Unit Topics</strong> via <strong>Assign Units</strong>,
            or use <code className="text-xs">?subjectRegulationId=…</code> (or <code className="text-xs">?subjectId=…&amp;regulationId=…</code> with college / academic year / group / course year).
          </p>
          <Button variant="secondary" asChild>
            <Link href="/academics/subject-unit-topics">Back to Subject Unit Topics</Link>
          </Button>
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <PageHeader title={titleSuffix ? `Subjects Units (${titleSuffix})` : 'Subjects Units'} />

      <div className="app-card p-0 overflow-hidden">
        <button
          type="button"
          className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left font-semibold text-primary border-b hover:bg-muted/40"
          onClick={() => setFormOpen((o) => !o)}
        >
          <span>Add Subject Units</span>
          <ChevronDown className={cn('h-4 w-4 shrink-0 transition-transform', formOpen && 'rotate-180')} />
        </button>

        {formOpen && (
          <form
            id="add-subject-units-form"
            onSubmit={handleFormSubmit}
            className="p-4 grid grid-cols-1 gap-x-4 gap-y-3 border-b bg-muted/20 md:grid-cols-12 md:items-end [&_label]:text-[11px]"
          >
            <div className="md:col-span-2">
              <FormField label="Unit Code" required htmlFor="unitCode">
                <Input id="unitCode" value={unitCode} onChange={(e) => setUnitCode(e.target.value)} autoComplete="off" />
              </FormField>
            </div>
            <div className="md:col-span-3">
              <FormField label="Unit Name" required htmlFor="unitName">
                <Input id="unitName" value={unitName} onChange={(e) => setUnitName(e.target.value)} autoComplete="off" />
              </FormField>
            </div>
            <div className="md:col-span-3">
              <FormField label="Description" htmlFor="description">
                <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} autoComplete="off" />
              </FormField>
            </div>
            <div className="md:col-span-2">
              <FormField label="Sort Order" required htmlFor="sortOrder">
                <Input id="sortOrder" type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} min={0} />
              </FormField>
            </div>
            <div className="md:col-span-2 flex flex-row flex-wrap items-center justify-end gap-x-4 gap-y-2 md:justify-end">
              <label htmlFor="unit-active" className="flex cursor-pointer select-none items-center gap-2 text-sm text-foreground">
                <Checkbox id="unit-active" checked={isActive} onCheckedChange={(v) => setIsActive(v === true)} />
                Active
              </label>
              <div className="ml-auto flex items-center gap-2">
                {editingId != null && (
                  <Button type="button" variant="outline" size="sm" className="h-9 shrink-0" onClick={() => resetForm()}>
                    Cancel edit
                  </Button>
                )}
                <Button
                  type="submit"
                  form="add-subject-units-form"
                  size="sm"
                  className="h-9 min-w-[4.25rem] shrink-0"
                  disabled={saving || !subjectRegulationId || !resolveDone}
                >
                  {editingId != null ? 'Update' : 'Add'}
                </Button>
              </div>
            </div>
          </form>
        )}

        <div className="p-2">
          <DataTable
            rowData={rows}
            columnDefs={columnDefs}
            loading={loading}
            toolbar={{ search: true, searchPlaceholder: 'Search units' }}
            pagination
            paginationPageSize={15}
          />
        </div>

        <div className="px-4 py-3 border-t flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => router.back()}>
            Back
          </Button>
          <Button
            type="button"
            onClick={() => void performSave()}
            disabled={saving || rows.every((r) => !r.__dirty)}
          >
            Save
          </Button>
        </div>
      </div>

      <Dialog open={topicsModalOpen} onOpenChange={setTopicsModalOpen}>
        <DialogContent className="max-w-[920px] p-0 overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Assign Topics</DialogTitle>
          </DialogHeader>
          <div className="app-card border-0 rounded-none shadow-none text-[11px]">
            <div className="px-3 py-2 border-b flex items-center justify-between">
              <h3 className="text-base font-semibold text-primary">Assign Topics</h3>
              <div className="text-base font-semibold">
                Unit Name : <span className="font-semibold">{s(selectedTopicUnit?.unitName ?? selectedTopicUnit?.unit_name)}</span>
              </div>
            </div>
            <div className="p-3">
              <div className="rounded-md border p-3 bg-muted/20">
                <h4 className="text-base font-semibold text-primary mb-1.5">Add Topic</h4>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end [&_label]:text-[11px]">
                  <div className="md:col-span-5">
                    <FormField label="Topic Name" required htmlFor="topicName">
                      <Input id="topicName" className="h-8 text-[11px]" value={topicName} onChange={(e) => setTopicName(e.target.value)} />
                    </FormField>
                  </div>
                  <div className="md:col-span-4">
                    <FormField label="Description" htmlFor="topicDescription">
                      <Input id="topicDescription" className="h-8 text-[11px]" value={topicDescription} onChange={(e) => setTopicDescription(e.target.value)} />
                    </FormField>
                  </div>
                  <div className="md:col-span-3">
                    <FormField label="No of Periods" htmlFor="topicNoOfPeriods">
                      <Input id="topicNoOfPeriods" className="h-8 text-[11px]" type="number" value={topicNoOfPeriods} onChange={(e) => setTopicNoOfPeriods(e.target.value)} min={0} />
                    </FormField>
                  </div>
                  <div className="md:col-span-2">
                    <FormField label="From Page" htmlFor="topicFromPage">
                      <Input id="topicFromPage" className="h-8 text-[11px]" value={topicFromPage} onChange={(e) => setTopicFromPage(e.target.value)} />
                    </FormField>
                  </div>
                  <div className="md:col-span-2">
                    <FormField label="To Page" htmlFor="topicToPage">
                      <Input id="topicToPage" className="h-8 text-[11px]" value={topicToPage} onChange={(e) => setTopicToPage(e.target.value)} />
                    </FormField>
                  </div>
                  <div className="md:col-span-2">
                    <FormField label="Sort Order" required htmlFor="topicSortOrder">
                      <Input id="topicSortOrder" className="h-8 text-[11px]" type="number" value={topicSortOrder} onChange={(e) => setTopicSortOrder(e.target.value)} min={0} />
                    </FormField>
                  </div>
                  <div className="md:col-span-3 flex items-center justify-end gap-2.5">
                    <label htmlFor="topicActive" className="flex items-center gap-2 text-[11px] cursor-pointer">
                      <Checkbox id="topicActive" checked={topicActive} onCheckedChange={(v) => setTopicActive(v === true)} />
                      Active
                    </label>
                    <Button type="button" size="sm" className="ml-auto h-8 text-[11px] px-3" onClick={addTopicToDraft}>Add</Button>
                  </div>
                </div>
              </div>

              <div className="mt-2.5 text-xs">
                <DataTable rowData={topicsDraft} columnDefs={topicColumnDefs} pagination paginationPageSize={10} />
              </div>
              <div className="mt-3 flex justify-end gap-2.5">
                <Button type="button" size="sm" className="h-8 text-[11px] px-3" variant="outline" onClick={() => setTopicsModalOpen(false)}>Close</Button>
                <Button
                  type="button"
                  size="sm"
                  className="h-8 text-[11px] px-3"
                  onClick={() => {
                    const key = subjectUnitPk(selectedTopicUnit ?? {})
                    if (!key) {
                      toastError('Please save unit first')
                      return
                    }
                    setTopicsByUnitKey((prev) => ({ ...prev, [key]: topicsDraft }))
                    setTopicsModalOpen(false)
                    toastSuccess('Topics saved in this screen')
                  }}
                >
                  Save
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}
