'use client'

import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, MultiSelect } from '@/common/components/select'
import { ActiveStatusField } from '@/common/components/forms'
import {
  createCommittee,
  updateCommittee,
  getCommitteeCreateFormData,
  getCommitteeExamSubjects,
} from '@/services'
import { QK } from '@/lib/query-keys'
import type { UnivCommittee } from '@/types/committees'

type AnyRow = Record<string, unknown>

function pickNum(row: AnyRow | null | undefined, keys: string[]): number {
  if (!row) return 0
  for (const k of keys) {
    const n = Number(row[k] ?? 0)
    if (Number.isFinite(n) && n > 0) return n
  }
  return 0
}

function pickText(row: AnyRow | null | undefined, keys: string[]): string {
  if (!row) return ''
  for (const k of keys) {
    const v = row[k]
    if (v != null && String(v).trim() !== '') return String(v)
  }
  return ''
}

const schema = z.object({
  departmentCatdetId: z.string().min(1, 'Department is required'),
  committeeName: z.string().min(1, 'Committee name is required'),
  isForExam: z.boolean(),
  universityExamId: z.string().optional(),
  subjectCode: z.string().optional(),
  univParentCommitteeId: z.string().optional(),
  profileRoleIds: z.array(z.string()).optional(),
  committeeResponsibilities: z.string().optional(),
  isActive: z.boolean(),
  reason: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

function getDefaults(edit?: UnivCommittee | null): FormValues {
  return {
    departmentCatdetId: edit?.departmentCatdetId ? String(edit.departmentCatdetId) : '',
    committeeName: edit?.committeeName ?? '',
    isForExam: Boolean(edit?.universityExamId),
    universityExamId: edit?.universityExamId ? String(edit.universityExamId) : '',
    subjectCode: edit?.subjectCode ?? '',
    univParentCommitteeId: edit?.univParentCommitteeId ? String(edit.univParentCommitteeId) : '',
    profileRoleIds: edit?.profileRoleIds ? edit.profileRoleIds.split(',').filter(Boolean) : [],
    committeeResponsibilities: edit?.committeeResponsibilities ?? '',
    isActive: edit?.isActive ?? true,
    reason: edit?.reason ?? 'active',
  }
}

interface Props {
  open: boolean
  onClose: () => void
  editData: UnivCommittee | null
  organizationId: number
  onSaved: () => void
}

export default function CommitteeModal({ open, onClose, editData, organizationId, onSaved }: Props) {
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: getDefaults(),
  })

  const isForExam = watch('isForExam')
  const universityExamId = watch('universityExamId')

  const { data: formData } = useQuery({
    queryKey: QK.committees.createFormData(),
    queryFn: getCommitteeCreateFormData,
    enabled: open,
  })

  const { data: examSubjects = [] } = useQuery({
    queryKey: QK.committees.examSubjects(Number(universityExamId)),
    queryFn: () => getCommitteeExamSubjects(Number(universityExamId)),
    enabled: open && isForExam && Number(universityExamId) > 0,
  })

  useEffect(() => {
    reset(getDefaults(editData))
    setSubmitError(null)
  }, [open, editData, reset])

  const departmentOptions = useMemo(
    () => (formData?.departments ?? []).map((row) => ({
      value: String(pickNum(row as AnyRow, ['pk_catdet_id', 'catdet_id', 'department_catdet_id', 'pk_department_catdet_id'])),
      label: pickText(row as AnyRow, ['department_name', 'name', 'catdet_name', 'departmentName']),
    })).filter((o) => o.value !== '0'),
    [formData?.departments],
  )

  const examOptions = useMemo(
    () => (formData?.exams ?? []).map((row) => ({
      value: String(pickNum(row as AnyRow, ['pk_university_exam_id', 'university_exam_id', 'fk_university_exam_id'])),
      label: pickText(row as AnyRow, ['exam_name', 'examName', 'university_exam_name']),
    })).filter((o) => o.value !== '0'),
    [formData?.exams],
  )

  const roleOptions = useMemo(
    () => (formData?.roles ?? []).map((row) => ({
      value: String(pickNum(row as AnyRow, ['fk_role_id', 'role_id', 'pk_role_id', 'evaluator_role_id'])),
      label: pickText(row as AnyRow, ['role_name', 'evaluator_role_name', 'name']),
    })).filter((o) => o.value !== '0'),
    [formData?.roles],
  )

  const parentCommitteeOptions = useMemo(
    () => (formData?.parentCommittees ?? []).map((row) => ({
      value: String(row.pk_univ_committee_id),
      label: row.committee_name,
    })).filter((o) => o.value !== '0' && String(editData?.univCommitteeId ?? '') !== o.value),
    [formData?.parentCommittees, editData?.univCommitteeId],
  )

  const subjectOptions = useMemo(
    () => examSubjects.map((row) => ({
      value: String(row.subject_code ?? ''),
      label: String(row.subject_code ?? row.subject_name ?? ''),
    })).filter((o) => o.value !== ''),
    [examSubjects],
  )

  async function onSubmit(values: FormValues) {
    setSubmitError(null)
    try {
      const payload: Partial<UnivCommittee> & { isForExam?: boolean } = {
        organizationId,
        departmentCatdetId: Number(values.departmentCatdetId),
        committeeName: values.committeeName.trim(),
        committeeResponsibilities: values.committeeResponsibilities?.trim() || undefined,
        profileRoleIds: values.profileRoleIds?.length ? values.profileRoleIds.join(',') : undefined,
        univParentCommitteeId: values.univParentCommitteeId ? Number(values.univParentCommitteeId) : undefined,
        isActive: values.isActive,
        reason: values.isActive ? 'active' : (values.reason?.trim() || 'inactive'),
        isForExam: values.isForExam,
      }

      if (values.isForExam) {
        payload.universityExamId = values.universityExamId ? Number(values.universityExamId) : undefined
        payload.subjectCode = values.subjectCode || undefined
      } else {
        payload.universityExamId = undefined
        payload.subjectCode = undefined
      }

      if (editData) {
        await updateCommittee(editData.univCommitteeId, payload)
      } else {
        await createCommittee(payload)
      }
      onSaved()
      onClose()
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Failed to save committee.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[hsl(var(--primary))]">
            {editData ? 'Edit Committee' : 'Add Committee'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-2 py-1">
          <div className="grid grid-cols-2 gap-3">
            <Controller
              name="departmentCatdetId"
              control={control}
              render={({ field }) => (
                <Select
                  label="Department"
                  required
                  value={field.value || null}
                  onChange={(v) => field.onChange(v ?? '')}
                  options={departmentOptions}
                  placeholder="Select department"
                  searchable
                  error={errors.departmentCatdetId?.message}
                />
              )}
            />
            <div className="space-y-0.5">
              <Label className="text-xs">Committee Name *</Label>
              <Input className="h-8 text-xs" {...register('committeeName')} />
              {errors.committeeName && <p className="text-xs text-red-500">{errors.committeeName.message}</p>}
            </div>

            <div className="col-span-2">
              <Controller
                name="isForExam"
                control={control}
                render={({ field }) => (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="isForExam"
                      checked={field.value}
                      onCheckedChange={(checked) => {
                        field.onChange(Boolean(checked))
                        if (!checked) {
                          setValue('universityExamId', '')
                          setValue('subjectCode', '')
                        }
                      }}
                    />
                    <label htmlFor="isForExam" className="text-xs cursor-pointer">For Exam</label>
                  </div>
                )}
              />
            </div>

            {isForExam && (
              <>
                <Controller
                  name="universityExamId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      label="Exam"
                      value={field.value || null}
                      onChange={(v) => { field.onChange(v ?? ''); setValue('subjectCode', '') }}
                      options={examOptions}
                      placeholder="Select exam"
                      searchable
                    />
                  )}
                />
                <Controller
                  name="subjectCode"
                  control={control}
                  render={({ field }) => (
                    <Select
                      label="Subject Code"
                      value={field.value || null}
                      onChange={(v) => field.onChange(v ?? '')}
                      options={subjectOptions}
                      placeholder="Select subject"
                      searchable
                      disabled={!universityExamId}
                    />
                  )}
                />
              </>
            )}

            <Controller
              name="univParentCommitteeId"
              control={control}
              render={({ field }) => (
                <Select
                  label="Parent Committee"
                  value={field.value || null}
                  onChange={(v) => field.onChange(v ?? '')}
                  options={parentCommitteeOptions}
                  placeholder="Select parent committee"
                  searchable
                  clearable
                />
              )}
            />

            <Controller
              name="profileRoleIds"
              control={control}
              render={({ field }) => (
                <MultiSelect
                  label="Profile Roles"
                  value={field.value ?? []}
                  onChange={field.onChange}
                  options={roleOptions}
                  placeholder="Select roles"
                  searchable
                />
              )}
            />

            <div className="space-y-0.5 col-span-2">
              <Label className="text-xs">Committee Responsibilities</Label>
              <Textarea className="text-xs min-h-[72px]" {...register('committeeResponsibilities')} />
            </div>

            <div className="col-span-2">
              <Controller
                name="isActive"
                control={control}
                render={({ field }) => (
                  <ActiveStatusField
                    isActive={field.value}
                    reason={watch('reason') ?? ''}
                    onActiveChange={field.onChange}
                    onReasonChange={(v) => setValue('reason', v)}
                    reasonError={errors.reason?.message}
                  />
                )}
              />
            </div>
          </div>

          {submitError && <p className="text-sm text-red-600 rounded bg-red-50 px-3 py-2">{submitError}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : editData ? 'Update' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
