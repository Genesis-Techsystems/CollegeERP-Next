'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { ColDef } from 'ag-grid-community'
import { DataTable, TableCard } from '@/common/components/table'
import { EmptyState } from '@/common/components/feedback'
import { Select } from '@/common/components/select'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { QK } from '@/lib/query-keys'
import { rowIndexGetter } from '@/lib/utils'
import {
  getStudentTransportReport,
  listCollegesByOrganization,
} from '@/services'
import { TransportPageTitle } from '../_components/TransportPageTitle'
import { useTransportOrgCascade } from '../_lib/use-transport-org-cascade'
import { getErrorMessage } from '@/lib/errors'

type ReportRow = Record<string, unknown>

export default function StudentTransportDetailsPage() {
  const [organizationId, setOrganizationId] = useState<number | undefined>()
  const [collegeId, setCollegeId] = useState<number | undefined>()
  const [transportDetailId, setTransportDetailId] = useState<number | undefined>()
  const [colleges, setColleges] = useState<{ value: string; label: string }[]>([])
  const [applied, setApplied] = useState(false)

  const { organizations, transportDetails, loadingOrgs, loadingTransport } =
    useTransportOrgCascade(organizationId)

  const params = useMemo(
    () => ({
      organizationId: organizationId ?? 0,
      collegeId: collegeId ?? 0,
      transportDetailId: transportDetailId ?? 0,
    }),
    [organizationId, collegeId, transportDetailId],
  )

  const { data: rows = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: QK.transport.studentTransport(params),
    queryFn: () => getStudentTransportReport(params),
    enabled: applied && Boolean(organizationId && collegeId && transportDetailId),
  })

  const columnDefs = useMemo<ColDef<ReportRow>[]>(() => {
    if (rows.length === 0) {
      return [
        { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 },
        { field: 'firstName', headerName: 'Student', minWidth: 160 },
        { field: 'rollNo', headerName: 'Roll No', minWidth: 110 },
        { field: 'routeCode', headerName: 'Route', minWidth: 100 },
        { field: 'pickupRouteStopName', headerName: 'Pickup', minWidth: 140 },
      ]
    }
    const sample = rows[0] as ReportRow
    const keys = Object.keys(sample).filter((k) => !k.endsWith('Id') || k === 'studentId')
    return [
      { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 },
      ...keys.slice(0, 8).map((key) => ({
        field: key,
        headerName: key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()),
        minWidth: 120,
      })),
    ]
  }, [rows])

  async function loadColleges(orgId: number) {
    const list = await listCollegesByOrganization(orgId)
    setColleges(
      list.map((c) => ({
        value: String((c as { collegeId?: number }).collegeId),
        label: String(
          (c as { collegeCode?: string }).collegeCode ??
            (c as { collegeName?: string }).collegeName,
        ),
      })),
    )
  }

  return (
    <PageContainer className="space-y-5">
      <TransportPageTitle title="Student Transport Details" />

      <div className="app-card grid grid-cols-1 gap-3 p-4 md:grid-cols-4">
        <Select
          label="Organization *"
          value={organizationId ? String(organizationId) : null}
          onChange={(v) => {
            const id = v ? Number(v) : undefined
            setOrganizationId(id)
            setCollegeId(undefined)
            setTransportDetailId(undefined)
            if (id) void loadColleges(id).catch(() => undefined)
          }}
          options={organizations}
          searchable
          isLoading={loadingOrgs}
        />
        <Select
          label="College *"
          value={collegeId ? String(collegeId) : null}
          onChange={(v) => setCollegeId(v ? Number(v) : undefined)}
          options={colleges}
          searchable
          disabled={!organizationId}
        />
        <Select
          label="Transport *"
          value={transportDetailId ? String(transportDetailId) : null}
          onChange={(v) => setTransportDetailId(v ? Number(v) : undefined)}
          options={transportDetails}
          searchable
          isLoading={loadingTransport}
          disabled={!organizationId}
        />
        <div className="flex items-end">
          <Button
            className="w-full"
            disabled={!organizationId || !collegeId || !transportDetailId}
            onClick={() => setApplied(true)}
          >
            Search
          </Button>
        </div>
      </div>

      <TableCard withHeaderBorder={false}>
        {!applied ? (
          <EmptyState
            title="Select filters"
            description="Choose organization, college, and transport, then click Search."
          />
        ) : isError ? (
          <EmptyState
            title="Could not load report"
            description={getErrorMessage(error)}
            action={{ label: 'Retry', onClick: () => void refetch() }}
          />
        ) : (
          <DataTable
            rowData={rows as ReportRow[]}
            columnDefs={columnDefs}
            loading={isLoading}
            pagination
            toolbar={{
              search: true,
              searchPlaceholder: 'Search…',
              pdfDocumentTitle: 'Student Transport Details',
            }}
          />
        )}
      </TableCard>
    </PageContainer>
  )
}
