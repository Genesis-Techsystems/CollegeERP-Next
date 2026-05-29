'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BookOpenIcon } from 'lucide-react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { DatePicker } from '@/common/components/date-picker'
import { Select } from '@/common/components/select'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { QK } from '@/lib/query-keys'
import { toastError, toastSuccess } from '@/lib/toast'
import { getErrorMessage } from '@/lib/errors'
import { toDateOnlyISO } from '@/common/generic-functions'
import {
  createInvInternalReturn,
  getInvInternalIssueById,
  getInvInternalReturnById,
  listInvInternalIssues,
  updateInvInternalReturn,
} from '@/services'
import type {
  InvInternalIssueDetail,
  InvInternalIssueItemRow,
  InvInternalReturnDetail,
  InvInternalReturnItemRow,
} from '@/types/inventory'

const RETURN_LIST = '/inventory-management/internal-item-return'

type ReturnLine = InvInternalReturnItemRow & { key: string }

function mapIssueItems(items: InvInternalIssueItemRow[]): ReturnLine[] {
  return items
    .filter((row) => row.isActive !== false)
    .map((row) => ({
      ...row,
      key: String(row.interIssueItemId ?? row.itemId ?? crypto.randomUUID()),
      checked: false,
      returnedQty: row.orderQuantity ?? row.indentQuantity ?? 0,
    }))
}

function mergeEditReturnItems(
  issueItems: ReturnLine[],
  savedItems: InvInternalReturnItemRow[],
): ReturnLine[] {
  return issueItems.map((row) => {
    const saved = savedItems.find((s) => s.itemId === row.itemId)
    if (!saved) return row
    return {
      ...row,
      ...saved,
      key: row.key,
      checked: true,
      interReturnItemId: saved.interReturnItemId,
      interIssueItemId: row.interIssueItemId ?? saved.interIssueItemId,
      createdDt: saved.createdDt,
    }
  })
}

export function InternalItemReturnForm({
  interReturnId,
  listPath = RETURN_LIST,
}: {
  interReturnId?: number
  listPath?: string
}) {
  const router = useRouter()
  const isEdit = Boolean(interReturnId && interReturnId > 0)

  const [issueId, setIssueId] = useState<string | null>(null)
  const [issue, setIssue] = useState<InvInternalIssueDetail | null>(null)
  const [internalReturnNo, setInternalReturnNo] = useState('')
  const [returnDate, setReturnDate] = useState<Date | null>(new Date())
  const [returnPurpose, setReturnPurpose] = useState('')
  const [itemList, setItemList] = useState<ReturnLine[]>([])

  const { data: issues = [] } = useQuery({
    queryKey: QK.invInternalIssues.list(),
    queryFn: listInvInternalIssues,
  })

  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: QK.invInternalReturns.detail(interReturnId ?? 0),
    queryFn: () => getInvInternalReturnById(interReturnId!),
    enabled: isEdit,
  })

  const issueOptions = useMemo(
    () =>
      issues
        .filter((row) => row.isActive !== false)
        .map((row) => ({
          value: String(row.interIssueId),
          label: row.internalIssueNo ?? String(row.interIssueId),
        })),
    [issues],
  )

  const loadIssue = useCallback(
    async (id: number, mergeSaved?: InvInternalReturnItemRow[]) => {
      const full = await getInvInternalIssueById(id)
      if (!full) return
      setIssue(full)
      let items = mapIssueItems(full.invInternalIssueItemDTOs ?? [])
      if (mergeSaved?.length) {
        items = mergeEditReturnItems(items, mergeSaved)
      }
      setItemList(items)
    },
    [],
  )

  useEffect(() => {
    if (!existing) return
    setInternalReturnNo(existing.internalReturnNo ?? '')
    setIssueId(existing.interIssueId ? String(existing.interIssueId) : null)
    setReturnPurpose(existing.returnPurpose ?? '')
    if (existing.returnDate) {
      const d = new Date(existing.returnDate)
      if (!Number.isNaN(d.getTime())) setReturnDate(d)
    } else {
      setReturnDate(null)
    }
    if (existing.interIssueId) {
      void loadIssue(existing.interIssueId, existing.invInternalReturnItemDTOs ?? [])
    }
  }, [existing, loadIssue])

  useEffect(() => {
    if (!issueId || isEdit) return
    const id = Number(issueId)
    if (!id) return
    void loadIssue(id).catch((err) => toastError(getErrorMessage(err)))
  }, [issueId, isEdit, loadIssue])

  function toggleItem(index: number, checked: boolean) {
    setItemList((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], checked }
      return next
    })
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!issueId || !issue) throw new Error('Please select an issue.')

      const invInternalReturnItemDTOs: InvInternalReturnItemRow[] = []
      for (const row of itemList) {
        const line = {
          ...row,
          returnedQty: row.indentQuantity ?? row.orderQuantity ?? row.returnedQty ?? 0,
        }
        if (row.interIssueItemId) {
          invInternalReturnItemDTOs.push({
            ...line,
            isActive: row.checked ? true : false,
          })
        } else if (row.checked) {
          invInternalReturnItemDTOs.push(line)
        }
      }

      if (!itemList.some((row) => row.checked && row.isActive !== false)) {
        throw new Error('Select at least one item to return.')
      }

      const payload: Record<string, unknown> = {
        interIssueId: Number(issueId),
        returnDate: returnDate ? toDateOnlyISO(returnDate) : undefined,
        returnPurpose: returnPurpose.trim(),
        poId: issue.poId,
        storeId: issue.storeId,
        fromEmployeeId: issue.toEmployeeId,
        invTranstypeCatdetId: issue.invTranstypeCatdetId,
        invInternalReturnItemDTOs,
        igst: 0,
        poActualAmount: 0,
        poTotalCost: 0,
        sgst: 0,
        shippingCharges: 0,
        otherCharges: 0,
        termsconditions: '',
        poComments: '',
        totalTax: 0,
        poNetCost: 0,
      }

      if (isEdit && interReturnId) {
        payload.interReturnId = interReturnId
        payload.internalReturnNo = internalReturnNo
        payload.createdDt = existing?.createdDt
        payload.isActive = existing?.isActive ?? true
        await updateInvInternalReturn(payload)
      } else {
        await createInvInternalReturn(payload)
      }
    },
    onSuccess: () => {
      toastSuccess(isEdit ? 'Internal return updated.' : 'Internal return created.')
      router.push(listPath)
    },
    onError: (err) => toastError(getErrorMessage(err)),
  })

  const title = isEdit ? 'Edit Internal Return' : 'New Internal Return'

  return (
    <PageContainer className="space-y-5">
      <div className="app-card overflow-hidden">
        <div className="p-4 md:p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
            <BookOpenIcon className="h-4 w-4 text-[#5da394]" aria-hidden />
            <h1 className="text-[15px] font-semibold text-[hsl(var(--card-title))]">{title}</h1>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="space-y-3">
              <Select
                label="Issue No."
                value={issueId}
                onChange={setIssueId}
                options={issueOptions}
                placeholder="Issue No."
                searchable
                disabled={isEdit}
              />
              {issue && (
                <>
                  <div className="grid grid-cols-[120px_1fr] gap-2 text-xs">
                    <span className="text-muted-foreground">Store</span>
                    <span className="font-semibold text-[hsl(var(--primary))]">
                      {issue.storeName ?? issue.storeCode ?? '—'}
                    </span>
                  </div>
                  <div className="grid grid-cols-[120px_1fr] gap-2 text-xs">
                    <span className="text-muted-foreground">From Employee</span>
                    <span className="font-semibold text-[hsl(var(--primary))]">
                      {issue.toEmpName ?? '—'}
                    </span>
                  </div>
                  <div className="grid grid-cols-[120px_1fr] gap-2 text-xs">
                    <span className="text-muted-foreground">Trans. Type</span>
                    <span className="font-semibold text-[hsl(var(--primary))]">
                      {issue.invTranstypeCatdetIdDisplayName ?? '—'}
                    </span>
                  </div>
                </>
              )}
            </div>

            <div className="space-y-3">
              {isEdit && (
                <div className="space-y-1.5">
                  <Label>Return No.</Label>
                  <Input value={internalReturnNo} disabled />
                </div>
              )}
              <DatePicker label="Return Date" value={returnDate} onChange={setReturnDate} />
            </div>
          </div>

          {itemList.length > 0 && (
            <>
              <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
                <h2 className="text-sm font-semibold text-[hsl(var(--card-title))]">Return Items</h2>
              </div>

              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/60">
                      <th className="w-10 px-2 py-2" />
                      <th className="px-3 py-2 text-left font-medium">Items</th>
                      <th className="px-3 py-2 text-right font-medium">Quantity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemList.map((row, idx) =>
                      row.isActive !== false ? (
                        <tr key={row.key} className="border-t border-border">
                          <td className="px-2 py-2 align-middle">
                            <Checkbox
                              checked={Boolean(row.checked)}
                              onCheckedChange={(v) => toggleItem(idx, v === true)}
                            />
                          </td>
                          <td className="px-3 py-2">{row.itemName ?? row.itemCode ?? '—'}</td>
                          <td className="px-3 py-2 text-right">{row.indentQuantity ?? 0}</td>
                        </tr>
                      ) : null,
                    )}
                  </tbody>
                </table>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="returnPurpose">Return Purpose</Label>
                <Textarea
                  id="returnPurpose"
                  className="min-h-[100px]"
                  placeholder="Return Purpose"
                  value={returnPurpose}
                  onChange={(e) => setReturnPurpose(e.target.value)}
                />
              </div>
            </>
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
                !issueId ||
                itemList.length === 0
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
