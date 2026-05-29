'use client'

import { useCallback, useMemo, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { PencilIcon } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { PageContainer } from '@/components/layout'
import { DataTable } from '@/common/components/table'
import { Select } from '@/common/components/select'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { useCrudList } from '@/hooks/useCrudList'
import { QK } from '@/lib/query-keys'
import {
  addMultipleProfileRecruitments,
  getEvaluatorProfilesForRecruitment,
  listCommitteeMeetingsForFinalise,
  listProfileRecruitments,
} from '@/services'
import type { EvaluatorProfileRow, UnivProfileRecruitment } from '@/types/committees'
import { rowIndexGetter } from '@/lib/utils'
import { toastError, toastInfo, toastSuccess } from '@/lib/toast'
import { useCommitteeMemberFilters } from '../_lib/use-committee-member-filters'
import { EditFinaliseProfileModal } from './EditFinaliseProfileModal'

const EVALUATOR_ROLES = {
  EVALUATOR: 64,
  MODERATOR: 67,
  QP_SETTER: 70,
} as const

type RoleKey = keyof typeof EVALUATOR_ROLES

const ROLE_SECTIONS: { key: RoleKey; label: string }[] = [
  { key: 'EVALUATOR', label: 'Evaluator' },
  { key: 'MODERATOR', label: 'Moderator' },
  { key: 'QP_SETTER', label: 'Question Paper Setter' },
]

const COL_DEFS = {
  siNo: { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<UnivProfileRecruitment>,
  role: { field: 'evaluatorRoleName', headerName: 'Role', minWidth: 140 } as ColDef<UnivProfileRecruitment>,
  profileName: { field: 'profileEmployeeName', headerName: 'Profile Name', minWidth: 180, flex: 1.5 } as ColDef<UnivProfileRecruitment>,
  meetingTitle: { field: 'meetingTitle', headerName: 'Meeting Title', minWidth: 160, flex: 1.2 } as ColDef<UnivProfileRecruitment>,
  actions: { headerName: 'Edit', width: 80, flex: 0 } as ColDef<UnivProfileRecruitment>,
}

function makeActionsRenderer(
  onEdit: (row: UnivProfileRecruitment) => void,
) {
  return (p: ICellRendererParams<UnivProfileRecruitment>) => (
    <Button
      size="sm"
      variant="ghost"
      className="h-8 w-8 p-0"
      onClick={() => p.data && onEdit(p.data)}
    >
      <PencilIcon className="h-3.5 w-3.5" />
    </Button>
  )
}

function profilesForRole(rows: EvaluatorProfileRow[], roleId: number, configuredOnly = false) {
  return rows.filter((r) => {
    if (Number(r.fk_evaluatorrole_id) !== roleId) return false
    const configured = Number(r.is_confiured) === 1
    return configuredOnly ? configured : !configured
  })
}

export default function FinaliseProfilesPage() {
  const filters = useCommitteeMemberFilters()
  const [showTable, setShowTable] = useState(false)
  const [meetingId, setMeetingId] = useState<string | null>(null)
  const [editRow, setEditRow] = useState<UnivProfileRecruitment | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const [selectedByRole, setSelectedByRole] = useState<Record<RoleKey, Set<number>>>({
    EVALUATOR: new Set(),
    MODERATOR: new Set(),
    QP_SETTER: new Set(),
  })

  const committeeNum = Number(filters.committeeId)
  const examNum = Number(filters.examId)

  const { data: meetings = [] } = useQuery({
    queryKey: QK.committeeMeetings.forFinalise(committeeNum, examNum),
    queryFn: () => listCommitteeMeetingsForFinalise(committeeNum, examNum),
    enabled: showTable && filters.cascadeReady,
  })

  const meetingOptions = useMemo(
    () =>
      meetings.map((m) => ({
        value: String(m.univCommitteeMeetingId ?? m.committeeMeetingId ?? ''),
        label: m.meetingTitle ?? 'Meeting',
      })).filter((o) => o.value),
    [meetings],
  )

  const { data: rows, isLoading, invalidate } = useCrudList<UnivProfileRecruitment>({
    queryKey: QK.profileRecruitments.list(filters.orgId, committeeNum, examNum),
    queryFn: () =>
      listProfileRecruitments({
        organizationId: filters.orgId,
        univCommitteeId: committeeNum,
        universityExamId: examNum,
      }),
    enabled: showTable && filters.filtersReady && filters.orgId > 0,
  })

  const { data: evaluatorProfiles = [] } = useQuery({
    queryKey: QK.profileRecruitments.evaluatorProfiles(examNum, filters.subjectCode ?? ''),
    queryFn: () =>
      getEvaluatorProfilesForRecruitment({
        universityExamId: examNum,
        subjectCode: filters.subjectCode ?? '',
      }),
    enabled: showTable && filters.filtersReady && examNum > 0,
  })

  const columnDefs = useMemo<ColDef<UnivProfileRecruitment>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.role,
      COL_DEFS.profileName,
      COL_DEFS.meetingTitle,
      {
        ...COL_DEFS.actions,
        cellRenderer: makeActionsRenderer((row) => {
          setEditRow(row)
          setEditOpen(true)
        }),
      },
    ],
    [],
  )

  const toggleProfile = useCallback((roleKey: RoleKey, profileId: number, checked: boolean) => {
    setSelectedByRole((prev) => {
      const next = new Set(prev[roleKey])
      if (checked) next.add(profileId)
      else next.delete(profileId)
      return { ...prev, [roleKey]: next }
    })
  }, [])

  function handleGetList() {
    if (!filters.filtersReady) return
    setShowTable(true)
    setMeetingId(null)
    setSelectedByRole({
      EVALUATOR: new Set(),
      MODERATOR: new Set(),
      QP_SETTER: new Set(),
    })
  }

  async function handleSaveProfiles() {
    if (!filters.filtersReady || !meetingId) {
      toastInfo('Select a committee meeting before saving profiles.')
      return
    }

    const payloads: Record<string, unknown>[] = []
    for (const section of ROLE_SECTIONS) {
      const roleId = EVALUATOR_ROLES[section.key]
      for (const profileId of selectedByRole[section.key]) {
        payloads.push({
          organizationId: filters.orgId,
          univCommitteesId: committeeNum,
          universityExamId: examNum,
          examEvaluatorProfilesId: profileId,
          evaluatorRoleId: roleId,
          committeeMeetingId: Number(meetingId),
          subjectCode: filters.subjectCode,
          isActive: true,
        })
      }
    }

    if (payloads.length === 0) {
      toastInfo('Select at least one evaluator profile to save.')
      return
    }

    setSaving(true)
    try {
      await addMultipleProfileRecruitments(payloads)
      toastSuccess('Profiles saved successfully.')
      setSelectedByRole({
        EVALUATOR: new Set(),
        MODERATOR: new Set(),
        QP_SETTER: new Set(),
      })
      invalidate()
    } catch (e) {
      toastError(e, 'Failed to save profiles')
    } finally {
      setSaving(false)
    }
  }

  return (
    <PageContainer className="space-y-4">
      <div className="app-card p-4">
        <h2 className="app-card-title mb-3">Finalise Profiles</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-0.5">
            <Label className="text-xs">Committee *</Label>
            <Select
              value={filters.committeeId}
              onChange={filters.setCommitteeId}
              options={filters.committeeOptions}
              placeholder="Select committee"
              searchable
              clearable
              isLoading={filters.isLoading}
            />
          </div>
          <div className="space-y-0.5">
            <Label className="text-xs">Exam *</Label>
            <Select
              value={filters.examId}
              onChange={filters.setExamId}
              options={filters.examOptions}
              placeholder="Select exam"
              searchable
              clearable
              disabled={!filters.committeeId}
            />
          </div>
          <div className="space-y-0.5">
            <Label className="text-xs">Subject *</Label>
            <Select
              value={filters.subjectCode}
              onChange={filters.setSubjectCode}
              options={filters.subjectOptions}
              placeholder="Select subject"
              searchable
              clearable
              disabled={!filters.examId}
            />
          </div>
          <div className="flex items-end">
            <Button
              size="sm"
              className="w-full"
              disabled={!filters.filtersReady}
              onClick={handleGetList}
            >
              Get List
            </Button>
          </div>
        </div>
      </div>

      {showTable && filters.filtersReady && (
        <>
          <div className="app-card overflow-hidden">
            <div className="px-3 pb-3 pt-2">
              <div className="overflow-hidden rounded-lg border border-border bg-card">
                <DataTable
                  rowData={rows}
                  columnDefs={columnDefs}
                  loading={isLoading}
                  pagination
                  toolbar={{
                    search: true,
                    searchPlaceholder: 'Search profiles…',
                    pdfDocumentTitle: 'Finalise Profiles',
                  }}
                />
              </div>
            </div>
          </div>

          <div className="app-card p-4 space-y-4">
            <h3 className="text-sm font-semibold">Add Evaluator / Moderator / Question Paper Setter</h3>
            <div className="max-w-md space-y-0.5">
              <Label className="text-xs">Committee Meeting *</Label>
              <Select
                value={meetingId}
                onChange={setMeetingId}
                options={meetingOptions}
                placeholder="Select meeting"
                searchable
                clearable
              />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {ROLE_SECTIONS.map((section) => {
                const roleId = EVALUATOR_ROLES[section.key]
                const available = profilesForRole(evaluatorProfiles, roleId, false)
                const selected = selectedByRole[section.key]
                return (
                  <div
                    key={section.key}
                    className="rounded-lg border border-border p-3 space-y-2 max-h-64 overflow-y-auto"
                  >
                    <p className="text-xs font-medium">{section.label}</p>
                    {available.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No profiles available.</p>
                    ) : (
                      available.map((profile) => {
                        const id = Number(profile.pk_exam_evaluator_profile_id)
                        const checkboxId = `${section.key}-${id}`
                        return (
                          <div key={checkboxId} className="flex items-center gap-2">
                            <Checkbox
                              id={checkboxId}
                              checked={selected.has(id)}
                              onCheckedChange={(v) => toggleProfile(section.key, id, v === true)}
                            />
                            <label htmlFor={checkboxId} className="text-xs cursor-pointer">
                              {profile.evaluator_name ?? '—'}
                            </label>
                          </div>
                        )
                      })
                    )}
                  </div>
                )
              })}
            </div>

            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setSelectedByRole({
                    EVALUATOR: new Set(),
                    MODERATOR: new Set(),
                    QP_SETTER: new Set(),
                  })
                }
              >
                Clear Selection
              </Button>
              <Button size="sm" disabled={saving} onClick={() => void handleSaveProfiles()}>
                {saving ? 'Saving…' : 'Save Profiles'}
              </Button>
            </div>
          </div>
        </>
      )}

      <EditFinaliseProfileModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        row={editRow}
        univCommitteeId={committeeNum}
        onSaved={invalidate}
      />
    </PageContainer>
  )
}
