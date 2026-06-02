'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Select } from '@/common/components/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { createLibraryMembership } from '@/services'
import { toastError, toastSuccess } from '@/lib/toast'

const schema = z.object({
  memberName: z.string().min(1, 'Member name is required'),
  memberType: z.string().min(1, 'Member type is required'),
  membershipNo: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

const MEMBER_TYPE_OPTIONS = [
  { value: 'STUDENT', label: 'Student' },
  { value: 'EMPLOYEE', label: 'Employee' },
]

interface NewMembershipPanelProps {
  onSaved: () => void
}

export function NewMembershipPanel({ onSaved }: Readonly<NewMembershipPanelProps>) {
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { memberName: '', memberType: 'STUDENT', membershipNo: '' },
  })

  async function onSubmit(data: FormValues) {
    setSubmitting(true)
    try {
      await createLibraryMembership({
        ...data,
        isActive: true,
        reason: 'active',
      })
      toastSuccess('Membership created')
      reset()
      onSaved()
    } catch (err) {
      toastError(err, 'Failed to create membership')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mx-auto max-w-lg space-y-4 py-2">
      <div className="space-y-1">
        <Label htmlFor="membershipNo" className="text-[12px]">
          Membership Id
        </Label>
        <Input id="membershipNo" className="h-9 text-[12px]" {...register('membershipNo')} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="memberName" className="text-[12px]">
          Member Name *
        </Label>
        <Input id="memberName" className="h-9 text-[12px]" {...register('memberName')} />
        {errors.memberName ? (
          <p className="text-xs text-destructive">{errors.memberName.message}</p>
        ) : null}
      </div>
      <Select
        label="Member Type *"
        value={watch('memberType') || null}
        onChange={(v) => setValue('memberType', v ?? '')}
        options={MEMBER_TYPE_OPTIONS}
        error={errors.memberType?.message}
      />
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" size="sm" onClick={() => reset()} disabled={submitting}>
          Clear
        </Button>
        <Button type="submit" size="sm" disabled={submitting}>
          Save Membership
        </Button>
      </div>
    </form>
  )
}
