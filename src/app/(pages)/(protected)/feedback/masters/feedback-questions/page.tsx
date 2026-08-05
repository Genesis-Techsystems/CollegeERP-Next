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
import { listFbQuestions } from "@/services";
import type { FbQuestion } from "@/types/feedback-question";
import { FeedbackQuestionModal } from "./feedback-question-modal";

const COL_DEFS = {
  siNo: {
    headerName: "SI No.",
    valueGetter: rowIndexGetter,
    width: 80,
    flex: 0,
    filter: false,
    sortable: false,
  } as ColDef<FbQuestion>,
  fbQuestion: {
    field: "fbQuestion",
    headerName: "Question",
    minWidth: 220,
    flex: 1.6,
  } as ColDef<FbQuestion>,
  optiongroupCode: {
    field: "optiongroupCode",
    headerName: "Option Group",
    minWidth: 130,
    flex: 0.9,
  } as ColDef<FbQuestion>,
  generalDetailDisplayName: {
    field: "generalDetailDisplayName",
    headerName: "Input Type",
    minWidth: 130,
    flex: 0.9,
  } as ColDef<FbQuestion>,
  collegeCode: {
    field: "collegeCode",
    headerName: "College",
    minWidth: 120,
    flex: 0.8,
  } as ColDef<FbQuestion>,
  isActive: {
    field: "isActive",
    headerName: "Status",
    minWidth: 110,
    flex: 0.7,
  } as ColDef<FbQuestion>,
  actions: {
    headerName: "Actions",
    colId: "actions",
    minWidth: 100,
    width: 100,
    flex: 0,
    filter: false,
    sortable: false,
  } as ColDef<FbQuestion>,
};

function statusRenderer(p: ICellRendererParams<FbQuestion>) {
  return <StatusBadge status={p.data?.isActive ?? false} />;
}

function makeActionsRenderer(
  setEditing: (row: FbQuestion | null) => void,
  setModalOpen: (open: boolean) => void,
) {
  return (p: ICellRendererParams<FbQuestion>) => (
    <TableRowActions
      onEdit={() => {
        setEditing(p.data ?? null);
        setModalOpen(true);
      }}
      editLabel="Edit feedback question"
    />
  );
}

export default function FeedbackQuestionsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<FbQuestion | null>(null);

  const {
    data: rows = [],
    isLoading,
    invalidate,
  } = useCrudList({
    queryKey: QK.fbQuestions.list(),
    queryFn: listFbQuestions,
  });

  const columnDefs = useMemo<ColDef<FbQuestion>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.fbQuestion,
      COL_DEFS.optiongroupCode,
      COL_DEFS.generalDetailDisplayName,
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
      title="Feedback Question"
      rowData={rows}
      columnDefs={columnDefs}
      loading={isLoading}
      pagination
      toolbar={{
        searchPlaceholder: "Search",
        pdfDocumentTitle: "Feedback Question",
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
          Add Feedback Question
        </Button>
      }
    >
      <FeedbackQuestionModal
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
