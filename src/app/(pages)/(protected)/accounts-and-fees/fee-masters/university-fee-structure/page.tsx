'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PencilIcon, PlusIcon } from 'lucide-react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { DataTable, TableCard } from '@/common/components/table'
import { FilterCard } from '@/common/components/feedback'
import { StatusBadge } from '@/common/components/data-display'
import { Select } from '@/common/components/select'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { useSessionContext } from '@/context/SessionContext'
import { useLoginEmployeeId } from '@/hooks/useLoginEmployeeId'
import { useQuery } from '@tanstack/react-query'
import { QK } from '@/lib/query-keys'
import { resolveOrganizationId } from '@/lib/user-context'
import { rowIndexGetter } from '@/lib/utils'
import {
  getUnivFeeMasterFilters,
  listUnivFeeStructures,
  setUnivFeeStructureContext,
} from '@/services'
import type { UnivFeeStructureRow } from '@/types/fee-structure'
import {
  academicYearOption,
  courseGroupOption,
  courseOption,
  filterAcademicYearsByUniversity,
  filterCourseGroupsByUniversity,
  filterCoursesByUniversity,
  filterUniversities,
  universityOption,
} from '../_lib/fee-master-filters'
import { UniversityFeeStructureModal } from './UniversityFeeStructureModal'

function statusRenderer(p: ICellRendererParams<UnivFeeStructureRow>) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

export default function UniversityFeeStructurePage() {
  const router = useRouter()
  const { user, isLoading: sessionLoading } = useSessionContext()
  const orgId = resolveOrganizationId(user) || 1
  const { employeeId: empId, isResolving: empResolving } = useLoginEmployeeId(user, sessionLoading)

  const filtersEnabled = !sessionLoading && !empResolving && orgId > 0 && empId > 0

  const [universityId, setUniversityId] = useState<string | null>(null)
  const [courseId, setCourseId] = useState<string | null>(null)
  const [courseGroupId, setCourseGroupId] = useState<string | null>(null)
  const [academicYearId, setAcademicYearId] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<UnivFeeStructureRow | null>(null)

  const { data: filterBundle, isLoading: filtersLoading } = useQuery({
    queryKey: QK.univFeeStructures.filters(orgId, empId),
    queryFn: () => getUnivFeeMasterFilters(orgId, empId),
    enabled: filtersEnabled,
  })

  const filtersData = filterBundle?.filtersData ?? []
  const academicData = filterBundle?.academicData ?? []

  const universityOptions = useMemo(
    () => filterUniversities(filtersData).map(universityOption),
    [filtersData],
  )

  const courseOptions = useMemo(
    () =>
      filterCoursesByUniversity(filtersData, universityId ? Number(universityId) : null).map(
        courseOption,
      ),
    [filtersData, universityId],
  )

  const courseGroupOptions = useMemo(
    () =>
      filterCourseGroupsByUniversity(
        filtersData,
        universityId ? Number(universityId) : null,
        courseId ? Number(courseId) : null,
      ).map(courseGroupOption),
    [filtersData, universityId, courseId],
  )

  const academicYearOptions = useMemo(
    () =>
      filterAcademicYearsByUniversity(academicData, universityId ? Number(universityId) : null).map(
        academicYearOption,
      ),
    [academicData, universityId],
  )

  /** List loads only after Academic Year is chosen (Angular `selectedAcademicYear`). */
  const listReady = Boolean(academicYearId && universityId && courseId && courseGroupId)

  const listFilters = useMemo(
    () => ({
      universityId: Number(universityId),
      courseId: Number(courseId),
      courseGroupId: Number(courseGroupId),
      academicYearId: Number(academicYearId),
    }),
    [universityId, courseId, courseGroupId, academicYearId],
  )

  const modalContext = useMemo(
    () => ({
      universitiesId: Number(universityId),
      courseId: Number(courseId),
      courseGroupId: Number(courseGroupId),
      academicYearId: Number(academicYearId),
    }),
    [universityId, courseId, courseGroupId, academicYearId],
  )

  const { data: rows = [], isLoading, refetch } = useQuery({
    queryKey: QK.univFeeStructures.list(listFilters),
    queryFn: () => listUnivFeeStructures(listFilters),
    enabled: listReady,
  })

  const filterSummary = useMemo(() => {
    if (!listReady) return ''
    const uni = universityOptions.find((o) => o.value === universityId)?.label
    const crs = courseOptions.find((o) => o.value === courseId)?.label
    const grp = courseGroupOptions.find((o) => o.value === courseGroupId)?.label
    const ay = academicYearOptions.find((o) => o.value === academicYearId)?.label
    return [uni, crs, grp, ay].filter(Boolean).join(' / ')
  }, [
    listReady,
    universityOptions,
    universityId,
    courseOptions,
    courseId,
    courseGroupOptions,
    courseGroupId,
    academicYearOptions,
    academicYearId,
  ])

  useEffect(() => {
    if (universityOptions.length > 0 && !universityId) setUniversityId(universityOptions[0].value)
  }, [universityOptions, universityId])

  useEffect(() => {
    if (courseOptions.length > 0 && !courseId) setCourseId(courseOptions[0].value)
  }, [courseOptions, courseId])

  useEffect(() => {
    if (courseGroupOptions.length > 0 && !courseGroupId) {
      setCourseGroupId(courseGroupOptions[0].value)
    }
  }, [courseGroupOptions, courseGroupId])

  const columnDefs = useMemo<ColDef<UnivFeeStructureRow>[]>(
    () => [
      { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 },
      { field: 'universityCode', headerName: 'University', minWidth: 110 },
      { field: 'courseCode', headerName: 'Course', minWidth: 100 },
      { field: 'courseGroupCode', headerName: 'Course Group', minWidth: 110 },
      { field: 'academicYear', headerName: 'Academic Year', minWidth: 110 },
      { field: 'feeStructureName', headerName: 'Fee Structure Name', minWidth: 160, flex: 1 },
      { field: 'isActive', headerName: 'Status', minWidth: 100, cellRenderer: statusRenderer },
      {
        headerName: 'Actions',
        minWidth: 200,
        flex: 0,
        cellRenderer: (p: ICellRendererParams<UnivFeeStructureRow>) => (
          <div className="flex items-center justify-center gap-2">
            <Button
              type="button"
              variant="link"
              className="h-auto p-0 text-[12px] text-blue-600"
              onClick={() => {
                if (!p.data) return
                setUnivFeeStructureContext(p.data)
                router.push('/accounts-and-fees/fee-masters/university-fee-structure-details')
              }}
            >
              Fee Structure Details
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              aria-label="Edit"
              onClick={() => {
                setEditing(p.data ?? null)
                setModalOpen(true)
              }}
            >
              <PencilIcon className="h-3.5 w-3.5" />
            </Button>
          </div>
        ),
      },
    ],
    [router],
  )

  return (
    <PageContainer className="space-y-5">
      <FilterCard title="University Fee Structure">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Select
            label="University"
            required
            value={universityId}
            onChange={(v) => {
              setUniversityId(v)
              setCourseId(null)
              setCourseGroupId(null)
              setAcademicYearId(null)
            }}
            options={universityOptions}
            searchable
            isLoading={filtersLoading}
            disabled={filtersLoading}
          />
          <Select
            label="Course"
            required
            value={courseId}
            onChange={(v) => {
              setCourseId(v)
              setCourseGroupId(null)
              setAcademicYearId(null)
            }}
            options={courseOptions}
            searchable
            isLoading={filtersLoading}
            disabled={!universityId || filtersLoading}
          />
          <Select
            label="Course Group"
            required
            value={courseGroupId}
            onChange={(v) => {
              setCourseGroupId(v)
              setAcademicYearId(null)
            }}
            options={courseGroupOptions}
            searchable
            disabled={!courseId || filtersLoading}
          />
          <Select
            label="Academic Year"
            required
            value={academicYearId}
            onChange={(v) => setAcademicYearId(v)}
            options={academicYearOptions}
            searchable
            disabled={!courseGroupId || filtersLoading}
          />
        </div>
      </FilterCard>

      {listReady ? (
        <>
          {filterSummary ? (
            <p className="text-[13px] font-medium text-slate-600 px-1">{filterSummary}</p>
          ) : null}
          <TableCard withHeaderBorder={false}>
            <DataTable
              rowData={rows}
              columnDefs={columnDefs}
              loading={isLoading}
              pagination
              toolbar={{
                search: true,
                searchPlaceholder: 'Search university fee structures…',
                pdfDocumentTitle: 'University Fee Structures',
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
                  University Fee Structure
                </Button>
              )}
            />
          </TableCard>
        </>
      ) : null}

      {listReady ? (
        <UniversityFeeStructureModal
          open={modalOpen}
          onClose={() => {
            setModalOpen(false)
            setEditing(null)
          }}
          row={editing}
          context={modalContext}
          onSaved={() => void refetch()}
        />
      ) : null}
    </PageContainer>
  )
}
