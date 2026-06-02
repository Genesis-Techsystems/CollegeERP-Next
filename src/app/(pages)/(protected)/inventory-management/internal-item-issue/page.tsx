'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { PlusIcon } from 'lucide-react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { DataTable, TableCard } from '@/common/components/table'
import { StatusBadge } from '@/common/components/data-display'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { useCrudList } from '@/hooks/useCrudList'
import { QK } from '@/lib/query-keys'
import { rowIndexGetter } from '@/lib/utils'
import { listInvInternalIssues } from '@/services'
import type { InvInternalIssue } from '@/types/inventory'

const COL_DEFS = {
  siNo: { headerName: 'SI No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<InvInternalIssue>,
  internalIssueNo: { field: 'internalIssueNo', headerName: 'Issue No', minWidth: 110 } as ColDef<InvInternalIssue>,
  issueDate: { field: 'issueDate', headerName: 'Issue Date', minWidth: 110 } as ColDef<InvInternalIssue>,
  storeCode: { field: 'storeCode', headerName: 'Store', minWidth: 100 } as ColDef<InvInternalIssue>,
  toEmpName: { field: 'toEmpName', headerName: 'To Employee', minWidth: 140 } as ColDef<InvInternalIssue>,
  quantity: { field: 'Quantity', headerName: 'Quantity', minWidth: 90 } as ColDef<InvInternalIssue>,
  isActive: { field: 'isActive', headerName: 'Status', minWidth: 100 } as ColDef<InvInternalIssue>,
}

function statusRenderer(p: ICellRendererParams<InvInternalIssue>) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

export default function InternalItemIssuePage() {
  const router = useRouter()

  const { data: rows, isLoading } = useCrudList<InvInternalIssue>({
    queryKey: QK.invInternalIssues.list(),
    queryFn: listInvInternalIssues,
  })

  const columnDefs = useMemo<ColDef<InvInternalIssue>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.internalIssueNo,
      COL_DEFS.issueDate,
      COL_DEFS.storeCode,
      COL_DEFS.toEmpName,
      COL_DEFS.quantity,
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
    ],
    [],
  )

  return (
    <PageContainer className="space-y-5">
      <div className="app-card overflow-hidden px-4 py-3">
        <h2 className="text-[15px] font-semibold text-[hsl(var(--card-title))]">Internal Item Issue</h2>
      </div>

      <TableCard withHeaderBorder={false}>
        <DataTable
          rowData={rows}
          columnDefs={columnDefs}
          loading={isLoading}
          pagination
          toolbar={{
            search: true,
            searchPlaceholder: 'Search internal item issues…',
            pdfDocumentTitle: 'Internal Item Issue',
          }}
          toolbarTrailing={(
            <Button
              size="sm"
              className="h-[30px] px-3 text-[12px]"
              onClick={() => router.push('/inventory-management/internal-item-issue/add')}
            >
              <PlusIcon className="h-3.5 w-3.5 mr-1.5" />
              Add Internal Item Issue
            </Button>
          )}
        />
      </TableCard>
    </PageContainer>
  )
}
