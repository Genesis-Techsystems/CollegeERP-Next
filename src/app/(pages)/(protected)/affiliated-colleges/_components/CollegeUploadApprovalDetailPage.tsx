'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ClipboardList } from 'lucide-react'
import { PageContainer } from '@/components/layout'
import { Table, type TableColumn } from '@/common/components/table'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/common/generic-functions'
import { QK } from '@/lib/query-keys'
import { getErrorMessage } from '@/lib/errors'
import { toastError, toastSuccess } from '@/lib/toast'
import {
  getCollegeUploadApprovalDetails,
  loadCollegeUploadApproval,
  rejectCollegeUploadApproval,
} from '@/services'
import { exportHtmlTableAsExcel } from '../_lib/export-html-table'
import { useFilteredRows } from '../_lib/use-filtered-rows'
import {
  APPROVAL_UPLOAD_DETAIL_CONFIG,
  type ApprovalUploadDetailKind,
} from '../_lib/approval-upload-config'
import {
  buildApprovalDataDetails,
  getApprovalUploadContext,
} from '../_lib/approval-upload-storage'
import { AffiliatedReportToolbar } from './AffiliatedReportToolbar'
import { UploadApprovalActionModal } from './UploadApprovalActionModal'

type AnyRow = Record<string, unknown>

function pickUploadFileId(row: AnyRow): number {
  const n = Number(
    row.pk_univ_uploadfile_id ??
      row.univ_uploadfile_id ??
      row.univUploadfileId ??
      0,
  )
  return Number.isFinite(n) && n > 0 ? n : 0
}

function pickNum(row: AnyRow, key: string): number {
  const n = Number(row[key] ?? 0)
  return Number.isFinite(n) ? n : 0
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

function pivotAttendanceRows(raw: AnyRow[]): { rows: AnyRow[]; subjectCodes: string[] } {
  const transformed: Record<string, AnyRow> = {}
  const subjectsSet = new Set<string>()
  for (const item of raw) {
    const hall = String(item.hallticketno ?? '')
    if (!hall) continue
    if (!transformed[hall]) {
      transformed[hall] = {
        hallticketno: hall,
        courseyearcode: item.courseyearcode,
        academicyear: item.academicyear,
        regulationcode: item.regulationcode,
      }
    }
    const code = String(item.subjectcode ?? '')
    if (code) {
      transformed[hall][code] = item.attendance ?? item.marks ?? 'Y'
      subjectsSet.add(code)
    }
  }
  return { rows: Object.values(transformed), subjectCodes: Array.from(subjectsSet) }
}

function mapDisplayRow(row: AnyRow, index: number, columns: TableColumn<AnyRow>[]): AnyRow {
  const out: AnyRow = { ...row, sno: index + 1 }
  for (const col of columns) {
    const id = String(col.id)
    if (out[id] != null) continue
    if (id === 'hallticket') out[id] = row.hall_ticket_number ?? row.hallticket ?? row.hallticketno
    if (id === 'firstName') out[id] = row.first_name ?? row.firstName
    if (id === 'dateOfBirth') out[id] = formatDate(String(row.date_of_birth ?? row.dateOfBirth ?? ''))
    if (id === 'studentEmailID') out[id] = row.student_emailid ?? row.studentEmailID
    if (id === 'fatherName') out[id] = row.father_name ?? row.fatherName
    if (id === 'fatherMobile') out[id] = row.father_mobile ?? row.fatherMobile
    if (id === 'course') {
      const parts = [row.college, row.academic_year, row.course, row.s_group, row.course_year].filter(Boolean)
      out[id] = parts.length ? parts.join(' / ') : row.course
    }
    if (id === 'Amount') out[id] = row.Amount ?? row.amount
  }
  return out
}

type CollegeUploadApprovalDetailPageProps = { kind: ApprovalUploadDetailKind }

export function CollegeUploadApprovalDetailPage({ kind }: CollegeUploadApprovalDetailPageProps) {
  const config = APPROVAL_UPLOAD_DETAIL_CONFIG[kind]
  const router = useRouter()
  const queryClient = useQueryClient()
  const tableRef = useRef<HTMLDivElement>(null)
  const [params, setParams] = useState<AnyRow | null>(null)
  const [search, setSearch] = useState('')
  const [isPrintMode, setIsPrintMode] = useState(false)
  const [action, setAction] = useState<'approve' | 'reject' | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    const ctx = getApprovalUploadContext(config.storageKey)
    if (!ctx) {
      router.replace('/affiliated-colleges/college-uploads-approval')
      return
    }
    setParams(ctx)
  }, [config.storageKey, router])

  const uploadFileId = params ? pickUploadFileId(params) : 0

  const procParams = useMemo(() => {
    if (!params) return null
    const extra = config.extraDetailParams?.(params) ?? {}
    return {
      inFlag: '',
      collegeId: pickNum(params, 'fk_college_id'),
      academicYearId: pickNum(params, 'fk_academic_year_id'),
      courseId: pickNum(params, 'fk_course_id'),
      courseGroupId: pickNum(params, 'fk_course_group_id'),
      courseYearId: pickNum(params, 'fk_course_year_id'),
      univUploadfileId: uploadFileId,
      regulationId: 0,
      fromDate: extra.fromDate ?? '1990-01-01',
      toDate: extra.toDate ?? '1990-01-01',
      examId: extra.examId,
      studentId: extra.studentId,
      fkUnivCollegewisePaymentId: extra.fkUnivCollegewisePaymentId,
    }
  }, [config, params, uploadFileId])

  const { data: rawRows = [], isFetching, error } = useQuery({
    queryKey: QK.affiliatedColleges.uploadsApprovalDetail(config.detailProc, uploadFileId),
    queryFn: () => getCollegeUploadApprovalDetails(config.detailProc, procParams!),
    enabled: uploadFileId > 0 && procParams != null,
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
      return { tableRows: rows.map((r, i) => ({ ...r, sno: i + 1 })), columns: cols }
    }
    if (config.tableMode === 'attendance') {
      const { rows, subjectCodes } = pivotAttendanceRows(rawRows)
      const cols: TableColumn<AnyRow>[] = [
        { id: 'sno', label: 'SNo', width: 5 },
        { id: 'hallticketno', label: 'Hall Ticket No', width: 12 },
        { id: 'courseyearcode', label: 'Course Year', width: 10 },
        { id: 'academicyear', label: 'Academic Year', width: 10 },
        { id: 'regulationcode', label: 'Regulation', width: 10 },
        ...subjectCodes.map((code) => ({ id: code, label: code, width: 6 })),
      ]
      return { tableRows: rows.map((r, i) => ({ ...r, sno: i + 1 })), columns: cols }
    }
    const cols = config.columns ?? []
    return {
      tableRows: rawRows.map((r, i) => mapDisplayRow(r, i, cols)),
      columns: cols,
    }
  }, [config, rawRows])

  const filtered = useFilteredRows(tableRows, search)
  const dataDetails = params ? buildApprovalDataDetails(params) : ''

  const goBack = () => router.push('/affiliated-colleges/college-uploads-approval')

  const handlePrint = () => {
    setIsPrintMode(true)
    setTimeout(() => {
      window.print()
      setIsPrintMode(false)
    }, 500)
  }

  async function handleActionSubmit(comments: string) {
    if (!procParams || !action) return
    setActionLoading(true)
    try {
      if (action === 'approve') {
        await loadCollegeUploadApproval(config.loadProc, { ...procParams, comments })
        toastSuccess('Upload approved and loaded successfully.')
      } else {
        await rejectCollegeUploadApproval({ ...procParams, comments })
        toastSuccess('Data rejected.')
      }
      await queryClient.invalidateQueries({ queryKey: QK.affiliatedColleges.all })
      setAction(null)
      goBack()
    } catch (err) {
      toastError(getErrorMessage(err))
    } finally {
      setActionLoading(false)
    }
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
        {dataDetails ? <span className="text-blue-600 font-medium"> — {dataDetails}</span> : null}
        {renderPrintTable()}
      </div>
    )
  }

  return (
    <PageContainer>
      {filtered.length > 0 || isFetching ? (
        <div className="app-card mt-2">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary shrink-0" />
              <h2 className="font-semibold text-base">{config.title}</h2>
            </div>
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

          <div className="flex flex-wrap gap-2 border-t px-4 py-3 justify-end">
            <Button type="button" onClick={() => setAction('approve')}>
              Approve
            </Button>
            <Button type="button" variant="outline" onClick={() => setAction('reject')}>
              Reject
            </Button>
            <Button type="button" variant="ghost" onClick={goBack}>
              Back
            </Button>
          </div>
        </div>
      ) : (
        <div className="app-card p-6 mt-4 space-y-3">
          <p className="text-sm text-muted-foreground">No records found for this upload file.</p>
          <Button type="button" variant="outline" onClick={goBack}>
            Back
          </Button>
        </div>
      )}

      <UploadApprovalActionModal
        open={action != null}
        action={action ?? 'approve'}
        onClose={() => setAction(null)}
        onSubmit={handleActionSubmit}
        loading={actionLoading}
      />
    </PageContainer>
  )
}
