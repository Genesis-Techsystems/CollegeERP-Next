"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  FileText,
  GraduationCap,
  ListChecks,
  UserPlus,
  UserRound,
  Users,
} from "lucide-react";
import { FilteredPage } from "@/components/layout";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/common/components/search";
import { Select } from "@/common/components/select";
import {
  getEvaluatorAssignmentBundleByFlag,
  getRegSupBaseFilters,
  getRegSupRestFilters,
  getRegSupSubjectFilters,
  reassignEvaluationAssignment,
  updateReevaluationCount,
} from "@/services/evaluation";
import { clearProcGetCache } from "@/services/crud";
import {
  dedupeBy,
  num,
  subjectSelectLabel,
  txt,
  withSubjectGroupNames,
} from "@/common/utils/data-helpers";
import { toastSuccess } from "@/lib/toast";
import { cn } from "@/lib/utils";

type AnyRow = Record<string, any>;

function ReassignStat({
  icon: Icon,
  label,
  value,
  valueClassName,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  valueClassName?: string;
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
        <p
          className={cn(
            "text-[18px] font-semibold leading-tight text-[#0c51a4]",
            valueClassName,
          )}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function ReassignPanel({
  title,
  icon: Icon,
  children,
  className,
  showHeader = true,
}: {
  title?: string;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
  showHeader?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[320px] flex-col overflow-hidden rounded-lg border border-border/80 bg-card",
        className,
      )}
    >
      {showHeader && title && Icon ? (
        <div className="flex items-center gap-2 border-b border-border/70 px-3 py-2.5">
          <Icon className="h-4 w-4 shrink-0 text-[#0c51a4]" aria-hidden />
          <p className="text-[13px] font-semibold text-[#0c51a4]">{title}</p>
        </div>
      ) : null}
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}

function ReassignEmpty({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-10 text-center">
      <span className="mb-1 flex h-14 w-14 items-center justify-center rounded-full bg-[#0c51a4]/10 text-[#0c51a4]/80">
        <Icon className="h-7 w-7" aria-hidden />
      </span>
      <p className="text-sm font-semibold text-[#0c51a4]">{title}</p>
      {description ? (
        <p className="max-w-[15rem] text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
      ) : null}
    </div>
  );
}

function profileIdOf(row: AnyRow | null | undefined): number {
  if (!row) return 0;
  return (
    num(row.pk_exam_evaluator_profile_id) ||
    num(row.fk_exam_evaluator_profile_id) ||
    num(row.examEvaluatorProfileId) ||
    num(row.exam_evaluator_profile_id) ||
    num(row.pk_examevaluator_profiledet_id)
  );
}

function assignmentIdOf(row: AnyRow | null | undefined): number {
  if (!row) return 0;
  return (
    num(row.pk_exam_evaluationassignment_id) ||
    num(row.fk_exam_evaluationassignment_id) ||
    num(row.examEvaluationAssignmentId)
  );
}

/** Match student OMR rows to the selected source evaluator (id and/or name). */
function omrRowsForEvaluator(
  students: AnyRow[],
  profileId: number,
  evaluatorName = "",
): AnyRow[] {
  if (!profileId && !evaluatorName) return [];
  const name = evaluatorName.trim().toLowerCase();
  return students.filter((r) => {
    const id = profileIdOf(r);
    if (profileId > 0 && id === profileId) return true;
    if (name && txt(r.evaluator_name).trim().toLowerCase() === name)
      return true;
    return false;
  });
}

export default function ReAssignEvaluatorsPage() {
  const [loading, setLoading] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const [isReevaluation, setIsReevaluation] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [baseRows, setBaseRows] = useState<AnyRow[]>([]);
  const [restRows, setRestRows] = useState<AnyRow[]>([]);
  const [subjectRows, setSubjectRows] = useState<AnyRow[]>([]);
  const [evaluatorRows, setEvaluatorRows] = useState<AnyRow[]>([]);
  const [summaryRows, setSummaryRows] = useState<AnyRow[]>([]);
  const [evaluatorStudents, setEvaluatorStudents] = useState<AnyRow[]>([]);

  const [assignedEvaluators, setAssignedEvaluators] = useState<AnyRow[]>([]);
  const [targetEvaluators, setTargetEvaluators] = useState<AnyRow[]>([]);
  const [omrRows, setOmrRows] = useState<AnyRow[]>([]);

  const [sourceEvaluatorId, setSourceEvaluatorId] = useState<number | null>(
    null,
  );
  const [targetEvaluatorId, setTargetEvaluatorId] = useState<number>(0);
  const [selectedAssignmentIds, setSelectedAssignmentIds] = useState<number[]>(
    [],
  );
  const [checkAllOmr, setCheckAllOmr] = useState(false);

  const [searchSource, setSearchSource] = useState("");
  const [searchOmr, setSearchOmr] = useState("");
  const [searchTarget, setSearchTarget] = useState("");

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
  const restReqSeq = useRef(0);
  const subjectReqSeq = useRef(0);

  function resetPanelOnFilterChange() {
    setShowPanel(false);
    resetSelectionState();
    setErrorMsg("");
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

  const courses = useMemo(
    () => dedupeBy(baseRows, (r) => num(r.fk_course_id)),
    [baseRows],
  );
  const academicYears = useMemo(() => {
    if (!courseId) return [];
    const rows = dedupeBy(
      baseRows.filter((r) => num(r.fk_course_id) === Number(courseId)),
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
          num(r.fk_course_id) === Number(courseId) &&
          num(r.fk_academic_year_id) === Number(academicYearId),
      ),
      (r) => num(r.fk_exam_id),
    );
  }, [baseRows, courseId, academicYearId]);
  const courseYears = useMemo(
    () => dedupeBy(restRows, (r) => num(r.fk_course_year_id)),
    [restRows],
  );
  // Angular selectedCourseYr: regulations only for the selected course year.
  const regulations = useMemo(() => {
    if (!courseYearId) return [];
    return dedupeBy(
      restRows.filter((r) => num(r.fk_course_year_id) === Number(courseYearId)),
      (r) => num(r.fk_regulation_id),
    );
  }, [restRows, courseYearId]);
  const subjects = useMemo(
    () => withSubjectGroupNames(subjectRows),
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
      exams.map((r) => ({
        value: String(num(r.fk_exam_id)),
        label: txt(r.exam_name),
      })),
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
      subjects.map((r) => {
        const label = subjectSelectLabel(r);
        const groupNames = txt(r.groupNames);
        return {
          value: String(num(r.fk_subject_id)),
          label,
          title: label,
          description: groupNames || undefined,
        };
      }),
    [subjects],
  );

  function applyCourse(
    nextCourseId: number | null,
    fromBase: AnyRow[] = baseRows,
  ) {
    resetPanelOnFilterChange();
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
    resetPanelOnFilterChange();
    restReqSeq.current += 1;
    subjectReqSeq.current += 1;
    setAcademicYearId(nextAyId);
    clearBelowAcademicYear();
    if (!nextAyId || !forCourseId) return;
    const examRows = dedupeBy(
      fromBase.filter(
        (r) =>
          num(r.fk_course_id) === Number(forCourseId) &&
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
    resetPanelOnFilterChange();
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
      }).catch(() => []);
      if (seq !== restReqSeq.current) return;
      const rows = Array.isArray(list) ? list : [];
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
    resetPanelOnFilterChange();
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
    resetPanelOnFilterChange();
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
      }).catch(() => []);
      if (seq !== subjectReqSeq.current) return;
      const rows = Array.isArray(list) ? list : [];
      setSubjectRows(rows);
      setSubjectId(num(rows[0]?.fk_subject_id) || null);
    })();
  }

  const filteredSourceEvaluators = useMemo(() => {
    const q = searchSource.trim().toLowerCase();
    if (!q) return assignedEvaluators;
    return assignedEvaluators.filter((r) =>
      txt(r.evaluator_name).toLowerCase().includes(q),
    );
  }, [assignedEvaluators, searchSource]);

  const filteredTargetEvaluators = useMemo(() => {
    const q = searchTarget.trim().toLowerCase();
    if (!q) return targetEvaluators;
    return targetEvaluators.filter((r) =>
      txt(r.evaluator_name).toLowerCase().includes(q),
    );
  }, [targetEvaluators, searchTarget]);

  const sourceEvaluatorOptions = useMemo(
    () =>
      filteredSourceEvaluators.map((r) => ({
        value: String(profileIdOf(r)),
        label: txt(r.evaluator_name),
      })),
    [filteredSourceEvaluators],
  );
  const targetEvaluatorOptions = useMemo(
    () => [
      { value: "0", label: "UnAssigned" },
      ...filteredTargetEvaluators.map((r) => ({
        value: String(profileIdOf(r)),
        label: txt(r.evaluator_name),
      })),
    ],
    [filteredTargetEvaluators],
  );

  const filteredOmrRows = useMemo(() => {
    const q = searchOmr.trim().toLowerCase();
    if (!q) return omrRows;
    return omrRows.filter((r) =>
      txt(r.omr_serial_no).toLowerCase().includes(q),
    );
  }, [omrRows, searchOmr]);

  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const list = await getRegSupBaseFilters(employeeId).catch(() => []);
        const rows = Array.isArray(list) ? list : [];
        setBaseRows(rows);
        const firstCourse = num(rows[0]?.fk_course_id) || null;
        if (firstCourse) applyCourse(firstCourse, rows);
      } finally {
        setLoading(false);
      }
    }
    void init();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Angular getFiltersData() once on mount
  }, [employeeId]);

  function resetSelectionState() {
    setSourceEvaluatorId(null);
    setTargetEvaluatorId(0);
    setSelectedAssignmentIds([]);
    setCheckAllOmr(false);
    setOmrRows([]);
    setAssignedEvaluators([]);
    setTargetEvaluators([]);
    setSearchSource("");
    setSearchOmr("");
    setSearchTarget("");
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
    const previousSourceId = sourceEvaluatorId;
    setLoading(true);
    setErrorMsg("");
    resetSelectionState();
    setShowPanel(true);
    try {
      // Always refresh after re-assign — don't reuse a stale proc cache.
      clearProcGetCache("s_get_examevaluation_bycodes");
      const flag = isReevaluation
        ? "list_evaluatorassignment_list_reevaluation"
        : "list_evaluatorassignment_list";
      const {
        evaluators,
        summary,
        evaluatorStudents: evaluatorStudentsRows,
      } = await getEvaluatorAssignmentBundleByFlag(
        {
          organizationId: organizationId || 1,
          examId,
          courseYearId,
          subjectId,
          regulationId,
          courseId,
          academicYearId,
          employeeId,
        },
        flag,
      );
      setEvaluatorRows(evaluators);
      setSummaryRows(summary);
      setEvaluatorStudents(evaluatorStudentsRows);

      // Angular split: "Assigned Evaluator Names" (source) = AssingedList = due!=0
      // (has pending/incomplete work); "Re-Assign" (target) = UnAssingedList =
      // due==0 (free to take more).
      const assigned: AnyRow[] = [];
      const target: AnyRow[] = [];
      for (const row of evaluators) {
        const due =
          num(row.no_of_students_assigned) -
          num(row.no_of_evaluations_completed);
        if (due !== 0) {
          assigned.push(row);
        } else {
          target.push(row);
        }
      }
      setAssignedEvaluators(assigned);
      setTargetEvaluators(target);

      // After Assign → Get List, restore the source evaluator serial table so it
      // doesn't stay blank until the user re-picks the same name.
      if (previousSourceId && previousSourceId > 0) {
        const source =
          assigned.find((r) => profileIdOf(r) === previousSourceId) ??
          evaluators.find((r) => profileIdOf(r) === previousSourceId);
        if (source) {
          const name = txt(source.evaluator_name);
          const rows = omrRowsForEvaluator(
            evaluatorStudentsRows,
            previousSourceId,
            name,
          );
          setSourceEvaluatorId(previousSourceId);
          setOmrRows(rows);
        }
      }
    } finally {
      setLoading(false);
    }
  }

  function onSourceEvaluatorChange(profileId: number) {
    // Angular selectedEvalutor(): the serial list reloads for the evaluator
    // AND the re-assign target list clears until serials are checked.
    setSourceEvaluatorId(profileId > 0 ? profileId : null);
    setSelectedAssignmentIds([]);
    setCheckAllOmr(false);
    setTargetEvaluators([]);
    setSearchTarget("");
    if (!profileId) {
      setOmrRows([]);
      return;
    }
    const source =
      assignedEvaluators.find((r) => profileIdOf(r) === profileId) ??
      evaluatorRows.find((r) => profileIdOf(r) === profileId);
    const rows = omrRowsForEvaluator(
      evaluatorStudents,
      profileId,
      txt(source?.evaluator_name),
    );
    setOmrRows(rows);
  }

  /** Angular updateSecondEvaluatorList(): rebuild the re-assign target list
   *  from the per-student rows every selection change — evaluators owning any
   *  selected serial are excluded; the rest dedup by evaluator name. */
  function updateSecondEvaluatorList(
    nextSelectedIds: number[],
    omrList: AnyRow[],
  ) {
    const selectedSerials = new Set(
      omrList
        .filter((r) => nextSelectedIds.includes(assignmentIdOf(r)))
        .map((r) => txt(r.omr_serial_no)),
    );
    // Until serials are checked, keep target empty (Angular selectedEvalutor clears UnAssingedList).
    if (selectedSerials.size === 0) {
      setTargetEvaluators([]);
      return;
    }
    const owners = new Set(
      evaluatorStudents
        .filter((s) => selectedSerials.has(txt(s.omr_serial_no)))
        .map((s) => txt(s.evaluator_name)),
    );
    const byName = new Map<string, AnyRow>();
    for (const item of evaluatorStudents) {
      const name = txt(item.evaluator_name);
      if (!name || owners.has(name)) continue;
      byName.set(name, item);
    }
    setTargetEvaluators(Array.from(byName.values()));
  }

  function toggleOmr(assignmentId: number, checked: boolean) {
    if (!assignmentId) return;
    setSelectedAssignmentIds((prev) => {
      const next = checked
        ? [...new Set([...prev, assignmentId])]
        : prev.filter((id) => id !== assignmentId);
      updateSecondEvaluatorList(next, omrRows);
      return next;
    });
  }

  function toggleAllOmr(checked: boolean) {
    // Angular markItems() loops the FULL serial list, not the search-filtered view.
    setCheckAllOmr(checked);
    const next = checked
      ? omrRows.map((r) => assignmentIdOf(r)).filter((id) => id > 0)
      : [];
    setSelectedAssignmentIds(next);
    updateSecondEvaluatorList(next, omrRows);
  }

  async function assign() {
    if (
      !examId ||
      !courseYearId ||
      !subjectId ||
      selectedAssignmentIds.length === 0
    )
      return;
    setErrorMsg("");
    const target =
      targetEvaluators.find((r) => profileIdOf(r) === targetEvaluatorId) ??
      evaluatorRows.find((r) => profileIdOf(r) === targetEvaluatorId);
    const timeTableIds = txt(target?.pk_exam_timetable_det_ids);
    setLoading(true);
    try {
      await reassignEvaluationAssignment({
        profileId: targetEvaluatorId,
        examEvaluationAssignmentIdsCsv: selectedAssignmentIds.join(","),
        timetableDetIds: timeTableIds,
        examId,
        subjectId,
        courseYearId,
      });
      if (isReevaluation) {
        await updateReevaluationCount({ examId, subjectId, courseYearId });
      }
      toastSuccess("Answer papers re-assigned successfully.");
      await getList();
    } catch (error) {
      setErrorMsg(
        error instanceof Error
          ? error.message
          : "Failed to assign selected answer papers.",
      );
    } finally {
      setLoading(false);
    }
  }

  const summary = summaryRows[0] ?? {};

  return (
    <FilteredPage
      title="Re-Assign Evaluator"
      filters={
        <>
          <GlobalFilterBarRow className="global-filter-bar__row--eval-mod-r1">
            <GlobalFilterField
              label="Course"
              className="global-filter-field--fx15"
            >
              <Select
                value={courseId ? String(courseId) : null}
                onChange={(v) => applyCourse(num(v) || null)}
                options={courseOptions}
                placeholder="Course"
              />
            </GlobalFilterField>
            <GlobalFilterField
              label="Exam Year"
              className="global-filter-field--fx15"
            >
              <Select
                value={academicYearId ? String(academicYearId) : null}
                onChange={(v) => applyAcademicYear(num(v) || null)}
                options={academicYearOptions}
                placeholder="Exam Year"
                disabled={!courseId}
              />
            </GlobalFilterField>
            <GlobalFilterField
              label="Exam"
              className="global-filter-field--fx69"
            >
              <Select
                value={examId ? String(examId) : null}
                onChange={(v) => applyExam(num(v) || null)}
                options={examOptions}
                placeholder="Exam"
                searchable
                disabled={!academicYearId}
              />
            </GlobalFilterField>
          </GlobalFilterBarRow>
          <GlobalFilterBarRow className="global-filter-bar__row--reassign-r2">
            <GlobalFilterField
              label="Course Year"
              className="global-filter-field--fx15"
            >
              <Select
                value={courseYearId ? String(courseYearId) : null}
                onChange={(v) =>
                  applyCourseYear(num(v) || null, restRows, {
                    courseId: Number(courseId),
                    academicYearId: Number(academicYearId),
                    examId: Number(examId),
                  })
                }
                options={courseYearOptions}
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
                  applyRegulation(num(v) || null, {
                    courseId: Number(courseId),
                    academicYearId: Number(academicYearId),
                    examId: Number(examId),
                    courseYearId: Number(courseYearId),
                  })
                }
                options={regulationOptions}
                placeholder="Regulation"
                disabled={!courseYearId}
              />
            </GlobalFilterField>
            <GlobalFilterField
              label="Subject"
              className="global-filter-field--fx40"
            >
              <Select
                value={subjectId ? String(subjectId) : null}
                onChange={(v) => {
                  resetPanelOnFilterChange();
                  setSubjectId(num(v) || null);
                }}
                options={subjectOptions}
                placeholder="Subject"
                searchable
                disabled={!regulationId}
              />
            </GlobalFilterField>
            <GlobalFilterField
              label="Is Re-Evaluation"
              className="global-filter-field--fx15"
            >
              <label className="inline-flex h-[30px] items-center gap-2 text-[12px]">
                <input
                  type="checkbox"
                  checked={isReevaluation}
                  onChange={(e) => {
                    resetPanelOnFilterChange();
                    setIsReevaluation(e.target.checked);
                  }}
                />
                <span>Is Re-Evaluation</span>
              </label>
            </GlobalFilterField>
            <GlobalFilterField
              label=" "
              className="global-filter-field--action global-filter-field--fx10"
            >
              <Button
                type="button"
                size="sm"
                onClick={() => void getList()}
                disabled={loading}
                className="h-[30px] w-full shrink-0 px-3 text-[12px]"
              >
                Get List
              </Button>
            </GlobalFilterField>
          </GlobalFilterBarRow>
        </>
      }
      body={
        showPanel ? (
          <div className="space-y-4">
            {errorMsg ? (
              <div className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">
                {errorMsg}
              </div>
            ) : null}

            <div className="flex flex-wrap items-stretch overflow-hidden rounded-lg border border-border/70 bg-card divide-x divide-border/70">
              <ReassignStat
                icon={UserRound}
                label="UnAssigned"
                value={num(summary.UnAssinged)}
              />
              <ReassignStat
                icon={GraduationCap}
                label="Total Students"
                value={num(summary.totalStudents)}
              />
              <ReassignStat
                icon={ListChecks}
                label="Selected Serials"
                value={selectedAssignmentIds.length}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <ReassignPanel title="Assigned Evaluator Names" icon={Users}>
                <div className="space-y-2 border-b border-border/60 p-3">
                  <SearchInput
                    value={searchSource}
                    onChange={setSearchSource}
                    placeholder="Search names..."
                    className="w-full"
                  />
                  <Select
                    value={sourceEvaluatorId ? String(sourceEvaluatorId) : null}
                    onChange={(v) => onSourceEvaluatorChange(num(v))}
                    options={sourceEvaluatorOptions}
                    placeholder="Evaluator Name"
                    searchable
                  />
                </div>
                {!sourceEvaluatorId ? (
                  <ReassignEmpty icon={UserRound} title="Select Evaluators" />
                ) : (
                  <ReassignEmpty
                    icon={UserRound}
                    title={
                      txt(
                        assignedEvaluators.find(
                          (r) => profileIdOf(r) === sourceEvaluatorId,
                        )?.evaluator_name,
                      ) || "Select Evaluators"
                    }
                  />
                )}
              </ReassignPanel>

              <ReassignPanel showHeader={false}>
                <div className="flex items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
                  <SearchInput
                    value={searchOmr}
                    onChange={setSearchOmr}
                    placeholder="Search OMR..."
                    className="w-full max-w-sm"
                  />
                  <span className="shrink-0 text-[12px] font-semibold text-[#0c51a4]">
                    Serial No: {selectedAssignmentIds.length}
                  </span>
                </div>
                <div className="flex min-h-0 flex-1 flex-col">
                  <div className="max-h-[340px] flex-1 overflow-auto">
                    <table className="w-full text-[12px]">
                      <thead>
                        <tr className="bg-sky-50 text-[#0c51a4]">
                          <th className="w-[20%] px-2 py-2 text-left font-semibold">
                            <label className="inline-flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={checkAllOmr}
                                onChange={(e) => toggleAllOmr(e.target.checked)}
                                disabled={
                                  !sourceEvaluatorId || omrRows.length === 0
                                }
                              />
                              <span>All</span>
                            </label>
                          </th>
                          <th className="px-2 py-2 text-left font-semibold">
                            Serial No
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredOmrRows.length === 0 ? (
                          <tr>
                            <td colSpan={2} className="p-0">
                              <ReassignEmpty
                                icon={FileText}
                                title={
                                  sourceEvaluatorId
                                    ? "No OMR serials found"
                                    : "Select an assigned evaluator"
                                }
                                description={
                                  sourceEvaluatorId
                                    ? "No OMR serials for this evaluator."
                                    : "Select an assigned evaluator to load serials."
                                }
                              />
                            </td>
                          </tr>
                        ) : (
                          filteredOmrRows.map((r, i) => {
                            const assignmentId = assignmentIdOf(r);
                            const checked =
                              selectedAssignmentIds.includes(assignmentId);
                            return (
                              <tr
                                key={`${assignmentId}-${txt(r.omr_serial_no)}-${i}`}
                                className="border-t border-border/60"
                              >
                                <td className="px-2 py-1.5">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    disabled={!assignmentId}
                                    onChange={(e) =>
                                      toggleOmr(assignmentId, e.target.checked)
                                    }
                                  />
                                </td>
                                <td className="px-2 py-1.5">
                                  {txt(r.omr_serial_no)} (
                                  {txt(r.evaluationstatus) || "-"})
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </ReassignPanel>

              <ReassignPanel title="Re-Assign Evaluator Names" icon={UserPlus}>
                <div className="space-y-2 border-b border-border/60 p-3">
                  <SearchInput
                    value={searchTarget}
                    onChange={setSearchTarget}
                    placeholder="Search names..."
                    className="w-full"
                  />
                  <Select
                    value={String(targetEvaluatorId)}
                    onChange={(v) => setTargetEvaluatorId(num(v))}
                    options={targetEvaluatorOptions}
                    placeholder="Evaluator Name"
                    searchable
                  />
                </div>
                {targetEvaluatorId === 0 ? (
                  <ReassignEmpty icon={UserPlus} title="Select Evaluators" />
                ) : (
                  <ReassignEmpty
                    icon={UserPlus}
                    title={
                      txt(
                        targetEvaluators.find(
                          (r) => profileIdOf(r) === targetEvaluatorId,
                        )?.evaluator_name,
                      ) || "Select Evaluators"
                    }
                  />
                )}
              </ReassignPanel>
            </div>

            <div className="flex justify-end">
              <Button
                type="button"
                onClick={() => void assign()}
                disabled={loading || selectedAssignmentIds.length === 0}
                className="gap-1.5"
              >
                Assign
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Button>
            </div>
          </div>
        ) : undefined
      }
    />
  );
}
