"use client";

/**
 * Shared UI for Angular exam-bundle-scanning child reports.
 * Cascade filters mirror exam-bundle-print / Angular getCollegeExamCenters;
 * grid data from s_get_bundle_wise_scanning_report_summary with per-page in_flag.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ColDef } from "ag-grid-community";
import { FilteredListPage } from "@/components/layout";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
import { Select, type SelectOption } from "@/common/components/select";
import { Button } from "@/components/ui/button";
import { useSessionContext } from "@/context/SessionContext";
import { rowIndexGetter } from "@/lib/utils";
import { toast } from "sonner";
import { toastError, toastSuccess } from "@/lib/toast";
import { printHtmlInIframe } from "@/lib/print";
import {
  buildHtmlTable,
  escapeHtml,
  exportHtmlTableAsExcel,
} from "../../_lib/export-html-table";
import {
  getBundleWiseScanningReport,
  getExamCenterFilterGroups,
  pickEgAyFilterRows,
  type BundleScanningReportFlag,
} from "@/services";

type AnyRow = Record<string, unknown>;

/** Angular mat-option `[value]="0"` — All exam centers / dates / QP codes. */
const ALL = "0";

const HUB_PATH =
  "/admin-examination-management/admin-exam-reports/exam-bundle-scanning-report";

const BACK_KEY = "examBundleScanningBack";

const TOOLBAR = {
  search: true,
  searchPlaceholder: "Search...",
  columnPicker: false,
  exportPdf: false,
  exportExcel: false,
  columnFilters: false,
} as const;

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const txt = (v: unknown): string => {
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
};

function dedupeBy<T>(rows: T[], keyFn: (r: T) => number | string): T[] {
  const seen = new Set<number | string>();
  const out: T[] = [];
  for (const r of rows) {
    const k = keyFn(r);
    if (k == null || k === "" || k === 0 || seen.has(k)) continue;
    seen.add(k);
    out.push(r);
  }
  return out;
}

interface FormState {
  academicYearId: string;
  examGroupId: string;
  examCenterId: string;
  examDate: string;
  questionPaperCode: string;
}

const EMPTY_FORM: FormState = {
  academicYearId: "",
  examGroupId: "",
  examCenterId: "",
  examDate: "",
  questionPaperCode: "",
};

export type ExamBundleScanningChildReportProps = {
  title: string;
  inFlag: BundleScanningReportFlag;
  excelFileName: string;
};

function cellText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function printReport(args: {
  title: string;
  subtitle: string;
  columns: { key: string; header: string }[];
  rows: Record<string, unknown>[];
}) {
  const table = buildHtmlTable(args.columns, args.rows);
  const html = `<!DOCTYPE html><html><head><title>${escapeHtml(args.title)}</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 12px; font-family: Arial, Helvetica, sans-serif; color: #000; }
  h1 { font-size: 16px; margin: 0 0 4px; }
  p { font-size: 12px; margin: 0 0 10px; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  th, td { border: 1px solid #000; padding: 3px 4px; font-size: 9px; word-break: break-word; }
  th { background: #f2f2f2; }
  @page { size: A4 landscape; margin: 8mm; }
</style></head><body>
  <h1>${escapeHtml(args.title)}</h1>
  <p>${escapeHtml(args.subtitle)}</p>
  ${table}
</body></html>`;
  printHtmlInIframe(html);
}

export function ExamBundleScanningChildReportPage({
  title,
  inFlag,
  excelFileName,
}: ExamBundleScanningChildReportProps) {
  const router = useRouter();
  const { user, isLoading: sessionLoading } = useSessionContext();
  const universityId = Number(user?.universityId ?? 0) || 0;

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [egFilterRows, setEgFilterRows] = useState<AnyRow[]>([]);
  const [ecGroupRows, setEcGroupRows] = useState<AnyRow[]>([]);
  const [questionPaperRows, setQuestionPaperRows] = useState<AnyRow[]>([]);
  const [rows, setRows] = useState<AnyRow[]>([]);
  const [loadingFilters, setLoadingFilters] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  const clearListState = useCallback(() => {
    setRows([]);
    setHasFetched(false);
  }, []);

  const loadAcademicYearAndGroups = useCallback(async () => {
    setLoadingFilters(true);
    try {
      const groups = await getExamCenterFilterGroups({
        flag: "eg_filters",
        universityId,
      });
      setEgFilterRows(pickEgAyFilterRows(groups));
    } catch (e) {
      toastError(e, "Failed to load filters");
      setEgFilterRows([]);
    } finally {
      setLoadingFilters(false);
    }
  }, [universityId]);

  useEffect(() => {
    if (sessionLoading) return;
    void loadAcademicYearAndGroups();
  }, [sessionLoading, loadAcademicYearAndGroups]);

  const academicYears = useMemo(
    () => dedupeBy(egFilterRows, (r) => num(r.fk_academic_year_id)),
    [egFilterRows],
  );

  useEffect(() => {
    if (!academicYears.length || form.academicYearId) return;
    setForm((f) => ({
      ...f,
      academicYearId: String(num(academicYears[0].fk_academic_year_id)),
    }));
  }, [academicYears, form.academicYearId]);

  const examGroups = useMemo(
    () =>
      dedupeBy(
        egFilterRows.filter(
          (r) => num(r.fk_academic_year_id) === Number(form.academicYearId),
        ),
        (r) => num(r.fk_univ_exam_group_id),
      ),
    [egFilterRows, form.academicYearId],
  );

  useEffect(() => {
    if (!examGroups.length || !form.academicYearId || form.examGroupId) return;
    setForm((f) => ({
      ...f,
      examGroupId: String(num(examGroups[0].fk_univ_exam_group_id)),
    }));
  }, [examGroups, form.academicYearId, form.examGroupId]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!form.academicYearId || !form.examGroupId) {
        setEcGroupRows([]);
        return;
      }
      try {
        const groups = await getExamCenterFilterGroups({
          flag: "eg_ec_filters",
          academicYearId: Number(form.academicYearId),
          examGroupId: Number(form.examGroupId),
          universityId,
        });
        if (cancelled) return;
        const flat: AnyRow[] = [];
        for (const g of groups) flat.push(...g);
        setEcGroupRows(flat);
      } catch (e) {
        if (!cancelled) toastError(e, "Failed to load exam centers");
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [form.academicYearId, form.examGroupId, universityId]);

  const examCenters = useMemo(
    () => dedupeBy(ecGroupRows, (r) => num(r.fk_univ_ec_id)),
    [ecGroupRows],
  );

  useEffect(() => {
    if (!examCenters.length || !form.examGroupId || form.examCenterId !== "")
      return;
    // Angular defaults to first center (All option still available).
    setForm((f) => ({
      ...f,
      examCenterId: String(num(examCenters[0].fk_univ_ec_id)),
    }));
  }, [examCenters, form.examGroupId, form.examCenterId]);

  const examDates = useMemo(() => {
    const source =
      Number(form.examCenterId) === 0
        ? ecGroupRows
        : ecGroupRows.filter(
            (r) => num(r.fk_univ_ec_id) === Number(form.examCenterId),
          );
    return dedupeBy(source, (r) => txt(r.exam_date));
  }, [ecGroupRows, form.examCenterId]);

  useEffect(() => {
    if (form.examCenterId === "" || form.examDate !== "") return;
    if (!examDates.length) {
      setForm((f) => ({ ...f, examDate: ALL }));
      return;
    }
    setForm((f) => ({ ...f, examDate: txt(examDates[0].exam_date) }));
  }, [form.examCenterId, form.examDate, examDates]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (
        !form.academicYearId ||
        !form.examGroupId ||
        form.examCenterId === "" ||
        form.examDate === ""
      ) {
        setQuestionPaperRows([]);
        return;
      }
      try {
        const groups = await getExamCenterFilterGroups({
          flag: "eg_ec_qc_filters",
          academicYearId: Number(form.academicYearId),
          examGroupId: Number(form.examGroupId),
          univExamcenterId: Number(form.examCenterId) || 0,
          examDate: form.examDate === ALL ? "1900-01-01" : form.examDate,
          universityId,
        });
        if (cancelled) return;
        setQuestionPaperRows(groups[0] ?? []);
      } catch (e) {
        if (!cancelled) toastError(e, "Failed to load question papers");
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [
    form.academicYearId,
    form.examGroupId,
    form.examCenterId,
    form.examDate,
    universityId,
  ]);

  useEffect(() => {
    if (
      form.examCenterId === "" ||
      form.examDate === "" ||
      form.questionPaperCode !== ""
    ) {
      return;
    }
    const first = txt(
      questionPaperRows[0]?.questionpaper_code ??
        questionPaperRows[0]?.questionPaperCode,
    );
    setForm((f) => ({
      ...f,
      questionPaperCode: first || ALL,
    }));
  }, [
    form.examCenterId,
    form.examDate,
    form.questionPaperCode,
    questionPaperRows,
  ]);

  const academicYearOptions: SelectOption[] = useMemo(
    () =>
      academicYears.map((r) => ({
        value: String(num(r.fk_academic_year_id)),
        label: txt(r.academic_year),
      })),
    [academicYears],
  );
  const examGroupOptions: SelectOption[] = useMemo(
    () =>
      examGroups.map((r) => ({
        value: String(num(r.fk_univ_exam_group_id)),
        label: txt(r.exam_group_code),
      })),
    [examGroups],
  );
  const examCenterOptions: SelectOption[] = useMemo(
    () => [
      { value: ALL, label: "All" },
      ...examCenters.map((r) => ({
        value: String(num(r.fk_univ_ec_id)),
        label: txt(r.ec_name) || txt(r.ec_code),
      })),
    ],
    [examCenters],
  );
  const examDateOptions: SelectOption[] = useMemo(
    () => [
      { value: ALL, label: "All" },
      ...examDates.map((r) => ({
        value: txt(r.exam_date),
        label: txt(r.exam_date),
      })),
    ],
    [examDates],
  );
  const questionPaperOptions: SelectOption[] = useMemo(
    () => [
      { value: ALL, label: "All" },
      ...questionPaperRows.map((r) => {
        const c = txt(r.questionpaper_code ?? r.questionPaperCode);
        return {
          value: c,
          label: txt(r.Questionpaper_name ?? r.questionpaper_name) || c,
        };
      }),
    ],
    [questionPaperRows],
  );

  const headerBits = useMemo(() => {
    const eg = examGroups.find(
      (x) => num(x.fk_univ_exam_group_id) === Number(form.examGroupId),
    );
    const ec = examCenters.find(
      (x) => num(x.fk_univ_ec_id) === Number(form.examCenterId),
    );
    return {
      examGroupCode: txt(eg?.exam_group_code),
      examCenterCode:
        Number(form.examCenterId) === 0 ? "All" : txt(ec?.ec_name),
      examDate: form.examDate === ALL ? "All" : form.examDate,
      questionPaperCode:
        form.questionPaperCode === ALL ? "All" : form.questionPaperCode,
    };
  }, [
    examGroups,
    examCenters,
    form.examGroupId,
    form.examCenterId,
    form.examDate,
    form.questionPaperCode,
  ]);

  const reportSubtitle = `${headerBits.examGroupCode} / ${headerBits.examCenterCode} / ${headerBits.examDate} / ${headerBits.questionPaperCode}`;

  const dynamicKeys = useMemo(() => {
    if (!rows.length) return [] as string[];
    return Object.keys(rows[0]).filter(
      (k) => k !== "pk_univ_exam_scan_bundle_id" && k !== "__rid",
    );
  }, [rows]);

  const columnDefs = useMemo<ColDef<AnyRow>[]>(() => {
    const cols: ColDef<AnyRow>[] = [
      {
        headerName: "SI.No",
        valueGetter: rowIndexGetter,
        width: 70,
        flex: 0,
      },
    ];
    for (const key of dynamicKeys) {
      cols.push({
        field: key,
        headerName: key,
        minWidth: 120,
        valueGetter: (p) => cellText(p.data?.[key]),
      });
    }
    return cols;
  }, [dynamicKeys]);

  const exportColumns = useMemo(
    () => [
      { key: "si", header: "SI.No" },
      ...dynamicKeys.map((k) => ({ key: k, header: k })),
    ],
    [dynamicKeys],
  );

  function onAcademicYearChange(v: string | null) {
    clearListState();
    setForm({
      academicYearId: v ?? "",
      examGroupId: "",
      examCenterId: "",
      examDate: "",
      questionPaperCode: "",
    });
  }

  function onExamGroupChange(v: string | null) {
    clearListState();
    setForm((f) => ({
      ...f,
      examGroupId: v ?? "",
      examCenterId: "",
      examDate: "",
      questionPaperCode: "",
    }));
  }

  function onExamCenterChange(v: string | null) {
    clearListState();
    setForm((f) => ({
      ...f,
      examCenterId: v ?? "",
      examDate: "",
      questionPaperCode: "",
    }));
  }

  function onExamDateChange(v: string | null) {
    clearListState();
    setForm((f) => ({
      ...f,
      examDate: v ?? "",
      questionPaperCode: "",
    }));
  }

  function onQuestionPaperChange(v: string | null) {
    clearListState();
    setForm((f) => ({ ...f, questionPaperCode: v ?? "" }));
  }

  async function onGetList() {
    if (
      !form.academicYearId ||
      !form.examGroupId ||
      form.examCenterId === "" ||
      form.examDate === "" ||
      form.questionPaperCode === ""
    ) {
      toast.info("Please Select Required Filters");
      return;
    }
    setHasFetched(true);
    setLoadingList(true);
    try {
      const list = await getBundleWiseScanningReport({
        inFlag,
        examGroupId: Number(form.examGroupId),
        examCenterId: Number(form.examCenterId) || 0,
        examDate: form.examDate,
        questionPaperCode: form.questionPaperCode,
      });
      setRows(list.map((row, i) => ({ ...row, __rid: i })));
      if (!list.length) toastSuccess("No Records Found.");
    } catch (e) {
      toastError(e, "Failed to load report");
      setRows([]);
    } finally {
      setLoadingList(false);
    }
  }

  function onBack() {
    try {
      sessionStorage.removeItem(BACK_KEY);
    } catch {
      /* ignore */
    }
    router.push(HUB_PATH);
  }

  function handleExportExcel() {
    if (!rows.length) {
      toast.info("No data to export");
      return;
    }
    const exportRows = rows.map((row, i) => {
      const out: Record<string, unknown> = { si: i + 1 };
      for (const k of dynamicKeys) out[k] = cellText(row[k]);
      return out;
    });
    exportHtmlTableAsExcel(
      excelFileName,
      buildHtmlTable(exportColumns, exportRows),
      `<strong>${escapeHtml(title)} - ${escapeHtml(reportSubtitle)}</strong>`,
    );
  }

  function handlePrint() {
    if (!rows.length) {
      toast.info("No data to print");
      return;
    }
    const exportRows = rows.map((row, i) => {
      const out: Record<string, unknown> = { si: i + 1 };
      for (const k of dynamicKeys) out[k] = cellText(row[k]);
      return out;
    });
    printReport({
      title,
      subtitle: reportSubtitle,
      columns: exportColumns,
      rows: exportRows,
    });
  }

  const pageTitle = title;
  const tableTitle = hasFetched
    ? `${title} - ${reportSubtitle}`
    : title;

  const filters = (
    <GlobalFilterBarRow>
      <GlobalFilterField label="Academic Year *">
        <Select
          value={form.academicYearId || undefined}
          onChange={onAcademicYearChange}
          isLoading={loadingFilters}
          options={academicYearOptions}
          placeholder="Academic Year"
          searchable
        />
      </GlobalFilterField>
      <GlobalFilterField label="Exam Group *">
        <Select
          value={form.examGroupId || undefined}
          onChange={onExamGroupChange}
          options={examGroupOptions}
          placeholder="Exam Group"
          searchable
        />
      </GlobalFilterField>
      <GlobalFilterField label="Exam Center *">
        <Select
          value={form.examCenterId || undefined}
          onChange={onExamCenterChange}
          options={examCenterOptions}
          placeholder="Exam Center"
          searchable
        />
      </GlobalFilterField>
      <GlobalFilterField label="Exam Date *">
        <Select
          value={form.examDate || undefined}
          onChange={onExamDateChange}
          options={examDateOptions}
          placeholder="Exam Date"
          searchable
        />
      </GlobalFilterField>
      <GlobalFilterField label="QuestionPaperCode *">
        <Select
          value={form.questionPaperCode || undefined}
          onChange={onQuestionPaperChange}
          options={questionPaperOptions}
          placeholder="QuestionPaperCode"
          searchable
        />
      </GlobalFilterField>
      <GlobalFilterField
        label=""
        className="global-filter-field--shrink global-filter-field--action"
      >
        <div className="flex items-center gap-2">
          <Button
            type="button"
            onClick={() => void onGetList()}
            disabled={loadingList}
            className="h-[30px] px-3 text-[12px]"
          >
            Get List
          </Button>
          <Button
            type="button"
            onClick={onBack}
            className="h-[30px] px-3 text-[12px] !bg-yellow-400 hover:!bg-yellow-500 !text-black border-0 shadow-sm"
          >
            Back
          </Button>
        </div>
      </GlobalFilterField>
    </GlobalFilterBarRow>
  );

  return (
    <FilteredListPage
      title={pageTitle}
      tableTitle={tableTitle}
      resultsVisible={hasFetched}
      filters={filters}
      rowData={hasFetched ? rows : []}
      columnDefs={columnDefs}
      loading={loadingList}
      pagination
      fitColumnsToWidth={false}
      toolbar={TOOLBAR}
      toolbarTrailing={
        hasFetched && rows.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              className="h-[30px] px-3 text-[12px]"
              onClick={handleExportExcel}
            >
              Export Excel
            </Button>
            <Button
              type="button"
              className="h-[30px] px-3 text-[12px]"
              onClick={handlePrint}
            >
              Print Report
            </Button>
          </div>
        ) : null
      }
    />
  );
}
