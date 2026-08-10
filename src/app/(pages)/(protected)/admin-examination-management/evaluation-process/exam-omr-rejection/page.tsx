"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { Eye } from "lucide-react";
import { FilteredPage } from "@/components/layout";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
import { DataTable } from "@/common/components/table";
import { Select, type SelectOption } from "@/common/components/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { toastError } from "@/lib/toast";
import { rowIndexGetter } from "@/lib/utils";
import {
  getExamCenterFilterGroups,
  getExamRejectDetails,
  getEvaluatedAnswerPaperPresignedUrl,
  pickEgAyFilterRows,
  updateRejectProcessedReason,
} from "@/services";

type AnyRow = Record<string, any>;

type PendingRow = AnyRow & {
  rejectProcessed?: boolean;
  rejectProcessedReason?: string;
};

const toastInfo = (msg: string) => toast.info(msg);

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function txt(v: unknown): string {
  if (typeof v === "string") return v.trim();
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
}

function dedupeBy<T>(rows: T[], keyFn: (r: T) => number | string): T[] {
  const seen = new Set<number | string>();
  return rows.filter((r) => {
    const key = keyFn(r);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function assignmentIdOf(row: AnyRow | null | undefined): number {
  return num(
    row?.pk_exam_evaluationassignment_id ?? row?.examEvaluationAssignmentId,
  );
}

async function viewAnswerPaper(path: unknown) {
  const paperPath = txt(path);
  if (!paperPath) return;
  try {
    const data = await getEvaluatedAnswerPaperPresignedUrl(paperPath);
    const url = data?.evaluatedAnswerPaperUrl;
    if (url == null || String(url).trim() === "") {
      toastError("Answer sheet URL not available.");
      return;
    }
    globalThis?.open?.(String(url), "_blank", "width=680,height=600");
  } catch (err) {
    toastError(
      err instanceof Error ? err.message : "Failed to open answer sheet.",
    );
  }
}

function makeAnswerSheetRenderer() {
  return (p: ICellRendererParams<AnyRow>) => {
    const path = txt(p.data?.answerpaper_path);
    if (!path) return null;
    return (
      <button
        type="button"
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#0c51a4] hover:bg-[#0c51a4]/10"
        title="View"
        onClick={() => void viewAnswerPaper(path)}
      >
        <Eye className="h-4 w-4" aria-hidden />
      </button>
    );
  };
}

function makeRejectProcessedRenderer(
  onToggle: (assignmentId: number, checked: boolean) => void,
) {
  return (p: ICellRendererParams<PendingRow>) => {
    const id = assignmentIdOf(p.data);
    const checked = p.data?.rejectProcessed === true;
    return (
      <div className="flex h-full items-center justify-center">
        <Checkbox
          checked={checked}
          onCheckedChange={(v) => onToggle(id, v === true)}
          aria-label="Reject processed"
        />
      </div>
    );
  };
}

function makeResolutionRenderer(
  onChange: (assignmentId: number, reason: string) => void,
) {
  return (p: ICellRendererParams<PendingRow>) => {
    const id = assignmentIdOf(p.data);
    const enabled = p.data?.rejectProcessed === true;
    return (
      <Input
        className="h-8"
        placeholder="Enter Resolution"
        value={txt(p.data?.rejectProcessedReason)}
        disabled={!enabled}
        onChange={(e) => onChange(id, e.target.value)}
      />
    );
  };
}

async function downloadRowsAsExcel(
  rows: Record<string, string | number>[],
  sheetName: string,
  fileName: string,
) {
  if (rows.length === 0) {
    toastInfo("No data available to export");
    return;
  }
  const XLSX = await import("xlsx");
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, fileName);
}

export default function ExamOmrRejectionPage() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [egFilterRows, setEgFilterRows] = useState<AnyRow[]>([]);
  const [examCenters, setExamCenters] = useState<AnyRow[]>([]);
  const [pendingRows, setPendingRows] = useState<PendingRow[]>([]);
  const [processedRows, setProcessedRows] = useState<AnyRow[]>([]);
  const [hasFetched, setHasFetched] = useState(false);

  const [academicYearId, setAcademicYearId] = useState<number | null>(null);
  const [examGroupId, setExamGroupId] = useState<number | null>(null);
  const [examCenterId, setExamCenterId] = useState<number | null>(null);

  const centerReqSeq = useRef(0);

  const academicYears = useMemo(
    () => dedupeBy(egFilterRows, (r) => num(r.fk_academic_year_id)),
    [egFilterRows],
  );

  const examGroups = useMemo(() => {
    if (!academicYearId) return [];
    return dedupeBy(
      egFilterRows.filter(
        (r) => num(r.fk_academic_year_id) === Number(academicYearId),
      ),
      (r) => num(r.fk_univ_exam_group_id),
    );
  }, [egFilterRows, academicYearId]);

  const academicYearOptions = useMemo<SelectOption[]>(
    () =>
      academicYears.map((r) => ({
        value: String(num(r.fk_academic_year_id)),
        label: txt(r.academic_year),
      })),
    [academicYears],
  );

  const examGroupOptions = useMemo<SelectOption[]>(
    () =>
      examGroups.map((r) => ({
        value: String(num(r.fk_univ_exam_group_id)),
        label: txt(r.exam_group_code),
      })),
    [examGroups],
  );

  const examCenterOptions = useMemo<SelectOption[]>(
    () =>
      examCenters.map((r) => ({
        value: String(num(r.fk_univ_ec_id)),
        label: txt(r.ec_name),
        title: txt(r.ec_name),
      })),
    [examCenters],
  );

  const examGroupCode = useMemo(
    () =>
      txt(
        examGroups.find(
          (r) => num(r.fk_univ_exam_group_id) === Number(examGroupId),
        )?.exam_group_code,
      ),
    [examGroups, examGroupId],
  );

  const examCenterName = useMemo(
    () =>
      txt(
        examCenters.find((r) => num(r.fk_univ_ec_id) === Number(examCenterId))
          ?.ec_name,
      ),
    [examCenters, examCenterId],
  );

  const payloadData = useMemo(
    () =>
      pendingRows
        .filter((row) => row.rejectProcessed === true)
        .map((row) => ({
          examEvaluationAssignmentId: assignmentIdOf(row),
          rejectProcessed: true,
          rejectProcessedReason: txt(row.rejectProcessedReason),
        }))
        .filter((row) => row.examEvaluationAssignmentId > 0),
    [pendingRows],
  );

  function clearResults() {
    setPendingRows([]);
    setProcessedRows([]);
    setHasFetched(false);
  }

  function clearBelowAcademicYear() {
    setExamGroupId(null);
    setExamCenterId(null);
    setExamCenters([]);
    clearResults();
  }

  function clearBelowExamGroup() {
    setExamCenterId(null);
    setExamCenters([]);
    clearResults();
  }

  /** Angular selectedAcademicYear → exam groups for AY → first group. */
  function applyAcademicYear(
    nextAyId: number | null,
    fromRows: AnyRow[] = egFilterRows,
  ) {
    centerReqSeq.current += 1;
    setAcademicYearId(nextAyId);
    clearBelowAcademicYear();
    if (!nextAyId) return;
    const groups = dedupeBy(
      fromRows.filter((r) => num(r.fk_academic_year_id) === nextAyId),
      (r) => num(r.fk_univ_exam_group_id),
    );
    const firstGroup = num(groups[0]?.fk_univ_exam_group_id) || null;
    if (firstGroup) applyExamGroup(firstGroup, nextAyId);
  }

  /** Angular selectedExamGroup → eg_ec_filters → first center. */
  function applyExamGroup(
    nextGroupId: number | null,
    forAyId = academicYearId,
  ) {
    setExamGroupId(nextGroupId);
    clearBelowExamGroup();
    if (!nextGroupId || !forAyId) return;
    const seq = ++centerReqSeq.current;
    void (async () => {
      try {
        const groups = await getExamCenterFilterGroups({
          flag: "eg_ec_filters",
          examGroupId: nextGroupId,
          academicYearId: forAyId,
        });
        if (seq !== centerReqSeq.current) return;
        const list = Array.isArray(groups[0]) ? groups[0] : [];
        const centers = dedupeBy(list, (r) => num(r.fk_univ_ec_id));
        setExamCenters(centers);
        const firstCenter = num(centers[0]?.fk_univ_ec_id) || null;
        if (firstCenter) {
          setExamCenterId(firstCenter);
          clearResults();
        }
      } catch (err) {
        if (seq !== centerReqSeq.current) return;
        toastError(err, "Failed to load exam centers");
        setExamCenters([]);
      }
    })();
  }

  function applyExamCenter(nextCenterId: number | null) {
    setExamCenterId(nextCenterId);
    clearResults();
  }

  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const groups = await getExamCenterFilterGroups({ flag: "eg_filters" });
        const rows = pickEgAyFilterRows(groups);
        setEgFilterRows(rows);
        const years = dedupeBy(rows, (r) => num(r.fk_academic_year_id));
        const firstAy = num(years[0]?.fk_academic_year_id) || null;
        if (firstAy) applyAcademicYear(firstAy, rows);
      } catch (err) {
        toastError(err, "Failed to load filters");
      } finally {
        setLoading(false);
      }
    }
    void init();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Angular ctor getExamGroupDetails once
  }, []);

  async function onGetList() {
    if (!academicYearId || !examGroupId || !examCenterId) {
      toastInfo("Please Select Required Filters");
      return;
    }
    setLoading(true);
    clearResults();
    try {
      const { pending, processed } = await getExamRejectDetails({
        academicYearId,
        examGroupId,
        examCenterId,
      });
      setPendingRows(
        (Array.isArray(pending) ? pending : []).map((row) => ({
          ...row,
          rejectProcessed: false,
          rejectProcessedReason: "",
        })),
      );
      setProcessedRows(Array.isArray(processed) ? processed : []);
      setHasFetched(true);
    } catch (err) {
      toastError(err, "Failed to load rejection details");
    } finally {
      setLoading(false);
    }
  }

  function onRejectProcessedChange(assignmentId: number, checked: boolean) {
    setPendingRows((prev) =>
      prev.map((row) =>
        assignmentIdOf(row) === assignmentId
          ? {
              ...row,
              rejectProcessed: checked,
              rejectProcessedReason: checked
                ? txt(row.rejectProcessedReason)
                : "",
            }
          : row,
      ),
    );
  }

  function onResolutionChange(assignmentId: number, reason: string) {
    setPendingRows((prev) =>
      prev.map((row) =>
        assignmentIdOf(row) === assignmentId
          ? { ...row, rejectProcessedReason: reason }
          : row,
      ),
    );
  }

  async function onSave() {
    if (payloadData.length === 0) {
      toastInfo("Please Select OMR...!");
      return;
    }
    setSaving(true);
    try {
      await updateRejectProcessedReason(payloadData);
      await onGetList();
    } catch (err) {
      toastError(err, "Failed to save rejection resolutions");
    } finally {
      setSaving(false);
    }
  }

  async function exportPendingExcel(filtered: PendingRow[]) {
    const exportData = filtered.map((row, index) => ({
      "SL No.": index + 1,
      "Omr Serial No": txt(row.omr_serial_no),
      "Ec Seat No": txt(row.ec_seatno),
      "Reject Reason": txt(row.reject_reason),
    }));
    await downloadRowsAsExcel(
      exportData,
      "Evaluation Rejection",
      "Evaluation_Rejection.xlsx",
    );
  }

  async function exportProcessedExcel() {
    const exportData = processedRows.map((row, index) => ({
      "SL No.": index + 1,
      "Omr Serial No": txt(row.omr_serial_no),
      "Ec Seat No": txt(row.ec_seatno),
      "Reject Reason": txt(row.reject_reason),
      Resolution: txt(row.reject_processed_reason),
      "Evaluation Status": txt(row.evaluation_status),
    }));
    await downloadRowsAsExcel(
      exportData,
      "Processed Rejection",
      "Processed_Evaluation_Rejection.xlsx",
    );
  }

  const pendingColumnDefs = useMemo<ColDef<PendingRow>[]>(
    () => [
      {
        headerName: "SL No.",
        valueGetter: rowIndexGetter,
        width: 80,
        flex: 0,
      },
      {
        headerName: "Omr Serial No.",
        field: "omr_serial_no",
        minWidth: 140,
        valueGetter: (p) => txt(p.data?.omr_serial_no),
      },
      {
        headerName: "Ec Seat No.",
        field: "ec_seatno",
        minWidth: 120,
        valueGetter: (p) => txt(p.data?.ec_seatno),
      },
      {
        headerName: "Reject Reason",
        field: "reject_reason",
        minWidth: 180,
        flex: 1,
        valueGetter: (p) => txt(p.data?.reject_reason),
      },
      {
        headerName: "Reject Processed",
        minWidth: 140,
        flex: 0,
        cellRenderer: makeRejectProcessedRenderer(onRejectProcessedChange),
      },
      {
        headerName: "Resolution",
        minWidth: 220,
        flex: 1,
        cellRenderer: makeResolutionRenderer(onResolutionChange),
      },
      {
        headerName: "AnswerSheet",
        minWidth: 110,
        flex: 0,
        cellRenderer: makeAnswerSheetRenderer(),
      },
    ],
    [],
  );

  const processedColumnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      {
        headerName: "SL No.",
        valueGetter: rowIndexGetter,
        width: 80,
        flex: 0,
      },
      {
        headerName: "Omr Serial No.",
        minWidth: 140,
        valueGetter: (p) => txt(p.data?.omr_serial_no),
      },
      {
        headerName: "Ec Seat No.",
        minWidth: 120,
        valueGetter: (p) => txt(p.data?.ec_seatno),
      },
      {
        headerName: "Reject Reason",
        minWidth: 180,
        flex: 1,
        valueGetter: (p) => txt(p.data?.reject_reason),
      },
      {
        headerName: "Resolution",
        minWidth: 180,
        flex: 1,
        valueGetter: (p) => txt(p.data?.reject_processed_reason),
      },
      {
        headerName: "AnswerSheet",
        minWidth: 110,
        flex: 0,
        cellRenderer: makeAnswerSheetRenderer(),
      },
      {
        headerName: "Evaluation Status",
        minWidth: 150,
        flex: 1,
        valueGetter: (p) => txt(p.data?.evaluation_status),
      },
    ],
    [],
  );

  const listTitle =
    examGroupCode || examCenterName
      ? `Evaluation Rejection - ${examGroupCode} / ${examCenterName}`
      : "Evaluation Rejection";

  function ListContextHeader() {
    return (
      <div className="table-context-header">
        <span className="material-icons table-context-header__icon" aria-hidden>
          ballot
        </span>
        <strong className="table-context-header__title">{listTitle}</strong>
      </div>
    );
  }

  return (
    <FilteredPage
      title="Evaluation Rejection"
      filters={
        <GlobalFilterBarRow className="global-filter-bar__row--eval-reject">
          <GlobalFilterField
            label="Academic Year"
            className="global-filter-field--fx20"
          >
            <Select
              value={academicYearId ? String(academicYearId) : null}
              onChange={(v) => applyAcademicYear(v ? Number(v) : null)}
              options={academicYearOptions}
              placeholder="Academic Year"
              disabled={loading}
            />
          </GlobalFilterField>
          <GlobalFilterField
            label="Exam Group"
            className="global-filter-field--fx30"
          >
            <Select
              value={examGroupId ? String(examGroupId) : null}
              onChange={(v) => applyExamGroup(v ? Number(v) : null)}
              options={examGroupOptions}
              placeholder="Exam Group"
              disabled={!academicYearId || loading}
            />
          </GlobalFilterField>
          <GlobalFilterField
            label="Exam Center"
            className="global-filter-field--fx25"
          >
            <Select
              value={examCenterId ? String(examCenterId) : null}
              onChange={(v) => applyExamCenter(v ? Number(v) : null)}
              options={examCenterOptions}
              placeholder="Exam Center"
              searchable
              disabled={!examGroupId || loading}
            />
          </GlobalFilterField>
          <GlobalFilterField
            label=" "
            className="global-filter-field--action global-filter-field--fx10"
          >
            <Button
              size="sm"
              className="h-10 shrink-0 w-full"
              onClick={() => void onGetList()}
              disabled={loading}
            >
              Get List
            </Button>
          </GlobalFilterField>
        </GlobalFilterBarRow>
      }
      body={
        hasFetched && pendingRows.length > 0 ? (
          <div className="space-y-3">
            <DataTable
              title=""
              subtitle=""
              columnFilters={false}
              rowData={pendingRows}
              columnDefs={pendingColumnDefs}
              getRowId={(p) =>
                String(assignmentIdOf(p.data) || p.data?.omr_serial_no || "")
              }
              toolbar={{
                search: true,
                searchPlaceholder: "Search",
                columnPicker: false,
                exportPdf: false,
                exportExcel: true,
                columnFilters: false,
                excelFileName: "Evaluation_Rejection.xlsx",
                excelDocumentTitle: "Evaluation Rejection",
              }}
              onExportExcel={() => {
                void exportPendingExcel(pendingRows);
              }}
              height="420px"
            />
            {payloadData.length > 0 ? (
              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={() => void onSave()}
                  disabled={saving || loading}
                >
                  Save
                </Button>
              </div>
            ) : null}
          </div>
        ) : hasFetched &&
          pendingRows.length === 0 &&
          processedRows.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-muted-foreground">
            No rejection records found for the selected filters.
          </div>
        ) : undefined
      }
      tableHeader={
        hasFetched && pendingRows.length > 0 ? <ListContextHeader /> : null
      }
    >
      {hasFetched && processedRows.length > 0 ? (
        <div className="app-card app-data-table-card overflow-hidden">
          <div className="px-5 pt-2">
            <ListContextHeader />
          </div>
          <div className="space-y-3 px-5 pb-4">
            <DataTable
              title=""
              subtitle=""
              columnFilters={false}
              rowData={processedRows}
              columnDefs={processedColumnDefs}
              getRowId={(p) =>
                String(
                  assignmentIdOf(p.data) ||
                    `${txt(p.data?.omr_serial_no)}-${txt(p.data?.ec_seatno)}`,
                )
              }
              toolbar={{
                search: true,
                searchPlaceholder: "Search",
                columnPicker: false,
                exportPdf: false,
                exportExcel: true,
                columnFilters: false,
                excelFileName: "Processed_Evaluation_Rejection.xlsx",
                excelDocumentTitle: "Processed Rejection",
              }}
              onExportExcel={() => {
                void exportProcessedExcel();
              }}
              height="360px"
            />
          </div>
        </div>
      ) : null}
    </FilteredPage>
  );
}
