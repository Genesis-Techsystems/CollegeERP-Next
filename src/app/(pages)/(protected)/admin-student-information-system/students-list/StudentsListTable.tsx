'use client'

import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Mail, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/common/components/select'

type AnyRow = Record<string, any>

const DEFAULT_STUDENT_PHOTO = '/assets/images/avatars/default_Student.png'
const PAGE_SIZES = ['10', '25', '100']

export interface StudentsListTableProps {
  mode: 'student' | 'section'
  rows: AnyRow[]
  headerParts: string[]
  tableFilter: string
  onTableFilterChange: (value: string) => void
  canSendCredentials: boolean
  canNavigateEdit: boolean
  canModalEdit: boolean
  onViewProfile: (row: AnyRow) => void
  onEditNavigate: (row: AnyRow) => void
  onEditModal: (row: AnyRow) => void
  onViewDetails: (row: AnyRow) => void
  onSendCredentials: (row: AnyRow) => void
  onSendBulkCredentials: () => void
}

function pickText(row: AnyRow | null | undefined, keys: string[]): string {
  if (!row) return ''
  for (const k of keys) {
    const v = row[k]
    if (v != null && String(v).trim() !== '') return String(v)
  }
  return ''
}

function pickNum(row: AnyRow | null | undefined, keys: string[]): number {
  if (!row) return 0
  for (const k of keys) {
    const n = Number(row[k])
    if (Number.isFinite(n) && n > 0) return n
  }
  return 0
}

function photoSrc(path: string | null | undefined): string {
  const raw = String(path ?? '').trim()
  if (!raw) return DEFAULT_STUDENT_PHOTO
  return raw.includes('?') ? raw : `${raw}?${Date.now()}`
}

function lateralTag(row: AnyRow): string {
  if (row.isLateral === true) return '(LATERAL)'
  if (row.isLateral == null) return '(REG)'
  return row.isLateral ? '(LATERAL)' : '(REG)'
}

function statusClass(code: string): string {
  switch (code.toUpperCase()) {
    case 'INCOLLEGE':
      return 'text-green-600 font-medium'
    case 'DTND':
      return 'text-red-600 font-medium'
    default:
      return 'text-muted-foreground font-medium'
  }
}

function rowKey(row: AnyRow, index: number): string {
  const id = pickNum(row, ['studentId', 'fk_student_id'])
  return id ? `id:${id}` : `idx:${index}`
}

function ActionLink({
  label,
  onClick,
}: {
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-[11px] text-blue-600 hover:underline font-normal px-0"
    >
      {label}
    </button>
  )
}

function StudentNameCell({
  row,
  onOpenProfile,
}: {
  row: AnyRow
  onOpenProfile: () => void
}) {
  const hallticket = pickText(row, ['hallticketNumber', 'rollNumber'])
  const admission = pickText(row, ['admissionNumber', 'admission_no'])
  const name = pickText(row, ['firstName', 'studentName'])
  const statusCode = pickText(row, ['studentStatusCode'])
  const meta = [
    pickText(row, ['collegeCode', 'college_code']),
    pickText(row, ['academicYear', 'academic_year']),
    pickText(row, ['courseCode', 'course_code']),
    pickText(row, ['groupCode', 'group_code']),
    pickText(row, ['courseYearName', 'course_year_name']),
    pickText(row, ['section', 'group_section_name', 'sectionName']),
  ]
    .filter((p) => p && p !== '-')
    .join(' | ')

  const mobile = pickText(row, ['mobile', 'mobileNumber', 'mobile_number'])

  return (
    <button type="button" onClick={onOpenProfile} className="w-full text-left">
      <p className="relative pr-14 text-sm font-medium text-blue-600 leading-snug">
        {row.rollNumber == null && admission ? <span>{admission}, </span> : null}
        {hallticket ? <span>{hallticket}, </span> : null}
        <span>{name}</span>
        <span className="absolute right-0 top-0 text-[11px] font-semibold text-blue-600">{lateralTag(row)}</span>
      </p>
      {meta ? <p className="mt-1 text-[11px] text-foreground leading-relaxed">{meta}</p> : null}
      <p className="mt-0.5 text-[11px] leading-relaxed">
        {mobile ? <span>{mobile}</span> : <span>-</span>}
        {statusCode ? (
          <>
            <span className="text-foreground"> | </span>
            <span className={statusClass(statusCode)}>{statusCode}</span>
          </>
        ) : null}
      </p>
    </button>
  )
}

export function StudentsListTable({
  mode,
  rows,
  headerParts,
  tableFilter,
  onTableFilterChange,
  canSendCredentials,
  canNavigateEdit,
  canModalEdit,
  onViewProfile,
  onEditNavigate,
  onEditModal,
  onViewDetails,
  onSendCredentials,
  onSendBulkCredentials,
}: StudentsListTableProps) {
  const [pageSize, setPageSize] = useState('10')
  const [pageIndex, setPageIndex] = useState(0)

  const filteredRows = useMemo(() => {
    if (mode !== 'section') return rows
    const q = tableFilter.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((row) =>
      [
        pickText(row, ['firstName', 'studentName']),
        pickText(row, ['hallticketNumber', 'rollNumber', 'admissionNumber']),
        pickText(row, ['mobile', 'mobileNumber']),
        pickText(row, ['collegeCode', 'courseCode', 'groupCode']),
      ]
        .join(' ')
        .toLowerCase()
        .includes(q),
    )
  }, [mode, rows, tableFilter])

  const size = Number(pageSize) || 10
  const total = filteredRows.length
  const totalPages = Math.max(1, Math.ceil(total / size))
  const safePage = Math.min(pageIndex, totalPages - 1)
  const pageRows = filteredRows.slice(safePage * size, safePage * size + size)
  const rangeStart = total === 0 ? 0 : safePage * size + 1
  const rangeEnd = Math.min(total, (safePage + 1) * size)

  const headerLabel = headerParts.filter(Boolean).join(' | ')

  if (rows.length === 0) return null

  return (
    <div className="space-y-0">
      {headerLabel ? (
        <div className="border-b-2 border-amber-400 bg-white px-4 py-2">
          <p className="text-sm font-semibold text-blue-700">{headerLabel}</p>
        </div>
      ) : null}

      <div className="app-card overflow-hidden shadow-sm">
        {mode === 'section' && (
          <div className="flex flex-col gap-3 border-b bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full max-w-xs">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={tableFilter}
                onChange={(e) => {
                  setPageIndex(0)
                  onTableFilterChange(e.target.value)
                }}
                placeholder="Search"
                className="h-8 pl-8 text-[12px]"
              />
            </div>
            {canSendCredentials ? (
              <Button type="button" size="sm" className="h-8 shrink-0 text-[12px]" onClick={onSendBulkCredentials}>
                <Mail className="mr-1.5 h-3.5 w-3.5" />
                Send Student Credentials
              </Button>
            ) : null}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-[12px]">
            <thead>
              <tr className="bg-sky-100/80 text-left text-[12px] font-semibold text-foreground">
                <th className="w-24 border border-slate-200 px-3 py-2 text-center">Photo</th>
                <th className="border border-slate-200 px-3 py-2">Student Name</th>
                <th className="min-w-[280px] border border-slate-200 px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row, index) => (
                <tr key={rowKey(row, safePage * size + index)} className="bg-white hover:bg-slate-50/80">
                  <td className="border border-slate-200 px-3 py-2 text-center align-middle">
                    <button type="button" onClick={() => onViewDetails(row)} className="inline-block">
                      <img
                        src={photoSrc(row.studentPhotoPath ?? row.student_photo_path)}
                        alt=""
                        className="mx-auto h-12 w-12 rounded-full object-cover"
                        onError={(e) => {
                          const img = e.currentTarget
                          if (!img.src.endsWith('default_Student.png')) img.src = DEFAULT_STUDENT_PHOTO
                        }}
                      />
                    </button>
                  </td>
                  <td className="border border-slate-200 px-3 py-2 align-top">
                    <StudentNameCell row={row} onOpenProfile={() => onViewDetails(row)} />
                  </td>
                  <td className="border border-slate-200 px-3 py-2 align-top">
                    <div className="flex flex-wrap items-center gap-x-1 gap-y-1">
                      <ActionLink label="View Profile" onClick={() => onViewProfile(row)} />
                      <span className="text-muted-foreground">|</span>
                      {canNavigateEdit ? (
                        <ActionLink label="Edit details" onClick={() => onEditNavigate(row)} />
                      ) : canModalEdit ? (
                        <ActionLink label="Edit details" onClick={() => onEditModal(row)} />
                      ) : null}
                      {(canNavigateEdit || canModalEdit) && <span className="text-muted-foreground">|</span>}
                      <ActionLink label="View details" onClick={() => onViewDetails(row)} />
                      {canSendCredentials ? (
                        <>
                          <span className="text-muted-foreground">|</span>
                          <ActionLink label="Send Credentials" onClick={() => onSendCredentials(row)} />
                        </>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 border-t bg-white px-4 py-2 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>Items per page</span>
            <Select
              value={pageSize}
              onChange={(v) => {
                setPageSize(v ?? '10')
                setPageIndex(0)
              }}
              options={PAGE_SIZES.map((n) => ({ value: n, label: n }))}
              className="w-[72px] [&_button[role='combobox']]:h-7 [&_button[role='combobox']]:text-[11px]"
            />
          </div>
          <span>
            {rangeStart} – {rangeEnd} of {total}
          </span>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={safePage <= 0}
              onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={safePage >= totalPages - 1}
              onClick={() => setPageIndex((p) => Math.min(totalPages - 1, p + 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function headerPartsFromRow(row: AnyRow | null | undefined): string[] {
  if (!row) return []
  return [
    pickText(row, ['collegeCode', 'college_code']),
    pickText(row, ['academicYear', 'academic_year']),
    pickText(row, ['courseCode', 'course_code']),
    pickText(row, ['groupCode', 'group_code']),
    pickText(row, ['courseYearName', 'course_year_name']),
    pickText(row, ['section', 'group_section_name', 'sectionName']),
  ].filter((p) => p && p !== '-')
}
