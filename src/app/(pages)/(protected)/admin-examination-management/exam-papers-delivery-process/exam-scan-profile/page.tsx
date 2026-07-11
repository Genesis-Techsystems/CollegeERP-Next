'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { PlusIcon, ScanLine } from 'lucide-react'
import { PageContainer } from '@/components/layout'
import { DataTable, TableRowActions } from '@/common/components/table'
import { StatusBadge } from '@/common/components/data-display'
import { Button } from '@/components/ui/button'
import { rowIndexGetter } from '@/lib/utils'
import { toastError, toastSuccess } from '@/lib/toast'
import { listAllUnivEcProfiles, type AnyRow } from '@/services/exam-papers-delivery'
import ExamScanProfileModal from './ExamScanProfileModal'

type Row = AnyRow

function txt(v: unknown): string {
  if (typeof v === 'string') return v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  return ''
}

function getByPath(row: Row, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[key]
    return undefined
  }, row)
}

function pickText(row: Row, keys: string[]): string {
  for (const key of keys) {
    const value = key.includes('.') ? getByPath(row, key) : row[key]
    if (value != null && String(value).trim() !== '') return txt(value)
  }
  return ''
}

function pickName(row: Row): string {
  const direct = pickText(row, [
    'scanProfileName',
    'scan_profile_name',
    'name',
    'Name',
    'fullName',
    'profileName',
    'profile_name',
    'evaluatorName',
    'evaluator_name',
    'examEvaluatorProfilesName',
    'exam_evaluator_profiles_name',
    'examEvaluatorProfileName',
    'employeeName',
    'employee.name',
    'employee.firstName',
    'employee.first_name',
    'staffName',
    'staff.name',
    'staff.firstName',
  ])
  if (direct) return direct

  const firstName = pickText(row, ['firstName', 'first_name'])
  const middleName = pickText(row, ['middleName', 'middle_name'])
  const lastName = pickText(row, ['lastName', 'last_name'])
  return [firstName, middleName, lastName].filter(Boolean).join(' ').trim()
}

const COL_DEFS = {
  siNo: { headerName: 'SL.No', valueGetter: rowIndexGetter, width: 72, flex: 0, filter: false, sortable: false } as ColDef<Row>,
  name: { headerName: 'Name', minWidth: 180, flex: 1.1 } as ColDef<Row>,
  phone: { headerName: 'Phone', minWidth: 120, flex: 0.9 } as ColDef<Row>,
  email: { headerName: 'Email', minWidth: 220, flex: 1.1 } as ColDef<Row>,
  aadhar: { headerName: 'Aadhar Card', minWidth: 140, flex: 0.9 } as ColDef<Row>,
  pan: { headerName: 'Pan Card', minWidth: 120, flex: 0.8 } as ColDef<Row>,
  details: { headerName: 'Details', minWidth: 120, flex: 0, filter: false, sortable: false } as ColDef<Row>,
  isActive: { headerName: 'Status', minWidth: 100, flex: 0.7 } as ColDef<Row>,
  actions: { headerName: 'Actions', colId: 'actions', minWidth: 100, flex: 0, width: 100, filter: false, sortable: false } as ColDef<Row>,
}

function statusRenderer(p: ICellRendererParams<Row>) {
  return <StatusBadge status={Boolean(p.data?.isActive)} />
}

function makeDetailsRenderer(onDetails: (row: Row) => void) {
  return (p: ICellRendererParams<Row>) => {
    const row = p.data
    if (!row) return null
    return (
      <button
        type="button"
        className="text-xs font-medium text-[hsl(var(--primary))] hover:underline"
        onClick={() => onDetails(row)}
      >
        Profile Details
      </button>
    )
  }
}

function makeActionsRenderer(setEditing: (row: Row | null) => void, setModalOpen: (open: boolean) => void) {
  return (p: ICellRendererParams<Row>) => (
    <TableRowActions
      onEdit={() => {
        setEditing(p.data ?? null)
        setModalOpen(true)
      }}
      editLabel="Edit exam scan profile"
    />
  )
}

export default function ExamScanProfilePage() {
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState<Row[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Row | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const list = await listAllUnivEcProfiles()
      setRows(Array.isArray(list) ? list : [])
    } catch (e) {
      toastError(e, 'Failed to load exam scan profiles')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const onDetails = useCallback((row: Row) => {
    const name = pickName(row)
    toastSuccess(`Profile details view for "${name || 'record'}" will be added next.`)
  }, [])

  const columnDefs = useMemo<ColDef<Row>[]>(
    () => [
      COL_DEFS.siNo,
      { ...COL_DEFS.name, valueGetter: (p) => pickName(p.data ?? {}) || '—' },
      {
        ...COL_DEFS.phone,
        valueGetter: (p) =>
          pickText(p.data ?? {}, ['phone', 'phoneNumber', 'mobileNo', 'mobileNumber', 'contactNo', 'mobile']) || '—',
      },
      {
        ...COL_DEFS.email,
        valueGetter: (p) => pickText(p.data ?? {}, ['email', 'emailId', 'mailId']) || '—',
      },
      {
        ...COL_DEFS.aadhar,
        valueGetter: (p) =>
          pickText(p.data ?? {}, ['aadharCard', 'aadhaarCard', 'aadharNo', 'aadhaarNo', 'aadhar']) || '—',
      },
      {
        ...COL_DEFS.pan,
        valueGetter: (p) =>
          pickText(p.data ?? {}, ['panCard', 'panNo', 'panCardNo', 'pancardNo', 'pan_number', 'pan_card_no']) || '—',
      },
      { ...COL_DEFS.details, cellRenderer: makeDetailsRenderer(onDetails) },
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      { ...COL_DEFS.actions, cellRenderer: makeActionsRenderer(setEditing, setModalOpen) },
    ],
    [onDetails],
  )

  return (
    <PageContainer className="space-y-4">
      {!loading && rows.length === 0 ? (
        <div className="app-card flex flex-col items-center justify-center py-16 text-muted-foreground">
          <ScanLine className="mb-3 h-10 w-10 opacity-40" />
          <p className="text-sm">No exam scan profiles found</p>
          <Button
            size="sm"
            className="mt-4"
            data-table-primary-action
            onClick={() => {
              setEditing(null)
              setModalOpen(true)
            }}
          >
            <PlusIcon className="mr-1.5 h-4 w-4" />
            Create Scan Profile
          </Button>
        </div>
      ) : (
        <DataTable
          title="Exam Scan Profile"
          bordered
          rowData={rows}
          columnDefs={columnDefs}
          loading={loading}
          pagination
          toolbar={{ searchPlaceholder: 'Search exam scan profiles…', pdfDocumentTitle: 'Exam Scan Profile' }}
          toolbarTrailing={
            <Button
              size="sm"
              data-table-primary-action
              onClick={() => {
                setEditing(null)
                setModalOpen(true)
              }}
            >
              <PlusIcon className="mr-1.5 h-4 w-4" />
              Create Scan Profile
            </Button>
          }
        />
      )}

      <ExamScanProfileModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditing(null)
        }}
        profile={editing}
        onSaved={() => void loadData()}
      />
    </PageContainer>
  )
}
