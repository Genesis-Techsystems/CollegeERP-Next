'use client'

import { useMemo, useState } from 'react'
import type { ColDef } from 'ag-grid-community'
import { useQuery } from '@tanstack/react-query'
import { FILTER_CARD_SELECT_CLASS } from '@/common/components/feedback'
import { Select } from '@/common/components/select'
import { DatePicker } from '@/common/components/date-picker'
import { FilteredListPage } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { QK } from '@/lib/query-keys'
import { getVisitorsSummaryReport, toHostelApiDate } from '@/services'
import { useHostelSelect } from '../_lib/use-hostel-select'

export default function MonthlyVisitorSummaryReportPage() {
  const [hostelId, setHostelId] = useState<string | null>(null)
  const [fromDate, setFromDate] = useState<Date | null>(new Date())
  const [toDate, setToDate] = useState<Date | null>(new Date())
  const [runKey, setRunKey] = useState(0)
  const { hostels, loadingHostels } = useHostelSelect()

  const hostelNum = Number(hostelId ?? 0)
  const fromStr = toHostelApiDate(fromDate) ?? ''
  const toStr = toHostelApiDate(toDate) ?? ''

  const { data: rows = [], isLoading, isFetching } = useQuery({
    queryKey: [...QK.hostel.visitorsReport(hostelNum, fromStr, toStr), runKey],
    queryFn: () =>
      getVisitorsSummaryReport({
        hostelId: hostelNum,
        fromDate: fromStr,
        toDate: toStr,
      }),
    enabled: hostelNum > 0 && !!fromStr && !!toStr && runKey > 0,
  })

  const columnDefs = useMemo<ColDef<Record<string, unknown>>[]>(() => {
    if (rows.length === 0) return []
    return Object.keys(rows[0]).map((key) => ({
      field: key,
      headerName: key.replace(/_/g, ' '),
      minWidth: 120,
    }))
  }, [rows])

  return (
    <FilteredListPage
      title="Monthly Visitor Summary Report"
      filters={(
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Select
            label="Hostel"
            className={FILTER_CARD_SELECT_CLASS}
            value={hostelId}
            onChange={setHostelId}
            options={hostels}
            searchable
            isLoading={loadingHostels}
          />
          <DatePicker label="From date" value={fromDate} onChange={setFromDate} />
          <DatePicker label="To date" value={toDate} onChange={setToDate} />
          <div className="flex items-end">
            <Button
              type="button"
              disabled={!hostelNum}
              onClick={() => setRunKey((k) => k + 1)}
            >
              Generate
            </Button>
          </div>
        </div>
      )}
      rowData={rows}
      columnDefs={columnDefs}
      loading={isLoading || isFetching}
      height="auto"
      toolbar={{ search: true, searchPlaceholder: 'Search report…', pdfDocumentTitle: 'Monthly Visitor Summary Report' }}
    />
  )
}
