"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { Pencil } from "lucide-react";
import { FilteredPage } from "@/components/layout";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
import { DataTable } from "@/common/components/table";
import { SearchInput } from "@/common/components/search";
import { Select } from "@/common/components/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { rowIndexGetter } from "@/lib/utils";
import { toast } from "sonner";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  addListUnivEcStudents,
  getUnivEcStudentsByCodeGroups,
  updateUnivEcStudent,
  type AnyRow,
} from "@/services/exam-papers-delivery";

/** Angular supports `0` = All for course group / year / subject. */
const ALL = "0";

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
function dedupeBy<T>(rows: T[], keyFn: (r: T) => number): T[] {
  const seen = new Set<number>();
  const out: T[] = [];
  for (const r of rows) {
    const k = keyFn(r);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(r);
  }
  return out;
}

interface FormState {
  academicYearId: string;
  examGroupId: string;
  univExamcenterId: string;
  univEcCollegeId: string;
  courseId: string;
  regulationId: string;
  courseGroupId: string;
  courseYearId: string;
  subjectId: string;
}

const EMPTY_FORM: FormState = {
  academicYearId: "",
  examGroupId: "",
  univExamcenterId: "",
  univEcCollegeId: "",
  courseId: "",
  regulationId: "",
  courseGroupId: "",
  courseYearId: "",
  subjectId: "",
};

interface StudentRow extends Row {
  checked?: boolean;
  isSelected?: boolean;
}

export default function UnivExamcenterStudentsPage() {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [ayFilterRows, setAyFilterRows] = useState<Row[]>([]);
  const [centerRows, setCenterRows] = useState<Row[]>([]);
  const [courseRows, setCourseRows] = useState<Row[]>([]);
  const [regSubRows, setRegSubRows] = useState<Row[]>([]);

  const [available, setAvailable] = useState<StudentRow[]>([]);
  const [availableSource, setAvailableSource] = useState<StudentRow[]>([]);
  const [assigned, setAssigned] = useState<Row[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<StudentRow[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [searchOmr, setSearchOmr] = useState("");
  const [showSections, setShowSections] = useState(false);
  const [headerDetails, setHeaderDetails] = useState("");

  const [loadingFilters, setLoadingFilters] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState<Row | null>(null);
  const [editActive, setEditActive] = useState(true);
  const [editReason, setEditReason] = useState("");

  const employeeId = Number(
    globalThis?.localStorage?.getItem("employeeId") ?? 0,
  );
  const universityId = Number(
    globalThis?.localStorage?.getItem("universityId") ?? 0,
  );

  const clearResults = useCallback(() => {
    setAvailable([]);
    setAvailableSource([]);
    setAssigned([]);
    setSelectedStudents([]);
    setSelectAll(false);
    setSearchOmr("");
    setShowSections(false);
    setHeaderDetails("");
  }, []);

  // Angular getExamCenters: eg_filters → eg_ay_filter
  useEffect(() => {
    async function init() {
      setLoadingFilters(true);
      try {
        const groups = await getUnivEcStudentsByCodeGroups({
          flag: "eg_filters",
          flagType: "REGSUP",
        });
        const flat =
          groups.find((g) => g.length > 0 && txt(g[0].flag) === "eg_ay_filter") ??
          [];
        setAyFilterRows(flat);
        const years = dedupeBy(flat, (r) => num(r.fk_academic_year_id));
        if (years[0]) {
          setForm({
            ...EMPTY_FORM,
            academicYearId: String(num(years[0].fk_academic_year_id)),
          });
        }
      } catch (e) {
        toastError(e, "Failed to load filters");
      } finally {
        setLoadingFilters(false);
      }
    }
    void init();
  }, []);

  const academicYears = useMemo(
    () =>
      dedupeBy(ayFilterRows, (r) => num(r.fk_academic_year_id)).sort((a, b) =>
        txt(b.academic_year).localeCompare(txt(a.academic_year)),
      ),
    [ayFilterRows],
  );
  const examGroups = useMemo(
    () =>
      dedupeBy(
        ayFilterRows.filter(
          (r) => num(r.fk_academic_year_id) === Number(form.academicYearId),
        ),
        (r) => num(r.fk_univ_exam_group_id),
      ),
    [ayFilterRows, form.academicYearId],
  );

  // Auto first exam group when AY changes
  useEffect(() => {
    if (!form.academicYearId || examGroups.length === 0) return;
    const ok = examGroups.some(
      (r) => num(r.fk_univ_exam_group_id) === Number(form.examGroupId),
    );
    if (ok) return;
    setForm((f) => ({
      ...f,
      examGroupId: String(num(examGroups[0].fk_univ_exam_group_id)),
      univExamcenterId: "",
      univEcCollegeId: "",
      courseId: "",
      regulationId: "",
      courseGroupId: "",
      courseYearId: "",
      subjectId: "",
    }));
    setCenterRows([]);
    setCourseRows([]);
    setRegSubRows([]);
    clearResults();
  }, [examGroups, form.academicYearId, form.examGroupId, clearResults]);

  // Angular selectedExamGroup: eg_ec_clg_cou_filter → result[0] centers, result[1] courses
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!form.academicYearId || !form.examGroupId) {
        setCenterRows([]);
        setCourseRows([]);
        return;
      }
      try {
        const groups = await getUnivEcStudentsByCodeGroups({
          flag: "eg_ec_clg_cou_filter",
          flagType: "REGSUP",
          academicYearId: Number(form.academicYearId),
          examGroupId: Number(form.examGroupId),
        });
        if (cancelled) return;
        setCenterRows(groups[0] ?? []);
        setCourseRows(groups[1] ?? []);
      } catch (e) {
        if (!cancelled) {
          setCenterRows([]);
          setCourseRows([]);
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
    () => dedupeBy(centerRows, (r) => num(r.fk_univ_ec_id)),
    [centerRows],
  );
  const colleges = useMemo(
    () =>
      dedupeBy(
        centerRows.filter(
          (r) => num(r.fk_univ_ec_id) === Number(form.univExamcenterId),
        ),
        (r) => num(r.fk_college_id),
      ),
    [centerRows, form.univExamcenterId],
  );
  const courses = useMemo(
    () => dedupeBy(courseRows, (r) => num(r.fk_course_id)),
    [courseRows],
  );

  // Auto first center
  useEffect(() => {
    if (!form.examGroupId || examCenters.length === 0) return;
    const ok = examCenters.some(
      (r) => num(r.fk_univ_ec_id) === Number(form.univExamcenterId),
    );
    if (ok) return;
    setForm((f) => ({
      ...f,
      univExamcenterId: String(num(examCenters[0].fk_univ_ec_id)),
      univEcCollegeId: "",
      courseId: "",
      regulationId: "",
      courseGroupId: "",
      courseYearId: "",
      subjectId: "",
    }));
    setRegSubRows([]);
    clearResults();
  }, [examCenters, form.examGroupId, form.univExamcenterId, clearResults]);

  // Auto first college + course when center set
  useEffect(() => {
    if (!form.univExamcenterId) return;
    setForm((f) => {
      const next = { ...f };
      if (
        colleges.length > 0 &&
        !colleges.some((r) => num(r.fk_college_id) === Number(f.univEcCollegeId))
      ) {
        next.univEcCollegeId = String(num(colleges[0].fk_college_id));
      }
      if (
        courses.length > 0 &&
        !courses.some((r) => num(r.fk_course_id) === Number(f.courseId))
      ) {
        next.courseId = String(num(courses[0].fk_course_id));
        next.regulationId = "";
        next.courseGroupId = "";
        next.courseYearId = "";
        next.subjectId = "";
      }
      return next;
    });
  }, [form.univExamcenterId, colleges, courses]);

  // Angular selectedCourse: eg_cg_cy_sub_filter → result[0]
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!form.academicYearId || !form.examGroupId || !form.courseId) {
        setRegSubRows([]);
        return;
      }
      try {
        const groups = await getUnivEcStudentsByCodeGroups({
          flag: "eg_cg_cy_sub_filter",
          flagType: "REGSUP",
          academicYearId: Number(form.academicYearId),
          examGroupId: Number(form.examGroupId),
        });
        if (cancelled) return;
        setRegSubRows(groups[0] ?? []);
      } catch (e) {
        if (!cancelled) {
          setRegSubRows([]);
          toastError(e, "Failed to load regulations / subjects");
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [form.academicYearId, form.examGroupId, form.courseId]);

  const regulations = useMemo(
    () => dedupeBy(regSubRows, (r) => num(r.fk_regulation_id)),
    [regSubRows],
  );
  const courseGroups = useMemo(
    () =>
      dedupeBy(
        regSubRows.filter(
          (r) => num(r.fk_regulation_id) === Number(form.regulationId),
        ),
        (r) => num(r.fk_course_group_id),
      ),
    [regSubRows, form.regulationId],
  );
  const courseYears = useMemo(() => {
    const groupId = Number(form.courseGroupId);
    return dedupeBy(
      regSubRows.filter((r) => {
        if (num(r.fk_regulation_id) !== Number(form.regulationId)) return false;
        // All (0) = no group filter (Angular label intent)
        if (form.courseGroupId === ALL || !form.courseGroupId) return true;
        return num(r.fk_course_group_id) === groupId;
      }),
      (r) => num(r.fk_course_year_id),
    );
  }, [regSubRows, form.regulationId, form.courseGroupId]);
  const subjects = useMemo(() => {
    const groupId = Number(form.courseGroupId);
    const yearId = Number(form.courseYearId);
    return dedupeBy(
      regSubRows.filter((r) => {
        if (num(r.fk_regulation_id) !== Number(form.regulationId)) return false;
        if (
          form.courseGroupId !== ALL &&
          form.courseGroupId &&
          num(r.fk_course_group_id) !== groupId
        ) {
          return false;
        }
        if (
          form.courseYearId !== ALL &&
          form.courseYearId &&
          num(r.fk_course_year_id) !== yearId
        ) {
          return false;
        }
        return true;
      }),
      (r) => num(r.fk_subject_id),
    );
  }, [
    regSubRows,
    form.regulationId,
    form.courseGroupId,
    form.courseYearId,
  ]);

  // Cascade auto-select regulation → group → year → subject (0 = All is allowed)
  useEffect(() => {
    if (regulations.length === 0) return;
    const ok = regulations.some(
      (r) => num(r.fk_regulation_id) === Number(form.regulationId),
    );
    if (ok) return;
    setForm((f) => ({
      ...f,
      regulationId: String(num(regulations[0].fk_regulation_id)),
      courseGroupId: "",
      courseYearId: "",
      subjectId: "",
    }));
    clearResults();
  }, [regulations, form.regulationId, clearResults]);

  useEffect(() => {
    if (!form.regulationId || courseGroups.length === 0) return;
    if (form.courseGroupId === ALL) return;
    const ok = courseGroups.some(
      (r) => num(r.fk_course_group_id) === Number(form.courseGroupId),
    );
    if (ok) return;
    setForm((f) => ({
      ...f,
      courseGroupId: String(num(courseGroups[0].fk_course_group_id)),
      courseYearId: "",
      subjectId: "",
    }));
    clearResults();
  }, [courseGroups, form.regulationId, form.courseGroupId, clearResults]);

  useEffect(() => {
    if (!form.courseGroupId || courseYears.length === 0) return;
    if (form.courseYearId === ALL) return;
    const ok = courseYears.some(
      (r) => num(r.fk_course_year_id) === Number(form.courseYearId),
    );
    if (ok) return;
    setForm((f) => ({
      ...f,
      courseYearId: String(num(courseYears[0].fk_course_year_id)),
      subjectId: "",
    }));
    clearResults();
  }, [courseYears, form.courseGroupId, form.courseYearId, clearResults]);

  useEffect(() => {
    if (!form.courseYearId || subjects.length === 0) return;
    if (form.subjectId === ALL) return;
    const ok = subjects.some(
      (r) => num(r.fk_subject_id) === Number(form.subjectId),
    );
    if (ok) return;
    setForm((f) => ({
      ...f,
      subjectId: String(num(subjects[0].fk_subject_id)),
    }));
    clearResults();
  }, [subjects, form.courseYearId, form.subjectId, clearResults]);

  function buildHeaderDetails(f: FormState): string {
    const parts = [
      examCenters.find((r) => num(r.fk_univ_ec_id) === Number(f.univExamcenterId))
        ?.ec_code,
      colleges.find((r) => num(r.fk_college_id) === Number(f.univEcCollegeId))
        ?.college_code,
      examGroups.find(
        (r) => num(r.fk_univ_exam_group_id) === Number(f.examGroupId),
      )?.exam_group_code,
      courseYears.find((r) => num(r.fk_course_year_id) === Number(f.courseYearId))
        ?.course_year_code,
      regulations.find((r) => num(r.fk_regulation_id) === Number(f.regulationId))
        ?.regulation_code,
      subjects.find((r) => num(r.fk_subject_id) === Number(f.subjectId))
        ?.subject_code,
    ]
      .map((v) => txt(v))
      .filter(Boolean);
    return parts.join(" / ");
  }

  async function onGetStudents() {
    if (
      !form.academicYearId ||
      !form.examGroupId ||
      !form.univExamcenterId ||
      !form.regulationId ||
      !form.courseYearId ||
      !form.subjectId
    ) {
      toastInfo("Please Select Valid Filters");
      return;
    }
    setLoadingList(true);
    clearResults();
    try {
      // Use form-bound params (Angular commented "correct" GetExamStudents — not hardcodes)
      const groups = await getUnivEcStudentsByCodeGroups({
        flag: "ec_std_list",
        flagType: "",
        universityId,
        univExamcenterId: Number(form.univExamcenterId),
        examGroupId: Number(form.examGroupId),
        courseId: Number(form.courseId) || 0,
        academicYearId: Number(form.academicYearId),
        collegeId: Number(form.univEcCollegeId) || 0,
        courseGroupId: Number(form.courseGroupId) || 0,
        courseYearId: Number(form.courseYearId) || 0,
        regulationId: Number(form.regulationId),
        subjectId: Number(form.subjectId),
        examDate: "1999-01-01",
      });
      const rows = groups[0] ?? [];
      if (rows.length === 0) {
        toastSuccess("No Records Found.");
        return;
      }
      const avail = rows
        .filter((r) => num(r.row_exists) === 0)
        .map((r) => ({ ...r, checked: false, isSelected: false }));
      const asgn = rows.filter((r) => num(r.row_exists) === 1);
      setAvailable(avail);
      setAvailableSource(avail);
      setAssigned(asgn);
      setHeaderDetails(buildHeaderDetails(form));
      setShowSections(true);
    } catch (e) {
      toastError(e, "Failed to get students");
    } finally {
      setLoadingList(false);
    }
  }

  function onSearchOmr(value: string) {
    setSearchOmr(value);
    const q = value.trim().toLowerCase();
    if (!q) {
      setAvailable(availableSource);
      return;
    }
    // Angular searchOmrNos: omr_serial_no only (null-safe)
    setAvailable(
      availableSource.filter((r) =>
        txt(r.omr_serial_no).toLowerCase().includes(q),
      ),
    );
  }

  function rebuildSelected(rows: StudentRow[]) {
    const sel = rows.filter((r) => r.isSelected === true);
    setSelectedStudents(sel);
    setSelectAll(rows.length > 0 && rows.every((r) => r.isSelected === true));
  }

  function toggleAll(checked: boolean) {
    setAvailable((prev) => {
      const next = prev.map((r) => ({
        ...r,
        checked,
        isSelected: checked,
      }));
      rebuildSelected(next);
      return next;
    });
  }

  function toggleOne(studentId: number, checked: boolean) {
    setAvailable((prev) => {
      const next = prev.map((r) =>
        num(r.fk_student_id) === studentId
          ? { ...r, checked, isSelected: checked }
          : r,
      );
      rebuildSelected(next);
      return next;
    });
  }

  async function onAssign() {
    if (selectedStudents.length === 0) {
      toastInfo("Please Select Students...!");
      return;
    }
    const detailId =
      num(
        subjects.find(
          (x) =>
            num(x.fk_course_year_id) === Number(form.courseYearId) &&
            num(x.fk_regulation_id) === Number(form.regulationId) &&
            num(x.fk_subject_id) === Number(form.subjectId),
        )?.pk_univ_ec_college_detail_id,
      ) || 1; // Angular Assign currently hardcodes 1; prefer looked-up id when present

    setAssigning(true);
    try {
      const payload = selectedStudents.map((s) => ({
        univExamCentersId: Number(form.univExamcenterId),
        univEcCollegeDetailId: detailId,
        univExamGroupId: Number(form.examGroupId),
        examMasterId: num(s.pk_exam_id),
        studentDetailId: num(s.fk_student_id),
        regulationId: Number(form.regulationId),
        subjectId: Number(form.subjectId),
        isActive: true,
        createdUser: employeeId,
      }));
      await addListUnivEcStudents(payload);
      toastSuccess("Students assigned.");
      await onGetStudents();
    } catch (e) {
      toastError(e, "Assign failed");
    } finally {
      setAssigning(false);
    }
  }

  function openEdit(row: Row) {
    setEditRow(row);
    setEditActive(
      row.isActive === true ||
        row.is_active === true ||
        row.isActive === 1 ||
        row.isActive == null,
    );
    setEditReason(txt(row.reason));
    setEditOpen(true);
  }

  async function saveEdit() {
    if (!editRow) return;
    const id = num(editRow.pk_univ_ec_student_id);
    if (!id) {
      toastError("Missing student record id.");
      return;
    }
    setSavingEdit(true);
    try {
      await updateUnivEcStudent(id, {
        ...editRow,
        isActive: editActive,
        reason: editActive ? "" : editReason,
        updatedUser: employeeId,
      });
      toastSuccess("Student updated.");
      setEditOpen(false);
      await onGetStudents();
    } catch (e) {
      toastError(e, "Update failed");
    } finally {
      setSavingEdit(false);
    }
  }

  const assignedColumnDefs = useMemo(
    (): ColDef<Row>[] => [
      { headerName: "SI.No", valueGetter: rowIndexGetter, width: 70, flex: 0 },
      {
        headerName: "Exam Center",
        minWidth: 120,
        valueGetter: (p) =>
          txt(p.data?.ec_code ?? p.data?.examcenterCode ?? p.data?.examCenterCode),
      },
      {
        headerName: "Exam",
        minWidth: 160,
        valueGetter: (p) => txt(p.data?.exam_name ?? p.data?.examName),
      },
      {
        headerName: "Subject Code",
        minWidth: 120,
        valueGetter: (p) => txt(p.data?.subject_code ?? p.data?.subjectCode),
      },
      {
        headerName: "Student",
        minWidth: 140,
        valueGetter: (p) =>
          txt(p.data?.hallticket_number ?? p.data?.hallticketNumber),
      },
      {
        headerName: "Actions",
        width: 100,
        flex: 0,
        cellRenderer: (p: ICellRendererParams<Row>) => {
          if (!p.data) return null;
          return (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 px-2"
              onClick={() => openEdit(p.data!)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          );
        },
      },
    ],
    [],
  );

  const pageTitle = showSections
    ? `Exam Center Students - ${headerDetails}`
    : "Exam Center Students";

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
              setCenterRows([]);
              setCourseRows([]);
              setRegSubRows([]);
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
              setRegSubRows([]);
              setForm((f) => ({
                ...f,
                examGroupId: v ?? "",
                univExamcenterId: "",
                univEcCollegeId: "",
                courseId: "",
                regulationId: "",
                courseGroupId: "",
                courseYearId: "",
                subjectId: "",
              }));
            }}
            placeholder="Exam Group"
          />
        </GlobalFilterField>
        <GlobalFilterField label="Exam Center *">
          <Select
            options={examCenters.map((r) => ({
              value: String(num(r.fk_univ_ec_id)),
              label: txt(r.ec_code),
            }))}
            value={form.univExamcenterId || null}
            onChange={(v) => {
              clearResults();
              setForm((f) => ({
                ...f,
                univExamcenterId: v ?? "",
                univEcCollegeId: "",
                courseId: "",
                regulationId: "",
                courseGroupId: "",
                courseYearId: "",
                subjectId: "",
              }));
            }}
            placeholder="Exam Center"
            searchable
          />
        </GlobalFilterField>
        <GlobalFilterField label="Exam Center college">
          <Select
            options={colleges.map((r) => ({
              value: String(num(r.fk_college_id)),
              label: txt(r.college_code),
            }))}
            value={form.univEcCollegeId || null}
            onChange={(v) => {
              clearResults();
              setForm((f) => ({ ...f, univEcCollegeId: v ?? "" }));
            }}
            placeholder="Exam Center college"
            searchable
          />
        </GlobalFilterField>
        <GlobalFilterField label="Course">
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
                regulationId: "",
                courseGroupId: "",
                courseYearId: "",
                subjectId: "",
              }));
            }}
            placeholder="Course"
          />
        </GlobalFilterField>
      </GlobalFilterBarRow>
      <GlobalFilterBarRow>
        <GlobalFilterField label="Regulation *">
          <Select
            options={regulations.map((r) => ({
              value: String(num(r.fk_regulation_id)),
              label: txt(r.regulation_code),
            }))}
            value={form.regulationId || null}
            onChange={(v) => {
              clearResults();
              setForm((f) => ({
                ...f,
                regulationId: v ?? "",
                courseGroupId: "",
                courseYearId: "",
                subjectId: "",
              }));
            }}
            placeholder="Regulation"
          />
        </GlobalFilterField>
        <GlobalFilterField label="Course Group">
          <Select
            options={[
              { value: ALL, label: "All" },
              ...courseGroups.map((r) => ({
                value: String(num(r.fk_course_group_id)),
                label: txt(r.group_code),
              })),
            ]}
            value={form.courseGroupId || null}
            onChange={(v) => {
              clearResults();
              setForm((f) => ({
                ...f,
                courseGroupId: v ?? "",
                courseYearId: "",
                subjectId: "",
              }));
            }}
            placeholder="Course Group"
            searchable
          />
        </GlobalFilterField>
        <GlobalFilterField label="Course Years *">
          <Select
            options={[
              { value: ALL, label: "All" },
              ...courseYears.map((r) => ({
                value: String(num(r.fk_course_year_id)),
                label: txt(r.course_year_code),
              })),
            ]}
            value={form.courseYearId || null}
            onChange={(v) => {
              clearResults();
              setForm((f) => ({
                ...f,
                courseYearId: v ?? "",
                subjectId: "",
              }));
            }}
            placeholder="Course Years"
          />
        </GlobalFilterField>
        <GlobalFilterField label="Subjects *">
          <Select
            options={[
              { value: ALL, label: "All" },
              ...subjects.map((r) => ({
                value: String(num(r.fk_subject_id)),
                label: `${txt(r.subject_name)} (${txt(r.subject_code)})`,
              })),
            ]}
            value={form.subjectId || null}
            onChange={(v) => {
              clearResults();
              setForm((f) => ({ ...f, subjectId: v ?? "" }));
            }}
            placeholder="Subjects"
            searchable
          />
        </GlobalFilterField>
        <GlobalFilterField
          label=""
          className="global-filter-field--shrink global-filter-field--action"
        >
          <Button
            type="button"
            onClick={() => void onGetStudents()}
            disabled={loadingList}
            className="h-[30px] px-3 text-[12px]"
          >
            Get Students
          </Button>
        </GlobalFilterField>
      </GlobalFilterBarRow>
    </>
  );

  return (
    <FilteredPage title={pageTitle} filters={filters}>
      {showSections && (
        <>
          <div className="app-card p-3 space-y-2">
            <div className="text-[13px] font-semibold text-foreground border-b border-amber-300 pb-2">
              Exam Center Students - {headerDetails}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
              <div className="lg:col-span-5 rounded border p-2 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <SearchInput
                    value={searchOmr}
                    onChange={onSearchOmr}
                    placeholder="Search..."
                    className="w-full max-w-sm"
                  />
                  <span className="text-[13px] text-blue-700 font-semibold whitespace-nowrap">
                    Selected : {selectedStudents.length}
                  </span>
                </div>
                <div className="max-h-[320px] overflow-auto">
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-1 w-[70px]">
                          <label className="flex items-center gap-2">
                            <Checkbox
                              checked={selectAll}
                              onCheckedChange={(v) => toggleAll(v === true)}
                            />
                            All
                          </label>
                        </th>
                        <th className="text-left py-1">Serial No</th>
                      </tr>
                    </thead>
                    <tbody>
                      {available.length === 0 ? (
                        <tr>
                          <td
                            colSpan={2}
                            className="py-6 text-center text-muted-foreground"
                          >
                            No students to assign
                          </td>
                        </tr>
                      ) : (
                        available.map((c, idx) => (
                          <tr
                            key={`${num(c.fk_student_id)}-${idx}`}
                            className="border-b"
                          >
                            <td className="py-1">
                              <Checkbox
                                checked={Boolean(c.checked)}
                                onCheckedChange={(v) =>
                                  toggleOne(num(c.fk_student_id), v === true)
                                }
                              />
                            </td>
                            <td className="py-1">
                              {txt(c.hallticket_number)} (
                              {txt(c.omr_serial_no) || "-"})
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="lg:col-span-5 rounded border bg-sky-50/60 p-2 space-y-2">
                <h4 className="text-[13px] text-blue-700 font-semibold">
                  Selected Students: {selectedStudents.length}
                </h4>
                <div className="max-h-[320px] overflow-auto">
                  {selectedStudents.length === 0 ? (
                    <p className="py-6 text-center text-[12px] text-muted-foreground">
                      None selected
                    </p>
                  ) : (
                    <table className="w-full text-[13px]">
                      <tbody>
                        {selectedStudents.map((s, idx) => (
                          <tr
                            key={`${num(s.fk_student_id)}-s-${idx}`}
                            className="border-b border-sky-100"
                          >
                            <td className="py-1 text-blue-700">
                              {txt(s.hallticket_number)} (
                              {txt(s.omr_serial_no) || "-"})
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              <div className="lg:col-span-2 flex items-end justify-center pb-1">
                <Button
                  type="button"
                  onClick={() => void onAssign()}
                  disabled={assigning || selectedStudents.length === 0}
                  className="w-full"
                >
                  {assigning ? "Assigning…" : "Assign"}
                </Button>
              </div>
            </div>
          </div>

          <DataTable
            title={`Exam Center Students - ${headerDetails}`}
            rowData={assigned}
            columnDefs={assignedColumnDefs}
            loading={loadingList}
            pagination
            bordered
            toolbar={SEARCH_ONLY_TOOLBAR}
            getRowId={(p) =>
              String(
                num(p.data?.pk_univ_ec_student_id) ||
                  txt(p.data?.hallticket_number) ||
                  "row",
              )
            }
          />
        </>
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Edit Exam Center Student
              {txt(editRow?.hallticket_number)
                ? ` - ${txt(editRow?.hallticket_number)}`
                : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Exam Centers</Label>
              <Input
                disabled
                value={
                  txt(editRow?.ec_code) ||
                  txt(editRow?.examcenterCode) ||
                  String(num(editRow?.fk_univ_ec_id) || "")
                }
                className="h-8 text-[12px]"
              />
            </div>
            <label className="flex items-center gap-2 text-[13px]">
              <Checkbox
                checked={editActive}
                onCheckedChange={(v) => setEditActive(v === true)}
              />
              Active
            </label>
            {!editActive && (
              <div className="space-y-1">
                <Label>Reason</Label>
                <Input
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  className="h-8 text-[12px]"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void saveEdit()}
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
