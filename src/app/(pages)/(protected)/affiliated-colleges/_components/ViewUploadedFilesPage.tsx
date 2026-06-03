'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { ClipboardList, Eye } from 'lucide-react'
import { UNIV_BULK_UPLOAD_TYPES } from '@/common/affiliated-colleges-constants'
import { PageContainer } from '@/components/layout'
import { QK } from '@/lib/query-keys'
import { getErrorMessage } from '@/lib/errors'
import { getAffiliatedCollegeSummaryReport } from '@/services'
import type { AffiliatedSummaryRow } from '@/types/affiliated-colleges'
import { exportHtmlTableAsExcel } from '../_lib/export-html-table'
import { formatAffiliatedDateTime } from '../_lib/format-affiliated-datetime'
import { useFilteredRows } from '../_lib/use-filtered-rows'
import {
  buildUnivDataDetails,
  getUnivAffiliatedContext,
  setUnivAffiliatedContext,
  UNIV_AFFILIATED_STORAGE,
} from '../_lib/univ-affiliated-storage'
import { AffiliatedBulkBreadcrumb } from './AffiliatedBulkBreadcrumb'
import { AffiliatedReportToolbar } from './AffiliatedReportToolbar'

type AnyRow = AffiliatedSummaryRow

type ColDef = {
  id: string
  label: string
  render?: (row: AnyRow) => React.ReactNode
}

function pickNum(row: AnyRow, key: string): number {
  const n = Number(row[key] ?? 0)
  return Number.isFinite(n) ? n : 0
}

function fileTypeId(row: AnyRow): number {
  return pickNum(row, 'fk_filetype_catdet_id')
}

function routeForFileType(typeId: number): string | null {
  switch (typeId) {
    case UNIV_BULK_UPLOAD_TYPES.STUDENT:
      return 'view-students-data'
    case UNIV_BULK_UPLOAD_TYPES.SUBJECT:
      return 'view-subjects-data'
    case UNIV_BULK_UPLOAD_TYPES.ATTENDANCE:
      return 'view-attendance-data'
    case UNIV_BULK_UPLOAD_TYPES.EXAM_REGISTRATION:
      return 'view-exam-reg-data'
    case UNIV_BULK_UPLOAD_TYPES.EXAM_FEE:
      return 'view-exam-fee-data'
    case UNIV_BULK_UPLOAD_TYPES.STUDENT_FEE:
      return 'view-student-fee-data'
    case UNIV_BULK_UPLOAD_TYPES.EXAM_MARKS:
      return 'view-student-marks-data'
    default:
      return null
  }
}

function storageKeyForFileType(typeId: number): (typeof UNIV_AFFILIATED_STORAGE)[keyof typeof UNIV_AFFILIATED_STORAGE] | null {
  switch (typeId) {
    case UNIV_BULK_UPLOAD_TYPES.STUDENT:
      return UNIV_AFFILIATED_STORAGE.studentBulk
    case UNIV_BULK_UPLOAD_TYPES.SUBJECT:
      return UNIV_AFFILIATED_STORAGE.subjectBulk
    case UNIV_BULK_UPLOAD_TYPES.ATTENDANCE:
      return UNIV_AFFILIATED_STORAGE.attendanceBulk
    case UNIV_BULK_UPLOAD_TYPES.EXAM_REGISTRATION:
      return UNIV_AFFILIATED_STORAGE.examRegBulk
    case UNIV_BULK_UPLOAD_TYPES.EXAM_FEE:
      return UNIV_AFFILIATED_STORAGE.examFeeBulk
    case UNIV_BULK_UPLOAD_TYPES.STUDENT_FEE:
      return UNIV_AFFILIATED_STORAGE.studentFeeBulk
    case UNIV_BULK_UPLOAD_TYPES.EXAM_MARKS:
      return UNIV_AFFILIATED_STORAGE.examMarksBulk
    default:
      return null
  }
}

function buildColumns(typeId: number): ColDef[] {
  const base: ColDef[] = [
    { id: 'sno', label: 'SNo' },
    { id: 'count', label: 'Uploaded Count', render: (r) => String(r.total_records ?? '') },
    {
      id: 'studentcount',
      label: 'Uploaded Students Count',
      render: (r) => String(r.no_of_students_count ?? ''),
    },
    {
      id: 'udate',
      label: 'Uploaded Date & Time',
      render: (r) => formatAffiliatedDateTime(r.upload_date),
    },
    {
      id: 'vdate',
      label: 'Verifyied Date & Time',
      render: (r) => formatAffiliatedDateTime(r.verified_date),
    },
    {
      id: 'sdate',
      label: 'Submitted Date & Time',
      render: (r) => formatAffiliatedDateTime(r.submitted_date),
    },
    {
      id: 'Adate',
      label: 'Approved Date & Time',
      render: (r) => formatAffiliatedDateTime(r.approved_date),
    },
  ]

  const extra: ColDef[] = []
  if (typeId === UNIV_BULK_UPLOAD_TYPES.ATTENDANCE) {
    extra.push(
      { id: 'fromDate', label: 'From Date', render: (r) => String(r.from_date ?? '') },
      { id: 'toDate', label: 'To Date', render: (r) => String(r.to_date ?? '') },
    )
    base.splice(3, 0, ...extra)
  } else if (typeId === UNIV_BULK_UPLOAD_TYPES.EXAM_FEE || typeId === UNIV_BULK_UPLOAD_TYPES.EXAM_MARKS) {
    base.splice(3, 0, { id: 'examName', label: 'Exam Name', render: (r) => String(r.exam_name ?? '') })
  } else if (typeId === UNIV_BULK_UPLOAD_TYPES.SUBJECT) {
    base.splice(3, 0, {
      id: 'regCode',
      label: 'Regulation',
      render: (r) => String(r.regulation_code ?? ''),
    })
  }

  return [...base, { id: 'action', label: 'Action' }]
}

export function ViewUploadedFilesPage() {
  const router = useRouter()
  const tableRef = useRef<HTMLTableElement>(null)
  const [params, setParams] = useState<AnyRow | null>(null)
  const [search, setSearch] = useState('')
  const [isPrintMode, setIsPrintMode] = useState(false)
  const orgCode =
    typeof globalThis !== 'undefined' && 'localStorage' in globalThis
      ? globalThis.localStorage.getItem('orgCode') ?? ''
      : ''

  useEffect(() => {
    const ctx = getUnivAffiliatedContext(UNIV_AFFILIATED_STORAGE.uploadedFilesSummary)
    if (!ctx) {
      router.replace('/affiliated-colleges/university-affiliated-colleges')
      return
    }
    setParams(ctx)
  }, [router])

  const summaryParams = useMemo(() => {
    if (!params) return null
    return {
      collegeId: pickNum(params, 'fk_college_id'),
      academicYearId: pickNum(params, 'fk_academic_year_id'),
      courseId: pickNum(params, 'fk_course_id'),
      courseGroupId: pickNum(params, 'fk_course_group_id'),
      courseYearId: pickNum(params, 'fk_course_year_id'),
      filetypeCatdetId: pickNum(params, 'fk_filetype_catdet_id'),
    }
  }, [params])

  const { data: rows = [], isFetching, error } = useQuery({
    queryKey: QK.affiliatedColleges.collegeSummary('uploaded_file_details', summaryParams ?? {}),
    queryFn: () =>
      getAffiliatedCollegeSummaryReport({
        inFlag: 'uploaded_file_details',
        collegeId: summaryParams!.collegeId,
        academicYearId: summaryParams!.academicYearId,
        courseId: summaryParams!.courseId,
        courseGroupId: summaryParams!.courseGroupId,
        courseYearId: summaryParams!.courseYearId,
        filetypeCatdetId: summaryParams!.filetypeCatdetId,
      }),
    enabled: summaryParams != null && summaryParams.collegeId > 0,
  })

  const fileType = rows[0] ? fileTypeId(rows[0]) : pickNum(params ?? {}, 'fk_filetype_catdet_id')
  const columns = useMemo(() => buildColumns(fileType), [fileType])
  const filtered = useFilteredRows(rows, search)
  const dataDetails = params ? buildUnivDataDetails(params) : ''

  const openDetail = (row: AnyRow) => {
    const typeId = fileTypeId(row)
    const segment = routeForFileType(typeId)
    const storageKey = storageKeyForFileType(typeId)
    if (!segment || !storageKey) return
    setUnivAffiliatedContext(storageKey, { ...params, ...row })
    router.push(`/affiliated-colleges/university-affiliated-colleges/${segment}`)
  }

  const goBack = () => {
    if (params) setUnivAffiliatedContext(UNIV_AFFILIATED_STORAGE.uploadedFilesSummary, params)
    router.push('/affiliated-colleges/university-affiliated-colleges')
  }

  const handlePrint = () => {
    setIsPrintMode(true)
    setTimeout(() => {
      window.print()
      setIsPrintMode(false)
    }, 500)
  }

  if (!params) return null

  if (isPrintMode) {
    return (
      <div className="print-content p-4">
        {orgCode === 'SUK' ? <p className="font-semibold text-center mb-2">SUK</p> : null}
        <strong className="block">Affiliated Colleges Data</strong>
        {dataDetails ? <strong className="block text-blue-600">— {dataDetails}</strong> : null}
        <table className="w-full border-collapse text-sm mt-4">
          <thead>
            <tr>
              {columns
                .filter((c) => c.id !== 'action')
                .map((c) => (
                  <th key={c.id} className="border p-2 text-left">
                    {c.label}
                  </th>
                ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, i) => (
              <tr key={i}>
                {columns
                  .filter((c) => c.id !== 'action')
                  .map((c) => (
                    <td key={c.id} className="border p-2">
                      {c.id === 'sno'
                        ? i + 1
                        : c.render
                          ? c.render(row)
                          : String(row[c.id] ?? '')}
                    </td>
                  ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <PageContainer>
      <AffiliatedBulkBreadcrumb current="University Affiliated Colleges" />

      <div className="app-card mt-2">
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <ClipboardList className="h-5 w-5 text-primary shrink-0" />
          <h2 className="font-semibold text-base">
            Affiliated Colleges Data
            {dataDetails ? (
              <span className="text-blue-600 font-medium"> — {dataDetails}</span>
            ) : null}
          </h2>
        </div>

        <AffiliatedReportToolbar
          search={search}
          onSearchChange={setSearch}
          onExport={() => exportHtmlTableAsExcel(tableRef.current, 'Affiliated_Colleges_Uploaded_Files')}
          onPrint={handlePrint}
          showBack
          onBack={goBack}
        />

        {error ? <p className="text-sm text-destructive px-4 pb-2">{getErrorMessage(error)}</p> : null}
        {isFetching ? <p className="text-sm text-muted-foreground px-4 pb-4">Loading…</p> : null}

        <div className="overflow-x-auto p-4">
          <table ref={tableRef} className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b bg-muted/40">
                {columns.map((c) => (
                  <th key={c.id} className={`p-2 text-left font-medium ${c.id === 'action' ? 'action' : ''}`}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => (
                <tr key={i} className="border-b hover:bg-muted/20">
                  {columns.map((c) => (
                    <td key={c.id} className={`p-2 ${c.id === 'action' ? 'action' : ''}`}>
                      {c.id === 'sno' ? (
                        i + 1
                      ) : c.id === 'action' ? (
                        <button
                          type="button"
                          className="text-primary hover:opacity-80"
                          title="Preview"
                          onClick={() => openDetail(row)}
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      ) : c.render ? (
                        c.render(row)
                      ) : (
                        String(row[c.id] ?? '')
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PageContainer>
  )
}
