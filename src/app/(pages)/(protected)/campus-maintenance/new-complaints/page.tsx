"use client";

import { useState, useMemo } from "react";
import type {
  ColDef,
  ICellRendererParams,
  ValueFormatterParams,
} from "ag-grid-community";
import { format, isValid, parseISO } from "date-fns";
import { Eye, PencilIcon, PlusIcon } from "lucide-react";
import { ListPage } from "@/components/layout";
import { StatusBadge } from "@/common/components/data-display";

import { Button } from "@/components/ui/button";
import { useCrudList } from "@/hooks/useCrudList";
import { QK } from "@/lib/query-keys";
import { readStorageId } from "@/lib/employee-login-context";
import { listCampusIssuesByEmployee } from "@/services/campus-maintenance";
import type { CampusIssue } from "@/types/campus-maintenance";
import { rowIndexGetter } from "@/lib/utils";
import NewComplaintModal from "./NewComplaintModal";
import ComplaintOverviewModal from "../complaints-list/ComplaintOverviewModal";
import { useSession } from "@/hooks/useSession";
import { useLoginEmployeeId } from "@/hooks/useLoginEmployeeId";
import { useStaffLoginContext } from "@/hooks/useStaffLoginContext";

/** Angular actions use wfCode; fall back to aprvrejstatusCatCode */
function workflowCode(issue?: CampusIssue | null) {
  return issue?.wfCode || issue?.aprvrejstatusCatCode || "";
}

/** Angular `{{ row.issueLogDate | date:'MMM d, y' }}` — date only, no time zeros */
function formatComplaintDate(value?: string | null): string {
  if (!value) return "";
  const raw = String(value);
  const d = parseISO(raw.includes("T") ? raw : `${raw.slice(0, 10)}T00:00:00`);
  if (!isValid(d)) {
    const fallback = new Date(raw);
    return isValid(fallback) ? format(fallback, "MMM d, y") : raw.slice(0, 10);
  }
  return format(d, "MMM d, y");
}

function dateFormatter(p: ValueFormatterParams<CampusIssue>) {
  return formatComplaintDate(p.value as string | null | undefined);
}

// ─── Column shape ─────────────────────────────────────────────────────────────

const COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<CampusIssue>,
  issueTitle: {
    field: "issueTitle",
    headerName: "Complaint Title",
    minWidth: 200,
    flex: 2,
  } as ColDef<CampusIssue>,
  college: {
    field: "collegeCode",
    headerName: "College",
    minWidth: 110,
    flex: 0.8,
  } as ColDef<CampusIssue>,
  raisedBy: {
    field: "raisedEmpName",
    headerName: "Raised By",
    minWidth: 140,
    flex: 1,
  } as ColDef<CampusIssue>,
  // Angular Status column = isActive → Active / InActive
  status: {
    field: "isActive",
    headerName: "Status",
    minWidth: 110,
    flex: 0.9,
  } as ColDef<CampusIssue>,
  date: {
    field: "issueLogDate",
    headerName: "Complaint Date",
    minWidth: 130,
    flex: 1,
    valueFormatter: dateFormatter,
  } as ColDef<CampusIssue>,
  expectedOn: {
    field: "expectedResolvedOn",
    headerName: "Expected Resolve",
    minWidth: 130,
    flex: 1,
    valueFormatter: dateFormatter,
  } as ColDef<CampusIssue>,
  actions: {
    headerName: "Actions",
    minWidth: 100,
    flex: 0,
    width: 100,
  } as ColDef<CampusIssue>,
};

// ─── Renderers ────────────────────────────────────────────────────────────────

function statusRenderer(p: ICellRendererParams<CampusIssue>) {
  const active = p.data?.isActive ?? false;
  return <StatusBadge status={active} label={active ? "Active" : "InActive"} />;
}

function makeActionsRenderer(
  onEdit: (issue: CampusIssue) => void,
  onView: (issue: CampusIssue) => void,
) {
  return (p: ICellRendererParams<CampusIssue>) => {
    const issue = p.data;
    if (!issue) return null;
    return workflowCode(issue) === "CLOSED" ? (
      <Button
        size="sm"
        variant="ghost"
        className="h-8 w-8 p-0"
        onClick={() => onView(issue)}
      >
        <Eye className="h-3.5 w-3.5" />
      </Button>
    ) : (
      <Button
        size="sm"
        variant="ghost"
        className="h-8 w-8 p-0"
        onClick={() => onEdit(issue)}
      >
        <PencilIcon className="h-3.5 w-3.5" />
      </Button>
    );
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NewComplaintsPage() {
  const { user, isLoading: sessionLoading } = useSession();
  const { employeeId } = useLoginEmployeeId(user, sessionLoading);
  const { deptId } = useStaffLoginContext(user, sessionLoading);

  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData] = useState<CampusIssue | null>(null);
  const [overviewIssue, setOverviewIssue] = useState<CampusIssue | null>(null);

  // Angular dataSecurityLevelPrincipal(): college locked for non-admin
  const lockCollege = !user?.isAdmin;
  // Angular dataSecurityLevel(): department locked for staff (not admin/principal)
  const lockDepartment = !user?.isAdmin && !user?.isPrincipal;
  // Angular localStorage collegeId / empDeptId
  const sessionCollegeId = user?.collegeId || readStorageId("collegeId");
  const sessionDeptId = deptId || readStorageId("empDeptId");

  const {
    data: issues,
    isLoading,
    invalidate,
  } = useCrudList<CampusIssue>({
    queryKey: QK.campusIssues.byEmployee(employeeId),
    queryFn: () => listCampusIssuesByEmployee(employeeId),
    enabled: employeeId > 0,
  });

  const columnDefs = useMemo<ColDef<CampusIssue>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.issueTitle,
      COL_DEFS.college,
      COL_DEFS.raisedBy,
      { ...COL_DEFS.status, cellRenderer: statusRenderer },
      COL_DEFS.date,
      COL_DEFS.expectedOn,
      {
        ...COL_DEFS.actions,
        cellRenderer: makeActionsRenderer((issue) => {
          setEditData(issue);
          setModalOpen(true);
        }, setOverviewIssue),
      },
    ],
    [],
  );

  return (
    <ListPage
      title="My Complaints"
      rowData={issues}
      columnDefs={columnDefs}
      loading={isLoading || sessionLoading}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: "Search my complaints…",
        pdfDocumentTitle: "My Complaints",
      }}
      toolbarTrailing={
        <Button
          size="sm"
          onClick={() => {
            setEditData(null);
            setModalOpen(true);
          }}
        >
          <PlusIcon className="h-4 w-4 mr-1" />
          New Complaint
        </Button>
      }
    >
      <NewComplaintModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditData(null);
        }}
        editData={editData}
        viewMode={false}
        raisedEmpId={employeeId}
        sessionCollegeId={sessionCollegeId}
        sessionDeptId={sessionDeptId}
        lockCollege={lockCollege}
        lockDepartment={lockDepartment}
        onSaved={invalidate}
      />
      <ComplaintOverviewModal
        open={overviewIssue !== null}
        onClose={() => setOverviewIssue(null)}
        issue={overviewIssue}
        onSaved={invalidate}
      />
    </ListPage>
  );
}
