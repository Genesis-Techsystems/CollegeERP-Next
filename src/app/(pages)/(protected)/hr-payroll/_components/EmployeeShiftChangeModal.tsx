'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { PencilIcon, Trash2Icon } from 'lucide-react'
import { FormModal } from '@/common/components/feedback'
import { StatusBadge } from '@/common/components/data-display'
import { DatePicker } from '@/common/components/date-picker'
import { Select, type SelectOption } from '@/common/components/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  getEmployeeByIdForHr,
  listEmployeeShiftsByEmployee,
  listShiftsForHr,
  saveEmployeeShifts,
} from '@/services'
import { toastError, toastSuccess } from '@/lib/toast'
import { toast } from 'sonner'

const schema = z
  .object({
    shiftId: z.number().min(1, 'Shift is required'),
    fromDate: z.date({ required_error: 'From date is required' }),
    toDate: z.date({ required_error: 'To date is required' }),
    isActive: z.boolean(),
  })
  .refine((d) => d.toDate >= d.fromDate, {
    message: 'To date must be on or after from date',
    path: ['toDate'],
  })

type FormValues = z.infer<typeof schema>
type BioRow = Record<string, unknown>
type ShiftRow = Record<string, unknown>

function formatShiftTime(value: unknown): string {
  if (value == null || value === '') return ''
  const raw = String(value)
  const match = raw.match(/^([01]\d|2[0-3]):([0-5]\d)/)
  if (!match) return raw
  let hours = Number(match[1])
  const minutes = match[2]
  const suffix = hours < 12 ? 'AM' : 'PM'
  hours = hours % 12 || 12
  return `${hours}:${minutes} ${suffix}`
}

function formatYmd(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

function isShiftEditable(row: ShiftRow): boolean {
  if (row.empShiftId == null) return true
  const to = row.toDate ? new Date(String(row.toDate)) : null
  if (!to || Number.isNaN(to.getTime())) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  to.setHours(0, 0, 0, 0)
  return today.getTime() < to.getTime()
}

interface EmployeeShiftChangeModalProps {
  open: boolean
  onClose: (refreshed?: boolean) => void
  row: BioRow | null
}

export function EmployeeShiftChangeModal({
  open,
  onClose,
  row,
}: Readonly<EmployeeShiftChangeModalProps>) {
  const [shifts, setShifts] = useState<SelectOption[]>([])
  const [shiftRows, setShiftRows] = useState<ShiftRow[]>([])
  const [employeeShifts, setEmployeeShifts] = useState<ShiftRow[]>([])
  const [employee, setEmployee] = useState<Record<string, unknown> | null>(null)
  const [editingShift, setEditingShift] = useState<ShiftRow | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      shiftId: undefined as unknown as number,
      fromDate: new Date(),
      toDate: new Date(),
      isActive: true,
    },
  })

  const fromDate = watch('fromDate')

  const loadEmployeeShifts = useCallback(async (employeeId: number) => {
    const list = await listEmployeeShiftsByEmployee(employeeId)
    setEmployeeShifts(
      list.map((r) => ({
        ...r,
        flag: isShiftEditable(r),
      })),
    )
  }, [])

  useEffect(() => {
    if (!open || !row?.empId) return
    const employeeId = Number(row.empId)
    void (async () => {
      setLoading(true)
      try {
        const [shiftList, emp] = await Promise.all([
          listShiftsForHr(),
          getEmployeeByIdForHr(employeeId),
        ])
        setShiftRows(shiftList)
        setShifts(
          shiftList.map((s) => ({
            value: String(s.shiftId),
            label: `${String(s.shiftName ?? '')} (${formatShiftTime(s.beginTime)} - ${formatShiftTime(s.endTime)})`,
          })),
        )
        setEmployee(emp)
        await loadEmployeeShifts(employeeId)
        clearForm()
      } catch (e) {
        toastError(e, 'Failed to load shift data')
      } finally {
        setLoading(false)
      }
    })()
  }, [open, row, loadEmployeeShifts])

  function clearForm() {
    setEditingShift(null)
    reset({
      shiftId: undefined as unknown as number,
      fromDate: new Date(),
      toDate: new Date(),
      isActive: true,
    })
  }

  function onFromDateChange(date: Date | undefined) {
    if (!date) return
    setValue('fromDate', date)
    const to = watch('toDate')
    if (to && date > to) {
      toast.info('From date should be less than to date.')
      setValue('toDate', date)
    }
  }

  async function persistShifts(rows: ShiftRow[]) {
    setSaving(true)
    try {
      await saveEmployeeShifts(rows)
      toastSuccess('Employee shifts saved')
      if (row?.empId) await loadEmployeeShifts(Number(row.empId))
      clearForm()
    } catch (e) {
      toastError(e, 'Failed to save shifts')
    } finally {
      setSaving(false)
    }
  }

  async function onAddOrUpdate(data: FormValues) {
    if (!row?.empId || !employee) return
    const shift = shiftRows.find((s) => Number(s.shiftId) === data.shiftId)
    if (!shift) return

    const payload: ShiftRow = {
      shiftId: data.shiftId,
      shiftName: shift.shiftName,
      beginTime: shift.beginTime,
      endTime: shift.endTime,
      fromDate: formatYmd(data.fromDate),
      toDate: formatYmd(data.toDate),
      collegeId: employee.collegeId,
      isActive: data.isActive,
      employeeId: Number(row.empId),
    }

    if (editingShift?.empShiftId != null) {
      await persistShifts([
        {
          ...editingShift,
          ...payload,
        },
      ])
      return
    }

    await persistShifts([payload])
  }

  function startEdit(shift: ShiftRow) {
    setEditingShift(shift)
    reset({
      shiftId: Number(shift.shiftId),
      fromDate: shift.fromDate ? new Date(String(shift.fromDate)) : new Date(),
      toDate: shift.toDate ? new Date(String(shift.toDate)) : new Date(),
      isActive: shift.isActive !== false,
    })
  }

  function removeLocal(index: number) {
    setEmployeeShifts((prev) => prev.filter((_, i) => i !== index))
  }

  const dialogTitle = useMemo(
    () => (editingShift ? 'Update' : 'Save'),
    [editingShift],
  )

  if (!row) return null

  return (
    <FormModal
      open={open}
      onClose={() => onClose(false)}
      title="Employee Shift Change"
      titleClassName="text-[15px] font-semibold leading-none text-[#5da394]"
      onSubmit={(e) => {
        e.preventDefault()
        onClose(true)
      }}
      submitLabel="Done"
      isSubmitting={saving}
      size="xl"
      cancelLabel="Close"
    >
      <div className="flex flex-col gap-3 text-[12px]">
        {employee ? (
          <div className="rounded border border-border/60 bg-muted/30 px-3 py-2 space-y-0.5">
            <p className="font-medium text-foreground">
              {String(employee.firstName ?? '')}
              {employee.empNumber != null ? ` (${String(employee.empNumber)})` : ''}
            </p>
            {employee.empDeptName ? <p>{String(employee.empDeptName)}</p> : null}
            {employee.mobile ? <p>{String(employee.mobile)}</p> : null}
            <p>
              <span className="text-muted-foreground">Biometric EMP: </span>
              {String(row.employeeName ?? '—')}
            </p>
            <p>
              <span className="text-muted-foreground">User: </span>
              {String(row.userName ?? '—')}
            </p>
            <p>
              <span className="text-muted-foreground">Number Code: </span>
              {String(row.numericCode ?? '—')}
            </p>
          </div>
        ) : null}

        <div className="rounded border p-3 space-y-3">
          <p className="font-medium text-[13px]">
            {editingShift ? 'Edit Shift' : 'New Shift'}
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-12 items-end">
            <div className="sm:col-span-4">
              <Controller
                name="shiftId"
                control={control}
                render={({ field }) => (
                  <Select
                    label="Shift"
                    required
                    value={field.value ? String(field.value) : null}
                    onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                    options={shifts}
                    placeholder="Select shift"
                    searchable
                    disabled={loading || saving}
                    error={errors.shiftId?.message}
                  />
                )}
              />
            </div>
            <div className="sm:col-span-3 space-y-1">
              <Label className="text-[12px]">From Date</Label>
              <Controller
                name="fromDate"
                control={control}
                render={({ field }) => (
                  <DatePicker
                    value={field.value}
                    onChange={onFromDateChange}
                    disabled={loading || saving}
                    className="h-9 text-[12px]"
                  />
                )}
              />
            </div>
            <div className="sm:col-span-3 space-y-1">
              <Label className="text-[12px]">To Date</Label>
              <Controller
                name="toDate"
                control={control}
                render={({ field }) => (
                  <DatePicker
                    value={field.value}
                    onChange={field.onChange}
                    minDate={fromDate}
                    disabled={loading || saving}
                    className="h-9 text-[12px]"
                  />
                )}
              />
            </div>
            <div className="sm:col-span-2 flex items-center gap-2 pb-1">
              <Controller
                name="isActive"
                control={control}
                render={({ field }) => (
                  <>
                    <Checkbox
                      id="shiftActive"
                      checked={field.value}
                      onCheckedChange={(v) => field.onChange(v === true)}
                      disabled={loading || saving}
                    />
                    <Label htmlFor="shiftActive" className="cursor-pointer text-[12px]">
                      Active
                    </Label>
                  </>
                )}
              />
            </div>
            <Button
              type="button"
              size="sm"
              className="sm:col-span-12 w-fit"
              disabled={loading || saving}
              onClick={() => void handleSubmit(onAddOrUpdate)()}
            >
              {dialogTitle}
            </Button>
          </div>
        </div>

        {employeeShifts.length > 0 ? (
          <div className="max-h-[220px] overflow-auto scrollbar-hidden rounded border">
            <p className="px-2 py-1.5 text-[13px] font-medium border-b bg-muted/50">Shifts List</p>
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b text-left bg-muted/30">
                  <th className="px-2 py-1.5">SI No.</th>
                  <th className="px-2 py-1.5">Shift</th>
                  <th className="px-2 py-1.5">Timings</th>
                  <th className="px-2 py-1.5">From</th>
                  <th className="px-2 py-1.5">To</th>
                  <th className="px-2 py-1.5">Status</th>
                  <th className="px-2 py-1.5 w-16">Actions</th>
                </tr>
              </thead>
              <tbody>
                {employeeShifts.map((s, index) => (
                  <tr key={`${String(s.empShiftId ?? index)}`} className="border-b last:border-0">
                    <td className="px-2 py-1.5">{index + 1}</td>
                    <td className="px-2 py-1.5">{String(s.shiftName ?? '')}</td>
                    <td className="px-2 py-1.5">
                      {formatShiftTime(s.beginTime)} - {formatShiftTime(s.endTime)}
                    </td>
                    <td className="px-2 py-1.5">
                      {s.fromDate ? format(new Date(String(s.fromDate)), 'MMM d, yyyy') : '—'}
                    </td>
                    <td className="px-2 py-1.5">
                      {s.toDate ? format(new Date(String(s.toDate)), 'MMM d, yyyy') : '—'}
                    </td>
                    <td className="px-2 py-1.5">
                      <StatusBadge status={s.isActive !== false} />
                    </td>
                    <td className="px-2 py-1.5">
                      {s.empShiftId != null && isShiftEditable(s) ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => startEdit(s)}
                        >
                          <PencilIcon className="h-3.5 w-3.5" />
                        </Button>
                      ) : s.empShiftId == null ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => removeLocal(index)}
                        >
                          <Trash2Icon className="h-3.5 w-3.5" />
                        </Button>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

      </div>
    </FormModal>
  )
}
