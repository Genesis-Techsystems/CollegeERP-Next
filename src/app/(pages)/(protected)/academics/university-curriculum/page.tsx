"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { Eye } from "lucide-react";
import { useRouter } from "next/navigation";
import { Select } from "@/common/components/select";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import {
  listActiveCourseGroupsByCourse,
  listActiveCourseYearsByCourse,
  listActiveCoursesByUniversity,
  listActiveRegulationsByCourse,
  listActiveUniversities,
} from "@/services";
import ViewSubjectsModal from "./ViewSubjectsModal";

type AnyRow = Record<string, any>;

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

  useEffect(() => {
    listActiveUniversities()
      .then((list) => {
        setUniversities(list);
        const firstId = pickNum(list[0], ["universityId", "pk_university_id"]);
        setUniversityId(firstId || null);
      })
      .catch(() => setUniversities([]));
  }, []);

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
        setCourseId(pickNum(list[0], ["courseId", "pk_course_id"]) || null);
      })
      .catch(() => setCourses([]));
  }, [universityId]);

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
        setCourseGroupId(
          pickNum(list[0], ["courseGroupId", "pk_course_group_id"]) || null,
        );
      })
      .catch(() => setCourseGroups([]));
  }, [courseId]);

  useEffect(() => {
    setRegulations([]);
    setCourseYears([]);
    setRegulationId(null);
    if (!courseId || !courseGroupId) return;
    listActiveRegulationsByCourse(courseId)
      .then((list) => {
        setRegulations(list);
        // Intentionally do NOT auto-select a regulation.
        // The table below should remain disabled/empty until user selection.
      })
      .catch(() => setRegulations([]));
  }, [courseId, courseGroupId]);

  useEffect(() => {
    setCourseYears([]);
    if (!courseId || !courseGroupId || !regulationId) return;
    setLoading(true);
    listActiveCourseYearsByCourse(courseId)
      .then((list) => setCourseYears(list))
      .catch(() => setCourseYears([]))
      .finally(() => setLoading(false));
  }, [courseId, courseGroupId, regulationId]);

  const handleAssignSubjects = useCallback(
    (row: AnyRow) => {
      if (!universityId || !courseId || !courseGroupId || !regulationId) return;
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
      const course = courses.find(
        (x) => pickNum(x, ["courseId", "pk_course_id"]) === courseId,
      );

      const params = new URLSearchParams({
        universityId: String(universityId),
        universityName: safeString(uni?.universityCode || uni?.universityName),
        courseGroupId: String(courseGroupId),
        groupName: safeString(group?.groupCode || group?.groupName),
        courseYearId: String(
          pickNum(row, ["courseYearId", "pk_course_year_id"]),
        ),
        courseYearName: safeString(row.courseYearName),
        courseId: String(courseId),
        courseName: safeString(course?.courseName || course?.courseCode),
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

      setViewContext({
        ...row,
        courseGroupId,
        courseYearId: pickNum(row, ['courseYearId', 'pk_course_year_id']),
        regulationId,
        universityCode: safeString(uni?.universityCode || uni?.universityName),
        courseCode: safeString(course?.courseCode || course?.courseName),
        groupCode: safeString(group?.groupCode || group?.groupName),
        regulationName: safeString(
          regulation?.regulationName || regulation?.regulationCode,
        ),
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
        filters={(
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
            <Select
              label="University"
              value={universityId ? String(universityId) : null}
              onChange={(v) => setUniversityId(v ? Number(v) : null)}
              options={uniOptions}
              placeholder="Select university"
              searchable
            />
            <Select
              label="Course"
              value={courseId ? String(courseId) : null}
              onChange={(v) => setCourseId(v ? Number(v) : null)}
              options={courseOptions}
              placeholder="Select course"
              searchable
              disabled={!universityId}
            />
            <Select
              label="Course Group"
              value={courseGroupId ? String(courseGroupId) : null}
              onChange={(v) => setCourseGroupId(v ? Number(v) : null)}
              options={groupOptions}
              placeholder="Select course group"
              searchable
              disabled={!courseId}
            />
            <Select
              label="Regulation"
              value={regulationId ? String(regulationId) : null}
              onChange={(v) => setRegulationId(v ? Number(v) : null)}
              options={regulationOptions}
              placeholder="Select regulation"
              searchable
              disabled={!courseGroupId}
            />
          </div>
        )}
        rowData={courseYears}
        columnDefs={columnDefs}
        loading={loading}
        toolbar={{
          search: true,
          searchPlaceholder: "Search course years...",
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
