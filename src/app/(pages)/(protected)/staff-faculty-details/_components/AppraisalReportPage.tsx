"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { PencilIcon, PlusIcon } from "lucide-react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { useQuery } from "@tanstack/react-query";
import { StatusBadge } from "@/common/components/data-display";
import { ListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { useSessionContext } from "@/context/SessionContext";
import { useLoginEmployeeId } from "@/hooks/useLoginEmployeeId";
import { QK } from "@/lib/query-keys";
import { getErrorMessage } from "@/lib/errors";
import { rowIndexGetter } from "@/lib/utils";
import { listStaffSelfAppraisals } from "@/services";

type AppraisalRow = Record<string, unknown>;

function readStorage(key: string): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(key) ?? "";
}

function formatDate(value: unknown): string {
  if (!value) return "";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime())
    ? String(value)
    : format(date, "dd MMM, yyyy");
}

const COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<AppraisalRow>,
  employee: {
    headerName: "Employee",
    minWidth: 190,
    valueGetter: (p) => {
      const name = String(p.data?.employeeName ?? "").trim();
      const number = String(p.data?.empNumber ?? "").trim();
      return number ? `${name} (${number})` : name;
    },
  } as ColDef<AppraisalRow>,
  startDate: {
    field: "startDate",
    headerName: "Start Date",
    minWidth: 120,
    valueFormatter: (p) => formatDate(p.value),
  } as ColDef<AppraisalRow>,
  endDate: {
    field: "endDate",
    headerName: "End Date",
    minWidth: 120,
    valueFormatter: (p) => formatDate(p.value),
  } as ColDef<AppraisalRow>,
  college: {
    field: "collegeCode",
    headerName: "College",
    minWidth: 110,
  } as ColDef<AppraisalRow>,
  status: {
    field: "isActive",
    headerName: "Status",
    minWidth: 100,
    flex: 0,
  } as ColDef<AppraisalRow>,
  actions: {
    headerName: "Actions",
    width: 100,
    minWidth: 100,
    flex: 0,
    sortable: false,
    filter: false,
  } as ColDef<AppraisalRow>,
};

function statusRenderer(p: ICellRendererParams<AppraisalRow>) {
  return <StatusBadge status={p.data?.isActive !== false} />;
}

function makeActionsRenderer(onEdit: (row: AppraisalRow) => void) {
  return (p: ICellRendererParams<AppraisalRow>) =>
    p.data ? (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        aria-label="Review appraisal"
        onClick={() => onEdit(p.data!)}
      >
        <PencilIcon className="h-3.5 w-3.5" />
      </Button>
    ) : null;
}

export function AppraisalReportPage() {
  const router = useRouter();
  const { user, isLoading: sessionLoading } = useSessionContext();
  const { employeeId: sessionEmployeeId, isResolving } = useLoginEmployeeId(
    user,
    sessionLoading,
  );
  const employeeId =
    sessionEmployeeId > 0
      ? sessionEmployeeId
      : Number(readStorage("employeeId") || user?.employeeId || 0);
  const collegeId = user?.collegeId ?? Number(readStorage("collegeId") || 0);
  const isPrincipal =
    Boolean(user?.isPrincipal) || readStorage("isPRINCIPAL") === "true";

  const query = useQuery({
    queryKey: QK.hrPayroll.staffSelfAppraisals(
      isPrincipal,
      collegeId,
      employeeId,
    ),
    queryFn: () =>
      listStaffSelfAppraisals({ isPrincipal, collegeId, employeeId }),
    enabled:
      !sessionLoading &&
      !isResolving &&
      (isPrincipal ? collegeId > 0 : employeeId > 0),
  });

  const openReview = (row?: AppraisalRow) => {
    const params = new URLSearchParams({
      employeeId: String(row?.employeeId ?? employeeId),
      collegeId: String(row?.collegeId ?? collegeId),
    });
    const appraisalId = Number(row?.empSelfappraisalId ?? 0);
    if (appraisalId) params.set("empSelfappraisalId", String(appraisalId));
    router.push(
      `/staff-faculty-details/appraisal-report/review-appraisal?${params}`,
    );
  };

  const columnDefs = useMemo<ColDef<AppraisalRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.employee,
      COL_DEFS.startDate,
      COL_DEFS.endDate,
      COL_DEFS.college,
      { ...COL_DEFS.status, cellRenderer: statusRenderer },
      {
        ...COL_DEFS.actions,
        cellRenderer: makeActionsRenderer(openReview),
      },
    ],
    [employeeId, collegeId],
  );

  return (
    <ListPage
      title="Staff Self Appraisal Forms"
      notice={
        query.error ? (
          <p className="px-1 text-sm text-destructive">
            {getErrorMessage(query.error)}
          </p>
        ) : null
      }
      rowData={query.data ?? []}
      columnDefs={columnDefs}
      loading={sessionLoading || isResolving || query.isFetching}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: "Search",
        exportExcel: false,
        exportPdf: false,
      }}
      toolbarTrailing={
        !isPrincipal ? (
          <Button
            type="button"
            size="sm"
            className="h-[30px] px-3 text-[12px]"
            onClick={() => openReview()}
          >
            <PlusIcon className="mr-1.5 h-3.5 w-3.5" />
            Add Form
          </Button>
        ) : undefined
      }
    />
  );
}
