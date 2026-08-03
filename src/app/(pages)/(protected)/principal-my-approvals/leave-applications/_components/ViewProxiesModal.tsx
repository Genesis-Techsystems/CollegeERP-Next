"use client";

import { useMemo } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { FormModal } from "@/common/components/feedback";
import { DataTable } from "@/common/components/table";
import { rowIndexGetter } from "@/lib/utils";
import type { AnyRow } from "@/services";

interface ViewProxiesModalProps {
  open: boolean;
  proxies: AnyRow[];
  onClose: () => void;
}

const COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<AnyRow>,
  academicDetails: {
    field: "AcademicDetails",
    headerName: "Academic Details",
    minWidth: 160,
  } as ColDef<AnyRow>,
  assignedBy: {
    field: "AssignedBy",
    headerName: "Assigned Employee",
    minWidth: 140,
  } as ColDef<AnyRow>,
  subjectCode: {
    field: "subject_code",
    headerName: "Subject Code",
    minWidth: 110,
  } as ColDef<AnyRow>,
  subjectName: {
    field: "subject_name",
    headerName: "Subject",
    minWidth: 160,
  } as ColDef<AnyRow>,
  proxyEmployee: {
    field: "ProxyEmployee",
    headerName: "Proxy Employee",
    minWidth: 140,
  } as ColDef<AnyRow>,
  proxyDate: {
    field: "proxy_date",
    headerName: "Proxy Date",
    minWidth: 120,
  } as ColDef<AnyRow>,
  time: {
    headerName: "Timing",
    minWidth: 140,
  } as ColDef<AnyRow>,
  status: {
    field: "Process_Status",
    headerName: "Status",
    minWidth: 110,
  } as ColDef<AnyRow>,
};

function formatMdY(value: unknown): string {
  if (value == null || value === "") return "--";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return "--";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function StatusCell({ row }: { row: AnyRow }) {
  const status = String(row.Process_Status ?? "").trim();
  let className = "font-medium";
  if (status === "Accepted") className = "text-emerald-600 font-medium";
  else if (status === "Rejected") className = "text-destructive font-medium";
  else if (status.startsWith("Initiated"))
    className = "text-amber-600 font-medium";
  return <span className={className}>{status || "--"}</span>;
}

export function ViewProxiesModal({
  open,
  proxies,
  onClose,
}: ViewProxiesModalProps) {
  const columnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.academicDetails,
      COL_DEFS.assignedBy,
      COL_DEFS.subjectCode,
      {
        ...COL_DEFS.subjectName,
        cellRenderer: (p: ICellRendererParams<AnyRow>) => {
          const row = p.data;
          if (!row) return null;
          return (
            <span>
              {String(row.subject_name ?? "")}
              {row.SubjectType ? (
                <>
                  {" "}
                  (
                  <span className="text-blue-600 font-medium">
                    {String(row.SubjectType)}
                  </span>
                  )
                </>
              ) : null}
            </span>
          );
        },
      },
      COL_DEFS.proxyEmployee,
      {
        ...COL_DEFS.proxyDate,
        valueFormatter: (p) => formatMdY(p.value),
      },
      {
        ...COL_DEFS.time,
        valueGetter: (p) => {
          const row = p.data;
          if (!row) return "--";
          return `${String(row.StartTime ?? "")} - ${String(row.EndTime ?? "")}`;
        },
      },
      {
        ...COL_DEFS.status,
        cellRenderer: (p: ICellRendererParams<AnyRow>) =>
          p.data ? <StatusCell row={p.data} /> : null,
      },
    ],
    [],
  );

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title="Workload Adjustments"
      onSubmit={(e) => {
        e.preventDefault();
      }}
      cancelLabel="Close"
      showSubmitButton={false}
      size="xl"
    >
      <DataTable
        rowData={proxies}
        columnDefs={columnDefs}
        pagination
        toolbar={{ search: true, searchPlaceholder: "Search" }}
      />
    </FormModal>
  );
}
