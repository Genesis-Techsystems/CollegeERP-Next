"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { Eye, Pencil, Plus } from "lucide-react";
import { Select } from "@/common/components/select";
import { StatusBadge } from "@/common/components/data-display";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { MINIO_URL } from "@/config/constants/api";
import {
  listActiveCoursesByUniversity,
  listActiveUniversities,
  listSubjectsByCourse,
} from "@/services";
import { SubjectModal } from "./SubjectModal";

type AnyRow = Record<string, unknown>;

function toAnyRow(row: object | null | undefined): AnyRow | null {
  if (!row) return null;
  return row as unknown as AnyRow;
}

function toAnyRows(rows: object[]): AnyRow[] {
  return rows as unknown as AnyRow[];
}

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

const COLS = {
  siNo: {
    headerName: "No.",
    valueGetter: (p: { node?: { rowIndex?: number } | null }) =>
      (p.node?.rowIndex ?? 0) + 1,
    minWidth: 70,
    maxWidth: 90,
    flex: 0,
  } as ColDef<AnyRow>,
  subjectCode: {
    field: "subjectCode",
    headerName: "Subject Code",
    minWidth: 120,
    flex: 1,
  } as ColDef<AnyRow>,
  subjectName: {
    field: "subjectName",
    headerName: "Subject Name",
    minWidth: 200,
    flex: 1.4,
  } as ColDef<AnyRow>,
  subjectTypeName: {
    field: "subjectTypeName",
    headerName: "Subject Type",
    minWidth: 130,
    flex: 1,
  } as ColDef<AnyRow>,
  questionpaperCode: {
    field: "questionpaperCode",
    headerName: "QuestionPaper Code",
    minWidth: 150,
    flex: 1,
  } as ColDef<AnyRow>,
  subCredits: {
    field: "subCredits",
    headerName: "Credits",
    minWidth: 90,
    maxWidth: 110,
    flex: 0,
  } as ColDef<AnyRow>,
  subCreditHrs: {
    field: "subCreditHrs",
    headerName: "Credit Hours",
    minWidth: 110,
    maxWidth: 130,
    flex: 0,
  } as ColDef<AnyRow>,
  isActive: {
    field: "isActive",
    headerName: "Status",
    minWidth: 110,
    maxWidth: 130,
    flex: 0,
  } as ColDef<AnyRow>,
  actions: {
    headerName: "Actions",
    minWidth: 90,
    maxWidth: 110,
    flex: 0,
  } as ColDef<AnyRow>,
  syllabus: {
    headerName: "Syllabus",
    minWidth: 90,
    maxWidth: 110,
    flex: 0,
  } as ColDef<AnyRow>,
};

function statusRenderer(p: ICellRendererParams<AnyRow>) {
  const active = Boolean(p.data?.isActive);
  return <StatusBadge status={active} label={active ? "Active" : "InActive"} />;
}

function makeActionsRenderer(
  setRow: (x: AnyRow | null) => void,
  setOpen: (n: boolean) => void,
) {
  return (p: ICellRendererParams<AnyRow>) => (
    <button
      type="button"
      className="inline-flex items-center justify-center rounded p-1 text-blue-600 hover:bg-blue-50"
      onClick={() => {
        setRow(p.data ?? null);
        setOpen(true);
      }}
      aria-label="Edit subject"
      title="Edit"
    >
      <Pencil className="h-4 w-4" />
    </button>
  );
}

function syllabusRenderer(p: ICellRendererParams<AnyRow>) {
  const path = safeString(p.data?.syllabusPath);
  const hasFile = path.length > 0;
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center rounded p-1 ${
        hasFile
          ? "text-blue-600 hover:bg-blue-50 cursor-pointer"
          : "text-slate-400 cursor-default"
      }`}
      onClick={() => {
        if (!hasFile) return;
        // Angular: window.open(miniopath+path,'_blank','width=700,height=600')
        window.open(
          `${MINIO_URL}${path}`,
          "_blank",
          "width=700,height=600,noopener,noreferrer",
        );
      }}
      disabled={!hasFile}
      aria-label="View syllabus"
      title={hasFile ? "View Document" : undefined}
    >
      <Eye className="h-4 w-4" />
    </button>
  );
}

export default function SubjectsMasterPage() {
  const [universities, setUniversities] = useState<AnyRow[]>([]);
  const [courses, setCourses] = useState<AnyRow[]>([]);
  const [rows, setRows] = useState<AnyRow[]>([]);
  const [universityId, setUniversityId] = useState<number | null>(null);
  const [courseId, setCourseId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<AnyRow | null>(null);

  const selectedCourse = useMemo(
    () =>
      courses.find(
        (c) => pickNum(c, ["courseId", "pk_course_id"]) === courseId,
      ) ?? null,
    [courses, courseId],
  );

  const universityOptions = useMemo(
    () =>
      universities.map((x) => ({
        value: String(pickNum(x, ["universityId", "pk_university_id"])),
        label: safeString(x.universityCode || x.universityName || "University"),
      })),
    [universities],
  );

  const courseOptions = useMemo(
    () =>
      courses.map((x) => ({
        value: String(pickNum(x, ["courseId", "pk_course_id"])),
        label: safeString(x.courseCode || x.courseName || "Course"),
      })),
    [courses],
  );

  const loadSubjects = useCallback(async (id: number) => {
    setLoading(true);
    try {
      setRows(await listSubjectsByCourse(id));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    listActiveUniversities()
      .then((list) => {
        setUniversities(toAnyRows(list));
        const firstId = pickNum(toAnyRow(list[0]), [
          "universityId",
          "pk_university_id",
        ]);
        if (firstId) setUniversityId(firstId);
      })
      .catch(() => setUniversities([]));
  }, []);

  useEffect(() => {
    if (!universityId) {
      setCourses([]);
      setCourseId(null);
      setRows([]);
      return;
    }
    setRows([]);
    listActiveCoursesByUniversity(universityId)
      .then((list) => {
        setCourses(toAnyRows(list));
        const firstId = pickNum(toAnyRow(list[0]), [
          "courseId",
          "pk_course_id",
        ]);
        setCourseId(firstId || null);
      })
      .catch(() => {
        setCourses([]);
        setCourseId(null);
      });
  }, [universityId]);

  useEffect(() => {
    if (!courseId) {
      setRows([]);
      return;
    }
    void loadSubjects(courseId);
  }, [courseId, loadSubjects]);

  const columnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      COLS.siNo,
      COLS.subjectCode,
      COLS.subjectName,
      COLS.subjectTypeName,
      COLS.questionpaperCode,
      COLS.subCredits,
      COLS.subCreditHrs,
      { ...COLS.isActive, cellRenderer: statusRenderer },
      {
        ...COLS.actions,
        cellRenderer: makeActionsRenderer(setEditingRow, setOpen),
      },
      { ...COLS.syllabus, cellRenderer: syllabusRenderer },
    ],
    [],
  );

  return (
    <FilteredListPage
      title="Subject Master"
      filters={
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          <Select
            label="University"
            required
            value={universityId ? String(universityId) : null}
            onChange={(v) => setUniversityId(v ? Number(v) : null)}
            options={universityOptions}
            placeholder="University"
            searchable
          />
          <Select
            label="Course"
            required
            value={courseId ? String(courseId) : null}
            onChange={(v) => setCourseId(v ? Number(v) : null)}
            options={courseOptions}
            placeholder="Course"
            searchable
            disabled={!universityId}
          />
        </div>
      }
      rowData={courseId ? rows : []}
      columnDefs={columnDefs}
      loading={loading}
      toolbar={{
        search: true,
        searchPlaceholder: "Search",
        exportPdf: false,
        exportExcel: false,
      }}
      toolbarTrailing={
        <Button
          onClick={() => {
            setEditingRow({ type: "new" });
            setOpen(true);
          }}
          disabled={!courseId}
          className="h-[30px] px-3 text-[12px]"
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add Subject
        </Button>
      }
      pagination
      paginationPageSize={10}
    >
      <SubjectModal
        open={open}
        onClose={() => setOpen(false)}
        row={editingRow}
        courseId={courseId ?? 0}
        courseName={safeString(selectedCourse?.courseName)}
        courseCode={safeString(selectedCourse?.courseCode)}
        existingRows={rows}
        onSaved={() => {
          if (courseId) void loadSubjects(courseId);
        }}
      />
    </FilteredListPage>
  );
}
