"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { format } from "date-fns";
import { ArrowLeftIcon, PencilIcon } from "lucide-react";
import { StatusBadge } from "@/common/components/data-display";
import { ListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { useCrudList } from "@/hooks/useCrudList";
import { QK } from "@/lib/query-keys";
import { getCrudModalKey, rowIndexGetter } from "@/lib/utils";
import {
  listGrievanceCommitteeMembers,
  type GrievanceCommitteeMember,
} from "@/services";
import { GrievanceCommitteeMemberModal } from "../GrievanceCommitteeMemberModal";

function formatMemberDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return format(d, "MMMM d, yyyy");
}

const COLS = {
  siNo: {
    colId: "siNo",
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<GrievanceCommitteeMember>,
  committeeFrom: {
    colId: "committeeFrom",
    headerName: "Committee From",
    minWidth: 180,
  } as ColDef<GrievanceCommitteeMember>,
  empName: {
    colId: "empName",
    field: "empName",
    headerName: "Employee",
    minWidth: 160,
  } as ColDef<GrievanceCommitteeMember>,
  dateRange: {
    colId: "dateRange",
    headerName: "Date",
    minWidth: 200,
  } as ColDef<GrievanceCommitteeMember>,
  collegeCode: {
    colId: "collegeCode",
    headerName: "College",
    minWidth: 110,
  } as ColDef<GrievanceCommitteeMember>,
  orgCode: {
    colId: "orgCode",
    field: "orgCode",
    headerName: "Organization",
    minWidth: 120,
  } as ColDef<GrievanceCommitteeMember>,
  isActive: {
    colId: "isActive",
    field: "isActive",
    headerName: "Status",
    minWidth: 110,
  } as ColDef<GrievanceCommitteeMember>,
  actions: {
    colId: "actions",
    headerName: "Actions",
    minWidth: 90,
    width: 90,
    flex: 0,
  } as ColDef<GrievanceCommitteeMember>,
};

function statusRenderer(p: ICellRendererParams<GrievanceCommitteeMember>) {
  return <StatusBadge status={p.data?.isActive ?? false} />;
}

function committeeFromGetter(p: { data?: GrievanceCommitteeMember }) {
  const row = p.data;
  if (!row) return "";
  const parts = [row.orgCode].filter(Boolean);
  if (row.collegeCode) parts.push(row.collegeCode);
  if (row.deptCode) parts.push(row.deptCode);
  return parts.join(" / ");
}

function makeActionsRenderer(
  setRow: (r: GrievanceCommitteeMember | null) => void,
  setOpen: (b: boolean) => void,
) {
  return (p: ICellRendererParams<GrievanceCommitteeMember>) => (
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

export default function CommitteeMembersListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const grvCommitteeId = Number(searchParams.get("grvCommitteeId") ?? 0);
  const hierarchyLevel = Number(searchParams.get("hierarchyLevel") ?? 0);

  const [open, setOpen] = useState(false);
  const [row, setRow] = useState<GrievanceCommitteeMember | null>(null);

  const { data, isLoading, invalidate } = useCrudList({
    queryKey: QK.grievanceMasters.members(grvCommitteeId),
    queryFn: () => listGrievanceCommitteeMembers(grvCommitteeId),
    enabled: grvCommitteeId > 0,
  });

  const committeeTitle = data[0]?.grvCommitteeName
    ? `Committee Members List (${data[0].grvCommitteeName})`
    : "Committee Members List";

  const columnDefs = useMemo<ColDef<GrievanceCommitteeMember>[]>(
    () => [
      COLS.siNo,
      { ...COLS.committeeFrom, valueGetter: committeeFromGetter },
      COLS.empName,
      {
        ...COLS.dateRange,
        valueGetter: (p) =>
          `${formatMemberDate(p.data?.fromDate)} – ${formatMemberDate(p.data?.toDate)}`,
      },
      {
        ...COLS.collegeCode,
        valueGetter: (p) =>
          p.data?.collegeId == null ? "--" : (p.data.collegeCode ?? "--"),
      },
      COLS.orgCode,
      { ...COLS.isActive, cellRenderer: statusRenderer },
      { ...COLS.actions, cellRenderer: makeActionsRenderer(setRow, setOpen) },
    ],
    [],
  );

  return (
    <ListPage
      title={committeeTitle}
      rowData={data}
      columnDefs={columnDefs}
      loading={isLoading}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: "Search",
        pdfDocumentTitle: "Committee Members List",
      }}
      toolbarTrailing={
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            router.push("/grievance/grievance-masters/committee-members")
          }
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Back
        </Button>
      }
    >
      <GrievanceCommitteeMemberModal
        key={getCrudModalKey(row, open, "committeeMemberId")}
        open={open}
        onClose={() => {
          setOpen(false);
          setRow(null);
        }}
        member={row}
        hierarchyLevel={hierarchyLevel}
        onSaved={invalidate}
      />
    </ListPage>
  );
}
