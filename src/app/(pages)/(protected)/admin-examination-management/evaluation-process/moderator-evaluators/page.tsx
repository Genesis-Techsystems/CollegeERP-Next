"use client";

import { useEffect, useMemo, useState } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
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
} from "@/services/evaluation";
import { dedupeBy, num, txt } from "@/common/utils/data-helpers";
import { rowIndexGetter } from "@/lib/utils";

type AnyRow = Record<string, unknown>;

const SEARCH_ONLY_TOOLBAR = {
  search: true,
  searchPlaceholder: "Search evaluators...",
  columnPicker: false,
  exportPdf: false,
  exportExcel: false,
  columnFilters: false,
} as const;

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
      <input
        type="checkbox"
        className="h-4 w-4"
        checked={selectedIds.includes(id)}
        onChange={(e) => onToggle(id, e.target.checked)}
        aria-label={`Select ${txt(row.evaluator_name)}`}
      />
    );
  };
}

function mappedStatusRenderer(p: ICellRendererParams<AnyRow>) {
  const row = p.data;
  if (!row) return null;
  const active = num(row.is_active) === 1 || row.is_active === true;
  return (
    <StatusBadge
      status={active ? "active" : "inactive"}
      label={active ? "Active" : "InActive"}
    />
  );
}

export default function ModeratorEvaluatorsPage() {
  const [loading, setLoading] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [baseRows, setBaseRows] = useState<AnyRow[]>([]);
  const [restRows, setRestRows] = useState<AnyRow[]>([]);
  const [subjectRows, setSubjectRows] = useState<AnyRow[]>([]);
  const [moderatorRows, setModeratorRows] = useState<AnyRow[]>([]);
  const [availableRows, setAvailableRows] = useState<AnyRow[]>([]);
  const [mappedRows, setMappedRows] = useState<AnyRow[]>([]);

  const [selectedEvaluatorIds, setSelectedEvaluatorIds] = useState<number[]>(
    [],
  );
  const [checkAll, setCheckAll] = useState(false);

  const [courseId, setCourseId] = useState<number | null>(null);
  const [academicYearId, setAcademicYearId] = useState<number | null>(null);
  const [examId, setExamId] = useState<number | null>(null);
  const [courseYearId, setCourseYearId] = useState<number | null>(null);
  const [regulationId, setRegulationId] = useState<number | null>(null);
  const [subjectId, setSubjectId] = useState<number | null>(null);
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
  const academicYears = useMemo(
    () =>
      dedupeBy(
        baseRows.filter((r) => num(r.fk_course_id) === num(courseId)),
        (r) => num(r.fk_academic_year_id),
      ),
    [baseRows, courseId],
  );
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
  const moderators = useMemo(() => moderatorRows, [moderatorRows]);
  const examOptions = useMemo<SelectOption[]>(
    () =>
      exams.map((r) => ({
        value: String(num(r.fk_exam_id)),
        label: txt(r.exam_name),
      })),
    [exams],
  );
  const subjectOptions = useMemo<SelectOption[]>(
    () =>
      subjects.map((r) => ({
        value: String(num(r.fk_subject_id)),
        label: `${txt(r.subject_name)} - ${txt(r.subject_code)} (${txt(r.regulation_code)})`,
      })),
    [subjects],
  );
  const moderatorOptions = useMemo<SelectOption[]>(
    () => [
      { value: "0", label: "All" },
      ...moderators.map((m) => ({
        value: String(num(m.examEvaluatorProfileId)),
        label: txt(m.evaluatorName),
      })),
    ],
    [moderators],
  );

  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const [filters, moderatorsList] = await Promise.all([
          getRegSupBaseFilters(employeeId),
          getModeratorEvaluatorProfiles().catch(() => []),
        ]);
        setBaseRows(filters);
        setModeratorRows(moderatorsList as AnyRow[]);
        setCourseId(num(filters[0]?.fk_course_id) || null);
        if (moderatorsList.length > 0) {
          setExamModeratorId(
            num((moderatorsList[0] as AnyRow).examEvaluatorProfileId),
          );
        }
      } finally {
        setLoading(false);
      }
    }
    void init();
  }, [employeeId]);

  useEffect(
    () => setAcademicYearId(num(academicYears[0]?.fk_academic_year_id) || null),
    [academicYears],
  );
  useEffect(() => setExamId(num(exams[0]?.fk_exam_id) || null), [exams]);
  useEffect(
    () => setRegulationId(num(regulations[0]?.fk_regulation_id) || null),
    [regulations],
  );

  useEffect(() => {
    async function loadRest() {
      if (!courseId || !academicYearId || !examId) return;
      const rest = await getRegSupRestFilters({
        courseId,
        academicYearId,
        examId,
        employeeId,
      });
      setRestRows(rest);
      setCourseYearId(num(rest[0]?.fk_course_year_id) || null);
    }
    void loadRest();
  }, [courseId, academicYearId, examId, employeeId]);

  useEffect(() => {
    async function loadSubjects() {
      if (
        !courseId ||
        !academicYearId ||
        !examId ||
        !courseYearId ||
        !regulationId
      )
        return;
      const sub = await getRegSupSubjectFilters({
        courseId,
        academicYearId,
        examId,
        courseYearId,
        regulationId,
        employeeId,
      });
      setSubjectRows(sub);
      setSubjectId(num(sub[0]?.fk_subject_id) || null);
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

  function resetLists() {
    setShowPanel(false);
    setAvailableRows([]);
    setMappedRows([]);
    setSelectedEvaluatorIds([]);
    setCheckAll(false);
  }

  async function getList() {
    if (
      !courseId ||
      !academicYearId ||
      !examId ||
      !courseYearId ||
      !regulationId ||
      !subjectId
    )
      return;
    setLoading(true);
    setErrorMsg("");
    resetLists();
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
      setShowPanel(true);
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
    setCheckAll(checked);
    setSelectedEvaluatorIds(
      checked
        ? availableRows
            .map((r) => num(r.pk_exam_evaluator_profile_id))
            .filter((id) => id > 0)
        : [],
    );
  }

  async function assign() {
    if (!examId || !subjectId || selectedEvaluatorIds.length === 0) return;
    if (!examModeratorId) {
      setErrorMsg(
        "Please select a specific Moderator Name instead of All before assigning.",
      );
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
      await getList();
    } catch (error) {
      setErrorMsg(
        error instanceof Error ? error.message : "Failed to assign evaluators.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (selectedEvaluatorIds.length !== availableRows.length)
      setCheckAll(false);
  }, [selectedEvaluatorIds, availableRows.length]);

  const availableColumnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      {
        headerName: "",
        width: 56,
        flex: 0,
        sortable: false,
        cellRenderer: makeCheckRenderer(selectedEvaluatorIds, toggleOne),
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
    [selectedEvaluatorIds],
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
          value={courseId ? String(courseId) : null}
          onChange={(v) => {
            setCourseId(num(v) || null);
            resetLists();
          }}
          options={courseOptions}
          placeholder="Course"
        />
      </GlobalFilterField>
      <GlobalFilterField label="Academic Year">
        <Select
          value={academicYearId ? String(academicYearId) : null}
          onChange={(v) => {
            setAcademicYearId(num(v) || null);
            resetLists();
          }}
          options={academicYearOptions}
          placeholder="Academic Year"
        />
      </GlobalFilterField>
      <GlobalFilterField label="Exam">
        <Select
          value={examId ? String(examId) : null}
          onChange={(v) => {
            setExamId(num(v) || null);
            resetLists();
          }}
          options={examOptions}
          placeholder="Exam"
          searchable
        />
      </GlobalFilterField>
      <GlobalFilterField label="Course Year">
        <Select
          value={courseYearId ? String(courseYearId) : null}
          onChange={(v) => {
            setCourseYearId(num(v) || null);
            resetLists();
          }}
          options={courseYearOptions}
          placeholder="Course Year"
        />
      </GlobalFilterField>
      <GlobalFilterField label="Regulation">
        <Select
          value={regulationId ? String(regulationId) : null}
          onChange={(v) => {
            setRegulationId(num(v) || null);
            resetLists();
          }}
          options={regulationOptions}
          placeholder="Regulation"
        />
      </GlobalFilterField>
      <GlobalFilterField label="Subject">
        <Select
          value={subjectId ? String(subjectId) : null}
          onChange={(v) => {
            setSubjectId(num(v) || null);
            resetLists();
          }}
          options={subjectOptions}
          placeholder="Subject"
          searchable
        />
      </GlobalFilterField>
      <GlobalFilterField label="Moderator">
        <Select
          value={String(examModeratorId)}
          onChange={(v) => {
            setExamModeratorId(num(v));
            resetLists();
          }}
          options={moderatorOptions}
          placeholder="Moderator"
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
  );

  return (
    <FilteredListPage
      title="Moderator Evaluator"
      filters={filters}
      rowData={showPanel ? availableRows : []}
      columnDefs={availableColumnDefs}
      loading={loading}
      pagination
      toolbar={SEARCH_ONLY_TOOLBAR}
      toolbarLeading={
        showPanel ? (
          <label className="inline-flex items-center gap-2 text-xs font-medium">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={checkAll}
              onChange={(e) => toggleAll(e.target.checked)}
              disabled={availableRows.length === 0}
            />
            All
          </label>
        ) : null
      }
      toolbarTrailing={
        showPanel && availableRows.length > 0 ? (
          <Button
            type="button"
            onClick={() => void assign()}
            disabled={
              loading ||
              selectedEvaluatorIds.length === 0 ||
              examModeratorId === 0
            }
            title={
              examModeratorId === 0
                ? "Select a specific Moderator Name to assign"
                : undefined
            }
          >
            Assign
          </Button>
        ) : null
      }
    >
      {errorMsg ? (
        <div className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">
          {errorMsg}
        </div>
      ) : null}

      {showPanel && mappedRows.length > 0 ? (
        <DataTable
          title="Mapped Evaluator List"
          subtitle=""
          rowData={mappedRows}
          columnDefs={mappedColumnDefs}
          pagination
          toolbar={SEARCH_ONLY_TOOLBAR}
        />
      ) : null}
    </FilteredListPage>
  );
}
