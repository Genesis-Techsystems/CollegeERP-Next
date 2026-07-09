'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { PencilIcon, PlusIcon } from 'lucide-react'
import { DataTable } from '@/common/components/table'
import { StatusBadge } from '@/common/components/data-display'
import { GlobalFilterBar, GlobalFilterBarRow, GlobalFilterField } from '@/common/components/forms'
import { Select } from '@/common/components/select'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { useQuery } from '@tanstack/react-query'
import { QK } from '@/lib/query-keys'
import { getCrudModalKey, rowIndexGetter } from '@/lib/utils'
import { listActiveCollegesForStudentBatches, listStudentBatches } from '@/services'
import type { StudentBatch } from '@/types/student-batch'
import StudentBatchModal from './StudentBatchModal'

const COLS = {
  siNo: { colId: 'siNo', headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<StudentBatch>,
  collegeName: { colId: 'collegeName', headerName: 'College Name', minWidth: 150, flex: 1.1 } as ColDef<StudentBatch>,
  courseName: { colId: 'courseName', headerName: 'Course', minWidth: 130, flex: 1 } as ColDef<StudentBatch>,
  subjectType: { colId: 'subjectType', headerName: 'Subject Type', minWidth: 130, flex: 1 } as ColDef<StudentBatch>,
  batchName: { colId: 'batchName', field: 'batchName', headerName: 'Batch', minWidth: 130, flex: 1 } as ColDef<StudentBatch>,
  capacity: { colId: 'capacity', headerName: 'Capacity', minWidth: 100, flex: 0.7 } as ColDef<StudentBatch>,
  sortOrder: { colId: 'sortOrder', headerName: 'Sort Order', minWidth: 100, flex: 0.7 } as ColDef<StudentBatch>,
  isActive: { colId: 'isActive', field: 'isActive', headerName: 'Status', minWidth: 90, flex: 0.7 } as ColDef<StudentBatch>,
  actions: { colId: 'actions', headerName: 'Actions', minWidth: 86, width: 86, flex: 0 } as ColDef<StudentBatch>,
}

function pick(r: Record<string, unknown>, keys: string[]) {
  for (const k of keys) {
    const v = r[k]
    if (typeof v === 'string' && v.trim()) return v
    if (typeof v === 'number' && Number.isFinite(v)) return String(v)
  }
  return ''
}

function statusRenderer(p: ICellRendererParams<StudentBatch>) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

function actionRenderer(
  setRow: (r: StudentBatch | null) => void,
  setOpen: (b: boolean) => void,
) {
  return (p: ICellRendererParams<StudentBatch>) => (
    <Button
      size="sm"
      variant="ghost"
      className="h-8 w-8 p-0"
      onClick={() => {
        setRow(p.data ?? null)
        setOpen(true)
      }}
    >
      <PencilIcon className="h-3.5 w-3.5" />
    </Button>
  )
}

export default function StudentBatchesPage() {
  const [open, setOpen] = useState(false)
  const [row, setRow] = useState<StudentBatch | null>(null)
  const [collegeId, setCollegeId] = useState<number | null>(null)

  const collegesQuery = useQuery({
    queryKey: QK.studentBatches.colleges(),
    queryFn: listActiveCollegesForStudentBatches,
    staleTime: 5 * 60 * 1000,
  })

  const colleges = collegesQuery.data ?? []

  // Angular: auto-select first college and load batches
  useEffect(() => {
    if (collegeId != null) return
    if (colleges.length === 0) return
    setCollegeId(colleges[0].collegeId)
  }, [colleges, collegeId])

  const listQuery = useQuery({
    queryKey: QK.studentBatches.list(collegeId ?? undefined),
    queryFn: () => listStudentBatches(collegeId ?? undefined),
    enabled: collegeId != null && collegeId > 0,
  })

  const collegeOptions = useMemo(
    () => colleges.map((c) => ({
      value: String(c.collegeId),
      label: c.collegeName ?? c.collegeCode,
    })),
    [colleges],
  )

  const selectedCollege = useMemo(
    () => colleges.find((c) => c.collegeId === collegeId) ?? null,
    [colleges, collegeId],
  )

  const columnDefs = useMemo<ColDef<StudentBatch>[]>(
    () => [
      COLS.siNo,
      {
        ...COLS.collegeName,
        valueGetter: (p) =>
          pick((p.data ?? {}) as Record<string, unknown>, ['collegeName', 'collegeCode']),
      },
      {
        ...COLS.courseName,
        valueGetter: (p) =>
          pick((p.data ?? {}) as Record<string, unknown>, ['courseName', 'courseCode']),
      },
      {
        ...COLS.subjectType,
        valueGetter: (p) =>
          pick((p.data ?? {}) as Record<string, unknown>, ['subjecttypeName', 'subjectTypeName']),
      },
      COLS.batchName,
      {
        ...COLS.capacity,
        valueGetter: (p) => {
          const v = p.data?.capacity
          return v == null ? '' : String(v)
        },
      },
      {
        ...COLS.sortOrder,
        valueGetter: (p) => {
          const v = p.data?.sortOrder
          return v == null ? '' : String(v)
        },
      },
      { ...COLS.isActive, cellRenderer: statusRenderer },
      { ...COLS.actions, cellRenderer: actionRenderer(setRow, setOpen) },
    ],
    [],
  )

  function invalidate() {
    void listQuery.refetch()
  }

  return (
    <PageContainer className="space-y-4">
      <GlobalFilterBar title="Student Batches" defaultOpen collapsible>
        <GlobalFilterBarRow columns={3}>
          <GlobalFilterField label="College">
            <Select
              value={collegeId ? String(collegeId) : null}
              onChange={(v) => setCollegeId(v ? Number(v) : null)}
              options={collegeOptions}
              placeholder="Select college"
              searchable
              isLoading={collegesQuery.isLoading}
            />
          </GlobalFilterField>
        </GlobalFilterBarRow>
      </GlobalFilterBar>

      <div className="app-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/40">
          <h2 className="app-card-title">Student Batches</h2>
        </div>
        <div className="px-3 pb-3 pt-2">
          <DataTable
            rowData={listQuery.data ?? []}
            columnDefs={columnDefs}
            loading={listQuery.isLoading || listQuery.isFetching}
            pagination
            toolbarTrailing={
              <Button
                size="sm"
                onClick={() => {
                  setRow(null)
                  setOpen(true)
                }}
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                Add Student Batch
              </Button>
            }
            toolbar={{
              search: true,
              searchPlaceholder: 'Search student batches…',
              pdfDocumentTitle: 'Student batches',
            }}
          />
        </div>
      </div>

      <StudentBatchModal
        key={getCrudModalKey(row, open, 'studentbatchId')}
        open={open}
        onClose={() => {
          setOpen(false)
          setRow(null)
        }}
        row={row}
        defaultCollegeId={collegeId}
        defaultUniversityId={selectedCollege?.universityId ?? null}
        onSaved={invalidate}
      />
    </PageContainer>
  )
}
