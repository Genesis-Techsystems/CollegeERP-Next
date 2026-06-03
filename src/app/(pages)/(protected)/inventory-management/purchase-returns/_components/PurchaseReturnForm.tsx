'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileTextIcon } from 'lucide-react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { DatePicker } from '@/common/components/date-picker'
import { Select } from '@/common/components/select'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { QK } from '@/lib/query-keys'
import { toastError, toastSuccess } from '@/lib/toast'
import { getErrorMessage } from '@/lib/errors'
import { toDateOnlyISO } from '@/common/generic-functions'
import {
  createInvPurchaseReturn,
  getInvPurchaseReturnById,
  getInvSrvById,
  listInvStockReceiptVouchers,
  updateInvPurchaseReturn,
} from '@/services'
import type { InvPurchaseReturnItemRow, InvStockReceiptVoucher, InvSrvItemRow } from '@/types/inventory'

const PR_LIST = '/inventory-management/purchase-returns'

function calcLineTotal(row: InvPurchaseReturnItemRow): InvPurchaseReturnItemRow {
  const unit = Number(row.itemUnitAmount ?? row.unitPrice) || 0
  const qty = Number(row.orderQuantity) || 0
  const discPct = Number(row.itemDiscountPercentage) || 0
  const discAmt = (unit * qty * discPct) / 100
  const itemTotalCost = unit * qty - discAmt
  const itemTotalDiscountAmount = discAmt
  return { ...row, itemTotalCost, itemTotalDiscountAmount }
}

function recalcTotals(items: InvPurchaseReturnItemRow[]) {
  let grossAmt = 0
  let disAmt = 0
  let netAmt = 0
  for (const row of items) {
    if (!row.checked || row.isActive === false) continue
    const unit = Number(row.itemUnitAmount ?? row.unitPrice) || 0
    const qty = Number(row.orderQuantity) || 0
    const discPct = Number(row.itemDiscountPercentage) || 0
    grossAmt += unit * qty
    disAmt += (unit * qty * discPct) / 100
    netAmt += Number(row.itemTotalCost) || 0
  }
  return { grossAmt, disAmt, netAmt }
}

function mapSrvItemsToReturnItems(items: InvSrvItemRow[]): InvPurchaseReturnItemRow[] {
  return items
    .filter((row) => row.isActive !== false)
    .map((row) =>
      calcLineTotal({
        ...row,
        itemUnitAmount: row.itemUnitAmount ?? row.unitPrice,
        orderQuantity: row.returnedQty ?? row.orderQuantity ?? 0,
        checked: false,
        isActive: true,
      }),
    )
}

export function PurchaseReturnForm({
  purchaseReturnId,
  listPath = PR_LIST,
}: {
  purchaseReturnId?: number
  listPath?: string
}) {
  const router = useRouter()
  const isEdit = Boolean(purchaseReturnId && purchaseReturnId > 0)

  const [srvId, setSrvId] = useState<string | null>(null)
  const [srv, setSrv] = useState<InvStockReceiptVoucher | null>(null)
  const [itemList, setItemList] = useState<InvPurchaseReturnItemRow[]>([])
  const [purchaseReturnNo, setPurchaseReturnNo] = useState('')
  const [purchaseReturnDate, setPurchaseReturnDate] = useState<Date | null>(new Date())
  const [refFile1, setRefFile1] = useState<File | null>(null)
  const [refFile2, setRefFile2] = useState<File | null>(null)

  const { data: srvList = [] } = useQuery({
    queryKey: QK.invStockReceiptVouchers.list(),
    queryFn: listInvStockReceiptVouchers,
  })

  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: QK.invPurchaseReturns.detail(purchaseReturnId ?? 0),
    queryFn: () => getInvPurchaseReturnById(purchaseReturnId!),
    enabled: isEdit,
  })

  const srvOptions = useMemo(
    () =>
      srvList.map((s) => ({
        value: String(s.srvId),
        label: s.srvNo ?? String(s.srvId),
      })),
    [srvList],
  )

  const { grossAmt, disAmt, netAmt } = useMemo(() => recalcTotals(itemList), [itemList])

  const loadSrv = useCallback(async (id: number, mergeEditItems?: InvPurchaseReturnItemRow[]) => {
    const full = await getInvSrvById(id)
    if (!full) return
    setSrv(full)
    let items = mapSrvItemsToReturnItems(full.invSrvItemDTOs ?? [])
    if (mergeEditItems?.length) {
      items = items.map((row) => {
        const saved = mergeEditItems.find((m) => m.itemId === row.itemId)
        if (!saved) return row
        return calcLineTotal({
          ...row,
          checked: saved.checked ?? true,
          orderQuantity: saved.orderQuantity ?? row.orderQuantity,
          prItemId: saved.prItemId,
          createdDt: saved.createdDt,
        })
      })
    }
    setItemList(items)
  }, [])

  useEffect(() => {
    if (!existing) return
    setPurchaseReturnNo(existing.purchaseReturnNo ?? '')
    setSrvId(existing.srvId ? String(existing.srvId) : null)
    if (existing.purchaseReturnDate) {
      const d = new Date(existing.purchaseReturnDate)
      if (!Number.isNaN(d.getTime())) setPurchaseReturnDate(d)
    }
    if (existing.srvId) {
      void loadSrv(existing.srvId, existing.purchaseReturnItem ?? [])
    }
  }, [existing, loadSrv])

  useEffect(() => {
    if (!srvId || isEdit) return
    const id = Number(srvId)
    if (!id) return
    void loadSrv(id).catch((err) => toastError(getErrorMessage(err)))
  }, [srvId, isEdit, loadSrv])

  function updateItem(index: number, patch: Partial<InvPurchaseReturnItemRow>) {
    setItemList((prev) => {
      const next = [...prev]
      next[index] = calcLineTotal({ ...next[index], ...patch })
      return next
    })
  }

  function toggleItem(index: number, checked: boolean) {
    updateItem(index, { checked })
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!srvId || !srv) throw new Error('Please select an S.R.V.')
      if (!purchaseReturnNo.trim()) throw new Error('P.R. Number is required.')

      const selectedItems = itemList.filter((row) => row.checked)
      if (selectedItems.length === 0) {
        throw new Error('Select at least one return item.')
      }

      const purchaseReturnItem: InvPurchaseReturnItemRow[] = []
      for (const row of itemList) {
        const line = { ...row, returnedQty: row.orderQuantity }
        if (row.prItemId) {
          purchaseReturnItem.push({
            ...line,
            isActive: row.checked ? true : false,
          })
        } else if (row.checked) {
          purchaseReturnItem.push(line)
        }
      }

      const payload: Record<string, unknown> = {
        purchaseReturnNo: purchaseReturnNo.trim(),
        srvId: Number(srvId),
        purchaseReturnDate: purchaseReturnDate ? toDateOnlyISO(purchaseReturnDate) : undefined,
        poId: srv.poId,
        storeId: srv.storeId,
        supplierId: srv.supplierId,
        invTranstypeCatdetId: srv.invTranstypeCatdetId,
        returnActualAmount: grossAmt,
        returnAmount: netAmt,
        returnDiscount: disAmt,
        purchaseReturnItem,
      }

      if (isEdit && purchaseReturnId) {
        payload.purchasereturnId = purchaseReturnId
        payload.isActive = existing?.isActive ?? true
        payload.createdDt = existing?.createdDt
        await updateInvPurchaseReturn(payload)
      } else {
        await createInvPurchaseReturn(payload)
      }

      void refFile1
      void refFile2
    },
    onSuccess: () => {
      toastSuccess(isEdit ? 'Purchase return updated.' : 'Purchase return created.')
      router.push(listPath)
    },
    onError: (err) => toastError(getErrorMessage(err)),
  })

  const title = isEdit ? 'Edit Purchase Return' : 'New Purchase Return'

  return (
    <PageContainer className="space-y-5">
      <div className="app-card overflow-hidden">
        <div className="p-4 md:p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
            <FileTextIcon className="h-4 w-4 text-[#5da394]" aria-hidden />
            <h1 className="text-[15px] font-semibold text-[hsl(var(--card-title))]">{title}</h1>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="space-y-3">
              <Select
                label="S.R.V Number *"
                value={srvId}
                onChange={setSrvId}
                options={srvOptions}
                placeholder="S.R.V"
                searchable
                disabled={isEdit}
              />
              {srv && (
                <>
                  <div className="grid grid-cols-[120px_1fr] gap-2 text-xs">
                    <span className="text-muted-foreground">Store</span>
                    <span className="font-semibold text-[hsl(var(--primary))]">
                      {srv.storeName ?? '—'}
                    </span>
                  </div>
                  <div className="grid grid-cols-[120px_1fr] gap-2 text-xs">
                    <span className="text-muted-foreground">Supplier</span>
                    <span className="font-semibold text-[hsl(var(--primary))]">
                      {srv.supplierName ?? '—'}
                    </span>
                  </div>
                  <div className="grid grid-cols-[120px_1fr] gap-2 text-xs">
                    <span className="text-muted-foreground">Trans. Type</span>
                    <span className="font-semibold text-[hsl(var(--primary))]">
                      {srv.invTranstypeCatdetDisplayName ?? '—'}
                    </span>
                  </div>
                </>
              )}
            </div>

            <div className="space-y-3">
              <div className="space-y-0.5">
                <Label className="text-xs">P.R. Number *</Label>
                <Input
                  className="h-8 text-xs"
                  value={purchaseReturnNo}
                  onChange={(e) => setPurchaseReturnNo(e.target.value)}
                  placeholder="P.R. Number"
                />
              </div>
              <DatePicker label="Date" value={purchaseReturnDate} onChange={setPurchaseReturnDate} />
            </div>
          </div>

          <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
            <h2 className="text-sm font-semibold text-[hsl(var(--card-title))]">Return Items</h2>
          </div>

          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/60">
                  <th className="w-10 px-2 py-2" />
                  <th className="px-3 py-2 text-left font-medium">Items</th>
                  <th className="px-3 py-2 text-right font-medium">Unit Price</th>
                  <th className="px-3 py-2 text-right font-medium">Quantity</th>
                  <th className="px-3 py-2 text-right font-medium">Discount</th>
                  <th className="px-3 py-2 text-right font-medium">Total cost</th>
                </tr>
              </thead>
              <tbody>
                {itemList.map((row, idx) =>
                  row.isActive !== false ? (
                    <tr key={row.itemId ?? row.prItemId ?? idx} className="border-t border-border">
                      <td className="px-2 py-2 align-middle">
                        <Checkbox
                          checked={Boolean(row.checked)}
                          onCheckedChange={(v) => toggleItem(idx, v === true)}
                        />
                      </td>
                      <td className="px-3 py-2">{row.itemName ?? row.itemCode ?? '—'}</td>
                      <td className="px-3 py-2 text-right">
                        {row.itemUnitAmount ?? row.unitPrice ?? 0}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Input
                          type="number"
                          className="h-7 w-20 ml-auto text-right text-xs"
                          value={row.orderQuantity ?? ''}
                          onChange={(e) =>
                            updateItem(idx, { orderQuantity: Number(e.target.value) || 0 })
                          }
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        {row.itemTotalDiscountAmount ?? 0}
                      </td>
                      <td className="px-3 py-2 text-right">{row.itemTotalCost ?? 0}</td>
                    </tr>
                  ) : null,
                )}
                {itemList.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                      Select an S.R.V. to load return items.
                    </td>
                  </tr>
                )}
                {itemList.length > 0 && (
                  <>
                    <tr className="border-t border-border">
                      <td colSpan={4} />
                      <td className="px-3 py-2 text-right font-medium">Gross Amt</td>
                      <td className="px-3 py-2 text-right">{grossAmt}</td>
                    </tr>
                    <tr>
                      <td colSpan={4} />
                      <td className="px-3 py-2 text-right font-medium">Discount Amt</td>
                      <td className="px-3 py-2 text-right">{disAmt}</td>
                    </tr>
                    <tr>
                      <td colSpan={4} />
                      <td className="px-3 py-2 text-right font-medium">Total Amt</td>
                      <td className="px-3 py-2 text-right font-semibold text-[hsl(var(--primary))]">
                        {netAmt}
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">P.R. Ref. File 1</Label>
              <Input
                type="file"
                accept=".png,.jpg,.jpeg,.pdf,.doc"
                onChange={(e) => setRefFile1(e.target.files?.[0] ?? null)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">P.R. Ref. File 2</Label>
              <Input
                type="file"
                accept=".png,.jpg,.jpeg,.pdf,.doc"
                onChange={(e) => setRefFile2(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            <Button
              type="button"
              variant="outline"
              className="h-9 min-w-[5.5rem]"
              onClick={() => router.push(listPath)}
            >
              Back
            </Button>
            <Button
              type="button"
              className="h-9 min-w-[5.5rem]"
              disabled={
                saveMutation.isPending
                || loadingExisting
                || !srvId
                || itemList.length === 0
              }
              onClick={() => saveMutation.mutate()}
            >
              {saveMutation.isPending ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      </div>
    </PageContainer>
  )
}
