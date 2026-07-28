"use client";

/**
 * Angular `staff-classes/class-dairy` → `ClassDairyComponent`.
 * Reuses getStaffSubjectsForToday + getLessonstatus via fetchDetails (no new APIs).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil } from "lucide-react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { FilteredListPage } from "@/components/layout";
import { Select, type SelectOption } from "@/common/components/select";
import { Button } from "@/components/ui/button";
import { ASSESSMENT_API } from "@/config/constants";
import { useSessionContext } from "@/context/SessionContext";
import { useStaffLoginContext } from "@/hooks/useStaffLoginContext";
import { rowIndexGetter } from "@/lib/utils";
import { toastError, toastInfo } from "@/lib/toast";
import {
  fetchDetails,
  getStaffSubjectsForToday,
  type StaffSubjectClass,
} from "@/services";

type AnyRow = Record<string, unknown>;

function readStorage(key: string): string {
  if (typeof globalThis.window === "undefined") return "";
  return globalThis.localStorage.getItem(key) ?? "";
}

function positiveId(...candidates: unknown[]): number {
  for (const c of candidates) {
    const n = Number(c);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

function txt(row: AnyRow | null | undefined, keys: string[]): string {
  if (!row) return "";
  for (const key of keys) {
    const v = row[key];
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

function num(row: AnyRow | null | undefined, keys: string[]): number {
  if (!row) return 0;
  for (const key of keys) {
    const v = row[key];
    if (v != null && v !== "" && Number.isFinite(Number(v))) return Number(v);
  }
  return 0;
}

function asRows(data: unknown): AnyRow[] {
  if (data == null || data === "") return [];
  if (Array.isArray(data)) return data as AnyRow[];
  if (data && typeof data === "object" && "resultList" in data) {
    const list = (data as { resultList?: unknown }).resultList;
    if (list == null || list === "") return [];
    if (Array.isArray(list)) return list as AnyRow[];
    return [list as AnyRow];
  }
  if (typeof data === "object") return [data as AnyRow];
  return [];
}

function courseOptionLabel(c: StaffSubjectClass): string {
  const groupName = txt(c, ["groupName", "group_name"]);
  const groupCode = txt(c, ["groupCode", "group_code"]);
  const year = txt(c, ["courseYearName", "course_year_name"]);
  const section = txt(c, ["section"]);
  const subject = txt(c, ["subjectName", "subject_name"]);
  return `${groupName} / ${groupCode} / ${year} / ${section} - ${subject}`;
}

function enrichNotes(
  notes: AnyRow[],
  courses: StaffSubjectClass[],
  selected?: StaffSubjectClass | null,
): AnyRow[] {
  const mapped = notes.map((row) => {
    const next = { ...row };
    if (selected) {
      if (
        num(row, ["groupSectionId"]) === num(selected, ["groupSectionId"]) &&
        txt(row, ["subjectCode"]) === txt(selected, ["subjectCode"])
      ) {
        next.courseYearName = selected.courseYearName;
        next.courseYearId = selected.courseYearId;
        next.section = selected.section;
      }
      return next;
    }
    const match = courses.find(
      (c) =>
        num(c, ["groupSectionId"]) === num(row, ["groupSectionId"]) &&
        txt(c, ["subjectCode"]) === txt(row, ["subjectCode"]),
    );
    if (match) {
      next.courseYearName = match.courseYearName;
      next.courseYearId = match.courseYearId;
      next.section = match.section;
    }
    return next;
  });
  return [...mapped].sort((a, b) => {
    const aId = num(a, ["leassonstatusId", "lessonstatusId", "lessonStatusId"]);
    const bId = num(b, ["leassonstatusId", "lessonstatusId", "lessonStatusId"]);
    return bId - aId;
  });
}

function fileRenderer(p: ICellRendererParams<AnyRow>) {
  const path = txt(p.data, ["notesPath", "notes_path"]);
  if (!path) {
    return <span className="text-muted-foreground">No Docs Uploaded</span>;
  }
  return (
    <a
      href={path}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-600 underline"
    >
      Document
    </a>
  );
}

function makeEditRenderer(onEdit: (row: AnyRow) => void) {
  return (p: ICellRendererParams<AnyRow>) => {
    const row = p.data;
    if (!row) return null;
    return (
      <Button
        size="sm"
        variant="ghost"
        onClick={() => onEdit(row)}
        aria-label="Edit class notes"
      >
        <Pencil className="h-3.5 w-3.5" />
      </Button>
    );
  };
}

const COL_DEFS = {
  siNo: {
    headerName: "SI.NO",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<AnyRow>,
  classDate: {
    field: "classDate",
    headerName: "Class Date",
    minWidth: 120,
    valueGetter: (p) => txt(p.data, ["classDate", "class_date"]),
  } as ColDef<AnyRow>,
  className: {
    headerName: "Class",
    minWidth: 160,
    valueGetter: (p) => {
      const year = txt(p.data, ["courseYearName", "course_year_name"]);
      const section = txt(p.data, ["section"]);
      if (!year && !section) return "";
      return `${year}${year && section ? " / " : ""}${section}`;
    },
  } as ColDef<AnyRow>,
  subject: {
    field: "subjectName",
    headerName: "Subject",
    minWidth: 180,
    valueGetter: (p) => txt(p.data, ["subjectName", "subject_name"]),
  } as ColDef<AnyRow>,
  unit: {
    field: "subjectUnitCode",
    headerName: "Unit",
    minWidth: 100,
    valueGetter: (p) =>
      txt(p.data, ["subjectUnitCode", "unitName", "unit_name"]),
  } as ColDef<AnyRow>,
  unitTopic: {
    field: "subjectUnitTopicName",
    headerName: "Unit Topic",
    minWidth: 140,
    valueGetter: (p) =>
      txt(p.data, ["subjectUnitTopicName", "topicName", "topic_name"]),
  } as ColDef<AnyRow>,
  notes: {
    field: "comments",
    headerName: "Notes",
    minWidth: 160,
    flex: 1,
    valueGetter: (p) => txt(p.data, ["comments", "comment"]),
  } as ColDef<AnyRow>,
  file: {
    headerName: "File",
    minWidth: 140,
    flex: 0,
  } as ColDef<AnyRow>,
  actions: {
    headerName: "Actions",
    minWidth: 90,
    flex: 0,
    sortable: false,
    filter: false,
  } as ColDef<AnyRow>,
};

export function ClassDiaryPage() {
  const router = useRouter();
  const { user, isLoading: sessionLoading } = useSessionContext();
  const { employeeId, isResolving } = useStaffLoginContext(
    user,
    sessionLoading,
  );

  const [courses, setCourses] = useState<StaffSubjectClass[]>([]);
  const [semesterKey, setSemesterKey] = useState<string>("0");
  const [rows, setRows] = useState<AnyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);

  const academicYearId = positiveId(
    readStorage("academicYearId"),
    user?.academicYearId,
  );

  const semesterOptions = useMemo<SelectOption[]>(() => {
    const opts: SelectOption[] = [{ value: "0", label: "All" }];
    courses.forEach((c, i) => {
      opts.push({ value: String(i + 1), label: courseOptionLabel(c) });
    });
    return opts;
  }, [courses]);

  const selectedCourse = useMemo(() => {
    if (semesterKey === "0") return null;
    const idx = Number(semesterKey) - 1;
    return courses[idx] ?? null;
  }, [courses, semesterKey]);

  const loadCourses = useCallback(async () => {
    if (!employeeId) {
      setCourses([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const list = await getStaffSubjectsForToday({ employeeId });
      setCourses(Array.isArray(list) ? list : []);
    } catch (e) {
      toastError(e, "Failed to load staff classes");
      setCourses([]);
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  const loadClassNotes = useCallback(
    async (
      course: StaffSubjectClass | null,
      courseList: StaffSubjectClass[],
    ) => {
      if (!employeeId || !academicYearId) {
        setRows([]);
        return;
      }
      setListLoading(true);
      try {
        const params: Record<string, string | number> = {
          empId: employeeId,
          academicYearId,
        };
        if (course) {
          params.subjectId = num(course, ["subjectId"]);
          params.groupSectionId = num(course, ["groupSectionId"]);
        }
        const data = await fetchDetails<unknown>(
          ASSESSMENT_API.GET_LESSONSTATUS,
          params,
        );
        const list = enrichNotes(asRows(data), courseList, course);
        setRows(list);
        if (list.length === 0) {
          toastInfo("No class diary entries found.");
        }
      } catch (e) {
        toastError(e, "Failed to load class diary");
        setRows([]);
      } finally {
        setListLoading(false);
      }
    },
    [employeeId, academicYearId],
  );

  useEffect(() => {
    if (sessionLoading || isResolving) return;
    void loadCourses();
  }, [sessionLoading, isResolving, loadCourses]);

  useEffect(() => {
    if (loading || sessionLoading || isResolving) return;
    void loadClassNotes(selectedCourse, courses);
  }, [
    loading,
    sessionLoading,
    isResolving,
    selectedCourse,
    courses,
    loadClassNotes,
  ]);

  const handleEdit = useCallback(
    (row: AnyRow) => {
      const qs = new URLSearchParams({
        courseYearId: String(num(row, ["courseYearId"])),
        actualClsScheduleId: String(num(row, ["actualClsScheduleId"])),
        groupSectionId: String(num(row, ["groupSectionId"])),
        classDate: txt(row, ["classDate"]),
        subjectCode: txt(row, ["subjectCode"]),
        timetableScheduleId: String(num(row, ["timetableScheduleId"])),
      });
      router.push(`/staff-classes/class-dairy/edit-notes?${qs.toString()}`);
    },
    [router],
  );

  const columnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.classDate,
      COL_DEFS.className,
      COL_DEFS.subject,
      COL_DEFS.unit,
      COL_DEFS.unitTopic,
      COL_DEFS.notes,
      { ...COL_DEFS.file, cellRenderer: fileRenderer },
      { ...COL_DEFS.actions, cellRenderer: makeEditRenderer(handleEdit) },
    ],
    [handleEdit],
  );

  const busy = sessionLoading || isResolving || loading || listLoading;

  return (
    <FilteredListPage
      title="Class Diary"
      filters={
        <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Select
            label="Semester"
            value={semesterKey}
            onChange={(v) => setSemesterKey(v ?? "0")}
            options={semesterOptions}
            placeholder="All"
            searchable
            clearable={false}
            isLoading={loading}
          />
        </div>
      }
      columnDefs={columnDefs}
      rowData={rows}
      loading={busy}
      height="auto"
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: "Search",
        exportExcel: true,
        exportPdf: false,
      }}
      toolbarTrailing={
        <Button
          onClick={() => router.push("/staff-classes/class-dairy/add-notes")}
        >
          <Plus className="mr-1 h-4 w-4" />
          Add Notes
        </Button>
      }
    />
  );
}
