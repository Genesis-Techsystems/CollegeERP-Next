'use client'

import { useEffect, useMemo, useState } from 'react'
import { PencilIcon, PlusIcon, Upload, Users } from 'lucide-react'
import Link from 'next/link'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { useQuery } from '@tanstack/react-query'
import { DataTable, TableCard } from '@/common/components/table'
import { FilterCard } from '@/common/components/feedback'
import { Select } from '@/common/components/select'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { QK } from '@/lib/query-keys'
import { rowIndexGetter } from '@/lib/utils'
import {
  listActiveCollegesForGeneralSettings,
  listAcademicYearsByUniversity,
  listFinancialYearsByUniversity,
  listSchPreceedings,
} from '@/services'
import type { SchPreceeding } from '@/types/scholarship'
import {
  academicYearOption,
  collegeOption,
  getUniversityIdForCollege,
} from '../_lib/scholarship-filters'
import { PreceedingDetailsModal } from './PreceedingDetailsModal'

const COL_DEFS = {
  siNo: { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<SchPreceeding>,
  preceedingNo: { field: 'preceedingNo', headerName: 'Proceeding No', minWidth: 120, flex: 0.9 } as ColDef<SchPreceeding>,
  preceedingTitle: { field: 'preceedingTitle', headerName: 'Title', minWidth: 160, flex: 1.2 } as ColDef<SchPreceeding>,
  collegeCode: { field: 'collegeCode', headerName: 'College', minWidth: 90, flex: 0.7 } as ColDef<SchPreceeding>,
  preceedingAmount: { field: 'preceedingAmount', headerName: 'Amount', minWidth: 100, flex: 0.7 } as ColDef<SchPreceeding>,
  preceedingDate: { field: 'preceedingDate', headerName: 'Date', minWidth: 110, flex: 0.8 } as ColDef<SchPreceeding>,
  studentCount: { field: 'studentCount', headerName: 'Students', minWidth: 90, flex: 0.6 } as ColDef<SchPreceeding>,
  actions: { headerName: 'Actions', minWidth: 140, width: 140, flex: 0 } as ColDef<SchPreceeding>,
}

export default function PreceedingDetailsPage() {
  const [collegeId, setCollegeId] = useState<number | null>(null)
  const [academicYearId, setAcademicYearId] = useState<number | null>(null)
  const [financialYearId, setFinancialYearId] = useState<number | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<SchPreceeding | null>(null)

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

  const { data: financialYears = [] } = useQuery({
    queryKey: ['scholarship', 'financialYears', universityId],
    queryFn: () => listFinancialYearsByUniversity(universityId),
    enabled: universityId > 0,
  })

  useEffect(() => {
    if (colleges.length > 0 && collegeId == null) {
      setCollegeId(Number(colleges[0].collegeId))
    }
  }, [colleges, collegeId])

  const { data, isLoading, refetch } = useQuery({
    queryKey: QK.schPreceedings.list({
      collegeId: collegeId ?? 0,
      academicYearId: academicYearId ?? 0,
      financialYearId: financialYearId ?? 0,
    }),
    queryFn: () =>
      listSchPreceedings({
        collegeId: collegeId!,
        academicYearId: academicYearId!,
        financialYearId: financialYearId!,
        page: 0,
        size: 50,
      }),
    enabled: !!collegeId && !!academicYearId && !!financialYearId,
  })

  const columnDefs = useMemo<ColDef<SchPreceeding>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.preceedingNo,
      COL_DEFS.preceedingTitle,
      COL_DEFS.collegeCode,
      COL_DEFS.preceedingAmount,
      COL_DEFS.preceedingDate,
      COL_DEFS.studentCount,
      {
        ...COL_DEFS.actions,
        cellRenderer: (p: ICellRendererParams<SchPreceeding>) => {
          const row = p.data
          if (!row) return null
          return (
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0"
                aria-label="Edit proceeding"
                onClick={() => {
                  setEditing(row)
                  setModalOpen(true)
                }}
              >
                <PencilIcon className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant="ghost" className="h-8 px-2 text-[11px]" asChild>
                <Link href={`/scholarship-management/students-upload?schPreceedingId=${row.schPreceedingId}`}>
                  <Upload className="h-3 w-3 mr-1" />
                  Upload
                </Link>
              </Button>
              <Button size="sm" variant="ghost" className="h-8 px-2 text-[11px]" asChild>
                <Link href={`/scholarship-management/view-std-preceedings?schPreceedingId=${row.schPreceedingId}`}>
                  <Users className="h-3 w-3 mr-1" />
                  Students
                </Link>
              </Button>
            </div>
          )
        },
      },
    ],
    [],
  )

  const collegeOptions = useMemo(() => colleges.map(collegeOption), [colleges])
  const ayOptions = useMemo(() => academicYears.map(academicYearOption), [academicYears])
  const fyOptions = useMemo(
    () =>
      financialYears.map((fy) => ({
        value: String(fy.financialYearId),
        label: String(fy.financialYear ?? fy.financialYearId),
      })),
    [financialYears],
  )

  return (
    <PageContainer className="space-y-5">
      <FilterCard title="Proceeding Details">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Select
            label="College"
            value={collegeId ? String(collegeId) : null}
            onChange={(v) => {
              setCollegeId(v ? Number(v) : null)
              setAcademicYearId(null)
              setFinancialYearId(null)
            }}
            options={collegeOptions}
            placeholder="Select college"
            searchable
          />
          <Select
            label="Academic Year"
            value={academicYearId ? String(academicYearId) : null}
            onChange={(v) => {
              setAcademicYearId(v ? Number(v) : null)
              setFinancialYearId(null)
            }}
            options={ayOptions}
            placeholder="Select academic year"
            searchable
            disabled={!collegeId}
          />
          <Select
            label="Financial Year"
            value={financialYearId ? String(financialYearId) : null}
            onChange={(v) => setFinancialYearId(v ? Number(v) : null)}
            options={fyOptions}
            placeholder="Select financial year"
            searchable
            disabled={!collegeId}
          />
        </div>
      </FilterCard>

      {financialYearId != null && (
      <TableCard withHeaderBorder={false}>
        <DataTable
          rowData={data?.rows ?? []}
          columnDefs={columnDefs}
          loading={isLoading}
          pagination
          toolbar={{
            search: true,
            searchPlaceholder: 'Search proceedings…',
            pdfDocumentTitle: 'Scholarship Proceedings',
          }}
          toolbarTrailing={(
            <Button
              size="sm"
              className="h-[30px] px-3 text-[12px]"
              disabled={!collegeId}
              onClick={() => {
                setEditing(null)
                setModalOpen(true)
              }}
            >
              <PlusIcon className="h-3.5 w-3.5 mr-1.5" />
              Add Proceeding
            </Button>
          )}
        />
      </TableCard>
      )}

      <PreceedingDetailsModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditing(null)
        }}
        row={editing}
        collegeId={collegeId}
        academicYearId={academicYearId}
        financialYearId={financialYearId}
        onSaved={() => void refetch()}
      />
    </PageContainer>
  )
}
