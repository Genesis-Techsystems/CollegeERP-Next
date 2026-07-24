"use client";

/**
 * Angular `student-academics/student-class-diary` → `StudentClassDiaryComponent`.
 * Filters: All / By Date / By Subject. Reuses existing domainList / fetchDetails /
 * listStudentSubjectsForStudent (no new APIs or services).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { FilteredListPage } from "@/components/layout";
import { Select, type SelectOption } from "@/common/components/select";
import { DatePicker } from "@/common/components/date-picker";
import { ASSESSMENT_API } from "@/config/constants";
import { useSession } from "@/hooks/useSession";
import { rowIndexGetter } from "@/lib/utils";
import { toastError, toastInfo } from "@/lib/toast";
import {
  buildQuery,
  domainList,
  fetchDetails,
  fetchStudentDetail,
  fetchStudentDetailByUserId,
  listStudentSubjectsForStudent,
} from "@/services";

type AnyRow = Record<string, unknown>;
type FilterType = 0 | 1 | 2;

function positiveId(...candidates: unknown[]): number {
  for (const c of candidates) {
    const n = Number(c);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

function readStorage(key: string): string {
  if (typeof globalThis.window === "undefined") return "";
  return globalThis.localStorage.getItem(key) ?? "";
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

/** Angular maps getLessonstatus fields onto unitName / topicName. */
function normalizeLessonRows(rows: AnyRow[]): AnyRow[] {
  const mapped = rows.map((row) => {
    const unitName =
      txt(row, ["unitName", "unit_name"]) ||
      txt(row, ["subjectUnitCode", "subject_unit_code"]);
    const topicName =
      txt(row, ["topicName", "topic_name"]) ||
      txt(row, ["subjectUnitTopicName", "subject_unit_topic_name"]);
    return { ...row, unitName, topicName };
  });
  // Angular: _.orderBy(..., ['leassonstatusId'], ['desc'])
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

const FILTER_OPTIONS: SelectOption[] = [
  { value: "0", label: "All" },
  { value: "1", label: "By Date" },
  { value: "2", label: "By Subject" },
];

const COL_DEFS = {
  siNo: {
    headerName: "No.",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<AnyRow>,
  classDate: {
    field: "classDate",
    headerName: "Class Date",
    minWidth: 120,
    valueGetter: (p) => txt(p.data, ["classDate", "class_date"]) || "—",
  } as ColDef<AnyRow>,
  subject: {
    field: "subjectName",
    headerName: "Subject",
    minWidth: 160,
    valueGetter: (p) =>
      txt(p.data, ["subjectName", "subject_name"]) || "—",
  } as ColDef<AnyRow>,
  unit: {
    field: "unitName",
    headerName: "Unit",
    minWidth: 120,
    valueGetter: (p) => txt(p.data, ["unitName", "unit_name"]) || "—",
  } as ColDef<AnyRow>,
  topic: {
    field: "topicName",
    headerName: "Topic",
    minWidth: 140,
    valueGetter: (p) => txt(p.data, ["topicName", "topic_name"]) || "—",
  } as ColDef<AnyRow>,
  comments: {
    field: "comments",
    headerName: "Comments",
    minWidth: 180,
    flex: 1,
    valueGetter: (p) => txt(p.data, ["comments", "comment"]) || "—",
  } as ColDef<AnyRow>,
  file: {
    headerName: "File",
    minWidth: 140,
    flex: 0,
  } as ColDef<AnyRow>,
};

export function StudentClassDiaryPage() {
  const { user, isLoading: sessionLoading } = useSession();
  const [contextLoading, setContextLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [filterType, setFilterType] = useState<FilterType>(0);
  const [fromDate, setFromDate] = useState<Date | null>(() => new Date());
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [studentSubjects, setStudentSubjects] = useState<AnyRow[]>([]);
  const [rows, setRows] = useState<AnyRow[]>([]);
  const [ctx, setCtx] = useState<{
    collegeId: number;
    academicYearId: number;
    groupSectionId: number;
    studentId: number;
    courseYearId: number;
  } | null>(null);

  const subjectOptions = useMemo<SelectOption[]>(
    () =>
      studentSubjects.map((s) => {
        const id = num(s, ["subjectId", "subject_id"]);
        const name = txt(s, ["subjectName", "subject_name"]);
        const typeCode = txt(s, [
          "subjectTypeCode",
          "subjectTypeName",
          "subject_type_code",
        ]);
        return {
          value: String(id),
          label: typeCode ? `${name} - ( ${typeCode} )` : name || String(id),
        };
      }),
    [studentSubjects],
  );

  const loadContext = useCallback(async () => {
    setContextLoading(true);
    setStudentSubjects([]);
    try {
      const storageStudentId = positiveId(readStorage("studentId"));
      const sessionStudentId = positiveId(user?.studentId);
      const studentId = sessionStudentId || storageStudentId;

      let detail: AnyRow | null = null;
      if (studentId) {
        detail = (await fetchStudentDetail(studentId)) as AnyRow | null;
      }
      if (!detail && user?.userId) {
        detail = (await fetchStudentDetailByUserId(
          user.userId,
        )) as AnyRow | null;
      }

      const collegeId =
        num(detail, ["collegeId", "fk_college_id"]) ||
        positiveId(readStorage("collegeId"));
      const academicYearId =
        num(detail, ["academicYearId", "fk_academic_year_id"]) ||
        positiveId(readStorage("academicYearId"));
      const groupSectionId =
        num(detail, [
          "groupSectionId",
          "fk_group_section_id",
          "sectionId",
        ]) || positiveId(readStorage("groupSectionId"));
      const sid =
        num(detail, ["studentId", "fk_student_id", "student_id"]) || studentId;
      const courseYearId =
        num(detail, ["courseYearId", "fk_course_year_id"]) ||
        positiveId(readStorage("courseYearId"));

      if (!collegeId || !academicYearId || !groupSectionId || !sid) {
        toastInfo("Could not load your student academic context.");
        setCtx(null);
        return;
      }

      setCtx({
        collegeId,
        academicYearId,
        groupSectionId,
        studentId: sid,
        courseYearId,
      });

      // Angular selectedStudent → StudentSubject list (for By Subject filter)
      if (courseYearId) {
        const subjects = await listStudentSubjectsForStudent({
          collegeId,
          academicYearId,
          studentId: sid,
          courseYearId,
        });
        setStudentSubjects(Array.isArray(subjects) ? subjects : []);
      }
    } catch (e) {
      toastError(e, "Failed to load student context");
      setCtx(null);
    } finally {
      setContextLoading(false);
    }
  }, [user]);

  const loadClassNotes = useCallback(async () => {
    if (!ctx) {
      setRows([]);
      return;
    }

    // Angular type===2 waits for subject selection (selectedSubject)
    if (filterType === 2) {
      if (!subjectId) {
        setRows([]);
        return;
      }
      setListLoading(true);
      try {
        // Angular listByThreeIds(getLessonstatus, academicYearId, subjectId, groupSectionId, …)
        const data = await fetchDetails<unknown>(ASSESSMENT_API.GET_LESSONSTATUS, {
          academicYearId: ctx.academicYearId,
          subjectId,
          groupSectionId: ctx.groupSectionId,
        });
        const list = normalizeLessonRows(asRows(data));
        setRows(list);
        if (list.length === 0) toastInfo("No class diary entries found.");
      } catch (e) {
        toastError(e, "Failed to load class diary");
        setRows([]);
      } finally {
        setListLoading(false);
      }
      return;
    }

    setListLoading(true);
    try {
      // Angular listDetailsByThreeIdsWithSort / listDetailsByFourIds on Lessonstatus
      const conditions: Record<string, string | number | boolean> = {
        "College.CollegeId": ctx.collegeId,
        "AcademicYear.academicYearId": ctx.academicYearId,
        "GroupSection.groupSectionId": ctx.groupSectionId,
      };
      if (filterType === 1) {
        const d = fromDate ?? new Date();
        conditions.classDate = format(d, "yyyy/MM/dd");
      }

      const query = buildQuery(conditions, {
        field: "leassonstatusId",
        direction: "DESC",
      });
      const list = await domainList<AnyRow>(ASSESSMENT_API.LESSONSTATUS, query);
      const normalized = Array.isArray(list) ? list : [];
      setRows(normalized);
      if (normalized.length === 0) toastInfo("No class diary entries found.");
    } catch (e) {
      toastError(e, "Failed to load class diary");
      setRows([]);
    } finally {
      setListLoading(false);
    }
  }, [ctx, filterType, fromDate, subjectId]);

  useEffect(() => {
    if (sessionLoading) return;
    void loadContext();
  }, [sessionLoading, loadContext]);

  useEffect(() => {
    if (contextLoading || !ctx) return;
    void loadClassNotes();
  }, [contextLoading, ctx, loadClassNotes]);

  const columnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.classDate,
      COL_DEFS.subject,
      COL_DEFS.unit,
      COL_DEFS.topic,
      COL_DEFS.comments,
      { ...COL_DEFS.file, cellRenderer: fileRenderer },
    ],
    [],
  );

  const busy = sessionLoading || contextLoading || listLoading;

  return (
    <FilteredListPage
      title="Student Class Diary"
      filters={
        <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Select
            label="Select By"
            value={String(filterType)}
            onChange={(v) => {
              const next = (Number(v) as FilterType) || 0;
              setFilterType(next);
              if (next !== 2) setSubjectId(null);
            }}
            options={FILTER_OPTIONS}
            searchable={false}
            clearable={false}
          />
          {filterType === 1 ? (
            <DatePicker
              label="From Date"
              value={fromDate}
              onChange={(d) => setFromDate(d)}
              maxDate={new Date()}
              clearable={false}
              displayFormat="dd/MM/yyyy"
            />
          ) : null}
          {filterType === 2 ? (
            <Select
              label="Subject"
              value={subjectId ? String(subjectId) : null}
              onChange={(v) => setSubjectId(v ? Number(v) : null)}
              options={subjectOptions}
              placeholder="Select subject"
              searchable
              isLoading={contextLoading}
            />
          ) : null}
        </div>
      }
      columnDefs={columnDefs}
      rowData={rows}
      loading={busy}
      height="auto"
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: "Search…",
        exportExcel: true,
        exportPdf: true,
      }}
    />
  );
}
