"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FilteredListPage } from "@/components/layout";
import type { ColDef, ColGroupDef } from "ag-grid-community";
import { DataTable } from "@/common/components/table";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/common/components/search";
import { Select, type SelectOption } from "@/common/components/select";
import {
  getEvaluatorAssignmentBundle,
  getRegSupBaseFilters,
  getRegSupRestFilters,
  getRegSupSubjectFilters,
  updateManualEvaluationAssignment,
} from "@/services/evaluation";
import { dedupeBy, num, txt } from "@/common/utils/data-helpers";
import { toastError, toastSuccess } from "@/lib/toast";

type AnyRow = Record<string, any>;

function getAssignmentId(row: AnyRow): number {
  return num(
    row.fk_exam_evaluationassignment_id ??
      row.pk_exam_evaluationassignment_id ??
      row.exam_evaluationassignment_id ??
      row.id,
  );
}

function truthyFlag(value: unknown): boolean {
  return value === true || value === 1 || value === "1";
}

function formatExamDate(value: unknown): string {
  const raw = value != null ? String(value).trim() : "";
  if (!raw) return "";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw.slice(0, 10);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function buildExamSelectOption(e: AnyRow): SelectOption {
  const name = txt(e.exam_name);
  const from = formatExamDate(e.from_date ?? e.fromDate);
  const to = formatExamDate(e.to_date ?? e.toDate);
  const range = from && to ? ` (${from} - ${to})` : "";
  const tags: string[] = [];
  if (truthyFlag(e.is_internal_exam ?? e.isInternalExam)) {
    tags.push("(Internal)");
  }
  if (truthyFlag(e.is_regular_exam ?? e.isRegularExam)) {
    tags.push("(Regular)");
  }
  if (truthyFlag(e.is_supply_exam ?? e.isSupplyExam)) {
    tags.push("(Supple)");
  }
  const label = `${name}${range}${tags.join("")}`;
  return {
    value: String(num(e.fk_exam_id)),
    label,
    title: label,
    labelNode: (
      <span className="block truncate">
        {name}
        {range}
        {tags.map((tag) => (
          <span key={tag} className="font-medium text-[#0014ff]">
            {tag}
          </span>
        ))}
      </span>
    ),
  };
}

function isUnmappedUploaded(row: AnyRow): boolean {
  return Number(row.is_mapped) == 0 && Number(row.is_answerpaper_uploaded) == 1;
}

export default function AssignEvaluatorsManualPage() {
  const [loading, setLoading] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const [baseRows, setBaseRows] = useState<AnyRow[]>([]);
  const [restRows, setRestRows] = useState<AnyRow[]>([]);
  const [subjectRows, setSubjectRows] = useState<AnyRow[]>([]);
  const [evaluatorRows, setEvaluatorRows] = useState<AnyRow[]>([]);
  const [studentRows, setStudentRows] = useState<AnyRow[]>([]);
  const [statsInfo, setStatsInfo] = useState<AnyRow | null>(null);

  const [selectedEvaluatorProfileId, setSelectedEvaluatorProfileId] = useState<
    number | null
  >(null);
  const [selectedOmrs, setSelectedOmrs] = useState<string[]>([]);
  const [searchEvaluator, setSearchEvaluator] = useState("");
  const [searchOmr, setSearchOmr] = useState("");

  const [detailTitle, setDetailTitle] = useState("");
  const [detailRows, setDetailRows] = useState<AnyRow[]>([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailSearch, setDetailSearch] = useState("");
  const [isClient, setIsClient] = useState(false);

  const [courseId, setCourseId] = useState<number | null>(null);
  const [academicYearId, setAcademicYearId] = useState<number | null>(null);
  const [examId, setExamId] = useState<number | null>(null);
  const [courseYearId, setCourseYearId] = useState<number | null>(null);
  const [regulationId, setRegulationId] = useState<number | null>(null);
  const [subjectId, setSubjectId] = useState<number | null>(null);

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
    if (!courseId) return [];
    const rows = dedupeBy(
      baseRows.filter((r) => num(r.fk_course_id) === num(courseId)),
      (r) => num(r.fk_academic_year_id),
    );
    return [...rows].sort(
      (a, b) =>
        parseInt(txt(b.academic_year) || "0", 10) -
        parseInt(txt(a.academic_year) || "0", 10),
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
  const regulations = useMemo(() => {
    if (!courseYearId) return [];
    return dedupeBy(
      restRows.filter((r) => num(r.fk_course_year_id) === num(courseYearId)),
      (r) => num(r.fk_regulation_id),
    );
  }, [restRows, courseYearId]);
  const subjects = useMemo(
    () => dedupeBy(subjectRows, (r) => num(r.fk_subject_id)),
    [subjectRows],
  );
  const courseOptions = useMemo(
    () =>
      courses.map((r) => ({
        value: String(num(r.fk_course_id)),
        label: txt(r.course_code),
      })),
    [courses],
  );
  const academicYearOptions = useMemo(
    () =>
      academicYears.map((r) => ({
        value: String(num(r.fk_academic_year_id)),
        label: txt(r.academic_year),
      })),
    [academicYears],
  );
  const examOptions = useMemo(
    () => exams.map((e) => buildExamSelectOption(e)),
    [exams],
  );
  const courseYearOptions = useMemo(
    () =>
      courseYears.map((r) => ({
        value: String(num(r.fk_course_year_id)),
        label: txt(r.course_year_code),
      })),
    [courseYears],
  );
  const regulationOptions = useMemo(
    () =>
      regulations.map((r) => ({
        value: String(num(r.fk_regulation_id)),
        label: txt(r.regulation_code),
      })),
    [regulations],
  );
  const subjectOptions = useMemo(
    () =>
      subjects.map((r) => ({
        value: String(num(r.fk_subject_id)),
        label: `${txt(r.subject_name)} - ${txt(r.subject_code)} (${txt(r.regulation_code)})`,
      })),
    [subjects],
  );

  const filteredEvaluators = useMemo(() => {
    const q = searchEvaluator.trim().toLowerCase();
    if (!q) return evaluatorRows;
    return evaluatorRows.filter((r) =>
      txt(r.evaluator_name).toLowerCase().includes(q),
    );
  }, [evaluatorRows, searchEvaluator]);

  const unMappedUploadedStudents = useMemo(
    () => studentRows.filter(isUnmappedUploaded),
    [studentRows],
  );

  const filteredStudents = useMemo(() => {
    const q = searchOmr.trim().toLowerCase();
    if (!q) return unMappedUploadedStudents;
    return unMappedUploadedStudents.filter((r) =>
      txt(r.omr_serial_no).toLowerCase().includes(q),
    );
  }, [unMappedUploadedStudents, searchOmr]);

  const selectedRows = useMemo(
    () =>
      unMappedUploadedStudents.filter((r) =>
        selectedOmrs.includes(txt(r.omr_serial_no)),
      ),
    [unMappedUploadedStudents, selectedOmrs],
  );

  const allChecked = useMemo(() => {
    return (
      filteredStudents.length > 0 &&
      filteredStudents.every((r) => selectedOmrs.includes(txt(r.omr_serial_no)))
    );
  }, [filteredStudents, selectedOmrs]);

  function toggleAll(checked: boolean) {
    const omrs = filteredStudents
      .map((r) => txt(r.omr_serial_no))
      .filter(Boolean);
    setSelectedOmrs((prev) => {
      if (checked) {
        return [...new Set([...prev, ...omrs])];
      } else {
        return prev.filter((x) => !omrs.includes(x));
      }
    });
  }

  function toggleStudent(omr: string, checked: boolean) {
    setSelectedOmrs((prev) =>
      checked ? [...new Set([...prev, omr])] : prev.filter((x) => x !== omr),
    );
  }

  const restReqSeq = useRef(0);
  const subjectReqSeq = useRef(0);

  function resetPanelState() {
    setShowPanel(false);
    setSelectedEvaluatorProfileId(null);
    setSelectedOmrs([]);
    setEvaluatorRows([]);
    setStudentRows([]);
    setStatsInfo(null);
    setSearchEvaluator("");
    setSearchOmr("");
  }

  function clearBelowCourse() {
    setAcademicYearId(null);
    setExamId(null);
    setCourseYearId(null);
    setRegulationId(null);
    setSubjectId(null);
    setRestRows([]);
    setSubjectRows([]);
  }

  function clearBelowAcademicYear() {
    setExamId(null);
    setCourseYearId(null);
    setRegulationId(null);
    setSubjectId(null);
    setRestRows([]);
    setSubjectRows([]);
  }

  function clearBelowExam() {
    setCourseYearId(null);
    setRegulationId(null);
    setSubjectId(null);
    setRestRows([]);
    setSubjectRows([]);
  }

  function clearBelowCourseYear() {
    setRegulationId(null);
    setSubjectId(null);
    setSubjectRows([]);
  }

  function clearBelowRegulation() {
    setSubjectId(null);
    setSubjectRows([]);
  }

  type CascadeCtx = {
    courseId: number;
    academicYearId: number;
    examId: number;
    courseYearId: number;
  };

  function applyCourse(
    nextCourseId: number | null,
    fromBase: AnyRow[] = baseRows,
  ) {
    resetPanelState();
    restReqSeq.current += 1;
    subjectReqSeq.current += 1;
    setCourseId(nextCourseId);
    clearBelowCourse();
    if (!nextCourseId) return;
    const ayRows = dedupeBy(
      fromBase.filter((r) => num(r.fk_course_id) === nextCourseId),
      (r) => num(r.fk_academic_year_id),
    );
    const sorted = [...ayRows].sort(
      (a, b) =>
        parseInt(txt(b.academic_year) || "0", 10) -
        parseInt(txt(a.academic_year) || "0", 10),
    );
    const firstAy = num(sorted[0]?.fk_academic_year_id) || null;
    if (firstAy) applyAcademicYear(firstAy, nextCourseId, fromBase);
  }

  function applyAcademicYear(
    nextAyId: number | null,
    forCourseId = courseId,
    fromBase: AnyRow[] = baseRows,
  ) {
    resetPanelState();
    restReqSeq.current += 1;
    subjectReqSeq.current += 1;
    setAcademicYearId(nextAyId);
    clearBelowAcademicYear();
    if (!nextAyId || !forCourseId) return;
    const examRows = dedupeBy(
      fromBase.filter(
        (r) =>
          num(r.fk_course_id) === num(forCourseId) &&
          num(r.fk_academic_year_id) === nextAyId,
      ),
      (r) => num(r.fk_exam_id),
    );
    const firstExam = num(examRows[0]?.fk_exam_id) || null;
    if (firstExam) applyExam(firstExam, forCourseId, nextAyId);
  }

  function applyExam(
    nextExamId: number | null,
    forCourseId = courseId,
    forAyId = academicYearId,
  ) {
    resetPanelState();
    subjectReqSeq.current += 1;
    setExamId(nextExamId);
    clearBelowExam();
    if (!nextExamId || !forCourseId || !forAyId) return;
    const seq = ++restReqSeq.current;
    void (async () => {
      const rows = await getRegSupRestFilters({
        courseId: forCourseId,
        academicYearId: forAyId,
        examId: nextExamId,
        employeeId,
      }).catch(() => [] as AnyRow[]);
      if (seq !== restReqSeq.current) return;
      setRestRows(rows);
      const years = dedupeBy(rows, (r) => num(r.fk_course_year_id));
      const firstYear = num(years[0]?.fk_course_year_id) || null;
      if (firstYear) {
        applyCourseYear(firstYear, rows, {
          courseId: forCourseId,
          academicYearId: forAyId,
          examId: nextExamId,
          courseYearId: firstYear,
        });
      }
    })();
  }

  function applyCourseYear(
    nextYearId: number | null,
    fromRest: AnyRow[] = restRows,
    ctx?: Partial<CascadeCtx>,
  ) {
    resetPanelState();
    subjectReqSeq.current += 1;
    setCourseYearId(nextYearId);
    clearBelowCourseYear();
    if (!nextYearId) return;
    const regs = dedupeBy(
      fromRest.filter((r) => num(r.fk_course_year_id) === nextYearId),
      (r) => num(r.fk_regulation_id),
    );
    const firstReg = num(regs[0]?.fk_regulation_id) || null;
    if (!firstReg) return;
    applyRegulation(firstReg, {
      courseId: num(ctx?.courseId ?? courseId),
      academicYearId: num(ctx?.academicYearId ?? academicYearId),
      examId: num(ctx?.examId ?? examId),
      courseYearId: nextYearId,
    });
  }

  function applyRegulation(
    nextRegId: number | null,
    ctx?: Partial<CascadeCtx>,
  ) {
    resetPanelState();
    setRegulationId(nextRegId);
    clearBelowRegulation();
    const cId = num(ctx?.courseId ?? courseId);
    const ayId = num(ctx?.academicYearId ?? academicYearId);
    const eId = num(ctx?.examId ?? examId);
    const yId = num(ctx?.courseYearId ?? courseYearId);
    if (!nextRegId || !cId || !ayId || !eId || !yId) return;
    const seq = ++subjectReqSeq.current;
    void (async () => {
      const rows = await getRegSupSubjectFilters({
        courseId: cId,
        academicYearId: ayId,
        examId: eId,
        courseYearId: yId,
        regulationId: nextRegId,
        employeeId,
      }).catch(() => [] as AnyRow[]);
      if (seq !== subjectReqSeq.current) return;
      setSubjectRows(rows);
      // Angular selectedRegulation: loads subjects but leaves subjectId empty.
    })();
  }

  function applySubject(nextSubjectId: number | null) {
    resetPanelState();
    setSubjectId(nextSubjectId);
  }

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const list = await getRegSupBaseFilters(employeeId);
        const rows = Array.isArray(list) ? list : [];
        setBaseRows(rows);
        const firstCourse = num(rows[0]?.fk_course_id) || null;
        if (firstCourse) applyCourse(firstCourse, rows);
      } finally {
        setLoading(false);
      }
    }
    void init();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Angular getFiltersList() once on mount
  }, [employeeId]);

  async function getEvaluationList() {
    if (
      !courseId ||
      !academicYearId ||
      !examId ||
      !courseYearId ||
      !regulationId ||
      !subjectId
    ) {
      toastError("Please select all filters.");
      return;
    }
    setLoading(true);
    setSelectedEvaluatorProfileId(null);
    setSelectedOmrs([]);
    try {
      const { evaluators, students, stats } =
        await getEvaluatorAssignmentBundle({
          organizationId: organizationId || 1,
          examId,
          courseYearId,
          subjectId,
          regulationId,
          courseId,
          academicYearId,
          employeeId,
        });
      setEvaluatorRows(evaluators);
      setStudentRows(students);
      setStatsInfo(stats ?? null);
      setShowPanel(true);
    } catch (err) {
      toastError(err, "Failed to load manual assign evaluator data.");
    } finally {
      setLoading(false);
    }
  }

  async function assign() {
    if (!selectedEvaluatorProfileId || selectedOmrs.length === 0) return;
    const selectedEvaluator = evaluatorRows.find(
      (r) => num(r.pk_exam_evaluator_profile_id) === selectedEvaluatorProfileId,
    );
    const timetableDetIds = txt(selectedEvaluator?.pk_exam_timetable_det_ids);

    const assignmentIds = selectedRows
      .map((r) => getAssignmentId(r))
      .filter((id) => id > 0)
      .join(",");

    setLoading(true);
    try {
      await updateManualEvaluationAssignment({
        profileId: selectedEvaluatorProfileId,
        examEvaluationAssignmentIdsCsv: assignmentIds,
        timetableDetIds,
        examId: examId || 0,
        subjectId: subjectId || 0,
        courseYearId: courseYearId || 0,
      });
      toastSuccess("Answer papers assigned successfully.");
      await getEvaluationList();
    } catch (err) {
      toastError(err, "Failed to assign answer papers");
    } finally {
      setLoading(false);
    }
  }

  function openEvaluatorDetail(
    row: AnyRow,
    mode: "assigned" | "evaluated" | "due",
  ) {
    const profileId = num(row.pk_exam_evaluator_profile_id);
    let list = studentRows.filter(
      (x) => num(x.fk_exam_evaluator_profile_id) === profileId,
    );
    if (mode === "evaluated")
      list = list.filter(
        (x) => x.evaluated_totalmarks != null || x.evaluatedTotalMarks != null,
      );
    if (mode === "due")
      list = list.filter(
        (x) => x.evaluated_totalmarks == null && x.evaluatedTotalMarks == null,
      );
    setDetailTitle("Student Answer Sheets List");
    setDetailRows(list);
    setDetailSearch("");
    setDetailOpen(true);
  }

  const totalStudents = num(statsInfo?.totalStudents) || studentRows.length;
  const uploadedCount =
    statsInfo?.NoOfAnswerpapersUploaded != null
      ? num(statsInfo.NoOfAnswerpapersUploaded)
      : studentRows.filter((r) => num(r.is_answerpaper_uploaded) === 1).length;
  const unAssigned =
    statsInfo?.UnAssinged != null
      ? num(statsInfo.UnAssinged)
      : unMappedUploadedStudents.length;
  const assigned =
    statsInfo?.NoOfAnswerpapersUploaded != null && statsInfo?.UnAssinged != null
      ? Math.max(
          num(statsInfo.NoOfAnswerpapersUploaded) - num(statsInfo.UnAssinged),
          0,
        )
      : Math.max(uploadedCount - unAssigned, 0);

  const filteredDetailRows = useMemo(() => {
    const q = detailSearch.trim().toLowerCase();
    if (!q) return detailRows;
    return detailRows.filter((r) => {
      const omr = txt(r.omr_serial_no ?? r.omrSerialNo).toLowerCase();
      const marks = txt(
        r.evaluated_totalmarks ?? r.evaluatedTotalMarks,
      ).toLowerCase();
      return `${omr} ${marks}`.includes(q);
    });
  }, [detailRows, detailSearch]);

  const cols = useMemo<(ColDef<AnyRow> | ColGroupDef<AnyRow>)[]>(
    () => [
      {
        headerName: "Sl.No",
        valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1,
        width: 70,
        flex: 0,
      },
      {
        field: "evaluator_name",
        headerName: "Evaluator Name",
        minWidth: 200,
        flex: 1,
      },
      {
        field: "email",
        headerName: "Evaluator Email",
        minWidth: 220,
        flex: 1,
      },
      {
        field: "no_of_students_assigned",
        headerName: "Assigned Answer Sheets",
        minWidth: 160,
        cellRenderer: (p: any) => {
          const val = num(p.data?.no_of_students_assigned);
          return (
            <span
              className="text-blue-700 cursor-pointer hover:underline"
              onClick={() => openEvaluatorDetail(p.data, "assigned")}
            >
              {val}
            </span>
          );
        },
      },
      {
        field: "no_of_evaluations_completed",
        headerName: "Evaluated Answer Sheets",
        minWidth: 160,
        cellRenderer: (p: any) => {
          const val = num(p.data?.no_of_evaluations_completed);
          return (
            <span
              className="text-blue-700 cursor-pointer hover:underline"
              onClick={() => openEvaluatorDetail(p.data, "evaluated")}
            >
              {val}
            </span>
          );
        },
      },
      {
        headerName: "Due Answer Sheets",
        minWidth: 160,
        cellRenderer: (p: any) => {
          const assignedVal = num(p.data?.no_of_students_assigned);
          const completed = num(p.data?.no_of_evaluations_completed);
          const val = Math.max(assignedVal - completed, 0);
          return (
            <span
              className="text-blue-700 cursor-pointer hover:underline"
              onClick={() => openEvaluatorDetail(p.data, "due")}
            >
              {val}
            </span>
          );
        },
      },
    ],
    [],
  );

  return (
    <FilteredListPage
      title="Manual Assign Evaluator"
      filtersCollapsible={false}
      filters={
        <div className="inv-allot-report-filters space-y-2">
          <div className="inv-allot-report-filters__row">
            <div className="inv-allot-report-filters__fx20">
              <Label className="text-[12px] font-semibold text-slate-700">
                Course *
              </Label>
              <Select
                value={courseId ? String(courseId) : null}
                onChange={(v) => applyCourse(v ? Number(v) : null)}
                options={courseOptions}
                placeholder="Course"
              />
            </div>
            <div className="inv-allot-report-filters__fx20">
              <Label className="text-[12px] font-semibold text-slate-700">
                Academic Year *
              </Label>
              <Select
                value={academicYearId ? String(academicYearId) : null}
                onChange={(v) => applyAcademicYear(v ? Number(v) : null)}
                options={academicYearOptions}
                placeholder="Academic Year"
                disabled={!courseId}
              />
            </div>
            <div className="inv-allot-report-filters__fx60">
              <Label className="text-[12px] font-semibold text-slate-700">
                Exam *
              </Label>
              <Select
                value={examId ? String(examId) : null}
                onChange={(v) => applyExam(v ? Number(v) : null)}
                options={examOptions}
                placeholder="Exam"
                searchable
                disabled={!academicYearId}
              />
            </div>
          </div>
          <div className="inv-allot-report-filters__row">
            <div className="inv-allot-report-filters__fx15">
              <Label className="text-[12px] font-semibold text-slate-700">
                Course Year *
              </Label>
              <Select
                value={courseYearId ? String(courseYearId) : null}
                onChange={(v) =>
                  applyCourseYear(v ? Number(v) : null, restRows, {
                    courseId: num(courseId),
                    academicYearId: num(academicYearId),
                    examId: num(examId),
                  })
                }
                options={courseYearOptions}
                placeholder="Course Year"
                disabled={!examId}
              />
            </div>
            <div className="inv-allot-report-filters__fx15">
              <Label className="text-[12px] font-semibold text-slate-700">
                Regulation *
              </Label>
              <Select
                value={regulationId ? String(regulationId) : null}
                onChange={(v) =>
                  applyRegulation(v ? Number(v) : null, {
                    courseId: num(courseId),
                    academicYearId: num(academicYearId),
                    examId: num(examId),
                    courseYearId: num(courseYearId),
                  })
                }
                options={regulationOptions}
                placeholder="Regulation"
                disabled={!courseYearId}
              />
            </div>
            <div className="inv-allot-report-filters__fx40">
              <Label className="text-[12px] font-semibold text-slate-700">
                Subject *
              </Label>
              <Select
                value={subjectId ? String(subjectId) : null}
                onChange={(v) => applySubject(v ? Number(v) : null)}
                options={subjectOptions}
                placeholder="Subject"
                searchable
                disabled={!regulationId}
              />
            </div>
            <div className="inv-allot-report-filters__fx15 flex items-end justify-end gap-2 h-9">
              <Button
                type="button"
                onClick={getEvaluationList}
                disabled={loading}
                className="h-8 px-4 text-[12px] text-white w-full"
              >
                Get List
              </Button>
            </div>
          </div>
        </div>
      }
      filtersFooter={
        showPanel && (
          <div className="mt-4 pt-4 border-t p-3 text-[15px] font-bold text-foreground bg-slate-50 border border-slate-200 rounded">
            Total Students :{" "}
            <span className="font-bold text-red-600">{totalStudents}</span> |
            No.Of AnswerPapers Uploaded :{" "}
            <span className="font-bold text-red-600">{uploadedCount}</span> |
            UnAssigned :{" "}
            <span className="font-bold text-red-600">{unAssigned}</span> |
            Assigned :{" "}
            <span className="font-bold text-red-600">{assigned}</span> | No of
            Evaluators :{" "}
            <span className="font-bold text-red-600">
              {evaluatorRows.length}
            </span>
          </div>
        )
      }
    >
      {showPanel && (
        <div className="space-y-4 mt-4">
          <div className="app-card p-3 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-3 rounded border p-2">
                <h3 className="text-[14px] font-semibold text-blue-700 mb-2">
                  Evaluators (Completed/Assigned)
                </h3>
                <SearchInput
                  placeholder="Search evaluator…"
                  value={searchEvaluator}
                  onChange={setSearchEvaluator}
                  className="mb-2 w-full max-w-sm"
                />
                <div className="max-h-[320px] overflow-auto space-y-1">
                  {filteredEvaluators.map((row) => {
                    const profId = num(row.pk_exam_evaluator_profile_id);
                    return (
                      <label
                        key={profId || txt(row.evaluator_name)}
                        className="flex items-start gap-2 text-[14px] cursor-pointer"
                      >
                        <input
                          type="radio"
                          name="evaluator"
                          checked={selectedEvaluatorProfileId === profId}
                          onChange={() => setSelectedEvaluatorProfileId(profId)}
                        />
                        <span>
                          {txt(row.evaluator_name)} (
                          {num(row.no_of_evaluations_completed)}/
                          {num(row.no_of_students_assigned)})
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="md:col-span-4 rounded border p-2">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-[13px] font-semibold">Serial No</h3>
                    {filteredStudents.length > 0 && (
                      <label className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={allChecked}
                          onChange={(e) => toggleAll(e.target.checked)}
                          className="h-3.5 w-3.5 accent-[hsl(var(--primary))]"
                        />
                        <span>All</span>
                      </label>
                    )}
                  </div>
                  <span className="text-[12px] text-blue-700 font-semibold">
                    Selected: {selectedOmrs.length}
                  </span>
                </div>
                <Input
                  placeholder="Search OMR…"
                  value={searchOmr}
                  onChange={(e) => setSearchOmr(e.target.value)}
                  className="h-8 text-[12px] mb-2"
                />
                <div className="max-h-[320px] overflow-auto space-y-1">
                  {filteredStudents.map((row) => {
                    const omrStr = txt(row.omr_serial_no);
                    const checked = selectedOmrs.includes(omrStr);
                    return (
                      <label
                        key={omrStr}
                        className="flex items-center gap-2 text-[12px] cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) =>
                            toggleStudent(omrStr, e.target.checked)
                          }
                        />
                        {omrStr}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="md:col-span-4 rounded border p-2">
                <h3 className="text-[13px] font-semibold mb-2">
                  Selected: {selectedOmrs.length}
                </h3>
                <div className="max-h-[320px] overflow-auto space-y-1 text-[12px]">
                  {selectedRows.map((row, i) => (
                    <div
                      key={`${txt(row.omr_serial_no)}-${i}`}
                      className="text-blue-700"
                    >
                      {txt(row.omr_serial_no) || "-"}
                    </div>
                  ))}
                </div>
              </div>
              <div className="md:col-span-1 flex items-end justify-end">
                <Button
                  type="button"
                  onClick={assign}
                  disabled={
                    loading ||
                    !selectedEvaluatorProfileId ||
                    selectedOmrs.length === 0
                  }
                  className="h-8 px-4 text-[12px] text-white"
                >
                  Assign
                </Button>
              </div>
            </div>
          </div>

          <div className="app-card p-3 space-y-2">
            <DataTable
              title=""
              rowData={evaluatorRows}
              columnDefs={cols}
              pagination
              paginationPageSize={25}
              toolbar={{
                search: true,
                searchPlaceholder: "Search…",
                exportPdf: false,
                exportExcel: false,
              }}
            />
          </div>
        </div>
      )}

      {detailOpen &&
        isClient &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-2xl bg-white rounded-lg shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
              <div className="px-4 py-3 bg-slate-100 border-b flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800">
                  {detailTitle}
                </h3>
                <button
                  onClick={() => setDetailOpen(false)}
                  className="text-slate-500 hover:text-slate-700 text-lg font-bold"
                >
                  &times;
                </button>
              </div>
              <div className="p-3 border-b">
                <SearchInput
                  placeholder="Search OMR or Marks…"
                  value={detailSearch}
                  onChange={setDetailSearch}
                  className="w-full max-w-sm text-xs"
                />
              </div>
              <div className="p-4 overflow-auto flex-1">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b">
                      <th className="p-2 font-semibold text-slate-600">
                        Sl.No
                      </th>
                      <th className="p-2 font-semibold text-slate-600">
                        Barcode / OMR
                      </th>
                      <th className="p-2 font-semibold text-slate-600 text-right">
                        Evaluated Marks
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDetailRows.map((r, i) => (
                      <tr key={i} className="border-b hover:bg-slate-50">
                        <td className="p-2">{i + 1}</td>
                        <td className="p-2">
                          {txt(r.omr_serial_no ?? r.omrSerialNo) || "-"}
                        </td>
                        <td className="p-2 text-right font-medium text-slate-700">
                          {txt(
                            r.evaluated_totalmarks ?? r.evaluatedTotalMarks,
                          ) || "-"}
                        </td>
                      </tr>
                    ))}
                    {filteredDetailRows.length === 0 && (
                      <tr>
                        <td
                          colSpan={3}
                          className="p-4 text-center text-slate-500"
                        >
                          No records found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-2 bg-slate-50 border-t flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDetailOpen(false)}
                  className="h-8 text-xs"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </FilteredListPage>
  );
}
