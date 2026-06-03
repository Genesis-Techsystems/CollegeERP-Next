'use client'

import { useMemo, useState } from 'react'
import { PencilIcon, PlusIcon } from 'lucide-react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { useQuery } from '@tanstack/react-query'
import { useCrudList } from '@/hooks/useCrudList'
import { DataTable, TableCard } from '@/common/components/table'
import { FilterCard } from '@/common/components/feedback'
import { StatusBadge } from '@/common/components/data-display'
import { Select } from '@/common/components/select'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { useSessionContext } from '@/context/SessionContext'
import { useLoginEmployeeId } from '@/hooks/useLoginEmployeeId'
import { QK } from '@/lib/query-keys'
import { resolveOrganizationId } from '@/lib/user-context'
import { rowIndexGetter } from '@/lib/utils'
import { getAdmissionUnivFilters, listCollegeCounselling } from '@/services'
import type { CollegeCounsellingRow } from '@/types/admission'
import {
  batchOption,
  collegeOption,
  courseGroupOption,
  courseOption,
  filterBatchesByUniversityAndCourse,
  filterCollegesByUniversity,
  filterCourseGroupsByUniversityCollegeAndCourse,
  filterCoursesByUniversityAndCollege,
  filterUniversities,
  universityOption,
} from '../../_lib/admission-filters'
import { CollegeCounsellingModal } from './CollegeCounsellingModal'

/** Flex columns shrink to fit the viewport; fixed cols use suppressSizeToFit with sizeColumnsToFit. */
const COL_DEFS = {
  siNo: {
    headerName: 'SI.No',
    valueGetter: rowIndexGetter,
    width: 52,
    minWidth: 52,
    maxWidth: 56,
    flex: 0,
    suppressSizeToFit: true,
  } as ColDef<CollegeCounsellingRow>,
  casteQuota: { field: 'casteQuota', headerName: 'Quota', minWidth: 68, flex: 1.1 } as ColDef<CollegeCounsellingRow>,
  gender: { field: 'genderCatDetailName', headerName: 'Gender', minWidth: 68, flex: 1 } as ColDef<CollegeCounsellingRow>,
  intakes: { field: 'totalNoOfIntakes', headerName: 'Intakes', minWidth: 58, flex: 0.75 } as ColDef<CollegeCounsellingRow>,
  tutionFee: {
    field: 'tutionFee',
    headerName: 'Tuition',
    headerTooltip: 'Tuition Fee',
    minWidth: 62,
    flex: 0.8,
  } as ColDef<CollegeCounsellingRow>,
  totalFilled: { field: 'totalFilled', headerName: 'Filled', minWidth: 54, flex: 0.7 } as ColDef<CollegeCounsellingRow>,
  cutoffMarks: {
    field: 'cutoffMarks',
    headerName: 'Cut. Mk',
    headerTooltip: 'Cutoff Marks',
    minWidth: 58,
    flex: 0.75,
  } as ColDef<CollegeCounsellingRow>,
  cutoffRank: {
    field: 'cutoffRank',
    headerName: 'Cut. Rk',
    headerTooltip: 'Cutoff Ranks',
    minWidth: 58,
    flex: 0.75,
  } as ColDef<CollegeCounsellingRow>,
  minMarks: {
    field: 'minMarks',
    headerName: 'Min Mk',
    headerTooltip: 'Min Marks',
    minWidth: 54,
    flex: 0.7,
  } as ColDef<CollegeCounsellingRow>,
  maxMarks: {
    field: 'maxMarks',
    headerName: 'Max Mk',
    headerTooltip: 'Max Marks',
    minWidth: 54,
    flex: 0.7,
  } as ColDef<CollegeCounsellingRow>,
  minRank: {
    field: 'minRank',
    headerName: 'Min Rk',
    headerTooltip: 'Min Rank',
    minWidth: 52,
    flex: 0.65,
  } as ColDef<CollegeCounsellingRow>,
  maxRank: {
    field: 'maxRank',
    headerName: 'Max Rk',
    headerTooltip: 'Max Rank',
    minWidth: 52,
    flex: 0.65,
  } as ColDef<CollegeCounsellingRow>,
  isActive: {
    field: 'isActive',
    headerName: 'Status',
    width: 82,
    minWidth: 82,
    maxWidth: 88,
    flex: 0,
    suppressSizeToFit: true,
  } as ColDef<CollegeCounsellingRow>,
  actions: {
    headerName: 'Actions',
    width: 68,
    minWidth: 68,
    maxWidth: 72,
    flex: 0,
    suppressSizeToFit: true,
  } as ColDef<CollegeCounsellingRow>,
}

function statusRenderer(p: ICellRendererParams<CollegeCounsellingRow>) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

export default function CollegeCounsellingPage() {
  const { user, isLoading: sessionLoading } = useSessionContext()
  const orgId = resolveOrganizationId(user) || 1
  const { employeeId: empId, isResolving: empResolving } = useLoginEmployeeId(user, sessionLoading)

  const [universityId, setUniversityId] = useState<string | null>(null)
  const [collegeId, setCollegeId] = useState<string | null>(null)
  const [courseId, setCourseId] = useState<string | null>(null)
  const [batchId, setBatchId] = useState<string | null>(null)
  const [courseGroupId, setCourseGroupId] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<CollegeCounsellingRow | null>(null)

  const filtersEnabled = !sessionLoading && !empResolving && orgId > 0 && empId > 0

  const { data: filterBundle, isLoading: filtersLoading } = useQuery({
    queryKey: QK.admission.univFilters(orgId, empId),
    queryFn: () => getAdmissionUnivFilters(orgId, empId),
    enabled: filtersEnabled,
  })

  const filtersData = filterBundle?.filtersData ?? []
  const batchesData = filterBundle?.batchesData ?? []

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

  const batchOptions = useMemo(
    () =>
      filterBatchesByUniversityAndCourse(
        batchesData,
        universityId ? Number(universityId) : null,
        courseId ? Number(courseId) : null,
      ).map(batchOption),
    [batchesData, universityId, courseId],
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

  /** Angular `flag == true` — list loads only after course group is chosen. */
  const listReady = Boolean(
    universityId && collegeId && courseId && batchId && courseGroupId,
  )

  const listContext = useMemo(
    () => ({
      collegeId: Number(collegeId),
      courseId: Number(courseId),
      batchId: Number(batchId),
      courseGroupId: Number(courseGroupId),
    }),
    [collegeId, courseId, batchId, courseGroupId],
  )

  const filterSummary = useMemo(() => {
    if (!listReady) return ''
    const parts = [
      universityOptions.find((o) => o.value === universityId)?.label,
      collegeOptions.find((o) => o.value === collegeId)?.label,
      courseOptions.find((o) => o.value === courseId)?.label,
      batchOptions.find((o) => o.value === batchId)?.label,
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
    batchOptions,
    batchId,
    courseGroupOptions,
    courseGroupId,
  ])

  const {
    data: rows,
    isLoading,
    invalidate: invalidateList,
  } = useCrudList({
    queryKey: QK.admission.collegeCounselling({
      collegeId: listContext.collegeId,
      batchId: listContext.batchId,
      courseGroupId: listContext.courseGroupId,
    }),
    queryFn: () => listCollegeCounselling(listContext),
    enabled: listReady,
  })

  const columnDefs = useMemo<ColDef<CollegeCounsellingRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.casteQuota,
      COL_DEFS.gender,
      COL_DEFS.intakes,
      COL_DEFS.tutionFee,
      COL_DEFS.totalFilled,
      COL_DEFS.cutoffMarks,
      COL_DEFS.cutoffRank,
      COL_DEFS.minMarks,
      COL_DEFS.maxMarks,
      COL_DEFS.minRank,
      COL_DEFS.maxRank,
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      {
        ...COL_DEFS.actions,
        cellRenderer: (p: ICellRendererParams<CollegeCounsellingRow>) => (
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            onClick={() => {
              setEditing(p.data ?? null)
              setModalOpen(true)
            }}
          >
            <PencilIcon className="h-3.5 w-3.5" />
          </Button>
        ),
      },
    ],
    [],
  )

  function resetBelowUniversity() {
    setCollegeId(null)
    setCourseId(null)
    setBatchId(null)
    setCourseGroupId(null)
  }

  function resetBelowCollege() {
    setCourseId(null)
    setBatchId(null)
    setCourseGroupId(null)
  }

  function resetBelowCourse() {
    setBatchId(null)
    setCourseGroupId(null)
  }

  function resetBelowBatch() {
    setCourseGroupId(null)
  }

  return (
    <PageContainer className="space-y-5">
      <FilterCard title="College Counselling">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
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
            label="Batch"
            value={batchId}
            onChange={(v) => {
              setBatchId(v)
              resetBelowBatch()
            }}
            options={batchOptions}
            searchable
            placeholder="Select batch"
            disabled={!courseId}
          />
          <Select
            label="Course Group"
            value={courseGroupId}
            onChange={setCourseGroupId}
            options={courseGroupOptions}
            searchable
            placeholder="Select course group"
            disabled={!batchId}
          />
        </div>
      </FilterCard>

      {listReady && (
        <>
          {filterSummary && (
            <div className="app-card overflow-hidden px-4 py-3">
              <h2 className="text-[15px] font-semibold leading-tight text-[hsl(var(--card-title))]">
                College Counselling — {filterSummary}
              </h2>
            </div>
          )}

          <TableCard withHeaderBorder={false} className="college-counselling-table">
            <DataTable
              rowData={rows}
              columnDefs={columnDefs}
              loading={isLoading || filtersLoading}
              pagination
              toolbar={{
                search: true,
                searchPlaceholder: 'Search counselling…',
                pdfDocumentTitle: 'College Counselling',
              }}
              toolbarTrailing={(
                <Button
                  size="sm"
                  className="h-[30px] px-3 text-[12px]"
                  onClick={() => {
                    setEditing(null)
                    setModalOpen(true)
                  }}
                >
                  <PlusIcon className="h-3.5 w-3.5 mr-1.5" />
                  Add College Counselling
                </Button>
              )}
            />
          </TableCard>

          <CollegeCounsellingModal
            open={modalOpen}
            onClose={() => {
              setModalOpen(false)
              setEditing(null)
            }}
            row={editing}
            context={listContext}
            onSaved={invalidateList}
          />
        </>
      )}
    </PageContainer>
  )
}
