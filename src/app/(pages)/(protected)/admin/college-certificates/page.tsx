'use client'

import { useMemo, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { FileBadge, PencilIcon, PlusIcon } from 'lucide-react'
import { DataTable } from '@/common/components/table'
import { StatusBadge } from '@/common/components/data-display'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { useCrudList } from '@/hooks/useCrudList'
import { QK } from '@/lib/query-keys'
import { rowIndexGetter } from '@/lib/utils'
import { listCollegeCertificates } from '@/services'
import type { CollegeCertificate } from '@/types/college-certificate'
import CollegeCertificateModal from './CollegeCertificateModal'

const COL_DEFS = {
  siNo: { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<CollegeCertificate>,
  code: { headerName: 'Certificate Code', minWidth: 130, flex: 1 } as ColDef<CollegeCertificate>,
  name: { headerName: 'Certificate', minWidth: 170, flex: 1.2 } as ColDef<CollegeCertificate>,
  amount: { field: 'amount', headerName: 'Amount', minWidth: 100, flex: 0.8 } as ColDef<CollegeCertificate>,
  duplicateAmount: { field: 'duplicateCertificateAmount', headerName: 'Duplicate Amt', minWidth: 120, flex: 0.9 } as ColDef<CollegeCertificate>,
  college: { headerName: 'College', minWidth: 110, flex: 0.9 } as ColDef<CollegeCertificate>,
  campus: { headerName: 'Campus', minWidth: 110, flex: 0.9 } as ColDef<CollegeCertificate>,
  isActive: { field: 'isActive', headerName: 'Status', minWidth: 90, flex: 0.7 } as ColDef<CollegeCertificate>,
  actions: { headerName: 'Actions', minWidth: 86, width: 86, flex: 0 } as ColDef<CollegeCertificate>,
}

function pickText(row: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = row[key]
    if (typeof value === 'string' && value.trim()) return value
  }
  return ''
}

function statusRenderer(p: ICellRendererParams<CollegeCertificate>) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

function actionsRenderer(
  setEditing: (row: CollegeCertificate | null) => void,
  setModalOpen: (open: boolean) => void,
) {
  return (p: ICellRendererParams<CollegeCertificate>) => (
    <Button
      size="sm"
      variant="ghost"
      className="h-8 w-8 p-0"
      aria-label="Edit certificate"
      onClick={() => { setEditing(p.data ?? null); setModalOpen(true) }}
    >
      <PencilIcon className="h-3.5 w-3.5" />
    </Button>
  )
}

export default function CollegeCertificatesPage() {
  const [open, setOpen] = useState(false)
  const [row, setRow] = useState<CollegeCertificate | null>(null)

  const { data, isLoading, invalidate } = useCrudList({
    queryKey: QK.collegeCertificates.list(),
    queryFn: listCollegeCertificates,
  })

  const columnDefs = useMemo<ColDef<CollegeCertificate>[]>(() => [
    COL_DEFS.siNo,
    { ...COL_DEFS.code, valueGetter: (p) => pickText((p.data ?? {}) as Record<string, unknown>, ['certifcateCode', 'certificateCode']) },
    COL_DEFS.name,
    COL_DEFS.amount,
    COL_DEFS.duplicateAmount,
    { ...COL_DEFS.college, valueGetter: (p) => pickText((p.data ?? {}) as Record<string, unknown>, ['collegeCode', 'collegeName']) },
    { ...COL_DEFS.campus, valueGetter: (p) => pickText((p.data ?? {}) as Record<string, unknown>, ['campusCode', 'campusName']) },
    { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
    { ...COL_DEFS.actions, cellRenderer: actionsRenderer(setRow, setOpen) },
  ], [])

  return (
    <PageContainer className="space-y-4">
      <div className="app-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/40">
          <h2 className="app-card-title">College Certificates</h2>
        </div>
        <div className="px-3 pb-3 pt-2">
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            {!isLoading && data.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <FileBadge className="h-10 w-10 mb-3 opacity-40" />
                <p className="text-sm">No college certificates found</p>
              </div>
            ) : (
              <DataTable
                rowData={data}
                columnDefs={columnDefs}
                loading={isLoading}
                pagination
                toolbar={{ search: true, searchPlaceholder: 'Search certificates…', pdfDocumentTitle: 'College Certificates' }}
                toolbarTrailing={
                  <Button size="sm" onClick={() => { setRow(null); setOpen(true) }}>
                    <PlusIcon className="h-4 w-4 mr-1" />
                    Add Certificate
                  </Button>
                }
              />
            )}
          </div>
        </div>
      </div>

      <CollegeCertificateModal open={open} onClose={() => { setOpen(false); setRow(null) }} row={row} onSaved={invalidate} />
    </PageContainer>
  )
}
