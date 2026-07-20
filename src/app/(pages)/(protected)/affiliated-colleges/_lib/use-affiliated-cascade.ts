"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { QK } from "@/lib/query-keys";
import {
  getAffiliatedCollegeExamFilters,
  getAffiliatedCollegeFilters,
  resolveAffiliatedEmployeeId,
  resolveAffiliatedOrgId,
} from "@/services";
import { academicYearRowsForCollegeFromProc } from "@/services/student-information";
import { fetchTimetableFilterRows } from "@/services/timetable-management";
import type { AffiliatedCollegeFilterRow } from "@/types/affiliated-colleges";
import {
  listAffiliatedRegulationsForCourse,
  resolveRegulationFromFilterContext,
} from "./resolve-affiliated-regulation";

type AnyRow = AffiliatedCollegeFilterRow;

const UNI = ["fk_university_id", "universityId"];
const COL = ["fk_college_id", "collegeId", "fk_collegeId"];
const AY = ["fk_academic_year_id", "academicYearId"];
const CRS = ["fk_course_id", "courseId"];
const GRP = [
  "fk_course_group_id",
  "courseGroupId",
  "CourseGroup.courseGroupId",
];
const CYR = ["fk_course_year_id", "courseYearId"];
const EX = ["fk_exam_id", "examId"];

function pickNum(row: AnyRow, keys: string[]): number {
  for (const key of keys) {
    const n = Number(row[key]);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

function rowMatches(
  row: AnyRow,
  keys: string[],
  selectedId: number | null,
): boolean {
  if (!selectedId) return true;
  const rowValue = pickNum(row, keys);
  return rowValue === 0 || rowValue === Number(selectedId);
}

function distinctBy<T extends AnyRow>(rows: T[], keys: string[]): T[] {
  const seen = new Set<number>();
  const out: T[] = [];
  for (const row of rows) {
    const id = pickNum(row, keys);
    if (id <= 0 || seen.has(id)) continue;
    seen.add(id);
    out.push(row);
  }
  return out;
}

function label(row: AnyRow, ...keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (v != null && String(v).trim() !== "") return String(v);
  }
  return "";
}

export type AffiliatedCascadeOptions = {
  /** Use `clg_exam_filters` proc flag (exam payments, university report). */
  examFilters?: boolean;
  /** Student attendance summary — `cls_timtable_filters` (Angular parity). */
  timetableFilters?: boolean;
  /**
   * Exam registration summary/upload — Exam after Course, before Group/Year
   * (Angular `selectedCourse` → exams, then `selectedExam` → groups).
   */
  examFirstCascade?: boolean;
  /**
   * Internal/external marks — Angular order:
   * Course → Exam Year → Exam → College → Group → Year.
   */
  courseFirstCascade?: boolean;
  /** When `courseFirstCascade`, keep only internal or non-internal exams. */
  examKind?: "internal" | "external";
  /** Scope course/group/year lists by selected academic year (attendance pages). */
  scopeByAcademicYear?: boolean;
  /** Allow "All" (0) for group/year selects — Angular summary parity. */
  allowAllGroupYear?: boolean;
  /** Auto-select first college on load (Angular default). */
  autoSelectFirst?: boolean;
  /** College uploads approval only needs college / year / course (Angular staffForm). */
  requireGroupYear?: boolean;
  /**
   * When false with `requireGroupYear: false`, only college + academic year are required
   * (Angular Student Dost Upload Summary).
   */
  requireCourse?: boolean;
  /** Student Dost summary/upload — university + college + academic year (Angular parity). */
  requireUniversity?: boolean;
  /** Pre-select filters (e.g. navigated from Student Summary upload link). */
  initialSelection?: {
    universityId?: number;
    collegeId?: number;
    academicYearId?: number;
    courseId?: number;
    courseGroupId?: number;
    courseYearId?: number;
    regulationId?: number;
    examId?: number;
  };
  /** Subject upload — cascade regulation list for selected college + course. */
  trackRegulation?: boolean;
  /** Subject upload — require a specific regulation (not 0 / All). */
  requirePositiveRegulation?: boolean;
};

export function useAffiliatedCascade(options: AffiliatedCascadeOptions = {}) {
  const orgId = resolveAffiliatedOrgId();
  const empId = resolveAffiliatedEmployeeId();

  const { data: filterBundle, isLoading } = useQuery({
    queryKey: options.timetableFilters
      ? QK.affiliatedColleges.timetableFilters(orgId, empId)
      : options.examFilters
        ? QK.affiliatedColleges.examFilters(orgId, empId)
        : QK.affiliatedColleges.collegeFilters(orgId, empId),
    queryFn: () =>
      options.timetableFilters
        ? fetchTimetableFilterRows("cls_timtable_filters", 0).then(
            (filtersData) => ({
              filtersData,
              academicData: [] as AnyRow[],
              batchesData: [] as AnyRow[],
              regulationData: [] as AnyRow[],
              regulationDataExam: [] as AnyRow[],
            }),
          )
        : options.examFilters
          ? getAffiliatedCollegeExamFilters(orgId, empId).then((r) => ({
              filtersData: r.filtersData,
              academicData: [] as AnyRow[],
              batchesData: [] as AnyRow[],
              regulationData: [] as AnyRow[],
              regulationDataExam: r.regulationData ?? [],
            }))
          : getAffiliatedCollegeFilters(orgId, empId).then((r) => ({
              filtersData: r.filtersData,
              academicData: r.academicData ?? [],
              batchesData: r.batchesData ?? [],
              regulationData: r.regulationData ?? [],
              regulationDataExam: [] as AnyRow[],
            })),
  });

  const filtersData = filterBundle?.filtersData ?? [];
  const academicData = filterBundle?.academicData ?? [];
  const batchesData = filterBundle?.batchesData ?? [];
  const regulationData = [
    ...(filterBundle?.regulationData ?? []),
    ...(filterBundle?.regulationDataExam ?? []),
  ];

  const [universityId, setUniversityId] = useState<number | null>(null);
  const [collegeId, setCollegeId] = useState<number | null>(null);
  const [academicYearId, setAcademicYearId] = useState<number | null>(null);
  const [courseId, setCourseId] = useState<number | null>(null);
  const [courseGroupId, setCourseGroupId] = useState<number | null>(null);
  const [courseYearId, setCourseYearId] = useState<number | null>(null);
  const [examId, setExamId] = useState<number | null>(null);
  const [regulationId, setRegulationId] = useState<number | null>(null);

  const universities = useMemo(
    () => distinctBy(filtersData, UNI),
    [filtersData],
  );

  const colleges = useMemo(() => {
    // Angular marks: colleges after Course + Exam Year + Exam
    if (options.courseFirstCascade) {
      if (!courseId || !academicYearId || !examId) return [];
      return distinctBy(
        filtersData.filter(
          (r) =>
            rowMatches(r, CRS, courseId) &&
            rowMatches(r, AY, academicYearId) &&
            rowMatches(r, EX, examId),
        ),
        COL,
      ).sort(
        (a, b) => Number(a.clg_sort_order ?? 0) - Number(b.clg_sort_order ?? 0),
      );
    }
    return distinctBy(filtersData, COL).sort(
      (a, b) => Number(a.clg_sort_order ?? 0) - Number(b.clg_sort_order ?? 0),
    );
  }, [
    filtersData,
    courseId,
    academicYearId,
    examId,
    options.courseFirstCascade,
  ]);

  const academicYears = useMemo(() => {
    // Angular marks: Exam Year options from selected Course
    if (options.courseFirstCascade) {
      if (!courseId) return [];
      return distinctBy(
        filtersData.filter((r) => rowMatches(r, CRS, courseId)),
        AY,
      ).sort(
        (a, b) =>
          parseInt(String(b.academic_year ?? 0), 10) -
          parseInt(String(a.academic_year ?? 0), 10),
      );
    }
    if (!collegeId) return [];
    if (options.timetableFilters || options.examFirstCascade) {
      return distinctBy(
        filtersData.filter((r) => rowMatches(r, COL, collegeId)),
        AY,
      ).sort(
        (a, b) =>
          parseInt(String(b.academic_year ?? 0), 10) -
          parseInt(String(a.academic_year ?? 0), 10),
      );
    }
    return academicYearRowsForCollegeFromProc(
      filtersData,
      academicData,
      collegeId,
    );
  }, [
    filtersData,
    academicData,
    collegeId,
    courseId,
    options.timetableFilters,
    options.examFirstCascade,
    options.courseFirstCascade,
  ]);

  const courses = useMemo(() => {
    // Angular marks: Course is first — all distinct courses from clg_exam_filters
    if (options.courseFirstCascade) {
      return distinctBy(filtersData, CRS);
    }
    if (!collegeId) return [];
    let base = filtersData.filter((r) => rowMatches(r, COL, collegeId));
    if (
      (options.scopeByAcademicYear || options.examFirstCascade) &&
      academicYearId
    ) {
      base = base.filter((r) => rowMatches(r, AY, academicYearId));
    }
    return distinctBy(base, CRS);
  }, [
    filtersData,
    collegeId,
    academicYearId,
    options.scopeByAcademicYear,
    options.examFirstCascade,
    options.courseFirstCascade,
  ]);

  const exams = useMemo(() => {
    if (options.courseFirstCascade) {
      if (!courseId || !academicYearId) return [];
      let rows = distinctBy(
        filtersData.filter(
          (r) =>
            rowMatches(r, CRS, courseId) && rowMatches(r, AY, academicYearId),
        ),
        EX,
      );
      if (options.examKind === "internal") {
        rows = rows.filter((r) =>
          Boolean(r.is_internal_exam ?? r.isInternalExam),
        );
      } else if (options.examKind === "external") {
        rows = rows.filter(
          (r) => !Boolean(r.is_internal_exam ?? r.isInternalExam),
        );
      }
      return rows;
    }
    if (!collegeId || !academicYearId || !courseId) return [];
    if (options.examFirstCascade) {
      return distinctBy(
        filtersData.filter(
          (r) =>
            rowMatches(r, COL, collegeId) &&
            rowMatches(r, AY, academicYearId) &&
            rowMatches(r, CRS, courseId),
        ),
        EX,
      );
    }
    if (courseGroupId == null || !courseYearId) return [];
    return distinctBy(
      filtersData.filter(
        (r) =>
          rowMatches(r, COL, collegeId) &&
          rowMatches(r, AY, academicYearId) &&
          rowMatches(r, CRS, courseId) &&
          rowMatches(r, GRP, courseGroupId) &&
          rowMatches(r, CYR, courseYearId),
      ),
      EX,
    );
  }, [
    filtersData,
    collegeId,
    academicYearId,
    courseId,
    courseGroupId,
    courseYearId,
    options.examFirstCascade,
    options.courseFirstCascade,
    options.examKind,
  ]);

  const courseGroups = useMemo(() => {
    if (!collegeId || !courseId) return [];
    if ((options.examFirstCascade || options.courseFirstCascade) && !examId)
      return [];
    let base = filtersData.filter(
      (r) => rowMatches(r, COL, collegeId) && rowMatches(r, CRS, courseId),
    );
    if (
      (options.scopeByAcademicYear ||
        options.examFirstCascade ||
        options.courseFirstCascade) &&
      academicYearId
    ) {
      base = base.filter((r) => rowMatches(r, AY, academicYearId));
    }
    if ((options.examFirstCascade || options.courseFirstCascade) && examId) {
      base = base.filter((r) => rowMatches(r, EX, examId));
    }
    return distinctBy(base, GRP);
  }, [
    filtersData,
    collegeId,
    courseId,
    academicYearId,
    examId,
    options.scopeByAcademicYear,
    options.examFirstCascade,
    options.courseFirstCascade,
  ]);

  const courseYears = useMemo(() => {
    if (!collegeId || !courseId || courseGroupId == null) return [];
    if ((options.examFirstCascade || options.courseFirstCascade) && !examId)
      return [];
    let base = filtersData.filter(
      (r) =>
        rowMatches(r, COL, collegeId) &&
        rowMatches(r, CRS, courseId) &&
        (courseGroupId === 0 || rowMatches(r, GRP, courseGroupId)),
    );
    if (
      (options.scopeByAcademicYear ||
        options.examFirstCascade ||
        options.courseFirstCascade) &&
      academicYearId
    ) {
      base = base.filter((r) => rowMatches(r, AY, academicYearId));
    }
    if ((options.examFirstCascade || options.courseFirstCascade) && examId) {
      base = base.filter((r) => rowMatches(r, EX, examId));
    }
    return distinctBy(base, CYR).sort(
      (a, b) => Number(a.year_order ?? 0) - Number(b.year_order ?? 0),
    );
  }, [
    filtersData,
    collegeId,
    courseId,
    courseGroupId,
    academicYearId,
    examId,
    options.scopeByAcademicYear,
    options.examFirstCascade,
    options.courseFirstCascade,
  ]);

  const regulations = useMemo(() => {
    if (!options.trackRegulation || !collegeId || !courseId) return [];
    const collegeRow = filtersData.find((r) => pickNum(r, COL) === collegeId);
    const universityId = pickNum(collegeRow ?? {}, UNI);
    return listAffiliatedRegulationsForCourse(
      regulationData as Record<string, unknown>[],
      universityId,
      courseId,
      filtersData as Record<string, unknown>[],
      collegeId,
    );
  }, [
    options.trackRegulation,
    regulationData,
    filtersData,
    collegeId,
    courseId,
  ]);

  useEffect(() => {
    if (
      !options.requireUniversity ||
      universities.length === 0 ||
      universityId != null
    )
      return;
    const seed = options.initialSelection?.universityId;
    if (seed && seed > 0) {
      setUniversityId(seed);
      return;
    }
    if (!options.autoSelectFirst) return;
    setUniversityId(pickNum(universities[0], UNI));
  }, [
    options.requireUniversity,
    options.autoSelectFirst,
    options.initialSelection?.universityId,
    universities,
    universityId,
  ]);

  useEffect(() => {
    if (colleges.length === 0 || collegeId != null) return;
    const seed = options.initialSelection?.collegeId;
    if (seed && seed > 0) {
      setCollegeId(seed);
      return;
    }
    if (!options.autoSelectFirst) return;
    setCollegeId(pickNum(colleges[0], COL));
  }, [
    options.autoSelectFirst,
    options.initialSelection?.collegeId,
    colleges,
    collegeId,
  ]);

  useEffect(() => {
    if (academicYears.length === 0) return;
    if (academicYearId == null) {
      const seed = options.initialSelection?.academicYearId;
      setAcademicYearId(
        seed && seed > 0
          ? seed
          : options.autoSelectFirst
            ? pickNum(academicYears[0], AY)
            : null,
      );
    }
  }, [
    options.autoSelectFirst,
    options.initialSelection?.academicYearId,
    academicYears,
    academicYearId,
  ]);

  useEffect(() => {
    if (courseId != null) return;
    const seed = options.initialSelection?.courseId;
    if (seed && seed > 0) {
      setCourseId(seed);
      return;
    }
    if (courses.length === 0) return;
    if (!options.autoSelectFirst) return;
    setCourseId(pickNum(courses[0], CRS));
  }, [
    options.autoSelectFirst,
    options.initialSelection?.courseId,
    courses,
    courseId,
  ]);

  useEffect(() => {
    if (courseGroupId != null) return;
    const seed = options.initialSelection?.courseGroupId;
    if (seed != null) {
      setCourseGroupId(seed);
      return;
    }
    if (courseGroups.length === 0) return;
    if (!options.autoSelectFirst) return;
    setCourseGroupId(
      options.allowAllGroupYear &&
        !options.examFirstCascade &&
        !options.courseFirstCascade
        ? 0
        : pickNum(courseGroups[0], GRP),
    );
  }, [
    options.autoSelectFirst,
    options.initialSelection?.courseGroupId,
    options.allowAllGroupYear,
    options.examFirstCascade,
    options.courseFirstCascade,
    courseGroups,
    courseGroupId,
  ]);

  useEffect(() => {
    if (courseYearId != null) return;
    const seed = options.initialSelection?.courseYearId;
    if (seed != null) {
      setCourseYearId(seed);
      return;
    }
    if (courseYears.length === 0) return;
    if (!options.autoSelectFirst) return;
    setCourseYearId(
      options.allowAllGroupYear &&
        !options.examFirstCascade &&
        !options.courseFirstCascade
        ? 0
        : pickNum(courseYears[0], CYR),
    );
  }, [
    options.autoSelectFirst,
    options.initialSelection?.courseYearId,
    options.allowAllGroupYear,
    options.examFirstCascade,
    options.courseFirstCascade,
    courseYears,
    courseYearId,
  ]);

  useEffect(() => {
    if (!options.trackRegulation) return;

    const seed = options.initialSelection?.regulationId;
    if (seed != null && seed > 0) {
      const valid =
        regulations.length === 0 ||
        regulations.some(
          (r) => pickNum(r, ["fk_regulation_id", "regulationId"]) === seed,
        );
      if (valid) {
        setRegulationId(seed);
        return;
      }
    }

    if (regulationId != null && regulationId > 0) {
      const stillValid =
        regulations.length === 0 ||
        regulations.some(
          (r) =>
            pickNum(r, ["fk_regulation_id", "regulationId"]) === regulationId,
        );
      if (stillValid) return;
    }

    if (regulations.length > 0) {
      const firstId = pickNum(regulations[0] as AffiliatedCollegeFilterRow, [
        "fk_regulation_id",
        "regulationId",
      ]);
      if (firstId > 0) {
        setRegulationId(firstId);
        return;
      }
    }

    const collegeRow = filtersData.find((r) => pickNum(r, COL) === collegeId);
    const resolved = resolveRegulationFromFilterContext({
      filtersData: filtersData as Record<string, unknown>[],
      regulationData: regulationData as Record<string, unknown>[],
      collegeId: collegeId ?? 0,
      courseId: courseId ?? 0,
      courseGroupId: courseGroupId ?? 0,
      courseYearId: courseYearId ?? 0,
      universityId: pickNum(collegeRow ?? {}, UNI),
      queryRegulationId: seed,
    });
    setRegulationId(resolved > 0 ? resolved : 0);
  }, [
    options.trackRegulation,
    options.initialSelection?.regulationId,
    regulations,
    regulationId,
    filtersData,
    regulationData,
    collegeId,
    courseId,
    courseGroupId,
    courseYearId,
  ]);

  useEffect(() => {
    if (
      (!options.examFilters &&
        !options.examFirstCascade &&
        !options.courseFirstCascade) ||
      examId != null
    )
      return;
    const seed = options.initialSelection?.examId;
    if (seed && seed > 0) {
      setExamId(seed);
      return;
    }
    if (exams.length === 0) return;
    if (
      !options.autoSelectFirst &&
      !options.examFirstCascade &&
      !options.courseFirstCascade
    )
      return;
    setExamId(pickNum(exams[0], EX));
  }, [
    options.examFilters,
    options.examFirstCascade,
    options.courseFirstCascade,
    options.autoSelectFirst,
    options.initialSelection?.examId,
    exams,
    examId,
  ]);

  const onExamChange = useCallback(
    (id: number) => {
      setExamId(id);
      if (options.courseFirstCascade) {
        setCollegeId(null);
      }
      setCourseGroupId(null);
      setCourseYearId(null);
    },
    [options.courseFirstCascade],
  );

  const onUniversityChange = useCallback(
    (id: number) => {
      setUniversityId(id);
      setCollegeId(null);
      setAcademicYearId(null);
      setCourseId(null);
      setCourseGroupId(null);
      setCourseYearId(null);
      setExamId(null);
      if (options.trackRegulation) setRegulationId(null);
    },
    [options.trackRegulation],
  );

  const onCollegeChange = useCallback(
    (id: number) => {
      setCollegeId(id);
      const collegeRow = filtersData.find((r) => pickNum(r, COL) === id);
      const inferredUniversity = pickNum(collegeRow ?? {}, UNI);
      if (inferredUniversity > 0) setUniversityId(inferredUniversity);
      if (options.courseFirstCascade) {
        setCourseGroupId(null);
        setCourseYearId(null);
      } else {
        setAcademicYearId(null);
        setCourseId(null);
        setCourseGroupId(null);
        setCourseYearId(null);
        setExamId(null);
      }
      if (options.trackRegulation) setRegulationId(null);
    },
    [filtersData, options.trackRegulation, options.courseFirstCascade],
  );

  const onAcademicYearChange = useCallback(
    (id: number) => {
      setAcademicYearId(id);
      if (options.courseFirstCascade) {
        setExamId(null);
        setCollegeId(null);
        setCourseGroupId(null);
        setCourseYearId(null);
      } else {
        setCourseId(null);
        setCourseGroupId(null);
        setCourseYearId(null);
        setExamId(null);
      }
      if (options.trackRegulation) setRegulationId(null);
    },
    [options.trackRegulation, options.courseFirstCascade],
  );

  const onCourseChange = useCallback(
    (id: number) => {
      setCourseId(id);
      if (options.courseFirstCascade) {
        setAcademicYearId(null);
        setExamId(null);
        setCollegeId(null);
        setCourseGroupId(null);
        setCourseYearId(null);
      } else {
        setCourseGroupId(null);
        setCourseYearId(null);
        setExamId(null);
      }
      if (options.trackRegulation) setRegulationId(null);
    },
    [options.trackRegulation, options.courseFirstCascade],
  );

  const onCourseGroupChange = useCallback(
    (id: number) => {
      setCourseGroupId(id);
      setCourseYearId(null);
      if (!options.examFirstCascade && !options.courseFirstCascade) {
        setExamId(null);
      }
    },
    [options.examFirstCascade, options.courseFirstCascade],
  );

  const onCourseYearChange = useCallback(
    (id: number) => {
      setCourseYearId(id);
      if (!options.examFirstCascade && !options.courseFirstCascade) {
        setExamId(null);
      }
    },
    [options.examFirstCascade, options.courseFirstCascade],
  );

  const onRegulationChange = useCallback((id: number) => {
    setRegulationId(id);
  }, []);

  const contextLabel = useMemo(() => {
    const parts: string[] = [];
    const college = colleges.find((c) => pickNum(c, COL) === collegeId);
    if (college) parts.push(label(college, "college_code", "collegeCode"));
    const ay = academicYears.find((a) => pickNum(a, AY) === academicYearId);
    if (ay) parts.push(label(ay, "academic_year", "academicYear"));
    const course = courses.find((c) => pickNum(c, CRS) === courseId);
    if (course) parts.push(label(course, "course_code", "courseCode"));
    if (courseGroupId === 0) {
      parts.push("All");
    } else {
      const grp = courseGroups.find((g) => pickNum(g, GRP) === courseGroupId);
      if (grp)
        parts.push(
          label(grp, "group_code", "groupCode", "group_name", "groupName"),
        );
    }
    if (courseYearId === 0) {
      parts.push("All");
    } else {
      const yr = courseYears.find((y) => pickNum(y, CYR) === courseYearId);
      if (yr) parts.push(label(yr, "course_year_name", "courseYearName"));
    }
    const ex = exams.find((e) => pickNum(e, EX) === examId);
    if (ex) parts.push(label(ex, "exam_name", "examName"));
    return parts.filter(Boolean).join(" / ");
  }, [
    colleges,
    collegeId,
    academicYears,
    academicYearId,
    courses,
    courseId,
    courseGroups,
    courseGroupId,
    courseYears,
    courseYearId,
    exams,
    examId,
  ]);

  const requireGroupYear = options.requireGroupYear !== false;
  const requireCourse = options.requireCourse !== false;
  const requireUniversity = options.requireUniversity === true;

  const baseFiltersValid = requireGroupYear
    ? collegeId != null &&
      collegeId > 0 &&
      academicYearId != null &&
      academicYearId > 0 &&
      courseId != null &&
      courseId > 0 &&
      courseGroupId != null &&
      courseYearId != null
    : requireCourse
      ? collegeId != null &&
        collegeId > 0 &&
        academicYearId != null &&
        academicYearId > 0 &&
        courseId != null &&
        courseId > 0
      : requireUniversity
        ? universityId != null &&
          universityId > 0 &&
          collegeId != null &&
          collegeId > 0 &&
          academicYearId != null &&
          academicYearId > 0
        : collegeId != null &&
          collegeId > 0 &&
          academicYearId != null &&
          academicYearId > 0;

  const filtersValid =
    baseFiltersValid &&
    ((!options.examFirstCascade && !options.courseFirstCascade) ||
      (examId ?? 0) > 0) &&
    (!options.trackRegulation ||
      (options.requirePositiveRegulation
        ? (regulationId ?? 0) > 0
        : regulationId != null));

  return {
    isLoading,
    filtersData,
    batchesData,
    regulationData,
    universityId,
    collegeId,
    academicYearId,
    courseId,
    courseGroupId,
    courseYearId,
    regulationId,
    examId,
    setExamId,
    universities,
    colleges,
    academicYears,
    courses,
    courseGroups,
    courseYears,
    regulations,
    exams,
    onUniversityChange,
    onCollegeChange,
    onAcademicYearChange,
    onCourseChange,
    onCourseGroupChange,
    onCourseYearChange,
    onRegulationChange,
    onExamChange,
    contextLabel,
    filtersValid,
    toFilterParams: () => ({
      collegeId: collegeId ?? 0,
      academicYearId: academicYearId ?? 0,
      courseId: courseId ?? 0,
      courseGroupId: courseGroupId ?? 0,
      courseYearId: courseYearId ?? 0,
      ...(options.trackRegulation ? { regulationId: regulationId ?? 0 } : {}),
      ...(options.examFirstCascade ||
      options.examFilters ||
      options.courseFirstCascade
        ? { examId: examId ?? 0 }
        : {}),
    }),
  };
}
