'use client'

import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { ActiveStatusField } from '@/common/components/forms'
import { FormModal } from '@/common/components/feedback'
import { Select, type SelectOption } from '@/common/components/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  createCollegeCounselling,
  listCasteQuotas,
  listGeneralDetailsByMaster,
  updateCollegeCounselling,
} from '@/services'
import type { CollegeCounsellingRow } from '@/types/admission'
import { GM_CODES } from '@/config/constants/ui'
import { toastError, toastSuccess } from '@/lib/toast'

const optionalNumber = z.preprocess(
  (value) => {
    if (value === '' || value === null || value === undefined) return undefined
    const n = Number(value)
    return Number.isNaN(n) ? undefined : n
  },
  z.number().optional(),
)

const schema = z.object({
  casteQuotaId: z.number().min(1, 'Quota is required'),
  genderCatDetailId: z.number().min(1, 'Gender is required'),
  totalNoOfIntakes: optionalNumber,
  tutionFee: optionalNumber,
  totalFilled: optionalNumber,
  cutoffMarks: optionalNumber,
  cutoffRank: optionalNumber,
  minMarks: optionalNumber,
  maxMarks: optionalNumber,
  minRank: optionalNumber,
  maxRank: optionalNumber,
  isActive: z.boolean(),
  reason: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface CollegeCounsellingModalProps {
  open: boolean
  onClose: () => void
  row: CollegeCounsellingRow | null
  context: { collegeId: number; courseId: number; batchId: number; courseGroupId: number }
  onSaved: () => void
}

export function CollegeCounsellingModal({
  open,
  onClose,
  row,
  context,
  onSaved,
}: Readonly<CollegeCounsellingModalProps>) {
  const isEditing = row != null
  const [quotaOptions, setQuotaOptions] = useState<SelectOption[]>([])
  const [genderOptions, setGenderOptions] = useState<SelectOption[]>([])

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      casteQuotaId: undefined,
      genderCatDetailId: undefined,
      totalNoOfIntakes: undefined,
      tutionFee: undefined,
      totalFilled: undefined,
      cutoffMarks: undefined,
      cutoffRank: undefined,
      minMarks: undefined,
      maxMarks: undefined,
      minRank: undefined,
      maxRank: undefined,
      isActive: true,
      reason: 'active',
    },
  })

  useEffect(() => {
    if (!open) return
    void Promise.all([
      listCasteQuotas(),
      listGeneralDetailsByMaster(GM_CODES.GENDER),
    ]).then(([quotas, genders]) => {
      setQuotaOptions(
        quotas.map((q) => ({
          value: String(q.casteQuotaId),
          label: q.casteQuota ?? q.caste ?? String(q.casteQuotaId),
        })),
      )
      setGenderOptions(
        genders.map((g) => ({
          value: String(g.generalDetailId),
          label: g.generalDetailName ?? g.generalDetailCode ?? '',
        })),
      )
    })
    reset(
      row
        ? {
            casteQuotaId: row.casteQuotaId,
            genderCatDetailId: row.genderCatDetailId,
            totalNoOfIntakes: row.totalNoOfIntakes,
            tutionFee: row.tutionFee,
            totalFilled: row.totalFilled,
            cutoffMarks: row.cutoffMarks,
            cutoffRank: row.cutoffRank,
            minMarks: row.minMarks,
            maxMarks: row.maxMarks,
            minRank: row.minRank,
            maxRank: row.maxRank,
            isActive: row.isActive ?? true,
            reason: row.reason ?? 'active',
          }
        : {
            casteQuotaId: undefined,
            genderCatDetailId: undefined,
            totalNoOfIntakes: undefined,
            tutionFee: undefined,
            totalFilled: undefined,
            cutoffMarks: undefined,
            cutoffRank: undefined,
            minMarks: undefined,
            maxMarks: undefined,
            minRank: undefined,
            maxRank: undefined,
            isActive: true,
            reason: 'active',
          },
    )
  }, [open, row, reset])

  async function onSubmit(data: FormValues) {
    // Angular only persists collegeId, batchId, courseGroupId with form fields (no courseId on create)
    const payload = {
      collegeId: context.collegeId,
      batchId: context.batchId,
      courseGroupId: context.courseGroupId,
      casteQuotaId: data.casteQuotaId,
      genderCatDetailId: data.genderCatDetailId,
      totalNoOfIntakes: data.totalNoOfIntakes ?? 0,
      tutionFee: data.tutionFee,
      totalFilled: data.totalFilled,
      cutoffMarks: data.cutoffMarks,
      cutoffRank: data.cutoffRank,
      minMarks: data.minMarks,
      maxMarks: data.maxMarks,
      minRank: data.minRank,
      maxRank: data.maxRank,
      isActive: data.isActive,
      reason: data.isActive ? 'active' : (data.reason?.trim() || 'inactive'),
      univCollegeCounsellingId: row?.univCollegeCounsellingId,
    }
    try {
      if (isEditing && row?.univCollegeCounsellingId) {
        await updateCollegeCounselling(payload)
        toastSuccess('College counselling updated')
      } else {
        await createCollegeCounselling(payload)
        toastSuccess('College counselling created')
      }
      onSaved()
      onClose()
    } catch (err) {
      toastError(err, `Failed to ${isEditing ? 'update' : 'create'} college counselling`)
    }
  }

  const numberField = (name: keyof FormValues, label: string) => (
    <div className="space-y-1">
      <Label className="text-[12px]">{label}</Label>
      <Input type="number" className="h-9 text-[12px]" {...register(name)} />
    </div>
  )

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Edit College Counselling' : 'Add College Counselling'}
      titleClassName="text-[15px] font-semibold leading-none text-[#5da394]"
      onSubmit={(e) => {
        e.preventDefault()
        void handleSubmit(onSubmit, () => {
          toastError(new Error('Please fill in all required fields'))
        })()
      }}
      isSubmitting={isSubmitting}
      submitLabel={isEditing ? 'Update' : 'Save'}
      size="xl"
    >
      <div className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Controller
            name="casteQuotaId"
            control={control}
            render={({ field }) => (
              <Select
                label="Quota"
                required
                value={field.value ? String(field.value) : null}
                onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                options={quotaOptions}
                placeholder="Select quota"
                searchable
                error={errors.casteQuotaId?.message}
              />
            )}
          />
          <Controller
            name="genderCatDetailId"
            control={control}
            render={({ field }) => (
              <Select
                label="Gender"
                required
                value={field.value ? String(field.value) : null}
                onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                options={genderOptions}
                placeholder="Select gender"
                error={errors.genderCatDetailId?.message}
              />
            )}
          />
          <div className="space-y-1">
            <Label className="text-[12px]">Total InTakes</Label>
            <Input type="number" className="h-9 text-[12px]" {...register('totalNoOfIntakes')} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {numberField('tutionFee', 'Tution Fee')}
          {numberField('totalFilled', 'Total Filled')}
          {numberField('cutoffMarks', 'Cutoff Marks')}
          {numberField('cutoffRank', 'Cutoff Rank')}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {numberField('minMarks', 'Min Marks')}
          {numberField('maxMarks', 'Max Marks')}
          {numberField('minRank', 'Min Rank')}
          {numberField('maxRank', 'Max Rank')}
        </div>

        <Controller
          name="isActive"
          control={control}
          render={({ field }) => (
            <ActiveStatusField
              isActive={field.value}
              reason={watch('reason') ?? ''}
              onActiveChange={field.onChange}
              onReasonChange={(v) => setValue('reason', String(v))}
              reasonError={errors.reason?.message}
            />
          )}
        />
      </div>
    </FormModal>
  )
}
