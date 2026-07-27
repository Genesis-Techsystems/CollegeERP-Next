'use client'

import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { FormModal } from '@/common/components/feedback'
import { SearchInput } from '@/common/components/search'
import { tConvert } from '@/services'

export type AttendancePreviewPeriod = {
  classTimingName?: string
  startTime?: string
  endTime?: string
}

export type AttendancePreviewStudent = {
  studentId?: number
  rollNumber?: string
  admissionNumber?: string
  firstName?: string
}

type AttendancePreviewModalProps = {
  open: boolean
  onClose: () => void
  onSave: () => void
  isSaving?: boolean
  date: Date | null
  collegeLine: string
  courseLine: string
  subjectName: string
  periods: AttendancePreviewPeriod[]
  absentees: AttendancePreviewStudent[]
}

function DetailRow({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="grid grid-cols-[90px_1fr] gap-2 text-sm py-0.5 sm:grid-cols-[100px_1fr]">
      <span className="font-medium text-foreground">{label} :</span>
      <span className="text-primary font-medium">{value || '—'}</span>
    </div>
  )
}

/** Angular `ViewPreviewComponent` — confirm absentees before POST studentattendancedetails. */
export function AttendancePreviewModal({
  open,
  onClose,
  onSave,
  isSaving = false,
  date,
  collegeLine,
  courseLine,
  subjectName,
  periods,
  absentees,
}: Readonly<AttendancePreviewModalProps>) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return absentees
    return absentees.filter((s) => {
      const roll = String(s.rollNumber ?? s.admissionNumber ?? '').toLowerCase()
      const name = String(s.firstName ?? '').toLowerCase()
      return roll.includes(q) || name.includes(q)
    })
  }, [absentees, search])

  const titleDate = date ? format(date, 'MMM d, yyyy') : ''
  const title = titleDate
    ? `Attendance Preview on ${titleDate}`
    : 'Attendance Preview'

  return (
    <FormModal
      open={open}
      onClose={() => {
        setSearch('')
        onClose()
      }}
      title={title}
      size="lg"
      submitLabel="Save"
      cancelLabel="Close"
      isSubmitting={isSaving}
      showHeaderDivider
      onSubmit={(e) => {
        e.preventDefault()
        onSave()
      }}
    >
      <div className="space-y-3">
        <div className="rounded-md border border-primary/25 bg-primary/5 px-3 py-2 space-y-0.5">
          <DetailRow label="College" value={collegeLine} />
          <DetailRow label="Course" value={courseLine} />
          <DetailRow
            label="Timing"
            value={
              periods.length > 0
                ? periods
                    .map(
                      (p) =>
                        `${String(p.classTimingName ?? '')}(${tConvert(p.startTime)} - ${tConvert(p.endTime)})`,
                    )
                    .join(', ')
                : '—'
            }
          />
          <DetailRow label="Subject" value={subjectName || '—'} />
        </div>

        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search"
          className="max-w-xs"
        />

        <div className="max-h-[280px] overflow-auto rounded-sm border">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-[#C3D9FF]">
                <th className="px-2 py-2 text-left font-semibold w-16">SI.No</th>
                <th className="px-2 py-2 text-left font-semibold">Roll No.</th>
                <th className="px-2 py-2 text-left font-semibold">Student</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="px-2 py-6 text-center text-muted-foreground"
                  >
                    No absentees.
                  </td>
                </tr>
              ) : (
                filtered.map((row, idx) => (
                  <tr key={String(row.studentId ?? idx)} className="border-t">
                    <td className="px-2 py-1.5 text-center">{idx + 1}</td>
                    <td className="px-2 py-1.5">
                      {String(row.rollNumber ?? row.admissionNumber ?? '')}
                    </td>
                    <td className="px-2 py-1.5 uppercase">
                      {String(row.firstName ?? '')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </FormModal>
  )
}
