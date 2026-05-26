import { FEE_API, NEXT_API } from '@/config/constants/api'
import type { ApiResponse } from '@/types/api'

type AnyRow = Record<string, unknown>

export type StudentFeeYearRow = {
  year: string
  isTotal: boolean
  totalAmount: number | null
  rtfAmount: number | null
  collegeAmount: number | null
  collegeDiscount: number | null
  netAmount: number | null
  paidAmount: number | null
  dueCollegeAmount: number | null
  rtfReceived: number | null
  dueRtfAmount: number | null
  totalDue: number | null
}

export type StudentFeeView = {
  rows: StudentFeeYearRow[]
}

const COURSE_FEE_YEARS = [1, 2, 3, 4] as const

const AMOUNT_KEYS = {
  totalAmount: [
    'P_gross_amount',
    'P_GROSS_AMOUNT',
    'P_Gross_Amount',
    'P_year_gross_amount',
    'P_Year_Gross_Amount',
    'year_gross_amount',
    'Year_Gross_Amount',
    'annual_gross_amount',
    'Annual_Gross_Amount',
    'P_annual_amount',
    'year_fee_amount',
    'Year_Fee_Amount',
    'gross_amount',
    'Gross_Amount',
    'GROSS_AMOUNT',
    'total_amount',
    'Total_Amount',
    'totalAmount',
    'P_total_amount',
    'fee_amount',
    'Fee_Amount',
  ],
  rtfAmount: ['P_rtf_amount', 'P_RTF_AMOUNT', 'rtf_amount', 'RTF_Amount', 'rtfAmount'],
  collegeAmount: ['P_college_amount', 'P_COLLEGE_AMOUNT', 'college_amount', 'College_Amount', 'collegeAmount'],
  collegeDiscount: [
    'P_college_discount',
    'P_COLLEGE_DISCOUNT',
    'college_discount',
    'College_Discount',
    'collegeDiscount',
  ],
  netAmount: [
    'P_year_net_amount',
    'P_Year_Net_Amount',
    'year_net_amount',
    'Year_Net_Amount',
    'P_net_amount',
    'P_NET_AMOUNT',
    'net_amount',
    'NET_Amount',
    'netAmount',
  ],
  paidAmount: [
    'P_year_paid_amount',
    'P_Year_Paid_Amount',
    'year_paid_amount',
    'Year_Paid_Amount',
    'P_paid_amount',
    'P_PAID_AMOUNT',
    'paid_amount',
    'Paid_Amount',
    'paidAmount',
    'amountPaid',
  ],
  dueCollegeAmount: [
    'P_year_due_college_amount',
    'P_Year_Due_College_Amount',
    'year_due_college_amount',
    'Year_Due_College_Amount',
    'P_due_college_amount',
    'P_DUE_COLLEGE_AMOUNT',
    'due_college_amount',
    'Due_College_Amount',
    'dueCollegeAmount',
    'college_due_amount',
  ],
  rtfReceived: ['P_rtf_received', 'P_RTF_RECEIVED', 'rtf_received', 'RTF_Received', 'rtfReceived'],
  dueRtfAmount: ['P_due_rtf_amount', 'P_DUE_RTF_AMOUNT', 'due_rtf_amount', 'Due_RTF_Amount', 'dueRtfAmount'],
  totalDue: [
    'P_total_due',
    'P_TOTAL_DUE',
    'total_due',
    'Total_Due',
    'totalDue',
    'P_balance_amount',
    'balance_amount',
    'dueAmount',
    'due_amount',
  ],
} as const

type AmountField = keyof typeof AMOUNT_KEYS

const YEAR_LABEL_KEYS = [
  'year',
  'fee_year',
  'Year',
  'feeYear',
  'year_name',
  'Year_Name',
  'display_year',
  'fee_year_name',
  'Fee_Year_Name',
  'yearName',
  'YearName',
  'course_year',
  'courseYear',
  'P_year',
  'P_Year_Name',
  'P_year_name',
  'Course_Year',
  'course_year_name',
]

const YEAR_NUMBER_KEYS = [
  'year_no',
  'yearNo',
  'Year_No',
  'fee_year_no',
  'feeYearNo',
  'feeYearNumber',
  'course_fee_year',
  'courseFeeYear',
  'fee_year_number',
  'course_year_no',
  'courseYearNo',
]

/** `s_fee_std_ledger` — year-level amounts on every fee-head row (Angular fee tab). */
const YR_GROSS_KEYS = ['Yr_gross_amount', 'Yr_Gross_Amount', 'yr_gross_amount'] as const
const YR_NET_KEYS = ['Yr_net_amount', 'Yr_Net_Amount', 'yr_net_amount'] as const
const YR_PAID_KEYS = ['Yr_paid_amount', 'Yr_Paid_Amount', 'yr_paid_amount'] as const
const YR_BALANCE_KEYS = ['Yr_balance_amount', 'Yr_Balance_Amount', 'yr_balance_amount'] as const
const YR_DISCOUNT_KEYS = ['Yr_discount_amount', 'Yr_Discount_Amount', 'yr_discount_amount'] as const

const TOT_GROSS_KEYS = ['tot_gross_amount', 'tot_Gross_Amount', 'Tot_Gross_Amount'] as const
const TOT_NET_KEYS = ['tot_net_amount', 'tot_Net_Amount', 'Tot_Net_Amount'] as const
const TOT_PAID_KEYS = ['tot_paid_amount', 'tot_Paid_Amount', 'Tot_Paid_Amount'] as const
const TOT_BALANCE_KEYS = ['tot_balance_amount', 'tot_Balance_Amount', 'Tot_Balance_Amount'] as const
const TOT_DISCOUNT_KEYS = ['tot_discount_amount', 'tot_Discount_Amount'] as const

const LEDGER_COLLEGE_KEYS = ['college_amount', 'College_Amount', 'collegeAmount'] as const

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[_\s-]/g, '')
}

function rowKeyIndex(row: AnyRow): Map<string, unknown> {
  const m = new Map<string, unknown>()
  for (const [k, v] of Object.entries(row)) {
    m.set(normalizeKey(k), v)
  }
  return m
}

function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const s = String(value).replaceAll(',', '').trim()
  if (!s || s === '-') return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

function textCI(row: AnyRow, keys: string[]): string {
  const idx = rowKeyIndex(row)
  for (const key of keys) {
    const value = idx.get(normalizeKey(key))
    if (value != null && String(value).trim() !== '') return String(value).trim()
  }
  return ''
}

function readAmountCI(row: AnyRow, keys: readonly string[]): number | null {
  const idx = rowKeyIndex(row)
  for (const key of keys) {
    const n = parseNumber(idx.get(normalizeKey(key)))
    if (n != null) return n
  }
  return null
}

function readAmountByKeyPattern(row: AnyRow, pattern: RegExp, exclude?: RegExp): number | null {
  for (const [key, value] of Object.entries(row)) {
    const nk = normalizeKey(key)
    if (!pattern.test(nk)) continue
    if (exclude?.test(nk)) continue
    const n = parseNumber(value)
    if (n != null) return n
  }
  return null
}

const GROSS_EXCLUDE = /due|paid|balance|cumulative|cummulative|received|discount|net|college|rtf|totaldue|total_due/

function readExplicitZero(row: AnyRow, keys: readonly string[]): boolean {
  const idx = rowKeyIndex(row)
  return keys.some((key) => {
    const v = idx.get(normalizeKey(key))
    return v === 0 || v === '0'
  })
}

function partitionYearKeys(keys: readonly string[]): { yearKeys: string[]; mainKeys: string[] } {
  const yearKeys: string[] = []
  const mainKeys: string[] = []
  for (const k of keys) {
    if (/year/i.test(k)) yearKeys.push(k)
    else mainKeys.push(k)
  }
  return { yearKeys, mainKeys }
}

function hasAnyKey(row: AnyRow, keys: string[]): boolean {
  const idx = rowKeyIndex(row)
  return keys.some((k) => idx.has(normalizeKey(k)))
}

/**
 * Per-year ledger fields (`P_year_*`) win over cumulative `P_gross` / `P_net`.
 * Never use Math.min across installment/head sub-amounts (e.g. 1,000 vs 1,58,000).
 */
function readYearScopedAmount(
  row: AnyRow,
  keys: readonly string[],
  allowZero = false,
): number | null {
  const { yearKeys, mainKeys } = partitionYearKeys(keys)
  const idx = rowKeyIndex(row)

  if (yearKeys.length > 0) {
    if (allowZero && readExplicitZero(row, yearKeys)) return 0
    for (const key of yearKeys) {
      const n = parseNumber(idx.get(normalizeKey(key)))
      if (n != null && (allowZero ? n >= 0 : n > 0)) return n
    }
    if (hasAnyKey(row, yearKeys)) return allowZero ? 0 : null
  }

  if (allowZero && readExplicitZero(row, mainKeys)) return 0
  for (const key of mainKeys) {
    const n = parseNumber(idx.get(normalizeKey(key)))
    if (n != null && (allowZero ? n >= 0 : n > 0)) return n
  }

  return null
}

/** First matching key only — never Math.min across `fee_amount` + `P_gross_amount`. */
function readFirstAmount(row: AnyRow, keys: readonly string[], allowZero = false): number | null {
  if (allowZero && readExplicitZero(row, keys)) return 0
  const n = readAmountCI(row, keys)
  if (n == null) return null
  if (allowZero) return n
  return n > 0 ? n : null
}

const LEDGER_GROSS_KEYS = [
  'P_gross_amount',
  'P_GROSS_AMOUNT',
  'P_Gross_Amount',
  'gross_amount',
  'Gross_Amount',
  'GROSS_AMOUNT',
] as const

const YEAR_GROSS_KEYS = [
  'P_year_gross_amount',
  'P_Year_Gross_Amount',
  'year_gross_amount',
  'Year_Gross_Amount',
] as const

const LEDGER_NET_KEYS = ['P_net_amount', 'P_NET_AMOUNT', 'net_amount', 'NET_Amount'] as const
const YEAR_NET_KEYS = ['P_year_net_amount', 'P_Year_Net_Amount', 'year_net_amount'] as const

const LEDGER_PAID_KEYS = ['P_paid_amount', 'P_PAID_AMOUNT', 'paid_amount', 'Paid_Amount'] as const
const YEAR_PAID_KEYS = ['P_year_paid_amount', 'P_Year_Paid_Amount', 'year_paid_amount'] as const

const LEDGER_DUE_COLLEGE_KEYS = [
  'P_due_college_amount',
  'P_DUE_COLLEGE_AMOUNT',
  'due_college_amount',
  'Due_College_Amount',
] as const
const YEAR_DUE_COLLEGE_KEYS = [
  'P_year_due_college_amount',
  'P_Year_Due_College_Amount',
  'year_due_college_amount',
] as const

function isPerYearAmountKey(nk: string): boolean {
  return (
    /yeargross|yearnet|yearpaid|yeardue|yearfee|yearamount/.test(nk) ||
    /year[1-4]/.test(nk) ||
    /[1-4]year/.test(nk)
  )
}

function scanRowAmount(row: AnyRow, include: RegExp, exclude?: RegExp): number | null {
  const found: number[] = []
  for (const [key, value] of Object.entries(row)) {
    const nk = normalizeKey(key)
    if (!include.test(nk)) continue
    if (exclude?.test(nk)) continue
    if (isPerYearAmountKey(nk)) continue
    const n = parseNumber(value)
    if (n != null && n > 0) found.push(n)
  }
  if (found.length === 0) return null
  return found.length === 1 ? found[0] : Math.max(...found)
}

/** Per-year total — prefer ledger `P_gross_amount`, else max of plausible annual fields (not cumulative). */
function readRawGross(row: AnyRow, yearNo?: number): number | null {
  const ledger = readFirstAmount(row, LEDGER_GROSS_KEYS)
  const yearGross = readFirstAmount(row, YEAR_GROSS_KEYS)
  const college = readFirstAmount(row, AMOUNT_KEYS.collegeAmount)
  const scanned = scanRowAmount(row, /gross/, /due|paid|balance|net|rtf|discount|feeamount|feehead|installment|category/)

  if (yearNo != null && yearNo >= 3) {
    if (yearGross != null && yearGross > 0) return yearGross
    return null
  }

  if (ledger != null && yearGross != null && ledger > yearGross * 2) return yearGross

  const candidates = [ledger, yearGross, college, scanned].filter(
    (n): n is number => n != null && n > 0,
  )
  if (candidates.length > 0) return Math.max(...candidates)

  return readFirstAmount(row, AMOUNT_KEYS.totalAmount)
}

function readRawNet(row: AnyRow, yearNo?: number): number | null {
  const ledger = readFirstAmount(row, LEDGER_NET_KEYS)
  const yearNet = readFirstAmount(row, YEAR_NET_KEYS)
  const gross = readRawGross(row, yearNo)
  const scanned = scanRowAmount(row, /net/, /gross|rtf|college|discount|due/)

  if (yearNo != null && yearNo >= 3) {
    if (yearNet != null && yearNet > 0) return yearNet
    return null
  }

  if (ledger != null && yearNet != null && ledger > yearNet * 2) return yearNet

  const candidates = [yearNet, ledger, gross, scanned].filter((n): n is number => n != null && n > 0)
  if (candidates.length > 0) return Math.max(...candidates)

  return readFirstAmount(row, AMOUNT_KEYS.netAmount)
}

function readRawPaid(row: AnyRow, yearNo?: number): number | null {
  if (yearNo != null && yearNo >= 3) {
    return readFirstAmount(row, YEAR_PAID_KEYS, true)
  }

  if (hasAnyKey(row, [...YEAR_PAID_KEYS])) {
    return readFirstAmount(row, YEAR_PAID_KEYS, true)
  }

  const ledger = readFirstAmount(row, LEDGER_PAID_KEYS, true)
  const yearPaid = readFirstAmount(row, YEAR_PAID_KEYS, true)
  if (ledger != null && yearPaid != null && ledger > yearPaid * 2) return yearPaid
  if (yearPaid != null) return yearPaid
  if (ledger != null) return ledger
  return readFirstAmount(row, AMOUNT_KEYS.paidAmount, true)
}

function readRawDueCollege(row: AnyRow, yearNo?: number): number | null {
  if (yearNo != null && yearNo >= 3) {
    return readFirstAmount(row, YEAR_DUE_COLLEGE_KEYS, true)
  }

  if (hasAnyKey(row, [...YEAR_DUE_COLLEGE_KEYS])) {
    return readFirstAmount(row, YEAR_DUE_COLLEGE_KEYS, true)
  }

  const ledger = readFirstAmount(row, LEDGER_DUE_COLLEGE_KEYS, true)
  const yearDue = readFirstAmount(row, YEAR_DUE_COLLEGE_KEYS, true)
  if (ledger != null && yearDue != null && ledger > yearDue * 2) return yearDue
  if (yearDue != null) return yearDue
  if (ledger != null) return ledger
  return readFirstAmount(row, AMOUNT_KEYS.dueCollegeAmount, true)
}

function hasYearScopedGross(row: AnyRow): boolean {
  return readFirstAmount(row, LEDGER_GROSS_KEYS) != null
}

function discoverAmounts(row: AnyRow): Partial<Record<AmountField, number | null>> {
  const out: Partial<Record<AmountField, number | null>> = {}
  for (const [key, value] of Object.entries(row)) {
    const nk = normalizeKey(key)
    const n = parseNumber(value)
    if (n == null) continue
    if (/gross/.test(nk)) {
      out.totalAmount ??= n
    } else if (/rtfamount/.test(nk) && !/due|received/.test(nk)) {
      out.rtfAmount ??= n
    } else if (/collegeamount/.test(nk) && !/due|discount/.test(nk)) {
      out.collegeAmount ??= n
    } else if (/collegediscount/.test(nk)) {
      out.collegeDiscount ??= n
    } else if (/netamount/.test(nk)) {
      out.netAmount ??= n
    } else if (/paidamount/.test(nk) || nk === 'paid') {
      out.paidAmount ??= n
    } else if (/duecollege/.test(nk)) {
      out.dueCollegeAmount ??= n
    } else if (/rtfreceived/.test(nk)) {
      out.rtfReceived ??= n
    } else if (/duertf/.test(nk)) {
      out.dueRtfAmount ??= n
    } else if (/totaldue/.test(nk) || nk === 'balanceamount' || (nk === 'due' && out.totalDue == null)) {
      out.totalDue ??= n
    }
  }
  return out
}

function isObjectRow(item: unknown): item is AnyRow {
  return item != null && typeof item === 'object' && !Array.isArray(item)
}

function rowsFromTabularPayload(o: AnyRow): AnyRow[] | null {
  const names = o.columnNames ?? o.column_names ?? o.columns
  const values = o.data ?? o.rows ?? o.values
  if (!Array.isArray(names) || !Array.isArray(values)) return null
  const cols = names.map((c) => String(c))
  const out: AnyRow[] = []
  for (const row of values) {
    if (Array.isArray(row)) {
      const obj: AnyRow = {}
      cols.forEach((col, i) => {
        obj[col] = row[i]
      })
      out.push(obj)
    } else if (isObjectRow(row)) {
      out.push(row)
    }
  }
  return out.length > 0 ? out : null
}

/** Unwrap stored-proc payloads (`data`, `result`, nested arrays, tabular shapes). */
export function unwrapFeeLedgerRows(data: unknown, depth = 0): AnyRow[] {
  if (data == null || depth > 8) return []

  if (Array.isArray(data)) {
    if (data.length === 0) return []
    if (data.every((item) => Array.isArray(item))) {
      return (data as unknown[][]).flat().filter(isObjectRow) as AnyRow[]
    }
    if (data.length > 0 && Array.isArray(data[0])) {
      return (data as unknown[][]).flat().filter(isObjectRow) as AnyRow[]
    }
    if (data.every(isObjectRow)) return data as AnyRow[]
    return data.flatMap((item) => unwrapFeeLedgerRows(item, depth + 1))
  }

  if (typeof data === 'object') {
    const o = data as AnyRow
    const tabular = rowsFromTabularPayload(o)
    if (tabular) return tabular

    for (const k of ['resultList', 'result', 'data', 'rows', 'list', 'feeDetails', 'records']) {
      const v = o[k]
      if (v == null) continue
      const inner = unwrapFeeLedgerRows(v, depth + 1)
      if (inner.length > 0) return inner
    }

    for (const v of Object.values(o)) {
      const inner = unwrapFeeLedgerRows(v, depth + 1)
      if (inner.length > 0) return inner
    }
  }

  return []
}

function unwrapProcApiBody(body: ApiResponse<unknown> & { result?: unknown; resultList?: unknown }): unknown {
  if (body.data != null) return body.data
  if (body.resultList != null) return body.resultList
  if (body.result != null) return body.result
  return body
}

/** Fetch fee ledger with full Spring envelope (`data` / `resultList` / `result`). */
export async function fetchFeeLedgerRows(
  params: Record<string, string | number>,
): Promise<AnyRow[]> {
  const searchParams = new URLSearchParams(
    Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
  )
  const url = `${NEXT_API.PROXY(FEE_API.FEE_STD_LEDGER)}?${searchParams}`
  const res = await fetch(url, { cache: 'no-store', credentials: 'include' })
  if (!res.ok) return []
  const body = (await res.json()) as ApiResponse<unknown> & { result?: unknown; resultList?: unknown }
  if (!body.success) return []
  return unwrapFeeLedgerRows(unwrapProcApiBody(body))
}

export function isFeeHeadDetailRow(row: AnyRow): boolean {
  if (
    textCI(row, [
      'fee_category_name',
      'fee_category_code',
      'fee_category',
      'feeHeadName',
      'fee_head_name',
      'fee_head',
      'particularName',
      'particular_name',
      'Particular_Name',
      'feeParticular',
      'fee_particular',
      'feeTypeName',
      'fee_type_name',
      'headName',
      'P_fee_particular',
      'P_Fee_Head_Name',
      'P_fee_head_name',
    ])
  ) {
    return true
  }
  return false
}

function isTotalRow(row: AnyRow): boolean {
  const label = textCI(row, YEAR_LABEL_KEYS).toLowerCase()
  if (label === 'total' || label === 'grand total' || label === 'grandtotal') return true
  const rowType = String(
    row.row_type ?? row.rowType ?? row.ROW_TYPE ?? row.P_row_type ?? row.P_Row_Type ?? '',
  ).toUpperCase()
  if (rowType === 'TOTAL' || rowType === 'GRANDTOTAL' || rowType === 'GRAND_TOTAL') return true
  return row.isTotal === true || row.is_total === true
}

function hasAnyFeeSignal(row: AnyRow): boolean {
  const yearKey = normalizeCourseFeeYearKey(row)
  const yearNo = typeof yearKey === 'number' ? yearKey : undefined
  const gross = readRawGross(row, yearNo)
  if (gross != null && gross > 0) return true
  const parsed = parseFeeRow(row)
  return (
    (parsed.paidAmount != null && parsed.paidAmount > 0) ||
    (parsed.totalDue != null && parsed.totalDue > 0) ||
    parsed.collegeAmount != null ||
    parsed.rtfReceived != null ||
    parsed.dueRtfAmount != null ||
    parsed.rtfAmount != null
  )
}

/** Years 3–4 with no annual gross — Angular shows `-` on most cols, `0` on college + RTF cols. */
function isSparseFeeYear(
  row: StudentFeeYearRow,
  yearNo: number,
  raw?: AnyRow,
  priorYearGrossSum?: number | null,
): boolean {
  if (yearNo < 3) return false

  const yearGross = raw ? readRawGross(raw, yearNo) : row.totalAmount

  if (yearGross == null || yearGross === 0) return true
  if (priorYearGrossSum != null && priorYearGrossSum > 0 && yearGross === priorYearGrossSum) return true
  return false
}

/** Match dev2 display: `0` for RTF/discount on active rows; `-` only when no fee for that year. */
function applyAngularFeeDefaults(row: StudentFeeYearRow): StudentFeeYearRow {
  const gross = row.totalAmount
  const hasFee = gross != null && gross > 0

  if (row.isTotal || hasFee) {
    const net = row.netAmount ?? gross ?? null
    const paid = row.paidAmount ?? 0
    const dueCollege =
      row.dueCollegeAmount ??
      (net != null ? Math.max(0, net - paid) : row.isTotal ? null : 0)
    const dueRtf = row.dueRtfAmount ?? 0
    const totalDue = row.totalDue ?? (dueCollege != null ? dueCollege + dueRtf : null)

    return {
      ...row,
      rtfAmount: row.rtfAmount ?? 0,
      collegeAmount: row.collegeAmount ?? gross ?? net,
      collegeDiscount: row.collegeDiscount ?? 0,
      netAmount: net,
      paidAmount: paid,
      dueCollegeAmount: dueCollege,
      rtfReceived: row.rtfReceived ?? 0,
      dueRtfAmount: dueRtf,
      totalDue,
    }
  }

  return row
}

function finalizeYearRow(
  row: StudentFeeYearRow,
  yearNo: number,
  raw?: AnyRow,
  priorYearGrossSum?: number | null,
): StudentFeeYearRow {
  if (row.isTotal || !isSparseFeeYear(row, yearNo, raw, priorYearGrossSum)) {
    return applyAngularFeeDefaults(row)
  }

  return {
    ...row,
    year: `${yearNo} year`,
    totalAmount: null,
    rtfAmount: null,
    collegeDiscount: null,
    netAmount: null,
    paidAmount: null,
    dueCollegeAmount: null,
    totalDue: null,
    collegeAmount: 0,
    rtfReceived: 0,
    dueRtfAmount: 0,
  }
}

function isStdFeeLedgerShape(rows: AnyRow[]): boolean {
  return rows.some((r) => hasAnyKey(r, [...YR_GROSS_KEYS]))
}

function parseCourseYearNumber(row: AnyRow): number | null {
  const idx = rowKeyIndex(row)
  const direct = parseNumber(idx.get('year'))
  if (direct != null && direct >= 1 && direct <= 4) return direct

  const key = normalizeCourseFeeYearKey(row)
  return typeof key === 'number' ? key : null
}

function groupStdFeeLedgerByYear(rows: AnyRow[]): Map<number, AnyRow> {
  const map = new Map<number, AnyRow>()
  for (const raw of rows) {
    const yearNo = parseCourseYearNumber(raw)
    if (yearNo == null) continue
    if (!map.has(yearNo)) map.set(yearNo, raw)
  }
  return map
}

/** Map one `s_fee_std_ledger` row — `Yr_*` fields are year totals (same on every fee head). */
function parseStdFeeLedgerYearRow(raw: AnyRow, yearNo: number): StudentFeeYearRow {
  const gross = readFirstAmount(raw, YR_GROSS_KEYS)
  const net = readFirstAmount(raw, YR_NET_KEYS)
  const paid = readFirstAmount(raw, YR_PAID_KEYS, true)
  const balance = readFirstAmount(raw, YR_BALANCE_KEYS, true)
  const discount = readFirstAmount(raw, YR_DISCOUNT_KEYS, true)
  const college = readFirstAmount(raw, LEDGER_COLLEGE_KEYS)
  const dueCollege =
    readFirstAmount(raw, ['due_college_amount', 'Due_College_Amount', 'P_college_due_amount'], true) ??
    balance

  const resolvedCollege = college != null && college > 0 ? college : gross

  return {
    year: `${yearNo} year`,
    isTotal: false,
    totalAmount: gross,
    rtfAmount: 0,
    collegeAmount: resolvedCollege,
    collegeDiscount: discount ?? 0,
    netAmount: net ?? gross,
    paidAmount: paid,
    dueCollegeAmount: dueCollege,
    rtfReceived: 0,
    dueRtfAmount: readFirstAmount(raw, ['due_rtf_amount', 'P_due_rtf_amount'], true) ?? 0,
    totalDue: balance,
  }
}

function parseStdFeeLedgerTotalRow(rows: AnyRow[]): StudentFeeYearRow {
  const raw = rows[0]
  const gross = readFirstAmount(raw, TOT_GROSS_KEYS)
  const net = readFirstAmount(raw, TOT_NET_KEYS)
  const paid = readFirstAmount(raw, TOT_PAID_KEYS, true)
  const balance = readFirstAmount(raw, TOT_BALANCE_KEYS, true)
  const discount = readFirstAmount(raw, TOT_DISCOUNT_KEYS, true)

  return {
    year: 'Total',
    isTotal: true,
    totalAmount: gross,
    rtfAmount: 0,
    collegeAmount: gross,
    collegeDiscount: discount ?? 0,
    netAmount: net ?? gross,
    paidAmount: paid,
    dueCollegeAmount: balance,
    rtfReceived: 0,
    dueRtfAmount: 0,
    totalDue: balance,
  }
}

function buildStudentFeeViewFromStdLedger(rows: AnyRow[]): StudentFeeView {
  const byYear = groupStdFeeLedgerByYear(rows)
  const yearRows: StudentFeeYearRow[] = []
  let priorGrossSum: number | null = null

  for (const n of COURSE_FEE_YEARS) {
    const raw = byYear.get(n)
    let row = raw ? parseStdFeeLedgerYearRow(raw, n) : emptyYearRow(n)
    row = finalizeYearRow(row, n, raw, priorGrossSum)
    yearRows.push(row)
    const g = row.totalAmount
    if (g != null && g > 0) priorGrossSum = (priorGrossSum ?? 0) + g
  }

  const totalRow = applyAngularFeeDefaults(parseStdFeeLedgerTotalRow(rows))
  return { rows: [...yearRows, totalRow] }
}

export function normalizeCourseFeeYearKey(row: AnyRow): number | 'total' | null {
  if (isTotalRow(row)) return 'total'

  const label = textCI(row, YEAR_LABEL_KEYS)
  if (label) {
    const yearWord =
      /^(\d+)\s*year\b/i.exec(label) ??
      /^year\s*(\d+)\b/i.exec(label) ??
      /^(\d+)(?:st|nd|rd|th)\s*year\b/i.exec(label)
    if (yearWord) {
      const n = Number(yearWord[1])
      if (n >= 1 && n <= 4) return n
    }
    if (/^(\d+)$/.test(label)) {
      const n = Number(label)
      if (n >= 1 && n <= 4) return n
    }
    if (/^\d{4}(-\d{2,4})?/.test(label)) return null
  }

  for (const key of YEAR_NUMBER_KEYS) {
    const n = parseNumber(rowKeyIndex(row).get(normalizeKey(key)) ?? row[key])
    if (n != null && n >= 1 && n <= 4) return n
  }

  return null
}

export function isCourseFeeSummaryRow(row: AnyRow): boolean {
  return normalizeCourseFeeYearKey(row) !== null
}

function parseFeeRow(row: AnyRow, yearNo?: number): StudentFeeYearRow {
  const total = yearNo == null && isTotalRow(row)
  const discovered = discoverAmounts(row)
  const pick = (field: AmountField, pattern: RegExp, exclude?: RegExp) =>
    discovered[field] ??
    readAmountCI(row, AMOUNT_KEYS[field]) ??
    readAmountByKeyPattern(row, pattern, exclude)
  const gross =
    readRawGross(row, yearNo) ??
    (total ? readAmountByKeyPattern(row, /gross/i, /due|paid|rtf|college|net|discount/) : null)

  const year =
    yearNo != null && yearNo >= 1 && yearNo <= 4
      ? `${yearNo} year`
      : total
        ? 'Total'
        : (() => {
            const key = normalizeCourseFeeYearKey(row)
            return typeof key === 'number' ? `${key} year` : textCI(row, YEAR_LABEL_KEYS)
          })()

  const collegeAmount = pick('collegeAmount', /collegeamount/i, /due|discount/)
  const rtfAmount = pick('rtfAmount', /rtfamount/i, /due|received/)
  const collegeDiscount = pick('collegeDiscount', /collegediscount/i)

  const resolvedCollege =
    collegeAmount != null && collegeAmount > 0
      ? collegeAmount
      : gross != null && gross > 0 && (rtfAmount == null || rtfAmount === 0)
        ? gross
        : collegeAmount

  let netAmount: number | null
  let paidAmount: number | null
  let dueCollegeAmount: number | null

  if (total) {
    netAmount = readAmountCI(row, AMOUNT_KEYS.netAmount) ?? gross
    paidAmount = readAmountCI(row, AMOUNT_KEYS.paidAmount)
    if (paidAmount == null && readExplicitZero(row, AMOUNT_KEYS.paidAmount)) paidAmount = 0
    dueCollegeAmount = readAmountCI(row, AMOUNT_KEYS.dueCollegeAmount)
    if (dueCollegeAmount == null && readExplicitZero(row, AMOUNT_KEYS.dueCollegeAmount)) dueCollegeAmount = 0
  } else {
    netAmount = readRawNet(row, yearNo)
    paidAmount = readRawPaid(row, yearNo)
    dueCollegeAmount = readRawDueCollege(row, yearNo)

    if (gross != null && gross > 0) {
      if (netAmount == null || netAmount > gross) {
        netAmount = gross - (collegeDiscount ?? 0) - (rtfAmount ?? 0)
      }
      if (paidAmount != null && paidAmount > gross) {
        paidAmount = readRawPaid(row)
      }
      if (dueCollegeAmount == null) {
        dueCollegeAmount = Math.max(0, netAmount - (paidAmount ?? 0))
      } else if (dueCollegeAmount > gross && netAmount != null && netAmount <= gross) {
        dueCollegeAmount = Math.max(0, netAmount - (paidAmount ?? 0))
      }
    }
  }

  if (netAmount != null && netAmount < 0) netAmount = null
  if (paidAmount != null && paidAmount < 0) paidAmount = null
  if (dueCollegeAmount != null && dueCollegeAmount < 0) dueCollegeAmount = 0

  const dueRtfAmount = pick('dueRtfAmount', /duertf/i) ?? 0
  let totalDue = total
    ? (readAmountCI(row, AMOUNT_KEYS.totalDue) ??
      (readExplicitZero(row, AMOUNT_KEYS.totalDue) ? 0 : null))
    : readYearScopedAmount(row, AMOUNT_KEYS.totalDue, true)

  if (totalDue == null && dueCollegeAmount != null) {
    totalDue = dueCollegeAmount + dueRtfAmount
  } else if (totalDue == null && netAmount != null) {
    totalDue = Math.max(0, netAmount - (paidAmount ?? 0) + dueRtfAmount)
  }
  if (totalDue == null && readExplicitZero(row, AMOUNT_KEYS.totalDue)) totalDue = 0

  return {
    year,
    isTotal: total,
    totalAmount: gross,
    rtfAmount,
    collegeAmount: resolvedCollege,
    collegeDiscount,
    netAmount,
    paidAmount,
    dueCollegeAmount,
    rtfReceived: pick('rtfReceived', /rtfreceived/i),
    dueRtfAmount,
    totalDue,
  }
}

function emptyYearRow(yearNo: number, priorYearGrossSum?: number | null): StudentFeeYearRow {
  return finalizeYearRow(
    {
      year: `${yearNo} year`,
      isTotal: false,
      totalAmount: null,
      rtfAmount: null,
      collegeAmount: null,
      collegeDiscount: null,
      netAmount: null,
      paidAmount: null,
      dueCollegeAmount: null,
      rtfReceived: null,
      dueRtfAmount: null,
      totalDue: null,
    },
    yearNo,
    undefined,
    priorYearGrossSum,
  )
}

/** Score row for pick — prefer summary ledger row (has `P_gross_amount`) over fee-head installments. */
function rowPickScore(row: StudentFeeYearRow, raw?: AnyRow): number {
  const yearKey = raw ? normalizeCourseFeeYearKey(raw) : null
  const yearNo = typeof yearKey === 'number' ? yearKey : undefined
  const gross = raw ? readRawGross(raw, yearNo) : row.totalAmount
  const boost = raw && hasYearScopedGross(raw) ? 1_000_000_000 : 0
  return (gross ?? row.totalAmount ?? 0) + boost
}

function pickBetterRow(
  current: StudentFeeYearRow | undefined,
  candidate: StudentFeeYearRow,
  rawCurrent?: AnyRow,
  rawCandidate?: AnyRow,
): StudentFeeYearRow {
  if (!current) return candidate
  return rowPickScore(candidate, rawCandidate) > rowPickScore(current, rawCurrent) ? candidate : current
}

function sumNullable(values: (number | null)[]): number | null {
  let sum = 0
  let seen = false
  for (const v of values) {
    if (v == null) continue
    seen = true
    sum += v
  }
  return seen ? sum : null
}

/**
 * Fee-head lines for the same year often repeat the same gross (e.g. 7× 1,58,000) — pick one.
 * Only sum when gross values differ (component heads).
 */
function mergeFeeYearRows(
  rows: StudentFeeYearRow[],
  rawRows: AnyRow[],
  yearNo: number,
): StudentFeeYearRow {
  if (rows.length === 0) return emptyYearRow(yearNo)
  return rows.reduce((best, row, i) => pickBetterRow(best, row, undefined, rawRows[i]))
}

function buildTotalRow(yearRows: StudentFeeYearRow[]): StudentFeeYearRow {
  return {
    year: 'Total',
    isTotal: true,
    totalAmount: sumNullable(yearRows.map((r) => r.totalAmount)),
    rtfAmount: sumNullable(yearRows.map((r) => r.rtfAmount)),
    collegeAmount: sumNullable(yearRows.map((r) => r.collegeAmount)),
    collegeDiscount: sumNullable(yearRows.map((r) => r.collegeDiscount)),
    netAmount: sumNullable(yearRows.map((r) => r.netAmount)),
    paidAmount: sumNullable(yearRows.map((r) => r.paidAmount)),
    dueCollegeAmount: sumNullable(yearRows.map((r) => r.dueCollegeAmount)),
    rtfReceived: sumNullable(yearRows.map((r) => r.rtfReceived)),
    dueRtfAmount: sumNullable(yearRows.map((r) => r.dueRtfAmount)),
    totalDue: sumNullable(yearRows.map((r) => r.totalDue)),
  }
}

type YearBucket = {
  summary: StudentFeeYearRow | null
  summaryRaw: AnyRow | null
  heads: StudentFeeYearRow[]
  headRaws: AnyRow[]
}

function assignYearsByOrder(rows: AnyRow[]): Map<number, AnyRow> {
  const candidates = rows.filter((r) => !isTotalRow(r) && hasAnyFeeSignal(r))
  const sorted = [...candidates].sort((a, b) => {
    const ya = normalizeCourseFeeYearKey(a)
    const yb = normalizeCourseFeeYearKey(b)
    if (typeof ya === 'number' && typeof yb === 'number') return ya - yb
    const la = textCI(a, YEAR_LABEL_KEYS)
    const lb = textCI(b, YEAR_LABEL_KEYS)
    return la.localeCompare(lb, undefined, { numeric: true })
  })
  const map = new Map<number, AnyRow>()
  sorted.slice(0, 4).forEach((row, index) => {
    map.set(index + 1, row)
  })
  return map
}

/** One ledger row per course year (+ total) — prefer summary line with `P_gross_amount`. */
function collapseLedgerRowsByYear(rows: AnyRow[]): AnyRow[] {
  if (rows.length === 0) return rows

  const byYear = new Map<number | 'total', AnyRow[]>()
  for (const raw of rows) {
    const key = normalizeCourseFeeYearKey(raw)
    if (key == null) continue
    const list = byYear.get(key) ?? []
    list.push(raw)
    byYear.set(key, list)
  }

  const pickBest = (list: AnyRow[], yearNo?: number): AnyRow | null => {
    if (list.length === 0) return null
    const summaries = list.filter((r) => !isFeeHeadDetailRow(r))
    const pool = summaries.length > 0 ? summaries : list
    return pool.reduce<AnyRow | null>((best, raw) => {
      if (!best) return raw
      const score = (readRawGross(raw, yearNo) ?? 0) + (hasYearScopedGross(raw) ? 1_000_000_000 : 0)
      const bestScore = (readRawGross(best, yearNo) ?? 0) + (hasYearScopedGross(best) ? 1_000_000_000 : 0)
      return score > bestScore ? raw : best
    }, null)
  }

  const out: AnyRow[] = []
  for (const n of COURSE_FEE_YEARS) {
    const raw = pickBest(byYear.get(n) ?? [], n)
    if (raw) out.push(raw)
  }
  const total = pickBest(byYear.get('total') ?? [])
  if (total) out.push(total)

  return out.length > 0 ? out : rows
}

export function buildStudentFeeView(rowsInput: unknown): StudentFeeView {
  const allRows = unwrapFeeLedgerRows(rowsInput)
  if (allRows.length === 0) {
    return { rows: [...COURSE_FEE_YEARS.map(emptyYearRow), buildTotalRow([])] }
  }

  if (isStdFeeLedgerShape(allRows)) {
    return buildStudentFeeViewFromStdLedger(allRows)
  }

  const rows = collapseLedgerRowsByYear(allRows)

  const buckets = new Map<number, YearBucket>()
  const bucketRaw = new Map<number, AnyRow>()
  let totalFromApi: StudentFeeYearRow | null = null

  for (const raw of rows) {
    const key = normalizeCourseFeeYearKey(raw)
    if (key === 'total') {
      const parsedTotal = parseFeeRow(raw)
      totalFromApi = pickBetterRow(totalFromApi ?? undefined, parsedTotal, undefined, raw)
      continue
    }
    if (key == null) continue

    const parsed = parseFeeRow(raw, key)
    const bucket = buckets.get(key) ?? { summary: null, summaryRaw: null, heads: [], headRaws: [] }

    if (isFeeHeadDetailRow(raw)) {
      bucket.heads.push(parsed)
      bucket.headRaws.push(raw)
    } else {
      bucket.summary = pickBetterRow(bucket.summary ?? undefined, parsed, bucket.summaryRaw ?? undefined, raw)
      bucket.summaryRaw = raw
      bucketRaw.set(key, raw)
    }
    buckets.set(key, bucket)
  }

  if (buckets.size < 4) {
    for (const raw of rows) {
      if (isTotalRow(raw)) continue
      const key = normalizeCourseFeeYearKey(raw)
      if (key == null || typeof key !== 'number' || buckets.has(key)) continue
      if (isFeeHeadDetailRow(raw)) continue
      buckets.set(key, {
        summary: parseFeeRow(raw, key),
        summaryRaw: raw,
        heads: [],
        headRaws: [],
      })
      bucketRaw.set(key, raw)
    }
  }

  if (buckets.size === 0) {
    const ordered = assignYearsByOrder(rows)
    for (const [yearNo, raw] of ordered) {
      buckets.set(yearNo, { summary: parseFeeRow(raw, yearNo), summaryRaw: raw, heads: [], headRaws: [] })
      bucketRaw.set(yearNo, raw)
    }
  }

  const yearRows: StudentFeeYearRow[] = []
  let priorGrossSum: number | null = null

  for (const n of COURSE_FEE_YEARS) {
    const bucket = buckets.get(n)
    const raw = bucket?.summaryRaw ?? bucketRaw.get(n)
    let row: StudentFeeYearRow
    if (!bucket) row = emptyYearRow(n, priorGrossSum)
    else if (bucket.summary) row = bucket.summary
    else if (bucket.heads.length > 0) row = mergeFeeYearRows(bucket.heads, bucket.headRaws, n)
    else row = emptyYearRow(n, priorGrossSum)
    row = finalizeYearRow(row, n, raw, priorGrossSum)
    yearRows.push(row)
    const g = row.totalAmount
    if (g != null && g > 0) priorGrossSum = (priorGrossSum ?? 0) + g
  }

  const totalRow = applyAngularFeeDefaults(totalFromApi ?? buildTotalRow(yearRows))

  return { rows: [...yearRows, totalRow] }
}

export function formatFeeCell(value: number | null): string {
  if (value == null) return '-'
  return value.toLocaleString('en-IN')
}
