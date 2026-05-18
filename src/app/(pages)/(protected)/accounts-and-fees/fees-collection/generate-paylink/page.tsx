'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { BookOpen } from 'lucide-react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Table, type TableColumn } from '@/common/components/table'
import { FilterCard, FILTER_CARD_SELECT_CLASS } from '@/common/components/feedback'
import { SearchInput } from '@/common/components/search'
import { Select } from '@/common/components/select'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { useSessionContext } from '@/context/SessionContext'
import { useLoginEmployeeId } from '@/hooks/useLoginEmployeeId'
import { GM_CODES } from '@/config/constants/ui'
import { QK } from '@/lib/query-keys'
import { toastError, toastSuccess } from '@/lib/toast'
import {
  getFeeMasterCollegeFilters,
  getGeneralDetails,
  listBatchesByCourse,
  listFeeCollectionQuotaOptions,
  listFeeDueNotifications,
  sendFeeDueNotifications,
} from '@/services'
import type { FeeDueNotificationRow } from '@/types/fees-collection'
import type { GeneralDetail } from '@/types/exam-master'
import {
  collegeOption,
  courseGroupOption,
  courseOption,
  courseYearOption,
  filterColleges,
  filterCourseGroups,
  filterCourseYears,
  filterCourses,
  pickNum,
  pickText,
  type FilterRow,
} from '../../fee-masters/_lib/fee-master-filters'

const ALL_OPTION = { value: '0', label: 'All' }

function gmDetailOption(row: GeneralDetail | FilterRow) {
  const id = pickNum(row as FilterRow, ['pk_gd_id', 'generalDetailId'])
  return {
    value: String(id),
    label:
      pickText(row as FilterRow, ['gd_name', 'generalDetailName', 'gd_code']) || String(id),
  }
}

function paylinkRowMatchesSearch(row: FeeDueNotificationRow, q: string): boolean {
  const hay = [
    row.first_name,
    row.hallticket_number,
    row.structure_name,
    row.group_code,
    row.fee_due_year,
    row.due_amount != null ? String(row.due_amount) : '',
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return hay.includes(q)
}

function buildContextLabel(
  collegeId: string | null,
  courseId: string | null,
  courseGroupId: string | null,
  courseYearId: string | null,
  quotaId: string | null,
  batchId: string | null,
  studentStatusId: string | null,
  colleges: FilterRow[],
  courses: FilterRow[],
  groups: FilterRow[],
  years: FilterRow[],
  quotas: GeneralDetail[],
  batches: FilterRow[],
  statuses: GeneralDetail[],
): string {
  const parts: string[] = []
  const college = colleges.find((r) => String(pickNum(r, ['fk_college_id', 'collegeId'])) === collegeId)
  if (college) parts.push(pickText(college, ['college_code', 'collegeCode']))
  const course = courses.find((r) => String(pickNum(r, ['fk_course_id', 'courseId'])) === courseId)
  if (course) parts.push(pickText(course, ['course_code', 'courseCode']))
  if (courseGroupId && courseGroupId !== '0') {
    const g = groups.find((r) => String(pickNum(r, ['fk_course_group_id', 'courseGroupId'])) === courseGroupId)
    if (g) parts.push(pickText(g, ['group_code', 'groupCode']))
  }
  if (courseYearId && courseYearId !== '0') {
    const y = years.find((r) => String(pickNum(r, ['fk_course_year_id', 'courseYearId'])) === courseYearId)
    if (y) parts.push(pickText(y, ['course_year_name', 'courseYearName']))
  }
  if (quotaId && quotaId !== '0') {
    const q = quotas.find((r) => String(r.generalDetailId ?? '') === quotaId)
    if (q) parts.push(String(q.generalDetailName ?? q.generalDetailId ?? ''))
  }
  if (batchId && batchId !== '0') {
    const b = batches.find((r) => String(pickNum(r, ['batchId', 'batch_id'])) === batchId)
    if (b) parts.push(pickText(b, ['batchName', 'batch_name']))
  }
  if (studentStatusId && studentStatusId !== '0') {
    const s = statuses.find((r) => String(r.generalDetailId ?? '') === studentStatusId)
    if (s) parts.push(String(s.generalDetailName ?? s.generalDetailId ?? ''))
  }
  return parts.join(' / ')
}

export default function GeneratePaylinkPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isLoading: sessionLoading } = useSessionContext()
  const { employeeId, isResolving: empResolving } = useLoginEmployeeId(user, sessionLoading)
  const orgId =
    Number(user?.organizationId ?? 0) ||
    Number(globalThis.localStorage?.getItem('organizationId') ?? 0) ||
    1
  const backPath = searchParams.get('path')

  const [collegeId, setCollegeId] = useState<string | null>(null)
  const [courseId, setCourseId] = useState<string | null>(null)
  const [courseGroupId, setCourseGroupId] = useState<string>('0')
  const [courseYearId, setCourseYearId] = useState<string>('0')
  const [quotaId, setQuotaId] = useState<string>('0')
  const [batchId, setBatchId] = useState<string>('0')
  const [studentStatusId, setStudentStatusId] = useState<string>('0')
  const [listEnabled, setListEnabled] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [filtersReady, setFiltersReady] = useState(false)

  const {
    data: filterBundle,
    isLoading: filtersLoading,
    isError: filtersError,
  } = useQuery({
    queryKey: QK.feesCollection.feeMgmtFilters(orgId, employeeId),
    queryFn: () => getFeeMasterCollegeFilters(orgId, employeeId),
    enabled: !sessionLoading && !empResolving && orgId > 0,
  })

  const { data: quotaOptions = [] } = useQuery({
    queryKey: ['feesCollection', 'quotas'],
    queryFn: listFeeCollectionQuotaOptions,
  })

  const { data: studentStatusOptions = [] } = useQuery({
    queryKey: ['feesCollection', 'studentStatuses'],
    queryFn: () => getGeneralDetails(GM_CODES.STUDENT_STATUS),
  })

  useEffect(() => {
    if (filtersError) toastError(filtersError, 'Failed to load faculty filters')
  }, [filtersError])

  const filtersData = filterBundle?.filtersData ?? []

  const colleges = useMemo(() => filterColleges(filtersData), [filtersData])
  const courses = useMemo(
    () => filterCourses(filtersData, collegeId ? Number(collegeId) : null),
    [filtersData, collegeId],
  )
  const courseGroups = useMemo(
    () =>
      filterCourseGroups(
        filtersData,
        collegeId ? Number(collegeId) : null,
        courseId ? Number(courseId) : null,
      ),
    [filtersData, collegeId, courseId],
  )
  const courseYears = useMemo(
    () =>
      filterCourseYears(
        filtersData,
        collegeId ? Number(collegeId) : null,
        courseId ? Number(courseId) : null,
        courseGroupId && courseGroupId !== '0' ? Number(courseGroupId) : null,
      ),
    [filtersData, collegeId, courseId, courseGroupId],
  )

  const filterFieldsLoading = filtersLoading || empResolving || sessionLoading

  const { data: batches = [] } = useQuery({
    queryKey: ['feesCollection', 'batches', courseId],
    queryFn: () => listBatchesByCourse(Number(courseId)),
    enabled: !!courseId && Number(courseId) > 0,
  })

  const dueFilters = useMemo(
    () => ({
      collegeId: Number(collegeId ?? 0),
      courseId: Number(courseId ?? 0),
      courseGroupId: Number(courseGroupId) || undefined,
      courseYearId: Number(courseYearId) || undefined,
      quotaId: Number(quotaId) || undefined,
      batchId: Number(batchId) || undefined,
      studentStatusId: Number(studentStatusId) || undefined,
      listEnabled,
    }),
    [collegeId, courseId, courseGroupId, courseYearId, quotaId, batchId, studentStatusId, listEnabled],
  )

  const { data: dueRows = [], isLoading, refetch } = useQuery({
    queryKey: QK.feesCollection.feeDueNotifications(dueFilters),
    queryFn: () =>
      listFeeDueNotifications({
        collegeId: dueFilters.collegeId,
        courseId: dueFilters.courseId,
        courseGroupId: dueFilters.courseGroupId,
        courseYearId: dueFilters.courseYearId,
        quotaId: dueFilters.quotaId,
        batchId: dueFilters.batchId,
        studentStatusId: dueFilters.studentStatusId,
      }),
    enabled: listEnabled && dueFilters.collegeId > 0 && dueFilters.courseId > 0,
  })

  const notifyMutation = useMutation({
    mutationFn: (ids: number[]) => sendFeeDueNotifications(ids),
    onSuccess: () => {
      toastSuccess('Payment notification sent')
      void refetch()
    },
    onError: (e) => toastError(e),
  })

  useEffect(() => {
    if (filtersReady || colleges.length === 0) return
    const firstCollege = String(pickNum(colleges[0], ['fk_college_id', 'collegeId']))
    const collegeCourses = filterCourses(filtersData, Number(firstCollege))
    const firstCourse =
      collegeCourses.length > 0
        ? String(pickNum(collegeCourses[0], ['fk_course_id', 'courseId']))
        : null
    const groups = filterCourseGroups(filtersData, Number(firstCollege), firstCourse ? Number(firstCourse) : null)
    const firstGroup =
      groups.length > 0 ? String(pickNum(groups[0], ['fk_course_group_id', 'courseGroupId'])) : '0'
    const years = filterCourseYears(
      filtersData,
      Number(firstCollege),
      firstCourse ? Number(firstCourse) : null,
      firstGroup !== '0' ? Number(firstGroup) : null,
    )
    const firstYear =
      years.length > 0 ? String(pickNum(years[0], ['fk_course_year_id', 'courseYearId'])) : '0'

    setCollegeId(firstCollege)
    setCourseId(firstCourse)
    setCourseGroupId(firstGroup)
    setCourseYearId(firstYear)
    setFiltersReady(true)
  }, [colleges, filtersData, filtersReady])

  const filteredRows = useMemo(() => {
    const q = searchText.trim().toLowerCase()
    if (!q) return dueRows
    return dueRows.filter((r) => paylinkRowMatchesSearch(r, q))
  }, [dueRows, searchText])

  const contextLabel = useMemo(
    () =>
      buildContextLabel(
        collegeId,
        courseId,
        courseGroupId,
        courseYearId,
        quotaId,
        batchId,
        studentStatusId,
        colleges,
        courses,
        courseGroups,
        courseYears,
        quotaOptions,
        batches,
        studentStatusOptions,
      ),
    [
      collegeId,
      courseId,
      courseGroupId,
      courseYearId,
      quotaId,
      batchId,
      studentStatusId,
      colleges,
      courses,
      courseGroups,
      courseYears,
      quotaOptions,
      batches,
      studentStatusOptions,
    ],
  )

  const handleCollegeChange = useCallback(
    (v: string | null) => {
      setCollegeId(v)
      setListEnabled(false)
      const nextCourses = filterCourses(filtersData, v ? Number(v) : null)
      const nextCourse =
        nextCourses.length > 0 ? String(pickNum(nextCourses[0], ['fk_course_id', 'courseId'])) : null
      setCourseId(nextCourse)
      setCourseGroupId('0')
      setCourseYearId('0')
      setQuotaId('0')
      setBatchId('0')
      setStudentStatusId('0')
    },
    [filtersData],
  )

  const handleCourseChange = useCallback(
    (v: string | null) => {
      setCourseId(v)
      setListEnabled(false)
      const groups = filterCourseGroups(
        filtersData,
        collegeId ? Number(collegeId) : null,
        v ? Number(v) : null,
      )
      const firstGroup =
        groups.length > 0 ? String(pickNum(groups[0], ['fk_course_group_id', 'courseGroupId'])) : '0'
      setCourseGroupId(firstGroup)
      const years = filterCourseYears(
        filtersData,
        collegeId ? Number(collegeId) : null,
        v ? Number(v) : null,
        firstGroup !== '0' ? Number(firstGroup) : null,
      )
      setCourseYearId(
        years.length > 0 ? String(pickNum(years[0], ['fk_course_year_id', 'courseYearId'])) : '0',
      )
      setQuotaId('0')
      setBatchId('0')
      setStudentStatusId('0')
    },
    [filtersData, collegeId],
  )

  const handleGroupChange = useCallback(
    (v: string | null) => {
      const gid = v ?? '0'
      setCourseGroupId(gid)
      setListEnabled(false)
      const years = filterCourseYears(
        filtersData,
        collegeId ? Number(collegeId) : null,
        courseId ? Number(courseId) : null,
        gid !== '0' ? Number(gid) : null,
      )
      setCourseYearId(
        years.length > 0 ? String(pickNum(years[0], ['fk_course_year_id', 'courseYearId'])) : '0',
      )
    },
    [filtersData, collegeId, courseId],
  )

  const tableColumns = useMemo<TableColumn<FeeDueNotificationRow>[]>(
    () => [
      {
        id: 'si',
        label: 'S.No',
        width: 6,
        render: (_row, index) => index + 1,
      },
      {
        id: 'student',
        label: 'Student',
        width: 24,
        render: (row) => (
          <span>
            {row.first_name}{' '}
            <span className="font-medium text-blue-600">({row.hallticket_number})</span>
          </span>
        ),
      },
      {
        id: 'academic',
        label: 'Academic Details',
        width: 34,
        render: (row) =>
          [row.structure_name, row.group_code, row.fee_due_year].filter(Boolean).join(' / '),
      },
      {
        id: 'due',
        label: 'Balance Due',
        width: 12,
        render: (row) =>
          row.due_amount != null ? Number(row.due_amount).toFixed(2) : '',
      },
      {
        id: 'actions',
        label: 'Actions',
        width: 24,
        type: 'action',
        render: (row) =>
          row.is_sms_sent ? (
            <span className="text-slate-600">Email Sent</span>
          ) : (
            <Button
              type="button"
              size="sm"
              className="h-8 bg-[#ffcf46] hover:bg-[#e6ba3f] text-slate-900"
              disabled={notifyMutation.isPending}
              onClick={() => {
                const id = Number(row.pk_fee_stdduepayment_id ?? 0)
                if (id) notifyMutation.mutate([id])
              }}
            >
              Send Notification
            </Button>
          ),
      },
    ],
    [notifyMutation],
  )

  const pendingIds = useMemo(
    () =>
      dueRows
        .filter((r) => !r.is_sms_sent)
        .map((r) => Number(r.pk_fee_stdduepayment_id ?? 0))
        .filter((id) => id > 0),
    [dueRows],
  )

  return (
    <PageContainer className="space-y-5">
      <FilterCard
        title={
          <span className="inline-flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-slate-500" />
            Generate Pay Link
          </span>
        }
      >
        <div className="flex flex-nowrap items-end gap-3 overflow-x-auto pb-0.5">
          <Select
            className={`min-w-[7rem] shrink-0 ${FILTER_CARD_SELECT_CLASS}`}
            label="Faculty"
            required
            value={collegeId}
            onChange={handleCollegeChange}
            options={colleges.map(collegeOption)}
            isLoading={filterFieldsLoading}
            searchable
          />
          <Select
            className={`min-w-[7rem] shrink-0 ${FILTER_CARD_SELECT_CLASS}`}
            label="Course"
            required
            value={courseId}
            onChange={handleCourseChange}
            options={courses.map(courseOption)}
            disabled={!collegeId}
            searchable
          />
          <Select
            className={`min-w-[7rem] shrink-0 ${FILTER_CARD_SELECT_CLASS}`}
            label="Branch"
            value={courseGroupId}
            onChange={handleGroupChange}
            options={[ALL_OPTION, ...courseGroups.map(courseGroupOption)]}
            disabled={!courseId}
            searchable
          />
          <Select
            className={`min-w-[8rem] shrink-0 ${FILTER_CARD_SELECT_CLASS}`}
            label="Semester"
            value={courseYearId}
            onChange={(v) => {
              setCourseYearId(v ?? '0')
              setListEnabled(false)
            }}
            options={[ALL_OPTION, ...courseYears.map(courseYearOption)]}
            disabled={!courseId}
            searchable
          />
          <Select
            className={`min-w-[7rem] shrink-0 ${FILTER_CARD_SELECT_CLASS}`}
            label="Quota"
            value={quotaId}
            onChange={(v) => {
              setQuotaId(v ?? '0')
              setListEnabled(false)
            }}
            options={[ALL_OPTION, ...quotaOptions.map(gmDetailOption)]}
            searchable
          />
          <Select
            className={`min-w-[7rem] shrink-0 ${FILTER_CARD_SELECT_CLASS}`}
            label="Batch"
            value={batchId}
            onChange={(v) => {
              setBatchId(v ?? '0')
              setListEnabled(false)
            }}
            options={[
              ALL_OPTION,
              ...batches.map((b) => ({
                value: String(b.batchId ?? b.batch_id ?? ''),
                label: String(b.batchName ?? b.batch_name ?? b.batchId ?? ''),
              })),
            ]}
            disabled={!courseId}
            searchable
          />
          <Select
            className={`min-w-[8rem] shrink-0 ${FILTER_CARD_SELECT_CLASS}`}
            label="Student Status"
            value={studentStatusId}
            onChange={(v) => {
              setStudentStatusId(v ?? '0')
              setListEnabled(false)
            }}
            options={[ALL_OPTION, ...studentStatusOptions.map(gmDetailOption)]}
            searchable
          />
          <Button
            type="button"
            className="h-9 shrink-0 whitespace-nowrap px-4"
            disabled={!collegeId || !courseId}
            onClick={() => setListEnabled(true)}
          >
            Get Due List
          </Button>
          {backPath ? (
            <Button
              type="button"
              variant="outline"
              className="h-9 shrink-0 whitespace-nowrap border-amber-300 bg-[#ffcf46] px-4 text-slate-900 hover:bg-[#e6ba3f]"
              onClick={() => router.push(backPath.startsWith('/') ? backPath : `/${backPath}`)}
            >
              Back
            </Button>
          ) : null}
        </div>
      </FilterCard>

      {listEnabled && dueRows.length > 0 ? (
        <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">
            Generate Pay Link
            {contextLabel ? <span className="font-normal text-slate-600"> ({contextLabel})</span> : null}
          </h2>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <SearchInput
              value={searchText}
              onChange={setSearchText}
              placeholder="Search"
              className="max-w-xs"
            />
          </div>

          <Table
            rows={filteredRows}
            columns={tableColumns}
            loading={isLoading}
            embedded
            emptyText="No students with fee due."
            pageSize={0}
          />

          <div className="flex justify-end">
            <Button
              type="button"
              className="bg-[#ffcf46] hover:bg-[#e6ba3f] text-slate-900"
              disabled={pendingIds.length === 0 || notifyMutation.isPending}
              onClick={() => notifyMutation.mutate(pendingIds)}
            >
              Send Notification
            </Button>
          </div>
        </section>
      ) : listEnabled && !isLoading ? (
        <p className="text-sm text-slate-500">No students with fee due for the selected filters.</p>
      ) : null}
    </PageContainer>
  )
}
