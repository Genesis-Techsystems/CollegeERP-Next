'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileTextIcon } from 'lucide-react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { DatePicker } from '@/common/components/date-picker'
import { Select } from '@/common/components/select'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { QK } from '@/lib/query-keys'
import { toastError, toastSuccess } from '@/lib/toast'
import { getErrorMessage } from '@/lib/errors'
import { toDateOnlyISO } from '@/common/generic-functions'
import {
  createInvSrv,
  getInvSrvById,
  listInvStockReceiptVouchers,
  listPurchaseOrders,
  getPurchaseOrderById,
  updateInvSrv,
} from '@/services'
import type { InvPoItemRow, InvPurchaseOrderRow } from '@/types/e-office'
import type { InvSrvItemRow } from '@/types/inventory'

const SRV_LIST = '/inventory-management/stock-receipt-voucher'

type PoWithTax = InvPurchaseOrderRow & {
  sgst?: number
  igst?: number
  discountAmount?: number
  totalTax?: number
  invTranstypeCatdetDisplayName?: string
}

function mapPoItemsToSrvItems(items: InvPoItemRow[]): InvSrvItemRow[] {
  return items
    .filter((row) => row.isActive !== false)
    .map((row) => {
      const unitPrice = Number(row.unitPrice) || 0
      const qty = Number(row.orderQuantity) || 0
      const discPct = Number(row.itemDiscountPercentage) || 0
      const itemTotalDiscountAmount = ((unitPrice * qty) * discPct) / 100
      return {
        ...row,
        unitPrice,
        orderQuantity: qty,
        itemDiscountPercentage: discPct,
        receivedQty: qty,
        itemUnitAmount: unitPrice,
        itemTotalDiscountAmount,
        isReqTracking: true,
        isActive: true,
      }
    })
}

export function StockReceiptVoucherForm({
  srvId,
  listPath = SRV_LIST,
}: {
  srvId?: number
  listPath?: string
}) {
  const router = useRouter()
  const isEdit = Boolean(srvId && srvId > 0)

  const [poId, setPoId] = useState<string | null>(null)
  const [purchaseOrder, setPurchaseOrder] = useState<PoWithTax | null>(null)
  const [itemList, setItemList] = useState<InvSrvItemRow[]>([])
  const [srvNo, setSrvNo] = useState('')
  const [srvDate, setSrvDate] = useState<Date | undefined>(new Date())
  const [deliveryChallanNo, setDeliveryChallanNo] = useState('')
  const [deliveryChallanDate, setDeliveryChallanDate] = useState<Date | undefined>(new Date())
  const [refFile1, setRefFile1] = useState<File | null>(null)
  const [itemsLoadedFromPo, setItemsLoadedFromPo] = useState(false)

  const { data: purchaseOrders = [] } = useQuery({
    queryKey: [...QK.eOffice.purchaseOrders(), 'forSrv'],
    queryFn: listPurchaseOrders,
  })

  const { data: existingSrv, isLoading: loadingSrv } = useQuery({
    queryKey: QK.invStockReceiptVouchers.detail(srvId ?? 0),
    queryFn: () => getInvSrvById(srvId!),
    enabled: isEdit,
  })

  const { data: existingSrvList = [] } = useQuery({
    queryKey: QK.invStockReceiptVouchers.list(),
    queryFn: listInvStockReceiptVouchers,
    enabled: !isEdit,
  })

  const poOptions = useMemo(
    () =>
      purchaseOrders.map((po) => ({
        value: String(po.poId),
        label: po.pono ?? String(po.poId),
      })),
    [purchaseOrders],
  )

  useEffect(() => {
    if (!existingSrv) return
    setSrvNo(existingSrv.srvNo ?? '')
    setPoId(existingSrv.poId ? String(existingSrv.poId) : null)
    setDeliveryChallanNo(existingSrv.deliverychallanno ?? '')
    if (existingSrv.srvDate) {
      const d = new Date(existingSrv.srvDate)
      if (!Number.isNaN(d.getTime())) setSrvDate(d)
    }
    if (existingSrv.deliverychallandate) {
      const d = new Date(existingSrv.deliverychallandate)
      if (!Number.isNaN(d.getTime())) setDeliveryChallanDate(d)
    }
    const items = (existingSrv.invSrvItemDTOs ?? []).map((row) => ({
      ...row,
      unitPrice: row.itemUnitAmount ?? row.unitPrice,
    }))
    setItemList(items)
    setItemsLoadedFromPo(true)
  }, [existingSrv])

  useEffect(() => {
    if (!poId) {
      setPurchaseOrder(null)
      if (!isEdit) {
        setItemList([])
        setItemsLoadedFromPo(false)
      }
      return
    }
    const id = Number(poId)
    if (!id) return
    void getPurchaseOrderById(id)
      .then((po) => {
        if (!po) return
        const poRow = po as PoWithTax
        setPurchaseOrder(poRow)
        if (!isEdit || !itemsLoadedFromPo) {
          setItemList(mapPoItemsToSrvItems(po.invPoItems ?? []))
          setItemsLoadedFromPo(true)
        }
      })
      .catch((err) => toastError(getErrorMessage(err)))
  }, [poId, isEdit, itemsLoadedFromPo])

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!poId || !purchaseOrder) {
        throw new Error('Please select a purchase order.')
      }
      if (!srvNo.trim()) throw new Error('SRV Number is required.')
      if (!deliveryChallanNo.trim()) throw new Error('Delivery Challan No. is required.')

      if (!isEdit) {
        const dupSrv = existingSrvList.some(
          (s) => s.srvNo?.toLowerCase() === srvNo.trim().toLowerCase(),
        )
        if (dupSrv) throw new Error('SRV Number already exists.')
        const dupDc = existingSrvList.some(
          (s) => s.deliverychallanno?.toLowerCase() === deliveryChallanNo.trim().toLowerCase(),
        )
        if (dupDc) throw new Error('Delivery Challan No. already exists.')
      }

      const invSrvItemDTOs = itemList.map((row) => ({
        ...row,
        receivedQty: row.orderQuantity,
        itemUnitAmount: row.unitPrice,
        itemTotalDiscountAmount:
          row.itemTotalDiscountAmount
          ?? ((Number(row.unitPrice) * Number(row.orderQuantity)) * Number(row.itemDiscountPercentage || 0)) / 100,
        isReqTracking: true,
      }))

      const payload: Record<string, unknown> = {
        srvNo: srvNo.trim(),
        poId: Number(poId),
        srvDate: srvDate ? toDateOnlyISO(srvDate) : undefined,
        deliverychallanno: deliveryChallanNo.trim(),
        deliverychallandate: deliveryChallanDate ? toDateOnlyISO(deliveryChallanDate) : undefined,
        storeId: purchaseOrder.storeId,
        supplierId: purchaseOrder.supplierId,
        igst: purchaseOrder.igst ?? purchaseOrder.poNetCost,
        srvActualAmount: purchaseOrder.poActualAmount,
        srvDiscount: purchaseOrder.discountAmount,
        srvTax: purchaseOrder.totalTax,
        invTranstypeCatdetId: purchaseOrder.invTranstypeCatdetId,
        invSrvItemDTOs,
      }

      if (isEdit && srvId) {
        payload.srvId = srvId
        payload.isActive = existingSrv?.isActive ?? true
        await updateInvSrv(payload)
      } else {
        await createInvSrv(payload)
      }

      void refFile1
      void refFile2
    },
    onSuccess: () => {
      toastSuccess(isEdit ? 'Stock receipt voucher updated.' : 'Stock receipt voucher created.')
      router.push(listPath)
    },
    onError: (err) => toastError(getErrorMessage(err)),
  })

  const title = isEdit ? 'Edit Stock Receipt Voucher' : 'New Stock Receipt Voucher'
  const grossAmt = purchaseOrder?.poActualAmount ?? 0
  const gstPct = purchaseOrder?.sgst ?? 0
  const totalAmt = purchaseOrder?.poNetCost ?? 0

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
                label="P.O. Number *"
                value={poId}
                onChange={setPoId}
                options={poOptions}
                placeholder="P.O"
                searchable
                disabled={isEdit}
              />
              {purchaseOrder && (
                <>
                  <div className="grid grid-cols-[120px_1fr] gap-2 text-xs">
                    <span className="text-muted-foreground">Store</span>
                    <span className="font-semibold text-[hsl(var(--primary))]">
                      {purchaseOrder.storeName ?? '—'}
                    </span>
                  </div>
                  <div className="grid grid-cols-[120px_1fr] gap-2 text-xs">
                    <span className="text-muted-foreground">Supplier</span>
                    <span className="font-semibold text-[hsl(var(--primary))]">
                      {purchaseOrder.supplierName ?? '—'}
                    </span>
                  </div>
                  <div className="grid grid-cols-[120px_1fr] gap-2 text-xs">
                    <span className="text-muted-foreground">Trans. Type</span>
                    <span className="font-semibold text-[hsl(var(--primary))]">
                      {purchaseOrder.invTranstypeCatdetDisplayName
                        ?? purchaseOrder.invTranstypeCatdetCode
                        ?? '—'}
                    </span>
                  </div>
                </>
              )}
            </div>

            <div className="space-y-3">
              <div className="space-y-0.5">
                <Label className="text-xs">SRV Number *</Label>
                <Input
                  className="h-8 text-xs"
                  value={srvNo}
                  onChange={(e) => setSrvNo(e.target.value)}
                  placeholder="SRV Number"
                />
              </div>
              <DatePicker label="Date" value={srvDate} onChange={setSrvDate} />
              <div className="space-y-0.5">
                <Label className="text-xs">Delivery Challan No. *</Label>
                <Input
                  className="h-8 text-xs"
                  value={deliveryChallanNo}
                  onChange={(e) => setDeliveryChallanNo(e.target.value)}
                  placeholder="Delivery Challan Number"
                />
              </div>
              <DatePicker
                label="Delivery Challan Date"
                value={deliveryChallanDate}
                onChange={setDeliveryChallanDate}
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/60">
                  <th className="px-3 py-2 text-left font-medium">Items</th>
                  <th className="px-3 py-2 text-right font-medium">Unit Price</th>
                  <th className="px-3 py-2 text-right font-medium">Quantity</th>
                  <th className="px-3 py-2 text-right font-medium">Discount</th>
                  <th className="px-3 py-2 text-right font-medium">Total cost</th>
                </tr>
              </thead>
              <tbody>
                {itemList.map((row, idx) => (
                  row.isActive !== false && (
                    <tr key={row.poItemId ?? row.itemId ?? idx} className="border-t border-border">
                      <td className="px-3 py-2">{row.itemName ?? row.itemCode ?? '—'}</td>
                      <td className="px-3 py-2 text-right">{row.unitPrice ?? 0}</td>
                      <td className="px-3 py-2 text-right">{row.orderQuantity ?? 0}</td>
                      <td className="px-3 py-2 text-right">{row.itemDiscountPercentage ?? 0}</td>
                      <td className="px-3 py-2 text-right">{row.itemTotalCost ?? 0}</td>
                    </tr>
                  )
                ))}
                {itemList.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                      Select a purchase order to load items.
                    </td>
                  </tr>
                )}
                {itemList.length > 0 && (
                  <>
                    <tr className="border-t border-border">
                      <td colSpan={3} />
                      <td className="px-3 py-2 text-right font-medium">Gross Amt</td>
                      <td className="px-3 py-2 text-right">{grossAmt}</td>
                    </tr>
                    <tr>
                      <td colSpan={3} />
                      <td className="px-3 py-2 text-right font-medium">GST %</td>
                      <td className="px-3 py-2 text-right">{gstPct}</td>
                    </tr>
                    <tr>
                      <td colSpan={3} />
                      <td className="px-3 py-2 text-right font-medium">Total Amt</td>
                      <td className="px-3 py-2 text-right">{totalAmt}</td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">SRV Ref. File 1</Label>
              <Input
                type="file"
                accept=".png,.jpg,.jpeg,.pdf,.doc"
                onChange={(e) => setRefFile1(e.target.files?.[0] ?? null)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">SRV Ref. File 2</Label>
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
                || loadingSrv
                || !poId
                || itemList.length === 0
              }
              onClick={() => saveMutation.mutate()}
            >
              {saveMutation.isPending ? 'Saving…' : isEdit ? 'Save' : 'Received'}
            </Button>
          </div>
        </div>
      </div>
    </PageContainer>
  )
}
