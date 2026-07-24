"use client";

/**
 * Angular `student-requests/request-for-certificates` → `RequestForCertificatesComponent`.
 * Student portal: session student → FeeCertificateIssue list + apply via feeCertificateIssueRequest.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Info, Plus } from "lucide-react";
import { ListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/useSession";
import { QK } from "@/lib/query-keys";
import { rowIndexGetter } from "@/lib/utils";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  fetchStudentDetail,
  fetchStudentDetailByUserId,
  listFeeCertificateIssuesByStudent,
  submitCertificateIssueRequest,
} from "@/services";
import type {
  ApplyCertificateRequestPayload,
  FeeCertificateIssueRow,
} from "@/types/tc-no-due";
import type { StudentFeeSearchRow } from "@/types/fees-collection";
import { StudentApplyCertificateModal } from "./StudentApplyCertificateModal";

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

function ymKey(value: unknown): string {
  if (!value) return "";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 7);
  return format(d, "yyyy-MM");
}

function academicDetails(row: FeeCertificateIssueRow): string {
  const dto = row.studentDetailListDTO;
  if (!dto) return "—";
  return [
    dto.collegeCode,
    dto.academicYear,
    dto.courseCode,
    dto.groupCode,
    dto.courseYearName,
  ]
    .filter(Boolean)
    .join(" / ")
    .concat(dto.section ? ` - ${dto.section}` : "");
}

function statusClass(code: string): string {
  switch (code.toUpperCase()) {
    case "TCISSUED":
      return "text-emerald-700 font-semibold";
    case "REJECTED":
      return "text-red-600 font-semibold";
    case "APPLIED":
      return "text-amber-700 font-semibold";
    case "CLEARED":
      return "text-blue-700 font-semibold";
    default:
      return "text-foreground";
  }
}

function toStudentFeeRow(detail: AnyRow): StudentFeeSearchRow {
  return {
    studentId: Number(detail.studentId ?? 0),
    firstName: String(detail.firstName ?? ""),
    rollNumber: String(detail.rollNumber ?? ""),
    hallticketNumber: String(detail.hallticketNumber ?? ""),
    collegeId: Number(detail.collegeId ?? 0),
    collegeCode: String(detail.collegeCode ?? ""),
    academicYearId: Number(detail.academicYearId ?? 0),
    academicYear: String(detail.academicYear ?? ""),
    courseCode: String(detail.courseCode ?? detail.courseName ?? ""),
    groupCode: String(detail.groupCode ?? ""),
    courseYearName: String(detail.courseYearName ?? ""),
    section: String(detail.section ?? ""),
    mobile: String(detail.mobile ?? ""),
    studentPhotoPath: String(detail.studentPhotoPath ?? ""),
    quotaDisplayName: String(detail.quotaDisplayName ?? ""),
  } as StudentFeeSearchRow;
}

const COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<FeeCertificateIssueRow>,
  certificate: {
    field: "certificateName",
    headerName: "Certificate",
    minWidth: 140,
  } as ColDef<FeeCertificateIssueRow>,
  certificateFor: {
    headerName: "Certificate For",
    minWidth: 120,
    valueGetter: (p) => p.data?.certificateFor ?? "—",
  } as ColDef<FeeCertificateIssueRow>,
  certificateForValue: {
    headerName: "Certificate For Value",
    minWidth: 140,
    valueGetter: (p) => p.data?.certificateForValue ?? "--",
  } as ColDef<FeeCertificateIssueRow>,
  academic: {
    headerName: "Academic Details",
    minWidth: 220,
    valueGetter: (p) => (p.data ? academicDetails(p.data) : "—"),
  } as ColDef<FeeCertificateIssueRow>,
  appliedOn: {
    headerName: "Applied Date",
    minWidth: 130,
    valueGetter: (p) => {
      const raw = p.data?.appliedOn;
      if (!raw) return "—";
      const d = new Date(raw);
      return Number.isNaN(d.getTime())
        ? String(raw)
        : format(d, "MMMM d, yyyy");
    },
  } as ColDef<FeeCertificateIssueRow>,
  status: {
    headerName: "Status",
    minWidth: 110,
  } as ColDef<FeeCertificateIssueRow>,
};

function statusRenderer(p: ICellRendererParams<FeeCertificateIssueRow>) {
  const code = String(p.data?.applicationStatusCode ?? "");
  const label =
    p.data?.applicationStatusDisplayName ??
    p.data?.applicationStatusName ??
    code ??
    "—";
  return <span className={statusClass(code)}>{label}</span>;
}

export function RequestForCertificatesPage() {
  const { user, isLoading: sessionLoading } = useSession();
  const queryClient = useQueryClient();
  const [student, setStudent] = useState<StudentFeeSearchRow | null>(null);
  const [collegeId, setCollegeId] = useState(0);
  const [academicYearId, setAcademicYearId] = useState(0);
  const [studentId, setStudentId] = useState(0);
  const [profileLoading, setProfileLoading] = useState(true);
  const [applyOpen, setApplyOpen] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState(false);
  const [duplicateLabel, setDuplicateLabel] = useState("");

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

      const resolvedStudentId = positiveId(
        detail.studentId,
        detail.fk_student_id,
        sid,
      );
      const resolvedCollegeId = positiveId(
        detail.collegeId,
        detail.fk_college_id,
        user?.collegeId,
        readStorage("collegeId"),
      );
      const resolvedAyId = positiveId(
        detail.academicYearId,
        detail.fk_academic_year_id,
        user?.academicYearId,
        readStorage("academicYearId"),
      );

      setStudent(toStudentFeeRow(detail));
      setStudentId(resolvedStudentId);
      setCollegeId(resolvedCollegeId);
      setAcademicYearId(resolvedAyId);
    } catch (e) {
      toastError(e, "Could not load your student profile");
      setStudent(null);
      setStudentId(0);
    } finally {
      setProfileLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (sessionLoading) return;
    void loadProfile();
  }, [sessionLoading, loadProfile]);

  const {
    data: rows = [],
    isLoading: listLoading,
  } = useQuery({
    queryKey: QK.tcNoDue.studentIssues(studentId),
    queryFn: () => listFeeCertificateIssuesByStudent(studentId),
    enabled: studentId > 0,
  });

  function checkDateValidation(data: ApplyCertificateRequestPayload): boolean {
    // Angular: only enforce for STUDENT userTypeCode
    if (String(user?.userTypeCode ?? "").toUpperCase() !== "STUDENT") {
      return false;
    }
    if (rows.length === 0) return false;
    const matches = rows.filter(
      (x) =>
        String(x.certifcateCode ?? "").toUpperCase() ===
        String(data.certifcateCode ?? "").toUpperCase(),
    );
    if (matches.length === 0) return false;
    const latest = matches[0];
    const status = String(latest.applicationStatusCode ?? "").toUpperCase();
    if (status !== "TCISSUED" && status !== "APPLIED") return false;
    return ymKey(data.appliedOn) === ymKey(latest.updatedDt);
  }

  async function handleApplySubmit(payload: ApplyCertificateRequestPayload) {
    if (checkDateValidation(payload)) {
      setDuplicateWarning(true);
      let label = payload.certificateName ?? "certificate";
      if (payload.certificateFor) label = `${label}(${payload.certificateFor})`;
      setDuplicateLabel(label);
      return;
    }
    try {
      await submitCertificateIssueRequest([payload]);
      toastSuccess("Certificate applied successfully");
      setDuplicateWarning(false);
      await queryClient.invalidateQueries({
        queryKey: QK.tcNoDue.studentIssues(studentId),
      });
    } catch (e) {
      toastError(e, "Failed to apply certificate");
    }
  }

  const columnDefs = useMemo<ColDef<FeeCertificateIssueRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.certificate,
      COL_DEFS.certificateFor,
      COL_DEFS.certificateForValue,
      COL_DEFS.academic,
      COL_DEFS.appliedOn,
      { ...COL_DEFS.status, cellRenderer: statusRenderer },
    ],
    [],
  );

  return (
    <ListPage
      title="Request For Certificates"
      notice={
        duplicateWarning ? (
          <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              You have already applied for this certificate within last one
              month please contact office
              {duplicateLabel ? ` (${duplicateLabel})` : ""}.
            </span>
          </div>
        ) : null
      }
      rowData={rows}
      columnDefs={columnDefs}
      loading={sessionLoading || profileLoading || listLoading}
      pagination
      height="auto"
      toolbar={{
        search: true,
        searchPlaceholder: "Search",
      }}
      toolbarTrailing={
        <Button
          type="button"
          onClick={() => setApplyOpen(true)}
          disabled={!student || !collegeId}
        >
          <Plus className="mr-1 h-4 w-4" />
          Apply certificate
        </Button>
      }
    >
      {student && collegeId > 0 ? (
        <StudentApplyCertificateModal
          open={applyOpen}
          onClose={() => setApplyOpen(false)}
          collegeId={collegeId}
          student={student}
          academicYearId={academicYearId}
          onSubmit={handleApplySubmit}
        />
      ) : null}
    </ListPage>
  );
}
