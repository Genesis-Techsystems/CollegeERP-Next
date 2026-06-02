'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { ClipboardList, Eye } from 'lucide-react'
import { PageContainer } from '@/components/layout'
import { QK } from '@/lib/query-keys'
import { getErrorMessage } from '@/lib/errors'
import { getAffiliatedCollegeSummaryReport } from '@/services'
import type { AffiliatedSummaryRow } from '@/types/affiliated-colleges'
import { useAffiliatedCascade } from '../_lib/use-affiliated-cascade'
import { exportHtmlTableAsExcel } from '../_lib/export-html-table'
import { useFilteredRows } from '../_lib/use-filtered-rows'
import { setUnivAffiliatedContext, UNIV_AFFILIATED_STORAGE } from '../_lib/univ-affiliated-storage'
import { AffiliatedBulkBreadcrumb } from './AffiliatedBulkBreadcrumb'
import { AffiliatedCollegeFilters } from './AffiliatedCollegeFilters'
import { AffiliatedReportToolbar } from './AffiliatedReportToolbar'

function pickNum(row: AffiliatedSummaryRow, key: string): number {
  const n = Number(row[key] ?? 0)
  return Number.isFinite(n) ? n : 0
}

function enrichSummaryRow(
  row: AffiliatedSummaryRow,
  filters: ReturnType<typeof useAffiliatedCascade>,
): AffiliatedSummaryRow {
  return {
    ...row,
    fk_college_id: pickNum(row, 'fk_college_id') || (filters.collegeId ?? 0),
    fk_academic_year_id: pickNum(row, 'fk_academic_year_id') || (filters.academicYearId ?? 0),
    fk_course_id: pickNum(row, 'fk_course_id') || (filters.courseId ?? 0),
    fk_course_group_id: pickNum(row, 'fk_course_group_id') || (filters.courseGroupId ?? 0),
    fk_course_year_id: pickNum(row, 'fk_course_year_id') || (filters.courseYearId ?? 0),
    college_code: row.college_code ?? filters.colleges.find((c) => pickNum(c, 'fk_college_id') === filters.collegeId)?.college_code,
    academic_year:
      row.academic_year ??
      filters.academicYears.find((a) => pickNum(a, 'fk_academic_year_id') === filters.academicYearId)?.academic_year,
    course_code:
      row.course_code ??
      filters.courses.find((c) => pickNum(c, 'fk_course_id') === filters.courseId)?.course_code,
    group_code:
      row.group_code ??
      filters.courseGroups.find((g) => pickNum(g, 'fk_course_group_id') === filters.courseGroupId)?.group_code,
    course_year_code:
      row.course_year_code ??
      filters.courseYears.find((y) => pickNum(y, 'fk_course_year_id') === filters.courseYearId)?.course_year_name,
  }
}

export function UnivAffiliatedCollegesPage() {
  const router = useRouter()
  const tableRef = useRef<HTMLTableElement>(null)
  const cascade = useAffiliatedCascade({
    examFilters: true,
    allowAllGroupYear: true,
    autoSelectFirst: true,
  })
  const [loadKey, setLoadKey] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [isPrintMode, setIsPrintMode] = useState(false)
  const orgCode =
    typeof globalThis !== 'undefined' && 'localStorage' in globalThis
      ? globalThis.localStorage.getItem('orgCode') ?? ''
      : ''

  const { data: rows = [], isFetching, error } = useQuery({
    queryKey: QK.affiliatedColleges.collegeSummary('uploaded_files_summary', loadKey ? JSON.parse(loadKey) : {}),
    queryFn: () => {
      const f = JSON.parse(loadKey!) as Record<string, number>
      return getAffiliatedCollegeSummaryReport({
        inFlag: 'uploaded_files_summary',
        collegeId: f.collegeId,
        academicYearId: f.academicYearId,
        courseId: f.courseId,
        courseGroupId: f.courseGroupId,
        courseYearId: f.courseYearId,
      })
    },
    enabled: loadKey != null,
  })

  const filtered = useFilteredRows(rows, search)
  const dataDetails = loadKey ? cascade.contextLabel : ''

  const openUploadedFiles = (row: AffiliatedSummaryRow) => {
    setUnivAffiliatedContext(UNIV_AFFILIATED_STORAGE.uploadedFilesSummary, enrichSummaryRow(row, cascade))
    router.push('/affiliated-colleges/university-affiliated-colleges/view-uploaded-files')
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
        {orgCode === 'SUK' ? (
          <div className="mb-4 text-center text-sm text-muted-foreground">
            {/* Angular SUK_BANNER_NEW.jpg — asset path may vary per deployment */}
            <p className="font-semibold">SUK</p>
          </div>
        ) : null}
        <strong className="block mb-2">
          Affiliated Colleges Data
          {dataDetails ? <span className="text-blue-600 font-medium"> — {dataDetails}</span> : null}
        </strong>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="border p-2 text-left">Sl.no</th>
              <th className="border p-2 text-left">Uploaded File Type</th>
              <th className="border p-2 text-left">Uploaded Count</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, i) => (
              <tr key={i}>
                <td className="border p-2">{i + 1}</td>
                <td className="border p-2">{String(row.file_name ?? '')}</td>
                <td className="border p-2">{String(row.cnt ?? '')}</td>
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

      <AffiliatedCollegeFilters
        title="University Affiliated Colleges"
        cascade={cascade}
        allowAllGroupYear
        onGetDetails={() => {
          if (!cascade.filtersValid) return
          setLoadKey(JSON.stringify(cascade.toFilterParams()))
        }}
        loadingDetails={isFetching}
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
            onExport={() => exportHtmlTableAsExcel(tableRef.current, 'Affiliated_Colleges')}
            onPrint={handlePrint}
          />

          <div className="overflow-x-auto p-4">
            <table ref={tableRef} className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="p-2 text-left font-medium">SNo</th>
                  <th className="p-2 text-left font-medium">Uploaded File Type</th>
                  <th className="p-2 text-left font-medium">Uploaded Files Count</th>
                  <th className="p-2 text-left font-medium action">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, i) => (
                  <tr key={i} className="border-b hover:bg-muted/20">
                    <td className="p-2">{i + 1}</td>
                    <td className="p-2">{String(row.file_name ?? '')}</td>
                    <td className="p-2">{String(row.cnt ?? '')}</td>
                    <td className="p-2 action">
                      <button
                        type="button"
                        className="text-primary hover:opacity-80"
                        title="Preview"
                        onClick={() => openUploadedFiles(row)}
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
    </PageContainer>
  )
}
