"use client";

import { useMemo, useState } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { PencilIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { ListPage } from "@/components/layout";
import { StatusBadge } from "@/common/components/data-display";
import { Button } from "@/components/ui/button";
import { GM_CODES, SUBJECT_REGISTRATION_API } from "@/config/constants";
import { useSession } from "@/hooks/useSession";
import { useStaffLoginContext } from "@/hooks/useStaffLoginContext";
import { QK } from "@/lib/query-keys";
import { toastSuccess } from "@/lib/toast";
import { rowIndexGetter } from "@/lib/utils";
import { fetchDetailsEnvelope, listGeneralDetailsByCode } from "@/services";
import {
  CourseRegistrationModal,
  type StdSubRegistrationRow,
} from "./CourseRegistrationModal";

type AnyRow = Record<string, unknown>;

function pickId(row: AnyRow): number {
  const n = Number(row.generalDetailId ?? row.generalDetailid ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function pickCode(row: AnyRow): string {
  return String(row.generalDetailCode ?? row.generalDetailcode ?? "").trim();
}

function statusVariant(
  code: string | undefined,
): "draft" | "inactive" | "pending" | "active" {
  switch (code) {
    case "DRAFT":
      return "draft";
    case "REJECT":
      return "inactive";
    case "APPROVED":
      return "active";
    default:
      return "pending";
  }
}

function currentSemSubjectsRenderer(
  p: ICellRendererParams<StdSubRegistrationRow>,
) {
  const details = p.data?.stdSubRegDetailDTOs ?? [];
  const items = details.filter((d) => !d.isPrerequisite);
  if (items.length === 0)
    return <span className="text-muted-foreground">—</span>;
  return (
    <ul className="list-none space-y-0.5 py-1 text-xs leading-snug">
      {items.map((item, idx) => (
        <li key={`${item.subjectCode ?? idx}`}>
          <span>{item.subjectCode}</span>
          {item.shortName ? (
            <span className="text-muted-foreground"> - {item.shortName}</span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function cbcsSubjectsRenderer(p: ICellRendererParams<StdSubRegistrationRow>) {
  const details = p.data?.stdSubRegDetailDTOs ?? [];
  const items = details.filter((d) => d.isPrerequisite);
  if (items.length === 0)
    return <span className="text-muted-foreground">—</span>;
  return (
    <div className="space-y-0.5 py-1 text-xs leading-snug">
      {items.map((item, idx) => (
        <div key={`${item.subjectCode ?? idx}`}>
          <span>{item.subjectCode}</span>
          {item.shortName ? (
            <span className="text-muted-foreground"> ({item.shortName})</span>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function statusRenderer(p: ICellRendererParams<StdSubRegistrationRow>) {
  const code = p.data?.subregStatusCatCode;
  if (!code) return <span className="text-muted-foreground">—</span>;
  return (
    <StatusBadge status={statusVariant(String(code))} label={String(code)} />
  );
}

async function loadProgramRegistrationRows(
  employeeId: number,
): Promise<StdSubRegistrationRow[]> {
  const statuses = await listGeneralDetailsByCode(
    GM_CODES.SUBJECT_REGISTRATION_STATUS,
  );
  const mentorApproved = statuses.find(
    (r) => pickCode(r) === "APPROVED BY MENTOR",
  );
  const subRegStatusId = pickId(mentorApproved ?? {});
  if (subRegStatusId <= 0) return [];

  const envelope = await fetchDetailsEnvelope<
    StdSubRegistrationRow[] | StdSubRegistrationRow
  >(SUBJECT_REGISTRATION_API.STDSUBREG, {
    empId: employeeId,
    notSubregStatusId: subRegStatusId,
  });

  if (!envelope.success || envelope.data == null) {
    return [];
  }

  const data: unknown = envelope.data;
  if (typeof data === "string") {
    return [];
  }

  const list = Array.isArray(data)
    ? (data as StdSubRegistrationRow[])
    : [data as StdSubRegistrationRow];
  return list.filter((row) => row.subregStatusCatCode !== "APPROVED");
}

export default function ProgramRegistrationApprovalPage() {
  const { user, isLoading: sessionLoading } = useSession();
  const { employeeId, isHod, isResolving } = useStaffLoginContext(
    user,
    sessionLoading,
  );
  const ready = employeeId > 0 && !isResolving;

  const [editing, setEditing] = useState<StdSubRegistrationRow | null>(null);

  const {
    data: rows = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: QK.programRegistrationApproval.byEmployee(employeeId),
    queryFn: () => loadProgramRegistrationRows(employeeId),
    enabled: ready,
  });

  const columnDefs = useMemo<ColDef<StdSubRegistrationRow>[]>(
    () => [
      {
        headerName: "No.",
        valueGetter: rowIndexGetter,
        width: 70,
        flex: 0,
        sortable: false,
        filter: false,
      },
      {
        headerName: "Student",
        minWidth: 180,
        flex: 1.2,
        valueGetter: (p) => {
          const row = p.data;
          if (!row) return "";
          return `${row.stdName ?? ""} (${row.rollNumber ?? ""})`;
        },
      },
      {
        headerName: "Course Details",
        minWidth: 220,
        flex: 1.5,
        valueGetter: (p) => {
          const row = p.data;
          if (!row) return "";
          return `${row.collegeCode ?? ""} / ${row.academicYear ?? ""} / ${row.groupCode ?? ""} / ${row.courseYearName ?? ""}`;
        },
      },
      {
        field: "regulationCode",
        headerName: "Regulation",
        minWidth: 110,
        flex: 0.8,
      },
      {
        headerName: "Current Sem Subjects",
        minWidth: 200,
        flex: 1.4,
        cellRenderer: currentSemSubjectsRenderer,
        autoHeight: true,
        sortable: false,
        filter: false,
      },
      {
        headerName: "CBCS Subjects",
        minWidth: 160,
        flex: 1.1,
        cellRenderer: cbcsSubjectsRenderer,
        autoHeight: true,
        sortable: false,
        filter: false,
      },
      {
        headerName: "Status",
        minWidth: 150,
        flex: 1,
        cellRenderer: statusRenderer,
      },
      {
        headerName: "Actions",
        width: 100,
        flex: 0,
        sortable: false,
        filter: false,
        cellRenderer: (p: ICellRendererParams<StdSubRegistrationRow>) => {
          const row = p.data;
          if (!row) return null;
          if (row.subregStatusCatCode !== "DRAFT") {
            return <span className="text-muted-foreground text-xs">—</span>;
          }
          return (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2"
              onClick={() => setEditing(row)}
            >
              <PencilIcon className="h-3.5 w-3.5" />
            </Button>
          );
        },
      },
    ],
    [],
  );

  function handleSaved() {
    toastSuccess("Registration updated successfully.");
    void refetch();
  }

  return (
    <ListPage<StdSubRegistrationRow>
      loading={!ready || isLoading}
      rowData={rows}
      columnDefs={columnDefs}
      getRowId={(p) =>
        String(
          p.data?.stdSubregId ??
            p.data?.stdSubRegId ??
            p.data?.rollNumber ??
            "",
        )
      }
      height="auto"
      pagination
      paginationPageSize={10}
      toolbar={{ search: true, searchPlaceholder: "Search" }}
    >
      <CourseRegistrationModal
        row={editing}
        employeeId={employeeId}
        isHod={isHod}
        onClose={() => setEditing(null)}
        onSaved={handleSaved}
      />
    </ListPage>
  );
}
