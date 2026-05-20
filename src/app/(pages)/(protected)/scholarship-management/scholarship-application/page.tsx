'use client'

import { useEffect, useMemo, useState } from 'react'
import { PencilIcon, PlusIcon } from 'lucide-react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { useQuery } from '@tanstack/react-query'
import { DataTable, TableCard } from '@/common/components/table'
import { FilterCard } from '@/common/components/feedback'
import { StatusBadge } from '@/common/components/data-display'
import { Select } from '@/common/components/select'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { QK } from '@/lib/query-keys'
import { rowIndexGetter } from '@/lib/utils'
import {
  listActiveCollegesForGeneralSettings,
  listAcademicYearsByUniversity,
  listScholarshipApplications,
} from '@/services'
import type { ScholarshipApplication } from '@/types/scholarship'
import {
  academicYearOption,
  collegeOption,
  getUniversityIdForCollege,
} from '../_lib/scholarship-filters'
import { ApplicationModal } from './ApplicationModal'

const COL_DEFS = {
  siNo: { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<ScholarshipApplication>,
  schApplicationNo: { field: 'schApplicationNo', headerName: 'App No', minWidth: 110, flex: 0.8 } as ColDef<ScholarshipApplication>,
  rollNumber: { field: 'rollNumber', headerName: 'Roll No', minWidth: 100, flex: 0.7 } as ColDef<ScholarshipApplication>,
  firstName: { field: 'firstName', headerName: 'Student', minWidth: 140, flex: 1 } as ColDef<ScholarshipApplication>,
  collegeCode: { field: 'collegeCode', headerName: 'College', minWidth: 90, flex: 0.7 } as ColDef<ScholarshipApplication>,
  appliedOn: { field: 'appliedOn', headerName: 'Applied On', minWidth: 110, flex: 0.8 } as ColDef<ScholarshipApplication>,
  scholarshipAmount: { field: 'scholarshipAmount', headerName: 'Amount', minWidth: 100, flex: 0.7 } as ColDef<ScholarshipApplication>,
  totalAmountReceived: { field: 'totalAmountReceived', headerName: 'Received', minWidth: 100, flex: 0.7 } as ColDef<ScholarshipApplication>,
  dueAmount: { field: 'dueAmount', headerName: 'Due', minWidth: 90, flex: 0.6 } as ColDef<ScholarshipApplication>,
  isActive: { field: 'isActive', headerName: 'Status', minWidth: 100, flex: 0 } as ColDef<ScholarshipApplication>,
  actions: { headerName: 'Actions', minWidth: 86, width: 86, flex: 0 } as ColDef<ScholarshipApplication>,
}

function statusRenderer(p: ICellRendererParams<ScholarshipApplication>) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

function makeActionsRenderer(
  setEditing: (row: ScholarshipApplication | null) => void,
  setModalOpen: (open: boolean) => void,
) {
  return (p: ICellRendererParams<ScholarshipApplication>) => (
    <Button
      size="sm"
      variant="ghost"
      className="h-8 w-8 p-0"
      aria-label="Edit application"
      onClick={() => {
        setEditing(p.data ?? null)
        setModalOpen(true)
      }}
    >
      <PencilIcon className="h-3.5 w-3.5" />
    </Button>
  )
}

export default function ScholarshipApplicationPage() {
  const [collegeId, setCollegeId] = useState<number | null>(null)
  const [academicYearId, setAcademicYearId] = useState<number | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<ScholarshipApplication | null>(null)

  const { data: colleges = [] } = useQuery({
    queryKey: ['scholarship', 'colleges'],
    queryFn: listActiveCollegesForGeneralSettings,
  })

  const universityId = collegeId ? getUniversityIdForCollege(colleges, collegeId) : 0

  const { data: academicYears = [] } = useQuery({
    queryKey: ['scholarship', 'academicYears', universityId],
    queryFn: () => listAcademicYearsByUniversity(universityId),
    enabled: universityId > 0,
  })

  useEffect(() => {
    if (colleges.length > 0 && collegeId == null) {
      setCollegeId(Number(colleges[0].collegeId))
    }
  }, [colleges, collegeId])

  const { data: rows = [], isLoading, refetch } = useQuery({
    queryKey: QK.scholarshipApplications.list(collegeId ?? 0, academicYearId ?? 0),
    queryFn: () => listScholarshipApplications(collegeId!, academicYearId!),
    enabled: !!collegeId && !!academicYearId,
  })

  const columnDefs = useMemo<ColDef<ScholarshipApplication>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.schApplicationNo,
      COL_DEFS.rollNumber,
      COL_DEFS.firstName,
      COL_DEFS.collegeCode,
      COL_DEFS.appliedOn,
      COL_DEFS.scholarshipAmount,
      COL_DEFS.totalAmountReceived,
      COL_DEFS.dueAmount,
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      { ...COL_DEFS.actions, cellRenderer: makeActionsRenderer(setEditing, setModalOpen) },
    ],
    [],
  )

  const collegeOptions = useMemo(() => colleges.map(collegeOption), [colleges])
  const ayOptions = useMemo(() => academicYears.map(academicYearOption), [academicYears])

  return (
    <PageContainer className="space-y-5">
      <FilterCard title="Scholarship Application">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Select
            label="College"
            value={collegeId ? String(collegeId) : null}
            onChange={(v) => {
              setCollegeId(v ? Number(v) : null)
              setAcademicYearId(null)
            }}
            options={collegeOptions}
            placeholder="Select college"
            searchable
          />
          <Select
            label="Academic Year"
            value={academicYearId ? String(academicYearId) : null}
            onChange={(v) => setAcademicYearId(v ? Number(v) : null)}
            options={ayOptions}
            placeholder="Select academic year"
            searchable
            disabled={!collegeId}
          />
        </div>
      </FilterCard>

      {academicYearId != null && (
        <TableCard withHeaderBorder={false}>
          <DataTable
            rowData={rows}
            columnDefs={columnDefs}
            loading={isLoading}
            pagination
            toolbar={{
              search: true,
              searchPlaceholder: 'Search applications…',
              pdfDocumentTitle: 'Scholarship Applications',
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
                Add Application
              </Button>
            )}
          />
        </TableCard>
      )}

      <ApplicationModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditing(null)
        }}
        application={editing}
        defaultCollegeId={collegeId}
        defaultAcademicYearId={academicYearId}
        onSaved={() => void refetch()}
      />
    </PageContainer>
  )
}
