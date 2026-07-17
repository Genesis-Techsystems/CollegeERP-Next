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
import { listFeeParticulars } from "@/services";
import type { FeeParticular } from "@/types/fee-particular";
import { FeeParticularModal } from "./FeeParticularModal";

const COLS = {
  siNo: {
    colId: "siNo",
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<FeeParticular>,
  particularsCode: {
    colId: "particularsCode",
    field: "particularsCode",
    headerName: "Particular Code",
    minWidth: 140,
    flex: 1,
  } as ColDef<FeeParticular>,
  particularsName: {
    colId: "particularsName",
    field: "particularsName",
    headerName: "Particular Name",
    minWidth: 180,
    flex: 1.2,
  } as ColDef<FeeParticular>,
  collegeCode: {
    colId: "collegeCode",
    headerName: "College",
    minWidth: 120,
    flex: 0.8,
  } as ColDef<FeeParticular>,
  isActive: {
    colId: "isActive",
    field: "isActive",
    headerName: "Status",
    minWidth: 90,
    flex: 0.7,
  } as ColDef<FeeParticular>,
  actions: {
    colId: "actions",
    headerName: "Actions",
    minWidth: 86,
    width: 86,
    flex: 0,
  } as ColDef<FeeParticular>,
};

function statusRenderer(p: ICellRendererParams<FeeParticular>) {
  return <StatusBadge status={p.data?.isActive ?? false} />;
}

function actionRenderer(
  setRow: (row: FeeParticular | null) => void,
  setOpen: (open: boolean) => void,
) {
  return (p: ICellRendererParams<FeeParticular>) => (
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

/** Angular `fee-masters/fee-particular` → `FeeParticularComponent`. */
export default function FeeParticularsPage() {
  const [open, setOpen] = useState(false);
  const [row, setRow] = useState<FeeParticular | null>(null);
  const { data, isLoading, invalidate } = useCrudList({
    queryKey: QK.feeMasters.feeParticulars.list(),
    queryFn: listFeeParticulars,
  });

  const columnDefs = useMemo<ColDef<FeeParticular>[]>(
    () => [
      COLS.siNo,
      COLS.particularsCode,
      COLS.particularsName,
      {
        ...COLS.collegeCode,
        valueGetter: (p) => p.data?.collegeCode ?? p.data?.collegeName ?? "—",
      },
      { ...COLS.isActive, cellRenderer: statusRenderer },
      { ...COLS.actions, cellRenderer: actionRenderer(setRow, setOpen) },
    ],
    [],
  );

  return (
    <ListPage
      title="Fee Particulars"
      rowData={data}
      columnDefs={columnDefs}
      loading={isLoading}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: "Search fee particulars…",
        pdfDocumentTitle: "Fee Particulars",
      }}
      toolbarTrailing={
        <Button
          size="sm"
          onClick={() => {
            setRow(null);
            setOpen(true);
          }}
        >
          <PlusIcon className="mr-1 h-4 w-4" />
          Add Fee Particular
        </Button>
      }
    >
      <FeeParticularModal
        key={getCrudModalKey(row, open, "feeParticularsId")}
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
