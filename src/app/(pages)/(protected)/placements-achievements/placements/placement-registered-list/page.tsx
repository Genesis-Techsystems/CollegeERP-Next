'use client'

import { useState, useMemo, useEffect } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { EyeIcon } from 'lucide-react'
import { FilteredListPage } from '@/components/layout'
import { Select } from '@/common/components/select'
import { StatusBadge } from '@/common/components/data-display'
import { Button } from '@/components/ui/button'
import { useCrudList } from '@/hooks/useCrudList'
import { QK } from '@/lib/query-keys'
import { formatDate } from '@/common/generic-functions'
import { listActiveCampuses } from '@/services'
import {
  listPlacementsByCampus,
  listCompanies,
  listPlacementStudentRegs,
} from '@/services/placements'
import type { Campus } from '@/types/campus'
import type { Company, Placement, PlacementStudentRegistration } from '@/types/placements'
import { rowIndexGetter } from '@/lib/utils'
import PlacementInterviewModal from '../PlacementInterviewModal'
import InterviewDetailsModal from './InterviewDetailsModal'

const COL_DEFS = {
  siNo: { headerName: 'No.', valueGetter: rowIndexGetter, width: 60, flex: 0 } as ColDef<PlacementStudentRegistration>,
  studentName: { field: 'firstName', headerName: 'Student Name', minWidth: 180, flex: 2 } as ColDef<PlacementStudentRegistration>,
  cvShortlisted: { field: 'isCVShortlisted', headerName: 'CV Short List', minWidth: 120, flex: 0.9 } as ColDef<PlacementStudentRegistration>,
  actions: { headerName: 'Actions', width: 150, flex: 0 } as ColDef<PlacementStudentRegistration>,
}

function studentNameRenderer(p: ICellRendererParams<PlacementStudentRegistration>) {
  const row = p.data
  if (!row) return null
  return (
    <span className="text-xs">
      {row.firstName}
      {row.rollNumber && (
        <span className="text-muted-foreground"> ({row.rollNumber})</span>
      )}
    </span>
  )
}

function cvShortlistedRenderer(p: ICellRendererParams<PlacementStudentRegistration>) {
  return (
    <StatusBadge
      status={p.data?.isCVShortlisted ?? false}
      label={p.data?.isCVShortlisted ? 'Yes' : 'No'}
    />
  )
}

function makeActionsRenderer(
  onInterview: (row: PlacementStudentRegistration) => void,
  onView: (row: PlacementStudentRegistration) => void,
) {
  return (p: ICellRendererParams<PlacementStudentRegistration>) => {
    if (!p.data) return null
    return (
      <div className="flex items-center gap-1">
        <Button size="sm" variant="outline" className="h-7 px-2 text-xs"
          onClick={() => onInterview(p.data!)}>
          Interview
        </Button>
        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="View Interview Details"
          onClick={() => onView(p.data!)}>
          <EyeIcon className="h-3.5 w-3.5" />
        </Button>
      </div>
    )
  }
}

export default function PlacementRegisteredListPage() {
  const [campuses, setCampuses] = useState<Campus[]>([])
  const [placements, setPlacements] = useState<Placement[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [campusId, setCampusId] = useState<string | null>(null)
  const [placementId, setPlacementId] = useState<string | null>(null)
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [filtersLoading, setFiltersLoading] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [editData, setEditData] = useState<PlacementStudentRegistration | null>(null)
  const [viewData, setViewData] = useState<PlacementStudentRegistration | null>(null)

  const selectedPlacement = placements.find((p) => String(p.placementId) === placementId) ?? null
  const filtersReady = Boolean(companyId && placementId)

  useEffect(() => {
    listActiveCampuses().then(setCampuses).catch(console.error)
    listCompanies().then(setCompanies).catch(console.error)
  }, [])

  async function handleCampusChange(value: string | null) {
    setCampusId(value)
    setPlacementId(null)
    setCompanyId(null)
    setPlacements([])

    if (!value) return
    setFiltersLoading(true)
    try {
      const rows = await listPlacementsByCampus(Number(value))
      setPlacements(rows)
    } catch {
      setPlacements([])
    } finally {
      setFiltersLoading(false)
    }
  }

  function handlePlacementChange(value: string | null) {
    setPlacementId(value)
    setCompanyId(null)
  }

  function handleCompanyChange(value: string | null) {
    setCompanyId(value)
  }

  const { data, isLoading, invalidate } = useCrudList<PlacementStudentRegistration>({
    queryKey: QK.placementStudentRegs.byCompanyAndPlacement(Number(companyId), Number(placementId)),
    queryFn: () => listPlacementStudentRegs(Number(companyId), Number(placementId)),
    enabled: filtersReady,
  })

  const columnDefs = useMemo<ColDef<PlacementStudentRegistration>[]>(
    () => [
      COL_DEFS.siNo,
      { ...COL_DEFS.studentName, cellRenderer: studentNameRenderer },
      { ...COL_DEFS.cvShortlisted, cellRenderer: cvShortlistedRenderer },
      {
        ...COL_DEFS.actions,
        cellRenderer: makeActionsRenderer(
          (row) => { setEditData(row); setEditModalOpen(true) },
          (row) => { setViewData(row); setViewModalOpen(true) },
        ),
      },
    ],
    [],
  )

  const campusOptions = useMemo(
    () => campuses.map((c) => ({
      value: String(c.campusId),
      label: `${c.campusName} - ${c.orgCode}`,
    })),
    [campuses],
  )

  const placementOptions = useMemo(
    () => placements.map((p) => ({
      value: String(p.placementId),
      label: `${p.plaecmentTitle} (${formatDate(p.placementStartDate)} - ${formatDate(p.placementEndDate)})`,
    })),
    [placements],
  )

  const companyOptions = useMemo(
    () => companies.map((c) => ({
      value: String(c.companyId),
      label: c.companyname,
    })),
    [companies],
  )

  return (
    <FilteredListPage
      title="Placement Students List"
      filters={(
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Select
            label="Campus *"
            value={campusId}
            onChange={handleCampusChange}
            options={campusOptions}
            placeholder="Select campus"
            searchable
            clearable
          />
          <Select
            label="Placement *"
            value={placementId}
            onChange={handlePlacementChange}
            options={placementOptions}
            placeholder="Select placement"
            disabled={!campusId}
            isLoading={filtersLoading}
            searchable
            clearable
          />
          <Select
            label="Company *"
            value={companyId}
            onChange={handleCompanyChange}
            options={companyOptions}
            placeholder="Select company"
            disabled={!placementId}
            searchable
            clearable
          />
        </div>
      )}
      rowData={filtersReady ? data : []}
      columnDefs={columnDefs}
      loading={isLoading}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: 'Search students…',
        pdfDocumentTitle: 'Placement Students List',
      }}
    >
      <PlacementInterviewModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        editData={editData}
        onSaved={invalidate}
      />

      <InterviewDetailsModal
        open={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        data={viewData}
        placementTitle={selectedPlacement?.plaecmentTitle}
      />
    </FilteredListPage>
  )
}
