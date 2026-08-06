"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { StatusBadge } from "@/common/components/data-display";
import { ListPage } from "@/components/layout";
import { useCrudList } from "@/hooks/useCrudList";
import { QK } from "@/lib/query-keys";
import { rowIndexGetter } from "@/lib/utils";
import {
  listAllGrievanceCommittees,
  type GrievanceCommittee,
} from "@/services";
import { GrievanceCommitteeMemberModal } from "./GrievanceCommitteeMemberModal";

const COLS = {
  siNo: {
    colId: "siNo",
    headerName: "Sl.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<GrievanceCommittee>,
  committeeCode: {
    colId: "committeeCode",
    field: "committeeCode",
    headerName: "Committee Code",
    minWidth: 130,
  } as ColDef<GrievanceCommittee>,
  committeeName: {
    colId: "committeeName",
    field: "committeeName",
    headerName: "Committe Name",
    minWidth: 160,
  } as ColDef<GrievanceCommittee>,
  hierarchyLevel: {
    colId: "hierarchyLevel",
    field: "hierarchyLevel",
    headerName: "Hierarchy Level",
    minWidth: 130,
  } as ColDef<GrievanceCommittee>,
  isActive: {
    colId: "isActive",
    field: "isActive",
    headerName: "Status",
    minWidth: 110,
  } as ColDef<GrievanceCommittee>,
  actions: {
    colId: "actions",
    headerName: "Actions",
    minWidth: 200,
    flex: 0,
    width: 200,
  } as ColDef<GrievanceCommittee>,
};

function statusRenderer(p: ICellRendererParams<GrievanceCommittee>) {
  return <StatusBadge status={p.data?.isActive ?? false} />;
}

function makeActionsRenderer(
  onAddMember: (row: GrievanceCommittee) => void,
  onMemberList: (row: GrievanceCommittee) => void,
) {
  return (p: ICellRendererParams<GrievanceCommittee>) => {
    const row = p.data;
    if (!row) return null;
    return (
      <div className="flex items-center gap-2 h-full text-xs">
        <button
          type="button"
          className="text-blue-700 font-medium hover:underline"
          onClick={() => onAddMember(row)}
        >
          Add Member
        </button>
        <span className="text-muted-foreground">|</span>
        <button
          type="button"
          className="text-blue-700 font-medium hover:underline"
          onClick={() => onMemberList(row)}
        >
          Member List
        </button>
      </div>
    );
  };
}

export default function CommitteeMembersHubPage() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [committee, setCommittee] = useState<GrievanceCommittee | null>(null);
  const { data, isLoading, invalidate } = useCrudList({
    queryKey: QK.grievanceMasters.committees(),
    queryFn: listAllGrievanceCommittees,
  });

  const columnDefs = useMemo<ColDef<GrievanceCommittee>[]>(
    () => [
      COLS.siNo,
      COLS.committeeCode,
      COLS.committeeName,
      COLS.hierarchyLevel,
      { ...COLS.isActive, cellRenderer: statusRenderer },
      {
        ...COLS.actions,
        cellRenderer: makeActionsRenderer(
          (row) => {
            setCommittee(row);
            setOpen(true);
          },
          (row) => {
            const params = new URLSearchParams({
              grvCommitteeId: String(row.grvCommitteeId),
              hierarchyLevel: String(row.hierarchyLevel ?? ""),
            });
            router.push(
              `/grievance/grievance-masters/committee-members/members-list?${params.toString()}`,
            );
          },
        ),
      },
    ],
    [router],
  );

  return (
    <ListPage
      title="Committee Members"
      rowData={data}
      columnDefs={columnDefs}
      loading={isLoading}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: "Search",
        pdfDocumentTitle: "Committee Members",
      }}
    >
      <GrievanceCommitteeMemberModal
        key={
          committee ? `add-${committee.grvCommitteeId}-${open}` : `add-closed`
        }
        open={open}
        onClose={() => {
          setOpen(false);
          setCommittee(null);
        }}
        committee={committee}
        onSaved={invalidate}
      />
    </ListPage>
  );
}
