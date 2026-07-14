'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { Pencil } from 'lucide-react'
import { FilteredPage } from '@/components/layout'
import { DataTable } from '@/common/components/table'
import { SearchInput } from '@/common/components/search'
import { Select, type SelectOption } from '@/common/components/select'
import { FormModal } from '@/common/components/feedback'
import { ActiveStatusField, GlobalFilterBarRow, GlobalFilterField } from '@/common/components/forms'
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
      centers
        .map((c) => {
          const id = num(c.univExamcenterId ?? c.univExamCenterId)
          return {
            value: String(id),
            label: txt(c.examcenterCode ?? c.examCenterCode) || String(id),
            id,
          }
        })
        .filter((o) => o.id > 0)
        .map(({ value, label }) => ({ value, label })),
    [centers],
  )

  const roleOptions: SelectOption[] = useMemo(
    () => ROLES.map((r) => ({ value: String(r.roleId), label: r.roleName })),
    [],
  )

  async function onGetList() {
    if (!filter.univExamCentersId || !filter.profileRoleId) {
      toastError('Select Exam Center and Profile Role.')
      return
    }
    const centerId = Number(filter.univExamCentersId)
    const roleId = Number(filter.profileRoleId)
    if (!Number.isFinite(centerId) || centerId <= 0 || !Number.isFinite(roleId) || roleId <= 0) {
      toastError('Select a valid Exam Center and Profile Role.')
      return
    }
    setLoadingList(true)
    setSelectedSet(new Set())
    setSelectAll(false)
    setAvailableSearch('')
    // Always show result cards after Get List (empty table on no data / API error)
    setShown(true)
    try {
      const [existingRows, evaluatorRows] = await Promise.all([
        listUnivEcProfilesByCenterAndRole(centerId, roleId),
        listExamEvaluatorProfilesByRole(roleId),
      ])
      setExisting(existingRows)
      const assignedIds = new Set(
        existingRows.map((r) => num(r.examEvaluatorProfilesId ?? r.examEvaluatorProfileId)),
      )
      const remaining = evaluatorRows.filter((r) => !assignedIds.has(pickEvaluatorProfileId(r)))
      setAvailable(remaining)
    } catch (e) {
      setExisting([])
      setAvailable([])
      toastError(e, 'Failed to load profiles')
    } finally {
      setLoadingList(false)
    }
  }

  const filteredAvailable = useMemo(() => {
    const q = availableSearch.trim().toLowerCase()
    if (!q) return available
    return available.filter((r) => txt(r.evaluatorName).toLowerCase().includes(q))
  }, [available, availableSearch])

  const selectedEvaluators = useMemo(
    () => available.filter((r) => selectedSet.has(pickEvaluatorProfileId(r))),
    [available, selectedSet],
  )

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
      {
        headerName: 'Evaluator Name',
        minWidth: 220,
        valueGetter: (p) =>
          txt(p.data?.examEvaluatorProfilesName ?? p.data?.evaluatorName),
      },
      { headerName: 'Actions', minWidth: 90, width: 90, flex: 0, cellRenderer: makeEditRenderer(onEdit) },
    ],
    [],
  )

  return (
    <FilteredPage
      title="Exam Center Profiles"
      filters={(
        <GlobalFilterBarRow>
          <GlobalFilterField label="Exam Center *">
            <Select
              options={centerOptions}
              value={filter.univExamCentersId}
              onChange={(v) => {
                setShown(false)
                setFilter((f) => ({ ...f, univExamCentersId: v ?? '' }))
              }}
              placeholder="Select exam center"
              searchable
              disabled={loadingFilters}
            />
          </GlobalFilterField>
          <GlobalFilterField label="Profile Role *">
            <Select
              options={roleOptions}
              value={filter.profileRoleId}
              onChange={(v) => {
                setShown(false)
                setFilter((f) => ({ ...f, profileRoleId: v ?? '' }))
              }}
              placeholder="Select role"
              searchable
            />
          </GlobalFilterField>
          <GlobalFilterField label=" " className="global-filter-field--action global-filter-field--shrink">
            <Button
              type="button"
              size="sm"
              className="h-8 shrink-0 px-3 text-[12px]"
              onClick={() => void onGetList()}
              disabled={loadingList}
            >
              Get List
            </Button>
          </GlobalFilterField>
        </GlobalFilterBarRow>
      )}
      body={
        shown ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-5 rounded border overflow-hidden bg-card">
                <div className="flex items-center justify-between gap-2 border-b p-2">
                  <SearchInput
                    value={availableSearch}
                    onChange={setAvailableSearch}
                    placeholder="Search…"
                    className="w-full max-w-sm"
                  />
                  <span className="shrink-0 text-[12px] font-semibold text-blue-700">
                    Selected : {selectedSet.size}
                  </span>
                </div>
                <div className="max-h-72 overflow-auto">
                  <table className="w-full text-[12px]">
                    <thead className="sticky top-0 bg-[#C3D9FF]">
                      <tr>
                        <th className="w-16 px-2 py-1.5 text-left">
                          <label className="flex items-center gap-1.5 font-semibold">
                            <Checkbox
                              checked={selectAll}
                              onCheckedChange={(v) => toggleAll(v === true)}
                            />
                            All
                          </label>
                        </th>
                        <th className="px-2 py-1.5 text-left font-semibold">Evaluators</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAvailable.map((r) => {
                        const id = pickEvaluatorProfileId(r)
                        const checked = selectedSet.has(id)
                        return (
                          <tr key={id} className="border-t">
                            <td className="px-2 py-1.5">
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(v) => toggleOne(id, v === true)}
                              />
                            </td>
                            <td className="px-2 py-1.5">{txt(r.evaluatorName)}</td>
                          </tr>
                        )
                      })}
                      {filteredAvailable.length === 0 && (
                        <tr>
                          <td colSpan={2} className="px-2 py-6 text-center text-muted-foreground">
                            {loadingList ? 'Loading…' : 'No available evaluators.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="md:col-span-5 rounded border overflow-hidden bg-card">
                <div className="max-h-[22.5rem] overflow-auto">
                  <table className="w-full text-[12px]">
                    <thead className="sticky top-0 bg-[#C3D9FF]">
                      <tr>
                        <th className="px-2 py-1.5 text-left font-semibold text-blue-700">
                          Selected Evaluators : {selectedSet.size}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedEvaluators.map((r) => {
                        const id = pickEvaluatorProfileId(r)
                        return (
                          <tr key={`sel-${id}`} className="border-t">
                            <td className="px-2 py-1.5 text-blue-700">{txt(r.evaluatorName) || '-'}</td>
                          </tr>
                        )
                      })}
                      {selectedEvaluators.length === 0 && (
                        <tr>
                          <td className="px-2 py-6 text-center text-muted-foreground">—</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="md:col-span-2 flex items-end justify-end md:justify-start">
                <Button
                  type="button"
                  className="h-8 text-[12px]"
                  onClick={() => void onAssign()}
                  disabled={assigning || selectedSet.size === 0}
                >
                  {assigning ? 'Assigning…' : 'Assign'}
                </Button>
              </div>
            </div>

            <div className="-mx-5 -mb-4 overflow-hidden border-t border-border">
              <DataTable
                bordered={false}
                title=""
                subtitle=""
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
        ) : undefined
      }
    >
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
    </FilteredPage>
  )
}
