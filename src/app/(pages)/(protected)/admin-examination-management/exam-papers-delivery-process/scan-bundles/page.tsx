"use client";

/**
 * Exam Scan Bundles Print (New).
 *
 * React port of Angular `exam-scan-bundles-print`. GlobalFilterBar (same as
 * exam-bundle-print). Lists scan bundles, assign scan operator, bundle details,
 * bulk English stickers, per-row Gujarati stickers.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { Printer } from "lucide-react";
import { PageContainer } from "@/components/layout";
import { DataTable } from "@/common/components/table";
import {
  GlobalFilterBar,
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
import { Select, type SelectOption } from "@/common/components/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { getSecuredValue, setSecuredValue } from "@/common/generic-functions";
import { rowIndexGetter } from "@/lib/utils";
import { toast } from "sonner";
import { toastError, toastSuccess } from "@/lib/toast";
import { ExamBundlePrintStickersView } from "../exam-bundle-print/ExamBundlePrintStickersView";
import {
  getExamCenterFilterGroups,
  getExamScanBundleStickers,
  listExamScanBundlesByCode,
  listExamScanProfilesByGroup,
  updateExamScanBundle,
  type AnyRow,
} from "@/services/exam-papers-delivery";

type Row = AnyRow;

const ALL = "0";

const FILTERS_STORAGE_KEY = "examScanBundlesFiltersData";
const BUNDLE_DETAILS_STORAGE_KEY = "examScanBundleDetails";

const SCAN_DETAILS_ROUTE =
  "/admin-examination-management/exam-papers-delivery-process/exam-scan-bundles-print/scan-bundle-details";

interface SavedFilterRow {
  academicYearId?: string | number;
  examGroupId?: string | number;
  examCenterId?: string | number;
  examDate?: string | number;
  questionPaperCode?: string | number;
}

function loadSavedFilters(): SavedFilterRow | null {
  const saved = getSecuredValue<SavedFilterRow[]>(FILTERS_STORAGE_KEY);
  if (Array.isArray(saved) && saved[0]) return saved[0];
  return null;
}

function saveFiltersToSession(form: FormState): void {
  setSecuredValue(FILTERS_STORAGE_KEY, [form]);
}

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

type PrintMode = "stickers" | "stickers-gu";

function pickScanProfileDetailId(row: Row): number {
  return num(
    row.pk_exam_scan_profile_detail_id ??
      row.scannerProfileDetailId ??
      row.scanner_profile_detail_id ??
      row.fk_scanner_profiledet_id ??
      row.pk_exam_scan_profile_id,
  );
}

function scanProfileDedupeKey(row: Row): number | string {
  const detailId = pickScanProfileDetailId(row);
  if (detailId > 0) return detailId;
  const profileId = num(row.pk_exam_scan_profile_id ?? row.examScanProfileId);
  if (profileId > 0) return profileId;
  const name = txt(row.scan_profile_name ?? row.scanProfileName);
  return name || JSON.stringify(row);
}

export default function ExamScanBundlesPrintPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [egFilterRows, setEgFilterRows] = useState<Row[]>([]);
  const [ecGroupRows, setEcGroupRows] = useState<Row[]>([]);
  const [questionPaperRows, setQuestionPaperRows] = useState<Row[]>([]);
  const [bundles, setBundles] = useState<Row[]>([]);
  const [loadingFilters, setLoadingFilters] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  const [stickerRows, setStickerRows] = useState<Row[]>([]);
  const [stickerView, setStickerView] = useState<PrintMode | null>(null);
  const pendingSaved = useRef<SavedFilterRow | null>(loadSavedFilters());
  const autoFetchPending = useRef(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState<Row | null>(null);
  const [scanProfiles, setScanProfiles] = useState<Row[]>([]);
  const [editForm, setEditForm] = useState({
    scannerProfileDetailId: "",
    totalAnswerBooks: "",
    isActive: true,
    reason: "",
  });
  const [savingEdit, setSavingEdit] = useState(false);

  const clearListState = useCallback(() => {
    setBundles([]);
    setHasFetched(false);
  }, []);

  const loadAcademicYearAndGroups = useCallback(async () => {
    setLoadingFilters(true);
    try {
      const groups = await getExamCenterFilterGroups({ flag: "eg_filters" });
      const flat: Row[] = [];
      for (const g of groups)
        if (g.length > 0 && txt(g[0].flag) === "eg_ay_filter") flat.push(...g);
      setEgFilterRows(flat);
    } catch (e) {
      toastError(e, "Failed to load filters");
    } finally {
      setLoadingFilters(false);
    }
  }, []);

  useEffect(() => {
    void loadAcademicYearAndGroups();
  }, [loadAcademicYearAndGroups]);

  const academicYears = useMemo(
    () => dedupeBy(egFilterRows, (r) => num(r.fk_academic_year_id)),
    [egFilterRows],
  );

  useEffect(() => {
    if (!academicYears.length || form.academicYearId) return;
    const saved = pendingSaved.current;
    const id =
      saved?.academicYearId != null
        ? String(saved.academicYearId)
        : String(num(academicYears[0].fk_academic_year_id));
    setForm((f) => ({ ...f, academicYearId: id }));
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
    const saved = pendingSaved.current;
    const id =
      saved?.examGroupId != null
        ? String(saved.examGroupId)
        : String(num(examGroups[0].fk_univ_exam_group_id));
    setForm((f) => ({ ...f, examGroupId: id }));
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
        });
        if (cancelled) return;
        const flat: Row[] = [];
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
  }, [form.academicYearId, form.examGroupId]);

  const examCenters = useMemo(
    () => dedupeBy(ecGroupRows, (r) => num(r.fk_univ_ec_id)),
    [ecGroupRows],
  );

  useEffect(() => {
    if (!examCenters.length || !form.examGroupId || form.examCenterId !== "")
      return;
    const saved = pendingSaved.current;
    const id = saved?.examCenterId != null ? String(saved.examCenterId) : ALL;
    setForm((f) => ({ ...f, examCenterId: id }));
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
    const saved = pendingSaved.current;
    const id = saved?.examDate != null ? String(saved.examDate) : ALL;
    setForm((f) => ({ ...f, examDate: id }));
  }, [form.examCenterId, form.examDate]);

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
  }, [form.academicYearId, form.examGroupId, form.examCenterId, form.examDate]);

  useEffect(() => {
    if (
      form.examCenterId === "" ||
      form.examDate === "" ||
      form.questionPaperCode !== ""
    )
      return;
    const saved = pendingSaved.current;
    setForm((f) => ({
      ...f,
      questionPaperCode:
        saved?.questionPaperCode != null
          ? String(saved.questionPaperCode)
          : ALL,
    }));
    if (saved) {
      autoFetchPending.current = true;
      pendingSaved.current = null;
    }
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
        label: `${txt(r.ec_code)} - ${txt(r.ec_name)}`,
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

  const header = useMemo(() => {
    const eg = examGroups.find(
      (x) => num(x.fk_univ_exam_group_id) === Number(form.examGroupId),
    );
    const ec = examCenters.find(
      (x) => num(x.fk_univ_ec_id) === Number(form.examCenterId),
    );
    return {
      examGroupCode: txt(eg?.exam_group_code),
      examCenterCode: txt(ec?.ec_name),
      examDate: form.examDate,
      questionPaperCode: form.questionPaperCode,
    };
  }, [examGroups, examCenters, form]);

  const tableSummaryText = useMemo(() => {
    const centerLabel =
      form.examCenterId === ALL
        ? "All"
        : examCenterOptions.find((o) => o.value === form.examCenterId)?.label ||
          header.examCenterCode ||
          "All";
    const dateLabel = form.examDate === ALL ? "All" : header.examDate;
    const qp = questionPaperOptions.find(
      (o) => o.value === form.questionPaperCode,
    )?.label;
    const subjectLabel =
      form.questionPaperCode === ALL ? "All" : qp || header.questionPaperCode;
    return `${header.examGroupCode || "-"} / ${centerLabel} / ${dateLabel} / ${subjectLabel}`;
  }, [
    header,
    form.examCenterId,
    form.examDate,
    form.questionPaperCode,
    examCenterOptions,
    questionPaperOptions,
  ]);

  function onAcademicYearChange(v: string | null) {
    clearListState();
    pendingSaved.current = null;
    autoFetchPending.current = false;
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
    pendingSaved.current = null;
    autoFetchPending.current = false;
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
    pendingSaved.current = null;
    autoFetchPending.current = false;
    setForm((f) => ({
      ...f,
      examCenterId: v ?? "",
      examDate: "",
      questionPaperCode: "",
    }));
  }

  function onExamDateChange(v: string | null) {
    clearListState();
    pendingSaved.current = null;
    autoFetchPending.current = false;
    setForm((f) => ({ ...f, examDate: v ?? "", questionPaperCode: "" }));
  }

  function onQuestionPaperChange(v: string | null) {
    clearListState();
    pendingSaved.current = null;
    autoFetchPending.current = false;
    setForm((f) => ({ ...f, questionPaperCode: v ?? "" }));
  }

  const onGetList = useCallback(async () => {
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
      const rows = await listExamScanBundlesByCode({
        univExamcenterId: Number(form.examCenterId),
        examGroupId: Number(form.examGroupId),
        academicYearId: Number(form.academicYearId),
        examDate: form.examDate,
        questionPaperCode: form.questionPaperCode,
      });
      setBundles(rows);
      if (rows.length === 0) toast.info("No Record(s) found.");
    } catch (e) {
      toastError(e, "Failed to load scan bundles");
      setBundles([]);
    } finally {
      setLoadingList(false);
    }
  }, [form]);

  // Angular selectedQuestionPaper: auto-get list when restoring saved filters.
  useEffect(() => {
    if (!autoFetchPending.current) return;
    if (
      !form.academicYearId ||
      !form.examGroupId ||
      form.examCenterId === "" ||
      form.examDate === "" ||
      form.questionPaperCode === ""
    ) {
      return;
    }
    autoFetchPending.current = false;
    void onGetList();
  }, [form, onGetList]);

  async function loadAndPrintStickers(
    scanBundleId: number,
    mode: PrintMode = "stickers",
  ) {
    setLoadingList(true);
    try {
      let rows = await getExamScanBundleStickers({
        univExamcenterId: Number(form.examCenterId),
        examGroupId: Number(form.examGroupId),
        academicYearId: Number(form.academicYearId),
        examDate: form.examDate,
        questionPaperCode: form.questionPaperCode,
        scanBundleId,
      });
      if (Array.isArray(rows[0])) rows = rows[0] as unknown as Row[];
      if (!rows.length) {
        toast.info("No stickers found for this bundle.");
        return;
      }
      saveFiltersToSession(form);
      setStickerRows(rows);
      setStickerView(mode);
    } catch (e) {
      toastError(e, "Failed to load stickers");
    } finally {
      setLoadingList(false);
    }
  }

  async function openEdit(row: Row) {
    setEditRow(row);
    setEditForm({
      scannerProfileDetailId: String(pickScanProfileDetailId(row)),
      totalAnswerBooks: txt(row.total_answer_books ?? row.totalAnswerBooks),
      isActive: row.isActive == null ? true : row.isActive === true,
      reason: txt(row.reason),
    });
    setEditOpen(true);
    try {
      const profiles = await listExamScanProfilesByGroup(
        Number(form.examGroupId),
      );
      setScanProfiles(dedupeBy(profiles, scanProfileDedupeKey));
    } catch (e) {
      setScanProfiles([]);
      toastError(e, "Failed to load scanner profiles");
    }
  }

  const scanProfileOptions: SelectOption[] = useMemo(
    () =>
      scanProfiles.map((r) => ({
        value: String(pickScanProfileDetailId(r)),
        label:
          txt(r.scan_profile_name ?? r.scanProfileName) ||
          String(pickScanProfileDetailId(r)),
      })),
    [scanProfiles],
  );

  async function saveEdit() {
    if (!editRow) return;
    const id = num(
      editRow.pk_univ_exam_scan_bundle_id ?? editRow.univExamScanbundleId,
    );
    if (!id) {
      toastError("Missing scan bundle id.");
      return;
    }
    setSavingEdit(true);
    try {
      await updateExamScanBundle(id, {
        univExamScanbundleId: id,
        univExamGroupId: Number(form.examGroupId),
        questionPaperCode: form.questionPaperCode,
        scannerProfileDetailId: editForm.scannerProfileDetailId
          ? Number(editForm.scannerProfileDetailId)
          : null,
        totalAnswerBooks:
          editForm.totalAnswerBooks === ""
            ? num(editRow.total_answer_books)
            : Number(editForm.totalAnswerBooks),
        isActive: editForm.isActive,
        reason: editForm.reason || null,
      });
      toastSuccess("Scan bundle updated.");
      setEditOpen(false);
      await onGetList();
    } catch (e) {
      toastError(e, "Failed to update scan bundle");
    } finally {
      setSavingEdit(false);
    }
  }

  function openBundleDetails(row: Row) {
    const detailRow = {
      ...row,
      academicYearId: form.academicYearId,
      examGroupId: form.examGroupId,
      examCenterId: form.examCenterId,
      examDate: form.examDate,
      questionPaperCode: form.questionPaperCode,
      examGroupCode: header.examGroupCode,
      examCenterCode: header.examCenterCode,
      pk_univ_exam_scan_bundle_id: num(row.pk_univ_exam_scan_bundle_id),
      bundle_number: num(row.bundle_number),
      fk_scanner_profiledet_id: num(
        row.fk_scanner_profiledet_id ?? row.scannerProfileDetailId,
      ),
    };
    setSecuredValue(BUNDLE_DETAILS_STORAGE_KEY, [detailRow]);
    saveFiltersToSession(form);

    const qp = new URLSearchParams({
      academicYearId: form.academicYearId,
      examGroupId: form.examGroupId,
      examCenterId: form.examCenterId,
      examDate: form.examDate,
      questionPaperCode: form.questionPaperCode,
      examGroupCode: header.examGroupCode,
      examCenterCode: header.examCenterCode,
      scanBundleId: String(num(row.pk_univ_exam_scan_bundle_id)),
      scanBundleName: txt(row.scan_bundle_name),
      bundleNumber: String(num(row.bundle_number)),
      scannerProfileDetailId: String(
        num(row.fk_scanner_profiledet_id ?? row.scannerProfileDetailId),
      ),
    });
    router.push(`${SCAN_DETAILS_ROUTE}?${qp.toString()}`);
  }

  const printActionsRef = useRef<(scanBundleId: number) => void>(() => {});
  printActionsRef.current = (scanBundleId) => {
    void loadAndPrintStickers(scanBundleId, "stickers-gu");
  };

  const columnDefs = useMemo<ColDef<Row>[]>(
    () => [
      { headerName: "SL No.", valueGetter: rowIndexGetter, width: 80, flex: 0 },
      {
        headerName: "Bundle Name",
        minWidth: 150,
        valueGetter: (p) =>
          txt(p.data?.scan_bundle_name ?? p.data?.exam_bundle_name),
      },
      {
        headerName: "Scanner Profile",
        minWidth: 150,
        valueGetter: (p) =>
          txt(p.data?.scan_profile_name ?? p.data?.scannerProfileDetailId),
      },
      {
        headerName: "Total Answer Books",
        minWidth: 150,
        valueGetter: (p) => txt(p.data?.total_answer_books),
      },
      {
        headerName: "Start Seat No",
        minWidth: 120,
        valueGetter: (p) => txt(p.data?.start_ec_seatno),
      },
      {
        headerName: "End Seat No",
        minWidth: 120,
        valueGetter: (p) => txt(p.data?.end_ec_seatno),
      },
      {
        headerName: "Actions",
        minWidth: 300,
        flex: 0,
        cellRenderer: (p: ICellRendererParams<Row>) => {
          if (!p.data) return null;
          const id = num(p.data.pk_univ_exam_scan_bundle_id);
          return (
            <div className="flex items-center gap-2 text-[12px]">
              <button
                type="button"
                className="text-[hsl(var(--primary))] hover:underline"
                onClick={() => openBundleDetails(p.data as Row)}
              >
                Bundle Details
              </button>
              <span className="text-muted-foreground">|</span>
              <button
                type="button"
                className="text-[hsl(var(--primary))] hover:underline"
                onClick={() => void openEdit(p.data as Row)}
              >
                Assign Scan Operator
              </button>
              <span className="text-muted-foreground">|</span>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                title="Print Stickers New Format"
                onClick={() => printActionsRef.current(id)}
              >
                <Printer className="h-3.5 w-3.5" />
              </Button>
            </div>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form, header],
  );

  if (stickerView === "stickers" || stickerView === "stickers-gu") {
    return (
      <ExamBundlePrintStickersView
        stickerRows={stickerRows}
        examGroupCode={header.examGroupCode}
        variant={stickerView}
        onBack={() => {
          const saved = loadSavedFilters();
          if (saved) {
            pendingSaved.current = saved;
            autoFetchPending.current = true;
            setForm({
              academicYearId:
                saved.academicYearId != null
                  ? String(saved.academicYearId)
                  : "",
              examGroupId:
                saved.examGroupId != null ? String(saved.examGroupId) : "",
              examCenterId:
                saved.examCenterId != null ? String(saved.examCenterId) : "",
              examDate: saved.examDate != null ? String(saved.examDate) : "",
              questionPaperCode:
                saved.questionPaperCode != null
                  ? String(saved.questionPaperCode)
                  : "",
            });
          }
          setStickerView(null);
        }}
      />
    );
  }

  return (
    <PageContainer className="space-y-4">
      <GlobalFilterBar title="Exam Scan Bundles" defaultOpen={false}>
        <GlobalFilterBarRow>
          <GlobalFilterField label="Academic Year">
            <Select
              options={academicYearOptions}
              value={form.academicYearId}
              onChange={onAcademicYearChange}
              placeholder="Academic Year"
              disabled={loadingFilters}
            />
          </GlobalFilterField>
          <GlobalFilterField label="Exam Group">
            <Select
              options={examGroupOptions}
              value={form.examGroupId}
              onChange={onExamGroupChange}
              placeholder="Exam Group"
            />
          </GlobalFilterField>
          <GlobalFilterField label="Exam Center">
            <Select
              options={examCenterOptions}
              value={form.examCenterId}
              onChange={onExamCenterChange}
              placeholder="Exam Center"
              searchable
            />
          </GlobalFilterField>
          <GlobalFilterField label="Exam Date">
            <Select
              options={examDateOptions}
              value={form.examDate}
              onChange={onExamDateChange}
              placeholder="Exam Date"
              searchable
            />
          </GlobalFilterField>
          <GlobalFilterField label="Subject">
            <Select
              options={questionPaperOptions}
              value={form.questionPaperCode}
              onChange={onQuestionPaperChange}
              placeholder="Subject"
              searchable
            />
          </GlobalFilterField>
          <GlobalFilterField
            label=" "
            className="global-filter-field--action global-filter-field--shrink"
          >
            <Button
              size="sm"
              onClick={() => void onGetList()}
              disabled={loadingList}
              className="h-8 shrink-0 px-3 text-[12px]"
            >
              Get List
            </Button>
          </GlobalFilterField>
        </GlobalFilterBarRow>
      </GlobalFilterBar>

      {hasFetched && (
        <div className="app-card overflow-hidden">
          <div className="px-3 pb-3 pt-2">
            <div className="overflow-hidden rounded-lg border border-border bg-card">
              <p
                className="truncate px-5 pb-0 pt-4 text-[12px] font-medium text-[hsl(var(--primary))]"
                title={tableSummaryText}
              >
                {tableSummaryText}
              </p>
              <DataTable
                rowData={bundles}
                columnDefs={columnDefs}
                loading={loadingList}
                pagination
                toolbar={{
                  search: true,
                  searchPlaceholder: "Search…",
                  pdfDocumentTitle: "Exam Scan Bundles",
                }}
                toolbarLeading={<span className="hidden" aria-hidden />}
                toolbarTrailing={
                  bundles.length > 0 ? (
                    <Button
                      type="button"
                      className="h-[30px] px-3 text-[12px]"
                      onClick={() => void loadAndPrintStickers(0, "stickers")}
                      disabled={loadingList}
                    >
                      Bulk Print Stickers
                    </Button>
                  ) : null
                }
              />
            </div>
          </div>
        </div>
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Assign Scan Operator</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-[13px]">
            <div className="text-muted-foreground">
              {tableSummaryText}
              {editRow?.scan_bundle_name
                ? ` / ${txt(editRow.scan_bundle_name)}`
                : ""}
            </div>
            <div className="space-y-1">
              <Label>Scanner Profile</Label>
              <Select
                options={scanProfileOptions}
                value={editForm.scannerProfileDetailId}
                onChange={(v) =>
                  setEditForm((s) => ({
                    ...s,
                    scannerProfileDetailId: v ?? "",
                  }))
                }
                searchable
                placeholder="Select Scanner Profile"
              />
            </div>
            <div className="space-y-1">
              <Label>Total Answer Books</Label>
              <Input
                type="number"
                className="h-8 text-[12px]"
                value={editForm.totalAnswerBooks}
                onChange={(e) =>
                  setEditForm((s) => ({
                    ...s,
                    totalAnswerBooks: e.target.value,
                  }))
                }
              />
            </div>
            <label className="flex items-center gap-2">
              <Checkbox
                checked={editForm.isActive}
                onCheckedChange={(v) =>
                  setEditForm((s) => ({ ...s, isActive: v === true }))
                }
              />
              Active
            </label>
            {!editForm.isActive && (
              <div className="space-y-1">
                <Label>Reason</Label>
                <Input
                  className="h-8 text-[12px]"
                  value={editForm.reason}
                  onChange={(e) =>
                    setEditForm((s) => ({ ...s, reason: e.target.value }))
                  }
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditOpen(false)}
              disabled={savingEdit}
            >
              Cancel
            </Button>
            <Button onClick={() => void saveEdit()} disabled={savingEdit}>
              {savingEdit ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
