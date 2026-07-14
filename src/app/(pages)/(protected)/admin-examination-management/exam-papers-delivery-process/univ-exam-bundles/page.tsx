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
import { rowIndexGetter } from "@/lib/utils";
import { toast } from "sonner";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  createUnivExamBundle,
  getExamBagsFilterRows,
  listUnivExamBagsActive,
  listUnivExamBundlesByExamAndBag,
  pickUnivExamBagId,
  updateUnivExamBundle,
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

const ALL_BAG = "0";

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
function centerIdOf(r: Row): number {
  return num(r.fk_univ_examcenter_id ?? r.univExamcenterId ?? r.univExamCenterId);
}
function bagIdOf(r: Row): number {
  return pickUnivExamBagId(r) || num(r.fk_univ_exam_bag_id);
}
function bagSerialOf(r: Row): string {
  return txt(r.bag_serial_no ?? r.bagSerialNo);
}

function statusRenderer(p: ICellRendererParams<Row>) {
  return <StatusBadge status={Boolean(p.data?.isActive)} />;
}

interface FormState {
  univExamcenterId: string;
  courseId: string;
  academicYearId: string;
  examId: string;
  univExamBagId: string;
}

const EMPTY_FORM: FormState = {
  univExamcenterId: "",
  courseId: "",
  academicYearId: "",
  examId: "",
  univExamBagId: ALL_BAG,
};

export default function UnivExamBundlesPage() {
  const [loadingFilters, setLoadingFilters] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [saving, setSaving] = useState(false);

  const [centerRows, setCenterRows] = useState<Row[]>([]);
  const [collegeFilterRows, setCollegeFilterRows] = useState<Row[]>([]);
  const [filterBags, setFilterBags] = useState<Row[]>([]);
  const [modalBags, setModalBags] = useState<Row[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [showTable, setShowTable] = useState(false);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [formModal, setFormModal] = useState({
    univExamBagId: "",
    bundleNumber: "",
    startSerialNo: "",
    endSerialNo: "",
    totalAnswerBooks: "",
    isActive: true,
    reason: "",
  });

  const clearResults = useCallback(() => {
    setRows([]);
    setShowTable(false);
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
        const centers = dedupeBy(list, (r) => centerIdOf(r));
        if (centers[0]) {
          setForm({
            ...EMPTY_FORM,
            univExamcenterId: String(centerIdOf(centers[0])),
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
    () => dedupeBy(centerRows, (r) => centerIdOf(r)),
    [centerRows],
  );

  // Angular selectedExamCenter: exam_center_clg_filters
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

  // Cascade course → AY → exam
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
      univExamBagId: ALL_BAG,
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
      univExamBagId: ALL_BAG,
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
      univExamBagId: ALL_BAG,
    }));
  }, [exams, form.academicYearId, form.examId, clearResults]);

  // Angular selectedExam: bags for center from college_center_filters (+ All)
  // Prefer real bag ids + serials; fall back to active bags for the center.
  useEffect(() => {
    let cancelled = false;
    async function loadBags() {
      if (!form.univExamcenterId || !form.examId) {
        setFilterBags([]);
        return;
      }
      const fromCenters = centerRows.filter(
        (r) =>
          centerIdOf(r) === Number(form.univExamcenterId) &&
          Boolean(bagSerialOf(r)),
      );
      const withBagIds = dedupeBy(
        fromCenters.filter((r) => bagIdOf(r) > 0),
        (r) => bagIdOf(r),
      );
      if (withBagIds.length > 0) {
        if (!cancelled) setFilterBags(withBagIds);
        return;
      }
      // Fallback: active bags filtered by center (Angular modal source)
      try {
        const all = await listUnivExamBagsActive();
        if (cancelled) return;
        const forCenter = dedupeBy(
          (Array.isArray(all) ? all : []).filter(
            (r) =>
              centerIdOf(r) === Number(form.univExamcenterId) ||
              !centerIdOf(r),
          ),
          (r) => bagIdOf(r),
        );
        setFilterBags(forCenter.length > 0 ? forCenter : (Array.isArray(all) ? all : []));
      } catch {
        if (!cancelled) setFilterBags([]);
      }
    }
    void loadBags();
    return () => {
      cancelled = true;
    };
  }, [form.univExamcenterId, form.examId, centerRows]);

  // Default bag = All after bags load
  useEffect(() => {
    if (!form.examId) return;
    if (form.univExamBagId === ALL_BAG) return;
    const ok =
      form.univExamBagId === ALL_BAG ||
      filterBags.some((r) => bagIdOf(r) === Number(form.univExamBagId));
    if (ok) return;
    setForm((f) => ({ ...f, univExamBagId: ALL_BAG }));
  }, [filterBags, form.examId, form.univExamBagId]);

  useEffect(() => {
    if (!modalOpen) return;
    let cancelled = false;
    async function load() {
      try {
        const list = await listUnivExamBagsActive();
        if (!cancelled) setModalBags(Array.isArray(list) ? list : []);
      } catch {
        if (!cancelled) setModalBags([]);
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
    return [txt(course?.course_code), txt(ay?.academic_year), txt(exam?.exam_name)]
      .filter(Boolean)
      .join(" / ");
  }, [courses, academicYears, exams, form]);

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
    // Angular requires univExamBagId (0 = All is valid)
    if (form.univExamBagId === "") {
      toastInfo("Please Select Univ Exam Bag");
      return;
    }
    setLoadingList(true);
    clearResults();
    try {
      const bagId = Number(form.univExamBagId) || 0;
      const list = await listUnivExamBundlesByExamAndBag(
        Number(form.examId),
        bagId,
      );
      setRows(Array.isArray(list) ? list : []);
      setShowTable(true);
      if (!list.length) toastSuccess("No Records Found.");
    } catch (e) {
      toastError(e, "Failed to load exam bundles");
      setRows([]);
      setShowTable(false);
    } finally {
      setLoadingList(false);
    }
  }

  function openCreate() {
    if (!showTable) {
      toastInfo("Please Get List first.");
      return;
    }
    setEditing(null);
    const preselect =
      Number(form.univExamBagId) > 0 ? form.univExamBagId : "";
    setFormModal({
      univExamBagId: preselect,
      bundleNumber: "",
      startSerialNo: "",
      endSerialNo: "",
      totalAnswerBooks: "",
      isActive: true,
      reason: "",
    });
    setModalOpen(true);
  }

  function onEdit(row: Row) {
    setEditing(row);
    setFormModal({
      univExamBagId: String(bagIdOf(row) || ""),
      bundleNumber: txt(row.bundleNumber),
      startSerialNo: txt(row.startSerialNo),
      endSerialNo: txt(row.endSerialNo),
      totalAnswerBooks: txt(row.totalAnswerBooks),
      isActive: row.isActive !== false,
      reason: txt(row.reason),
    });
    setModalOpen(true);
  }

  async function onSave(e: { preventDefault: () => void }) {
    e.preventDefault();
    if (!form.examId) {
      toastError("Select exam first.");
      return;
    }
    if (!formModal.univExamBagId) {
      toastError("Univ Exam Bag is required.");
      return;
    }
    if (!formModal.bundleNumber.trim()) {
      toastError("Bundle Number is required.");
      return;
    }
    if (!formModal.startSerialNo.trim()) {
      toastError("Start Serial No is required.");
      return;
    }
    if (!formModal.endSerialNo.trim()) {
      toastError("End Serial No is required.");
      return;
    }
    if (!formModal.totalAnswerBooks.trim()) {
      toastError("Total Answer Books is required.");
      return;
    }
    if (!formModal.isActive && !formModal.reason.trim()) {
      toastError("Reason is required when inactive.");
      return;
    }

    const payload: Record<string, unknown> = {
      examId: Number(form.examId),
      univExamBagId: Number(formModal.univExamBagId),
      bundleNumber: formModal.bundleNumber.trim(),
      startSerialNo: formModal.startSerialNo.trim(),
      endSerialNo: formModal.endSerialNo.trim(),
      totalAnswerBooks: Number(formModal.totalAnswerBooks),
      isActive: formModal.isActive,
      reason: formModal.isActive ? "" : formModal.reason.trim(),
    };

    setSaving(true);
    try {
      const id = num(editing?.unvExamBundleId);
      if (id > 0) {
        await updateUnivExamBundle(id, { ...payload, unvExamBundleId: id });
        toastSuccess("Exam bundle updated.");
      } else {
        await createUnivExamBundle(payload);
        toastSuccess("Exam bundle created.");
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
        headerName: "Exam Bag",
        minWidth: 130,
        valueGetter: (p) => txt(p.data?.bagSerialNo),
      },
      {
        headerName: "Bundle Number",
        minWidth: 130,
        valueGetter: (p) => txt(p.data?.bundleNumber),
      },
      {
        headerName: "Start Serial No",
        minWidth: 130,
        valueGetter: (p) => txt(p.data?.startSerialNo),
      },
      {
        headerName: "End Serial No",
        minWidth: 130,
        valueGetter: (p) => txt(p.data?.endSerialNo),
      },
      {
        headerName: "Total Answer Books",
        minWidth: 150,
        valueGetter: (p) => txt(p.data?.totalAnswerBooks),
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

  const bagFilterOptions = useMemo(
    () => [
      { value: ALL_BAG, label: "All" },
      ...filterBags.map((r) => ({
        value: String(bagIdOf(r) || centerIdOf(r)),
        label: bagSerialOf(r) || String(bagIdOf(r)),
      })),
    ],
    [filterBags],
  );

  const filters = (
    <>
      <GlobalFilterBarRow>
        <GlobalFilterField label="Exam Center *">
          <Select
            options={examCenters.map((r) => ({
              value: String(centerIdOf(r)),
              label: txt(r.examcenter_code),
            }))}
            value={form.univExamcenterId || null}
            onChange={(v) => {
              clearResults();
              setCollegeFilterRows([]);
              setFilterBags([]);
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
                univExamBagId: ALL_BAG,
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
                univExamBagId: ALL_BAG,
              }));
            }}
            placeholder="Academic Year"
          />
        </GlobalFilterField>
        <GlobalFilterField label="Exam" className="global-filter-field--wide">
          <Select
            options={exams.map((r) => ({
              value: String(num(r.fk_exam_id)),
              label: examLabel(r),
            }))}
            value={form.examId || null}
            onChange={(v) => {
              clearResults();
              setForm((f) => ({
                ...f,
                examId: v ?? "",
                univExamBagId: ALL_BAG,
              }));
            }}
            placeholder="Exam"
            searchable
          />
        </GlobalFilterField>
      </GlobalFilterBarRow>
      <GlobalFilterBarRow>
        <GlobalFilterField label="Univ Exam Bag *">
          <Select
            options={bagFilterOptions}
            value={form.univExamBagId || null}
            onChange={(v) => {
              clearResults();
              setForm((f) => ({ ...f, univExamBagId: v ?? ALL_BAG }));
            }}
            placeholder="Univ Exam Bag"
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
    <FilteredPage title="Exam Bundles" filters={filters}>
      {showTable && (
        <DataTable
          title={`Exam Bundles - ${headerText}`}
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
              Add Exam Bundles
            </Button>
          }
          getRowId={(p) =>
            String(num(p.data?.unvExamBundleId) || txt(p.data?.bundleNumber) || "row")
          }
        />
      )}

      <FormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit Exam Bundles" : "Add Exam Bundles"}
        onSubmit={onSave}
        isSubmitting={saving}
        size="xl"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label>Univ Exam Bag *</Label>
            <Select
              options={modalBags.map((r) => ({
                value: String(bagIdOf(r)),
                label: bagSerialOf(r) || String(bagIdOf(r)),
              }))}
              value={formModal.univExamBagId || null}
              onChange={(v) =>
                setFormModal((f) => ({ ...f, univExamBagId: v ?? "" }))
              }
              disabled={Boolean(editing)}
              placeholder="Univ Exam Bag"
            />
          </div>
          <div className="space-y-1">
            <Label>Bundle Number *</Label>
            <Input
              value={formModal.bundleNumber}
              onChange={(e) =>
                setFormModal((f) => ({ ...f, bundleNumber: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1">
            <Label>Start Serial No *</Label>
            <Input
              value={formModal.startSerialNo}
              onChange={(e) =>
                setFormModal((f) => ({ ...f, startSerialNo: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1">
            <Label>End Serial No *</Label>
            <Input
              value={formModal.endSerialNo}
              onChange={(e) =>
                setFormModal((f) => ({ ...f, endSerialNo: e.target.value }))
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
