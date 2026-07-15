"use client";

/**
 * Exam Scan Bundle New / Scan Bundles Print.
 * Angular: exam-papers-delivery-process/exam-scan-bundles-print
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { Printer } from "lucide-react";
import { FilteredPage } from "@/components/layout";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
import { DataTable } from "@/common/components/table";
import { Select } from "@/common/components/select";
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
import { rowIndexGetter } from "@/lib/utils";
import { toast } from "sonner";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  getExamCenterFilterGroups,
  getExamScanBundleStickers,
  listExamScanBundlesByCode,
  listExamScanProfilesByGroup,
  updateExamScanBundle,
  type AnyRow,
} from "@/services/exam-papers-delivery";
import {
  ExamBundlePrintStickersView,
  type StickerVariant,
} from "../exam-bundle-print/ExamBundlePrintStickersView";

type Row = AnyRow;

const SCAN_DETAILS_ROUTE =
  "/admin-examination-management/exam-papers-delivery-process/exam-scan-bundles-print/scan-bundle-details";

const SEARCH_ONLY_TOOLBAR = {
  search: true,
  searchPlaceholder: "Search...",
  columnPicker: false,
  exportPdf: false,
  exportExcel: false,
  columnFilters: false,
} as const;

const toastInfo = (msg: string) => toast.info(msg);

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function txt(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
}
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
function qpCodeOf(r: Row): string {
  return txt(r.questionpaper_code ?? r.questionPaperCode);
}
function qpNameOf(r: Row): string {
  return txt(r.Questionpaper_name ?? r.questionpaper_name) || qpCodeOf(r);
}
function profileIdOf(r: Row): number {
  return num(
    r.pk_exam_scan_profile_detail_id ??
      r.pk_exam_scan_profile_id ??
      r.scannerProfileDetailId ??
      r.fk_scanner_profiledet_id,
  );
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

type PrintMode = StickerVariant;

export default function ExamScanBundlesPrintPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [egFilterRows, setEgFilterRows] = useState<Row[]>([]);
  const [ecGroupRows, setEcGroupRows] = useState<Row[]>([]);
  const [questionPaperRows, setQuestionPaperRows] = useState<Row[]>([]);
  const [bundles, setBundles] = useState<Row[]>([]);
  const [loadingFilters, setLoadingFilters] = useState(false);
  const [loadingList, setLoadingList] = useState(false);

  const [stickerRows, setStickerRows] = useState<Row[]>([]);
  const [stickerView, setStickerView] = useState<PrintMode | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState<Row | null>(null);
  const [scanProfiles, setScanProfiles] = useState<Row[]>([]);
  const [editForm, setEditForm] = useState({
    bundleNumber: "",
    scannerProfileDetailId: "",
    isActive: true,
    reason: "",
  });
  const [savingEdit, setSavingEdit] = useState(false);

  const clearResults = useCallback(() => {
    setBundles([]);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadingFilters(true);
      try {
        const groups = await getExamCenterFilterGroups({ flag: "eg_filters" });
        if (cancelled) return;
        const flat: Row[] = [];
        for (const g of groups) {
          if (g.length > 0 && txt(g[0].flag) === "eg_ay_filter") flat.push(...g);
        }
        setEgFilterRows(flat);
      } catch (e) {
        if (!cancelled) toastError(e, "Failed to load filters");
      } finally {
        if (!cancelled) setLoadingFilters(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const academicYears = useMemo(
    () =>
      dedupeBy(egFilterRows, (r) => num(r.fk_academic_year_id)).sort((a, b) =>
        txt(b.academic_year).localeCompare(txt(a.academic_year)),
      ),
    [egFilterRows],
  );

  useEffect(() => {
    if (!academicYears.length) return;
    const ok = academicYears.some(
      (r) => num(r.fk_academic_year_id) === Number(form.academicYearId),
    );
    if (ok) return;
    setForm({
      ...EMPTY_FORM,
      academicYearId: String(num(academicYears[0].fk_academic_year_id)),
    });
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
    if (!form.academicYearId || !examGroups.length) return;
    const ok = examGroups.some(
      (r) => num(r.fk_univ_exam_group_id) === Number(form.examGroupId),
    );
    if (ok) return;
    clearResults();
    setForm((f) => ({
      ...f,
      examGroupId: String(num(examGroups[0].fk_univ_exam_group_id)),
      examCenterId: "",
      examDate: "",
      questionPaperCode: "",
    }));
  }, [examGroups, form.academicYearId, form.examGroupId, clearResults]);

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
        setEcGroupRows(groups[0] ?? []);
      } catch (e) {
        if (!cancelled) {
          setEcGroupRows([]);
          toastError(e, "Failed to load exam centers");
        }
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
    if (!form.examGroupId || !examCenters.length) return;
    const ok = examCenters.some(
      (r) => num(r.fk_univ_ec_id) === Number(form.examCenterId),
    );
    if (ok) return;
    clearResults();
    setForm((f) => ({
      ...f,
      examCenterId: String(num(examCenters[0].fk_univ_ec_id)),
      examDate: "",
      questionPaperCode: "",
    }));
  }, [examCenters, form.examGroupId, form.examCenterId, clearResults]);

  const examDates = useMemo(
    () =>
      dedupeBy(
        ecGroupRows.filter(
          (r) => num(r.fk_univ_ec_id) === Number(form.examCenterId),
        ),
        (r) => txt(r.exam_date),
      ),
    [ecGroupRows, form.examCenterId],
  );

  useEffect(() => {
    if (!form.examCenterId || !examDates.length) return;
    const ok = examDates.some((r) => txt(r.exam_date) === form.examDate);
    if (ok) return;
    clearResults();
    setForm((f) => ({
      ...f,
      examDate: txt(examDates[0].exam_date),
      questionPaperCode: "",
    }));
  }, [examDates, form.examCenterId, form.examDate, clearResults]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (
        !form.academicYearId ||
        !form.examGroupId ||
        !form.examCenterId ||
        !form.examDate
      ) {
        setQuestionPaperRows([]);
        return;
      }
      try {
        const groups = await getExamCenterFilterGroups({
          flag: "eg_ec_qc_filters",
          academicYearId: Number(form.academicYearId),
          examGroupId: Number(form.examGroupId),
          univExamcenterId: Number(form.examCenterId),
          examDate: form.examDate,
        });
        if (cancelled) return;
        setQuestionPaperRows(groups[0] ?? []);
      } catch (e) {
        if (!cancelled) {
          setQuestionPaperRows([]);
          toastError(e, "Failed to load question papers");
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [form.academicYearId, form.examGroupId, form.examCenterId, form.examDate]);

  useEffect(() => {
    if (!form.examDate || !questionPaperRows.length) return;
    const ok = questionPaperRows.some(
      (r) => qpCodeOf(r) === form.questionPaperCode,
    );
    if (ok) return;
    clearResults();
    setForm((f) => ({
      ...f,
      questionPaperCode: qpCodeOf(questionPaperRows[0]),
    }));
  }, [questionPaperRows, form.examDate, form.questionPaperCode, clearResults]);

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

  async function onGetList() {
    if (
      !form.academicYearId ||
      !form.examGroupId ||
      !form.examCenterId ||
      !form.examDate ||
      !form.questionPaperCode
    ) {
      toastInfo("Please Select Required Filters");
      return;
    }
    setLoadingList(true);
    clearResults();
    try {
      const rows = await listExamScanBundlesByCode({
        univExamcenterId: Number(form.examCenterId),
        examGroupId: Number(form.examGroupId),
        academicYearId: Number(form.academicYearId),
        examDate: form.examDate,
        questionPaperCode: form.questionPaperCode,
      });
      setBundles(Array.isArray(rows) ? rows : []);
      if (!rows.length) toastSuccess("No Records Found.");
    } catch (e) {
      toastError(e, "Failed to load scan bundles");
      setBundles([]);
    } finally {
      setLoadingList(false);
    }
  }

  // Bulk = English stickers (Angular getPrintStickersData);
  // row print = New/Gujarati (Angular getPrintStickersDataNew).
  // Use sticker preview + iframe print (same as exam-bundle-print) — avoids
  // blank PDF when printing through AppShell with window.print().
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
        toastInfo("No stickers found for this bundle.");
        return;
      }
      setStickerRows(rows);
      setStickerView(mode);
    } catch (e) {
      toastError(e, "Failed to load stickers");
    } finally {
      setLoadingList(false);
    }
  }

  async function openAssignOperator(row: Row) {
    setEditRow(row);
    setEditForm({
      bundleNumber: txt(row.bundle_number ?? row.bundleNumber),
      scannerProfileDetailId: String(
        profileIdOf(row) || num(row.scannerProfileDetailId) || "",
      ),
      isActive: row.isActive == null ? true : row.isActive === true,
      reason: txt(row.reason),
    });
    setEditOpen(true);
    const profiles = await listExamScanProfilesByGroup(
      Number(form.examGroupId),
    ).catch(() => []);
    setScanProfiles(dedupeBy(profiles, (r) => profileIdOf(r)));
  }

  async function saveAssignOperator() {
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
      // Angular updateDetails keeps totalAnswerBooks from the list row
      await updateExamScanBundle(id, {
        univExamScanbundleId: id,
        univExamGroupId: Number(form.examGroupId),
        questionPaperCode: form.questionPaperCode,
        scannerProfileDetailId: editForm.scannerProfileDetailId
          ? Number(editForm.scannerProfileDetailId)
          : null,
        totalAnswerBooks: num(
          editRow.total_answer_books ?? editRow.totalAnswerBooks,
        ),
        isActive: editForm.isActive,
        reason: editForm.isActive ? null : editForm.reason || null,
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
      scannerProfileDetailId: String(profileIdOf(row)),
    });
    router.push(`${SCAN_DETAILS_ROUTE}?${qp.toString()}`);
  }

  const columnDefs = useMemo(
    (): ColDef<Row>[] => [
      { headerName: "SL No.", valueGetter: rowIndexGetter, width: 80, flex: 0 },
      {
        headerName: "Bundle Number",
        minWidth: 160,
        valueGetter: (p) =>
          txt(p.data?.scan_bundle_name ?? p.data?.exam_bundle_name),
      },
      {
        headerName: "Scan Profile Name",
        minWidth: 150,
        valueGetter: (p) =>
          txt(p.data?.scan_profile_name ?? p.data?.scannerProfileDetailId),
      },
      {
        headerName: "Total Answer Books",
        minWidth: 140,
        valueGetter: (p) =>
          txt(p.data?.total_answer_books ?? p.data?.totalAnswerBooks),
      },
      {
        headerName: "Start Seat No",
        minWidth: 120,
        valueGetter: (p) =>
          txt(p.data?.start_ec_seatno ?? p.data?.startEcSeatNo),
      },
      {
        headerName: "End Seat No",
        minWidth: 120,
        valueGetter: (p) => txt(p.data?.end_ec_seatno ?? p.data?.endEcSeatNo),
      },
      {
        headerName: "Actions",
        minWidth: 320,
        flex: 0,
        cellRenderer: (p: ICellRendererParams<Row>) => {
          if (!p.data) return null;
          const id = num(p.data.pk_univ_exam_scan_bundle_id);
          return (
            <div className="flex items-center gap-1.5 text-[12px]">
              <button
                type="button"
                className="text-[hsl(var(--primary))] hover:underline whitespace-nowrap"
                onClick={() => openBundleDetails(p.data!)}
              >
                Bundle Details
              </button>
              <span className="text-muted-foreground">|</span>
              <button
                type="button"
                className="text-[hsl(var(--primary))] hover:underline whitespace-nowrap"
                onClick={() => void openAssignOperator(p.data!)}
              >
                Assign Scan Operator
              </button>
              <span className="text-muted-foreground">|</span>
              <button
                type="button"
                className="inline-flex items-center text-red-600 hover:text-red-700"
                title="Print Stickers New Format"
                onClick={() => void loadAndPrintStickers(id, "stickers-gu")}
              >
                <Printer className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form, header],
  );

  const filters = (
    <>
      <GlobalFilterBarRow>
        <GlobalFilterField label="Academic Year *">
          <Select
            options={academicYears.map((r) => ({
              value: String(num(r.fk_academic_year_id)),
              label: txt(r.academic_year),
            }))}
            value={form.academicYearId || null}
            onChange={(v) => {
              clearResults();
              setEcGroupRows([]);
              setQuestionPaperRows([]);
              setForm({
                ...EMPTY_FORM,
                academicYearId: v ?? "",
              });
            }}
            disabled={loadingFilters}
            placeholder="Academic Year"
          />
        </GlobalFilterField>
        <GlobalFilterField label="Exam Group *">
          <Select
            options={examGroups.map((r) => ({
              value: String(num(r.fk_univ_exam_group_id)),
              label: txt(r.exam_group_code),
            }))}
            value={form.examGroupId || null}
            onChange={(v) => {
              clearResults();
              setQuestionPaperRows([]);
              setForm((f) => ({
                ...f,
                examGroupId: v ?? "",
                examCenterId: "",
                examDate: "",
                questionPaperCode: "",
              }));
            }}
            placeholder="Exam Group"
          />
        </GlobalFilterField>
        <GlobalFilterField label="Exam Center *">
          <Select
            options={examCenters.map((r) => ({
              value: String(num(r.fk_univ_ec_id)),
              label: txt(r.ec_name) || txt(r.ec_code),
            }))}
            value={form.examCenterId || null}
            onChange={(v) => {
              clearResults();
              setQuestionPaperRows([]);
              setForm((f) => ({
                ...f,
                examCenterId: v ?? "",
                examDate: "",
                questionPaperCode: "",
              }));
            }}
            placeholder="Exam Center"
            searchable
          />
        </GlobalFilterField>
        <GlobalFilterField label="Exam Date *">
          <Select
            options={examDates.map((r) => ({
              value: txt(r.exam_date),
              label: txt(r.exam_date),
            }))}
            value={form.examDate || null}
            onChange={(v) => {
              clearResults();
              setForm((f) => ({
                ...f,
                examDate: v ?? "",
                questionPaperCode: "",
              }));
            }}
            placeholder="Exam Date"
            searchable
          />
        </GlobalFilterField>
      </GlobalFilterBarRow>
      <GlobalFilterBarRow>
        <GlobalFilterField label="QuestionPaperCode *">
          <Select
            options={questionPaperRows.map((r) => ({
              value: qpCodeOf(r),
              label: qpNameOf(r),
            }))}
            value={form.questionPaperCode || null}
            onChange={(v) => {
              clearResults();
              setForm((f) => ({ ...f, questionPaperCode: v ?? "" }));
            }}
            placeholder="QuestionPaperCode"
            searchable
          />
        </GlobalFilterField>
        <GlobalFilterField
          label=""
          className="global-filter-field--shrink global-filter-field--action"
        >
          <Button
            type="button"
            onClick={() => void onGetList()}
            disabled={loadingList}
            className="h-[30px] px-3 text-[12px]"
          >
            Get List
          </Button>
        </GlobalFilterField>
      </GlobalFilterBarRow>
    </>
  );

  // Sticker preview (Angular exam-scan-bundle-print-stickers / -gu).
  // Print uses an isolated iframe so the PDF is not blank under AppShell.
  if (stickerView === "stickers" || stickerView === "stickers-gu") {
    return (
      <ExamBundlePrintStickersView
        stickerRows={stickerRows}
        examGroupCode={header.examGroupCode}
        variant={stickerView}
        onBack={() => setStickerView(null)}
      />
    );
  }

  const showTable = bundles.length > 0;

  return (
    <FilteredPage title="Scan Bundles" filters={filters}>
      {showTable && (
        <DataTable
          title={`Scan Bundles - ${header.examGroupCode} / ${header.examCenterCode} / ${header.examDate} / ${header.questionPaperCode}`}
          rowData={bundles}
          columnDefs={columnDefs}
          loading={loadingList}
          pagination
          bordered
          toolbar={SEARCH_ONLY_TOOLBAR}
          toolbarTrailing={
            <Button
              type="button"
              className="h-[30px] px-3 text-[12px]"
              onClick={() => void loadAndPrintStickers(0, "stickers")}
            >
              Bulk Print Stickers
            </Button>
          }
          getRowId={(p) =>
            String(
              num(p.data?.pk_univ_exam_scan_bundle_id) ||
                txt(p.data?.scan_bundle_name) ||
                "row",
            )
          }
        />
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Scan Bundles</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-[13px]">
            <div
              className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-[11px] leading-snug text-slate-600 break-words"
              title={[
                header.examGroupCode,
                header.examCenterCode,
                header.examDate,
                header.questionPaperCode,
                txt(editRow?.scan_bundle_name),
              ]
                .filter(Boolean)
                .join(" / ")}
            >
              {[
                header.examGroupCode,
                header.examCenterCode,
                header.examDate,
                header.questionPaperCode,
                txt(editRow?.scan_bundle_name),
              ]
                .filter(Boolean)
                .join(" / ")}
            </div>
            <div className="space-y-1">
              <Label>Bundle Number</Label>
              <Input
                className="h-8 text-[12px]"
                value={editForm.bundleNumber}
                readOnly
                disabled
              />
            </div>
            <div className="space-y-1">
              <Label>Exam Scan Profile</Label>
              <Select
                options={scanProfiles.map((r) => ({
                  value: String(profileIdOf(r)),
                  label:
                    txt(r.scan_profile_name ?? r.scanProfileName) ||
                    String(profileIdOf(r)),
                }))}
                value={editForm.scannerProfileDetailId || null}
                onChange={(v) =>
                  setEditForm((s) => ({
                    ...s,
                    scannerProfileDetailId: v ?? "",
                  }))
                }
                searchable
                placeholder="Select Scan Profile"
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
              Close
            </Button>
            <Button
              onClick={() => void saveAssignOperator()}
              disabled={savingEdit}
            >
              {savingEdit ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FilteredPage>
  );
}
