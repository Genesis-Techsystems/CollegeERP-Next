'use client'

import { useCallback, useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { ActiveStatusField } from '@/common/components/forms'
import { FormModal } from '@/common/components/feedback'
import { Select, type SelectOption } from '@/common/components/select'
import { DatePicker } from '@/common/components/date-picker'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  createScholarshipApplication,
  searchStudentsForScholarship,
  updateScholarshipApplication,
} from '@/services'
import type { ScholarshipApplication } from '@/types/scholarship'
import { SCHOLARSHIP_STATUS_OPTIONS } from '@/types/scholarship'
import { toastError, toastSuccess } from '@/lib/toast'

const schema = z.object({
  collegeId: z.number().min(1),
  academicYearId: z.number().min(1),
  studentId: z.number().min(1, 'Student is required'),
  schApplicationNo: z.string().min(1, 'Application number is required'),
  scholarshipAmount: z.number().min(0),
  totalAmountReceived: z.number().optional(),
  clgApprovalStatusAr: z.string().optional(),
  appliedOn: z.string().optional(),
  isSubmittedToGovt: z.boolean().optional(),
  isAllDocsCollected: z.boolean().optional(),
  isRenewaled: z.boolean().optional(),
  isCompleted: z.boolean().optional(),
  isActive: z.boolean(),
  reason: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

function studentOptionLabel(row: {
  studentId?: number
  rollNumber?: string
  firstName?: string
}): string {
  const label = `${row.rollNumber ?? ''} — ${row.firstName ?? ''}`.trim()
  return label || String(row.studentId ?? '')
}

interface ApplicationModalProps {
  open: boolean
  onClose: () => void
  application: ScholarshipApplication | null
  defaultCollegeId: number | null
  defaultAcademicYearId: number | null
  onSaved: () => void
}

export function ApplicationModal({
  open,
  onClose,
  application,
  defaultCollegeId,
  defaultAcademicYearId,
  onSaved,
}: Readonly<ApplicationModalProps>) {
  const isEditing = application != null
  const [studentOptions, setStudentOptions] = useState<SelectOption[]>([])
  const [studentsLoading, setStudentsLoading] = useState(false)

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
      collegeId: defaultCollegeId ?? undefined,
      academicYearId: defaultAcademicYearId ?? undefined,
      studentId: undefined,
      schApplicationNo: '',
      scholarshipAmount: 0,
      totalAmountReceived: 0,
      clgApprovalStatusAr: 'L',
      isSubmittedToGovt: false,
      isAllDocsCollected: false,
      isRenewaled: false,
      isCompleted: false,
      isActive: true,
      reason: 'active',
    },
  })

  const collegeId = watch('collegeId')

  useEffect(() => {
    if (!open) return
    if (application) {
      setStudentOptions([
        {
          value: String(application.studentId),
          label: studentOptionLabel(application),
        },
      ])
    } else {
      setStudentOptions([])
    }
    reset(
      application
        ? {
            collegeId: application.collegeId,
            academicYearId: application.academicYearId,
            studentId: application.studentId,
            schApplicationNo: application.schApplicationNo ?? '',
            scholarshipAmount: application.scholarshipAmount ?? 0,
            totalAmountReceived: application.totalAmountReceived ?? 0,
            clgApprovalStatusAr: application.clgApprovalStatusAr ?? 'L',
            appliedOn: application.appliedOn,
            isActive: application.isActive,
            reason: application.reason ?? 'active',
          }
        : {
            collegeId: defaultCollegeId ?? undefined,
            academicYearId: defaultAcademicYearId ?? undefined,
            studentId: undefined,
            schApplicationNo: '',
            scholarshipAmount: 0,
            totalAmountReceived: 0,
            clgApprovalStatusAr: 'L',
            isSubmittedToGovt: false,
            isAllDocsCollected: false,
            isRenewaled: false,
            isCompleted: false,
            isActive: true,
            reason: 'active',
          },
    )
  }, [open, application, defaultCollegeId, defaultAcademicYearId, reset])

  const handleStudentSearch = useCallback(
    (term: string) => {
      if (!collegeId || term.trim().length < 4) {
        setStudentOptions([])
        setStudentsLoading(false)
        return
      }
      setStudentsLoading(true)
      void searchStudentsForScholarship(term, collegeId)
        .then((rows) => {
          setStudentOptions(
            rows.map((s) => ({
              value: String(s.studentId),
              label: studentOptionLabel(s),
            })),
          )
        })
        .catch(() => setStudentOptions([]))
        .finally(() => setStudentsLoading(false))
    },
    [collegeId],
  )

  async function onSubmit(data: FormValues) {
    const payload = {
      ...data,
      reason: data.isActive ? 'active' : (data.reason?.trim() || 'inactive'),
    }
    try {
      if (isEditing && application) {
        await updateScholarshipApplication(application.schStdApplicationId, payload)
        toastSuccess('Application updated')
      } else {
        await createScholarshipApplication(payload)
        toastSuccess('Application created')
      }
      onSaved()
      onClose()
    } catch (err) {
      toastError(err, 'Failed to save application')
    }
  }

  const statusOptions = SCHOLARSHIP_STATUS_OPTIONS.map((s) => ({
    value: s.value,
    label: s.label,
  }))

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Edit Scholarship Application' : 'Add Scholarship Application'}
      titleClassName="text-[15px] font-semibold leading-none text-[#5da394]"
      onSubmit={(e) => {
        e.preventDefault()
        void handleSubmit(onSubmit)()
      }}
      isSubmitting={isSubmitting}
      submitLabel={isEditing ? 'Update' : 'Save'}
      size="xl"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Controller
            name="studentId"
            control={control}
            render={({ field }) => (
              <Select
                label="Student"
                required
                searchable
                clearable
                value={field.value ? String(field.value) : null}
                onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                options={studentOptions}
                placeholder="Search by roll no or name (min 4 characters)"
                onSearch={handleStudentSearch}
                isLoading={studentsLoading}
                disabled={!collegeId}
                error={errors.studentId?.message}
              />
            )}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[12px]">Application No *</Label>
          <Input className="h-9 text-[12px]" {...register('schApplicationNo')} />
          {errors.schApplicationNo && (
            <p className="text-xs text-red-500">{errors.schApplicationNo.message}</p>
          )}
        </div>
        <Controller
          name="clgApprovalStatusAr"
          control={control}
          render={({ field }) => (
            <Select
              label="Status"
              value={field.value ?? null}
              onChange={field.onChange}
              options={statusOptions}
              placeholder="Select status"
            />
          )}
        />
        <div className="space-y-1">
          <Label className="text-[12px]">Scholarship Amount *</Label>
          <Input type="number" className="h-9 text-[12px]" {...register('scholarshipAmount')} />
        </div>
        <div className="space-y-1">
          <Label className="text-[12px]">Amount Received</Label>
          <Input type="number" className="h-9 text-[12px]" {...register('totalAmountReceived')} />
        </div>
        <Controller
          name="appliedOn"
          control={control}
          render={({ field }) => (
            <DatePicker
              label="Applied On"
              value={field.value ? new Date(field.value) : null}
              onChange={(d) => field.onChange(d?.toISOString().slice(0, 10))}
            />
          )}
        />
        <div className="flex flex-wrap gap-4 sm:col-span-2">
          {(['isSubmittedToGovt', 'isAllDocsCollected', 'isRenewaled', 'isCompleted'] as const).map((name) => (
            <Controller
              key={name}
              name={name}
              control={control}
              render={({ field }) => (
                <label className="flex items-center gap-2 text-[12px]">
                  <Checkbox checked={!!field.value} onCheckedChange={(v) => field.onChange(!!v)} />
                  {name.replace(/^is/, '').replace(/([A-Z])/g, ' $1').trim()}
                </label>
              )}
            />
          ))}
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
              />
            )}
          />
        </div>
      </div>
    </FormModal>
  )
}