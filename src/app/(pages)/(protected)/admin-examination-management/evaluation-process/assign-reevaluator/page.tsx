"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { FilteredListPage } from "@/components/layout";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select as SearchableSelect } from "@/common/components/select";
import type { SelectOption } from "@/common/components/select";
import { SearchInput } from "@/common/components/search";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import {
  DataTableFooter,
  type DataTablePageSize,
} from "@/common/components/table";
import { dedupeBy, num, txt } from "@/common/utils/data-helpers";
import { toastError } from "@/lib/toast";
import {
  addMultipleEvaluationAssignments,
  getReEvaluatorDetailList,
  getReEvaluatorMasterList,
  getRegSupBaseFilters,
  getRegSupRestFilters,
  getRegSupSubjectFilters,
  updateReevaluationCount,
} from "@/services/evaluation";

type AnyRow = Record<string, unknown>;

const SEARCH_ONLY_TOOLBAR = {
  search: true,
  searchPlaceholder: "Search subjects...",
  columnPicker: false,
  exportPdf: false,
  exportExcel: false,
  columnFilters: false,
} as const;

function evaluatorById(rows: AnyRow[], id: number): AnyRow | undefined {
  return rows.find((row) => num(row.pk_exam_evaluator_profile_id) === id);
}

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

export default function AssignReEvaluatorPage() {
  const [loading, setLoading] = useState(false);
  const [isReevaluation, setIsReevaluation] = useState(false);

  const [baseRows, setBaseRows] = useState<AnyRow[]>([]);
  const [restRows, setRestRows] = useState<AnyRow[]>([]);
  const [subjectRows, setSubjectRows] = useState<AnyRow[]>([]);

  const [courseId, setCourseId] = useState<number | null>(null);
  const [academicYearId, setAcademicYearId] = useState<number | null>(null);
  const [examId, setExamId] = useState<number | null>(null);
  const [courseYearId, setCourseYearId] = useState<number | null>(null);
  const [regulationId, setRegulationId] = useState<number | null>(null);
  const [subjectId, setSubjectId] = useState<number | null>(null);

  const [subjectMasterRows, setSubjectMasterRows] = useState<AnyRow[]>([]);
  const [unmappedRows, setUnmappedRows] = useState<AnyRow[]>([]);
  const [mappedRows, setMappedRows] = useState<AnyRow[]>([]);
  const [evaluatorRows, setEvaluatorRows] = useState<AnyRow[]>([]);
  const [bulkEvaluatorId, setBulkEvaluatorId] = useState<number | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [showSelected, setShowSelected] = useState(false);
  const [detailSearch, setDetailSearch] = useState("");
  const [detailPage, setDetailPage] = useState(0);
  const [detailPageSize, setDetailPageSize] = useState<DataTablePageSize>(25);

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
  const academicYears = useMemo(() => {
    // Angular selectedCourse: sort academic years DESC by academic_year
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
      subjects.map((r) => ({
        value: String(num(r.fk_subject_id)),
        label: `${txt(r.subject_name)} - ${txt(r.subject_code)} (${txt(r.regulation_code)})`,
      })),
    [subjects],
  );
  const evaluatorOptions = useMemo<SelectOption[]>(
    () =>
      evaluatorRows.map((r) => ({
        value: String(num(r.pk_exam_evaluator_profile_id)),
        label: txt(r.evaluator_name),
      })),
    [evaluatorRows],
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

  // Angular selectedCourse → auto first AY (already DESC-sorted)
  useEffect(() => {
    setAcademicYearId(num(academicYears[0]?.fk_academic_year_id) || null);
  }, [academicYears]);

  // Angular selectedAcadamicYear → auto first exam
  useEffect(() => {
    setExamId(num(exams[0]?.fk_exam_id) || null);
  }, [exams]);

  // Angular selectedExam: s_get_exam_filters_bycode + univ_exam_rest_in_regexamstd
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

  // Angular selectedCourseYear → filter regulations client-side, auto first
  useEffect(() => {
    setRegulationId(num(regulations[0]?.fk_regulation_id) || null);
  }, [regulations]);

  // Angular selectedRegulation: univ_exam_subject_regexamstd + NoLAB
  // Subject is NOT auto-selected — user must pick (form required)
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
    setSubjectMasterRows([]);
    setUnmappedRows([]);
    setMappedRows([]);
    setEvaluatorRows([]);
    setBulkEvaluatorId(null);
    setSelectedKeys([]);
    setShowSelected(false);
    setDetailSearch("");
    setDetailPage(0);
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
    // Angular: form requires subjectId before Get List (Validators.required)
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
    resetResult();
    setLoading(true);
    try {
      const rows = await getReEvaluatorMasterList({
        organizationId: organizationId || 1,
        examId,
        courseYearId,
        subjectId,
        regulationId,
        courseId,
        academicYearId,
        employeeId,
        isReevaluation,
      });
      setSubjectMasterRows(rows);
    } catch {
      toastError("Failed to load re-evaluator master list");
    } finally {
      setLoading(false);
    }
  }

  function buildRowKey(row: AnyRow): string {
    return `${txt(row.omr_serial_no)}::${num(row.fk_exam_evaluator_profile_id)}`;
  }

  function availableEvaluators(
    allEvaluators: AnyRow[],
    historyProfileIds: number[],
    currentProfileId: number,
  ): AnyRow[] {
    return allEvaluators.filter((row) => {
      const evaluatorId = num(row.pk_exam_evaluator_profile_id);
      if (evaluatorId === currentProfileId) return false;
      return !historyProfileIds.includes(evaluatorId);
    });
  }

  async function getDetails(row: AnyRow) {
    setLoading(true);
    try {
      const details = await getReEvaluatorDetailList({
        organizationId: organizationId || 1,
        examId: num(row.fk_exam_id),
        courseYearId: num(row.fk_course_year_id),
        subjectId: num(row.fk_subject_id),
        regulationId: num(row.fk_regulation_id),
        courseId: num(row.fk_course_id),
        academicYearId: num(academicYearId),
        employeeId,
        isReevaluation,
      });

      const evaluationValidator = dedupeBy(details.evaluationValidator, (r) =>
        txt(r.omr_serial_no),
      );
      const mapped = evaluationValidator.filter((r) => num(r.is_mapped) === 1);
      const rawUnmapped = evaluationValidator.filter(
        (r) => num(r.is_mapped) === 0,
      );
      const uniqueEvaluators = dedupeBy(details.evaluatorList, (r) =>
        num(r.pk_exam_evaluator_profile_id),
      );

      const preparedUnmapped = rawUnmapped.map((item) => {
        const sameOmr = details.evaluationValidator.filter(
          (r) => txt(r.omr_serial_no) === txt(item.omr_serial_no),
        );
        const history = sameOmr
          .filter(
            (r) =>
              num(r.fk_exam_evaluator_profile_id) !==
              num(item.fk_exam_evaluator_profile_id),
          )
          .map((r) => ({
            name: txt(r.evaluator_name),
            marks: txt(r.evaluated_totalmarks),
            profileId: num(r.fk_exam_evaluator_profile_id),
          }));
        const available = availableEvaluators(
          uniqueEvaluators,
          history.map((h) => h.profileId),
          num(item.fk_exam_evaluator_profile_id),
        );
        return {
          ...item,
          history,
          availableEvaluators: available,
          assignEvaluatorProfileId: 0,
          assignEvaluatorName: "",
          examEvaluatorProfileDetId: 0,
        };
      });

      setMappedRows(mapped);
      setUnmappedRows(preparedUnmapped);
      setEvaluatorRows(uniqueEvaluators);
      setSelectedKeys([]);
      setShowSelected(false);
      setDetailSearch("");
      setDetailPage(0);
    } finally {
      setLoading(false);
    }
  }

  function onBulkEvaluator(value: string | null) {
    const id = num(value);
    setBulkEvaluatorId(id || null);
    if (!id) return;
    const selected = evaluatorById(evaluatorRows, id);
    setUnmappedRows((prev) =>
      prev.map((row) => {
        return {
          ...row,
          assignEvaluatorProfileId: id,
          assignEvaluatorName: txt(selected?.evaluator_name),
          examEvaluatorProfileDetId: num(
            selected?.pk_examevaluator_profiledet_id,
          ),
        };
      }),
    );
  }

  function onSingleEvaluator(rowKey: string, value: string | null) {
    const id = num(value);
    const selected = evaluatorById(evaluatorRows, id);
    setUnmappedRows((prev) =>
      prev.map((row) => {
        if (buildRowKey(row) !== rowKey) return row;
        return {
          ...row,
          assignEvaluatorProfileId: id,
          assignEvaluatorName: txt(selected?.evaluator_name),
          examEvaluatorProfileDetId: num(
            selected?.pk_examevaluator_profiledet_id,
          ),
        };
      }),
    );
  }

  function toggleRow(rowKey: string, checked: boolean) {
    setShowSelected(false);
    setSelectedKeys((prev) =>
      checked
        ? [...new Set([...prev, rowKey])]
        : prev.filter((k) => k !== rowKey),
    );
  }

  const filteredUnmappedRows = useMemo(() => {
    const q = detailSearch.trim().toLowerCase();
    if (!q) return unmappedRows;
    return unmappedRows.filter((row) => {
      const omr = txt(row.omr_serial_no).toLowerCase();
      const evaluator = txt(row.evaluator_name).toLowerCase();
      return omr.includes(q) || evaluator.includes(q);
    });
  }, [unmappedRows, detailSearch]);

  const totalDetailPages = Math.max(
    1,
    Math.ceil(filteredUnmappedRows.length / detailPageSize),
  );

  const pagedUnmappedRows = useMemo(() => {
    const start = detailPage * detailPageSize;
    return filteredUnmappedRows.slice(start, start + detailPageSize);
  }, [filteredUnmappedRows, detailPage, detailPageSize]);

  useEffect(() => {
    setDetailPage(0);
  }, [detailSearch]);

  useEffect(() => {
    if (detailPage > totalDetailPages - 1) {
      setDetailPage(Math.max(0, totalDetailPages - 1));
    }
  }, [detailPage, totalDetailPages]);

  function toggleAll(checked: boolean) {
    setShowSelected(false);
    const visibleKeys = pagedUnmappedRows.map((r) => buildRowKey(r));
    if (!checked) {
      setSelectedKeys((prev) => prev.filter((k) => !visibleKeys.includes(k)));
      return;
    }
    setSelectedKeys((prev) => [...new Set([...prev, ...visibleKeys])]);
  }

  const selectedRows = useMemo(
    () =>
      unmappedRows.filter(
        (r) =>
          selectedKeys.includes(buildRowKey(r)) &&
          num(r.assignEvaluatorProfileId) > 0,
      ),
    [unmappedRows, selectedKeys],
  );

  function removeSelectedRow(row: AnyRow) {
    const key = buildRowKey(row);
    setSelectedKeys((prev) => prev.filter((k) => k !== key));
  }

  async function assignList() {
    if (!examId || !courseYearId || selectedRows.length === 0) {
      // Checked rows without an evaluator chosen are filtered out of
      // selectedRows — surface why the button "did nothing".
      if (selectedKeys.length > 0 && selectedRows.length === 0) {
        toastError(
          "Select an evaluator for the checked rows before assigning.",
        );
      }
      return;
    }
    const payload = selectedRows.map((row) => ({
      collegeId: num(row.fk_college_id),
      examEvaluatorProfileDetId: num(row.examEvaluatorProfileDetId),
      questionPaperId: num(row.fk_exam_questionpaper_id),
      examEvaluatorProfileId: num(row.assignEvaluatorProfileId),
      examStdDetId: num(row.fk_exam_std_det_id),
      studentAnswerPaperId: num(row.fk_std_answerpaper_id),
      evaluationStatusCatDetId: 626,
      omrSerialNo: txt(row.omr_serial_no),
      isActive: true,
      isEvaluationValidator: true,
      isRevision: isReevaluation,
    }));

    setLoading(true);
    try {
      await addMultipleEvaluationAssignments(payload);
      if (isReevaluation) {
        await updateReevaluationCount({
          examId,
          subjectId: num(subjectMasterRows[0]?.fk_subject_id) || subjectId || 0,
          courseYearId,
        });
      }
      const baseSubject = subjectMasterRows[0];
      if (baseSubject) await getDetails(baseSubject);
    } finally {
      setLoading(false);
    }
  }

  const allChecked =
    pagedUnmappedRows.length > 0 &&
    pagedUnmappedRows.every((r) => selectedKeys.includes(buildRowKey(r)));

  const masterColumnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      { headerName: "S.No", valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1, width: 70, flex: 0 },
      { headerName: "Course", minWidth: 100, valueGetter: (p) => txt(p.data?.course_code) },
      { headerName: "Exam", minWidth: 110, valueGetter: (p) => txt(p.data?.exam_month_yr) },
      { headerName: "Course Year", minWidth: 110, valueGetter: (p) => txt(p.data?.course_year_code) },
      {
        headerName: "Subject",
        minWidth: 180,
        flex: 1,
        valueGetter: (p) => `${txt(p.data?.subject_code)} - ${txt(p.data?.subject_name)}`,
      },
      { headerName: "Total Papers", minWidth: 110, valueGetter: (p) => num(p.data?.total_papers) },
      { headerName: "Mapped Papers", minWidth: 120, valueGetter: (p) => num(p.data?.mapped_papers) },
      {
        headerName: "Actions",
        minWidth: 120,
        flex: 0,
        cellRenderer: (p: ICellRendererParams<AnyRow>) => (
          <Button type="button" size="sm" onClick={() => p.data && void getDetails(p.data)}>
            Get Details
          </Button>
        ),
      },
    ],
    [],
  );

  return (
    <FilteredListPage
      title="Assign Re-Evaluator"
      filters={(
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
            <GlobalFilterField label="">
              <label className="inline-flex h-[30px] items-center gap-2 text-[12px]">
                <input
                  type="checkbox"
                  checked={isReevaluation}
                  onChange={(e) => {
                    setIsReevaluation(e.target.checked);
                    resetResult();
                  }}
                />
                <span>Is Re-Evaluation</span>
              </label>
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
      )}
      rowData={subjectMasterRows}
      columnDefs={masterColumnDefs}
      loading={loading}
      pagination
      toolbar={SEARCH_ONLY_TOOLBAR}
    >
      {unmappedRows.length > 0 && (
        <div className="app-card p-3 space-y-3">
          <div className="flex items-end justify-between gap-3">
            <div className="w-full max-w-xs">
              <Label>Evaluator (Bulk)</Label>
              <SearchableSelect
                value={bulkEvaluatorId ? String(bulkEvaluatorId) : null}
                onChange={onBulkEvaluator}
                options={evaluatorOptions}
                placeholder="Select evaluator…"
                searchable
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowSelected(true)}
                disabled={selectedRows.length === 0}
              >
                Add
              </Button>
              {showSelected && selectedRows.length > 0 && (
                <Button
                  type="button"
                  onClick={() => void assignList()}
                  disabled={loading}
                >
                  Assign
                </Button>
              )}
            </div>
          </div>
          <div className="w-full max-w-md">
            <SearchInput
              value={detailSearch}
              onChange={setDetailSearch}
              placeholder="Search OMR serial or evaluator…"
              className="w-full"
            />
          </div>
          <div className="overflow-auto rounded border">
            <table className="w-full text-[12px]">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-2 py-1 text-left">
                    <input
                      type="checkbox"
                      checked={allChecked}
                      onChange={(e) => toggleAll(e.target.checked)}
                    />
                  </th>
                  <th className="px-2 py-1 text-left">OMR Serial</th>
                  <th className="px-2 py-1 text-left">Evaluator</th>
                  <th className="px-2 py-1 text-left">Subject Marks</th>
                  <th className="px-2 py-1 text-left">Assign Evaluator</th>
                </tr>
              </thead>
              <tbody>
                {filteredUnmappedRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-2 py-6 text-center text-muted-foreground"
                    >
                      No rows match your search.
                    </td>
                  </tr>
                ) : (
                  pagedUnmappedRows.map((row, i) => {
                  const key = buildRowKey(row);
                  return (
                    <tr
                      key={`unmapped-${key}-${i}`}
                      className="border-t align-top"
                    >
                      <td className="px-2 py-1">
                        <input
                          type="checkbox"
                          checked={selectedKeys.includes(key)}
                          onChange={(e) => toggleRow(key, e.target.checked)}
                        />
                      </td>
                      <td className="px-2 py-1">{txt(row.omr_serial_no)}</td>
                      <td className="px-2 py-1">{txt(row.evaluator_name)}</td>
                      <td className="px-2 py-1">
                        {txt(row.evaluated_totalmarks)}
                      </td>
                      <td className="px-2 py-1 min-w-[220px]">
                        <SearchableSelect
                          value={
                            num(row.assignEvaluatorProfileId)
                              ? String(num(row.assignEvaluatorProfileId))
                              : null
                          }
                          onChange={(v) => onSingleEvaluator(key, v)}
                          options={
                            (
                              row.availableEvaluators as AnyRow[] | undefined
                            )?.map((e) => ({
                              value: String(
                                num(e.pk_exam_evaluator_profile_id),
                              ),
                              label: txt(e.evaluator_name),
                            })) ?? []
                          }
                          placeholder="Select evaluator…"
                          searchable
                        />
                      </td>
                    </tr>
                  );
                  })
                )}
              </tbody>
            </table>
            <DataTableFooter
              totalRows={filteredUnmappedRows.length}
              page={detailPage}
              pageSize={detailPageSize}
              totalPages={totalDetailPages}
              onPageChange={setDetailPage}
              onPageSizeChange={(size) => {
                setDetailPageSize(size);
                setDetailPage(0);
              }}
            />
          </div>
          {showSelected && selectedRows.length > 0 && (
            <div className="overflow-auto rounded border">
              <table className="w-full text-[12px]">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="px-2 py-1 text-left">S.No</th>
                    <th className="px-2 py-1 text-left">OMR</th>
                    <th className="px-2 py-1 text-left">Current Evaluator</th>
                    <th className="px-2 py-1 text-left">Assigned Evaluator</th>
                    <th className="px-2 py-1 text-left w-12"> </th>
                  </tr>
                </thead>
                <tbody>
                  {selectedRows.map((row, i) => (
                    <tr
                      key={`sel-${buildRowKey(row)}-${i}`}
                      className="border-t"
                    >
                      <td className="px-2 py-1">{i + 1}</td>
                      <td className="px-2 py-1">{txt(row.omr_serial_no)}</td>
                      <td className="px-2 py-1">{txt(row.evaluator_name)}</td>
                      <td className="px-2 py-1">
                        {txt(row.assignEvaluatorName)}
                      </td>
                      <td className="px-2 py-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => removeSelectedRow(row)}
                          aria-label="Remove from assignment list"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {mappedRows.length > 0 && (
        <div className="app-card p-3">
          <h3 className="text-[14px] font-semibold text-blue-700 mb-2">
            Assigned List
          </h3>
          <div className="overflow-auto rounded border">
            <table className="w-full text-[12px]">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-2 py-1 text-left">S.No</th>
                  <th className="px-2 py-1 text-left">Evaluator Name</th>
                  <th className="px-2 py-1 text-left">OMR Serial Number</th>
                  <th className="px-2 py-1 text-left">Validator Evaluator</th>
                  <th className="px-2 py-1 text-left">Marks</th>
                </tr>
              </thead>
              <tbody>
                {mappedRows.map((row, i) => (
                  <tr
                    key={`mapped-${i}-${txt(row.omr_serial_no)}`}
                    className="border-t"
                  >
                    <td className="px-2 py-1">{i + 1}</td>
                    <td className="px-2 py-1">{txt(row.evaluator_name)}</td>
                    <td className="px-2 py-1">{txt(row.omr_serial_no)}</td>
                    <td className="px-2 py-1">
                      {txt(row.validator_evaluator_name)}
                    </td>
                    <td className="px-2 py-1">
                      {txt(row.validator_evaluated_totalmarks)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </FilteredListPage>
  );
}
