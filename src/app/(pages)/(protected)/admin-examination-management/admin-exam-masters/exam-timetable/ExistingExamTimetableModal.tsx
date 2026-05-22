'use client'

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export interface ExistingExamTimetableRow {
  subjectName?: string
  subjecttypeName?: string
  groupName?: string
  courseYearName?: string
}

interface ExistingExamTimetableModalProps {
  open: boolean
  onClose: () => void
  rows: ExistingExamTimetableRow[]
}

export default function ExistingExamTimetableModal({ open, onClose, rows }: ExistingExamTimetableModalProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle className="text-[hsl(var(--primary))]">Existing Exam Timetable</DialogTitle>
        </DialogHeader>

        <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
          <div className="rounded-md border border-border overflow-auto">
            <table className="w-full text-[12px]">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-2 py-1 w-14 text-left">SI.No</th>
                  <th className="px-2 py-1 text-left">Subject</th>
                  <th className="px-2 py-1 text-left">Course Group</th>
                  <th className="px-2 py-1 text-left">Course Year</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td className="px-2 py-3 text-center text-muted-foreground" colSpan={4}>
                      No existing timetable entries
                    </td>
                  </tr>
                )}
                {rows.map((r, i) => (
                  <tr key={`${r.subjectName ?? ''}-${i}`} className="border-t">
                    <td className="px-2 py-1">{i + 1}</td>
                    <td className="px-2 py-1">
                      {r.subjectName ?? '—'}
                      {r.subjecttypeName ? <> (<span className="text-muted-foreground">{r.subjecttypeName}</span>)</> : null}
                    </td>
                    <td className="px-2 py-1">{r.groupName ?? '—'}</td>
                    <td className="px-2 py-1">{r.courseYearName ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <DialogFooter className="px-6 pb-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
