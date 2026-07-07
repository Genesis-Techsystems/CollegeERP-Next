'use client'

import { useMemo, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { GraduationCap, PencilIcon, PlusIcon } from 'lucide-react'
import { DataTable } from '@/common/components/table'
import { StatusBadge } from '@/common/components/data-display'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { useCrudList } from '@/hooks/useCrudList'
import { QK } from '@/lib/query-keys'
import { rowIndexGetter } from '@/lib/utils'
import { listAcademicYears } from '@/services'
import type { AcademicYear } from '@/types/academic-year'
import AcademicYearModal from './AcademicYearModal'

const COL_DEFS = {
  siNo: { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<AcademicYear>,
  orgCode: { headerName: 'Organization', minWidth: 120, flex: 0.8 } as ColDef<AcademicYear>,
  universityCode: { headerName: 'University', minWidth: 120, flex: 0.8 } as ColDef<AcademicYear>,
  academicYear: { headerName: 'Academic Year', minWidth: 130, flex: 0.9 } as ColDef<AcademicYear>,
  fromDate: { headerName: 'From Date', minWidth: 120, flex: 0.8 } as ColDef<AcademicYear>,
  toDate: { headerName: 'To Date', minWidth: 120, flex: 0.8 } as ColDef<AcademicYear>,
  isActive: { field: 'isActive', headerName: 'Status', minWidth: 90, flex: 0.7 } as ColDef<AcademicYear>,
  actions: { headerName: 'Actions', minWidth: 86, width: 86, flex: 0 } as ColDef<AcademicYear>,
}

function pickText(row: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = row[key]
    if (typeof value === 'string' && value.trim()) return value
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  }
  return ''
}

function fmtDate(value: unknown): string {
  if (typeof value !== 'string') return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString()
}

function toSearchText(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  return ''
}

function statusRenderer(p: ICellRendererParams<AcademicYear>) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

function makeActionsRenderer(
  setEditing: (row: AcademicYear | null) => void,
  setModalOpen: (open: boolean) => void,
) {
  return (p: ICellRendererParams<AcademicYear>) => (
    <Button
      size="sm"
      variant="ghost"
      className="h-8 w-8 p-0"
      aria-label="Edit academic year"
      onClick={() => { setEditing(p.data ?? null); setModalOpen(true) }}
    >
      <PencilIcon className="h-3.5 w-3.5" />
    </Button>
  )
}

export default function AcademicYearsPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [editingAcademicYear, setEditingAcademicYear] = useState<AcademicYear | null>(null)

  const { data: academicYears, isLoading: loading, invalidate } = useCrudList({
    queryKey: QK.academicYears.list(),
    queryFn: listAcademicYears,
  })

  const columnDefs = useMemo<ColDef<AcademicYear>[]>(
    () => [
      COL_DEFS.siNo,
      { ...COL_DEFS.orgCode, valueGetter: (p) => pickText((p.data ?? {}) as Record<string, unknown>, ['orgCode', 'orgcode']) },
      {
        ...COL_DEFS.universityCode,
        valueGetter: (p) => pickText((p.data ?? {}) as Record<string, unknown>, ['universityCode', 'universitycode']),
      },
      { ...COL_DEFS.academicYear, valueGetter: (p) => pickText((p.data ?? {}) as Record<string, unknown>, ['academicYear', 'academicyear']) },
      { ...COL_DEFS.fromDate, valueGetter: (p) => fmtDate((p.data as AcademicYear | undefined)?.fromDate) },
      { ...COL_DEFS.toDate, valueGetter: (p) => fmtDate((p.data as AcademicYear | undefined)?.toDate) },
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      { ...COL_DEFS.actions, cellRenderer: makeActionsRenderer(setEditingAcademicYear, setModalOpen) },
    ],
    [setEditingAcademicYear, setModalOpen],
  )

  return (
    <PageContainer className="space-y-4">
      <div className="app-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/40">
          <h2 className="app-card-title">Academic Years</h2>
        </div>
        <div className="px-3 pb-3 pt-2">
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            {!loading && academicYears.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <GraduationCap className="h-10 w-10 mb-3 opacity-40" />
                <p className="text-sm">No academic years found</p>
                <Button size="sm" className="mt-4" onClick={() => { setEditingAcademicYear(null); setModalOpen(true) }}>
                  <PlusIcon className="h-4 w-4 mr-1" />
                  Add Academic Year
                </Button>
              </div>
            ) : (
              <DataTable
                rowData={academicYears}
                columnDefs={columnDefs}
                loading={loading}
                pagination
                toolbar={{ search: true, searchPlaceholder: 'Search academic years…', pdfDocumentTitle: 'Academic Years' }}
                toolbarTrailing={
                  <Button size="sm" onClick={() => { setEditingAcademicYear(null); setModalOpen(true) }}>
                    <PlusIcon className="h-4 w-4 mr-1" />
                    Add Academic Year
                  </Button>
                }
              />
            )}
          </div>
        </div>
      </div>

      <AcademicYearModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingAcademicYear(null) }}
        academicYear={editingAcademicYear}
        existingRows={academicYears}
        onSaved={invalidate}
      />
    </PageContainer>
  )
}
