"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format, isValid, parseISO } from "date-fns";
import { Eye } from "lucide-react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { FilteredListPage } from "@/components/layout";
import { FormModal } from "@/common/components/feedback";
import { DatePicker } from "@/common/components/date-picker";
import { Select, type SelectOption } from "@/common/components/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DATE_FORMATS } from "@/config/constants";
import { rowIndexGetter } from "@/lib/utils";
import { toastError, toastInfo, toastSuccess } from "@/lib/toast";
import { getErrorMessage } from "@/lib/errors";
import {
  listAssignmentReviewWorkflowStages,
  listStudentAssignmentsForStaff,
  saveStudentAssignmentReview,
} from "@/services";

type AnyRow = Record<string, unknown>;

function formatDisplayDate(value: unknown): string {
  if (value == null || value === "") return "—";
  const s = String(value).trim();
  const iso = parseISO(s);
  const d = isValid(iso) ? iso : new Date(s);
  if (!isValid(d)) return "—";
  return format(d, DATE_FORMATS.DISPLAY);
}

function txt(row: AnyRow | null | undefined, key: string): string {
  const v = row?.[key];
  return v != null && String(v).trim() !== "" ? String(v).trim() : "";
}

function assignmentDetails(row: AnyRow | null | undefined): AnyRow {
  const d = row?.assignmentDetails;
  return d && typeof d === "object" ? (d as AnyRow) : {};
}

function submittedWf(wfCode: string): boolean {
  return (
    wfCode === "Submited" ||
    wfCode === "Review" ||
    wfCode === "Completed" ||
    wfCode === "Reopen"
  );
}

function summaryRenderer(p: ICellRendererParams<AnyRow>) {
  const row = p.data;
  if (!row) return "—";
  const wf = txt(row, "wfCode");
  const summary = txt(row, "studentSummary");
  if (summary && submittedWf(wf)) return summary;
  return "—";
}

function docRenderer(p: ICellRendererParams<AnyRow>) {
  const row = p.data;
  if (!row) return "—";
  const wf = txt(row, "wfCode");
  const file = txt(row, "submssionFile");
  if (file && submittedWf(wf)) {
    return (
      <a
        href={file}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 underline"
      >
        Document
      </a>
    );
  }
  if (!file || wf === "Draft" || wf === "ASSIGNED") {
    return <span className="text-muted-foreground">No Docs Submitted</span>;
  }
  return "—";
}

function marksRenderer(p: ICellRendererParams<AnyRow>) {
  const marks = p.data?.marksSecured;
  if (marks != null && marks !== "") return String(marks);
  return "0";
}

function makeActionsRenderer(
  check: string,
  onReview: (row: AnyRow) => void,
  onMarks: (row: AnyRow) => void,
) {
  return (p: ICellRendererParams<AnyRow>) => {
    const row = p.data;
    if (!row) return null;
    const wf = txt(row, "wfCode");

    if (
      check === "1" &&
      (wf === "Submited" || wf === "Review" || wf === "Reopen")
    ) {
      return (
        <Button size="sm" onClick={() => onReview(row)}>
          Review
        </Button>
      );
    }
    if (wf === "Completed") {
      return (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onMarks(row)}
          aria-label="View marks"
        >
          <Eye className="h-4 w-4" />
        </Button>
      );
    }
    if (wf === "Draft" || wf === "ASSIGNED") return "—";
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
  stdName: {
    headerName: "Student",
    minWidth: 200,
    valueGetter: (p) => {
      const row = p.data ?? {};
      const name = txt(row, "stdName");
      const roll = txt(row, "rollNumber");
      return roll ? `${name} (${roll})` : name;
    },
  } as ColDef<AnyRow>,
  studentSummary: {
    headerName: "Summary",
    minWidth: 180,
    flex: 1,
  } as ColDef<AnyRow>,
  statusUpdatedOn: {
    field: "statusUpdatedOn",
    headerName: "Status UpdatedOn",
    minWidth: 140,
    valueFormatter: (p) => formatDisplayDate(p.value),
  } as ColDef<AnyRow>,
  assignmentSubmittedOn: {
    field: "assignmentSubmittedOn",
    headerName: "Submitted On",
    minWidth: 130,
    valueFormatter: (p) => formatDisplayDate(p.value),
  } as ColDef<AnyRow>,
  wfCode: {
    field: "wfCode",
    headerName: "Status",
    minWidth: 110,
    cellRenderer: (p: ICellRendererParams<AnyRow>) => (
      <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
        {txt(p.data ?? {}, "wfCode") || "—"}
      </span>
    ),
  } as ColDef<AnyRow>,
  file: {
    headerName: "Submitted Doc",
    minWidth: 140,
    sortable: false,
    filter: false,
  } as ColDef<AnyRow>,
  marksSecured: {
    headerName: "Marks",
    minWidth: 80,
    flex: 0,
  } as ColDef<AnyRow>,
  actions: {
    headerName: "Actions",
    minWidth: 110,
    flex: 0,
    sortable: false,
    filter: false,
  } as ColDef<AnyRow>,
};

function ReviewModal({
  open,
  row,
  onClose,
  onSaved,
}: {
  open: boolean;
  row: AnyRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [workflowStageId, setWorkflowStageId] = useState<string | null>(null);
  const [marksSecured, setMarksSecured] = useState("");
  const [statusComments, setStatusComments] = useState("");
  const [statusUpdatedOn, setStatusUpdatedOn] = useState<Date | undefined>(
    () => new Date(),
  );
  const [wfOptions, setWfOptions] = useState<SelectOption[]>([]);

  const details = assignmentDetails(row);

  useEffect(() => {
    if (!open || !row) return;
    setWorkflowStageId(
      row.workflowStageId != null ? String(row.workflowStageId) : null,
    );
    setMarksSecured(
      row.marksSecured != null ? String(row.marksSecured) : "",
    );
    setStatusComments(txt(row, "statusComments"));
    const d = row.statusUpdatedOn ? new Date(String(row.statusUpdatedOn)) : new Date();
    setStatusUpdatedOn(Number.isNaN(d.getTime()) ? new Date() : d);

    const collegeId = Number(row.collegeId ?? 0);
    void listAssignmentReviewWorkflowStages(collegeId).then((stages) => {
      setWfOptions(
        stages.map((s) => ({
          value: String(s.workflowStageId ?? ""),
          label: String(s.wfName ?? s.workflowStageId ?? ""),
        })),
      );
    });
  }, [open, row]);

  const handleSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (!row || !workflowStageId) {
      toastInfo("Please select status.");
      return;
    }
    setSaving(true);
    try {
      const payload: AnyRow = {
        ...row,
        statusComments,
        statusUpdatedOn,
        workflowStageId: Number(workflowStageId),
        marksSecured: marksSecured === "" ? null : Number(marksSecured),
      };
      await saveStudentAssignmentReview(payload);
      toastSuccess("Review saved successfully.");
      onSaved();
      onClose();
    } catch (err) {
      toastError(getErrorMessage(err), "Failed to save review");
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormModal
      open={open}
      onClose={() => {
        if (!saving) onClose();
      }}
      title="Review Assignment"
      onSubmit={handleSubmit}
      isSubmitting={saving}
      size="lg"
      showHeaderDivider
    >
      <div className="space-y-3 text-sm">
        <p>
          <span className="text-muted-foreground">Title: </span>
          <span className="font-medium">{txt(details, "title")}</span>
        </p>
        <p>
          <span className="text-muted-foreground">Description: </span>
          <span>{txt(details, "description")}</span>
        </p>
        <p>
          <span className="text-muted-foreground">Subject: </span>
          <span>{txt(details, "subjectName")}</span>
        </p>
        <p>
          <span className="text-muted-foreground">Employee: </span>
          <span>{txt(details, "empName")}</span>
        </p>
        <p>
          <span className="text-muted-foreground">Submission Date: </span>
          <span>{formatDisplayDate(details.submissionDueDate)}</span>
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
          <div className="space-y-1">
            <Label>Marks Secured</Label>
            <Input
              type="number"
              step="any"
              value={marksSecured}
              onChange={(ev) => setMarksSecured(ev.target.value)}
            />
          </div>
          <Select
            label="Status *"
            value={workflowStageId}
            onChange={setWorkflowStageId}
            options={wfOptions}
            searchable
          />
        </div>

        <div className="space-y-1">
          <Label>Status Comments</Label>
          <Textarea
            value={statusComments}
            onChange={(ev) => setStatusComments(ev.target.value)}
            rows={3}
          />
        </div>

        <DatePicker
          label="Status Updated On"
          value={statusUpdatedOn}
          onChange={setStatusUpdatedOn}
        />
      </div>
    </FormModal>
  );
}

function MarksModal({
  open,
  row,
  onClose,
}: {
  open: boolean;
  row: AnyRow | null;
  onClose: () => void;
}) {
  const details = assignmentDetails(row);
  return (
    <FormModal
      open={open}
      onClose={onClose}
      title="Marks Published"
      onSubmit={(e) => {
        e.preventDefault();
        onClose();
      }}
      submitLabel="Close"
      showCancelButton={false}
      size="md"
      showHeaderDivider
    >
      {row ? (
        <div className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">Title: </span>
            {txt(details, "title")}
          </p>
          <p>
            <span className="text-muted-foreground">Description: </span>
            {txt(details, "description")}
          </p>
          <p>
            <span className="text-muted-foreground">Subject: </span>
            {txt(details, "subjectName")}
          </p>
          <p>
            <span className="text-muted-foreground">Employee: </span>
            {txt(details, "empName")}
          </p>
          <p>
            <span className="text-muted-foreground">Submission Date: </span>
            {formatDisplayDate(details.submissionDueDate)}
          </p>
          <p>
            <span className="text-muted-foreground">Student Summary: </span>
            {txt(row, "studentSummary")}
          </p>
          <p>
            <span className="text-muted-foreground">Marks Secured: </span>
            {row.marksSecured != null ? String(row.marksSecured) : "—"}
          </p>
          <p>
            <span className="text-muted-foreground">Status Updated On: </span>
            {formatDisplayDate(row.statusUpdatedOn)}
          </p>
          <p>
            <span className="text-muted-foreground">Status Comments: </span>
            {txt(row, "statusComments")}
          </p>
        </div>
      ) : null}
    </FormModal>
  );
}

export function ViewAssignmentSubmissionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const assignmentId = Number(searchParams.get("assignmentId") ?? 0);
  const check = searchParams.get("check") ?? "1";
  const subjectName = searchParams.get("subjectName") ?? "";
  const title = searchParams.get("title") ?? "";
  const courseYearName = searchParams.get("courseYearName") ?? "";
  const section = searchParams.get("section") ?? "";

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<AnyRow[]>([]);
  const [reviewRow, setReviewRow] = useState<AnyRow | null>(null);
  const [marksRow, setMarksRow] = useState<AnyRow | null>(null);

  const load = useCallback(async () => {
    if (!assignmentId) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const list = await listStudentAssignmentsForStaff({ assignmentId });
      setRows(list);
      if (list.length === 0) toastInfo("No student submissions found.");
    } catch (e) {
      toastError(e, "Failed to load submissions");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [assignmentId]);

  useEffect(() => {
    void load();
  }, [load]);

  const pageTitle = `Student Assignment List - ( ${subjectName} - ${title} ) [ ${courseYearName}- ${section} ]`;

  const columnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.stdName,
      { ...COL_DEFS.studentSummary, cellRenderer: summaryRenderer },
      COL_DEFS.statusUpdatedOn,
      COL_DEFS.assignmentSubmittedOn,
      COL_DEFS.wfCode,
      { ...COL_DEFS.file, cellRenderer: docRenderer },
      { ...COL_DEFS.marksSecured, cellRenderer: marksRenderer },
      {
        ...COL_DEFS.actions,
        cellRenderer: makeActionsRenderer(
          check,
          setReviewRow,
          setMarksRow,
        ),
      },
    ],
    [check],
  );

  const goBack = () => {
    const params = new URLSearchParams();
    const copyKeys = [
      "employeeId",
      "check",
      "empNumber",
      "groupSectionId",
      "courseYearId",
      "courseGroupId",
      "staffCourseyrSubjectId",
    ];
    for (const key of copyKeys) {
      const v = searchParams.get(key);
      if (v) params.set(key, v);
    }
    router.push(`/staff-classes/assignments?${params.toString()}`);
  };

  return (
    <>
      <FilteredListPage
        title={pageTitle}
        filters={<span className="sr-only">Submissions</span>}
        filtersCollapsible={false}
        rowData={rows}
        columnDefs={columnDefs}
        loading={loading}
        pagination
        paginationPageSize={10}
        toolbar={{ searchPlaceholder: "Search" }}
        toolbarTrailing={
          <Button type="button" variant="outline" onClick={goBack}>
            Back
          </Button>
        }
      />

      <ReviewModal
        open={reviewRow != null}
        row={reviewRow}
        onClose={() => setReviewRow(null)}
        onSaved={() => void load()}
      />

      <MarksModal
        open={marksRow != null}
        row={marksRow}
        onClose={() => setMarksRow(null)}
      />
    </>
  );
}
