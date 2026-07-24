"use client";

import { useMemo, useState } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { PencilIcon, PlusIcon } from "lucide-react";
import { ListPage } from "@/components/layout";
import { StatusBadge } from "@/common/components/data-display";
import { Button } from "@/components/ui/button";
import { useCrudList } from "@/hooks/useCrudList";
import { QK } from "@/lib/query-keys";
import { rowIndexGetter } from "@/lib/utils";
import { listInvItemsMaster } from "@/services";
import type { InvItem } from "@/types/inventory";
import ItemMasterModal from "./ItemMasterModal";

/**
 * Angular displayedColumns:
 * id, itemCode, itemName, itemTypeCatdetId, categoryName, subCategoryName, brandName, isActive, actions
 */
const COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<InvItem>,
  itemCode: {
    field: "itemCode",
    headerName: "Item Code",
    minWidth: 110,
    flex: 0.9,
  } as ColDef<InvItem>,
  itemName: {
    field: "itemName",
    headerName: "Item Name",
    minWidth: 160,
    flex: 1.2,
  } as ColDef<InvItem>,
  itemType: {
    field: "itemTypeCatdetDisplayName",
    headerName: "Item Type",
    minWidth: 120,
    flex: 1,
  } as ColDef<InvItem>,
  categoryName: {
    field: "categoryName",
    headerName: "Item Category",
    minWidth: 130,
    flex: 1,
  } as ColDef<InvItem>,
  subCategoryName: {
    headerName: "Item Sub Category",
    minWidth: 140,
    flex: 1,
  } as ColDef<InvItem>,
  brandName: {
    headerName: "Brand",
    minWidth: 110,
    flex: 0.9,
  } as ColDef<InvItem>,
  isActive: {
    field: "isActive",
    headerName: "Status",
    minWidth: 90,
    flex: 0.7,
  } as ColDef<InvItem>,
  actions: {
    headerName: "Actions",
    minWidth: 90,
    width: 90,
    flex: 0,
  } as ColDef<InvItem>,
};

function statusRenderer(p: ICellRendererParams<InvItem>) {
  return <StatusBadge status={p.data?.isActive ?? false} />;
}

/** Angular: show subCategoryName or `--` when itemSubcategoryId is null */
function subCategoryRenderer(p: ICellRendererParams<InvItem>) {
  if (p.data?.itemSubcategoryId == null) return <span>--</span>;
  return <span>{p.data.subCategoryName ?? "--"}</span>;
}

/** Angular: show brandName or `--` when brandmasterId is null */
function brandRenderer(p: ICellRendererParams<InvItem>) {
  if (p.data?.brandmasterId == null) return <span>--</span>;
  return <span>{p.data.brandName ?? "--"}</span>;
}

function makeActionsRenderer(
  setEditing: (row: InvItem | null) => void,
  setModalOpen: (open: boolean) => void,
) {
  return (p: ICellRendererParams<InvItem>) => (
    <Button
      size="sm"
      variant="ghost"
      className="h-8 w-8 p-0"
      title="Edit"
      onClick={() => {
        setEditing(p.data ?? null);
        setModalOpen(true);
      }}
    >
      <PencilIcon className="h-3.5 w-3.5" />
    </Button>
  );
}

export default function ItemMasterPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData] = useState<InvItem | null>(null);

  const { data, isLoading, invalidate } = useCrudList<InvItem>({
    queryKey: QK.invItemsMaster.list(),
    queryFn: listInvItemsMaster,
  });

  const columnDefs = useMemo<ColDef<InvItem>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.itemCode,
      COL_DEFS.itemName,
      COL_DEFS.itemType,
      COL_DEFS.categoryName,
      { ...COL_DEFS.subCategoryName, cellRenderer: subCategoryRenderer },
      { ...COL_DEFS.brandName, cellRenderer: brandRenderer },
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      {
        ...COL_DEFS.actions,
        cellRenderer: makeActionsRenderer(setEditData, setModalOpen),
      },
    ],
    [],
  );

  return (
    <ListPage
      title="Item Master"
      rowData={data}
      columnDefs={columnDefs}
      loading={isLoading}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: "Search",
        pdfDocumentTitle: "Item Master",
      }}
      toolbarTrailing={
        <Button
          size="sm"
          onClick={() => {
            setEditData(null);
            setModalOpen(true);
          }}
        >
          <PlusIcon className="h-4 w-4 mr-1" />
          Add Item
        </Button>
      }
    >
      <ItemMasterModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditData(null);
        }}
        editData={editData}
        onSaved={invalidate}
      />
    </ListPage>
  );
}
