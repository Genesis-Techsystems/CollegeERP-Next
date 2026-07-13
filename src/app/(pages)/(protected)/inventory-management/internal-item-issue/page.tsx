'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { PlusIcon } from 'lucide-react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { ListPage } from '@/components/layout'
import { StatusBadge } from '@/common/components/data-display'
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
    <ListPage
      title="Internal Item Issue"
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
          onClick={() => router.push('/inventory-management/internal-item-issue/add')}
        >
          <PlusIcon className="h-4 w-4 mr-1" />
          Add Internal Item Issue
        </Button>
      )}
    />
  )
}
