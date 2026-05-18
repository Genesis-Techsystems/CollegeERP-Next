'use client'

import type { StudentFeeSearchRow, StudentFeeStructureRow } from '@/types/fees-collection'

function DetailRow({ label, value }: { readonly label: string; readonly value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,7rem)_1fr] gap-x-2 sm:grid-cols-[minmax(0,8.5rem)_1fr]">
      <span className="text-[11px] text-slate-600">{label} :</span>
      <span className="text-[11px] text-blue-600">{value}</span>
    </div>
  )
}

type FeeDetailsStudentCardProps = {
  readonly student: StudentFeeSearchRow
  readonly row: StudentFeeStructureRow
}

export function FeeDetailsStudentCard({ student, row }: FeeDetailsStudentCardProps) {
  const courseLine = [
    row.courseName,
    row.groupName,
    row.courseYearName,
    row.section ? `section - ${row.section}` : '',
  ]
    .filter(Boolean)
    .join(' / ')

  return (
    <div className="rounded-lg border border-sky-200 bg-sky-50/40 px-3 py-2.5 space-y-1">
      <DetailRow
        label="College"
        value={`${student.collegeCode ?? '—'} / ${row.academicYear ?? student.academicYear ?? '—'}`}
      />
      <DetailRow label="Course" value={courseLine || '—'} />
      <DetailRow
        label="Fee Structure"
        value={String(row.structureName ?? row.classGroupName ?? '—')}
      />
      <DetailRow
        label="Student"
        value={`${student.firstName ?? '—'} (${student.rollNumber ?? student.hallticketNumber ?? '—'})`}
      />
    </div>
  )
}
