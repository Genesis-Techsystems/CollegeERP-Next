"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ColDef } from "ag-grid-community";
import { SearchInput } from "@/common/components/search";
import { DataTable } from "@/common/components/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, type SelectOption } from "@/common/components/select";
import { ChevronDown, Filter } from "lucide-react";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  assignModerationEvaluation,
  getEvaluationModerationFilters,
  getEvaluationModerationRest,
  getEvaluationModerationSubjects,
  listEvaluationModerationData,
} from "@/services/evaluation-process";
import { PageContainer } from "@/components/layout";

type AnyRow = Record<string, any>;

const pickNum = (row: AnyRow | null | undefined, keys: string[]) => {
  if (!row) return 0;
  for (const k of keys) {
    const raw = row[k];
    if (raw == null || raw === "") continue;
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
};

/** pk_examevaluator_profiledet_id when returned by the list proc */
const pickProfileDetId = (row: AnyRow | null | undefined) => {
  const direct = pickNum(row, [
    "pk_examevaluator_profiledet_id",
    "pk_exam_evaluator_profiledet_id",
    "pk_exam_evaluator_profile_det_id",
    "examEvaluatorProfileDetId",
    "exam_evaluator_profile_det_id",
    "fk_examevaluator_profiledet_id",
    "fk_exam_evaluator_profiledet_id",
    "fk_exam_evaluator_profile_det_id",
  ]);
  if (direct > 0) return direct;
  if (!row) return 0;
  for (const [key, raw] of Object.entries(row)) {
    const norm = key.toLowerCase().replace(/_/g, "");
    if (!norm.includes("profiledet")) continue;
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
};

/**
 * Angular Formdata.examEvaluatorProfileId → in_profileids on Assign.
 * Newer Angular binds pk_examevaluator_profiledet_id; older builds use
 * pk_exam_evaluator_profile_id (e.g. in_profileids=1505).
 */
const evaluatorAssignProfileIdOf = (row: AnyRow | null | undefined) => {
  const detId = pickProfileDetId(row);
  if (detId > 0) return detId;
  return pickNum(row, ["pk_exam_evaluator_profile_id", "examEvaluatorProfileId"]);
};

const pickText = (row: AnyRow | null | undefined, keys: string[]) => {
  if (!row) return "";
  for (const k of keys) {
    const v = row[k];
    if (v != null && String(v).trim() !== "") return String(v);
  }
  return "";
};
const dedupeBy = <T,>(rows: T[], keyFn: (r: T) => string | number) => {
  const seen = new Set<string | number>();
  return rows.filter((r) => {
    const key = keyFn(r);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

function makeAssignedRenderer(
  onOpen: (row: AnyRow, listType: "AssignedList" | "CompletedList") => void,
) {
  return (p: { data?: AnyRow }) => {
    const row = p.data ?? {};
    const count = Number(row?.no_of_students_assigned ?? 0);
    return (
      <button
        type="button"
        className="text-blue-700 hover:underline disabled:text-muted-foreground"
        disabled={count <= 0}
        onClick={() => onOpen(row, "AssignedList")}
      >
        {count}
      </button>
    );
  };
}

function makeEvaluatedRenderer(
  onOpen: (row: AnyRow, listType: "AssignedList" | "CompletedList") => void,
) {
  return (p: { data?: AnyRow }) => {
    const row = p.data ?? {};
    const count = Number(row?.no_of_evaluations_completed ?? 0);
    return (
      <button
        type="button"
        className="text-blue-700 hover:underline disabled:text-muted-foreground"
        disabled={count <= 0}
        onClick={() => onOpen(row, "CompletedList")}
      >
        {count}
      </button>
    );
  };
}

export default function EvaluationModerationPage() {
  const [filterOpen, setFilterOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [baseRows, setBaseRows] = useState<AnyRow[]>([]);
  const [restRows, setRestRows] = useState<AnyRow[]>([]);
  const [subjectRows, setSubjectRows] = useState<AnyRow[]>([]);
  const [evaluatorRows, setEvaluatorRows] = useState<AnyRow[]>([]);
  const [totalsRows, setTotalsRows] = useState<AnyRow[]>([]);
  const [studentRows, setStudentRows] = useState<AnyRow[]>([]);
  const [omrRows, setOmrRows] = useState<AnyRow[]>([]);
  // AG Grid caches the action-cell renderers (cols useMemo deps are []), so the
  // popup handler would close over the initial empty omrRows. Read via a ref
  // that we refresh each render so the Assigned/Evaluated modal gets live data.
  const omrRowsRef = useRef<AnyRow[]>([]);
  omrRowsRef.current = omrRows;
  const [selectedEvaluatorRow, setSelectedEvaluatorRow] = useState<AnyRow | null>(
    null,
  );
  const [selectedEvaluatorProfileId, setSelectedEvaluatorProfileId] = useState<
    number | null
  >(null);
  const [selectedAssignProfileId, setSelectedAssignProfileId] = useState<
    number | null
  >(null);
  const [selectedOmrRows, setSelectedOmrRows] = useState<AnyRow[]>([]);
  const [checkAllOmrs, setCheckAllOmrs] = useState(false);
  const [omrSearch, setOmrSearch] = useState("");
  const [popupOpen, setPopupOpen] = useState(false);
  const [popupTitle, setPopupTitle] = useState("Student Answer Sheets List");
  const [popupSearch, setPopupSearch] = useState("");
  const [popupRows, setPopupRows] = useState<AnyRow[]>([]);

  const [courseId, setCourseId] = useState<number | null>(null);
  const [academicYearId, setAcademicYearId] = useState<number | null>(null);
  const [examId, setExamId] = useState<number | null>(null);
  const [courseYearId, setCourseYearId] = useState<number | null>(null);
  const [regulationId, setRegulationId] = useState<number | null>(null);
  const [subjectId, setSubjectId] = useState<number | null>(null);

  const employeeId = Number(
    globalThis?.localStorage?.getItem("employeeId") ?? 0,
  );

  const courses = useMemo(
    () => dedupeBy(baseRows, (r) => pickNum(r, ["fk_course_id", "courseId"])),
    [baseRows],
  );
  const academicYears = useMemo(
    () =>
      dedupeBy(
        baseRows.filter(
          (r) => pickNum(r, ["fk_course_id", "courseId"]) === Number(courseId),
        ),
        (r) => pickNum(r, ["fk_academic_year_id", "academicYearId"]),
      ),
    [baseRows, courseId],
  );
  const exams = useMemo(
    () =>
      dedupeBy(
        baseRows.filter(
          (r) =>
            pickNum(r, ["fk_course_id", "courseId"]) === Number(courseId) &&
            pickNum(r, ["fk_academic_year_id", "academicYearId"]) ===
              Number(academicYearId),
        ),
        (r) => pickNum(r, ["fk_exam_id", "examId"]),
      ),
    [baseRows, courseId, academicYearId],
  );
  const courseYears = useMemo(
    () =>
      dedupeBy(restRows, (r) =>
        pickNum(r, ["fk_course_year_id", "courseYearId"]),
      ),
    [restRows],
  );
  const regulations = useMemo(
    () =>
      dedupeBy(
        restRows.filter(
          (r) =>
            pickNum(r, ["fk_course_year_id", "courseYearId"]) ===
            Number(courseYearId),
        ),
        (r) => pickNum(r, ["fk_regulation_id", "regulationId"]),
      ),
    [restRows, courseYearId],
  );
  const subjects = useMemo(
    () =>
      dedupeBy(subjectRows, (r) => pickNum(r, ["fk_subject_id", "subjectId"])),
    [subjectRows],
  );

  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const list = await getEvaluationModerationFilters(employeeId).catch(
          () => [],
        );
        const rows = Array.isArray(list) ? list : [];
        setBaseRows(rows);
        if (rows[0])
          setCourseId(pickNum(rows[0], ["fk_course_id", "courseId"]));
      } finally {
        setLoading(false);
      }
    }
    void init();
  }, [employeeId]);

  useEffect(() => {
    if (academicYears[0])
      setAcademicYearId(
        pickNum(academicYears[0], ["fk_academic_year_id", "academicYearId"]),
      );
  }, [academicYears]);
  useEffect(() => {
    if (exams[0]) setExamId(pickNum(exams[0], ["fk_exam_id", "examId"]));
  }, [exams]);

  useEffect(() => {
    async function loadRest() {
      if (!courseId || !academicYearId || !examId) return;
      const list = await getEvaluationModerationRest({
        employeeId,
        courseId,
        academicYearId,
        examId,
      }).catch(() => []);
      const rows = Array.isArray(list) ? list : [];
      setRestRows(rows);
      if (rows[0])
        setCourseYearId(
          pickNum(rows[0], ["fk_course_year_id", "courseYearId"]),
        );
    }
    void loadRest();
  }, [employeeId, courseId, academicYearId, examId]);

  useEffect(() => {
    if (regulations[0])
      setRegulationId(
        pickNum(regulations[0], ["fk_regulation_id", "regulationId"]),
      );
  }, [regulations]);

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
      const list = await getEvaluationModerationSubjects({
        employeeId,
        courseId,
        academicYearId,
        examId,
        courseYearId,
        regulationId,
      }).catch(() => []);
      const rows = Array.isArray(list) ? list : [];
      setSubjectRows(rows);
      if (rows[0])
        setSubjectId(pickNum(rows[0], ["fk_subject_id", "subjectId"]));
    }
    void loadSubjects();
  }, [
    employeeId,
    courseId,
    academicYearId,
    examId,
    courseYearId,
    regulationId,
  ]);

  async function onGetList() {
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
    try {
      const data = await listEvaluationModerationData({
        employeeId,
        courseId,
        academicYearId,
        examId,
        courseYearId,
        subjectId,
        regulationId,
      });
      setEvaluatorRows(data.evaluators);
      setTotalsRows(data.totals);
      setStudentRows(data.students);
      setOmrRows(data.omrRows);
      setSelectedEvaluatorRow(null);
      setSelectedEvaluatorProfileId(null);
      setSelectedAssignProfileId(null);
      setSelectedOmrRows([]);
      setCheckAllOmrs(false);
      setHasFetched(true);
    } finally {
      setLoading(false);
    }
  }

  const totals = totalsRows[0] ?? {};
  const totalStudents = Number(totals.totalStudents ?? 0);
  const uploaded = Number(totals.NoOfAnswerpapersUploaded ?? 0);
  const unassigned = Number(totals.UnAssinged ?? 0);
  const assigned = Math.max(uploaded - unassigned, 0);

  // Angular getstudentList(): only rows whose answer paper is uploaded.
  const uploadedStudents = useMemo(
    () => studentRows.filter((s) => Number(s?.is_answerpaper_uploaded) === 1),
    [studentRows],
  );

  const evaluatorProfileIdOf = (row: AnyRow) =>
    pickNum(row, ["pk_exam_evaluator_profile_id", "examEvaluatorProfileId"]);

  // Angular radioChange(): exclude uses pk_exam_evaluator_profile_id.
  const isExcludedFor = (s: AnyRow, evaluatorProfileId: number | null) => {
    if (!evaluatorProfileId) return false;
    const raw = String(s?.exclude_fk_exam_evaluator_profile_id ?? "");
    if (!raw.trim()) return false;
    return raw
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean)
      .includes(String(evaluatorProfileId));
  };

  const isOmrRowDisabled = (s: AnyRow, evaluatorProfileId: number | null) =>
    isExcludedFor(s, evaluatorProfileId) || Number(s?.disable_omr) === 1;

  const filteredUploadedStudents = useMemo(() => {
    const q = omrSearch.trim().toLowerCase();
    if (!q) return uploadedStudents;
    return uploadedStudents.filter((s) =>
      String(s?.omr_serial_no ?? "")
        .toLowerCase()
        .includes(q),
    );
  }, [uploadedStudents, omrSearch]);

  const omrTableRows = useMemo(() => {
    if (!selectedEvaluatorProfileId) return [];
    return [...filteredUploadedStudents].sort((a, b) => {
      const aDis = isOmrRowDisabled(a, selectedEvaluatorProfileId);
      const bDis = isOmrRowDisabled(b, selectedEvaluatorProfileId);
      if (aDis !== bDis) return aDis ? 1 : -1;
      return Number(a?.omr_mapped ?? 0) - Number(b?.omr_mapped ?? 0);
    });
  }, [filteredUploadedStudents, selectedEvaluatorProfileId]);

  const alreadyAssignedStudents = useMemo(
    () =>
      omrTableRows.filter((s) => isExcludedFor(s, selectedEvaluatorProfileId)),
    [omrTableRows, selectedEvaluatorProfileId],
  );

  const selectedOmr = useMemo(
    () =>
      selectedOmrRows
        .map((s) => String(s?.omr_serial_no ?? ""))
        .filter(Boolean),
    [selectedOmrRows],
  );

  function applyEvaluatorSelection(row: AnyRow) {
    const profileId = evaluatorProfileIdOf(row);
    const assignProfileId = evaluatorAssignProfileIdOf(row);
    setSelectedEvaluatorRow(row);
    setSelectedEvaluatorProfileId(profileId || null);
    setSelectedAssignProfileId(assignProfileId || null);
    setSelectedOmrRows([]);
    setCheckAllOmrs(false);
  }

  function toggleOmrRow(row: AnyRow, checked: boolean) {
    if (isOmrRowDisabled(row, selectedEvaluatorProfileId)) return;
    setSelectedOmrRows((prev) => {
      const omr = String(row?.omr_serial_no ?? "");
      if (!omr) return prev;
      if (checked) {
        if (prev.some((r) => String(r?.omr_serial_no ?? "") === omr))
          return prev;
        return [...prev, row];
      }
      return prev.filter((r) => String(r?.omr_serial_no ?? "") !== omr);
    });
    setCheckAllOmrs(false);
  }

  function markAllOmrs(checked: boolean) {
    setCheckAllOmrs(checked);
    if (!checked) {
      setSelectedOmrRows([]);
      return;
    }
    const selectable = omrTableRows.filter(
      (s) => !isOmrRowDisabled(s, selectedEvaluatorProfileId),
    );
    setSelectedOmrRows(selectable);
  }

  async function onAssign() {
    const profileId =
      selectedAssignProfileId ??
      evaluatorAssignProfileIdOf(selectedEvaluatorRow);
    if (
      !profileId ||
      selectedOmr.length === 0 ||
      !examId ||
      !subjectId ||
      !courseYearId
    ) {
      if (!profileId) {
        toastError(
          "Evaluator profile is missing. Re-select the evaluator and try again.",
        );
      }
      return;
    }
    setAssigning(true);
    try {
      await assignModerationEvaluation({
        profileId,
        examId,
        subjectId,
        courseYearId,
        omrSerialNos: selectedOmr.join(","),
      });
      toastSuccess("Evaluators assigned successfully.");
      setSelectedOmrRows([]);
      setCheckAllOmrs(false);
      await onGetList();
    } catch (error: any) {
      toastError(error?.message ?? "Failed to assign moderation evaluation.");
    } finally {
      setAssigning(false);
    }
  }

  function openStudentListPopup(
    row: AnyRow,
    listType: "AssignedList" | "CompletedList",
  ) {
    const evaluatorProfileId = pickNum(row, [
      "pk_exam_evaluator_profile_id",
      "examEvaluatorProfileId",
    ]);
    const base = omrRowsRef.current.filter(
      (x) =>
        pickNum(x, [
          "pk_exam_evaluator_profile_id",
          "examEvaluatorProfileId",
        ]) === evaluatorProfileId,
    );
    const filtered =
      listType === "CompletedList"
        ? base.filter(
            (x) => x?.evaluated_totalmarks != null && x?.omr_serial_no != null,
          )
        : base.filter((x) => x?.omr_serial_no != null);
    setPopupTitle(
      listType === "CompletedList"
        ? "Evaluated Answer Sheets List"
        : "Student Answer Sheets List",
    );
    setPopupRows(filtered);
    setPopupSearch("");
    setPopupOpen(true);
  }

  const filteredPopupRows = useMemo(() => {
    const q = popupSearch.trim().toLowerCase();
    if (!q) return popupRows;
    return popupRows.filter((r) => {
      const serial = String(r?.omr_serial_no ?? "").toLowerCase();
      const marks = String(r?.evaluated_totalmarks ?? "").toLowerCase();
      return serial.includes(q) || marks.includes(q);
    });
  }, [popupRows, popupSearch]);

  const cols = useMemo<ColDef[]>(
    () => [
      {
        headerName: "SI.No",
        valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1,
        width: 70,
      },
      {
        field: "evaluatorName",
        headerName: "Evaluator Name",
        minWidth: 220,
        valueGetter: (p) => p.data?.evaluator_name ?? "-",
      },
      {
        field: "email",
        headerName: "Evaluator Email",
        minWidth: 220,
        valueGetter: (p) => p.data?.email ?? "-",
      },
      {
        field: "assigned",
        headerName: "Assigned Answer Sheets",
        minWidth: 170,
        valueGetter: (p) => p.data?.no_of_students_assigned ?? 0,
        cellRenderer: makeAssignedRenderer(openStudentListPopup),
      },
      {
        field: "completed",
        headerName: "Evaluated Answer Sheets",
        minWidth: 170,
        valueGetter: (p) => p.data?.no_of_evaluations_completed ?? 0,
        cellRenderer: makeEvaluatedRenderer(openStudentListPopup),
      },
      {
        field: "due",
        headerName: "Due Answer Sheets",
        minWidth: 150,
        valueGetter: (p) =>
          Number(p.data?.no_of_students_assigned ?? 0) -
          Number(p.data?.no_of_evaluations_completed ?? 0),
      },
    ],
    [],
  );

  return (
    <PageContainer className="space-y-4">
      <div className="app-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/40 flex items-center justify-between gap-2">
          <h2 className="app-card-title">Evaluation Moderation</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-6 px-2.5 text-[12px]"
            style={{ marginRight: "0px" }}
            onClick={() => setFilterOpen((v) => !v)}
            aria-expanded={filterOpen}
          >
            <Filter className="mr-1.5 h-3.5 w-3.5" />
            Filter
            <ChevronDown
              className={`ml-1.5 h-3.5 w-3.5 transition-transform ${filterOpen ? "rotate-180" : ""}`}
            />
          </Button>
        </div>
        {filterOpen && (
          <div className="p-3 space-y-2 text-[13px]">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
              <div className="md:col-span-2">
                <Label className="text-[12px] text-muted-foreground">
                  Course
                </Label>
                <Select
                  value={courseId ? String(courseId) : null}
                  onChange={(v) => setCourseId(v ? Number(v) : null)}
                  options={courses.map(
                    (c) =>
                      ({
                        value: String(pickNum(c, ["fk_course_id", "courseId"])),
                        label: pickText(c, ["course_code", "courseCode"]),
                      }) as SelectOption,
                  )}
                  placeholder="Course"
                />
              </div>
              <div className="md:col-span-2">
                <Label className="text-[12px] text-muted-foreground">
                  Academic Year
                </Label>
                <Select
                  value={academicYearId ? String(academicYearId) : null}
                  onChange={(v) => setAcademicYearId(v ? Number(v) : null)}
                  options={academicYears.map(
                    (a) =>
                      ({
                        value: String(
                          pickNum(a, ["fk_academic_year_id", "academicYearId"]),
                        ),
                        label: pickText(a, ["academic_year", "academicYear"]),
                      }) as SelectOption,
                  )}
                  placeholder="Academic Year"
                />
              </div>
              <div className="md:col-span-4">
                <Label className="text-[12px] text-muted-foreground">
                  Exam
                </Label>
                <Select
                  value={examId ? String(examId) : null}
                  onChange={(v) => setExamId(v ? Number(v) : null)}
                  options={exams.map(
                    (e) =>
                      ({
                        value: String(pickNum(e, ["fk_exam_id", "examId"])),
                        label: pickText(e, ["exam_name", "examName"]),
                      }) as SelectOption,
                  )}
                  placeholder="Exam"
                />
              </div>
              <div className="md:col-span-2">
                <Label className="text-[12px] text-muted-foreground">
                  Course Year
                </Label>
                <Select
                  value={courseYearId ? String(courseYearId) : null}
                  onChange={(v) => setCourseYearId(v ? Number(v) : null)}
                  options={courseYears.map(
                    (y) =>
                      ({
                        value: String(
                          pickNum(y, ["fk_course_year_id", "courseYearId"]),
                        ),
                        label: pickText(y, [
                          "course_year_code",
                          "courseYearCode",
                        ]),
                      }) as SelectOption,
                  )}
                  placeholder="Course Year"
                />
              </div>
              <div className="md:col-span-2">
                <Label className="text-[12px] text-muted-foreground">
                  Regulation
                </Label>
                <Select
                  value={regulationId ? String(regulationId) : null}
                  onChange={(v) => setRegulationId(v ? Number(v) : null)}
                  options={regulations.map(
                    (r) =>
                      ({
                        value: String(
                          pickNum(r, ["fk_regulation_id", "regulationId"]),
                        ),
                        label: pickText(r, [
                          "regulation_code",
                          "regulationCode",
                        ]),
                      }) as SelectOption,
                  )}
                  placeholder="Regulation"
                />
              </div>
              <div className="md:col-span-4">
                <Label className="text-[12px] text-muted-foreground">
                  Subject
                </Label>
                <Select
                  value={subjectId ? String(subjectId) : null}
                  onChange={(v) => setSubjectId(v ? Number(v) : null)}
                  options={subjects.map(
                    (s) =>
                      ({
                        value: String(
                          pickNum(s, ["fk_subject_id", "subjectId"]),
                        ),
                        label: `${pickText(s, ["subject_name", "subjectName"])} - ${pickText(s, ["subject_code", "subjectCode"])}`,
                      }) as SelectOption,
                  )}
                  placeholder="Subject"
                />
              </div>
              <div className="md:col-span-2">
                <Button
                  className="h-8 px-3 text-[12px] w-full"
                  onClick={onGetList}
                  disabled={loading}
                >
                  Get List
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {hasFetched && (
        <>
          <div className="app-card p-3 text-[13px] font-medium">
            Total Students :{" "}
            <span className="text-red-600">{totalStudents}</span> | No.Of
            AnswerPapers Uploaded :{" "}
            <span className="text-red-600">{uploaded}</span> | UnAssigned :{" "}
            <span className="text-red-600">{unassigned}</span> | Assigned :{" "}
            <span className="text-red-600">{assigned}</span> | No of Evaluators
            : <span className="text-red-600">{evaluatorRows.length}</span>
          </div>

          <div
            className="rounded-[3px] border-2 border-[#89c5ff] bg-white p-2.5 mx-1"
            style={{ margin: "0 4px 16px" }}
          >
            <div className="flex flex-col lg:flex-row gap-0">
              {/* Evaluators / (Assigned) — 27% */}
              <div className="lg:w-[27%] shrink-0 border border-[#dedede] bg-white p-2">
                <h3 className="text-blue-700 font-bold text-[14px] px-2.5 py-0 mb-1">
                  Evaluators / (Assigned)
                </h3>
                <div className="grid gap-0.5 px-2 pb-2 max-h-[350px] overflow-y-auto">
                  {evaluatorRows.map((e) => {
                    const profileId = evaluatorProfileIdOf(e);
                    const assignProfileId = evaluatorAssignProfileIdOf(e);
                    const checked = selectedAssignProfileId === assignProfileId;
                    return (
                      <label
                        key={`ev-${profileId}-${assignProfileId}`}
                        className="flex items-start gap-2 text-[13px] font-medium cursor-pointer"
                      >
                        <input
                          type="radio"
                          name="evaluator-profile"
                          className="mt-0.5"
                          checked={checked}
                          onChange={() => applyEvaluatorSelection(e)}
                        />
                        <span>
                          {pickText(e, ["evaluator_name", "evaluatorName"])} / (
                          {pickNum(e, ["no_of_students_assigned"])})
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* OMR table — 39% */}
              <div className="lg:w-[39%] shrink-0 border border-[#dedede] border-l-0 bg-white p-1">
                <div className="flex items-center justify-between gap-2 px-2 py-1">
                  <div className="relative flex-1 max-w-[70%]">
                    <SearchInput
                      value={omrSearch}
                      onChange={setOmrSearch}
                      placeholder="Search..."
                      className="w-full"
                    />
                  </div>
                  <span className="text-blue-700 font-bold text-[13px] whitespace-nowrap">
                    Total : <span>{omrTableRows.length}</span>
                  </span>
                </div>
                <div className="px-2 pb-2">
                  <div className="max-h-[350px] overflow-y-auto">
                    <table className="w-full text-[13px] border-spacing-0">
                      <thead className="sticky top-0 z-[1]">
                        <tr className="bg-[#C3D9FF]">
                          <th className="text-left font-medium px-1.5 py-1 w-[12%] border-b-[5px] border-[#c3d9ff]">
                            <label className="inline-flex items-center gap-1 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={checkAllOmrs}
                                disabled={
                                  !selectedEvaluatorProfileId ||
                                  omrTableRows.every((s) =>
                                    isOmrRowDisabled(
                                      s,
                                      selectedEvaluatorProfileId,
                                    ),
                                  )
                                }
                                onChange={(e) => markAllOmrs(e.target.checked)}
                              />
                              All
                            </label>
                          </th>
                          <th className="text-left font-medium px-1.5 py-1 w-[35%] border-b-[5px] border-[#c3d9ff]">
                            Serial No
                          </th>
                          <th className="text-left font-medium px-1.5 py-1 w-[35%] border-b-[5px] border-[#c3d9ff]">
                            Answer Papers Assigned
                          </th>
                          <th className="text-left font-medium px-1.5 py-1 w-[35%] border-b-[5px] border-[#c3d9ff]">
                            Evaluated Total Marks
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {!selectedEvaluatorProfileId ? (
                          <tr className="bg-white">
                            <td
                              colSpan={4}
                              className="px-2 py-4 text-center text-muted-foreground"
                            >
                              Select an evaluator to list OMR sheets.
                            </td>
                          </tr>
                        ) : omrTableRows.length === 0 ? (
                          <tr className="bg-white">
                            <td
                              colSpan={4}
                              className="px-2 py-4 text-center text-muted-foreground"
                            >
                              No OMR sheets found.
                            </td>
                          </tr>
                        ) : (
                          omrTableRows.map((s, idx) => {
                            const omr = String(s?.omr_serial_no ?? "");
                            const disabled = isOmrRowDisabled(
                              s,
                              selectedEvaluatorProfileId,
                            );
                            const checked = selectedOmrRows.some(
                              (r) => String(r?.omr_serial_no ?? "") === omr,
                            );
                            return (
                              <tr
                                key={`omr-${omr}-${idx}`}
                                className={
                                  idx % 2 === 0 ? "bg-[#f1f6ff]" : "bg-white"
                                }
                              >
                                <td className="px-1.5 py-1 text-center">
                                  <input
                                    type="checkbox"
                                    disabled={disabled}
                                    checked={checked}
                                    onChange={(e) =>
                                      toggleOmrRow(s, e.target.checked)
                                    }
                                  />
                                </td>
                                <td className="px-1.5 py-1 text-left">
                                  {omr || "-"}
                                </td>
                                <td className="px-1.5 py-1 text-center">
                                  {String(s?.omr_mapped ?? "")}
                                </td>
                                <td className="px-1.5 py-1 text-center">
                                  {String(s?.list_evaluated_totalmarks ?? "")}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Selected — 15% */}
              <div className="lg:w-[15%] shrink-0 border border-[#dedede] border-l-0 bg-white">
                <div className="max-h-[350px] overflow-y-auto">
                  <table className="w-full text-[13px]">
                    <thead className="sticky top-0">
                      <tr>
                        <th className="text-left font-bold text-blue-700 px-1.5 py-1 bg-[#C3D9FF] border-b-[5px] border-[#c3d9ff]">
                          Selected : <span>{selectedOmrRows.length}</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOmrRows.length === 0 ? (
                        <tr className="bg-white">
                          <td className="px-1.5 py-2" />
                        </tr>
                      ) : (
                        selectedOmrRows.map((s, idx) => (
                          <tr
                            key={`sel-${String(s?.omr_serial_no ?? "")}-${idx}`}
                            className={
                              idx % 2 === 0 ? "bg-[#f1f6ff]" : "bg-white"
                            }
                          >
                            <td className="px-1.5 py-1">
                              <span className="text-blue-700">
                                {String(s?.omr_serial_no ?? "-")}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Already Assigned List — 15% */}
              <div className="lg:w-[15%] shrink-0 border border-[#dedede] border-l-0 bg-white">
                <div className="max-h-[350px] overflow-y-auto">
                  <table className="w-full text-[13px]">
                    <thead className="sticky top-0">
                      <tr>
                        <th className="text-left font-bold text-blue-700 px-1.5 py-1 bg-[#C3D9FF] border-b-[5px] border-[#c3d9ff]">
                          Already Assigned List :{" "}
                          <span>{alreadyAssignedStudents.length}</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {alreadyAssignedStudents.length === 0 ? (
                        <tr className="bg-white">
                          <td className="px-1.5 py-2" />
                        </tr>
                      ) : (
                        alreadyAssignedStudents.map((s, idx) => (
                          <tr
                            key={`as-${String(s?.omr_serial_no ?? "")}-${idx}`}
                            className={
                              idx % 2 === 0 ? "bg-[#f1f6ff]" : "bg-white"
                            }
                          >
                            <td className="px-1.5 py-1">
                              <span className="text-blue-700">
                                {String(s?.omr_serial_no ?? "-")}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-2">
              <Button
                type="button"
                disabled={
                  assigning ||
                  loading ||
                  !selectedAssignProfileId ||
                  selectedOmrRows.length === 0
                }
                className="h-8 px-4 text-[12px]"
                onClick={() => void onAssign()}
              >
                {assigning ? "Assigning..." : "Assign"}
              </Button>
            </div>
          </div>

          <div className="app-card overflow-hidden">
            <div className="p-4">
              <DataTable
                rowData={evaluatorRows}
                columnDefs={cols}
                pagination
                loading={loading}
                toolbar={{
                  search: true,
                  searchPlaceholder: "Search…",
                  pdfDocumentTitle: "Evaluation Moderation",
                }}
              />
            </div>
          </div>
        </>
      )}

      <Dialog open={popupOpen} onOpenChange={setPopupOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="text-[16px] font-semibold text-[hsl(var(--primary))]">
              {popupTitle}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="w-full max-w-sm">
              <SearchInput
                value={popupSearch}
                onChange={setPopupSearch}
                placeholder="Search…"
                className="w-full max-w-sm"
              />
            </div>
            <div className="max-h-[420px] overflow-auto border rounded">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="text-left px-3 py-2 w-20">S.No</th>
                    <th className="text-left px-3 py-2">Omr Serial No</th>
                    <th className="text-left px-3 py-2">
                      Evaluated Total Marks
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPopupRows.map((r, idx) => (
                    <tr
                      key={`popup-${String(r?.omr_serial_no ?? "")}-${idx}`}
                      className="border-t"
                    >
                      <td className="px-3 py-2">{idx + 1}</td>
                      <td className="px-3 py-2">
                        {String(r?.omr_serial_no ?? "-")}
                      </td>
                      <td className="px-3 py-2">
                        {String(r?.evaluated_totalmarks ?? "-")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPopupOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
