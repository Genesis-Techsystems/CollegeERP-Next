"use client";

/**
 * Shared college → AY → course → group → year → section cascade
 * for Angular student-attendance-reports pages.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import type { SelectOption } from "@/common/components/select";
import {
  academicYearsFromFilterRows,
  collegesFromFilterRows,
  courseGroupsFromFilterRows,
  coursesFromFilterRows,
  courseYearsFromFilterRows,
  num,
  sectionsFromFilterRows,
  text,
} from "@/app/(pages)/(protected)/time-table-management/_lib/timetable-filters";
import { getErrorMessage } from "@/lib/errors";
import { toastError } from "@/lib/toast";
import { fetchAttendanceReportFilterRows } from "@/services";

type AnyRow = Record<string, unknown>;

export type AttendanceCascadeState = {
  loadingFilters: boolean;
  filterRows: AnyRow[];
  collegeId: string;
  academicYearId: string;
  courseId: string;
  courseGroupId: string;
  courseYearId: string;
  sectionId: string;
  setCollegeId: (v: string) => void;
  setAcademicYearId: (v: string) => void;
  setCourseId: (v: string) => void;
  setCourseGroupId: (v: string) => void;
  setCourseYearId: (v: string) => void;
  setSectionId: (v: string) => void;
  collegeOptions: SelectOption[];
  ayOptions: SelectOption[];
  courseOptions: SelectOption[];
  groupOptions: SelectOption[];
  yearOptions: SelectOption[];
  sectionOptions: SelectOption[];
  /** Include `{ value: "0", label: "All" }` as first section option. */
  sectionOptionsWithAll: SelectOption[];
  buildDataDetails: (extra?: string[]) => string;
  onCollegeChange: (v: string | null) => void;
  onAyChange: (v: string | null) => void;
  onCourseChange: (v: string | null) => void;
  onGroupChange: (v: string | null) => void;
  onYearChange: (v: string | null) => void;
  onSectionChange: (v: string | null) => void;
  /** Auto-select first section when years resolve (Angular percentage report). */
  autoSelectFirstSection?: boolean;
  /** Default section to "0" (Angular subject-wise). */
  defaultSectionZero?: boolean;
};

type Options = {
  autoSelectFirstSection?: boolean;
  defaultSectionZero?: boolean;
  onClearResults?: () => void;
};

/** Angular parity: latest academic year first (parseInt on "2026-2027" → 2026). */
function sortAcademicYearsDesc(rows: AnyRow[]): AnyRow[] {
  return [...rows].sort(
    (a, b) =>
      parseInt(text(b, ["academic_year", "academicYear"]), 10) -
      parseInt(text(a, ["academic_year", "academicYear"]), 10),
  );
}

export function useAttendanceReportFilters(
  options: Options = {},
): AttendanceCascadeState {
  const {
    autoSelectFirstSection = false,
    defaultSectionZero = false,
    onClearResults,
  } = options;

  const [loadingFilters, setLoadingFilters] = useState(true);
  const [filterRows, setFilterRows] = useState<AnyRow[]>([]);
  const [collegeId, setCollegeId] = useState("");
  const [academicYearId, setAcademicYearId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [courseGroupId, setCourseGroupId] = useState("");
  const [courseYearId, setCourseYearId] = useState("");
  const [sectionId, setSectionId] = useState(defaultSectionZero ? "0" : "");

  const clear = useCallback(() => {
    onClearResults?.();
  }, [onClearResults]);

  useEffect(() => {
    let cancelled = false;
    setLoadingFilters(true);
    void fetchAttendanceReportFilterRows()
      .then((rows) => {
        if (cancelled) return;
        setFilterRows(rows);
        const colleges = collegesFromFilterRows(rows);
        if (colleges[0]) {
          setCollegeId(String(num(colleges[0].fk_college_id)));
        }
      })
      .catch((err) => {
        if (!cancelled) toastError(getErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoadingFilters(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const colleges = useMemo(
    () => collegesFromFilterRows(filterRows),
    [filterRows],
  );
  const academicYears = useMemo(
    () => academicYearsFromFilterRows(filterRows, Number(collegeId || 0)),
    [filterRows, collegeId],
  );
  const courses = useMemo(
    () =>
      coursesFromFilterRows(
        filterRows,
        Number(collegeId || 0),
        Number(academicYearId || 0),
      ),
    [filterRows, collegeId, academicYearId],
  );
  const courseGroups = useMemo(
    () =>
      courseGroupsFromFilterRows(
        filterRows,
        Number(collegeId || 0),
        Number(academicYearId || 0),
        Number(courseId || 0),
      ),
    [filterRows, collegeId, academicYearId, courseId],
  );
  const courseYears = useMemo(
    () =>
      courseYearsFromFilterRows(
        filterRows,
        Number(collegeId || 0),
        Number(academicYearId || 0),
        Number(courseId || 0),
        Number(courseGroupId || 0),
      ),
    [filterRows, collegeId, academicYearId, courseId, courseGroupId],
  );
  const sections = useMemo(
    () =>
      sectionsFromFilterRows(
        filterRows,
        Number(collegeId || 0),
        Number(academicYearId || 0),
        Number(courseId || 0),
        Number(courseGroupId || 0),
        Number(courseYearId || 0),
      ).sort((a, b) => num(a.fk_group_section_id) - num(b.fk_group_section_id)),
    [
      filterRows,
      collegeId,
      academicYearId,
      courseId,
      courseGroupId,
      courseYearId,
    ],
  );

  // Cascade auto-select (Angular: pick first of each level)
  useEffect(() => {
    if (!academicYears.length) {
      setAcademicYearId("");
      return;
    }
    const sorted = sortAcademicYearsDesc(academicYears);
    const ids = sorted.map((r) => String(num(r.fk_academic_year_id)));
    if (!ids.includes(academicYearId)) setAcademicYearId(ids[0] ?? "");
  }, [academicYears, academicYearId]);

  useEffect(() => {
    if (!courses.length) {
      setCourseId("");
      return;
    }
    const ids = courses.map((r) => String(num(r.fk_course_id)));
    if (!ids.includes(courseId)) setCourseId(ids[0] ?? "");
  }, [courses, courseId]);

  useEffect(() => {
    if (!courseGroups.length) {
      setCourseGroupId("");
      return;
    }
    const ids = courseGroups.map((r) => String(num(r.fk_course_group_id)));
    if (!ids.includes(courseGroupId)) setCourseGroupId(ids[0] ?? "");
  }, [courseGroups, courseGroupId]);

  useEffect(() => {
    if (!courseYears.length) {
      setCourseYearId("");
      return;
    }
    const ids = courseYears.map((r) => String(num(r.fk_course_year_id)));
    if (!ids.includes(courseYearId)) setCourseYearId(ids[0] ?? "");
  }, [courseYears, courseYearId]);

  useEffect(() => {
    if (defaultSectionZero) {
      if (!courseYearId) return;
      // keep "0" unless user already picked a real section that still exists
      if (sectionId === "0") return;
      const ids = sections.map((r) => String(num(r.fk_group_section_id)));
      if (sectionId && ids.includes(sectionId)) return;
      setSectionId("0");
      return;
    }
    if (!sections.length) {
      setSectionId("");
      return;
    }
    if (autoSelectFirstSection) {
      const ids = sections.map((r) => String(num(r.fk_group_section_id)));
      if (!ids.includes(sectionId)) setSectionId(ids[0] ?? "");
    }
  }, [
    sections,
    sectionId,
    courseYearId,
    autoSelectFirstSection,
    defaultSectionZero,
  ]);

  const collegeOptions: SelectOption[] = useMemo(
    () =>
      colleges.map((r) => ({
        value: String(num(r.fk_college_id)),
        label:
          text(r, ["college_code", "collegeCode"]) ||
          String(num(r.fk_college_id)),
      })),
    [colleges],
  );
  const ayOptions: SelectOption[] = useMemo(
    () =>
      sortAcademicYearsDesc(academicYears).map((r) => ({
        value: String(num(r.fk_academic_year_id)),
        label: text(r, ["academic_year", "academicYear"]) || "—",
      })),
    [academicYears],
  );
  const courseOptions: SelectOption[] = useMemo(
    () =>
      courses.map((r) => ({
        value: String(num(r.fk_course_id)),
        label: text(r, ["course_code", "courseCode"]) || "—",
      })),
    [courses],
  );
  const groupOptions: SelectOption[] = useMemo(
    () =>
      courseGroups.map((r) => ({
        value: String(num(r.fk_course_group_id)),
        label: text(r, ["group_code", "groupCode"]) || "—",
      })),
    [courseGroups],
  );
  const yearOptions: SelectOption[] = useMemo(
    () =>
      courseYears.map((r) => ({
        value: String(num(r.fk_course_year_id)),
        label: text(r, ["course_year_name", "courseYearName"]) || "—",
      })),
    [courseYears],
  );
  const sectionOptions: SelectOption[] = useMemo(
    () =>
      sections.map((r) => ({
        value: String(num(r.fk_group_section_id)),
        label: text(r, ["section", "section_name", "sectionName"]) || "—",
      })),
    [sections],
  );
  const sectionOptionsWithAll: SelectOption[] = useMemo(
    () => [{ value: "0", label: "All" }, ...sectionOptions],
    [sectionOptions],
  );

  const buildDataDetails = useCallback(
    (extra: string[] = []) => {
      const parts: string[] = [];
      const clg = collegeOptions.find((o) => o.value === collegeId);
      if (clg?.label) parts.push(clg.label);
      const ay = ayOptions.find((o) => o.value === academicYearId);
      if (ay?.label) parts.push(ay.label);
      const cr = courseOptions.find((o) => o.value === courseId);
      if (cr?.label) parts.push(cr.label);
      const g = groupOptions.find((o) => o.value === courseGroupId);
      if (g?.label) parts.push(g.label);
      const y = yearOptions.find((o) => o.value === courseYearId);
      if (y?.label) parts.push(y.label);
      const secOpts = defaultSectionZero
        ? sectionOptionsWithAll
        : sectionOptions;
      const sec = secOpts.find((o) => o.value === sectionId);
      if (sec?.label && sec.value !== "0") parts.push(sec.label);
      else if (defaultSectionZero && sectionId === "0") parts.push("All");
      for (const e of extra) {
        if (e) parts.push(e);
      }
      return parts.join(" / ");
    },
    [
      collegeOptions,
      ayOptions,
      courseOptions,
      groupOptions,
      yearOptions,
      sectionOptions,
      sectionOptionsWithAll,
      collegeId,
      academicYearId,
      courseId,
      courseGroupId,
      courseYearId,
      sectionId,
      defaultSectionZero,
    ],
  );

  const onCollegeChange = (v: string | null) => {
    setCollegeId(v ?? "");
    setAcademicYearId("");
    setCourseId("");
    setCourseGroupId("");
    setCourseYearId("");
    setSectionId(defaultSectionZero ? "0" : "");
    clear();
  };
  const onAyChange = (v: string | null) => {
    setAcademicYearId(v ?? "");
    setCourseId("");
    setCourseGroupId("");
    setCourseYearId("");
    setSectionId(defaultSectionZero ? "0" : "");
    clear();
  };
  const onCourseChange = (v: string | null) => {
    setCourseId(v ?? "");
    setCourseGroupId("");
    setCourseYearId("");
    setSectionId(defaultSectionZero ? "0" : "");
    clear();
  };
  const onGroupChange = (v: string | null) => {
    setCourseGroupId(v ?? "");
    setCourseYearId("");
    setSectionId(defaultSectionZero ? "0" : "");
    clear();
  };
  const onYearChange = (v: string | null) => {
    setCourseYearId(v ?? "");
    setSectionId(defaultSectionZero ? "0" : "");
    clear();
  };
  const onSectionChange = (v: string | null) => {
    setSectionId(v ?? (defaultSectionZero ? "0" : ""));
    clear();
  };

  return {
    loadingFilters,
    filterRows,
    collegeId,
    academicYearId,
    courseId,
    courseGroupId,
    courseYearId,
    sectionId,
    setCollegeId,
    setAcademicYearId,
    setCourseId,
    setCourseGroupId,
    setCourseYearId,
    setSectionId,
    collegeOptions,
    ayOptions,
    courseOptions,
    groupOptions,
    yearOptions,
    sectionOptions,
    sectionOptionsWithAll,
    buildDataDetails,
    onCollegeChange,
    onAyChange,
    onCourseChange,
    onGroupChange,
    onYearChange,
    onSectionChange,
    autoSelectFirstSection,
    defaultSectionZero,
  };
}

export function formatYmd(d: Date | null | undefined): string {
  if (!d) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatDateHeader(value: unknown): string {
  if (value == null || value === "") return "";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function buildBannerHtml(opts: {
  logoSrc: string;
  collegeName: string;
  dataDetails: string;
  reportTitle: string;
  orgCode: string;
}): string {
  const { logoSrc, collegeName, dataDetails, reportTitle, orgCode } = opts;
  if (orgCode === "SUK") {
    return `<div style="text-align:center;margin-bottom:12px;">
      <img src="${escapeHtml(logoSrc)}" alt="" style="height:120px;max-width:90%;object-fit:contain;" />
      <p style="font-size:16px;font-weight:700;margin:8px 0 4px;">${escapeHtml(collegeName)}</p>
      <p style="font-size:13px;margin:2px 0;">${escapeHtml(dataDetails)}</p>
      <p style="font-size:13px;font-weight:600;margin:2px 0;">${escapeHtml(reportTitle)}</p>
    </div>`;
  }
  return `<div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:12px;">
    <img src="${escapeHtml(logoSrc)}" alt="" style="height:72px;width:auto;object-fit:contain;" />
    <div>
      <p style="font-size:16px;font-weight:700;margin:0 0 4px;text-align:left;">${escapeHtml(collegeName)}</p>
      <p style="font-size:13px;margin:2px 0;text-align:left;">${escapeHtml(dataDetails)}</p>
      <p style="font-size:13px;font-weight:600;margin:2px 0;text-align:left;">${escapeHtml(reportTitle)}</p>
    </div>
  </div>`;
}
