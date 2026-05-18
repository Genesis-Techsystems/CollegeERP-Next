'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, PencilIcon, PlusIcon } from 'lucide-react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { DataTable, TableCard } from '@/common/components/table'
import { FilterCard } from '@/common/components/feedback'
import { StatusBadge } from '@/common/components/data-display'
import { Select } from '@/common/components/select'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useSessionContext } from '@/context/SessionContext'
import { useQuery } from '@tanstack/react-query'
import { QK } from '@/lib/query-keys'
import { rowIndexGetter } from '@/lib/utils'
import { getFeeMasterCollegeFilters, listCollegeFeeStructures } from '@/services'
import type { CollegeFeeStructureRow } from '@/types/fee-structure'
import {
  academicYearOption,
  batchOption,
  collegeOption,
  courseOption,
  filterAcademicYears,
  filterBatches,
  filterColleges,
  filterCourses,
} from '../_lib/fee-master-filters'

type StructureMode = 'batch' | 'academic'

function structureNameRenderer(p: ICellRendererParams<CollegeFeeStructureRow>) {
  const name = p.data?.classGroupName ?? ''
  const quota = p.data?.quotaDisplayName
  return (
    <span>
      {name}
      {quota ? <span className="text-blue-600"> ({quota})</span> : null}
    </span>
  )
}

function lateralRenderer(p: ICellRendererParams<CollegeFeeStructureRow>) {
  return <StatusBadge status={!!p.data?.isLateral} label={p.data?.isLateral ? 'Yes' : 'No'} />
}

function statusRenderer(p: ICellRendererParams<CollegeFeeStructureRow>) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

function makeActionsRenderer(router: ReturnType<typeof useRouter>) {
  return (p: ICellRendererParams<CollegeFeeStructureRow>) => {
    const row = p.data
    if (!row) return null
    if (row.isEditable) {
      return (
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0"
          aria-label="Edit fee structure"
          onClick={() => {
            const id = row.feeStructureId
            if (id) router.push(`/accounts-and-fees/fee-masters/edit-fee-structure/${id}`)
          }}
        >
          <PencilIcon className="h-3.5 w-3.5" />
        </Button>
      )
    }
    return (
      <Button
        size="sm"
        variant="ghost"
        className="h-8 w-8 p-0"
        aria-label="View fee structure"
        disabled
        title="View-only structures are not editable in this migration pass"
      >
        <Eye className="h-3.5 w-3.5 opacity-50" />
      </Button>
    )
  }
}

export default function FeeStructurePage() {
  const router = useRouter()
  const { user } = useSessionContext()
  const orgId =
    Number(user?.organizationId ?? 0) ||
    Number(globalThis.localStorage?.getItem('organizationId') ?? 0) ||
    1
  const empId =
    Number(user?.employeeId ?? 0) ||
    Number(globalThis.localStorage?.getItem('employeeId') ?? 0) ||
    0

  const [mode, setMode] = useState<StructureMode>('batch')
  const [collegeId, setCollegeId] = useState<string | null>(null)
  const [courseId, setCourseId] = useState<string | null>(null)
  const [batchId, setBatchId] = useState<string | null>(null)
  const [academicYearId, setAcademicYearId] = useState<string | null>(null)
  const [page] = useState(0)

  const { data: filterBundle } = useQuery({
    queryKey: QK.collegeFeeStructures.filters(orgId, empId),
    queryFn: () => getFeeMasterCollegeFilters(orgId, empId),
    enabled: empId > 0,
  })

  const filtersData = filterBundle?.filtersData ?? []
  const academicData = filterBundle?.academicData ?? []
  const batchesData = filterBundle?.batchesData ?? []

  const collegeOptions = useMemo(
    () => filterColleges(filtersData).map(collegeOption),
    [filtersData],
  )

  const courseOptions = useMemo(
    () => filterCourses(filtersData, collegeId ? Number(collegeId) : null).map(courseOption),
    [filtersData, collegeId],
  )

  const batchOptions = useMemo(
    () => filterBatches(batchesData, courseId ? Number(courseId) : null).map(batchOption),
    [batchesData, courseId],
  )

  const academicYearOptions = useMemo(
    () =>
      filterAcademicYears(academicData, collegeId ? Number(collegeId) : null, filtersData).map(
        academicYearOption,
      ),
    [academicData, collegeId, filtersData],
  )

  const listReady = !!collegeId && (mode === 'batch' ? !!batchId : !!academicYearId)

  const { data: listResult, isLoading: listLoading } = useQuery({
    queryKey: QK.collegeFeeStructures.list({ collegeId, batchId, academicYearId, mode, page }),
    queryFn: () =>
      listCollegeFeeStructures({
        collegeId: Number(collegeId),
        batchId: mode === 'batch' ? Number(batchId) : undefined,
        academicYearId: mode === 'academic' ? Number(academicYearId) : undefined,
        isAcademicFee: mode === 'academic',
        page,
        size: 50,
      }),
    enabled: listReady,
  })

  const rows = listResult?.rows ?? []

  useEffect(() => {
    if (collegeOptions.length > 0 && !collegeId) setCollegeId(collegeOptions[0].value)
  }, [collegeOptions, collegeId])

  useEffect(() => {
    if (mode === 'batch' && courseOptions.length > 0 && !courseId) setCourseId(courseOptions[0].value)
  }, [mode, courseOptions, courseId])

  const resetCascade = useCallback((nextMode: StructureMode) => {
    setMode(nextMode)
    setCourseId(null)
    setBatchId(null)
    setAcademicYearId(null)
  }, [])

  const columnDefs = useMemo<ColDef<CollegeFeeStructureRow>[]>(() => {
    const cols: ColDef<CollegeFeeStructureRow>[] = [
      { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 },
      { headerName: 'Fee Structure', minWidth: 200, flex: 1.2, cellRenderer: structureNameRenderer },
      { field: 'collegeCode', headerName: 'College', minWidth: 100 },
    ]
    if (mode === 'batch') {
      cols.push(
        { field: 'courseCode', headerName: 'Course Code', minWidth: 110 },
        { field: 'batchName', headerName: 'Batch', minWidth: 90 },
      )
    } else {
      cols.push({ field: 'academicYear', headerName: 'Academic Year', minWidth: 120 })
    }
    cols.push(
      { headerName: 'Is For Lateral', minWidth: 110, cellRenderer: lateralRenderer },
      { field: 'isActive', headerName: 'Status', minWidth: 100, cellRenderer: statusRenderer },
      { headerName: 'Actions', width: 90, flex: 0, cellRenderer: makeActionsRenderer(router) },
    )
    return cols
  }, [mode, router])

  function handleAdd() {
    if (!collegeId) return
    if (mode === 'academic' && academicYearId) {
      router.push(
        `/accounts-and-fees/fee-masters/add-fee-structure?cId=${collegeId}&aId=${academicYearId}&isAcademicFee=true`,
      )
      return
    }
    if (mode === 'batch' && courseId && batchId) {
      router.push(
        `/accounts-and-fees/fee-masters/add-fee-structure?cId=${collegeId}&courseId=${courseId}&batchId=${batchId}&isAcademicFee=false`,
      )
    }
  }

  return (
    <PageContainer className="space-y-5">
      <FilterCard title="Fee Structures">
        <div className="space-y-4">
          <RadioGroup
            value={mode}
            onValueChange={(v) => resetCascade(v as StructureMode)}
            className="flex flex-wrap gap-6"
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="batch" id="mode-batch" />
              <Label htmlFor="mode-batch" className="cursor-pointer text-[13px] font-medium">
                Batch-Wise Fee Structure
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="academic" id="mode-academic" />
              <Label htmlFor="mode-academic" className="cursor-pointer text-[13px] font-medium">
                Academic-Wise Fee Structure
              </Label>
            </div>
          </RadioGroup>

          <div className="grid grid-cols-1 gap-3 border-t border-slate-200 pt-4 sm:grid-cols-2 lg:grid-cols-4">
            <Select
              label="College"
              required
              value={collegeId}
              onChange={(v) => {
                setCollegeId(v)
                setCourseId(null)
                setBatchId(null)
                setAcademicYearId(null)
              }}
              options={collegeOptions}
              searchable
            />
            {mode === 'batch' ? (
              <>
                <Select
                  label="Course"
                  required
                  value={courseId}
                  onChange={(v) => {
                    setCourseId(v)
                    setBatchId(null)
                  }}
                  options={courseOptions}
                  searchable
                  disabled={!collegeId}
                />
                <Select
                  label="Batch"
                  required
                  value={batchId}
                  onChange={(v) => setBatchId(v)}
                  options={batchOptions}
                  searchable
                  disabled={!courseId}
                />
              </>
            ) : (
              <Select
                label="Academic Year"
                required
                value={academicYearId}
                onChange={(v) => setAcademicYearId(v)}
                options={academicYearOptions}
                searchable
                disabled={!collegeId}
              />
            )}
          </div>
        </div>
      </FilterCard>

      {listReady ? (
        <TableCard withHeaderBorder={false}>
          <DataTable
            rowData={rows}
            columnDefs={columnDefs}
            loading={listLoading}
            pagination
            toolbar={{
              search: true,
              searchPlaceholder: 'Search fee structures…',
              pdfDocumentTitle: 'Fee Structures',
            }}
            toolbarTrailing={(
              <Button size="sm" className="h-[30px] px-3 text-[12px]" onClick={handleAdd}>
                <PlusIcon className="h-3.5 w-3.5 mr-1.5" />
                Add Fee Structure
              </Button>
            )}
          />
        </TableCard>
      ) : null}
    </PageContainer>
  )
}
