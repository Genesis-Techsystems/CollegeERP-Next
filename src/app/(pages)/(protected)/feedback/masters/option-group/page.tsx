"use client";

import { useMemo, useState } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { PlusIcon } from "lucide-react";
import { ListPage } from "@/components/layout";
import { TableRowActions } from "@/common/components/table";
import { StatusBadge } from "@/common/components/data-display";
import { Button } from "@/components/ui/button";
import { useCrudList } from "@/hooks/useCrudList";
import { QK } from "@/lib/query-keys";
import { rowIndexGetter } from "@/lib/utils";
import { listFbOptionGroups } from "@/services";
import type { FbOptionGroup } from "@/types/feedback-option-group";
import { OptionGroupModal } from "./OptionGroupModal";

const COL_DEFS = {
  siNo: {
    headerName: "Sl No.",
    valueGetter: rowIndexGetter,
    width: 80,
    flex: 0,
    filter: false,
    sortable: false,
  } as ColDef<FbOptionGroup>,
  optiongroupCode: {
    field: "optiongroupCode",
    headerName: "Option Group Code",
    minWidth: 140,
    flex: 1,
  } as ColDef<FbOptionGroup>,
  optiongroupName: {
    field: "optiongroupName",
    headerName: "Option Group Name",
    minWidth: 160,
    flex: 1.2,
  } as ColDef<FbOptionGroup>,
  collegeCode: {
    field: "collegeCode",
    headerName: "College",
    minWidth: 120,
    flex: 0.9,
  } as ColDef<FbOptionGroup>,
  isActive: {
    field: "isActive",
    headerName: "Status",
    minWidth: 110,
    flex: 0.7,
  } as ColDef<FbOptionGroup>,
  actions: {
    headerName: "Actions",
    colId: "actions",
    minWidth: 100,
    width: 100,
    flex: 0,
    filter: false,
    sortable: false,
  } as ColDef<FbOptionGroup>,
};

function statusRenderer(p: ICellRendererParams<FbOptionGroup>) {
  return <StatusBadge status={p.data?.isActive ?? false} />;
}

function makeActionsRenderer(
  setEditing: (row: FbOptionGroup | null) => void,
  setModalOpen: (open: boolean) => void,
) {
  return (p: ICellRendererParams<FbOptionGroup>) => (
    <TableRowActions
      onEdit={() => {
        setEditing(p.data ?? null);
        setModalOpen(true);
      }}
      editLabel="Edit option group"
    />
  );
}

export default function FeedbackOptionGroupPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<FbOptionGroup | null>(null);

  const {
    data: rows = [],
    isLoading,
    invalidate,
  } = useCrudList({
    queryKey: QK.fbOptionGroups.list(),
    queryFn: listFbOptionGroups,
  });

  const columnDefs = useMemo<ColDef<FbOptionGroup>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.optiongroupCode,
      COL_DEFS.optiongroupName,
      COL_DEFS.collegeCode,
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      {
        ...COL_DEFS.actions,
        cellRenderer: makeActionsRenderer(setEditing, setModalOpen),
      },
    ],
    [],
  );

  return (
    <ListPage
      title="Feedback Options Group"
      rowData={rows}
      columnDefs={columnDefs}
      loading={isLoading}
      pagination
      toolbar={{
        searchPlaceholder: "Search",
        pdfDocumentTitle: "Option Group",
      }}
      toolbarTrailing={
        <Button
          size="sm"
          data-table-primary-action
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
        >
          <PlusIcon className="mr-1.5 h-4 w-4" />
          Add Option Group
        </Button>
      }
    >
      <OptionGroupModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        row={editing}
        onSaved={invalidate}
      />
    </ListPage>
  );
}
