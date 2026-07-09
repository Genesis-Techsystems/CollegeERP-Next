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
import { listExamSessions, createExamSession, updateExamSession, getCollegeFilters, listGeneralDetailsByMaster } from '@/services/examination'
import { GM_CODES } from '@/config/constants/ui'
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
  setFieldErrors: (errors: Record<string, string>) => void,
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
          examsessioninCatId: String(
            p.data?.examsessioninCatId ??
            p.data?.examsessionin_cat_id ??
            '',
          ),
          universityCode: p.data?.universityCode ?? '',
          sessionStartTime: p.data?.sessionStartTime ?? '',
          sessionEndTime: p.data?.sessionEndTime ?? '',
          isActive: !!p.data?.isActive,
          reason: p.data?.reason ?? 'active',
        })
        setFieldErrors({})
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
  const [sessionInOptions, setSessionInOptions] = useState<{ id: number; code: string; label: string }[]>([])
  const [sessionInOptionsLoaded, setSessionInOptionsLoaded] = useState(false)

  const [form, setForm] = useState({
    examSessionName: '',
    examsessioninCatId: '',
    universityCode: '',
    sessionStartTime: '',
    sessionEndTime: '',
    isActive: true,
    reason: 'active',
  })
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  function closeModal() {
    setOpen(false)
    setEditing(null)
    setFieldErrors({})
  }

  function openAddModal() {
    setEditing(null)
    setForm({
      examSessionName: '',
      examsessioninCatId: '',
      universityCode: '',
      sessionStartTime: '',
      sessionEndTime: '',
      isActive: true,
      reason: 'active',
    })
    setFieldErrors({})
    setOpen(true)
  }

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

  const ensureSessionInOptionsLoaded = useCallback(async () => {
    if (sessionInOptionsLoaded) return
    const rows = await listGeneralDetailsByMaster(GM_CODES.EXAM_SESSION).catch(() => [] as any[])
    const opts = (Array.isArray(rows) ? rows : [])
      .map((r: any) => ({
        id: Number(r.generalDetailId ?? r.pk_gd_id ?? 0),
        code: String(r.generalDetailCode ?? r.gd_code ?? '').trim(),
        label: String(r.generalDetailDisplayName ?? r.generalDetailName ?? r.gd_name ?? r.generalDetailCode ?? r.gd_code ?? '').trim(),
      }))
      .filter((o) => o.id > 0)
    setSessionInOptions(opts)
    setSessionInOptionsLoaded(true)
  }, [sessionInOptionsLoaded])

  useEffect(() => {
    if (!open) return
    void ensureSessionInOptionsLoaded()
  }, [ensureSessionInOptionsLoaded, open])

  // Edit rows may only expose examsessioninCatCode — resolve to generalDetailId once options load.
  useEffect(() => {
    if (!open || !editing || form.examsessioninCatId || sessionInOptions.length === 0) return
    const code = String(editing.examsessioninCatCode ?? '').trim()
    if (!code) return
    const match = sessionInOptions.find((o) => o.code === code)
    if (match) setForm((s) => ({ ...s, examsessioninCatId: String(match.id) }))
  }, [open, editing, form.examsessioninCatId, sessionInOptions])

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
      { ...COL_DEFS.actions, cellRenderer: makeActionsRenderer(setEditing, setForm, setFieldErrors, setOpen) },
    ],
    [],
  )

  async function save() {
    const nextErrors: Record<string, string> = {}
    if (!form.examSessionName.trim()) {
      nextErrors.examSessionName = 'Exam session name is required'
    }
    if (!form.examsessioninCatId.trim()) {
      nextErrors.examsessioninCatId = 'Session in is required'
    }
    if (!form.universityCode.trim()) {
      nextErrors.universityCode = 'University code is required'
    }
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors)
      return
    }
    setFieldErrors({})

    const payload: Record<string, unknown> = {
      examSessionName: form.examSessionName.trim(),
      examsessioninCatId: Number(form.examsessioninCatId),
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
    setFieldErrors({})
    await refresh()
  }

  return (
    <PageContainer className="space-y-4">
      <TableCard withHeaderBorder={false}>
        <DataTable
          title="Create Exam Session"
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
              onClick={openAddModal}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add Exam Session
            </Button>
          )}
        />
      </TableCard>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!v) closeModal()
        }}
      >
        <DialogContent
          className="max-w-2xl p-0 overflow-hidden"
          closeOnOutsideClick={false}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader className="px-4 py-3 border-b border-border bg-muted/40 pr-12">
            <DialogTitle className="text-[16px] font-semibold text-[hsl(var(--primary))]">
              {editing ? 'Edit Exam Session' : 'Add Exam Session'}
            </DialogTitle>
          </DialogHeader>

          <div className="grid min-w-0 grid-cols-1 gap-3 p-4 md:grid-cols-2">
            <div className="min-w-0 space-y-1">
              <Label className="text-[12px]">
                Exam Session Name <span className="text-red-500">*</span>
              </Label>
              <Input
                className="h-9 text-[12px]"
                placeholder="Enter exam session name"
                value={form.examSessionName}
                onChange={(e) => {
                  setForm((s) => ({ ...s, examSessionName: e.target.value }))
                  if (fieldErrors.examSessionName) {
                    setFieldErrors((prev) => {
                      const next = { ...prev }
                      delete next.examSessionName
                      return next
                    })
                  }
                }}
                aria-invalid={Boolean(fieldErrors.examSessionName)}
              />
              {fieldErrors.examSessionName ? (
                <p className="text-[11px] text-destructive">{fieldErrors.examSessionName}</p>
              ) : null}
            </div>
            <div className="min-w-0 space-y-1">
              <Label className="text-[12px]">
                Session In <span className="text-red-500">*</span>
              </Label>
              <Select
                value={form.examsessioninCatId || undefined}
                onValueChange={(v) => {
                  setForm((s) => ({ ...s, examsessioninCatId: v }))
                  if (fieldErrors.examsessioninCatId) {
                    setFieldErrors((prev) => {
                      const next = { ...prev }
                      delete next.examsessioninCatId
                      return next
                    })
                  }
                }}
              >
                <SelectTrigger className="h-9 text-[12px]" aria-invalid={Boolean(fieldErrors.examsessioninCatId)}>
                  <SelectValue placeholder="Select session in" />
                </SelectTrigger>
                <SelectContent>
                  {sessionInOptions.map((o) => (
                    <SelectItem key={o.id} value={String(o.id)}>
                      {o.code}{o.label && o.label !== o.code ? ` - ${o.label}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldErrors.examsessioninCatId ? (
                <p className="text-[11px] text-destructive">{fieldErrors.examsessioninCatId}</p>
              ) : null}
            </div>
            <div className="min-w-0 space-y-1">
              <Label className="text-[12px]">
                University Code <span className="text-red-500">*</span>
              </Label>
              <Select
                value={form.universityCode || undefined}
                onValueChange={(v) => {
                  setForm((s) => ({ ...s, universityCode: v }))
                  if (fieldErrors.universityCode) {
                    setFieldErrors((prev) => {
                      const next = { ...prev }
                      delete next.universityCode
                      return next
                    })
                  }
                }}
              >
                <SelectTrigger className="h-9 text-[12px]" aria-invalid={Boolean(fieldErrors.universityCode)}>
                  <SelectValue placeholder="Select university code" />
                </SelectTrigger>
                <SelectContent>
                  {universityOptions.map((u) => (
                    <SelectItem key={u.code} value={u.code}>
                      {u.code}{u.name ? ` - ${u.name}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldErrors.universityCode ? (
                <p className="text-[11px] text-destructive">{fieldErrors.universityCode}</p>
              ) : null}
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
            <div className="min-w-0 space-y-1">
              <Label className="text-[12px]">Active</Label>
              <label className="flex h-9 min-w-0 items-center gap-2 rounded-md border border-border bg-card px-2">
                <Checkbox checked={form.isActive} onCheckedChange={(v) => setForm((s) => ({ ...s, isActive: !!v }))} />
                <span className="text-[12px] text-slate-700">Session is active</span>
              </label>
            </div>
            {!form.isActive && (
              <div className="space-y-1 md:col-span-2">
                <Label className="text-[12px]">Reason</Label>
                <Input
                  className="h-9 text-[12px]"
                  placeholder="Enter reason for deactivation"
                  value={form.reason}
                  onChange={(e) => setForm((s) => ({ ...s, reason: e.target.value }))}
                />
              </div>
            )}
          </div>

          <DialogFooter className="px-4 pb-4">
            <Button type="button" variant="outline" onClick={closeModal}>Cancel</Button>
            <Button type="button" onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}
