"use client";

import { useEffect, useMemo, useState } from "react";
import type { ColDef } from "ag-grid-community";
import { Select } from "@/common/components/select";
import { FilteredListPage } from "@/components/layout";
import { toastError } from "@/lib/toast";
import {
  getDigitalOnlineSyncFilters,
  listSectionElectiveGroups,
  listStaffMappingSections,
  listElectiveBatchStudents,
  listStudentsForPromotionPreview,
} from "@/services";

type AnyRow = Record<string, any>;

const n = (v: unknown) => Number(v) || 0;
const s = (v: unknown) => {
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  return "";
};
const pick = (row: AnyRow, keys: string[]) => {
  for (const key of keys) {
    const out = s(row?.[key]).trim();
    if (out) return out;
  }
  return "-";
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

/**
 * Angular `student-enrollement-to-subject` (no Get List):
 * 1) Section → `electivegroupyrmapping?collegeId&academicYearId&groupSectionId`
 * 2) Elective → `studentsList` + `batchwisestudents` (selectedElective)
 * 3) Results only when students.length > 0
 */
export default function StudentEnrollmentToElectiveSubjectPage() {
  const [filtersData, setFiltersData] = useState<AnyRow[]>([]);
  const [academicData, setAcademicData] = useState<AnyRow[]>([]);
  const [sections, setSections] = useState<AnyRow[]>([]);
  const [electives, setElectives] = useState<AnyRow[]>([]);
  const [rows, setRows] = useState<AnyRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [collegeId, setCollegeId] = useState<number | null>(null);
  const [courseId, setCourseId] = useState<number | null>(null);
  const [courseGroupId, setCourseGroupId] = useState<number | null>(null);
  const [courseYearId, setCourseYearId] = useState<number | null>(null);
  const [academicYearId, setAcademicYearId] = useState<number | null>(null);
  const [groupSectionId, setGroupSectionId] = useState<number | null>(null);
  const [electiveGroupMappingId, setElectiveGroupMappingId] = useState<
    number | null
  >(null);

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

  const colleges = useMemo(
    () =>
      uniq(filtersData, "fk_college_id").sort(
        (a, b) => n(a.clg_sort_order) - n(b.clg_sort_order),
      ),
    [filtersData],
  );
  const courses = useMemo(
    () =>
      uniq(
        filtersData.filter((r) => n(r.fk_college_id) === (collegeId ?? 0)),
        "fk_course_id",
      ),
    [filtersData, collegeId],
  );
  const courseGroups = useMemo(
    () =>
      uniq(
        filtersData.filter(
          (r) =>
            n(r.fk_college_id) === (collegeId ?? 0) &&
            n(r.fk_course_id) === (courseId ?? 0),
        ),
        "fk_course_group_id",
      ),
    [filtersData, collegeId, courseId],
  );
  const courseYears = useMemo(
    () =>
      uniq(
        filtersData.filter(
          (r) =>
            n(r.fk_college_id) === (collegeId ?? 0) &&
            n(r.fk_course_id) === (courseId ?? 0) &&
            n(r.fk_course_group_id) === (courseGroupId ?? 0),
        ),
        "fk_course_year_id",
      ).sort((a, b) => n(a.year_order) - n(b.year_order)),
    [filtersData, collegeId, courseId, courseGroupId],
  );
  const academicYears = useMemo(() => {
    const univId = n(
      filtersData.find((x) => n(x.fk_college_id) === (collegeId ?? 0))
        ?.fk_university_id,
    );
    return uniq(
      academicData.filter((r) => n(r.fk_university_id) === univId),
      "fk_academic_year_id",
    ).sort((a, b) =>
      String(b.academic_year ?? "").localeCompare(
        String(a.academic_year ?? ""),
      ),
    );
  }, [academicData, filtersData, collegeId]);

  useEffect(() => {
    if (!collegeId && colleges.length)
      setCollegeId(n(colleges[0].fk_college_id));
  }, [colleges, collegeId]);

  useEffect(() => {
    setCourseId(null);
    setCourseGroupId(null);
    setCourseYearId(null);
    setAcademicYearId(null);
    setGroupSectionId(null);
    setElectiveGroupMappingId(null);
    setSections([]);
    setElectives([]);
    setRows([]);
  }, [collegeId]);

  useEffect(() => {
    if (!courseId && courses.length) setCourseId(n(courses[0].fk_course_id));
  }, [courses, courseId]);

  useEffect(() => {
    setCourseGroupId(null);
    setCourseYearId(null);
    setAcademicYearId(null);
    setGroupSectionId(null);
    setElectiveGroupMappingId(null);
    setSections([]);
    setElectives([]);
    setRows([]);
  }, [courseId]);

  useEffect(() => {
    if (!courseGroupId && courseGroups.length)
      setCourseGroupId(n(courseGroups[0].fk_course_group_id));
  }, [courseGroups, courseGroupId]);

  useEffect(() => {
    setCourseYearId(null);
    setAcademicYearId(null);
    setGroupSectionId(null);
    setElectiveGroupMappingId(null);
    setSections([]);
    setElectives([]);
    setRows([]);
  }, [courseGroupId]);

  useEffect(() => {
    if (!courseYearId && courseYears.length)
      setCourseYearId(n(courseYears[0].fk_course_year_id));
  }, [courseYears, courseYearId]);

  useEffect(() => {
    setAcademicYearId(null);
    setGroupSectionId(null);
    setElectiveGroupMappingId(null);
    setSections([]);
    setElectives([]);
    setRows([]);
  }, [courseYearId]);

  useEffect(() => {
    if (!academicYearId && academicYears.length)
      setAcademicYearId(
        n(
          [...academicYears].sort(
            (a, b) => n(b.is_curr_ay) - n(a.is_curr_ay),
          )[0]?.fk_academic_year_id,
        ),
      );
  }, [academicYears, academicYearId]);

  useEffect(() => {
    setGroupSectionId(null);
    setElectiveGroupMappingId(null);
    setSections([]);
    setElectives([]);
    setRows([]);
  }, [academicYearId]);

  // Angular selectedYear → sections
  useEffect(() => {
    async function loadSections() {
      if (
        !collegeId ||
        !courseId ||
        !courseGroupId ||
        !courseYearId ||
        !academicYearId
      ) {
        setSections([]);
        return;
      }
      const organizationId = Number(
        localStorage.getItem("organizationId") ?? 0,
      );
      const employeeId = Number(localStorage.getItem("employeeId") ?? 0);
      const list = await listStaffMappingSections({
        organizationId,
        employeeId,
        collegeId,
        courseId,
        courseGroupId,
        courseYearId,
        academicYearId,
      }).catch(() => []);
      setSections(list);
    }
    void loadSections();
  }, [collegeId, courseId, courseGroupId, courseYearId, academicYearId]);

  // Angular selectedSection → elective dropdown options
  useEffect(() => {
    async function loadElectives() {
      setElectiveGroupMappingId(null);
      setRows([]);
      if (!collegeId || !academicYearId || !groupSectionId) {
        setElectives([]);
        return;
      }
      const list = await listSectionElectiveGroups({
        collegeId,
        academicYearId,
        groupSectionId,
      }).catch(() => []);
      setElectives(Array.isArray(list) ? list : []);
    }
    void loadElectives();
  }, [collegeId, academicYearId, groupSectionId]);

  const selectedElective = useMemo(
    () =>
      electives.find(
        (x) =>
          n(
            x.electiveGroupyrMappingId ??
              x.pk_elective_groupyr_mapping_id ??
              x.electiveGroupyrMappingID,
          ) === (electiveGroupMappingId ?? 0),
      ) ?? null,
    [electives, electiveGroupMappingId],
  );

  // Angular selectedElective — studentsList (+ batch by subjectId); no Get List
  useEffect(() => {
    let cancelled = false;
    async function loadStudents() {
      const subjectId = n(
        selectedElective?.subjectId ??
          selectedElective?.fk_subject_id ??
          selectedElective?.subject_id,
      );
      if (
        !collegeId ||
        !courseGroupId ||
        !groupSectionId ||
        !electiveGroupMappingId ||
        !subjectId
      ) {
        setRows([]);
        return;
      }
      setLoading(true);
      try {
        // Angular: students.length from studentsList drives *ngIf show boards
        const sectionStudents = await listStudentsForPromotionPreview({
          collegeId,
          courseGroupId,
          groupSectionId,
        }).catch(() => []);

        const enrolled = await listElectiveBatchStudents({
          collegeId,
          courseGroupId,
          groupSectionId,
          subjectId,
          electiveGroupyrMappingId: electiveGroupMappingId,
        }).catch(() => []);
        const enrolledIds = new Set(
          (Array.isArray(enrolled) ? enrolled : []).map((r) =>
            n(r.studentId ?? r.fk_student_id ?? r.student_id),
          ),
        );

        const electiveSubject = pick(selectedElective ?? {}, [
          "subjectName",
          "subject_name",
        ]);
        const electiveGroup = pick(selectedElective ?? {}, [
          "electiveGroupName",
          "groupName",
          "firstName",
        ]);

        const next = (
          Array.isArray(sectionStudents) ? sectionStudents : []
        ).map((r) => ({
          ...r,
          subjectName: electiveSubject,
          electiveGroupName: electiveGroup,
          isEnrolled: enrolledIds.has(
            n(r.studentId ?? r.fk_student_id ?? r.student_id),
          ),
        }));
        if (!cancelled) setRows(next);
      } catch (e) {
        if (!cancelled) {
          setRows([]);
          toastError(e, "Failed to load students");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadStudents();
    return () => {
      cancelled = true;
    };
  }, [
    collegeId,
    courseGroupId,
    groupSectionId,
    electiveGroupMappingId,
    selectedElective,
  ]);

  const columnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      {
        headerName: "SI.No",
        valueGetter: (p: any) => (p.node?.rowIndex ?? 0) + 1,
        minWidth: 70,
        maxWidth: 85,
        flex: 0,
      },
      {
        headerName: "Student Name",
        minWidth: 190,
        flex: 1.2,
        valueGetter: (p) =>
          pick(p.data ?? {}, [
            "firstName",
            "studentName",
            "student_name",
            "fullName",
          ]),
      },
      {
        headerName: "Register No",
        minWidth: 140,
        flex: 1,
        valueGetter: (p) =>
          pick(p.data ?? {}, [
            "rollNumber",
            "admissionNumber",
            "registerNo",
            "regNo",
            "hallticketNumber",
          ]),
      },
      {
        headerName: "Elective Subject",
        minWidth: 220,
        flex: 1.3,
        valueGetter: (p) =>
          pick(p.data ?? {}, [
            "subjectName",
            "electiveSubjectName",
            "elective_name",
            "subject_name",
          ]) || pick(selectedElective ?? {}, ["subjectName", "subject_name"]),
      },
      {
        headerName: "Elective Group",
        minWidth: 180,
        flex: 1.1,
        valueGetter: (p) =>
          pick(p.data ?? {}, [
            "electiveGroupName",
            "groupName",
            "elective_group_name",
          ]) ||
          pick(selectedElective ?? {}, [
            "electiveGroupName",
            "groupName",
            "firstName",
          ]),
      },
    ],
    [selectedElective],
  );

  const showTable = rows.length > 0;

  return (
    <FilteredListPage
      title="Student Enrollement to Elective Subject"
      filterTitle="Student Enrollement to Elective Subject"
      filters={
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
          <Select
            label="College"
            required
            value={collegeId ? String(collegeId) : null}
            onChange={(v) => setCollegeId(v ? Number(v) : null)}
            options={colleges.map((x) => ({
              value: String(n(x.fk_college_id)),
              label: s(x.college_code),
            }))}
            searchable
          />
          <Select
            label="Course"
            required
            value={courseId ? String(courseId) : null}
            onChange={(v) => setCourseId(v ? Number(v) : null)}
            options={courses.map((x) => ({
              value: String(n(x.fk_course_id)),
              label: s(x.course_code),
            }))}
            searchable
          />
          <Select
            label="Course Group"
            required
            value={courseGroupId ? String(courseGroupId) : null}
            onChange={(v) => setCourseGroupId(v ? Number(v) : null)}
            options={courseGroups.map((x) => ({
              value: String(n(x.fk_course_group_id)),
              label: s(x.group_code) || s(x.group_name),
            }))}
            searchable
          />
          <Select
            label="Course Year"
            required
            value={courseYearId ? String(courseYearId) : null}
            onChange={(v) => setCourseYearId(v ? Number(v) : null)}
            options={courseYears.map((x) => ({
              value: String(n(x.fk_course_year_id)),
              label: s(x.course_year_name),
            }))}
            searchable
          />
          <Select
            label="Academic Year"
            required
            value={academicYearId ? String(academicYearId) : null}
            onChange={(v) => setAcademicYearId(v ? Number(v) : null)}
            options={academicYears.map((x) => ({
              value: String(n(x.fk_academic_year_id)),
              label: s(x.academic_year),
            }))}
            searchable
          />
          <Select
            label="Section"
            required
            value={groupSectionId ? String(groupSectionId) : null}
            onChange={(v) => setGroupSectionId(v ? Number(v) : null)}
            options={sections.map((x) => ({
              value: String(n(x.pk_group_section_id ?? x.groupSectionId)),
              label: s(x.section) || s(x.sectionName),
            }))}
            searchable
            disabled={!academicYearId || sections.length === 0}
          />
          <Select
            label="Elective"
            required
            value={
              electiveGroupMappingId ? String(electiveGroupMappingId) : null
            }
            onChange={(v) => setElectiveGroupMappingId(v ? Number(v) : null)}
            options={electives.map((x) => {
              const subject = pick(x, ["subjectName", "subject_name"]);
              const staff = pick(x, ["firstName", "staffName", "employeeName"]);
              const label =
                subject !== "-" && staff !== "-"
                  ? `${subject} (${staff})`
                  : subject !== "-"
                    ? subject
                    : pick(x, [
                        "electiveGroupName",
                        "groupName",
                        "elective_group_name",
                      ]);
              return {
                value: String(
                  n(
                    x.electiveGroupyrMappingId ??
                      x.pk_elective_groupyr_mapping_id,
                  ),
                ),
                label,
              };
            })}
            searchable
            disabled={!groupSectionId}
            placeholder={
              !groupSectionId
                ? "Select section first"
                : electives.length === 0
                  ? "No electives mapped"
                  : "Select Elective"
            }
          />
        </div>
      }
      rowData={rows}
      columnDefs={columnDefs}
      loading={loading}
      resultsVisible={showTable}
      showTable={showTable}
      toolbar={{ search: true, searchPlaceholder: "Search students" }}
      pagination
      paginationPageSize={10}
    />
  );
}
