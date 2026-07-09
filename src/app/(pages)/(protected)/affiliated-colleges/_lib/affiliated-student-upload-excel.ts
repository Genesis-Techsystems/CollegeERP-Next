import * as XLSX from 'xlsx'
import { pickAffiliatedText } from './enrich-affiliated-summary-rows'

type AnyRow = Record<string, unknown>

export type AffiliatedStudentTemplateMeta = {
  organization: string
  universityCode: string
  collegeCode: string
  academicYear: string
  courseCode: string
  courseGroup: string
  courseYear: string
}

function asRows(value: unknown): AnyRow[] {
  if (Array.isArray(value)) return value as AnyRow[]
  if (value && typeof value === 'object') return [value as AnyRow]
  return []
}

function readOrgCode(): string {
  if (typeof globalThis.localStorage === 'undefined') return ''
  return globalThis.localStorage.getItem('orgCode') ?? ''
}

/** Angular `getHeaderValue()` — push filter context into `sampleExcelData[10]`. */
export function enrichAffiliatedStudentTemplate(
  sampleExcelData: unknown[][],
  meta: AffiliatedStudentTemplateMeta,
): unknown[][] {
  const copy = sampleExcelData.map((group) => (Array.isArray(group) ? [...group] : group)) as unknown[][]
  const headerRow: AnyRow = {
    Organization: meta.organization,
    University: meta.universityCode,
    College: meta.collegeCode,
    AcademicYear: meta.academicYear,
    Course: meta.courseCode,
    Group: meta.courseGroup,
    CourseYear: meta.courseYear,
    count: 1,
  }
  const existing = asRows(copy[10])
  copy[10] = existing.length > 0 ? [{ ...existing[0], ...headerRow, count: existing[0].count ?? 1 }] : [headerRow]
  return copy
}

function getTemplateHeaders(sampleExcelData: unknown[][]): string[] {
  const raw = sampleExcelData[0]
  if (!Array.isArray(raw) || raw.length === 0) return []
  const first = raw[0]
  if (first && typeof first === 'object' && !Array.isArray(first)) {
    return Object.keys(first as AnyRow)
  }
  if (typeof first === 'string') {
    return raw.map((cell) => String(cell ?? ''))
  }
  return []
}

function pickHallTicketText(ht: AnyRow, keys: string[]): string {
  return pickAffiliatedText(ht, keys)
}

function applyHallTicketAutofill(template: AnyRow, headers: string[], ht: AnyRow): void {
  const hallTicket = pickHallTicketText(ht, ['hallticket_number', 'hallTicketNumber', 'hallticketNumber'])
  if (headers.includes('HallTicketNumber')) template.HallTicketNumber = hallTicket
  if (headers.includes('HallTicket')) template.HallTicket = hallTicket
  if (headers.includes('Batch')) template.Batch = pickHallTicketText(ht, ['batch_name', 'batchName'])
  if (headers.includes('Regulation')) {
    template.Regulation = pickHallTicketText(ht, ['regulation_code', 'regulationCode'])
  }
  if (headers.includes('Group')) {
    template.Group = pickHallTicketText(ht, ['group_code', 'groupCode', 'group_name', 'groupName'])
  }
}

function downloadXlsx(fileName: string, rows: string[][], sheetName = 'Sheet1'): void {
  if (typeof window === 'undefined') return
  const ws = XLSX.utils.aoa_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  const outName = fileName.toLowerCase().endsWith('.xlsx')
    ? fileName
    : fileName.replace(/\.xls$/i, '.xlsx')
  XLSX.writeFile(wb, outName.endsWith('.xlsx') ? outName : `${outName}.xlsx`)
}

/** Angular `sampleExcelData[2]` — existing students count metadata group. */
export function getAffiliatedExistingStudentsMeta(
  sampleExcelData: unknown[][] | null | undefined,
): AnyRow[] | null {
  const group = sampleExcelData?.[2]
  return Array.isArray(group) && group.length > 0 ? (group as AnyRow[]) : null
}

export function pickAffiliatedExistingStudentsCount(meta: AnyRow[] | null): number {
  if (!meta?.length) return 0
  const row = meta[0] ?? {}
  const raw = row.uploaded_students_count ?? row.uploadedStudentsCount ?? row.count ?? 0
  const n = Number(raw)
  return Number.isFinite(n) ? n : 0
}

export function buildAffiliatedStudentTemplateMeta(input: {
  universityCode?: string
  collegeCode?: string
  academicYear?: string
  courseCode?: string
  courseGroup?: string
  courseYear?: string
}): AffiliatedStudentTemplateMeta {
  return {
    organization: readOrgCode(),
    universityCode: input.universityCode ?? '',
    collegeCode: input.collegeCode ?? '',
    academicYear: input.academicYear ?? '',
    courseCode: input.courseCode ?? '',
    courseGroup: input.courseGroup ?? '',
    courseYear: input.courseYear ?? '',
  }
}

/** Angular `exportToExcel` — template sheet from proc `template` result. */
export function downloadAffiliatedStudentTemplateExcel(
  sampleExcelData: unknown[][],
  fileName: string,
): void {
  const headers = getTemplateHeaders(sampleExcelData)
  const dataRows = asRows(sampleExcelData[10])
  const count = Number(dataRows[0]?.count ?? 1)
  const body: string[][] = [headers]
  for (let i = 0; i < count; i++) {
    const template = { ...(dataRows[0] ?? {}) } as AnyRow
    delete template.count
    body.push(headers.map((key) => String(template[key] ?? '')))
  }
  downloadXlsx(fileName, body, 'Student Data')
}

/** Angular `getExistingStudents` — hall tickets with batch/regulation/group prefilled. */
export function downloadAffiliatedExistingStudentsExcel(
  sampleExcelData: unknown[][],
  fileName: string,
): void {
  const headers = getTemplateHeaders(sampleExcelData)
  const dataRows = asRows(sampleExcelData[10])
  const hallTicketData = asRows(sampleExcelData[3])
  const body: string[][] = [headers]

  const rowCount = hallTicketData.length > 0 ? hallTicketData.length : dataRows[0] ? 1 : 0

  for (let i = 0; i < rowCount; i++) {
    const template = { ...(dataRows[0] ?? {}) } as AnyRow
    delete template.count
    if (hallTicketData.length > 0) {
      applyHallTicketAutofill(template, headers, hallTicketData[i] ?? {})
    }
    body.push(headers.map((key) => String(template[key] ?? '')))
  }

  downloadXlsx(fileName, body, 'Student Data')
}

/** Angular `dictionary` — quota, gender, regulation, batch lookup sheet. */
export function downloadAffiliatedStudentDictionaryExcel(sampleExcelData: unknown[][]): void {
  const quota = asRows(sampleExcelData[4])
  const gender = asRows(sampleExcelData[5])
  const regulation = asRows(sampleExcelData[6])
  const batches = asRows(sampleExcelData[7])
  const district = asRows(sampleExcelData[8])
  const city = asRows(sampleExcelData[9])
  const caste = asRows(sampleExcelData[1])
  const maxRows = Math.max(
    quota.length,
    gender.length,
    regulation.length,
    batches.length,
    district.length,
    city.length,
    caste.length,
  )

  const body: string[][] = [
    ['Quota', '', 'Gender', '', 'Regulation', '', 'Batches', '', 'District', '', 'City', '', 'Caste'],
  ]

  for (let i = 0; i < maxRows; i++) {
    body.push([
      String(quota[i]?.gd_code ?? ''),
      '',
      String(gender[i]?.gd_code ?? ''),
      '',
      String(regulation[i]?.regulation_code ?? ''),
      '',
      String(batches[i]?.batch_name ?? ''),
      '',
      String(district[i]?.district_code ?? ''),
      '',
      String(city[i]?.city_code ?? ''),
      '',
      String(caste[i]?.caste ?? ''),
    ])
  }

  downloadXlsx('Dictionary Data.xlsx', body, 'Dictionary Data')
}
