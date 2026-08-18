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
import {
  listAllGrievanceCommittees,
  type GrievanceCommittee,
} from "@/services";
import { GrievanceCommitteeModal } from "./GrievanceCommitteeModal";

const COLS = {
  siNo: {
    colId: "siNo",
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<GrievanceCommittee>,
  committeeCode: {
    colId: "committeeCode",
    field: "committeeCode",
    headerName: "Committee Code",
    minWidth: 130,
    flex: 1,
  } as ColDef<GrievanceCommittee>,
  committeeName: {
    colId: "committeeName",
    field: "committeeName",
    headerName: "Committe Name",
    minWidth: 160,
    flex: 1.2,
  } as ColDef<GrievanceCommittee>,
  orgCode: {
    colId: "orgCode",
    field: "orgCode",
    headerName: "Organization",
    minWidth: 120,
    flex: 0.9,
  } as ColDef<GrievanceCommittee>,
  escalateInDays: {
    colId: "escalateInDays",
    field: "escalateInDays",
    headerName: "Escalate In Days",
    minWidth: 130,
    flex: 1,
  } as ColDef<GrievanceCommittee>,
  hierarchyLevel: {
    colId: "hierarchyLevel",
    field: "hierarchyLevel",
    headerName: "Hierarchy Level",
    minWidth: 130,
    flex: 1,
  } as ColDef<GrievanceCommittee>,
  isActive: {
    colId: "isActive",
    field: "isActive",
    headerName: "Status",
    minWidth: 110,
    flex: 0.7,
  } as ColDef<GrievanceCommittee>,
  actions: {
    colId: "actions",
    headerName: "Actions",
    minWidth: 90,
    width: 90,
    flex: 0,
  } as ColDef<GrievanceCommittee>,
};

function statusRenderer(p: ICellRendererParams<GrievanceCommittee>) {
  return <StatusBadge status={p.data?.isActive ?? false} />;
}

function makeActionsRenderer(
  setRow: (r: GrievanceCommittee | null) => void,
  setOpen: (b: boolean) => void,
) {
  return (p: ICellRendererParams<GrievanceCommittee>) => (
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

export default function GrievanceCommitteesPage() {
  const [open, setOpen] = useState(false);
  const [row, setRow] = useState<GrievanceCommittee | null>(null);
  const { data, isLoading, invalidate } = useCrudList({
    queryKey: QK.grievanceMasters.committees(),
    queryFn: listAllGrievanceCommittees,
  });

  const columnDefs = useMemo<ColDef<GrievanceCommittee>[]>(
    () =>
      [
        COLS.siNo,
        COLS.committeeCode,
        COLS.committeeName,
        COLS.orgCode,
        COLS.escalateInDays,
        COLS.hierarchyLevel,
        { ...COLS.isActive, cellRenderer: statusRenderer },
        { ...COLS.actions, cellRenderer: makeActionsRenderer(setRow, setOpen) },
      ].map((col) => ({
        ...col,
        suppressMovable: true,
        resizable: false,
      })),
    [],
  );

  return (
    <ListPage
      title="Grievance Committees"
      rowData={data}
      columnDefs={columnDefs}
      loading={isLoading}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: "Search",
        pdfDocumentTitle: "Committees",
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
          Add Committee
        </Button>
      }
    >
      <GrievanceCommitteeModal
        key={getCrudModalKey(row, open, "grvCommitteeId")}
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
