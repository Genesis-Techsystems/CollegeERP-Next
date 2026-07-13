'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { PencilIcon, PlusIcon } from 'lucide-react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { ListPage } from '@/components/layout'
import { StatusBadge } from '@/common/components/data-display'
import { Button } from '@/components/ui/button'
import { useCrudList } from '@/hooks/useCrudList'
import { QK } from '@/lib/query-keys'
import { rowIndexGetter } from '@/lib/utils'
import { listInvInternalReturns } from '@/services'
import type { InvInternalReturn } from '@/types/inventory'

const COL_DEFS = {
  siNo: { headerName: 'SI No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<InvInternalReturn>,
  storeCode: { field: 'storeCode', headerName: 'Store', minWidth: 100 } as ColDef<InvInternalReturn>,
  internalReturnNo: {
    field: 'internalReturnNo',
    headerName: 'Internal Item Return No',
    minWidth: 160,
  } as ColDef<InvInternalReturn>,
  returnDate: { field: 'returnDate', headerName: 'Return Date', minWidth: 110 } as ColDef<InvInternalReturn>,
  fromEmpName: { field: 'fromEmpName', headerName: 'Employee', minWidth: 140 } as ColDef<InvInternalReturn>,
  isActive: { field: 'isActive', headerName: 'Status', minWidth: 100 } as ColDef<InvInternalReturn>,
  actions: { headerName: 'Actions', minWidth: 86, flex: 0, width: 86 } as ColDef<InvInternalReturn>,
}

function statusRenderer(p: ICellRendererParams<InvInternalReturn>) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

function makeActionsRenderer(router: ReturnType<typeof useRouter>) {
  return (p: ICellRendererParams<InvInternalReturn>) => {
    const row = p.data
    if (!row?.interReturnId) return null
    return (
      <Button
        size="sm"
        variant="ghost"
        className="h-8 w-8 p-0"
        aria-label="Edit internal return"
        onClick={() => {
          const params = new URLSearchParams({ id: String(row.interReturnId) })
          router.push(`/inventory-management/internal-item-return/edit?${params}`)
        }}
      >
        <PencilIcon className="h-3.5 w-3.5" />
      </Button>
    )
  }
}

export default function InternalItemReturnPage() {
  const router = useRouter()

  const { data: rows, isLoading } = useCrudList<InvInternalReturn>({
    queryKey: QK.invInternalReturns.list(),
    queryFn: listInvInternalReturns,
  })

  const columnDefs = useMemo<ColDef<InvInternalReturn>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.storeCode,
      COL_DEFS.internalReturnNo,
      COL_DEFS.returnDate,
      COL_DEFS.fromEmpName,
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      { ...COL_DEFS.actions, cellRenderer: makeActionsRenderer(router) },
    ],
    [router],
  )

  return (
    <ListPage
      title="Internal Return"
      rowData={rows}
      columnDefs={columnDefs}
      loading={isLoading}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: 'Search internal returns…',
        pdfDocumentTitle: 'Internal Return',
      }}
      toolbarTrailing={(
        <Button
          size="sm"
          onClick={() => router.push('/inventory-management/internal-item-return/add')}
        >
          <PlusIcon className="h-4 w-4 mr-1" />
          Add Internal Return
        </Button>
      )}
    />
  )
}
