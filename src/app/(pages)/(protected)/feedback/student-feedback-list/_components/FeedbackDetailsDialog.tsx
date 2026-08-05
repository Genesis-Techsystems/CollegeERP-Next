'use client'

/**
 * Angular `feedback-details-modal` MatDialog parity.
 */

import { useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Table, type TableColumn } from '@/common/components/table'
import type { SurveyFeedbackListRow } from '@/services'

type DetailRow = {
  siNo: number
  fbQuestion: string
  fbAnswer: string
  fbAnswerRating: string
}

function txt(v: unknown): string {
  if (v == null) return '—'
  const s = String(v).trim()
  return s || '—'
}

export function FeedbackDetailsDialog({
  open,
  onClose,
  row,
}: {
  open: boolean
  onClose: () => void
  row: SurveyFeedbackListRow | null
}) {
  const detailRows = useMemo<DetailRow[]>(
    () =>
      (row?.surveyFeedbackDetailDTOs ?? []).map((d, i) => ({
        siNo: i + 1,
        fbQuestion: txt(d.surveyDetailDTO?.fbQuestion),
        fbAnswer: txt(d.fbAnswer),
        fbAnswerRating: txt(d.fbAnswerRating),
      })),
    [row],
  )

  const columns = useMemo<TableColumn<DetailRow>[]>(
    () => [
      { id: 'siNo', label: 'SI.No', width: 10 },
      { id: 'fbQuestion', label: 'Feeback Question', width: 50 },
      { id: 'fbAnswer', label: 'Feedback', width: 22 },
      { id: 'fbAnswerRating', label: 'Rating', width: 18 },
    ],
    [],
  )

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="flex max-h-[90vh] w-[min(96vw,800px)] max-w-[800px] flex-col gap-0 overflow-hidden p-0 sm:max-w-[800px]">
        <DialogHeader className="shrink-0 border-b border-border px-5 py-3">
          <DialogTitle className="text-base font-semibold text-[hsl(var(--primary))]">
            Student Feedback Details
          </DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4 text-sm">
          <div className="space-y-2 rounded-md border border-border p-3">
            <Meta
              label="College"
              value={`${txt(row?.collegeCode)} / ${txt(row?.fromAcademicYearName)}`}
            />
            <Meta
              label="Course"
              value={`${txt(row?.fromCourseName)} / ${txt(row?.fromGroupCode)} / ${txt(row?.fromCourseYearName)} / section - ${txt(row?.fromSectionName)}`}
            />
            <Meta
              label="From Student"
              value={`${txt(row?.fromStudentFirstName)} (${txt(row?.fromRollNo)})`}
            />
            <Meta
              label="For Employee"
              value={`${txt(row?.forEmpFirstName)} (${txt(row?.forEmpNumber)})`}
            />
            <Meta
              label="Subject"
              value={`${txt(row?.subjectName)} (${txt(row?.subjectCode)})`}
            />
          </div>

          {/* Reusable Table: header tint + centered SI.No / Feedback / Rating */}
          <Table
            rows={detailRows}
            columns={columns}
            pageSize={0}
            density="compact"
            emptyText="No details"
            className={[
              '[&_thead]:bg-[hsl(var(--primary)/0.06)] [&_th]:text-[hsl(var(--primary))]',
              '[&_th:nth-child(1)]:text-center [&_td:nth-child(1)]:text-center',
              '[&_th:nth-child(3)]:text-center [&_td:nth-child(3)]:text-center',
              '[&_th:nth-child(4)]:text-center [&_td:nth-child(4)]:text-center',
            ].join(' ')}
          />
        </div>

        <DialogFooter className="shrink-0 border-t border-border px-5 py-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-2 text-sm">
      <span className="font-medium text-foreground">{label} :</span>
      <span className="text-[hsl(var(--primary))]">{value}</span>
    </div>
  )
}
