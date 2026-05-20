'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { useQuery } from '@tanstack/react-query'
import { DataTable, TableCard } from '@/common/components/table'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { QK } from '@/lib/query-keys'
import { rowIndexGetter } from '@/lib/utils'
import { listSchStdPreceedings } from '@/services'
import type { SchStdPreceeding } from '@/types/scholarship'

const COL_DEFS = {
  siNo: { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<SchStdPreceeding>,
  rollNumber: { field: 'rollNumber', headerName: 'Roll No', minWidth: 100, flex: 0.7 } as ColDef<SchStdPreceeding>,
  firstName: { field: 'firstName', headerName: 'Student', minWidth: 160, flex: 1.1 } as ColDef<SchStdPreceeding>,
  scholarshipAmount: { field: 'scholarshipAmount', headerName: 'Scholarship', minWidth: 100, flex: 0.7 } as ColDef<SchStdPreceeding>,
  paidAmount: { field: 'paidAmount', headerName: 'Paid', minWidth: 90, flex: 0.6 } as ColDef<SchStdPreceeding>,
  dueAmount: { field: 'dueAmount', headerName: 'Due', minWidth: 90, flex: 0.6 } as ColDef<SchStdPreceeding>,
  actions: { headerName: 'Actions', minWidth: 100, width: 100, flex: 0 } as ColDef<SchStdPreceeding>,
}

export default function ViewStdPreceedingsPage() {
  const searchParams = useSearchParams()
  const schPreceedingId = Number(searchParams.get('schPreceedingId') ?? 0)

  const { data: rows = [], isLoading } = useQuery({
    queryKey: QK.schStdPreceedings.list(schPreceedingId),
    queryFn: () => listSchStdPreceedings(schPreceedingId),
    enabled: schPreceedingId > 0,
  })

  const columnDefs = useMemo<ColDef<SchStdPreceeding>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.rollNumber,
      COL_DEFS.firstName,
      COL_DEFS.scholarshipAmount,
      COL_DEFS.paidAmount,
      COL_DEFS.dueAmount,
      {
        ...COL_DEFS.actions,
        cellRenderer: (p: ICellRendererParams<SchStdPreceeding>) => {
          const row = p.data
          if (!row) return null
          return (
            <Button size="sm" variant="ghost" className="h-8 text-[11px]" asChild>
              <Link
                href={`/scholarship-management/scholarship-payment?schStdPreceedingId=${row.schStdPreceedingId}&schPreceedingId=${schPreceedingId}`}
              >
                Pay
              </Link>
            </Button>
          )
        },
      },
    ],
    [schPreceedingId],
  )

  return (
    <PageContainer className="space-y-5">
      <div className="app-card overflow-hidden px-4 py-3 flex items-center justify-between">
        <h1 className="text-[15px] font-semibold leading-tight text-[hsl(var(--card-title))]">
          Student Proceedings
        </h1>
        <Button variant="outline" size="sm" asChild>
          <Link href="/scholarship-management/preceeding-details">Back to Proceedings</Link>
        </Button>
      </div>
      <TableCard withHeaderBorder={false}>
        <DataTable
          rowData={rows}
          columnDefs={columnDefs}
          loading={isLoading}
          pagination
          toolbar={{ search: true, searchPlaceholder: 'Search students…' }}
        />
      </TableCard>
    </PageContainer>
  )
}
