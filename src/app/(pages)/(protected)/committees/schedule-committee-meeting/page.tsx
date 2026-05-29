'use client'

import { useMemo, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { PageContainer } from '@/components/layout'
import { DataTable } from '@/common/components/table'
import { Select } from '@/common/components/select'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useCrudList } from '@/hooks/useCrudList'
import { QK } from '@/lib/query-keys'
import { formatDate } from '@/common/generic-functions'
import { listScheduledMeetings } from '@/services'
import type { UnivCommitteeMeeting } from '@/types/committees'
import { rowIndexGetter } from '@/lib/utils'
import { useCommitteeMemberFilters } from '../_lib/use-committee-member-filters'
import { AddMeetingModal } from './AddMeetingModal'

function meetingZoomUrl(row: UnivCommitteeMeeting): string | undefined {
  return (
    row.zoomLink
    ?? row.univZoomMeetingDetailsDTO?.zoomStartUrl
    ?? row.univZoomMeetingDetailsDTO?.zoomJoinUrl
  )
}

const COL_DEFS = {
  siNo: { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<UnivCommitteeMeeting>,
  meetingTitle: { field: 'meetingTitle', headerName: 'Meeting Title', minWidth: 180, flex: 1.5 } as ColDef<UnivCommitteeMeeting>,
  meetingDate: { headerName: 'Meeting Date', minWidth: 120, flex: 1 } as ColDef<UnivCommitteeMeeting>,
  startTime: { headerName: 'Start Time', minWidth: 100, flex: 0.8 } as ColDef<UnivCommitteeMeeting>,
  endTime: { headerName: 'End Time', minWidth: 100, flex: 0.8 } as ColDef<UnivCommitteeMeeting>,
  zoomLink: { headerName: 'Zoom Link', minWidth: 140, flex: 1 } as ColDef<UnivCommitteeMeeting>,
}

function meetingDateRenderer(p: ICellRendererParams<UnivCommitteeMeeting>) {
  const raw = p.data?.scheduledDate ?? p.data?.meetingDate
  return <span className="text-xs">{formatDate(raw)}</span>
}

function startTimeRenderer(p: ICellRendererParams<UnivCommitteeMeeting>) {
  const value = p.data?.meetingFromTime ?? p.data?.startTime
  return <span className="text-xs">{value ?? '—'}</span>
}

function endTimeRenderer(p: ICellRendererParams<UnivCommitteeMeeting>) {
  const value = p.data?.meetingToTime ?? p.data?.endTime
  return <span className="text-xs">{value ?? '—'}</span>
}

function zoomLinkRenderer(p: ICellRendererParams<UnivCommitteeMeeting>) {
  const url = p.data ? meetingZoomUrl(p.data) : undefined
  if (!url) return <span className="text-xs text-muted-foreground">—</span>
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-xs text-primary underline"
    >
      Join
    </a>
  )
}

export default function ScheduleCommitteeMeetingPage() {
  const filters = useCommitteeMemberFilters()
  const [showTable, setShowTable] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)

  const { data, isLoading, invalidate } = useCrudList<UnivCommitteeMeeting>({
    queryKey: QK.committeeMeetings.scheduled(
      Number(filters.committeeId),
      Number(filters.examId),
      filters.academicYear,
    ),
    queryFn: () =>
      listScheduledMeetings({
        univCommitteeId: Number(filters.committeeId),
        academicYear: filters.academicYear,
        universityExamId: Number(filters.examId),
      }),
    enabled: showTable && filters.filtersReady && Boolean(filters.academicYear),
  })

  const columnDefs = useMemo<ColDef<UnivCommitteeMeeting>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.meetingTitle,
      { ...COL_DEFS.meetingDate, cellRenderer: meetingDateRenderer },
      { ...COL_DEFS.startTime, cellRenderer: startTimeRenderer },
      { ...COL_DEFS.endTime, cellRenderer: endTimeRenderer },
      { ...COL_DEFS.zoomLink, cellRenderer: zoomLinkRenderer },
    ],
    [],
  )

  const meetingContext = filters.filtersReady
    ? {
        univCommitteeId: Number(filters.committeeId),
        universityExamId: Number(filters.examId),
        academicYear: filters.academicYear,
        subjectCode: filters.subjectCode!,
      }
    : null

  function handleGetList() {
    if (!filters.filtersReady) return
    setShowTable(true)
  }

  return (
    <PageContainer className="space-y-4">
      <div className="app-card p-4">
        <h2 className="app-card-title mb-3">Schedule Committee Meeting</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
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
        </div>
        <div className="mt-3 flex justify-end">
          <Button
            size="sm"
            disabled={!filters.filtersReady}
            onClick={handleGetList}
          >
            Get List
          </Button>
        </div>
      </div>

      {showTable && filters.filtersReady && (
        <div className="app-card overflow-hidden">
          {filters.tableHeading && (
            <p className="px-3 pt-3 text-sm font-medium text-foreground">{filters.tableHeading}</p>
          )}
          <div className="px-3 pb-3 pt-2">
            <div className="overflow-hidden rounded-lg border border-border bg-card">
              <DataTable
                rowData={data}
                columnDefs={columnDefs}
                loading={isLoading}
                pagination
                toolbar={{
                  search: true,
                  searchPlaceholder: 'Search meetings…',
                  pdfDocumentTitle: 'Scheduled Committee Meetings',
                }}
                toolbarTrailing={
                  <Button size="sm" onClick={() => setModalOpen(true)}>
                    + Add Meeting
                  </Button>
                }
              />
            </div>
          </div>
        </div>
      )}

      <AddMeetingModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        filterContext={meetingContext}
        onSaved={invalidate}
      />
    </PageContainer>
  )
}
