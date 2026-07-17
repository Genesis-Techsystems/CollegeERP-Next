'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { Eye, Pencil, X } from 'lucide-react'
import { DataTable } from '@/common/components/table'
import { StatusBadge } from '@/common/components/data-display'
import { FormField } from '@/common/components/forms'
import { FilteredListPage, PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { toastError, toastInfo, toastSuccess } from '@/lib/toast'
import { listSubjectUnits, saveSubjectUnitsBatch } from '@/services'

type AnyRow = Record<string, any>
type TopicRow = AnyRow & {
  topicName: string
  topicDescription?: string
  noOfPeriods?: number | null
  fromPage?: string | number
  toPage?: string | number
  sortOrder?: number
  isActive?: boolean
  subjectUnitTopicId?: number
  subBookId?: number | null
  collegeId?: number
  subjectRegulationId?: number
  __localKey?: string
}

type UnitRow = AnyRow & {
  __rowKey: string
  subjectUnitTopicsDTOs?: TopicRow[]
}

const n = (v: unknown) => Number(v) || 0
const s = (v: unknown) => {
  if (typeof v === 'string') return v
  if (typeof v === 'number') return String(v)
  return ''
}

function subjectUnitsIdOf(row: AnyRow): number {
  return n(row.subjectUnitsId ?? row.subjectUnitId ?? row.subjectunitId ?? row.pk_subject_unit_id)
}

function makeRowKey(): string {
  return `u-${Date.now()}-${Math.floor(Math.random() * 1e6)}`
}

function sortTopics(topics: TopicRow[]): TopicRow[] {
  return [...topics].sort((a, b) => {
    if (a.sortOrder == null && b.sortOrder == null) return 0
    if (a.sortOrder == null) return 1
    if (b.sortOrder == null) return -1
    return Number(a.sortOrder) - Number(b.sortOrder)
  })
}

/**
 * Angular add-units-modal addTopic() topic object shape.
 * Keep existing API fields (e.g. subjectUnitTopicId) for updates / soft-deletes.
 */
function toAngularTopicPayload(topic: TopicRow, fallbackCollegeId: number, fallbackSubjectRegulationId: number): AnyRow {
  const { __localKey: _lk, ...rest } = topic
  const out: AnyRow = { ...rest }

  out.topicName = topic.topicName
  out.topicDescription = topic.topicDescription ?? ''
  out.toPage = topic.toPage ?? ''
  out.fromPage = topic.fromPage ?? ''
  out.noOfPeriods = topic.noOfPeriods == null ? 0 : Number(topic.noOfPeriods)
  out.sortOrder = topic.sortOrder
  out.isActive = topic.isActive !== false
  out.subBookId = topic.subBookId ?? null
  out.collegeId = n(topic.collegeId) || fallbackCollegeId
  out.subjectRegulationId = n(topic.subjectRegulationId) || fallbackSubjectRegulationId || topic.subjectRegulationId

  if (n(topic.subjectUnitTopicId)) {
    out.subjectUnitTopicId = n(topic.subjectUnitTopicId)
  }

  return out
}

/**
 * Angular addSubjectUnits() posts `this.units` as-is to POST subjectunits.
 * Strip React-only keys; keep domain fields from the list API.
 */
function toAngularSubjectUnitsPayload(
  units: UnitRow[],
  fallback: { collegeId: number; subjectId: number; courseYearId: number; regulationId: number },
): AnyRow[] {
  return units.map((u) => {
    const { __rowKey: _rk, description: _desc, ...rest } = u
    const topicsSource = Array.isArray(rest.subjectUnitTopicsDTOs)
      ? rest.subjectUnitTopicsDTOs
      : Array.isArray(rest.subjectUnitTopics)
        ? rest.subjectUnitTopics
        : []

    const collegeId = n(rest.collegeId) || fallback.collegeId
    const subjectRegulationId = n(
      rest.subjectRegulationId
      ?? rest.subjectregulationId
      ?? rest.subjectregulation?.subjectRegulationId
      ?? rest.Subjectregulation?.subjectRegulationId,
    )

    const payload: AnyRow = {
      ...rest,
      unitCode: rest.unitCode,
      unitName: rest.unitName,
      unitDescription: rest.unitDescription ?? '',
      isActive: rest.isActive !== false,
      collegeId,
      subjectId: n(rest.subjectId) || fallback.subjectId,
      sortOrder: rest.sortOrder,
      courseYearId: n(rest.courseYearId) || fallback.courseYearId,
      regulationId: n(rest.regulationId) || fallback.regulationId,
      // Angular openDialog sets item.subject = params.subjectName before save
      subject: rest.subject,
      // Angular modal Save assigns subjectUnitTopicsDTOs only
      subjectUnitTopicsDTOs: topicsSource.map((t) =>
        toAngularTopicPayload(t as TopicRow, collegeId, subjectRegulationId),
      ),
    }

    delete payload.__rowKey
    delete payload.description

    const pk = subjectUnitsIdOf(rest)
    if (pk) {
      payload.subjectUnitsId = pk
    }

    return payload
  })
}

export default function AddSubjectUnitsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const collegeId = n(searchParams.get('collegeId'))
  const courseId = n(searchParams.get('courseId'))
  const courseGroupId = n(searchParams.get('courseGroupId'))
  const courseYearId = n(searchParams.get('courseYearId'))
  const regulationId = n(searchParams.get('regulationId'))
  const subjectId = n(searchParams.get('subjectId'))

  const collegeName = s(searchParams.get('collegeName'))
  const courseCode = s(searchParams.get('courseCode'))
  const courseGroupName = s(searchParams.get('courseGroupName') || searchParams.get('groupName'))
  const courseYearName = s(searchParams.get('courseYearName'))
  const subjectName = s(searchParams.get('subjectName'))
  const regulationCode = s(searchParams.get('regulationCode'))

  const contextTitle = useMemo(() => {
    const parts = [collegeName, courseCode, courseGroupName, courseYearName, subjectName, regulationCode].filter(Boolean)
    return parts.length ? parts.join(' / ') : ''
  }, [collegeName, courseCode, courseGroupName, courseYearName, subjectName, regulationCode])

  const backHref = useMemo(() => {
    const qs = new URLSearchParams()
    if (collegeId) qs.set('collegeId', String(collegeId))
    if (courseId) qs.set('courseId', String(courseId))
    if (courseGroupId) qs.set('courseGroupId', String(courseGroupId))
    if (courseYearId) qs.set('courseYearId', String(courseYearId))
    if (regulationId) qs.set('regulationId', String(regulationId))
    const q = qs.toString()
    return q ? `/academics/subject-unit-topics?${q}` : '/academics/subject-unit-topics'
  }, [collegeId, courseId, courseGroupId, courseYearId, regulationId])

  const canLoad = !!(courseYearId && regulationId && subjectId)

  const [units, setUnits] = useState<UnitRow[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const [unitCode, setUnitCode] = useState('')
  const [unitName, setUnitName] = useState('')
  const [unitDescription, setUnitDescription] = useState('')
  const [sortOrder, setSortOrder] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [editingUnitsId, setEditingUnitsId] = useState<number | null>(null)
  const [editingRowKey, setEditingRowKey] = useState<string | null>(null)

  const [topicsOpen, setTopicsOpen] = useState(false)
  const [viewTopicsOpen, setViewTopicsOpen] = useState(false)
  const [topicsUnitKey, setTopicsUnitKey] = useState<string | null>(null)
  const [topicsUnitName, setTopicsUnitName] = useState('')
  const [topicsCollegeId, setTopicsCollegeId] = useState(0)
  const [topicsSubjectRegulationId, setTopicsSubjectRegulationId] = useState(0)
  const [topicsDraft, setTopicsDraft] = useState<TopicRow[]>([])
  const [inactiveTopics, setInactiveTopics] = useState<TopicRow[]>([])
  const [topicName, setTopicName] = useState('')
  const [topicDescription, setTopicDescription] = useState('')
  const [topicNoOfPeriods, setTopicNoOfPeriods] = useState('')
  const [topicFromPage, setTopicFromPage] = useState('')
  const [topicToPage, setTopicToPage] = useState('')
  const [topicSortOrder, setTopicSortOrder] = useState('')
  const [topicNoOfPeriodsError, setTopicNoOfPeriodsError] = useState('')

  const loadUnits = useCallback(async () => {
    if (!canLoad) {
      setUnits([])
      return
    }
    setLoading(true)
    try {
      const list = await listSubjectUnits({ courseYearId, regulationId, subjectId })
      setUnits(
        list.map((r) => ({
          ...r,
          __rowKey: makeRowKey(),
          subjectUnitTopicsDTOs: Array.isArray(r.subjectUnitTopicsDTOs)
            ? sortTopics(r.subjectUnitTopicsDTOs as TopicRow[])
            : Array.isArray(r.subjectUnitTopics)
              ? sortTopics(r.subjectUnitTopics as TopicRow[])
              : [],
        })),
      )
    } catch {
      setUnits([])
      toastError('Failed to load subject units')
    } finally {
      setLoading(false)
    }
  }, [canLoad, courseYearId, regulationId, subjectId])

  useEffect(() => {
    void loadUnits()
  }, [loadUnits])

  function resetForm() {
    setUnitCode('')
    setUnitName('')
    setUnitDescription('')
    setSortOrder('')
    setIsActive(true)
    setEditingUnitsId(null)
    setEditingRowKey(null)
  }

  function addDetails() {
    const code = unitCode.trim()
    const name = unitName.trim()
    if (!code || !name) {
      toastError('Unit code and unit name are required')
      return
    }
    if (String(sortOrder).trim() === '') {
      toastError('Sort order is required')
      return
    }

    if (editingUnitsId || editingRowKey) {
      setUnits((prev) =>
        prev.map((u) => {
          const match = editingRowKey
            ? u.__rowKey === editingRowKey
            : subjectUnitsIdOf(u) === editingUnitsId
          if (!match) return u
          return {
            ...u,
            unitCode: code,
            unitName: name,
            unitDescription: unitDescription.trim(),
            description: unitDescription.trim(),
            sortOrder: Number(sortOrder) || 0,
            isActive,
          }
        }),
      )
    } else {
      setUnits((prev) => [
        ...prev,
        {
          __rowKey: makeRowKey(),
          unitCode: code,
          unitName: name,
          unitDescription: unitDescription.trim(),
          description: unitDescription.trim(),
          isActive,
          collegeId,
          subjectId,
          sortOrder: Number(sortOrder) || 0,
          courseYearId,
          regulationId,
          subjectUnitTopics: [],
          subjectUnitTopicsDTOs: [],
        },
      ])
    }
    resetForm()
  }

  function deleteUnit(row: UnitRow, index: number) {
    if (subjectUnitsIdOf(row)) return
    setUnits((prev) => prev.filter((_, i) => i !== index))
  }

  function editUnit(row: UnitRow) {
    setEditingUnitsId(subjectUnitsIdOf(row) || null)
    setEditingRowKey(row.__rowKey)
    setUnitCode(s(row.unitCode))
    setUnitName(s(row.unitName))
    setUnitDescription(s(row.unitDescription ?? row.description))
    setSortOrder(String(row.sortOrder ?? ''))
    setIsActive(row.isActive !== false)
  }

  async function addSubjectUnits(overrideUnits?: UnitRow[]) {
    const payload = overrideUnits ?? units
    if (payload.length === 0) {
      toastInfo('No units to save')
      return
    }
    setSaving(true)
    try {
      // Angular: crudService.add('subjectunits', this.units)
      const body = toAngularSubjectUnitsPayload(payload, {
        collegeId,
        subjectId,
        courseYearId,
        regulationId,
      })
      await saveSubjectUnitsBatch(body)
      toastSuccess('Subject units saved successfully')
      await loadUnits()
    } catch (err) {
      toastError(err, 'Failed to save subject units')
    } finally {
      setSaving(false)
    }
  }

  function resetTopicForm() {
    setTopicName('')
    setTopicDescription('')
    setTopicNoOfPeriods('')
    setTopicFromPage('')
    setTopicToPage('')
    // Angular addTopic does not clear sortOrder
    setTopicNoOfPeriodsError('')
  }

  function openTopics(row: UnitRow) {
    if (!subjectUnitsIdOf(row)) {
      toastInfo('Save the unit first, then assign topics.')
      return
    }
    // Angular openDialog: item.subject = params.subjectName
    setTopicsUnitKey(row.__rowKey)
    setTopicsUnitName(subjectName || s(row.unitName))
    setTopicsCollegeId(n(row.collegeId) || collegeId)
    setTopicsSubjectRegulationId(
      n(
        row.subjectRegulationId
        ?? row.subjectregulationId
        ?? row.subjectregulation?.subjectRegulationId
        ?? row.Subjectregulation?.subjectRegulationId,
      ),
    )
    // Angular: this.topics = this.data.subjectUnitTopicsDTOs (all rows)
    const existing = Array.isArray(row.subjectUnitTopicsDTOs)
      ? [...row.subjectUnitTopicsDTOs]
      : Array.isArray(row.subjectUnitTopics)
        ? [...row.subjectUnitTopics]
        : []
    setTopicsDraft(sortTopics(existing))
    setInactiveTopics([])
    resetTopicForm()
    setTopicSortOrder('')
    setTopicsOpen(true)
  }

  function viewTopics(row: UnitRow) {
    const active = sortTopics([...(row.subjectUnitTopicsDTOs ?? [])].filter((t) => t.isActive !== false))
    setTopicsDraft(active)
    setTopicsUnitName(subjectName || s(row.unitName))
    setViewTopicsOpen(true)
  }

  /** Angular addTopic — fields + payload match add-units-modal.component.ts */
  function addTopic() {
    const name = topicName.trim()
    if (!name) {
      toastError('Topic name is required')
      return
    }
    const periodsRaw = topicNoOfPeriods.trim()
    // Angular Validators.pattern(/^\d+\.\d+$/) when value present
    if (periodsRaw !== '' && !/^\d+\.\d+$/.test(periodsRaw)) {
      setTopicNoOfPeriodsError('Enter Decimal Number')
      return
    }
    setTopicNoOfPeriodsError('')

    const fromRaw = topicFromPage.trim()
    const toRaw = topicToPage.trim()
    const sortRaw = topicSortOrder.trim()

    setTopicsDraft((prev) =>
      sortTopics([
        ...prev,
        {
          __localKey: makeRowKey(),
          topicName: name,
          topicDescription: topicDescription.trim(),
          // Angular matInput type="number" → numeric when filled
          toPage: toRaw === '' ? '' : Number(toRaw),
          fromPage: fromRaw === '' ? '' : Number(fromRaw),
          // Angular: noOfPeriods: +this.topicsForm.value.noOfPeriods
          noOfPeriods: periodsRaw === '' ? 0 : Number(periodsRaw),
          // Angular leaves sortOrder as form value (number input without type still string-ish)
          sortOrder: sortRaw === '' ? undefined : Number(sortRaw),
          isActive: true,
          subBookId: null,
          collegeId: topicsCollegeId || collegeId,
          subjectRegulationId: topicsSubjectRegulationId || undefined,
        },
      ]),
    )
    resetTopicForm()
  }

  /** Angular deleteTopic — soft-deactivate persisted topics into inActiveTopics */
  function deleteTopic(item: TopicRow) {
    setTopicsDraft((prev) => {
      const index = prev.findIndex(
        (t) =>
          t === item
          || (t.__localKey && t.__localKey === item.__localKey)
          || (n(t.subjectUnitTopicId) > 0 && n(t.subjectUnitTopicId) === n(item.subjectUnitTopicId)),
      )
      if (index < 0) return prev
      const row = prev[index]
      if (n(row.subjectUnitTopicId)) {
        setInactiveTopics((inactive) => [...inactive, { ...row, isActive: false }])
      }
      return sortTopics(prev.filter((_, i) => i !== index))
    })
  }

  /**
   * Angular submit() → close modal with topics (+ inactive), then parent
   * sets item.subjectUnitTopicsDTOs and calls addSubjectUnits() → POST subjectunits.
   */
  async function submitTopics() {
    if (!topicsUnitKey) return
    const merged = [...topicsDraft, ...inactiveTopics]
    const nextUnits = units.map((u) =>
      u.__rowKey === topicsUnitKey
        ? {
            ...u,
            // Angular openDialog: item.subject = params.subjectName (stays on unit in POST body)
            subject: subjectName,
            // Angular only assigns subjectUnitTopicsDTOs
            subjectUnitTopicsDTOs: merged,
          }
        : u,
    )
    setUnits(nextUnits)
    setTopicsOpen(false)
    await addSubjectUnits(nextUnits)
  }

  const columnDefs = useMemo<ColDef<UnitRow>[]>(
    () => [
      {
        headerName: 'SI.No',
        valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1,
        width: 70,
        flex: 0,
      },
      { field: 'unitCode', headerName: 'Unit Code', minWidth: 110 },
      { field: 'unitName', headerName: 'Unit Name', minWidth: 160, flex: 1 },
      {
        headerName: 'Description',
        minWidth: 160,
        flex: 1,
        valueGetter: (p) => s(p.data?.unitDescription ?? p.data?.description),
      },
      { field: 'sortOrder', headerName: 'sortOrder', minWidth: 100 },
      {
        headerName: 'Status',
        minWidth: 100,
        cellRenderer: (p: ICellRendererParams<UnitRow>) => (
          <StatusBadge status={p.data?.isActive !== false} />
        ),
      },
      {
        headerName: 'Actions',
        minWidth: 220,
        flex: 0,
        cellRenderer: (p: ICellRendererParams<UnitRow>) => {
          const row = p.data
          if (!row) return null
          const savedId = subjectUnitsIdOf(row)
          const idx = p.node?.rowIndex ?? -1
          return (
            <div className="inline-flex items-center gap-1.5 text-xs h-full whitespace-nowrap">
              {savedId > 0 ? (
                <>
                  <button type="button" className="text-blue-700 font-medium hover:underline" onClick={() => openTopics(row)}>
                    Assign Topics
                  </button>
                  <span className="text-muted-foreground">|</span>
                  <button type="button" className="p-0.5 text-blue-700" title="Edit Unit" onClick={() => editUnit(row)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <span className="text-muted-foreground">|</span>
                  <button type="button" className="p-0.5 text-blue-700" title="View Topics" onClick={() => viewTopics(row)}>
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="p-0.5 text-red-600"
                  title="Remove"
                  onClick={() => deleteUnit(row, idx)}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )
        },
      },
    ],
    [units],
  )

  const topicColumnDefs = useMemo<ColDef<TopicRow>[]>(
    () => [
      { headerName: 'No.', valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1, width: 60, flex: 0 },
      { field: 'topicName', headerName: 'Topic Name', minWidth: 180, flex: 1.2 },
      {
        field: 'noOfPeriods',
        headerName: 'No of Periods',
        minWidth: 110,
        valueGetter: (p) => s(p.data?.noOfPeriods ?? ''),
      },
      { field: 'fromPage', headerName: 'From Page', minWidth: 100 },
      { field: 'toPage', headerName: 'To Page', minWidth: 90 },
      { field: 'sortOrder', headerName: 'sortOrder', minWidth: 90 },
      {
        headerName: 'Status',
        minWidth: 90,
        cellRenderer: (p: ICellRendererParams<TopicRow>) => (
          <StatusBadge status={p.data?.isActive !== false} />
        ),
      },
      {
        headerName: 'Actions',
        width: 80,
        flex: 0,
        cellRenderer: (p: ICellRendererParams<TopicRow>) => (
          <button
            type="button"
            className="text-red-600 font-semibold"
            onClick={() => {
              if (p.data) deleteTopic(p.data)
            }}
          >
            X
          </button>
        ),
      },
    ],
    [],
  )

  const viewTopicColumnDefs = useMemo<ColDef<TopicRow>[]>(
    () => [
      { headerName: 'No.', valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1, width: 60, flex: 0 },
      { field: 'topicName', headerName: 'Topic Name', minWidth: 160, flex: 1 },
      {
        headerName: 'Description',
        minWidth: 140,
        valueGetter: (p) => s(p.data?.topicDescription ?? p.data?.description),
      },
      { field: 'noOfPeriods', headerName: 'No of Periods', minWidth: 100 },
      { field: 'fromPage', headerName: 'From Page', minWidth: 90 },
      { field: 'toPage', headerName: 'To Page', minWidth: 90 },
      { field: 'sortOrder', headerName: 'sortOrder', minWidth: 90 },
    ],
    [],
  )

  if (!canLoad) {
    return (
      <PageContainer className="space-y-4">
        <div className="app-card p-6 text-sm text-muted-foreground">
          <p className="mb-4">
            Open this page from <strong>Subject Unit Topics</strong> via <strong>Assign Units</strong>.
          </p>
          <Button variant="secondary" asChild>
            <Link href="/academics/subject-unit-topics">Back to Subject Unit Topics</Link>
          </Button>
        </div>
      </PageContainer>
    )
  }

  return (
    <>
      <FilteredListPage
        title={contextTitle ? `Subjects Units (${contextTitle})` : 'Subjects Units'}
        notice={contextTitle ? (
          <div className="px-1 text-[13px] font-semibold text-blue-700">
            Subjects Units ({contextTitle})
          </div>
        ) : undefined}
        filters={(
          <div className="grid grid-cols-1 gap-3 md:grid-cols-12 md:items-end">
            <div className="md:col-span-2">
              <FormField label="Unit Code" required htmlFor="unitCode">
                <Input id="unitCode" value={unitCode} onChange={(e) => setUnitCode(e.target.value)} />
              </FormField>
            </div>
            <div className="md:col-span-3">
              <FormField label="Unit Name" required htmlFor="unitName">
                <Input id="unitName" value={unitName} onChange={(e) => setUnitName(e.target.value)} />
              </FormField>
            </div>
            <div className="md:col-span-3">
              <FormField label="Description" htmlFor="unitDescription">
                <Input id="unitDescription" value={unitDescription} onChange={(e) => setUnitDescription(e.target.value)} />
              </FormField>
            </div>
            <div className="md:col-span-2">
              <FormField label="Sort Order" required htmlFor="sortOrder">
                <Input id="sortOrder" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
              </FormField>
            </div>
            <div className="md:col-span-2 flex items-center justify-end gap-3">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox checked={isActive} onCheckedChange={(v) => setIsActive(v === true)} />
                Active
              </label>
              <Button type="button" size="sm" onClick={addDetails}>
                {editingUnitsId || editingRowKey ? 'Update' : 'Add'}
              </Button>
            </div>
          </div>
        )}
        filtersCollapsible
        filtersDefaultOpen
        rowData={units}
        columnDefs={columnDefs}
        loading={loading}
        toolbar={{
          search: true,
          searchPlaceholder: 'Search units',
          columnFilters: true,
          columnPicker: true,
          exportExcel: true,
          exportPdf: true,
        }}
        pagination
        paginationPageSize={10}
        getRowId={(p) => p.data?.__rowKey ?? String(subjectUnitsIdOf(p.data ?? {}))}
      >
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => router.push(backHref)}>
            Back
          </Button>
          {units.length > 0 ? (
            <Button type="button" disabled={saving} onClick={() => { void addSubjectUnits() }}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          ) : null}
        </div>
      </FilteredListPage>

      <Dialog open={topicsOpen} onOpenChange={setTopicsOpen}>
        <DialogContent className="sm:max-w-4xl p-0 overflow-hidden">
          <DialogHeader className="border-b px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2 pr-6">
              <DialogTitle className="text-base text-primary">Assign Topics</DialogTitle>
              {topicsUnitName ? (
                <p className="text-sm text-muted-foreground">
                  Unit Name : <span className="font-medium text-foreground">{topicsUnitName}</span>
                </p>
              ) : null}
            </div>
          </DialogHeader>
          <div className="space-y-3 p-4">
            <div className="rounded-md border border-primary/30 bg-primary/5 p-3 space-y-3">
              <p className="text-sm font-semibold text-primary">Add Topic</p>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-12 md:items-end">
                <div className="md:col-span-4">
                  <FormField label="Topic Name" required htmlFor="topicName">
                    <Input id="topicName" value={topicName} onChange={(e) => setTopicName(e.target.value)} />
                  </FormField>
                </div>
                <div className="md:col-span-4">
                  <FormField label="Description" htmlFor="topicDescription">
                    <Input
                      id="topicDescription"
                      value={topicDescription}
                      onChange={(e) => setTopicDescription(e.target.value)}
                    />
                  </FormField>
                </div>
                <div className="md:col-span-4">
                  <FormField
                    label="No of Periods"
                    htmlFor="topicNoOfPeriods"
                    error={topicNoOfPeriodsError || undefined}
                  >
                    <Input
                      id="topicNoOfPeriods"
                      value={topicNoOfPeriods}
                      placeholder="e.g. 1.5"
                      onChange={(e) => {
                        setTopicNoOfPeriods(e.target.value)
                        if (topicNoOfPeriodsError) setTopicNoOfPeriodsError('')
                      }}
                    />
                  </FormField>
                </div>
                <div className="md:col-span-2">
                  <FormField label="From Page" htmlFor="topicFromPage">
                    <Input
                      id="topicFromPage"
                      type="number"
                      value={topicFromPage}
                      onChange={(e) => setTopicFromPage(e.target.value)}
                    />
                  </FormField>
                </div>
                <div className="md:col-span-2">
                  <FormField label="To Page" htmlFor="topicToPage">
                    <Input
                      id="topicToPage"
                      type="number"
                      value={topicToPage}
                      onChange={(e) => setTopicToPage(e.target.value)}
                    />
                  </FormField>
                </div>
                <div className="md:col-span-2">
                  <FormField label="Sort Order" required htmlFor="topicSortOrder">
                    <Input
                      id="topicSortOrder"
                      type="number"
                      value={topicSortOrder}
                      onChange={(e) => setTopicSortOrder(e.target.value)}
                    />
                  </FormField>
                </div>
                <div className="md:col-span-2 flex justify-end">
                  <Button type="button" size="sm" onClick={addTopic}>
                    Add
                  </Button>
                </div>
              </div>
            </div>
            <DataTable rowData={topicsDraft} columnDefs={topicColumnDefs} pagination={false} toolbar={false} />
          </div>
          <DialogFooter className="px-4 pb-4">
            <Button variant="outline" onClick={() => setTopicsOpen(false)}>Close</Button>
            <Button disabled={saving} onClick={() => { void submitTopics() }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={viewTopicsOpen} onOpenChange={setViewTopicsOpen}>
        <DialogContent className="sm:max-w-3xl p-0 overflow-hidden">
          <DialogHeader className="border-b px-4 py-3">
            <DialogTitle className="text-base text-primary">View Topics</DialogTitle>
          </DialogHeader>
          <div className="p-4">
            <DataTable rowData={topicsDraft} columnDefs={viewTopicColumnDefs} pagination={false} toolbar={false} />
          </div>
          <DialogFooter className="px-4 pb-4">
            <Button variant="outline" onClick={() => setViewTopicsOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
