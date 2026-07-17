"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ColDef } from "ag-grid-community";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/common/generic-functions";
import { QK } from "@/lib/query-keys";
import { rowIndexGetter } from "@/lib/utils";
import { getErrorMessage } from "@/lib/errors";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  getCollegeUploadApprovalDetails,
  loadCollegeUploadApproval,
  rejectCollegeUploadApproval,
} from "@/services";
import {
  APPROVAL_UPLOAD_DETAIL_CONFIG,
  type ApprovalUploadDetailKind,
} from "../_lib/approval-upload-config";
import {
  buildApprovalDataDetails,
  getApprovalUploadContext,
} from "../_lib/approval-upload-storage";
import { UploadApprovalActionModal } from "./UploadApprovalActionModal";

type AnyRow = Record<string, unknown>;

function pickUploadFileId(row: AnyRow): number {
  const n = Number(
    row.pk_univ_uploadfile_id ??
      row.univ_uploadfile_id ??
      row.univUploadfileId ??
      0,
  );
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function pickNum(row: AnyRow, key: string): number {
  const n = Number(row[key] ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function pivotSubjectRows(raw: AnyRow[]): {
  rows: AnyRow[];
  subjectCodes: string[];
} {
  const transformed: Record<string, AnyRow> = {};
  const subjectsSet = new Set<string>();
  for (const item of raw) {
    const hall = String(item.hallticketno ?? "");
    if (!hall) continue;
    if (!transformed[hall]) {
      transformed[hall] = {
        sno: Number(item.srno ?? 0),
        hallticketno: hall,
        academicyear: item.academicyear,
        courseyearcode: item.courseyearcode,
        regulationcode: item.regulationcode,
      };
    }
    const code = String(item.subjectcode ?? "");
    if (code) {
      transformed[hall][code] = "Y";
      subjectsSet.add(code);
    }
  }
  for (const row of Object.values(transformed)) {
    for (const code of subjectsSet) {
      if (!row[code]) row[code] = "N";
    }
  }
  return {
    rows: Object.values(transformed),
    subjectCodes: Array.from(subjectsSet),
  };
}

function pivotAttendanceRows(raw: AnyRow[]): {
  rows: AnyRow[];
  subjectCodes: string[];
} {
  const transformed: Record<string, AnyRow> = {};
  const subjectsSet = new Set<string>();
  for (const item of raw) {
    const hall = String(item.hallticketno ?? "");
    if (!hall) continue;
    if (!transformed[hall]) {
      transformed[hall] = {
        hallticketno: hall,
        courseyearcode: item.courseyearcode,
        academicyear: item.academicyear,
        regulationcode: item.regulationcode,
      };
    }
    const code = String(item.subjectcode ?? "");
    if (code) {
      transformed[hall][code] = item.attendance ?? item.marks ?? "Y";
      subjectsSet.add(code);
    }
  }
  return {
    rows: Object.values(transformed),
    subjectCodes: Array.from(subjectsSet),
  };
}

function mapDisplayRow(row: AnyRow, index: number, fieldIds: string[]): AnyRow {
  const out: AnyRow = { ...row, sno: index + 1 };
  for (const id of fieldIds) {
    if (out[id] != null) continue;
    if (id === "hallticket")
      out[id] = row.hall_ticket_number ?? row.hallticket ?? row.hallticketno;
    if (id === "firstName") out[id] = row.first_name ?? row.firstName;
    if (id === "dateOfBirth")
      out[id] = formatDate(String(row.date_of_birth ?? row.dateOfBirth ?? ""));
    if (id === "studentEmailID")
      out[id] = row.student_emailid ?? row.studentEmailID;
    if (id === "fatherName") out[id] = row.father_name ?? row.fatherName;
    if (id === "fatherMobile") out[id] = row.father_mobile ?? row.fatherMobile;
    if (id === "course") {
      const parts = [
        row.college,
        row.academic_year,
        row.course,
        row.s_group,
        row.course_year,
      ].filter(Boolean);
      out[id] = parts.length ? parts.join(" / ") : row.course;
    }
    if (id === "Amount") out[id] = row.Amount ?? row.amount;
  }
  return out;
}

function toColDefs(columns: { id: string; label: string }[]): ColDef<AnyRow>[] {
  return columns.map((c) => {
    if (c.id === "sno") {
      return {
        headerName: c.label,
        valueGetter: rowIndexGetter,
        width: 70,
        flex: 0,
      } as ColDef<AnyRow>;
    }
    return {
      field: c.id,
      headerName: c.label,
      minWidth: 100,
      valueGetter: (p) => String(p.data?.[c.id] ?? ""),
    } as ColDef<AnyRow>;
  });
}

type CollegeUploadApprovalDetailPageProps = { kind: ApprovalUploadDetailKind };

export function CollegeUploadApprovalDetailPage({
  kind,
}: CollegeUploadApprovalDetailPageProps) {
  const config = APPROVAL_UPLOAD_DETAIL_CONFIG[kind];
  const router = useRouter();
  const queryClient = useQueryClient();
  const [params, setParams] = useState<AnyRow | null>(null);
  const [action, setAction] = useState<"approve" | "reject" | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const ctx = getApprovalUploadContext(config.storageKey);
    if (!ctx) {
      router.replace("/affiliated-colleges/college-uploads-approval");
      return;
    }
    setParams(ctx);
  }, [config.storageKey, router]);

  const uploadFileId = params ? pickUploadFileId(params) : 0;

  const procParams = useMemo(() => {
    if (!params) return null;
    const extra = config.extraDetailParams?.(params) ?? {};
    return {
      inFlag: "",
      collegeId: pickNum(params, "fk_college_id"),
      academicYearId: pickNum(params, "fk_academic_year_id"),
      courseId: pickNum(params, "fk_course_id"),
      courseGroupId: pickNum(params, "fk_course_group_id"),
      courseYearId: pickNum(params, "fk_course_year_id"),
      univUploadfileId: uploadFileId,
      regulationId: 0,
      fromDate: extra.fromDate ?? "1990-01-01",
      toDate: extra.toDate ?? "1990-01-01",
      examId: extra.examId,
      studentId: extra.studentId,
      fkUnivCollegewisePaymentId: extra.fkUnivCollegewisePaymentId,
    };
  }, [config, params, uploadFileId]);

  const {
    data: rawRows = [],
    isFetching,
    error,
  } = useQuery({
    queryKey: QK.affiliatedColleges.uploadsApprovalDetail(
      config.detailProc,
      uploadFileId,
    ),
    queryFn: () =>
      getCollegeUploadApprovalDetails(config.detailProc, procParams!),
    enabled: uploadFileId > 0 && procParams != null,
  });

  const { tableRows, columnDefs } = useMemo(() => {
    if (config.tableMode === "subjects") {
      const { rows, subjectCodes } = pivotSubjectRows(rawRows);
      const cols = [
        { id: "sno", label: "SNo" },
        { id: "hallticketno", label: "Hall Ticket No" },
        { id: "courseyearcode", label: "Course Year" },
        { id: "academicyear", label: "Academic Year" },
        { id: "regulationcode", label: "Regulation" },
        ...subjectCodes.map((code) => ({ id: code, label: code })),
      ];
      return {
        tableRows: rows.map((r, i) => ({ ...r, sno: i + 1 })),
        columnDefs: toColDefs(cols),
      };
    }
    if (config.tableMode === "attendance") {
      const { rows, subjectCodes } = pivotAttendanceRows(rawRows);
      const cols = [
        { id: "sno", label: "SNo" },
        { id: "hallticketno", label: "Hall Ticket No" },
        { id: "courseyearcode", label: "Course Year" },
        { id: "academicyear", label: "Academic Year" },
        { id: "regulationcode", label: "Regulation" },
        ...subjectCodes.map((code) => ({ id: code, label: code })),
      ];
      return {
        tableRows: rows.map((r, i) => ({ ...r, sno: i + 1 })),
        columnDefs: toColDefs(cols),
      };
    }
    const cols = config.columns ?? [];
    const fieldIds = cols.map((c) => String(c.id));
    return {
      tableRows: rawRows.map((r, i) => mapDisplayRow(r, i, fieldIds)),
      columnDefs: toColDefs(
        cols.map((c) => ({ id: String(c.id), label: c.label })),
      ),
    };
  }, [config, rawRows]);

  const dataDetails = params ? buildApprovalDataDetails(params) : "";
  const pageTitle = dataDetails
    ? `${config.title} : ${dataDetails}`
    : config.title;

  const goBack = () =>
    router.push("/affiliated-colleges/college-uploads-approval");

  async function handleActionSubmit(comments: string) {
    if (!procParams || !action) return;
    setActionLoading(true);
    try {
      if (action === "approve") {
        await loadCollegeUploadApproval(config.loadProc, {
          ...procParams,
          comments,
        });
        toastSuccess("Upload approved and loaded successfully.");
      } else {
        await rejectCollegeUploadApproval({ ...procParams, comments });
        toastSuccess("Data rejected.");
      }
      await queryClient.invalidateQueries({
        queryKey: QK.affiliatedColleges.all,
      });
      setAction(null);
      goBack();
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  }

  if (!params) return null;

  return (
    <ListPage
      title={pageTitle}
      notice={
        error ? (
          <p className="text-sm text-destructive">{getErrorMessage(error)}</p>
        ) : null
      }
      rowData={tableRows}
      columnDefs={columnDefs}
      loading={isFetching}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: "Search…",
        pdfDocumentTitle: config.title,
      }}
    >
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" onClick={() => setAction("approve")}>
          Approve
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => setAction("reject")}
        >
          Reject
        </Button>
        <Button type="button" variant="outline" onClick={goBack}>
          Back
        </Button>
      </div>
      <UploadApprovalActionModal
        open={action != null}
        action={action ?? "approve"}
        onClose={() => setAction(null)}
        onSubmit={handleActionSubmit}
        loading={actionLoading}
      />
    </ListPage>
  );
}
