type AnyRow = Record<string, unknown>

export type PayrollPivotCategory = {
  payroll_category_code: string
  payroll_category_name: string
  PayMonth: unknown
  payroll_category_type: string
}

export type PayrollPivotAmountCell = {
  payroll_category_code: string
  payroll_category_name: string
  amt: string | number
  payroll_category_type: string
}

export type PayrollPivotRow = {
  fk_emp_id: number
  PayMonth: unknown
  Faculty: string
  Emp_Designation: string
  Emp_Department: string
  gross_pay: unknown
  net_pay: unknown
  bank_acc_no: unknown
  gd_code: unknown
  SNo: unknown
  emp_number: unknown
  subjectTimetable: PayrollPivotAmountCell[]
}

/** Angular pre-payroll / monthly payroll pivot builder. */
export function buildPayrollPivotRows(rawRows: AnyRow[]): {
  keys: PayrollPivotCategory[]
  pivotRows: PayrollPivotRow[]
} {
  const keys: PayrollPivotCategory[] = []
  for (const row of rawRows) {
    const name = String(row.payroll_category_name ?? '')
    const month = row.PayMonth
    const type = String(row.payroll_category_type ?? '')
    const exists = keys.some(
      (k) =>
        k.payroll_category_name === name &&
        k.PayMonth === month &&
        k.payroll_category_type === type,
    )
    if (!exists) {
      keys.push({
        payroll_category_code: String(row.payroll_category_code ?? ''),
        payroll_category_name: name,
        PayMonth: month,
        payroll_category_type: type,
      })
    }
  }

  const pivotRows: PayrollPivotRow[] = []

  for (const row of rawRows) {
    const empId = Number(row.fk_emp_id)
    const catName = String(row.payroll_category_name ?? '')
    const catType = String(row.payroll_category_type ?? '')
    let pivot = pivotRows.find((p) => p.fk_emp_id === empId)

    if (!pivot) {
      pivot = {
        fk_emp_id: empId,
        PayMonth: row.PayMonth,
        Faculty: String(row.Emp_Name ?? ''),
        Emp_Designation: String(row.Emp_Designation ?? ''),
        Emp_Department: String(row.Emp_Department ?? ''),
        gross_pay: row.gross_pay,
        net_pay: row.net_pay,
        bank_acc_no: row.bank_acc_no,
        gd_code: row.gd_code,
        SNo: row.SNo,
        emp_number: row.emp_number,
        subjectTimetable: keys.map((k) => ({
          payroll_category_code: k.payroll_category_code,
          payroll_category_name: k.payroll_category_name,
          amt: '-',
          payroll_category_type: k.payroll_category_type,
        })),
      }
      pivotRows.push(pivot)
    }

    const cell = pivot.subjectTimetable.find(
      (c) => c.payroll_category_name === catName && c.payroll_category_type === catType,
    )
    if (cell) cell.amt = row.amount as string | number
  }

  return { keys, pivotRows }
}

export function splitPivotCategoryColumns(keys: PayrollPivotCategory[], basicCode = 'BASIC') {
  const earnings = keys.filter((k) => k.payroll_category_type === 'E' && k.payroll_category_code !== basicCode)
  const deductions = keys.filter((k) => k.payroll_category_type === 'D')
  const management = keys.filter((k) => k.payroll_category_type === 'M')
  return { earnings, deductions, management }
}
