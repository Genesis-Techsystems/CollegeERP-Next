'use client'

import { useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { PencilIcon, PlusIcon } from 'lucide-react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { useQuery } from '@tanstack/react-query'
import { DataTable, TableCard } from '@/common/components/table'
import { StatusBadge } from '@/common/components/data-display'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { QK } from '@/lib/query-keys'
import { getErrorMessage } from '@/lib/errors'
import { toast } from 'sonner'
import { listPayrollCategories, listPayrollCategoryGroupsByCategoryId } from '@/services'
import { rowIndexGetter } from '@/lib/utils'

type CatRow = Record<string, unknown>

const COL_DEFS = {
  siNo: { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<CatRow>,
  code: { field: 'payrollCategoryCode', headerName: 'Category Code', minWidth: 120 } as ColDef<CatRow>,
  name: { field: 'payrollCategoryName', headerName: 'Category Name', minWidth: 150 } as ColDef<CatRow>,
  value: { field: 'value', headerName: 'Value', minWidth: 90 } as ColDef<CatRow>,
  valueType: { field: 'valueType', headerName: 'Value Type', minWidth: 110 } as ColDef<CatRow>,
  college: { field: 'collegeCode', headerName: 'College', minWidth: 100 } as ColDef<CatRow>,
  isActive: { field: 'isActive', headerName: 'Status', minWidth: 100, flex: 0 } as ColDef<CatRow>,
  actions: { headerName: 'Actions', minWidth: 80, flex: 0, width: 80 } as ColDef<CatRow>,
}

function valueTypeLabel(v: unknown): string {
  if (v === 'N') return 'Numeric'
  if (v === 'F') return 'Formula'
  return String(v ?? '')
}

function statusRenderer(p: ICellRendererParams<CatRow>) {
  return <StatusBadge status={p.data?.isActive !== false} />
}

type CategorySectionProps = {
  title: string
  description: string
  rows: CatRow[]
  loading?: boolean
  showAdd?: boolean
  onEdit: (row: CatRow) => void
}

function CategorySection({
  title,
  description,
  rows,
  loading,
  showAdd,
  onEdit,
}: CategorySectionProps) {
  const columnDefs = useMemo<ColDef<CatRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.code,
      COL_DEFS.name,
      COL_DEFS.value,
      { ...COL_DEFS.valueType, valueFormatter: (p) => valueTypeLabel(p.value) },
      COL_DEFS.college,
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      {
        ...COL_DEFS.actions,
        cellRenderer: (p: ICellRendererParams<CatRow>) => (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            aria-label="Edit payroll category"
            onClick={() => p.data && onEdit(p.data)}
          >
            <PencilIcon className="h-3.5 w-3.5" />
          </Button>
        ),
      },
    ],
    [onEdit],
  )

  return (
    <div className="app-card overflow-hidden space-y-0">
      <div className="px-4 pt-4 pb-2">
        <h3 className="text-sm font-semibold text-[hsl(var(--primary))]">{title}</h3>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </div>
      <TableCard withHeaderBorder={false} className="border-0 shadow-none rounded-none">
        <DataTable
          rowData={rows}
          columnDefs={columnDefs}
          loading={loading}
          pagination
          toolbar={{
            search: true,
            searchPlaceholder: 'Search',
            columnPicker: true,
            exportPdf: true,
            pdfDocumentTitle: title,
          }}
          toolbarTrailing={
            showAdd ? (
              <Button asChild size="sm" className="h-[30px] gap-1 px-3 text-[12px]">
                <Link href="/hr-payroll/payroll/add-payroll-category">
                  <PlusIcon className="h-3.5 w-3.5" />
                  Add Payroll Category
                </Link>
              </Button>
            ) : undefined
          }
        />
      </TableCard>
    </div>
  )
}

export function PayrollCategoryPage() {
  const router = useRouter()
  const { data: all = [], isFetching, error } = useQuery({
    queryKey: QK.hrPayroll.payrollCategories(),
    queryFn: listPayrollCategories,
  })

  const earnings = useMemo(() => all.filter((r) => r.payrollCategoryType === 'E'), [all])
  const deductions = useMemo(() => all.filter((r) => r.payrollCategoryType === 'D'), [all])
  const management = useMemo(() => all.filter((r) => r.payrollCategoryType === 'M'), [all])

  const handleEdit = useCallback(
    async (row: CatRow) => {
      const payrollCategoryId = Number(row.payrollCategoryId ?? 0)
      const code = String(row.payrollCategoryCode ?? '')
      if (!payrollCategoryId) return
      try {
        const groups = await listPayrollCategoryGroupsByCategoryId(payrollCategoryId)
        if (groups.length > 0) {
          const names = groups.map((g) => String(g.payrollGroupName ?? '')).filter(Boolean).join(', ')
          toast.info(
            `${code} Category is already assigned to ${names} groups.`,
            { description: 'Remove from payroll groups before editing.' },
          )
          return
        }
        router.push(
          `/hr-payroll/payroll/edit-payroll-category?payrollCategoryId=${payrollCategoryId}`,
        )
      } catch (e) {
        toast.error(getErrorMessage(e))
      }
    },
    [router],
  )

  return (
    <PageContainer className="space-y-5">
      <div className="app-card px-4 py-3 border-b border-slate-200">
        <h1 className="text-base font-semibold text-[hsl(var(--card-title))]">Payroll Category</h1>
      </div>
      {error ? <p className="text-sm text-destructive px-1">{getErrorMessage(error)}</p> : null}

      <CategorySection
        title="Earnings"
        description="List of payroll categories that define employee earnings."
        rows={earnings}
        loading={isFetching}
        showAdd
        onEdit={handleEdit}
      />
      <CategorySection
        title="Deductions"
        description="List of payroll categories that define employee deductions."
        rows={deductions}
        loading={isFetching}
        onEdit={handleEdit}
      />
      <CategorySection
        title="Management Deductions"
        description="List of payroll categories that define employee management deductions."
        rows={management}
        loading={isFetching}
        onEdit={handleEdit}
      />
    </PageContainer>
  )
}
