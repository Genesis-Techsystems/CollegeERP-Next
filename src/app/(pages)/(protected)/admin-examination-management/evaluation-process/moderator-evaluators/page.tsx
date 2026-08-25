"use client";

/**
 * Angular parity: evaluation-process/moderator-evaluators
 * (goldcollegeerp moderator-evaluators.component.ts / .html)
 */

import { useEffect, useMemo, useRef, useState } from "react";
import type {
  ColDef,
  ICellRendererParams,
  IHeaderParams,
} from "ag-grid-community";
import { FilteredListPage } from "@/components/layout";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
import { DataTable } from "@/common/components/table";
import { StatusBadge } from "@/common/components/data-display";
import { Button } from "@/components/ui/button";
import { Select, type SelectOption } from "@/common/components/select";
import {
  addMultipleEvaluators,
  getModeratorEvaluatorProfiles,
  getRegSupBaseFilters,
  getRegSupRestFilters,
  getRegSupSubjectFilters,
  listModeratorEvaluationMapping,
} from "@/services";
import { dedupeBy, num, txt } from "@/common/utils/data-helpers";
import { getErrorMessage } from "@/lib/errors";
import { toastError, toastSuccess } from "@/lib/toast";
import { rowIndexGetter } from "@/lib/utils";

type AnyRow = Record<string, unknown>;

const SEARCH_ONLY_TOOLBAR = {
  search: true,
  searchPlaceholder: "Search",
  columnPicker: false,
  exportPdf: false,
  exportExcel: false,
  columnFilters: false,
} as const;

function fmtExamDate(v: unknown): string {
  if (v == null || v === "") return "";
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

function moderatorProfileId(m: AnyRow): number {
  return num(
    m.examEvaluatorProfileId ??
      m.exam_evaluator_profile_id ??
      m.pk_exam_evaluator_profile_id,
  );
}

type SelectAllHeaderParams = IHeaderParams & {
  checked: boolean;
  onToggle: (checked: boolean) => void;
};

function SelectAllHeader(props: SelectAllHeaderParams) {
  return (
    <label className="flex h-full w-full cursor-pointer items-center justify-start gap-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-[hsl(var(--primary))]">
      <input
        type="checkbox"
        className="h-4 w-4 accent-[hsl(var(--primary))]"
        checked={props.checked}
        onChange={(e) => props.onToggle(e.target.checked)}
        aria-label="Select all evaluators"
      />
      All
    </label>
  );
}

function makeCheckRenderer(
  selectedIds: number[],
  onToggle: (id: number, checked: boolean) => void,
) {
  return (p: ICellRendererParams<AnyRow>) => {
    const row = p.data;
    if (!row) return null;
    const id = num(row.pk_exam_evaluator_profile_id);
    if (!id) return null;
    return (
      <div className="flex h-full w-full items-center justify-start">
        <input
          type="checkbox"
          className="h-4 w-4 accent-[hsl(var(--primary))]"
          checked={selectedIds.includes(id)}
          onChange={(e) => onToggle(id, e.target.checked)}
          aria-label={`Select ${txt(row.evaluator_name)}`}
        />
      </div>
    );
  };
}

function mappedStatusRenderer(p: ICellRendererParams<AnyRow>) {
  const row = p.data;
  if (!row) return null;
  const active =
    row.is_active === true ||
    row.is_active === 1 ||
    num(row.is_active) === 1 ||
    String(row.is_active).toLowerCase() === "true";
  return (
    <StatusBadge
      status={active ? "active" : "inactive"}
      label={active ? "Active" : "InActive"}
    />
  );
}

export default function ModeratorEvaluatorsPage() {
  const [loading, setLoading] = useState(false);
  /** Angular `flag` — show Available / Mapped panels after Get List. */
  const [showPanel, setShowPanel] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [baseRows, setBaseRows] = useState<AnyRow[]>([]);
  const [restRows, setRestRows] = useState<AnyRow[]>([]);
  const [subjectRows, setSubjectRows] = useState<AnyRow[]>([]);
  const [moderatorRows, setModeratorRows] = useState<AnyRow[]>([]);
  const [availableRows, setAvailableRows] = useState<AnyRow[]>([]);
  const [mappedRows, setMappedRows] = useState<AnyRow[]>([]);

  /** Angular `examevaluatorListdata` — checked available evaluators. */
  const [selectedEvaluatorIds, setSelectedEvaluatorIds] = useState<number[]>(
    [],
  );

  const [courseId, setCourseId] = useState<number | null>(null);
  const [academicYearId, setAcademicYearId] = useState<number | null>(null);
  const [examId, setExamId] = useState<number | null>(null);
  const [courseYearId, setCourseYearId] = useState<number | null>(null);
  const [regulationId, setRegulationId] = useState<number | null>(null);
  const [subjectId, setSubjectId] = useState<number | null>(null);
  /** Angular form examModeratorId — 0 = All. */
  const [examModeratorId, setExamModeratorId] = useState<number>(0);

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

  // Angular: academic years sorted DESC by academic_year
  const academicYears = useMemo(() => {
    const years = dedupeBy(
      baseRows.filter((r) => num(r.fk_course_id) === num(courseId)),
      (r) => num(r.fk_academic_year_id),
    );
    return [...years].sort(
      (a, b) =>
        parseInt(txt(b.academic_year), 10) - parseInt(txt(a.academic_year), 10),
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
    () => dedupeBy(subjectRows, (r) => num(r.fk_subject_id)),
    [subjectRows],
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

  const examOptions = useMemo<SelectOption[]>(
    () =>
      exams.map((r) => ({
        value: String(num(r.fk_exam_id)),
        label: examOptionLabel(r),
      })),
    [exams],
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

  const subjectOptions = useMemo<SelectOption[]>(
    () =>
      subjects.map((r) => ({
        value: String(num(r.fk_subject_id)),
        label: `${txt(r.subject_name)} - ${txt(r.subject_code)} (${txt(r.regulation_code)})`,
      })),
    [subjects],
  );

  // Angular: All (0) + moderator names
  const moderatorOptions = useMemo<SelectOption[]>(
    () => [
      { value: "0", label: "All" },
      ...moderatorRows.map((m) => ({
        value: String(moderatorProfileId(m)),
        label: txt(m.evaluatorName ?? m.evaluator_name) || "—",
      })),
    ],
    [moderatorRows],
  );

  function resetLists() {
    setShowPanel(false);
    setAvailableRows([]);
    setMappedRows([]);
    setSelectedEvaluatorIds([]);
    setErrorMsg("");
  }

  /** Angular getModeratorList() after subject select. */
  async function loadModerators() {
    try {
      const list = await getModeratorEvaluatorProfiles();
      setModeratorRows(list as AnyRow[]);
      const firstId = moderatorProfileId((list[0] as AnyRow) ?? {});
      // Angular sets first moderator (not All) after load.
      setExamModeratorId(firstId > 0 ? firstId : 0);
    } catch (e) {
      // Keep static "All" (0) so Get List still works; toast is about dropdown load, not All.
      setModeratorRows([]);
      setExamModeratorId(0);
      toastError(e, "Failed to load moderators");
    }
  }

  // Angular getFiltersData → first course → cascade
  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const filters = await getRegSupBaseFilters(employeeId);
        setBaseRows(filters);
        if (filters.length > 0) {
          setCourseId(num(filters[0]?.fk_course_id) || null);
        }
      } catch (e) {
        toastError(e, "Failed to load filters");
      } finally {
        setLoading(false);
      }
    }
    void init();
  }, [employeeId]);

  // Angular selectedCourse → academic years (DESC) → first
  useEffect(() => {
    resetLists();
    setAcademicYearId(
      academicYears.length > 0
        ? num(academicYears[0]?.fk_academic_year_id) || null
        : null,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, academicYears]);

  // Angular selectedAcademicYear → first exam
  useEffect(() => {
    resetLists();
    setExamId(exams.length > 0 ? num(exams[0]?.fk_exam_id) || null : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [academicYearId, exams]);

  // Angular selectedExam → univ_exam_rest_in_regexamstd → course years
  useEffect(() => {
    async function loadRest() {
      resetLists();
      setRestRows([]);
      setCourseYearId(null);
      setRegulationId(null);
      setSubjectId(null);
      setSubjectRows([]);
      setModeratorRows([]);
      setExamModeratorId(0);
      if (!courseId || !academicYearId || !examId) return;
      setLoading(true);
      try {
        const rest = await getRegSupRestFilters({
          courseId,
          academicYearId,
          examId,
          employeeId,
        });
        setRestRows(rest);
        setCourseYearId(num(rest[0]?.fk_course_year_id) || null);
      } catch (e) {
        toastError(e, "Failed to load course years");
      } finally {
        setLoading(false);
      }
    }
    void loadRest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, academicYearId, examId, employeeId]);

  // Angular selectedCourseYr → regulations from rest rows
  useEffect(() => {
    resetLists();
    setSubjectId(null);
    setSubjectRows([]);
    setModeratorRows([]);
    setExamModeratorId(0);
    setRegulationId(
      regulations.length > 0
        ? num(regulations[0]?.fk_regulation_id) || null
        : null,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseYearId, regulations]);

  // Angular selectedRegulation → subjects (does NOT auto-select subject)
  useEffect(() => {
    async function loadSubjects() {
      resetLists();
      setSubjectId(null);
      setSubjectRows([]);
      setModeratorRows([]);
      setExamModeratorId(0);
      if (
        !courseId ||
        !academicYearId ||
        !examId ||
        !courseYearId ||
        !regulationId
      )
        return;
      setLoading(true);
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
        // Angular does not auto-set subjectId — user must pick.
      } catch (e) {
        toastError(e, "Failed to load subjects");
      } finally {
        setLoading(false);
      }
    }
    void loadSubjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    courseId,
    academicYearId,
    examId,
    courseYearId,
    regulationId,
    employeeId,
  ]);

  /** Angular selectedsubject() → clear moderator + getModeratorList() */
  async function onSubjectChange(nextSubjectId: number | null) {
    resetLists();
    setSubjectId(nextSubjectId);
    setExamModeratorId(0);
    setModeratorRows([]);
    if (!nextSubjectId) return;
    setLoading(true);
    try {
      await loadModerators();
    } finally {
      setLoading(false);
    }
  }

  /** Angular selectedName() — clear lists when moderator changes. */
  function onModeratorChange(nextId: number) {
    resetLists();
    setExamModeratorId(nextId);
  }

  /** Angular getEvaluationList() — flag=true as soon as form is valid. */
  async function getList() {
    if (
      !courseId ||
      !academicYearId ||
      !examId ||
      !courseYearId ||
      !regulationId ||
      !subjectId
    ) {
      toastError("Please fill all required filters before Get List.");
      return;
    }
    setLoading(true);
    setShowPanel(true);
    setErrorMsg("");
    setSelectedEvaluatorIds([]);
    setAvailableRows([]);
    setMappedRows([]);
    try {
      const rows = await listModeratorEvaluationMapping({
        organizationId: organizationId || 1,
        examId,
        courseYearId,
        subjectId,
        regulationId,
        courseId,
        academicYearId,
        employeeId,
        moderatorProfileId: examModeratorId,
      });
      setAvailableRows(rows.filter((r) => num(r.is_mapped) === 0));
      setMappedRows(rows.filter((r) => num(r.is_mapped) === 1));
      if (rows.length === 0) {
        toastSuccess("No Record(s) found.");
      }
    } catch (e) {
      setShowPanel(false);
      toastError(e, "Failed to load evaluators");
    } finally {
      setLoading(false);
    }
  }

  function toggleOne(id: number, checked: boolean) {
    setSelectedEvaluatorIds((prev) =>
      checked ? [...new Set([...prev, id])] : prev.filter((x) => x !== id),
    );
  }

  function toggleAll(checked: boolean) {
    setSelectedEvaluatorIds(
      checked
        ? availableRows
            .map((r) => num(r.pk_exam_evaluator_profile_id))
            .filter((id) => id > 0)
        : [],
    );
  }

  const allSelected =
    availableRows.length > 0 &&
    selectedEvaluatorIds.length === availableRows.length;

  const toggleAllRef = useRef(toggleAll);
  toggleAllRef.current = toggleAll;

  /**
   * Angular Assign() — posts checked rows only.
   * Sends form examModeratorId as-is (including All = 0).
   */
  async function assign() {
    if (!examId || !subjectId) return;
    if (selectedEvaluatorIds.length === 0) {
      toastError("Please select at least one evaluator to assign.");
      return;
    }
    setErrorMsg("");
    const payload = selectedEvaluatorIds.map((evaluatorProfileId) => ({
      examId,
      subjectId,
      moderatorProfileId: examModeratorId,
      evaluatorProfileId,
      isActive: true,
      reason: null,
    }));
    setLoading(true);
    try {
      await addMultipleEvaluators(payload);
      toastSuccess("Evaluators assigned successfully.");
      // Angular: flag=false then getEvaluationList()
      await getList();
    } catch (error) {
      const msg = getErrorMessage(error) || "Failed to assign evaluators.";
      setErrorMsg(msg);
      toastError(error, "Failed to assign evaluators");
    } finally {
      setLoading(false);
    }
  }

  const formValid = Boolean(
    courseId &&
    academicYearId &&
    examId &&
    courseYearId &&
    regulationId &&
    subjectId,
  );

  const availableColumnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      {
        colId: "selectAll",
        headerName: "All",
        width: 75,
        flex: 0,
        sortable: false,
        filter: false,
        floatingFilter: false,
        suppressHeaderMenuButton: true,
        suppressHeaderFilterButton: true,
        headerComponent: SelectAllHeader,
        headerComponentParams: {
          checked: allSelected,
          onToggle: (checked: boolean) => toggleAllRef.current(checked),
        },
        cellRenderer: makeCheckRenderer(selectedEvaluatorIds, toggleOne),
        cellStyle: {
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-start",
        },
        headerClass: "text-left",
      },
      { headerName: "SI.No", valueGetter: rowIndexGetter, width: 80, flex: 0 },
      {
        headerName: "Evaluator Name",
        minWidth: 200,
        flex: 1,
        valueGetter: (p) => txt(p.data?.evaluator_name) || "—",
      },
      {
        headerName: "Evaluator Email",
        minWidth: 220,
        flex: 1,
        valueGetter: (p) => txt(p.data?.email) || "—",
      },
    ],
    [selectedEvaluatorIds, allSelected],
  );

  const mappedColumnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      { headerName: "SI.No", valueGetter: rowIndexGetter, width: 80, flex: 0 },
      {
        headerName: "Evaluator Name",
        minWidth: 200,
        flex: 1,
        valueGetter: (p) => txt(p.data?.evaluator_name) || "—",
      },
      {
        headerName: "Evaluator Email",
        minWidth: 220,
        flex: 1,
        valueGetter: (p) => txt(p.data?.email) || "—",
      },
      {
        headerName: "Status",
        minWidth: 110,
        cellRenderer: mappedStatusRenderer,
      },
    ],
    [],
  );

  const filters = (
    <GlobalFilterBarRow>
      <GlobalFilterField label="Course">
        <Select
          value={courseId != null ? String(courseId) : null}
          onChange={(v) => setCourseId(v ? num(v) : null)}
          options={courseOptions}
          placeholder="Course"
          clearable={false}
        />
      </GlobalFilterField>
      <GlobalFilterField label="Academic Year">
        <Select
          value={academicYearId != null ? String(academicYearId) : null}
          onChange={(v) => setAcademicYearId(v ? num(v) : null)}
          options={academicYearOptions}
          placeholder="Academic Year"
          clearable={false}
        />
      </GlobalFilterField>
      <GlobalFilterField label="Exam">
        <Select
          value={examId != null ? String(examId) : null}
          onChange={(v) => setExamId(v ? num(v) : null)}
          options={examOptions}
          placeholder="Exam"
          searchable
          clearable={false}
        />
      </GlobalFilterField>
      <GlobalFilterField label="Course Year">
        <Select
          value={courseYearId != null ? String(courseYearId) : null}
          onChange={(v) => setCourseYearId(v ? num(v) : null)}
          options={courseYearOptions}
          placeholder="Course Year"
          clearable={false}
        />
      </GlobalFilterField>
      <GlobalFilterField label="Regulation">
        <Select
          value={regulationId != null ? String(regulationId) : null}
          onChange={(v) => setRegulationId(v ? num(v) : null)}
          options={regulationOptions}
          placeholder="Regulation"
          clearable={false}
        />
      </GlobalFilterField>
      <GlobalFilterField label="Subject">
        <Select
          value={subjectId != null ? String(subjectId) : null}
          onChange={(v) => void setSubjectId(v ? num(v) : null)}
          options={subjectOptions}
          placeholder="Subject"
          searchable
          clearable={false}
        />
      </GlobalFilterField>
      <GlobalFilterField label="Moderator Name">
        <Select
          value={String(examModeratorId)}
          onChange={(v) => onModeratorChange(num(v ?? 0))}
          options={moderatorOptions}
          placeholder="Moderator Name"
          searchable
          clearable={false}
        />
      </GlobalFilterField>
      <GlobalFilterField
        label=""
        className="global-filter-field--shrink global-filter-field--action"
      >
        <Button
          type="button"
          onClick={() => void getList()}
          disabled={loading || !formValid}
          className="h-[30px] px-3 text-[12px]"
        >
          Get List
        </Button>
      </GlobalFilterField>
    </GlobalFilterBarRow>
  );

  // Angular: filters-only until Get List (`flag`); then Available Evaluator + optional Mapped list
  if (!showPanel) {
    return (
      <FilteredListPage
        title="Moderator Evaluator"
        filters={filters}
        body={null}
        loading={loading}
      />
    );
  }

  return (
    <FilteredListPage
      title="Moderator Evaluators"
      filters={filters}
      rowData={availableRows}
      columnDefs={availableColumnDefs}
      loading={loading}
      pagination
      paginationPageSize={25}
      columnFilters={false}
      toolbar={SEARCH_ONLY_TOOLBAR}
      toolbarTrailing={
        availableRows.length > 0 ? (
          <Button
            type="button"
            onClick={() => void assign()}
            disabled={loading}
          >
            Assign
          </Button>
        ) : null
      }
    >
      {mappedRows.length > 0 ? (
        <DataTable
          title="Mapped Evaluator List"
          subtitle=""
          rowData={mappedRows}
          columnDefs={mappedColumnDefs}
          pagination
          paginationPageSize={25}
          columnFilters={false}
          toolbar={SEARCH_ONLY_TOOLBAR}
        />
      ) : null}
    </FilteredListPage>
  );
}
