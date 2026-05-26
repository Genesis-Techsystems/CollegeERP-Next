'use client'

import { useMemo, useState } from 'react'
import type { ColDef } from 'ag-grid-community'
import { useQuery } from '@tanstack/react-query'
import { DataTable, TableCard } from '@/common/components/table'
import { FilterCard, FILTER_CARD_SELECT_CLASS } from '@/common/components/feedback'
import { Select } from '@/common/components/select'
import { DatePicker } from '@/common/components/date-picker'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { QK } from '@/lib/query-keys'
import { format } from 'date-fns'
import { getCertificateSummaryReport } from '@/services'
import type { CertificateSummaryReportRow } from '@/types/tc-no-due'
import { TcPageTitle } from '../_components/TcPageTitle'
import { useTcCollegeCascade } from '../_lib/use-tc-college-cascade'

export default function CertificateRequestReportPage() {
  const [collegeId, setCollegeId] = useState<string | null>(null)
  const [fromDate, setFromDate] = useState<Date | null>(new Date())
  const [toDate, setToDate] = useState<Date | null>(new Date())
  const [runKey, setRunKey] = useState(0)

  const collegeNum = Number(collegeId ?? 0)
  const fromStr = fromDate ? format(fromDate, 'yyyy-MM-dd') : ''
  const toStr = toDate ? format(toDate, 'yyyy-MM-dd') : ''
  const { colleges, loadingColleges } = useTcCollegeCascade(collegeNum)

  const { data: rows = [], isLoading, isFetching } = useQuery({
    queryKey: [...QK.tcNoDue.summaryReport(collegeNum, fromStr, toStr), runKey],
    queryFn: () =>
      getCertificateSummaryReport({
        collegeId: collegeNum,
        fromDate: fromStr,
        toDate: toStr,
      }),
    enabled: collegeNum > 0 && !!fromStr && !!toStr && runKey > 0,
  })

  const columnDefs = useMemo<ColDef<CertificateSummaryReportRow>[]>(() => {
    if (rows.length === 0) return []
    const keys = Object.keys(rows[0]).filter((k) => k !== 'id')
    return keys.map((key) => ({
      field: key,
      headerName: key.replace(/_/g, ' '),
      minWidth: 120,
    }))
  }, [rows])

  return (
    <PageContainer className="space-y-5">
      <TcPageTitle title="Certificate Request Report" />

      <FilterCard title="Report filters">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Select
            label="College"
            className={FILTER_CARD_SELECT_CLASS}
            value={collegeId}
            onChange={setCollegeId}
            options={colleges}
            placeholder="Select college"
            searchable
            isLoading={loadingColleges}
          />
          <DatePicker label="From date" value={fromDate} onChange={setFromDate} />
          <DatePicker label="To date" value={toDate} onChange={setToDate} />
          <div className="flex items-end">
            <Button
              type="button"
              disabled={!collegeNum || !fromStr || !toStr}
              onClick={() => setRunKey((k) => k + 1)}
            >
              Generate report
            </Button>
          </div>
        </div>
      </FilterCard>

      <TableCard headerLeft={<span className="text-sm font-semibold">Report</span>} withHeaderBorder={false}>
        <DataTable
          columnDefs={columnDefs}
          rowData={rows}
          loading={isLoading || isFetching}
          height="auto"
        />
      </TableCard>
    </PageContainer>
  )
}
