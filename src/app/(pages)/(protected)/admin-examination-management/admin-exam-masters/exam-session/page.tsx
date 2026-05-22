'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Pencil, Plus } from 'lucide-react'
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
import { DataTable, TableCard } from '@/common/components/table'
import { TimePicker } from '@/common/components'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { StatusBadge } from '@/common/components/data-display'
import { PageContainer } from '@/components/layout'
import { useSessionContext } from '@/context/SessionContext'
import { listExamSessions, createExamSession, updateExamSession, getCollegeFilters } from '@/services/examination'
import { distinct } from '@/lib/utils'
import { toastError, toastSuccess } from '@/lib/toast'

// ── Column shape ─────────────────────────────────────────────────────────────
const COL_DEFS = {
  siNo:      { headerName: 'SI.No', valueGetter: (p: any) => (p.node?.rowIndex ?? 0) + 1, width: 80, flex: 0 } as ColDef,
  name:      { field: 'examSessionName', headerName: 'Session Name', flex: 1, minWidth: 180 } as ColDef,
  sessionIn: { field: 'examsessioninCatCode', headerName: 'Session In', minWidth: 120 } as ColDef,
  uniCode:   { field: 'universityCode', headerName: 'University Code', minWidth: 140 } as ColDef,
  startEnd:  {
    headerName: 'Session Start - End Times',
    minWidth: 200,
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
      type="button"
      size="sm"
      variant="ghost"
      aria-label="Edit exam session"
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
  )
}

export default function ExamSessionPage() {
  const { user } = useSessionContext()
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const [universityOptions, setUniversityOptions] = useState<{ code: string; name?: string }[]>([])
  const [universityOptionsLoaded, setUniversityOptionsLoaded] = useState(false)

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

  const ensureUniversityOptionsLoaded = useCallback(async () => {
    if (universityOptionsLoaded) return
    const orgIdFromStorage = Number(globalThis.localStorage?.getItem('organizationId') ?? 0)
    const empIdFromStorage = Number(globalThis.localStorage?.getItem('employeeId') ?? 0)
    const orgIdFromSession = Number(user?.organizationId ?? 0)
    const empIdFromSession = Number(user?.employeeId ?? 0)
    const orgId = orgIdFromStorage || orgIdFromSession || 1
    const empId = empIdFromStorage || empIdFromSession || 31754
    const { filtersData } = await getCollegeFilters(orgId, empId).catch(() => ({ filtersData: [] as any[] }))
    const uniRows = distinct(filtersData ?? [], (r: any) => r.fk_university_id)
    const options = uniRows
      .map((u: any) => ({
        code: String(u.university_code ?? '').trim(),
        name: String(u.university_name ?? '').trim(),
      }))
      .filter((u: any) => u.code)
    setUniversityOptions(options)
    setUniversityOptionsLoaded(true)
  }, [universityOptionsLoaded, user?.employeeId, user?.organizationId])

  useEffect(() => {
    if (!open) return
    void ensureUniversityOptionsLoaded()
  }, [ensureUniversityOptionsLoaded, open])

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
      COL_DEFS.uniCode,
      COL_DEFS.name,
      COL_DEFS.sessionIn,
      COL_DEFS.startEnd,
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      { ...COL_DEFS.actions, cellRenderer: makeActionsRenderer(setEditing, setForm, setOpen) },
    ],
    [],
  )

  async function save() {
    const payload: Record<string, unknown> = {
      examSessionName: form.examSessionName.trim(),
      examsessioninCatCode: form.examsessioninCatCode.trim(),
      // Some backends still bind this camel-case variant.
      examSessionInCatCode: form.examsessioninCatCode.trim(),
      universityCode: form.universityCode.trim(),
      sessionStartTime: form.sessionStartTime || null,
      sessionEndTime: form.sessionEndTime || null,
      isActive: form.isActive,
      reason: form.isActive ? 'active' : (form.reason || '').trim(),
    }

    try {
      if (editing?.examSessionId) {
        payload.examSessionId = editing.examSessionId
        await updateExamSession(editing.examSessionId, payload)
        toastSuccess('Exam session updated successfully')
      } else {
        await createExamSession(payload)
        toastSuccess('Exam session created successfully')
      }
    } catch (error) {
      toastError(error, `Failed to ${editing?.examSessionId ? 'update' : 'create'} exam session`)
      return
    }

    setOpen(false)
    setEditing(null)
    await refresh()
  }

  return (
    <PageContainer className="space-y-4">
      <div className="app-card overflow-hidden px-4 py-3">
        <h1 className="app-card-title">
          Exam Sessions
        </h1>
      </div>

      <TableCard withHeaderBorder={false}>
        <DataTable
          rowData={rows}
          columnDefs={columnDefs}
          loading={loading}
          pagination
          toolbar={{
            search: true,
            searchPlaceholder: 'Search exam sessions…',
            pdfDocumentTitle: 'Exam Sessions',
          }}
          toolbarTrailing={(
            <Button
              type="button"
              size="sm"
              className="h-[30px] px-3 text-[12px]"
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
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add Exam Session
            </Button>
          )}
        />
      </TableCard>

      <Dialog open={open} onOpenChange={(v) => { if (!v) { setOpen(false); setEditing(null) } }}>
        <DialogContent hideClose className="max-w-2xl p-0 overflow-hidden">
          <DialogHeader className="px-4 py-3 border-b border-border bg-muted/40">
            <DialogTitle className="text-[16px] font-semibold text-[hsl(var(--primary))]">
              {editing ? 'Edit Exam Session' : 'Add Exam Session'}
            </DialogTitle>
          </DialogHeader>

          <div className="grid min-w-0 grid-cols-1 gap-3 p-4 md:grid-cols-2">
            <div className="min-w-0 space-y-1">
              <Label className="text-[12px]">Exam Session Name</Label>
              <Input className="h-9 text-[12px]" value={form.examSessionName} onChange={(e) => setForm((s) => ({ ...s, examSessionName: e.target.value }))} />
            </div>
            <div className="min-w-0 space-y-1">
              <Label className="text-[12px]">Session In (Code)</Label>
              <Input className="h-9 text-[12px]" value={form.examsessioninCatCode} onChange={(e) => setForm((s) => ({ ...s, examsessioninCatCode: e.target.value }))} />
            </div>
            <div className="min-w-0 space-y-1">
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
            <div className="min-w-0 space-y-1">
              <Label className="text-[12px]">Active</Label>
              <label className="flex h-9 min-w-0 items-center gap-2 rounded-md border border-border bg-card px-2">
                <Checkbox checked={form.isActive} onCheckedChange={(v) => setForm((s) => ({ ...s, isActive: !!v }))} />
                <span className="text-[12px] text-slate-700">Session is active</span>
              </label>
            </div>
            <div className="min-w-0 space-y-1">
              <TimePicker
                value={form.sessionStartTime}
                onChange={(next) => setForm((s) => ({ ...s, sessionStartTime: next }))}
                label="Start Time"
              />
            </div>
            <div className="min-w-0 space-y-1">
              <TimePicker
                value={form.sessionEndTime}
                onChange={(next) => setForm((s) => ({ ...s, sessionEndTime: next }))}
                label="End Time"
              />
            </div>
            {!form.isActive && (
              <div className="space-y-1 md:col-span-2">
                <Label className="text-[12px]">Reason</Label>
                <Input className="h-9 text-[12px]" value={form.reason} onChange={(e) => setForm((s) => ({ ...s, reason: e.target.value }))} />
              </div>
            )}
          </div>

          <DialogFooter className="px-4 pb-4">
            <Button type="button" variant="outline" onClick={() => { setOpen(false); setEditing(null) }}>Close</Button>
            <Button type="button" onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}
