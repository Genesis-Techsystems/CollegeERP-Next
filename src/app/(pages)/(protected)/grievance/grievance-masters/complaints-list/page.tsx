"use client";

import { useMemo, useState } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { PencilIcon, PlusIcon } from "lucide-react";
import { StatusBadge } from "@/common/components/data-display";
import { ListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { useCrudList } from "@/hooks/useCrudList";
import { QK } from "@/lib/query-keys";
import { getCrudModalKey, rowIndexGetter } from "@/lib/utils";
import { listAllGrievantTypes, type GrievantType } from "@/services";
import { GrievantTypeModal } from "./GrievantTypeModal";

const COLS = {
  siNo: {
    colId: "siNo",
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<GrievantType>,
  complaintShortDesc: {
    colId: "complaintShortDesc",
    field: "complaintShortDesc",
    headerName: "Complaint Short Desc",
    minWidth: 160,
  } as ColDef<GrievantType>,
  complaintDesc: {
    colId: "complaintDesc",
    field: "complaintDesc",
    headerName: "Complaint Desc",
    minWidth: 180,
  } as ColDef<GrievantType>,
  instructionsNotes: {
    colId: "instructionsNotes",
    field: "instructionsNotes",
    headerName: "Instruction Notes",
    minWidth: 160,
  } as ColDef<GrievantType>,
  grvCategoryCode: {
    colId: "grvCategoryCode",
    field: "grvCategoryCode",
    headerName: "Grievance Category",
    minWidth: 140,
  } as ColDef<GrievantType>,
  isActive: {
    colId: "isActive",
    field: "isActive",
    headerName: "Status",
    minWidth: 110,
  } as ColDef<GrievantType>,
  actions: {
    colId: "actions",
    headerName: "Actions",
    minWidth: 90,
    width: 90,
    flex: 0,
  } as ColDef<GrievantType>,
};

function statusRenderer(p: ICellRendererParams<GrievantType>) {
  return <StatusBadge status={p.data?.isActive ?? false} />;
}

function makeActionsRenderer(
  setRow: (r: GrievantType | null) => void,
  setOpen: (b: boolean) => void,
) {
  return (p: ICellRendererParams<GrievantType>) => (
    <Button
      size="sm"
      variant="ghost"
      className="h-8 w-8 p-0"
      onClick={() => {
        setRow(p.data ?? null);
        setOpen(true);
      }}
    >
      <PencilIcon className="h-3.5 w-3.5" />
    </Button>
  );
}

export default function GrievantTypesPage() {
  const [open, setOpen] = useState(false);
  const [row, setRow] = useState<GrievantType | null>(null);
  const { data, isLoading, invalidate } = useCrudList({
    queryKey: QK.grievanceMasters.grievantTypes(),
    queryFn: listAllGrievantTypes,
  });

  const columnDefs = useMemo<ColDef<GrievantType>[]>(
    () => [
      COLS.siNo,
      COLS.complaintShortDesc,
      COLS.complaintDesc,
      COLS.instructionsNotes,
      COLS.grvCategoryCode,
      { ...COLS.isActive, cellRenderer: statusRenderer },
      { ...COLS.actions, cellRenderer: makeActionsRenderer(setRow, setOpen) },
    ],
    [],
  );

  return (
    <ListPage
      title="Grievant Types"
      rowData={data}
      columnDefs={columnDefs}
      loading={isLoading}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: "Search",
        pdfDocumentTitle: "Grievant Types",
        exportExcel: false,
        exportPdf: false,
      }}
      toolbarTrailing={
        <Button
          size="sm"
          onClick={() => {
            setRow(null);
            setOpen(true);
          }}
        >
          <PlusIcon className="h-4 w-4 mr-1" />
          Add Grievant Type
        </Button>
      }
    >
      <GrievantTypeModal
        key={getCrudModalKey(row, open, "complaintListId")}
        open={open}
        onClose={() => {
          setOpen(false);
          setRow(null);
        }}
        row={row}
        onSaved={invalidate}
      />
    </ListPage>
  );
}
