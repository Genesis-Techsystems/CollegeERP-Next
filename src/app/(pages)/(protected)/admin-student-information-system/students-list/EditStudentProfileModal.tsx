'use client'

import { useEffect, useState } from 'react'
import { FormModal } from '@/common/components/feedback'
import { DatePicker } from '@/common/components/date-picker'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type AnyRow = Record<string, any>

export interface EditStudentProfileModalProps {
  open: boolean
  onClose: () => void
  student: AnyRow | null
  onSave: (payload: AnyRow) => Promise<void>
  saving?: boolean
}

function pickText(row: AnyRow | null | undefined, keys: string[]): string {
  if (!row) return ''
  for (const k of keys) {
    const v = row[k]
    if (v != null && String(v).trim() !== '') return String(v)
  }
  return ''
}

function parseDob(value: unknown): Date | null {
  if (!value) return null
  const d = new Date(String(value))
  return Number.isNaN(d.getTime()) ? null : d
}

export function EditStudentProfileModal({
  open,
  onClose,
  student,
  onSave,
  saving = false,
}: EditStudentProfileModalProps) {
  const [firstName, setFirstName] = useState('')
  const [mobile, setMobile] = useState('')
  const [email, setEmail] = useState('')
  const [dob, setDob] = useState<Date | null>(null)

  useEffect(() => {
    if (!open || !student) return
    setFirstName(pickText(student, ['firstName', 'studentName']))
    setMobile(pickText(student, ['mobile', 'mobileNumber']))
    setEmail(pickText(student, ['stdEmailId', 'studentEmailId', 'email']))
    setDob(parseDob(student.dateOfBirth))
  }, [open, student])

  async function handleSubmit(e: { preventDefault: () => void }) {
    e.preventDefault()
    if (!student || !firstName.trim() || !mobile.trim() || !dob) return
    const payload = {
      ...student,
      firstName: firstName.trim(),
      mobile: mobile.trim(),
      stdEmailId: email.trim(),
      dateOfBirth: dob.toISOString().slice(0, 10),
    }
    await onSave(payload)
  }

  const rollLabel = pickText(student, ['rollNumber', 'hallticketNumber', 'admissionNumber'])

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title="Edit Student Details"
      description={rollLabel ? `Roll Number: ${rollLabel}` : undefined}
      onSubmit={handleSubmit}
      isSubmitting={saving}
      submitLabel="Save"
      cancelLabel="Close"
      size="md"
    >
      <div className="grid gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Full Name (as per SSC)</Label>
          <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <Label className="text-xs">Student Mobile</Label>
            <Input
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              inputMode="numeric"
              maxLength={10}
              required
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Student Email ID</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Date Of Birth</Label>
            <DatePicker value={dob} onChange={setDob} />
          </div>
        </div>
      </div>
    </FormModal>
  )
}
