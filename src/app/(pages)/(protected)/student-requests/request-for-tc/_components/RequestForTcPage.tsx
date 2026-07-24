"use client";

/**
 * Angular `student-requests/tc-certificate` → `RequestForTcComponent`.
 * Session student → TC + NODUE college certs → no-due gate → apply TC + history.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Info } from "lucide-react";
import { FilteredListPage } from "@/components/layout";
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
  pickCollegeCertificateByCode,
} from "@/services";
import type { FeeCertificateIssueRow } from "@/types/tc-no-due";
import { StudentProfileHeader } from "@/app/(pages)/(protected)/admin-student-information-system/students-profile/StudentProfileHeader";
import { ConfirmTcDialog } from "@/app/(pages)/(protected)/tc-no-due-approval/_components/ConfirmTcDialog";

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

const COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<FeeCertificateIssueRow>,
  academicYear: {
    field: "academicYear",
    headerName: "Academic Year",
    minWidth: 130,
  } as ColDef<FeeCertificateIssueRow>,
  appliedOn: {
    headerName: "Applied On",
    minWidth: 130,
    valueGetter: (p) => formatDisplayDate(p.data?.appliedOn),
  } as ColDef<FeeCertificateIssueRow>,
  status: {
    headerName: "Status",
    minWidth: 120,
  } as ColDef<FeeCertificateIssueRow>,
  certificateNo: {
    headerName: "Certficate No.",
    minWidth: 130,
    valueGetter: (p) => p.data?.certificateNumber ?? "-",
  } as ColDef<FeeCertificateIssueRow>,
  conduct: {
    headerName: "Conduct",
    minWidth: 120,
    valueGetter: (p) => p.data?.conduct ?? "-",
  } as ColDef<FeeCertificateIssueRow>,
  remarks: {
    headerName: "Remarks",
    minWidth: 140,
    valueGetter: (p) => p.data?.remarks ?? "-",
  } as ColDef<FeeCertificateIssueRow>,
};

function statusRenderer(p: ICellRendererParams<FeeCertificateIssueRow>) {
  const code = String(p.data?.applicationStatusCode ?? "");
  const label =
    p.data?.applicationStatusDisplayName ??
    p.data?.applicationStatusName ??
    code ??
    "—";
  return <span className={historyStatusClass(code)}>{label}</span>;
}

export function RequestForTcPage() {
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
  const [noMsg, setNoMsg] = useState<string | null>(null);
  const [nodueLoading, setNodueLoading] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [applying, setApplying] = useState(false);

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
      setStudentId(positiveId(detail.studentId, detail.fk_student_id, sid));
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

  const { data: collegeCertificates = [], isLoading: loadingCerts } = useQuery({
    queryKey: QK.tcNoDue.collegeCerts(collegeId, "all"),
    queryFn: () => listCollegeCertificatesByCollege(collegeId),
    enabled: collegeId > 0,
  });

  const tcCert = useMemo(
    () => pickCollegeCertificateByCode(collegeCertificates, "TC"),
    [collegeCertificates],
  );
  const nodueCert = useMemo(
    () => pickCollegeCertificateByCode(collegeCertificates, "NODUE"),
    [collegeCertificates],
  );
  const tcCertId = Number(tcCert?.collegeCertificateId ?? 0);
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
    queryKey: QK.tcNoDue.studentIssue(studentId, tcCertId),
    queryFn: () =>
      listFeeCertificateIssuesByStudentAndCertificate(studentId, tcCertId),
    enabled: studentId > 0 && tcCertId > 0,
  });

  const loadNoDueDetails = useCallback(async () => {
    if (!studentId || !nodueCertId) {
      setNodueDetails(null);
      setNoMsg(null);
      return;
    }
    setNodueLoading(true);
    try {
      // Angular request-for-tc: duration 3000
      const nodue = await getNoDueCertificateIssue({
        studentId,
        collegeCertificateId: nodueCertId,
        duration: 3000,
      });
      setNodueDetails(nodue.details);
      setNoMsg(nodue.message);
    } catch (e) {
      toastError(e, "Unable to load no-due status");
      setNodueDetails(null);
      setNoMsg(null);
    } finally {
      setNodueLoading(false);
    }
  }, [studentId, nodueCertId]);

  useEffect(() => {
    if (collegeId > 0 && !loadingCerts && !tcCert) {
      toastInfo("TC is not mentioned in College Certificates.");
    }
  }, [collegeId, loadingCerts, tcCert]);

  useEffect(() => {
    void loadNoDueDetails();
  }, [loadNoDueDetails]);

  const isApply = useMemo(() => {
    if (isEmptyObject(nodueDetails)) return false;
    const code = String(
      nodueDetails?.applicationStatusCode ?? "",
    ).toUpperCase();
    return code === "CLEARED" || code === "TCISSUED";
  }, [nodueDetails]);

  const noDueFlag = useMemo(() => {
    if (feeCertificateIssues.length === 0) return true;
    return (
      String(feeCertificateIssues[0]?.applicationStatusCode ?? "").toUpperCase() ===
      "REJECTED"
    );
  }, [feeCertificateIssues]);

  const showApply =
    Boolean(student) && tcCertId > 0 && isApply && noDueFlag && !nodueLoading;

  const showNodueInfo =
    Boolean(student) && (noMsg != null || !isEmptyObject(nodueDetails));

  async function handleApply() {
    if (!tcCert || !student) {
      toastInfo("Reference of T.C certificate not found");
      return;
    }
    const appliedStatus = statuses.find(
      (s) => s.generalDetailCode === "APPLIED",
    );
    if (!appliedStatus?.generalDetailId) {
      toastError(
        new Error("APPLIED status not configured"),
        "Cannot apply for T.C",
      );
      return;
    }

    setApplying(true);
    try {
      await applyTcCertificateWorkflow([
        {
          collegeCertificateId: tcCert.collegeCertificateId,
          applicationStatusId: appliedStatus.generalDetailId,
          collegeId: positiveId(student.collegeId, collegeId),
          academicYearId: positiveId(student.academicYearId),
          studentId: positiveId(student.studentId, studentId),
          appliedOn: appliedOnNow(),
          isWorkFlowFlag: false,
        },
      ]);
      toastSuccess("Applied successfully");
      setConfirmOpen(false);
      await loadNoDueDetails();
      await refetchIssues();
      await queryClient.invalidateQueries({
        queryKey: QK.tcNoDue.studentIssue(studentId, tcCertId),
      });
    } catch (e) {
      toastError(e, "Failed to apply for T.C");
    } finally {
      setApplying(false);
    }
  }

  const columnDefs = useMemo<ColDef<FeeCertificateIssueRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.academicYear,
      COL_DEFS.appliedOn,
      { ...COL_DEFS.status, cellRenderer: statusRenderer },
      COL_DEFS.certificateNo,
      COL_DEFS.conduct,
      COL_DEFS.remarks,
    ],
    [],
  );

  const loading =
    sessionLoading ||
    profileLoading ||
    loadingCerts ||
    nodueLoading ||
    loadingIssues;

  return (
    <FilteredListPage
      title="Request For Transfer Certificate"
      notice={
        !loading && !student ? (
          <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
            Student profile not found for this session.
          </div>
        ) : null
      }
      filters={
        <div className="space-y-3">
          {student ? (
            <>
              <StudentProfileHeader student={student} />

              {showNodueInfo ? (
                <div className="flex items-start gap-2 text-sm text-[#005aff]">
                  <Info className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>
                    {noMsg != null ? (
                      "To apply for T.C, please clear your No Due Certificate."
                    ) : String(
                        nodueDetails?.applicationStatusCode ?? "",
                      ).toUpperCase() === "CLEARED" ? (
                      <>
                        {String(
                          nodueDetails?.certificateName ??
                            "No Due Certificate",
                        )}{" "}
                        applied on{" "}
                        {formatDisplayDate(nodueDetails?.createdDt)} is in{" "}
                        {String(
                          nodueDetails?.applicationStatusDisplayName ??
                            "Cleared",
                        )}{" "}
                        status
                      </>
                    ) : (
                      <>
                        Unable to apply T.C as{" "}
                        {String(
                          nodueDetails?.certificateName ??
                            "No Due Certificate",
                        )}{" "}
                        applied on{" "}
                        {formatDisplayDate(nodueDetails?.createdDt)} is in{" "}
                        {String(
                          nodueDetails?.applicationStatusDisplayName ?? "—",
                        )}{" "}
                        status
                      </>
                    )}
                  </p>
                </div>
              ) : null}

              {showApply ? (
                <div className="flex justify-end">
                  <Button type="button" onClick={() => setConfirmOpen(true)}>
                    Apply Certificate
                  </Button>
                </div>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              {loading ? "Loading…" : "No student profile loaded."}
            </p>
          )}
        </div>
      }
      filtersCollapsible
      filtersDefaultOpen
      rowData={feeCertificateIssues}
      columnDefs={columnDefs}
      loading={loading}
      pagination
      height="auto"
      toolbar={{
        search: true,
        searchPlaceholder: "Search",
      }}
    >
      <ConfirmTcDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Confirmation"
        description="Are you sure, you want to apply for T.C ?"
        onConfirm={() => void handleApply()}
        loading={applying}
      />
    </FilteredListPage>
  );
}
