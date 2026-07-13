'use client'

import { useCallback, useMemo, useState } from 'react'
import { Plus, Pencil } from 'lucide-react'
import { FilteredPage } from '@/components/layout'
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

export default function StudentCcActivitiesPage() {
  const [studentOptionsRows, setStudentOptionsRows] = useState<AnyRow[]>([])
  const [studentId, setStudentId] = useState<number | null>(null)
  const [selectedStudent, setSelectedStudent] = useState<AnyRow | null>(null)

  const [activityRows, setActivityRows] = useState<AnyRow[]>([])
  const [tableSearch, setTableSearch] = useState('')

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
        label: pickText(row, ['generalDetailDisplayName', 'gd_name', 'general_detail_display_name']) || 'Activity',
      })),
    [activityTypeRows],
  )

  const filteredActivities = useMemo(() => {
    const q = tableSearch.trim().toLowerCase()
    if (!q) return activityRows
    return activityRows.filter((row) =>
      [
        pickText(row, ['ccactivityCatdetName', 'ccactivity_catdet_name']),
        pickText(row, ['courseYearName', 'course_year_name']),
      ]
        .join(' ')
        .toLowerCase()
        .includes(q),
    )
  }, [tableSearch, activityRows])

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
    setTableSearch('')
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

  return (
    <FilteredPage
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
    >
      {!!selectedStudent && (
        <div className="app-card p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Input
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              placeholder="Search activities"
              className="h-8 max-w-xs text-xs"
            />
            <Button size="sm" onClick={() => void openAddDialog()}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add Co-Curriculum Activity
            </Button>
          </div>

          <div className="overflow-auto rounded border">
            <table className="w-full text-[12px]">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-2 py-1 text-left">SI.No</th>
                  <th className="px-2 py-1 text-left">Activity</th>
                  <th className="px-2 py-1 text-left">Course year</th>
                  <th className="px-2 py-1 text-left">Status</th>
                  <th className="px-2 py-1 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loadingActivities ? (
                  <tr className="border-t">
                    <td className="px-2 py-2 text-slate-600" colSpan={5}>Loading activities…</td>
                  </tr>
                ) : filteredActivities.length === 0 ? (
                  <tr className="border-t">
                    <td className="px-2 py-2 text-slate-600" colSpan={5}>No activities found.</td>
                  </tr>
                ) : (
                  filteredActivities.map((row, index) => (
                    <tr key={`cca-${pickNum(row, ['stdCcactivityId']) || index}`} className="border-t">
                      <td className="px-2 py-1">{index + 1}</td>
                      <td className="px-2 py-1">{pickText(row, ['ccactivityCatdetName']) || '-'}</td>
                      <td className="px-2 py-1">{pickText(row, ['courseYearName']) || '-'}</td>
                      <td className="px-2 py-1">
                        <StatusBadge status={Boolean(row.isActive)} />
                      </td>
                      <td className="px-2 py-1">
                        <Button variant="ghost" size="icon" onClick={() => void openEditDialog(row)} aria-label="Edit activity">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent hasDescription>
          <DialogHeader>
            <DialogTitle>{editingRow ? 'Edit Student Co-Curriculum Activity' : 'Add Student Co-Curriculum Activity'}</DialogTitle>
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
              <Checkbox checked={isActive} onCheckedChange={(v) => setIsActive(v === true)} id="isActive" />
              <label htmlFor="isActive" className="text-xs font-medium">Active</label>
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
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Close
            </Button>
            <Button onClick={() => void saveDialog()} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FilteredPage>
  )
}
