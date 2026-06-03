'use client'

import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { SearchInput } from '@/common/components/search'
import { getAllRecords } from '@/services/crud'

interface ConflictRow {
  hallticket_number?: string
  student_name?: string
  fk_exam_id?: string | number
  exam_name?: string
  exam_date?: string
  subject_name?: string
}

interface ConflictsResponse {
  result?: ConflictRow[][]
}

interface CheckConflictsModalProps {
  open: boolean
  onClose: () => void
  /** Active exam master id used to scope the validation query. */
  examId: number | null
  /** Active academic year id used to scope the validation query. */
  academicYearId: number | null
  /** Optional org id; falls back to localStorage organizationId. */
  orgId?: number | null
}

function resolveOrgId(explicit?: number | null): number {
  if (explicit && explicit > 0) return explicit
  const fromStorage = Number(globalThis.localStorage?.getItem('organizationId') ?? 0)
  return fromStorage || 1
}

export default function CheckConflictsModal({ open, onClose, examId, academicYearId, orgId }: CheckConflictsModalProps) {
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState<ConflictRow[]>([])
  const [loaded, setLoaded] = useState(false)
  const [q, setQ] = useState('')

  useEffect(() => {
    if (!open) {
      setRows([])
      setLoaded(false)
      setQ('')
      return
    }
    let cancelled = false
    async function fetchConflicts() {
      setLoading(true)
      try {
        const data = await getAllRecords<ConflictsResponse>('s_get_collegeexamdetails_bycode', {
          in_flag: 'exam_student_timetable_validation',
          in_org_id: resolveOrgId(orgId),
          in_college_id: 0,
          in_academic_year_id: academicYearId ?? 0,
          in_isadmin: 0,
          in_exam_id: examId ?? 0,
          in_timetable_id: 0,
          in_exam_date: '1990-01-01',
          in_subject_id: 0,
          in_loginuser_empid: 0,
          in_loginuser_roleid: 0,
        }).catch(() => ({ result: [] as ConflictRow[][] }))
        if (cancelled) return
        const first = Array.isArray(data?.result) ? (data.result[0] ?? []) : []
        setRows(Array.isArray(first) ? first : [])
      } finally {
        if (!cancelled) {
          setLoading(false)
          setLoaded(true)
        }
      }
    }
    fetchConflicts()
    return () => {
      cancelled = true
    }
  }, [open, examId, academicYearId, orgId])

  const filteredRows = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return rows
    return rows.filter((r) =>
      [r.hallticket_number, r.student_name, r.exam_name ?? r.fk_exam_id, r.exam_date, r.subject_name]
        .map((v) => String(v ?? '').toLowerCase())
        .join(' ')
        .includes(s),
    )
  }, [rows, q])

  const hasConflicts = rows.length > 0
  const noConflictsState = loaded && !loading && !hasConflicts

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle className="text-[hsl(var(--primary))]">Check Conflicts</DialogTitle>
        </DialogHeader>

        <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
          {loading && (
            <div className="py-10 text-center text-[13px] text-muted-foreground">Checking conflicts…</div>
          )}

          {noConflictsState && (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
              <CheckCircle2 className="h-10 w-10 text-emerald-600" aria-hidden />
              <p className="text-[14px] font-semibold text-emerald-700">No Conflicts Found!</p>
            </div>
          )}

          {hasConflicts && !loading && (
            <div className="space-y-3">
              <SearchInput
                className="w-full max-w-md"
                placeholder="Search by student / subject / date…"
                value={q}
                onChange={setQ}
              />
              <div className="rounded-md border border-border overflow-auto">
                <table className="w-full text-[12px]">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="px-2 py-1 w-14 text-left">SI.No</th>
                      <th className="px-2 py-1 text-left">Hall Ticket No.</th>
                      <th className="px-2 py-1 text-left">Student Name</th>
                      <th className="px-2 py-1 text-left">Exam Name</th>
                      <th className="px-2 py-1 text-left">Exam Date</th>
                      <th className="px-2 py-1 text-left">Subject Name</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.length === 0 && (
                      <tr>
                        <td className="px-2 py-3 text-center text-muted-foreground" colSpan={6}>
                          No matches
                        </td>
                      </tr>
                    )}
                    {filteredRows.map((r, i) => (
                      <tr key={`${r.hallticket_number ?? ''}-${i}`} className="border-t">
                        <td className="px-2 py-1">{i + 1}</td>
                        <td className="px-2 py-1">{r.hallticket_number ?? '—'}</td>
                        <td className="px-2 py-1">{r.student_name ?? '—'}</td>
                        <td className="px-2 py-1">{r.exam_name ?? r.fk_exam_id ?? '—'}</td>
                        <td className="px-2 py-1">{r.exam_date ?? '—'}</td>
                        <td className="px-2 py-1">{r.subject_name ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="px-6 pb-4">
          <Button type="button" variant="outline" onClick={onClose}>
            {noConflictsState ? 'Ok' : 'Close'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
