"use client";

/**
 * View Answer Papers — Angular parity for
 * evaluation-process/view-answer-papers
 *
 * Modes: Search By OMR (default) | All (AY → Exam Group → Exam Date → QP → Get List)
 */

import { useEffect, useMemo, useRef, useState } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { Eye, QrCode } from "lucide-react";
import { FilteredListPage, PageContainer } from "@/components/layout";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
import { DataTable } from "@/common/components/table";
import { Select, type SelectOption } from "@/common/components/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { toastError, toastSuccess } from "@/lib/toast";
import { rowIndexGetter } from "@/lib/utils";
import {
  getExamCenterFilterGroups,
  getViewAnswerPaperDetails,
  getViewAnswerPaperPresignedUrl,
  pickEgAyFilterRows,
} from "@/services";

type AnyRow = Record<string, any>;

type OmrRow = {
  omrSerialNo: string;
  examStdDetId: number;
  hallticketNumber: string;
  answerPaperPath: string;
  evaluatedAnswerPaperPath: string;
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

function qpCodeOf(row: AnyRow): string {
  return txt(row.questionpaper_code ?? row.questionPaperCode);
}

function qpLabelOf(row: AnyRow): string {
  return (
    txt(
      row.Questionpaper_name ?? row.questionpaper_name ?? row.questionPaperName,
    ) || qpCodeOf(row)
  );
}

async function openAnswerPaper(
  path: unknown,
  type: "answerPaperPath" | "evaluatedAnswerPaperPath",
) {
  const paperPath = txt(path);
  if (!paperPath) return;
  try {
    const url = await getViewAnswerPaperPresignedUrl(paperPath, type);
    if (!url) {
      toastError("Answer sheet URL not available.");
      return;
    }
    globalThis?.open?.(url, "_blank", "width=680,height=600");
  } catch (err) {
    toastError(
      err instanceof Error ? err.message : "Failed to open answer sheet.",
    );
  }
}

function makeEyeRenderer(
  pathKeys: string[],
  type: "answerPaperPath" | "evaluatedAnswerPaperPath",
) {
  return (p: ICellRendererParams<AnyRow>) => {
    const path = pathKeys.map((k) => txt(p.data?.[k])).find(Boolean) ?? "";
    if (!path) return null;
    return (
      <button
        type="button"
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#0c51a4] hover:bg-[#0c51a4]/10"
        title="View"
        onClick={() => void openAnswerPaper(path, type)}
      >
        <Eye className="h-4 w-4" aria-hidden />
      </button>
    );
  };
}

export default function ViewAnswerPapersPage() {
  // Angular check: 2 = Search By OMR (default), 1 = All
  const [mode, setMode] = useState<"omr" | "all">("omr");
  const [loading, setLoading] = useState(false);

  const [ayRows, setAyRows] = useState<AnyRow[]>([]);
  const [examGroups, setExamGroups] = useState<AnyRow[]>([]);
  const [examDates, setExamDates] = useState<AnyRow[]>([]);
  const [questionPapers, setQuestionPapers] = useState<AnyRow[]>([]);

  const [academicYearId, setAcademicYearId] = useState<number | null>(null);
  const [examGroupId, setExamGroupId] = useState<number | null>(null);
  const [examDate, setExamDate] = useState<string | null>(null);
  const [questionPaperCode, setQuestionPaperCode] = useState<string | null>(
    null,
  );

  const [answerPapersList, setAnswerPapersList] = useState<AnyRow[]>([]);
  const [selectedOmrDetails, setSelectedOmrDetails] = useState<OmrRow[]>([]);
  const [barcodeValue, setBarcodeValue] = useState("");
  const barcodeRef = useRef<HTMLInputElement>(null);
  const omrSearchBusy = useRef(false);
  // Track last OMR query to avoid duplicate fires while typing past length 4
  const lastOmrQuery = useRef("");

  const employeeId = Number(
    globalThis?.localStorage?.getItem("employeeId") ?? 0,
  );

  const academicYears = useMemo(
    () => dedupeBy(ayRows, (r) => num(r.fk_academic_year_id)),
    [ayRows],
  );

  const ayOptions = useMemo<SelectOption[]>(
    () =>
      academicYears.map((r) => ({
        value: String(num(r.fk_academic_year_id)),
        label: txt(r.academic_year),
        title: txt(r.academic_year),
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

  const examDateOptions = useMemo<SelectOption[]>(
    () =>
      examDates.map((r) => ({
        value: txt(r.exam_date),
        label: txt(r.exam_date),
      })),
    [examDates],
  );

  const qpOptions = useMemo<SelectOption[]>(
    () =>
      questionPapers.map((r) => ({
        value: qpCodeOf(r),
        label: qpLabelOf(r),
      })),
    [questionPapers],
  );

  const headerSubtitle = useMemo(() => {
    const groupCode = txt(
      examGroups.find((r) => num(r.fk_univ_exam_group_id) === num(examGroupId))
        ?.exam_group_code,
    );
    // Angular: examGroupCode / examCenterCode / examDate / questionPaperCode
    // examCenterCode is never assigned in Angular headerData — leave blank.
    return `${groupCode} /  / ${txt(examDate)} / ${txt(questionPaperCode)}`;
  }, [examGroups, examGroupId, examDate, questionPaperCode]);

  function clearResults() {
    setAnswerPapersList([]);
    setSelectedOmrDetails([]);
    setBarcodeValue("");
    lastOmrQuery.current = "";
  }

  async function loadQuestionPapers(
    nextDate: string,
    forGroupId: number,
    forAyId: number,
  ) {
    setLoading(true);
    try {
      const groups = await getExamCenterFilterGroups({
        flag: "eg_ec_qc_filters",
        examGroupId: forGroupId,
        academicYearId: forAyId,
        examDate: nextDate,
      });
      const qps = (groups[0] ?? []).filter((r) => qpCodeOf(r));
      setQuestionPapers(qps);
      const firstQp = qpCodeOf(qps[0]) || null;
      setQuestionPaperCode(firstQp);
      if (!firstQp) toastSuccess("No question papers found.");
    } catch (err) {
      toastError(err, "Failed to load question papers");
    } finally {
      setLoading(false);
    }
  }

  async function loadExamDates(nextGroupId: number, forAyId: number) {
    setLoading(true);
    try {
      const groups = await getExamCenterFilterGroups({
        flag: "eg_ec_filters",
        examGroupId: nextGroupId,
        academicYearId: forAyId,
      });
      const rows = groups[0] ?? [];
      const dates = dedupeBy(rows, (r) => txt(r.exam_date)).filter((r) =>
        txt(r.exam_date),
      );
      setExamDates(dates);
      const firstDate = txt(dates[0]?.exam_date) || null;
      setExamDate(firstDate);
      setQuestionPaperCode(null);
      setQuestionPapers([]);
      if (firstDate) {
        await loadQuestionPapers(firstDate, nextGroupId, forAyId);
      } else {
        toastSuccess("No exam dates found.");
        setLoading(false);
      }
    } catch (err) {
      toastError(err, "Failed to load exam dates");
      setLoading(false);
    }
  }

  function applyAcademicYear(nextAyId: number | null, fromRows: AnyRow[]) {
    setAcademicYearId(nextAyId);
    setExamGroupId(null);
    setExamDate(null);
    setQuestionPaperCode(null);
    setExamGroups([]);
    setExamDates([]);
    setQuestionPapers([]);
    clearResults();
    if (!nextAyId) return;
    const groups = dedupeBy(
      fromRows.filter((r) => num(r.fk_academic_year_id) === nextAyId),
      (r) => num(r.fk_univ_exam_group_id),
    );
    setExamGroups(groups);
    const first = num(groups[0]?.fk_univ_exam_group_id) || null;
    if (first) {
      setExamGroupId(first);
      void loadExamDates(first, nextAyId);
    }
  }

  async function loadExamGroupDetails() {
    setLoading(true);
    try {
      const groups = await getExamCenterFilterGroups({ flag: "eg_filters" });
      const rows = pickEgAyFilterRows(groups);
      setAyRows(rows);
      const years = dedupeBy(rows, (r) => num(r.fk_academic_year_id));
      if (years.length > 0) {
        applyAcademicYear(num(years[0].fk_academic_year_id), rows);
      } else {
        toastSuccess("No academic years found.");
      }
    } catch (err) {
      toastError(err, "Failed to load filters");
    } finally {
      setLoading(false);
    }
  }

  function onModeChange(next: "omr" | "all") {
    setMode(next);
    clearResults();
    setAcademicYearId(null);
    setExamGroupId(null);
    setExamDate(null);
    setQuestionPaperCode(null);
    setAyRows([]);
    setExamGroups([]);
    setExamDates([]);
    setQuestionPapers([]);
    if (next === "all") void loadExamGroupDetails();
  }

  async function getAnswerpaperDetails() {
    if (!academicYearId || !examGroupId || !examDate || !questionPaperCode) {
      toastInfo("Please Select Required Filters");
      return;
    }
    setLoading(true);
    setAnswerPapersList([]);
    try {
      const rows = await getViewAnswerPaperDetails({
        examGroupId,
        academicYearId,
        examDate,
        questionPaperCode,
        employeeId,
      });
      setAnswerPapersList(rows);
      if (rows.length === 0) toastSuccess("No records found.");
    } catch (err) {
      toastError(err, "Failed to load answer papers");
    } finally {
      setLoading(false);
    }
  }

  async function enteredOmr(raw: string) {
    setBarcodeValue(raw);
    const value = raw.trim();
    if (value.length <= 4) return;
    if (omrSearchBusy.current || lastOmrQuery.current === value) return;
    lastOmrQuery.current = value;
    omrSearchBusy.current = true;
    try {
      const rows = await getViewAnswerPaperDetails({
        omrSerialNo: value,
        employeeId,
      });
      const matched = rows.filter((r) => txt(r.omr_serial_no) === value);
      if (matched.length === 0) {
        toastSuccess("No records found.");
        return;
      }
      setSelectedOmrDetails((prev) => {
        const next = [...prev];
        for (const r of matched) {
          const omrSerialNo = txt(r.omr_serial_no);
          if (next.some((x) => x.omrSerialNo === omrSerialNo)) continue;
          next.push({
            omrSerialNo,
            examStdDetId: num(r.pk_exam_std_det_id),
            hallticketNumber: txt(r.hallticket_no),
            answerPaperPath: txt(r.original_path),
            evaluatedAnswerPaperPath: txt(r.evaluated_path),
          });
        }
        return next;
      });
      setBarcodeValue("");
      lastOmrQuery.current = "";
    } catch (err) {
      toastError(err, "Failed to search OMR");
    } finally {
      omrSearchBusy.current = false;
    }
  }

  // Angular @HostListener('window:keypress') — keep barcode focused in OMR mode
  useEffect(() => {
    if (mode !== "omr") return;
    function onKeyPress() {
      const el = barcodeRef.current;
      if (!el) return;
      if (document.activeElement !== el) el.focus();
    }
    window.addEventListener("keypress", onKeyPress);
    barcodeRef.current?.focus();
    return () => window.removeEventListener("keypress", onKeyPress);
  }, [mode]);

  const allColumnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      {
        headerName: "SL No.",
        valueGetter: rowIndexGetter,
        width: 80,
        flex: 0,
      },
      {
        headerName: "Omr Serial No.",
        minWidth: 150,
        valueGetter: (p) => txt(p.data?.omr_serial_no),
      },
      {
        headerName: "Hall Ticket No.",
        minWidth: 150,
        valueGetter: (p) => txt(p.data?.hallticket_no),
      },
      {
        headerName: "Uploaded AnswerSheet",
        minWidth: 160,
        flex: 0,
        cellRenderer: makeEyeRenderer(["original_path"], "answerPaperPath"),
      },
      {
        headerName: "Evaluated AnswerSheet",
        minWidth: 160,
        flex: 0,
        cellRenderer: makeEyeRenderer(
          ["evaluated_path"],
          "evaluatedAnswerPaperPath",
        ),
      },
    ],
    [],
  );

  const omrColumnDefs = useMemo<ColDef<OmrRow>[]>(
    () => [
      {
        headerName: "SL No.",
        valueGetter: rowIndexGetter,
        width: 80,
        flex: 0,
      },
      {
        headerName: "Omr Serial No.",
        minWidth: 150,
        valueGetter: (p) => txt(p.data?.omrSerialNo),
      },
      {
        headerName: "Hall Ticket No.",
        minWidth: 150,
        valueGetter: (p) => txt(p.data?.hallticketNumber),
      },
      {
        headerName: "Uploaded AnswerSheet",
        minWidth: 160,
        flex: 0,
        cellRenderer: makeEyeRenderer(["answerPaperPath"], "answerPaperPath"),
      },
      {
        headerName: "Evaluated AnswerSheet",
        minWidth: 160,
        flex: 0,
        cellRenderer: makeEyeRenderer(
          ["evaluatedAnswerPaperPath"],
          "evaluatedAnswerPaperPath",
        ),
      },
    ],
    [],
  );

  const modeNotice = (
    <div className="view-answer-papers-radio">
      <RadioGroup
        value={mode}
        onValueChange={(v) => onModeChange(v === "all" ? "all" : "omr")}
        className="view-answer-papers-radio__group"
      >
        <label htmlFor="vap-omr" className="view-answer-papers-radio__option">
          <RadioGroupItem
            value="omr"
            id="vap-omr"
            className="view-answer-papers-radio__control"
          />
          <span className="view-answer-papers-radio__label">Search By OMR</span>
        </label>
        <label htmlFor="vap-all" className="view-answer-papers-radio__option">
          <RadioGroupItem
            value="all"
            id="vap-all"
            className="view-answer-papers-radio__control"
          />
          <span className="view-answer-papers-radio__label">All</span>
        </label>
      </RadioGroup>
    </div>
  );

  if (mode === "all") {
    return (
      <FilteredListPage
        title="View Answer Papers"
        className="view-answer-papers-page"
        notice={modeNotice}
        showTable={answerPapersList.length > 0}
        tableHeader={
          answerPapersList.length > 0 ? (
            <div className="table-context-header">
              <span
                className="material-icons table-context-header__icon"
                aria-hidden
              >
                ballot
              </span>
              <strong className="table-context-header__title">
                View Answer Papers - {headerSubtitle}
              </strong>
            </div>
          ) : null
        }
        filters={
          <GlobalFilterBarRow className="global-filter-bar__row--view-answer-papers">
            <GlobalFilterField
              label="Academic Year"
              className="global-filter-field--fx20"
            >
              <Select
                value={academicYearId ? String(academicYearId) : null}
                onChange={(v) =>
                  applyAcademicYear(v ? Number(v) : null, ayRows)
                }
                options={ayOptions}
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
                onChange={(v) => {
                  const id = v ? Number(v) : null;
                  setExamGroupId(id);
                  setExamDate(null);
                  setQuestionPaperCode(null);
                  setExamDates([]);
                  setQuestionPapers([]);
                  clearResults();
                  if (id && academicYearId)
                    void loadExamDates(id, academicYearId);
                }}
                options={examGroupOptions}
                placeholder="Exam Group"
                disabled={!academicYearId || loading}
              />
            </GlobalFilterField>
            <GlobalFilterField
              label="Exam Date"
              className="global-filter-field--fx25"
            >
              <Select
                value={examDate}
                onChange={(v) => {
                  setExamDate(v);
                  setQuestionPaperCode(null);
                  setQuestionPapers([]);
                  clearResults();
                  if (v && examGroupId && academicYearId) {
                    void loadQuestionPapers(v, examGroupId, academicYearId);
                  }
                }}
                options={examDateOptions}
                placeholder="Exam Date"
                searchable
                disabled={!examGroupId || loading}
              />
            </GlobalFilterField>
            <GlobalFilterField
              label="QuestionPaperCode"
              className="global-filter-field--fx25"
            >
              <Select
                value={questionPaperCode}
                onChange={(v) => {
                  clearResults();
                  setQuestionPaperCode(v);
                }}
                options={qpOptions}
                placeholder="QuestionPaperCode"
                disabled={!examDate || loading}
              />
            </GlobalFilterField>
            <GlobalFilterField
              label=" "
              className="global-filter-field--action global-filter-field--fx10"
            >
              <Button
                size="sm"
                className="h-10 w-full shrink-0"
                onClick={() => void getAnswerpaperDetails()}
                disabled={
                  loading ||
                  !academicYearId ||
                  !examGroupId ||
                  !examDate ||
                  !questionPaperCode
                }
              >
                Get List
              </Button>
            </GlobalFilterField>
          </GlobalFilterBarRow>
        }
        rowData={answerPapersList}
        columnDefs={allColumnDefs}
        pagination
        loading={loading}
        toolbar={{
          search: true,
          searchPlaceholder: "Search",
          pdfDocumentTitle: "View Answer Papers",
        }}
      />
    );
  }

  // ── Search By OMR ──────────────────────────────────────────────────────────
  return (
    <PageContainer className="view-answer-papers-page space-y-4">
      {modeNotice}

      {/* Barcode scan card — no page-title injection */}
      <div className="app-card overflow-hidden p-4" data-no-page-name>
        <div className="view-answer-papers-barcode">
          <Label className="sr-only">Scan barcode</Label>
          <div className="view-answer-papers-barcode__field">
            <QrCode className="view-answer-papers-barcode__icon" aria-hidden />
            <Input
              ref={barcodeRef}
              type="text"
              value={barcodeValue}
              placeholder="Scan barcode here – Input always focused"
              autoFocus
              className="view-answer-papers-barcode__input"
              onChange={(e) => void enteredOmr(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.preventDefault();
              }}
            />
          </div>
        </div>
      </div>

      {/* Single results card: heading + table + pagination */}
      {selectedOmrDetails.length > 0 ? (
        <div className="view-answer-papers-omr-table overflow-hidden rounded-[4px]">
          <DataTable
            title="View Answer Papers"
            rowData={selectedOmrDetails}
            columnDefs={omrColumnDefs}
            pagination
            paginationPageSize={10}
            toolbar={false}
            bordered
            height="auto"
            getRowId={(p) =>
              String(p.data?.omrSerialNo ?? p.data?.examStdDetId ?? "")
            }
          />
        </div>
      ) : null}
    </PageContainer>
  );
}
