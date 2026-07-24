"use client";

/**
 * Angular `student-academics/student-assignments` → `StudentAssignmentsComponent`.
 * List + submit dialog. Reuses domainList / postDetails / uploadFile (no new APIs).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format, isValid, parseISO } from "date-fns";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { FormModal } from "@/common/components/feedback";
import { ListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  ASSIGNMENT_API,
  DATE_FORMATS,
  ENTITIES,
  GM_CODES,
} from "@/config/constants";
import { useSession } from "@/hooks/useSession";
import { rowIndexGetter } from "@/lib/utils";
import { toastError, toastInfo, toastSuccess } from "@/lib/toast";
import {
  buildQuery,
  domainList,
  postDetails,
  uploadFile,
} from "@/services";

type AnyRow = Record<string, unknown>;

const MAX_FILE_BYTES = 24_000_000;

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

function txt(row: AnyRow | null | undefined, keys: string[]): string {
  if (!row) return "";
  for (const key of keys) {
    const v = row[key];
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

function assignmentDetails(row: AnyRow | null | undefined): AnyRow {
  const d = row?.assignmentDetails;
  return d && typeof d === "object" ? (d as AnyRow) : {};
}

function parseDate(value: unknown): Date | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) return isValid(value) ? value : null;
  const s = String(value).trim();
  if (!s) return null;
  const iso = parseISO(s);
  if (isValid(iso)) return iso;
  const d = new Date(s);
  return isValid(d) ? d : null;
}

function formatDisplayDate(value: unknown): string {
  const d = parseDate(value);
  if (!d) return "—";
  return format(d, DATE_FORMATS.DISPLAY);
}

/** Angular: submitSatusAvaliable=true when allowLateDueDate has already passed. */
function isPastLateDue(allowLateDueDate: unknown, now = new Date()): boolean {
  const late = parseDate(allowLateDueDate);
  if (!late) return false;
  const timeDiff = Math.round(now.getTime() - late.getTime());
  const diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24));
  return diffDays > 0;
}

function enrichAssignment(row: AnyRow, now = new Date()): AnyRow {
  const details = assignmentDetails(row);
  return {
    ...row,
    submitSatusAvaliable: isPastLateDue(details.allowLateDueDate, now),
  };
}

function extractCreatedId(data: unknown): string {
  if (data == null || data === "") return "";
  if (typeof data === "string" || typeof data === "number") return String(data);
  if (typeof data === "object") {
    const o = data as AnyRow;
    const id = o.studentAssignmentId ?? o.data ?? o.id;
    if (id != null && id !== "") return String(id);
  }
  return "";
}

function docsRenderer(p: ICellRendererParams<AnyRow>) {
  const details = assignmentDetails(p.data);
  const doc1 = txt(details, ["assgnmentDocPath", "assignmentDocPath"]);
  const doc2 = txt(details, ["assignmentDocPath1"]);
  if (!doc1 && !doc2) {
    return <span className="text-muted-foreground">No Documents</span>;
  }
  return (
    <div className="flex flex-col gap-0.5 py-1">
      {doc1 ? (
        <a
          href={doc1}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline"
        >
          Document1
        </a>
      ) : null}
      {doc2 ? (
        <a
          href={doc2}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline"
        >
          Document2
        </a>
      ) : null}
    </div>
  );
}

function marksRenderer(p: ICellRendererParams<AnyRow>) {
  const row = p.data;
  if (!row) return "—";
  const wfCode = txt(row, ["wfCode"]);
  const marks = row.marksSecured;
  if (marks != null && wfCode === "Completed") return String(marks);
  return "—";
}

function makeActionsRenderer(onSubmit: (row: AnyRow) => void) {
  return (p: ICellRendererParams<AnyRow>) => {
    const row = p.data;
    if (!row) return null;

    const wfCode = txt(row, ["wfCode"]);
    const expired = row.submitSatusAvaliable === true;

    if (wfCode === "Submited" || wfCode === "Review") {
      return <span className="text-sky-600 font-medium">Reviewing</span>;
    }

    if (wfCode === "Completed") {
      return <span className="text-muted-foreground">—</span>;
    }

    if (
      expired &&
      (wfCode === "ASSIGNED" || wfCode === "Draft" || wfCode === "Reopen")
    ) {
      return (
        <small className="text-destructive">
          Submission last due date has expired
        </small>
      );
    }

    if (!expired) {
      if (wfCode === "Draft" || wfCode === "Reopen") {
        return (
          <Button size="sm" onClick={() => onSubmit(row)}>
            Submit
          </Button>
        );
      }
      if (wfCode === "ASSIGNED") {
        return (
          <Button size="sm" onClick={() => onSubmit(row)}>
            Submitted
          </Button>
        );
      }
    }

    return null;
  };
}

const COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<AnyRow>,
  subjectName: {
    headerName: "Subject",
    minWidth: 150,
    valueGetter: (p) =>
      txt(assignmentDetails(p.data), ["subjectName", "subject_name"]) || "—",
  } as ColDef<AnyRow>,
  title: {
    headerName: "Title",
    minWidth: 160,
    valueGetter: (p) =>
      txt(assignmentDetails(p.data), ["title"]) || "—",
  } as ColDef<AnyRow>,
  submissionDueDate: {
    headerName: "Submission Date",
    minWidth: 140,
    valueGetter: (p) =>
      formatDisplayDate(assignmentDetails(p.data).submissionDueDate),
  } as ColDef<AnyRow>,
  allowLateDueDate: {
    headerName: "Submission Last Due Date",
    minWidth: 160,
    valueGetter: (p) =>
      formatDisplayDate(assignmentDetails(p.data).allowLateDueDate),
  } as ColDef<AnyRow>,
  status: {
    headerName: "Status",
    minWidth: 120,
    valueGetter: (p) => txt(p.data, ["wfName"]) || "—",
  } as ColDef<AnyRow>,
  doc: {
    headerName: "Assignment Doc",
    minWidth: 130,
  } as ColDef<AnyRow>,
  marksSecured: {
    headerName: "Marks",
    minWidth: 90,
    flex: 0,
  } as ColDef<AnyRow>,
  statusComments: {
    field: "statusComments",
    headerName: "Comments",
    minWidth: 140,
    valueGetter: (p) => txt(p.data, ["statusComments"]) || "—",
  } as ColDef<AnyRow>,
  actions: {
    headerName: "Actions",
    minWidth: 160,
    flex: 0,
    sortable: false,
    filter: false,
  } as ColDef<AnyRow>,
};

export function StudentAssignmentsPage() {
  const { user, isLoading: sessionLoading } = useSession();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rows, setRows] = useState<AnyRow[]>([]);
  const [submitRow, setSubmitRow] = useState<AnyRow | null>(null);
  const [summary, setSummary] = useState("");
  const [fileTooLarge, setFileTooLarge] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Angular: localStorage.studentId → listDetailsByTwoIdsWithSort(StudentAssignment, …)
      const storageStudentId = positiveId(readStorage("studentId"));
      const sessionStudentId = positiveId(user?.studentId);
      const studentId = sessionStudentId || storageStudentId;

      if (!studentId) {
        setRows([]);
        toastInfo("Student profile not available.");
        return;
      }

      const query = buildQuery(
        {
          "studentDetail.studentId": studentId,
          isActive: true,
        },
        { field: "studentAssignmentId", direction: "DESC" },
      );
      const list = await domainList<AnyRow>(
        ASSIGNMENT_API.STUDENT_ASSIGNMENT,
        query,
      );
      const now = new Date();
      const enriched = (Array.isArray(list) ? list : []).map((r) =>
        enrichAssignment(r, now),
      );
      setRows(enriched);
      if (enriched.length === 0) {
        toastInfo("No assignments found.");
      }
    } catch (e) {
      toastError(e, "Failed to load assignments");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (sessionLoading) return;
    void load();
  }, [sessionLoading, load]);

  const openSubmit = useCallback((row: AnyRow) => {
    setSubmitRow(row);
    setSummary(txt(row, ["studentSummary"]));
    setFileTooLarge(false);
    if (fileRef.current) fileRef.current.value = "";
  }, []);

  const closeSubmit = useCallback(() => {
    if (submitting) return;
    setSubmitRow(null);
    setSummary("");
    setFileTooLarge(false);
    if (fileRef.current) fileRef.current.value = "";
  }, [submitting]);

  const onFileChange = useCallback(() => {
    const file = fileRef.current?.files?.[0];
    if (file && file.size > MAX_FILE_BYTES) {
      setFileTooLarge(true);
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    setFileTooLarge(false);
  }, []);

  const handleSubmit = useCallback(
    async (e: { preventDefault: () => void }) => {
      e.preventDefault();
      if (!submitRow) return;

      const file = fileRef.current?.files?.[0] ?? null;
      if (!file) {
        toastInfo("To submit please upload assignment.");
        return;
      }
      if (file.size > MAX_FILE_BYTES) {
        setFileTooLarge(true);
        return;
      }

      setSubmitting(true);
      try {
        const details = assignmentDetails(submitRow);
        const collegeId = positiveId(
          submitRow.collegeId,
          details.collegeId,
        );

        // Angular getWorkflowStages → filter Draft/Submited; submit forces Submited stage
        let workflowStageId = positiveId(submitRow.workflowStageId);
        let assignmentSubmittedOn: string | null =
          submitRow.assignmentSubmittedOn != null
            ? String(submitRow.assignmentSubmittedOn)
            : null;

        if (collegeId) {
          const wfQuery = buildQuery({
            isActive: true,
            wfForCode: GM_CODES.ASSIGN_STATUS_WF,
            "College.collegeId": collegeId,
          });
          const stages = await domainList<AnyRow>(
            ENTITIES.WORKFLOW_STAGE.name,
            wfQuery,
          );
          const submitted = (Array.isArray(stages) ? stages : []).find(
            (s) => txt(s, ["wfCode"]) === "Submited",
          );
          if (submitted) {
            workflowStageId = positiveId(submitted.workflowStageId);
            assignmentSubmittedOn = new Date().toISOString();
          }
        }

        const payload: AnyRow = {
          assignmentSubmittedOn,
          isActive: submitRow.isActive ?? true,
          statusUpdatedOn: new Date().toISOString(),
          studentDescription: txt(submitRow, ["studentDescription"]),
          studentSummary: summary,
          isReviewCompleted: submitRow.isReviewCompleted ?? false,
          marksSecured: submitRow.marksSecured ?? null,
          reason: submitRow.reason ?? null,
          reviewComments: submitRow.reviewComments ?? null,
          statusComments: submitRow.statusComments ?? null,
          submssionFile: submitRow.submssionFile ?? null,
          assignmentId: positiveId(details.assignmentId),
          collegeId,
          workflowStageId,
          studentId: positiveId(
            submitRow.studentId,
            (submitRow.studentDetail as AnyRow | undefined)?.studentId,
          ),
        };
        const existingId = positiveId(submitRow.studentAssignmentId);
        if (existingId) payload.studentAssignmentId = existingId;

        const created = await postDetails<unknown>(
          ASSIGNMENT_API.STUDENT_ASSIGNMENT_POST,
          payload,
        );
        const studentAssignmentId = extractCreatedId(created) || String(existingId);

        if (studentAssignmentId) {
          const formData = new FormData();
          formData.append("studentAssignmentId", studentAssignmentId);
          formData.append("submissionfile", file, file.name);
          await uploadFile(ASSIGNMENT_API.STUDENT_UPLOAD, formData);
        }

        toastSuccess("Assignment submitted successfully.");
        setSubmitRow(null);
        setSummary("");
        setFileTooLarge(false);
        if (fileRef.current) fileRef.current.value = "";
        await load();
      } catch (err) {
        toastError(err, "Failed to submit assignment");
      } finally {
        setSubmitting(false);
      }
    },
    [submitRow, summary, load],
  );

  const columnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.subjectName,
      COL_DEFS.title,
      COL_DEFS.submissionDueDate,
      COL_DEFS.allowLateDueDate,
      COL_DEFS.status,
      { ...COL_DEFS.doc, cellRenderer: docsRenderer },
      { ...COL_DEFS.marksSecured, cellRenderer: marksRenderer },
      COL_DEFS.statusComments,
      {
        ...COL_DEFS.actions,
        cellRenderer: makeActionsRenderer(openSubmit),
      },
    ],
    [openSubmit],
  );

  const busy = sessionLoading || loading;
  const details = assignmentDetails(submitRow);
  const existingDoc = txt(submitRow, ["submssionFile"]);

  return (
    <>
      <ListPage
        title="Assignment List"
        columnDefs={columnDefs}
        rowData={rows}
        loading={busy}
        height="auto"
        pagination
        toolbar={{
          search: true,
          searchPlaceholder: "Search",
          exportExcel: true,
          exportPdf: true,
        }}
      />

      <FormModal
        open={Boolean(submitRow)}
        onClose={closeSubmit}
        title="Submit Assignment"
        onSubmit={handleSubmit}
        isSubmitting={submitting}
        submitLabel="Save"
        cancelLabel="Close"
        size="lg"
      >
        {submitRow ? (
          <div className="space-y-4">
            <div className="grid grid-cols-[7rem_1fr] gap-x-3 gap-y-2 text-sm">
              <span className="text-muted-foreground">Subject :</span>
              <span className="font-medium">
                {txt(details, ["subjectName"]) || "—"}
              </span>
              <span className="text-muted-foreground">Employee :</span>
              <span className="font-medium">
                {txt(details, ["empName"]) || "—"}
              </span>
              <span className="text-muted-foreground">Submission Date :</span>
              <span className="font-medium">
                {formatDisplayDate(details.submissionDueDate)}
              </span>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-sm font-semibold">Summary</h3>
              <Textarea
                placeholder="Summary"
                value={summary}
                onChange={(ev) => setSummary(ev.target.value)}
                rows={4}
              />
            </div>

            <div className="space-y-2 border-t pt-3">
              <strong className="text-sm">File Submission</strong>
              <input
                ref={fileRef}
                type="file"
                accept=".png,.jpg,.jpeg,.pdf,.doc"
                onChange={onFileChange}
                className="block w-full text-sm"
              />
              {existingDoc ? (
                <a
                  href={existingDoc}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-sm font-medium text-blue-600 underline"
                >
                  Submitted Doc
                </a>
              ) : null}
              {!fileTooLarge ? (
                <p className="text-sm font-semibold text-green-700">
                  File size should not greater than 24MB
                </p>
              ) : (
                <p className="text-sm font-semibold text-orange-600">
                  File size is greater than 24MB
                </p>
              )}
            </div>
          </div>
        ) : null}
      </FormModal>
    </>
  );
}
