"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  ColDef,
  ICellRendererParams,
  IHeaderParams,
} from "ag-grid-community";
import { ChevronDown, Filter } from "lucide-react";
import { PageContainer } from "@/components/layout";
import { DataTable } from "@/common/components/table";
import { Select, type SelectOption } from "@/common/components/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { rowIndexGetter } from "@/lib/utils";
import { toast } from "sonner";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  getExamCenterBundleByCode,
  getExamCenterFilterGroups,
  saveExamCenterAttendance,
  type AnyRow,
} from "@/services/exam-papers-delivery";

type Row = AnyRow;

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

function todayLocalDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function statusLabel(isPresent: boolean | null | undefined): string {
  if (isPresent == null) return "NotTaken";
  return isPresent ? "Present" : "Absent";
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

interface StudentRow extends Row {
  is_present?: boolean | null;
  isufm?: boolean;
}

function MarkAllHeader(
  props: IHeaderParams & {
    checked?: boolean;
    onToggle?: (checked: boolean) => void;
  },
) {
  const checked = Boolean(props.checked);
  return (
    <label className="inline-flex items-center gap-2 text-[12px] font-medium">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => props.onToggle?.(e.target.checked)}
      />
      <span>{checked ? "UnMark All" : "Mark All"}</span>
    </label>
  );
}

export default function ExamCenterSubjectAttendancePage() {
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [egFilterRows, setEgFilterRows] = useState<Row[]>([]);
  const [ecGroupRows, setEcGroupRows] = useState<Row[]>([]);
  const [questionPaperRows, setQuestionPaperRows] = useState<Row[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [showPanel, setShowPanel] = useState(false);
  const [loadingFilters, setLoadingFilters] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [saving, setSaving] = useState(false);
  const [markAll, setMarkAll] = useState(true);
  const [contextLabel, setContextLabel] = useState("");

  const absents = useMemo(
    () => students.filter((r) => r.is_present === false),
    [students],
  );

  const loadAcademicYearAndGroups = useCallback(async () => {
    setLoadingFilters(true);
    try {
      const groups = await getExamCenterFilterGroups({ flag: "eg_filters" });
      const flat: Row[] = [];
      for (const g of groups) {
        if (g.length > 0 && txt(g[0].flag) === "eg_ay_filter") {
          flat.push(...g);
        }
      }
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
    if (!examGroups.length || !form.academicYearId) return;
    setForm((f) => {
      if (f.examGroupId) return f;
      return {
        ...f,
        examGroupId: String(num(examGroups[0].fk_univ_exam_group_id)),
      };
    });
  }, [examGroups, form.academicYearId]);

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
    if (!examCenters.length || !form.examGroupId) return;
    setForm((f) => {
      if (f.examCenterId) return f;
      return { ...f, examCenterId: String(num(examCenters[0].fk_univ_ec_id)) };
    });
  }, [examCenters, form.examGroupId]);

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
    if (!examDates.length || !form.examCenterId) return;
    setForm((f) => {
      if (f.examDate) return f;
      return { ...f, examDate: txt(examDates[0].exam_date) };
    });
  }, [examDates, form.examCenterId]);

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
        if (!cancelled) toastError(e, "Failed to load question papers");
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [form.academicYearId, form.examGroupId, form.examCenterId, form.examDate]);

  useEffect(() => {
    if (!questionPaperRows.length || !form.examDate) return;
    setForm((f) => {
      if (f.questionPaperCode) return f;
      return {
        ...f,
        questionPaperCode: txt(
          questionPaperRows[0].questionPaperCode ??
            questionPaperRows[0].questionpaper_code,
        ),
      };
    });
  }, [questionPaperRows, form.examDate]);

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
    () =>
      examCenters.map((r) => ({
        value: String(num(r.fk_univ_ec_id)),
        label: `${txt(r.ec_code)} - ${txt(r.ec_name)}`,
      })),
    [examCenters],
  );
  const examDateOptions: SelectOption[] = useMemo(
    () =>
      examDates.map((r) => ({
        value: txt(r.exam_date),
        label: txt(r.exam_date),
      })),
    [examDates],
  );
  const questionPaperOptions: SelectOption[] = useMemo(
    () =>
      questionPaperRows.map((r) => {
        const code = txt(r.questionPaperCode ?? r.questionpaper_code);
        const name = txt(r.Questionpaper_name ?? r.questionpaper_name);
        return { value: code, label: name || code };
      }),
    [questionPaperRows],
  );

  function clearList() {
    setStudents([]);
    setShowPanel(false);
    setContextLabel("");
  }

  function onAcademicYearChange(v: string | null) {
    setForm({
      academicYearId: v ?? "",
      examGroupId: "",
      examCenterId: "",
      examDate: "",
      questionPaperCode: "",
    });
    setEcGroupRows([]);
    setQuestionPaperRows([]);
    clearList();
  }

  function onExamGroupChange(v: string | null) {
    setForm((f) => ({
      ...f,
      examGroupId: v ?? "",
      examCenterId: "",
      examDate: "",
      questionPaperCode: "",
    }));
    setQuestionPaperRows([]);
    clearList();
  }

  function onExamCenterChange(v: string | null) {
    setForm((f) => ({
      ...f,
      examCenterId: v ?? "",
      examDate: "",
      questionPaperCode: "",
    }));
    setQuestionPaperRows([]);
    clearList();
  }

  function onExamDateChange(v: string | null) {
    setForm((f) => ({
      ...f,
      examDate: v ?? "",
      questionPaperCode: "",
    }));
    clearList();
  }

  function buildContextHeader() {
    const examGroupCode =
      examGroups.find(
        (r) => num(r.fk_univ_exam_group_id) === Number(form.examGroupId),
      )?.exam_group_code ?? "";
    const examCenterName =
      examCenters.find(
        (r) => num(r.fk_univ_ec_id) === Number(form.examCenterId),
      )?.ec_name ?? "";
    const qp = questionPaperRows.find(
      (r) =>
        txt(r.questionPaperCode ?? r.questionpaper_code) ===
        form.questionPaperCode,
    );
    const qpCode = txt(
      qp?.questionpaper_code ?? qp?.questionPaperCode ?? form.questionPaperCode,
    );
    return `ExamCenter Subject Attendance - ${txt(examGroupCode)} / ${txt(examCenterName)} / ${form.examDate} / ${qpCode}`;
  }

  async function onGetList() {
    if (
      !form.academicYearId ||
      !form.examGroupId ||
      !form.examCenterId ||
      !form.examDate ||
      !form.questionPaperCode
    ) {
      toast.info("Please Select Required Filters");
      return;
    }
    setLoadingList(true);
    try {
      const rows = await getExamCenterBundleByCode({
        flag: "bundle_omr_details",
        univExamcenterId: Number(form.examCenterId),
        examGroupId: Number(form.examGroupId),
        academicYearId: Number(form.academicYearId),
        examDate: form.examDate,
        questionPaperCode: form.questionPaperCode,
      });
      // Angular: default is_present=true if null, isufm=false if null
      const normalized: StudentRow[] = rows.map((r) => ({
        ...r,
        is_present: r.is_present == null ? true : Boolean(r.is_present),
        isufm: r.isufm == null ? false : Boolean(r.isufm),
      }));
      setStudents(normalized);
      setMarkAll(true);
      setShowPanel(true);
      setContextLabel(buildContextHeader());
    } catch (e) {
      toastError(e, "Failed to load attendance list");
      setStudents([]);
      setShowPanel(false);
    } finally {
      setLoadingList(false);
    }
  }

  const toggleAllPresent = useCallback((checked: boolean) => {
    setMarkAll(checked);
    setStudents((prev) => prev.map((r) => ({ ...r, is_present: checked })));
  }, []);

  const setPresent = useCallback((idx: number, present: boolean) => {
    setStudents((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, is_present: present } : r)),
    );
  }, []);

  const setUfm = useCallback((idx: number, ufm: boolean) => {
    setStudents((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, isufm: ufm } : r)),
    );
  }, []);

  async function onSave() {
    if (!students.length) {
      toast.info("Nothing to save.");
      return;
    }
    const empId = Number(globalThis.localStorage?.getItem("employeeId") ?? 0);
    const today = todayLocalDate();
    // Angular addAttendance — no `mark` field in payload
    const payload = students.map((r) => ({
      examStdDetId: num(r.pk_exam_std_det_id),
      examId: num(r.fk_exam_id),
      studentId: num(r.fk_student_id),
      hallticketNo: txt(r.hallticket_number),
      isPresent: r.is_present === true,
      isufm: r.isufm === true,
      attendanceTakenEmpId: empId,
      attendanceTakenDate: today,
      isActive: true,
    }));
    setSaving(true);
    try {
      await saveExamCenterAttendance(payload);
      toastSuccess("Attendance saved.");
      await onGetList();
    } catch (e) {
      toastError(e, "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const columnDefs = useMemo<ColDef<StudentRow>[]>(
    () => [
      {
        headerName: "SI.No",
        valueGetter: rowIndexGetter,
        width: 70,
        flex: 0,
      },
      {
        headerName: "Hall Ticket No.",
        minWidth: 150,
        flex: 1,
        valueGetter: (p) => txt(p.data?.hallticket_number),
      },
      {
        headerName: "Omr Serial No.",
        minWidth: 130,
        flex: 0.9,
        valueGetter: (p) =>
          txt(
            p.data?.omr_serial_no ??
              p.data?.omr_serialno ??
              p.data?.omrSerialNo,
          ),
      },
      {
        headerName: "Ec Seat No.",
        minWidth: 110,
        flex: 0.7,
        valueGetter: (p) => txt(p.data?.ec_seatno ?? p.data?.ecSeatNo),
      },
      {
        headerName: "Subject",
        minWidth: 110,
        flex: 0.7,
        valueGetter: (p) => txt(p.data?.subject_code ?? p.data?.subjectCode),
        tooltipValueGetter: (p) =>
          txt(p.data?.subject_name ?? p.data?.subjectName),
      },
      {
        headerName: "Status",
        minWidth: 100,
        flex: 0.6,
        valueGetter: (p) => statusLabel(p.data?.is_present),
      },
      {
        colId: "mark",
        headerName: "Mark All",
        width: 140,
        flex: 0,
        sortable: false,
        filter: false,
        headerComponent: MarkAllHeader,
        headerComponentParams: {
          checked: markAll,
          onToggle: toggleAllPresent,
        },
        cellRenderer: (p: ICellRendererParams<StudentRow>) => {
          if (!p.data) return null;
          const idx = p.node?.rowIndex ?? -1;
          const present = p.data.is_present === true;
          return (
            <label className="inline-flex items-center gap-2 text-[12px]">
              <input
                type="checkbox"
                checked={present}
                onChange={(e) => setPresent(idx, e.target.checked)}
              />
              <span className={present ? "text-emerald-600" : "text-rose-600"}>
                {statusLabel(p.data.is_present)}
              </span>
            </label>
          );
        },
      },
      {
        headerName: "MalPractise",
        width: 110,
        flex: 0,
        sortable: false,
        filter: false,
        cellRenderer: (p: ICellRendererParams<StudentRow>) => {
          if (!p.data) return null;
          const idx = p.node?.rowIndex ?? -1;
          return (
            <input
              type="checkbox"
              checked={p.data.isufm === true}
              onChange={(e) => setUfm(idx, e.target.checked)}
            />
          );
        },
      },
    ],
    [markAll, toggleAllPresent, setPresent, setUfm],
  );

  return (
    <PageContainer className="space-y-4">
      <div className="app-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/40 flex items-center justify-between gap-2">
          <h2 className="app-card-title">ExamCenter Subject Attendance</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            style={{ marginRight: "0px" }}
            className="h-6 px-2.5 text-[12px]"
            onClick={() => setFiltersOpen((v) => !v)}
            aria-expanded={filtersOpen}
          >
            <Filter className="mr-1.5 h-3.5 w-3.5" />
            Filter
            <ChevronDown
              className={`ml-1.5 h-3.5 w-3.5 transition-transform ${filtersOpen ? "rotate-180" : ""}`}
            />
          </Button>
        </div>

        {filtersOpen && (
          <div className="p-3 space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
              <div className="space-y-1 md:col-span-2">
                <Label>
                  Academic Year <span className="text-destructive">*</span>
                </Label>
                <Select
                  options={academicYearOptions}
                  value={form.academicYearId || null}
                  onChange={onAcademicYearChange}
                  placeholder="Academic Year"
                  disabled={loadingFilters}
                  searchable
                />
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label>
                  Exam Group <span className="text-destructive">*</span>
                </Label>
                <Select
                  options={examGroupOptions}
                  value={form.examGroupId || null}
                  onChange={onExamGroupChange}
                  placeholder="Exam Group"
                  searchable
                />
              </div>
              <div className="space-y-1 md:col-span-3">
                <Label>
                  Exam Center <span className="text-destructive">*</span>
                </Label>
                <Select
                  options={examCenterOptions}
                  value={form.examCenterId || null}
                  onChange={onExamCenterChange}
                  placeholder="Exam Center"
                  searchable
                />
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label>
                  Exam Date <span className="text-destructive">*</span>
                </Label>
                <Select
                  options={examDateOptions}
                  value={form.examDate || null}
                  onChange={onExamDateChange}
                  placeholder="Exam Date"
                  searchable
                />
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label>
                  QuestionPaperCode <span className="text-destructive">*</span>
                </Label>
                <Select
                  options={questionPaperOptions}
                  value={form.questionPaperCode || null}
                  onChange={(v) => {
                    setForm((f) => ({ ...f, questionPaperCode: v ?? "" }));
                    clearList();
                  }}
                  placeholder="QuestionPaperCode"
                  searchable
                />
              </div>
              <div className="md:col-span-1 flex justify-end">
                <Button
                  type="button"
                  onClick={() => void onGetList()}
                  disabled={loadingList}
                >
                  Get List
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {showPanel && students.length > 0 && (
        <>
          <div className="flex items-center justify-between rounded bg-[#edf0f3] px-2 p-1.5 text-[14px]">
            <strong className="font-medium text-primary">{contextLabel}</strong>
          </div>

          {/* <div className="px-1">
            <h3 className="text-[14px] font-semibold text-slate-800">
              {contextLabel}
            </h3>
          </div> */}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
            <div className="lg:col-span-9 app-card overflow-hidden">
              <DataTable
                title=""
                subtitle=""
                rowData={students}
                columnDefs={columnDefs}
                loading={loadingList}
                pagination={false}
                height="420px"
                toolbar={{
                  search: true,
                  searchPlaceholder: "Search",
                  columnPicker: false,
                  exportExcel: false,
                  exportPdf: false,
                }}
                getRowId={(p) =>
                  String(
                    num(p.data?.pk_exam_std_det_id) ||
                      txt(p.data?.hallticket_number),
                  )
                }
              />
            </div>

            <div className="lg:col-span-3 space-y-3">
              <div className="rounded border overflow-hidden">
                <div className="bg-[#c3d9ff] px-3 py-2 text-[13px] font-semibold">
                  Absentees :{" "}
                  <span className="inline-flex min-w-7 items-center justify-center rounded-full bg-cyan-300 px-2 py-0.5 text-[12px] font-bold">
                    {absents.length}
                  </span>
                </div>
                <div className="max-h-[320px] overflow-auto p-3 text-[12px] space-y-1.5">
                  {absents.length === 0 ? (
                    <p className="text-muted-foreground">No absents found.</p>
                  ) : (
                    absents.map((a, i) => (
                      <p key={`ab-${i}`}>
                        {txt(a.student_name)} (
                        <span className="text-blue-700">
                          {txt(a.hallticket_number)}
                        </span>
                        )
                      </p>
                    ))
                  )}
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={() => void onSave()}
                  disabled={saving || students.length === 0}
                >
                  {saving ? "Saving…" : "Save Attendance"}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {showPanel && students.length === 0 && !loadingList && (
        <div className="app-card p-6 text-center text-[13px] text-muted-foreground">
          No students found for the selected filters.
        </div>
      )}
    </PageContainer>
  );
}
