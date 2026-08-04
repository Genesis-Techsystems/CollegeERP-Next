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
import { listFbOptionChoices } from "@/services";
import type { FbOptionChoice } from "@/types/feedback-option-choice";
import { OptionChoiceModal } from "./OptionChoiceModal";

const COL_DEFS = {
  siNo: {
    headerName: "No.",
    valueGetter: rowIndexGetter,
    width: 80,
    flex: 0,
    filter: false,
    sortable: false,
  } as ColDef<FbOptionChoice>,
  optionchoice: {
    field: "optionchoice",
    headerName: "Option Choice",
    minWidth: 160,
    flex: 1.2,
  } as ColDef<FbOptionChoice>,
  optionchoiceRating: {
    field: "optionchoiceRating",
    headerName: "Rating",
    minWidth: 100,
    flex: 0.7,
  } as ColDef<FbOptionChoice>,
  optiongroupCode: {
    field: "optiongroupCode",
    headerName: "Option Group",
    minWidth: 130,
    flex: 0.9,
  } as ColDef<FbOptionChoice>,
  sortOrder: {
    field: "sortOrder",
    headerName: "Sort Order",
    minWidth: 110,
    flex: 0.7,
  } as ColDef<FbOptionChoice>,
  collegeCode: {
    field: "collegeCode",
    headerName: "College",
    minWidth: 120,
    flex: 0.9,
  } as ColDef<FbOptionChoice>,
  isActive: {
    field: "isActive",
    headerName: "Status",
    minWidth: 110,
    flex: 0.7,
  } as ColDef<FbOptionChoice>,
  actions: {
    headerName: "Actions",
    colId: "actions",
    minWidth: 100,
    width: 100,
    flex: 0,
    filter: false,
    sortable: false,
  } as ColDef<FbOptionChoice>,
};

function statusRenderer(p: ICellRendererParams<FbOptionChoice>) {
  return <StatusBadge status={p.data?.isActive ?? false} />;
}

function makeActionsRenderer(
  setEditing: (row: FbOptionChoice | null) => void,
  setModalOpen: (open: boolean) => void,
) {
  return (p: ICellRendererParams<FbOptionChoice>) => (
    <TableRowActions
      onEdit={() => {
        setEditing(p.data ?? null);
        setModalOpen(true);
      }}
      editLabel="Edit option choice"
    />
  );
}

export default function FeedbackOptionChoicesPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<FbOptionChoice | null>(null);

  const {
    data: rows = [],
    isLoading,
    invalidate,
  } = useCrudList({
    queryKey: QK.fbOptionChoices.list(),
    queryFn: listFbOptionChoices,
  });

  const columnDefs = useMemo<ColDef<FbOptionChoice>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.optionchoice,
      COL_DEFS.optionchoiceRating,
      COL_DEFS.optiongroupCode,
      COL_DEFS.sortOrder,
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
      title="Option Choice"
      rowData={rows}
      columnDefs={columnDefs}
      loading={isLoading}
      pagination
      toolbar={{
        searchPlaceholder: "Search",
        pdfDocumentTitle: "Option Choice",
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
          Add Option Choice
        </Button>
      }
    >
      <OptionChoiceModal
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
