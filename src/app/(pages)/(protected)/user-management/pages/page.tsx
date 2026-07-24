"use client";

/**
 * Angular parity: user-management/pages (module-scoped)
 * List: domain/list/Page?query=Module.moduleId=={moduleId}
 * Query params: moduleId, moduleName
 * Columns: SI.No, Module Id, Page Name, Display Name, URL, Status, Edit
 * On create: moduleId comes from query params, subModuleId is null.
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
import { listPagesByModuleId, type NavPage } from "@/services";
import { PageModal } from "./PageModal";

const COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 76,
    flex: 0,
  } as ColDef<NavPage>,
  moduleId: {
    field: "moduleId",
    headerName: "module Id",
    minWidth: 110,
  } as ColDef<NavPage>,
  pageName: {
    field: "pageName",
    headerName: "Page Name",
    minWidth: 180,
  } as ColDef<NavPage>,
  displayName: {
    field: "displayName",
    headerName: "Display Name",
    minWidth: 180,
  } as ColDef<NavPage>,
  url: {
    field: "url",
    headerName: "URL",
    minWidth: 180,
  } as ColDef<NavPage>,
  isActive: {
    field: "isActive",
    headerName: "Status",
    minWidth: 110,
  } as ColDef<NavPage>,
  actions: {
    headerName: "Actions",
    minWidth: 90,
    flex: 0,
    width: 90,
    sortable: false,
    filter: false,
  } as ColDef<NavPage>,
};

function statusRenderer(p: ICellRendererParams<NavPage>) {
  return <StatusBadge status={p.data?.isActive ?? false} />;
}

function makeActionsRenderer(onEdit: (row: NavPage) => void) {
  return (p: ICellRendererParams<NavPage>) => {
    const row = p.data;
    if (!row) return null;
    return (
      <button
        type="button"
        title="Edit"
        aria-label="Edit"
        className="inline-flex items-center text-muted-foreground hover:text-foreground"
        onClick={() => onEdit(row)}
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
    );
  };
}

export default function PagesPage() {
  return (
    <Suspense
      fallback={
        <ListPage
          title="Pages"
          rowData={[]}
          columnDefs={[]}
          loading
          pagination
        />
      }
    >
      <PagesPageInner />
    </Suspense>
  );
}

function PagesPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const moduleId = Number(searchParams.get("moduleId") ?? 0) || 0;
  const moduleName = searchParams.get("moduleName") ?? "";

  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData] = useState<NavPage | null>(null);

  const { data, isLoading, invalidate } = useCrudList<NavPage>({
    queryKey: QK.menuModules.pagesByModule(moduleId),
    queryFn: () => listPagesByModuleId(moduleId),
    enabled: Boolean(moduleId),
  });

  const columnDefs = useMemo<ColDef<NavPage>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.moduleId,
      COL_DEFS.pageName,
      COL_DEFS.displayName,
      COL_DEFS.url,
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      {
        ...COL_DEFS.actions,
        cellRenderer: makeActionsRenderer((row) => {
          setEditData(row);
          setModalOpen(true);
        }),
      },
    ],
    [],
  );

  const title =
    moduleName.trim().length > 0 ? `${moduleName} Module Pages` : "Pages";

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
            + Add Page
          </Button>
        </div>
      }
    >
      <PageModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editData={editData}
        onSaved={invalidate}
        createExtra={{ moduleId, subModuleId: null }}
      />
    </ListPage>
  );
}
