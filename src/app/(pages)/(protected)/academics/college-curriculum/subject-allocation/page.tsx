"use client";

import { useEffect, useMemo, useState } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { Eye } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { DataTable } from "@/common/components/table";
import { Select } from "@/common/components/select";
import { FilterCard } from "@/common/components/feedback";
import { PageContainer } from "@/components/layout";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getCourseYearsForDigitalSync,
  getDigitalOnlineSyncFilters,
  listSubjectRegulationsByCourseYear,
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

function uniqById<T extends AnyRow>(rows: T[], key: string): T[] {
  const seen = new Set<number>();
  return rows.filter((r) => {
    const id = num(r[key]);
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

type ViewModalState = { open: boolean; row: AnyRow | null; rows: AnyRow[] };

/**
 * Angular remove_duplicates(arr, groupId):
 * keep regs for selected course group, then unique by regulationId.
 */
function removeDuplicateRegulations(arr: AnyRow[], groupId: number): AnyRow[] {
  const forGroup = arr.filter((x) => num(x.courseGroupId ?? x.fk_course_group_id) === groupId)
  const unique: AnyRow[] = []
  for (const item of forGroup) {
    const rid = num(item.regulationId ?? item.fk_regulation_id)
    if (!rid) continue
    if (unique.some((u) => num(u.regulationId ?? u.fk_regulation_id) === rid)) continue
    unique.push(item)
  }
  return unique
}

function normalizeCourseYearRow(r: AnyRow, courseGroupId: number): AnyRow {
  const raw = Array.isArray(r.subjectregulations) ? (r.subjectregulations as AnyRow[]) : []
  const regs = removeDuplicateRegulations(raw, courseGroupId)
  return {
    ...r,
    subjectregulations: regs,
    academicYear: regs[0]?.academicYear ?? '',
  }
}

function regulationRenderer(p: ICellRendererParams<AnyRow>) {
  const regs = Array.isArray(p.data?.subjectregulations)
    ? (p.data.subjectregulations as AnyRow[])
    : []
  if (regs.length === 0) return null
  return (
    <div className="flex flex-col gap-0.5 py-1 leading-tight">
      {regs.map((item, i) => {
        const code = text(item.regulationCode)
        if (!code) return null
        const key = num(item.regulationId) || `${code}-${i}`
        return (
          <span key={key} className="block text-sm">
            {code}
          </span>
        )
      })}
    </div>
  )
}

function makeActionsRenderer(
  onAssign: (row: AnyRow) => void,
  onView: (row: AnyRow) => void,
) {
  return (p: ICellRendererParams<AnyRow>) => (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className="text-blue-700 hover:underline text-xs font-semibold"
        onClick={() => p.data && onAssign(p.data)}
      >
        Assign Subjects
      </button>
      <span className="text-muted-foreground">|</span>
      <button
        type="button"
        className="inline-flex items-center justify-center rounded p-1 text-slate-600 hover:bg-slate-100"
        onClick={() => p.data && onView(p.data)}
      >
        <Eye className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function SubjectAllocationPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const orgId = num(0) || Number(localStorage.getItem("organizationId") ?? 0);
  const empId = num(0) || Number(localStorage.getItem("employeeId") ?? 0);

  const [filtersData, setFiltersData] = useState<AnyRow[]>([]);
  const [academicData, setAcademicData] = useState<AnyRow[]>([]);
  const [courseYears, setCourseYears] = useState<AnyRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewModal, setViewModal] = useState<ViewModalState>({
    open: false,
    row: null,
    rows: [],
  });

  const [universityId, setUniversityId] = useState<number | null>(
    num(sp.get("universityId")),
  );
  const [collegeId, setCollegeId] = useState<number | null>(
    num(sp.get("collegeId")),
  );
  const [courseId, setCourseId] = useState<number | null>(
    num(sp.get("courseId")),
  );
  const [courseGroupId, setCourseGroupId] = useState<number | null>(
    num(sp.get("courseGroupId")),
  );
  const [academicYearId, setAcademicYearId] = useState<number | null>(
    num(sp.get("academicYearId")),
  );

  useEffect(() => {
    getDigitalOnlineSyncFilters(orgId, empId)
      .then((d) => {
        setFiltersData(d.filtersData as AnyRow[]);
        setAcademicData(d.academicYearData as AnyRow[]);
      })
      .catch(() => {
        setFiltersData([]);
        setAcademicData([]);
      });
  }, [orgId, empId]);

  const universities = useMemo(
    () => uniqById(filtersData, "fk_university_id"),
    [filtersData],
  );
  const colleges = useMemo(
    () =>
      uniqById(
        filtersData.filter(
          (r) => num(r.fk_university_id) === (universityId ?? 0),
        ),
        "fk_college_id",
      ),
    [filtersData, universityId],
  );
  const courses = useMemo(
    () =>
      uniqById(
        filtersData.filter(
          (r) =>
            num(r.fk_university_id) === (universityId ?? 0) &&
            num(r.fk_college_id) === (collegeId ?? 0),
        ),
        "fk_course_id",
      ),
    [filtersData, universityId, collegeId],
  );
  const groups = useMemo(
    () =>
      uniqById(
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
  const academicYears = useMemo(
    () =>
      uniqById(
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
    setAcademicYearId(null);
    setCourseYears([]);
  }, [universityId]);
  useEffect(() => {
    if (!collegeId && colleges.length > 0)
      setCollegeId(num(colleges[0].fk_college_id));
  }, [colleges, collegeId]);
  useEffect(() => {
    setCourseId(null);
    setCourseGroupId(null);
    setAcademicYearId(null);
    setCourseYears([]);
  }, [collegeId]);
  useEffect(() => {
    if (!courseId && courses.length > 0)
      setCourseId(num(courses[0].fk_course_id));
  }, [courses, courseId]);
  useEffect(() => {
    setCourseGroupId(null);
    setAcademicYearId(null);
    setCourseYears([]);
  }, [courseId]);
  useEffect(() => {
    if (!courseGroupId && groups.length > 0)
      setCourseGroupId(num(groups[0].fk_course_group_id));
  }, [groups, courseGroupId]);
  useEffect(() => {
    setAcademicYearId(null);
    setCourseYears([]);
  }, [courseGroupId]);
  // Keep Academic Year empty by default; user must select explicitly.

  useEffect(() => {
    async function load() {
      if (!collegeId || !courseId || !courseGroupId || !academicYearId) {
        setCourseYears([]);
        return;
      }
      setLoading(true);
      try {
        const rows = await getCourseYearsForDigitalSync({
          collegeId,
          courseId,
          courseGroupId,
          academicYearId,
        });
        const normalized = (rows ?? []).map((r) =>
          normalizeCourseYearRow(r as AnyRow, courseGroupId),
        );
        setCourseYears(normalized);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [collegeId, courseId, courseGroupId, academicYearId]);

  const summary = useMemo(() => {
    const u = universities.find(
      (x) => num(x.fk_university_id) === (universityId ?? 0),
    );
    const c = colleges.find((x) => num(x.fk_college_id) === (collegeId ?? 0));
    const co = courses.find((x) => num(x.fk_course_id) === (courseId ?? 0));
    const g = groups.find(
      (x) => num(x.fk_course_group_id) === (courseGroupId ?? 0),
    );
    const ay = academicYears.find(
      (x) => num(x.fk_academic_year_id) === (academicYearId ?? 0),
    );
    return [
      u?.university_code,
      c?.college_code,
      co?.course_code,
      g?.group_code,
      ay?.academic_year,
    ]
      .filter(Boolean)
      .join(" / ");
  }, [
    universities,
    colleges,
    courses,
    groups,
    academicYears,
    universityId,
    collegeId,
    courseId,
    courseGroupId,
    academicYearId,
  ]);

  async function openView(row: AnyRow) {
    const rows = await listSubjectRegulationsByCourseYear({
      collegeId: collegeId ?? 0,
      academicYearId: academicYearId ?? 0,
      courseGroupId: courseGroupId ?? 0,
      courseYearId: num(row.courseYearId ?? row.fk_course_year_id),
    }).catch(() => []);
    setViewModal({ open: true, row, rows });
  }

  function assignSubjects(row: AnyRow) {
    const selectedGroup = groups.find(
      (x) => num(x.fk_course_group_id) === (courseGroupId ?? 0),
    );
    const selectedAy = academicYears.find(
      (x) => num(x.fk_academic_year_id) === (academicYearId ?? 0),
    );
    const selectedCollege = colleges.find(
      (x) => num(x.fk_college_id) === (collegeId ?? 0),
    );
    const regulationId = num(row.subjectregulations?.[0]?.regulationId);
    router.push(
      `/academics/college-curriculum/subject-allocation-sem-regulation?` +
        `universityId=${universityId ?? 0}&collegeId=${collegeId ?? 0}&collegeName=${encodeURIComponent(text(selectedCollege?.college_code))}` +
        `&courseId=${courseId ?? 0}&courseName=${encodeURIComponent(text(row.courseCode ?? courses.find((x) => num(x.fk_course_id) === (courseId ?? 0))?.course_code))}` +
        `&courseGroupId=${courseGroupId ?? 0}&groupName=${encodeURIComponent(text(selectedGroup?.group_code))}` +
        `&academicYearId=${academicYearId ?? 0}&academicYear=${encodeURIComponent(text(selectedAy?.academic_year))}` +
        `&courseYearId=${num(row.courseYearId ?? row.fk_course_year_id)}&courseYearName=${encodeURIComponent(text(row.courseYearName ?? row.course_year_name))}` +
        `&regulationId=${regulationId || ""}`,
    );
  }

  const columnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      {
        headerName: "SI.No",
        valueGetter: (p: any) => (p.node?.rowIndex ?? 0) + 1,
        minWidth: 70,
        maxWidth: 80,
        flex: 0,
      },
      {
        field: "courseYearName",
        headerName: "Course Year",
        minWidth: 170,
        flex: 1,
      },
      {
        headerName: "Regulation",
        minWidth: 120,
        flex: 1,
        autoHeight: true,
        cellRenderer: regulationRenderer,
        valueGetter: (p) =>
          (Array.isArray(p.data?.subjectregulations)
            ? (p.data.subjectregulations as AnyRow[])
            : [])
            .map((x) => text(x.regulationCode))
            .filter(Boolean)
            .join(" "),
      },
      {
        headerName: "Academic Year",
        minWidth: 150,
        flex: 1,
        valueGetter: (p) => {
          const regs = Array.isArray(p.data?.subjectregulations)
            ? (p.data.subjectregulations as AnyRow[])
            : []
          return text(regs[0]?.academicYear ?? p.data?.academicYear)
        },
      },
      {
        headerName: "Actions",
        minWidth: 190,
        flex: 0,
        cellRenderer: makeActionsRenderer(assignSubjects, (row) => {
          void openView(row);
        }),
      },
    ],
    [
      groups,
      academicYears,
      colleges,
      courseId,
      courseGroupId,
      academicYearId,
      universityId,
      courses,
    ],
  );

  const viewCols = useMemo<ColDef<AnyRow>[]>(
    () => [
      {
        headerName: "No.",
        valueGetter: (p: any) => (p.node?.rowIndex ?? 0) + 1,
        minWidth: 70,
        maxWidth: 80,
        flex: 0,
      },
      {
        field: "subjectCode",
        headerName: "Subject Code",
        minWidth: 120,
        flex: 1,
      },
      {
        field: "subjectName",
        headerName: "Subject Name",
        minWidth: 180,
        flex: 1.2,
      },
      {
        field: "subjecttypeName",
        headerName: "Subject Type",
        minWidth: 130,
        flex: 1,
      },
      {
        field: "regulationName",
        headerName: "Regulation",
        minWidth: 120,
        flex: 1,
      },
      {
        field: "internalExamMarks",
        headerName: "Internal",
        minWidth: 90,
        flex: 0,
      },
      {
        field: "externalExamMarks",
        headerName: "External",
        minWidth: 90,
        flex: 0,
      },
      { field: "subjectCredits", headerName: "Credits", minWidth: 90, flex: 0 },
    ],
    [],
  );

  return (
    <PageContainer className="space-y-4">
      <FilterCard title="Assign Course Year Subjects">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
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
            options={groups.map((x) => ({
              value: String(num(x.fk_course_group_id)),
              label: text(x.group_code),
            }))}
            searchable
            disabled={!courseId}
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
            disabled={!courseGroupId}
          />
        </div>
      </FilterCard>

      {courseYears.length > 0 && (
        <>
          <div className="flex items-center justify-between rounded bg-[#edf0f3] px-2 p-1.5 text-[15px]">
            <strong className="font-medium text-primary">
              Assign Course Year Subjects
            </strong>
            <div className="font-medium text-muted-foreground">{summary}</div>
          </div>
          <div className="app-card p-0 overflow-hidden">
            <DataTable
              rowData={courseYears}
              columnDefs={columnDefs}
              loading={loading}
              toolbar={{ search: true, searchPlaceholder: "Search" }}
              pagination
              paginationPageSize={10}
            />
          </div>
        </>
      )}

      <Dialog
        open={viewModal.open}
        onOpenChange={(o) => setViewModal((s) => ({ ...s, open: o }))}
      >
        <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Assigned Course Year Subjects List</DialogTitle>
          </DialogHeader>
          <div className="app-card p-0 overflow-hidden">
            <DataTable
              rowData={viewModal.rows}
              columnDefs={viewCols}
              toolbar={{ search: true, searchPlaceholder: "Search" }}
              pagination
              paginationPageSize={10}
            />
          </div>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
