'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { format, parseISO } from 'date-fns'
import type { ColDef, ICellRendererParams, ValueFormatterParams } from 'ag-grid-community'
import { DataTable } from '@/common/components/table'
import { TableCard } from '@/common/components/table'
import { StatusBadge } from '@/common/components/data-display'
import { PageContainer, PageHeader } from '@/components/layout'
import {
  createInvigilatorRemuneration,
  listActiveColleges,
  listInvigilatorDesignationTypes,
  listInvigilatorRemunerations,
  updateInvigilatorRemuneration,
} from '@/services/invigilator-remuneration'
import { Pencil } from 'lucide-react'

type AnyRow = Record<string, any>

function getRemunerationId(r: AnyRow | null | undefined): number {
  return Number(
    r?.examInvgRemunerationId ??
    r?.examInvigilationRemunerationId ??
    r?.examInvigilatorRemunerationId ??
    r?.invigilatorRemunerationId ??
    r?.invigRemunerationId ??
    0,
  )
}

// ── Column shape ─────────────────────────────────────────────────────────────
const COL_DEFS = {
  siNo:        { headerName: 'No.', valueGetter: (p: any) => (p.node?.rowIndex ?? 0) + 1, width: 60, flex: 0 } as ColDef,
  designation: { field: 'invgdesignationCatCode', headerName: 'Invigilator Designation', flex: 1, minWidth: 160 } as ColDef,
  college:     { field: 'collegeCode', headerName: 'College', minWidth: 120 } as ColDef,
  amount:      { field: 'amount', headerName: 'Remuneration', width: 130, flex: 0 } as ColDef,
  fromDate:    { field: 'fromDate', headerName: 'From Date', width: 120, flex: 0 } as ColDef,
  toDate:      { field: 'toDate', headerName: 'To Date', width: 120, flex: 0 } as ColDef,
  isActive:    { field: 'isActive', headerName: 'Status', width: 90, flex: 0 } as ColDef,
  actions:     { headerName: 'Actions', width: 90, flex: 0 } as ColDef,
}

// ── Pure renderers ────────────────────────────────────────────────────────────
function statusRenderer(p: ICellRendererParams) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

function dateFormatter(p: ValueFormatterParams) {
  if (!p.value) return '—'
  try { return format(parseISO(String(p.value)), 'dd MMM yyyy') } catch { return String(p.value) }
}

function makeActionsRenderer(openEdit: (row: AnyRow) => void) {
  return (p: ICellRendererParams) => (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-8 w-8 p-0"
      aria-label="Edit invigilator remuneration"
      onClick={() => p.data && openEdit(p.data)}
    >
      <Pencil className="h-3.5 w-3.5" />
    </Button>
  )
}

export default function InvigilatorRemunerationPage() {
  const [rows, setRows] = useState<AnyRow[]>([])
  const [colleges, setColleges] = useState<AnyRow[]>([])
  const [designations, setDesignations] = useState<AnyRow[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<AnyRow | null>(null)

  const [collegeId, setCollegeId] = useState<number | null>(null)
  const [invgdesignationCatId, setInvgdesignationCatId] = useState<number | null>(null)
  const [amount, setAmount] = useState<string>('')
  const [fromDate, setFromDate] = useState<string>('')
  const [toDate, setToDate] = useState<string>('')
  const [isActive, setIsActive] = useState(true)
  const [reason, setReason] = useState('active')

  async function loadAll() {
    const [list, clgs, desg] = await Promise.all([
      listInvigilatorRemunerations().catch(() => []),
      listActiveColleges().catch(() => []),
      listInvigilatorDesignationTypes().catch(() => []),
    ])
    setRows(Array.isArray(list) ? list : [])
    setColleges(Array.isArray(clgs) ? clgs : [])
    setDesignations(Array.isArray(desg) ? desg : [])
  }

  useEffect(() => {
    loadAll()
  }, [])

  function openAdd() {
    setEditing(null)
    setCollegeId(colleges[0]?.collegeId ?? colleges[0]?.fk_college_id ?? null)
    setInvgdesignationCatId(designations[0]?.generalDetailId ?? null)
    setAmount('')
    const today = format(new Date(), 'yyyy-MM-dd')
    setFromDate(today)
    setToDate(today)
    setIsActive(true)
    setReason('active')
    setOpen(true)
  }

  const openEdit = useCallback((r: AnyRow) => {
    setEditing(r)
    setCollegeId(Number(r.collegeId ?? r.fk_college_id ?? r.college?.collegeId ?? null))
    setInvgdesignationCatId(
      Number(r.invgdesignationCatId ?? r.invgdesignationCat?.generalDetailId ?? r.generalDetailId ?? null),
    )
    setAmount(String(r.amount ?? ''))
    try { setFromDate(r.fromDate ? format(parseISO(String(r.fromDate)), 'yyyy-MM-dd') : '') } catch { setFromDate('') }
    try { setToDate(r.toDate ? format(parseISO(String(r.toDate)), 'yyyy-MM-dd') : '') } catch { setToDate('') }
    setIsActive(Boolean(r.isActive))
    setReason(String(r.reason ?? ''))
    setOpen(true)
  }, [])

  async function save() {
    if (!collegeId || !invgdesignationCatId || !amount || !fromDate || !toDate) return
    if (fromDate > toDate) {
      alert('From date should be less than To date.')
      return
    }
    const editId = getRemunerationId(editing)
    const basePayload = {
      collegeId,
      invgdesignationCatId,
      amount: Number(amount),
      fromDate,
      toDate,
      isActive,
      reason: reason || (isActive ? 'active' : 'inactive'),
    }

    let res: AnyRow | null = null
    if (editing && !editId) {
      alert('Unable to identify selected record for update. Please refresh and try again.')
      return
    }
    if (editId) {
      const updatePayload = {
        ...basePayload,
        examInvgRemunerationId: editId,
      }
      res = await updateInvigilatorRemuneration(editId, updatePayload).catch((e) => ({ __error: e }))
    } else {
      res = await createInvigilatorRemuneration(basePayload).catch((e) => ({ __error: e }))
    }
    if ((res as AnyRow | null)?.__error) {
      const err = (res as AnyRow).__error
      const msg =
        err?.message ??
        err?.response?.data?.message ??
        err?.body?.message ??
        'Unable to save changes. Please verify fields and try again.'
      alert(msg)
      return
    }
    setOpen(false)
    await loadAll()
  }

  // ── Column assembly ─────────────────────────────────────────────────────────
  const columnDefs = useMemo<ColDef[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.designation,
      COL_DEFS.college,
      COL_DEFS.amount,
      { ...COL_DEFS.fromDate, valueFormatter: dateFormatter },
      { ...COL_DEFS.toDate,   valueFormatter: dateFormatter },
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      { ...COL_DEFS.actions,  cellRenderer: makeActionsRenderer(openEdit) },
    ],
    [openEdit],
  )

  return (
    <PageContainer className="space-y-4">
      <PageHeader title="Exam Invigilator Remuneration" subtitle="Manage invigilator pay rates" />

      <TableCard withHeaderBorder={false}>
        <DataTable
          title=""
          rowData={rows}
          columnDefs={columnDefs}
          pagination
          toolbar={{
            search: true,
            searchPlaceholder: 'Search by college, designation, amount…',
            pdfDocumentTitle: 'Invigilator Remuneration',
          }}
          toolbarTrailing={(
            <Button
              type="button"
              size="sm"
              className="h-[30px] px-3 text-[12px]"
              onClick={openAdd}
            >
              + Add Invigilator Remuneration
            </Button>
          )}
        />
      </TableCard>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-[hsl(var(--primary))]">
              {editing ? 'Edit Invigilator Remuneration' : 'Add Invigilator Remuneration'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>College</Label>
              <Select value={collegeId ? String(collegeId) : undefined} onValueChange={(v) => setCollegeId(Number(v))}>
                <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="College" /></SelectTrigger>
                <SelectContent>
                  {colleges.map((c, i) => (
                    <SelectItem key={`c-${c.collegeId ?? c.fk_college_id ?? i}`} value={String(c.collegeId ?? c.fk_college_id)}>
                      {c.collegeCode ?? c.college_code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Invigilator Designation</Label>
              <Select value={invgdesignationCatId ? String(invgdesignationCatId) : undefined} onValueChange={(v) => setInvgdesignationCatId(Number(v))}>
                <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Designation" /></SelectTrigger>
                <SelectContent>
                  {designations.map((d, i) => (
                    <SelectItem key={`d-${d.generalDetailId ?? i}`} value={String(d.generalDetailId)}>
                      {d.generalDetailCode}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Amount</Label>
              <Input className="h-8 text-[12px]" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>From Date</Label>
              <Input className="h-8 text-[12px]" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>To Date</Label>
              <Input className="h-8 text-[12px]" type="date" min={fromDate || undefined} value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={isActive ? '1' : '0'} onValueChange={(v) => setIsActive(v === '1')}>
                <SelectTrigger className="h-8 text-[12px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Active</SelectItem>
                  <SelectItem value="0">InActive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {!isActive && (
              <div className="space-y-1 md:col-span-2">
                <Label>Reason</Label>
                <Input className="h-8 text-[12px]" value={reason} onChange={(e) => setReason(e.target.value)} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Close</Button>
            <Button type="button" onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}
