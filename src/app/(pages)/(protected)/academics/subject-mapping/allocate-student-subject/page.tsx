"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Select } from "@/common/components/select";
import { FilteredPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { toastError, toastInfo, toastSuccess } from "@/lib/toast";
import { getErrorMessage } from "@/lib/errors";
import {
  allocateStudentSubjects,
  getAllocateStudentSubjectFilters,
} from "@/services";

type AnyRow = Record<string, any>;

const n = (v: unknown) => Number(v) || 0;
const s = (v: unknown) => {
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  return "";
};
const uniq = (rows: AnyRow[], key: string) => {
  const seen = new Set<number>();
  return rows.filter((r) => {
    const id = n(r[key]);
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};

export default function AllocateStudentSubjectPage() {
  const [filtersData, setFiltersData] = useState<AnyRow[]>([]);
  const [academicData, setAcademicData] = useState<AnyRow[]>([]);
  const [regulationData, setRegulationData] = useState<AnyRow[]>([]);
  const [saving, setSaving] = useState(false);

  const [collegeId, setCollegeId] = useState<number | null>(null);
  const [academicYearId, setAcademicYearId] = useState<number | null>(null);
  const [courseId, setCourseId] = useState<number | null>(null);
  const [courseGroupId, setCourseGroupId] = useState<number | null>(null);
  const [courseYearId, setCourseYearId] = useState<number | null>(null);
  const [regulationId, setRegulationId] = useState<number | null>(null);

  useEffect(() => {
    const orgId = Number(localStorage.getItem("organizationId") ?? 0);
    const empId = Number(localStorage.getItem("employeeId") ?? 0);
    getAllocateStudentSubjectFilters(orgId, empId)
      .then((d) => {
        setFiltersData(d.filtersData as AnyRow[]);
        setAcademicData(d.academicYearData as AnyRow[]);
        setRegulationData(d.regulationData as AnyRow[]);
      })
      .catch(() => {
        setFiltersData([]);
        setAcademicData([]);
        setRegulationData([]);
      });
  }, []);
  const ALL_VALUE = 0;
  const colleges = useMemo(
    () =>
      uniq(filtersData, "fk_college_id").sort(
        (a, b) => n(a.clg_sort_order) - n(b.clg_sort_order),
      ),
    [filtersData],
  );
  const courses = useMemo(() => {
    const filtered = filtersData.filter((r) =>
      collegeId === ALL_VALUE ? true : n(r.fk_college_id) === (collegeId ?? 0),
    );

    return uniq(filtered, "fk_course_id");
  }, [filtersData, collegeId]);
  const courseGroups = useMemo(() => {
    const filtered = filtersData.filter(
      (r) =>
        (collegeId === ALL_VALUE || n(r.fk_college_id) === (collegeId ?? 0)) &&
        (courseId === ALL_VALUE || n(r.fk_course_id) === (courseId ?? 0)),
    );

    return uniq(filtered, "fk_course_group_id");
  }, [filtersData, collegeId, courseId]);
  const courseYears = useMemo(() => {
    const filtered = filtersData.filter(
      (r) =>
        (collegeId === ALL_VALUE || n(r.fk_college_id) === (collegeId ?? 0)) &&
        (courseId === ALL_VALUE || n(r.fk_course_id) === (courseId ?? 0)) &&
        (courseGroupId === ALL_VALUE ||
          n(r.fk_course_group_id) === (courseGroupId ?? 0)),
    );

    return uniq(filtered, "fk_course_year_id").sort(
      (a, b) => n(a.year_order) - n(b.year_order),
    );
  }, [filtersData, collegeId, courseId, courseGroupId]);
  const academicYears = useMemo(() => {
    const univId = n(
      filtersData.find(
        (x) =>
          collegeId === ALL_VALUE || n(x.fk_college_id) === (collegeId ?? 0),
      )?.fk_university_id,
    );

    return uniq(
      academicData.filter(
        (r) => collegeId === ALL_VALUE || n(r.fk_university_id) === univId,
      ),
      "fk_academic_year_id",
    ).sort((a, b) =>
      String(b.academic_year ?? "").localeCompare(
        String(a.academic_year ?? ""),
      ),
    );
  }, [academicData, filtersData, collegeId]);
  // Regulations come from the proc's `clg_filters_regulation` set — filtered by the selected
  // college's university and the selected course (Angular `selectedYear`).
  const regulations = useMemo(() => {
    const universityIds =
      collegeId === ALL_VALUE
        ? new Set(filtersData.map((x) => n(x.fk_university_id)))
        : new Set([
            n(
              filtersData.find((x) => n(x.fk_college_id) === (collegeId ?? 0))
                ?.fk_university_id,
            ),
          ]);

    return uniq(
      regulationData.filter(
        (r) =>
          universityIds.has(n(r.fk_university_id)) &&
          (courseId === ALL_VALUE || n(r.fk_course_id) === (courseId ?? 0)),
      ),
      "fk_regulation_id",
    );
  }, [regulationData, filtersData, collegeId, courseId]);

  useEffect(() => {
    if (!collegeId && colleges.length)
      setCollegeId(n(colleges[0].fk_college_id));
  }, [colleges, collegeId]);
  useEffect(() => {
    setCourseId(null);
    setCourseGroupId(null);
    setCourseYearId(null);
    setAcademicYearId(null);
    setRegulationId(null);
  }, [collegeId]);

  useEffect(() => {
    if (collegeId === null && colleges.length) {
      setCollegeId(ALL_VALUE);
    }
  }, [colleges, collegeId]);

  useEffect(() => {
    if (courseId === null && courses.length) {
      setCourseId(ALL_VALUE);
    }
  }, [courses, courseId]);

  useEffect(() => {
    if (courseGroupId === null && courseGroups.length) {
      setCourseGroupId(ALL_VALUE);
    }
  }, [courseGroups, courseGroupId]);

  useEffect(() => {
    if (courseYearId === null && courseYears.length) {
      setCourseYearId(ALL_VALUE);
    }
  }, [courseYears, courseYearId]);

  useEffect(() => {
    if (academicYearId === null && academicYears.length) {
      setAcademicYearId(ALL_VALUE);
    }
  }, [academicYears, academicYearId]);

  useEffect(() => {
    if (regulationId === null && regulations.length) {
      setRegulationId(ALL_VALUE);
    }
  }, [regulations, regulationId]);
  useEffect(() => {
    setCourseGroupId(null);
    setCourseYearId(null);
    setRegulationId(null);
  }, [courseId]);

  useEffect(() => {
    setCourseYearId(null);
    setRegulationId(null);
  }, [courseGroupId]);

  const regulationOptions = useMemo(
    () => [
      {
        value: String(ALL_VALUE),
        label: "All",
      },
      ...regulations.map((x) => ({
        value: String(n(x.fk_regulation_id)),
        label: s(x.regulation_code) || "Regulation",
      })),
    ],
    [regulations],
  );

  // Angular `allocate` flag: the action card only appears once a regulation is chosen.
  const canAllocate = Boolean(
    collegeId !== null &&
    academicYearId !== null &&
    courseGroupId !== null &&
    courseYearId !== null &&
    regulationId !== null,
  );

  async function onAllocate() {
    if (!canAllocate) {
      toastError("Please complete all filters before allocating");
      return;
    }
    setSaving(true);
    try {
      const result = await allocateStudentSubjects({
        collegeId: collegeId!,
        academicYearId: academicYearId!,
        courseGroupId: courseGroupId!,
        courseYearId: courseYearId!,
        regulationId: regulationId!,
        studentId: 0,
      });
      if (!result.success) {
        toastInfo(result.message || "No Records(s) found.");
        return;
      }
      toastSuccess(result.message || "Student subjects allocated successfully");
    } catch (error) {
      toastInfo(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <FilteredPage
      title="Allocate Student Subjects"
      filters={
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <Select
            label="College *"
            value={collegeId !== null ? String(collegeId) : null}
            onChange={(v) => setCollegeId(v ? Number(v) : ALL_VALUE)}
            options={[
              {
                value: String(ALL_VALUE),
                label: "All",
              },
              ...colleges.map((x) => ({
                value: String(n(x.fk_college_id)),
                label: s(x.college_code),
              })),
            ]}
            searchable
            className="md:col-span-2"
          />
          <Select
            label="Academic Year *"
            value={academicYearId !== null ? String(academicYearId) : null}
            onChange={(v) => setAcademicYearId(v ? Number(v) : ALL_VALUE)}
            options={[
              {
                value: String(ALL_VALUE),
                label: "All",
              },
              ...academicYears.map((x) => ({
                value: String(n(x.fk_academic_year_id)),
                label: s(x.academic_year),
              })),
            ]}
            searchable
            className="md:col-span-2"
          />
          <Select
            label="Course *"
            value={courseId !== null ? String(courseId) : null}
            onChange={(v) => setCourseId(v ? Number(v) : ALL_VALUE)}
            options={[
              {
                value: String(ALL_VALUE),
                label: "All",
              },
              ...courses.map((x) => ({
                value: String(n(x.fk_course_id)),
                label: s(x.course_code),
              })),
            ]}
            searchable
            className="md:col-span-2"
          />
          <Select
            label="Course Group *"
            value={courseGroupId !== null ? String(courseGroupId) : null}
            onChange={(v) => setCourseGroupId(v ? Number(v) : ALL_VALUE)}
            options={[
              {
                value: String(ALL_VALUE),
                label: "All",
              },
              ...courseGroups.map((x) => ({
                value: String(n(x.fk_course_group_id)),
                label: s(x.group_code) || s(x.group_name),
              })),
            ]}
            searchable
            className="md:col-span-2"
          />
          <Select
            label="Course Year *"
            value={courseYearId !== null ? String(courseYearId) : null}
            onChange={(v) => setCourseYearId(v ? Number(v) : ALL_VALUE)}
            options={[
              {
                value: String(ALL_VALUE),
                label: "All",
              },
              ...courseYears.map((x) => ({
                value: String(n(x.fk_course_year_id)),
                label: s(x.course_year_name),
              })),
            ]}
            searchable
            className="md:col-span-2"
          />
          <Select
            label="Regulation *"
            value={regulationId !== null ? String(regulationId) : null}
            onChange={(v) => setRegulationId(v ? Number(v) : ALL_VALUE)}
            options={regulationOptions}
            searchable
            className="md:col-span-2"
          />
        </div>
      }
      body={
        canAllocate ? (
          <div className="space-y-3">
            <div className="text-[13.5px] font-semibold tracking-tight text-primary font-[family-name:var(--font-heading)]">
              Allocate Student Subjects
            </div>
            <Button
              type="button"
              className="h-8 rounded-full px-4 text-xs inline-flex items-center gap-1"
              onClick={() => {
                void onAllocate();
              }}
              disabled={saving}
            >
              <Plus className="h-3.5 w-3.5" />
              Allocate Student Subjects
            </Button>
          </div>
        ) : null
      }
    />
  );
}
