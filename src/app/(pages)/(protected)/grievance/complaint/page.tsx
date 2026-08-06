"use client";

import { useMemo, useState } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { format } from "date-fns";
import { ListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { useCrudList } from "@/hooks/useCrudList";
import { QK } from "@/lib/query-keys";
import { getCrudModalKey, rowIndexGetter } from "@/lib/utils";
import {
  listAdminGrievances,
  listAcknowledgedAdminGrievances,
  type AdminGrievanceRow,
} from "@/services";
import { GrievanceTransferModal } from "./GrievanceTransferModal";

function formatGrievanceDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return format(d, "MMM d, yyyy");
}

const COLS = {
  siNo: {
    colId: "siNo",
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<AdminGrievanceRow>,
  complaintId: {
    colId: "complaintId",
    field: "complaintId",
    headerName: "Grievance No",
    minWidth: 110,
  } as ColDef<AdminGrievanceRow>,
  committeeName: {
    colId: "committeeName",
    headerName: "Committee",
    minWidth: 160,
  } as ColDef<AdminGrievanceRow>,
  stdName: {
    colId: "stdName",
    field: "stdName",
    headerName: "Student",
    minWidth: 140,
  } as ColDef<AdminGrievanceRow>,
  complaintDesc: {
    colId: "complaintDesc",
    field: "complaintDesc",
    headerName: "Grievance Type",
    minWidth: 150,
  } as ColDef<AdminGrievanceRow>,
  incident: {
    colId: "incident",
    field: "incident",
    headerName: "Incident",
    minWidth: 160,
  } as ColDef<AdminGrievanceRow>,
  complainDate: {
    colId: "complainDate",
    headerName: "Grievance Date",
    minWidth: 130,
  } as ColDef<AdminGrievanceRow>,
  ackEmpName: {
    colId: "ackEmpName",
    headerName: "Acknowledged By",
    minWidth: 140,
  } as ColDef<AdminGrievanceRow>,
  wfCode: {
    colId: "wfCode",
    field: "wfCode",
    headerName: "Status",
    minWidth: 100,
  } as ColDef<AdminGrievanceRow>,
  file: {
    colId: "file",
    headerName: "Document",
    minWidth: 140,
  } as ColDef<AdminGrievanceRow>,
  actions: {
    colId: "actions",
    headerName: "Actions",
    minWidth: 110,
    width: 110,
    flex: 0,
  } as ColDef<AdminGrievanceRow>,
};

function makeDocumentRenderer() {
  return (p: ICellRendererParams<AdminGrievanceRow>) => {
    const path = p.data?.complaintDocPath;
    if (!path) {
      return (
        <span className="text-muted-foreground text-xs">No Docs Uploaded</span>
      );
    }
    return (
      <a
        href={String(path)}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-700 text-xs font-medium hover:underline"
      >
        Document
      </a>
    );
  };
}

function makeActionsRenderer(onTransfer: (row: AdminGrievanceRow) => void) {
  return (p: ICellRendererParams<AdminGrievanceRow>) => {
    const row = p.data;
    if (!row) return null;
    if (row.isAcknowledged) {
      return <span className="text-muted-foreground">--</span>;
    }
    return (
      <Button
        size="sm"
        variant="ghost"
        className="h-8 px-2 text-blue-700"
        onClick={() => onTransfer(row)}
      >
        Transfer
      </Button>
    );
  };
}

export default function AdminGrievanceListPage() {
  const [open, setOpen] = useState(false);
  const [row, setRow] = useState<AdminGrievanceRow | null>(null);
  // Angular ngOnInit: getGrievanceList() + getGrievancedList() in parallel
  const { data, isLoading, invalidate } = useCrudList({
    queryKey: QK.grievanceMasters.adminList(),
    queryFn: listAdminGrievances,
  });
  useCrudList({
    queryKey: QK.grievanceMasters.adminAcknowledged(),
    queryFn: listAcknowledgedAdminGrievances,
  });

  const columnDefs = useMemo<ColDef<AdminGrievanceRow>[]>(
    () => [
      COLS.siNo,
      COLS.complaintId,
      {
        ...COLS.committeeName,
        valueGetter: (p) => {
          const r = p.data;
          if (!r?.committeeName) return "";
          return r.committeeCode
            ? `${r.committeeName} (${r.committeeCode})`
            : r.committeeName;
        },
      },
      COLS.stdName,
      COLS.complaintDesc,
      COLS.incident,
      {
        ...COLS.complainDate,
        valueGetter: (p) => formatGrievanceDate(p.data?.complainDate),
      },
      {
        ...COLS.ackEmpName,
        valueGetter: (p) => p.data?.ackEmpName ?? "--",
      },
      COLS.wfCode,
      { ...COLS.file, cellRenderer: makeDocumentRenderer() },
      {
        ...COLS.actions,
        cellRenderer: makeActionsRenderer((r) => {
          setRow(r);
          setOpen(true);
        }),
      },
    ],
    [],
  );

  return (
    <ListPage
      title="Grievances List"
      rowData={data}
      columnDefs={columnDefs}
      loading={isLoading}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: "Search",
        pdfDocumentTitle: "Grievances List",
      }}
    >
      <GrievanceTransferModal
        key={getCrudModalKey(row, open, "complaintId")}
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
