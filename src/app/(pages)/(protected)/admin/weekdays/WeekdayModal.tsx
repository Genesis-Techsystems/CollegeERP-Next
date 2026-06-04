'use client'

import { Controller, useForm, type Resolver } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { ActiveStatusField } from '@/common/components/forms'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createWeekday, updateWeekday } from '@/services'
import type { Weekday } from '@/types/weekday'

const optionalNumber = z.preprocess(
  (value) => {
    if (value === '' || value === null || value === undefined) return undefined
    const n = Number(value)
    return Number.isNaN(n) ? undefined : n
  },
  z.number().optional(),
)

const schema = z.object({
  weekDay: z.string().min(1, 'Week Day is required'),
  name: z.string().min(1, 'Name is required'),
  dayOfWeek: optionalNumber,
  sortOrder: optionalNumber,
  isEditable: z.boolean().optional(),
  isActive: z.boolean(),
  reason: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface WeekdayModalProps {
  open: boolean
  onClose: () => void
  row: Weekday | null
  onSaved: () => void
}

export default function WeekdayModal({ open, onClose, row, onSaved }: Readonly<WeekdayModalProps>) {
  const isEditing = Boolean(row)
  const { register, handleSubmit, reset, control, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    values: {
      weekDay: row?.weekDay ?? '',
      name: row?.name ?? '',
      dayOfWeek: row?.dayOfWeek,
      sortOrder: row?.sortOrder,
      isEditable: row?.isEditable ?? false,
      isActive: row?.isActive ?? true,
      reason: row?.reason ?? '',
    },
  })

  async function onSubmit(values: FormValues) {
    if (isEditing) {
      await updateWeekday(row!.weekdayId, values)
    } else {
      await createWeekday(values)
    }
    onSaved()
    reset()
    onClose()
  }

  let submitLabel = 'Save'
  if (isSubmitting) submitLabel = 'Saving...'
  else if (isEditing) submitLabel = 'Update'

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose() }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pr-8">
          <DialogTitle className="text-base font-semibold leading-none text-[hsl(var(--primary))]">
            {isEditing ? 'Edit Week Day' : 'Add Week Day'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-2 py-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <Label htmlFor="weekDay">Week Day *</Label>
              <Input id="weekDay" {...register('weekDay')} />
              {errors.weekDay && <p className="text-xs text-red-500">{errors.weekDay.message}</p>}
            </div>
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input id="name" {...register('name')} />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>
            <div>
              <Label htmlFor="dayOfWeek">Day Of Week</Label>
              <Input id="dayOfWeek" type="number" {...register('dayOfWeek')} />
            </div>
            <div>
              <Label htmlFor="sortOrder">Sort Order</Label>
              <Input id="sortOrder" type="number" {...register('sortOrder')} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
            <div className="flex items-center gap-2">
              <Checkbox
                id="isEditable"
                checked={watch('isEditable') ?? false}
                onCheckedChange={(checked) => setValue('isEditable', Boolean(checked))}
              />
              <Label htmlFor="isEditable">Is Editable</Label>
            </div>
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

          <DialogFooter className="pt-1">
            <Button variant="outline" type="button" onClick={onClose} disabled={isSubmitting}>Close</Button>
            <Button type="submit" disabled={isSubmitting}>{submitLabel}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

