"use client";

import { useEffect, useMemo, useState } from "react";
import type { ColDef } from "ag-grid-community";
import { CheckCircle2, ListChecks, UserCheck } from "lucide-react";
import { SearchInput } from "@/common/components/search";
import { Select as SearchableSelect } from "@/common/components/select";
import type { SelectOption } from "@/common/components/select";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  assignMultipleUpdateEvaluationAssignment,
  getMultiEvaluatorAssignBundle,
  getRegSupBaseFilters,
  getRegSupRestFilters,
  getRegSupSubjectFilters,
} from "@/services/evaluation";
import { dedupeBy, num, txt } from "@/common/utils/data-helpers";
import { toastError, toastSuccess } from "@/lib/toast";

type AnyRow = Record<string, unknown>;
type PreparedRow = AnyRow & { disabled: boolean; excludedByEvaluator: boolean };

const SEARCH_ONLY_TOOLBAR = {
  search: true,
  searchPlaceholder: "Search evaluator...",
  columnPicker: false,
  exportPdf: false,
  exportExcel: false,
  columnFilters: false,
} as const;

function fmtExamDate(v: unknown): string {
  if (!v) return "";
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Angular exam dropdown: name (from - to) (Regular)/(Supple)/(Internal) */
function examOptionLabel(row: AnyRow): string {
  const name = txt(row.exam_name) || `Exam ${num(row.fk_exam_id)}`;
  const from = fmtExamDate(row.from_date ?? row.fromDate);
  const to = fmtExamDate(row.to_date ?? row.toDate);
  const range = from && to ? ` (${from} - ${to})` : "";
  const tags = [
    row.is_regular_exam || row.isRegularExam ? "(Regular)" : "",
    row.is_supply_exam || row.isSupplyExam ? "(Supple)" : "",
    row.is_internal_exam || row.isInternalExam ? "(Internal)" : "",
  ]
    .filter(Boolean)
    .join(" ");
  return `${name}${range}${tags ? ` ${tags}` : ""}`;
}

/** Angular selectedRegulation: distinct subjects + joined groupNames */
function enrichSubjectsWithGroups(rows: AnyRow[]): AnyRow[] {
  const unique = dedupeBy(rows, (r) => num(r.fk_subject_id));
  return unique.map((subject) => {
    const groupNames = [
      ...new Set(
        rows
          .filter((x) => num(x.fk_subject_id) === num(subject.fk_subject_id))
          .map((x) => txt(x.group_name))
          .filter(Boolean),
      ),
    ].join(", ");
    return { ...subject, groupNames };
  });
}

/** Minimal, premium summary tile — accent dot + label + large number. */
function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center gap-1.5">
        <span className={`h-1.5 w-1.5 rounded-full ${accent}`} aria-hidden />
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
      </div>
      <div className="mt-1 text-[18px] font-semibold leading-none tracking-tight text-foreground tabular-nums">
        {value}
      </div>
    </div>
  );
}

export default function MultiEvaluatorAssignPage() {
  const [loading, setLoading] = useState(false);
  const [omrSearch, setOmrSearch] = useState("");
  const [detailSearch, setDetailSearch] = useState("");
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailRows, setDetailRows] = useState<AnyRow[]>([]);
  const [detailTitle, setDetailTitle] = useState("Student Answer Sheets List");

  const [baseRows, setBaseRows] = useState<AnyRow[]>([]);
  const [restRows, setRestRows] = useState<AnyRow[]>([]);
  const [subjectRows, setSubjectRows] = useState<AnyRow[]>([]);
  const [evaluatorRows, setEvaluatorRows] = useState<AnyRow[]>([]);
  const [summaryRows, setSummaryRows] = useState<AnyRow[]>([]);
  const [evaluatorOmrRows, setEvaluatorOmrRows] = useState<AnyRow[]>([]);
  const [studentRows, setStudentRows] = useState<AnyRow[]>([]);
  const [hasList, setHasList] = useState(false);

  const [courseId, setCourseId] = useState<number | null>(null);
  const [academicYearId, setAcademicYearId] = useState<number | null>(null);
  const [examId, setExamId] = useState<number | null>(null);
  const [courseYearId, setCourseYearId] = useState<number | null>(null);
  const [regulationId, setRegulationId] = useState<number | null>(null);
  const [subjectId, setSubjectId] = useState<number | null>(null);

  const [selectedEvaluatorId, setSelectedEvaluatorId] = useState<number | null>(
    null,
  );
  const [selectedOmr, setSelectedOmr] = useState<string[]>([]);
  const [evaluatorSearch, setEvaluatorSearch] = useState("");

  const employeeId = Number(
    globalThis?.localStorage?.getItem("employeeId") ?? 0,
  );
  const organizationId = Number(
    globalThis?.localStorage?.getItem("organizationId") ?? 0,
  );

  const courses = useMemo(
    () => dedupeBy(baseRows, (r) => num(r.fk_course_id)),
    [baseRows],
  );
  // Angular selectedCourse: academic years for course, sorted DESC
  const academicYears = useMemo(() => {
    const rows = dedupeBy(
      baseRows.filter((r) => num(r.fk_course_id) === num(courseId)),
      (r) => num(r.fk_academic_year_id),
    );
    return [...rows].sort(
      (a, b) =>
        parseInt(String(txt(b.academic_year) || "0"), 10) -
        parseInt(String(txt(a.academic_year) || "0"), 10),
    );
  }, [baseRows, courseId]);
  const exams = useMemo(
    () =>
      dedupeBy(
        baseRows.filter(
          (r) =>
            num(r.fk_course_id) === num(courseId) &&
            num(r.fk_academic_year_id) === num(academicYearId),
        ),
        (r) => num(r.fk_exam_id),
      ),
    [baseRows, courseId, academicYearId],
  );
  const courseYears = useMemo(
    () => dedupeBy(restRows, (r) => num(r.fk_course_year_id)),
    [restRows],
  );
  const regulations = useMemo(
    () =>
      dedupeBy(
        restRows.filter((r) => num(r.fk_course_year_id) === num(courseYearId)),
        (r) => num(r.fk_regulation_id),
      ),
    [restRows, courseYearId],
  );
  const subjects = useMemo(
    () => enrichSubjectsWithGroups(subjectRows),
    [subjectRows],
  );

  const examOptions = useMemo<SelectOption[]>(
    () =>
      exams.map((r) => ({
        value: String(num(r.fk_exam_id)),
        label: examOptionLabel(r),
      })),
    [exams],
  );
  const subjectOptions = useMemo<SelectOption[]>(
    () =>
      subjects.map((r) => {
        const base = `${txt(r.subject_name)} - ${txt(r.subject_code)} (${txt(r.regulation_code)})`;
        const groups = txt(r.groupNames);
        return {
          value: String(num(r.fk_subject_id)),
          label: groups ? `${base} · ${groups}` : base,
        };
      }),
    [subjects],
  );
  const courseOptions = useMemo<SelectOption[]>(
    () =>
      courses.map((r) => ({
        value: String(num(r.fk_course_id)),
        label: txt(r.course_code),
      })),
    [courses],
  );
  const academicYearOptions = useMemo<SelectOption[]>(
    () =>
      academicYears.map((r) => ({
        value: String(num(r.fk_academic_year_id)),
        label: txt(r.academic_year),
      })),
    [academicYears],
  );
  const courseYearOptions = useMemo<SelectOption[]>(
    () =>
      courseYears.map((r) => ({
        value: String(num(r.fk_course_year_id)),
        label: txt(r.course_year_code),
      })),
    [courseYears],
  );
  const regulationOptions = useMemo<SelectOption[]>(
    () =>
      regulations.map((r) => ({
        value: String(num(r.fk_regulation_id)),
        label: txt(r.regulation_code),
      })),
    [regulations],
  );

  useEffect(() => {
    async function init() {
      // Angular getFiltersData: s_get_exam_filters_bycode + univ_exam_filters / REGSUP
      setLoading(true);
      try {
        const rows = await getRegSupBaseFilters(employeeId);
        setBaseRows(rows);
        setCourseId(num(rows[0]?.fk_course_id) || null);
      } finally {
        setLoading(false);
      }
    }
    void init();
  }, [employeeId]);

  // Angular selectedCourse → auto first AY (DESC-sorted)
  useEffect(() => {
    setAcademicYearId(num(academicYears[0]?.fk_academic_year_id) || null);
  }, [academicYears]);

  // Angular selectedAcademicYear → auto first exam
  useEffect(() => {
    setExamId(num(exams[0]?.fk_exam_id) || null);
  }, [exams]);

  // Angular selectedExam: univ_exam_rest_in_regexamstd → course years
  useEffect(() => {
    async function loadRest() {
      if (!courseId || !academicYearId || !examId) {
        setRestRows([]);
        setCourseYearId(null);
        setRegulationId(null);
        setSubjectRows([]);
        setSubjectId(null);
        return;
      }
      try {
        const rest = await getRegSupRestFilters({
          courseId,
          academicYearId,
          examId,
          employeeId,
        });
        setRestRows(rest);
        setCourseYearId(num(rest[0]?.fk_course_year_id) || null);
      } catch {
        setRestRows([]);
        setCourseYearId(null);
        toastError("Failed to load course year filters");
      }
    }
    void loadRest();
  }, [courseId, academicYearId, examId, employeeId]);

  // Angular selectedCourseYr → regulations client-side, auto first
  useEffect(() => {
    setRegulationId(num(regulations[0]?.fk_regulation_id) || null);
  }, [regulations]);

  // Angular selectedRegulation: univ_exam_subject_regexamstd + NoLAB
  // Subject is NOT auto-selected — user must pick (Validators.required)
  useEffect(() => {
    async function loadSubjects() {
      if (
        !courseId ||
        !academicYearId ||
        !examId ||
        !courseYearId ||
        !regulationId
      ) {
        setSubjectRows([]);
        setSubjectId(null);
        return;
      }
      try {
        const sub = await getRegSupSubjectFilters({
          courseId,
          academicYearId,
          examId,
          courseYearId,
          regulationId,
          employeeId,
        });
        setSubjectRows(sub);
        setSubjectId(null);
      } catch {
        setSubjectRows([]);
        setSubjectId(null);
        toastError("Failed to load subjects");
      }
    }
    void loadSubjects();
  }, [
    courseId,
    academicYearId,
    examId,
    courseYearId,
    regulationId,
    employeeId,
  ]);

  function resetResult() {
    setEvaluatorRows([]);
    setSummaryRows([]);
    setEvaluatorOmrRows([]);
    setStudentRows([]);
    setSelectedEvaluatorId(null);
    setSelectedOmr([]);
    setEvaluatorSearch("");
    setOmrSearch("");
    setHasList(false);
  }

  function onCourseChange(v: string | null) {
    resetResult();
    setCourseId(v ? Number(v) : null);
    setAcademicYearId(null);
    setExamId(null);
    setRestRows([]);
    setCourseYearId(null);
    setRegulationId(null);
    setSubjectRows([]);
    setSubjectId(null);
  }

  function onAcademicYearChange(v: string | null) {
    resetResult();
    setAcademicYearId(v ? Number(v) : null);
    setExamId(null);
    setRestRows([]);
    setCourseYearId(null);
    setRegulationId(null);
    setSubjectRows([]);
    setSubjectId(null);
  }

  function onExamChange(v: string | null) {
    resetResult();
    setExamId(v ? Number(v) : null);
    setRestRows([]);
    setCourseYearId(null);
    setRegulationId(null);
    setSubjectRows([]);
    setSubjectId(null);
  }

  function onCourseYearChange(v: string | null) {
    resetResult();
    setCourseYearId(v ? Number(v) : null);
    setRegulationId(null);
    setSubjectRows([]);
    setSubjectId(null);
  }

  function onRegulationChange(v: string | null) {
    resetResult();
    setRegulationId(v ? Number(v) : null);
    setSubjectRows([]);
    setSubjectId(null);
  }

  function onSubjectChange(v: string | null) {
    resetResult();
    setSubjectId(v ? Number(v) : null);
  }

  async function getList() {
    // Angular getEvaluationList: form.valid (all fields including subject required)
    if (
      !courseId ||
      !academicYearId ||
      !examId ||
      !courseYearId ||
      !regulationId ||
      !subjectId
    ) {
      toastError(
        "Select Course, Academic Year, Exam, Course Year, Regulation and Subject",
      );
      return;
    }
    setLoading(true);
    try {
      const data = await getMultiEvaluatorAssignBundle({
        organizationId: organizationId || 1,
        examId,
        courseYearId,
        subjectId,
        regulationId,
        courseId,
        academicYearId,
        employeeId,
      });
      setEvaluatorRows(data.evaluators);
      setSummaryRows(data.summary);
      setEvaluatorOmrRows(data.evaluatorOmrRows);
      setStudentRows(
        data.students.filter((r) => num(r.is_answerpaper_uploaded) === 1),
      );
      setSelectedEvaluatorId(null);
      setSelectedOmr([]);
      setEvaluatorSearch("");
      setOmrSearch("");
      setHasList(true);
    } catch {
      toastError("Failed to load evaluator assignment list");
      resetResult();
    } finally {
      setLoading(false);
    }
  }

  const totals = summaryRows[0] ?? {};
  const totalStudents = num(totals.totalStudents);
  const uploaded = num(totals.NoOfAnswerpapersUploaded);
  const unassigned = num(totals.UnAssinged);
  const assigned = Math.max(uploaded - unassigned, 0);

  // Angular radio [value]=pk_examevaluator_profiledet_id (unique per list row).
  // radioChange matches exclude_fk_* against that row's pk_exam_evaluator_profile_id.
  function evaluatorProfileId(row: AnyRow): number {
    return (
      num(row.pk_exam_evaluator_profile_id) ||
      num(row.fk_exam_evaluator_profile_id) ||
      num(row.exam_evaluator_profile_id)
    );
  }

  function evaluatorAssignProfileIdOf(row: AnyRow | null): number {
    return (
      num(row?.pk_examevaluator_profiledet_id) ||
      num(row?.pk_exam_evaluator_profiledet_id)
    );
  }

  function isExcludedFor(student: AnyRow, profileId: number | null): boolean {
    if (!profileId) return false;
    const raw = String(student.exclude_fk_exam_evaluator_profile_id ?? "");
    if (!raw.trim()) return false;
    // Angular: excludedProfiles.includes(row.pk_exam_evaluator_profile_id.toString())
    return raw
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean)
      .includes(String(profileId));
  }

  const selectedEvaluator = useMemo(
    () =>
      evaluatorRows.find(
        (r) => evaluatorAssignProfileIdOf(r) === num(selectedEvaluatorId),
      ) ?? null,
    [evaluatorRows, selectedEvaluatorId],
  );

  const selectedEvaluatorProfileId = useMemo(
    () => (selectedEvaluator ? evaluatorProfileId(selectedEvaluator) : null),
    [selectedEvaluator],
  );

  const filteredEvaluators = useMemo(() => {
    const q = evaluatorSearch.trim().toLowerCase();
    if (!q) return evaluatorRows;
    return evaluatorRows.filter((r) =>
      txt(r.evaluator_name).toLowerCase().includes(q),
    );
  }, [evaluatorRows, evaluatorSearch]);

  const filteredStudents = useMemo(() => {
    const q = omrSearch.trim().toLowerCase();
    if (!q) return studentRows;
    return studentRows.filter((r) =>
      txt(r.omr_serial_no).toLowerCase().includes(q),
    );
  }, [studentRows, omrSearch]);

  // Angular assignedOmrList: radioChange filters examStudentList2 by exclude_fk
  // containing the selected evaluator's pk_exam_evaluator_profile_id (string match).
  // Independent of the OMR search box. Fallback to evaluatorsOmrList (result[2])
  // when exclude is empty but assigned OMRs exist for that profile.
  const alreadyAssignedRows = useMemo(() => {
    if (!selectedEvaluatorProfileId) return [];
    const fromExclude = studentRows.filter((r) =>
      isExcludedFor(r, selectedEvaluatorProfileId),
    );
    if (fromExclude.length > 0) return fromExclude;

    const fromOmrBundle = evaluatorOmrRows.filter(
      (r) =>
        evaluatorProfileId(r) === selectedEvaluatorProfileId &&
        Boolean(txt(r.omr_serial_no)),
    );
    if (fromOmrBundle.length === 0) return [];

    const omrSet = new Set(fromOmrBundle.map((r) => txt(r.omr_serial_no)));
    const matchedStudents = studentRows.filter((r) =>
      omrSet.has(txt(r.omr_serial_no)),
    );
    return matchedStudents.length > 0 ? matchedStudents : fromOmrBundle;
  }, [studentRows, evaluatorOmrRows, selectedEvaluatorProfileId]);

  const alreadyAssignedOmrSet = useMemo(
    () =>
      new Set(
        alreadyAssignedRows.map((r) => txt(r.omr_serial_no)).filter(Boolean),
      ),
    [alreadyAssignedRows],
  );

  // Angular radioChange → maintDataList (answer papers): disable when excluded OR disable_omr
  const preparedRows = useMemo<PreparedRow[]>(() => {
    if (!selectedEvaluatorProfileId) return [];
    return filteredStudents
      .map((r): PreparedRow => {
        const omr = txt(r.omr_serial_no);
        const excludedByEvaluator =
          isExcludedFor(r, selectedEvaluatorProfileId) ||
          (omr.length > 0 && alreadyAssignedOmrSet.has(omr));
        const disabledByOmr = num(r.disable_omr) === 1;
        return {
          ...r,
          disabled: excludedByEvaluator || disabledByOmr,
          excludedByEvaluator,
        };
      })
      .sort((a, b) => {
        if (a.disabled !== b.disabled) return a.disabled ? 1 : -1;
        return num(a.omr_mapped) - num(b.omr_mapped);
      });
  }, [filteredStudents, selectedEvaluatorProfileId, alreadyAssignedOmrSet]);

  const availableRows = useMemo(
    () => preparedRows.filter((r) => !r.disabled),
    [preparedRows],
  );
  const availableOmr = useMemo(
    () => availableRows.map((r) => txt(r.omr_serial_no)).filter(Boolean),
    [availableRows],
  );
  const selectedCount = selectedOmr.length;
  const allAvailableSelected =
    availableOmr.length > 0 &&
    availableOmr.every((omr) => selectedOmr.includes(omr));

  function toggleAll(checked: boolean) {
    if (!checked) {
      setSelectedOmr([]);
      return;
    }
    setSelectedOmr(availableOmr);
  }

  function toggleOmr(omr: string, checked: boolean) {
    setSelectedOmr((prev) =>
      checked ? [...new Set([...prev, omr])] : prev.filter((v) => v !== omr),
    );
  }

  async function assign() {
    const assignProfileId = evaluatorAssignProfileIdOf(selectedEvaluator);
    if (
      !selectedEvaluator ||
      !assignProfileId ||
      selectedOmr.length === 0 ||
      !examId ||
      !subjectId ||
      !courseYearId
    )
      return;
    setLoading(true);
    try {
      await assignMultipleUpdateEvaluationAssignment({
        profileId: assignProfileId,
        omrSerialNosCsv: selectedOmr.join(","),
        examId,
        subjectId,
        courseYearId,
      });
      toastSuccess("Answer papers assigned successfully.");
      await getList();
    } catch (err) {
      toastError(err, "Failed to assign answer papers");
    } finally {
      setLoading(false);
    }
  }

  function openDetail(
    row: AnyRow,
    type: "AssignedList" | "CompletedList" | "DueList",
  ) {
    const id = evaluatorProfileId(row);
    const all = evaluatorOmrRows.filter(
      (r) => evaluatorProfileId(r) === id && txt(r.omr_serial_no),
    );
    let rows = all;
    if (type === "CompletedList")
      rows = all.filter((r) => txt(r.evaluated_totalmarks));
    else if (type === "DueList")
      rows = all.filter((r) => !txt(r.evaluated_totalmarks));
    setDetailRows(rows);
    let title = "Student Answer Sheets List";
    if (type === "CompletedList") title = "Evaluated Answer Sheets";
    else if (type === "DueList") title = "Due Answer Sheets";
    setDetailTitle(title);
    setDetailSearch("");
    setDetailOpen(true);
  }

  const filteredDetailRows = useMemo(() => {
    const q = detailSearch.trim().toLowerCase();
    if (!q) return detailRows;
    return detailRows.filter((r) =>
      txt(r.omr_serial_no).toLowerCase().includes(q),
    );
  }, [detailRows, detailSearch]);

  const columns = useMemo<ColDef[]>(
    () => [
      {
        headerName: "SI.No",
        valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1,
        width: 80,
        flex: 0,
      },
      {
        headerName: "Evaluator Name",
        valueGetter: (p) => txt(p.data?.evaluator_name),
        minWidth: 200,
        flex: 1,
      },
      {
        headerName: "Evaluator Email",
        valueGetter: (p) => txt(p.data?.email),
        minWidth: 220,
        flex: 1,
      },
      {
        colId: "assignedSheets",
        headerName: "Assigned Answer Sheets",
        valueGetter: (p) => num(p.data?.no_of_students_assigned),
        minWidth: 180,
        cellStyle: {
          color: "#1d4ed8",
          textDecoration: "underline",
          cursor: "pointer",
          fontWeight: 600,
        },
      },
      {
        colId: "evaluatedSheets",
        headerName: "Evaluated Answer Sheets",
        valueGetter: (p) => num(p.data?.no_of_evaluations_completed),
        minWidth: 180,
        cellStyle: {
          color: "#15803d",
          textDecoration: "underline",
          cursor: "pointer",
          fontWeight: 600,
        },
      },
      {
        colId: "dueSheets",
        headerName: "Due Answer Sheets",
        valueGetter: (p) =>
          num(p.data?.no_of_students_assigned) -
          num(p.data?.no_of_evaluations_completed),
        minWidth: 160,
        cellStyle: {
          color: "#b45309",
          textDecoration: "underline",
          cursor: "pointer",
          fontWeight: 600,
        },
      },
    ],
    [],
  );

  function handleTableCellClick(event: {
    colDef?: { colId?: string; field?: string; headerName?: string };
    column?: { getColId?: () => string };
    data?: AnyRow;
  }) {
    const colId =
      event.colDef?.colId ??
      event.colDef?.field ??
      event.column?.getColId?.() ??
      "";
    const header = txt(event.colDef?.headerName).toLowerCase();
    if (!event.data) return;
    if (colId === "assignedSheets" || header.includes("assigned answer sheets"))
      openDetail(event.data, "AssignedList");
    else if (
      colId === "evaluatedSheets" ||
      header.includes("evaluated answer sheets")
    )
      openDetail(event.data, "CompletedList");
    else if (colId === "dueSheets" || header.includes("due answer sheets"))
      openDetail(event.data, "DueList");
  }

  const stats = [
    { label: "Total Students", value: totalStudents, accent: "bg-slate-400" },
    { label: "Answer Papers Uploaded", value: uploaded, accent: "bg-sky-500" },
    { label: "Unassigned", value: unassigned, accent: "bg-amber-500" },
    { label: "Assigned", value: assigned, accent: "bg-emerald-500" },
  ];

  return (
    <FilteredListPage
      title="Assign Multi Evaluator"
      filters={
        <>
          <GlobalFilterBarRow>
            <GlobalFilterField label="Course">
              <SearchableSelect
                value={courseId ? String(courseId) : null}
                onChange={onCourseChange}
                options={courseOptions}
                placeholder="Course"
              />
            </GlobalFilterField>
            <GlobalFilterField label="Academic Year">
              <SearchableSelect
                value={academicYearId ? String(academicYearId) : null}
                onChange={onAcademicYearChange}
                options={academicYearOptions}
                placeholder="Academic Year"
              />
            </GlobalFilterField>
            <GlobalFilterField label="Exam">
              <SearchableSelect
                value={examId ? String(examId) : null}
                onChange={onExamChange}
                options={examOptions}
                placeholder="Search exam…"
                searchable
              />
            </GlobalFilterField>
            <GlobalFilterField label="Course Year">
              <SearchableSelect
                value={courseYearId ? String(courseYearId) : null}
                onChange={onCourseYearChange}
                options={courseYearOptions}
                placeholder="Course Year"
              />
            </GlobalFilterField>
            <GlobalFilterField label="Regulation">
              <SearchableSelect
                value={regulationId ? String(regulationId) : null}
                onChange={onRegulationChange}
                options={regulationOptions}
                placeholder="Regulation"
              />
            </GlobalFilterField>
          </GlobalFilterBarRow>
          <GlobalFilterBarRow>
            <GlobalFilterField label="Subject">
              <SearchableSelect
                value={subjectId ? String(subjectId) : null}
                onChange={onSubjectChange}
                options={subjectOptions}
                placeholder="Search subjects…"
                searchable
              />
            </GlobalFilterField>
            <GlobalFilterField
              label=""
              className="global-filter-field--shrink global-filter-field--action"
            >
              <Button
                type="button"
                onClick={() => void getList()}
                disabled={loading}
                className="h-[30px] px-3 text-[12px]"
              >
                Get List
              </Button>
            </GlobalFilterField>
          </GlobalFilterBarRow>
        </>
      }
      notice={
        hasList ? (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
              {stats.map((s) => (
                <StatCard
                  key={s.label}
                  label={s.label}
                  value={s.value}
                  accent={s.accent}
                />
              ))}
            </div>

            <div className="app-card overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-muted/40 flex items-center gap-2">
                <h2 className="app-card-title flex items-center gap-2">
                  <ListChecks className="h-4 w-4 text-[hsl(var(--primary))]" />{" "}
                  Assign Answer Papers
                </h2>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 lg:divide-x divide-border">
                {/* Evaluators */}
                <div className="lg:col-span-3 flex flex-col min-h-0">
                  <div className="px-3 py-2.5 border-b border-border flex items-center justify-between">
                    <span className="text-[12px] font-semibold text-foreground">
                      Evaluators
                    </span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                      {filteredEvaluators.length}
                    </span>
                  </div>
                  <div className="p-2.5">
                    <SearchInput
                      value={evaluatorSearch}
                      onChange={setEvaluatorSearch}
                      placeholder="Search evaluator…"
                      className="w-full"
                    />
                  </div>
                  <div className="px-2.5 pb-2.5 max-h-[calc(100vh-360px)] min-h-[420px] overflow-y-auto space-y-1.5">
                    {filteredEvaluators.map((row, i) => {
                      const detId = evaluatorAssignProfileIdOf(row);
                      const active = num(selectedEvaluatorId) === detId;
                      return (
                        <button
                          key={`e-${detId}-${i}`}
                          type="button"
                          onClick={() => {
                            // Angular radio value = pk_examevaluator_profiledet_id
                            setSelectedEvaluatorId(detId || null);
                            setSelectedOmr([]);
                          }}
                          title={`${txt(row.evaluator_name)} / ${num(row.no_of_students_assigned)}`}
                          className={`group w-full flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-left text-[12px] transition-all ${
                            active
                              ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/[0.06] ring-1 ring-[hsl(var(--primary))]/25 shadow-sm"
                              : "border-border bg-card hover:border-input hover:bg-muted/50"
                          }`}
                        >
                          <span className="flex items-center gap-2.5 min-w-0">
                            <span
                              className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border-2 transition-colors ${
                                active
                                  ? "border-[hsl(var(--primary))]"
                                  : "border-muted-foreground/40 group-hover:border-muted-foreground/70"
                              }`}
                            >
                              {active && (
                                <span className="h-2 w-2 rounded-full bg-[hsl(var(--primary))]" />
                              )}
                            </span>
                            <span
                              className={`truncate ${active ? "font-semibold text-[hsl(var(--primary))]" : "text-foreground"}`}
                            >
                              {txt(row.evaluator_name)}
                            </span>
                          </span>
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              active
                                ? "bg-[hsl(var(--primary))] text-white"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {num(row.no_of_students_assigned)}
                          </span>
                        </button>
                      );
                    })}
                    {filteredEvaluators.length === 0 && (
                      <p className="px-2 py-8 text-center text-[12px] text-muted-foreground">
                        No evaluators found
                      </p>
                    )}
                  </div>
                </div>

                {/* Answer papers (serial no) */}
                <div className="lg:col-span-5 flex flex-col min-h-0">
                  <div className="px-3 py-2 border-b border-border bg-card flex items-center justify-between gap-2">
                    <span className="text-[12px] font-semibold text-[hsl(var(--primary))]">
                      Answer Papers
                    </span>
                    <span className="text-[11px] text-blue-700 font-semibold">
                      Selected: {selectedCount}
                    </span>
                  </div>
                  <div className="p-2">
                    <SearchInput
                      value={omrSearch}
                      onChange={setOmrSearch}
                      placeholder="Search serial no…"
                      className="w-full"
                      disabled={!selectedEvaluator}
                    />
                  </div>
                  {!selectedEvaluator ? (
                    <div className="flex-1 grid place-items-center px-4 py-12 text-center">
                      <div className="space-y-2">
                        <UserCheck className="mx-auto h-8 w-8 text-muted-foreground/40" />
                        <p className="text-[12px] text-muted-foreground">
                          Select an evaluator to view answer papers.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="px-2 pb-2 max-h-[calc(100vh-360px)] min-h-[420px] overflow-y-auto">
                      <table className="w-full text-[12px]">
                        <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur">
                          <tr className="text-left">
                            <th className="px-2 py-1.5 w-12">
                              <label className="inline-flex items-center gap-1">
                                <input
                                  type="checkbox"
                                  checked={allAvailableSelected}
                                  onChange={(e) => toggleAll(e.target.checked)}
                                  disabled={availableOmr.length === 0}
                                />
                              </label>
                            </th>
                            <th className="px-2 py-1.5">Serial No</th>
                            <th className="px-2 py-1.5 w-28 text-center">
                              Papers Assigned
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {preparedRows.map((row, i) => {
                            const omr = txt(row.omr_serial_no);
                            const checked = selectedOmr.includes(omr);
                            const disabled = Boolean(row.disabled);
                            return (
                              <tr
                                key={`omr-${omr}-${i}`}
                                className={`border-t border-border/60 ${disabled ? "opacity-50" : "hover:bg-muted/40"}`}
                              >
                                <td className="px-2 py-1.5">
                                  <input
                                    type="checkbox"
                                    disabled={disabled}
                                    checked={checked}
                                    onChange={(e) =>
                                      toggleOmr(omr, e.target.checked)
                                    }
                                  />
                                </td>
                                <td className="px-2 py-1.5 font-medium">
                                  {omr}
                                </td>
                                <td className="px-2 py-1.5 text-center">
                                  {num(row.omr_mapped)}
                                </td>
                              </tr>
                            );
                          })}
                          {preparedRows.length === 0 && (
                            <tr>
                              <td
                                colSpan={3}
                                className="px-2 py-8 text-center text-muted-foreground"
                              >
                                No answer papers
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Selected */}
                <div className="lg:col-span-2 flex flex-col min-h-0">
                  <div className="px-3 py-2 border-b border-border bg-card">
                    <span className="text-[12px] font-semibold text-blue-700">
                      Selected: {selectedCount}
                    </span>
                  </div>
                  <div className="px-2 py-2 max-h-[calc(100vh-360px)] min-h-[420px] overflow-y-auto space-y-1">
                    {selectedOmr.map((omr) => (
                      <div
                        key={`sel-${omr}`}
                        className="rounded bg-blue-50 px-2 py-1 text-[12px] font-medium text-blue-700"
                      >
                        {omr}
                      </div>
                    ))}
                    {selectedOmr.length === 0 && (
                      <p className="px-1 py-4 text-center text-[11px] text-muted-foreground">
                        None selected
                      </p>
                    )}
                  </div>
                </div>

                {/* Already assigned */}
                <div className="lg:col-span-2 flex flex-col min-h-0">
                  <div className="px-3 py-2 border-b border-border bg-card">
                    <span className="text-[12px] font-semibold text-violet-700">
                      Already Assigned: {alreadyAssignedRows.length}
                    </span>
                  </div>
                  <div className="px-2 py-2 max-h-[calc(100vh-360px)] min-h-[420px] overflow-y-auto space-y-1">
                    {alreadyAssignedRows.map((row, i) => (
                      <div
                        key={`as-${txt(row.omr_serial_no)}-${i}`}
                        className="rounded bg-violet-50 px-2 py-1 text-[12px] text-violet-700"
                      >
                        {txt(row.omr_serial_no)}
                      </div>
                    ))}
                    {alreadyAssignedRows.length === 0 && (
                      <p className="px-1 py-4 text-center text-[11px] text-muted-foreground">
                        {selectedEvaluator ? "None" : "—"}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Assign — Angular: bottom-right, only when papers are selected */}
              {selectedOmr.length > 0 && (
                <div className="flex justify-end border-t border-border px-4 py-3">
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 text-[12px] gap-1.5"
                    onClick={() => void assign()}
                    disabled={loading}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> Assign
                  </Button>
                </div>
              )}
            </div>
          </>
        ) : null
      }
      toolbarLeading={<span />}
      rowData={hasList ? evaluatorRows : []}
      columnDefs={columns}
      pagination
      loading={loading}
      onCellClicked={handleTableCellClick}
      toolbar={SEARCH_ONLY_TOOLBAR}
    >
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-[15px] font-semibold text-[hsl(var(--primary))]">
              {detailTitle}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <SearchInput
              className="w-full max-w-sm"
              value={detailSearch}
              onChange={setDetailSearch}
              placeholder="Search OMR…"
            />
            <div className="max-h-[420px] overflow-auto rounded border">
              <table className="w-full text-[12px]">
                <thead className="sticky top-0 bg-muted/80 backdrop-blur">
                  <tr className="text-left">
                    <th className="px-2 py-1.5 w-16">S.No</th>
                    <th className="px-2 py-1.5">OMR Serial No</th>
                    <th className="px-2 py-1.5">Evaluated Total Marks</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDetailRows.map((row, i) => (
                    <tr
                      key={`detail-${txt(row.omr_serial_no)}-${i}`}
                      className="border-t"
                    >
                      <td className="px-2 py-1.5">{i + 1}</td>
                      <td className="px-2 py-1.5 font-medium">
                        {txt(row.omr_serial_no) || "-"}
                      </td>
                      <td className="px-2 py-1.5">
                        {txt(row.evaluated_totalmarks) || "-"}
                      </td>
                    </tr>
                  ))}
                  {filteredDetailRows.length === 0 && (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-2 py-8 text-center text-muted-foreground"
                      >
                        No records
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </FilteredListPage>
  );
}
