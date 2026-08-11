"use client";

import { useEffect, useMemo, useState } from "react";
import { FilteredListPage } from "@/components/layout";
import type { ColDef, ColGroupDef } from "ag-grid-community";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select } from "@/common/components/select";
import {
  assignEvaluatorProfiles,
  getEvaluatorAssignmentBundle,
  getRegSupBaseFilters,
  getRegSupRestFilters,
  getRegSupSubjectFilters,
  runPopStudentAssignment,
} from "@/services/evaluation";
import { dedupeBy, num, txt } from "@/common/utils/data-helpers";
import { toastError, toastSuccess } from "@/lib/toast";

type AnyRow = Record<string, any>;

export default function AssignEvaluatorsPage() {
  const [loading, setLoading] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const [runEnabled, setRunEnabled] = useState(false);
  const [search, setSearch] = useState("");

  const [baseRows, setBaseRows] = useState<AnyRow[]>([]);
  const [restRows, setRestRows] = useState<AnyRow[]>([]);
  const [subjectRows, setSubjectRows] = useState<AnyRow[]>([]);
  const [evaluatorRows, setEvaluatorRows] = useState<AnyRow[]>([]);
  const [studentRows, setStudentRows] = useState<AnyRow[]>([]);
  const [statsInfo, setStatsInfo] = useState<AnyRow | null>(null);
  const [selectedProfileIds, setSelectedProfileIds] = useState<number[]>([]);
  const [allChecked, setAllChecked] = useState(false);

  const [detailTitle, setDetailTitle] = useState("");
  const [detailRows, setDetailRows] = useState<AnyRow[]>([]);
  const [detailOpen, setDetailOpen] = useState(false);

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
    () =>
      exams.map((r) => {
        let label = txt(r.exam_name);
        if (r.from_date && r.to_date) {
          const fromDate = new Date(r.from_date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          });
          const toDate = new Date(r.to_date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          });
          label += ` (${fromDate} - ${toDate})`;
        }
        if (num(r.is_internal_exam) === 1 || r.is_internal_exam === true) {
          label += " (Internal)";
        }
        if (num(r.is_regular_exam) === 1 || r.is_regular_exam === true) {
          label += " (Regular)";
        }
        if (num(r.is_supply_exam) === 1 || r.is_supply_exam === true) {
          label += " (Supple)";
        }
        return {
          value: String(num(r.fk_exam_id)),
          label,
        };
      }),
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

  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const list = await getRegSupBaseFilters(employeeId);
        setBaseRows(list);
        setCourseId(num(list[0]?.fk_course_id) || null);
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

  async function getEvaluationList() {
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
      setSelectedProfileIds([]);
      setAllChecked(false);
      setShowPanel(true);
      setRunEnabled(true);
    } finally {
      setLoading(false);
    }
  }

  async function runData() {
    if (!examId || !courseYearId || !subjectId) return;
    const ok = globalThis.confirm(
      "Are you sure you want to run assignment allocation?",
    );
    if (!ok) return;
    setLoading(true);
    try {
      await runPopStudentAssignment({ examId, subjectId, courseYearId });
      toastSuccess("Assignment allocation completed successfully.");
      await getEvaluationList();
    } catch (err) {
      toastError(err, "Failed to run assignment allocation");
    } finally {
      setLoading(false);
    }
  }

  async function assignList() {
    if (
      !examId ||
      !courseYearId ||
      !subjectId ||
      selectedProfileIds.length === 0
    )
      return;
    setLoading(true);
    try {
      await assignEvaluatorProfiles({
        profileIds: selectedProfileIds,
        examId,
        subjectId,
        courseYearId,
      });
      toastSuccess("Evaluators assigned successfully.");
      await getEvaluationList();
    } catch (err) {
      toastError(err, "Failed to assign evaluators");
    } finally {
      setLoading(false);
    }
  }

  function toggleAll(checked: boolean) {
    setAllChecked(checked);
    setSelectedProfileIds(
      checked
        ? evaluatorRows
            .map((r) => num(r.pk_exam_evaluator_profile_id))
            .filter((v) => v > 0)
        : [],
    );
  }

  function toggleRow(id: number, checked: boolean) {
    setSelectedProfileIds((s) =>
      checked ? [...new Set([...s, id])] : s.filter((x) => x !== id),
    );
  }

  function openDetail(row: AnyRow, mode: "assigned" | "evaluated" | "due") {
    const profileId = num(
      row.pk_exam_evaluator_profile_id ??
        row.fk_exam_evaluator_profile_id ??
        row.exam_evaluator_profile_id,
    );
    let list = studentRows.filter((x) => {
      const xProfileId = num(
        x.fk_exam_evaluator_profile_id ??
          x.pk_exam_evaluator_profile_id ??
          x.exam_evaluator_profile_id ??
          x.fk_exam_evaluatorprofile_id,
      );
      return xProfileId === profileId;
    });
    if (mode === "evaluated")
      list = list.filter(
        (x) => x.evaluated_totalmarks != null || x.evaluatedTotalMarks != null,
      );
    if (mode === "due")
      list = list.filter(
        (x) => x.evaluated_totalmarks == null && x.evaluatedTotalMarks == null,
      );
    setDetailRows(list);
    setDetailTitle("Student Answer Sheets List");
    setDetailOpen(true);
  }

  const totalStudentsCount =
    num(statsInfo?.totalStudents) || studentRows.length;
  const evaluationStudentsCount =
    statsInfo?.EvaluationStudents != null
      ? num(statsInfo.EvaluationStudents)
      : totalStudentsCount;
  const uploadedCount =
    statsInfo?.NoOfAnswerpapersUploaded != null
      ? num(statsInfo.NoOfAnswerpapersUploaded)
      : studentRows.filter(
          (r) => num(r.is_answerpaper_uploaded) === 1 || txt(r.omr_serial_no),
        ).length;
  const unAssigned =
    statsInfo?.UnAssinged != null
      ? num(statsInfo.UnAssinged)
      : studentRows.filter((r) => num(r.fk_exam_evaluator_profile_id) === 0)
          .length;
  const noOfAssigned =
    statsInfo?.Assigned != null
      ? num(statsInfo.Assigned)
      : Math.max(uploadedCount - unAssigned, 0);
  const filteredEvaluators = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return evaluatorRows;
    return evaluatorRows.filter((r) =>
      `${txt(r.evaluator_name)} ${txt(r.email)}`.toLowerCase().includes(q),
    );
  }, [evaluatorRows, search]);

  const cols = useMemo<(ColDef<AnyRow> | ColGroupDef<AnyRow>)[]>(
    () => [
      ...(unAssigned > 0
        ? [
            {
              headerName: "All",
              width: 70,
              cellRenderer: (p: any) => {
                const profileId = num(p.data?.pk_exam_evaluator_profile_id);
                return (
                  <input
                    type="checkbox"
                    className="h-3 w-3 accent-[hsl(var(--primary))]"
                    checked={selectedProfileIds.includes(profileId)}
                    onChange={(e) => {
                      toggleRow(profileId, e.target.checked);
                    }}
                  />
                );
              },
              headerComponent: () => (
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    className="h-3 w-3 accent-[hsl(var(--primary))]"
                    checked={allChecked}
                    onChange={(e) => {
                      toggleAll(e.target.checked);
                    }}
                  />
                  <span>All</span>
                </label>
              ),
            },
          ]
        : []),
      {
        headerName: "Sl.No",
        valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1,
        width: 80,
      },
      {
        field: "evaluator_name",
        headerName: "Evaluator Name",
        valueGetter: (p) => txt(p.data?.evaluator_name),
        minWidth: 160,
      },
      {
        field: "email",
        headerName: "Evaluator Email",
        valueGetter: (p) => txt(p.data?.email),
        minWidth: 160,
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
              onClick={() => openDetail(p.data, "assigned")}
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
              onClick={() => openDetail(p.data, "evaluated")}
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
          const assigned = num(p.data?.no_of_students_assigned);
          const completed = num(p.data?.no_of_evaluations_completed);
          const val = Math.max(assigned - completed, 0);
          return (
            <span
              className="text-blue-700 cursor-pointer hover:underline"
              onClick={() => openDetail(p.data, "due")}
            >
              {val}
            </span>
          );
        },
      },
    ],
    [selectedProfileIds, allChecked, unAssigned],
  );

  useEffect(() => {
    if (selectedProfileIds.length !== evaluatorRows.length)
      setAllChecked(false);
  }, [selectedProfileIds, evaluatorRows.length]);

  return (
    <FilteredListPage
      title="Assign Evaluator"
      filtersCollapsible={false}
      filters={
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
          <div className="space-y-1 md:col-span-2">
            <Label className="text-[12px] font-semibold text-slate-700">
              Course *
            </Label>
            <Select
              value={courseId ? String(courseId) : null}
              onChange={(v) => setCourseId(num(v) || null)}
              options={courseOptions}
              placeholder="Course"
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label className="text-[12px] font-semibold text-slate-700">
              Academic Year *
            </Label>
            <Select
              value={academicYearId ? String(academicYearId) : null}
              onChange={(v) => setAcademicYearId(num(v) || null)}
              options={academicYearOptions}
              placeholder="Academic Year"
            />
          </div>
          <div className="space-y-1 md:col-span-8">
            <Label className="text-[12px] font-semibold text-slate-700">
              Exam *
            </Label>
            <Select
              value={examId ? String(examId) : null}
              onChange={(v) => setExamId(num(v) || null)}
              options={examOptions}
              placeholder="Exam"
              searchable
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label className="text-[12px] font-semibold text-slate-700">
              Course Year *
            </Label>
            <Select
              value={courseYearId ? String(courseYearId) : null}
              onChange={(v) => setCourseYearId(num(v) || null)}
              options={courseYearOptions}
              placeholder="Course Year"
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label className="text-[12px] font-semibold text-slate-700">
              Regulation *
            </Label>
            <Select
              value={regulationId ? String(regulationId) : null}
              onChange={(v) => setRegulationId(num(v) || null)}
              options={regulationOptions}
              placeholder="Regulation"
            />
          </div>
          <div className="space-y-1 md:col-span-5">
            <Label className="text-[12px] font-semibold text-slate-700">
              Subject *
            </Label>
            <Select
              value={subjectId ? String(subjectId) : null}
              onChange={(v) => setSubjectId(num(v) || null)}
              options={subjectOptions}
              placeholder="Subject"
              searchable
            />
          </div>
          <div className="md:col-span-3 flex items-end justify-end gap-2 h-9">
            {runEnabled && (
              <Button
                type="button"
                onClick={runData}
                disabled={loading}
                className="h-8 px-4 text-[12px] bg-[#0E7096] hover:bg-[#0E7096]/90 text-white"
              >
                Run
              </Button>
            )}
            <Button
              type="button"
              onClick={getEvaluationList}
              disabled={loading}
              className="h-8 px-4 text-[12px] bg-[#0E7096] hover:bg-[#0E7096]/90 text-white"
            >
              Get List
            </Button>
          </div>
        </div>
      }
      showTable={showPanel}
      rowData={showPanel ? filteredEvaluators : []}
      columnDefs={cols}
      pagination
      loading={loading}
      hideEmptyGrid
      filtersFooter={
        showPanel && (
          <div className="mt-4 pt-4 border-t p-3 text-[12px] font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded">
            Evaluation Students:{" "}
            <span className="text-red-600 font-bold">
              {evaluationStudentsCount}
            </span>{" "}
            | Total Students:{" "}
            <span className="text-red-600 font-bold">{totalStudentsCount}</span>{" "}
            | No.Of AnswerPapers Uploaded:{" "}
            <span className="text-red-600 font-bold">{uploadedCount}</span> |
            UnAssigned:{" "}
            <span className="text-red-600 font-bold">{unAssigned}</span> |
            Assigned:{" "}
            <span className="text-red-600 font-bold">{noOfAssigned}</span> | No
            of Evaluators:{" "}
            <span className="text-red-600 font-bold">
              {evaluatorRows.length}
            </span>{" "}
            | Selected Evaluators:{" "}
            <span className="text-red-600 font-bold">
              {selectedProfileIds.length}
            </span>
          </div>
        )
      }
      toolbar={
        showPanel && evaluatorRows.length > 0
          ? {
              search: true,
              searchPlaceholder: "Search evaluator…",
            }
          : false
      }
      toolbarTrailing={
        showPanel && unAssigned > 0 ? (
          <Button
            type="button"
            onClick={assignList}
            disabled={loading || selectedProfileIds.length === 0}
            size="sm"
          >
            Assign
          </Button>
        ) : undefined
      }
    >
      {detailOpen && (
        <div className="fixed inset-0 z-[120] bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-3xl rounded-lg bg-card border shadow-xl">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <h4 className="text-[14px] font-semibold">{detailTitle}</h4>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-[11px]"
                onClick={() => {
                  setDetailOpen(false);
                  setDetailRows([]);
                }}
              >
                Close
              </Button>
            </div>
            <div className="p-3 max-h-[60vh] overflow-auto">
              <table className="w-full text-[12px]">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="px-2 py-1 text-left">SI.No</th>
                    <th className="px-2 py-1 text-left">OMR Serial No</th>
                    <th className="px-2 py-1 text-left">
                      Evaluated Total Marks
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {detailRows.map((r, i) => (
                    <tr
                      key={`${num(r.fk_exam_evaluationassignment_id)}-${txt(r.omr_serial_no)}-${i}`}
                      className="border-t"
                    >
                      <td className="px-2 py-1">{i + 1}</td>
                      <td className="px-2 py-1">{txt(r.omr_serial_no)}</td>
                      <td className="px-2 py-1">
                        {txt(r.evaluated_totalmarks) || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </FilteredListPage>
  );
}
