"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { Pencil, Plus } from "lucide-react";
import { FilteredPage } from "@/components/layout";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
  ActiveStatusField,
} from "@/common/components/forms";
import { DataTable } from "@/common/components/table";
import { Select } from "@/common/components/select";
import { FormModal } from "@/common/components/feedback";
import { StatusBadge } from "@/common/components/data-display";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { rowIndexGetter } from "@/lib/utils";
import { toast } from "sonner";
import { toastError, toastSuccess } from "@/lib/toast";
import { GM_CODES } from "@/config/constants/ui";
import { listGeneralDetailsByMaster } from "@/services/examination";
import {
  createUnivExamBag,
  getExamBagsFilterRows,
  listUnivExamBagsByCenterAndTimetable,
  pickUnivExamBagId,
  updateUnivExamBag,
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
function truthy(v: unknown): boolean {
  return v === true || v === 1 || v === "1" || v === "true";
}
function formatExamDate(v: unknown): string {
  const s = txt(v);
  if (!s) return "";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
function examLabel(r: Row): string {
  const name = txt(r.exam_name);
  const from = formatExamDate(r.from_date);
  const to = formatExamDate(r.to_date);
  const range = from && to ? ` (${from} - ${to})` : "";
  const tags: string[] = [];
  if (truthy(r.is_internal_exam)) tags.push("(Internal)");
  if (truthy(r.is_regular_exam)) tags.push("(Regular)");
  if (truthy(r.is_supply_exam)) tags.push("(Supple)");
  return `${name}${range}${tags.length ? ` ${tags.join(" ")}` : ""}`;
}
function dedupeBy<T>(rows: T[], keyFn: (row: T) => number): T[] {
  const seen = new Set<number>();
  const out: T[] = [];
  for (const r of rows) {
    const key = keyFn(r);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

function statusRenderer(p: ICellRendererParams<Row>) {
  return <StatusBadge status={Boolean(p.data?.isActive)} />;
}
function sealedRenderer(p: ICellRendererParams<Row>) {
  return (
    <StatusBadge
      status={Boolean(p.data?.isSealed)}
      label={p.data?.isSealed ? "Yes" : "No"}
    />
  );
}

interface FormState {
  univExamcenterId: string;
  courseId: string;
  academicYearId: string;
  examId: string;
}

const EMPTY_FORM: FormState = {
  univExamcenterId: "",
  courseId: "",
  academicYearId: "",
  examId: "",
};

export default function UnivExamBagsPage() {
  const [loadingFilters, setLoadingFilters] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [saving, setSaving] = useState(false);

  const [centerRows, setCenterRows] = useState<Row[]>([]);
  const [collegeFilterRows, setCollegeFilterRows] = useState<Row[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [showTable, setShowTable] = useState(false);
  const [dispatchStatuses, setDispatchStatuses] = useState<Row[]>([]);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [examTimetableId, setExamTimetableId] = useState(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [formModal, setFormModal] = useState({
    bagSerialNo: "",
    totalAnswerBooks: "",
    trackerId: "",
    sealedbyName: "",
    dispatchStatusCatdetId: "",
    isSealed: false,
    isActive: true,
    reason: "active",
  });

  const [employeeId, setEmployeeId] = useState(0);

  useEffect(() => {
    setEmployeeId(
      Number(globalThis?.localStorage?.getItem("employeeId") ?? 0),
    );
  }, []);

  const clearResults = useCallback(() => {
    setRows([]);
    setShowTable(false);
    setExamTimetableId(0);
  }, []);

  // Angular getExamCenters: college_center_filters
  useEffect(() => {
    let cancelled = false;
    async function init() {
      setLoadingFilters(true);
      try {
        const list = await getExamBagsFilterRows({
          flag: "college_center_filters",
        });
        if (cancelled) return;
        setCenterRows(list);
        const centers = dedupeBy(list, (r) => num(r.fk_univ_examcenter_id));
        if (centers[0]) {
          setForm({
            ...EMPTY_FORM,
            univExamcenterId: String(num(centers[0].fk_univ_examcenter_id)),
          });
        }
      } catch (e) {
        if (!cancelled) toastError(e, "Failed to load exam centers");
      } finally {
        if (!cancelled) setLoadingFilters(false);
      }
    }
    void init();
    return () => {
      cancelled = true;
    };
  }, []);

  const examCenters = useMemo(
    () => dedupeBy(centerRows, (r) => num(r.fk_univ_examcenter_id)),
    [centerRows],
  );

  // Angular selectedExamCenter: exam_center_clg_filters → exam_center_filters
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!form.univExamcenterId) {
        setCollegeFilterRows([]);
        return;
      }
      setLoadingFilters(true);
      try {
        const list = await getExamBagsFilterRows({
          flag: "exam_center_clg_filters",
          univExamcenterId: Number(form.univExamcenterId),
        });
        if (cancelled) return;
        setCollegeFilterRows(list);
      } catch (e) {
        if (!cancelled) {
          setCollegeFilterRows([]);
          toastError(e, "Failed to load courses / exams");
        }
      } finally {
        if (!cancelled) setLoadingFilters(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [form.univExamcenterId]);

  const courses = useMemo(
    () => dedupeBy(collegeFilterRows, (r) => num(r.fk_course_id)),
    [collegeFilterRows],
  );
  const academicYears = useMemo(
    () =>
      dedupeBy(
        collegeFilterRows.filter(
          (r) => num(r.fk_course_id) === Number(form.courseId),
        ),
        (r) => num(r.fk_academic_year_id),
      ).sort((a, b) =>
        txt(b.academic_year).localeCompare(txt(a.academic_year)),
      ),
    [collegeFilterRows, form.courseId],
  );
  const exams = useMemo(
    () =>
      dedupeBy(
        collegeFilterRows.filter(
          (r) =>
            num(r.fk_course_id) === Number(form.courseId) &&
            num(r.fk_academic_year_id) === Number(form.academicYearId) &&
            !truthy(r.is_internal_exam),
        ),
        (r) => num(r.fk_exam_id),
      ),
    [collegeFilterRows, form.courseId, form.academicYearId],
  );

  // Cascade: first course → AY → exam
  useEffect(() => {
    if (!form.univExamcenterId || courses.length === 0) return;
    const ok = courses.some(
      (r) => num(r.fk_course_id) === Number(form.courseId),
    );
    if (ok) return;
    clearResults();
    setForm((f) => ({
      ...f,
      courseId: String(num(courses[0].fk_course_id)),
      academicYearId: "",
      examId: "",
    }));
  }, [courses, form.univExamcenterId, form.courseId, clearResults]);

  useEffect(() => {
    if (!form.courseId || academicYears.length === 0) return;
    const ok = academicYears.some(
      (r) => num(r.fk_academic_year_id) === Number(form.academicYearId),
    );
    if (ok) return;
    clearResults();
    setForm((f) => ({
      ...f,
      academicYearId: String(num(academicYears[0].fk_academic_year_id)),
      examId: "",
    }));
  }, [academicYears, form.courseId, form.academicYearId, clearResults]);

  useEffect(() => {
    if (!form.academicYearId || exams.length === 0) return;
    const ok = exams.some((r) => num(r.fk_exam_id) === Number(form.examId));
    if (ok) return;
    clearResults();
    setForm((f) => ({
      ...f,
      examId: String(num(exams[0].fk_exam_id)),
    }));
  }, [exams, form.academicYearId, form.examId, clearResults]);

  // Load dispatch statuses when modal opens (Angular selectedExam)
  useEffect(() => {
    if (!modalOpen) return;
    let cancelled = false;
    async function load() {
      try {
        const list = await listGeneralDetailsByMaster(
          GM_CODES.EXAM_BAG_DISPATCH_STATUS,
        );
        if (!cancelled) setDispatchStatuses(Array.isArray(list) ? list : []);
      } catch {
        if (!cancelled) setDispatchStatuses([]);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [modalOpen]);

  const headerText = useMemo(() => {
    const course = courses.find(
      (x) => num(x.fk_course_id) === Number(form.courseId),
    );
    const ay = academicYears.find(
      (x) => num(x.fk_academic_year_id) === Number(form.academicYearId),
    );
    const exam = exams.find((x) => num(x.fk_exam_id) === Number(form.examId));
    const center = examCenters.find(
      (x) => num(x.fk_univ_examcenter_id) === Number(form.univExamcenterId),
    );
    return [
      txt(course?.course_code),
      txt(ay?.academic_year),
      txt(exam?.exam_name),
      txt(center?.examcenter_code),
    ]
      .filter(Boolean)
      .join(" / ");
  }, [courses, academicYears, exams, examCenters, form]);

  function pickTimetableId(): number {
    return num(
      exams.find((e) => num(e.fk_exam_id) === Number(form.examId))
        ?.fk_exam_timetable_id,
    );
  }

  async function onGetList() {
    if (
      !form.univExamcenterId ||
      !form.courseId ||
      !form.academicYearId ||
      !form.examId
    ) {
      toastInfo("Please Select Valid Filters");
      return;
    }
    const ttId = pickTimetableId();
    if (!ttId) {
      toastError("Exam timetable not found for selected exam.");
      return;
    }
    setLoadingList(true);
    clearResults();
    try {
      const list = await listUnivExamBagsByCenterAndTimetable(
        Number(form.univExamcenterId),
        ttId,
      );
      setExamTimetableId(ttId);
      setRows(Array.isArray(list) ? list : []);
      setShowTable(true);
      if (!list.length) toastSuccess("No Records Found.");
    } catch (e) {
      toastError(e, "Failed to load exam bags");
      setRows([]);
      setShowTable(false);
    } finally {
      setLoadingList(false);
    }
  }

  function openCreate() {
    if (!showTable || !examTimetableId) {
      toastInfo("Please Get List first.");
      return;
    }
    setEditing(null);
    setFormModal({
      bagSerialNo: "",
      totalAnswerBooks: "",
      trackerId: "",
      sealedbyName: "",
      dispatchStatusCatdetId: "",
      isSealed: false,
      isActive: true,
      reason: "active",
    });
    setModalOpen(true);
  }

  function onEdit(row: Row) {
    setEditing(row);
    setFormModal({
      bagSerialNo: txt(row.bagSerialNo),
      totalAnswerBooks: txt(row.totalAnswerBooks),
      trackerId: txt(row.trackerId),
      sealedbyName: txt(row.sealedbyName),
      dispatchStatusCatdetId: String(num(row.dispatchStatusCatdetId) || ""),
      isSealed: truthy(row.isSealed),
      isActive: row.isActive !== false,
      reason: txt(row.reason) || "active",
    });
    setModalOpen(true);
  }

  async function onSave(e: { preventDefault: () => void }) {
    e.preventDefault();
    if (!form.univExamcenterId || !examTimetableId) {
      toastError("Select filter values and Get List first.");
      return;
    }
    if (!formModal.bagSerialNo.trim()) {
      toastError("Bag Serial No is required.");
      return;
    }
    if (!formModal.totalAnswerBooks.trim()) {
      toastError("Total Answer Books is required.");
      return;
    }
    if (!formModal.trackerId.trim()) {
      toastError("Tracker Id is required.");
      return;
    }
    if (!formModal.dispatchStatusCatdetId) {
      toastError("Dispatch Status is required.");
      return;
    }
    if (!formModal.sealedbyName.trim()) {
      toastError("Sealed By Name is required.");
      return;
    }
    if (!formModal.isActive && !formModal.reason.trim()) {
      toastError("Reason is required when inactive.");
      return;
    }

    const payload: Record<string, unknown> = {
      univExamcenterId: Number(form.univExamcenterId),
      examTimetableId,
      bagSerialNo: formModal.bagSerialNo.trim(),
      totalAnswerBooks: Number(formModal.totalAnswerBooks),
      trackerId: formModal.trackerId.trim(),
      dispatchStatusCatdetId: Number(formModal.dispatchStatusCatdetId),
      isSealed: formModal.isSealed,
      sealedbyUserId: employeeId,
      sealedbyName: formModal.sealedbyName.trim(),
      isActive: formModal.isActive,
      reason: formModal.isActive ? "active" : formModal.reason.trim(),
    };

    setSaving(true);
    try {
      const id = pickUnivExamBagId(editing ?? {});
      if (id > 0) {
        await updateUnivExamBag(id, { ...payload, univExamBagId: id });
        toastSuccess("Exam bag updated.");
      } else {
        await createUnivExamBag(payload);
        toastSuccess("Exam bag created.");
      }
      setModalOpen(false);
      await onGetList();
    } catch (err) {
      toastError(err, "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const columnDefs = useMemo(
    (): ColDef<Row>[] => [
      { headerName: "SL No.", valueGetter: rowIndexGetter, width: 80, flex: 0 },
      {
        headerName: "Exam Center",
        minWidth: 140,
        valueGetter: (p) => txt(p.data?.examcenterCode),
      },
      {
        headerName: "Bag Serial No",
        minWidth: 130,
        valueGetter: (p) => txt(p.data?.bagSerialNo),
      },
      {
        headerName: "Tracker Id",
        minWidth: 120,
        valueGetter: (p) => txt(p.data?.trackerId),
      },
      {
        headerName: "Total Answer Books",
        minWidth: 150,
        valueGetter: (p) => txt(p.data?.totalAnswerBooks),
      },
      {
        headerName: "Dispatched Status",
        minWidth: 150,
        valueGetter: (p) => txt(p.data?.dispatchStatusCatdetName),
      },
      {
        headerName: "Sealed By Name",
        minWidth: 140,
        valueGetter: (p) => txt(p.data?.sealedbyName),
      },
      {
        headerName: "Is Sealed",
        minWidth: 100,
        cellRenderer: sealedRenderer,
      },
      {
        field: "isActive",
        headerName: "Status",
        minWidth: 100,
        cellRenderer: statusRenderer,
      },
      {
        headerName: "Actions",
        minWidth: 72,
        width: 72,
        flex: 0,
        cellRenderer: (p: ICellRendererParams<Row>) => {
          if (!p.data) return null;
          return (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-blue-700"
              onClick={() => onEdit(p.data!)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          );
        },
      },
    ],
    [],
  );

  const filters = (
    <>
      <GlobalFilterBarRow>
        <GlobalFilterField label="Exam Center *">
          <Select
            options={examCenters.map((r) => ({
              value: String(num(r.fk_univ_examcenter_id)),
              label: txt(r.examcenter_code),
            }))}
            value={form.univExamcenterId || null}
            onChange={(v) => {
              clearResults();
              setCollegeFilterRows([]);
              setForm({
                ...EMPTY_FORM,
                univExamcenterId: v ?? "",
              });
            }}
            disabled={loadingFilters}
            placeholder="Exam Center"
            searchable
          />
        </GlobalFilterField>
        <GlobalFilterField label="Course *">
          <Select
            options={courses.map((r) => ({
              value: String(num(r.fk_course_id)),
              label: txt(r.course_code),
            }))}
            value={form.courseId || null}
            onChange={(v) => {
              clearResults();
              setForm((f) => ({
                ...f,
                courseId: v ?? "",
                academicYearId: "",
                examId: "",
              }));
            }}
            placeholder="Course"
          />
        </GlobalFilterField>
        <GlobalFilterField label="Academic Year *">
          <Select
            options={academicYears.map((r) => ({
              value: String(num(r.fk_academic_year_id)),
              label: txt(r.academic_year),
            }))}
            value={form.academicYearId || null}
            onChange={(v) => {
              clearResults();
              setForm((f) => ({
                ...f,
                academicYearId: v ?? "",
                examId: "",
              }));
            }}
            placeholder="Academic Year"
          />
        </GlobalFilterField>
      </GlobalFilterBarRow>
      <GlobalFilterBarRow>
        <GlobalFilterField label="Exam" className="global-filter-field--wide">
          <Select
            options={exams.map((r) => ({
              value: String(num(r.fk_exam_id)),
              label: examLabel(r),
            }))}
            value={form.examId || null}
            onChange={(v) => {
              clearResults();
              setForm((f) => ({ ...f, examId: v ?? "" }));
            }}
            placeholder="Exam"
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
    <FilteredPage title="Exam Bags" filters={filters}>
      {showTable && (
        <DataTable
          title={`Exam Bags - ${headerText}`}
          rowData={rows}
          columnDefs={columnDefs}
          loading={loadingList}
          pagination
          bordered
          toolbar={SEARCH_ONLY_TOOLBAR}
          toolbarTrailing={
            <Button
              type="button"
              className="h-[30px] px-3 text-[12px]"
              onClick={openCreate}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Exam Bags
            </Button>
          }
          getRowId={(p) =>
            String(
              pickUnivExamBagId(p.data ?? {}) ||
                txt(p.data?.bagSerialNo) ||
                "row",
            )
          }
        />
      )}

      <FormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit Exam Bag" : "Add Exam Bag"}
        onSubmit={onSave}
        isSubmitting={saving}
        size="xl"
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="space-y-1">
            <Label>Exam Center</Label>
            <Select
              options={examCenters.map((r) => ({
                value: String(num(r.fk_univ_examcenter_id)),
                label: txt(r.examcenter_code),
              }))}
              value={form.univExamcenterId || null}
              onChange={() => {}}
              disabled
            />
          </div>
          <div className="space-y-1">
            <Label>Course</Label>
            <Select
              options={courses.map((r) => ({
                value: String(num(r.fk_course_id)),
                label: txt(r.course_code),
              }))}
              value={form.courseId || null}
              onChange={() => {}}
              disabled
            />
          </div>
          <div className="space-y-1">
            <Label>Academic Year</Label>
            <Select
              options={academicYears.map((r) => ({
                value: String(num(r.fk_academic_year_id)),
                label: txt(r.academic_year),
              }))}
              value={form.academicYearId || null}
              onChange={() => {}}
              disabled
            />
          </div>
          <div className="space-y-1 md:col-span-1">
            <Label>Exam</Label>
            <Select
              options={exams.map((r) => ({
                value: String(num(r.fk_exam_id)),
                label: examLabel(r),
              }))}
              value={form.examId || null}
              onChange={() => {}}
              disabled
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
          <div className="space-y-1">
            <Label>Bag Serial No *</Label>
            <Input
              value={formModal.bagSerialNo}
              onChange={(e) =>
                setFormModal((f) => ({ ...f, bagSerialNo: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1">
            <Label>Total Answer Books *</Label>
            <Input
              type="number"
              value={formModal.totalAnswerBooks}
              onChange={(e) =>
                setFormModal((f) => ({
                  ...f,
                  totalAnswerBooks: e.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-1">
            <Label>Tracker Id *</Label>
            <Input
              value={formModal.trackerId}
              onChange={(e) =>
                setFormModal((f) => ({ ...f, trackerId: e.target.value }))
              }
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
          <div className="space-y-1">
            <Label>Sealed By Name *</Label>
            <Input
              value={formModal.sealedbyName}
              onChange={(e) =>
                setFormModal((f) => ({ ...f, sealedbyName: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1">
            <Label>Dispatch Status *</Label>
            <Select
              options={dispatchStatuses.map((r) => ({
                value: String(num(r.generalDetailId)),
                label: txt(
                  r.generalDetailDisplayName ?? r.generalDetailName,
                ),
              }))}
              value={formModal.dispatchStatusCatdetId || null}
              onChange={(v) =>
                setFormModal((f) => ({
                  ...f,
                  dispatchStatusCatdetId: v ?? "",
                }))
              }
              placeholder="Dispatch Status"
            />
          </div>
          <label className="flex items-center gap-2 text-sm font-medium pt-7">
            <Checkbox
              checked={formModal.isSealed}
              onCheckedChange={(v) =>
                setFormModal((f) => ({ ...f, isSealed: v === true }))
              }
            />
            is Sealed
          </label>
        </div>

        <ActiveStatusField
          isActive={formModal.isActive}
          reason={formModal.reason}
          onActiveChange={(v) =>
            setFormModal((f) => ({ ...f, isActive: v === true }))
          }
          onReasonChange={(v) => setFormModal((f) => ({ ...f, reason: v }))}
        />
      </FormModal>
    </FilteredPage>
  );
}
