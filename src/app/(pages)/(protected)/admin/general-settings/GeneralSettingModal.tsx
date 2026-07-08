'use client'

import { useEffect, useMemo, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { ActiveStatusField } from '@/common/components/forms'
import { Select, type SelectOption } from '@/common/components/select'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  createGeneralSetting,
  listActiveCollegesForGeneralSettings,
  updateGeneralSetting,
} from '@/services'
import type { College } from '@/types/college'
import type { GeneralSetting } from '@/types/general-setting'

const schema = z.object({
  collegeId: z.number().min(1, 'College is required'),
  settingName: z.string().min(1, 'Setting name is required'),
  settingCode: z.string().min(1, 'Setting code is required'),
  settingValue: z.string().min(1, 'Setting value is required'),
  isActive: z.boolean(),
  reason: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface GeneralSettingModalProps {
  open: boolean
  onClose: () => void
  setting: GeneralSetting | null
  onSaved: () => void
}

function toCollegeOptions(rows: College[]): SelectOption[] {
  return rows.map((row) => ({
    value: String(row.collegeId),
    label: row.collegeCode ?? row.collegeName,
  }))
}

export default function GeneralSettingModal({
  open,
  onClose,
  setting,
  onSaved,
}: Readonly<GeneralSettingModalProps>) {
  const isEditing = setting != null
  const [colleges, setColleges] = useState<College[]>([])
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      collegeId: undefined,
      settingName: '',
      settingCode: '',
      settingValue: '',
      isActive: true,
      reason: '',
    },
  })

  const collegeOptions = useMemo(() => toCollegeOptions(colleges), [colleges])

  useEffect(() => {
    if (!open) return
    listActiveCollegesForGeneralSettings().then(setColleges).catch(console.error)
  }, [open])

  useEffect(() => {
    if (setting) {
      reset({
        collegeId: setting.collegeId,
        settingName: setting.settingName,
        settingCode: setting.settingCode,
        settingValue: setting.settingValue,
        isActive: setting.isActive,
        reason: setting.reason ?? '',
      })
    } else {
      reset()
    }
    setSubmitError(null)
  }, [setting, open, reset])

  async function onSubmit(data: FormValues) {
    setSubmitError(null)
    try {
      const payload = {
        ...data,
        reason: data.reason?.trim() ? data.reason.trim() : null,
      }
      if (isEditing) await updateGeneralSetting(setting!.generalSettingId, payload)
      else await createGeneralSetting(payload as Omit<GeneralSetting, 'generalSettingId'>)
      onSaved()
      onClose()
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to save setting')
    }
  }

  let submitLabel = 'Save'
  if (isSubmitting) submitLabel = 'Saving...'
  else if (isEditing) submitLabel = 'Update'

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose() }}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pr-8">
          <DialogTitle className="text-base font-semibold leading-none text-[hsl(var(--primary))]">
            {isEditing ? 'Edit General Setting' : 'Add General Setting'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-2 py-1">
          <Controller
            name="collegeId"
            control={control}
            render={({ field }) => (
              <Select
                label="College"
                required
                value={field.value ? String(field.value) : null}
                onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                options={collegeOptions}
                placeholder="Select college"
                searchable
                error={errors.collegeId?.message}
              />
            )}
          />

          <div className="space-y-0.5">
            <Label htmlFor="settingName">Setting Name *</Label>
            <Input id="settingName" {...register('settingName')} />
            {errors.settingName && <p className="text-xs text-red-500">{errors.settingName.message}</p>}
          </div>
          <div className="space-y-0.5">
            <Label htmlFor="settingCode">Setting Code *</Label>
            <Input id="settingCode" {...register('settingCode')} />
            {errors.settingCode && <p className="text-xs text-red-500">{errors.settingCode.message}</p>}
          </div>
          <div className="space-y-0.5">
            <Label htmlFor="settingValue">Setting Value *</Label>
            <Input id="settingValue" {...register('settingValue')} />
            {errors.settingValue && <p className="text-xs text-red-500">{errors.settingValue.message}</p>}
          </div>

          <Controller
            name="isActive"
            control={control}
            render={({ field }) => (
              <ActiveStatusField
                isActive={field.value}
                reason={watch('reason') ?? ''}
                onActiveChange={field.onChange}
                onReasonChange={(value) => setValue('reason', value)}
                reasonError={errors.reason?.message}
              />
            )}
          />

          {submitError && (
            <p className="text-sm text-red-600 rounded bg-red-50 px-3 py-2">{submitError}</p>
          )}

          <DialogFooter className="pt-1">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
