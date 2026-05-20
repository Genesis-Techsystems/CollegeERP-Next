'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PencilIcon, PlusIcon } from 'lucide-react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { useQuery } from '@tanstack/react-query'
import { DataTable, TableCard } from '@/common/components/table'
import { FilterCard } from '@/common/components/feedback'
import { Select } from '@/common/components/select'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useSessionContext } from '@/context/SessionContext'
import { QK } from '@/lib/query-keys'
import { rowIndexGetter } from '@/lib/utils'
import { getScholarshipCollegeFilters, listFeeSchStructures } from '@/services'
import type { FeeSchStructureRow } from '@/types/scholarship'
import {
  academicYearOption,
  batchOption,
  collegeOption,
  courseOption,
  filterAcademicYears,
  filterBatches,
  filterColleges,
  filterCourses,
  getUniversityIdForCollege,
} from '../_lib/scholarship-filters'

type StructureMode = 'batch' | 'academic'

const COL_DEFS = {
  siNo: { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<FeeSchStructureRow>,
  collegeCode: { field: 'collegeCode', headerName: 'College', minWidth: 90, flex: 0.7 } as ColDef<FeeSchStructureRow>,
  courseCode: { field: 'courseCode', headerName: 'Course', minWidth: 90, flex: 0.7 } as ColDef<FeeSchStructureRow>,
  academicYear: { field: 'academicYear', headerName: 'Academic Year', minWidth: 110, flex: 0.8 } as ColDef<FeeSchStructureRow>,
  batchName: { field: 'batchName', headerName: 'Batch', minWidth: 100, flex: 0.7 } as ColDef<FeeSchStructureRow>,
  scholarshipType: { field: 'scholarshipType', headerName: 'Type', minWidth: 120, flex: 0.9 } as ColDef<FeeSchStructureRow>,
  scholarshipAmount: { field: 'scholarshipAmount', headerName: 'Amount', minWidth: 100, flex: 0.7 } as ColDef<FeeSchStructureRow>,
  actions: { headerName: 'Actions', minWidth: 86, width: 86, flex: 0 } as ColDef<FeeSchStructureRow>,
}

function buildAddStructureUrl(params: {
  universityId: number
  collegeId: number
  courseId: number
  batchId?: number
  academicYearId?: number
}): string {
  const q = new URLSearchParams({
    universityId: String(params.universityId),
    collegeId: String(params.collegeId),
    courseId: String(params.courseId),
  })
  if (params.batchId) q.set('batchId', String(params.batchId))
  if (params.academicYearId) q.set('academicYearId', String(params.academicYearId))
  return `/scholarship-management/scholarship-value/add-scholarship-value?${q}`
}

export default function ScholarshipValuePage() {
  const router = useRouter()
  const { user } = useSessionContext()
  const orgId = Number(user?.organizationId ?? globalThis.localStorage?.getItem('organizationId') ?? 1)
  const empId = Number(user?.employeeId ?? globalThis.localStorage?.getItem('employeeId') ?? 0)

  const [mode, setMode] = useState<StructureMode>('batch')
  const [collegeId, setCollegeId] = useState<number | null>(null)
  const [academicYearId, setAcademicYearId] = useState<number | null>(null)
  const [courseId, setCourseId] = useState<number | null>(null)
  const [batchId, setBatchId] = useState<number | null>(null)

  const { data: filterData } = useQuery({
    queryKey: QK.scholarshipFilters.college(orgId, empId),
    queryFn: () => getScholarshipCollegeFilters(orgId, empId),
    enabled: orgId > 0,
  })

  const filtersData = filterData?.filtersData ?? []
  const academicData = filterData?.academicData ?? []
  const batchesData = filterData?.batchesData ?? []

  const universityId = collegeId ? getUniversityIdForCollege(filtersData, collegeId) : 0

  const colleges = filterColleges(filtersData)
  const courses = collegeId ? filterCourses(filtersData, collegeId) : []
  const academicYears = collegeId
    ? filterAcademicYears(academicData, collegeId, filtersData)
    : []
  const batches = courseId ? filterBatches(batchesData, courseId) : []

  const periodSelected = mode === 'batch' ? batchId != null : academicYearId != null
  const filtersReady = !!collegeId && !!courseId && periodSelected

  const { data: rows = [], isLoading } = useQuery({
    queryKey: QK.feeSchStructures.list({
      collegeId: collegeId ?? 0,
      academicYearId: mode === 'academic' ? (academicYearId ?? undefined) : undefined,
      courseId: courseId ?? undefined,
      batchId: mode === 'batch' ? (batchId ?? undefined) : undefined,
    }),
    queryFn: () =>
      listFeeSchStructures({
        collegeId: collegeId!,
        academicYearId: mode === 'academic' ? academicYearId ?? undefined : undefined,
        courseId: courseId ?? undefined,
        batchId: mode === 'batch' ? batchId ?? undefined : undefined,
      }),
    enabled: filtersReady,
  })

  const columnDefs = useMemo<ColDef<FeeSchStructureRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.collegeCode,
      COL_DEFS.courseCode,
      COL_DEFS.academicYear,
      COL_DEFS.batchName,
      COL_DEFS.scholarshipType,
      COL_DEFS.scholarshipAmount,
      {
        ...COL_DEFS.actions,
        cellRenderer: (p: ICellRendererParams<FeeSchStructureRow>) => {
          const id = p.data?.feeSchStructureId
          if (!id) return null
          return (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              aria-label="Edit scholarship structure"
              onClick={() =>
                router.push(
                  `/scholarship-management/scholarship-value/edit-scholarship-value?feeSchStructureId=${id}`,
                )
              }
            >
              <PencilIcon className="h-3.5 w-3.5" />
            </Button>
          )
        },
      },
    ],
    [router],
  )

  function handleModeChange(next: StructureMode) {
    setMode(next)
    setBatchId(null)
    setAcademicYearId(null)
  }

  return (
    <PageContainer className="space-y-5">
      <FilterCard title="ScholarShip Structure">
        <div className="mb-3">
          <Label className="text-[13px] font-medium text-[#334155]">Structure mode</Label>
          <RadioGroup
            value={mode}
            onValueChange={(v) => handleModeChange(v as StructureMode)}
            className="mt-2 flex gap-4"
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="batch" id="mode-batch" />
              <Label htmlFor="mode-batch" className="text-[13px] font-normal">
                Batch wise
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="academic" id="mode-academic" />
              <Label htmlFor="mode-academic" className="text-[13px] font-normal">
                Academic year wise
              </Label>
            </div>
          </RadioGroup>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Select
            label="College"
            value={collegeId ? String(collegeId) : null}
            onChange={(v) => {
              setCollegeId(v ? Number(v) : null)
              setCourseId(null)
              setBatchId(null)
              setAcademicYearId(null)
            }}
            options={colleges.map(collegeOption)}
            placeholder="Select college"
            searchable
          />
          <Select
            label="Course"
            value={courseId ? String(courseId) : null}
            onChange={(v) => {
              setCourseId(v ? Number(v) : null)
              setBatchId(null)
            }}
            options={courses.map(courseOption)}
            placeholder="Select course"
            searchable
            disabled={!collegeId}
          />
          {mode === 'academic' ? (
            <Select
              label="Academic Year"
              value={academicYearId ? String(academicYearId) : null}
              onChange={(v) => setAcademicYearId(v ? Number(v) : null)}
              options={academicYears.map(academicYearOption)}
              placeholder="Select academic year"
              searchable
              disabled={!collegeId}
            />
          ) : (
            <Select
              label="Batch"
              value={batchId ? String(batchId) : null}
              onChange={(v) => setBatchId(v ? Number(v) : null)}
              options={batches.map(batchOption)}
              placeholder="Select batch"
              searchable
              disabled={!courseId}
            />
          )}
        </div>
      </FilterCard>

      {filtersReady && (
        <TableCard withHeaderBorder={false}>
          <DataTable
            rowData={rows}
            columnDefs={columnDefs}
            loading={isLoading}
            pagination
            toolbar={{
              search: true,
              searchPlaceholder: 'Search scholarship structures…',
              pdfDocumentTitle: 'Scholarship Structures',
            }}
            toolbarTrailing={(
              <Button
                size="sm"
                className="h-[30px] px-3 text-[12px]"
                onClick={() =>
                  router.push(
                    buildAddStructureUrl({
                      universityId,
                      collegeId: collegeId!,
                      courseId: courseId!,
                      batchId: mode === 'batch' ? batchId ?? undefined : undefined,
                      academicYearId: mode === 'academic' ? academicYearId ?? undefined : undefined,
                    }),
                  )
                }
              >
                <PlusIcon className="h-3.5 w-3.5 mr-1.5" />
                Add Structure
              </Button>
            )}
          />
        </TableCard>
      )}
    </PageContainer>
  )
}
