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
import { Checkbox } from '@/components/ui/checkbox'
import { QK } from '@/lib/query-keys'
import { toastError, toastSuccess } from '@/lib/toast'
import { getErrorMessage } from '@/lib/errors'
import { toDateOnlyISO } from '@/common/generic-functions'
import {
  createInvInternalIssue,
  getInternalIndentById,
  getInvInternalIssueById,
  listInternalIndents,
  searchEmployeesForHr,
  updateInvInternalIssue,
} from '@/services'
import type { InvInternalIndentItemRow, InvInternalIndentRow } from '@/types/e-office'
import type { InvInternalIssueDetail, InvInternalIssueItemRow } from '@/types/inventory'

const ISSUE_LIST = '/inventory-management/internal-item-issue'

type IssueLine = InvInternalIssueItemRow & { key: string }

function employeeLabel(row: Record<string, unknown>): string {
  const name = String(row.firstName ?? '').trim()
  const num = row.empNumber != null ? String(row.empNumber) : ''
  return num ? `${name} (${num})` : name || String(row.employeeId ?? '')
}

function mapIndentItems(items: InvInternalIndentItemRow[]): IssueLine[] {
  return items
    .filter((row) => row.isActive !== false)
    .map((row) => ({
      ...row,
      key: String(row.interIndItemId ?? row.itemId ?? crypto.randomUUID()),
      checked: false,
      returnedQty: row.orderQuantity ?? row.indentQuantity ?? 0,
    }))
}

function mergeEditItems(
  indentItems: IssueLine[],
  savedItems: InvInternalIssueItemRow[],
): IssueLine[] {
  return indentItems.map((row) => {
    const saved = savedItems.find((s) => s.itemId === row.itemId)
    if (!saved) return row
    return {
      ...row,
      ...saved,
      key: row.key,
      checked: true,
      interIssueItemId: saved.interIssueItemId,
      createdDt: saved.createdDt,
    }
  })
}

export function InternalIssueForm({
  interIssueId,
  listPath = ISSUE_LIST,
}: {
  interIssueId?: number
  listPath?: string
}) {
  const router = useRouter()
  const isEdit = Boolean(interIssueId && interIssueId > 0)

  const [indentId, setIndentId] = useState<string | null>(null)
  const [indent, setIndent] = useState<InvInternalIndentRow | null>(null)
  const [toEmployeeId, setToEmployeeId] = useState<string | null>(null)
  const [employeeOptions, setEmployeeOptions] = useState<{ value: string; label: string }[]>([])
  const [employeeSearchLoading, setEmployeeSearchLoading] = useState(false)
  const [internalIssueNo, setInternalIssueNo] = useState('')
  const [issueDate, setIssueDate] = useState<Date | null>(new Date())
  const [itemList, setItemList] = useState<IssueLine[]>([])

  const { data: indents = [] } = useQuery({
    queryKey: QK.invInternalIndents.list(),
    queryFn: listInternalIndents,
  })

  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: QK.invInternalIssues.detail(interIssueId ?? 0),
    queryFn: () => getInvInternalIssueById(interIssueId!),
    enabled: isEdit,
  })

  const indentOptions = useMemo(
    () =>
      indents.map((ind) => ({
        value: String(ind.internalIndId),
        label: ind.internalIndNo ?? String(ind.internalIndId),
      })),
    [indents],
  )

  const loadIndent = useCallback(async (id: number, mergeSaved?: InvInternalIssueItemRow[]) => {
    const full = await getInternalIndentById(id)
    if (!full) return
    setIndent(full)
    let items = mapIndentItems(full.invInternalIndentitems ?? [])
    if (mergeSaved?.length) {
      items = mergeEditItems(items, mergeSaved)
    }
    setItemList(items)
  }, [])

  useEffect(() => {
    if (!existing) return
    setInternalIssueNo(existing.internalIssueNo ?? '')
    setIndentId(existing.internalIndId ? String(existing.internalIndId) : null)
    setToEmployeeId(existing.toEmployeeId ? String(existing.toEmployeeId) : null)
    if (existing.issueDate) {
      const d = new Date(existing.issueDate)
      if (!Number.isNaN(d.getTime())) setIssueDate(d)
    } else {
      setIssueDate(null)
    }
    if (existing.toEmpName) {
      setEmployeeOptions([
        {
          value: String(existing.toEmployeeId ?? ''),
          label: existing.toEmpName,
        },
      ])
    }
    if (existing.internalIndId) {
      void loadIndent(existing.internalIndId, existing.invInternalIssueItemDTOs ?? [])
    }
  }, [existing, loadIndent])

  useEffect(() => {
    if (!indentId || isEdit) return
    const id = Number(indentId)
    if (!id) return
    void loadIndent(id).catch((err) => toastError(getErrorMessage(err)))
  }, [indentId, isEdit, loadIndent])

  async function onEmployeeSearch(term: string) {
    const q = term.trim()
    if (q.length < 4) {
      setEmployeeOptions([])
      return
    }
    setEmployeeSearchLoading(true)
    try {
      const rows = await searchEmployeesForHr(q)
      setEmployeeOptions(
        rows.map((row) => ({
          value: String(row.employeeId),
          label: employeeLabel(row as Record<string, unknown>),
        })),
      )
    } catch {
      setEmployeeOptions([])
    } finally {
      setEmployeeSearchLoading(false)
    }
  }

  function toggleItem(index: number, checked: boolean) {
    setItemList((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], checked }
      return next
    })
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!indentId || !indent) throw new Error('Please select an indent.')
      if (!toEmployeeId) throw new Error('Please select an employee.')

      const invInternalIssueItemDTOs: InvInternalIssueItemRow[] = []
      for (const row of itemList) {
        const line = { ...row, returnedQty: row.indentQuantity ?? row.orderQuantity ?? 0 }
        if (row.interIssueItemId) {
          invInternalIssueItemDTOs.push({
            ...line,
            isActive: row.checked ? true : false,
          })
        } else if (row.checked) {
          invInternalIssueItemDTOs.push(line)
        }
      }

      if (invInternalIssueItemDTOs.length === 0) {
        throw new Error('Select at least one item to issue.')
      }

      const payload: Record<string, unknown> = {
        internalIndId: Number(indentId),
        toEmployeeId: Number(toEmployeeId),
        issueDate: issueDate ? toDateOnlyISO(issueDate) : undefined,
        poId: indent.poId,
        storeId: indent.storeId,
        invTranstypeCatdetId: indent.invTranstypeCatdetId,
        invInternalIssueItemDTOs,
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

      if (isEdit && interIssueId) {
        payload.interIssueId = interIssueId
        payload.internalIssueNo = internalIssueNo
        payload.createdDt = existing?.createdDt
        payload.isActive = existing?.isActive ?? true
        await updateInvInternalIssue(payload)
      } else {
        await createInvInternalIssue(payload)
      }
    },
    onSuccess: () => {
      toastSuccess(isEdit ? 'Internal issue updated.' : 'Internal issue created.')
      router.push(listPath)
    },
    onError: (err) => toastError(getErrorMessage(err)),
  })

  const title = isEdit ? 'Edit Internal Issue' : 'New Internal Issue'

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
                label="Indent No."
                value={indentId}
                onChange={setIndentId}
                options={indentOptions}
                placeholder="Indent No."
                searchable
                disabled={isEdit}
              />
              <Select
                label="To Employee"
                value={toEmployeeId}
                onChange={setToEmployeeId}
                options={employeeOptions}
                placeholder="Employee"
                searchable
                onSearch={(term) => void onEmployeeSearch(term)}
                isLoading={employeeSearchLoading}
              />
              {indent && (
                <>
                  <div className="grid grid-cols-[120px_1fr] gap-2 text-xs">
                    <span className="text-muted-foreground">Store</span>
                    <span className="font-semibold text-[hsl(var(--primary))]">
                      {indent.storeName ?? '—'}
                    </span>
                  </div>
                  <div className="grid grid-cols-[120px_1fr] gap-2 text-xs">
                    <span className="text-muted-foreground">Trans. Type</span>
                    <span className="font-semibold text-[hsl(var(--primary))]">
                      {indent.invTranstypeCatdetDisplayName ?? '—'}
                    </span>
                  </div>
                </>
              )}
            </div>

            <div className="space-y-3">
              {isEdit && (
                <div className="space-y-1.5">
                  <Label>Issue No.</Label>
                  <Input value={internalIssueNo} disabled />
                </div>
              )}
              <DatePicker label="Issue Date" value={issueDate} onChange={setIssueDate} />
            </div>
          </div>

          {itemList.length > 0 && (
            <>
              <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
                <h2 className="text-sm font-semibold text-[hsl(var(--card-title))]">Issue Items</h2>
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
                !indentId ||
                !toEmployeeId ||
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
