'use client'

import { useEffect, useMemo, useState } from 'react'
import { FormModal } from '@/common/components/feedback'
import { ActiveStatusField } from '@/common/components/forms'
import { Select } from '@/common/components/select'
import {
  loadPrincipalActivityFormOptions,
  type PrincipalActivityCategory,
  type PrincipalActivitySavePayload,
} from '@/services'

type AnyRow = Record<string, unknown>

function pickNum(row: AnyRow | null | undefined, keys: string[]): number {
  if (!row) return 0
  for (const key of keys) {
    const value = Number(row[key] ?? 0)
    if (Number.isFinite(value) && value > 0) return value
  }
  return 0
}

function pickText(row: AnyRow | null | undefined, keys: string[]): string {
  if (!row) return ''
  for (const key of keys) {
    const value = row[key]
    if (value == null) continue
    const out = String(value).trim()
    if (out) return out
  }
  return ''
}

export interface AddPrincipalActivityModalProps {
  open: boolean
  onClose: () => void
  categoryCode: PrincipalActivityCategory
  courseId: number
  studentId: number
  editingRow?: AnyRow | null
  onSave: (payload: PrincipalActivitySavePayload, activityOptions: AnyRow[]) => Promise<void>
  saving?: boolean
}

export function AddPrincipalActivityModal({
  open,
  onClose,
  categoryCode,
  courseId,
  studentId,
  editingRow,
  onSave,
  saving = false,
}: AddPrincipalActivityModalProps) {
  const [activities, setActivities] = useState<AnyRow[]>([])
  const [courseYears, setCourseYears] = useState<AnyRow[]>([])
  const [loadingOptions, setLoadingOptions] = useState(false)
  const [eventTitleCatdetId, setEventTitleCatdetId] = useState<string | null>(null)
  const [courseYearId, setCourseYearId] = useState<string | null>(null)
  const [isActive, setIsActive] = useState(true)
  const [reason, setReason] = useState('active')

  useEffect(() => {
    if (!open || !courseId) return
    let cancelled = false
    void (async () => {
      setLoadingOptions(true)
      try {
        const options = await loadPrincipalActivityFormOptions(courseId, categoryCode)
        if (cancelled) return
        setActivities(options.activities)
        setCourseYears(options.courseYears)
      } finally {
        if (!cancelled) setLoadingOptions(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, courseId, categoryCode])

  useEffect(() => {
    if (!open) return
    if (editingRow) {
      const titleId = pickNum(editingRow, ['eventTitleCatdetId', 'event_title_catdet_id'])
      const semId = pickNum(editingRow, ['courseYearId', 'fk_course_year_id'])
      setEventTitleCatdetId(titleId ? String(titleId) : null)
      setCourseYearId(semId ? String(semId) : null)
      setIsActive(editingRow.isActive !== false)
      setReason(pickText(editingRow, ['reason']) || (editingRow.isActive === false ? '' : 'active'))
      return
    }
    setEventTitleCatdetId(null)
    setCourseYearId(null)
    setIsActive(true)
    setReason('active')
  }, [open, editingRow])

  const activityOptions = useMemo(
    () =>
      activities.map((row) => ({
        value: String(pickNum(row, ['generalDetailId', 'general_detail_id'])),
        label:
          pickText(row, ['generalDetailDisplayName', 'general_detail_display_name', 'displayName']) ||
          pickText(row, ['generalDetailCode', 'general_detail_code']),
      })),
    [activities],
  )

  const semesterOptions = useMemo(
    () =>
      courseYears.map((row) => ({
        value: String(pickNum(row, ['courseYearId', 'fk_course_year_id'])),
        label: pickText(row, ['courseYearName', 'course_year_name', 'courseYearCode']),
      })),
    [courseYears],
  )

  async function handleSubmit(e: { preventDefault: () => void }) {
    e.preventDefault()
    const titleId = Number(eventTitleCatdetId ?? 0)
    const semId = Number(courseYearId ?? 0)
    if (!titleId || !semId || !studentId) return
    await onSave(
      {
        eventTitleCatdetId: titleId,
        courseYearId: semId,
        studentId,
        isActive,
        reason: isActive ? 'active' : reason.trim(),
        studentProfileId: pickNum(editingRow ?? null, ['studentProfileId', 'student_profile_id']),
      },
      activities,
    )
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title="Activity"
      onSubmit={handleSubmit}
      isSubmitting={saving || loadingOptions}
      submitLabel="Save"
      cancelLabel="Close"
      size="sm"
    >
      <div className="grid gap-4">
        <Select
          label="Activity Title"
          value={eventTitleCatdetId}
          onChange={setEventTitleCatdetId}
          options={activityOptions}
          placeholder="Select activity"
          searchable
          isLoading={loadingOptions}
          disabled={loadingOptions}
        />
        <Select
          label="Semester"
          value={courseYearId}
          onChange={setCourseYearId}
          options={semesterOptions}
          placeholder="Select semester"
          searchable
          isLoading={loadingOptions}
          disabled={loadingOptions}
        />
        <ActiveStatusField
          isActive={isActive}
          reason={reason}
          onActiveChange={(v) => setIsActive(v === true)}
          onReasonChange={setReason}
        />
      </div>
    </FormModal>
  )
}
