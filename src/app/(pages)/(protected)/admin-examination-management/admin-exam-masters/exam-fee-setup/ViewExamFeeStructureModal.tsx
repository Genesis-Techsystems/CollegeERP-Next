'use client'

import { format } from 'date-fns'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface ExamFeeCourseYear {
  groupCode?: string
  courseYearName?: string
}

interface ExamFeeAdditional {
  adtExamfeetypeCatDisplayName?: string
  fee?: number | string
}

interface ExamFeeFine {
  fineName?: string
  fineFromDate?: string
  fineToDate?: string
  regFeeFine?: number | string
  supplyFeeFine?: number | string
}

export interface ExamFeeStructureViewData {
  collegeCode?: string
  courseCode?: string
  examYear?: string
  examFeeStructureName?: string
  examName?: string
  regFee?: number | string
  subject1Fee?: number | string | null
  subject2Fee?: number | string | null
  subject3Fee?: number | string | null
  subject4Fee?: number | string | null
  subject5Fee?: number | string | null
  subject6Fee?: number | string | null
  subject7Fee?: number | string | null
  supplyFee?: number | string | null
  collectionStartDate?: string
  collectionEndDate?: string
  examFeeStructureCourseyr?: ExamFeeCourseYear[]
  examFeeAdditionalStructure?: ExamFeeAdditional[]
  examFeeFine?: ExamFeeFine[]
}

interface ViewExamFeeStructureModalProps {
  open: boolean
  onClose: () => void
  data: ExamFeeStructureViewData | null
}

function formatDate(value?: string): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return format(d, 'dd MMM, yyyy')
}

function hasValue(v: unknown): boolean {
  return v !== null && v !== undefined && String(v).trim() !== ''
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 px-3 py-2 sm:flex-row sm:items-start sm:gap-3">
      <div className="text-[13px] font-medium text-slate-700 sm:basis-2/5">{label}</div>
      <div className="text-[13px] text-[hsl(var(--primary))] break-words sm:basis-3/5">{children}</div>
    </div>
  )
}

function renderSuppleFee(data: ExamFeeStructureViewData): React.ReactNode {
  const subjects = [
    { idx: 1, value: data.subject1Fee },
    { idx: 2, value: data.subject2Fee },
    { idx: 3, value: data.subject3Fee },
    { idx: 4, value: data.subject4Fee },
    { idx: 5, value: data.subject5Fee },
    { idx: 6, value: data.subject6Fee },
    { idx: 7, value: data.subject7Fee },
  ]
  const parts = subjects.filter((s) => hasValue(s.value)).map((s) => `Subject-${s.idx} - ${s.value}`)
  if (hasValue(data.supplyFee)) parts.push(`More than 7 - ${data.supplyFee}`)
  return parts.length > 0 ? parts.join(', ') : '—'
}

function renderCourseLine(data: ExamFeeStructureViewData): React.ReactNode {
  const left = [data.collegeCode, data.courseCode].filter(hasValue).join(' / ')
  const yr = hasValue(data.examYear) ? ` - (${data.examYear})` : ''
  const text = `${left}${yr}`.trim()
  return text || '—'
}

export default function ViewExamFeeStructureModal({ open, onClose, data }: ViewExamFeeStructureModalProps) {
  if (!data) return null
  const courseYears = data.examFeeStructureCourseyr ?? []
  const additional = data.examFeeAdditionalStructure ?? []
  const fines = data.examFeeFine ?? []

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle className="text-[hsl(var(--primary))]">View Exam Fee Structure</DialogTitle>
        </DialogHeader>

        <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
          <div className="rounded-md border border-border bg-card divide-y divide-border">
            <DetailRow label="Course :">{renderCourseLine(data)}</DetailRow>
            <DetailRow label="Exam Fee Structure :">{data.examFeeStructureName ?? '—'}</DetailRow>
            <DetailRow label="Exam Master :">{data.examName ?? '—'}</DetailRow>
            <DetailRow label="Exam Regular Fee :">{hasValue(data.regFee) ? data.regFee : '—'}</DetailRow>
            <DetailRow label="Exam Supple Fee :">{renderSuppleFee(data)}</DetailRow>
            <DetailRow label="Collection Start Date :">{formatDate(data.collectionStartDate)}</DetailRow>
            <DetailRow label="Collection End Date :">{formatDate(data.collectionEndDate)}</DetailRow>

            {courseYears.length > 0 && (
              <DetailRow label="Course Years :">
                <div className="space-y-1">
                  {courseYears.map((y, i) => (
                    <div key={`yr-${i}`} className="text-slate-700">
                      {y.groupCode} / <span className="text-[hsl(var(--primary))]">{y.courseYearName}</span>
                    </div>
                  ))}
                </div>
              </DetailRow>
            )}

            {additional.length > 0 && (
              <DetailRow label="Additional Fee Structure :">
                <div className="space-y-1">
                  {additional.map((a, i) => (
                    <div key={`ad-${i}`} className="text-slate-700">
                      {a.adtExamfeetypeCatDisplayName} / <span className="text-[hsl(var(--primary))]">{a.fee}</span>
                    </div>
                  ))}
                </div>
              </DetailRow>
            )}

            {fines.length > 0 && (
              <DetailRow label="Late Fee Fines :">
                <div className="space-y-1">
                  {fines.map((f, i) => (
                    <div key={`fn-${i}`} className="text-slate-700">
                      {f.fineName} / {formatDate(f.fineFromDate)} - {formatDate(f.fineToDate)} / Reg Fee Fine:{' '}
                      <span className="text-[hsl(var(--primary))]">{f.regFeeFine}</span> / Supple Fee Fine:{' '}
                      <span className="text-[hsl(var(--primary))]">{f.supplyFeeFine}</span>
                    </div>
                  ))}
                </div>
              </DetailRow>
            )}
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
