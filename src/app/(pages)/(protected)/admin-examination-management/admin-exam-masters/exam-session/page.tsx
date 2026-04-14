'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DataTable } from '@/common/components/table'
import { TableCard } from '@/common/components/table'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { StatusBadge } from '@/common/components/data-display'
import { PageContainer, PageHeader } from '@/components/layout'
import { listExamSessions, createExamSession, updateExamSession, getCollegeFilters } from '@/services/examination'
import { distinct } from '@/lib/utils'

// ── Column shape ─────────────────────────────────────────────────────────────
const COL_DEFS = {
  siNo:      { headerName: 'SI.No', valueGetter: (p: any) => (p.node?.rowIndex ?? 0) + 1, width: 80, flex: 0 } as ColDef,
  name:      { field: 'examSessionName', headerName: 'Session Name', flex: 1, minWidth: 180 } as ColDef,
  sessionIn: { field: 'examsessioninCatCode', headerName: 'Session In', minWidth: 120 } as ColDef,
  uniCode:   { field: 'universityCode', headerName: 'University Code', minWidth: 140 } as ColDef,
  startEnd:  {
    headerName: 'Start - End',
    minWidth: 180,
    valueGetter: (p: any) =>
      p.data?.sessionStartTime && p.data?.sessionEndTime
        ? `${p.data.sessionStartTime} - ${p.data.sessionEndTime}`
        : '—',
  } as ColDef,
  isActive:  { field: 'isActive', headerName: 'Status', width: 100, flex: 0 } as ColDef,
  actions:   { headerName: 'Actions', width: 120, flex: 0 } as ColDef,
}

// ── Pure renderers ────────────────────────────────────────────────────────────
function statusRenderer(p: ICellRendererParams) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

function makeActionsRenderer(
  setEditing: (row: any) => void,
  setForm: (form: any) => void,
  setOpen: (v: boolean) => void,
) {
  return (p: ICellRendererParams) => (
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
  )
}

export default function ExamSessionPage() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const [filterOpen, setFilterOpen] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [universityOptions, setUniversityOptions] = useState<{ code: string; name?: string }[]>([])

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

  useEffect(() => {
    async function loadUniversities() {
      const { filtersData } = await getCollegeFilters(0, 0).catch(() => ({ filtersData: [] as any[] }))
      const uniRows = distinct(filtersData ?? [], (r: any) => r.fk_university_id)
      const options = uniRows
        .map((u: any) => ({
          code: String(u.university_code ?? '').trim(),
          name: String(u.university_name ?? '').trim(),
        }))
        .filter((u: any) => u.code)
      setUniversityOptions(options)
    }
    loadUniversities()
  }, [])

  const filtered = useMemo(() => {
    if (!q.trim()) return rows
    const lower = q.toLowerCase()
    return rows.filter((r) => JSON.stringify(r).toLowerCase().includes(lower))
  }, [q, rows])

  const filteredByStatus = useMemo(() => {
    if (statusFilter === 'all') return filtered
    return filtered.filter((r) => statusFilter === 'active' ? !!r.isActive : !r.isActive)
  }, [filtered, statusFilter])
  function formatTime12h(value?: string) {
    if (!value) return ''
    const raw = String(value).trim()
    const m = raw.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/)
    if (!m) return raw
    const hh = Number(m[1])
    const mm = m[2]
    if (!Number.isFinite(hh)) return raw
    const ampm = hh >= 12 ? 'PM' : 'AM'
    const hour12 = hh % 12 === 0 ? 12 : hh % 12
    return `${hour12}:${mm} ${ampm}`
  }

  // ── Column assembly ─────────────────────────────────────────────────────────
  const columnDefs = useMemo<ColDef[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.name,
      COL_DEFS.sessionIn,
      COL_DEFS.uniCode,
      COL_DEFS.startEnd,
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      { ...COL_DEFS.actions, cellRenderer: makeActionsRenderer(setEditing, setForm, setOpen) },
    ],
    [],
  )

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
    <PageContainer className="space-y-5">
      <PageHeader title="Exam Sessions" subtitle="Create and manage exam time slots" />

      <div className="app-card overflow-hidden">
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
        <DataTable rowData={filteredByStatus} columnDefs={columnDefs} loading={loading} pagination />
      </TableCard>

      <Dialog open={open} onOpenChange={(v) => { if (!v) { setOpen(false); setEditing(null) } }}>
        <DialogContent hideClose className="max-w-2xl p-0 overflow-hidden">
          <DialogHeader className="px-4 py-3 border-b border-slate-200 bg-slate-50/60">
            <DialogTitle className="text-[16px] font-semibold text-[hsl(var(--primary))]">
              {editing ? 'Edit Exam Session' : 'Add Exam Session'}
            </DialogTitle>
          </DialogHeader>

          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
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
              <Select
                value={form.universityCode || undefined}
                onValueChange={(v) => setForm((s) => ({ ...s, universityCode: v }))}
              >
                <SelectTrigger className="h-9 text-[12px]">
                  <SelectValue placeholder="Select University" />
                </SelectTrigger>
                <SelectContent>
                  {universityOptions.map((u) => (
                    <SelectItem key={u.code} value={u.code}>
                      {u.code}{u.name ? ` - ${u.name}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[12px]">Start Time</Label>
              <Input type="time" step="1" className="h-9 text-[12px]" value={form.sessionStartTime} onChange={(e) => setForm((s) => ({ ...s, sessionStartTime: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-[12px]">End Time</Label>
              <Input type="time" step="1" className="h-9 text-[12px]" value={form.sessionEndTime} onChange={(e) => setForm((s) => ({ ...s, sessionEndTime: e.target.value }))} />
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

          <DialogFooter className="px-4 pb-4">
            <Button variant="outline" onClick={() => { setOpen(false); setEditing(null) }}>Close</Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}
