"use client";

/**
 * Angular `student-requests/student-idcard` → `StudentIdcardComponent`.
 * Session student → STDIDCRD college certificate → apply + issue history + print.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Printer } from "lucide-react";
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
  listCertificateIssueStatuses,
  listCollegeCertificatesByCollege,
  listFeeCertificateIssuesByStudentAndCertificate,
} from "@/services";
import type { FeeCertificateIssueRow } from "@/types/tc-no-due";
import type { CollegeCertificate } from "@/types/college-certificate";
import { StudentProfileHeader } from "@/app/(pages)/(protected)/admin-student-information-system/students-profile/StudentProfileHeader";
import { ConfirmNoDueDialog } from "../../no-due-certificate/_components/ConfirmNoDueDialog";

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

function formatDisplayDate(value: unknown): string {
  if (!value) return "—";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return format(d, "dd MMM, yyyy");
}

/** Angular exact: `certifcateCode === 'STDIDCRD'`. */
function pickIdCardCertificate(
  rows: CollegeCertificate[],
): CollegeCertificate | undefined {
  return rows.find(
    (row) => String(row.certifcateCode ?? "").toUpperCase() === "STDIDCRD",
  );
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
    headerName: "SI No.",
    valueGetter: rowIndexGetter,
    width: 80,
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
  actions: {
    headerName: "Action",
    minWidth: 110,
    flex: 0,
    width: 120,
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

function makePrintRenderer(onPrint: () => void) {
  return (p: ICellRendererParams<FeeCertificateIssueRow>) => {
    const code = String(p.data?.applicationStatusCode ?? "").toUpperCase();
    if (code !== "TCISSUED") return null;
    return (
      <Button type="button" size="sm" variant="outline" onClick={onPrint}>
        <Printer className="mr-1 h-3.5 w-3.5" />
        Print
      </Button>
    );
  };
}

export function StudentIdcardPage() {
  const { user, isLoading: sessionLoading } = useSession();
  const queryClient = useQueryClient();

  const [student, setStudent] = useState<AnyRow | null>(null);
  const [collegeId, setCollegeId] = useState(0);
  const [studentId, setStudentId] = useState(0);
  const [profileLoading, setProfileLoading] = useState(true);

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
    queryKey: QK.tcNoDue.collegeCerts(collegeId, "STDIDCRD"),
    queryFn: () => listCollegeCertificatesByCollege(collegeId),
    enabled: collegeId > 0,
  });

  const idCardCert = useMemo(
    () => pickIdCardCertificate(collegeCertificates),
    [collegeCertificates],
  );
  const idCardCertId = Number(idCardCert?.collegeCertificateId ?? 0);

  const { data: statuses = [] } = useQuery({
    queryKey: ["TcNoDue", "certStatuses"],
    queryFn: listCertificateIssueStatuses,
  });

  const {
    data: feeCertificateIssues = [],
    isLoading: loadingIssues,
    refetch: refetchIssues,
  } = useQuery({
    queryKey: QK.tcNoDue.studentIssue(studentId, idCardCertId),
    queryFn: () =>
      listFeeCertificateIssuesByStudentAndCertificate(studentId, idCardCertId),
    enabled: studentId > 0 && idCardCertId > 0,
  });

  useEffect(() => {
    if (collegeId > 0 && !loadingCerts && !idCardCert) {
      // Angular copy-paste message for missing STDIDCRD; keep ID-card wording.
      toastInfo("ID Card is not mentioned in College Certificates.");
    }
  }, [collegeId, loadingCerts, idCardCert]);

  // Angular: apply when student + collegeCertificate exist (nodueDetails never set).
  const showApply = Boolean(student) && idCardCertId > 0;

  async function handleApply(reason: string) {
    if (!idCardCert || !student) {
      toastInfo("Reference of Id card certificate not found");
      return;
    }
    const appliedStatus = statuses.find(
      (s) => s.generalDetailCode === "APPLIED",
    );
    if (!appliedStatus?.generalDetailId) {
      toastError(
        new Error("APPLIED status not configured"),
        "Cannot apply for Id Card",
      );
      return;
    }

    setApplying(true);
    try {
      await applyTcCertificateWorkflow([
        {
          collegeCertificateId: idCardCert.collegeCertificateId,
          applicationStatusId: appliedStatus.generalDetailId,
          collegeId: positiveId(student.collegeId, collegeId),
          academicYearId: positiveId(student.academicYearId),
          studentId: positiveId(student.studentId, studentId),
          appliedOn: appliedOnNow(),
          reason,
          isWorkFlowFlag: false,
        },
      ]);
      toastSuccess("Applied successfully");
      setConfirmOpen(false);
      await refetchIssues();
      await queryClient.invalidateQueries({
        queryKey: QK.tcNoDue.studentIssue(studentId, idCardCertId),
      });
    } catch (e) {
      toastError(e, "Failed to apply for Id Card");
    } finally {
      setApplying(false);
    }
  }

  const printPdf = useCallback(() => {
    if (!student) return;

    const photo =
      String(student.studentPhotoPath ?? "") ||
      "/assets/images/avatars/default_Student.png";
    const printContents =
      '<div class="container" >\n' +
      ' <div class="row">' +
      ' <div class="col-12 col-md-6 col-lg-4">' +
      '  <div class="card" style=" background-image: url(' +
      '"/assets/images/idcard/bgecard1.jpg"' +
      ');height: 3.375in;width: 2.275in;padding: 1.3rem 0 1.3rem 0;box-shadow: 0 0 5px #b4b4b4;background-repeat: no-repeat;background-size: 218.4px 324px;border-radius: 20px;">' +
      '<div class="text-xenter">' +
      '<div class="pp">' +
      '<span style="text-align:center">' +
      String(student.collegeName ?? "") +
      "<p> Bollikunta,Warangal-500072 </p>" +
      "</span>" +
      ' <img class="profile-img" src="' +
      photo +
      '" alt="" >' +
      "</div>" +
      ' <div class="names">' +
      '<h2 class="profile-name" style="text-align:center">' +
      String(student.firstName ?? "") +
      "</h2>" +
      '<p class="profile-username">' +
      String(student.rollNumber ?? "") +
      "</p>" +
      '<p class="profile-course">' +
      String(student.courseCode ?? "") +
      " / " +
      String(student.groupCode ?? "") +
      " / " +
      String(student.courseYearName ?? "") +
      " - Section " +
      String(student.section ?? "") +
      "</p>" +
      "  </div>" +
      "  </div>" +
      " </div>" +
      " </div>" +
      " </div>" +
      ' <div class="row">' +
      '  <div class="col-12 col-md-6 col-lg-4" style="top:20% !important;margin-top:20px !impotant">' +
      ' <div class="card" style="background-image: url(' +
      '"/assets/images/idcard/bgecard1.jpg"' +
      ') !important;">' +
      " <div>" +
      ' <h4 class="dt"><b>D.O.B. :</b>' +
      String(student.dateOfBirth ?? "") +
      "</h4>" +
      '  <h4 class="dt1"><b>M. NO. :</b>' +
      String(student.mobile ?? "") +
      "</h4>" +
      ' <h4 class="dt2"><b>Address. :</b>5,xyz colony,xyz near,abc road,gujarat,india</h4>' +
      " </div>" +
      "</div>" +
      "</div>" +
      "</div>" +
      "</div>";

    const popupWin = window.open("?", "_blank", "");
    if (!popupWin) return;
    popupWin.document.open();
    popupWin.document.write(`
      <html>
        <head>
        <style>
      *{ box-sizing: border-box; }
      .container{ position: absolute; left: 50%; top:15%; }
      .card{
          height: 3.375in; width: 2.275in; padding: 1.3rem 0 1.3rem 0;
          box-shadow: 0 0 5px #b4b4b4; background-repeat: no-repeat;
          background-size: 218.4px 324px; border-radius: 20px;
          -webkit-print-color-adjust: exact;
          background-image: url("/assets/images/idcard/bgecard1.jpg")
      }
      .text-xenter{ position: absolute; }
      .profile-img{
          position: relative; top: 25%; left: 28%; width: 96px; height: 96px;
          border-radius: 50%; border: 3px solid rgba(255, 255, 255, .2);
      }
      .names{ position: absolute; }
      .profile-name{
          position: relative; top: 50%; font-weight: 400; text-transform: uppercase;
          font-size: 1.6rem; margin-top: .5rem; text-align:center; color: darkblue;
      }
      .profile-username{
          position: relative; top: 64%; font-weight: 400; text-transform: lowercase;
          font-size: 1rem; margin-top: .5rem; text-align: center; color: navy;
      }
      .profile-course{
          position: relative; top: 68%; text-align:center; font-weight: 400;
          text-transform: lowercase; font-size: 1rem; margin-top: .5rem; color: navy;
      }
      .dt,.dt1,.dt2{
          position: absolute; font-weight: 400; font-size: 1.0rem; margin-top: .5rem;
          color: darkblue; left: 4%;
      }
      .dt{ top: 5%; } .dt1{ top: 10%; } .dt2{ top: 19%; }
      </style>
        </head>
    <body onload="window.print();window.close()">${printContents}
    </body>
    </html>
    `);
    popupWin.document.close();
  }, [student]);

  const columnDefs = useMemo<ColDef<FeeCertificateIssueRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.academicYear,
      COL_DEFS.appliedOn,
      { ...COL_DEFS.status, cellRenderer: statusRenderer },
      { ...COL_DEFS.actions, cellRenderer: makePrintRenderer(printPdf) },
    ],
    [printPdf],
  );

  const loading =
    sessionLoading || profileLoading || loadingCerts || loadingIssues;

  return (
    <FilteredListPage
      title="Request For ID Card"
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
              {showApply ? (
                <div className="flex justify-end">
                  <Button type="button" onClick={() => setConfirmOpen(true)}>
                    Apply
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
      <ConfirmNoDueDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={(reason) => void handleApply(reason)}
        loading={applying}
        certificateLabel="Id Card"
        hideReasonField
        defaultReason="idcard"
      />
    </FilteredListPage>
  );
}
