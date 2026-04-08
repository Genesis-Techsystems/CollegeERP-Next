'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTable } from '@/common/components/table'
import { TableCard } from '@/common/components/table/TableCard'
import type { ColDef } from 'ag-grid-community'
import { Badge } from '@/components/ui/badge'
import { listExamSessions, createExamSession, updateExamSession } from '@/services/examination'

export default function ExamSessionPage() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')

  const [form, setForm] = useState({
    examSessionName: '',
    examsessioninCatCode: '',
    universityCode: '',
    sessionStartTime: '',
    sessionEndTime: '',
    isActive: true,
    reason: 'active',
  })

  async function refresh() {
    setLoading(true)
    try {
      const data = await listExamSessions()
      setRows(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  const filtered = useMemo(() => {
    if (!q.trim()) return rows
    const lower = q.toLowerCase()
    return rows.filter((r) => JSON.stringify(r).toLowerCase().includes(lower))
  }, [q, rows])

  const filteredByStatus = useMemo(() => {
    if (statusFilter === 'all') return filtered
    if (statusFilter === 'active') return filtered.filter((r) => !!r.isActive)
    return filtered.filter((r) => !r.isActive)
  }, [filtered, statusFilter])

  const cols = useMemo<ColDef[]>(() => [
    { headerName: 'SI.No', valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1, width: 80 },
    { field: 'examSessionName', headerName: 'Session Name', minWidth: 180 },
    { field: 'examsessioninCatCode', headerName: 'Session In', minWidth: 120 },
    { field: 'universityCode', headerName: 'University Code', minWidth: 140 },
    {
      headerName: 'Start - End',
      minWidth: 180,
      valueGetter: (p) =>
        p.data?.sessionStartTime && p.data?.sessionEndTime
          ? `${p.data.sessionStartTime} - ${p.data.sessionEndTime}`
          : '—',
    },
    {
      field: 'isActive',
      headerName: 'Status',
      minWidth: 100,
      cellRenderer: (p: any) =>
        p.value ? (
          <Badge variant="outline" className="rounded-md border-emerald-200 bg-emerald-50 text-emerald-700 h-5 px-2 text-[11px] font-medium">
            Active
          </Badge>
        ) : (
          <Badge variant="outline" className="rounded-md border-red-200 bg-red-50 text-red-700 h-5 px-2 text-[11px] font-medium">
            InActive
          </Badge>
        ),
    },
    {
      headerName: 'Actions',
      minWidth: 120,
      cellRenderer: (p: any) => (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setEditing(p.data)
            setForm({
              examSessionName: p.data?.examSessionName ?? '',
              examsessioninCatCode: p.data?.examsessioninCatCode ?? '',
              universityCode: p.data?.universityCode ?? '',
              sessionStartTime: p.data?.sessionStartTime ?? '',
              sessionEndTime: p.data?.sessionEndTime ?? '',
              isActive: !!p.data?.isActive,
              reason: p.data?.reason ?? 'active',
            })
            setOpen(true)
          }}
        >
          Edit
        </Button>
      ),
    },
  ], [])

  async function save() {
    const payload = { ...form, reason: form.isActive ? 'active' : (form.reason || '') }
    if (editing?.examSessionId) {
      await updateExamSession(editing.examSessionId, payload)
    } else {
      await createExamSession(payload)
    }
    setOpen(false)
    setEditing(null)
    await refresh()
  }

  return (
    <div className="p-6 space-y-3">
      <div className="app-card overflow-hidden">
        <div className="px-3 py-2.5 border-b border-slate-200 bg-slate-50/60">
          <h2 className="text-[16px] font-semibold text-[hsl(var(--card-title))]">Exam Sessions</h2>
          <p className="mt-0.5 text-[12px] text-muted-foreground">Create and manage exam time slots</p>
        </div>
        <div className="px-3 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className={`h-5 rounded-md border px-2 text-[11px] font-medium ${statusFilter === 'all' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-600'}`}
              onClick={() => setStatusFilter('all')}
            >
              All
            </button>
            <button
              type="button"
              className={`h-5 rounded-md border px-2 text-[11px] font-medium ${statusFilter === 'active' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-200 text-slate-600'}`}
              onClick={() => setStatusFilter('active')}
            >
              Active
            </button>
            <button
              type="button"
              className={`h-5 rounded-md border px-2 text-[11px] font-medium ${statusFilter === 'inactive' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-white border-slate-200 text-slate-600'}`}
              onClick={() => setStatusFilter('inactive')}
            >
              InActive
            </button>
          </div>
        </div>
      </div>

      <TableCard
        headerLeft={
          <Input
            className="h-9 max-w-sm text-[12px]"
            placeholder="Search…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        }
        headerRight={
          <Button
            size="sm"
            onClick={() => {
              setEditing(null)
              setForm({
                examSessionName: '',
                examsessioninCatCode: '',
                universityCode: '',
                sessionStartTime: '',
                sessionEndTime: '',
                isActive: true,
                reason: 'active',
              })
              setOpen(true)
            }}
          >
            Add Exam Session
          </Button>
        }
      >
        <DataTable rowData={filteredByStatus} columnDefs={cols} loading={loading} pagination />
      </TableCard>

      <Dialog open={open} onOpenChange={(v) => { if (!v) { setOpen(false); setEditing(null) } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-[16px] font-semibold text-[hsl(var(--primary))]">
              {editing ? 'Edit Exam Session' : 'Add Exam Session'}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[12px]">Exam Session Name</Label>
              <Input className="h-9 text-[12px]" value={form.examSessionName} onChange={(e) => setForm((s) => ({ ...s, examSessionName: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-[12px]">Session In (Code)</Label>
              <Input className="h-9 text-[12px]" value={form.examsessioninCatCode} onChange={(e) => setForm((s) => ({ ...s, examsessioninCatCode: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-[12px]">University Code</Label>
              <Input className="h-9 text-[12px]" value={form.universityCode} onChange={(e) => setForm((s) => ({ ...s, universityCode: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-[12px]">Start Time (HH:mm:ss)</Label>
              <Input className="h-9 text-[12px]" value={form.sessionStartTime} onChange={(e) => setForm((s) => ({ ...s, sessionStartTime: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-[12px]">End Time (HH:mm:ss)</Label>
              <Input className="h-9 text-[12px]" value={form.sessionEndTime} onChange={(e) => setForm((s) => ({ ...s, sessionEndTime: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-[12px]">&nbsp;</Label>
              <label className="flex h-9 items-center gap-2 rounded-md border border-slate-200 px-2">
                <Checkbox checked={form.isActive} onCheckedChange={(v) => setForm((s) => ({ ...s, isActive: !!v }))} />
                <span className="text-[12px] text-slate-700">Active</span>
              </label>
            </div>
            {!form.isActive && (
              <div className="space-y-1 md:col-span-2">
                <Label className="text-[12px]">Reason</Label>
                <Input className="h-9 text-[12px]" value={form.reason} onChange={(e) => setForm((s) => ({ ...s, reason: e.target.value }))} />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setOpen(false); setEditing(null) }}>Close</Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

