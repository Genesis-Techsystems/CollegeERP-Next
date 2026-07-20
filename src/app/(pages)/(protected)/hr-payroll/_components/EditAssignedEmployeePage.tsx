'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { utcMidnightIso } from '@/common/generic-functions'
import { getErrorMessage } from '@/lib/errors'
import { toastError, toastSuccess } from '@/lib/toast'
import {
  calculatePayroll,
  getEmployeeDetailById,
  getEmployeePayrollGroupById,
  getPayrollGroupById,
  saveEmployeePayrollGroup,
} from '@/services'
import {
  applyCalculatedValues,
  buildCalculatePayload,
  splitSalaryStructure,
  type PayrollCategoryRow,
} from '../_lib/employee-payroll-form'

export function EditAssignedEmployeePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const payrollGroupId = Number(searchParams.get('payrollGroupId') ?? 0)
  const empPayrollGroupId = Number(searchParams.get('empPayrollGroupId') ?? 0)
  const empId = Number(
    searchParams.get('empId') ?? searchParams.get('employeeId') ?? 0,
  )
  const collegeId = Number(searchParams.get('collegeId') ?? 0)

  const [employee, setEmployee] = useState<Record<string, unknown> | null>(null)
  const [groupCollegeId, setGroupCollegeId] = useState(0)
  const [salaryStructure, setSalaryStructure] = useState<PayrollCategoryRow[]>([])
  const [earnings, setEarnings] = useState<PayrollCategoryRow[]>([])
  const [deductions, setDeductions] = useState<PayrollCategoryRow[]>([])
  const [management, setManagement] = useState<PayrollCategoryRow[]>([])
  const [grossPay, setGrossPay] = useState('0.00')
  const [totalEarnings, setTotalEarnings] = useState(0)
  const [totalDeductions, setTotalDeductions] = useState(0)
  const [netPay, setNetPay] = useState(0)
  const [loading, setLoading] = useState(true)
  const [calculating, setCalculating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const backHref = `/hr-payroll/payroll/payroll-group/assigned-employees?payrollGroupId=${payrollGroupId}&collegeId=${collegeId}`

  useEffect(() => {
    if (!payrollGroupId || !empId || !empPayrollGroupId) return
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const [emp, group, empPayroll] = await Promise.all([
          getEmployeeDetailById(empId),
          getPayrollGroupById(payrollGroupId),
          getEmployeePayrollGroupById(empPayrollGroupId),
        ])
        setEmployee(emp)
        if (!group || !empPayroll) {
          setError('Payroll assignment not found')
          return
        }
        setGroupCollegeId(Number(group.collegeId ?? empPayroll.collegeId ?? 0))
        const categoryGroups = Array.isArray(group.payrollCategoryGroups)
          ? (group.payrollCategoryGroups as PayrollCategoryRow[])
          : []
        const structure = Array.isArray(empPayroll.employeeSalaryStructure)
          ? (empPayroll.employeeSalaryStructure as PayrollCategoryRow[])
          : []
        setSalaryStructure(structure)
        const split = splitSalaryStructure(structure, categoryGroups)
        setEarnings(split.earnings)
        setDeductions(split.deductions)
        setManagement(split.management)
        setTotalEarnings(split.totalEarnings)
        setTotalDeductions(split.totalDeductions)
        setNetPay(split.netPay)
        const gp = Number(empPayroll.grossPay ?? split.totalEarnings)
        setGrossPay(gp.toFixed(2))
      } catch (e) {
        setError(getErrorMessage(e))
        toastError(e, 'Failed to load employee payroll')
      } finally {
        setLoading(false)
      }
    })()
  }, [payrollGroupId, empId, empPayrollGroupId])

  const syncStructure = useCallback(
    (
      nextEarnings: PayrollCategoryRow[],
      nextDeductions: PayrollCategoryRow[],
      nextManagement: PayrollCategoryRow[],
    ) => {
      const byId = new Map<number, PayrollCategoryRow>()
      for (const row of [...nextEarnings, ...nextDeductions, ...nextManagement]) {
        byId.set(Number(row.payrollCategoryId), row)
      }
      setSalaryStructure((prev) =>
        prev.map((c) => byId.get(Number(c.payrollCategoryId)) ?? c),
      )
    },
    [],
  )

  const handleCategoryBlur = useCallback(
    async (changed: PayrollCategoryRow) => {
      if (!payrollGroupId) return
      setCalculating(true)
      try {
        const nextStructure = salaryStructure.map((c) =>
          Number(c.payrollCategoryId) === Number(changed.payrollCategoryId)
            ? { ...c, amount: changed.amount, override: changed.override }
            : c,
        )
        setSalaryStructure(nextStructure)
        const payload = buildCalculatePayload(nextStructure, payrollGroupId, changed)
        const calculated = await calculatePayroll(payload)
        const applied = applyCalculatedValues(
          calculated as PayrollCategoryRow[],
          earnings,
          deductions,
          changed,
        )
        setEarnings(applied.earnings)
        setDeductions(applied.deductions)
        setTotalEarnings(applied.totalEarnings)
        setTotalDeductions(applied.totalDeductions)
        setNetPay(applied.netPay)
        setGrossPay(applied.grossPay)
        syncStructure(applied.earnings, applied.deductions, management)
      } catch (e) {
        toastError(e, 'Failed to calculate payroll')
      } finally {
        setCalculating(false)
      }
    },
    [
      salaryStructure,
      payrollGroupId,
      earnings,
      deductions,
      management,
      syncStructure,
    ],
  )

  const updateCategoryField = (
    type: 'E' | 'D' | 'M',
    payrollCategoryId: number,
    patch: Partial<PayrollCategoryRow>,
  ) => {
    const updater = (rows: PayrollCategoryRow[]) =>
      rows.map((r) =>
        Number(r.payrollCategoryId) === payrollCategoryId ? { ...r, ...patch } : r,
      )
    if (type === 'E') setEarnings(updater)
    else if (type === 'D') setDeductions(updater)
    else setManagement(updater)
  }

  const handleSave = async () => {
    if (!payrollGroupId || !empId || !empPayrollGroupId) return
    setSaving(true)
    try {
      const now = utcMidnightIso()
      await saveEmployeePayrollGroup({
        collegeId: groupCollegeId,
        employeeId: empId,
        payrollGroupId,
        empPayrollGroupId,
        grossPay: Number(grossPay),
        netAmount: netPay,
        ctc: null,
        fromDate: now,
        toDate: now,
        isActive: true,
        employeeSalaryStructure: [...earnings, ...deductions, ...management],
      })
      toastSuccess('Employee payroll updated')
      router.push(backHref)
    } catch (e) {
      toastError(e, 'Failed to update employee payroll')
    } finally {
      setSaving(false)
    }
  }

  const renderCategorySection = (
    title: string,
    rows: PayrollCategoryRow[],
    type: 'E' | 'D' | 'M',
    total?: number,
  ) => {
    if (rows.length === 0) return null
    return (
      <div className="min-w-[240px] flex-1">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th
                colSpan={3}
                className="border border-slate-200 bg-slate-50 px-2 py-1.5 text-left text-[13px] font-semibold"
              >
                {title}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const id = Number(row.payrollCategoryId)
              return (
                <tr key={id}>
                  <td className="border border-slate-200 px-2 py-1.5">
                    {String(row.payrollCategoryName ?? '')}
                  </td>
                  <td className="border border-slate-200 px-2 py-1.5 w-[110px]">
                    <Input
                      type="number"
                      className="h-8 text-xs"
                      value={row.amount === '' || row.amount == null ? '' : String(row.amount)}
                      disabled={calculating}
                      onChange={(e) =>
                        updateCategoryField(type, id, {
                          amount: e.target.value === '' ? '' : Number(e.target.value),
                        })
                      }
                      onBlur={(e) => {
                        const amount =
                          e.target.value === '' ? '' : Number(e.target.value)
                        void handleCategoryBlur({ ...row, amount })
                      }}
                    />
                  </td>
                  <td className="border border-slate-200 px-2 py-1.5 w-[44px] text-center">
                    <Checkbox
                      checked={Boolean(row.override)}
                      onCheckedChange={(checked) => {
                        const next = { ...row, override: checked === true }
                        updateCategoryField(type, id, { override: checked === true })
                        void handleCategoryBlur(next)
                      }}
                    />
                  </td>
                </tr>
              )
            })}
            {total != null ? (
              <tr>
                <td className="border border-slate-200 px-2 py-1.5 font-medium">
                  {type === 'E' ? 'Total Earnings' : 'Total Deductions'}
                </td>
                <td
                  colSpan={2}
                  className="border border-slate-200 px-2 py-1.5 text-center font-medium"
                >
                  {total.toFixed(2)}/-
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    )
  }

  if (!payrollGroupId || !empId || !empPayrollGroupId) {
    return (
      <PageContainer className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Missing employee payroll assignment parameters.
        </p>
        <Button asChild variant="outline" size="sm">
          <Link href="/hr-payroll/payroll/payroll-group">Back</Link>
        </Button>
      </PageContainer>
    )
  }

  return (
    <PageContainer className="space-y-4">
      <div className="app-card overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50/60 px-4 py-3">
          <h1 className="text-[15px] font-semibold text-[hsl(var(--card-title))]">
            Edit Employee Payroll
          </h1>
        </div>

        {loading ? (
          <p className="p-4 text-sm text-muted-foreground">Loading…</p>
        ) : error ? (
          <p className="p-4 text-sm text-destructive">{error}</p>
        ) : (
          <div className="space-y-4 p-4">
            {employee ? (
              <div className="grid gap-1 text-sm sm:grid-cols-[140px_1fr]">
                <span className="text-muted-foreground">Employee :</span>
                <span>
                  {String(employee.firstName ?? '')}
                  {employee.empNumber ? ` (${String(employee.empNumber)})` : ''}
                </span>
                <span className="text-muted-foreground">Department :</span>
                <span>{String(employee.deptName ?? '—')}</span>
                <span className="text-muted-foreground">Position :</span>
                <span>{String(employee.designationName ?? '—')}</span>
                <span className="text-muted-foreground">Grade :</span>
                <span>{String(employee.empgrade ?? '—')}</span>
              </div>
            ) : null}

            <div className="space-y-1.5 max-w-xs">
              <Label className="text-xs">Gross Pay</Label>
              <Input className="h-8 text-xs" value={grossPay} disabled readOnly />
            </div>

            <div>
              <h2 className="mb-1 text-[14px] font-semibold">
                Payroll categories of this payroll group
              </h2>
              <div className="flex flex-wrap gap-3">
                {renderCategorySection('Earnings', earnings, 'E', totalEarnings)}
                {renderCategorySection('Deductions', deductions, 'D', totalDeductions)}
                {renderCategorySection('Management Deductions', management, 'M')}
              </div>
            </div>

            <div className="flex justify-end gap-2 text-sm font-medium">
              <span>Net Pay :</span>
              <span className="text-blue-600">{netPay.toFixed(2)}</span>
              <span>₹</span>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => router.push(backHref)}>
                Back
              </Button>
              <Button
                size="sm"
                disabled={saving || calculating}
                onClick={() => void handleSave()}
              >
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  )
}
