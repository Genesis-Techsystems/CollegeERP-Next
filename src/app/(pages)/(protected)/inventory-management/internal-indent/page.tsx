'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { PencilIcon, PlusIcon } from 'lucide-react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { DataTable, TableCard } from '@/common/components/table'
import { StatusBadge } from '@/common/components/data-display'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { useCrudList } from '@/hooks/useCrudList'
import { QK } from '@/lib/query-keys'
import { rowIndexGetter } from '@/lib/utils'
import { listInvInternalIndents } from '@/services'
import type { InvInternalIndentListRow } from '@/types/inventory'

const COL_DEFS = {
  siNo: { headerName: 'SI No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<InvInternalIndentListRow>,
  internalIndNo: { field: 'internalIndNo', headerName: 'Indent No', minWidth: 120 } as ColDef<InvInternalIndentListRow>,
  indentDate: { field: 'indentDate', headerName: 'Indent Date', minWidth: 110 } as ColDef<InvInternalIndentListRow>,
  purpose: { field: 'purpose', headerName: 'Purpose', minWidth: 160, flex: 1 } as ColDef<InvInternalIndentListRow>,
  isActive: { field: 'isActive', headerName: 'Status', minWidth: 100 } as ColDef<InvInternalIndentListRow>,
  actions: { headerName: 'Actions', minWidth: 86, flex: 0, width: 86 } as ColDef<InvInternalIndentListRow>,
}

function statusRenderer(p: ICellRendererParams<InvInternalIndentListRow>) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

function makeActionsRenderer(router: ReturnType<typeof useRouter>) {
  return (p: ICellRendererParams<InvInternalIndentListRow>) => {
    const row = p.data
    if (!row) return null
    return (
      <Button
        size="sm"
        variant="ghost"
        className="h-8 w-8 p-0"
        aria-label="Edit internal indent"
        onClick={() => {
          const params = new URLSearchParams({ id: String(row.internalIndId ?? '') })
          router.push(`/inventory-management/internal-indent/edit?${params}`)
        }}
      >
        <PencilIcon className="h-3.5 w-3.5" />
      </Button>
    )
  }
}

export default function InternalIndentPage() {
  const router = useRouter()

  const { data: rows, isLoading } = useCrudList<InvInternalIndentListRow>({
    queryKey: QK.invInternalIndents.list(),
    queryFn: listInvInternalIndents,
  })

  const columnDefs = useMemo<ColDef<InvInternalIndentListRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.internalIndNo,
      COL_DEFS.indentDate,
      COL_DEFS.purpose,
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      { ...COL_DEFS.actions, cellRenderer: makeActionsRenderer(router) },
    ],
    [router],
  )

  return (
    <PageContainer className="space-y-5">
      <div className="app-card overflow-hidden px-4 py-3">
        <h2 className="text-[15px] font-semibold text-[hsl(var(--card-title))]">Internal Indent</h2>
      </div>

      <TableCard withHeaderBorder={false}>
        <DataTable
          rowData={rows}
          columnDefs={columnDefs}
          loading={isLoading}
          pagination
          toolbar={{
            search: true,
            searchPlaceholder: 'Search internal indents…',
            pdfDocumentTitle: 'Internal Indent',
          }}
          toolbarTrailing={(
            <Button
              size="sm"
              className="h-[30px] px-3 text-[12px]"
              onClick={() => router.push('/inventory-management/internal-indent/add')}
            >
              <PlusIcon className="h-3.5 w-3.5 mr-1.5" />
              Add Internal Indent
            </Button>
          )}
        />
      </TableCard>
    </PageContainer>
  )
}
