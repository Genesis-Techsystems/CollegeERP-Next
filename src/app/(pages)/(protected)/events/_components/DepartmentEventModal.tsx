'use client'

import { useEffect, useState } from 'react'
import { Controller, useForm, type Resolver } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { ActiveStatusField } from '@/common/components/forms'
import { FormModal } from '@/common/components/feedback'
import { DatePicker } from '@/common/components/date-picker'
import { Select, type SelectOption } from '@/common/components/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  EVENTS_FIELD_LABEL_CLASS,
  EVENTS_INPUT_CLASS,
  EVENTS_MODAL_TITLE_CLASS,
  EVENTS_TEXTAREA_CLASS,
} from '../_lib/modal-styles'
import {
  createDepartmentEvent,
  listDepartmentsByCollege,
  updateDepartmentEvent,
  type DepartmentEventRow,
} from '@/services'
import { toastError, toastSuccess } from '@/lib/toast'
import { getErrorMessage } from '@/lib/errors'

const schema = z.object({
  departmentId: z.number().min(1, 'Department is required'),
  deptEventName: z.string().min(1, 'Event name is required'),
  venue: z.string().optional(),
  startDate: z.date({ message: 'Start date is required' }),
  endDate: z.date({ message: 'End date is required' }),
  totalRegisrationAmount: z.coerce.number().optional(),
  totalExpenditure: z.coerce.number().optional(),
  totalFeeCollected: z.coerce.number().optional(),
  deptEventDescription: z.string().optional(),
  isActive: z.boolean(),
  reason: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

type DepartmentEventModalProps = {
  open: boolean
  onClose: () => void
  row: DepartmentEventRow | null
  collegeId: number
  academicYearId: number
  onSaved: () => void
}

function toIso(d: Date): string {
  return d.toISOString()
}

export function DepartmentEventModal({
  open,
  onClose,
  row,
  collegeId,
  academicYearId,
  onSaved,
}: Readonly<DepartmentEventModalProps>) {
  const isEditing = row != null
  const [departments, setDepartments] = useState<SelectOption[]>([])

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      departmentId: undefined,
      deptEventName: '',
      venue: '',
      startDate: new Date(),
      endDate: new Date(),
      totalRegisrationAmount: 0,
      totalExpenditure: 0,
      totalFeeCollected: 0,
      deptEventDescription: '',
      isActive: true,
      reason: 'active',
    },
  })

  useEffect(() => {
    if (!open || !collegeId) return
    void listDepartmentsByCollege(collegeId).then((list) => {
      setDepartments(
        list.map((d) => ({
          value: String(d.departmentId),
          label: d.deptName ?? d.deptCode ?? String(d.departmentId),
        })),
      )
    })
    reset(
      row
        ? {
            departmentId: Number(row.departmentId),
            deptEventName: String(row.deptEventName ?? ''),
            venue: String(row.venue ?? ''),
            startDate: row.startDate ? new Date(String(row.startDate)) : new Date(),
            endDate: row.endDate ? new Date(String(row.endDate)) : new Date(),
            totalRegisrationAmount: Number(row.totalRegisrationAmount ?? 0),
            totalExpenditure: Number(row.totalExpenditure ?? 0),
            totalFeeCollected: Number(row.totalFeeCollected ?? 0),
            deptEventDescription: String(row.deptEventDescription ?? ''),
            isActive: row.isActive !== false,
            reason: String(row.reason ?? 'active'),
          }
        : {
            departmentId: undefined,
            deptEventName: '',
            venue: '',
            startDate: new Date(),
            endDate: new Date(),
            totalRegisrationAmount: 0,
            totalExpenditure: 0,
            totalFeeCollected: 0,
            deptEventDescription: '',
            isActive: true,
            reason: 'active',
          },
    )
  }, [open, row, collegeId, reset])

  async function onSubmit(values: FormValues) {
    const payload: DepartmentEventRow = {
      ...row,
      ...values,
      collegeId,
      academicYearId,
      startDate: toIso(values.startDate),
      endDate: toIso(values.endDate),
      reason: values.isActive ? 'active' : (values.reason?.trim() || 'inactive'),
    }
    try {
      if (isEditing) {
        await updateDepartmentEvent(payload)
        toastSuccess('Department event updated')
      } else {
        await createDepartmentEvent(payload)
        toastSuccess('Department event created')
      }
      onSaved()
      onClose()
    } catch (e) {
      toastError(getErrorMessage(e))
    }
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Edit Department Event' : 'Add Department Event'}
      titleClassName={EVENTS_MODAL_TITLE_CLASS}
      showHeaderDivider
      onSubmit={(e) => {
        e.preventDefault()
        void handleSubmit(onSubmit)()
      }}
      submitLabel={isEditing ? 'Update' : 'Save'}
      cancelLabel="Cancel"
      isSubmitting={isSubmitting}
      size="lg"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Controller
          name="departmentId"
          control={control}
          render={({ field }) => (
            <Select
              label="Department *"
              value={field.value ? String(field.value) : null}
              onChange={(v) => field.onChange(v ? Number(v) : undefined)}
              options={departments}
              searchable
              error={errors.departmentId?.message}
            />
          )}
        />
        <div className="space-y-1">
          <Label htmlFor="deptEventName" className={EVENTS_FIELD_LABEL_CLASS}>
            Event Name *
          </Label>
          <Input id="deptEventName" className={EVENTS_INPUT_CLASS} {...register('deptEventName')} />
          {errors.deptEventName ? (
            <p className="text-xs text-destructive">{errors.deptEventName.message}</p>
          ) : null}
        </div>
        <div className="space-y-1">
          <Label htmlFor="venue" className={EVENTS_FIELD_LABEL_CLASS}>
            Venue
          </Label>
          <Input id="venue" className={EVENTS_INPUT_CLASS} {...register('venue')} />
        </div>
        <div>
          <Controller
            name="startDate"
            control={control}
            render={({ field }) => (
              <DatePicker label="Start Date *" value={field.value} onChange={field.onChange} clearable={false} />
            )}
          />
        </div>
        <div>
          <Controller
            name="endDate"
            control={control}
            render={({ field }) => (
              <DatePicker label="End Date *" value={field.value} onChange={field.onChange} clearable={false} />
            )}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="totalRegisrationAmount" className={EVENTS_FIELD_LABEL_CLASS}>
            Registration Amount
          </Label>
          <Input
            id="totalRegisrationAmount"
            type="number"
            className={EVENTS_INPUT_CLASS}
            {...register('totalRegisrationAmount')}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="totalExpenditure" className={EVENTS_FIELD_LABEL_CLASS}>
            Total Expenditure
          </Label>
          <Input
            id="totalExpenditure"
            type="number"
            className={EVENTS_INPUT_CLASS}
            {...register('totalExpenditure')}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="totalFeeCollected" className={EVENTS_FIELD_LABEL_CLASS}>
            Fee Collected
          </Label>
          <Input
            id="totalFeeCollected"
            type="number"
            className={EVENTS_INPUT_CLASS}
            {...register('totalFeeCollected')}
          />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="deptEventDescription" className={EVENTS_FIELD_LABEL_CLASS}>
            Description
          </Label>
          <textarea
            id="deptEventDescription"
            rows={3}
            className={EVENTS_TEXTAREA_CLASS}
            {...register('deptEventDescription')}
          />
        </div>
        <div className="sm:col-span-2">
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
      </div>
    </FormModal>
  )
}
