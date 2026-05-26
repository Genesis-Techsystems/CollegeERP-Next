'use client'

import { useMemo, useState } from 'react'
import { CheckIcon, XIcon } from 'lucide-react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { DataTable, TableCard } from '@/common/components/table'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { QK } from '@/lib/query-keys'
import { rowIndexGetter } from '@/lib/utils'
import { listUnivStdApplications, updateUnivStdApplication } from '@/services'
import type { UnivStdApplicationRow } from '@/types/admission'
import { UNIV_APP_STATUS } from '@/types/admission'
import { toastError, toastSuccess } from '@/lib/toast'
import { ApproveApplicationModal } from './ApproveApplicationModal'

const BASE_COLS = {
  siNo: { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<UnivStdApplicationRow>,
  universityCode: { field: 'universityCode', headerName: 'University', minWidth: 90 } as ColDef<UnivStdApplicationRow>,
  applicationNo: { field: 'applicationNo', headerName: 'App No', minWidth: 110 } as ColDef<UnivStdApplicationRow>,
  firstName: { field: 'firstName', headerName: 'Name', minWidth: 140, flex: 1 } as ColDef<UnivStdApplicationRow>,
  stdEmailId: { field: 'stdEmailId', headerName: 'Email', minWidth: 160 } as ColDef<UnivStdApplicationRow>,
  mobile: { field: 'mobile', headerName: 'Mobile', minWidth: 110, flex: 0 } as ColDef<UnivStdApplicationRow>,
  applicationStatusName: { field: 'applicationStatusName', headerName: 'Status', minWidth: 120 } as ColDef<UnivStdApplicationRow>,
  actions: { headerName: 'Actions', minWidth: 100, width: 100, flex: 0 } as ColDef<UnivStdApplicationRow>,
}

function filterByStatus(rows: UnivStdApplicationRow[], statusId: number) {
  return rows.filter((r) => Number(r.applicationStatusCatdetId) === statusId)
}

export default function StudentApplicationsPage() {
  const queryClient = useQueryClient()
  const [approveRow, setApproveRow] = useState<UnivStdApplicationRow | null>(null)
  const [approveOpen, setApproveOpen] = useState(false)

  const { data: allRows = [], isLoading } = useQuery({
    queryKey: QK.admission.univStdApplications(),
    queryFn: listUnivStdApplications,
  })

  const pending = useMemo(
    () => filterByStatus(allRows, UNIV_APP_STATUS.SUBMITTED),
    [allRows],
  )
  const approved = useMemo(
    () => filterByStatus(allRows, UNIV_APP_STATUS.APPROVED),
    [allRows],
  )
  const rejected = useMemo(
    () => filterByStatus(allRows, UNIV_APP_STATUS.REJECTED),
    [allRows],
  )

  const invalidate = () =>
    void queryClient.invalidateQueries({ queryKey: QK.admission.univStdApplications() })

  const handleReject = async (row: UnivStdApplicationRow) => {
    try {
      const formData = new FormData()
      formData.append(
        'data',
        JSON.stringify({
          univAppId: row.univAppId,
          applicationStatusCatdetId: UNIV_APP_STATUS.REJECTED,
          appStatusUpdatedDate: new Date().toISOString(),
        }),
      )
      await updateUnivStdApplication(formData)
      toastSuccess('Application rejected')
      invalidate()
    } catch (err) {
      toastError(err)
    }
  }

  const makePendingActions = () => (p: ICellRendererParams<UnivStdApplicationRow>) => {
    const row = p.data
    if (!row) return null
    return (
      <div className="flex gap-0.5">
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0 text-green-600"
          aria-label="Approve"
          onClick={() => {
            setApproveRow(row)
            setApproveOpen(true)
          }}
        >
          <CheckIcon className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0 text-destructive"
          aria-label="Reject"
          onClick={() => void handleReject(row)}
        >
          <XIcon className="h-3.5 w-3.5" />
        </Button>
      </div>
    )
  }

  const pendingCols = useMemo<ColDef<UnivStdApplicationRow>[]>(
    () => [
      BASE_COLS.siNo,
      BASE_COLS.universityCode,
      BASE_COLS.applicationNo,
      BASE_COLS.firstName,
      BASE_COLS.stdEmailId,
      BASE_COLS.mobile,
      BASE_COLS.applicationStatusName,
      { field: 'dateOfRegistration', headerName: 'Registered', minWidth: 110 },
      { ...BASE_COLS.actions, cellRenderer: makePendingActions() },
    ],
    [],
  )

  const approvedCols = useMemo<ColDef<UnivStdApplicationRow>[]>(
    () => [
      BASE_COLS.siNo,
      BASE_COLS.universityCode,
      BASE_COLS.applicationNo,
      BASE_COLS.firstName,
      BASE_COLS.stdEmailId,
      BASE_COLS.mobile,
      BASE_COLS.applicationStatusName,
      { field: 'dateOfApprovedRegistration', headerName: 'Approved', minWidth: 110 },
      { field: 'college', headerName: 'College', minWidth: 100 },
      { field: 'course', headerName: 'Course', minWidth: 100 },
      { field: 'CourseGroup', headerName: 'Group', minWidth: 90 },
    ],
    [],
  )

  const rejectedCols = useMemo<ColDef<UnivStdApplicationRow>[]>(
    () => [
      BASE_COLS.siNo,
      BASE_COLS.universityCode,
      BASE_COLS.applicationNo,
      BASE_COLS.firstName,
      BASE_COLS.stdEmailId,
      BASE_COLS.mobile,
      BASE_COLS.applicationStatusName,
      { field: 'dateOfRegistration', headerName: 'Registered', minWidth: 110 },
    ],
    [],
  )

  return (
    <PageContainer className="space-y-5">
      <div className="app-card overflow-hidden px-4 py-3">
        <h1 className="text-[15px] font-semibold leading-tight text-[hsl(var(--card-title))]">
          Student Applications
        </h1>
      </div>

      <TableCard withHeaderBorder={false}>
        <DataTable
          rowData={pending}
          columnDefs={pendingCols}
          loading={isLoading}
          pagination
          toolbar={{ search: true, searchPlaceholder: 'Search applications…' }}
        />
      </TableCard>

      {approved.length > 0 && (
        <>
          <div className="app-card overflow-hidden px-4 py-3">
            <h2 className="text-[14px] font-semibold leading-tight text-[hsl(var(--card-title))]">
              Approved Student Applications List
            </h2>
          </div>
          <TableCard withHeaderBorder={false}>
            <DataTable
              rowData={approved}
              columnDefs={approvedCols}
              loading={isLoading}
              pagination
              toolbar={{ search: true, searchPlaceholder: 'Search approved…' }}
            />
          </TableCard>
        </>
      )}

      {rejected.length > 0 && (
        <>
          <div className="app-card overflow-hidden px-4 py-3">
            <h2 className="text-[14px] font-semibold leading-tight text-[hsl(var(--card-title))]">
              Rejected Student Applications List
            </h2>
          </div>
          <TableCard withHeaderBorder={false}>
            <DataTable
              rowData={rejected}
              columnDefs={rejectedCols}
              loading={isLoading}
              pagination
              toolbar={{ search: true, searchPlaceholder: 'Search rejected…' }}
            />
          </TableCard>
        </>
      )}

      <ApproveApplicationModal
        open={approveOpen}
        onClose={() => {
          setApproveOpen(false)
          setApproveRow(null)
        }}
        row={approveRow}
        onSaved={invalidate}
      />
    </PageContainer>
  )
}
