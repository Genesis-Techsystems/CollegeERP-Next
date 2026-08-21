"use client";
import { useEffect, useMemo, useState } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { PencilIcon, PlusIcon } from "lucide-react";
import { StatusBadge } from "@/common/components/data-display";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
import { Select } from "@/common/components/select";
import { useBreadcrumbLabel } from "@/common/components/breadcrumb";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { QK } from "@/lib/query-keys";
import { getCrudModalKey, rowIndexGetter } from "@/lib/utils";
import {
  getExamMasterCollegeFilters,
  listGroupSectionsByFilters,
} from "@/services";
import type { GroupSection } from "@/types/group-section";
import GroupSectionModal from "./GroupSectionModal";

const COLS = {
  siNo: {
    colId: "siNo",
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<GroupSection>,
  courseGroup: {
    colId: "courseGroup",
    headerName: "Course group",
    minWidth: 150,
    flex: 1,
  } as ColDef<GroupSection>,
  courseYear: {
    colId: "courseYear",
    headerName: "course year",
    minWidth: 130,
    flex: 1,
  } as ColDef<GroupSection>,
  academicYear: {
    colId: "academicYear",
    headerName: "Acadamic year",
    minWidth: 140,
    flex: 1,
  } as ColDef<GroupSection>,
  section: {
    colId: "section",
    headerName: "section",
    minWidth: 160,
    flex: 1.1,
  } as ColDef<GroupSection>,
  sortOrder: {
    colId: "sortOrder",
    headerName: "sort order",
    minWidth: 110,
    flex: 0.8,
  } as ColDef<GroupSection>,
  isActive: {
    colId: "isActive",
    field: "isActive",
    headerName: "Status",
    minWidth: 90,
    flex: 0.7,
  } as ColDef<GroupSection>,
  actions: {
    colId: "actions",
    headerName: "action",
    minWidth: 86,
    width: 86,
    flex: 0,
  } as ColDef<GroupSection>,
};
function pick(r: Record<string, unknown>, keys: string[]) {
  for (const k of keys) {
    const v = r[k];
    if (typeof v === "string" && v.trim()) return v;
  }
  return "";
}
function statusRenderer(p: ICellRendererParams<GroupSection>) {
  return <StatusBadge status={p.data?.isActive ?? false} />;
}
function actionRenderer(
  setRow: (r: GroupSection | null) => void,
  setOpen: (b: boolean) => void,
) {
  return (p: ICellRendererParams<GroupSection>) => (
    <Button
      size="sm"
      variant="ghost"
      className="h-8 w-8 p-0"
      onClick={() => {
        setRow(p.data ?? null);
        setOpen(true);
      }}
    >
      <PencilIcon className="h-3.5 w-3.5" />
    </Button>
  );
}

export default function GroupSectionsPage() {
  useBreadcrumbLabel("Section");

  const [open, setOpen] = useState(false);
  const [row, setRow] = useState<GroupSection | null>(null);

  // Filters (Angular parity behavior)
  const [universityId, setUniversityId] = useState<number | null>(null);
  const [collegeId, setCollegeId] = useState<number | null>(null);
  const [academicYearId, setAcademicYearId] = useState<number | null>(null);
  const [courseId, setCourseId] = useState<number | null>(null);
  const [courseGroupId, setCourseGroupId] = useState<number | null>(null);
  const [courseYearId, setCourseYearId] = useState<number | null>(null);

  const orgId = Number(
    globalThis?.localStorage?.getItem("organizationId") ?? 0,
  );
  const empId = Number(globalThis?.localStorage?.getItem("employeeId") ?? 0);

  const filtersQuery = useQuery({
    queryKey: QK.collegeFilters.byUser(orgId, empId),
    queryFn: () => getExamMasterCollegeFilters(orgId, empId),
    enabled: orgId > 0 && empId > 0,
    staleTime: 5 * 60 * 1000,
  });

  const filtersData = filtersQuery.data?.filtersData ?? [];
  const academicData = filtersQuery.data?.academicData ?? [];

  const universities = useMemo(() => {
    const seen = new Set<number>();
    const out: any[] = [];
    for (const row of filtersData as any[]) {
      const id = Number(row?.fk_university_id ?? 0);
      if (!id || seen.has(id)) continue;
      seen.add(id);
      out.push(row);
    }
    return out;
  }, [filtersData]);

  const colleges = useMemo(() => {
    if (!universityId) return [];
    const rows = (filtersData as any[]).filter(
      (r) => Number(r?.fk_university_id ?? 0) === universityId,
    );
    const seen = new Set<number>();
    const out: any[] = [];
    for (const row of rows) {
      const id = Number(row?.fk_college_id ?? 0);
      if (!id || seen.has(id)) continue;
      seen.add(id);
      out.push(row);
    }
    return out.sort(
      (a, b) => Number(a?.clg_sort_order ?? 0) - Number(b?.clg_sort_order ?? 0),
    );
  }, [filtersData, universityId]);

  const academicYears = useMemo(() => {
    if (!universityId) return [];
    const rows = (academicData as any[]).filter(
      (r) => Number(r?.fk_university_id ?? 0) === universityId,
    );
    const seen = new Set<number>();
    const out: any[] = [];
    for (const row of rows) {
      const id = Number(row?.fk_academic_year_id ?? 0);
      if (!id || seen.has(id)) continue;
      seen.add(id);
      out.push(row);
    }
    return out.sort((a, b) =>
      String(b?.academic_year ?? "").localeCompare(
        String(a?.academic_year ?? ""),
      ),
    );
  }, [academicData, universityId]);

  const courses = useMemo(() => {
    if (!universityId || !collegeId) return [];
    const rows = (filtersData as any[]).filter(
      (r) =>
        Number(r?.fk_university_id ?? 0) === universityId &&
        Number(r?.fk_college_id ?? 0) === collegeId,
    );
    const seen = new Set<number>();
    const out: any[] = [];
    for (const row of rows) {
      const id = Number(row?.fk_course_id ?? 0);
      if (!id || seen.has(id)) continue;
      seen.add(id);
      out.push(row);
    }
    return out;
  }, [filtersData, universityId, collegeId]);

  const courseGroups = useMemo(() => {
    if (!universityId || !collegeId || !courseId) return [];
    const rows = (filtersData as any[]).filter(
      (r) =>
        Number(r?.fk_university_id ?? 0) === universityId &&
        Number(r?.fk_college_id ?? 0) === collegeId &&
        Number(r?.fk_course_id ?? 0) === courseId,
    );
    const seen = new Set<number>();
    const out: any[] = [];
    for (const row of rows) {
      const id = Number(row?.fk_course_group_id ?? 0);
      if (!id || seen.has(id)) continue;
      seen.add(id);
      out.push(row);
    }
    return out;
  }, [filtersData, universityId, collegeId, courseId]);

  const courseYears = useMemo(() => {
    if (!universityId || !collegeId || !courseId || !courseGroupId) return [];
    const rows = (filtersData as any[]).filter(
      (r) =>
        Number(r?.fk_university_id ?? 0) === universityId &&
        Number(r?.fk_college_id ?? 0) === collegeId &&
        Number(r?.fk_course_id ?? 0) === courseId &&
        Number(r?.fk_course_group_id ?? 0) === courseGroupId,
    );
    const seen = new Set<number>();
    const out: any[] = [];
    for (const row of rows) {
      const id = Number(row?.fk_course_year_id ?? 0);
      if (!id || seen.has(id)) continue;
      seen.add(id);
      out.push(row);
    }
    return out.sort(
      (a, b) => Number(a?.year_order ?? 0) - Number(b?.year_order ?? 0),
    );
  }, [filtersData, universityId, collegeId, courseId, courseGroupId]);

  const sectionsQuery = useQuery({
    queryKey: QK.groupSections.list({
      collegeId: collegeId ?? undefined,
      academicYearId: academicYearId ?? undefined,
      courseGroupId: courseGroupId ?? undefined,
      courseYearId: courseYearId ?? undefined,
    }),
    queryFn: async () => {
      return listGroupSectionsByFilters({
        collegeId: collegeId ?? 0,
        academicYearId: academicYearId ?? 0,
        courseGroupId: courseGroupId ?? 0,
        courseYearId: courseYearId ?? 0,
        includeInactive: true,
      });
    },
    enabled: Boolean(
      collegeId && academicYearId && courseGroupId && courseYearId,
    ),
  });

  const data = (sectionsQuery.data ?? []) as any[];
  const isLoading = filtersQuery.isLoading || sectionsQuery.isLoading;
  const invalidate = () => sectionsQuery.refetch();
  const columnDefs = useMemo<ColDef<GroupSection>[]>(
    () => [
      COLS.siNo,
      {
        ...COLS.courseGroup,
        valueGetter: (p) =>
          pick((p.data ?? {}) as Record<string, unknown>, [
            "groupCode",
            "group_code",
            "courseGroupCode",
          ]),
      },
      {
        ...COLS.courseYear,
        valueGetter: (p) =>
          pick((p.data ?? {}) as Record<string, unknown>, [
            "courseYearCode",
            "courseYearName",
          ]),
      },
      {
        ...COLS.academicYear,
        valueGetter: (p) =>
          pick((p.data ?? {}) as Record<string, unknown>, [
            "academicYear",
            "academicYearCode",
            "academicYearName",
          ]),
      },
      {
        ...COLS.section,
        valueGetter: (p) =>
          pick((p.data ?? {}) as Record<string, unknown>, [
            "groupSectionName",
            "groupSectionCode",
          ]),
      },
      {
        ...COLS.sortOrder,
        valueGetter: (p) =>
          ((p.data ?? {}) as Record<string, unknown>).sortOrder ?? "",
      },
      { ...COLS.isActive, cellRenderer: statusRenderer },
      { ...COLS.actions, cellRenderer: actionRenderer(setRow, setOpen) },
    ],
    [],
  );

  // Default selections + cascading resets
  useEffect(() => {
    if (universityId == null && universities.length > 0)
      setUniversityId(
        Number((universities[0] as any).fk_university_id ?? 0) || null,
      );
  }, [universities, universityId]);
  useEffect(() => {
    setCollegeId(null);
    setAcademicYearId(null);
    setCourseId(null);
    setCourseGroupId(null);
    setCourseYearId(null);
  }, [universityId]);
  useEffect(() => {
    if (collegeId == null && colleges.length > 0)
      setCollegeId(Number((colleges[0] as any).fk_college_id ?? 0) || null);
  }, [colleges, collegeId]);
  useEffect(() => {
    setAcademicYearId(null);
    setCourseId(null);
    setCourseGroupId(null);
    setCourseYearId(null);
  }, [collegeId]);

  useEffect(() => {
    if (academicYearId == null && academicYears.length > 0) {
      const curr = [...academicYears].sort(
        (a, b) =>
          Number((b as any)?.is_curr_ay ?? 0) -
          Number((a as any)?.is_curr_ay ?? 0),
      )[0] as any;
      const id = Number(curr?.fk_academic_year_id ?? 0);
      setAcademicYearId(id || null);
    }
  }, [academicYears, academicYearId]);
  useEffect(() => {
    setCourseId(null);
    setCourseGroupId(null);
    setCourseYearId(null);
  }, [academicYearId]);

  useEffect(() => {
    if (courseId == null && courses.length > 0)
      setCourseId(Number((courses[0] as any).fk_course_id ?? 0) || null);
  }, [courses, courseId]);
  useEffect(() => {
    setCourseGroupId(null);
    setCourseYearId(null);
  }, [courseId]);
  useEffect(() => {
    if (courseGroupId == null && courseGroups.length > 0)
      setCourseGroupId(
        Number((courseGroups[0] as any).fk_course_group_id ?? 0) || null,
      );
  }, [courseGroups, courseGroupId]);
  useEffect(() => {
    setCourseYearId(null);
  }, [courseGroupId]);

  useEffect(() => {
    if (courseYearId == null && courseYears.length > 0)
      setCourseYearId(
        Number((courseYears[0] as any).fk_course_year_id ?? 0) || null,
      );
  }, [courseYears, courseYearId]);

  const canShowTable =
    universityId != null &&
    collegeId != null &&
    academicYearId != null &&
    courseId != null &&
    courseGroupId != null &&
    courseYearId != null;

  const universityOptions = useMemo(
    () =>
      universities.map((u: any) => ({
        value: String(u.fk_university_id ?? 0),
        label: String(u.university_code ?? u.university_name ?? ""),
      })),
    [universities],
  );
  const collegeOptions = useMemo(
    () =>
      colleges.map((c: any) => ({
        value: String(c.fk_college_id ?? 0),
        label: String(
          c.college_code ??
            c.collegeCode ??
            c.college_name ??
            c.collegeName ??
            "",
        ),
      })),
    [colleges],
  );
  const academicYearOptions = useMemo(
    () =>
      academicYears.map((a: any) => ({
        value: String(Number(a?.fk_academic_year_id ?? 0)),
        label: String(a?.academic_year ?? ""),
      })),
    [academicYears],
  );
  const courseOptions = useMemo(
    () =>
      courses.map((c: any) => ({
        value: String(c.fk_course_id ?? 0),
        label: String(c.course_code ?? ""),
      })),
    [courses],
  );
  const courseGroupOptions = useMemo(
    () =>
      courseGroups.map((g: any) => ({
        value: String(g.fk_course_group_id ?? 0),
        label: String(g.group_code ?? g.groupCode ?? ""),
      })),
    [courseGroups],
  );
  const courseYearOptions = useMemo(
    () =>
      courseYears.map((y: any) => ({
        value: String(y.fk_course_year_id ?? 0),
        label: String(y.course_year_name ?? ""),
      })),
    [courseYears],
  );

  function labelOf(
    options: { value: string; label: string }[],
    id: number | null,
  ) {
    return options.find((o) => Number(o.value) === id)?.label ?? "";
  }

  // Angular popup header: "Course : <college> / <course> / <group> / <course year>"
  const courseLabel = [
    labelOf(collegeOptions, collegeId),
    labelOf(courseOptions, courseId),
    labelOf(courseGroupOptions, courseGroupId),
    labelOf(courseYearOptions, courseYearId),
  ]
    .filter(Boolean)
    .join(" / ");

  return (
    <FilteredListPage
      title="Section"
      filters={
        <GlobalFilterBarRow>
          <GlobalFilterField label="University *">
            <Select
              value={universityId ? String(universityId) : null}
              onChange={(v) => setUniversityId(v ? Number(v) : null)}
              options={universityOptions}
              searchable
            />
          </GlobalFilterField>
          <GlobalFilterField label="College *">
            <Select
              value={collegeId ? String(collegeId) : null}
              onChange={(v) => setCollegeId(v ? Number(v) : null)}
              options={collegeOptions}
              searchable
            />
          </GlobalFilterField>
          <GlobalFilterField label="Academic Year *">
            <Select
              value={academicYearId ? String(academicYearId) : null}
              onChange={(v) => setAcademicYearId(v ? Number(v) : null)}
              options={academicYearOptions}
              searchable
            />
          </GlobalFilterField>
          <GlobalFilterField label="Course *">
            <Select
              value={courseId ? String(courseId) : null}
              onChange={(v) => setCourseId(v ? Number(v) : null)}
              options={courseOptions}
              searchable
            />
          </GlobalFilterField>
          <GlobalFilterField label="Course Group *">
            <Select
              value={courseGroupId ? String(courseGroupId) : null}
              onChange={(v) => setCourseGroupId(v ? Number(v) : null)}
              options={courseGroupOptions}
              searchable
            />
          </GlobalFilterField>
          <GlobalFilterField label="Course Year *">
            <Select
              value={courseYearId ? String(courseYearId) : null}
              onChange={(v) => setCourseYearId(v ? Number(v) : null)}
              options={courseYearOptions}
              searchable
            />
          </GlobalFilterField>
        </GlobalFilterBarRow>
      }
      rowData={canShowTable ? data : []}
      columnDefs={columnDefs}
      loading={isLoading}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: "Search sections…",
        pdfDocumentTitle: "Sections",
      }}
      toolbarTrailing={
        <Button
          size="sm"
          disabled={!canShowTable}
          onClick={() => {
            setRow(null);
            setOpen(true);
          }}
        >
          <PlusIcon className="h-4 w-4 mr-1" />
          Add Section
        </Button>
      }
    >
      <GroupSectionModal
        key={getCrudModalKey(row, open, "groupSectionId")}
        open={open}
        onClose={() => {
          setOpen(false);
          setRow(null);
        }}
        row={row}
        onSaved={invalidate}
        context={{
          collegeId,
          academicYearId,
          courseId,
          courseGroupId,
          courseYearId,
          academicYearLabel: labelOf(academicYearOptions, academicYearId),
          courseLabel,
        }}
      />
    </FilteredListPage>
  );
}
