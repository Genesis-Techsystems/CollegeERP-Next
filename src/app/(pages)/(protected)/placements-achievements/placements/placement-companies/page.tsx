'use client'

import { useState, useMemo, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { EyeIcon, PencilIcon } from 'lucide-react'
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
  listPlacementCompaniesByCompany,
} from '@/services/placements'
import type { Campus } from '@/types/campus'
import type { Company, Placement, PlacementCompany } from '@/types/placements'
import { rowIndexGetter } from '@/lib/utils'
import PlacementCompanyModal from './PlacementCompanyModal'
import CompanyPlacementsRequirementsModal from './CompanyPlacementsRequirementsModal'

const COL_DEFS = {
  siNo: { headerName: 'No.', valueGetter: rowIndexGetter, width: 60, flex: 0 } as ColDef<PlacementCompany>,
  requirements: { field: 'comapanyRequirements', headerName: 'Requirements', minWidth: 200, flex: 2 } as ColDef<PlacementCompany>,
  backlog: { field: 'isBackLogAllowed', headerName: 'With Backlogs', minWidth: 120, flex: 0.9 } as ColDef<PlacementCompany>,
  status: { field: 'isActive', headerName: 'Status', minWidth: 100, flex: 0.8 } as ColDef<PlacementCompany>,
  actions: { headerName: 'Actions', width: 100, flex: 0 } as ColDef<PlacementCompany>,
}

function backlogRenderer(p: ICellRendererParams<PlacementCompany>) {
  const allowed = p.data?.isBackLogAllowed ?? false
  return (
    <StatusBadge
      status={allowed ? 'active' : 'inactive'}
      label={allowed ? 'Allowed' : 'Not Allowed'}
    />
  )
}

function statusRenderer(p: ICellRendererParams<PlacementCompany>) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

function makeActionsRenderer(
  onEdit: (row: PlacementCompany) => void,
  onView: (row: PlacementCompany) => void,
) {
  return (p: ICellRendererParams<PlacementCompany>) => {
    if (!p.data) return null
    return (
      <div className="flex gap-1">
        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Edit"
          onClick={() => onEdit(p.data!)}>
          <PencilIcon className="h-3.5 w-3.5" />
        </Button>
        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="View Details"
          onClick={() => onView(p.data!)}>
          <EyeIcon className="h-3.5 w-3.5" />
        </Button>
      </div>
    )
  }
}

function PlacementCompaniesContent() {
  const params = useSearchParams()
  const initialPlacementId = params.get('placementId') ?? ''

  const [campuses, setCampuses] = useState<Campus[]>([])
  const [placements, setPlacements] = useState<Placement[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [campusId, setCampusId] = useState<string | null>(null)
  const [placementId, setPlacementId] = useState<string | null>(null)
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [filtersLoading, setFiltersLoading] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [editData, setEditData] = useState<PlacementCompany | null>(null)
  const [viewData, setViewData] = useState<PlacementCompany | null>(null)
  const [deepLinkApplied, setDeepLinkApplied] = useState(false)

  const selectedCampus = campuses.find((c) => String(c.campusId) === campusId) ?? null
  const selectedPlacement = placements.find((p) => String(p.placementId) === placementId) ?? null
  const selectedCompany = companies.find((c) => String(c.companyId) === companyId) ?? null
  const filtersReady = Boolean(companyId)

  useEffect(() => {
    listActiveCampuses().then(setCampuses).catch(console.error)
    listCompanies().then(setCompanies).catch(console.error)
  }, [])

  useEffect(() => {
    if (!initialPlacementId || deepLinkApplied || campuses.length === 0) return

    async function applyDeepLink() {
      setFiltersLoading(true)
      try {
        for (const campus of campuses) {
          const rows = await listPlacementsByCampus(campus.campusId)
          const match = rows.find((p) => String(p.placementId) === initialPlacementId)
          if (match) {
            setCampusId(String(campus.campusId))
            setPlacements(rows)
            setPlacementId(String(match.placementId))
            break
          }
        }
      } finally {
        setDeepLinkApplied(true)
        setFiltersLoading(false)
      }
    }

    applyDeepLink()
  }, [initialPlacementId, deepLinkApplied, campuses])

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

  const { data, isLoading, invalidate } = useCrudList<PlacementCompany>({
    queryKey: QK.placementCompanies.byCompany(Number(companyId)),
    queryFn: () => listPlacementCompaniesByCompany(Number(companyId)),
    enabled: filtersReady,
  })

  const columnDefs = useMemo<ColDef<PlacementCompany>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.requirements,
      { ...COL_DEFS.backlog, cellRenderer: backlogRenderer },
      { ...COL_DEFS.status, cellRenderer: statusRenderer },
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

  const canAdd = Boolean(campusId && placementId && companyId)

  return (
    <FilteredListPage
      title="Company Placement Requirements"
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
        searchPlaceholder: 'Search…',
        pdfDocumentTitle: 'Company Placement Requirements',
      }}
      toolbarTrailing={(
        <Button
          size="sm"
          disabled={!canAdd}
          onClick={() => { setEditData(null); setEditModalOpen(true) }}
        >
          + Add Placement Requirements
        </Button>
      )}
    >
      <PlacementCompanyModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        editData={editData}
        context={{
          campus: selectedCampus,
          placement: selectedPlacement,
          company: selectedCompany,
        }}
        onSaved={invalidate}
      />

      <CompanyPlacementsRequirementsModal
        open={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        data={viewData}
        campus={selectedCampus}
        placement={selectedPlacement}
        company={selectedCompany}
      />
    </FilteredListPage>
  )
}

export default function PlacementCompaniesPage() {
  return (
    <Suspense>
      <PlacementCompaniesContent />
    </Suspense>
  )
}
