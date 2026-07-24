"use client";

/**
 * Angular parity: user-management/sub-modules
 * List: domain/list/Submodule?query=Module.moduleId=={moduleId}
 * Query params: moduleId, moduleName
 * Columns: SI.No, Sub Module, Display Name, Status, Actions (Pages | Edit)
 * Pages → /user-management/add-submodule-pages?subModuleId=&submoduleName=&moduleId=
 * No print.
 */

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { Pencil } from "lucide-react";
import { StatusBadge } from "@/common/components/data-display";
import { ListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { useCrudList } from "@/hooks/useCrudList";
import { QK } from "@/lib/query-keys";
import { rowIndexGetter } from "@/lib/utils";
import { listSubModulesByModuleId, type NavSubModule } from "@/services";
import { SubModuleModal } from "../_components/SubModuleModal";

const COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 76,
    flex: 0,
  } as ColDef<NavSubModule>,
  submoduleName: {
    field: "submoduleName",
    headerName: "Sub Module",
    minWidth: 180,
  } as ColDef<NavSubModule>,
  displayName: {
    field: "displayName",
    headerName: "Display Name",
    minWidth: 180,
  } as ColDef<NavSubModule>,
  isActive: {
    field: "isActive",
    headerName: "Status",
    minWidth: 110,
  } as ColDef<NavSubModule>,
  actions: {
    headerName: "Actions",
    minWidth: 140,
    flex: 0,
    width: 150,
    sortable: false,
    filter: false,
  } as ColDef<NavSubModule>,
};

function statusRenderer(p: ICellRendererParams<NavSubModule>) {
  return <StatusBadge status={p.data?.isActive ?? false} />;
}

function makeActionsRenderer(handlers: {
  onPages: (row: NavSubModule) => void;
  onEdit: (row: NavSubModule) => void;
}) {
  return (p: ICellRendererParams<NavSubModule>) => {
    const row = p.data;
    if (!row) return null;
    return (
      <div className="flex items-center gap-3">
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

export default function SubModulesPage() {
  return (
    <Suspense
      fallback={
        <ListPage
          title="Sub Modules"
          rowData={[]}
          columnDefs={[]}
          loading
          pagination
        />
      }
    >
      <SubModulesPageInner />
    </Suspense>
  );
}

function SubModulesPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const moduleId = Number(searchParams.get("moduleId") ?? 0) || 0;
  const moduleName = searchParams.get("moduleName") ?? "";

  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData] = useState<NavSubModule | null>(null);

  const { data, isLoading, invalidate } = useCrudList<NavSubModule>({
    queryKey: QK.menuModules.subModules(moduleId),
    queryFn: () => listSubModulesByModuleId(moduleId),
    enabled: Boolean(moduleId),
  });

  const columnDefs = useMemo<ColDef<NavSubModule>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.submoduleName,
      COL_DEFS.displayName,
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      {
        ...COL_DEFS.actions,
        cellRenderer: makeActionsRenderer({
          onPages: (row) => {
            const scopedModuleId = Number(row.moduleId ?? moduleId) || moduleId;
            const params = new URLSearchParams({
              subModuleId: String(row.subModuleId),
              submoduleName: row.submoduleName ?? "",
              moduleId: String(scopedModuleId),
            });
            router.push(
              `/user-management/add-submodule-pages?${params.toString()}`,
            );
          },
          onEdit: (row) => {
            setEditData(row);
            setModalOpen(true);
          },
        }),
      },
    ],
    [router, moduleId],
  );

  const title =
    moduleName.trim().length > 0 ? `${moduleName} Sub Modules` : "Sub Modules";

  return (
    <ListPage
      title={title}
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
            variant="outline"
            size="sm"
            onClick={() => router.back()}
          >
            Back
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!moduleId}
            onClick={() => {
              setEditData(null);
              setModalOpen(true);
            }}
          >
            + Add Sub Module
          </Button>
        </div>
      }
    >
      <SubModuleModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editData={editData}
        onSaved={invalidate}
        moduleId={moduleId}
        moduleName={moduleName}
      />
    </ListPage>
  );
}
