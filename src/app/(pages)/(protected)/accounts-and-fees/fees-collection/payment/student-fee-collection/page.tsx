'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { DataTable, TableCard } from '@/common/components/table'
import { FilterCard, FILTER_CARD_SELECT_CLASS } from '@/common/components/feedback'
import { Select } from '@/common/components/select'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { useQuery } from '@tanstack/react-query'
import { QK } from '@/lib/query-keys'
import { rowIndexGetter } from '@/lib/utils'
import { toastError } from '@/lib/toast'
import {
  getCourseGroups,
  listAcademicYearsByUniversity,
  listCollegesActive,
  listCourseYearsForFeeCollection,
  listCoursesByUniversity,
  listFeeCollectionQuotaOptions,
  listStudentFeeDue,
} from '@/services'
import type { StudentFeeDueRow } from '@/types/fees-collection'

const PAGE_SIZE = 50

function courseCellRenderer(p: ICellRendererParams<StudentFeeDueRow>) {
  const row = p.data
  if (!row) return null
  const course = [row.courseName, row.groupCode, row.courseYearName, row.section ? `section ${row.section}` : '']
    .filter(Boolean)
    .join(' / ')
  return (
    <span>
      {course}
      {row.academicYear ? (
        <span className="text-blue-600 font-medium"> ({row.academicYear})</span>
      ) : null}
    </span>
  )
}

function makePayRenderer(
  onPay: (row: StudentFeeDueRow) => void,
) {
  return (p: ICellRendererParams<StudentFeeDueRow>) => (
    <Button
      type="button"
      size="sm"
      className="h-8 bg-[#F44336] hover:bg-[#d32f2f] text-white"
      onClick={() => p.data && onPay(p.data)}
    >
      Pay
    </Button>
  )
}

export default function StudentFeeCollectionPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [collegeId, setCollegeId] = useState<string | null>(searchParams.get('collegeId'))
  const [academicYearId, setAcademicYearId] = useState<string | null>(
    searchParams.get('academicYearId'),
  )
  const [quotaId, setQuotaId] = useState<string | null>(searchParams.get('quotaId'))
  const [courseId, setCourseId] = useState<string | null>(searchParams.get('courseId'))
  const [courseGroupId, setCourseGroupId] = useState<string | null>(
    searchParams.get('courseGroupId'),
  )
  const [courseYearId, setCourseYearId] = useState<string | null>(
    searchParams.get('courseYearId'),
  )
  const [universityId, setUniversityId] = useState(0)
  const [page, setPage] = useState(0)
  const [listEnabled, setListEnabled] = useState(false)

  const { data: colleges = [] } = useQuery({
    queryKey: ['feesCollection', 'colleges'],
    queryFn: listCollegesActive,
  })

  const { data: quotas = [] } = useQuery({
    queryKey: ['feesCollection', 'quotas'],
    queryFn: listFeeCollectionQuotaOptions,
  })

  const { data: courses = [] } = useQuery({
    queryKey: ['feesCollection', 'courses', universityId],
    queryFn: () => listCoursesByUniversity(universityId),
    enabled: universityId > 0,
  })

  const { data: academicYears = [] } = useQuery({
    queryKey: ['feesCollection', 'academicYears', universityId],
    queryFn: () => listAcademicYearsByUniversity(universityId),
    enabled: universityId > 0,
  })

  const { data: courseGroups = [] } = useQuery({
    queryKey: ['feesCollection', 'courseGroups', courseId],
    queryFn: () => getCourseGroups(Number(courseId)),
    enabled: !!courseId,
  })

  const { data: courseYears = [] } = useQuery({
    queryKey: ['feesCollection', 'courseYears', courseId],
    queryFn: () => listCourseYearsForFeeCollection(Number(courseId)),
    enabled: !!courseId,
  })

  const collegeOptions = useMemo(
    () =>
      colleges.map((c) => ({
        value: String(c.collegeId ?? ''),
        label: String(c.collegeCode ?? c.collegeId ?? ''),
      })),
    [colleges],
  )

  const quotaOptions = useMemo(
    () =>
      quotas.map((q) => ({
        value: String(q.generalDetailId ?? ''),
        label: String(q.generalDetailDisplayName ?? q.generalDetailName ?? ''),
      })),
    [quotas],
  )

  const courseOptions = useMemo(
    () =>
      courses.map((c) => ({
        value: String(c.courseId ?? ''),
        label: String(c.courseCode ?? c.courseId ?? ''),
      })),
    [courses],
  )

  const academicYearOptions = useMemo(
    () =>
      academicYears.map((a) => ({
        value: String(a.academicYearId ?? ''),
        label: String(a.academicYear ?? a.academicYearId ?? ''),
      })),
    [academicYears],
  )

  const courseGroupOptions = useMemo(
    () =>
      courseGroups.map((g) => ({
        value: String(g.courseGroupId ?? ''),
        label: String(g.groupCode ?? g.courseGroupId ?? ''),
      })),
    [courseGroups],
  )

  const courseYearOptions = useMemo(
    () =>
      courseYears.map((y) => ({
        value: String(y.courseYearId ?? ''),
        label: String(y.courseYearName ?? y.feeLabel ?? y.courseYearId ?? ''),
      })),
    [courseYears],
  )

  const dueFilters = useMemo(
    () => ({
      collegeId: Number(collegeId ?? 0),
      academicYearId: academicYearId ? Number(academicYearId) : null,
      courseId: courseId ? Number(courseId) : null,
      courseGroupId: courseGroupId ? Number(courseGroupId) : null,
      courseYearId: courseYearId ? Number(courseYearId) : null,
      quotaId: quotaId ? Number(quotaId) : null,
      page,
      size: PAGE_SIZE,
    }),
    [collegeId, academicYearId, courseId, courseGroupId, courseYearId, quotaId, page],
  )

  const { data: dueResult, isLoading: dueLoading, isFetching } = useQuery({
    queryKey: QK.feesCollection.studentDue(dueFilters),
    queryFn: () => listStudentFeeDue(dueFilters),
    enabled: listEnabled && dueFilters.collegeId > 0,
  })

  const syncUniversity = useCallback(
    (nextCollegeId: string | null) => {
      const college = colleges.find((c) => String(c.collegeId) === nextCollegeId)
      setUniversityId(Number(college?.universityId ?? college?.fk_university_id ?? 0))
    },
    [colleges],
  )

  useEffect(() => {
    if (collegeId && colleges.length > 0) syncUniversity(collegeId)
  }, [collegeId, colleges, syncUniversity])

  function handleGetDueList() {
    if (!collegeId) {
      toastError('College is required.')
      return
    }
    setPage(0)
    setListEnabled(true)
  }

  function handlePay(row: StudentFeeDueRow) {
    if (!collegeId || !row.studentId) return
    const college = colleges.find((c) => String(c.collegeId) === collegeId)
    const params = new URLSearchParams({
      collegeId,
      studentId: String(row.studentId),
      page: 'student-fee-collection',
    })
    if (academicYearId) params.set('academicYearId', academicYearId)
    if (row.academicYear) params.set('academicYear', String(row.academicYear))
    if (quotaId) params.set('quotaId', quotaId)
    if (row.quotaName) params.set('quotaDisplayName', String(row.quotaName))
    if (courseId) params.set('courseId', courseId)
    if (courseGroupId) params.set('courseGroupId', courseGroupId)
    if (courseYearId) params.set('courseYearId', courseYearId)
    if (row.feeStructureId) params.set('feeStructureId', String(row.feeStructureId))
    if (college?.collegeCode) params.set('collegeCode', String(college.collegeCode))
    if (row.isLateral != null) params.set('isLateral', String(row.isLateral))
    if (row.rollNumber) params.set('rollNumber', String(row.rollNumber))
    if (row.courseName) params.set('courseCode', String(row.courseName))
    if (row.groupName ?? row.groupCode) params.set('groupCode', String(row.groupName ?? row.groupCode))
    if (row.courseYearName) params.set('courseYearName', String(row.courseYearName))
    if (row.section) params.set('section', String(row.section))

    router.push(`/accounts-and-fees/fees-collection/payment/pay-fees?${params}`)
  }

  const columnDefs = useMemo<ColDef<StudentFeeDueRow>[]>(
    () => [
      { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 },
      {
        field: 'hallticketNumber',
        headerName: 'HT No.',
        minWidth: 110,
        valueGetter: (p) => p.data?.hallticketNumber ?? p.data?.rollNumber,
      },
      { field: 'firstName', headerName: 'Student', minWidth: 140 },
      { headerName: 'Course', minWidth: 220, flex: 1.2, cellRenderer: courseCellRenderer },
      { field: 'grossAmount', headerName: 'Gross Amt', minWidth: 100 },
      { field: 'discountAmount', headerName: 'Dis Amt', minWidth: 90 },
      { field: 'fineAmount', headerName: 'LateFee', minWidth: 90 },
      { field: 'netAmount', headerName: 'Net Amt', minWidth: 90 },
      { field: 'paidAmount', headerName: 'Paid Amt', minWidth: 90 },
      { field: 'balanceAmount', headerName: 'Bal Amt', minWidth: 90 },
      {
        headerName: 'Actions',
        minWidth: 90,
        flex: 0,
        width: 90,
        cellRenderer: makePayRenderer(handlePay),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pay handler uses latest filter state
    [collegeId, academicYearId, quotaId, courseId, courseGroupId, courseYearId, colleges],
  )

  const rows = dueResult?.rows ?? []
  const totalCount = dueResult?.totalCount ?? 0

  return (
    <PageContainer className="space-y-5">
      <FilterCard title="Student Fee Collection">
        <div className="flex flex-nowrap items-end gap-3 overflow-x-auto pb-0.5">
          <Select
            className={`min-w-[7.5rem] shrink-0 ${FILTER_CARD_SELECT_CLASS}`}
            label="College"
            required
            value={collegeId}
            onChange={(v) => {
              setCollegeId(v)
              setAcademicYearId(null)
              setCourseId(null)
              setCourseGroupId(null)
              setCourseYearId(null)
              setListEnabled(false)
              syncUniversity(v)
            }}
            options={collegeOptions}
            searchable
          />
          <Select
            className={`min-w-[7.5rem] shrink-0 ${FILTER_CARD_SELECT_CLASS}`}
            label="Academic Year"
            value={academicYearId}
            onChange={(v) => {
              setAcademicYearId(v)
              setListEnabled(false)
            }}
            options={[{ value: '', label: 'Select' }, ...academicYearOptions]}
            searchable
            disabled={!collegeId}
          />
          <Select
            className={`min-w-[7.5rem] shrink-0 ${FILTER_CARD_SELECT_CLASS}`}
            label="Quota"
            value={quotaId}
            onChange={(v) => {
              setQuotaId(v)
              setListEnabled(false)
            }}
            options={[{ value: '', label: 'Select' }, ...quotaOptions]}
            searchable
            disabled={!collegeId}
          />
          <Select
            className={`min-w-[7rem] shrink-0 ${FILTER_CARD_SELECT_CLASS}`}
            label="Course"
            value={courseId}
            onChange={(v) => {
              setCourseId(v)
              setCourseGroupId(null)
              setCourseYearId(null)
              setListEnabled(false)
            }}
            options={[{ value: '', label: 'Select' }, ...courseOptions]}
            searchable
            disabled={!collegeId}
          />
          <Select
            className={`min-w-[7.5rem] shrink-0 ${FILTER_CARD_SELECT_CLASS}`}
            label="Course Group"
            value={courseGroupId}
            onChange={(v) => {
              setCourseGroupId(v)
              setCourseYearId(null)
              setListEnabled(false)
            }}
            options={[{ value: '', label: 'Select' }, ...courseGroupOptions]}
            searchable
            disabled={!courseId}
          />
          <Select
            className={`min-w-[7.5rem] shrink-0 ${FILTER_CARD_SELECT_CLASS}`}
            label="Course Year"
            value={courseYearId}
            onChange={(v) => {
              setCourseYearId(v)
              setListEnabled(false)
            }}
            options={[{ value: '', label: 'Select' }, ...courseYearOptions]}
            searchable
            disabled={!courseId}
          />
          <Button
            type="button"
            className="h-9 shrink-0 whitespace-nowrap px-4"
            onClick={handleGetDueList}
          >
            Get Due List
          </Button>
        </div>
      </FilterCard>

      {listEnabled ? (
        <TableCard withHeaderBorder={false}>
          <DataTable
            columnDefs={columnDefs}
            rowData={rows}
            loading={dueLoading || isFetching}
            serverSide
            totalCount={totalCount}
            currentPage={page}
            paginationPageSize={PAGE_SIZE}
            onPageChange={(nextPage) => setPage(nextPage)}
            pagination
            height="auto"
          />
        </TableCard>
      ) : null}
    </PageContainer>
  )
}


