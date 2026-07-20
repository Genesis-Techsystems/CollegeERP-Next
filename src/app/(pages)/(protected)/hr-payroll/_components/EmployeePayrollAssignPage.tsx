'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Monitor, UserCircle2 } from 'lucide-react'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { utcMidnightIso } from '@/common/generic-functions'
import { getErrorMessage } from '@/lib/errors'
import { toastError, toastSuccess } from '@/lib/toast'
import { cn } from '@/lib/utils'
import {
  calculatePayroll,
  getActiveEmployeeDetailById,
  getPayrollGroupById,
  saveEmployeePayrollGroup,
} from '@/services'
import {
  applyCalculatedValues,
  buildCalculatePayload,
  initCategoriesFromGroup,
  type PayrollCategoryRow,
} from '../_lib/employee-payroll-form'

const ANGULAR_HELP_TEXT =
  'Please enter the value of Gross pay and click on Calculate to compute the values of the payroll categories in this payroll group. If needed, you can change the computed value of a payroll category before assigning the payroll for this employee.'

export function EmployeePayrollAssignPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const payrollGroupId = Number(searchParams.get('payrollGroupId') ?? 0)
  const empId = Number(searchParams.get('empId') ?? searchParams.get('employeeId') ?? 0)
  const collegeId = Number(searchParams.get('collegeId') ?? 0)
  const departmentId = Number(searchParams.get('departmentId') ?? 0)

  const [employee, setEmployee] = useState<Record<string, unknown> | null>(null)
  const [groupCollegeId, setGroupCollegeId] = useState(0)
  const [allCategories, setAllCategories] = useState<PayrollCategoryRow[]>([])
  const [earnings, setEarnings] = useState<PayrollCategoryRow[]>([])
  const [deductions, setDeductions] = useState<PayrollCategoryRow[]>([])
  const [management, setManagement] = useState<PayrollCategoryRow[]>([])
  const [grossPay, setGrossPay] = useState('')
  const [totalEarnings, setTotalEarnings] = useState(0)
  const [totalDeductions, setTotalDeductions] = useState(0)
  const [netPay, setNetPay] = useState(0)
  const [loading, setLoading] = useState(true)
  const [calculating, setCalculating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [photoFailed, setPhotoFailed] = useState(false)

  const backHref = `/hr-payroll/payroll/payroll-group/assigned-employees/add-employee?collegeId=${collegeId}&departmentId=${departmentId}&payrollGroupId=${payrollGroupId}`

  useEffect(() => {
    if (!payrollGroupId || !empId) return
    void (async () => {
      setLoading(true)
      setError(null)
      setPhotoFailed(false)
      try {
        // Angular: EmployeeDetail + ACTV, then PayrollGroup by payrollGroupId
        const [emp, group] = await Promise.all([
          getActiveEmployeeDetailById(empId),
          getPayrollGroupById(payrollGroupId),
        ])
        setEmployee(emp)
        if (!group) {
          setError('Payroll group not found')
          return
        }
        setGroupCollegeId(Number(group.collegeId ?? 0))
        const groups = Array.isArray(group.payrollCategoryGroups)
          ? (group.payrollCategoryGroups as PayrollCategoryRow[])
          : []
        const split = initCategoriesFromGroup(groups)
        setAllCategories(
          groups.map((g) => ({
            ...g,
            amount: g.valueType === 'N' ? Number(g.value ?? 0) : 0,
            override: false,
          })),
        )
        setEarnings(split.earnings)
        setDeductions(split.deductions)
        setManagement(split.management)
        // Angular grossPay starts empty / disabled until calculate fills it
        setGrossPay('')
        setTotalEarnings(0)
        setTotalDeductions(0)
        setNetPay(0)
      } catch (e) {
        setError(getErrorMessage(e))
        toastError(e, 'Failed to load employee payroll')
      } finally {
        setLoading(false)
      }
    })()
  }, [payrollGroupId, empId])

  const syncAllCategories = useCallback(
    (
      nextEarnings: PayrollCategoryRow[],
      nextDeductions: PayrollCategoryRow[],
      nextManagement: PayrollCategoryRow[],
    ) => {
      const byId = new Map<number, PayrollCategoryRow>()
      for (const row of [...nextEarnings, ...nextDeductions, ...nextManagement]) {
        byId.set(Number(row.payrollCategoryId), row)
      }
      setAllCategories((prev) =>
        prev.map((c) => byId.get(Number(c.payrollCategoryId)) ?? c),
      )
    },
    [],
  )

  /** Angular `onEnter` → POST calculatepayroll with full category amount array. */
  const handleCategoryBlur = useCallback(
    async (changed: PayrollCategoryRow) => {
      if (!payrollGroupId) return
      setCalculating(true)
      try {
        const nextAll = allCategories.map((c) =>
          Number(c.payrollCategoryId) === Number(changed.payrollCategoryId)
            ? { ...c, amount: changed.amount, override: changed.override }
            : c,
        )
        setAllCategories(nextAll)
        const payload = buildCalculatePayload(nextAll, payrollGroupId, changed)
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
        syncAllCategories(applied.earnings, applied.deductions, management)
      } catch (e) {
        toastError(e, 'Failed to calculate payroll')
      } finally {
        setCalculating(false)
      }
    },
    [allCategories, payrollGroupId, earnings, deductions, management, syncAllCategories],
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

  /** Angular `addEmpPayroll` → POST employeepayrollgroup */
  const handleSave = async () => {
    if (!payrollGroupId || !empId) return
    setSaving(true)
    try {
      const now = utcMidnightIso()
      await saveEmployeePayrollGroup({
        collegeId: groupCollegeId,
        employeeId: empId,
        payrollGroupId,
        grossPay: Number(grossPay || 0),
        netAmount: netPay,
        ctc: null,
        fromDate: now,
        toDate: now,
        isActive: true,
        employeeSalaryStructure: [...earnings, ...deductions, ...management],
      })
      toastSuccess('Employee payroll assigned')
      const cid = groupCollegeId || collegeId
      router.push(
        `/hr-payroll/payroll/payroll-group/assigned-employees?payrollGroupId=${payrollGroupId}${cid ? `&collegeId=${cid}` : ''}`,
      )
    } catch (e) {
      toastError(e, 'Failed to save employee payroll')
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
      <div className="min-w-[220px] flex-1">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr>
              <th
                colSpan={3}
                className="border border-slate-300 bg-[#e8eef7] px-2 py-1.5 text-left text-[13px] font-semibold text-[hsl(var(--card-title))]"
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
                  <td className="border border-slate-300 px-2 py-1.5 align-middle">
                    {String(row.payrollCategoryName ?? '')}
                  </td>
                  <td className="border border-slate-300 px-2 py-1.5 w-[120px] align-middle">
                    <Input
                      type="number"
                      className="h-8 text-xs text-right"
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
                  <td className="border border-slate-300 px-2 py-1.5 w-[44px] text-center align-middle">
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
                <td className="border border-slate-300 px-2 py-1.5 font-medium">
                  {type === 'E' ? 'Total Earnings' : 'Total Deductions'}
                </td>
                <td
                  colSpan={2}
                  className="border border-slate-300 px-2 py-1.5 text-center font-medium"
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

  if (!payrollGroupId || !empId) {
    return (
      <PageContainer className="space-y-4">
        <p className="text-sm text-muted-foreground">Missing employee or payroll group.</p>
        <Button asChild variant="outline" size="sm">
          <Link href="/hr-payroll/payroll/payroll-group">Back</Link>
        </Button>
      </PageContainer>
    )
  }

  const photoPath = employee?.photoPath ? String(employee.photoPath) : ''

  return (
    <PageContainer className="space-y-4">
      <div className="app-card overflow-hidden">
        {/* Angular: computer icon + title + yellow rule */}
        <div className="border-b border-[#e8c547] px-4 py-3">
          <h1 className="inline-flex items-center gap-2 text-[15px] font-semibold text-[hsl(var(--card-title))]">
            <Monitor className="h-4 w-4 shrink-0" aria-hidden />
            Employee Payroll
          </h1>
        </div>

        {loading ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">Loading…</p>
        ) : error ? (
          <p className="px-4 py-6 text-sm text-destructive">{error}</p>
        ) : (
          <div className="space-y-5 p-4 sm:p-5">
            {/* Angular employee profile panel */}
            {employee ? (
              <div className="rounded-sm border border-[#9fb8d9] bg-[#f4f8fc] px-4 py-3">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <div className="flex h-[96px] w-[96px] shrink-0 items-center justify-center overflow-hidden rounded-sm border border-slate-200 bg-white">
                    {photoPath && !photoFailed ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={photoPath}
                        alt=""
                        className="h-full w-full object-cover"
                        onError={() => setPhotoFailed(true)}
                      />
                    ) : (
                      <UserCircle2 className="h-16 w-16 text-slate-400" aria-hidden />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1.5 text-[13px]">
                    <DetailRow
                      label="Employee :"
                      value={
                        <>
                          <span className="text-[#2b6cb0] font-medium">
                            {String(employee.firstName ?? '')}
                          </span>
                          {employee.empNumber ? (
                            <span className="text-[#2b6cb0] font-medium">
                              {' '}
                              (
                              <span className="text-foreground">
                                {String(employee.empNumber)}
                              </span>
                              )
                            </span>
                          ) : null}
                        </>
                      }
                    />
                    <DetailRow
                      label="Department :"
                      value={
                        <span className="text-[#2b6cb0] font-medium">
                          {String(employee.deptName ?? '')}
                        </span>
                      }
                    />
                    <DetailRow
                      label="Position :"
                      value={
                        <span className="text-[#2b6cb0] font-medium">
                          {String(employee.designationName ?? '')}
                        </span>
                      }
                    />
                    <DetailRow
                      label="Grade :"
                      value={
                        <span className="text-[#2b6cb0] font-medium">
                          {employee.empgrade != null && String(employee.empgrade) !== ''
                            ? String(employee.empgrade)
                            : ''}
                        </span>
                      }
                    />
                  </div>
                </div>
              </div>
            ) : null}

            {/* Payroll Details */}
            <div>
              <div className="mb-3 border-b border-slate-200 pb-1">
                <h2 className="text-[16px] font-semibold text-[#2b6cb0]">Payroll Details</h2>
              </div>
              <div className="max-w-[260px]">
                <Input
                  className="h-9 border-0 border-b border-slate-300 rounded-none px-0 shadow-none focus-visible:ring-0"
                  placeholder="Gross Pay"
                  value={grossPay}
                  disabled
                  readOnly
                />
              </div>
            </div>

            {/* Categories */}
            <div>
              <div className="mb-2 border-b border-slate-200 pb-1">
                <h2 className="text-[16px] font-semibold text-[#2b6cb0]">
                  Payroll categories of this payroll group
                </h2>
              </div>
              <p className="mb-4 max-w-4xl text-[12px] leading-relaxed text-[#9e9e9e]">
                {ANGULAR_HELP_TEXT}
              </p>

              {earnings.length === 0 &&
              deductions.length === 0 &&
              management.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No payroll categories are assigned to this group. Add categories on Edit Payroll
                  Group first.
                </p>
              ) : (
                <div className="flex flex-wrap gap-4">
                  {renderCategorySection('Earnings', earnings, 'E', totalEarnings)}
                  {renderCategorySection('Deductions', deductions, 'D', totalDeductions)}
                  {renderCategorySection('Management Deductions', management, 'M')}
                </div>
              )}

              <div className="mt-4 flex items-baseline justify-end gap-2 text-[14px] font-medium">
                <span>Net Pay :</span>
                <span className="text-blue-600 tabular-nums">{netPay.toFixed(2)}</span>
                <span>₹</span>
              </div>
            </div>

            {/* Angular form-btn: amber Back + primary Save, right-aligned */}
            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                size="sm"
                className="bg-[#f0ad4e] text-black hover:bg-[#ec9c2c]"
                onClick={() => router.push(backHref)}
              >
                Back
              </Button>
              <Button
                type="button"
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

function DetailRow({
  label,
  value,
  className,
}: {
  label: string
  value: ReactNode
  className?: string
}) {
  return (
    <div className={cn('grid gap-x-3 sm:grid-cols-[110px_1fr]', className)}>
      <span className="text-foreground">{label}</span>
      <span className="min-w-0">{value}</span>
    </div>
  )
}
