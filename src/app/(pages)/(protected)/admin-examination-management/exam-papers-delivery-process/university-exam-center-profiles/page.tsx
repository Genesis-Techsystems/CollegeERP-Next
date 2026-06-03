'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { BookMarked, Pencil } from 'lucide-react'
import { PageContainer, PageHeader } from '@/components/layout'
import { DataTable } from '@/common/components/table'
import { SearchInput } from '@/common/components/search'
import { Select, type SelectOption } from '@/common/components/select'
import { FormModal } from '@/common/components/feedback'
import { ActiveStatusField } from '@/common/components/forms'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { rowIndexGetter } from '@/lib/utils'
import { toastError, toastSuccess } from '@/lib/toast'
import {
  addListUnivEcProfiles,
  listAllActiveUnivExamCenters,
  listExamEvaluatorProfilesByRole,
  listUnivEcProfilesByCenterAndRole,
  updateUnivEcProfileRow,
  type AnyRow,
} from '@/services/exam-papers-delivery'

type Row = AnyRow

const ROLES: { roleId: number; roleName: string }[] = [
  { roleId: 64, roleName: 'Evaluator' },
  { roleId: 67, roleName: 'Moderator' },
  { roleId: 70, roleName: 'QuestionPapersetter' },
  { roleId: 96, roleName: 'External Evaluator' },
  { roleId: 97, roleName: 'Internal Evaluator' },
]

function num(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}
function txt(v: unknown): string {
  if (typeof v === 'string') return v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  return ''
}

function pickEvaluatorProfileId(r: Row): number {
  return num(r.examEvaluatorProfileId ?? r.examEvaluatorProfilesId ?? r.evaluatorProfileId)
}

function makeEditRenderer(onEdit: (row: Row) => void) {
  return (p: ICellRendererParams<Row>) => (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-8 w-8 text-blue-700"
      onClick={() => p.data && onEdit(p.data)}
    >
      <Pencil className="h-4 w-4" />
    </Button>
  )
}

interface EditFormState {
  univExamCentersId: string
  isActive: boolean
  reason: string
}

export default function UniversityExamCenterProfilesPage() {
  const [centers, setCenters] = useState<Row[]>([])
  const [loadingFilters, setLoadingFilters] = useState(false)
  const [loadingList, setLoadingList] = useState(false)
  const [assigning, setAssigning] = useState(false)

  const [filter, setFilter] = useState({ univExamCentersId: '', profileRoleId: '' })
  const [existing, setExisting] = useState<Row[]>([])
  const [available, setAvailable] = useState<Row[]>([])
  const [selectedSet, setSelectedSet] = useState<Set<number>>(new Set())
  const [selectAll, setSelectAll] = useState(false)
  const [availableSearch, setAvailableSearch] = useState('')
  const [shown, setShown] = useState(false)

  const [editOpen, setEditOpen] = useState(false)
  const [editRow, setEditRow] = useState<Row | null>(null)
  const [editForm, setEditForm] = useState<EditFormState>({
    univExamCentersId: '',
    isActive: true,
    reason: 'active',
  })
  const [saving, setSaving] = useState(false)

  const loadCenters = useCallback(async () => {
    setLoadingFilters(true)
    try {
      const list = await listAllActiveUnivExamCenters()
      setCenters(list)
    } catch (e) {
      toastError(e, 'Failed to load exam centers')
    } finally {
      setLoadingFilters(false)
    }
  }, [])

  useEffect(() => {
    void loadCenters()
  }, [loadCenters])

  const centerOptions: SelectOption[] = useMemo(
    () =>
      centers.map((c) => ({
        value: String(num(c.univExamcenterId ?? c.univExamCenterId)),
        label: txt(c.examcenterCode ?? c.examCenterCode),
      })),
    [centers],
  )

  const roleOptions: SelectOption[] = useMemo(
    () => ROLES.map((r) => ({ value: String(r.roleId), label: r.roleName })),
    [],
  )

  const headerText = useMemo(() => {
    const c = centers.find((x) => num(x.univExamcenterId ?? x.univExamCenterId) === Number(filter.univExamCentersId))
    const r = ROLES.find((x) => x.roleId === Number(filter.profileRoleId))
    return `${txt(c?.examcenterCode ?? c?.examCenterCode)} - ${r?.roleName ?? ''}`
  }, [centers, filter])

  async function onGetList() {
    if (!filter.univExamCentersId || !filter.profileRoleId) {
      toastError('Select Exam Center and Profile Role.')
      return
    }
    setLoadingList(true)
    try {
      const [existingRows, evaluatorRows] = await Promise.all([
        listUnivEcProfilesByCenterAndRole(
          Number(filter.univExamCentersId),
          Number(filter.profileRoleId),
        ),
        listExamEvaluatorProfilesByRole(Number(filter.profileRoleId)),
      ])
      setExisting(existingRows)
      const assignedIds = new Set(
        existingRows.map((r) => num(r.examEvaluatorProfilesId ?? r.examEvaluatorProfileId)),
      )
      const remaining = evaluatorRows.filter((r) => !assignedIds.has(pickEvaluatorProfileId(r)))
      setAvailable(remaining)
      setSelectedSet(new Set())
      setSelectAll(false)
      setShown(true)
    } catch (e) {
      toastError(e, 'Failed to load profiles')
      setShown(false)
    } finally {
      setLoadingList(false)
    }
  }

  const filteredAvailable = useMemo(() => {
    const q = availableSearch.trim().toLowerCase()
    if (!q) return available
    return available.filter((r) => txt(r.evaluatorName).toLowerCase().includes(q))
  }, [available, availableSearch])

  function toggleOne(id: number, checked: boolean) {
    setSelectedSet((s) => {
      const next = new Set(s)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
    setSelectAll(false)
  }

  function toggleAll(checked: boolean) {
    setSelectAll(checked)
    if (checked) {
      setSelectedSet(new Set(filteredAvailable.map((r) => pickEvaluatorProfileId(r))))
    } else {
      setSelectedSet(new Set())
    }
  }

  async function onAssign() {
    if (selectedSet.size === 0) {
      toastError('Select at least one evaluator profile.')
      return
    }
    const payload = available
      .filter((r) => selectedSet.has(pickEvaluatorProfileId(r)))
      .map((r) => ({
        evaluatorName: txt(r.evaluatorName),
        examEvaluatorProfilesId: pickEvaluatorProfileId(r),
        profileRoleId: Number(filter.profileRoleId),
        univExamCentersId: Number(filter.univExamCentersId),
        isActive: true,
        reason: null,
      }))
    setAssigning(true)
    try {
      await addListUnivEcProfiles(payload)
      toastSuccess('Profiles assigned.')
      await onGetList()
    } catch (err) {
      toastError(err, 'Assign failed')
    } finally {
      setAssigning(false)
    }
  }

  function onEdit(row: Row) {
    setEditRow(row)
    setEditForm({
      univExamCentersId: String(num(row.univExamCentersId ?? row.univExamcenterId)),
      isActive: row.isActive === true,
      reason: txt(row.reason) || 'active',
    })
    setEditOpen(true)
  }

  async function onSaveEdit(e: { preventDefault: () => void }) {
    e.preventDefault()
    if (!editRow) return
    if (!editForm.isActive && !editForm.reason.trim()) {
      toastError('Reason is required when inactive.')
      return
    }
    setSaving(true)
    try {
      const payload = {
        ...editRow,
        univEcPorifleId: num(editRow.univEcPorifleId),
        examEvaluatorProfilesId: num(editRow.examEvaluatorProfilesId),
        profileRoleId: num(editRow.profileRoleId),
        univExamCentersId: Number(editForm.univExamCentersId),
        isActive: editForm.isActive,
        reason: editForm.isActive ? 'active' : editForm.reason.trim(),
      }
      await updateUnivEcProfileRow(num(editRow.univEcPorifleId), payload as unknown as Record<string, unknown>)
      toastSuccess('Profile updated.')
      setEditOpen(false)
      await onGetList()
    } catch (err) {
      toastError(err, 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  const existingColumns = useMemo<ColDef<Row>[]>(
    () => [
      { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 },
      { headerName: 'Role', minWidth: 160, valueGetter: (p) => txt(p.data?.roleName ?? p.data?.profileRoleName) },
      { headerName: 'Evaluator Name', minWidth: 220, valueGetter: (p) => txt(p.data?.evaluatorName) },
      { headerName: 'Actions', minWidth: 90, width: 90, flex: 0, cellRenderer: makeEditRenderer(onEdit) },
    ],
    [],
  )

  return (
    <PageContainer className="space-y-4">
      <PageHeader
        title="University Exam Center Profiles"
        subtitle="Examination management · Exam papers delivery · Profiles"
      />

      <div className="app-card p-3 border-t-[3px] border-t-amber-300">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <BookMarked className="h-4 w-4 text-blue-700" aria-hidden />
          <h2 className="app-card-title">Exam Center Profiles</h2>
        </div>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="space-y-1 md:col-span-4">
            <Label>Exam Center *</Label>
            <Select
              options={centerOptions}
              value={filter.univExamCentersId}
              onChange={(v) => setFilter((f) => ({ ...f, univExamCentersId: v ?? '' }))}
              placeholder="Select exam center"
              searchable
              disabled={loadingFilters}
            />
          </div>
          <div className="space-y-1 md:col-span-4">
            <Label>Profile Role *</Label>
            <Select
              options={roleOptions}
              value={filter.profileRoleId}
              onChange={(v) => setFilter((f) => ({ ...f, profileRoleId: v ?? '' }))}
              placeholder="Select role"
              searchable
            />
          </div>
          <div className="md:col-span-2">
            <Button type="button" onClick={() => void onGetList()} disabled={loadingList}>
              Get List
            </Button>
          </div>
        </div>
      </div>

      {shown && (
        <>
          {available.length > 0 && (
            <div className="app-card p-3 space-y-2">
              <h3 className="text-[13px] font-semibold text-[hsl(var(--card-title))]">
                Available Evaluators - {headerText}
              </h3>
              <div className="flex items-center gap-2">
                <SearchInput
                  value={availableSearch}
                  onChange={setAvailableSearch}
                  placeholder="Search…"
                  className="w-full max-w-sm"
                />
                <span className="text-xs text-blue-700 font-semibold">
                  Selected: {selectedSet.size}
                </span>
                <div className="ml-auto">
                  <Button size="sm" onClick={() => void onAssign()} disabled={assigning}>
                    Assign
                  </Button>
                </div>
              </div>
              <div className="max-h-72 overflow-auto border rounded">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="text-left p-2 w-16">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={selectAll}
                            onCheckedChange={(v) => toggleAll(v === true)}
                          />
                          All
                        </div>
                      </th>
                      <th className="text-left p-2 text-blue-700">Evaluator</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAvailable.map((r) => {
                      const id = pickEvaluatorProfileId(r)
                      const checked = selectedSet.has(id)
                      return (
                        <tr key={id} className="border-t">
                          <td className="p-2">
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(v) => toggleOne(id, v === true)}
                            />
                          </td>
                          <td className="p-2">{txt(r.evaluatorName)}</td>
                        </tr>
                      )
                    })}
                    {filteredAvailable.length === 0 && (
                      <tr>
                        <td colSpan={2} className="p-3 text-center text-muted-foreground">
                          No available evaluators.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="app-card overflow-hidden">
            <div className="px-3 py-2 border-b border-border bg-muted/40">
              <h3 className="text-[13px] font-semibold text-[hsl(var(--card-title))]">
                Existing Profiles - {headerText}
              </h3>
            </div>
            <div className="p-2">
              <DataTable
                rowData={existing}
                columnDefs={existingColumns}
                loading={loadingList}
                pagination
                toolbar={{
                  search: true,
                  searchPlaceholder: 'Search…',
                  pdfDocumentTitle: 'Exam Center Profiles',
                }}
              />
            </div>
          </div>
        </>
      )}

      <FormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit Exam Center Profile"
        onSubmit={onSaveEdit}
        isSubmitting={saving}
        size="md"
      >
        <div className="space-y-3">
          <div className="text-sm">
            <span className="text-muted-foreground">Evaluator:</span>{' '}
            <span className="text-blue-700">{txt(editRow?.evaluatorName)}</span>
          </div>
          <div className="space-y-1">
            <Label>Exam Center *</Label>
            <Select
              options={centerOptions}
              value={editForm.univExamCentersId}
              onChange={(v) => setEditForm((f) => ({ ...f, univExamCentersId: v ?? '' }))}
              placeholder="Select exam center"
              searchable
            />
          </div>
          <ActiveStatusField
            isActive={editForm.isActive}
            reason={editForm.reason === 'active' ? '' : editForm.reason}
            onActiveChange={(v) =>
              setEditForm((f) => ({ ...f, isActive: v === true, reason: v ? 'active' : '' }))
            }
            onReasonChange={(v) => setEditForm((f) => ({ ...f, reason: v }))}
          />
        </div>
      </FormModal>
    </PageContainer>
  )
}
