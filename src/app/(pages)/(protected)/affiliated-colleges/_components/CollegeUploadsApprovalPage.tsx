'use client'

import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { ClipboardList, Eye } from 'lucide-react'
import { PageContainer } from '@/components/layout'
import { QK } from '@/lib/query-keys'
import { getErrorMessage } from '@/lib/errors'
import { getCollegeUploadsApprovalSummary } from '@/services'
import type { AffiliatedSummaryRow } from '@/types/affiliated-colleges'
import { useAffiliatedCascade } from '../_lib/use-affiliated-cascade'
import { exportHtmlTableAsExcel } from '../_lib/export-html-table'
import { formatAffiliatedDateTime } from '../_lib/format-affiliated-datetime'
import { useFilteredRows } from '../_lib/use-filtered-rows'
import { setApprovalUploadContext, storageKeyForFileType } from '../_lib/approval-upload-storage'
import { AffiliatedCollegeFilters } from './AffiliatedCollegeFilters'
import { AffiliatedReportToolbar } from './AffiliatedReportToolbar'

type AnyRow = AffiliatedSummaryRow

function pickNum(row: AnyRow, key: string): number {
  const n = Number(row[key] ?? 0)
  return Number.isFinite(n) ? n : 0
}

const VIEW_ROUTES: Record<number, string> = {
  718: 'view-student-data',
  719: 'view-std-subjects',
  720: 'view-std-attendance',
  722: 'view-std-registration',
  723: 'view-std-examfee',
  721: 'view-std-fee',
  724: 'view-std-marks',
}

export function CollegeUploadsApprovalPage() {
  const router = useRouter()
  const tableRef = useRef<HTMLTableElement>(null)
  const cascade = useAffiliatedCascade({
    examFilters: true,
    requireGroupYear: false,
    allowAllGroupYear: true,
  })
  const [loadKey, setLoadKey] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [isPrintMode, setIsPrintMode] = useState(false)
  const orgCode =
    typeof globalThis !== 'undefined' && 'localStorage' in globalThis
      ? globalThis.localStorage.getItem('orgCode') ?? ''
      : ''

  const { data: rows = [], isFetching, error } = useQuery({
    queryKey: QK.affiliatedColleges.uploadsApprovalSummary(
      loadKey ? (JSON.parse(loadKey) as Record<string, number>) : {},
    ),
    queryFn: () => {
      const f = JSON.parse(loadKey!) as { collegeId: number; academicYearId: number; courseId: number }
      return getCollegeUploadsApprovalSummary(f)
    },
    enabled: loadKey != null,
  })

  const filtered = useFilteredRows(rows, search)

  const dataDetails = useMemo(() => {
    if (!loadKey) return ''
    const parts: string[] = []
    const college = cascade.colleges.find((c) => pickNum(c, 'fk_college_id') === cascade.collegeId)
    if (college) parts.push(String(college.college_code ?? ''))
    const ay = cascade.academicYears.find(
      (a) => pickNum(a, 'fk_academic_year_id') === cascade.academicYearId,
    )
    if (ay) parts.push(String(ay.academic_year ?? ''))
    const course = cascade.courses.find((c) => pickNum(c, 'fk_course_id') === cascade.courseId)
    if (course) parts.push(String(course.course_code ?? ''))
    return parts.filter(Boolean).join(' / ')
  }, [loadKey, cascade.colleges, cascade.academicYears, cascade.courses, cascade.collegeId, cascade.academicYearId, cascade.courseId])

  const openDetail = (row: AnyRow) => {
    const typeId = pickNum(row, 'fk_filetype_catdet_id')
    const storageKey = storageKeyForFileType(typeId)
    const segment = VIEW_ROUTES[typeId]
    if (!storageKey || !segment) return
    setApprovalUploadContext(storageKey, row)
    router.push(`/affiliated-colleges/college-uploads-approval/${segment}`)
  }

  const handlePrint = () => {
    setIsPrintMode(true)
    setTimeout(() => {
      window.print()
      setIsPrintMode(false)
    }, 500)
  }

  if (isPrintMode) {
    return (
      <div className="print-content p-4">
        {orgCode === 'SUK' ? <p className="font-semibold text-center mb-2">SUK</p> : null}
        <strong className="block mb-2">
          Affiliated Colleges Data
          {dataDetails ? <span className="text-blue-600 font-medium"> — {dataDetails}</span> : null}
        </strong>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="border p-2 text-left">Sl.no</th>
              <th className="border p-2 text-left">College Code</th>
              <th className="border p-2 text-left">Course Code</th>
              <th className="border p-2 text-left">CourseGroup Code</th>
              <th className="border p-2 text-left">Course Year Code</th>
              <th className="border p-2 text-left">Uploaded File Type</th>
              <th className="border p-2 text-left">Uploaded Count</th>
              <th className="border p-2 text-left">Date & Time</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, i) => (
              <tr key={i}>
                <td className="border p-2">{i + 1}</td>
                <td className="border p-2">{String(row.college_code ?? '')}</td>
                <td className="border p-2">{String(row.course_code ?? '')}</td>
                <td className="border p-2">{String(row.group_code ?? '')}</td>
                <td className="border p-2">{String(row.course_year_code ?? '')}</td>
                <td className="border p-2">{String(row.type_name ?? '')}</td>
                <td className="border p-2">{String(row.count ?? '')}</td>
                <td className="border p-2">{formatAffiliatedDateTime(row.fileuploaded_date)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <PageContainer>
      <AffiliatedCollegeFilters
        title="College Uploads Approval"
        cascade={cascade}
        hideGroupYear
        allowAllGroupYear
        onGetDetails={() => {
          if (!cascade.filtersValid) return
          setLoadKey(
            JSON.stringify({
              collegeId: cascade.collegeId ?? 0,
              academicYearId: cascade.academicYearId ?? 0,
              courseId: cascade.courseId ?? 0,
            }),
          )
        }}
        loadingDetails={isFetching}
        showBack
        onBack={() => router.push('/affiliated-colleges/college-bulk-uploads')}
      />

      {error ? <p className="text-sm text-destructive px-1">{getErrorMessage(error)}</p> : null}

      {loadKey && rows.length > 0 ? (
        <div className="app-card mt-4">
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
            onExport={() => exportHtmlTableAsExcel(tableRef.current, 'Affiliated_Colleges_Approval')}
            onPrint={handlePrint}
          />

          <div className="overflow-x-auto p-4">
            <table ref={tableRef} className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="p-2 text-left font-medium">SNo</th>
                  <th className="p-2 text-left font-medium">College Code</th>
                  <th className="p-2 text-left font-medium">Course Code</th>
                  <th className="p-2 text-left font-medium">CourseGroup Code</th>
                  <th className="p-2 text-left font-medium">CourseYear Code</th>
                  <th className="p-2 text-left font-medium">Uploaded File Type</th>
                  <th className="p-2 text-left font-medium">Uploaded Count</th>
                  <th className="p-2 text-left font-medium">Date & Time</th>
                  <th className="p-2 text-left font-medium action">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, i) => (
                  <tr key={i} className="border-b hover:bg-muted/20">
                    <td className="p-2">{i + 1}</td>
                    <td className="p-2">{String(row.college_code ?? '')}</td>
                    <td className="p-2">{String(row.course_code ?? '')}</td>
                    <td className="p-2">{String(row.group_code ?? '')}</td>
                    <td className="p-2">{String(row.course_year_code ?? '')}</td>
                    <td className="p-2">{String(row.type_name ?? '')}</td>
                    <td className="p-2">{String(row.count ?? '')}</td>
                    <td className="p-2">{formatAffiliatedDateTime(row.fileuploaded_date)}</td>
                    <td className="p-2 action">
                      <button
                        type="button"
                        className="text-primary hover:opacity-80"
                        title="Preview"
                        onClick={() => openDetail(row)}
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {loadKey && !isFetching && rows.length === 0 ? (
        <p className="text-sm text-muted-foreground px-1 mt-4">No records found.</p>
      ) : null}
    </PageContainer>
  )
}
