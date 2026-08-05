'use client'

/**
 * Angular `feedback/feedback-status-report` — Feedback Status Report.
 */

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import type { ColDef } from 'ag-grid-community'
import { FilteredListPage } from '@/components/layout'
import { Select } from '@/common/components/select'
import { Button } from '@/components/ui/button'
import { QK } from '@/lib/query-keys'
import { toastError, toastSuccess } from '@/lib/toast'
import { getErrorMessage } from '@/lib/errors'
import {
  getFeedbackStatusReportRows,
  listAcademicYearsByUniversity,
  listActiveCollegesForGeneralSettings,
  type FeedbackStatusReportRow,
} from '@/services'

const n = (v: unknown) => {
  const x = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(x) ? x : 0
}
const s = (v: unknown) => String(v ?? '').trim()

const COL_DEFS = {
  siNo: {
    field: 'id',
    headerName: 'S.No',
    width: 80,
    flex: 0,
    sortable: false,
    filter: false,
  } as ColDef<FeedbackStatusReportRow>,
  survey: {
    field: 'survey_name',
    headerName: 'Survey',
    minWidth: 160,
  } as ColDef<FeedbackStatusReportRow>,
  student: {
    field: 'student_name',
    headerName: 'Student',
    minWidth: 160,
  } as ColDef<FeedbackStatusReportRow>,
  rollNo: {
    field: 'roll_number',
    headerName: 'Roll No',
    minWidth: 120,
  } as ColDef<FeedbackStatusReportRow>,
  employee: {
    field: 'Emp_Name',
    headerName: 'Employee',
    minWidth: 160,
  } as ColDef<FeedbackStatusReportRow>,
  empNo: {
    field: 'emp_number',
    headerName: 'Emp. No',
    minWidth: 120,
  } as ColDef<FeedbackStatusReportRow>,
  status: {
    field: 'Feedback_form_Status',
    headerName: 'Status',
    minWidth: 120,
  } as ColDef<FeedbackStatusReportRow>,
}

export default function FeedbackStatusReportPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const backPath = searchParams.get('path') || 'dashboard'

  const [collegeId, setCollegeId] = useState<string | null>(null)
  const [academicYearId, setAcademicYearId] = useState<string | null>(null)
  const [rows, setRows] = useState<FeedbackStatusReportRow[]>([])
  const [loadingList, setLoadingList] = useState(false)
  const [hasFetched, setHasFetched] = useState(false)

  const collegesQuery = useQuery({
    queryKey: QK.feedbackStatusReport.colleges(),
    queryFn: listActiveCollegesForGeneralSettings,
  })

  const colleges = collegesQuery.data ?? []

  useEffect(() => {
    if (collegeId || colleges.length === 0) return
    setCollegeId(String(colleges[0].collegeId))
  }, [colleges, collegeId])

  const universityId = useMemo(() => {
    const c = colleges.find((x) => n(x.collegeId) === n(collegeId))
    return n(c?.universityId)
  }, [colleges, collegeId])

  const academicYearsQuery = useQuery({
    queryKey: QK.feedbackStatusReport.academicYears(universityId),
    queryFn: () => listAcademicYearsByUniversity(universityId),
    enabled: universityId > 0,
  })

  const academicYears = academicYearsQuery.data ?? []

  useEffect(() => {
    setAcademicYearId(null)
    setRows([])
    setHasFetched(false)
  }, [collegeId])

  const collegeOptions = useMemo(
    () =>
      colleges.map((c) => ({
        value: String(c.collegeId),
        label: String(c.collegeCode ?? c.collegeName ?? c.collegeId),
      })),
    [colleges],
  )

  const ayOptions = useMemo(
    () =>
      academicYears.map((a) => ({
        value: String(n(a.academicYearId ?? a.fk_academic_year_id)),
        label: s(a.academicYear ?? a.academic_year) ||
          String(n(a.academicYearId ?? a.fk_academic_year_id)),
      })),
    [academicYears],
  )

  const columnDefs = useMemo<ColDef<FeedbackStatusReportRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.survey,
      COL_DEFS.student,
      COL_DEFS.rollNo,
      COL_DEFS.employee,
      COL_DEFS.empNo,
      COL_DEFS.status,
    ],
    [],
  )

  const canGetList = Boolean(collegeId) && Boolean(academicYearId)

  async function handleGetList() {
    if (!canGetList) {
      toastError('Please fill all required filters.')
      return
    }
    setLoadingList(true)
    setHasFetched(true)
    try {
      const list = await getFeedbackStatusReportRows({
        collegeId: n(collegeId),
        academicYearId: n(academicYearId),
      })
      setRows(list)
      if (list.length === 0) toastSuccess('No records found.')
    } catch (e) {
      setRows([])
      toastError(getErrorMessage(e) || 'Failed to load feedback status')
    } finally {
      setLoadingList(false)
    }
  }

  function handleBack() {
    const path = backPath.startsWith('/') ? backPath : `/${backPath}`
    router.push(path)
  }

  const showTable = hasFetched && rows.length > 0

  return (
    <FilteredListPage
      title="Feedback Status Report"
      filters={
        <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-12">
          <div className="lg:col-span-2">
            <Select
              label="College"
              required
              value={collegeId}
              onChange={setCollegeId}
              options={collegeOptions}
              placeholder="College"
              isLoading={collegesQuery.isLoading}
            />
          </div>
          <div className="lg:col-span-2">
            <Select
              label="Academic Year"
              required
              value={academicYearId}
              onChange={(v) => {
                setAcademicYearId(v)
                setRows([])
                setHasFetched(false)
              }}
              options={ayOptions}
              placeholder="Academic Year"
              isLoading={academicYearsQuery.isLoading}
              disabled={!collegeId}
            />
          </div>
          <div className="flex gap-2 lg:col-span-3">
            <Button
              type="button"
              className="h-9 flex-1"
              disabled={loadingList}
              onClick={() => void handleGetList()}
            >
              Get List
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-9 flex-1"
              onClick={handleBack}
            >
              Back
            </Button>
          </div>
        </div>
      }
      rowData={showTable ? rows : []}
      columnDefs={columnDefs}
      loading={loadingList || collegesQuery.isLoading}
      resultsVisible={showTable}
      hideEmptyGrid
      pagination
      paginationPageSize={10}
      toolbar={{
        search: true,
        searchPlaceholder: 'Search',
        pdfDocumentTitle: 'Feedback Status Report',
      }}
    />
  )
}
