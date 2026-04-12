'use client'

import { useEffect, useMemo, useState } from 'react'
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

export default function InvigilatorRemunerationPage() {
  const [rows, setRows] = useState<AnyRow[]>([])
  const [colleges, setColleges] = useState<AnyRow[]>([])
  const [designations, setDesignations] = useState<AnyRow[]>([])
  const [q, setQ] = useState('')
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

  const filteredRows = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return rows
    return rows.filter((r) =>
      `${r.collegeCode ?? ''} ${r.invgdesignationCatCode ?? ''} ${r.amount ?? ''}`.toLowerCase().includes(s),
    )
  }, [rows, q])

  function openAdd() {
    setEditing(null)
    setCollegeId(colleges[0]?.collegeId ?? colleges[0]?.fk_college_id ?? null)
    setInvgdesignationCatId(designations[0]?.generalDetailId ?? null)
    setAmount('')
    const today = new Date().toISOString().slice(0, 10)
    setFromDate(today)
    setToDate(today)
    setIsActive(true)
    setReason('active')
    setOpen(true)
  }

  function openEdit(r: AnyRow) {
    setEditing(r)
    setCollegeId(Number(r.collegeId ?? r.fk_college_id ?? r.college?.collegeId ?? null))
    setInvgdesignationCatId(
      Number(r.invgdesignationCatId ?? r.invgdesignationCat?.generalDetailId ?? r.generalDetailId ?? null),
    )
    setAmount(String(r.amount ?? ''))
    setFromDate(String(r.fromDate ?? r.from_date ?? '').slice(0, 10))
    setToDate(String(r.toDate ?? r.to_date ?? '').slice(0, 10))
    setIsActive(String(r.isActive ?? '').toLowerCase() === 'true' || Number(r.isActive) === 1)
    setReason(String(r.reason ?? ''))
    setOpen(true)
  }

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

  return (
    <div className="px-6 pb-6 pt-2 space-y-2">
      <div className="app-card overflow-hidden">
        <div className="px-3 py-2.5 border-b border-slate-200 bg-slate-50/60">
          <h2 className="text-[16px] font-semibold text-[hsl(var(--primary))]">Exam Invigilator Remuneration</h2>
        </div>
        <div className="p-3 space-y-2">
        <div className="flex items-center gap-3">
          <Input className="h-8 text-[12px] max-w-sm" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="ml-auto">
            <Button className="h-8 text-[12px]" onClick={openAdd}>+ Add Invigilator Remuneration</Button>
          </div>
        </div>
        <div className="rounded-md border overflow-auto">
          <table className="w-full text-[12px]">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-2 py-1 text-left">No.</th>
                <th className="px-2 py-1 text-left">Invigilator Designation</th>
                <th className="px-2 py-1 text-left">College</th>
                <th className="px-2 py-1 text-left">Amount</th>
                <th className="px-2 py-1 text-left">From Date</th>
                <th className="px-2 py-1 text-left">To Date</th>
                <th className="px-2 py-1 text-left">Status</th>
                <th className="px-2 py-1 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((r, i) => (
                <tr key={`r-${getRemunerationId(r) || i}`}>
                  <td className="px-2 py-1">{i + 1}</td>
                  <td className="px-2 py-1">{r.invgdesignationCatCode}</td>
                  <td className="px-2 py-1">{r.collegeCode}</td>
                  <td className="px-2 py-1">{r.amount}</td>
                  <td className="px-2 py-1">{String(r.fromDate ?? '').slice(0, 10)}</td>
                  <td className="px-2 py-1">{String(r.toDate ?? '').slice(0, 10)}</td>
                  <td className="px-2 py-1">{r.isActive ? 'Active' : 'InActive'}</td>
                  <td className="px-2 py-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(r)} aria-label="Edit remuneration">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
              {filteredRows.length === 0 && (
                <tr>
                  <td className="px-2 py-2 text-muted-foreground" colSpan={8}>No records</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        </div>
      </div>

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
            <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

