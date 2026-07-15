"use client";

import { useEffect, useMemo, useState } from "react";
import type { ColDef } from "ag-grid-community";
import { DataTable } from "@/common/components/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { rowIndexGetter } from "@/lib/utils";
import {
  loadStudentExamResultsForSemester,
  loadStudentExamResultsShell,
  pickProfileCell,
  type StudentCurriculumSemester,
} from "@/services";

type AnyRow = Record<string, unknown>;

const SEM_TAB_CLASS =
  "rounded-none border-b-2 border-transparent px-3 py-2 text-[11px] whitespace-nowrap data-[state=active]:border-[#ffcf46] data-[state=active]:bg-[#ffcf46]/20 data-[state=active]:text-primary data-[state=active]:shadow-none";

const SEARCH_ONLY_TOOLBAR = {
  search: true,
  searchPlaceholder: "Search...",
  columnPicker: false,
  exportPdf: false,
  exportExcel: false,
  columnFilters: false,
} as const;

function examValue(row: AnyRow, keys: string[]): string {
  const value = pickProfileCell(row, keys);
  return value && value !== "—" ? value : "—";
}

const EXAM_RESULT_COLS: ColDef<AnyRow>[] = [
  { headerName: "SI.No", valueGetter: rowIndexGetter, width: 70, flex: 0 },
  {
    headerName: "Subject Code",
    minWidth: 130,
    valueGetter: (p) =>
      examValue(p.data ?? {}, ["subjectCode", "subject_code"]),
  },
  {
    headerName: "Subject",
    minWidth: 180,
    valueGetter: (p) =>
      examValue(p.data ?? {}, [
        "subjectName",
        "subject_name",
        "shortName",
        "subjectShortName",
      ]),
  },
  {
    headerName: "Grade",
    minWidth: 90,
    valueGetter: (p) =>
      examValue(p.data ?? {}, ["grade", "letterGrade", "letter_grade"]),
  },
  {
    headerName: "Grade Points",
    minWidth: 110,
    valueGetter: (p) =>
      examValue(p.data ?? {}, ["gradePoints", "grade_points", "gradePoint"]),
  },
  {
    headerName: "Internal Marks",
    minWidth: 120,
    valueGetter: (p) =>
      examValue(p.data ?? {}, [
        "internalMarks",
        "internal_marks",
        "intMarks",
        "int_marks",
      ]),
  },
  {
    headerName: "External Marks",
    minWidth: 120,
    valueGetter: (p) =>
      examValue(p.data ?? {}, [
        "externalMarks",
        "external_marks",
        "extMarks",
        "ext_marks",
      ]),
  },
  {
    headerName: "Credits",
    minWidth: 90,
    valueGetter: (p) =>
      examValue(p.data ?? {}, ["credits", "credit", "subjectCredits"]),
  },
];

export function ExamResultsTab({ student }: { readonly student: AnyRow }) {
  const [semesters, setSemesters] = useState<StudentCurriculumSemester[]>([]);
  const [activeSem, setActiveSem] = useState("");
  const [rows, setRows] = useState<AnyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [semLoading, setSemLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const shell = await loadStudentExamResultsShell(student);
        if (cancelled) return;
        setSemesters(shell.semesters);
        if (shell.semesters[0])
          setActiveSem(String(shell.semesters[0].courseYearId));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [student]);

  useEffect(() => {
    const cyId = Number(activeSem);
    if (!cyId) return;
    let cancelled = false;
    void (async () => {
      setSemLoading(true);
      try {
        const data = await loadStudentExamResultsForSemester(student, cyId);
        if (!cancelled) setRows(data);
      } finally {
        if (!cancelled) setSemLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [student, activeSem]);

  const columnDefs = useMemo(() => EXAM_RESULT_COLS, []);

  const resultLabel = useMemo(() => {
    if (!rows.length) return "";
    return pickProfileCell(rows[0], [
      "result",
      "examResult",
      "exam_result",
      "overallResult",
      "overall_result",
    ]);
  }, [rows]);

  if (loading) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
    );
  }

  if (!semesters.length) {
    return (
      <div className="space-y-3">
        <p className="text-base font-medium text-[#0c51a4]">
          Semwise Exam Results
        </p>
        <p className="py-6 text-center text-sm font-medium text-destructive">
          No Results are found.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-md border-2 border-[#B2EBF2] p-2">
      <p className="text-base font-medium text-[#0c51a4]">
        Semwise Exam Results
      </p>
      <Tabs value={activeSem} onValueChange={setActiveSem}>
        <div className="overflow-x-auto rounded-sm border border-[#ffcf46]">
          <TabsList className="h-auto min-w-max justify-start rounded-none bg-transparent p-0">
            {semesters.map((sem) => (
              <TabsTrigger
                key={sem.courseYearId}
                value={String(sem.courseYearId)}
                className={SEM_TAB_CLASS}
              >
                {sem.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        {semesters.map((sem) => (
          <TabsContent
            key={sem.courseYearId}
            value={String(sem.courseYearId)}
            className="mt-3 p-2"
          >
            {activeSem === String(sem.courseYearId) ? (
              <div className="space-y-2">
                <DataTable
                  title=""
                  subtitle=""
                  rowData={rows}
                  columnDefs={columnDefs}
                  loading={semLoading}
                  pagination
                  toolbar={SEARCH_ONLY_TOOLBAR}
                />
                {rows.length > 0 && (
                  <p className="px-2 text-right text-xs font-semibold text-[#0c51a4]">
                    RESULT :{" "}
                    {resultLabel && resultLabel !== "—" ? resultLabel : ""}
                  </p>
                )}
              </div>
            ) : null}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
