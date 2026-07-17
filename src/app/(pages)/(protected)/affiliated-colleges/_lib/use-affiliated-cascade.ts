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
import type { AffiliatedCollegeFilterRow } from "@/types/affiliated-colleges";

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
  };
};

export function useAffiliatedCascade(options: AffiliatedCascadeOptions = {}) {
  const orgId = resolveAffiliatedOrgId();
  const empId = resolveAffiliatedEmployeeId();

  const { data: filterBundle, isLoading } = useQuery({
    queryKey: options.examFilters
      ? QK.affiliatedColleges.examFilters(orgId, empId)
      : QK.affiliatedColleges.collegeFilters(orgId, empId),
    queryFn: () =>
      options.examFilters
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

  const universities = useMemo(
    () => distinctBy(filtersData, UNI),
    [filtersData],
  );

  const colleges = useMemo(
    () =>
      distinctBy(filtersData, COL).sort(
        (a, b) => Number(a.clg_sort_order ?? 0) - Number(b.clg_sort_order ?? 0),
      ),
    [filtersData],
  );

  const academicYears = useMemo(() => {
    if (!collegeId) return [];
    return academicYearRowsForCollegeFromProc(
      filtersData,
      academicData,
      collegeId,
    );
  }, [filtersData, academicData, collegeId]);

  const courses = useMemo(() => {
    if (!collegeId) return [];
    return distinctBy(
      filtersData.filter((r) => rowMatches(r, COL, collegeId)),
      CRS,
    );
  }, [filtersData, collegeId]);

  const courseGroups = useMemo(() => {
    if (!collegeId || !courseId) return [];
    return distinctBy(
      filtersData.filter(
        (r) => rowMatches(r, COL, collegeId) && rowMatches(r, CRS, courseId),
      ),
      GRP,
    );
  }, [filtersData, collegeId, courseId]);

  const courseYears = useMemo(() => {
    if (!collegeId || !courseId || courseGroupId == null) return [];
    const base = filtersData.filter(
      (r) =>
        rowMatches(r, COL, collegeId) &&
        rowMatches(r, CRS, courseId) &&
        (courseGroupId === 0 || rowMatches(r, GRP, courseGroupId)),
    );
    return distinctBy(base, CYR).sort(
      (a, b) => Number(a.year_order ?? 0) - Number(b.year_order ?? 0),
    );
  }, [filtersData, collegeId, courseId, courseGroupId]);

  const exams = useMemo(() => {
    if (
      !collegeId ||
      !academicYearId ||
      !courseId ||
      courseGroupId == null ||
      !courseYearId
    )
      return [];
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
    if (courses.length === 0) return;
    if (courseId == null) {
      const seed = options.initialSelection?.courseId;
      setCourseId(
        seed && seed > 0
          ? seed
          : options.autoSelectFirst
            ? pickNum(courses[0], CRS)
            : null,
      );
    }
  }, [
    options.autoSelectFirst,
    options.initialSelection?.courseId,
    courses,
    courseId,
  ]);

  useEffect(() => {
    if (courseGroups.length === 0) return;
    if (courseGroupId == null) {
      const seed = options.initialSelection?.courseGroupId;
      if (seed != null) {
        setCourseGroupId(seed);
        return;
      }
      if (!options.autoSelectFirst) return;
      setCourseGroupId(
        options.allowAllGroupYear ? 0 : pickNum(courseGroups[0], GRP),
      );
    }
  }, [
    options.autoSelectFirst,
    options.initialSelection?.courseGroupId,
    options.allowAllGroupYear,
    courseGroups,
    courseGroupId,
  ]);

  useEffect(() => {
    if (courseYears.length === 0) return;
    if (courseYearId == null) {
      const seed = options.initialSelection?.courseYearId;
      if (seed != null) {
        setCourseYearId(seed);
        return;
      }
      if (!options.autoSelectFirst) return;
      setCourseYearId(
        options.allowAllGroupYear ? 0 : pickNum(courseYears[0], CYR),
      );
    }
  }, [
    options.autoSelectFirst,
    options.initialSelection?.courseYearId,
    options.allowAllGroupYear,
    courseYears,
    courseYearId,
  ]);

  useEffect(() => {
    if (!options.examFilters || exams.length === 0 || examId != null) return;
    setExamId(pickNum(exams[0], EX));
  }, [options.examFilters, exams, examId]);

  const onUniversityChange = useCallback((id: number) => {
    setUniversityId(id);
    setCollegeId(null);
    setAcademicYearId(null);
    setCourseId(null);
    setCourseGroupId(null);
    setCourseYearId(null);
    setExamId(null);
  }, []);

  const onCollegeChange = useCallback(
    (id: number) => {
      setCollegeId(id);
      const collegeRow = filtersData.find((r) => pickNum(r, COL) === id);
      const inferredUniversity = pickNum(collegeRow ?? {}, UNI);
      if (inferredUniversity > 0) setUniversityId(inferredUniversity);
      setAcademicYearId(null);
      setCourseId(null);
      setCourseGroupId(null);
      setCourseYearId(null);
      setExamId(null);
    },
    [filtersData],
  );

  const onAcademicYearChange = useCallback((id: number) => {
    setAcademicYearId(id);
    setCourseId(null);
    setCourseGroupId(null);
    setCourseYearId(null);
    setExamId(null);
  }, []);

  const onCourseChange = useCallback((id: number) => {
    setCourseId(id);
    setCourseGroupId(null);
    setCourseYearId(null);
    setExamId(null);
  }, []);

  const onCourseGroupChange = useCallback((id: number) => {
    setCourseGroupId(id);
    setCourseYearId(null);
    setExamId(null);
  }, []);

  const onCourseYearChange = useCallback((id: number) => {
    setCourseYearId(id);
    setExamId(null);
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

  const filtersValid = requireGroupYear
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
    examId,
    setExamId,
    universities,
    colleges,
    academicYears,
    courses,
    courseGroups,
    courseYears,
    exams,
    onUniversityChange,
    onCollegeChange,
    onAcademicYearChange,
    onCourseChange,
    onCourseGroupChange,
    onCourseYearChange,
    contextLabel,
    filtersValid,
    toFilterParams: () => ({
      collegeId: collegeId ?? 0,
      academicYearId: academicYearId ?? 0,
      courseId: courseId ?? 0,
      courseGroupId: courseGroupId ?? 0,
      courseYearId: courseYearId ?? 0,
    }),
  };
}
