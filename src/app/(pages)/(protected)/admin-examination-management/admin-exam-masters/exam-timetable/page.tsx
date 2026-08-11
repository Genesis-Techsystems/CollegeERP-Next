"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select } from "@/common/components/select";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
  ActiveStatusField,
} from "@/common/components/forms";
import { distinct } from "@/lib/utils";
import {
  getUnivExamFiltersAll,
  getUnivExamFiltersGroupForLogin,
  resolveExamLoginEmpId,
  getExamFiltersNoTimetableBundle,
  getExamTimetableDetails,
  listCourseYears,
  listExamFeeTypeGeneralDetails,
  saveExamTimetableDetailsByExamDate,
} from "@/services/examination";
import { useSessionContext } from "@/context/SessionContext";
import type { SessionUser } from "@/types/user";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldAlert, GraduationCap, Calendar, ScrollText } from "lucide-react";
import { FilteredPage } from "@/components/layout";
import { toastError, toastInfo, toastSuccess } from "@/lib/toast";
import CheckConflictsModal from "./CheckConflictsModal";

/**
 * Exam Admin (and similar exam-scoped logins) — not ADMIN/SUPERADMIN.
 * Those users must only see login-scoped `univ_exam_*` filter rows.
 */
function isExamAdminLogin(user: SessionUser | null | undefined): boolean {
  if (!user) return false;
  if (user.isAdmin) return false;
  const blob = [user.userRole, user.roleName]
    .map((s) =>
      String(s ?? "")
        .toUpperCase()
        .replace(/[\s_-]+/g, ""),
    )
    .join(" ");
  return (
    blob.includes("EXAMADMIN") ||
    blob.includes("EXAMINATIONADMIN") ||
    blob.includes("EXAMCONTROLLER")
  );
}

function pickAyId(row: any): number {
  return Number(
    row?.fk_academic_year_id ??
      row?.academicYearId ??
      row?.fk_academicYearId ??
      0,
  );
}

/** Angular `tConvert` — 24h → 12h AM/PM for exam session times. */
function tConvert(time?: string | null): string {
  if (time == null || time === "") return "";
  const match = String(time).match(
    /^([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/,
  );
  if (!match) return String(time);
  const hh = Number(match[1]);
  const mm = match[2];
  const ampm = hh < 12 ? "AM" : "PM";
  const hour12 = hh % 12 || 12;
  return `${hour12}:${mm}${ampm}`;
}

type ExamMasterOption = {
  examId: number;
  examName: string;
  fromDate?: string;
  toDate?: string;
  isRegularExam?: boolean;
  isSupplyExam?: boolean;
  isInternalExam?: boolean;
  universityId?: number;
};

type ExamSessionOption = {
  id: number;
  name: string;
  code: string;
  sessionStartTime?: string;
  sessionEndTime?: string;
};

function formatExamMasterRange(
  ex: Partial<ExamMasterOption> | Record<string, unknown>,
): string {
  const fmt = (v: unknown) => {
    if (v == null || v === "") return "";
    try {
      const d = new Date(String(v));
      if (Number.isNaN(d.getTime())) return String(v);
      return d.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return String(v);
    }
  };
  const row = ex as Record<string, unknown>;
  const a = fmt(
    (ex as ExamMasterOption).fromDate ??
      row.examStartDate ??
      row.examFromDate ??
      row.from_date ??
      row.startDate,
  );
  const b = fmt(
    (ex as ExamMasterOption).toDate ??
      row.examEndDate ??
      row.examToDate ??
      row.to_date ??
      row.endDate,
  );
  if (!a || !b) return "";
  return `(${a} - ${b})`;
}

function formatExamMasterLabel(ex: ExamMasterOption): string {
  const range = formatExamMasterRange(ex);
  const tags: string[] = [];
  if (ex.isInternalExam) tags.push("Internal");
  if (ex.isRegularExam) tags.push("Regular");
  if (ex.isSupplyExam) tags.push("Supple");
  return [ex.examName, range, tags.length ? `(${tags.join("/")})` : ""]
    .filter(Boolean)
    .join(" ");
}

function sessionLabel(s: ExamSessionOption): string {
  const start = tConvert(s.sessionStartTime);
  const end = tConvert(s.sessionEndTime);
  if (start && end) return `${s.name} (${start} - ${end})`;
  return s.name;
}

function sessionCodeToMA(code: string): "M" | "A" {
  return String(code).trim().toUpperCase().startsWith("A") ? "A" : "M";
}

/** Angular `selectedCourseYear`: unique course groups from `univ_exam_rest_filters`. */
function buildCourseGroupsFromFilters(filterRows: any[]): any[] {
  const seen = new Set<number>();
  const out: any[] = [];
  for (const r of filterRows) {
    const gid = Number(
      r.fk_course_group_id ?? r.courseGroupId ?? r.course_group_id ?? 0,
    );
    if (gid <= 0 || seen.has(gid)) continue;
    seen.add(gid);
    const code = String(
      r.group_code ?? r.groupCode ?? r.course_group_code ?? "",
    )
      .trim()
      .toUpperCase();
    out.push({
      fk_course_group_id: gid,
      group_code: code,
      fk_dept_id: gid,
      dept_code: code,
    });
  }
  return out;
}

function examTypeLetter(row: Record<string, unknown>): "R" | "S" | "I" {
  const cat = String(
    row.examTypeCatCode ?? row.exam_type_cat_code ?? row.examType ?? "",
  ).trim();
  if (/suppl/i.test(cat)) return "S";
  if (/internal/i.test(cat)) return "I";
  if (row.isRegular === false || row.is_regular === false) return "S";
  return "R";
}

function rowIsAfternoon(row: Record<string, unknown>): boolean {
  const code = String(
    row.examsessioninCatCode ??
      row.examSessionCode ??
      row.sessionCode ??
      row.session ??
      "",
  )
    .trim()
    .toUpperCase();
  if (code.startsWith("A")) return true;
  return String(row.session ?? "")
    .trim()
    .toUpperCase()
    .startsWith("A");
}

export default function ExamTimetablePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useSessionContext();
  // Filters
  const [loadingFilters, setLoadingFilters] = useState(true);
  const [filtersData, setFiltersData] = useState<any[]>([]);

  const [courses, setCourses] = useState<any[]>([]);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [courseYears, setCourseYears] = useState<any[]>([]);
  const [examMasters, setExamMasters] = useState<ExamMasterOption[]>([]);
  const [examSessions, setExamSessions] = useState<ExamSessionOption[]>([]);

  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<
    number | null
  >(null);
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null);
  const [selectedCourseYearId, setSelectedCourseYearId] = useState<
    number | null
  >(null);
  /** Course years scoped from {@link getExamFiltersNoTimetable} (Angular CollegesListDetails), not raw domain course years only. */
  const [examScopedCourseYears, setExamScopedCourseYears] = useState<
    { courseYearId: number; courseYearName: string }[]
  >([]);

  // Branch rows and date columns
  const [branches, setBranches] = useState<any[]>([]);
  const [dates, setDates] = useState<Date[]>([]);

  const [scheduleMap, setScheduleMap] = useState<Record<string, any>>({});
  const [gridReloadToken, setGridReloadToken] = useState(0);

  const [conflictsOpen, setConflictsOpen] = useState(false);
  const [loadingGrid, setLoadingGrid] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editContext, setEditContext] = useState<{
    branchId: string | number;
    branchCode?: string;
    branchLabel: string;
    dateStr: string;
    session: "M" | "A";
    original: Record<string, unknown>;
  } | null>(null);
  const [editForm, setEditForm] = useState({
    examDate: "",
    examSessionId: null as number | null,
    examTypeCatId: null as number | null,
    isActive: true,
    reason: "",
  });
  /** EXMFEETYP masters — Angular getData / edit getData1 */
  const [examFeeTypes, setExamFeeTypes] = useState<
    { id: number; code: string; name: string }[]
  >([]);

  const examAdminLogin = isExamAdminLogin(user);

  const fetchFilters = useCallback(async () => {
    setLoadingFilters(true);
    try {
      const empId = resolveExamLoginEmpId(user?.employeeId);
      // Exam Admin: only the univ_exam_filters group for this login emp.
      // Admin / others: keep existing flatten + soft flag filter.
      const f = examAdminLogin
        ? await getUnivExamFiltersGroupForLogin(empId)
        : (await getUnivExamFiltersAll(empId)).filter(
            (r: any) => !r.flag || r.flag === "univ_exam_filters",
          );
      setFiltersData(f);
      const distinctCourses = distinct(f ?? [], (r) => r.fk_course_id);
      setCourses(distinctCourses);
      if (distinctCourses.length > 0) {
        const urlCourseId = Number(searchParams.get("courseId") ?? 0);
        const target =
          urlCourseId > 0 &&
          distinctCourses.some((c) => Number(c.fk_course_id) === urlCourseId)
            ? urlCourseId
            : distinctCourses[0].fk_course_id;
        handleCourseChange(target, f);
      } else {
        setCourses([]);
        setAcademicYears([]);
        setExamMasters([]);
        setCourseYears([]);
        setExamScopedCourseYears([]);
      }
    } finally {
      setLoadingFilters(false);
    }
  }, [user?.employeeId, searchParams, examAdminLogin]);

  useEffect(() => {
    fetchFilters();
  }, [fetchFilters]);

  useEffect(() => {
    let cancelled = false;
    async function loadFeeTypes() {
      const rows = await listExamFeeTypeGeneralDetails().catch(() => []);
      if (cancelled) return;
      setExamFeeTypes(
        (Array.isArray(rows) ? rows : [])
          .map((r: any) => ({
            id: Number(r.generalDetailId ?? r.id ?? 0),
            code: String(r.generalDetailCode ?? "").trim(),
            name: String(
              r.generalDetailDisplayName ??
                r.generalDetailName ??
                r.generalDetailCode ??
                "",
            ).trim(),
          }))
          .filter((t) => t.id > 0 && t.code),
      );
    }
    void loadFeeTypes();
    return () => {
      cancelled = true;
    };
  }, []);

  function mapSessionRows(rows: any[]): ExamSessionOption[] {
    const seen = new Set<number>();
    const out: ExamSessionOption[] = [];
    for (const r of Array.isArray(rows) ? rows : []) {
      const id = Number(r.fk_exam_session_id ?? r.examSessionId ?? r.id ?? 0);
      if (id <= 0 || seen.has(id)) continue;
      seen.add(id);
      const name = String(
        r.exam_display_session_name ?? r.examSessionName ?? r.name ?? "",
      ).trim();
      if (!name) continue;
      out.push({
        id,
        name,
        code: String(
          r.examsessioninCatCode ?? r.sessionCode ?? r.session ?? "",
        ).trim(),
        sessionStartTime: r.sessionStartTime
          ? String(r.sessionStartTime)
          : r.session_start_time
            ? String(r.session_start_time)
            : undefined,
        sessionEndTime: r.sessionEndTime
          ? String(r.sessionEndTime)
          : r.session_end_time
            ? String(r.session_end_time)
            : undefined,
      });
    }
    return out;
  }

  // Exam-scoped sessions come from `univ_exam_rest_no_tt` → `exam_sessions`
  // (loaded with course years). Do not call domain ExamSession list.

  // Restore academicYearId from URL once the academic-year list is available.
  useEffect(() => {
    const ayId = Number(searchParams.get("academicYearId") ?? 0);
    if (ayId > 0 && academicYears.some((a: any) => pickAyId(a) === ayId)) {
      setSelectedAcademicYearId(ayId);
    }
  }, [academicYears, searchParams]);

  // Restore examId from URL once exam masters load.
  useEffect(() => {
    const examId = Number(searchParams.get("examId") ?? 0);
    if (
      examId > 0 &&
      examMasters.some((e: any) => Number(e.examId ?? e.id) === examId)
    ) {
      setSelectedExamId(examId);
    }
  }, [examMasters, searchParams]);

  // Restore courseYearId from URL once the effective course-year list resolves.
  useEffect(() => {
    const cyId = Number(searchParams.get("courseYearId") ?? 0);
    if (cyId <= 0) return;
    const list =
      examScopedCourseYears.length > 0 ? examScopedCourseYears : null;
    if (list && list.some((y) => y.courseYearId === cyId)) {
      setSelectedCourseYearId(cyId);
    }
  }, [examScopedCourseYears, searchParams]);

  async function handleCourseChange(courseId: number, fRef = filtersData) {
    setSelectedCourseId(courseId);
    setSelectedAcademicYearId(null);
    setSelectedExamId(null);
    setSelectedCourseYearId(null);
    setExamScopedCourseYears([]);
    setBranches([]);
    setDates([]);

    const filtered = (fRef ?? []).filter(
      (r: any) => Number(r.fk_course_id) === Number(courseId),
    );

    const withAyIds = filtered.filter((r: any) => pickAyId(r) > 0);
    const yearSource = withAyIds.length > 0 ? withAyIds : filtered;
    const distinctYears = distinct(yearSource, (r: any) => pickAyId(r)).sort(
      (a: any, b: any) =>
        Number(String(b.academic_year ?? "").split("-")[0] || 0) -
        Number(String(a.academic_year ?? "").split("-")[0] || 0),
    );
    setAcademicYears(distinctYears);

    // Admin keeps domain CourseYear fallback. Exam Admin uses only
    // login-scoped years from univ_exam_rest_filters (loaded with exam).
    if (examAdminLogin) {
      setCourseYears([]);
    } else {
      const yrs = await listCourseYears(courseId).catch(() => []);
      setCourseYears(Array.isArray(yrs) ? yrs : []);
    }
  }

  useEffect(() => {
    setExamMasters([]);
    setSelectedExamId(null);
    setDates([]);
    setExamScopedCourseYears([]);
    setSelectedCourseYearId(null);
    if (!selectedCourseId || !selectedAcademicYearId) return;
    const rows = filtersData.filter(
      (r: any) =>
        Number(r.fk_course_id) === Number(selectedCourseId) &&
        pickAyId(r) === Number(selectedAcademicYearId),
    );
    const uniqByExam = distinct(rows, (r: any) =>
      Number(r.fk_exam_id ?? r.exam_id ?? r.examId ?? 0),
    );
    const list: ExamMasterOption[] = uniqByExam
      .map((r: any) => ({
        examId: Number(r.fk_exam_id ?? r.exam_id ?? r.examId ?? 0),
        examName: String(
          r.exam_name ??
            r.exam_Name ??
            r.exam_short_name ??
            r.short_name ??
            "—",
        ),
        fromDate:
          String(
            r.from_date ??
              r.fromDate ??
              r.exam_from_date ??
              r.examFromDate ??
              "",
          ).trim() || undefined,
        toDate:
          String(
            r.to_date ?? r.toDate ?? r.exam_to_date ?? r.examToDate ?? "",
          ).trim() || undefined,
        isRegularExam: !!(r.is_regular_exam ?? r.isRegularExam),
        isSupplyExam: !!(r.is_supply_exam ?? r.isSupplyExam),
        isInternalExam: !!(r.is_internal_exam ?? r.isInternalExam),
      }))
      .filter((e) => e.examId > 0);
    setExamMasters(list);
    if (list.length > 0) setSelectedExamId(list[0].examId);
  }, [selectedCourseId, selectedAcademicYearId, filtersData]);

  const domainCourseYearChoices = useMemo(
    () =>
      courseYears
        .map((y: any) => ({
          courseYearId: Number(y.courseYearId ?? y.id ?? 0),
          courseYearName:
            String(
              y.courseYearName ?? y.yearName ?? y.course_year_name ?? "",
            ).trim() || `Course year ${Number(y.courseYearId ?? y.id ?? 0)}`,
        }))
        .filter((o) => o.courseYearId > 0),
    [courseYears],
  );

  const effectiveCourseYears =
    examScopedCourseYears.length > 0
      ? examScopedCourseYears
      : domainCourseYearChoices;

  useEffect(() => {
    let cancelled = false;
    async function loadScopedCourseYears() {
      if (!selectedCourseId || !selectedAcademicYearId || !selectedExamId) {
        setExamScopedCourseYears([]);
        setSelectedCourseYearId(null);
        setExamSessions([]);
        return;
      }
      const bundle = await getExamFiltersNoTimetableBundle({
        courseId: selectedCourseId,
        examId: selectedExamId,
        academicYearId: selectedAcademicYearId ?? 0,
        courseYearId: 0,
        employeeId: resolveExamLoginEmpId(user?.employeeId),
        strictRestFiltersGroup: examAdminLogin,
      }).catch(() => ({ restFilters: [] as any[], sessions: [] as any[] }));
      if (cancelled) return;
      // Angular edit modal sessions come from this proc's `exam_sessions` group only.
      setExamSessions(mapSessionRows(bundle.sessions));

      const rows = Array.isArray(bundle.restFilters) ? bundle.restFilters : [];
      const seen = new Set<number>();
      const scoped: { courseYearId: number; courseYearName: string }[] = [];
      for (const r of rows) {
        const id = Number(r.fk_course_year_id ?? r.courseYearId ?? 0);
        if (id <= 0 || seen.has(id)) continue;
        seen.add(id);
        scoped.push({
          courseYearId: id,
          courseYearName:
            String(
              r.course_year_name ??
                r.course_year_code ??
                r.courseYearName ??
                r.yearName ??
                r.course_year_short_name ??
                "",
            ).trim() || `Year ${id}`,
        });
      }
      scoped.sort((a, b) => a.courseYearId - b.courseYearId);
      setExamScopedCourseYears(scoped);
      const fallback = courseYears
        .map((y: any) => ({
          courseYearId: Number(y.courseYearId ?? y.id ?? 0),
          courseYearName:
            String(
              y.courseYearName ?? y.yearName ?? y.course_year_name ?? "",
            ).trim() || `Year ${Number(y.courseYearId ?? y.id ?? 0)}`,
        }))
        .filter((o) => o.courseYearId > 0);
      // Exam Admin: never fall back to unscoped domain CourseYear list.
      const next = scoped.length > 0 ? scoped : examAdminLogin ? [] : fallback;
      // Angular does NOT auto-select first course year — only restore URL / keep prior.
      setSelectedCourseYearId((prev) => {
        if (prev != null && next.some((o) => o.courseYearId === prev))
          return prev;
        const urlCy = Number(searchParams.get("courseYearId") ?? 0);
        if (urlCy > 0 && next.some((o) => o.courseYearId === urlCy))
          return urlCy;
        return null;
      });
    }
    void loadScopedCourseYears();
    return () => {
      cancelled = true;
    };
  }, [
    selectedCourseId,
    selectedAcademicYearId,
    selectedExamId,
    user?.employeeId,
    courseYears,
    examAdminLogin,
    searchParams,
  ]);

  // When exam changes, build date headers
  useEffect(() => {
    async function hydrateFromApi() {
      if (!selectedExamId || !selectedCourseId || !selectedCourseYearId) {
        setScheduleMap({});
        setBranches([]);
        return;
      }
      setLoadingGrid(true);
      try {
        // We'll accumulate branches from filters/entities first,
        // then merge with any discovered in timetable rows.
        let baseBranches: any[] = [];
        function buildRangeFromDates(startStr?: string, endStr?: string) {
          if (!startStr || !endStr) return null;
          const start = new Date(startStr);
          const end = new Date(endStr);
          if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
          const out: Date[] = [];
          const cur = new Date(
            start.getFullYear(),
            start.getMonth(),
            start.getDate(),
          );
          const endD = new Date(
            end.getFullYear(),
            end.getMonth(),
            end.getDate(),
          );
          while (cur <= endD) {
            out.push(new Date(cur));
            cur.setDate(cur.getDate() + 1);
          }
          return out;
        }

        // Angular: courseGroups from univ_exam_rest_filters (CollegesListDetails)
        const filterBundle = await getExamFiltersNoTimetableBundle({
          courseId: selectedCourseId,
          examId: selectedExamId,
          academicYearId: selectedAcademicYearId ?? 0,
          courseYearId: 0,
          employeeId: resolveExamLoginEmpId(user?.employeeId),
          strictRestFiltersGroup: examAdminLogin,
        }).catch(() => ({ restFilters: [] as any[], sessions: [] as any[] }));
        const filterRows = filterBundle.restFilters;
        const filterSessions = mapSessionRows(filterBundle.sessions);
        if (filterSessions.length > 0) setExamSessions(filterSessions);
        if (Array.isArray(filterRows) && filterRows.length > 0) {
          baseBranches = buildCourseGroupsFromFilters(filterRows);
          setBranches(baseBranches);
        } else if (examAdminLogin) {
          baseBranches = [];
          setBranches([]);
        }

        const data = await getExamTimetableDetails(
          selectedCourseYearId,
          selectedCourseId,
          selectedExamId,
        );
        // Try to infer shapes:
        // 1) If array of rows with fields dept/branch + examDate + session + subjectCode
        if (Array.isArray(data)) {
          // If exam master doesn't provide dates, compute from payload's fromDate/toDate
          const anyRow: any = data[0];
          const range = buildRangeFromDates(anyRow?.fromDate, anyRow?.toDate);

          // branches
          const brIdx = new Map<string | number, any>();
          const dateIdx = new Map<string, Date>();
          const map: Record<string, any[]> = {};

          function entrySignature(entry: Record<string, unknown>) {
            const sid = Number(
              entry.examTimetableDetId ??
                entry.examTimetableDetailId ??
                entry.fk_exam_timetable_det_id ??
                entry.exam_time_table_det_id ??
                0,
            );
            if (sid > 0) return `id:${sid}`;
            const subject = String(entry.subjectCode ?? "");
            const sess = String(entry.session ?? "");
            const reg = String(entry.isRegular ?? true);
            return `s:${subject}|${sess}|${reg}`;
          }

          function pushScheduleEntry(
            scheduleKey: string,
            payload: Record<string, unknown>,
          ) {
            if (!map[scheduleKey]) map[scheduleKey] = [];
            const sig = entrySignature(payload);
            if (
              !map[scheduleKey].some(
                (existing) => entrySignature(existing) === sig,
              )
            ) {
              map[scheduleKey].push(payload);
            }
          }

          for (const row of data) {
            // Prefer matching by group/branch code; fall back to ids
            const groupCodeRaw =
              row.groupCode ??
              row.courseGroupCode ??
              row.group_code ??
              row.deptCode ??
              row.branchCode ??
              row.dept_code;
            const groupCode = String(groupCodeRaw ?? "")
              .trim()
              .toUpperCase();
            let bid =
              row.courseGroupId ??
              (row.courseGroupIds
                ? String(row.courseGroupIds).split(",")[0]
                : undefined) ??
              row.deptId ??
              row.departmentId ??
              row.branchId ??
              row.fk_dept_id ??
              row.fk_branch_id ??
              row.dept_id ??
              row.branch_id;
            // If id missing, try to find by code among branches
            if ((bid == null || bid === "") && groupCode) {
              const found = branches.find(
                (b: any) => String(b.dept_code) === groupCode,
              );
              if (found) bid = found.fk_dept_id;
            }
            const bname =
              groupCode ||
              row.deptCode ||
              row.departmentCode ||
              row.branchCode ||
              row.deptName ||
              row.departmentName ||
              row.branchName;
            if (bid != null && !brIdx.has(bid))
              brIdx.set(bid, { fk_dept_id: bid, dept_code: bname });
            const ds = String(
              row.examDate ?? row.date ?? row.examOn ?? row.exam_day ?? "",
            );
            if (ds) {
              // Normalize to YYYY-MM-DD without timezone shifts
              const dateKeyFromApi =
                ds.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? fmtYMD(new Date(ds));
              const parts = dateKeyFromApi.split("-").map((x) => Number(x));
              const dd = new Date(parts[0], parts[1] - 1, parts[2]);
              if (!isNaN(dd.getTime())) dateIdx.set(dateKeyFromApi, dd);
            }
            const dateKey = ds
              ? (ds.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? fmtYMD(new Date(ds)))
              : "";
            const sessRaw =
              row.session ??
              row.examSession ??
              row.sessionCode ??
              row.examSessionName ??
              row.examsessioninCatCode ??
              "";
            const sess = String(sessRaw).trim().toUpperCase().startsWith("A")
              ? "A"
              : "M";
            const supp =
              row.isSupplementary === true ||
              row.is_supplementary === true ||
              String(
                row.examPaperType ??
                  row.paperType ??
                  row.examAppearingType ??
                  "",
              )
                .toUpperCase()
                .includes("SUP");
            const isRegularExplicit =
              row.isRegular !== undefined && row.isRegular !== null
                ? !!row.isRegular
                : undefined;
            const isRegular =
              isRegularExplicit !== undefined ? isRegularExplicit : !supp;
            const courseGroupId = Number(
              row.courseGroupId ??
                row.fk_course_group_id ??
                row.course_group_id ??
                bid ??
                0,
            );
            const payload = {
              branchId: courseGroupId || bid || groupCode,
              courseGroupId: courseGroupId || undefined,
              date: dateKey,
              session: sess,
              subjectCode:
                row.subjectCode ?? row.paperCode ?? row.subCode ?? "",
              subjectName:
                row.subjectName ??
                row.subject_name ??
                row.sub_name ??
                row.paperTitle ??
                row.paper_title ??
                "",
              examLabBatchName:
                row.examLabBatchName ??
                row.exam_lab_batch_name ??
                row.labBatchName ??
                "",
              room: row.room ?? row.block ?? "",
              remarks: row.remarks ?? "",
              isRegular,
              isActive: row.isActive ?? true,
              reason: row.reason ?? "",
              examSessionId:
                Number(
                  row.examSessionId ??
                    row.fk_exam_session_id ??
                    row.exam_session_id ??
                    0,
                ) || undefined,
              examsessioninCatCode:
                row.examsessioninCatCode ??
                row.exam_session_code ??
                row.sessionCode ??
                sess,
              examTypeCatCode:
                row.examTypeCatCode ??
                row.exam_type_cat_code ??
                (isRegular ? "Regular" : "Supple"),
              sessionStartTime: row.sessionStartTime ?? row.session_start_time,
              sessionEndTime: row.sessionEndTime ?? row.session_end_time,
              examName: row.examName ?? row.exam_name,
              fromDate: row.fromDate ?? row.from_date,
              toDate: row.toDate ?? row.to_date,
              examTypeCatId: row.examTypeCatId ?? row.fk_exam_type_cat_id,
              groupCode,
              courseYearName: row.courseYearName ?? row.course_year_name,
              regulationCode: row.regulationCode ?? row.regulation_code,
              examTimetableDetId:
                row.examTimetableDetId ??
                row.examTimetableDetailId ??
                row.fk_exam_timetable_det_id ??
                row.exam_time_table_det_id,
              // Needed for Angular edit POST `examtimetabledetailsbyexamdate`
              subjectId:
                Number(
                  row.subjectId ?? row.fk_subject_id ?? row.subject_id ?? 0,
                ) || undefined,
              regulationId:
                Number(
                  row.regulationId ??
                    row.fk_regulation_id ??
                    row.regulation_id ??
                    0,
                ) || undefined,
              examLabBatchesId:
                row.examLabBatchesId ??
                row.fk_eaxm_labbatch_id ??
                row.exam_lab_batches_id ??
                null,
              examId:
                Number(row.examId ?? row.fk_exam_id ?? selectedExamId) ||
                undefined,
              courseId:
                Number(row.courseId ?? row.fk_course_id ?? selectedCourseId) ||
                undefined,
              courseYearId:
                Number(
                  row.courseYearId ??
                    row.fk_course_year_id ??
                    selectedCourseYearId,
                ) || undefined,
            };
            const branchPrefixes = Array.from(
              new Set(
                [courseGroupId, bid, groupCode]
                  .filter(
                    (x) =>
                      x != null && String(x).trim() !== "" && Number(x) !== 0,
                  )
                  .map(String),
              ),
            );
            for (const p of branchPrefixes) {
              pushScheduleEntry(`${p}-${dateKey}-${sess}`, payload);
            }
          }
          // Angular keeps rows from courseGroups (filter proc); only add groups
          // that appear in timetable when filter list was empty.
          if (baseBranches.length > 0) {
            setBranches(baseBranches);
          } else {
            const byCode = new Map<string, any>();
            for (const x of Array.from(brIdx.values())) {
              const code = String(
                x.dept_code ?? x.groupCode ?? x.group_code ?? "",
              )
                .trim()
                .toUpperCase();
              if (!code) continue;
              byCode.set(code, {
                fk_course_group_id: x.fk_dept_id ?? x.courseGroupId,
                group_code: code,
                fk_dept_id: x.fk_dept_id ?? x.courseGroupId,
                dept_code: code,
              });
            }
            setBranches(Array.from(byCode.values()));
          }
          // dates from master range if available, else collected from rows
          if (range) {
            setDates(range);
          } else {
            const dts = Array.from(dateIdx.values()).sort(
              (a, b) => a.getTime() - b.getTime(),
            );
            setDates(dts);
          }
          setScheduleMap(map);
          return;
        }
        // 2) If object shape has branches and dates arrays
        if (data && typeof data === "object") {
          if (Array.isArray(data.branches)) setBranches(data.branches);
          if (Array.isArray(data.dates)) {
            const dts = (data.dates as any[])
              .map((v) => new Date(v))
              .filter((d) => !isNaN(d.getTime()))
              .sort((a, b) => a.getTime() - b.getTime());
            setDates(dts);
          }
          if (data.schedule) setScheduleMap(data.schedule as any);
        }
      } catch {
        // ignore network errors for now
      } finally {
        setLoadingGrid(false);
      }
    }
    hydrateFromApi();

    function parseDate(val: any): Date | null {
      if (!val) return null;
      const d = new Date(val);
      if (!isNaN(d.getTime())) return d;
      // try yyyy-MM-dd
      const parts = String(val).split("-");
      if (parts.length === 3) {
        const dd = new Date(
          Number(parts[0]),
          Number(parts[1]) - 1,
          Number(parts[2]),
        );
        return isNaN(dd.getTime()) ? null : dd;
      }
      return null;
    }
    if (!selectedExamId) return;
    const ex = examMasters.find((e) => e.examId === selectedExamId);
    const start = parseDate(ex?.fromDate);
    const end = parseDate(ex?.toDate);
    if (!start || !end) {
      return;
    }
    const arr: Date[] = [];
    const cur = new Date(start);
    while (cur <= end) {
      arr.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    setDates(arr);
  }, [
    selectedExamId,
    examMasters,
    selectedCourseId,
    selectedCourseYearId,
    selectedAcademicYearId,
    user?.employeeId,
    examAdminLogin,
    gridReloadToken,
  ]);

  const titleLine = useMemo(() => {
    const course = courses.find((c) => c.fk_course_id === selectedCourseId);
    const ay = academicYears.find(
      (a) => pickAyId(a) === Number(selectedAcademicYearId),
    );
    const cyEff = effectiveCourseYears.find(
      (y) => Number(y.courseYearId) === Number(selectedCourseYearId),
    );
    const cyLegacy = courseYears.find(
      (y: any) => (y.courseYearId ?? y.id) === selectedCourseYearId,
    );
    const cyLabel =
      cyEff?.courseYearName ?? cyLegacy?.courseYearName ?? cyLegacy?.yearName;
    const exam = examMasters.find((e) => e.examId === selectedExamId);
    const examPart = exam ? formatExamMasterLabel(exam) : "";
    const left = [
      course?.course_code ?? course?.course_name,
      ay?.academic_year ?? ay?.academicYear,
      cyLabel,
    ]
      .filter(Boolean)
      .join(" / ");
    if (!left && !examPart) return "";
    if (!examPart) return left;
    return `${left} - [ ${examPart} ]`;
  }, [
    academicYears,
    courseYears,
    courses,
    effectiveCourseYears,
    examMasters,
    selectedAcademicYearId,
    selectedCourseId,
    selectedCourseYearId,
    selectedExamId,
  ]);

  const regulationLabel = useMemo(() => {
    const cy = courseYears.find(
      (y: any) => (y.courseYearId ?? y.id) === selectedCourseYearId,
    );
    const row =
      (filtersData ?? []).find(
        (r: any) =>
          Number(r.fk_course_id) === Number(selectedCourseId) &&
          pickAyId(r) === Number(selectedAcademicYearId) &&
          Number(r.fk_exam_id) === Number(selectedExamId),
      ) ?? null;
    const fromCy = String(
      cy?.regulationName ??
        cy?.regulationCode ??
        cy?.regulation_name ??
        cy?.regulationShortName ??
        "",
    ).trim();
    const fromRow = String(
      row?.regulation_code ??
        row?.regulation_short_name ??
        row?.reg_short_name ??
        "",
    ).trim();
    return fromCy || fromRow || "";
  }, [
    courseYears,
    filtersData,
    selectedAcademicYearId,
    selectedCourseId,
    selectedCourseYearId,
    selectedExamId,
  ]);

  const editExamRangeText = useMemo(() => {
    const ex = examMasters.find((e) => e.examId === selectedExamId);
    if (!ex) return "";
    const range = formatExamMasterRange(ex);
    return range ? `${ex.examName} ${range}` : ex.examName;
  }, [examMasters, selectedExamId]);

  function resolveEditSessionId(
    slot: Record<string, unknown>,
    sess: "M" | "A",
  ): number | null {
    const fromSlot = Number(slot.examSessionId ?? slot.fk_exam_session_id ?? 0);
    if (fromSlot > 0 && examSessions.some((s) => s.id === fromSlot))
      return fromSlot;
    const byCode = examSessions.find((s) => sessionCodeToMA(s.code) === sess);
    return byCode?.id ?? examSessions[0]?.id ?? null;
  }

  /** Exam Type options filtered by exam master flags — Angular edit getData1(). */
  const editExamTypeOptions = useMemo(() => {
    const exam = examMasters.find((e) => e.examId === selectedExamId);
    if (!exam) return examFeeTypes;
    return examFeeTypes.filter((t) => {
      if (t.code === "Regular") return !!exam.isRegularExam;
      if (t.code === "Supple") return !!exam.isSupplyExam;
      if (t.code === "Internal") return !!exam.isInternalExam;
      return false;
    });
  }, [examFeeTypes, examMasters, selectedExamId]);

  function openEditTimetable(
    branch: any,
    dateStr: string,
    sess: "M" | "A",
    slot: Record<string, unknown>,
  ) {
    const bid =
      branch.fk_dept_id ??
      branch.fk_branch_id ??
      branch.dept_id ??
      branch.branch_id ??
      branch.dept_code;
    const bcode = branch.dept_code ?? branch.branch_code;
    const branchLabel =
      bcode ?? branch.dept_name ?? branch.branch_name ?? String(bid ?? "");
    setEditContext({
      branchId: bid,
      branchCode: bcode ? String(bcode) : undefined,
      branchLabel: String(branchLabel),
      dateStr,
      session: sess,
      original: { ...slot, session: sess },
    });
    const typeId = Number(slot.examTypeCatId ?? 0) || null;
    const typeFromCode = (() => {
      const code = String(slot.examTypeCatCode ?? "").trim();
      if (!code) return null;
      return (
        examFeeTypes.find((t) => t.code.toLowerCase() === code.toLowerCase())
          ?.id ?? null
      );
    })();
    setEditForm({
      examDate: dateStr,
      examSessionId: resolveEditSessionId(slot, sess),
      examTypeCatId: typeId || typeFromCode,
      isActive: slot.isActive !== false,
      reason: String(slot.reason ?? ""),
    });
    setEditOpen(true);
  }

  async function saveEditTimetable(e: React.FormEvent) {
    e.preventDefault();
    if (!editContext) return;
    if (editForm.examSessionId == null) {
      toastError("Select Exam Session");
      return;
    }
    if (editForm.examTypeCatId == null) {
      toastError("Select Exam Type");
      return;
    }
    if (!editForm.isActive && !String(editForm.reason ?? "").trim()) {
      toastError("Reason is required when inactive");
      return;
    }

    const { original } = editContext;
    const selectedType = examFeeTypes.find(
      (t) => t.id === editForm.examTypeCatId,
    );
    // Angular editDialog afterClosed → mutate row → POST array to examtimetabledetailsbyexamdate
    const row: Record<string, unknown> = {
      ...original,
      examLabBatchesId: original.examLabBatchesId ?? null,
      examTypeCatId: editForm.examTypeCatId,
      examTypeCatCode: selectedType?.code ?? original.examTypeCatCode,
      courseGroupId: Number(
        original.courseGroupId ??
          original.branchId ??
          editContext.branchId ??
          0,
      ),
      examSessionId: editForm.examSessionId,
      examDate: editForm.examDate,
      regulationId: Number(original.regulationId ?? 0) || undefined,
      subjectId: Number(original.subjectId ?? 0) || undefined,
      isActive: editForm.isActive,
      reason: editForm.isActive ? "" : editForm.reason,
      courseId: Number(original.courseId ?? selectedCourseId ?? 0) || undefined,
      examId: Number(original.examId ?? selectedExamId ?? 0) || undefined,
      courseYearId:
        Number(original.courseYearId ?? selectedCourseYearId ?? 0) || undefined,
    };
    delete row.active;

    setSavingEdit(true);
    try {
      const body = await saveExamTimetableDetailsByExamDate([row]);
      if (!body.ok || body.statusCode !== 200) {
        toastError(body.message ?? "Save failed");
        return;
      }
      if (!body.success) {
        toastInfo(body.message ?? "Nothing was saved.");
        return;
      }
      toastSuccess(body.message ?? "Exam timetable updated");
      setEditOpen(false);
      setEditContext(null);
      setGridReloadToken((n) => n + 1);
    } catch {
      toastError("Save failed");
    } finally {
      setSavingEdit(false);
    }
  }

  function openCreateSchedule() {
    if (
      !selectedCourseId ||
      !selectedAcademicYearId ||
      !selectedExamId ||
      !selectedCourseYearId
    ) {
      router.push(
        "/admin-examination-management/admin-exam-masters/exam-timetable/create",
      );
      return;
    }
    const course = courses.find((c) => c.fk_course_id === selectedCourseId);
    const ay = academicYears.find(
      (a) => pickAyId(a) === Number(selectedAcademicYearId),
    );
    const cyEff = effectiveCourseYears.find(
      (y) => Number(y.courseYearId) === Number(selectedCourseYearId),
    );
    const cyLegacy = courseYears.find(
      (y: any) => (y.courseYearId ?? y.id) === selectedCourseYearId,
    );
    const exam = examMasters.find((e) => e.examId === selectedExamId);
    const uniId = Number(
      course?.fk_university_id ??
        course?.university_id ??
        course?.universityId ??
        exam?.universityId ??
        0,
    );
    const params = new URLSearchParams({
      courseId: String(selectedCourseId),
      academicYearId: String(selectedAcademicYearId),
      examId: String(selectedExamId),
      courseYearId: String(selectedCourseYearId),
      courseName: String(course?.course_code ?? course?.course_name ?? ""),
      academicYear: String(ay?.academic_year ?? ay?.academicYear ?? ""),
      courseYearName: String(
        cyEff?.courseYearName ??
          cyLegacy?.courseYearName ??
          cyLegacy?.yearName ??
          "",
      ),
      examName: String(exam?.examName ?? ""),
      fromDate: String(exam?.fromDate ?? ""),
      toDate: String(exam?.toDate ?? ""),
      universityId: String(uniId || 0),
    });
    router.push(
      `/admin-examination-management/admin-exam-masters/exam-timetable/create?${params.toString()}`,
    );
  }

  function fmtYMD(date: Date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d2 = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d2}`;
  }

  function listForSession(
    branchId: string | number,
    branchCode: string | undefined,
    dateStr: string,
    sess: "M" | "A",
  ) {
    const k1 = `${branchId}-${dateStr}-${sess}`;
    const k2 = branchCode ? `${branchCode}-${dateStr}-${sess}` : "";
    const merged: any[] = [];
    const seen = new Set<string>();
    function addFrom(key: string) {
      const raw = scheduleMap[key];
      const arr = Array.isArray(raw) ? raw : raw != null ? [raw] : [];
      for (const item of arr) {
        const code = String(item?.subjectCode ?? "");
        const sid = Number(
          item?.examTimetableDetId ?? item?.fk_exam_timetable_det_id ?? 0,
        );
        const sig =
          sid > 0 ? `id:${sid}` : `${code}|${String(item?.isRegular ?? true)}`;
        if (!seen.has(sig)) {
          seen.add(sig);
          merged.push(item);
        }
      }
    }
    addFrom(k1);
    if (k2 && k2 !== k1) addFrom(k2);
    return merged;
  }

  function getCellBadge(branch: any, d: Date) {
    const branchId =
      branch.fk_course_group_id ??
      branch.fk_dept_id ??
      branch.fk_branch_id ??
      branch.dept_id ??
      branch.branch_id;
    const branchCode =
      branch.group_code ?? branch.dept_code ?? branch.branch_code;
    const dateStr = fmtYMD(d);
    const mList = listForSession(branchId, branchCode, dateStr, "M");
    const aList = listForSession(branchId, branchCode, dateStr, "A");
    const all = [...mList, ...aList];

    if (!all.length) {
      return (
        <div className="min-h-[36px] px-1 py-2 text-center text-[12px] text-slate-400">
          —
        </div>
      );
    }

    return (
      <div className="min-h-[36px] px-0.5 py-1 text-left">
        {all.map((item, index) => {
          const row = item as Record<string, unknown>;
          const sess = rowIsAfternoon(row) ? "A" : "M";
          const batch = String(row.examLabBatchName ?? "").trim();
          const typeLetter = examTypeLetter(row);
          return (
            <button
              type="button"
              key={`${index}-${String(row.examTimetableDetId ?? "")}-${String(row.subjectCode ?? "")}`}
              className="relative mb-0.5 block w-full cursor-pointer rounded-[3px] border border-[#c5c5c5] px-0.5 py-0.5 text-left text-[12px] font-medium transition-opacity hover:opacity-90"
              style={{
                background: sess === "A" ? "#ffee23c2" : "#92dcffee",
              }}
              title="Click to edit"
              onClick={() => openEditTimetable(branch, dateStr, sess, row)}
            >
              <span className="mr-8 inline-block">
                {String(row.subjectCode ?? "—")}
                {batch ? ` (${batch})` : ""}
              </span>
              <span className="absolute bottom-0.5 right-0.5 rounded-[3px] bg-[#ff5968] px-1 text-[10px] font-bold leading-4 text-white">
                {typeLetter}
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <FilteredPage
      title="Exam University Timetable"
      filters={
        <GlobalFilterBarRow className="flex-nowrap">
          <GlobalFilterField
            label="Course"
            icon={GraduationCap}
            className="min-w-[8rem] flex-[0.9]"
          >
            <Select
              value={selectedCourseId != null ? String(selectedCourseId) : null}
              onChange={(v) => handleCourseChange(Number(v), filtersData)}
              options={courses.map((c) => ({
                value: String(c.fk_course_id),
                label: String(c.course_code ?? c.course_name ?? ""),
              }))}
              placeholder={loadingFilters ? "Loading…" : "Select Course"}
              disabled={loadingFilters}
              searchable
            />
          </GlobalFilterField>
          <GlobalFilterField
            label="Exam Year"
            icon={Calendar}
            className="min-w-[8rem] flex-[0.9]"
          >
            <Select
              value={
                selectedAcademicYearId != null
                  ? String(selectedAcademicYearId)
                  : null
              }
              onChange={(v) => setSelectedAcademicYearId(Number(v))}
              options={academicYears.map((a) => ({
                value: String(pickAyId(a)),
                label: String(a.academic_year ?? ""),
              }))}
              placeholder="Select Exam Year"
              disabled={academicYears.length === 0}
              searchable
            />
          </GlobalFilterField>
          <GlobalFilterField
            label="Exam Master"
            icon={ScrollText}
            className="min-w-[16rem] flex-[2.2]"
          >
            <Select
              value={selectedExamId != null ? String(selectedExamId) : null}
              onChange={(v) => {
                setSelectedExamId(Number(v));
                setDates([]);
              }}
              options={examMasters.map((e) => ({
                value: String(e.examId),
                label: formatExamMasterLabel(e),
              }))}
              placeholder="Select Exam Master"
              disabled={examMasters.length === 0}
              searchable
            />
          </GlobalFilterField>
          <GlobalFilterField
            label="Course Year"
            icon={GraduationCap}
            className="min-w-[7rem] flex-[0.8]"
          >
            <Select
              value={
                selectedCourseYearId != null
                  ? String(selectedCourseYearId)
                  : null
              }
              onChange={(v) => setSelectedCourseYearId(Number(v))}
              options={effectiveCourseYears.map((y) => ({
                value: String(y.courseYearId),
                label: String(y.courseYearName),
              }))}
              placeholder="Select Course Year"
              emptyMessage="No records found"
              searchable
            />
          </GlobalFilterField>
        </GlobalFilterBarRow>
      }
    >
      {selectedCourseYearId != null && titleLine && (
        <div className="app-card">
          <div className="px-4 py-3 border-b border-border bg-card">
            <p className="text-[13px] font-medium text-[hsl(var(--primary))]">
              {titleLine}
            </p>
          </div>
          <div className="flex items-center justify-between px-3 py-3">
            <p className="m-0 text-right text-[12px] text-black">
              <span
                className="inline-block border border-[#bbbbbb] px-[3px]"
                style={{ background: "#99deff" }}
              >
                M
              </span>{" "}
              MORNING{" "}
              <span
                className="inline-block border border-[#bbbbbb] px-[3px]"
                style={{ background: "#fff258" }}
              >
                A
              </span>{" "}
              AFTERNOON
            </p>
            <Button type="button" size="sm" onClick={openCreateSchedule}>
              + Create Schedule
            </Button>
          </div>

          {loadingGrid && (
            <div className="px-4 py-8 text-center text-[13px] text-muted-foreground">
              Loading timetable…
            </div>
          )}

          <div className="overflow-auto">
            <table className="w-full border-separate border-spacing-0 border-t border-border">
              <thead>
                <tr>
                  <th className="sticky left-0 top-0 z-30 w-48 min-w-[12rem] border-b border-r border-[#c5c5c5] bg-[#C3D9FF] px-2 py-1.5 text-center text-[12px] font-medium uppercase text-black">
                    Branch
                  </th>
                  {dates.map((d) => {
                    const day = d
                      .toLocaleDateString("en-GB", { weekday: "short" })
                      .toUpperCase();
                    const dayNum = d
                      .toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })
                      .replace(/(\d+) (\w+) (\d+)/, "$1 $2, $3");
                    return (
                      <th
                        key={d.toISOString()}
                        className="sticky top-0 z-20 min-w-[160px] border-b border-r border-[#c5c5c5] bg-[#C3D9FF] px-2 py-1.5 text-center text-[12px] font-medium text-black"
                      >
                        <div>{dayNum}</div>
                        <p className="m-0 text-blue-700">({day})</p>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {branches.map((b, i) => {
                  const id =
                    b.fk_course_group_id ??
                    b.fk_dept_id ??
                    b.fk_branch_id ??
                    b.dept_id ??
                    b.branch_id;
                  const name =
                    b.group_code ??
                    b.dept_code ??
                    b.dept_name ??
                    b.departmentCode ??
                    b.departmentName ??
                    b.branch_code ??
                    b.branch_name ??
                    `Branch ${i + 1}`;
                  return (
                    <tr key={id ?? `row-${i}`} className="hover:bg-muted/30">
                      <td className="sticky left-0 z-10 w-48 min-w-[12rem] border-b border-r border-border bg-card px-2 py-2 text-center text-[12px] font-medium uppercase text-blue-700">
                        {name}
                      </td>
                      {dates.map((d) => (
                        <td
                          key={`${id}-${d.toISOString()}`}
                          className="border-b border-r border-border px-2 py-2 text-center align-top"
                        >
                          {getCellBadge(b, d)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
                {branches.length === 0 && (
                  <tr key="no-rows">
                    <td
                      className="px-3 py-6 text-center text-[12px] text-muted-foreground"
                      colSpan={Math.max(1, dates.length) + 1}
                    >
                      Select filters to view timetable grid
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end px-4 py-3">
            <Button
              type="button"
              size="sm"
              onClick={() => setConflictsOpen(true)}
              disabled={!selectedExamId || !selectedAcademicYearId}
            >
              <ShieldAlert className="mr-1.5 h-3.5 w-3.5" />
              Check Conflicts
            </Button>
          </div>
        </div>
      )}

      <CheckConflictsModal
        open={conflictsOpen}
        onClose={() => setConflictsOpen(false)}
        examId={selectedExamId}
        academicYearId={selectedAcademicYearId}
      />

      <Dialog
        open={editOpen}
        onOpenChange={(v) => {
          setEditOpen(v);
          if (!v) setEditContext(null);
        }}
      >
        <DialogContent
          className="gap-0 overflow-hidden px-0 pb-6 pt-0 sm:max-w-3xl"
          description="Edit exam date, type, session, and active status for this timetable entry."
        >
          <DialogHeader className="relative z-[1] shrink-0 bg-white">
            <DialogTitle className="min-w-0 max-w-[calc(100%-2.75rem)] pr-1">
              Edit Exam University Timetable
            </DialogTitle>
          </DialogHeader>
          {editContext && (
            <form onSubmit={saveEditTimetable} className="space-y-4 px-6 pt-3">
              <div className="space-y-1.5 rounded-md border border-sky-200 bg-sky-50 px-3 py-2.5 text-[13px] text-[#0c51a4]">
                <div className="grid grid-cols-[7.5rem_1fr] items-start gap-x-2 gap-y-1.5">
                  <span className="font-semibold leading-5">
                    Course Details:
                  </span>
                  <span className="leading-5">
                    {(() => {
                      const cyEff = effectiveCourseYears.find(
                        (y) =>
                          Number(y.courseYearId) ===
                          Number(selectedCourseYearId),
                      );
                      const cyLegacy = courseYears.find(
                        (y: any) =>
                          (y.courseYearId ?? y.id) === selectedCourseYearId,
                      );
                      const yr =
                        String(
                          editContext.original.courseYearName ?? "",
                        ).trim() ||
                        cyEff?.courseYearName ||
                        cyLegacy?.courseYearName ||
                        cyLegacy?.yearName ||
                        "";
                      const reg =
                        String(
                          editContext.original.regulationCode ?? "",
                        ).trim() || regulationLabel;
                      return [editContext.branchLabel, yr, reg]
                        .filter(Boolean)
                        .join(" / ");
                    })()}
                  </span>
                  {editExamRangeText ? (
                    <>
                      <span className="font-semibold leading-5">
                        Exam Details:
                      </span>
                      <span className="leading-5">
                        {(() => {
                          const name = String(
                            editContext.original.examName ?? "",
                          ).trim();
                          const range = formatExamMasterRange({
                            fromDate: String(
                              editContext.original.fromDate ?? "",
                            ),
                            toDate: String(editContext.original.toDate ?? ""),
                          });
                          if (name && range) return `${name} ${range}`;
                          return editExamRangeText;
                        })()}
                      </span>
                    </>
                  ) : null}
                  <span className="font-semibold leading-5">
                    Subject Details:
                  </span>
                  <span className="leading-5">
                    {(() => {
                      const name = String(
                        editContext.original.subjectName ?? "",
                      ).trim();
                      const code = String(
                        editContext.original.subjectCode ?? "",
                      );
                      return name ? `${name} (${code})` : code || "—";
                    })()}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:items-end">
                <div className="space-y-1.5">
                  <Label>Exam Date *</Label>
                  <Input
                    type="date"
                    className="h-9 text-[12px]"
                    value={editForm.examDate}
                    min={
                      String(editContext.original.fromDate ?? "").slice(
                        0,
                        10,
                      ) || undefined
                    }
                    max={
                      String(editContext.original.toDate ?? "").slice(0, 10) ||
                      undefined
                    }
                    onChange={(e) =>
                      setEditForm((s) => ({ ...s, examDate: e.target.value }))
                    }
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Exam Type *</Label>
                  <Select
                    value={
                      editForm.examTypeCatId != null
                        ? String(editForm.examTypeCatId)
                        : null
                    }
                    onChange={(v) =>
                      setEditForm((s) => ({
                        ...s,
                        examTypeCatId: v ? Number(v) : null,
                      }))
                    }
                    options={editExamTypeOptions.map((t) => ({
                      value: String(t.id),
                      label:
                        t.code === "Supple"
                          ? "Supplementary"
                          : t.name || t.code,
                    }))}
                    placeholder={
                      editExamTypeOptions.length === 0
                        ? "No exam types for this master"
                        : "Select type"
                    }
                    disabled={editExamTypeOptions.length === 0}
                    searchable={false}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Exam Session *</Label>
                <Select
                  value={
                    editForm.examSessionId != null
                      ? String(editForm.examSessionId)
                      : null
                  }
                  onChange={(v) =>
                    setEditForm((s) => ({
                      ...s,
                      examSessionId: v ? Number(v) : null,
                    }))
                  }
                  options={examSessions.map((s) => ({
                    value: String(s.id),
                    label: sessionLabel(s),
                  }))}
                  placeholder={
                    examSessions.length === 0
                      ? "Loading sessions…"
                      : "Select session"
                  }
                  disabled={examSessions.length === 0}
                  searchable
                />
              </div>
              <ActiveStatusField
                isActive={editForm.isActive}
                reason={editForm.reason}
                onActiveChange={(v) =>
                  setEditForm((s) => ({
                    ...s,
                    isActive: v === true,
                    reason: v === true ? "" : s.reason,
                  }))
                }
                onReasonChange={(v) =>
                  setEditForm((s) => ({ ...s, reason: v }))
                }
              />
              <DialogFooter className="gap-2 px-0 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditOpen(false)}
                >
                  Close
                </Button>
                <Button
                  type="submit"
                  className="bg-[#1565C0] hover:bg-[#0D47A1]"
                  disabled={
                    savingEdit ||
                    editForm.examSessionId == null ||
                    editForm.examTypeCatId == null
                  }
                >
                  {savingEdit ? "Saving…" : "Save"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </FilteredPage>
  );
}
