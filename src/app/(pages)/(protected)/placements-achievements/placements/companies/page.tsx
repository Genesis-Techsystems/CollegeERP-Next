"use client";

/**
 * Angular parity: placements/companies
 * List: domain/list/Company?query=order(createdDt=desc)
 * Actions: Edit | Contact Details (navigate to company-contacts)
 * No print in Angular.
 */

import { useMemo, useState } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/common/components/data-display";
import { ListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { useCrudList } from "@/hooks/useCrudList";
import { QK } from "@/lib/query-keys";
import { rowIndexGetter } from "@/lib/utils";
import { listCompanies } from "@/services";
import type { Company } from "@/types/placements";
import { CompanyModal } from "./CompanyModal";

const COL_DEFS = {
  siNo: {
    headerName: "SI No.",
    valueGetter: rowIndexGetter,
    width: 80,
    flex: 0,
  } as ColDef<Company>,
  companyname: {
    field: "companyname",
    headerName: "Company Name",
    minWidth: 160,
  } as ColDef<Company>,
  location: {
    field: "location",
    headerName: "Location",
    minWidth: 120,
  } as ColDef<Company>,
  phoneNumber: {
    field: "phoneNumber",
    headerName: "Phone Number",
    minWidth: 130,
  } as ColDef<Company>,
  isActive: {
    field: "isActive",
    headerName: "Status",
    minWidth: 110,
  } as ColDef<Company>,
  actions: {
    headerName: "Actions",
    minWidth: 180,
    flex: 0,
    width: 200,
    sortable: false,
    filter: false,
  } as ColDef<Company>,
};

function statusRenderer(p: ICellRendererParams<Company>) {
  return <StatusBadge status={p.data?.isActive ?? false} />;
}

function makeActionsRenderer(handlers: {
  onEdit: (row: Company) => void;
  onContacts: (row: Company) => void;
}) {
  return (p: ICellRendererParams<Company>) => {
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
          className="text-sm font-medium text-blue-600 hover:underline"
          onClick={() => handlers.onContacts(row)}
        >
          Contact Details
        </button>
      </div>
    );
  };
}

export default function CompaniesPage() {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData] = useState<Company | null>(null);

  const { data, isLoading, invalidate } = useCrudList<Company>({
    queryKey: QK.companies.list(),
    queryFn: listCompanies,
  });

  const columnDefs = useMemo<ColDef<Company>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.companyname,
      COL_DEFS.location,
      COL_DEFS.phoneNumber,
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      {
        ...COL_DEFS.actions,
        cellRenderer: makeActionsRenderer({
          onEdit: (row) => {
            setEditData(row);
            setModalOpen(true);
          },
          onContacts: (row) => {
            // Angular: /placement-&-achievements/placements/company-contacts?companyId=&companyname=
            const qs = new URLSearchParams({
              companyId: String(row.companyId),
              companyname: row.companyname ?? "",
            });
            router.push(
              `/placements-achievements/placements/company-contacts?${qs.toString()}`,
            );
          },
        }),
      },
    ],
    [router],
  );

  return (
    <ListPage
      title="Companies"
      rowData={data}
      columnDefs={columnDefs}
      loading={isLoading}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: "Search",
        exportPdf: false,
      }}
      toolbarTrailing={
        <Button
          type="button"
          size="sm"
          onClick={() => {
            setEditData(null);
            setModalOpen(true);
          }}
        >
          + Add Company
        </Button>
      }
    >
      <CompanyModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editData={editData}
        onSaved={invalidate}
      />
    </ListPage>
  );
}
