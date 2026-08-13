"use client";

/**
 * University Curriculum — Angular
 * `academics/master/university-curriculum` parity.
 *
 * Back from Subjects restores filters via query params:
 *   universityId, courseId, courseGroupId, regulationId
 * (Angular `goBack` / `pageParams` + cascade in selectedUniversity/Course/Group/Regulation).
 *
 * Table card: `*ngIf="courseYears.length > 0"`.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { Eye } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Select } from "@/common/components/select";
import { FilteredListPage } from "@/components/layout";
import {
  listActiveCourseGroupsByCourse,
  listActiveCourseYearsByCourse,
  listActiveCoursesByUniversity,
  listActiveRegulationsByCourse,
  listActiveUniversities,
} from "@/services";
import ViewSubjectsModal from "./ViewSubjectsModal";

type AnyRow = Record<string, any>;

type PageParams = {
  universityId: number | null;
  courseId: number | null;
  courseGroupId: number | null;
  regulationId: number | null;
};

function pickNum(row: AnyRow | null | undefined, keys: string[]): number {
  if (!row) return 0;
  for (const key of keys) {
    const n = Number(row[key] ?? 0);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

function safeString(v: unknown): string {
  if (typeof v === "string") return v.trim();
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
}

function parsePageParams(sp: URLSearchParams): PageParams {
  const n = (key: string) => {
    const v = Number(sp.get(key) ?? 0);
    return Number.isFinite(v) && v > 0 ? v : null;
  };
  return {
    universityId: n("universityId"),
    courseId: n("courseId"),
    courseGroupId: n("courseGroupId"),
    regulationId: n("regulationId"),
  };
}

function isEmptyPageParams(p: PageParams): boolean {
  return !(p.universityId || p.courseId || p.courseGroupId || p.regulationId);
}

function idInList(
  list: AnyRow[],
  id: number | null | undefined,
  keys: string[],
): number | null {
  if (!id) return null;
  return list.some((x) => pickNum(x, keys) === id) ? id : null;
}

const BASE_COLS = {
  siNo: {
    headerName: "S.No",
    valueGetter: (p: any) => (p.node?.rowIndex ?? 0) + 1,
    minWidth: 70,
    maxWidth: 80,
    flex: 0,
  } as ColDef<AnyRow>,
  courseYearName: {
    field: "courseYearName",
    headerName: "Course Year",
    minWidth: 220,
    flex: 1,
  },
  actions: {
    headerName: "Actions",
    minWidth: 200,
    flex: 0,
    maxWidth: 250,
  } as ColDef<AnyRow>,
};

function makeActionsRenderer(
  onAssign: (row: AnyRow) => void,
  onView: (row: AnyRow) => void,
) {
  return (p: ICellRendererParams<AnyRow>) => {
    const row = p.data ?? null;
    if (!row) return null;
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="text-blue-700 hover:underline text-xs font-medium"
          onClick={() => onAssign(row)}
        >
          Subjects
        </button>
        <span className="text-muted-foreground">|</span>
        <button
          type="button"
          className="inline-flex items-center justify-center rounded p-1 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          onClick={() => onView(row)}
          aria-label="View subjects"
        >
          <Eye className="h-4 w-4" />
        </button>
      </div>
    );
  };
}

export default function UniversityCurriculumPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Angular `pageParams` from `route.queryParams`
  const pageParams = useMemo(
    () => parsePageParams(searchParams),
    [searchParams],
  );
  const pageParamsRef = useRef(pageParams);
  pageParamsRef.current = pageParams;
  /** Angular: only apply query restore while pageParams is non-empty. */
  const restoreRef = useRef(!isEmptyPageParams(pageParams));

  const [universities, setUniversities] = useState<AnyRow[]>([]);
  const [courses, setCourses] = useState<AnyRow[]>([]);
  const [courseGroups, setCourseGroups] = useState<AnyRow[]>([]);
  const [regulations, setRegulations] = useState<AnyRow[]>([]);
  const [courseYears, setCourseYears] = useState<AnyRow[]>([]);

  const [universityId, setUniversityId] = useState<number | null>(null);
  const [courseId, setCourseId] = useState<number | null>(null);
  const [courseGroupId, setCourseGroupId] = useState<number | null>(null);
  const [regulationId, setRegulationId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewContext, setViewContext] = useState<AnyRow | null>(null);

  // Angular getUniversity — no auto-select first; restore only from pageParams (Back).
  useEffect(() => {
    const pp = pageParams;
    const restoring = !isEmptyPageParams(pp);
    restoreRef.current = restoring;

    if (restoring) {
      // Force cascade to re-run even if soft-nav left the same universityId.
      setCourseYears([]);
      setRegulations([]);
      setCourseGroups([]);
      setCourses([]);
      setRegulationId(null);
      setCourseGroupId(null);
      setCourseId(null);
      setUniversityId(null);
    }

    listActiveUniversities()
      .then((list) => {
        setUniversities(list);
        if (!restoring) return;
        const id = idInList(list, pp.universityId, [
          "universityId",
          "pk_university_id",
        ]);
        setUniversityId(id);
      })
      .catch(() => setUniversities([]));
  }, [
    pageParams.universityId,
    pageParams.courseId,
    pageParams.courseGroupId,
    pageParams.regulationId,
  ]);

  const uniOptions = useMemo(
    () =>
      universities.map((x) => ({
        value: String(pickNum(x, ["universityId", "pk_university_id"])),
        label: safeString(x.universityCode || x.universityName),
      })),
    [universities],
  );
  const courseOptions = useMemo(
    () =>
      courses.map((x) => ({
        value: String(pickNum(x, ["courseId", "pk_course_id"])),
        label: safeString(x.courseCode || x.courseName),
      })),
    [courses],
  );
  const groupOptions = useMemo(
    () =>
      courseGroups.map((x) => ({
        value: String(pickNum(x, ["courseGroupId", "pk_course_group_id"])),
        label: safeString(x.groupCode || x.groupName),
      })),
    [courseGroups],
  );
  const regulationOptions = useMemo(
    () =>
      regulations.map((x) => ({
        value: String(pickNum(x, ["regulationId", "pk_regulation_id"])),
        label: safeString(x.regulationName || x.regulationCode),
      })),
    [regulations],
  );

  // Angular selectedUniversity
  useEffect(() => {
    setCourses([]);
    setCourseGroups([]);
    setRegulations([]);
    setCourseYears([]);
    setCourseId(null);
    setCourseGroupId(null);
    setRegulationId(null);
    if (!universityId) return;

    listActiveCoursesByUniversity(universityId)
      .then((list) => {
        setCourses(list);
        const pp = pageParamsRef.current;
        if (restoreRef.current && !isEmptyPageParams(pp)) {
          const id = idInList(list, pp.courseId, ["courseId", "pk_course_id"]);
          setCourseId(id);
        }
      })
      .catch(() => setCourses([]));
  }, [universityId]);

  // Angular selectedCourse
  useEffect(() => {
    setCourseGroups([]);
    setRegulations([]);
    setCourseYears([]);
    setCourseGroupId(null);
    setRegulationId(null);
    if (!courseId) return;

    listActiveCourseGroupsByCourse(courseId)
      .then((list) => {
        setCourseGroups(list);
        const pp = pageParamsRef.current;
        if (restoreRef.current && !isEmptyPageParams(pp)) {
          const id = idInList(list, pp.courseGroupId, [
            "courseGroupId",
            "pk_course_group_id",
          ]);
          setCourseGroupId(id);
        }
      })
      .catch(() => setCourseGroups([]));
  }, [courseId]);

  // Angular selectedGroup
  useEffect(() => {
    setRegulations([]);
    setCourseYears([]);
    setRegulationId(null);
    if (!courseId || !courseGroupId) return;

    listActiveRegulationsByCourse(courseId)
      .then((list) => {
        setRegulations(list);
        const pp = pageParamsRef.current;
        if (restoreRef.current && !isEmptyPageParams(pp)) {
          const id = idInList(list, pp.regulationId, [
            "regulationId",
            "pk_regulation_id",
          ]);
          setRegulationId(id);
          // Finished Angular restore chain
          restoreRef.current = false;
        }
      })
      .catch(() => setRegulations([]));
  }, [courseId, courseGroupId]);

  // Angular selectedRegulation → course years (sortOrder ASC)
  useEffect(() => {
    setCourseYears([]);
    if (!courseId || !courseGroupId || !regulationId) return;
    setLoading(true);
    listActiveCourseYearsByCourse(courseId)
      .then((list) => setCourseYears(list))
      .catch(() => setCourseYears([]))
      .finally(() => setLoading(false));
  }, [courseId, courseGroupId, regulationId]);

  const onUniversityChange = (v: string | null) => {
    restoreRef.current = false;
    setUniversityId(v ? Number(v) : null);
  };
  const onCourseChange = (v: string | null) => {
    restoreRef.current = false;
    setCourseId(v ? Number(v) : null);
  };
  const onGroupChange = (v: string | null) => {
    restoreRef.current = false;
    setCourseGroupId(v ? Number(v) : null);
  };
  const onRegulationChange = (v: string | null) => {
    restoreRef.current = false;
    setRegulationId(v ? Number(v) : null);
  };

  const handleAssignSubjects = useCallback(
    (row: AnyRow) => {
      if (!universityId || !courseGroupId || !regulationId) return;
      const uni = universities.find(
        (x) =>
          pickNum(x, ["universityId", "pk_university_id"]) === universityId,
      );
      const group = courseGroups.find(
        (x) =>
          pickNum(x, ["courseGroupId", "pk_course_group_id"]) === courseGroupId,
      );
      const regulation = regulations.find(
        (x) =>
          pickNum(x, ["regulationId", "pk_regulation_id"]) === regulationId,
      );
      // Angular assignSubjects: courseId/courseName from courseYear row
      const rowCourseId =
        pickNum(row, ["courseId", "pk_course_id"]) || courseId || 0;
      const rowCourseName =
        safeString(row.courseName || row.courseCode) ||
        safeString(
          courses.find(
            (x) => pickNum(x, ["courseId", "pk_course_id"]) === rowCourseId,
          )?.courseName ||
            courses.find(
              (x) => pickNum(x, ["courseId", "pk_course_id"]) === rowCourseId,
            )?.courseCode,
        );

      const params = new URLSearchParams({
        universityId: String(universityId),
        universityName: safeString(uni?.universityCode || uni?.universityName),
        courseGroupId: String(courseGroupId),
        groupName: safeString(group?.groupCode || group?.groupName),
        courseYearId: String(
          pickNum(row, [
            "courseYearId",
            "courseyearId",
            "pk_course_year_id",
            "fk_course_year_id",
            "course_year_id",
          ]),
        ),
        courseYearName: safeString(row.courseYearName),
        courseId: String(rowCourseId),
        courseName: rowCourseName,
        regulationId: String(regulationId),
        regulationName: safeString(
          regulation?.regulationName || regulation?.regulationCode,
        ),
      });
      router.push(
        `/academics/college-curriculum/course-group-year-regulation-subject?${params.toString()}`,
      );
    },
    [
      universityId,
      courseId,
      courseGroupId,
      regulationId,
      universities,
      courseGroups,
      regulations,
      courses,
      router,
    ],
  );

  const handleViewSubjects = useCallback(
    (row: AnyRow) => {
      const uni = universities.find(
        (x) =>
          pickNum(x, ["universityId", "pk_university_id"]) ===
          (universityId ?? 0),
      );
      const group = courseGroups.find(
        (x) =>
          pickNum(x, ["courseGroupId", "pk_course_group_id"]) ===
          (courseGroupId ?? 0),
      );
      const regulation = regulations.find(
        (x) =>
          pickNum(x, ["regulationId", "pk_regulation_id"]) ===
          (regulationId ?? 0),
      );
      const course = courses.find(
        (x) => pickNum(x, ["courseId", "pk_course_id"]) === (courseId ?? 0),
      );

      // Angular openDialog: mutate course-year row with form ids, then load subjects.
      const yearId = pickNum(row, [
        "courseYearId",
        "courseyearId",
        "pk_course_year_id",
        "fk_course_year_id",
        "course_year_id",
      ]);
      setViewContext({
        ...row,
        courseGroupId: courseGroupId ?? 0,
        courseYearId: yearId,
        regulationId: regulationId ?? 0,
        universityName: safeString(uni?.universityCode || uni?.universityName),
        universityCode: safeString(uni?.universityCode || uni?.universityName),
        courseCode: safeString(course?.courseCode || course?.courseName),
        groupCode: safeString(group?.groupCode || group?.groupName),
        regulationName: safeString(
          regulation?.regulationName || regulation?.regulationCode,
        ),
        courseYearName: safeString(row.courseYearName),
      });
      setViewModalOpen(true);
    },
    [
      universities,
      universityId,
      courseGroups,
      courseGroupId,
      regulations,
      regulationId,
      courses,
      courseId,
    ],
  );

  const columnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      BASE_COLS.siNo,
      BASE_COLS.courseYearName,
      {
        ...BASE_COLS.actions,
        cellRenderer: makeActionsRenderer(
          handleAssignSubjects,
          handleViewSubjects,
        ),
      },
    ],
    [handleAssignSubjects, handleViewSubjects],
  );

  return (
    <>
      <FilteredListPage
        title="University Curriculum"
        filters={
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
            <Select
              label="University"
              value={universityId ? String(universityId) : null}
              onChange={onUniversityChange}
              options={uniOptions}
              placeholder="Select university"
              searchable
            />
            <Select
              label="Course"
              value={courseId ? String(courseId) : null}
              onChange={onCourseChange}
              options={courseOptions}
              placeholder="Select course"
              searchable
              disabled={!universityId}
            />
            <Select
              label="Course Group"
              value={courseGroupId ? String(courseGroupId) : null}
              onChange={onGroupChange}
              options={groupOptions}
              placeholder="Select course group"
              searchable
              disabled={!courseId}
            />
            <Select
              label="Regulation"
              value={regulationId ? String(regulationId) : null}
              onChange={onRegulationChange}
              options={regulationOptions}
              placeholder="Select regulation"
              searchable
              disabled={!courseGroupId}
            />
          </div>
        }
        showTable={courseYears.length > 0}
        resultsVisible={courseYears.length > 0}
        rowData={courseYears}
        columnDefs={columnDefs}
        loading={loading}
        toolbar={{
          search: true,
          searchPlaceholder: "Search",
          exportExcel: false,
          exportPdf: false,
        }}
        pagination
        paginationPageSize={10}
      />

      <ViewSubjectsModal
        open={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        context={viewContext}
      />
    </>
  );
}
