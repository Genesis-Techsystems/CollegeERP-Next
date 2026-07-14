"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { FilteredPage } from "@/components/layout";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
import { DataTable } from "@/common/components/table";
import { Select, type SelectOption } from "@/common/components/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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

function todayLocalDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isPresentValue(v: unknown): boolean | null {
  if (v === true || v === 1 || v === "1" || v === "true") return true;
  if (v === false || v === 0 || v === "0" || v === "false") return false;
  return null;
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

export default function ExamCenterSubjectAttendancePage() {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [egFilterRows, setEgFilterRows] = useState<Row[]>([]);
  const [ecGroupRows, setEcGroupRows] = useState<Row[]>([]);
  const [questionPaperRows, setQuestionPaperRows] = useState<Row[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [absents, setAbsents] = useState<StudentRow[]>([]);
  const [loadingFilters, setLoadingFilters] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [saving, setSaving] = useState(false);
  /** Angular `check`: true → show UnMark All; false → show Mark All */
  const [markAllChecked, setMarkAllChecked] = useState(true);
  const [listReady, setListReady] = useState(false);

  const clearStudents = useCallback(() => {
    setStudents([]);
    setAbsents([]);
    setListReady(false);
    setMarkAllChecked(true);
  }, []);

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
      const years = dedupeBy(flat, (r) => num(r.fk_academic_year_id));
      if (years.length > 0) {
        const ayId = String(num(years[0].fk_academic_year_id));
        setForm((f) => ({
          ...EMPTY_FORM,
          academicYearId: ayId,
        }));
      }
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

  // Angular selectedAcademicYear → auto first exam group, then load centers
  useEffect(() => {
    if (!form.academicYearId || examGroups.length === 0) return;
    const current = Number(form.examGroupId);
    const stillValid = examGroups.some(
      (r) => num(r.fk_univ_exam_group_id) === current,
    );
    if (stillValid) return;
    setForm((f) => ({
      ...f,
      examGroupId: String(num(examGroups[0].fk_univ_exam_group_id)),
      examCenterId: "",
      examDate: "",
      questionPaperCode: "",
    }));
    clearStudents();
  }, [examGroups, form.academicYearId, form.examGroupId, clearStudents]);

  // Angular selectedExamGroup: eg_ec_filters → result[0]
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

  // Angular selectedExamGroup → auto first center
  useEffect(() => {
    if (!form.examGroupId || examCenters.length === 0) return;
    const current = Number(form.examCenterId);
    const stillValid = examCenters.some(
      (r) => num(r.fk_univ_ec_id) === current,
    );
    if (stillValid) return;
    setForm((f) => ({
      ...f,
      examCenterId: String(num(examCenters[0].fk_univ_ec_id)),
      examDate: "",
      questionPaperCode: "",
    }));
    clearStudents();
  }, [examCenters, form.examGroupId, form.examCenterId, clearStudents]);

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

  // Angular selectedExamCenter → auto first date
  useEffect(() => {
    if (!form.examCenterId || examDates.length === 0) return;
    const current = form.examDate;
    const stillValid = examDates.some((r) => txt(r.exam_date) === current);
    if (stillValid) return;
    setForm((f) => ({
      ...f,
      examDate: txt(examDates[0].exam_date),
      questionPaperCode: "",
    }));
    clearStudents();
  }, [examDates, form.examCenterId, form.examDate, clearStudents]);

  // Angular selectedExamDate: eg_ec_qc_filters → result[0]
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

  // Angular selectedExamDate → auto first QP code
  useEffect(() => {
    if (!form.examDate || questionPaperRows.length === 0) return;
    const codeOf = (r: Row) => txt(r.questionpaper_code ?? r.questionPaperCode);
    const current = form.questionPaperCode;
    const stillValid = questionPaperRows.some((r) => codeOf(r) === current);
    if (stillValid) return;
    setForm((f) => ({
      ...f,
      questionPaperCode: codeOf(questionPaperRows[0]),
    }));
    clearStudents();
  }, [questionPaperRows, form.examDate, form.questionPaperCode, clearStudents]);

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
        // Angular template shows ec_name; keep code for disambiguation when present
        label: txt(r.ec_code)
          ? `${txt(r.ec_code)} - ${txt(r.ec_name)}`
          : txt(r.ec_name),
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
        const code = txt(r.questionpaper_code ?? r.questionPaperCode);
        const name = txt(r.Questionpaper_name ?? r.questionpaper_name);
        return { value: code, label: name || code };
      }),
    [questionPaperRows],
  );

  const headerSubtitle = useMemo(() => {
    if (!listReady || students.length === 0) return "";
    const groupCode =
      examGroups.find(
        (r) => num(r.fk_univ_exam_group_id) === Number(form.examGroupId),
      )?.exam_group_code ?? form.examGroupId;
    const centerName =
      examCenters.find(
        (r) => num(r.fk_univ_ec_id) === Number(form.examCenterId),
      )?.ec_name ?? form.examCenterId;
    return `${txt(groupCode)} / ${txt(centerName)} / ${form.examDate} / ${form.questionPaperCode}`;
  }, [
    listReady,
    students.length,
    examGroups,
    examCenters,
    form.examGroupId,
    form.examCenterId,
    form.examDate,
    form.questionPaperCode,
  ]);

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
    try {
      const rows = await getExamCenterBundleByCode({
        flag: "bundle_omr_details",
        univExamcenterId: Number(form.examCenterId),
        examGroupId: Number(form.examGroupId),
        academicYearId: Number(form.academicYearId),
        examDate: form.examDate,
        questionPaperCode: form.questionPaperCode,
      });
      // Angular: null present → true; null isufm → false; collect absents where false
      const nextAbsents: StudentRow[] = [];
      const normalized: StudentRow[] = rows.map((r) => {
        let present = isPresentValue(r.is_present);
        if (present === null) present = true;
        const ufm =
          r.isufm == null
            ? false
            : r.isufm === true || r.isufm === 1 || r.isufm === "1";
        const row: StudentRow = { ...r, is_present: present, isufm: ufm };
        if (present === false) nextAbsents.push(row);
        return row;
      });
      setStudents(normalized);
      setAbsents(nextAbsents);
      setMarkAllChecked(true);
      setListReady(true);
    } catch (e) {
      toastError(e, "Failed to load attendance list");
      clearStudents();
    } finally {
      setLoadingList(false);
    }
  }

  function syncAbsents(nextStudents: StudentRow[]) {
    setAbsents(nextStudents.filter((r) => r.is_present === false));
  }

  /** Angular markItems — checkbox true = all present (UnMark All label), false = all absent */
  function onMarkAllChange(checked: boolean) {
    setMarkAllChecked(checked);
    setStudents((prev) => {
      const next = prev.map((r) => ({
        ...r,
        is_present: checked,
      }));
      setAbsents(checked ? [] : next);
      return next;
    });
  }

  /** Angular checkedItems — toggle present and refresh absentees */
  function togglePresent(rowIndex: number, nextPresent: boolean) {
    setStudents((prev) => {
      const next = prev.map((r, i) =>
        i === rowIndex ? { ...r, is_present: nextPresent } : r,
      );
      syncAbsents(next);
      return next;
    });
  }

  function toggleUfm(rowIndex: number, checked: boolean) {
    setStudents((prev) =>
      prev.map((r, i) => (i === rowIndex ? { ...r, isufm: checked } : r)),
    );
  }

  async function onSave() {
    if (!students.length) {
      toastInfo("Nothing to save.");
      return;
    }
    const empId = Number(globalThis.localStorage?.getItem("employeeId") ?? 0);
    const today = todayLocalDate();
    // Angular addAttendance — no `mark` field
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

  function statusLabel(present: boolean | null | undefined): string {
    if (present === true) return "Present";
    if (present === false) return "Absent";
    return "NotTaken";
  }

  const columnDefs = useMemo(
    (): ColDef<StudentRow>[] => [
      { headerName: "SI.No", valueGetter: rowIndexGetter, width: 70, flex: 0 },
      {
        headerName: "Hall Ticket No.",
        minWidth: 150,
        valueGetter: (p) => txt(p.data?.hallticket_number),
      },
      {
        headerName: "Omr Serial No.",
        minWidth: 130,
        valueGetter: (p) =>
          txt(
            p.data?.omr_serial_no ??
              p.data?.omr_serialno ??
              p.data?.omrSerialNo,
          ),
      },
      {
        headerName: "Ec Seat No.",
        minWidth: 120,
        valueGetter: (p) => txt(p.data?.ec_seatno ?? p.data?.ecSeatNo),
      },
      {
        headerName: "Subject",
        minWidth: 120,
        valueGetter: (p) => txt(p.data?.subject_code ?? p.data?.subjectCode),
        tooltipValueGetter: (p) =>
          txt(p.data?.subject_name ?? p.data?.subjectName),
      },
      {
        headerName: "Status",
        minWidth: 100,
        width: 110,
        valueGetter: (p) => statusLabel(p.data?.is_present as boolean | null),
      },
      {
        colId: "presentToggle",
        headerName: "Present / Absent",
        minWidth: 150,
        cellRenderer: (p: ICellRendererParams<StudentRow>) => {
          if (!p.data) return null;
          const idx = p.node?.rowIndex ?? -1;
          if (idx < 0) return null;
          const present = p.data.is_present === true;
          return (
            <label className="inline-flex items-center gap-2 text-[12px]">
              <Checkbox
                checked={present}
                onCheckedChange={(v) => togglePresent(idx, v === true)}
              />
              <span
                className={
                  present
                    ? "text-emerald-700 font-medium"
                    : "text-red-600 font-medium"
                }
              >
                {statusLabel(p.data.is_present as boolean | null)}
              </span>
            </label>
          );
        },
      },
      {
        headerName: "MalPractise",
        minWidth: 100,
        width: 110,
        cellRenderer: (p: ICellRendererParams<StudentRow>) => {
          if (!p.data) return null;
          const idx = p.node?.rowIndex ?? -1;
          if (idx < 0) return null;
          return (
            <Checkbox
              checked={p.data.isufm === true}
              onCheckedChange={(v) => toggleUfm(idx, v === true)}
            />
          );
        },
      },
    ],
    [],
  );

  function onAcademicYearChange(v: string | null) {
    clearStudents();
    setEcGroupRows([]);
    setQuestionPaperRows([]);
    setForm({
      ...EMPTY_FORM,
      academicYearId: v ?? "",
    });
  }

  function onExamGroupChange(v: string | null) {
    clearStudents();
    setQuestionPaperRows([]);
    setForm((f) => ({
      ...f,
      examGroupId: v ?? "",
      examCenterId: "",
      examDate: "",
      questionPaperCode: "",
    }));
  }

  function onExamCenterChange(v: string | null) {
    clearStudents();
    setQuestionPaperRows([]);
    setForm((f) => ({
      ...f,
      examCenterId: v ?? "",
      examDate: "",
      questionPaperCode: "",
    }));
  }

  function onExamDateChange(v: string | null) {
    clearStudents();
    setForm((f) => ({
      ...f,
      examDate: v ?? "",
      questionPaperCode: "",
    }));
  }

  function onQuestionPaperChange(v: string | null) {
    clearStudents();
    setForm((f) => ({ ...f, questionPaperCode: v ?? "" }));
  }

  const filters = (
    <>
      <GlobalFilterBarRow>
        <GlobalFilterField label="Academic Year *">
          <Select
            options={academicYearOptions}
            value={form.academicYearId || null}
            onChange={onAcademicYearChange}
            disabled={loadingFilters}
            placeholder="Academic Year"
          />
        </GlobalFilterField>
        <GlobalFilterField label="Exam Group *">
          <Select
            options={examGroupOptions}
            value={form.examGroupId || null}
            onChange={onExamGroupChange}
            placeholder="Exam Group"
          />
        </GlobalFilterField>
        <GlobalFilterField label="Exam Center *">
          <Select
            options={examCenterOptions}
            value={form.examCenterId || null}
            onChange={onExamCenterChange}
            placeholder="Exam Center"
            searchable
          />
        </GlobalFilterField>
        <GlobalFilterField label="Exam Date *">
          <Select
            options={examDateOptions}
            value={form.examDate || null}
            onChange={onExamDateChange}
            placeholder="Exam Date"
            searchable
          />
        </GlobalFilterField>
      </GlobalFilterBarRow>
      <GlobalFilterBarRow>
        <GlobalFilterField label="Question Paper Code *">
          <Select
            options={questionPaperOptions}
            value={form.questionPaperCode || null}
            onChange={onQuestionPaperChange}
            placeholder="Question Paper Code"
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

  return (
    <FilteredPage
      title={
        listReady && headerSubtitle
          ? `ExamCenter Subject Attendance`
          : "Exam Center Subject Attendance"
      }
      filters={filters}
    >
      {students.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
          <div className="lg:col-span-8 min-w-0">
            <DataTable
              title={`Students (${students.length})`}
              rowData={students}
              columnDefs={columnDefs}
              loading={loadingList}
              pagination
              bordered
              toolbar={SEARCH_ONLY_TOOLBAR}
              toolbarTrailing={
                <label className="inline-flex items-center gap-2 text-[12px] font-medium whitespace-nowrap">
                  <Checkbox
                    checked={markAllChecked}
                    onCheckedChange={(v) => onMarkAllChange(v === true)}
                  />
                  {markAllChecked ? "UnMark All" : "Mark All"}
                </label>
              }
              getRowId={(p) =>
                String(
                  num(p.data?.pk_exam_std_det_id) ||
                    txt(p.data?.hallticket_number) ||
                    "row",
                )
              }
            />
          </div>
          <div className="lg:col-span-4 space-y-3">
            <div className="app-card overflow-hidden">
              <div className="px-3 py-2.5 border-b border-border bg-muted/40 flex items-center justify-between gap-2">
                <h3 className="text-[13px] font-semibold text-foreground">
                  Absentees
                </h3>
                <span className="rounded-full bg-cyan-100 text-cyan-900 px-2.5 py-0.5 text-[12px] font-bold tabular-nums">
                  {absents.length}
                </span>
              </div>
              <div className="p-3 max-h-[min(520px,60vh)] overflow-y-auto space-y-1.5">
                {absents.length === 0 ? (
                  <p className="text-[12px] text-muted-foreground py-4 text-center">
                    No absents found.
                  </p>
                ) : (
                  absents.map((a, i) => (
                    <p
                      key={`abs-${txt(a.hallticket_number)}-${i}`}
                      className="text-[12px] text-foreground"
                    >
                      {txt(a.student_name) || "—"}{" "}
                      <span className="text-blue-700 font-medium">
                        ({txt(a.hallticket_number)})
                      </span>
                    </p>
                  ))
                )}
              </div>
            </div>
            <Button
              type="button"
              className="w-full"
              onClick={() => void onSave()}
              disabled={saving || !students.length}
            >
              {saving ? "Saving…" : "Save Attendance"}
            </Button>
          </div>
        </div>
      )}
    </FilteredPage>
  );
}
