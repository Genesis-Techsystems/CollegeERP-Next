'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ClipboardListIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { DatePicker } from '@/common/components/date-picker'
import { Select } from '@/common/components/select'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ActiveStatusField } from '@/common/components/forms'
import { QK } from '@/lib/query-keys'
import { toastError, toastSuccess } from '@/lib/toast'
import { getErrorMessage } from '@/lib/errors'
import { toDateOnlyISO } from '@/common/generic-functions'
import {
  createInternalIndent,
  getEOfficeContextIds,
  getInternalIndentById,
  listInvItems,
  listInvStores,
  listInternalIndentTransactionTypes,
  updateInternalIndent,
} from '@/services'
import type { InvInternalIndentItemRow } from '@/types/e-office'

type ItemLine = InvInternalIndentItemRow & { key: string }

function newLine(): ItemLine {
  return {
    key: crypto.randomUUID(),
    isActive: true,
    itemId: undefined,
    indentQuantity: 0,
    orderQuantity: 0,
    receivedQty: 0,
  }
}

export function ItemRequestForm({
  indentId,
  listPath = '/e-office/item-request',
}: {
  indentId?: number
  /** Route to return to after save/cancel (inventory vs e-office). */
  listPath?: string
}) {
  const router = useRouter()
  const isEdit = Boolean(indentId && indentId > 0)
  const ctx = getEOfficeContextIds()

  const [storeId, setStoreId] = useState<string | null>(null)
  const [transTypeId, setTransTypeId] = useState<string | null>(null)
  const [indentDate, setIndentDate] = useState<Date | null>(new Date())
  const [internalIndNo, setInternalIndNo] = useState('')
  const [purpose, setPurpose] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [reason, setReason] = useState('active')
  const [lines, setLines] = useState<ItemLine[]>([newLine()])

  const { data: stores = [] } = useQuery({
    queryKey: [...QK.eOffice.lookup(), 'stores'],
    queryFn: listInvStores,
  })
  const { data: items = [] } = useQuery({
    queryKey: [...QK.eOffice.lookup(), 'items'],
    queryFn: listInvItems,
  })
  const { data: transTypes = [] } = useQuery({
    queryKey: [...QK.eOffice.lookup(), 'transTypes', 'indent'],
    queryFn: listInternalIndentTransactionTypes,
  })

  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: QK.eOffice.internalIndent(indentId ?? 0),
    queryFn: () => getInternalIndentById(indentId!),
    enabled: isEdit,
  })

  useEffect(() => {
    if (transTypes.length > 0 && !transTypeId) {
      setTransTypeId(String(transTypes[0].generalDetailId))
    }
  }, [transTypes, transTypeId])

  useEffect(() => {
    if (!existing) return
    setStoreId(existing.storeId ? String(existing.storeId) : null)
    setTransTypeId(existing.invTranstypeCatdetId ? String(existing.invTranstypeCatdetId) : null)
    setInternalIndNo(existing.internalIndNo ?? '')
    setPurpose(existing.purpose ?? '')
    setIsActive(existing.isActive ?? true)
    if (existing.indentDate) {
      const d = new Date(existing.indentDate)
      if (!Number.isNaN(d.getTime())) setIndentDate(d)
    }
    const itemRows = (existing.invInternalIndentitems ?? []).map((it) => ({
      ...it,
      key: String(it.interIndItemId ?? crypto.randomUUID()),
      isActive: it.isActive !== false,
    }))
    setLines(itemRows.length > 0 ? itemRows : [newLine()])
  }, [existing])

  const storeOptions = useMemo(
    () => stores.map((s) => ({ value: String(s.storeId), label: s.storeCode ?? s.storeName ?? String(s.storeId) })),
    [stores],
  )
  const itemOptions = useMemo(
    () =>
      items.map((it) => ({
        value: String(it.itemId),
        label: `${it.itemName ?? ''} (${it.itemCode ?? ''})`.trim(),
      })),
    [items],
  )

  const saveMutation = useMutation({
    mutationFn: async () => {
      const invInternalIndentitems = lines
        .filter((l) => l.isActive !== false && l.itemId)
        .map((l) => {
          const master = items.find((m) => m.itemId === Number(l.itemId))
          return {
            isActive: true,
            itemCode: master?.itemCode ?? 'code',
            itemId: Number(l.itemId),
            indentQuantity: Number(l.indentQuantity) || 0,
            orderQuantity: Number(l.orderQuantity) || 0,
            receivedQty: Number(l.receivedQty) || 0,
            isReqTracking: true,
            itemTotalActualAmount: 0,
            itemDiscountPercentage: 0,
            itemTaxPercentage: 0,
            itemTotalDiscountAmount: 0,
            itemTotalCost: 0,
            issuedQty: 0,
            storeId: Number(storeId),
            ...(l.interIndItemId ? { interIndItemId: l.interIndItemId } : {}),
          }
        })

      if (isEdit) {
        await updateInternalIndent({
          internalIndId: indentId,
          storeId: Number(storeId),
          invTranstypeCatdetId: Number(transTypeId),
          indentDate: indentDate ? toDateOnlyISO(indentDate) : undefined,
          purpose,
          invInternalIndentitems,
          isActive,
          reason: isActive ? 'active' : reason,
        })
      } else {
        await createInternalIndent({
          storeId: Number(storeId),
          invTranstypeCatdetId: Number(transTypeId),
          indentDate: indentDate ? toDateOnlyISO(indentDate) : undefined,
          invInternalIndentitems,
          igst: 0,
          poActualAmount: 0,
          poTotalCost: 0,
          sgst: 0,
          shippingCharges: 0,
          otherCharges: 0,
          purpose,
          poComments: '',
          totalTax: 0,
          poNetCost: 0,
          academicYearId: ctx.academicYearId,
          collegeId: ctx.collegeId,
          authEmployeeId: ctx.employeeId,
          indentRaisedEmpId: ctx.employeeId,
          destDeptId: ctx.empDeptId,
          destinationEmpId: ctx.employeeId,
        })
      }
    },
    onSuccess: () => {
      toastSuccess(isEdit ? 'Indent updated.' : 'Indent created.')
      router.push('/e-office/item-request')
    },
    onError: (err) => toastError(getErrorMessage(err)),
  })

  const updateLine = useCallback((key: string, patch: Partial<ItemLine>) => {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)))
  }, [])

  const removeLine = useCallback((key: string) => {
    setLines((prev) => {
      if (prev.length <= 1) return [newLine()]
      return prev.filter((l) => l.key !== key)
    })
  }, [])

  const title = isEdit ? 'Edit Internal Requisition' : 'New Internal Requisition'

  return (
    <PageContainer className="space-y-5">
      <div className="app-card overflow-hidden">
        <div className="p-4 md:p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
            <ClipboardListIcon className="h-4 w-4 text-[#5da394]" aria-hidden />
            <h1 className="text-[15px] font-semibold text-[hsl(var(--card-title))]">{title}</h1>
          </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Select
            label="Store"
            value={storeId}
            onChange={setStoreId}
            options={storeOptions}
            searchable
            placeholder="Select store"
          />
          <Select
            label="Transaction Type"
            value={transTypeId}
            onChange={setTransTypeId}
            options={transTypes.map((t) => ({
              value: String(t.generalDetailId),
              label: t.generalDetailDisplayName ?? String(t.generalDetailId),
            }))}
            disabled
          />
          {isEdit && (
            <div className="space-y-1.5">
              <Label>Indent No.</Label>
              <Input value={internalIndNo} disabled />
            </div>
          )}
          <DatePicker label="Indent Date" value={indentDate} onChange={setIndentDate} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="purpose">Purpose</Label>
          <Input
            id="purpose"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
          />
        </div>

        {isEdit && (
          <ActiveStatusField
            isActive={isActive}
            onActiveChange={(v) => setIsActive(v === true)}
            reason={reason}
            onReasonChange={setReason}
          />
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Items</h3>
            <Button type="button" size="sm" variant="outline" onClick={() => setLines((p) => [...p, newLine()])}>
              <PlusIcon className="h-3.5 w-3.5 mr-1" />
              Add row
            </Button>
          </div>
          <div className="space-y-2">
            {lines.map((line) => (
              <div
                key={line.key}
                className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_100px_100px_40px] items-end border-b border-border/60 pb-2"
              >
                <Select
                  label="Item"
                  value={line.itemId ? String(line.itemId) : null}
                  onChange={(v) => updateLine(line.key, { itemId: v ? Number(v) : undefined })}
                  options={itemOptions}
                  searchable
                  placeholder="Select item"
                />
                <div className="space-y-1.5">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    min={0}
                    value={line.indentQuantity ?? ''}
                    onChange={(e) =>
                      updateLine(line.key, { indentQuantity: Number(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Order Qty</Label>
                  <Input
                    type="number"
                    min={0}
                    value={line.orderQuantity ?? ''}
                    onChange={(e) =>
                      updateLine(line.key, { orderQuantity: Number(e.target.value) || 0 })
                    }
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  aria-label="Remove row"
                  onClick={() => removeLine(line.key)}
                >
                  <Trash2Icon className="h-4 w-4" />
                </Button>
              </div>
            ))}
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
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || loadingExisting || !storeId}
            >
              {saveMutation.isPending ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      </div>
    </PageContainer>
  )
}
