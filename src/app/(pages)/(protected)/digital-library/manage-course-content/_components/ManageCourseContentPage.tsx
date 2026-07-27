"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FilteredPage } from "@/components/layout";
import { Select, type SelectOption } from "@/common/components/select";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
import { useSessionContext } from "@/context/SessionContext";
import { useLoginEmployeeId } from "@/hooks/useLoginEmployeeId";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  getDigitalLibraryClgFilters,
  getOnlineCourseAcademicMap,
  type ClgFilterAcademicYearRow,
  type ClgFilterCourseYearRow,
  type OnlineCourseAcademicMapRow,
} from "@/services";
import {
  applySubjectCardColors,
  OnlineCourseSubjectCards,
} from "../../_components/OnlineCourseSubjectCards";

function num(val: unknown): number {
  const n = Number(val);
  return Number.isFinite(n) ? n : 0;
}

function text(val: unknown): string {
  if (typeof val === "string") return val;
  if (typeof val === "number") return String(val);
  return "";
}

function uniqueBy<T>(rows: T[], key: (row: T) => number): T[] {
  const seen = new Set<number>();
  return rows.filter((row) => {
    const k = key(row);
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function asOptions<T>(
  rows: T[],
  getValue: (r: T) => number,
  getLabel: (r: T) => string,
): SelectOption[] {
  return rows.map((row) => ({
    value: String(getValue(row)),
    label: getLabel(row),
  }));
}

function readOrgId(userOrgId: unknown): number {
  const fromUser = num(userOrgId);
  if (fromUser > 0) return fromUser;
  if (typeof globalThis === "undefined" || !globalThis.localStorage) return 0;
  for (const key of ["organizationId", "orgId", "orgID"]) {
    const n = num(globalThis.localStorage.getItem(key));
    if (n > 0) return n;
  }
  return 0;
}

type PageParams = {
  collegeId?: number;
  academicYearId?: number;
  courseId?: number;
  courseGroupId?: number;
  courseYearId?: number;
};

export function ManageCourseContentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: sessionLoading } = useSessionContext();
  const { employeeId, isResolving } = useLoginEmployeeId(user, sessionLoading);

  const [loadingFilters, setLoadingFilters] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [filtersData, setFiltersData] = useState<ClgFilterCourseYearRow[]>([]);
  const [academicYearData, setAcademicYearData] = useState<
    ClgFilterAcademicYearRow[]
  >([]);
  const [subjects, setSubjects] = useState<OnlineCourseAcademicMapRow[]>([]);

  const [collegeId, setCollegeId] = useState<number | null>(null);
  const [academicYearId, setAcademicYearId] = useState<number | null>(null);
  const [courseId, setCourseId] = useState<number | null>(null);
  const [courseGroupId, setCourseGroupId] = useState<number | null>(null);
  const [courseYearId, setCourseYearId] = useState<number | null>(null);

  /** One-shot restore from URL (Back from upload). Cleared after apply / manual change. */
  const pageParamsRef = useRef<PageParams | null>(null);
  const pageParamsAppliedRef = useRef(false);
  const filterLoadGen = useRef(0);
  const subjectLoadGen = useRef(0);
  /** Latest filter snapshot for subject loads (avoids stale closures). */
  const selectionRef = useRef({
    collegeId: null as number | null,
    academicYearId: null as number | null,
    courseGroupId: null as number | null,
    courseYearId: null as number | null,
  });

  useEffect(() => {
    selectionRef.current = {
      collegeId,
      academicYearId,
      courseGroupId,
      courseYearId,
    };
  }, [collegeId, academicYearId, courseGroupId, courseYearId]);

  useEffect(() => {
    const college = num(searchParams.get("collegeId"));
    const academicYear = num(searchParams.get("academicYearId"));
    const course = num(searchParams.get("courseId"));
    const group = num(searchParams.get("courseGroupId"));
    const year = num(searchParams.get("courseYearId"));
    if (college || academicYear || course || group || year) {
      pageParamsRef.current = {
        collegeId: college || undefined,
        academicYearId: academicYear || undefined,
        courseId: course || undefined,
        courseGroupId: group || undefined,
        courseYearId: year || undefined,
      };
      pageParamsAppliedRef.current = false;
    }
  }, [searchParams]);

  function clearPageParams() {
    pageParamsRef.current = null;
    pageParamsAppliedRef.current = true;
  }

  const colleges = useMemo(
    () =>
      uniqueBy(filtersData, (r) => num(r.fk_college_id)).sort(
        (a, b) => num(a.clg_sort_order) - num(b.clg_sort_order),
      ),
    [filtersData],
  );

  const selectedUniversityId = useMemo(() => {
    if (!collegeId) return null;
    return (
      num(
        filtersData.find((r) => num(r.fk_college_id) === collegeId)
          ?.fk_university_id,
      ) || null
    );
  }, [filtersData, collegeId]);

  const academicYears = useMemo(() => {
    if (!selectedUniversityId) return [];
    const rows = academicYearData.filter(
      (r) => num(r.fk_university_id) === selectedUniversityId,
    );
    return uniqueBy(rows, (r) => num(r.fk_academic_year_id)).sort(
      (a, b) => num(b.academic_year) - num(a.academic_year),
    );
  }, [academicYearData, selectedUniversityId]);

  const courses = useMemo(() => {
    if (!collegeId) return [];
    const rows = filtersData.filter((r) => num(r.fk_college_id) === collegeId);
    return uniqueBy(rows, (r) => num(r.fk_course_id));
  }, [filtersData, collegeId]);

  const courseGroups = useMemo(() => {
    if (!collegeId || !courseId) return [];
    const rows = filtersData.filter(
      (r) =>
        num(r.fk_college_id) === collegeId && num(r.fk_course_id) === courseId,
    );
    return uniqueBy(rows, (r) => num(r.fk_course_group_id));
  }, [filtersData, collegeId, courseId]);

  const courseYears = useMemo(() => {
    if (!collegeId || !courseId || !courseGroupId) return [];
    const rows = filtersData.filter(
      (r) =>
        num(r.fk_college_id) === collegeId &&
        num(r.fk_course_id) === courseId &&
        num(r.fk_course_group_id) === courseGroupId,
    );
    return uniqueBy(rows, (r) => num(r.fk_course_year_id)).sort(
      (a, b) => num(a.year_order) - num(b.year_order),
    );
  }, [filtersData, collegeId, courseId, courseGroupId]);

  const collegeOptions = useMemo(
    () =>
      asOptions(
        colleges,
        (r) => num(r.fk_college_id),
        (r) => text(r.college_code),
      ),
    [colleges],
  );
  const academicYearOptions = useMemo(
    () =>
      asOptions(
        academicYears,
        (r) => num(r.fk_academic_year_id),
        (r) => text(r.academic_year),
      ),
    [academicYears],
  );
  const courseOptions = useMemo(
    () =>
      asOptions(
        courses,
        (r) => num(r.fk_course_id),
        (r) => text(r.course_code),
      ),
    [courses],
  );
  const groupOptions = useMemo(
    () =>
      asOptions(
        courseGroups,
        (r) => num(r.fk_course_group_id),
        (r) => text(r.group_code),
      ),
    [courseGroups],
  );
  const yearOptions = useMemo(
    () =>
      asOptions(
        courseYears,
        (r) => num(r.fk_course_year_id),
        (r) => text(r.course_year_name),
      ),
    [courseYears],
  );

  const loadSubjects = useCallback(
    async (clgId: number, ayId: number, grpId: number, cyrId: number) => {
      if (!clgId || !ayId || !grpId || !cyrId) {
        setSubjects([]);
        return;
      }

      const loadId = ++subjectLoadGen.current;
      setSubjects([]);
      setLoadingSubjects(true);
      try {
        const result = await getOnlineCourseAcademicMap({
          collegeId: clgId,
          academicYearId: ayId,
          courseGroupId: grpId,
          courseYearId: cyrId,
        });
        // Ignore stale responses from a previous filter selection
        if (loadId !== subjectLoadGen.current) return;
        const sel = selectionRef.current;
        if (
          sel.collegeId !== clgId ||
          sel.academicYearId !== ayId ||
          sel.courseGroupId !== grpId ||
          sel.courseYearId !== cyrId
        ) {
          return;
        }

        setSubjects(applySubjectCardColors(result.rows, 6));
        // Angular: snotifyService.success(result.message) when no data
        if (!result.success || result.rows.length === 0) {
          toastSuccess(result.message || "No Records(s) found.");
        }
      } catch (error) {
        if (loadId === subjectLoadGen.current) {
          toastError(error, "Failed to load course content");
          setSubjects([]);
        }
      } finally {
        if (loadId === subjectLoadGen.current) {
          setLoadingSubjects(false);
        }
      }
    },
    [],
  );

  const onSelectYear = useCallback(
    (yearId: number | null) => {
      clearPageParams();
      setCourseYearId(yearId);
      setSubjects([]);
      subjectLoadGen.current += 1;
      if (collegeId && academicYearId && courseGroupId && yearId) {
        void loadSubjects(collegeId, academicYearId, courseGroupId, yearId);
      }
    },
    [collegeId, academicYearId, courseGroupId, loadSubjects],
  );

  const onSelectGroup = useCallback((groupId: number | null) => {
    clearPageParams();
    subjectLoadGen.current += 1;
    setCourseGroupId(groupId);
    setCourseYearId(null);
    setSubjects([]);
    setLoadingSubjects(false);
  }, []);

  const onSelectCourse = useCallback((nextCourseId: number | null) => {
    clearPageParams();
    subjectLoadGen.current += 1;
    setCourseId(nextCourseId);
    setCourseGroupId(null);
    setCourseYearId(null);
    setSubjects([]);
    setLoadingSubjects(false);
  }, []);

  const onSelectAcademicYear = useCallback((nextAyId: number | null) => {
    clearPageParams();
    subjectLoadGen.current += 1;
    setAcademicYearId(nextAyId);
    setCourseId(null);
    setCourseGroupId(null);
    setCourseYearId(null);
    setSubjects([]);
    setLoadingSubjects(false);
  }, []);

  const onSelectCollege = useCallback((nextCollegeId: number | null) => {
    clearPageParams();
    subjectLoadGen.current += 1;
    setCollegeId(nextCollegeId);
    setAcademicYearId(null);
    setCourseId(null);
    setCourseGroupId(null);
    setCourseYearId(null);
    setSubjects([]);
    setLoadingSubjects(false);
  }, []);

  // Cascade defaults matching Angular selected* handlers (pageParams used once only)
  useEffect(() => {
    if (!collegeId || academicYears.length === 0) return;
    if (academicYearId) return;
    const pp = pageParamsRef.current;
    if (
      pp?.academicYearId &&
      academicYears.some(
        (r) => num(r.fk_academic_year_id) === pp.academicYearId,
      )
    ) {
      setAcademicYearId(pp.academicYearId);
      return;
    }
    setAcademicYearId(num(academicYears[0]?.fk_academic_year_id) || null);
  }, [collegeId, academicYears, academicYearId]);

  useEffect(() => {
    if (!academicYearId || courses.length === 0) return;
    if (courseId) return;
    const pp = pageParamsRef.current;
    if (
      pp?.courseId &&
      courses.some((r) => num(r.fk_course_id) === pp.courseId)
    ) {
      setCourseId(pp.courseId);
      return;
    }
    setCourseId(num(courses[0]?.fk_course_id) || null);
  }, [academicYearId, courses, courseId]);

  useEffect(() => {
    if (!courseId || courseGroups.length === 0) return;
    if (courseGroupId) return;
    const pp = pageParamsRef.current;
    if (
      pp?.courseGroupId &&
      courseGroups.some((r) => num(r.fk_course_group_id) === pp.courseGroupId)
    ) {
      setCourseGroupId(pp.courseGroupId);
      return;
    }
    setCourseGroupId(num(courseGroups[0]?.fk_course_group_id) || null);
  }, [courseId, courseGroups, courseGroupId]);

  // Restore course year from URL only once; Angular does not auto-pick first year
  useEffect(() => {
    if (!courseGroupId || courseYears.length === 0) return;
    if (pageParamsAppliedRef.current) return;
    const pp = pageParamsRef.current;
    if (
      pp?.courseYearId &&
      courseYears.some((r) => num(r.fk_course_year_id) === pp.courseYearId) &&
      courseYearId !== pp.courseYearId
    ) {
      pageParamsAppliedRef.current = true;
      const yearId = pp.courseYearId;
      setCourseYearId(yearId);
      setSubjects([]);
      if (collegeId && academicYearId && courseGroupId && yearId) {
        void loadSubjects(collegeId, academicYearId, courseGroupId, yearId);
      }
      clearPageParams();
    }
  }, [
    courseGroupId,
    courseYears,
    courseYearId,
    collegeId,
    academicYearId,
    loadSubjects,
  ]);

  useEffect(() => {
    if (sessionLoading || isResolving) return;
    const organizationId = readOrgId(user?.organizationId);
    if (!organizationId || !employeeId) return;

    const loadId = ++filterLoadGen.current;
    let cancelled = false;

    (async () => {
      setLoadingFilters(true);
      try {
        const data = await getDigitalLibraryClgFilters(
          organizationId,
          employeeId,
        );
        if (cancelled || loadId !== filterLoadGen.current) return;
        setFiltersData(data.filtersData);
        setAcademicYearData(data.academicYearData);

        const sorted = uniqueBy(data.filtersData, (r) =>
          num(r.fk_college_id),
        ).sort((a, b) => num(a.clg_sort_order) - num(b.clg_sort_order));
        const pp = pageParamsRef.current;
        if (
          pp?.collegeId &&
          sorted.some((r) => num(r.fk_college_id) === pp.collegeId)
        ) {
          setCollegeId(pp.collegeId);
        } else if (sorted.length > 0) {
          setCollegeId(num(sorted[0]?.fk_college_id) || null);
        }
      } catch (error) {
        if (!cancelled && loadId === filterLoadGen.current) {
          toastError(error, "Failed to load filters");
        }
      } finally {
        if (!cancelled && loadId === filterLoadGen.current) {
          setLoadingFilters(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.organizationId, employeeId, sessionLoading, isResolving]);

  function assignUnits(data: OnlineCourseAcademicMapRow) {
    if (data.onlinecourseAcademicmapId == null) return;
    const courseCode =
      courses.find((c) => num(c.fk_course_id) === num(courseId))?.course_code ??
      "";
    const qs = new URLSearchParams({
      collegeName: text(data.collegeCode),
      collegeId: String(data.collegeId ?? collegeId ?? ""),
      regulationCode: text(data.regulationCode),
      academicYearId: String(data.academicYearId ?? academicYearId ?? ""),
      studentAcademicbatchId: "",
      courseYearId: String(data.courseYearId ?? courseYearId ?? ""),
      courseGroupId: String(data.courseGroupId ?? courseGroupId ?? ""),
      onlineCourseId: String(data.onlineCourseId ?? ""),
      courseId: String(courseId ?? ""),
      courseGroupName: text(data.courseGroupCode),
      courseYearName: text(data.courseYearName),
      courseCode,
      onlinecourseAcademicmapId: String(data.onlinecourseAcademicmapId),
      academicYear: text(data.academicYear),
      subjectName: text(data.onlineCourseName),
      subjectId: String(data.subjectId ?? ""),
      page: "/digital-library/manage-course-content",
      pageno: "2",
      subjectCode: text(data.onlineCourseCode),
    });
    router.push(
      `/digital-library/manage-course-content/upload-subject-content?${qs.toString()}`,
    );
  }

  return (
    <FilteredPage
      title="Manage Course Content"
      filters={
        <GlobalFilterBarRow>
          <GlobalFilterField label="College *">
            <Select
              value={collegeId ? String(collegeId) : null}
              onChange={(v) => onSelectCollege(v ? Number(v) : null)}
              options={collegeOptions}
              placeholder="College"
              searchable
              isLoading={loadingFilters || sessionLoading || isResolving}
            />
          </GlobalFilterField>
          <GlobalFilterField label="Academic Year *">
            <Select
              value={academicYearId ? String(academicYearId) : null}
              onChange={(v) => onSelectAcademicYear(v ? Number(v) : null)}
              options={academicYearOptions}
              placeholder="Academic Year"
              searchable
              disabled={!collegeId}
            />
          </GlobalFilterField>
          <GlobalFilterField label="Course *">
            <Select
              value={courseId ? String(courseId) : null}
              onChange={(v) => onSelectCourse(v ? Number(v) : null)}
              options={courseOptions}
              placeholder="Course"
              searchable
              disabled={!academicYearId}
            />
          </GlobalFilterField>
          <GlobalFilterField label="Course Group *">
            <Select
              value={courseGroupId ? String(courseGroupId) : null}
              onChange={(v) => onSelectGroup(v ? Number(v) : null)}
              options={groupOptions}
              placeholder="Course Group"
              searchable
              disabled={!courseId}
            />
          </GlobalFilterField>
          <GlobalFilterField label="Course Year *">
            <Select
              value={courseYearId ? String(courseYearId) : null}
              onChange={(v) => onSelectYear(v ? Number(v) : null)}
              options={yearOptions}
              placeholder="Course Year"
              searchable
              disabled={!courseGroupId}
              isLoading={loadingSubjects}
            />
          </GlobalFilterField>
        </GlobalFilterBarRow>
      }
      body={
        subjects.length > 0 ? (
          <OnlineCourseSubjectCards
            subjects={subjects}
            onSelect={assignUnits}
            className="rounded-none border-0 shadow-none"
          />
        ) : null
      }
      bodyClassName="!border-t-0 !px-0 !pb-0 !pt-0"
    />
  );
}
