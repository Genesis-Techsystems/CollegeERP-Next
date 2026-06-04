'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FileSpreadsheet, Printer } from 'lucide-react'
import { FilterCard, FILTER_CARD_SELECT_CLASS } from '@/common/components/feedback'
import { MonthYearPicker } from '@/common/components/date-picker'
import { SearchInput } from '@/common/components/search'
import { Select, type SelectOption } from '@/common/components/select'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { getErrorMessage } from '@/lib/errors'
import { toastError } from '@/lib/toast'
import {
  getStaffPayrollReportRows,
  listActiveCollegesForGeneralSettings,
  listDepartmentsByCollege,
  listEmployeeCategoriesForPayroll,
  type StaffPayrollReportParams,
} from '@/services'
import {
  buildPayrollPivotRows,
  splitPivotCategoryColumns,
  type PayrollPivotAmountCell,
  type PayrollPivotRow,
} from '../_lib/payroll-pivot'
import { exportHtmlTableAsExcel } from '../_lib/export-html-table'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const

type PayrollStaffReportPageProps = {
  title: string
  reportFlag: StaffPayrollReportParams['reportFlag']
  /** Pre-payroll audit passes month/year as 0 */
  usePeriod: boolean
  exportFileName: string
}

function amountForCell(row: PayrollPivotRow, catName: string, catType: string): string {
  const cell = row.subjectTimetable.find(
    (c: PayrollPivotAmountCell) =>
      c.payroll_category_name === catName && c.payroll_category_type === catType,
  )
  if (!cell || cell.amt === '-') return '—'
  const n = Number(cell.amt)
  return Number.isFinite(n) ? n.toFixed(2) : String(cell.amt)
}

function filterPivotRows(rows: PayrollPivotRow[], term: string): PayrollPivotRow[] {
  const q = term.trim().toLowerCase()
  if (!q) return rows
  return rows.filter((r) => {
    const hay = [
      r.Faculty,
      r.Emp_Designation,
      r.Emp_Department,
      r.emp_number,
      r.gd_code,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return hay.includes(q)
  })
}

export function PayrollStaffReportPage({
  title,
  reportFlag,
  usePeriod,
  exportFileName,
}: PayrollStaffReportPageProps) {
  const tableRef = useRef<HTMLDivElement>(null)
  const printRef = useRef<HTMLDivElement>(null)
  const [collegeId, setCollegeId] = useState<number | null>(null)
  const [departmentId, setDepartmentId] = useState<number>(0)
  const [empCategoryId, setEmpCategoryId] = useState<number>(0)
  const [period, setPeriod] = useState<Date>(new Date())
  const [colleges, setColleges] = useState<SelectOption[]>([])
  const [departments, setDepartments] = useState<SelectOption[]>([{ value: '0', label: 'All' }])
  const [categories, setCategories] = useState<SelectOption[]>([{ value: '0', label: 'All' }])
  const [pivotRows, setPivotRows] = useState<PayrollPivotRow[]>([])
  const [earningsCols, setEarningsCols] = useState<ReturnType<typeof splitPivotCategoryColumns>['earnings']>([])
  const [deductionCols, setDeductionCols] = useState<ReturnType<typeof splitPivotCategoryColumns>['deductions']>([])
  const [mgmtCols, setMgmtCols] = useState<ReturnType<typeof splitPivotCategoryColumns>['management']>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasRun, setHasRun] = useState(false)
  const [dataDetails, setDataDetails] = useState('')
  const [searchText, setSearchText] = useState('')

  const facultyLabel = usePeriod ? 'College' : 'Faculty'

  useEffect(() => {
    void (async () => {
      try {
        const [collegeList, catList] = await Promise.all([
          listActiveCollegesForGeneralSettings(),
          listEmployeeCategoriesForPayroll(),
        ])
        setColleges(
          collegeList.map((c) => ({
            value: String(c.collegeId),
            label: String(c.collegeCode ?? c.collegeName ?? c.collegeId),
          })),
        )
        setCategories([
          { value: '0', label: 'All' },
          ...catList.map((c) => ({
            value: String(c.generalDetailId ?? c.generalDetailID),
            label: String(c.generalDetailDisplayName ?? c.generalDetailCode ?? ''),
          })),
        ])
        if (collegeList.length > 0) {
          const cid = Number(collegeList[0]!.collegeId)
          setCollegeId(cid)
        }
      } catch (e) {
        toastError(e, 'Failed to load filters')
      }
    })()
  }, [])

  useEffect(() => {
    if (!collegeId) return
    setDepartmentId(0)
    void (async () => {
      try {
        const depts = await listDepartmentsByCollege(collegeId)
        setDepartments([
          { value: '0', label: 'All' },
          ...depts.map((d) => ({
            value: String(d.departmentId),
            label: String(d.deptCode ?? d.deptName ?? d.departmentId),
          })),
        ])
      } catch (e) {
        toastError(e, 'Failed to load departments')
      }
    })()
  }, [collegeId])

  const runReport = useCallback(async () => {
    if (!collegeId) return
    setLoading(true)
    setError(null)
    setHasRun(true)
    setSearchText('')
    try {
      const month = usePeriod ? period.getMonth() + 1 : 0
      const year = usePeriod ? period.getFullYear() : 0
      const raw = await getStaffPayrollReportRows({
        reportFlag,
        month,
        year,
        collegeId,
        departmentId,
        empCategoryId,
      })
      const { keys, pivotRows: pivoted } = buildPayrollPivotRows(raw)
      const split = splitPivotCategoryColumns(keys)
      setEarningsCols(split.earnings)
      setDeductionCols(split.deductions)
      setMgmtCols(split.management)
      setPivotRows(pivoted)

      const collegeLabel = colleges.find((c) => c.value === String(collegeId))?.label ?? ''
      const deptLabel = departments.find((d) => d.value === String(departmentId))?.label ?? 'All'
      const parts = [collegeLabel]
      if (deptLabel && deptLabel !== 'All') parts.push(deptLabel)
      if (usePeriod) {
        parts.push(`${MONTHS[period.getMonth()]} ${period.getFullYear()}`)
      }
      setDataDetails(parts.join(' / '))
    } catch (e) {
      setError(getErrorMessage(e))
      toastError(e, 'Report failed')
      setPivotRows([])
      setDataDetails('')
    } finally {
      setLoading(false)
    }
  }, [
    collegeId,
    departmentId,
    empCategoryId,
    period,
    reportFlag,
    usePeriod,
    colleges,
    departments,
  ])

  const filteredRows = useMemo(
    () => filterPivotRows(pivotRows, searchText),
    [pivotRows, searchText],
  )

  const handlePrint = () => {
    if (!printRef.current || typeof window === 'undefined') return
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(`<html><head><title>${title}</title></head><body>${printRef.current.innerHTML}</body></html>`)
    w.document.close()
    w.print()
  }

  return (
    <PageContainer className="space-y-4">
      <FilterCard title={title}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:flex-wrap">
          <div className="grid flex-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 min-w-0">
            <Select
              label={facultyLabel}
              required
              className={FILTER_CARD_SELECT_CLASS}
              value={collegeId != null ? String(collegeId) : ''}
              onChange={(v) => setCollegeId(v ? Number(v) : null)}
              options={colleges}
              placeholder={facultyLabel}
            />
            <Select
              label="Department"
              className={FILTER_CARD_SELECT_CLASS}
              value={String(departmentId)}
              onChange={(v) => setDepartmentId(Number(v ?? 0))}
              options={departments}
              placeholder="Department"
            />
            <Select
              label="Employee Category"
              required
              className={FILTER_CARD_SELECT_CLASS}
              value={String(empCategoryId)}
              onChange={(v) => setEmpCategoryId(Number(v ?? 0))}
              options={categories}
              placeholder="Employee Category"
            />
            {usePeriod ? (
              <MonthYearPicker
                label="Month and Year"
                value={period}
                onChange={(d) => d && setPeriod(d)}
              />
            ) : null}
          </div>
          <Button
            type="button"
            className="h-9 shrink-0 px-6 lg:min-w-[120px]"
            onClick={() => void runReport()}
            disabled={loading || !collegeId}
          >
            {loading ? 'Loading…' : 'Get List'}
          </Button>
        </div>
      </FilterCard>

      {error ? <p className="text-sm text-destructive px-1">{error}</p> : null}

      {hasRun && pivotRows.length > 0 ? (
        <>
          <div className="app-card px-4 py-3 border-b border-slate-200">
            <h2 className="text-base font-semibold text-[hsl(var(--card-title))]">
              {title}
              {dataDetails ? (
                <span className="ml-2 font-medium text-blue-600">— {dataDetails}</span>
              ) : null}
            </h2>
          </div>

          <div className="app-card p-4 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <SearchInput
                value={searchText}
                onChange={setSearchText}
                placeholder="Search"
                className="max-w-xs"
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="default"
                  onClick={() => exportHtmlTableAsExcel(tableRef.current, exportFileName)}
                >
                  <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
                  Export Excel
                </Button>
                <Button type="button" size="sm" variant="default" onClick={handlePrint}>
                  <Printer className="mr-1.5 h-3.5 w-3.5" />
                  Print Report
                </Button>
              </div>
            </div>

            <div ref={printRef}>
              <div ref={tableRef} className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="p-2 text-left">SI.No</th>
                      <th className="p-2 text-left">Name</th>
                      <th className="p-2 text-left">Designation</th>
                      <th className="p-2 text-left">Dept.</th>
                      <th className="p-2 text-right">Gross Amt</th>
                      {earningsCols.map((c) => (
                        <th key={`e-${c.payroll_category_code}`} className="p-2 text-right">
                          {c.payroll_category_name}
                        </th>
                      ))}
                      {deductionCols.map((c) => (
                        <th key={`d-${c.payroll_category_code}`} className="p-2 text-right">
                          {c.payroll_category_name}
                        </th>
                      ))}
                      {mgmtCols.map((c) => (
                        <th key={`m-${c.payroll_category_code}`} className="p-2 text-right">
                          {c.payroll_category_name}
                        </th>
                      ))}
                      <th className="p-2 text-right">Net Amt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((row, idx) => (
                      <tr key={row.fk_emp_id} className="border-b border-border/60">
                        <td className="p-2">{idx + 1}</td>
                        <td className="p-2">{row.Faculty}</td>
                        <td className="p-2">{row.Emp_Designation}</td>
                        <td className="p-2">{row.Emp_Department}</td>
                        <td className="p-2 text-right">
                          {row.gross_pay != null ? Number(row.gross_pay).toFixed(2) : '—'}
                        </td>
                        {earningsCols.map((c) => (
                          <td
                            key={`e-${c.payroll_category_code}-${row.fk_emp_id}`}
                            className="p-2 text-right"
                          >
                            {amountForCell(row, c.payroll_category_name, c.payroll_category_type)}
                          </td>
                        ))}
                        {deductionCols.map((c) => (
                          <td
                            key={`d-${c.payroll_category_code}-${row.fk_emp_id}`}
                            className="p-2 text-right"
                          >
                            {amountForCell(row, c.payroll_category_name, c.payroll_category_type)}
                          </td>
                        ))}
                        {mgmtCols.map((c) => (
                          <td
                            key={`m-${c.payroll_category_code}-${row.fk_emp_id}`}
                            className="p-2 text-right"
                          >
                            {amountForCell(row, c.payroll_category_name, c.payroll_category_type)}
                          </td>
                        ))}
                        <td className="p-2 text-right">
                          {row.net_pay != null ? Number(row.net_pay).toFixed(2) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      ) : null}

      {hasRun && !loading && pivotRows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground app-card">
          No records found for the selected filters.
        </p>
      ) : null}
    </PageContainer>
  )
}
