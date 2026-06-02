'use client'

import { useMemo, useState } from 'react'
import type { ColDef } from 'ag-grid-community'
import { useQuery } from '@tanstack/react-query'
import { DataTable, TableCard } from '@/common/components/table'
import { FilterCard } from '@/common/components/feedback'
import { Select } from '@/common/components/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageContainer } from '@/components/layout'
import { useSessionContext } from '@/context/SessionContext'
import { useLoginEmployeeId } from '@/hooks/useLoginEmployeeId'
import { QK } from '@/lib/query-keys'
import { resolveOrganizationId } from '@/lib/user-context'
import { rowIndexGetter } from '@/lib/utils'
import { getAdmissionUnivFilters, listFeePaidApplications } from '@/services'
import type { FeePaidApplicationRow } from '@/types/admission'
import {
  collegeOption,
  courseGroupOption,
  courseOption,
  filterCollegesByUniversity,
  filterCourseGroupsByUniversityCollegeAndCourse,
  filterCoursesByUniversityAndCollege,
  filterUniversities,
  universityOption,
} from '../../_lib/admission-filters'

const COL_DEFS = {
  siNo: { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<FeePaidApplicationRow>,
  university_code: { field: 'university_code', headerName: 'University', minWidth: 90 } as ColDef<FeePaidApplicationRow>,
  college_code: { field: 'college_code', headerName: 'College', minWidth: 90 } as ColDef<FeePaidApplicationRow>,
  course_code: { field: 'course_code', headerName: 'Course', minWidth: 90 } as ColDef<FeePaidApplicationRow>,
  group_code: { field: 'group_code', headerName: 'Group', minWidth: 80 } as ColDef<FeePaidApplicationRow>,
  application_no: { field: 'application_no', headerName: 'App No', minWidth: 110 } as ColDef<FeePaidApplicationRow>,
  first_name: { field: 'first_name', headerName: 'Name', minWidth: 130, flex: 1 } as ColDef<FeePaidApplicationRow>,
  mobile: { field: 'mobile', headerName: 'Mobile', minWidth: 110, flex: 0 } as ColDef<FeePaidApplicationRow>,
  payment_status: { field: 'payment_status', headerName: 'Payment', minWidth: 100 } as ColDef<FeePaidApplicationRow>,
  amount: { field: 'amount', headerName: 'Amount', minWidth: 90, flex: 0 } as ColDef<FeePaidApplicationRow>,
}

export default function FeePaidApplicationsListPage() {
  const { user, isLoading: sessionLoading } = useSessionContext()
  const orgId = resolveOrganizationId(user) || 1
  const { employeeId: empId, isResolving: empResolving } = useLoginEmployeeId(user, sessionLoading)

  const [universityId, setUniversityId] = useState<string | null>(null)
  const [collegeId, setCollegeId] = useState<string | null>(null)
  const [courseId, setCourseId] = useState<string | null>(null)
  const [courseGroupId, setCourseGroupId] = useState<string | null>(null)
  const [applicationNo, setApplicationNo] = useState('')

  const filtersEnabled = !sessionLoading && !empResolving && orgId > 0 && empId > 0

  const { data: filterBundle, isLoading: filtersLoading } = useQuery({
    queryKey: QK.admission.univFilters(orgId, empId),
    queryFn: () => getAdmissionUnivFilters(orgId, empId),
    enabled: filtersEnabled,
  })

  const filtersData = filterBundle?.filtersData ?? []

  const universityOptions = useMemo(
    () => filterUniversities(filtersData).map(universityOption),
    [filtersData],
  )

  const collegeOptions = useMemo(
    () =>
      filterCollegesByUniversity(filtersData, universityId ? Number(universityId) : null).map(
        collegeOption,
      ),
    [filtersData, universityId],
  )

  const courseOptions = useMemo(
    () =>
      filterCoursesByUniversityAndCollege(
        filtersData,
        universityId ? Number(universityId) : null,
        collegeId ? Number(collegeId) : null,
      ).map(courseOption),
    [filtersData, universityId, collegeId],
  )

  const courseGroupOptions = useMemo(
    () =>
      filterCourseGroupsByUniversityCollegeAndCourse(
        filtersData,
        universityId ? Number(universityId) : null,
        collegeId ? Number(collegeId) : null,
        courseId ? Number(courseId) : null,
      ).map(courseGroupOption),
    [filtersData, universityId, collegeId, courseId],
  )

  /** Table loads only after course group is selected (empty by default). */
  const listReady = Boolean(
    universityId && collegeId && courseId && courseGroupId,
  )

  const listParams = useMemo(
    () => ({
      universityId: Number(universityId),
      collegeId: Number(collegeId),
      courseId: Number(courseId),
      courseGroupId: Number(courseGroupId),
      applicationNo,
    }),
    [universityId, collegeId, courseId, courseGroupId, applicationNo],
  )

  const { data: rows = [], isLoading } = useQuery({
    queryKey: QK.admission.feePaidApplications(listParams),
    queryFn: () => listFeePaidApplications(listParams),
    enabled: listReady,
  })

  const filterSummary = useMemo(() => {
    if (!listReady) return ''
    const parts = [
      universityOptions.find((o) => o.value === universityId)?.label,
      collegeOptions.find((o) => o.value === collegeId)?.label,
      courseOptions.find((o) => o.value === courseId)?.label,
      courseGroupOptions.find((o) => o.value === courseGroupId)?.label,
    ].filter(Boolean)
    return parts.join(' / ')
  }, [
    listReady,
    universityOptions,
    universityId,
    collegeOptions,
    collegeId,
    courseOptions,
    courseId,
    courseGroupOptions,
    courseGroupId,
  ])

  const columnDefs = useMemo(() => Object.values(COL_DEFS), [])

  function resetBelowUniversity() {
    setCollegeId(null)
    setCourseId(null)
    setCourseGroupId(null)
  }

  function resetBelowCollege() {
    setCourseId(null)
    setCourseGroupId(null)
  }

  function resetBelowCourse() {
    setCourseGroupId(null)
  }

  return (
    <PageContainer className="space-y-5">
      <FilterCard title="Fee Paid Applications">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Select
            label="University"
            value={universityId}
            onChange={(v) => {
              setUniversityId(v)
              resetBelowUniversity()
            }}
            options={universityOptions}
            isLoading={filtersLoading}
            searchable
            placeholder="Select university"
          />
          <Select
            label="College"
            value={collegeId}
            onChange={(v) => {
              setCollegeId(v)
              resetBelowCollege()
            }}
            options={collegeOptions}
            searchable
            placeholder="Select college"
            disabled={!universityId}
          />
          <Select
            label="Course"
            value={courseId}
            onChange={(v) => {
              setCourseId(v)
              resetBelowCourse()
            }}
            options={courseOptions}
            searchable
            placeholder="Select course"
            disabled={!collegeId}
          />
          <Select
            label="Course Group"
            value={courseGroupId}
            onChange={setCourseGroupId}
            options={courseGroupOptions}
            searchable
            placeholder="Select course group"
            disabled={!courseId}
          />
          <div className="space-y-1.5">
            <Label>Application No (optional)</Label>
            <Input
              value={applicationNo}
              onChange={(e) => setApplicationNo(e.target.value)}
              disabled={!listReady}
            />
          </div>
        </div>
      </FilterCard>

      {listReady && (
        <>
          {filterSummary && (
            <div className="app-card overflow-hidden px-4 py-3">
              <h2 className="text-[15px] font-semibold leading-tight text-[hsl(var(--card-title))]">
                Fee Paid Applications — {filterSummary}
              </h2>
            </div>
          )}

          <TableCard withHeaderBorder={false}>
            <DataTable
              rowData={rows}
              columnDefs={columnDefs}
              loading={isLoading || filtersLoading}
              pagination
              toolbar={{
                search: true,
                searchPlaceholder: 'Search fee paid applications…',
                pdfDocumentTitle: 'Fee Paid Applications',
              }}
            />
          </TableCard>
        </>
      )}
    </PageContainer>
  )
}
