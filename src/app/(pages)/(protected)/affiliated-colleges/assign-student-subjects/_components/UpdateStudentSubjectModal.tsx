'use client'

import { useEffect, useState } from 'react'
import { FormModal } from '@/common/components/feedback'
import { ActiveStatusField } from '@/common/components/forms'

export type StudentSubjectEditRow = Record<string, unknown>

type UpdateStudentSubjectModalProps = {
  open: boolean
  onClose: () => void
  row: StudentSubjectEditRow | null
  studentName?: string
  onSave: (payload: {
    isActive: boolean
    reason: string
    studentId: number
    subjectId: number
    studentSubjectId?: number
  }) => void
  isSubmitting?: boolean
}

function pickNum(row: StudentSubjectEditRow | null, keys: string[]): number {
  if (!row) return 0
  for (const k of keys) {
    const n = Number(row[k] ?? 0)
    if (Number.isFinite(n) && n > 0) return n
  }
  return 0
}

function pickText(row: StudentSubjectEditRow | null, keys: string[]): string {
  if (!row) return ''
  for (const k of keys) {
    const v = row[k]
    if (v != null && String(v).trim() !== '') return String(v)
  }
  return ''
}

export function UpdateStudentSubjectModal({
  open,
  onClose,
  row,
  studentName,
  onSave,
  isSubmitting,
}: UpdateStudentSubjectModalProps) {
  const [isActive, setIsActive] = useState(true)
  const [reason, setReason] = useState('active')

  useEffect(() => {
    if (!open || !row) return
    const active = row.isActive !== false
    setIsActive(active)
    setReason(pickText(row, ['reason']) || (active ? 'active' : ''))
  }, [open, row])

  const subjectCode = pickText(row, ['subjectCode', 'subject_code'])
  const subjectType = pickText(row, ['subjectTypeCode', 'subjecttypeCode', 'subjectType'])
  const titleName = studentName || pickText(row, ['stdFirstName', 'studentName', 'firstName'])

  function handleSubmit(e: { preventDefault: () => void }) {
    e.preventDefault()
    if (!row) return
    onSave({
      isActive,
      reason: isActive ? reason || 'active' : reason,
      studentId: pickNum(row, ['studentId', 'fk_student_id', 'studentDetailId']),
      subjectId: pickNum(row, ['subjectId', 'fk_subject_id', 'subject_id']),
      studentSubjectId: pickNum(row, ['studentSubjectId', 'student_subject_id', 'id']),
    })
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title="Update Student Subjects"
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      submitLabel="Save"
      cancelLabel="Cancel"
      size="md"
    >
      <div className="space-y-4">
        <div className="rounded bg-sky-100 px-3 py-2 text-sm font-semibold text-slate-900">
          {titleName}
          {subjectCode ? ` — ${subjectCode}` : ''}
          {subjectType ? ` (${subjectType})` : ''}
        </div>
        <ActiveStatusField
          isActive={isActive}
          onActiveChange={(v) => setIsActive(v === true)}
          reason={reason}
          onReasonChange={setReason}
        />
      </div>
    </FormModal>
  )
}
