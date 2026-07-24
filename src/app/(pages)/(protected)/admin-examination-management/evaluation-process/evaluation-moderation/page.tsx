"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ColDef } from "ag-grid-community";
import { SearchInput } from "@/common/components/search";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
import { DataTable } from "@/common/components/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, type SelectOption } from "@/common/components/select";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  assignModerationEvaluation,
  getEvaluationModerationFilters,
  getEvaluationModerationRest,
  getEvaluationModerationSubjects,
  listEvaluationModerationData,
} from "@/services/evaluation-process";
import { FilteredPage } from "@/components/layout";

type AnyRow = Record<string, any>;

const pickNum = (row: AnyRow | null | undefined, keys: string[]) => {
  if (!row) return 0;
  for (const k of keys) {
    const n = Number(row[k]);
    if (n > 0) return n;
  }
  return 0;
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

/** Profile id used in exclude_fk_* lists (Angular radioChange). */
function evaluatorProfileId(row: AnyRow | null | undefined): number {
  return pickNum(row, [
    "pk_exam_evaluator_profile_id",
    "fk_exam_evaluator_profile_id",
    "examEvaluatorProfileId",
  ]);
}

/**
 * Id sent as in_profileids on Assign — prefer profiledet (same fix as
 * multi-evaluator-assign); fall back to profile id.
 */
function evaluatorAssignProfileId(row: AnyRow | null | undefined): number {
  return (
    pickNum(row, [
      "pk_examevaluator_profiledet_id",
      "pk_exam_evaluator_profiledet_id",
    ]) || evaluatorProfileId(row)
  );
}

function makeAssignedRenderer(
  onOpen: (
    row: AnyRow,
    listType: "AssignedList" | "CompletedList" | "DueList",
  ) => void,
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
  onOpen: (
    row: AnyRow,
    listType: "AssignedList" | "CompletedList" | "DueList",
  ) => void,
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

function makeDueRenderer(
  onOpen: (
    row: AnyRow,
    listType: "AssignedList" | "CompletedList" | "DueList",
  ) => void,
) {
  return (p: { data?: AnyRow }) => {
    const row = p.data ?? {};
    const count =
      Number(row?.no_of_students_assigned ?? 0) -
      Number(row?.no_of_evaluations_completed ?? 0);
    return (
      <button
        type="button"
        className="text-blue-700 hover:underline disabled:text-muted-foreground"
        disabled={count <= 0}
        onClick={() => onOpen(row, "DueList")}
      >
        {count}
      </button>
    );
  };
}

export default function EvaluationModerationPage() {
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
  const [selectedEvaluatorId, setSelectedEvaluatorId] = useState<number | null>(
    null,
  );
  const [selectedOmr, setSelectedOmr] = useState<string[]>([]);
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
  const organizationId = Number(
    globalThis?.localStorage?.getItem("organizationId") ?? 0,
  );

  function resetFetchedState() {
    setHasFetched(false);
    setSelectedEvaluatorId(null);
    setSelectedOmr([]);
    setOmrSearch("");
  }

  const courses = useMemo(
    () => dedupeBy(baseRows, (r) => pickNum(r, ["fk_course_id", "courseId"])),
    [baseRows],
  );
  const academicYears = useMemo(() => {
    const rows = dedupeBy(
      baseRows.filter(
        (r) => pickNum(r, ["fk_course_id", "courseId"]) === Number(courseId),
      ),
      (r) => pickNum(r, ["fk_academic_year_id", "academicYearId"]),
    );
    return [...rows].sort(
      (a, b) =>
        parseInt(pickText(b, ["academic_year", "academicYear"]), 10) -
        parseInt(pickText(a, ["academic_year", "academicYear"]), 10),
    );
  }, [baseRows, courseId]);
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
        organizationId: organizationId || 1,
        employeeId,
        courseId,
        academicYearId,
        examId,
        courseYearId,
        subjectId,
        regulationId,
      });
      setEvaluatorRows(
        dedupeBy(data.evaluators, (e) => evaluatorAssignProfileId(e)),
      );
      setTotalsRows(data.totals);
      setStudentRows(data.students);
      setOmrRows(data.omrRows);
      setSelectedEvaluatorId(null);
      setSelectedOmr([]);
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

  // A student is "already assigned" to an evaluator when that evaluator's profile
  // id is listed in exclude_fk_exam_evaluator_profile_id (Angular radioChange()).
  const isExcludedFor = (s: AnyRow, profileId: number | null) => {
    if (!profileId) return false;
    const raw = String(s?.exclude_fk_exam_evaluator_profile_id ?? "");
    if (!raw.trim()) return false;
    return raw
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean)
      .includes(String(profileId));
  };

  // Angular radioChange(): disable when excluded OR disable_omr === 1.
  const isOmrDisabledFor = (s: AnyRow, profileId: number | null) =>
    isExcludedFor(s, profileId) || Number(s?.disable_omr) === 1;

  const selectedEvaluator = useMemo(
    () =>
      evaluatorRows.find(
        (e) => evaluatorAssignProfileId(e) === Number(selectedEvaluatorId),
      ) ?? null,
    [evaluatorRows, selectedEvaluatorId],
  );
  const selectedProfileId = evaluatorProfileId(selectedEvaluator);

  // OMR list (maintDataList) is shown ONLY after an evaluator radio is selected.
  const visibleStudents = useMemo(() => {
    if (!selectedEvaluatorId) return [];
    const q = omrSearch.trim().toLowerCase();
    const base = q
      ? uploadedStudents.filter((s) =>
          String(s?.omr_serial_no ?? "")
            .toLowerCase()
            .includes(q),
        )
      : uploadedStudents;
    return [...base].sort((a, b) => {
      const aDisabled = isOmrDisabledFor(a, selectedProfileId);
      const bDisabled = isOmrDisabledFor(b, selectedProfileId);
      if (aDisabled !== bDisabled) return aDisabled ? 1 : -1;
      return Number(a?.omr_mapped ?? 0) - Number(b?.omr_mapped ?? 0);
    });
  }, [uploadedStudents, omrSearch, selectedEvaluatorId, selectedProfileId]);

  const assignableStudents = visibleStudents;
  // Already-assigned (excluded) OMRs for the selected evaluator (assignedOmrList).
  const alreadyAssignedStudents = useMemo(
    () => visibleStudents.filter((s) => isExcludedFor(s, selectedProfileId)),
    [visibleStudents, selectedProfileId],
  );
  // Only NON-excluded rows can be selected/assigned.
  const visibleAssignableOmrs = useMemo(
    () =>
      visibleStudents
        .filter((s) => !isOmrDisabledFor(s, selectedProfileId))
        .map((s) => String(s?.omr_serial_no ?? ""))
        .filter(Boolean),
    [visibleStudents, selectedProfileId],
  );
  const areAllVisibleSelected = useMemo(
    () =>
      visibleAssignableOmrs.length > 0 &&
      visibleAssignableOmrs.every((omr) => selectedOmr.includes(omr)),
    [visibleAssignableOmrs, selectedOmr],
  );

  async function onAssign() {
    const assignProfileId = evaluatorAssignProfileId(selectedEvaluator);
    if (
      !assignProfileId ||
      selectedOmr.length === 0 ||
      !examId ||
      !subjectId ||
      !courseYearId
    )
      return;
    setAssigning(true);
    try {
      await assignModerationEvaluation({
        profileId: assignProfileId,
        examId,
        subjectId,
        courseYearId,
        omrSerialNos: selectedOmr.join(","),
      });
      toastSuccess("Evaluators assigned successfully.");
      setSelectedOmr([]);
      // Refresh lists/counts/stats (Angular calls getstudentList after assign).
      await onGetList();
    } catch (error: any) {
      toastError(error?.message ?? "Failed to assign moderation evaluation.");
    } finally {
      setAssigning(false);
    }
  }

  function toggleSelectAllVisible() {
    if (areAllVisibleSelected) {
      setSelectedOmr((prev) =>
        prev.filter((omr) => !visibleAssignableOmrs.includes(omr)),
      );
      return;
    }
    setSelectedOmr((prev) => [...new Set([...prev, ...visibleAssignableOmrs])]);
  }

  function toggleOmrSelection(omr: string, checked: boolean) {
    setSelectedOmr((prev) =>
      checked ? [...new Set([...prev, omr])] : prev.filter((v) => v !== omr),
    );
  }

  function openStudentListPopup(
    row: AnyRow,
    listType: "AssignedList" | "CompletedList" | "DueList",
  ) {
    const profileId = evaluatorProfileId(row);
    const base = omrRowsRef.current.filter(
      (x) => evaluatorProfileId(x) === profileId,
    );
    const filtered =
      listType === "CompletedList"
        ? base.filter(
            (x) => x?.evaluated_totalmarks != null && x?.omr_serial_no != null,
          )
        : listType === "DueList"
          ? base.filter(
              (x) =>
                x?.evaluated_totalmarks == null && x?.omr_serial_no != null,
            )
          : base.filter((x) => x?.omr_serial_no != null);
    setPopupTitle(
      listType === "CompletedList"
        ? "Evaluated Answer Sheets List"
        : listType === "DueList"
          ? "Due Answer Sheets List"
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
        cellRenderer: makeDueRenderer(openStudentListPopup),
      },
    ],
    [],
  );

  const filterFields = (
    <>
      <GlobalFilterBarRow className="global-filter-bar__row--eval-mod-r1">
        <GlobalFilterField label="Course" className="global-filter-field--fx15">
          <Select
            value={courseId ? String(courseId) : null}
            onChange={(v) => {
              resetFetchedState();
              setCourseId(v ? Number(v) : null);
            }}
            options={courses.map(
              (c) =>
                ({
                  value: String(pickNum(c, ["fk_course_id", "courseId"])),
                  label: pickText(c, ["course_code", "courseCode"]),
                }) as SelectOption,
            )}
            placeholder="Course"
          />
        </GlobalFilterField>
        <GlobalFilterField
          label="Academic Year"
          className="global-filter-field--fx15"
        >
          <Select
            value={academicYearId ? String(academicYearId) : null}
            onChange={(v) => {
              resetFetchedState();
              setAcademicYearId(v ? Number(v) : null);
            }}
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
        </GlobalFilterField>
        <GlobalFilterField label="Exam" className="global-filter-field--fx69">
          <Select
            value={examId ? String(examId) : null}
            onChange={(v) => {
              resetFetchedState();
              setExamId(v ? Number(v) : null);
            }}
            options={exams.map(
              (e) =>
                ({
                  value: String(pickNum(e, ["fk_exam_id", "examId"])),
                  label: pickText(e, ["exam_name", "examName"]),
                }) as SelectOption,
            )}
            placeholder="Exam"
            searchable
          />
        </GlobalFilterField>
      </GlobalFilterBarRow>
      <GlobalFilterBarRow className="global-filter-bar__row--eval-mod-r2">
        <GlobalFilterField
          label="Course Year"
          className="global-filter-field--fx15"
        >
          <Select
            value={courseYearId ? String(courseYearId) : null}
            onChange={(v) => {
              resetFetchedState();
              setCourseYearId(v ? Number(v) : null);
            }}
            options={courseYears.map(
              (y) =>
                ({
                  value: String(
                    pickNum(y, ["fk_course_year_id", "courseYearId"]),
                  ),
                  label: pickText(y, ["course_year_code", "courseYearCode"]),
                }) as SelectOption,
            )}
            placeholder="Course Year"
          />
        </GlobalFilterField>
        <GlobalFilterField
          label="Regulation"
          className="global-filter-field--fx15"
        >
          <Select
            value={regulationId ? String(regulationId) : null}
            onChange={(v) => {
              resetFetchedState();
              setRegulationId(v ? Number(v) : null);
            }}
            options={regulations.map(
              (r) =>
                ({
                  value: String(
                    pickNum(r, ["fk_regulation_id", "regulationId"]),
                  ),
                  label: pickText(r, ["regulation_code", "regulationCode"]),
                }) as SelectOption,
            )}
            placeholder="Regulation"
          />
        </GlobalFilterField>
        <GlobalFilterField label="Subject" className="global-filter-field--fx49">
          <Select
            value={subjectId ? String(subjectId) : null}
            onChange={(v) => {
              resetFetchedState();
              setSubjectId(v ? Number(v) : null);
            }}
            options={subjects.map(
              (s) =>
                ({
                  value: String(pickNum(s, ["fk_subject_id", "subjectId"])),
                  label: `${pickText(s, ["subject_name", "subjectName"])} - ${pickText(s, ["subject_code", "subjectCode"])}`,
                }) as SelectOption,
            )}
            placeholder="Subject"
            searchable
          />
        </GlobalFilterField>
        <GlobalFilterField
          label=" "
          className="global-filter-field--action global-filter-field--fx10"
        >
          <Button
            size="sm"
            onClick={() => void onGetList()}
            disabled={loading}
            className="shrink-0 w-full"
          >
            Get List
          </Button>
        </GlobalFilterField>
      </GlobalFilterBarRow>
    </>
  );

  return (
    <FilteredPage
      title="Evaluation Moderation"
      filters={filterFields}
      filtersDefaultOpen
      body={
        hasFetched ? (
          <div className="space-y-3">
            <p className="text-[13px]">
              <span className="font-semibold">Total Students:</span>{" "}
              {totalStudents} | <span className="font-semibold">Uploaded:</span>{" "}
              {uploaded} | <span className="font-semibold">UnAssigned:</span>{" "}
              {unassigned} | <span className="font-semibold">Assigned:</span>{" "}
              {assigned} |{" "}
              <span className="font-semibold">No of Evaluators:</span>{" "}
              {evaluatorRows.length}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-3 border rounded-md p-2">
                <p className="text-[13px] font-semibold mb-2">
                  Evaluator List / Assigned Count
                </p>
                <div className="space-y-1 max-h-[280px] overflow-auto">
                  {evaluatorRows.map((e, i) => {
                    const id = evaluatorAssignProfileId(e);
                    const checked = selectedEvaluatorId === id;
                    return (
                      <label
                        key={`ev-${id}-${i}`}
                        className="flex items-center gap-2 text-[12px]"
                      >
                        <input
                          type="radio"
                          checked={checked}
                          onChange={() => {
                            setSelectedEvaluatorId(id);
                            setSelectedOmr([]);
                          }}
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

              <div className="md:col-span-5 border rounded-md p-2">
                <div className="flex items-center justify-between mb-2 gap-2">
                  <SearchInput
                    value={omrSearch}
                    onChange={setOmrSearch}
                    placeholder="Search…"
                    className="w-full max-w-sm"
                  />
                  <span className="shrink-0 text-[12px] font-semibold text-blue-700">
                    Total :{" "}
                    {selectedEvaluatorId ? assignableStudents.length : 0}
                  </span>
                </div>
                <div className="max-h-[280px] overflow-auto border rounded">
                  <table className="w-full text-[12px]">
                    <thead>
                      <tr className="bg-muted/40">
                        <th className="text-left px-2 py-1 w-14">
                          <label className="inline-flex items-center gap-1 font-normal">
                            <input
                              type="checkbox"
                              checked={areAllVisibleSelected}
                              disabled={
                                !selectedEvaluatorId ||
                                visibleAssignableOmrs.length === 0
                              }
                              onChange={() => toggleSelectAllVisible()}
                            />
                            All
                          </label>
                        </th>
                        <th className="text-left px-2 py-1">Serial No</th>
                        <th className="text-center px-2 py-1">
                          Answer Papers Assigned
                        </th>
                        <th className="text-left px-2 py-1">
                          Evaluated Total Marks
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {assignableStudents.length === 0 ? (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-2 py-3 text-center text-muted-foreground"
                          >
                            {selectedEvaluatorId
                              ? "No OMR sheets found."
                              : "Select an evaluator to list OMR sheets."}
                          </td>
                        </tr>
                      ) : (
                        assignableStudents.map((s, idx) => {
                          const omr = String(s?.omr_serial_no ?? "");
                          const disabled = isOmrDisabledFor(
                            s,
                            selectedProfileId,
                          );
                          const checked = selectedOmr.includes(omr);
                          return (
                            <tr
                              key={`omr-${omr}-${idx}`}
                              className={`border-t ${disabled ? "opacity-50" : ""}`}
                            >
                              <td className="px-2 py-1">
                                <input
                                  type="checkbox"
                                  disabled={disabled}
                                  checked={checked}
                                  onChange={(e) =>
                                    toggleOmrSelection(omr, e.target.checked)
                                  }
                                />
                              </td>
                              <td className="px-2 py-1">{omr || "-"}</td>
                              <td className="px-2 py-1 text-center">
                                {Number(s?.omr_mapped ?? 0)}
                              </td>
                              <td className="px-2 py-1">
                                {s?.list_evaluated_totalmarks != null &&
                                String(s.list_evaluated_totalmarks).trim() !==
                                  ""
                                  ? String(s.list_evaluated_totalmarks)
                                  : ""}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="mt-2 flex items-center justify-end gap-2">
                  <span className="text-[12px] font-semibold text-blue-700">
                    Selected : {selectedOmr.length}
                  </span>
                </div>
              </div>

              <div className="md:col-span-2 border rounded-md p-2">
                <p className="text-[12px] font-semibold mb-2">
                  Selected ({selectedOmr.length})
                </p>
                <div className="max-h-[280px] overflow-auto space-y-1">
                  {selectedOmr.map((omr) => (
                    <div
                      key={`sel-${omr}`}
                      className="text-[12px] text-blue-700"
                    >
                      {omr}
                    </div>
                  ))}
                </div>
              </div>

              <div className="md:col-span-2 border rounded-md p-2">
                <p className="text-[12px] font-semibold mb-2">
                  Assigned OMR List ({alreadyAssignedStudents.length})
                </p>
                <div className="max-h-[280px] overflow-auto space-y-1">
                  {alreadyAssignedStudents.map((s) => {
                    const omr = String(s?.omr_serial_no ?? "");
                    return (
                      <div
                        key={`as-${omr}`}
                        className="text-[12px] text-blue-700"
                      >
                        {omr}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                disabled={
                  assigning ||
                  loading ||
                  !selectedEvaluator ||
                  selectedOmr.length === 0
                }
                onClick={() => void onAssign()}
              >
                {assigning ? "Assigning…" : "Assign"}
              </Button>
            </div>
          </div>
        ) : undefined
      }
      bodyClassName="space-y-0"
    >
      {hasFetched ? (
        <DataTable
          title=""
          bordered
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
      ) : null}

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
    </FilteredPage>
  );
}
