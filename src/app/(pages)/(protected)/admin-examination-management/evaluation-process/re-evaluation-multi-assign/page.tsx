"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { ColDef } from "ag-grid-community";
import type { LucideIcon } from "lucide-react";
import { FileText, SquareCheck, Users } from "lucide-react";
import { SearchInput } from "@/common/components/search";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
import { Select, type SelectOption } from "@/common/components/select";
import { DataTable } from "@/common/components/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  assignMultipleUpdateEvaluationAssignmentRevision,
  getReevaluationMultiAssignBundle,
  getRegSupBaseFilters,
  getRegSupRestFilters,
  getRegSupSubjectFilters,
} from "@/services/evaluation";
import { FilteredPage } from "@/components/layout";
import {
  subjectSelectLabel,
  withSubjectGroupNames,
} from "@/common/utils/data-helpers";
import { cn } from "@/lib/utils";

type AnyRow = Record<string, unknown>;

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

function ReevalPanel({
  title,
  icon: Icon,
  children,
  className,
}: {
  title: string;
  icon: LucideIcon;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[320px] flex-col overflow-hidden rounded-lg border border-border/80 bg-card",
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b border-border/70 px-3 py-2.5">
        <Icon className="h-4 w-4 shrink-0 text-[#0c51a4]" aria-hidden />
        <p className="text-[13px] font-semibold text-[#0c51a4]">{title}</p>
      </div>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}

function ReevalEmpty({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-10 text-center">
      <span className="mb-1 flex h-14 w-14 items-center justify-center rounded-full bg-[#0c51a4]/10 text-[#0c51a4]/80">
        <Icon className="h-7 w-7" aria-hidden />
      </span>
      <p className="text-sm font-semibold text-[#0c51a4]">{title}</p>
      <p className="max-w-[15rem] text-xs leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

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

function buildExamSelectOption(e: AnyRow): SelectOption {
  const name = pickText(e, ["exam_name", "examName"]);
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
    value: String(pickNum(e, ["fk_exam_id", "examId"])),
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

export default function ReEvaluationMultiAssignPage() {
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
  const omrRowsRef = useRef<AnyRow[]>([]);
  omrRowsRef.current = omrRows;

  const [selectedEvaluatorDetId, setSelectedEvaluatorDetId] = useState<
    number | null
  >(null);
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
    setSelectedEvaluatorDetId(null);
    setSelectedOmr([]);
    setOmrSearch("");
  }

  const restReqSeq = useRef(0);
  const subjectReqSeq = useRef(0);

  const courses = useMemo(
    () => dedupeBy(baseRows, (r) => pickNum(r, ["fk_course_id", "courseId"])),
    [baseRows],
  );
  const academicYears = useMemo(() => {
    if (!courseId) return [];
    const rows = dedupeBy(
      baseRows.filter(
        (r) => pickNum(r, ["fk_course_id", "courseId"]) === Number(courseId),
      ),
      (r) => pickNum(r, ["fk_academic_year_id", "academicYearId"]),
    );
    return [...rows].sort(
      (a, b) =>
        parseInt(pickText(b, ["academic_year", "academicYear"]) || "0", 10) -
        parseInt(pickText(a, ["academic_year", "academicYear"]) || "0", 10),
    );
  }, [baseRows, courseId]);
  const exams = useMemo(() => {
    if (!courseId || !academicYearId) return [];
    return dedupeBy(
      baseRows.filter(
        (r) =>
          pickNum(r, ["fk_course_id", "courseId"]) === Number(courseId) &&
          pickNum(r, ["fk_academic_year_id", "academicYearId"]) ===
            Number(academicYearId),
      ),
      (r) => pickNum(r, ["fk_exam_id", "examId"]),
    );
  }, [baseRows, courseId, academicYearId]);
  const examOptions = useMemo(
    () => exams.map((e) => buildExamSelectOption(e)),
    [exams],
  );
  const courseYears = useMemo(
    () =>
      dedupeBy(restRows, (r) =>
        pickNum(r, ["fk_course_year_id", "courseYearId"]),
      ),
    [restRows],
  );
  // Angular selectedCourseYr: regulations only for the selected course year.
  const regulations = useMemo(() => {
    if (!courseYearId) return [];
    return dedupeBy(
      restRows.filter(
        (r) =>
          pickNum(r, ["fk_course_year_id", "courseYearId"]) ===
          Number(courseYearId),
      ),
      (r) => pickNum(r, ["fk_regulation_id", "regulationId"]),
    );
  }, [restRows, courseYearId]);
  const subjects = useMemo(
    () => withSubjectGroupNames(subjectRows as AnyRow[]),
    [subjectRows],
  );

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
    resetFetchedState();
    restReqSeq.current += 1;
    subjectReqSeq.current += 1;
    setCourseId(nextCourseId);
    clearBelowCourse();
    if (!nextCourseId) return;
    const ayRows = dedupeBy(
      fromBase.filter(
        (r) => pickNum(r, ["fk_course_id", "courseId"]) === nextCourseId,
      ),
      (r) => pickNum(r, ["fk_academic_year_id", "academicYearId"]),
    );
    const sorted = [...ayRows].sort(
      (a, b) =>
        parseInt(pickText(b, ["academic_year", "academicYear"]) || "0", 10) -
        parseInt(pickText(a, ["academic_year", "academicYear"]) || "0", 10),
    );
    const firstAy =
      pickNum(sorted[0], ["fk_academic_year_id", "academicYearId"]) || null;
    if (firstAy) applyAcademicYear(firstAy, nextCourseId, fromBase);
  }

  function applyAcademicYear(
    nextAyId: number | null,
    forCourseId = courseId,
    fromBase: AnyRow[] = baseRows,
  ) {
    resetFetchedState();
    restReqSeq.current += 1;
    subjectReqSeq.current += 1;
    setAcademicYearId(nextAyId);
    clearBelowAcademicYear();
    if (!nextAyId || !forCourseId) return;
    const examRows = dedupeBy(
      fromBase.filter(
        (r) =>
          pickNum(r, ["fk_course_id", "courseId"]) === Number(forCourseId) &&
          pickNum(r, ["fk_academic_year_id", "academicYearId"]) === nextAyId,
      ),
      (r) => pickNum(r, ["fk_exam_id", "examId"]),
    );
    const firstExam = pickNum(examRows[0], ["fk_exam_id", "examId"]) || null;
    if (firstExam) applyExam(firstExam, forCourseId, nextAyId);
  }

  function applyExam(
    nextExamId: number | null,
    forCourseId = courseId,
    forAyId = academicYearId,
  ) {
    resetFetchedState();
    subjectReqSeq.current += 1;
    setExamId(nextExamId);
    clearBelowExam();
    if (!nextExamId || !forCourseId || !forAyId) return;
    const seq = ++restReqSeq.current;
    void (async () => {
      const list = await getRegSupRestFilters({
        courseId: forCourseId,
        academicYearId: forAyId,
        examId: nextExamId,
        employeeId,
      }).catch(() => [] as AnyRow[]);
      if (seq !== restReqSeq.current) return;
      const rows = Array.isArray(list) ? list : [];
      setRestRows(rows);
      const years = dedupeBy(rows, (r) =>
        pickNum(r, ["fk_course_year_id", "courseYearId"]),
      );
      const firstYear =
        pickNum(years[0], ["fk_course_year_id", "courseYearId"]) || null;
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
    resetFetchedState();
    subjectReqSeq.current += 1;
    setCourseYearId(nextYearId);
    clearBelowCourseYear();
    if (!nextYearId) return;
    const regs = dedupeBy(
      fromRest.filter(
        (r) => pickNum(r, ["fk_course_year_id", "courseYearId"]) === nextYearId,
      ),
      (r) => pickNum(r, ["fk_regulation_id", "regulationId"]),
    );
    const firstReg =
      pickNum(regs[0], ["fk_regulation_id", "regulationId"]) || null;
    if (!firstReg) return;
    applyRegulation(firstReg, {
      courseId: Number(ctx?.courseId ?? courseId),
      academicYearId: Number(ctx?.academicYearId ?? academicYearId),
      examId: Number(ctx?.examId ?? examId),
      courseYearId: nextYearId,
    });
  }

  function applyRegulation(
    nextRegId: number | null,
    ctx?: Partial<CascadeCtx>,
  ) {
    resetFetchedState();
    setRegulationId(nextRegId);
    clearBelowRegulation();
    const cId = Number(ctx?.courseId ?? courseId);
    const ayId = Number(ctx?.academicYearId ?? academicYearId);
    const eId = Number(ctx?.examId ?? examId);
    const yId = Number(ctx?.courseYearId ?? courseYearId);
    if (!nextRegId || !cId || !ayId || !eId || !yId) return;
    const seq = ++subjectReqSeq.current;
    void (async () => {
      const list = await getRegSupSubjectFilters({
        courseId: cId,
        academicYearId: ayId,
        examId: eId,
        courseYearId: yId,
        regulationId: nextRegId,
        employeeId,
      }).catch(() => [] as AnyRow[]);
      if (seq !== subjectReqSeq.current) return;
      const rows = Array.isArray(list) ? list : [];
      setSubjectRows(rows);
      setSubjectId(pickNum(rows[0], ["fk_subject_id", "subjectId"]) || null);
    })();
  }

  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const list = await getRegSupBaseFilters(employeeId).catch(() => []);
        const rows = Array.isArray(list) ? list : [];
        setBaseRows(rows);
        const firstCourse =
          pickNum(rows[0], ["fk_course_id", "courseId"]) || null;
        if (firstCourse) applyCourse(firstCourse, rows);
      } finally {
        setLoading(false);
      }
    }
    void init();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Angular getFiltersData() once on mount
  }, [employeeId]);

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
      const data = await getReevaluationMultiAssignBundle({
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
      setTotalsRows(data.summary);
      setOmrRows(data.evaluatorOmrRows);
      setStudentRows(data.students);
      setSelectedEvaluatorDetId(null);
      setSelectedOmr([]);
      setHasFetched(true);
    } catch (error: unknown) {
      toastError(
        error instanceof Error
          ? error.message
          : "Failed to load re-evaluation assignment data.",
      );
    } finally {
      setLoading(false);
    }
  }

  const totals = totalsRows[0] ?? {};
  const totalStudents = Number(
    totals.totalStudents ?? totals.TotalStudents ?? 0,
  );
  const uploaded = Number(
    totals.NoOfAnswerpapersUploaded ?? totals.noOfAnswerpapersUploaded ?? 0,
  );
  const unassigned = Number(
    totals.UnAssinged ?? totals.UnAssigned ?? totals.unAssigned ?? 0,
  );
  const assigned = Math.max(uploaded - unassigned, 0);

  const uploadedStudents = useMemo(
    () => studentRows.filter((s) => Number(s?.is_answerpaper_uploaded) === 1),
    [studentRows],
  );

  function evaluatorProfileId(row: AnyRow): number {
    return pickNum(row, [
      "pk_exam_evaluator_profile_id",
      "fk_exam_evaluator_profile_id",
      "exam_evaluator_profile_id",
    ]);
  }

  function evaluatorProfileDetId(row: AnyRow): number {
    return pickNum(row, [
      "pk_examevaluator_profiledet_id",
      "pk_exam_evaluator_profiledet_id",
      "examEvaluatorProfileDetId",
    ]);
  }

  /** Prefer profiledet (unique); fall back to profile id. Never match on 0. */
  function evaluatorAssignId(row: AnyRow): number {
    return evaluatorProfileDetId(row) || evaluatorProfileId(row);
  }

  const selectedEvaluator = useMemo(() => {
    if (selectedEvaluatorDetId == null || selectedEvaluatorDetId <= 0)
      return null;
    return (
      evaluatorRows.find(
        (r) => evaluatorAssignId(r) === selectedEvaluatorDetId,
      ) ?? null
    );
  }, [evaluatorRows, selectedEvaluatorDetId]);

  const selectedEvaluatorProfileId = useMemo(
    () => (selectedEvaluator ? evaluatorProfileId(selectedEvaluator) : null),
    [selectedEvaluator],
  );

  const hasEvaluatorSelected =
    selectedEvaluatorDetId != null &&
    selectedEvaluatorDetId > 0 &&
    selectedEvaluator != null;

  const isExcludedFor = (s: AnyRow, evaluatorId: number | null) => {
    if (!evaluatorId) return false;
    const raw = String(s?.exclude_fk_exam_evaluator_profile_id ?? "");
    if (!raw.trim()) return false;
    return raw
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean)
      .includes(String(evaluatorId));
  };

  const isOmrDisabledFor = (s: AnyRow, evaluatorId: number | null) =>
    isExcludedFor(s, evaluatorId) || Number(s?.disable_omr) === 1;

  // Angular: maintDataList stays empty until radioChange(evaluator)
  const visibleStudents = useMemo(() => {
    if (!hasEvaluatorSelected || !selectedEvaluatorProfileId) return [];
    const q = omrSearch.trim().toLowerCase();
    const base = q
      ? uploadedStudents.filter((s) =>
          String(s?.omr_serial_no ?? "")
            .toLowerCase()
            .includes(q),
        )
      : uploadedStudents;
    return [...base].sort((a, b) => {
      const aDisabled = isOmrDisabledFor(a, selectedEvaluatorProfileId);
      const bDisabled = isOmrDisabledFor(b, selectedEvaluatorProfileId);
      if (aDisabled !== bDisabled) return aDisabled ? 1 : -1;
      return Number(a?.omr_mapped ?? 0) - Number(b?.omr_mapped ?? 0);
    });
  }, [
    uploadedStudents,
    omrSearch,
    selectedEvaluatorProfileId,
    hasEvaluatorSelected,
  ]);

  const assignableStudents = visibleStudents;
  const alreadyAssignedStudents = useMemo(
    () =>
      hasEvaluatorSelected
        ? visibleStudents.filter((s) =>
            isExcludedFor(s, selectedEvaluatorProfileId),
          )
        : [],
    [visibleStudents, selectedEvaluatorProfileId, hasEvaluatorSelected],
  );
  const visibleAssignableOmrs = useMemo(
    () =>
      visibleStudents
        .filter((s) => !isOmrDisabledFor(s, selectedEvaluatorProfileId))
        .map((s) => String(s?.omr_serial_no ?? ""))
        .filter(Boolean),
    [visibleStudents, selectedEvaluatorProfileId],
  );
  const areAllVisibleSelected = useMemo(
    () =>
      visibleAssignableOmrs.length > 0 &&
      visibleAssignableOmrs.every((omr) => selectedOmr.includes(omr)),
    [visibleAssignableOmrs, selectedOmr],
  );

  async function onAssign() {
    if (
      !selectedEvaluatorDetId ||
      selectedOmr.length === 0 ||
      !examId ||
      !subjectId ||
      !courseYearId
    )
      return;
    setAssigning(true);
    try {
      await assignMultipleUpdateEvaluationAssignmentRevision({
        profileId: selectedEvaluatorDetId,
        omrSerialNosCsv: selectedOmr.join(","),
        examId,
        subjectId,
        courseYearId,
      });
      toastSuccess("Re-evaluation assignments saved successfully.");
      setSelectedOmr([]);
      await onGetList();
    } catch (error: unknown) {
      toastError(
        error instanceof Error
          ? error.message
          : "Failed to assign re-evaluation answer papers.",
      );
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
    const id = evaluatorProfileId(row);
    const base = omrRowsRef.current.filter((x) => evaluatorProfileId(x) === id);
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
            onChange={(v) => applyCourse(v ? Number(v) : null)}
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
          label="Exam Year"
          className="global-filter-field--fx15"
        >
          <Select
            value={academicYearId ? String(academicYearId) : null}
            onChange={(v) => applyAcademicYear(v ? Number(v) : null)}
            options={academicYears.map(
              (a) =>
                ({
                  value: String(
                    pickNum(a, ["fk_academic_year_id", "academicYearId"]),
                  ),
                  label: pickText(a, ["academic_year", "academicYear"]),
                }) as SelectOption,
            )}
            placeholder="Exam Year"
            disabled={!courseId}
          />
        </GlobalFilterField>
        <GlobalFilterField label="Exam" className="global-filter-field--fx69">
          <Select
            value={examId ? String(examId) : null}
            onChange={(v) => applyExam(v ? Number(v) : null)}
            options={examOptions}
            placeholder="Exam"
            searchable
            disabled={!academicYearId}
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
            onChange={(v) =>
              applyCourseYear(v ? Number(v) : null, restRows, {
                courseId: Number(courseId),
                academicYearId: Number(academicYearId),
                examId: Number(examId),
              })
            }
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
            disabled={!examId}
          />
        </GlobalFilterField>
        <GlobalFilterField
          label="Regulation"
          className="global-filter-field--fx15"
        >
          <Select
            value={regulationId ? String(regulationId) : null}
            onChange={(v) =>
              applyRegulation(v ? Number(v) : null, {
                courseId: Number(courseId),
                academicYearId: Number(academicYearId),
                examId: Number(examId),
                courseYearId: Number(courseYearId),
              })
            }
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
            disabled={!courseYearId}
          />
        </GlobalFilterField>
        <GlobalFilterField
          label="Subject"
          className="global-filter-field--fx49"
        >
          <Select
            value={subjectId ? String(subjectId) : null}
            onChange={(v) => {
              resetFetchedState();
              setSubjectId(v ? Number(v) : null);
            }}
            options={subjects.map((s) => {
              const label = subjectSelectLabel(s);
              const groupNames = pickText(s, ["groupNames"]);
              return {
                value: String(pickNum(s, ["fk_subject_id", "subjectId"])),
                label,
                title: label,
                description: groupNames || undefined,
              } as SelectOption;
            })}
            placeholder="Subject"
            searchable
            disabled={!regulationId}
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
            className="h-10 shrink-0 w-full"
          >
            Get List
          </Button>
        </GlobalFilterField>
      </GlobalFilterBarRow>
      {hasFetched ? (
        <p className=" mt-5 px-1 text-[15px] font-bold text-foreground">
          Total Students :{" "}
          <span className="font-bold text-red-600">{totalStudents}</span> |
          No.Of AnswerPapers Uploaded :{" "}
          <span className="font-bold text-red-600">{uploaded}</span> |
          UnAssigned :{" "}
          <span className="font-bold text-red-600">{unassigned}</span> |
          Assigned : <span className="font-bold text-red-600">{assigned}</span>{" "}
          | No of Evaluators :{" "}
          <span className="font-bold text-red-600">{evaluatorRows.length}</span>
        </p>
      ) : null}
    </>
  );

  return (
    <FilteredPage
      title="Re-Evaluation Multi Assign"
      filters={filterFields}
      filtersDefaultOpen
      body={
        hasFetched ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
              <ReevalPanel
                title="Evaluator List / Assigned Count"
                icon={Users}
                className="md:col-span-3"
              >
                {evaluatorRows.length === 0 ? (
                  <ReevalEmpty
                    icon={Users}
                    title="No evaluator selected"
                    description="Select an evaluator to view assigned count."
                  />
                ) : (
                  <div className="max-h-[280px] space-y-1 overflow-auto p-2">
                    {evaluatorRows.map((e, idx) => {
                      const assignId = evaluatorAssignId(e);
                      const checked =
                        hasEvaluatorSelected &&
                        selectedEvaluatorDetId === assignId;
                      return (
                        <label
                          key={`ev-${assignId || "x"}-${idx}`}
                          className={cn(
                            "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-[12px] transition-colors",
                            checked
                              ? "bg-[#0c51a4]/10 text-[#0c51a4]"
                              : "hover:bg-muted/50",
                          )}
                        >
                          <input
                            type="radio"
                            name="re-evaluation-multi-evaluator"
                            value={assignId > 0 ? String(assignId) : ""}
                            checked={checked}
                            disabled={assignId <= 0}
                            onChange={() => {
                              if (assignId <= 0) return;
                              setSelectedEvaluatorDetId(assignId);
                              setSelectedOmr([]);
                            }}
                          />
                          <span>
                            {pickText(e, ["evaluator_name", "evaluatorName"])} /
                            ({pickNum(e, ["no_of_students_assigned"])})
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </ReevalPanel>

              <div className="flex min-h-[320px] flex-col overflow-hidden rounded-lg border border-border/80 bg-card md:col-span-5">
                <div className="flex items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
                  <SearchInput
                    value={omrSearch}
                    onChange={setOmrSearch}
                    placeholder="Search evaluator..."
                    className="w-full max-w-sm"
                  />
                  <span className="shrink-0 text-[12px] font-semibold text-[#0c51a4]">
                    Total :{" "}
                    {hasEvaluatorSelected ? assignableStudents.length : 0}
                  </span>
                </div>
                <div className="flex min-h-0 flex-1 flex-col">
                  <div className="max-h-[280px] flex-1 overflow-auto">
                    <table className="w-full text-[12px]">
                      <thead>
                        <tr className="bg-sky-50 text-[#0c51a4]">
                          <th className="w-14 px-2 py-2 text-left font-semibold">
                            <label className="inline-flex items-center gap-1 font-semibold">
                              <input
                                type="checkbox"
                                checked={areAllVisibleSelected}
                                disabled={
                                  !hasEvaluatorSelected ||
                                  visibleAssignableOmrs.length === 0
                                }
                                onChange={() => toggleSelectAllVisible()}
                              />
                              All
                            </label>
                          </th>
                          <th className="px-2 py-2 text-left font-semibold">
                            Serial No
                          </th>
                          <th className="px-2 py-2 text-center font-semibold">
                            Answer Papers Assigned
                          </th>
                          <th className="px-2 py-2 text-left font-semibold">
                            Evaluated Total Marks
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {!hasEvaluatorSelected ? (
                          <tr>
                            <td colSpan={4} className="p-0">
                              <ReevalEmpty
                                icon={FileText}
                                title="Select an evaluator"
                                description="Select an evaluator to list OMR sheets."
                              />
                            </td>
                          </tr>
                        ) : assignableStudents.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="p-0">
                              <ReevalEmpty
                                icon={FileText}
                                title="No OMR sheets found"
                                description="No assignable OMR sheets for this evaluator."
                              />
                            </td>
                          </tr>
                        ) : (
                          assignableStudents.map((s, idx) => {
                            const omr = String(s?.omr_serial_no ?? "");
                            const disabled = isOmrDisabledFor(
                              s,
                              selectedEvaluatorProfileId,
                            );
                            const checked = selectedOmr.includes(omr);
                            return (
                              <tr
                                key={`omr-${omr}-${idx}`}
                                className={cn(
                                  "border-t border-border/60",
                                  disabled && "opacity-50",
                                )}
                              >
                                <td className="px-2 py-1.5">
                                  <input
                                    type="checkbox"
                                    disabled={disabled}
                                    checked={checked}
                                    onChange={(e) =>
                                      toggleOmrSelection(omr, e.target.checked)
                                    }
                                  />
                                </td>
                                <td className="px-2 py-1.5">{omr || "-"}</td>
                                <td className="px-2 py-1.5 text-center">
                                  {Number(s?.omr_mapped ?? 0)}
                                </td>
                                <td className="px-2 py-1.5">
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
                  <div className="flex items-center justify-end border-t border-border/60 px-3 py-2">
                    <span className="text-[12px] font-semibold text-[#0c51a4]">
                      Selected : {selectedOmr.length}
                    </span>
                  </div>
                </div>
              </div>

              <ReevalPanel
                title={`Selected (${selectedOmr.length})`}
                icon={SquareCheck}
                className="md:col-span-2"
              >
                {selectedOmr.length === 0 ? (
                  <ReevalEmpty
                    icon={SquareCheck}
                    title="No items selected"
                    description="Selected OMR sheets will appear here."
                  />
                ) : (
                  <div className="max-h-[280px] space-y-1 overflow-auto p-2">
                    {selectedOmr.map((omr) => (
                      <div
                        key={`sel-${omr}`}
                        className="rounded-md bg-[#0c51a4]/5 px-2 py-1 text-[12px] font-medium text-[#0c51a4]"
                      >
                        {omr}
                      </div>
                    ))}
                  </div>
                )}
              </ReevalPanel>

              <ReevalPanel
                title={`Assigned OMR List (${alreadyAssignedStudents.length})`}
                icon={FileText}
                className="md:col-span-2"
              >
                {alreadyAssignedStudents.length === 0 ? (
                  <ReevalEmpty
                    icon={FileText}
                    title="No OMR sheets assigned"
                    description="Assigned OMR sheets will appear here."
                  />
                ) : (
                  <div className="max-h-[280px] space-y-1 overflow-auto p-2">
                    {alreadyAssignedStudents.map((s) => {
                      const omr = String(s?.omr_serial_no ?? "");
                      return (
                        <div
                          key={`as-${omr}`}
                          className="rounded-md bg-[#0c51a4]/5 px-2 py-1 text-[12px] font-medium text-[#0c51a4]"
                        >
                          {omr}
                        </div>
                      );
                    })}
                  </div>
                )}
              </ReevalPanel>
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
            pdfDocumentTitle: "Re-Evaluation Multi Assign",
            exportExcel: false,
            exportPdf: false,
          }}
        />
      ) : null}

      <Dialog open={popupOpen} onOpenChange={setPopupOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="text-[16px] font-semibold text-[#0c51a4]">
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
