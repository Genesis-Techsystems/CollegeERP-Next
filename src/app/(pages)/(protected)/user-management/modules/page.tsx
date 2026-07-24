"use client";

/**
 * Angular parity: user-management/modules
 * List: domain/list/Module?query=order(createdDt=desc)&size=99999
 * Columns: SI.No, Module, Display Name, Status, Actions (Sub-Modules | Pages | Edit)
 * Sub-Modules → /user-management/sub-modules?moduleId=&moduleName=
 * Pages → /user-management/pages?moduleId=&moduleName=
 * + Add Pages → /user-management/only-pages
 * No print.
 */

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { Pencil } from "lucide-react";
import { StatusBadge } from "@/common/components/data-display";
import { ListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { useCrudList } from "@/hooks/useCrudList";
import { QK } from "@/lib/query-keys";
import { rowIndexGetter } from "@/lib/utils";
import { listAllModules, type NavModule } from "@/services";
import { ModuleModal } from "../_components/ModuleModal";

const COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 76,
    flex: 0,
  } as ColDef<NavModule>,
  moduleName: {
    field: "moduleName",
    headerName: "Module",
    minWidth: 180,
  } as ColDef<NavModule>,
  displayName: {
    field: "displayName",
    headerName: "Display Name",
    minWidth: 180,
  } as ColDef<NavModule>,
  isActive: {
    field: "isActive",
    headerName: "Status",
    minWidth: 110,
  } as ColDef<NavModule>,
  actions: {
    headerName: "Actions",
    minWidth: 220,
    flex: 0,
    width: 240,
    sortable: false,
    filter: false,
  } as ColDef<NavModule>,
};

function statusRenderer(p: ICellRendererParams<NavModule>) {
  return <StatusBadge status={p.data?.isActive ?? false} />;
}

function makeActionsRenderer(handlers: {
  onSubModules: (row: NavModule) => void;
  onPages: (row: NavModule) => void;
  onEdit: (row: NavModule) => void;
}) {
  return (p: ICellRendererParams<NavModule>) => {
    const row = p.data;
    if (!row) return null;
    return (
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 px-2.5 text-[11px]"
          onClick={() => handlers.onSubModules(row)}
        >
          Sub-Modules
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 px-2.5 text-[11px]"
          onClick={() => handlers.onPages(row)}
        >
          Pages
        </Button>
        <button
          type="button"
          title="Edit"
          aria-label="Edit"
          className="inline-flex items-center text-muted-foreground hover:text-foreground"
          onClick={() => handlers.onEdit(row)}
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  };
}

export default function ModulesPage() {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData] = useState<NavModule | null>(null);

  const { data, isLoading, invalidate } = useCrudList<NavModule>({
    queryKey: QK.menuModules.list(),
    queryFn: listAllModules,
  });

  const columnDefs = useMemo<ColDef<NavModule>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.moduleName,
      COL_DEFS.displayName,
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      {
        ...COL_DEFS.actions,
        cellRenderer: makeActionsRenderer({
          onSubModules: (row) => {
            const params = new URLSearchParams({
              moduleId: String(row.moduleId),
              moduleName: row.moduleName ?? "",
            });
            router.push(`/user-management/sub-modules?${params.toString()}`);
          },
          onPages: (row) => {
            const params = new URLSearchParams({
              moduleId: String(row.moduleId),
              moduleName: row.moduleName ?? "",
            });
            router.push(`/user-management/pages?${params.toString()}`);
          },
          onEdit: (row) => {
            setEditData(row);
            setModalOpen(true);
          },
        }),
      },
    ],
    [router],
  );

  return (
    <ListPage
      title="Modules"
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
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            onClick={() => {
              setEditData(null);
              setModalOpen(true);
            }}
          >
            + Add Module
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => router.push("/user-management/only-pages")}
          >
            + Add Pages
          </Button>
        </div>
      }
    >
      <ModuleModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editData={editData}
        onSaved={invalidate}
      />
    </ListPage>
  );
}
