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
import { TableCard } from '@/common/components/table/TableCard'
import type { ColDef } from 'ag-grid-community'
import { Badge } from '@/components/ui/badge'
import { listExamSessions, createExamSession, updateExamSession, getCollegeFilters } from '@/services/examination'
import { ChevronDown, Filter, Pencil } from 'lucide-react'
import { distinct } from '@/lib/utils'

export default function ExamSessionPage() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const [filterOpen, setFilterOpen] = useState(true)
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
          ? `${formatTime12h(p.data.sessionStartTime)} - ${formatTime12h(p.data.sessionEndTime)}`
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
          className="h-8 w-8 p-0"
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
          <Pencil className="h-4 w-4" />
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
    <div className="px-6 pb-6 pt-2 space-y-3">
      <div className="app-card overflow-hidden">
        <div className="px-3 py-2.5 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between gap-2">
          <h2 className="text-[16px] font-semibold text-[hsl(var(--card-title))]">Exam Sessions</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-6 px-2.5 text-[12px]"
            onClick={() => setFilterOpen((v) => !v)}
            aria-expanded={filterOpen}
          >
            <Filter className="mr-1.5 h-3.5 w-3.5" />
            Filter
            <ChevronDown className={`ml-1.5 h-3.5 w-3.5 transition-transform ${filterOpen ? 'rotate-180' : ''}`} />
          </Button>
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
        <DataTable rowData={filtered} columnDefs={cols} loading={loading} pagination />
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
    </div>
  )
}

