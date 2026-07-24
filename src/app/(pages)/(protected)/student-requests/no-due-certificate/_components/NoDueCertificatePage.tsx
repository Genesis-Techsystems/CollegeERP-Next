"use client";

/**
 * Angular `student-requests/no-due-certificate` → `NoDueCertificateComponent`.
 * Session student → NODUE college certificate → clearance workflows + history + apply.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Printer } from "lucide-react";
import { FilteredListPage } from "@/components/layout";
import { DataTable } from "@/common/components/table";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/useSession";
import { QK } from "@/lib/query-keys";
import { rowIndexGetter } from "@/lib/utils";
import { toastError, toastInfo, toastSuccess } from "@/lib/toast";
import {
  appliedOnNow,
  applyTcCertificateWorkflow,
  fetchStudentDetail,
  fetchStudentDetailByUserId,
  getNoDueCertificateIssue,
  listCertificateIssueStatuses,
  listCollegeCertificatesByCollege,
  listFeeCertificateIssuesByStudentAndCertificate,
} from "@/services";
import type {
  FeeCertificateIssueRow,
  FeeCertificateWorkflowRow,
} from "@/types/tc-no-due";
import { StudentProfileHeader } from "@/app/(pages)/(protected)/admin-student-information-system/students-profile/StudentProfileHeader";
import { ConfirmNoDueDialog } from "./ConfirmNoDueDialog";
import { ViewCertificateFlowsDialog } from "./ViewCertificateFlowsDialog";
import {
  orderNoDueWorkflows,
  workflowsFromDetails,
} from "./no-due-workflow-utils";

type AnyRow = Record<string, unknown>;

function positiveId(...candidates: unknown[]): number {
  for (const c of candidates) {
    const n = Number(c);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

function readStorage(key: string): string {
  if (typeof globalThis.window === "undefined") return "";
  return globalThis.localStorage.getItem(key) ?? "";
}

function isEmptyObject(
  obj: Record<string, unknown> | null | undefined,
): boolean {
  return !obj || Object.keys(obj).length === 0;
}

function formatDisplayDate(value: unknown): string {
  if (!value) return "—";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return format(d, "dd MMM, yyyy");
}

function formatPrintDate(value: unknown): string {
  if (!value) return "-";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return format(d, "dd MMM, yyyy");
}

function clearanceStatusClass(code: string | null | undefined): string {
  switch (String(code ?? "").toUpperCase()) {
    case "DUE":
    case "REJECTED":
      return "font-medium text-red-700";
    case "NODUE":
    case "APPROVED":
      return "font-medium text-emerald-700";
    default:
      return "font-medium text-amber-700";
  }
}

function clearanceStatusLabel(code: string | null | undefined): string {
  switch (String(code ?? "").toUpperCase()) {
    case "DUE":
      return "Due";
    case "NODUE":
      return "No Due";
    case "APPROVED":
      return "Approved";
    case "REJECTED":
      return "Rejected";
    default:
      return "Pending";
  }
}

function historyStatusClass(code: string | null | undefined): string {
  switch (String(code ?? "").toUpperCase()) {
    case "CLEARED":
    case "TCISSUED":
      return "font-medium text-emerald-700";
    case "REJECTED":
      return "font-medium text-red-700";
    case "APPLIED":
      return "font-medium text-amber-700";
    default:
      return "font-medium text-foreground";
  }
}

function canPrintIssue(row: FeeCertificateIssueRow | undefined): boolean {
  if (!row) return false;
  const name = String(row.applicationStatusDisplayName ?? "").trim();
  return name === "Issued" || name === "Cleared";
}

const CLEARANCE_COL_DEFS = {
  siNo: {
    headerName: "SI No.",
    valueGetter: rowIndexGetter,
    width: 80,
    flex: 0,
  } as ColDef<FeeCertificateWorkflowRow>,
  department: {
    headerName: "Department",
    minWidth: 160,
    valueGetter: (p) => {
      const row = p.data;
      if (!row) return "—";
      return `${row.deptName ?? ""}${row.courseGroupId != null ? " Dept Head" : ""}`;
    },
  } as ColDef<FeeCertificateWorkflowRow>,
  mobile: {
    headerName: "Mobile Number",
    minWidth: 130,
    valueGetter: (p) => p.data?.employeeMobile ?? "—",
  } as ColDef<FeeCertificateWorkflowRow>,
  status: {
    headerName: "Approval Status",
    minWidth: 130,
  } as ColDef<FeeCertificateWorkflowRow>,
  updatedOn: {
    headerName: "Status Updated On",
    minWidth: 140,
    valueGetter: (p) =>
      p.data?.approvalStatusCode != null
        ? formatDisplayDate(p.data.updatedDt)
        : "---",
  } as ColDef<FeeCertificateWorkflowRow>,
  comments: {
    headerName: "Comments",
    minWidth: 140,
    valueGetter: (p) => {
      const row = p.data;
      if (!row) return "---";
      const show =
        row.comments != null &&
        String(row.approvalStatusCode ?? "").toUpperCase() !== "NODUE";
      return show ? row.comments : "---";
    },
  } as ColDef<FeeCertificateWorkflowRow>,
};

function clearanceDeptRenderer(
  p: ICellRendererParams<FeeCertificateWorkflowRow>,
) {
  const row = p.data;
  if (!row) return null;
  return (
    <span className="font-medium text-blue-700">
      {row.deptName}
      {row.courseGroupId != null ? " Dept Head" : ""}
    </span>
  );
}

function clearanceStatusRenderer(
  p: ICellRendererParams<FeeCertificateWorkflowRow>,
) {
  const code = p.data?.approvalStatusCode;
  return (
    <span className={clearanceStatusClass(code)}>
      {clearanceStatusLabel(code)}
    </span>
  );
}

const HISTORY_COL_DEFS = {
  siNo: {
    headerName: "SI No.",
    valueGetter: rowIndexGetter,
    width: 80,
    flex: 0,
  } as ColDef<FeeCertificateIssueRow>,
  academicYear: {
    field: "academicYear",
    headerName: "Academic Year",
    minWidth: 120,
  } as ColDef<FeeCertificateIssueRow>,
  appliedOn: {
    headerName: "Applied On",
    minWidth: 120,
    valueGetter: (p) => formatDisplayDate(p.data?.appliedOn),
  } as ColDef<FeeCertificateIssueRow>,
  requestedTo: {
    headerName: "Requested To",
    minWidth: 100,
  } as ColDef<FeeCertificateIssueRow>,
  status: {
    headerName: "Status",
    minWidth: 110,
  } as ColDef<FeeCertificateIssueRow>,
  certificateNo: {
    headerName: "Certficate No.",
    minWidth: 120,
    valueGetter: (p) => p.data?.certificateNumber ?? "-",
  } as ColDef<FeeCertificateIssueRow>,
  conduct: {
    headerName: "Conduct",
    minWidth: 100,
    valueGetter: (p) => p.data?.conduct ?? "-",
  } as ColDef<FeeCertificateIssueRow>,
  remarks: {
    headerName: "Remarks",
    minWidth: 120,
    valueGetter: (p) => p.data?.remarks ?? "-",
  } as ColDef<FeeCertificateIssueRow>,
  reason: {
    headerName: "Reason",
    minWidth: 120,
    valueGetter: (p) => p.data?.reason ?? "-",
  } as ColDef<FeeCertificateIssueRow>,
};

function historyStatusRenderer(
  p: ICellRendererParams<FeeCertificateIssueRow>,
) {
  const code = p.data?.applicationStatusCode;
  return (
    <span className={historyStatusClass(code)}>
      {p.data?.applicationStatusDisplayName ??
        p.data?.applicationStatusName ??
        "—"}
    </span>
  );
}

function makeHistoryViewRenderer(
  onView: (row: FeeCertificateIssueRow) => void,
) {
  return (p: ICellRendererParams<FeeCertificateIssueRow>) => {
    if (!p.data) return null;
    return (
      <button
        type="button"
        className="cursor-pointer text-blue-700 underline"
        onClick={() => onView(p.data!)}
      >
        View
      </button>
    );
  };
}

export function NoDueCertificatePage() {
  const { user, isLoading: sessionLoading } = useSession();
  const queryClient = useQueryClient();

  const [student, setStudent] = useState<AnyRow | null>(null);
  const [collegeId, setCollegeId] = useState(0);
  const [studentId, setStudentId] = useState(0);
  const [profileLoading, setProfileLoading] = useState(true);

  const [nodueDetails, setNodueDetails] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [workflows, setWorkflows] = useState<FeeCertificateWorkflowRow[]>([]);
  const [nodueLoading, setNodueLoading] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [applying, setApplying] = useState(false);
  const [viewIssue, setViewIssue] = useState<FeeCertificateIssueRow | null>(
    null,
  );

  const loadProfile = useCallback(async () => {
    setProfileLoading(true);
    try {
      const storageStudentId = positiveId(readStorage("studentId"));
      const sessionStudentId = positiveId(user?.studentId);
      const sid = sessionStudentId || storageStudentId;

      let detail: AnyRow | null = null;
      if (sid) {
        detail = (await fetchStudentDetail(sid)) as AnyRow | null;
      }
      if (!detail && user?.userId) {
        detail = (await fetchStudentDetailByUserId(
          user.userId,
        )) as AnyRow | null;
      }

      if (!detail) {
        setStudent(null);
        setStudentId(0);
        setCollegeId(0);
        return;
      }

      setStudent(detail);
      setStudentId(
        positiveId(detail.studentId, detail.fk_student_id, sid),
      );
      setCollegeId(
        positiveId(
          detail.collegeId,
          detail.fk_college_id,
          user?.collegeId,
          readStorage("collegeId"),
        ),
      );
    } catch (e) {
      toastError(e, "Could not load your student profile");
      setStudent(null);
      setStudentId(0);
      setCollegeId(0);
    } finally {
      setProfileLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (sessionLoading) return;
    void loadProfile();
  }, [sessionLoading, loadProfile]);

  const { data: nodueCerts = [], isLoading: loadingCerts } = useQuery({
    queryKey: QK.tcNoDue.collegeCerts(collegeId, "NODUE"),
    queryFn: () => listCollegeCertificatesByCollege(collegeId, "NODUE"),
    enabled: collegeId > 0,
  });

  const nodueCert = nodueCerts[0];
  const nodueCertId = Number(nodueCert?.collegeCertificateId ?? 0);

  const { data: statuses = [] } = useQuery({
    queryKey: ["TcNoDue", "certStatuses"],
    queryFn: listCertificateIssueStatuses,
  });

  const {
    data: feeCertificateIssues = [],
    isLoading: loadingIssues,
    refetch: refetchIssues,
  } = useQuery({
    queryKey: QK.tcNoDue.studentIssue(studentId, nodueCertId),
    queryFn: () =>
      listFeeCertificateIssuesByStudentAndCertificate(studentId, nodueCertId),
    enabled: studentId > 0 && nodueCertId > 0,
  });

  const loadNoDueDetails = useCallback(async () => {
    if (!studentId || !nodueCertId) {
      setNodueDetails(null);
      setWorkflows([]);
      return;
    }
    setNodueLoading(true);
    try {
      // Angular student page: duration 3000
      const nodue = await getNoDueCertificateIssue({
        studentId,
        collegeCertificateId: nodueCertId,
        duration: 3000,
      });
      const details = nodue.details;
      setNodueDetails(details);
      setWorkflows(orderNoDueWorkflows(workflowsFromDetails(details)));
    } catch (e) {
      toastError(e, "Unable to load no-due status");
      setNodueDetails(null);
      setWorkflows([]);
    } finally {
      setNodueLoading(false);
    }
  }, [studentId, nodueCertId]);

  useEffect(() => {
    if (collegeId > 0 && !loadingCerts && nodueCerts.length === 0) {
      toastInfo("NO DUE is not mentioned in College Certificates.");
    }
  }, [collegeId, loadingCerts, nodueCerts.length]);

  useEffect(() => {
    void loadNoDueDetails();
  }, [loadNoDueDetails]);

  const showApply =
    Boolean(student) &&
    nodueCertId > 0 &&
    isEmptyObject(nodueDetails) &&
    !nodueLoading;

  const lastIssue =
    feeCertificateIssues.length > 0
      ? feeCertificateIssues[feeCertificateIssues.length - 1]
      : undefined;
  const showPrint =
    feeCertificateIssues.length > 0 && canPrintIssue(lastIssue);

  const clgAccrd = useMemo(() => {
    if (String(student?.collegeCode ?? "").toUpperCase() === "VCE") {
      return "Accredited By National Board Of Accredition";
    }
    return "";
  }, [student]);

  async function handleApply(reason: string) {
    if (!nodueCert || !student) return;
    const appliedStatus = statuses.find(
      (s) => s.generalDetailCode === "APPLIED",
    );
    if (!appliedStatus?.generalDetailId) {
      toastError(
        new Error("APPLIED status not configured"),
        "Cannot apply for No Due",
      );
      return;
    }

    setApplying(true);
    try {
      await applyTcCertificateWorkflow([
        {
          collegeCertificateId: nodueCert.collegeCertificateId,
          applicationStatusId: appliedStatus.generalDetailId,
          collegeId: positiveId(student.collegeId, collegeId),
          academicYearId: positiveId(student.academicYearId),
          studentId: positiveId(student.studentId, studentId),
          appliedOn: appliedOnNow(),
          reason,
          isWorkFlowFlag: true,
          courseGroupId: positiveId(student.courseGroupId) || undefined,
        },
      ]);
      toastSuccess("Applied successfully");
      setConfirmOpen(false);
      await loadNoDueDetails();
      await refetchIssues();
      await queryClient.invalidateQueries({
        queryKey: QK.tcNoDue.studentIssue(studentId, nodueCertId),
      });
    } catch (e) {
      toastError(e, "Failed to apply for No Due");
    } finally {
      setApplying(false);
    }
  }

  function printReport() {
    if (!student || workflows.length === 0) return;

    const collegeName = String(
      workflows[0]?.collegeName ?? student.collegeName ?? "",
    );
    const appliedOn = formatPrintDate(feeCertificateIssues[0]?.appliedOn);

    let html =
      '<div style="border: 2px solid;width: 100%;">' +
      '<div style="width: 100%;float: left;margin-bottom: 15px;margin-top: 15px;">' +
      '<div style="width: 20%;float: left;text-align: center;"><img src="/assets/images/logos/logo.jpg" alt=""></div>' +
      '<div style="width: 80%;float: left;text-align: center;margin-left: -50px;">' +
      `<span style="text-transform: uppercase;font-weight: 500;font-size: 18px;">${collegeName}</span><br>` +
      '<span style="text-transform: uppercase;font-weight: 500;font-size: 13px;">Bollikunta, Warangal, T.S - 506005</span><br>' +
      `<span style="text-transform: uppercase;font-weight: 500;font-size: 13px;">${clgAccrd}</span><br><br>` +
      '<span class="no-due">NO DUES CERTIFICATE</span>' +
      "</div></div><br>" +
      `<p style="text-align: right;margin-right: 10px;">Date : ${appliedOn}</p>` +
      '<table style="margin: 0 10px;">' +
      `<tr><td colspan="3" style="border: 0px !important;">Name : ${String(student.firstName ?? "")}</td></tr>` +
      `<tr><td colspan="2" style="border: 0px !important;">S/O, D/O : ${String(student.fatherName ?? "")}</td>` +
      `<td style="border: 0px !important;">H.T.No : ${String(student.rollNumber ?? "")}</td></tr>` +
      `<tr><td style="border: 0px !important;">Class : ${String(student.courseYearName ?? "")}</td>` +
      `<td style="border: 0px !important;">Year : ${String(student.academicYear ?? "")}</td>` +
      `<td style="border: 0px !important;">Branch : ${String(student.groupCode ?? "")}</td></tr>` +
      "</table><br>" +
      "<table>" +
      "<tr>" +
      "<th>Section </th>" +
      "<th> Name of the in-charge </th>" +
      "<th> Mobile Number </th>" +
      "<th> Status </th>" +
      "<th> Approved On </th>" +
      "<th> Remarks </th>" +
      "</tr>";

    let remarks = "";
    let principle = "";
    let titleCode = "";

    for (const row of workflows) {
      const dept = String(row.deptCode ?? "").toUpperCase();
      if (dept === "VICEPRINCIPAL") {
        if (row.approvalStatusDisplayName != null) {
          remarks = String(row.approvalStatusDisplayName);
        }
        const status = String(row.approvalStatusCode ?? "").toUpperCase();
        if (status === "NODUE" || status === "APPROVED") {
          principle = String(row.firstName ?? "");
          titleCode = String(row.titleCode ?? "");
        }
        continue;
      }

      const approvedOn =
        row.updatedDt != null ? formatPrintDate(row.updatedDt) : "-";
      const mobile = row.employeeMobile ? String(row.employeeMobile) : "-";
      const status =
        row.approvalStatusCode == null
          ? "Pending"
          : String(row.approvalStatusDisplayName ?? "");
      const approvedCell =
        row.approvalStatusCode == null ? "-" : approvedOn;
      const commentCell =
        row.comments == null ||
        String(row.approvalStatusDisplayName ?? "") === "No Due"
          ? "-"
          : String(row.comments);

      html +=
        "<tr>" +
        `<td style="text-align: center;"> ${String(row.deptName ?? "")} </td>` +
        `<td style="text-align: center;text-transform: capitalize !important;"> ${titlePart(row)} </td>` +
        `<td style="text-align: center;"> ${mobile} </td>` +
        `<td style="text-align: center;"> ${status} </td>` +
        `<td style="text-align: center;"> ${approvedCell} </td>` +
        `<td style="text-align: center;"> ${commentCell} </td>` +
        "</tr>";
    }

    html +=
      "</table>" +
      `<p style="margin-left: 10px;font-size: 15px;" class="font-16">Remarks if any : ${remarks}</p>` +
      '<div style="width: 100%;float: left;font-weight: 500;margin-top: 35px;">' +
      '<div style="width: 70%;float: left;text-align: center;"><p></p></div>' +
      '<div style="width: 30%;float: left;text-align: center;">' +
      `<p class="ft-15">${titleCode}.${" "}${principle}</p>` +
      '<p style="font-size: 18px;" class="font-500">Director/Vice Principal</p>' +
      "</div></div></div>";

    const popupWin = window.open("?", "_blank", "");
    if (!popupWin) return;
    popupWin.document.open();
    popupWin.document.write(`
      <html>
        <head>
          <title>No Dues Certificate</title>
          <style>
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #333; padding: 4px 6px; font-size: 13px; }
            .no-due { font-weight: 600; font-size: 16px; text-decoration: underline; }
          </style>
        </head>
        <body onload="window.print();window.close()">${html}</body>
      </html>`);
    popupWin.document.close();
  }

  function titlePart(row: FeeCertificateWorkflowRow): string {
    return `${String(row.titleCode ?? "")}.${" "}${String(row.firstName ?? "")}`;
  }

  const loading =
    sessionLoading || profileLoading || loadingCerts || nodueLoading;

  const clearanceColumnDefs = useMemo<ColDef<FeeCertificateWorkflowRow>[]>(
    () => [
      CLEARANCE_COL_DEFS.siNo,
      { ...CLEARANCE_COL_DEFS.department, cellRenderer: clearanceDeptRenderer },
      CLEARANCE_COL_DEFS.mobile,
      { ...CLEARANCE_COL_DEFS.status, cellRenderer: clearanceStatusRenderer },
      CLEARANCE_COL_DEFS.updatedOn,
      CLEARANCE_COL_DEFS.comments,
    ],
    [],
  );

  const historyColumnDefs = useMemo<ColDef<FeeCertificateIssueRow>[]>(
    () => [
      HISTORY_COL_DEFS.siNo,
      HISTORY_COL_DEFS.academicYear,
      HISTORY_COL_DEFS.appliedOn,
      {
        ...HISTORY_COL_DEFS.requestedTo,
        cellRenderer: makeHistoryViewRenderer(setViewIssue),
      },
      { ...HISTORY_COL_DEFS.status, cellRenderer: historyStatusRenderer },
      HISTORY_COL_DEFS.certificateNo,
      HISTORY_COL_DEFS.conduct,
      HISTORY_COL_DEFS.remarks,
      HISTORY_COL_DEFS.reason,
    ],
    [],
  );

  return (
    <FilteredListPage
      title="Request For No Due Certificate"
      filters={
        <div className="space-y-3">
          {loading && !student ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : null}
          {!loading && !student ? (
            <p className="text-sm text-muted-foreground">
              Student profile not found for this session.
            </p>
          ) : null}
          {student ? (
            <div className="relative">
              <StudentProfileHeader student={student} />
              {!isEmptyObject(nodueDetails) ? (
                <div className="absolute right-4 top-14 space-y-0.5 text-right text-sm sm:top-16">
                  <p className="font-semibold text-primary">
                    {String(
                      nodueDetails?.applicationStatusDisplayName ?? "—",
                    )}
                  </p>
                  <p className="text-muted-foreground">
                    Applied On :{" "}
                    {formatDisplayDate(
                      nodueDetails?.appliedOn ?? nodueDetails?.createdDt,
                    )}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}
          {showApply ? (
            <div className="flex justify-end">
              <Button type="button" onClick={() => setConfirmOpen(true)}>
                Apply
              </Button>
            </div>
          ) : null}
        </div>
      }
      filtersDefaultOpen
      rowData={workflows}
      columnDefs={clearanceColumnDefs}
      loading={loading}
      height="auto"
      pagination={false}
      toolbar={{
        search: true,
        searchPlaceholder: "Search clearance",
      }}
      toolbarTrailing={
        showPrint ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={printReport}
            title="Print Report"
          >
            <Printer className="mr-1 h-4 w-4" />
            Print
          </Button>
        ) : null
      }
    >
      {feeCertificateIssues.length > 0 ? (
        <DataTable
          title="No Due Certificate History"
          subtitle=""
          bordered
          rowData={feeCertificateIssues}
          columnDefs={historyColumnDefs}
          loading={loadingIssues}
          height="auto"
          pagination={false}
          toolbar={{
            search: true,
            searchPlaceholder: "Search history",
          }}
        />
      ) : null}

      <ConfirmNoDueDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={(reason) => void handleApply(reason)}
        loading={applying}
      />

      <ViewCertificateFlowsDialog
        open={Boolean(viewIssue)}
        onClose={() => setViewIssue(null)}
        issue={viewIssue}
      />
    </FilteredListPage>
  );
}
