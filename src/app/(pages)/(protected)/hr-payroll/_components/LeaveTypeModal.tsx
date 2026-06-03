'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { ActiveStatusField } from '@/common/components/forms'
import { FormModal } from '@/common/components/feedback'
import { DatePicker } from '@/common/components/date-picker'
import { Select, type SelectOption } from '@/common/components/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  createLeaveType,
  listLeaveTypeDurations,
  listOrganizations,
  updateLeaveType,
  resolveLeaveTypeId,
} from '@/services'
import { toastError, toastSuccess } from '@/lib/toast'
import { toast } from 'sonner'

const carrySchema = z.enum(['true', 'false'])
const additionalSchema = z.enum(['0', '1'])

const schema = z
  .object({
    organizationId: z.number().min(1, 'Organization is required'),
    leaveName: z.string().min(1, 'Leave name is required'),
    leaveCode: z.string().min(1, 'Leave code is required'),
    leaveCount: z.coerce.number().min(0, 'Leave count is required'),
    leaveTypeDurationId: z.preprocess(
      (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)),
      z.number().optional(),
    ),
    additionalLeaves: additionalSchema,
    allowCarryForward: carrySchema,
    carryAll: carrySchema,
    specificCount: z.coerce.number().optional(),
    validFrom: z.date({ required_error: 'Valid from is required' }),
    validTo: z.date({ required_error: 'Valid to is required' }),
    isActive: z.boolean(),
    reason: z.string().optional(),
  })
  .refine((d) => d.validTo >= d.validFrom, {
    message: 'Valid to must be on or after valid from',
    path: ['validTo'],
  })

type FormValues = z.infer<typeof schema>
type LeaveRow = Record<string, unknown>

function formatYmd(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

function toCarryString(value: unknown): 'true' | 'false' {
  if (value === true || value === 'true' || value === 1 || value === '1') return 'true'
  return 'false'
}

function toAdditionalString(value: unknown): '0' | '1' {
  if (value === 1 || value === '1' || value === true) return '1'
  return '0'
}

interface LeaveTypeModalProps {
  open: boolean
  onClose: () => void
  row: LeaveRow | null
  onSaved: () => void
}

export function LeaveTypeModal({ open, onClose, row, onSaved }: Readonly<LeaveTypeModalProps>) {
  const isEditing = row != null && resolveLeaveTypeId(row) > 0
  const [organizations, setOrganizations] = useState<SelectOption[]>([])
  const [durations, setDurations] = useState<SelectOption[]>([])

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
      organizationId: undefined as unknown as number,
      leaveName: '',
      leaveCode: '',
      leaveCount: 0,
      leaveTypeDurationId: undefined,
      additionalLeaves: '0',
      allowCarryForward: 'false',
      carryAll: 'true',
      specificCount: 0,
      validFrom: new Date(),
      validTo: new Date(),
      isActive: true,
      reason: 'active',
    },
  })

  const allowCarryForward = watch('allowCarryForward')
  const carryAll = watch('carryAll')

  useEffect(() => {
    if (!open) return
    void Promise.all([
      listOrganizations().then((orgs) =>
        setOrganizations(
          orgs
            .filter((o) => o.isActive !== false)
            .map((o) => ({
              value: String(o.organizationId),
              label: o.orgCode ?? o.orgName ?? String(o.organizationId),
            })),
        ),
      ),
      listLeaveTypeDurations().then((list) =>
        setDurations(
          list.map((d) => ({
            value: String(d.generalDetailId),
            label: String(d.generalDetailDisplayName ?? d.generalDetailName ?? d.generalDetailId),
          })),
        ),
      ),
    ])

    reset(
      isEditing && row
        ? {
            organizationId: Number(row.organizationId),
            leaveName: String(row.leaveName ?? ''),
            leaveCode: String(row.leaveCode ?? ''),
            leaveCount: Number(row.leaveCount ?? 0),
            leaveTypeDurationId: row.leaveTypeDurationId
              ? Number(row.leaveTypeDurationId)
              : undefined,
            additionalLeaves: toAdditionalString(row.additionalLeaves),
            allowCarryForward: toCarryString(row.allowCarryForward),
            carryAll: toCarryString(row.carryAll),
            specificCount: Number(row.specificCount ?? 0),
            validFrom: row.validFrom ? new Date(String(row.validFrom)) : new Date(),
            validTo: row.validTo ? new Date(String(row.validTo)) : new Date(),
            isActive: row.isActive !== false,
            reason: String(row.reason ?? 'active'),
          }
        : {
            organizationId: undefined as unknown as number,
            leaveName: '',
            leaveCode: '',
            leaveCount: 0,
            leaveTypeDurationId: undefined,
            additionalLeaves: '0',
            allowCarryForward: 'false',
            carryAll: 'true',
            specificCount: 0,
            validFrom: new Date(),
            validTo: new Date(),
            isActive: true,
            reason: 'active',
          },
    )
  }, [open, isEditing, row, reset])

  function onValidFromChange(date: Date | undefined) {
    if (!date) return
    setValue('validFrom', date)
    const to = watch('validTo')
    if (to && date > to) {
      toast.info('From date should be less than to date.')
      setValue('validTo', date)
    }
  }

  async function onSubmit(data: FormValues) {
    const payload: LeaveRow = {
      organizationId: data.organizationId,
      leaveName: data.leaveName.trim(),
      leaveCode: data.leaveCode.trim(),
      leaveCount: data.leaveCount,
      leaveTypeDurationId: data.leaveTypeDurationId,
      additionalLeaves: data.additionalLeaves,
      allowCarryForward: data.allowCarryForward,
      carryAll: data.carryAll,
      specificCount: data.specificCount ?? 0,
      validFrom: formatYmd(data.validFrom),
      validTo: formatYmd(data.validTo),
      isActive: data.isActive,
      reason: data.isActive ? 'active' : (data.reason?.trim() || 'inactive'),
    }
    try {
      if (isEditing && row) {
        const id = resolveLeaveTypeId(row)
        await updateLeaveType(id, { ...payload, leavetypeId: id })
        toastSuccess('Leave type updated')
      } else {
        await createLeaveType(payload)
        toastSuccess('Leave type created')
      }
      onSaved()
      onClose()
    } catch (err) {
      toastError(err, `Failed to ${isEditing ? 'update' : 'create'} leave type`)
    }
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Edit Leave Type' : 'Add Leave Type'}
      titleClassName="text-[15px] font-semibold leading-none text-[#5da394]"
      onSubmit={(e) => {
        e.preventDefault()
        void handleSubmit(onSubmit)()
      }}
      isSubmitting={isSubmitting}
      submitLabel="Save"
      size="xl"
    >
      <div className="flex flex-col gap-4 text-[12px]">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Controller
            name="organizationId"
            control={control}
            render={({ field }) => (
              <Select
                label="Organization"
                required
                value={field.value ? String(field.value) : null}
                onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                options={organizations}
                placeholder="Select organization"
                searchable
                error={errors.organizationId?.message}
              />
            )}
          />
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-[12px]">
              Leave Name <span className="text-destructive">*</span>
            </Label>
            <Input className="h-9 text-[12px]" {...register('leaveName')} />
            {errors.leaveName ? (
              <p className="text-[11px] text-destructive">{errors.leaveName.message}</p>
            ) : null}
          </div>
          <div className="space-y-1">
            <Label className="text-[12px]">
              Leave Code <span className="text-destructive">*</span>
            </Label>
            <Input className="h-9 text-[12px]" {...register('leaveCode')} />
            {errors.leaveCode ? (
              <p className="text-[11px] text-destructive">{errors.leaveCode.message}</p>
            ) : null}
          </div>
          <div className="space-y-1">
            <Label className="text-[12px]">
              Leave Count <span className="text-destructive">*</span>
            </Label>
            <Input type="number" className="h-9 text-[12px]" {...register('leaveCount')} />
            {errors.leaveCount ? (
              <p className="text-[11px] text-destructive">{errors.leaveCount.message}</p>
            ) : null}
          </div>
          <Controller
            name="leaveTypeDurationId"
            control={control}
            render={({ field }) => (
              <Select
                label="Leave Type Duration"
                value={field.value ? String(field.value) : null}
                onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                options={durations}
                placeholder="Select duration"
                searchable
                clearable
              />
            )}
          />
          <div className="space-y-1">
            <Label className="text-[12px]">Valid From</Label>
            <Controller
              name="validFrom"
              control={control}
              render={({ field }) => (
                <DatePicker
                  value={field.value}
                  onChange={onValidFromChange}
                  className="h-9 text-[12px]"
                />
              )}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[12px]">Valid To</Label>
            <Controller
              name="validTo"
              control={control}
              render={({ field }) => (
                <DatePicker
                  value={field.value}
                  onChange={field.onChange}
                  minDate={watch('validFrom')}
                  className="h-9 text-[12px]"
                />
              )}
            />
            {errors.validTo ? (
              <p className="text-[11px] text-destructive">{errors.validTo.message}</p>
            ) : null}
          </div>
        </div>

        <div className="space-y-2 rounded border border-border/60 p-3">
          <p className="font-medium text-[13px]">Employee leave balance</p>
          <p className="text-muted-foreground text-[11px]">
            Set how to manage employee leave balance during leave reset
          </p>
          <Controller
            name="allowCarryForward"
            control={control}
            render={({ field }) => (
              <RadioGroup
                value={field.value}
                onValueChange={field.onChange}
                className="flex flex-col gap-2 sm:flex-row sm:gap-6"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="true" id="carry-yes" />
                  <Label htmlFor="carry-yes" className="cursor-pointer font-normal">
                    Allow leave carry forward
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="false" id="carry-no" />
                  <Label htmlFor="carry-no" className="cursor-pointer font-normal">
                    Discard leave balance
                  </Label>
                </div>
              </RadioGroup>
            )}
          />
          {allowCarryForward === 'true' ? (
            <div className="space-y-2 pt-2">
              <p className="text-muted-foreground text-[11px]">
                Maximum number of leaves that can be carried forward
              </p>
              <Controller
                name="carryAll"
                control={control}
                render={({ field }) => (
                  <RadioGroup
                    value={field.value}
                    onValueChange={field.onChange}
                    className="flex flex-col gap-2 sm:flex-row sm:gap-6"
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="true" id="carry-all" />
                      <Label htmlFor="carry-all" className="cursor-pointer font-normal">
                        All balance leaves
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="false" id="carry-specific" />
                      <Label htmlFor="carry-specific" className="cursor-pointer font-normal">
                        Specific count
                      </Label>
                    </div>
                  </RadioGroup>
                )}
              />
              {carryAll === 'false' ? (
                <div className="max-w-[140px] space-y-1">
                  <Label className="text-[12px]">Specific Count</Label>
                  <Input type="number" className="h-9 text-[12px]" {...register('specificCount')} />
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="space-y-2 rounded border border-border/60 p-3">
          <p className="font-medium text-[13px]">Additional leaves</p>
          <p className="text-muted-foreground text-[11px]">
            Set how to manage employee additional leaves
          </p>
          <Controller
            name="additionalLeaves"
            control={control}
            render={({ field }) => (
              <RadioGroup
                value={field.value}
                onValueChange={field.onChange}
                className="flex flex-col gap-2 sm:flex-row sm:gap-6"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="1" id="add-lop" />
                  <Label htmlFor="add-lop" className="cursor-pointer font-normal">
                    Liable for salary deduction (LOP)
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="0" id="add-none" />
                  <Label htmlFor="add-none" className="cursor-pointer font-normal">
                    No salary deduction
                  </Label>
                </div>
              </RadioGroup>
            )}
          />
        </div>

        <Controller
          name="isActive"
          control={control}
          render={({ field }) => (
            <ActiveStatusField
              isActive={field.value}
              reason={watch('reason') ?? ''}
              onActiveChange={(v) => field.onChange(v === true)}
              onReasonChange={(v) => setValue('reason', v)}
            />
          )}
        />
      </div>
    </FormModal>
  )
}
