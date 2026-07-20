'use client'

import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm, type Resolver } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronDown, PlusIcon, Trash2Icon } from 'lucide-react'
import { ActiveStatusField } from '@/common/components/forms'
import { FormModal } from '@/common/components/feedback'
import { DatePicker } from '@/common/components/date-picker'
import { Select, type SelectOption } from '@/common/components/select'
import { Table, type TableColumn } from '@/common/components/table'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  EVENTS_FIELD_LABEL_CLASS,
  EVENTS_INPUT_CLASS,
  EVENTS_MODAL_TITLE_CLASS,
  EVENTS_TEXTAREA_CLASS,
} from '../_lib/modal-styles'
import {
  createDepartmentEvent,
  listDepartmentsByCollege,
  searchEmployeesForHr,
  searchStudentsByKeyword,
  updateDepartmentEvent,
  uploadDepartmentEventFiles,
  type DepartmentEventAudienceRow,
  type DepartmentEventResourceRow,
  type DepartmentEventRow,
} from '@/services'
import { toastError, toastInfo, toastSuccess } from '@/lib/toast'
import { getErrorMessage } from '@/lib/errors'
import { cn } from '@/lib/utils'

const FILE_ACCEPT = '.png,.jpg,.jpeg,.pdf,.doc,.docx'

const schema = z
  .object({
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
  .superRefine((values, ctx) => {
    if (values.startDate.getTime() > values.endDate.getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'From date should be less than To date.',
        path: ['endDate'],
      })
    }
  })

type FormValues = z.infer<typeof schema>

type FileSlotKey =
  | 'broucherUrl'
  | 'posterUrl'
  | 'permissionLetter'
  | 'certificate1'
  | 'certificate2'
  | 'billsUrl'
  | 'feedbackUrl'

const FILE_SLOTS: { key: FileSlotKey; label: string; formKey: string }[] = [
  { key: 'broucherUrl', label: 'Broucher', formKey: 'broucherUrl' },
  { key: 'posterUrl', label: 'Poster', formKey: 'posterUrl' },
  { key: 'permissionLetter', label: 'Permission Letter', formKey: 'permissionLetter' },
  { key: 'certificate1', label: 'Certificate 1', formKey: 'certificate1' },
  { key: 'certificate2', label: 'Certificate 2', formKey: 'certificate2' },
  { key: 'billsUrl', label: 'Bills', formKey: 'billsUrl' },
  { key: 'feedbackUrl', label: 'Feedback', formKey: 'feedbackUrl' },
]

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

function pickDeptEventId(saved: DepartmentEventRow | null | undefined, fallback?: number): number {
  const id = Number(saved?.deptEventId ?? fallback ?? 0)
  return Number.isFinite(id) ? id : 0
}

function FileSlot({
  label,
  existingUrl,
  file,
  onChange,
}: Readonly<{
  label: string
  existingUrl?: string | null
  file: File | null
  onChange: (file: File | null) => void
}>) {
  return (
    <div className="space-y-1.5 rounded-md border border-border/70 p-3">
      <p className="text-[12px] font-semibold text-foreground">{label}</p>
      <Input
        type="file"
        accept={FILE_ACCEPT}
        className={cn(EVENTS_INPUT_CLASS, 'cursor-pointer')}
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
      {file ? (
        <p className="truncate text-[11px] text-muted-foreground">{file.name}</p>
      ) : existingUrl ? (
        <a
          href={existingUrl}
          target="_blank"
          rel="noreferrer"
          className="text-[12px] font-medium text-blue-600 hover:underline dark:text-blue-400"
        >
          View File
        </a>
      ) : null}
    </div>
  )
}

export function DepartmentEventModal({
  open,
  onClose,
  row,
  collegeId,
  academicYearId,
  onSaved,
}: Readonly<DepartmentEventModalProps>) {
  const isEditing = row != null && Boolean(row.deptEventId)
  const [departments, setDepartments] = useState<SelectOption[]>([])
  const [files, setFiles] = useState<Partial<Record<FileSlotKey, File | null>>>({})
  const [audiences, setAudiences] = useState<DepartmentEventAudienceRow[]>([])
  const [deletedAudiences, setDeletedAudiences] = useState<DepartmentEventAudienceRow[]>([])
  const [resources, setResources] = useState<DepartmentEventResourceRow[]>([])
  const [deletedResources, setDeletedResources] = useState<DepartmentEventResourceRow[]>([])

  const [audienceKind, setAudienceKind] = useState<'student' | 'employee'>('student')
  const [studentOptions, setStudentOptions] = useState<SelectOption[]>([])
  const [employeeOptions, setEmployeeOptions] = useState<SelectOption[]>([])
  const [studentSearchLoading, setStudentSearchLoading] = useState(false)
  const [employeeSearchLoading, setEmployeeSearchLoading] = useState(false)
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null)
  const [selectedStudentMeta, setSelectedStudentMeta] = useState<{
    name?: string
    roll?: string
  }>({})
  const [selectedEmployeeMeta, setSelectedEmployeeMeta] = useState<{
    name?: string
    number?: string
  }>({})
  const [audienceFee, setAudienceFee] = useState(0)
  const [isCoordinator, setIsCoordinator] = useState(false)

  const [resourceName, setResourceName] = useState('')
  const [resourceInstitute, setResourceInstitute] = useState('')

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

    setFiles({})
    setDeletedAudiences([])
    setDeletedResources([])
    setAudienceKind('student')
    clearAudienceDraft()
    clearResourceDraft()

    const nextAudiences = (row?.departmentEventAudienceDTOs ?? []).map((a) => ({
      ...a,
      isActive: true,
    }))
    const nextResources = (row?.departmentEventResourceDTOS ?? []).map((r) => ({
      ...r,
      isActive: true,
    }))
    setAudiences(nextAudiences)
    setResources(nextResources)

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

  function clearAudienceDraft() {
    setSelectedStudentId(null)
    setSelectedEmployeeId(null)
    setSelectedStudentMeta({})
    setSelectedEmployeeMeta({})
    setAudienceFee(0)
    setIsCoordinator(false)
    setStudentOptions([])
    setEmployeeOptions([])
  }

  function clearResourceDraft() {
    setResourceName('')
    setResourceInstitute('')
  }

  async function onStudentSearch(term: string) {
    const q = term.trim()
    if (q.length < 5) {
      setStudentOptions([])
      return
    }
    setStudentSearchLoading(true)
    try {
      const rows = await searchStudentsByKeyword(q)
      setStudentOptions(
        rows.map((s) => {
          const id = Number(s.studentId ?? s.studentDetailId ?? 0)
          const name = String(s.firstName ?? s.studentName ?? '')
          const roll = s.rollNumber != null ? ` (${s.rollNumber})` : ''
          return { value: String(id), label: `${name}${roll}`.trim() || String(id) }
        }),
      )
    } catch {
      setStudentOptions([])
    } finally {
      setStudentSearchLoading(false)
    }
  }

  async function onEmployeeSearch(term: string) {
    const q = term.trim()
    if (q.length < 4) {
      setEmployeeOptions([])
      return
    }
    setEmployeeSearchLoading(true)
    try {
      const rows = await searchEmployeesForHr(q, collegeId)
      setEmployeeOptions(
        rows.map((e) => {
          const id = Number(e.employeeId ?? e.employeeDetailId ?? 0)
          const name = String(e.firstName ?? e.employeeName ?? '')
          const num = e.empNumber != null ? ` (${e.empNumber})` : ''
          return { value: String(id), label: `${name}${num}`.trim() || String(id) }
        }),
      )
    } catch {
      setEmployeeOptions([])
    } finally {
      setEmployeeSearchLoading(false)
    }
  }

  function onSelectStudent(value: string | null) {
    const id = value ? Number(value) : null
    setSelectedStudentId(id)
    if (!id) {
      setSelectedStudentMeta({})
      return
    }
    const opt = studentOptions.find((o) => o.value === String(id))
    const label = opt?.label ?? ''
    const rollMatch = label.match(/\(([^)]+)\)\s*$/)
    setSelectedStudentMeta({
      name: label.replace(/\s*\([^)]*\)\s*$/, '').trim(),
      roll: rollMatch?.[1],
    })
  }

  function onSelectEmployee(value: string | null) {
    const id = value ? Number(value) : null
    setSelectedEmployeeId(id)
    if (!id) {
      setSelectedEmployeeMeta({})
      return
    }
    const opt = employeeOptions.find((o) => o.value === String(id))
    const label = opt?.label ?? ''
    const numMatch = label.match(/\(([^)]+)\)\s*$/)
    setSelectedEmployeeMeta({
      name: label.replace(/\s*\([^)]*\)\s*$/, '').trim(),
      number: numMatch?.[1],
    })
  }

  function addAudience() {
    if (audienceKind === 'student' && !selectedStudentId) {
      toastInfo('Select a student')
      return
    }
    if (audienceKind === 'employee' && !selectedEmployeeId) {
      toastInfo('Select an employee')
      return
    }
    const coordinator = audienceKind === 'employee' ? true : isCoordinator
    setAudiences((prev) => [
      ...prev,
      {
        studentDetailId: audienceKind === 'student' ? selectedStudentId ?? undefined : undefined,
        studentDetailName: audienceKind === 'student' ? selectedStudentMeta.name : undefined,
        studentDetailRollNumber: audienceKind === 'student' ? selectedStudentMeta.roll : undefined,
        employeeDetailId: audienceKind === 'employee' ? selectedEmployeeId ?? undefined : undefined,
        employeeDetailName: audienceKind === 'employee' ? selectedEmployeeMeta.name : undefined,
        employeeDetailNumber: audienceKind === 'employee' ? selectedEmployeeMeta.number : undefined,
        feeCollected: Number(audienceFee) || 0,
        isCoordinator: coordinator,
        isActive: true,
      },
    ])
    clearAudienceDraft()
  }

  function removeAudience(index: number) {
    setAudiences((prev) => {
      const next = [...prev]
      const [removed] = next.splice(index, 1)
      const pk = removed?.deptEventAudienceId ?? removed?.departmentEventAudienceId
      if (removed && pk) {
        setDeletedAudiences((d) => [...d, { ...removed, isActive: false }])
      }
      return next
    })
  }

  function addResource() {
    const name = resourceName.trim()
    const institute = resourceInstitute.trim()
    if (!name && !institute) {
      toastInfo('Enter resource name or institute')
      return
    }
    setResources((prev) => [...prev, { name, institute, isActive: true, path: null }])
    clearResourceDraft()
  }

  function removeResource(index: number) {
    setResources((prev) => {
      const next = [...prev]
      const [removed] = next.splice(index, 1)
      if (removed?.deptResourceId) {
        setDeletedResources((d) => [...d, { ...removed, isActive: false, path: null }])
      }
      return next
    })
  }

  function setResourceFile(index: number, file: File | null) {
    setResources((prev) =>
      prev.map((r, i) => (i === index ? { ...r, path: file } : r)),
    )
  }

  async function buildAndUploadFiles(
    deptEventId: number,
    savedResources: DepartmentEventResourceRow[] | undefined,
  ) {
    const formData = new FormData()
    formData.append('deptEventId', String(deptEventId))
    let hasFile = false

    for (const slot of FILE_SLOTS) {
      const file = files[slot.key]
      if (file) {
        formData.append(slot.formKey, file, file.name)
        hasFile = true
      }
    }

    const pendingByName = new Map(
      resources
        .filter((r) => r.path instanceof File)
        .map((r) => [String(r.name ?? '').trim().toLowerCase(), r.path as File]),
    )
    for (const saved of savedResources ?? []) {
      const key = String(saved.name ?? '').trim().toLowerCase()
      const file = pendingByName.get(key)
      if (file && saved.deptResourceId) {
        formData.append(String(saved.deptResourceId), file, file.name)
        hasFile = true
      }
    }

    if (!hasFile) return false
    await uploadDepartmentEventFiles(formData)
    return true
  }

  async function onSubmit(values: FormValues) {
    const audiencePayload = [
      ...audiences.map((a) => ({ ...a, isActive: a.isActive !== false })),
      ...deletedAudiences,
    ]
    const resourcePayload = [
      ...resources.map(({ path: _path, ...rest }) => ({ ...rest, isActive: rest.isActive !== false })),
      ...deletedResources.map(({ path: _path, ...rest }) => rest),
    ]

    const payload: DepartmentEventRow = {
      ...row,
      ...values,
      collegeId,
      academicYearId,
      startDate: toIso(values.startDate),
      endDate: toIso(values.endDate),
      reason: values.isActive ? 'active' : (values.reason?.trim() || 'inactive'),
      departmentEventAudienceDTOs: audiencePayload,
      departmentEventResourceDTOS: resourcePayload,
    }

    try {
      const saved = isEditing
        ? await updateDepartmentEvent(payload)
        : await createDepartmentEvent(payload)
      const deptEventId = pickDeptEventId(saved, row?.deptEventId)
      if (deptEventId) {
        const uploaded = await buildAndUploadFiles(deptEventId, saved?.departmentEventResourceDTOS)
        if (uploaded) {
          toastSuccess(isEditing ? 'Department event updated' : 'Department event created')
        } else {
          toastSuccess(isEditing ? 'Department event updated' : 'Department event created')
        }
      } else {
        toastSuccess(isEditing ? 'Department event updated' : 'Department event created')
      }
      onSaved()
      onClose()
    } catch (e) {
      toastError(getErrorMessage(e))
    }
  }

  const audienceColumns = useMemo<TableColumn<DepartmentEventAudienceRow>[]>(
    () => [
      {
        id: 'studentDetailName',
        label: 'Student',
        render: (r) =>
          r.studentDetailName
            ? `${r.studentDetailName}${r.studentDetailRollNumber ? ` (${r.studentDetailRollNumber})` : ''}`
            : '—',
      },
      {
        id: 'employeeDetailName',
        label: 'Employee',
        render: (r) =>
          r.employeeDetailName
            ? `${r.employeeDetailName}${r.employeeDetailNumber ? ` (${r.employeeDetailNumber})` : ''}`
            : '—',
      },
      { id: 'feeCollected', label: 'Fee Collected' },
      {
        id: 'isCoordinator',
        label: 'Coordinator',
        render: (r) => (r.isCoordinator ? 'Yes' : 'No'),
      },
      {
        id: 'actions',
        label: 'Actions',
        type: 'action',
        render: (_r, index) => (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-destructive"
            aria-label="Remove audience"
            onClick={() => removeAudience(index)}
          >
            <Trash2Icon className="h-3.5 w-3.5" />
          </Button>
        ),
      },
    ],
    [],
  )

  const resourceColumns = useMemo<TableColumn<DepartmentEventResourceRow>[]>(
    () => [
      { id: 'name', label: 'Name' },
      { id: 'institute', label: 'Institute' },
      {
        id: 'file',
        label: 'File',
        render: (r, index) => (
          <div className="space-y-1 py-1">
            {!r.profileUrl ? (
              <Input
                type="file"
                accept={FILE_ACCEPT}
                className={cn(EVENTS_INPUT_CLASS, 'h-8 cursor-pointer text-[11px]')}
                onChange={(e) => setResourceFile(index, e.target.files?.[0] ?? null)}
              />
            ) : null}
            {r.path instanceof File ? (
              <p className="truncate text-[11px] text-muted-foreground">{r.path.name}</p>
            ) : null}
            {r.profileUrl ? (
              <a
                href={r.profileUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[12px] font-medium text-blue-600 hover:underline dark:text-blue-400"
              >
                View File
              </a>
            ) : null}
          </div>
        ),
      },
      {
        id: 'actions',
        label: 'Actions',
        type: 'action',
        render: (_r, index) => (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-destructive"
            aria-label="Remove resource"
            onClick={() => removeResource(index)}
          >
            <Trash2Icon className="h-3.5 w-3.5" />
          </Button>
        ),
      },
    ],
    [],
  )

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Edit Event' : 'Add Event'}
      titleClassName={EVENTS_MODAL_TITLE_CLASS}
      showHeaderDivider
      onSubmit={(e) => {
        e.preventDefault()
        void handleSubmit(onSubmit)()
      }}
      submitLabel="Save"
      cancelLabel="Close"
      isSubmitting={isSubmitting}
      size="xl"
    >
      <div className="space-y-4">
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
              Event *
            </Label>
            <Input id="deptEventName" className={EVENTS_INPUT_CLASS} {...register('deptEventName')} />
            {errors.deptEventName ? (
              <p className="text-xs text-destructive">{errors.deptEventName.message}</p>
            ) : null}
          </div>
          <Controller
            name="startDate"
            control={control}
            render={({ field }) => (
              <DatePicker
                label="Start Date *"
                value={field.value}
                onChange={(d) => {
                  field.onChange(d ?? new Date())
                  const end = watch('endDate')
                  if (d && end && d.getTime() > end.getTime()) {
                    setValue('endDate', d)
                    toastInfo('From date should be less than To date.')
                  }
                }}
                clearable={false}
              />
            )}
          />
          <Controller
            name="endDate"
            control={control}
            render={({ field }) => (
              <DatePicker
                label="End Date *"
                value={field.value}
                onChange={(d) => {
                  const start = watch('startDate')
                  if (d && start && start.getTime() > d.getTime()) {
                    setValue('endDate', start)
                    toastInfo('From date should be less than To date.')
                    return
                  }
                  field.onChange(d ?? new Date())
                }}
                clearable={false}
              />
            )}
          />
          {errors.endDate ? (
            <p className="text-xs text-destructive sm:col-span-2">{errors.endDate.message}</p>
          ) : null}
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="venue" className={EVENTS_FIELD_LABEL_CLASS}>
              Venue
            </Label>
            <Input id="venue" className={EVENTS_INPUT_CLASS} {...register('venue')} />
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
              Total Fee Collected
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

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {FILE_SLOTS.map((slot) => (
            <FileSlot
              key={slot.key}
              label={slot.label}
              existingUrl={row?.[slot.key]}
              file={files[slot.key] ?? null}
              onChange={(file) => setFiles((prev) => ({ ...prev, [slot.key]: file }))}
            />
          ))}
        </div>

        <Collapsible defaultOpen className="rounded-md border border-border">
          <CollapsibleTrigger className="flex w-full items-center justify-between px-3 py-2 text-left text-[13px] font-semibold">
            <span className="inline-flex items-center gap-1.5">
              <PlusIcon className="h-3.5 w-3.5" />
              Add Event Audience
            </span>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 border-t border-border px-3 py-3">
            <RadioGroup
              value={audienceKind}
              onValueChange={(v) => {
                setAudienceKind(v as 'student' | 'employee')
                clearAudienceDraft()
              }}
              className="flex flex-wrap gap-4"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="student" id="dept-aud-student" />
                <Label htmlFor="dept-aud-student">Student</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="employee" id="dept-aud-employee" />
                <Label htmlFor="dept-aud-employee">Employee</Label>
              </div>
            </RadioGroup>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-12 items-end">
              <div className="md:col-span-7">
                {audienceKind === 'student' ? (
                  <Select
                    label="Student"
                    value={selectedStudentId ? String(selectedStudentId) : null}
                    onChange={onSelectStudent}
                    options={studentOptions}
                    searchable
                    onSearch={(t) => void onStudentSearch(t)}
                    isLoading={studentSearchLoading}
                    placeholder="Search by student name or rollNo."
                  />
                ) : (
                  <Select
                    label="Employee"
                    value={selectedEmployeeId ? String(selectedEmployeeId) : null}
                    onChange={onSelectEmployee}
                    options={employeeOptions}
                    searchable
                    onSearch={(t) => void onEmployeeSearch(t)}
                    isLoading={employeeSearchLoading}
                    placeholder="Search by Emp name or number."
                  />
                )}
              </div>
              <div className="space-y-1 md:col-span-3">
                <Label htmlFor="audienceFee" className={EVENTS_FIELD_LABEL_CLASS}>
                  Fee Collected
                </Label>
                <Input
                  id="audienceFee"
                  type="number"
                  className={EVENTS_INPUT_CLASS}
                  value={audienceFee}
                  onChange={(e) => setAudienceFee(Number(e.target.value) || 0)}
                />
              </div>
              {audienceKind === 'student' ? (
                <div className="flex items-center gap-2 md:col-span-2 pb-2">
                  <Checkbox
                    id="isCoordinator"
                    checked={isCoordinator}
                    onCheckedChange={(v) => setIsCoordinator(v === true)}
                  />
                  <Label htmlFor="isCoordinator">Coordinator</Label>
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={clearAudienceDraft}>
                Clear
              </Button>
              <Button type="button" size="sm" onClick={addAudience}>
                Add
              </Button>
            </div>

            {audiences.length > 0 ? (
              <Table rows={audiences} columns={audienceColumns} emptyText="No audiences" />
            ) : null}
          </CollapsibleContent>
        </Collapsible>

        <Collapsible defaultOpen className="rounded-md border border-border">
          <CollapsibleTrigger className="flex w-full items-center justify-between px-3 py-2 text-left text-[13px] font-semibold">
            <span className="inline-flex items-center gap-1.5">
              <PlusIcon className="h-3.5 w-3.5" />
              Add Event Resource
            </span>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 border-t border-border px-3 py-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="resourceName" className={EVENTS_FIELD_LABEL_CLASS}>
                  Name
                </Label>
                <Input
                  id="resourceName"
                  className={EVENTS_INPUT_CLASS}
                  value={resourceName}
                  onChange={(e) => setResourceName(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="resourceInstitute" className={EVENTS_FIELD_LABEL_CLASS}>
                  Institute
                </Label>
                <Input
                  id="resourceInstitute"
                  className={EVENTS_INPUT_CLASS}
                  value={resourceInstitute}
                  onChange={(e) => setResourceInstitute(e.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={clearResourceDraft}>
                Clear
              </Button>
              <Button type="button" size="sm" onClick={addResource}>
                Add
              </Button>
            </div>
            {resources.length > 0 ? (
              <Table rows={resources} columns={resourceColumns} emptyText="No resources" />
            ) : null}
          </CollapsibleContent>
        </Collapsible>
      </div>
    </FormModal>
  )
}
