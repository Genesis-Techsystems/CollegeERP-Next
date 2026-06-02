'use client'

import { useCallback, useMemo, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { BookMarked, PencilIcon, PlusIcon } from 'lucide-react'
import { PageContainer } from '@/components/layout'
import { DataTable } from '@/common/components/table'
import { DatePicker } from '@/common/components/date-picker'
import { Select, type SelectOption } from '@/common/components/select'
import { StatusBadge } from '@/common/components/data-display'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { QK } from '@/lib/query-keys'
import { rowIndexGetter } from '@/lib/utils'
import { getErrorMessage } from '@/lib/errors'
import {
  createFinBudgetMidyearEstimation,
  listFinBudgetMidyearEstimations,
  listFinCategoriesByCollegeAndAccountType,
  listFinSubCategoriesByCategory,
  updateFinBudgetMidyearEstimation,
} from '@/services'
import type { FinBudgetMidyearEstimation } from '@/types/finance'
import { formatFinanceNumber } from '../_lib/finance-format'
import { useFinanceCascade } from '../_lib/use-finance-cascade'

const COL_DEFS = {
  siNo: { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<FinBudgetMidyearEstimation>,
  accounttype_name: { field: 'accounttype_name', headerName: 'Account type', minWidth: 120, flex: 1 } as ColDef<FinBudgetMidyearEstimation>,
  fin_category_name: { field: 'fin_category_name', headerName: 'Category', minWidth: 120, flex: 1 } as ColDef<FinBudgetMidyearEstimation>,
  sub_category_name: { field: 'sub_category_name', headerName: 'Sub category', minWidth: 120, flex: 1 } as ColDef<FinBudgetMidyearEstimation>,
  actualAmount: { field: 'actualAmount', headerName: 'Actual', minWidth: 90, flex: 0.7 } as ColDef<FinBudgetMidyearEstimation>,
  estimatedAmount: { field: 'estimatedAmount', headerName: 'Estimated', minWidth: 90, flex: 0.7 } as ColDef<FinBudgetMidyearEstimation>,
  nextyrProposedAmount: { field: 'nextyrProposedAmount', headerName: 'Next year proposed', minWidth: 110, flex: 0.8 } as ColDef<FinBudgetMidyearEstimation>,
  isActive: { field: 'isActive', headerName: 'Status', minWidth: 90, flex: 0 } as ColDef<FinBudgetMidyearEstimation>,
  actions: { headerName: 'Actions', minWidth: 80, width: 80, flex: 0 } as ColDef<FinBudgetMidyearEstimation>,
}

function toSelectOptions(items: { value: number; label: string }[]): SelectOption[] {
  return items.map((item) => ({ value: String(item.value), label: item.label }))
}

function amountRenderer(p: ICellRendererParams<FinBudgetMidyearEstimation>) {
  return <span className="text-xs tabular-nums">{formatFinanceNumber(p.value)}</span>
}

function statusRenderer(p: ICellRendererParams<FinBudgetMidyearEstimation>) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

function makeActionsRenderer(onEdit: (row: FinBudgetMidyearEstimation) => void) {
  return (p: ICellRendererParams<FinBudgetMidyearEstimation>) => (
    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => p.data && onEdit(p.data)}>
      <PencilIcon className="h-3.5 w-3.5" />
    </Button>
  )
}

type FormState = {
  accountTypeId: number
  finCategoryId: number
  finSubCategoryId: number
  actualAmount: string
  estimatedAmount: string
  nextyrProposedAmount: string
  estimationFromDate: Date
  estimationToDate: Date
  isActive: boolean
}

type LoadedContext = {
  entityId: number
  yearId: number
  collegeLabel: string
  entityLabel: string
  yearLabel: string
}

const emptyForm = (): FormState => ({
  accountTypeId: 0,
  finCategoryId: 0,
  finSubCategoryId: 0,
  actualAmount: '',
  estimatedAmount: '',
  nextyrProposedAmount: '',
  estimationFromDate: new Date(),
  estimationToDate: new Date(),
  isActive: true,
})

export default function BudgetMidYearPage() {
  const cascade = useFinanceCascade({ withAccountType: true })
  const queryClient = useQueryClient()
  const [loadedContext, setLoadedContext] = useState<LoadedContext | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<FinBudgetMidyearEstimation | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)

  const { data: rows = [], isFetching, error } = useQuery({
    queryKey: QK.finBudgetMidyear(
      loadedContext?.entityId ?? 0,
      loadedContext?.yearId ?? 0,
    ),
    queryFn: () => listFinBudgetMidyearEstimations(loadedContext!.entityId, loadedContext!.yearId),
    enabled: loadedContext != null,
  })

  const { data: categories = [] } = useQuery({
    queryKey: QK.finCategories.byCollegeAccountType(cascade.collegeId, form.accountTypeId),
    queryFn: () => listFinCategoriesByCollegeAndAccountType(cascade.collegeId, form.accountTypeId),
    enabled: modalOpen && cascade.collegeId > 0 && form.accountTypeId > 0,
  })

  const { data: subCategories = [] } = useQuery({
    queryKey: QK.finSubCategories.byCategory(form.finCategoryId),
    queryFn: () => listFinSubCategoriesByCategory(form.finCategoryId),
    enabled: modalOpen && form.finCategoryId > 0,
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!loadedContext) return
      const payload = {
        accountEntityId: loadedContext.entityId,
        financialYearId: loadedContext.yearId,
        accountTypeId: form.accountTypeId,
        finCategoryId: form.finCategoryId,
        finSubCategoryId: form.finSubCategoryId,
        actualAmount: form.actualAmount ? Number(form.actualAmount) : null,
        estimatedAmount: form.estimatedAmount ? Number(form.estimatedAmount) : null,
        nextyrProposedAmount: form.nextyrProposedAmount ? Number(form.nextyrProposedAmount) : null,
        estimationFromDate: format(form.estimationFromDate, 'yyyy-MM-dd'),
        estimationToDate: format(form.estimationToDate, 'yyyy-MM-dd'),
        isActive: form.isActive,
        reason: form.isActive ? 'active' : 'inactive',
      }
      if (editing?.finBudgetMidyrEstimationId) {
        await updateFinBudgetMidyearEstimation(editing.finBudgetMidyrEstimationId, payload)
      } else {
        await createFinBudgetMidyearEstimation(payload)
      }
    },
    onSuccess: async () => {
      if (!loadedContext) return
      await queryClient.invalidateQueries({
        queryKey: QK.finBudgetMidyear(loadedContext.entityId, loadedContext.yearId),
      })
      setModalOpen(false)
      setEditing(null)
      setForm(emptyForm())
    },
  })

  const getList = useCallback(() => {
    if (!cascade.filtersValid) return
    const collegeLabel = cascade.colleges.find((c) => c.value === cascade.collegeId)?.label ?? 'null'
    const entityLabel = cascade.entities.find((e) => e.value === cascade.accountEntityId)?.label ?? 'null'
    const yearLabel = cascade.years.find((y) => y.value === cascade.financialYearId)?.label ?? 'null'
    setLoadedContext({
      entityId: cascade.accountEntityId,
      yearId: cascade.financialYearId,
      collegeLabel,
      entityLabel,
      yearLabel,
    })
  }, [cascade])

  const openCreate = useCallback(() => {
    setEditing(null)
    setForm({
      ...emptyForm(),
      accountTypeId: cascade.accountTypeId || 0,
    })
    setModalOpen(true)
  }, [cascade.accountTypeId])

  const openEdit = useCallback((row: FinBudgetMidyearEstimation) => {
    setEditing(row)
    setForm({
      accountTypeId: row.accountTypeId ?? 0,
      finCategoryId: row.finCategoryId ?? 0,
      finSubCategoryId: row.finSubCategoryId ?? 0,
      actualAmount: row.actualAmount != null ? String(row.actualAmount) : '',
      estimatedAmount: row.estimatedAmount != null ? String(row.estimatedAmount) : '',
      nextyrProposedAmount: row.nextyrProposedAmount != null ? String(row.nextyrProposedAmount) : '',
      estimationFromDate: row.estimationFromDate ? new Date(row.estimationFromDate) : new Date(),
      estimationToDate: row.estimationToDate ? new Date(row.estimationToDate) : new Date(),
      isActive: row.isActive ?? true,
    })
    setModalOpen(true)
  }, [])

  const columnDefs = useMemo(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.accounttype_name,
      COL_DEFS.fin_category_name,
      COL_DEFS.sub_category_name,
      { ...COL_DEFS.actualAmount, cellRenderer: amountRenderer },
      { ...COL_DEFS.estimatedAmount, cellRenderer: amountRenderer },
      { ...COL_DEFS.nextyrProposedAmount, cellRenderer: amountRenderer },
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      { ...COL_DEFS.actions, cellRenderer: makeActionsRenderer(openEdit) },
    ],
    [openEdit],
  )

  const resultsTitle = loadedContext
    ? `Budget Mid Year Estimation - ${loadedContext.collegeLabel}/${loadedContext.entityLabel}/${loadedContext.yearLabel}`
    : ''

  return (
    <PageContainer className="space-y-4">
      <div className="app-card p-3 border-t-[3px] border-t-amber-300">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <BookMarked className="h-4 w-4 text-blue-700 shrink-0" aria-hidden />
          <h2 className="app-card-title">Budget Mid Year Estimation</h2>
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div className="min-w-[180px] flex-1">
            <Select
              label="College"
              required
              value={cascade.collegeId ? String(cascade.collegeId) : null}
              onChange={(v) => cascade.setCollegeId(v ? Number(v) : 0)}
              options={toSelectOptions(cascade.colleges)}
              placeholder="Select college"
              isLoading={cascade.isLoading}
            />
          </div>
          <div className="min-w-[180px] flex-1">
            <Select
              label="Entity"
              required
              value={cascade.accountEntityId ? String(cascade.accountEntityId) : null}
              onChange={(v) => cascade.setAccountEntityId(v ? Number(v) : 0)}
              options={toSelectOptions(cascade.entities)}
              placeholder="Select entity"
              disabled={!cascade.collegeId}
            />
          </div>
          <div className="min-w-[180px] flex-1">
            <Select
              label="Financial Year"
              required
              value={cascade.financialYearId ? String(cascade.financialYearId) : null}
              onChange={(v) => cascade.setFinancialYearId(v ? Number(v) : 0)}
              options={toSelectOptions(cascade.years)}
              placeholder="Select year"
              disabled={!cascade.accountEntityId}
            />
          </div>
          <Button
            type="button"
            className="shrink-0 ml-auto"
            onClick={getList}
            disabled={!cascade.filtersValid || isFetching}
          >
            {isFetching ? 'Loading…' : 'Get List'}
          </Button>
        </div>
      </div>

      {cascade.isError ? (
        <p className="text-sm text-destructive">{getErrorMessage(cascade.error)}</p>
      ) : null}
      {error ? <p className="text-sm text-destructive">{getErrorMessage(error)}</p> : null}

      {loadedContext ? (
        <>
          <div className="app-card px-3 py-2 border-t-[3px] border-t-amber-300 border-b border-border">
            <h3 className="app-card-title">{resultsTitle}</h3>
          </div>

          <div className="app-card overflow-hidden">
            <div className="p-2">
              <DataTable
                rowData={rows}
                columnDefs={columnDefs}
                loading={isFetching}
                pagination
                toolbar={{
                  search: true,
                  searchPlaceholder: 'Search…',
                  pdfDocumentTitle: resultsTitle,
                }}
                toolbarTrailing={(
                  <Button type="button" className="h-[30px] px-3 text-[12px]" onClick={openCreate}>
                    <PlusIcon className="h-3.5 w-3.5 mr-1" />
                    Add estimation
                  </Button>
                )}
              />
            </div>
          </div>
        </>
      ) : null}

      <Dialog open={modalOpen} onOpenChange={(o) => { if (!o) { setModalOpen(false); setEditing(null) } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit estimation' : 'Add estimation'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              label="Account type"
              required
              value={form.accountTypeId ? String(form.accountTypeId) : null}
              onChange={(v) => setForm((f) => ({ ...f, accountTypeId: v ? Number(v) : 0, finCategoryId: 0, finSubCategoryId: 0 }))}
              options={toSelectOptions(cascade.accountTypes)}
            />
            <Select
              label="Category"
              required
              value={form.finCategoryId ? String(form.finCategoryId) : null}
              onChange={(v) => setForm((f) => ({ ...f, finCategoryId: v ? Number(v) : 0, finSubCategoryId: 0 }))}
              options={categories.map((c) => ({ value: String(c.finCategoryId), label: c.categoryName }))}
              disabled={!form.accountTypeId}
            />
            <Select
              label="Sub category"
              value={form.finSubCategoryId ? String(form.finSubCategoryId) : null}
              onChange={(v) => setForm((f) => ({ ...f, finSubCategoryId: v ? Number(v) : 0 }))}
              options={subCategories.map((s) => ({ value: String(s.finSubCategoryId), label: s.subCategoryName }))}
              disabled={!form.finCategoryId}
            />
            <div className="space-y-1.5">
              <Label>Actual amount</Label>
              <Input type="number" value={form.actualAmount} onChange={(e) => setForm((f) => ({ ...f, actualAmount: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Estimated amount</Label>
              <Input type="number" value={form.estimatedAmount} onChange={(e) => setForm((f) => ({ ...f, estimatedAmount: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Next year proposed</Label>
              <Input type="number" value={form.nextyrProposedAmount} onChange={(e) => setForm((f) => ({ ...f, nextyrProposedAmount: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>From date</Label>
              <DatePicker value={form.estimationFromDate} onChange={(d) => d && setForm((f) => ({ ...f, estimationFromDate: d }))} />
            </div>
            <div className="space-y-1.5">
              <Label>To date</Label>
              <DatePicker value={form.estimationToDate} onChange={(d) => d && setForm((f) => ({ ...f, estimationToDate: d }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !form.accountTypeId || !form.finCategoryId}
            >
              {saveMutation.isPending ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}
