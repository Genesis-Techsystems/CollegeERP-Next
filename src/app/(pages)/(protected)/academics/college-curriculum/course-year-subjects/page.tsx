"use client";

import { useEffect, useMemo, useState } from "react";
import type { ColDef } from "ag-grid-community";
import { Select } from "@/common/components/select";
import { FilteredListPage } from "@/components/layout";
import {
  getDigitalOnlineSyncFilters,
  listGroupSections,
  listSubjectCourseYearsBySection,
} from "@/services";

type AnyRow = Record<string, any>;

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function text(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
}
function uniqBy<T extends AnyRow>(rows: T[], key: string): T[] {
  const seen = new Set<number>();
  return rows.filter((r) => {
    const id = num(r[key]);
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

export default function CourseYearSubjectsPage() {
  const [filtersData, setFiltersData] = useState<AnyRow[]>([]);
  const [academicData, setAcademicData] = useState<AnyRow[]>([]);
  const [rows, setRows] = useState<AnyRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [universityId, setUniversityId] = useState<number | null>(null);
  const [collegeId, setCollegeId] = useState<number | null>(null);
  const [courseId, setCourseId] = useState<number | null>(null);
  const [courseGroupId, setCourseGroupId] = useState<number | null>(null);
  const [courseYearId, setCourseYearId] = useState<number | null>(null);
  const [academicYearId, setAcademicYearId] = useState<number | null>(null);
  const [groupSectionId, setGroupSectionId] = useState<number | null>(null);
  const [sections, setSections] = useState<AnyRow[]>([]);

  useEffect(() => {
    const orgId = Number(localStorage.getItem("organizationId") ?? 0);
    const empId = Number(localStorage.getItem("employeeId") ?? 0);
    getDigitalOnlineSyncFilters(orgId, empId)
      .then((d) => {
        setFiltersData(d.filtersData as AnyRow[]);
        setAcademicData(d.academicYearData as AnyRow[]);
      })
      .catch(() => {
        setFiltersData([]);
        setAcademicData([]);
      });
  }, []);

  const universities = useMemo(
    () => uniqBy(filtersData, "fk_university_id"),
    [filtersData],
  );
  const colleges = useMemo(
    () =>
      uniqBy(
        filtersData.filter(
          (r) => num(r.fk_university_id) === (universityId ?? 0),
        ),
        "fk_college_id",
      ),
    [filtersData, universityId],
  );
  const courses = useMemo(
    () =>
      uniqBy(
        filtersData.filter(
          (r) =>
            num(r.fk_university_id) === (universityId ?? 0) &&
            num(r.fk_college_id) === (collegeId ?? 0),
        ),
        "fk_course_id",
      ),
    [filtersData, universityId, collegeId],
  );
  const courseGroups = useMemo(
    () =>
      uniqBy(
        filtersData.filter(
          (r) =>
            num(r.fk_university_id) === (universityId ?? 0) &&
            num(r.fk_college_id) === (collegeId ?? 0) &&
            num(r.fk_course_id) === (courseId ?? 0),
        ),
        "fk_course_group_id",
      ),
    [filtersData, universityId, collegeId, courseId],
  );
  const courseYears = useMemo(
    () =>
      uniqBy(
        filtersData.filter(
          (r) =>
            num(r.fk_university_id) === (universityId ?? 0) &&
            num(r.fk_college_id) === (collegeId ?? 0) &&
            num(r.fk_course_id) === (courseId ?? 0) &&
            num(r.fk_course_group_id) === (courseGroupId ?? 0),
        ),
        "fk_course_year_id",
      ).sort((a, b) => num(a.year_order) - num(b.year_order)),
    [filtersData, universityId, collegeId, courseId, courseGroupId],
  );
  const academicYears = useMemo(
    () =>
      uniqBy(
        academicData.filter(
          (r) => num(r.fk_university_id) === (universityId ?? 0),
        ),
        "fk_academic_year_id",
      ).sort((a, b) =>
        String(b.academic_year ?? "").localeCompare(
          String(a.academic_year ?? ""),
        ),
      ),
    [academicData, universityId],
  );

  useEffect(() => {
    if (!universityId && universities.length > 0)
      setUniversityId(num(universities[0].fk_university_id));
  }, [universities, universityId]);
  useEffect(() => {
    setCollegeId(null);
    setCourseId(null);
    setCourseGroupId(null);
    setCourseYearId(null);
    setAcademicYearId(null);
    setGroupSectionId(null);
    setRows([]);
  }, [universityId]);
  useEffect(() => {
    if (!collegeId && colleges.length > 0)
      setCollegeId(num(colleges[0].fk_college_id));
  }, [colleges, collegeId]);
  useEffect(() => {
    setCourseId(null);
    setCourseGroupId(null);
    setCourseYearId(null);
    setAcademicYearId(null);
    setGroupSectionId(null);
    setRows([]);
  }, [collegeId]);
  useEffect(() => {
    if (!courseId && courses.length > 0)
      setCourseId(num(courses[0].fk_course_id));
  }, [courses, courseId]);
  useEffect(() => {
    setCourseGroupId(null);
    setCourseYearId(null);
    setAcademicYearId(null);
    setGroupSectionId(null);
    setRows([]);
  }, [courseId]);
  useEffect(() => {
    if (!courseGroupId && courseGroups.length > 0)
      setCourseGroupId(num(courseGroups[0].fk_course_group_id));
  }, [courseGroups, courseGroupId]);
  useEffect(() => {
    setCourseYearId(null);
    setAcademicYearId(null);
    setGroupSectionId(null);
    setRows([]);
  }, [courseGroupId]);
  useEffect(() => {
    if (!courseYearId && courseYears.length > 0)
      setCourseYearId(num(courseYears[0].fk_course_year_id));
  }, [courseYears, courseYearId]);
  useEffect(() => {
    setAcademicYearId(null);
    setGroupSectionId(null);
    setRows([]);
  }, [courseYearId]);
  useEffect(() => {
    if (!academicYearId && academicYears.length > 0) {
      const current = [...academicYears].sort(
        (a, b) => num(b.is_curr_ay) - num(a.is_curr_ay),
      )[0];
      setAcademicYearId(num(current?.fk_academic_year_id));
    }
  }, [academicYears, academicYearId]);

  useEffect(() => {
    if (!courseYearId || !academicYearId || !courseGroupId || !collegeId) {
      setSections([]);
      setGroupSectionId(null);
      return;
    }
    listGroupSections(courseYearId, academicYearId, courseGroupId)
      .then((list) => {
        setSections(list);
        setGroupSectionId(
          num(list[0]?.groupSectionId ?? list[0]?.pk_group_section_id) || null,
        );
      })
      .catch(() => {
        setSections([]);
        setGroupSectionId(null);
      });
  }, [courseYearId, academicYearId, courseGroupId, collegeId]);

  useEffect(() => {
    async function loadSubjects() {
      if (!collegeId || !academicYearId || !groupSectionId) {
        setRows([]);
        return;
      }
      setLoading(true);
      try {
        const list = await listSubjectCourseYearsBySection({
          collegeId,
          academicYearId,
          groupSectionId,
        });
        setRows(list);
      } finally {
        setLoading(false);
      }
    }
    void loadSubjects();
  }, [collegeId, academicYearId, groupSectionId]);

  const columnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      {
        headerName: "No.",
        valueGetter: (p: any) => (p.node?.rowIndex ?? 0) + 1,
        minWidth: 70,
        maxWidth: 80,
        flex: 0,
      },
      { field: "subjectName", headerName: "Subject", minWidth: 220, flex: 1.2 },
      {
        field: "subjectCode",
        headerName: "Subject Code",
        minWidth: 150,
        flex: 1,
      },
      {
        field: "subjectType",
        headerName: "Subject Type",
        minWidth: 140,
        flex: 1,
      },
      {
        field: "regulationName",
        headerName: "Regulation",
        minWidth: 120,
        flex: 1,
      },
      {
        field: "subCredits",
        headerName: "Credit Points",
        minWidth: 120,
        maxWidth: 140,
        flex: 0,
      },
      {
        field: "creditHours",
        headerName: "Credit Hours",
        minWidth: 120,
        maxWidth: 140,
        flex: 0,
      },
    ],
    [],
  );

  return (
    <FilteredListPage
      title="View Semester Subjects"
      filters={
        <div className="grid grid-cols-1 gap-3 md:grid-cols-7">
          <Select
            label="University"
            value={universityId ? String(universityId) : null}
            onChange={(v) => setUniversityId(v ? Number(v) : null)}
            options={universities.map((x) => ({
              value: String(num(x.fk_university_id)),
              label: text(x.university_code),
            }))}
            searchable
          />
          <Select
            label="College"
            value={collegeId ? String(collegeId) : null}
            onChange={(v) => setCollegeId(v ? Number(v) : null)}
            options={colleges.map((x) => ({
              value: String(num(x.fk_college_id)),
              label: text(x.college_code),
            }))}
            searchable
            disabled={!universityId}
          />
          <Select
            label="Course"
            value={courseId ? String(courseId) : null}
            onChange={(v) => setCourseId(v ? Number(v) : null)}
            options={courses.map((x) => ({
              value: String(num(x.fk_course_id)),
              label: text(x.course_code),
            }))}
            searchable
            disabled={!collegeId}
          />
          <Select
            label="Course Group"
            value={courseGroupId ? String(courseGroupId) : null}
            onChange={(v) => setCourseGroupId(v ? Number(v) : null)}
            options={courseGroups.map((x) => ({
              value: String(num(x.fk_course_group_id)),
              label: text(x.group_code),
            }))}
            searchable
            disabled={!courseId}
          />
          <Select
            label="Course Year"
            value={courseYearId ? String(courseYearId) : null}
            onChange={(v) => setCourseYearId(v ? Number(v) : null)}
            options={courseYears.map((x) => ({
              value: String(num(x.fk_course_year_id)),
              label: text(x.course_year_name),
            }))}
            searchable
            disabled={!courseGroupId}
          />
          <Select
            label="Academic Year"
            value={academicYearId ? String(academicYearId) : null}
            onChange={(v) => setAcademicYearId(v ? Number(v) : null)}
            options={academicYears.map((x) => ({
              value: String(num(x.fk_academic_year_id)),
              label: text(x.academic_year),
            }))}
            searchable
            disabled={!courseYearId}
          />
          <Select
            label="Section"
            value={groupSectionId ? String(groupSectionId) : null}
            onChange={(v) => setGroupSectionId(v ? Number(v) : null)}
            options={sections.map((x) => ({
              value: String(num(x.groupSectionId ?? x.pk_group_section_id)),
              label: text(x.section),
            }))}
            searchable
            disabled={!academicYearId}
          />
        </div>
      }
      rowData={rows}
      columnDefs={columnDefs}
      loading={loading}
      toolbar={{ search: true, searchPlaceholder: "Search" }}
      pagination
      paginationPageSize={10}
    />
  );
}
