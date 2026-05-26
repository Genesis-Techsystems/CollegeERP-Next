'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { PencilIcon, PlusIcon } from 'lucide-react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { DataTable, TableCard } from '@/common/components/table'
import { StatusBadge } from '@/common/components/data-display'
import { FilterCard, FILTER_CARD_SELECT_CLASS } from '@/common/components/feedback'
import { Select, type SelectOption } from '@/common/components/select'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { QK } from '@/lib/query-keys'
import { getErrorMessage } from '@/lib/errors'
import { listActiveCollegesForGeneralSettings, listSelfAppraisalFormsByCollege } from '@/services'
import { rowIndexGetter } from '@/lib/utils'
import { SelfAppraisalFormModal } from './SelfAppraisalFormModal'
import { SelfAppraisalFormDetailsModal } from './SelfAppraisalFormDetailsModal'

type FormRow = Record<string, unknown>

const COL_DEFS = {
  siNo: { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<FormRow>,
  title: { field: 'title', headerName: 'Title', minWidth: 160 } as ColDef<FormRow>,
  startDate: { field: 'startDate', headerName: 'Start Date', minWidth: 120 } as ColDef<FormRow>,
  endDate: { field: 'endDate', headerName: 'End Date', minWidth: 120 } as ColDef<FormRow>,
  college: { field: 'collegeCode', headerName: 'College', minWidth: 110 } as ColDef<FormRow>,
  isActive: { field: 'isActive', headerName: 'Status', minWidth: 100, flex: 0 } as ColDef<FormRow>,
  actions: { headerName: 'Actions', minWidth: 200, flex: 0, width: 200 } as ColDef<FormRow>,
}

function dateFormatter(value: unknown): string {
  if (value == null || value === '') return ''
  const d = new Date(String(value))
  if (Number.isNaN(d.getTime())) return String(value)
  return format(d, 'dd MMM, yyyy')
}

function statusRenderer(p: ICellRendererParams<FormRow>) {
  return <StatusBadge status={p.data?.isActive !== false} />
}

function makeActionsRenderer(
  onFormDetails: (row: FormRow) => void,
  onEdit: (row: FormRow) => void,
) {
  return (p: ICellRendererParams<FormRow>) => {
    const row = p.data
    if (!row) return null
    return (
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="link"
          size="sm"
          className="h-auto px-1 text-[12px]"
          onClick={() => onFormDetails(row)}
        >
          Form Details
        </Button>
        <span className="text-muted-foreground">|</span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onEdit(row)}
        >
          <PencilIcon className="h-3.5 w-3.5" />
        </Button>
      </div>
    )
  }
}

export function SelfAppraisalPage() {
  const queryClient = useQueryClient()
  const [collegeId, setCollegeId] = useState<number | null>(null)
  const [colleges, setColleges] = useState<SelectOption[]>([])
  const [collegeRows, setCollegeRows] = useState<Record<string, unknown>[]>([])
  const [collegesLoading, setCollegesLoading] = useState(true)
  const [formModalOpen, setFormModalOpen] = useState(false)
  const [detailsModalOpen, setDetailsModalOpen] = useState(false)
  const [editingRow, setEditingRow] = useState<FormRow | null>(null)
  const [detailsRow, setDetailsRow] = useState<FormRow | null>(null)

  useEffect(() => {
    void (async () => {
      setCollegesLoading(true)
      try {
        const orgId = Number(globalThis.localStorage?.getItem('organizationId') ?? 0)
        const all = await listActiveCollegesForGeneralSettings()
        const filtered = orgId
          ? all.filter((c) => Number(c.organizationId) === orgId)
          : all
        setCollegeRows(filtered)
        setColleges(
          filtered.map((c) => ({
            value: String(c.collegeId),
            label: String(c.collegeCode ?? c.collegeName ?? c.collegeId),
          })),
        )
        if (filtered.length > 0) {
          setCollegeId(Number(filtered[0]!.collegeId))
        }
      } finally {
        setCollegesLoading(false)
      }
    })()
  }, [])

  const selectedCollegeCode = useMemo(() => {
    if (!collegeId) return ''
    const c = collegeRows.find((r) => Number(r.collegeId) === collegeId)
    return String(c?.collegeCode ?? '')
  }, [collegeId, collegeRows])

  const { data: rows = [], isFetching, error } = useQuery({
    queryKey: QK.hrPayroll.selfAppraisalForms(collegeId ?? 0),
    queryFn: () => listSelfAppraisalFormsByCollege(collegeId!),
    enabled: collegeId != null && collegeId > 0,
  })

  const onFormDetails = useCallback((row: FormRow) => {
    setDetailsRow(row)
    setDetailsModalOpen(true)
  }, [])

  const onEdit = useCallback((row: FormRow) => {
    setEditingRow(row)
    setFormModalOpen(true)
  }, [])

  const columnDefs = useMemo<ColDef<FormRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.title,
      { ...COL_DEFS.startDate, valueFormatter: (p) => dateFormatter(p.value) },
      { ...COL_DEFS.endDate, valueFormatter: (p) => dateFormatter(p.value) },
      COL_DEFS.college,
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      { ...COL_DEFS.actions, cellRenderer: makeActionsRenderer(onFormDetails, onEdit) },
    ],
    [onFormDetails, onEdit],
  )

  function invalidate() {
    if (collegeId) {
      void queryClient.invalidateQueries({
        queryKey: QK.hrPayroll.selfAppraisalForms(collegeId),
      })
    }
  }

  function openAddForm() {
    setEditingRow(null)
    setFormModalOpen(true)
  }

  return (
    <PageContainer className="space-y-5">
      <FilterCard title="Self Appraisal Form" defaultOpen>
        <Select
          label="College"
          required
          value={collegeId != null ? String(collegeId) : null}
          onChange={(v) => setCollegeId(v ? Number(v) : null)}
          options={colleges}
          placeholder="Select college"
          searchable
          isLoading={collegesLoading}
          className={FILTER_CARD_SELECT_CLASS}
        />
      </FilterCard>

      {error ? <p className="text-sm text-destructive px-1">{getErrorMessage(error)}</p> : null}

      {collegeId ? (
        <TableCard withHeaderBorder={false}>
          <DataTable
            rowData={rows}
            columnDefs={columnDefs}
            loading={isFetching}
            pagination
            toolbar={{
              search: true,
              searchPlaceholder: 'Search appraisal forms…',
              pdfDocumentTitle: 'Self Appraisal Forms',
              toolbarTrailing: (
                <Button type="button" size="sm" className="h-8 gap-1" onClick={openAddForm}>
                  <PlusIcon className="h-3.5 w-3.5" />
                  Add Form
                </Button>
              ),
            }}
          />
        </TableCard>
      ) : null}

      <SelfAppraisalFormModal
        open={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        row={editingRow}
        collegeId={collegeId ?? 0}
        collegeCode={editingRow ? String(editingRow.collegeCode ?? selectedCollegeCode) : selectedCollegeCode}
        onSaved={invalidate}
      />

      <SelfAppraisalFormDetailsModal
        open={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        formRow={detailsRow}
        onSaved={invalidate}
      />
    </PageContainer>
  )
}
