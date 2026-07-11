'use client'

import { useEffect, useState } from 'react'
import { useForm, Controller, type Resolver } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, type SelectOption } from '@/common/components/select'
import { ActiveStatusField } from '@/common/components/forms'
import { GM_CODES } from '@/config/constants/ui'
import { toastError, toastSuccess } from '@/lib/toast'
import { requiredNumber } from '@/lib/zod-fields'
import { getGeneralDetails } from '@/services/exam-master'
import {
  createUnivEcProfile,
  pickUnivEcProfileId,
  updateUnivEcProfile,
  type AnyRow,
} from '@/services/exam-papers-delivery'

type Row = AnyRow

const RE_PHONE = /^[6-9]\d{9}$/
const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const RE_AADHAR = /^\d{12}$/
const RE_PAN = /^[A-Za-z]{5}\d{4}[A-Za-z]$/

const schema = z.object({
  titleCatdetId: z.preprocess(
    (val) => {
      const n = Number(val)
      return Number.isFinite(n) && n > 0 ? n : undefined
    },
    requiredNumber('Title is required'),
  ),
  name: z.string().min(1, 'Name is required'),
  phone: z
    .string()
    .min(1, 'Phone number is required')
    .regex(RE_PHONE, 'Enter a valid 10-digit mobile number'),
  alternatePhoneNumber: z
    .string()
    .min(1, 'Alternate phone is required')
    .regex(RE_PHONE, 'Enter a valid 10-digit mobile number'),
  email: z
    .string()
    .min(1, 'Email is required')
    .regex(RE_EMAIL, 'Enter a valid email address'),
  aadharCard: z
    .string()
    .min(1, 'Aadhar is required')
    .regex(RE_AADHAR, 'Enter a valid 12-digit aadhar number'),
  panCard: z
    .string()
    .min(1, 'Pan card number is required')
    .regex(RE_PAN, 'Enter a valid PAN number'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  isActive: z.boolean(),
  reason: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

const FIELD_INPUT =
  'h-9 min-w-0 w-full rounded-lg border border-[#d7dce5] bg-white px-3 text-[13px] font-medium text-foreground shadow-none transition-[border-color,box-shadow] duration-150 placeholder:text-slate-500 placeholder:font-normal focus-visible:border-primary/45 focus-visible:ring-2 focus-visible:ring-primary/12 disabled:bg-muted/40'
const FIELD_DATE = `${FIELD_INPUT} org-modal-date-input pr-10`
const FIELD_LABEL = 'text-[12px] font-semibold leading-tight tracking-wide text-[hsl(218_32%_22%)]'
const FORM_ROW = 'grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-4'

function toDigitsOnly(value: string, maxLength?: number): string {
  const digits = value.replace(/\D/g, '')
  return maxLength != null ? digits.slice(0, maxLength) : digits
}

function Field({
  label,
  required,
  error,
  htmlFor,
  children,
  className,
}: {
  label: string
  required?: boolean
  error?: string
  htmlFor?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={className ?? 'min-w-0 space-y-1.5'}>
      <Label htmlFor={htmlFor} className={FIELD_LABEL}>
        {label}
        {required ? <span className="ml-0.5 text-destructive">*</span> : null}
      </Label>
      {children}
      {error ? <p className="text-xs font-medium text-destructive">{error}</p> : null}
    </div>
  )
}

function txt(v: unknown): string {
  if (typeof v === 'string') return v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  return ''
}

function getByPath(row: Row, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[key]
    return undefined
  }, row)
}

function pickText(row: Row, keys: string[]): string {
  for (const key of keys) {
    const value = key.includes('.') ? getByPath(row, key) : row[key]
    if (value != null && String(value).trim() !== '') return txt(value)
  }
  return ''
}

function pickName(row: Row): string {
  const direct = pickText(row, [
    'scanProfileName',
    'scan_profile_name',
    'name',
    'Name',
    'fullName',
    'profileName',
    'profile_name',
    'evaluatorName',
    'evaluator_name',
    'examEvaluatorProfilesName',
    'exam_evaluator_profiles_name',
    'examEvaluatorProfileName',
    'employeeName',
    'employee.name',
    'employee.firstName',
    'employee.first_name',
    'staffName',
    'staff.name',
    'staff.firstName',
  ])
  if (direct) return direct

  const firstName = pickText(row, ['firstName', 'first_name'])
  const middleName = pickText(row, ['middleName', 'middle_name'])
  const lastName = pickText(row, ['lastName', 'last_name'])
  return [firstName, middleName, lastName].filter(Boolean).join(' ').trim()
}

function rowToFormValues(row: Row | null): FormValues {
  if (!row) {
    return {
      titleCatdetId: undefined as unknown as number,
      name: '',
      phone: '',
      alternatePhoneNumber: '',
      email: '',
      aadharCard: '',
      panCard: '',
      startDate: new Date().toISOString().slice(0, 10),
      endDate: '',
      isActive: true,
      reason: '',
    }
  }
  const titleId = Number(pickText(row, ['titleCatdetId', 'titleId', 'titleCatDetId']) || 0)
  return {
    titleCatdetId: titleId > 0 ? titleId : (undefined as unknown as number),
    name: pickName(row),
    phone: pickText(row, ['phone', 'phoneNumber', 'mobileNo', 'mobileNumber', 'contactNo']),
    alternatePhoneNumber: pickText(row, ['alternatePhoneNumber', 'alternatephoneNumber', 'altPhoneNumber']),
    email: pickText(row, ['email', 'emailId', 'mailId']),
    aadharCard: pickText(row, ['aadharCard', 'aadhaarCard', 'aadharNo', 'aadhaarNo', 'aadhar', 'aadhaarNo']),
    panCard: pickText(row, ['panCard', 'panNo', 'panCardNo', 'pancardNo', 'pan_number', 'pan_card_no']),
    startDate: pickText(row, ['startDate', 'profileValidFromDate', 'createdDt']).slice(0, 10) || new Date().toISOString().slice(0, 10),
    endDate: pickText(row, ['endDate', 'profileValidToDate']).slice(0, 10),
    isActive: row.isActive === true,
    reason: pickText(row, ['reason']),
  }
}

export interface ExamScanProfileModalProps {
  open: boolean
  onClose: () => void
  profile: Row | null
  onSaved: () => void
}

export default function ExamScanProfileModal({ open, onClose, profile, onSaved }: ExamScanProfileModalProps) {
  const isEditing = profile != null
  const [titleOptions, setTitleOptions] = useState<SelectOption[]>([])
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
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: rowToFormValues(null),
  })

  const startDate = watch('startDate')
  const endDate = watch('endDate')

  useEffect(() => {
    if (!open) return
    let mounted = true
    void (async () => {
      try {
        const rows = await getGeneralDetails(GM_CODES.TITLE)
        if (!mounted) return
        setTitleOptions(
          (rows ?? []).map((r) => ({
            value: String(r.generalDetailId ?? ''),
            label: String(r.generalDetailDisplayName ?? r.generalDetailCode ?? r.generalDetailId),
          })),
        )
      } catch {
        if (mounted) setTitleOptions([])
      }
    })()
    return () => {
      mounted = false
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    reset(rowToFormValues(profile))
    setSubmitError(null)
  }, [profile, open, reset])

  useEffect(() => {
    if (startDate && endDate && endDate < startDate) {
      setValue('endDate', startDate)
    }
  }, [startDate, endDate, setValue])

  const onSubmit = async (data: FormValues) => {
    setSubmitError(null)
    const employeeId = Number(globalThis?.localStorage?.getItem('employeeId') ?? 0)
    const nowIso = new Date().toISOString()
    const payload: Record<string, unknown> = {
      titleCatdetId: data.titleCatdetId,
      userId: null,
      scanProfileName: data.name.trim(),
      phoneNumber: data.phone.trim(),
      alternatePhoneNumber: data.alternatePhoneNumber.trim(),
      email: data.email.trim(),
      aadhaarNo: data.aadharCard.trim(),
      panCardNo: data.panCard.trim().toUpperCase(),
      isActive: data.isActive,
      reason: data.reason?.trim() ?? '',
      profileValidFromDate: data.startDate || null,
      profileValidToDate: data.endDate || null,
      createdDt: nowIso,
      updatedDt: nowIso,
      createdUser: employeeId || null,
      updatedUser: employeeId || null,
    }

    try {
      const id = pickUnivEcProfileId(profile ?? {})
      if (id > 0) {
        await updateUnivEcProfile(id, { ...payload, examScanProfileId: id })
        toastSuccess('Exam scan profile updated.')
      } else {
        await createUnivEcProfile(payload)
        toastSuccess('Exam scan profile created.')
      }
      onSaved()
      onClose()
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Save failed')
      toastError(e, 'Save failed')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent closeOnOutsideClick={false} className="w-[calc(100vw-2rem)] overflow-x-hidden sm:max-w-4xl">
        <DialogHeader className="pr-8">
          <DialogTitle className="text-base font-semibold leading-none text-[hsl(var(--primary))]">
            {isEditing ? 'Edit Exam Scan Profile' : 'Create Exam Scan Profile'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className={FORM_ROW}>
            <Field label="Title" required error={errors.titleCatdetId?.message} className="min-w-0 space-y-1.5">
              <Controller
                name="titleCatdetId"
                control={control}
                render={({ field }) => (
                  <Select
                    options={titleOptions}
                    value={field.value > 0 ? String(field.value) : null}
                    onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                    placeholder="Select title"
                    className="h-9 text-[13px]"
                  />
                )}
              />
            </Field>
            <Field label="Name" required error={errors.name?.message} htmlFor="scanProfileName" className="min-w-0 space-y-1.5">
              <Input id="scanProfileName" className={FIELD_INPUT} {...register('name')} placeholder="Full name" />
            </Field>
            <Field label="Email" required error={errors.email?.message} htmlFor="scanProfileEmail" className="min-w-0 space-y-1.5">
              <Input id="scanProfileEmail" type="email" className={FIELD_INPUT} {...register('email')} placeholder="email@example.com" />
            </Field>
            <Field label="Phone Number" required error={errors.phone?.message} htmlFor="scanProfilePhone" className="min-w-0 space-y-1.5">
              <Input
                id="scanProfilePhone"
                className={FIELD_INPUT}
                inputMode="numeric"
                maxLength={10}
                {...register('phone', {
                  onChange: (e) => {
                    e.target.value = toDigitsOnly(e.target.value, 10)
                  },
                })}
                placeholder="10-digit number"
              />
            </Field>
          </div>

          <div className={FORM_ROW}>
            <Field
              label="Alternate Phone"
              required
              error={errors.alternatePhoneNumber?.message}
              htmlFor="scanProfileAltPhone"
              className="min-w-0 space-y-1.5"
            >
              <Input
                id="scanProfileAltPhone"
                className={FIELD_INPUT}
                inputMode="numeric"
                maxLength={10}
                {...register('alternatePhoneNumber', {
                  onChange: (e) => {
                    e.target.value = toDigitsOnly(e.target.value, 10)
                  },
                })}
                placeholder="10-digit number"
              />
            </Field>
            <Field label="Aadhar" required error={errors.aadharCard?.message} htmlFor="scanProfileAadhar" className="min-w-0 space-y-1.5">
              <Input
                id="scanProfileAadhar"
                className={FIELD_INPUT}
                inputMode="numeric"
                maxLength={12}
                {...register('aadharCard', {
                  onChange: (e) => {
                    e.target.value = toDigitsOnly(e.target.value, 12)
                  },
                })}
                placeholder="12-digit aadhar"
              />
            </Field>
            <Field label="Pan Card No." required error={errors.panCard?.message} htmlFor="scanProfilePan" className="min-w-0 space-y-1.5">
              <Input
                id="scanProfilePan"
                className={FIELD_INPUT}
                maxLength={10}
                {...register('panCard', {
                  onChange: (e) => {
                    e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10)
                  },
                })}
                placeholder="ABCDE1234F"
              />
            </Field>
            <Field label="Start Date" required error={errors.startDate?.message} htmlFor="scanProfileStartDate" className="min-w-0 space-y-1.5">
              <Input id="scanProfileStartDate" type="date" className={FIELD_DATE} {...register('startDate')} />
            </Field>
          </div>

          <div className={`${FORM_ROW} lg:grid-cols-12`}>
            <Field label="End Date" required error={errors.endDate?.message} htmlFor="scanProfileEndDate" className="min-w-0 space-y-1.5 lg:col-span-3">
              <Input
                id="scanProfileEndDate"
                type="date"
                className={FIELD_DATE}
                min={startDate || undefined}
                {...register('endDate')}
              />
            </Field>
          </div>

          {isEditing ? (
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
          ) : null}

          {submitError ? (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-600">{submitError}</p>
          ) : null}

          <DialogFooter className="gap-2 border-t border-border/60 pt-3 sm:justify-end">
            <Button type="button" variant="outline" className="h-9 min-w-[5.5rem]" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" className="h-9 min-w-[5.5rem]" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : isEditing ? 'Update' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
