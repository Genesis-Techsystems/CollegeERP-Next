'use client'

import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { FormModal } from '@/common/components/feedback'
import { Select } from '@/common/components/select'
import { ActiveStatusField } from '@/common/components/forms'
import { QK } from '@/lib/query-keys'
import {
  getEvaluatorProfilesForRecruitment,
  listCommitteeMeetingsForFinalise,
  updateProfileRecruitment,
} from '@/services'
import type { UnivProfileRecruitment } from '@/types/committees'
import { toastError, toastSuccess } from '@/lib/toast'

const ROLE_OPTIONS = [
  { value: '64', label: 'Evaluator' },
  { value: '67', label: 'Moderator' },
  { value: '70', label: 'Question Paper Setter' },
]

const schema = z.object({
  examEvaluatorProfilesId: z.string().min(1, 'Profile is required'),
  evaluatorRoleId: z.string().min(1, 'Role is required'),
  committeeMeetingId: z.string().min(1, 'Meeting is required'),
  isActive: z.boolean(),
  reason: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

type EditFinaliseProfileModalProps = {
  open: boolean
  onClose: () => void
  row: UnivProfileRecruitment | null
  univCommitteeId: number
  onSaved: () => void
}

function getDefaults(row?: UnivProfileRecruitment | null): FormValues {
  return {
    examEvaluatorProfilesId: String(row?.examEvaluatorProfilesId ?? ''),
    evaluatorRoleId: String(row?.evaluatorRoleId ?? ''),
    committeeMeetingId: String(row?.committeeMeetingId ?? ''),
    isActive: row?.isActive ?? true,
    reason: row?.reason ?? 'active',
  }
}

export function EditFinaliseProfileModal({
  open,
  onClose,
  row,
  univCommitteeId,
  onSaved,
}: EditFinaliseProfileModalProps) {
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    control,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: getDefaults(),
  })

  const roleId = watch('evaluatorRoleId')
  const examId = row?.universityExamId ?? 0
  const committeeId = row?.univCommitteesId ?? univCommitteeId
  const subjectCode = row?.subjectCode ?? ''

  const { data: meetings = [] } = useQuery({
    queryKey: QK.committeeMeetings.forFinalise(committeeId, examId),
    queryFn: () => listCommitteeMeetingsForFinalise(committeeId, examId),
    enabled: open && committeeId > 0 && examId > 0,
  })

  const { data: evaluatorRows = [], isLoading: profilesLoading } = useQuery({
    queryKey: QK.profileRecruitments.evaluatorProfiles(examId, subjectCode),
    queryFn: () => getEvaluatorProfilesForRecruitment({ universityExamId: examId, subjectCode }),
    enabled: open && examId > 0,
  })

  useEffect(() => {
    if (!open) return
    reset(getDefaults(row))
    setSubmitError(null)
  }, [open, row, reset])

  useEffect(() => {
    if (!open) return
    setValue('examEvaluatorProfilesId', '')
  }, [roleId, open, setValue])

  const meetingOptions = useMemo(
    () =>
      meetings.map((m) => ({
        value: String(m.univCommitteeMeetingId ?? m.committeeMeetingId ?? ''),
        label: m.meetingTitle ?? 'Meeting',
      })).filter((o) => o.value),
    [meetings],
  )

  const profileOptions = useMemo(() => {
    const roleNum = Number(roleId)
    return evaluatorRows
      .filter((p) => !roleId || Number(p.fk_evaluatorrole_id) === roleNum)
      .map((p) => ({
        value: String(p.pk_exam_evaluator_profile_id ?? ''),
        label: p.evaluator_name ?? 'Profile',
      }))
      .filter((o) => o.value)
  }, [evaluatorRows, roleId])

  async function onSubmit(values: FormValues) {
    if (!row) return
    setSubmitError(null)
    try {
      await updateProfileRecruitment(row.univProfileRecruitmentId, {
        organizationId: row.organizationId,
        universityExamId: row.universityExamId,
        subjectCode: row.subjectCode,
        examEvaluatorProfilesId: Number(values.examEvaluatorProfilesId),
        evaluatorRoleId: Number(values.evaluatorRoleId),
        committeeMeetingId: Number(values.committeeMeetingId),
        isActive: values.isActive,
        reason: values.isActive ? 'active' : (values.reason || 'inactive'),
      })
      toastSuccess('Profile updated.')
      onSaved()
      onClose()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to update profile.'
      setSubmitError(msg)
      toastError(e, 'Failed to update profile')
    }
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title="Edit Profile"
      onSubmit={(e) => {
        e.preventDefault()
        void handleSubmit(onSubmit)()
      }}
      isSubmitting={isSubmitting}
      size="md"
    >
      <div className="grid grid-cols-1 gap-3">
        <div className="space-y-0.5">
          <Controller
            name="evaluatorRoleId"
            control={control}
            render={({ field }) => (
              <Select
                label="Role *"
                value={field.value || null}
                onChange={(v) => field.onChange(v ?? '')}
                options={ROLE_OPTIONS}
                placeholder="Select role"
              />
            )}
          />
          {errors.evaluatorRoleId && (
            <p className="text-xs text-destructive">{errors.evaluatorRoleId.message}</p>
          )}
        </div>

        <div className="space-y-0.5">
          <Controller
            name="examEvaluatorProfilesId"
            control={control}
            render={({ field }) => (
              <Select
                label="Profile *"
                value={field.value || null}
                onChange={(v) => field.onChange(v ?? '')}
                options={profileOptions}
                placeholder="Select profile"
                searchable
                isLoading={profilesLoading}
                disabled={!roleId}
              />
            )}
          />
          {errors.examEvaluatorProfilesId && (
            <p className="text-xs text-destructive">{errors.examEvaluatorProfilesId.message}</p>
          )}
        </div>

        <div className="space-y-0.5">
          <Controller
            name="committeeMeetingId"
            control={control}
            render={({ field }) => (
              <Select
                label="Committee Meeting *"
                value={field.value || null}
                onChange={(v) => field.onChange(v ?? '')}
                options={meetingOptions}
                placeholder="Select meeting"
                searchable
              />
            )}
          />
          {errors.committeeMeetingId && (
            <p className="text-xs text-destructive">{errors.committeeMeetingId.message}</p>
          )}
        </div>

        <Controller
          name="isActive"
          control={control}
          render={({ field }) => (
            <ActiveStatusField
              isActive={field.value}
              onActiveChange={field.onChange}
              reason={watch('reason') ?? ''}
              onReasonChange={(r) => setValue('reason', r)}
            />
          )}
        />
      </div>

      {submitError && (
        <p className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-600">{submitError}</p>
      )}
    </FormModal>
  )
}
