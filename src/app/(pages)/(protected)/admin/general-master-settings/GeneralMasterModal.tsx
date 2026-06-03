'use client'

import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createGeneralMaster, updateGeneralMaster } from '@/services'
import type { GeneralMaster } from '@/types/general-master'

const schema = z.object({
  generalMasterDisplayName: z.string().min(1, 'Display name is required'),
  generalMasterCode: z.string().min(1, 'Display code is required'),
  generalMasterDescription: z.string().optional(),
  isEditable: z.boolean().optional(),
  isActive: z.boolean(),
})

type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  onClose: () => void
  row: GeneralMaster | null
  onSaved: () => void
}

export default function GeneralMasterModal({ open, onClose, row, onSaved }: Readonly<Props>) {
  const isEditing = Boolean(row)
  const { register, control, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      generalMasterDisplayName: '',
      generalMasterCode: '',
      generalMasterDescription: '',
      isEditable: false,
      isActive: true,
    },
  })

  useEffect(() => {
    if (row) {
      reset({
        generalMasterDisplayName: row.generalMasterDisplayName,
        generalMasterCode: row.generalMasterCode,
        generalMasterDescription: row.generalMasterDescription ?? '',
        isEditable: row.isEditable ?? false,
        isActive: row.isActive,
      })
    } else {
      reset()
    }
  }, [row, open, reset])

  async function onSubmit(values: FormValues) {
    if (isEditing) await updateGeneralMaster(row!.generalMasterId, values)
    else await createGeneralMaster(values as Omit<GeneralMaster, 'generalMasterId'>)
    onSaved()
    onClose()
  }

  let submitLabel = 'Save'
  if (isSubmitting) submitLabel = 'Saving...'
  else if (isEditing) submitLabel = 'Update'

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose() }}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pr-8">
          <DialogTitle className="text-base font-semibold leading-none text-[hsl(var(--primary))]">
            {isEditing ? 'Edit General Master' : 'Add General Master'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-2 py-1">
          <div>
            <Label htmlFor="generalMasterDisplayName">Display Name *</Label>
            <Input id="generalMasterDisplayName" {...register('generalMasterDisplayName')} />
            {errors.generalMasterDisplayName && <p className="text-xs text-red-500">{errors.generalMasterDisplayName.message}</p>}
          </div>
          <div>
            <Label htmlFor="generalMasterCode">Display Code *</Label>
            <Input id="generalMasterCode" {...register('generalMasterCode')} disabled={isEditing} />
            {errors.generalMasterCode && <p className="text-xs text-red-500">{errors.generalMasterCode.message}</p>}
          </div>
          <div>
            <Label htmlFor="generalMasterDescription">Description</Label>
            <Input id="generalMasterDescription" {...register('generalMasterDescription')} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
            <div className="flex items-center gap-2">
              <Checkbox
                id="isEditable"
                checked={watch('isEditable') ?? false}
                onCheckedChange={(checked) => setValue('isEditable', Boolean(checked))}
              />
              <Label htmlFor="isEditable">Editable</Label>
            </div>
            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <div className="flex items-center gap-2">
                  <Checkbox id="isActive" checked={field.value} onCheckedChange={(checked) => field.onChange(Boolean(checked))} />
                  <Label htmlFor="isActive">Active</Label>
                </div>
              )}
            />
          </div>
          <DialogFooter className="pt-1">
            <Button variant="outline" type="button" onClick={onClose}>Close</Button>
            <Button type="submit" disabled={isSubmitting}>{submitLabel}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

