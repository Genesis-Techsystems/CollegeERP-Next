'use client'

import { useEffect, useMemo, useState } from 'react'
import { PencilIcon, PlusIcon } from 'lucide-react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { useCrudList } from '@/hooks/useCrudList'
import { FilterCard } from '@/common/components/feedback'
import { Select } from '@/common/components/select'
import { DataTable, TableCard } from '@/common/components/table'
import { StatusBadge } from '@/common/components/data-display'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { QK } from '@/lib/query-keys'
import { rowIndexGetter } from '@/lib/utils'
import {
  listAcademicYearsForCollege,
  listActiveCollegesForDepartments,
  listDepartmentEvents,
  type DepartmentEventRow,
} from '@/services'
import type { College } from '@/types/college'
import { DepartmentEventModal } from './DepartmentEventModal'

const COL_DEFS = {
  siNo: { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<DepartmentEventRow>,
  department: { field: 'departmentName', headerName: 'Department', minWidth: 140 } as ColDef<DepartmentEventRow>,
  name: { field: 'deptEventName', headerName: 'Event Name', minWidth: 160 } as ColDef<DepartmentEventRow>,
  description: { field: 'deptEventDescription', headerName: 'Description', minWidth: 180 } as ColDef<DepartmentEventRow>,
  academicYear: { field: 'academicYear', headerName: 'Academic Year', minWidth: 120 } as ColDef<DepartmentEventRow>,
  isActive: { field: 'isActive', headerName: 'Status', minWidth: 100, flex: 0 } as ColDef<DepartmentEventRow>,
  actions: { headerName: 'Actions', minWidth: 86, width: 86, flex: 0 } as ColDef<DepartmentEventRow>,
}

function statusRenderer(p: ICellRendererParams<DepartmentEventRow>) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

function makeActionsRenderer(
  setEditing: (row: DepartmentEventRow | null) => void,
  setModalOpen: (open: boolean) => void,
) {
  return (p: ICellRendererParams<DepartmentEventRow>) => (
    <Button
      size="sm"
      variant="ghost"
      className="h-8 w-8 p-0"
      aria-label="Edit department event"
      onClick={() => {
        setEditing(p.data ?? null)
        setModalOpen(true)
      }}
    >
      <PencilIcon className="h-3.5 w-3.5" />
    </Button>
  )
}

export function DepartmentEventsPage() {
  const [colleges, setColleges] = useState<College[]>([])
  const [collegeId, setCollegeId] = useState<number | null>(null)
  const [academicYears, setAcademicYears] = useState<{ academicYearId?: number; academicYear?: string }[]>([])
  const [academicYearId, setAcademicYearId] = useState<number | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<DepartmentEventRow | null>(null)

  const { data: allRows, isLoading, invalidate } = useCrudList({
    queryKey: QK.events.departmentEvents(),
    queryFn: listDepartmentEvents,
  })

  useEffect(() => {
    void listActiveCollegesForDepartments().then(setColleges).catch(() => setColleges([]))
  }, [])

  const collegeOptions = useMemo(
    () => colleges.map((c) => ({ value: String(c.collegeId), label: c.collegeCode ?? String(c.collegeId) })),
    [colleges],
  )

  const academicYearOptions = useMemo(
    () =>
      academicYears.map((ay) => ({
        value: String(ay.academicYearId),
        label: String(ay.academicYear ?? ay.academicYearId),
      })),
    [academicYears],
  )

  const rows = useMemo(() => {
    if (!collegeId || !academicYearId) return []
    return allRows.filter(
      (r) => Number(r.collegeId) === collegeId && Number(r.academicYearId) === academicYearId,
    )
  }, [allRows, collegeId, academicYearId])

  const columnDefs = useMemo<ColDef<DepartmentEventRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.department,
      COL_DEFS.name,
      COL_DEFS.description,
      COL_DEFS.academicYear,
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      { ...COL_DEFS.actions, cellRenderer: makeActionsRenderer(setEditing, setModalOpen) },
    ],
    [],
  )

  async function onCollegeChange(cid: number | null) {
    setCollegeId(cid)
    setAcademicYearId(null)
    setAcademicYears([])
    if (!cid) return
    try {
      const ay = await listAcademicYearsForCollege(cid)
      setAcademicYears(ay)
    } catch {
      setAcademicYears([])
    }
  }

  const canAdd = Boolean(collegeId && academicYearId)

  return (
    <PageContainer className="space-y-5">
      <FilterCard title="Department Events" bodyClassName="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <Select
            label="College *"
            value={collegeId ? String(collegeId) : null}
            onChange={(v) => void onCollegeChange(v ? Number(v) : null)}
            options={collegeOptions}
            searchable
            className="md:col-span-3"
          />
          <Select
            label="Academic Year *"
            value={academicYearId ? String(academicYearId) : null}
            onChange={(v) => setAcademicYearId(v ? Number(v) : null)}
            options={academicYearOptions}
            searchable
            disabled={!collegeId}
            className="md:col-span-3"
          />
        </div>
      </FilterCard>

      {canAdd ? (
        <TableCard withHeaderBorder={false}>
          <DataTable
            rowData={rows}
            columnDefs={columnDefs}
            loading={isLoading}
            pagination
            toolbar={{
              search: true,
              searchPlaceholder: 'Search department events…',
              pdfDocumentTitle: 'Department Events',
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
                Add Event
              </Button>
            )}
          />
        </TableCard>
      ) : (
        <p className="text-sm text-muted-foreground px-1">Select college and academic year to view events.</p>
      )}

      {canAdd ? (
        <DepartmentEventModal
          open={modalOpen}
          onClose={() => {
            setModalOpen(false)
            setEditing(null)
          }}
          row={editing}
          collegeId={collegeId!}
          academicYearId={academicYearId!}
          onSaved={invalidate}
        />
      ) : null}
    </PageContainer>
  )
}
