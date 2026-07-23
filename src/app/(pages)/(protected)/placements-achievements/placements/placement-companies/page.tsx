"use client";

/**
 * Angular parity: placement-companies (Company Placement Requirements)
 *
 * Cascade:
 * 1) Campus on load (active)
 * 2) Placement on campus → Campus.campusId==X.and.isActive==true.order(createdDt=DESC)
 * 3) Company on placement → listAllDetails(Company) only then
 * 4) Requirements on company → Company.companyId==X.and.isActive==true.order(createdDt=desc)
 *
 * Table shows only when company selected. No print. Edit + View Details.
 */

import { useEffect, useMemo, useState } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { Eye, Pencil } from "lucide-react";
import { StatusBadge } from "@/common/components/data-display";
import { Select } from "@/common/components/select";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/common/generic-functions";
import { useCrudList } from "@/hooks/useCrudList";
import { QK } from "@/lib/query-keys";
import { rowIndexGetter } from "@/lib/utils";
import {
  listActiveCampuses,
  listCompanies,
  listPlacementCompaniesByCompany,
  listPlacementsByCampus,
} from "@/services";
import type { Campus } from "@/types/campus";
import type { Company, Placement, PlacementCompany } from "@/types/placements";
import { CompanyPlacementsRequirementsModal } from "./CompanyPlacementsRequirementsModal";
import { PlacementCompanyModal } from "./PlacementCompanyModal";

const COL_DEFS = {
  siNo: {
    headerName: "No.",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<PlacementCompany>,
  requirements: {
    field: "comapanyRequirements",
    headerName: "Requirements",
    minWidth: 200,
  } as ColDef<PlacementCompany>,
  backlog: {
    field: "isBackLogAllowed",
    headerName: "With Backlogs",
    minWidth: 130,
  } as ColDef<PlacementCompany>,
  status: {
    field: "isActive",
    headerName: "Status",
    minWidth: 110,
  } as ColDef<PlacementCompany>,
  actions: {
    headerName: "Actions",
    minWidth: 110,
    flex: 0,
    width: 110,
    sortable: false,
    filter: false,
  } as ColDef<PlacementCompany>,
};

function backlogRenderer(p: ICellRendererParams<PlacementCompany>) {
  const allowed = p.data?.isBackLogAllowed ?? false;
  return (
    <StatusBadge
      status={allowed ? "active" : "inactive"}
      label={allowed ? "Allowed" : "Not Allowed"}
    />
  );
}

function statusRenderer(p: ICellRendererParams<PlacementCompany>) {
  return <StatusBadge status={p.data?.isActive ?? false} />;
}

function makeActionsRenderer(handlers: {
  onEdit: (row: PlacementCompany) => void;
  onView: (row: PlacementCompany) => void;
}) {
  return (p: ICellRendererParams<PlacementCompany>) => {
    const row = p.data;
    if (!row) return null;
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          title="Edit"
          aria-label="Edit"
          className="inline-flex items-center text-muted-foreground hover:text-foreground"
          onClick={() => handlers.onEdit(row)}
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <span className="text-muted-foreground">|</span>
        <button
          type="button"
          title="View Details"
          aria-label="View Details"
          className="inline-flex items-center text-muted-foreground hover:text-foreground"
          onClick={() => handlers.onView(row)}
        >
          <Eye className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  };
}

export default function PlacementCompaniesPage() {
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [campusId, setCampusId] = useState<string | null>(null);
  const [placementId, setPlacementId] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [placementsLoading, setPlacementsLoading] = useState(false);
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editData, setEditData] = useState<PlacementCompany | null>(null);
  const [viewData, setViewData] = useState<PlacementCompany | null>(null);

  const selectedCampus =
    campuses.find((c) => String(c.campusId) === campusId) ?? null;
  const selectedPlacement =
    placements.find((p) => String(p.placementId) === placementId) ?? null;
  const selectedCompany =
    companies.find((c) => String(c.companyId) === companyId) ?? null;

  // Angular: only active campuses on construct — no companies / no requirements yet
  useEffect(() => {
    void listActiveCampuses().then(setCampuses).catch(console.error);
  }, []);

  async function handleCampusChange(value: string | null) {
    setCampusId(value);
    setPlacementId(null);
    setCompanyId(null);
    setPlacements([]);
    setCompanies([]);

    if (!value) return;
    setPlacementsLoading(true);
    try {
      // Angular selectedCampus → placements for campus (active, createdDt DESC)
      setPlacements(await listPlacementsByCampus(Number(value)));
    } catch {
      setPlacements([]);
    } finally {
      setPlacementsLoading(false);
    }
  }

  async function handlePlacementChange(value: string | null) {
    setPlacementId(value);
    setCompanyId(null);
    setCompanies([]);

    if (!value) return;
    setCompaniesLoading(true);
    try {
      // Angular selectedPlacement → listAllDetails(Company) only after placement chosen
      setCompanies(await listCompanies());
    } catch {
      setCompanies([]);
    } finally {
      setCompaniesLoading(false);
    }
  }

  function handleCompanyChange(value: string | null) {
    setCompanyId(value);
  }

  const filtersReady = Boolean(companyId);

  const { data, isLoading, invalidate } = useCrudList<PlacementCompany>({
    queryKey: QK.placementCompanies.byCompany(Number(companyId || 0)),
    queryFn: () => listPlacementCompaniesByCompany(Number(companyId)),
    enabled: filtersReady,
  });

  const columnDefs = useMemo<ColDef<PlacementCompany>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.requirements,
      { ...COL_DEFS.backlog, cellRenderer: backlogRenderer },
      { ...COL_DEFS.status, cellRenderer: statusRenderer },
      {
        ...COL_DEFS.actions,
        cellRenderer: makeActionsRenderer({
          onEdit: (row) => {
            setEditData(row);
            setEditModalOpen(true);
          },
          onView: (row) => {
            setViewData(row);
            setViewModalOpen(true);
          },
        }),
      },
    ],
    [],
  );

  const campusOptions = useMemo(
    () =>
      campuses.map((c) => ({
        value: String(c.campusId),
        label: `${c.campusName} - ${c.orgCode}`,
      })),
    [campuses],
  );

  const placementOptions = useMemo(
    () =>
      placements.map((p) => ({
        value: String(p.placementId),
        label: `${p.plaecmentTitle} (${formatDate(p.placementStartDate)} - ${formatDate(p.placementEndDate)})`,
      })),
    [placements],
  );

  const companyOptions = useMemo(
    () =>
      companies.map((c) => ({
        value: String(c.companyId),
        label: c.companyname,
      })),
    [companies],
  );

  const canAdd = Boolean(campusId && placementId && companyId);

  return (
    <FilteredListPage
      title="Company Placement Requirement"
      filters={
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Select
            label="Campus"
            required
            value={campusId}
            onChange={handleCampusChange}
            options={campusOptions}
            placeholder="Campus"
            searchable
            clearable
          />
          <Select
            label="Placement"
            required
            value={placementId}
            onChange={(v) => void handlePlacementChange(v)}
            options={placementOptions}
            placeholder="Placement"
            disabled={!campusId}
            isLoading={placementsLoading}
            searchable
            clearable
          />
          <Select
            label="Company"
            required
            value={companyId}
            onChange={handleCompanyChange}
            options={companyOptions}
            placeholder="Company"
            disabled={!placementId}
            isLoading={companiesLoading}
            searchable
            clearable
          />
        </div>
      }
      rowData={filtersReady ? data : []}
      columnDefs={columnDefs}
      loading={isLoading}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: "Search",
        exportPdf: false,
      }}
      toolbarTrailing={
        filtersReady ? (
          <Button
            type="button"
            size="sm"
            disabled={!canAdd}
            onClick={() => {
              setEditData(null);
              setEditModalOpen(true);
            }}
          >
            + Add Placement Requirements
          </Button>
        ) : null
      }
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
  );
}
