'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileTextIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { DatePicker } from '@/common/components/date-picker'
import { Select } from '@/common/components/select'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ActiveStatusField } from '@/common/components/forms'
import { useSessionContext } from '@/context/SessionContext'
import { useLoginEmployeeId } from '@/hooks/useLoginEmployeeId'
import { QK } from '@/lib/query-keys'
import { resolveOrganizationId } from '@/lib/user-context'
import { toastError, toastSuccess } from '@/lib/toast'
import { getErrorMessage } from '@/lib/errors'
import { toDateOnlyISO } from '@/common/generic-functions'
import {
  createPurchaseOrderMultipart,
  getEOfficeContextIds,
  getFinanceEntityFilters,
  getPurchaseOrderById,
  listIndentsForPaymentNote,
  listInvItems,
  listInvStores,
  listInvSuppliers,
  listPoTypes,
  listTransactionTypes,
  updatePurchaseOrderMultipart,
} from '@/services'
import type { InvPoItemRow } from '@/types/e-office'

const PO_TYPE_WITH_INDENT = 463

type ItemLine = InvPoItemRow & { key: string; isActive?: boolean }

type OrderTotals = {
  poActualAmount: number
  sgst: number
  igst: number
  shippingCharges: number
  otherCharges: number
  poNetCost: number
  termsconditions: string
  subjectText: string
  requestText: string
  poComments: string
}

function newLine(): ItemLine {
  return {
    key: crypto.randomUUID(),
    isActive: true,
    unitPrice: 0,
    orderQuantity: 0,
    itemDiscountPercentage: 0,
    itemTotalCost: 0,
  }
}

function calcLine(row: ItemLine): ItemLine {
  let cost = (Number(row.unitPrice) || 0) * (Number(row.orderQuantity) || 0)
  const disc = Number(row.itemDiscountPercentage) || 0
  if (disc > 0) cost -= (cost * disc) / 100
  return { ...row, itemTotalCost: cost }
}

function calcTotals(lines: ItemLine[], totals: OrderTotals): OrderTotals {
  const poActualAmount = lines
    .filter((l) => l.isActive !== false)
    .reduce((s, l) => s + (Number(l.itemTotalCost) || 0), 0)
  let poNetCost = poActualAmount
  let igst = poActualAmount
  if (totals.sgst > 0) {
    igst = poActualAmount + (poActualAmount * totals.sgst) / 100
    poNetCost = igst
  }
  poNetCost += Number(totals.shippingCharges) || 0
  poNetCost += Number(totals.otherCharges) || 0
  return { ...totals, poActualAmount, igst, poNetCost }
}

export function PaymentNoteRequestForm({
  poId,
  listPath = '/e-office/payment-note-request',
}: {
  poId?: number
  /** Route to return to after save/cancel (inventory vs e-office). */
  listPath?: string
}) {
  const router = useRouter()
  const { user, isLoading: sessionLoading } = useSessionContext()
  const orgId = resolveOrganizationId(user) || 1
  const { employeeId } = useLoginEmployeeId(user, sessionLoading)
  const ctx = getEOfficeContextIds()
  const isEdit = Boolean(poId && poId > 0)

  const [poTypeId, setPoTypeId] = useState<string | null>(null)
  const [indentId, setIndentId] = useState<string | null>(null)
  const [transTypeId, setTransTypeId] = useState<string | null>(null)
  const [storeId, setStoreId] = useState<string | null>(null)
  const [supplierId, setSupplierId] = useState<string | null>(null)
  const [entityId, setEntityId] = useState<string | null>(null)
  const [financialYearId, setFinancialYearId] = useState<string | null>(null)
  const [accountTypeId, setAccountTypeId] = useState<string | null>(null)
  const [poDate, setPoDate] = useState<Date | undefined>(new Date())
  const [invoiceNo, setInvoiceNo] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [reason, setReason] = useState('active')
  const [lines, setLines] = useState<ItemLine[]>([newLine()])
  const [totals, setTotals] = useState<OrderTotals>({
    poActualAmount: 0,
    sgst: 0,
    igst: 0,
    shippingCharges: 0,
    otherCharges: 0,
    poNetCost: 0,
    termsconditions: '',
    subjectText: '',
    requestText: '',
    poComments: '',
  })
  const [comparativeFile, setComparativeFile] = useState<File | null>(null)
  const [noteFile, setNoteFile] = useState<File | null>(null)
  const [storeCollegeId, setStoreCollegeId] = useState(0)
  const [finRows, setFinRows] = useState<Record<string, unknown>[]>([])

  const { data: poTypes = [] } = useQuery({ queryKey: [...QK.eOffice.lookup(), 'poTypes'], queryFn: listPoTypes })
  const { data: transTypes = [] } = useQuery({
    queryKey: [...QK.eOffice.lookup(), 'transTypes'],
    queryFn: listTransactionTypes,
  })
  const { data: stores = [] } = useQuery({ queryKey: [...QK.eOffice.lookup(), 'stores'], queryFn: listInvStores })
  const { data: suppliers = [] } = useQuery({
    queryKey: [...QK.eOffice.lookup(), 'suppliers'],
    queryFn: listInvSuppliers,
  })
  const { data: items = [] } = useQuery({ queryKey: [...QK.eOffice.lookup(), 'items'], queryFn: listInvItems })
  const { data: indents = [] } = useQuery({
    queryKey: [...QK.eOffice.lookup(), 'indentsForPo'],
    queryFn: listIndentsForPaymentNote,
  })

  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: QK.eOffice.purchaseOrder(poId ?? 0),
    queryFn: () => getPurchaseOrderById(poId!),
    enabled: isEdit,
  })

  const loadFinance = useCallback(async (collegeId: number) => {
    if (!collegeId) return
    try {
      const rows = await getFinanceEntityFilters(orgId, employeeId)
      setFinRows(rows)
      setStoreCollegeId(collegeId)
    } catch {
      setFinRows([])
    }
  }, [orgId, employeeId])

  useEffect(() => {
    if (!existing) return
    setPoTypeId(existing.potypeCatdetId ? String(existing.potypeCatdetId) : null)
    setTransTypeId(existing.invTranstypeCatdetId ? String(existing.invTranstypeCatdetId) : null)
    setStoreId(existing.storeId ? String(existing.storeId) : null)
    setSupplierId(existing.supplierId ? String(existing.supplierId) : null)
    setInvoiceNo(existing.invoiceNo ?? '')
    setIsActive(existing.isActive ?? true)
    if (existing.poDate) {
      const d = new Date(existing.poDate)
      if (!Number.isNaN(d.getTime())) setPoDate(d)
    }
    if (existing.invInternalIndentIds) {
      setIndentId(String(existing.invInternalIndentIds))
    }
    const itemRows = (existing.invPoItems ?? []).map((it) => ({
      ...it,
      key: String(it.poItemId ?? crypto.randomUUID()),
      isActive: true,
    }))
    setLines(itemRows.length ? itemRows : [newLine()])
    setTotals((t) => ({
      ...t,
      poActualAmount: Number(existing.poActualAmount) || 0,
      sgst: Number(existing.sgst) || 0,
      igst: Number(existing.igst) || 0,
      shippingCharges: Number(existing.shippingCharges) || 0,
      otherCharges: Number(existing.otherCharges) || 0,
      poNetCost: Number(existing.poNetCost) || 0,
      termsconditions: String(existing.termsconditions ?? ''),
      subjectText: String(existing.subjectText ?? ''),
      requestText: String(existing.requestText ?? ''),
      poComments: String(existing.poComments ?? ''),
    }))
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

  const entityOptions = useMemo(() => {
    const list = finRows.filter((r) => Number(r.fk_college_id) === storeCollegeId)
    const seen = new Set<number>()
    return list
      .filter((r) => {
        const id = Number(r.pk_acc_entity_id)
        if (!id || seen.has(id)) return false
        seen.add(id)
        return true
      })
      .map((r) => ({
        value: String(r.pk_acc_entity_id),
        label: String(r.entity_code ?? r.entity_name ?? r.pk_acc_entity_id),
      }))
  }, [finRows, storeCollegeId])

  const yearOptions = useMemo(() => {
    if (!entityId) return []
    const list = finRows.filter(
      (r) =>
        Number(r.fk_college_id) === storeCollegeId &&
        Number(r.pk_acc_entity_id) === Number(entityId),
    )
    const seen = new Set<number>()
    return list
      .filter((r) => {
        const id = Number(r.pk_financial_year_id)
        if (!id || seen.has(id)) return false
        seen.add(id)
        return true
      })
      .map((r) => ({
        value: String(r.pk_financial_year_id),
        label: String(r.financial_year ?? r.pk_financial_year_id),
      }))
  }, [finRows, storeCollegeId, entityId])

  const accountOptions = useMemo(() => {
    if (!entityId || !financialYearId) return []
    return finRows
      .filter(
        (r) =>
          Number(r.fk_college_id) === storeCollegeId &&
          Number(r.pk_acc_entity_id) === Number(entityId) &&
          Number(r.pk_financial_year_id) === Number(financialYearId),
      )
      .map((r) => ({
        value: String(r.pk_account_type_id),
        label: String(r.accounttype_name ?? r.pk_account_type_id),
      }))
  }, [finRows, storeCollegeId, entityId, financialYearId])

  const showIndent = Number(poTypeId) === PO_TYPE_WITH_INDENT
  const storeListForIndent = showIndent
    ? indents.find((i) => String(i.internalIndId) === indentId)?.storeId
    : null

  const recalc = useCallback(
    (nextLines: ItemLine[], nextTotals?: Partial<OrderTotals>) => {
      const computedLines = nextLines.map(calcLine)
      setLines(computedLines)
      setTotals((prev) => calcTotals(computedLines, { ...prev, ...nextTotals }))
    },
    [],
  )

  const saveMutation = useMutation({
    mutationFn: async () => {
      const supplierName =
        suppliers.find((s) => s.supplierId === Number(supplierId))?.supplierName ?? ''
      const store = stores.find((s) => s.storeId === Number(storeId))
      const collegeId = store?.collegeId ?? ctx.collegeId

      const invPoItems = lines
        .filter((l) => l.isActive !== false && l.itemId)
        .map((l) => {
          const master = items.find((m) => m.itemId === Number(l.itemId))
          return {
            ...l,
            itemCode: master?.itemCode,
            receivedQty: l.orderQuantity,
            isReqTracking: true,
          }
        })

      const base: Record<string, unknown> = {
        collegeId,
        academicYearId: ctx.academicYearId,
        storeId: Number(storeId),
        supplierId: Number(supplierId),
        potypeCatdetId: Number(poTypeId),
        invTranstypeCatdetId: Number(transTypeId),
        financialYearId: Number(financialYearId),
        accountTypeId: Number(accountTypeId),
        poDate: poDate ? toDateOnlyISO(poDate) : undefined,
        authorizedByEmployeeId: ctx.employeeId,
        poRaisedEmpId: ctx.employeeId,
        invoiceNo,
        supplierName,
        invPoItems,
        ...totals,
        isActive,
        reason: isActive ? 'active' : reason,
      }
      if (showIndent && indentId) {
        base.invInternalIndentIds = indentId
      }

      const files = { comparative: comparativeFile, note: noteFile }
      if (isEdit && poId) {
        const updatePayload = {
          ...base,
          poId,
          invPoItems: invPoItems.map((l) => ({
            poItemId: l.poItemId,
            itemId: l.itemId,
            unitPrice: l.unitPrice,
            orderQuantity: l.orderQuantity,
            itemDiscountPercentage: l.itemDiscountPercentage,
            itemTotalCost: l.itemTotalCost,
          })),
        }
        await updatePurchaseOrderMultipart(updatePayload, files)
      } else {
        await createPurchaseOrderMultipart(base, files)
      }
    },
    onSuccess: () => {
      toastSuccess(isEdit ? 'Purchase order updated.' : 'Purchase order created.')
      router.push(listPath)
    },
    onError: (err) => toastError(getErrorMessage(err)),
  })

  const title = isEdit ? 'Edit Purchase Order' : 'New Purchase Order'

  return (
    <PageContainer className="space-y-5">
      <div className="app-card overflow-hidden">
        <div className="p-4 md:p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
            <FileTextIcon className="h-4 w-4 text-[#5da394]" aria-hidden />
            <h1 className="text-[15px] font-semibold text-[hsl(var(--card-title))]">{title}</h1>
          </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Select
            label="P.O. Type"
            value={poTypeId}
            onChange={setPoTypeId}
            options={poTypes.map((t) => ({
              value: String(t.generalDetailId),
              label: t.generalDetailDisplayName ?? String(t.generalDetailId),
            }))}
            placeholder="Select PO type"
          />
          {showIndent && (
            <Select
              label="Indent No"
              value={indentId}
              onChange={(v) => {
                setIndentId(v)
                const ind = indents.find((i) => String(i.internalIndId) === v)
                if (ind?.storeId) setStoreId(String(ind.storeId))
              }}
              options={indents.map((i) => ({
                value: String(i.internalIndId),
                label: i.internalIndNo ?? String(i.internalIndId),
              }))}
              searchable
              disabled={isEdit}
            />
          )}
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
          <Select
            label="Store"
            value={storeId}
            onChange={(v) => {
              setStoreId(v)
              const st = stores.find((s) => String(s.storeId) === v)
              if (st?.collegeId) void loadFinance(st.collegeId)
            }}
            options={
              showIndent && storeListForIndent
                ? storeOptions.filter((o) => o.value === String(storeListForIndent))
                : storeOptions
            }
            placeholder="Select store"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Select
            label="Supplier"
            value={supplierId}
            onChange={(v) => {
              setSupplierId(v)
              const st = stores.find((s) => String(s.storeId) === storeId)
              if (st?.collegeId) void loadFinance(st.collegeId)
            }}
            options={suppliers.map((s) => ({
              value: String(s.supplierId),
              label: s.supplierName ?? String(s.supplierId),
            }))}
            searchable
          />
          <Select
            label="Entity"
            value={entityId}
            onChange={setEntityId}
            options={entityOptions}
            placeholder="Select entity"
          />
          <Select
            label="Financial Year"
            value={financialYearId}
            onChange={setFinancialYearId}
            options={yearOptions}
            placeholder="Select year"
          />
          <Select
            label="Account Type"
            value={accountTypeId}
            onChange={setAccountTypeId}
            options={accountOptions}
            placeholder="Select account"
          />
          <DatePicker label="P.O. Date" value={poDate ?? null} onChange={(d) => setPoDate(d ?? undefined)} />
          <div className="space-y-1.5">
            <Label>Invoice No</Label>
            <Input value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} />
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Items</h3>
          {lines.map((line) => (
            <div
              key={line.key}
              className="grid grid-cols-2 sm:grid-cols-6 gap-2 items-end border-b pb-2"
            >
              <Select
                label="Item"
                value={line.itemId ? String(line.itemId) : null}
                onChange={(v) => {
                  const next = lines.map((l) =>
                    l.key === line.key ? calcLine({ ...l, itemId: v ? Number(v) : undefined }) : l,
                  )
                  recalc(next)
                }}
                options={itemOptions}
                searchable
                disabled={isEdit && showIndent}
              />
              <div className="space-y-1">
                <Label>Unit Price</Label>
                <Input
                  type="number"
                  value={line.unitPrice ?? ''}
                  onChange={(e) => {
                    const next = lines.map((l) =>
                      l.key === line.key
                        ? calcLine({ ...l, unitPrice: Number(e.target.value) || 0 })
                        : l,
                    )
                    recalc(next)
                  }}
                />
              </div>
              <div className="space-y-1">
                <Label>Qty</Label>
                <Input
                  type="number"
                  value={line.orderQuantity ?? ''}
                  disabled={isEdit && showIndent}
                  onChange={(e) => {
                    const next = lines.map((l) =>
                      l.key === line.key
                        ? calcLine({ ...l, orderQuantity: Number(e.target.value) || 0 })
                        : l,
                    )
                    recalc(next)
                  }}
                />
              </div>
              <div className="space-y-1">
                <Label>Disc %</Label>
                <Input
                  type="number"
                  value={line.itemDiscountPercentage ?? ''}
                  onChange={(e) => {
                    const next = lines.map((l) =>
                      l.key === line.key
                        ? calcLine({
                            ...l,
                            itemDiscountPercentage: Number(e.target.value) || 0,
                          })
                        : l,
                    )
                    recalc(next)
                  }}
                />
              </div>
              <div className="space-y-1">
                <Label>Total</Label>
                <Input type="number" value={line.itemTotalCost ?? ''} disabled />
              </div>
              {!showIndent && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => recalc(lines.filter((l) => l.key !== line.key))}
                >
                  <Trash2Icon className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          {!showIndent && (
            <Button type="button" size="sm" variant="outline" onClick={() => recalc([...lines, newLine()])}>
              <PlusIcon className="h-3.5 w-3.5 mr-1" />
              Add item
            </Button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-xl">
          <div className="space-y-1">
            <Label>Gross Amt</Label>
            <Input type="number" value={totals.poActualAmount} disabled />
          </div>
          <div className="space-y-1">
            <Label>GST %</Label>
            <Input
              type="number"
              value={totals.sgst}
              onChange={(e) => recalc(lines, { sgst: Number(e.target.value) || 0 })}
            />
          </div>
          <div className="space-y-1">
            <Label>Shipping</Label>
            <Input
              type="number"
              value={totals.shippingCharges}
              onChange={(e) =>
                recalc(lines, { shippingCharges: Number(e.target.value) || 0 })
              }
            />
          </div>
          <div className="space-y-1">
            <Label>Other</Label>
            <Input
              type="number"
              value={totals.otherCharges}
              onChange={(e) => recalc(lines, { otherCharges: Number(e.target.value) || 0 })}
            />
          </div>
          <div className="space-y-1 col-span-2">
            <Label>Total Amt</Label>
            <Input type="number" value={totals.poNetCost} disabled className="font-semibold" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Comparative statement</Label>
            <Input
              type="file"
              onChange={(e) => setComparativeFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <div className="space-y-1">
            <Label>Note document</Label>
            <Input type="file" onChange={(e) => setNoteFile(e.target.files?.[0] ?? null)} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Request text</Label>
          <textarea
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={totals.requestText}
            onChange={(e) => setTotals((t) => ({ ...t, requestText: e.target.value }))}
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
              disabled={
                saveMutation.isPending ||
                loadingExisting ||
                !storeId ||
                !supplierId ||
                !poTypeId
              }
            >
              {saveMutation.isPending ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      </div>
    </PageContainer>
  )
}
