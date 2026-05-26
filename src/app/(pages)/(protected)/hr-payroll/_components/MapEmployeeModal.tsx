'use client'

import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { FormModal } from '@/common/components/feedback'
import { Select, type SelectOption } from '@/common/components/select'
import { searchEmployeesForHr } from '@/services'

const schema = z.object({
  empId: z.number().min(1, 'Employee is required'),
})

type FormValues = z.infer<typeof schema>

type BioRow = Record<string, unknown>

function employeeLabel(row: Record<string, unknown>): string {
  const name = String(row.firstName ?? '')
  const num = row.empNumber != null ? ` (${String(row.empNumber)})` : ''
  return `${name}${num}`.trim() || String(row.employeeId ?? '')
}

interface MapEmployeeModalProps {
  open: boolean
  onClose: () => void
  row: BioRow | null
  onSave: (empId: number) => void | Promise<void>
  isSubmitting?: boolean
}

export function MapEmployeeModal({
  open,
  onClose,
  row,
  onSave,
  isSubmitting = false,
}: Readonly<MapEmployeeModalProps>) {
  const [employeeOptions, setEmployeeOptions] = useState<SelectOption[]>([])
  const [employeeRows, setEmployeeRows] = useState<Record<string, unknown>[]>([])
  const [searchLoading, setSearchLoading] = useState(false)

  const collegeId = Number(row?.collegeId ?? 0)

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { empId: undefined as unknown as number },
  })

  const selectedEmpId = watch('empId')
  const selectedEmployee = useMemo(
    () => employeeRows.find((e) => Number(e.employeeId) === selectedEmpId) ?? null,
    [employeeRows, selectedEmpId],
  )

  useEffect(() => {
    if (!open || !row) return
    const existingId = row.empId != null ? Number(row.empId) : undefined
    reset({ empId: existingId as number })
    if (existingId && row.empName) {
      setEmployeeRows([{ employeeId: existingId, firstName: row.empName, empNumber: row.empNumber }])
      setEmployeeOptions([{ value: String(existingId), label: employeeLabel(row) }])
    } else {
      setEmployeeRows([])
      setEmployeeOptions([])
    }
  }, [open, row, reset])

  async function onEmployeeSearch(term: string) {
    const q = term.trim()
    if (q.length < 4) {
      setEmployeeRows([])
      setEmployeeOptions([])
      return
    }
    setSearchLoading(true)
    try {
      const list = await searchEmployeesForHr(q, collegeId || undefined)
      setEmployeeRows(list)
      setEmployeeOptions(
        list.map((e) => ({ value: String(e.employeeId), label: employeeLabel(e) })),
      )
    } finally {
      setSearchLoading(false)
    }
  }

  async function onSubmit(data: FormValues) {
    await onSave(data.empId)
  }

  if (!row) return null

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title="Map Employee"
      titleClassName="text-[15px] font-semibold leading-none text-[#5da394]"
      onSubmit={(e) => {
        e.preventDefault()
        void handleSubmit(onSubmit)()
      }}
      submitLabel="Save"
      isSubmitting={isSubmitting}
      size="lg"
    >
      <div className="flex flex-col gap-3 text-[12px]">
        <div className="rounded border border-border/60 bg-muted/30 px-3 py-2 space-y-1">
          <p>
            <span className="text-muted-foreground">Biometric Employee: </span>
            <span className="font-medium">{String(row.employeeName ?? '—')}</span>
          </p>
          <p>
            <span className="text-muted-foreground">Number Code: </span>
            <span>{String(row.numericCode ?? '—')}</span>
          </p>
        </div>

        <Controller
          name="empId"
          control={control}
          render={({ field }) => (
            <Select
              label="Employee"
              required
              value={field.value ? String(field.value) : null}
              onChange={(v) => field.onChange(v ? Number(v) : undefined)}
              options={employeeOptions}
              placeholder="Search by name or employee id (min 4 chars)"
              searchable
              onSearch={onEmployeeSearch}
              isLoading={searchLoading}
              error={errors.empId?.message}
            />
          )}
        />

        {selectedEmployee ? (
          <div className="rounded border px-3 py-2 text-[12px] text-muted-foreground">
            <p className="font-medium text-foreground">
              {String(selectedEmployee.firstName ?? '')}
              {selectedEmployee.empNumber != null ? ` (${String(selectedEmployee.empNumber)})` : ''}
            </p>
            {selectedEmployee.empDeptName ? (
              <p>{String(selectedEmployee.empDeptName)}</p>
            ) : null}
            {selectedEmployee.mobile ? <p>{String(selectedEmployee.mobile)}</p> : null}
            {selectedEmployee.userName ? (
              <p>
                <span className="text-foreground">User:</span> {String(selectedEmployee.userName)}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </FormModal>
  )
}
