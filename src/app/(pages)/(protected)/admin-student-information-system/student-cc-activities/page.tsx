'use client'

import { useCallback, useMemo, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { Plus, Pencil } from 'lucide-react'
import { FilteredListPage } from '@/components/layout'
import { Select } from '@/common/components/select'
import { StatusBadge } from '@/common/components/data-display'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { rowIndexGetter } from '@/lib/utils'
import { toastError, toastSuccess } from '@/lib/toast'
import {
  createStudentCcActivity,
  listGeneralDetailsByCode,
  listStudentCcActivities,
  searchStudentsByKeyword,
  updateStudentCcActivity,
} from '@/services'
import { StudentSearchSelect } from '@/common/components/student-search'

type AnyRow = Record<string, any>

const SEARCH_ONLY_TOOLBAR = {
  search: true,
  searchPlaceholder: 'Search activities',
  columnPicker: false,
  exportPdf: false,
  exportExcel: false,
  columnFilters: false,
} as const

const SELECT_CLASS =
  "[&_label]:text-xs [&_label]:font-medium [&_button[role='combobox']]:h-8 [&_button[role='combobox']]:text-[12px]"

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

function parseSelectNumber(v: string | null): number | null {
  if (!v) return null
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : null
}

function statusRenderer(p: ICellRendererParams<AnyRow>) {
  return <StatusBadge status={Boolean(p.data?.isActive)} />
}

function makeActionsRenderer(onEdit: (row: AnyRow) => void) {
  return (p: ICellRendererParams<AnyRow>) => {
    const row = p.data
    if (!row) return null
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={() => void onEdit(row)}
        aria-label="Edit activity"
      >
        <Pencil className="h-3.5 w-3.5" />
      </Button>
    )
  }
}

export default function StudentCcActivitiesPage() {
  const [studentOptionsRows, setStudentOptionsRows] = useState<AnyRow[]>([])
  const [studentId, setStudentId] = useState<number | null>(null)
  const [selectedStudent, setSelectedStudent] = useState<AnyRow | null>(null)

  const [activityRows, setActivityRows] = useState<AnyRow[]>([])

  const [loadingStudentSearch, setLoadingStudentSearch] = useState(false)
  const [loadingActivities, setLoadingActivities] = useState(false)
  const [loadingTypes, setLoadingTypes] = useState(false)
  const [saving, setSaving] = useState(false)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRow, setEditingRow] = useState<AnyRow | null>(null)
  const [activityTypeRows, setActivityTypeRows] = useState<AnyRow[]>([])
  const [ccactivityCatdetId, setCcactivityCatdetId] = useState<number | null>(null)
  const [isActive, setIsActive] = useState(true)
  const [reason, setReason] = useState('active')

  const activityTypeOptions = useMemo(
    () =>
      activityTypeRows.map((row) => ({
        value: String(pickNum(row, ['generalDetailId', 'pk_gd_id', 'gd_id'])),
        label:
          pickText(row, [
            'generalDetailDisplayName',
            'gd_name',
            'general_detail_display_name',
          ]) || 'Activity',
      })),
    [activityTypeRows],
  )

  async function searchStudents(term: string) {
    const q = term.trim()
    if (q.length === 0) {
      setStudentOptionsRows([])
      return
    }
    if (q.length < 5) return

    setLoadingStudentSearch(true)
    try {
      const rows = await searchStudentsByKeyword(q)
      setStudentOptionsRows(Array.isArray(rows) ? rows : [])
    } catch (e) {
      setStudentOptionsRows([])
      toastError(e, 'Failed to search students')
    } finally {
      setLoadingStudentSearch(false)
    }
  }

  const loadActivities = useCallback(async (sid: number) => {
    if (!sid) {
      setActivityRows([])
      return
    }
    setLoadingActivities(true)
    try {
      const rows = await listStudentCcActivities(sid)
      setActivityRows(Array.isArray(rows) ? rows : [])
    } catch (e) {
      setActivityRows([])
      toastError(e, 'Failed to load co-curriculum activities')
    } finally {
      setLoadingActivities(false)
    }
  }, [])

  async function onStudentSelect(nextId: number | null, row: AnyRow | null) {
    setStudentId(nextId)
    setActivityRows([])
    if (!nextId || !row) {
      setSelectedStudent(null)
      return
    }
    setSelectedStudent(row)
    await loadActivities(nextId)
  }

  async function openAddDialog() {
    setEditingRow(null)
    setCcactivityCatdetId(null)
    setIsActive(true)
    setReason('active')
    setDialogOpen(true)
    if (activityTypeRows.length > 0) return
    setLoadingTypes(true)
    try {
      const rows = await listGeneralDetailsByCode('STDCCATYPE')
      setActivityTypeRows(Array.isArray(rows) ? rows : [])
    } catch (e) {
      toastError(e, 'Failed to load activity types')
    } finally {
      setLoadingTypes(false)
    }
  }

  async function openEditDialog(row: AnyRow) {
    setEditingRow(row)
    setCcactivityCatdetId(pickNum(row, ['ccactivityCatdetId', 'ccactivity_catdet_id']))
    setIsActive(Boolean(row.isActive ?? true))
    setReason(pickText(row, ['reason']) || (row.isActive === false ? '' : 'active'))
    setDialogOpen(true)
    if (activityTypeRows.length > 0) return
    setLoadingTypes(true)
    try {
      const rows = await listGeneralDetailsByCode('STDCCATYPE')
      setActivityTypeRows(Array.isArray(rows) ? rows : [])
    } catch (e) {
      toastError(e, 'Failed to load activity types')
    } finally {
      setLoadingTypes(false)
    }
  }

  async function saveDialog() {
    if (!studentId) {
      toastError(new Error('Student required'), 'Select a student first.')
      return
    }
    if (!ccactivityCatdetId) {
      toastError(new Error('Activity required'), 'Select activity type.')
      return
    }

    const payload: Record<string, unknown> = {
      ccactivityCatdetId,
      isActive,
      reason: isActive ? 'active' : reason || 'inactive',
      studentId,
      studentDetail: { studentId },
    }

    setSaving(true)
    try {
      if (editingRow) {
        const id = pickNum(editingRow, ['stdCcactivityId', 'std_ccactivity_id'])
        await updateStudentCcActivity(id, { ...payload, stdCcactivityId: id })
        toastSuccess('Activity updated successfully.')
      } else {
        await createStudentCcActivity(payload)
        toastSuccess('Activity added successfully.')
      }
      setDialogOpen(false)
      await loadActivities(studentId)
    } catch (e) {
      toastError(e, editingRow ? 'Failed to update activity' : 'Failed to add activity')
    } finally {
      setSaving(false)
    }
  }

  const columnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 },
      {
        headerName: 'Activity',
        minWidth: 180,
        valueGetter: (p) =>
          pickText(p.data, ['ccactivityCatdetName', 'ccactivity_catdet_name']) ||
          '-',
      },
      {
        headerName: 'Course year',
        minWidth: 140,
        valueGetter: (p) =>
          pickText(p.data, ['courseYearName', 'course_year_name']) || '-',
      },
      {
        headerName: 'Status',
        minWidth: 110,
        cellRenderer: statusRenderer,
      },
      {
        headerName: 'Actions',
        width: 90,
        flex: 0,
        sortable: false,
        cellRenderer: makeActionsRenderer(openEditDialog),
      },
    ],
    [],
  )

  return (
    <FilteredListPage
      title="Student Co-Curriculum Activities"
      filters={
        <StudentSearchSelect
          label="Student"
          placeholder="Search student"
          value={studentId}
          students={studentOptionsRows}
          selectedStudent={selectedStudent}
          isLoading={loadingStudentSearch}
          onSearch={(term) => void searchStudents(term)}
          onChange={(id, row) => void onStudentSelect(id, row)}
        />
      }
      rowData={activityRows}
      columnDefs={columnDefs}
      loading={loadingActivities}
      pagination
      toolbar={SEARCH_ONLY_TOOLBAR}
      toolbarTrailing={
        <Button
          size="sm"
          onClick={() => void openAddDialog()}
          disabled={!studentId}
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add Co-Curriculum Activity
        </Button>
      }
    >
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent hasDescription>
          <DialogHeader>
            <DialogTitle>
              {editingRow
                ? 'Edit Student Co-Curriculum Activity'
                : 'Add Student Co-Curriculum Activity'}
            </DialogTitle>
            <DialogDescription>Select activity and update status.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Select
              label="Activity type"
              value={ccactivityCatdetId ? String(ccactivityCatdetId) : null}
              onChange={(v) => setCcactivityCatdetId(parseSelectNumber(v))}
              options={activityTypeOptions}
              placeholder="Select activity"
              isLoading={loadingTypes}
              className={SELECT_CLASS}
            />
            <div className="flex items-center gap-2">
              <Checkbox
                checked={isActive}
                onCheckedChange={(v) => setIsActive(v === true)}
                id="isActive"
              />
              <label htmlFor="isActive" className="text-xs font-medium">
                Active
              </label>
            </div>
            {!isActive && (
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason"
                className="h-8 text-xs"
              />
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Close
            </Button>
            <Button onClick={() => void saveDialog()} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FilteredListPage>
  )
}
