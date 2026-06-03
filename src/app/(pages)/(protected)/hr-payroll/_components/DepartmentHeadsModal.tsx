'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { ActiveStatusField } from '@/common/components/forms'
import { FormModal } from '@/common/components/feedback'
import { DatePicker } from '@/common/components/date-picker'
import { Select, type SelectOption } from '@/common/components/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  createDepartmentHead,
  listActiveCollegesForGeneralSettings,
  listActiveRoomTypes,
  listCourseGroupsByCourse,
  listDepartmentsByCollege,
  listRoomsByRoomType,
  listCoursesByUniversity,
  searchEmployeesForHr,
} from '@/services'
import { toastError, toastSuccess } from '@/lib/toast'

const optionalId = z.preprocess(
  (value) => {
    if (value === '' || value === null || value === undefined) return undefined
    const n = Number(value)
    return Number.isNaN(n) ? undefined : n
  },
  z.number().optional(),
)

const schema = z.object({
  collegeId: z.number().min(1, 'College is required'),
  employeeId: z.number().min(1, 'Employee is required'),
  departmentId: z.number().min(1, 'Department is required'),
  courseId: optionalId,
  courseGroupId: optionalId,
  roomTypeId: optionalId,
  roomId: optionalId,
  fromDate: z.date({ required_error: 'From date is required' }),
  toDate: z.date({ required_error: 'To date is required' }),
  comments: z.string().optional(),
  isActive: z.boolean(),
  reason: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

type DeptHeadRow = Record<string, unknown>

function employeeLabel(row: Record<string, unknown>): string {
  const name = String(row.firstName ?? row.employeeName ?? '')
  const num = row.empNumber != null ? ` (${String(row.empNumber)})` : ''
  return `${name}${num}`.trim() || String(row.employeeId ?? '')
}

function orgIdFromStorage(): number {
  if (typeof globalThis.window === 'undefined') return 0
  return Number(globalThis.localStorage.getItem('organizationId') ?? 0)
}

interface DepartmentHeadsModalProps {
  open: boolean
  onClose: () => void
  existingRows: DeptHeadRow[]
  onSaved: () => void
}

export function DepartmentHeadsModal({
  open,
  onClose,
  existingRows,
  onSaved,
}: Readonly<DepartmentHeadsModalProps>) {
  const [colleges, setColleges] = useState<SelectOption[]>([])
  const [courses, setCourses] = useState<SelectOption[]>([])
  const [courseGroups, setCourseGroups] = useState<SelectOption[]>([])
  const [departments, setDepartments] = useState<SelectOption[]>([])
  const [roomTypes, setRoomTypes] = useState<SelectOption[]>([])
  const [rooms, setRooms] = useState<SelectOption[]>([])
  const [employeeOptions, setEmployeeOptions] = useState<SelectOption[]>([])
  const [employeeRows, setEmployeeRows] = useState<Record<string, unknown>[]>([])
  const [employeeSearchLoading, setEmployeeSearchLoading] = useState(false)
  const [universityId, setUniversityId] = useState(0)

  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      collegeId: undefined,
      employeeId: undefined,
      departmentId: undefined,
      courseId: undefined,
      courseGroupId: undefined,
      roomTypeId: undefined,
      roomId: undefined,
      fromDate: new Date(),
      toDate: new Date(),
      comments: '',
      isActive: true,
      reason: 'active',
    },
  })

  const collegeId = watch('collegeId')
  const courseId = watch('courseId')
  const roomTypeId = watch('roomTypeId')
  const fromDate = watch('fromDate')
  const isActive = watch('isActive')

  useEffect(() => {
    if (!open) return
    void (async () => {
      const orgId = orgIdFromStorage()
      const all = await listActiveCollegesForGeneralSettings()
      const filtered = orgId
        ? all.filter((c) => Number(c.organizationId) === orgId)
        : all
      setColleges(
        filtered.map((c) => ({
          value: String(c.collegeId),
          label: c.collegeCode ?? c.collegeName ?? String(c.collegeId),
        })),
      )
      const rt = await listActiveRoomTypes()
      setRoomTypes(
        rt.map((r) => ({
          value: String(r.roomTypeId),
          label: r.roomType ?? String(r.roomTypeId),
        })),
      )
    })()
    reset({
      collegeId: undefined,
      employeeId: undefined,
      departmentId: undefined,
      courseId: undefined,
      courseGroupId: undefined,
      roomTypeId: undefined,
      roomId: undefined,
      fromDate: new Date(),
      toDate: new Date(),
      comments: '',
      isActive: true,
      reason: 'active',
    })
    setCourses([])
    setCourseGroups([])
    setDepartments([])
    setRooms([])
    setEmployeeOptions([])
    setEmployeeRows([])
    setUniversityId(0)
  }, [open, reset])

  useEffect(() => {
    if (!collegeId) return
    const college = colleges.find((c) => c.value === String(collegeId))
    void (async () => {
      const allColleges = await listActiveCollegesForGeneralSettings()
      const match = allColleges.find((c) => c.collegeId === collegeId)
      const univId = Number(match?.universityId ?? 0)
      setUniversityId(univId)
      setValue('courseId', undefined)
      setValue('courseGroupId', undefined)
      setValue('departmentId', undefined)
      setValue('employeeId', undefined)
      setEmployeeOptions([])
      setEmployeeRows([])
      if (univId) {
        const courseList = await listCoursesByUniversity(univId)
        setCourses(
          courseList.map((c) => ({
            value: String(c.courseId),
            label: String(c.courseCode ?? c.courseName ?? c.courseId),
          })),
        )
      } else {
        setCourses([])
      }
      const deptList = await listDepartmentsByCollege(collegeId)
      setDepartments(
        deptList.map((d) => ({
          value: String(d.departmentId),
          label: d.deptCode ?? d.deptName ?? String(d.departmentId),
        })),
      )
    })()
  }, [collegeId, colleges, setValue])

  useEffect(() => {
    if (!courseId) {
      setCourseGroups([])
      return
    }
    void listCourseGroupsByCourse(courseId).then((rows) => {
      setCourseGroups(
        rows.map((g) => ({
          value: String(g.courseGroupId),
          label: String(g.groupCode ?? g.courseGroupId),
        })),
      )
    })
  }, [courseId])

  useEffect(() => {
    if (!roomTypeId) {
      setRooms([])
      setValue('roomId', undefined)
      return
    }
    void listRoomsByRoomType(roomTypeId).then((rows) => {
      setRooms(
        rows.map((r) => ({
          value: String(r.roomId),
          label: String(r.roomName ?? r.roomId),
        })),
      )
    })
  }, [roomTypeId, setValue])

  useEffect(() => {
    if (fromDate && watch('toDate') && fromDate > watch('toDate')) {
      setValue('toDate', fromDate)
    }
  }, [fromDate, setValue, watch])

  const onEmployeeSearch = useCallback(async (term: string) => {
    const q = term.trim()
    if (q.length < 4) {
      setEmployeeRows([])
      setEmployeeOptions([])
      return
    }
    setEmployeeSearchLoading(true)
    try {
      const list = await searchEmployeesForHr(q)
      setEmployeeRows(list)
      setEmployeeOptions(
        list.map((e) => ({
          value: String(e.employeeId),
          label: employeeLabel(e),
        })),
      )
    } catch (e) {
      toastError(e, 'Employee search failed')
      setEmployeeRows([])
      setEmployeeOptions([])
    } finally {
      setEmployeeSearchLoading(false)
    }
  }, [])

  const employeeId = watch('employeeId')
  const employeeSelectOptions = useMemo(() => {
    if (!employeeId) return employeeOptions
    const id = String(employeeId)
    if (employeeOptions.some((o) => o.value === id)) return employeeOptions
    const row = employeeRows.find((e) => String(e.employeeId) === id)
    if (!row) return employeeOptions
    return [{ value: id, label: employeeLabel(row) }, ...employeeOptions]
  }, [employeeId, employeeOptions, employeeRows])

  async function onSubmit(data: FormValues) {
    const duplicate = existingRows.some(
      (r) =>
        Number(r.departmentId) === data.departmentId &&
        r.isActive === true &&
        data.isActive === true,
    )
    if (duplicate) {
      toastError(new Error('Already allocated department head for this department.'))
      return
    }

    const payload: Record<string, unknown> = {
      collegeId: data.collegeId,
      employeeId: data.employeeId,
      departmentId: data.departmentId,
      courseId: data.courseId,
      courseGroupId: data.courseGroupId,
      roomTypeId: data.roomTypeId,
      roomId: data.roomId,
      fromDate: format(data.fromDate, "yyyy-MM-dd'T'00:00:00"),
      toDate: format(data.toDate, "yyyy-MM-dd'T'00:00:00"),
      comments: data.comments?.trim() || undefined,
      isActive: data.isActive,
      reason: data.isActive ? 'active' : (data.reason?.trim() || 'inactive'),
    }

    try {
      await createDepartmentHead(payload)
      toastSuccess('Department head created')
      onSaved()
      onClose()
    } catch (err) {
      toastError(err, 'Failed to create department head')
    }
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title="Add Department Head"
      titleClassName="text-[15px] font-semibold leading-none text-[#5da394]"
      showHeaderDivider
      size="xl"
      onSubmit={(e) => {
        e.preventDefault()
        void handleSubmit(onSubmit, () => {
          toastError(new Error('Please fill in all required fields'))
        })()
      }}
      isSubmitting={isSubmitting}
      submitLabel="Save"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Controller
          name="collegeId"
          control={control}
          render={({ field }) => (
            <Select
              label="College"
              required
              value={field.value ? String(field.value) : null}
              onChange={(v) => field.onChange(v ? Number(v) : undefined)}
              options={colleges}
              placeholder="Select college"
              searchable
              error={errors.collegeId?.message}
            />
          )}
        />
        <div className="sm:col-span-2">
          <Controller
            name="employeeId"
            control={control}
            render={({ field }) => (
              <Select
                label="Employee"
                required
                value={field.value ? String(field.value) : null}
                onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                options={employeeSelectOptions}
                placeholder="Search by name or employee id (min 4 chars)"
                searchable
                onSearch={onEmployeeSearch}
                isLoading={employeeSearchLoading}
                disabled={!collegeId}
                error={errors.employeeId?.message}
              />
            )}
          />
        </div>
        <Controller
          name="courseId"
          control={control}
          render={({ field }) => (
            <Select
              label="Course"
              value={field.value ? String(field.value) : null}
              onChange={(v) => {
                field.onChange(v ? Number(v) : undefined)
                setValue('courseGroupId', undefined)
              }}
              options={courses}
              placeholder="Select course"
              searchable
              clearable
              disabled={!universityId}
            />
          )}
        />
        <Controller
          name="courseGroupId"
          control={control}
          render={({ field }) => (
            <Select
              label="Course Group"
              value={field.value ? String(field.value) : null}
              onChange={(v) => field.onChange(v ? Number(v) : undefined)}
              options={courseGroups}
              placeholder="Select group"
              searchable
              clearable
              disabled={!courseId}
            />
          )}
        />
        <Controller
          name="departmentId"
          control={control}
          render={({ field }) => (
            <Select
              label="Department"
              required
              value={field.value ? String(field.value) : null}
              onChange={(v) => field.onChange(v ? Number(v) : undefined)}
              options={departments}
              placeholder="Select department"
              searchable
              disabled={!collegeId}
              error={errors.departmentId?.message}
            />
          )}
        />
        <Controller
          name="roomTypeId"
          control={control}
          render={({ field }) => (
            <Select
              label="Room Type"
              value={field.value ? String(field.value) : null}
              onChange={(v) => {
                field.onChange(v ? Number(v) : undefined)
                setValue('roomId', undefined)
              }}
              options={roomTypes}
              placeholder="Select room type"
              searchable
              clearable
              disabled={!collegeId}
            />
          )}
        />
        <Controller
          name="roomId"
          control={control}
          render={({ field }) => (
            <Select
              label="Room"
              value={field.value ? String(field.value) : null}
              onChange={(v) => field.onChange(v ? Number(v) : undefined)}
              options={rooms}
              placeholder="Select room"
              searchable
              clearable
              disabled={!roomTypeId}
            />
          )}
        />
        <Controller
          name="fromDate"
          control={control}
          render={({ field }) => (
            <DatePicker
              label="From Date"
              required
              value={field.value}
              onChange={field.onChange}
              error={errors.fromDate?.message}
            />
          )}
        />
        <Controller
          name="toDate"
          control={control}
          render={({ field }) => (
            <DatePicker
              label="To Date"
              required
              value={field.value}
              onChange={field.onChange}
              minDate={fromDate ?? undefined}
              error={errors.toDate?.message}
            />
          )}
        />
        <div className="space-y-1 sm:col-span-3">
          <Label className="text-[12px]">Comments</Label>
          <Input className="h-9 text-[12px]" {...register('comments')} />
        </div>
        <div className="sm:col-span-3">
          <Controller
            name="isActive"
            control={control}
            render={({ field }) => (
              <ActiveStatusField
                isActive={field.value}
                reason={watch('reason') ?? ''}
                onActiveChange={field.onChange}
                onReasonChange={(v) => setValue('reason', String(v))}
                reasonError={!isActive ? errors.reason?.message : undefined}
              />
            )}
          />
        </div>
      </div>
    </FormModal>
  )
}
