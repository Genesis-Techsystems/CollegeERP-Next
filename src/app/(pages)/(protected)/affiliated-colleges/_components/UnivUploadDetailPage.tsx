'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { PageContainer } from '@/components/layout'
import { Table, type TableColumn } from '@/common/components/table'
import { formatDate } from '@/common/generic-functions'
import { getErrorMessage } from '@/lib/errors'
import { exportHtmlTableAsExcel } from '../_lib/export-html-table'
import { useFilteredRows } from '../_lib/use-filtered-rows'
import {
  buildUnivDataDetails,
  getUnivAffiliatedContext,
  setUnivAffiliatedContext,
  UNIV_AFFILIATED_STORAGE,
} from '../_lib/univ-affiliated-storage'
import {
  UNIV_UPLOAD_DETAIL_CONFIG,
  type UnivUploadDetailKind,
} from '../_lib/univ-upload-detail-config'
import { AffiliatedBulkBreadcrumb } from './AffiliatedBulkBreadcrumb'
import { AffiliatedReportToolbar } from './AffiliatedReportToolbar'

type AnyRow = Record<string, unknown>

function pickUploadFileId(row: AnyRow): number {
  const n = Number(
    row.pk_univ_uploadfile_id ??
      row.univ_uploadfile_id ??
      row.univUploadfileId ??
      row.univUploadFileId ??
      0,
  )
  return Number.isFinite(n) && n > 0 ? n : 0
}

function pivotSubjectRows(raw: AnyRow[]): { rows: AnyRow[]; subjectCodes: string[] } {
  const transformed: Record<string, AnyRow> = {}
  const subjectsSet = new Set<string>()
  for (const item of raw) {
    const hall = String(item.hallticketno ?? '')
    if (!hall) continue
    if (!transformed[hall]) {
      transformed[hall] = {
        sno: Number(item.srno ?? 0),
        hallticketno: hall,
        academicyear: item.academicyear,
        courseyearcode: item.courseyearcode,
        regulationcode: item.regulationcode,
      }
    }
    const code = String(item.subjectcode ?? '')
    if (code) {
      transformed[hall][code] = 'Y'
      subjectsSet.add(code)
    }
  }
  for (const row of Object.values(transformed)) {
    for (const code of subjectsSet) {
      if (!row[code]) row[code] = 'N'
    }
  }
  return { rows: Object.values(transformed), subjectCodes: Array.from(subjectsSet) }
}

function mapDisplayRow(row: AnyRow, index: number, columns: TableColumn<AnyRow>[]): AnyRow {
  const out: AnyRow = { ...row, sno: index + 1 }
  for (const col of columns) {
    const id = String(col.id)
    if (out[id] != null) continue
    if (id === 'dateOfBirth') out[id] = formatDate(String(row.dateOfBirth ?? row.date_of_birth ?? ''))
    if (id === 'hallticket') out[id] = row.hallticket ?? row.hallticketno
    if (id === 'Amount') out[id] = row.Amount ?? row.amount
  }
  return out
}

type UnivUploadDetailPageProps = { kind: UnivUploadDetailKind }

export function UnivUploadDetailPage({ kind }: UnivUploadDetailPageProps) {
  const config = UNIV_UPLOAD_DETAIL_CONFIG[kind]
  const router = useRouter()
  const tableRef = useRef<HTMLDivElement>(null)
  const [params, setParams] = useState<AnyRow | null>(null)
  const [search, setSearch] = useState('')
  const [isPrintMode, setIsPrintMode] = useState(false)

  useEffect(() => {
    const ctx = getUnivAffiliatedContext(config.storageKey)
    if (!ctx) {
      router.replace('/affiliated-colleges/university-affiliated-colleges/view-uploaded-files')
      return
    }
    setParams(ctx)
  }, [config.storageKey, router])

  const uploadFileId = params ? pickUploadFileId(params) : 0

  const { data: rawRows = [], isFetching, error } = useQuery({
    queryKey: ['affiliated-colleges', kind, uploadFileId],
    queryFn: () => config.loadRows(uploadFileId),
    enabled: uploadFileId > 0,
  })

  const { tableRows, columns } = useMemo(() => {
    if (config.tableMode === 'subjects') {
      const { rows, subjectCodes } = pivotSubjectRows(rawRows)
      const cols: TableColumn<AnyRow>[] = [
        { id: 'sno', label: 'SNo', width: 5 },
        { id: 'hallticketno', label: 'Hall Ticket No', width: 12 },
        { id: 'courseyearcode', label: 'Course Year', width: 10 },
        { id: 'academicyear', label: 'Academic Year', width: 10 },
        { id: 'regulationcode', label: 'Regulation', width: 10 },
        ...subjectCodes.map((code) => ({ id: code, label: code, width: 6 })),
      ]
      return {
        tableRows: rows.map((r, i) => ({ ...r, sno: i + 1 })),
        columns: cols,
      }
    }
    const cols = config.columns ?? []
    return {
      tableRows: rawRows.map((r, i) => mapDisplayRow(r, i, cols)),
      columns: cols,
    }
  }, [config, rawRows])

  const filtered = useFilteredRows(tableRows, search)
  const dataDetails = params ? buildUnivDataDetails(params) : ''

  const goBack = () => {
    const parent = getUnivAffiliatedContext(UNIV_AFFILIATED_STORAGE.uploadedFilesSummary)
    if (parent) setUnivAffiliatedContext(UNIV_AFFILIATED_STORAGE.uploadedFilesSummary, parent)
    router.push('/affiliated-colleges/university-affiliated-colleges/view-uploaded-files')
  }

  const handlePrint = () => {
    setIsPrintMode(true)
    setTimeout(() => {
      window.print()
      setIsPrintMode(false)
    }, 500)
  }

  const renderPrintTable = (): ReactNode => (
    <table className="w-full border-collapse text-sm mt-4">
      <thead>
        <tr>
          {columns.map((c) => (
            <th key={String(c.id)} className="border p-2 text-left">
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {filtered.map((row, i) => (
          <tr key={i}>
            {columns.map((c) => (
              <td key={String(c.id)} className="border p-2">
                {String(row[c.id as string] ?? (c.id === 'sno' ? i + 1 : ''))}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )

  if (!params) return null

  if (isPrintMode) {
    return (
      <div className="print-content p-4">
        <strong className="block">{config.title}</strong>
        {dataDetails ? <span className="text-blue-600 font-medium">{dataDetails}</span> : null}
        {renderPrintTable()}
      </div>
    )
  }

  return (
    <PageContainer>
      <AffiliatedBulkBreadcrumb current={config.breadcrumbLabel} />

      {filtered.length > 0 || isFetching ? (
        <div className="app-card mt-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
            <h2 className="font-semibold text-base">{config.title}</h2>
            {dataDetails ? (
              <span className="text-sm text-blue-600 font-medium">{dataDetails}</span>
            ) : null}
          </div>

          <AffiliatedReportToolbar
            search={search}
            onSearchChange={setSearch}
            onExport={() =>
              exportHtmlTableAsExcel(
                tableRef.current?.querySelector('table') ?? null,
                config.exportFileName,
              )
            }
            onPrint={handlePrint}
            showBack
            onBack={goBack}
          />

          {error ? <p className="text-sm text-destructive px-4">{getErrorMessage(error)}</p> : null}

          <div ref={tableRef} className="p-4">
            <Table
              rows={filtered}
              columns={columns}
              loading={isFetching}
              emptyText="No records found"
              pageSize={25}
            />
          </div>
        </div>
      ) : (
        <div className="app-card p-6 mt-4 space-y-3">
          <p className="text-sm text-muted-foreground">No records found for this upload file.</p>
          <button type="button" className="text-sm underline" onClick={goBack}>
            Back
          </button>
        </div>
      )}
    </PageContainer>
  )
}
