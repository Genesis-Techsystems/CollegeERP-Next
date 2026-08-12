"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { ColDef } from "ag-grid-community";
import type { LucideIcon } from "lucide-react";
import {
  CloudUpload,
  FileText,
  GraduationCap,
  SquareCheck,
  User,
  UserMinus,
  Users,
} from "lucide-react";
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
  assignMultipleUpdateEvaluationAssignment,
  getMultiEvaluatorAssignBundle,
  getRegSupBaseFilters,
  getRegSupRestFilters,
  getRegSupSubjectFilters,
} from "@/services/evaluation";
import { FilteredPage } from "@/components/layout";
import {
  dedupeBy,
  num,
  subjectSelectLabel,
  txt,
  withSubjectGroupNames,
} from "@/common/utils/data-helpers";
import { cn } from "@/lib/utils";

type AnyRow = Record<string, unknown>;

function MultiStat({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
}) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0c51a4]/10 text-[#0c51a4]">
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[12px] font-medium text-[#0c51a4]">
          {label}
        </p>
        <p className="text-[18px] font-semibold leading-tight text-[#0c51a4]">
          {value}
        </p>
      </div>
    </div>
  );
}

function MultiPanel({
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

function MultiEmpty({
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

function makeAssignedRenderer(
  onOpen: (
    row: AnyRow,
    listType: "AssignedList" | "CompletedList" | "DueList",
  ) => void,
) {
  return (p: { data?: AnyRow }) => {
    const row = p.data ?? {};
    const count = num(row.no_of_students_assigned);
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
    const count = num(row.no_of_evaluations_completed);
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
      num(row.no_of_students_assigned) - num(row.no_of_evaluations_completed);
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

export default function MultiEvaluatorAssignPage() {
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
  const exams = useMemo(() => {
    if (!courseId || !academicYearId) return [];
    return dedupeBy(
      baseRows.filter(
        (r) =>
          num(r.fk_course_id) === num(courseId) &&
          num(r.fk_academic_year_id) === num(academicYearId),
      ),
      (r) => num(r.fk_exam_id),
    );
  }, [baseRows, courseId, academicYearId]);
  const courseYears = useMemo(
    () => dedupeBy(restRows, (r) => num(r.fk_course_year_id)),
    [restRows],
  );
  // Angular selectedCourseYr: regulations only from rest rows for the selected course year.
  // Guard !courseYearId so num(null)===0 never matches stray rows after refresh/cascade.
  const regulations = useMemo(() => {
    if (!courseYearId) return [];
    return dedupeBy(
      restRows.filter((r) => num(r.fk_course_year_id) === num(courseYearId)),
      (r) => num(r.fk_regulation_id),
    );
  }, [restRows, courseYearId]);
  const subjects = useMemo(
    () => withSubjectGroupNames(subjectRows),
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

  /** Angular selectedCourse → auto AY[0] → selectedAcademicYear. */
  function applyCourse(nextCourseId: number | null) {
    resetFetchedState();
    restReqSeq.current += 1;
    subjectReqSeq.current += 1;
    setCourseId(nextCourseId);
    clearBelowCourse();
    if (!nextCourseId) return;
    const ayRows = dedupeBy(
      baseRows.filter((r) => num(r.fk_course_id) === nextCourseId),
      (r) => num(r.fk_academic_year_id),
    );
    const sorted = [...ayRows].sort(
      (a, b) =>
        parseInt(txt(b.academic_year) || "0", 10) -
        parseInt(txt(a.academic_year) || "0", 10),
    );
    const firstAy = num(sorted[0]?.fk_academic_year_id) || null;
    if (firstAy) applyAcademicYear(firstAy, nextCourseId);
  }

  /** Angular selectedAcademicYear → auto exam[0] → selectedExam. */
  function applyAcademicYear(nextAyId: number | null, forCourseId = courseId) {
    resetFetchedState();
    restReqSeq.current += 1;
    subjectReqSeq.current += 1;
    setAcademicYearId(nextAyId);
    clearBelowAcademicYear();
    if (!nextAyId || !forCourseId) return;
    const examRows = dedupeBy(
      baseRows.filter(
        (r) =>
          num(r.fk_course_id) === num(forCourseId) &&
          num(r.fk_academic_year_id) === nextAyId,
      ),
      (r) => num(r.fk_exam_id),
    );
    const firstExam = num(examRows[0]?.fk_exam_id) || null;
    if (firstExam) applyExam(firstExam, forCourseId, nextAyId);
  }

  /** Angular selectedExam → load rest filters → course year[0] → selectedCourseYr. */
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

  /** Angular selectedCourseYr → regulations for that course year only → regulation[0]. */
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

  /** Angular selectedRegulation → load subjects for course+AY+exam+year+regulation. */
  function applyRegulation(
    nextRegId: number | null,
    ctx?: Partial<CascadeCtx>,
  ) {
    resetFetchedState();
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
    })();
  }

  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const rows = await getRegSupBaseFilters(employeeId);
        setBaseRows(rows);
        const firstCourse = num(rows[0]?.fk_course_id) || null;
        if (!firstCourse) return;

        setCourseId(firstCourse);
        clearBelowCourse();
        const ayRows = dedupeBy(
          rows.filter((r) => num(r.fk_course_id) === firstCourse),
          (r) => num(r.fk_academic_year_id),
        );
        const sorted = [...ayRows].sort(
          (a, b) =>
            parseInt(txt(b.academic_year) || "0", 10) -
            parseInt(txt(a.academic_year) || "0", 10),
        );
        const firstAy = num(sorted[0]?.fk_academic_year_id) || null;
        if (!firstAy) return;

        setAcademicYearId(firstAy);
        clearBelowAcademicYear();
        const examRows = dedupeBy(
          rows.filter(
            (r) =>
              num(r.fk_course_id) === firstCourse &&
              num(r.fk_academic_year_id) === firstAy,
          ),
          (r) => num(r.fk_exam_id),
        );
        const firstExam = num(examRows[0]?.fk_exam_id) || null;
        if (!firstExam) return;

        setExamId(firstExam);
        clearBelowExam();
        const seq = ++restReqSeq.current;
        const rest = await getRegSupRestFilters({
          courseId: firstCourse,
          academicYearId: firstAy,
          examId: firstExam,
          employeeId,
        }).catch(() => [] as AnyRow[]);
        if (seq !== restReqSeq.current) return;

        setRestRows(rest);
        const years = dedupeBy(rest, (r) => num(r.fk_course_year_id));
        const firstYear = num(years[0]?.fk_course_year_id) || null;
        if (!firstYear) return;

        setCourseYearId(firstYear);
        clearBelowCourseYear();
        const regs = dedupeBy(
          rest.filter((r) => num(r.fk_course_year_id) === firstYear),
          (r) => num(r.fk_regulation_id),
        );
        const firstReg = num(regs[0]?.fk_regulation_id) || null;
        if (!firstReg) return;

        setRegulationId(firstReg);
        clearBelowRegulation();
        const subSeq = ++subjectReqSeq.current;
        const subs = await getRegSupSubjectFilters({
          courseId: firstCourse,
          academicYearId: firstAy,
          examId: firstExam,
          courseYearId: firstYear,
          regulationId: firstReg,
          employeeId,
        }).catch(() => [] as AnyRow[]);
        if (subSeq !== subjectReqSeq.current) return;
        setSubjectRows(subs);
      } finally {
        setLoading(false);
      }
    }
    void init();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount/employeeId only; cascade is explicit
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
          : "Failed to load evaluator assignment data.",
      );
    } finally {
      setLoading(false);
    }
  }

  const totals = totalsRows[0] ?? {};
  const totalStudents = num(totals.totalStudents);
  const uploaded = num(totals.NoOfAnswerpapersUploaded);
  const unassigned = num(totals.UnAssinged);
  const assigned = Math.max(uploaded - unassigned, 0);

  const uploadedStudents = useMemo(
    () => studentRows.filter((s) => num(s.is_answerpaper_uploaded) === 1),
    [studentRows],
  );

  function evaluatorProfileId(row: AnyRow): number {
    return (
      num(row.pk_exam_evaluator_profile_id) ||
      num(row.fk_exam_evaluator_profile_id) ||
      num(row.exam_evaluator_profile_id)
    );
  }

  function evaluatorProfileDetId(row: AnyRow): number {
    return (
      num(row.pk_examevaluator_profiledet_id) ||
      num(row.pk_exam_evaluator_profiledet_id)
    );
  }

  /**
   * Radio / Assign id — prefer profiledet (unique per row); fall back to profile id.
   * Never treat missing ids as 0 for selection matching (that selects every row).
   */
  function evaluatorAssignId(row: AnyRow): number {
    return evaluatorProfileDetId(row) || evaluatorProfileId(row);
  }

  const selectedEvaluator = useMemo(() => {
    if (selectedEvaluatorDetId == null || selectedEvaluatorDetId <= 0) {
      return null;
    }
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
    isExcludedFor(s, evaluatorId) || num(s.disable_omr) === 1;

  const alreadyAssignedStudents = useMemo(() => {
    // Angular assignedOmrList is built only inside radioChange
    if (!hasEvaluatorSelected || !selectedEvaluatorProfileId) return [];
    const fromExclude = uploadedStudents.filter((s) =>
      isExcludedFor(s, selectedEvaluatorProfileId),
    );
    if (fromExclude.length > 0) return fromExclude;

    const fromOmrBundle = omrRows.filter(
      (r) =>
        evaluatorProfileId(r) === selectedEvaluatorProfileId &&
        Boolean(txt(r.omr_serial_no)),
    );
    if (fromOmrBundle.length === 0) return [];

    const omrSet = new Set(fromOmrBundle.map((r) => txt(r.omr_serial_no)));
    const matchedStudents = uploadedStudents.filter((r) =>
      omrSet.has(txt(r.omr_serial_no)),
    );
    return matchedStudents.length > 0 ? matchedStudents : fromOmrBundle;
  }, [
    uploadedStudents,
    omrRows,
    selectedEvaluatorProfileId,
    hasEvaluatorSelected,
  ]);

  // Angular: maintDataList stays empty until radioChange(evaluator)
  const visibleStudents = useMemo(() => {
    if (!hasEvaluatorSelected || !selectedEvaluatorProfileId) return [];
    const q = omrSearch.trim().toLowerCase();
    const base = q
      ? uploadedStudents.filter((s) =>
          txt(s.omr_serial_no).toLowerCase().includes(q),
        )
      : uploadedStudents;
    return [...base].sort((a, b) => {
      const aDisabled = isOmrDisabledFor(a, selectedEvaluatorProfileId);
      const bDisabled = isOmrDisabledFor(b, selectedEvaluatorProfileId);
      if (aDisabled !== bDisabled) return aDisabled ? 1 : -1;
      return num(a.omr_mapped) - num(b.omr_mapped);
    });
  }, [
    uploadedStudents,
    omrSearch,
    selectedEvaluatorProfileId,
    hasEvaluatorSelected,
  ]);

  const assignableStudents = visibleStudents;
  const visibleAssignableOmrs = useMemo(
    () =>
      visibleStudents
        .filter((s) => !isOmrDisabledFor(s, selectedEvaluatorProfileId))
        .map((s) => txt(s.omr_serial_no))
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
      await assignMultipleUpdateEvaluationAssignment({
        profileId: selectedEvaluatorDetId,
        omrSerialNosCsv: selectedOmr.join(","),
        examId,
        subjectId,
        courseYearId,
      });
      toastSuccess("Answer papers assigned successfully.");
      setSelectedOmr([]);
      await onGetList();
    } catch (error: unknown) {
      toastError(
        error instanceof Error
          ? error.message
          : "Failed to assign answer papers.",
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
      const serial = txt(r.omr_serial_no).toLowerCase();
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
          num(p.data?.no_of_students_assigned) -
          num(p.data?.no_of_evaluations_completed),
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
                  value: String(num(c.fk_course_id)),
                  label: txt(c.course_code),
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
            onChange={(v) => applyAcademicYear(v ? Number(v) : null)}
            options={academicYears.map(
              (a) =>
                ({
                  value: String(num(a.fk_academic_year_id)),
                  label: txt(a.academic_year),
                }) as SelectOption,
            )}
            placeholder="Academic Year"
            disabled={!courseId}
          />
        </GlobalFilterField>
        <GlobalFilterField label="Exam" className="global-filter-field--fx69">
          <Select
            value={examId ? String(examId) : null}
            onChange={(v) => applyExam(v ? Number(v) : null)}
            options={exams.map(
              (e) =>
                ({
                  value: String(num(e.fk_exam_id)),
                  label: txt(e.exam_name),
                }) as SelectOption,
            )}
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
                courseId: num(courseId),
                academicYearId: num(academicYearId),
                examId: num(examId),
              })
            }
            options={courseYears.map(
              (y) =>
                ({
                  value: String(num(y.fk_course_year_id)),
                  label: txt(y.course_year_code),
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
                courseId: num(courseId),
                academicYearId: num(academicYearId),
                examId: num(examId),
                courseYearId: num(courseYearId),
              })
            }
            options={regulations.map(
              (r) =>
                ({
                  value: String(num(r.fk_regulation_id)),
                  label: txt(r.regulation_code),
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
              const groupNames = txt(s.groupNames);
              return {
                value: String(num(s.fk_subject_id)),
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
    </>
  );

  return (
    <FilteredPage
      title="Assign Multi Evaluator"
      filters={filterFields}
      filtersDefaultOpen
      body={
        hasFetched ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-stretch overflow-hidden rounded-lg border border-border/70 bg-card divide-x divide-border/70">
              <MultiStat
                icon={GraduationCap}
                label="Total Students"
                value={totalStudents}
              />
              <MultiStat icon={CloudUpload} label="Uploaded" value={uploaded} />
              <MultiStat
                icon={UserMinus}
                label="UnAssigned"
                value={unassigned}
              />
              <MultiStat icon={Users} label="Assigned" value={assigned} />
              <MultiStat
                icon={User}
                label="No of Evaluators"
                value={evaluatorRows.length}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
              <MultiPanel
                title="Evaluator List / Assigned Count"
                icon={Users}
                className="md:col-span-3"
              >
                {evaluatorRows.length === 0 ? (
                  <MultiEmpty
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
                            name="multi-evaluator"
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
                            {txt(e.evaluator_name)} / (
                            {num(e.no_of_students_assigned)})
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </MultiPanel>

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
                              <MultiEmpty
                                icon={FileText}
                                title="Select an evaluator"
                                description="Select an evaluator to list OMR sheets."
                              />
                            </td>
                          </tr>
                        ) : assignableStudents.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="p-0">
                              <MultiEmpty
                                icon={FileText}
                                title="No OMR sheets found"
                                description="No assignable OMR sheets for this evaluator."
                              />
                            </td>
                          </tr>
                        ) : (
                          assignableStudents.map((s, idx) => {
                            const omr = txt(s.omr_serial_no);
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
                                  {num(s.omr_mapped)}
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

              <MultiPanel
                title={`Selected (${selectedOmr.length})`}
                icon={SquareCheck}
                className="md:col-span-2"
              >
                {selectedOmr.length === 0 ? (
                  <MultiEmpty
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
              </MultiPanel>

              <MultiPanel
                title={`Assigned OMR List (${alreadyAssignedStudents.length})`}
                icon={FileText}
                className="md:col-span-2"
              >
                {alreadyAssignedStudents.length === 0 ? (
                  <MultiEmpty
                    icon={FileText}
                    title="No OMR sheets assigned"
                    description="Assigned OMR sheets will appear here."
                  />
                ) : (
                  <div className="max-h-[280px] space-y-1 overflow-auto p-2">
                    {alreadyAssignedStudents.map((s) => {
                      const omr = txt(s.omr_serial_no);
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
              </MultiPanel>
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
            pdfDocumentTitle: "Assign Multi Evaluator",
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
