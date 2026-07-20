import { PAYROLL_ESI_PERCENT } from '@/services'

export type PayrollCategoryRow = Record<string, unknown> & {
  payrollCategoryId?: number
  payrollCategoryCode?: string
  payrollCategoryName?: string
  payrollCategoryType?: string
  amount?: number | string
  value?: number | string
  valueType?: string
  override?: boolean
  collegeId?: number
}

export type PayrollTotals = {
  earnings: PayrollCategoryRow[]
  deductions: PayrollCategoryRow[]
  management: PayrollCategoryRow[]
  totalEarnings: number
  totalDeductions: number
  netPay: number
  grossPay: string
  lossOfPay: number
}

export function initCategoriesFromGroup(
  categoryGroups: PayrollCategoryRow[],
): Pick<PayrollTotals, 'earnings' | 'deductions' | 'management'> {
  const earnings: PayrollCategoryRow[] = []
  const deductions: PayrollCategoryRow[] = []
  const management: PayrollCategoryRow[] = []

  for (const raw of categoryGroups) {
    const row: PayrollCategoryRow = {
      ...raw,
      amount: raw.valueType === 'N' ? Number(raw.value ?? 0) : 0,
      override: false,
    }
    if (row.payrollCategoryType === 'E') earnings.push(row)
    else if (row.payrollCategoryType === 'D') deductions.push(row)
    else if (row.payrollCategoryType === 'M') management.push(row)
  }

  return { earnings, deductions, management }
}

export function splitSalaryStructure(
  structure: PayrollCategoryRow[],
  categoryGroups: PayrollCategoryRow[],
): Pick<PayrollTotals, 'earnings' | 'deductions' | 'management' | 'totalEarnings' | 'totalDeductions' | 'netPay'> {
  const typed = structure.map((item) => {
    const match = categoryGroups.find(
      (g) => Number(g.payrollCategoryId) === Number(item.payrollCategoryId),
    )
    return {
      ...item,
      payrollCategoryType:
        match?.payrollCategoryType ?? item.payrollCategoryType,
    }
  })

  const earnings: PayrollCategoryRow[] = []
  const deductions: PayrollCategoryRow[] = []
  const management: PayrollCategoryRow[] = []
  let totalEarnings = 0
  let totalDeductions = 0

  for (const row of typed) {
    if (row.payrollCategoryType === 'E') {
      earnings.push(row)
      totalEarnings += Number(row.amount ?? 0)
    } else if (row.payrollCategoryType === 'D') {
      deductions.push(row)
      totalDeductions += Number(row.amount ?? 0)
    } else if (row.payrollCategoryType === 'M') {
      management.push(row)
    }
  }

  return {
    earnings,
    deductions,
    management,
    totalEarnings,
    totalDeductions,
    netPay: totalEarnings - totalDeductions,
  }
}

export function buildCalculatePayload(
  categories: PayrollCategoryRow[],
  payrollGroupId: number,
  changed?: PayrollCategoryRow,
): Record<string, unknown>[] {
  const payload = categories.map((c) => ({
    collegeId: c.collegeId,
    payrollCategoryId: c.payrollCategoryId,
    amount: c.amount,
    payrollGroupId,
    override: c.override ?? false,
  }))
  if (changed) {
    for (const item of payload) {
      if (Number(item.payrollCategoryId) === Number(changed.payrollCategoryId)) {
        item.amount = changed.amount
        item.override = changed.override ?? false
      }
    }
  }
  return payload
}

/** Apply calculatePayroll response onto earnings/deductions (Angular onEnter). */
export function applyCalculatedValues(
  calculated: PayrollCategoryRow[],
  earnings: PayrollCategoryRow[],
  deductions: PayrollCategoryRow[],
  changed?: PayrollCategoryRow,
): {
  earnings: PayrollCategoryRow[]
  deductions: PayrollCategoryRow[]
  totalEarnings: number
  totalDeductions: number
  netPay: number
  grossPay: string
  lossOfPay: number
} {
  let totalEarnings = 0
  let totalDeductions = 0
  let lossOfPay = 0

  const nextEarnings = earnings.map((e) => ({ ...e }))
  const nextDeductions = deductions.map((d) => ({ ...d }))

  for (const calc of calculated) {
    const catId = Number(calc.payrollCategoryId)
    for (const earn of nextEarnings) {
      if (Number(earn.payrollCategoryId) === catId) {
        earn.amount = calc.amount
        totalEarnings += Number(earn.amount ?? 0)
      }
    }
    for (const deduct of nextDeductions) {
      if (Number(deduct.payrollCategoryId) === catId) {
        deduct.amount = calc.amount
        totalDeductions += Number(deduct.amount ?? 0)
        if (String(calc.payrollCategoryCode) === 'LOPAmt.') {
          lossOfPay = Number(calc.amount ?? 0)
        }
      }
    }
  }

  let netPay = totalEarnings - totalDeductions
  const esiRow = nextDeductions.find((x) => String(x.payrollCategoryCode) === 'ESI')
  if (esiRow && changed) {
    const esiDeductedAmt = Number(
      (
        ((Number(changed.amount ?? 0) - lossOfPay) * PAYROLL_ESI_PERCENT) /
        100
      ).toFixed(2),
    )
    esiRow.amount = esiDeductedAmt
    netPay -= esiDeductedAmt
    totalDeductions += esiDeductedAmt
  }

  return {
    earnings: nextEarnings,
    deductions: nextDeductions,
    totalEarnings,
    totalDeductions,
    netPay,
    grossPay: totalEarnings.toFixed(2),
    lossOfPay,
  }
}
