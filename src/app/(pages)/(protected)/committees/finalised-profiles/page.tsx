'use client'

import { useMemo, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { useQuery } from '@tanstack/react-query'
import { FilteredListPage } from '@/components/layout'
import { Select } from '@/common/components/select'
import { ConfirmDialog } from '@/common/components/feedback'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useCrudList } from '@/hooks/useCrudList'
import { QK } from '@/lib/query-keys'
import {
  getEvaluatorProfilesForRecruitment,
  listCommitteeMeetingsForFinalise,
  listProfileRecruitments,
  releaseOfferLetter,
} from '@/services'
import type { EvaluatorProfileRow, UnivProfileRecruitment } from '@/types/committees'
import { rowIndexGetter } from '@/lib/utils'
import { toastError, toastSuccess } from '@/lib/toast'
import { useCommitteeMemberFilters } from '../_lib/use-committee-member-filters'

const COL_DEFS = {
  siNo: { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<UnivProfileRecruitment>,
  role: { field: 'evaluatorRoleName', headerName: 'Role', minWidth: 140 } as ColDef<UnivProfileRecruitment>,
  profileName: { headerName: 'Profile Name', minWidth: 180, flex: 1.5 } as ColDef<UnivProfileRecruitment>,
  meetingTitle: { headerName: 'Meeting Title', minWidth: 160, flex: 1.2 } as ColDef<UnivProfileRecruitment>,
  actions: { headerName: 'Actions', minWidth: 130, flex: 0 } as ColDef<UnivProfileRecruitment>,
}

function profileNameRenderer(p: ICellRendererParams<UnivProfileRecruitment>) {
  const row = p.data
  const name =
    row?.profileEmployeeName
    ?? (row as UnivProfileRecruitment & { evaluatorName?: string })?.evaluatorName
  return <span className="text-xs">{name ?? '—'}</span>
}

function meetingTitleRenderer(p: ICellRendererParams<UnivProfileRecruitment>) {
  const row = p.data
  const title =
    row?.meetingTitle
    ?? (row as UnivProfileRecruitment & { committeeMeetingTitle?: string })?.committeeMeetingTitle
  return <span className="text-xs">{title ?? '—'}</span>
}

function isOfferReleased(row: UnivProfileRecruitment): boolean {
  const v = row.isOfferReleased
  if (v === true || v === 'true') return true
  return v != null && v !== false && v !== 'false'
}

function makeReleaseRenderer(
  onRelease: (row: UnivProfileRecruitment) => void,
) {
  return (p: ICellRendererParams<UnivProfileRecruitment>) => {
    const row = p.data
    if (!row) return null
    if (isOfferReleased(row)) {
      return (
        <span className="text-xs font-medium text-muted-foreground">Offer Released</span>
      )
    }
    return (
      <Button size="sm" variant="outline" onClick={() => onRelease(row)}>
        Release Offer
      </Button>
    )
  }
}

export default function FinalisedProfilesPage() {
  const filters = useCommitteeMemberFilters()
  const [showTable, setShowTable] = useState(false)
  const [meetingId, setMeetingId] = useState<string | null>(null)
  const [confirmRow, setConfirmRow] = useState<UnivProfileRecruitment | null>(null)
  const [releasing, setReleasing] = useState(false)

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

  const selectedExamName = useMemo(() => {
    const exam = filters.rows.find(
      (r) =>
        String(r.pk_univ_committee_id) === filters.committeeId &&
        String(r.fk_university_exam_id) === filters.examId,
    )
    return exam?.exam_name ?? ''
  }, [filters.rows, filters.committeeId, filters.examId])

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

  const filteredRows = useMemo(() => {
    if (!meetingId) return rows
    const mid = Number(meetingId)
    return rows.filter((r) => Number(r.committeeMeetingId) === mid)
  }, [rows, meetingId])

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
      { ...COL_DEFS.profileName, cellRenderer: profileNameRenderer },
      { ...COL_DEFS.meetingTitle, cellRenderer: meetingTitleRenderer },
      {
        ...COL_DEFS.actions,
        cellRenderer: makeReleaseRenderer((row) => setConfirmRow(row)),
      },
    ],
    [],
  )

  function handleGetList() {
    if (!filters.filtersReady) return
    setShowTable(true)
    setMeetingId(null)
  }

  async function handleReleaseOffer() {
    if (!confirmRow) return
    const profileDetail = evaluatorProfiles.find(
      (p: EvaluatorProfileRow) =>
        Number(p.pk_exam_evaluator_profile_id) === Number(confirmRow.examEvaluatorProfilesId),
    )

    setReleasing(true)
    try {
      await releaseOfferLetter({
        fromEmailId: '',
        collegeId: Number(globalThis?.localStorage?.getItem('collegeId') ?? 0),
        orgCode: globalThis?.localStorage?.getItem('orgCode') ?? '',
        filePath: '',
        mailContent: '',
        examId: examNum,
        userLoggedInEmpId: Number(globalThis?.localStorage?.getItem('employeeId') ?? 0),
        userLoggedInEmpName: globalThis?.localStorage?.getItem('userName') ?? '',
        univProfileRecruitmentId: confirmRow.univProfileRecruitmentId,
        examinationRoleId: confirmRow.evaluatorRoleId,
        isEmailAlert: 'true',
        comments: '',
        subject: '',
        mailContentHtml: '',
        examName: selectedExamName,
        examEvaluatorProfileId: confirmRow.examEvaluatorProfilesId,
        examinationRole: confirmRow.evaluatorRoleName,
        orgName: confirmRow.organizationName,
        examMonthYear: profileDetail?.exam_month_yr ?? '',
        startDate: profileDetail?.profile_valid_fromdate ?? '',
        endDate: profileDetail?.profile_valid_todate ?? '',
      })
      toastSuccess('Offer letter released.')
      setConfirmRow(null)
      invalidate()
    } catch (e) {
      toastError(e, 'Failed to release offer')
    } finally {
      setReleasing(false)
    }
  }

  return (
    <FilteredListPage
      title="Finalised Profiles"
      filters={(
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5">
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
          <div className="space-y-0.5">
            <Label className="text-xs">Meeting</Label>
            <Select
              value={meetingId}
              onChange={setMeetingId}
              options={meetingOptions}
              placeholder="All meetings"
              searchable
              clearable
              disabled={!showTable || !filters.cascadeReady}
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
      )}
      rowData={showTable && filters.filtersReady ? filteredRows : []}
      columnDefs={columnDefs}
      loading={isLoading}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: 'Search profiles…',
        pdfDocumentTitle: 'Finalised Profiles',
      }}
    >
      <ConfirmDialog
        open={Boolean(confirmRow)}
        title="Release offer letter?"
        description={
          confirmRow
            ? `Send the offer letter to ${confirmRow.profileEmployeeName ?? 'this profile'}?`
            : ''
        }
        confirmLabel="Release Offer"
        confirmVariant="default"
        isLoading={releasing}
        onConfirm={() => void handleReleaseOffer()}
        onCancel={() => setConfirmRow(null)}
      />
    </FilteredListPage>
  )
}
