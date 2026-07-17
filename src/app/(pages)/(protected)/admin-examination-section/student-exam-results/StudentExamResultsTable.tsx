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
  "rounded-none border-b-2 border-transparent px-3 py-2 text-[11px] whitespace-nowrap data-[state=active]:border-[#52a9ff75] data-[state=active]:bg-[#52a9ff38] data-[state=active]:font-semibold data-[state=active]:text-foreground data-[state=active]:shadow-none";

function cellValue(row: AnyRow | undefined, keys: string[]): string {
  if (!row) return "—";
  const value = pickProfileCell(row, keys);
  return value && value !== "—" ? value : "—";
}

const COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<AnyRow>,
  subjectCode: {
    headerName: "Subject Code",
    minWidth: 130,
    flex: 1,
    valueGetter: (p) => cellValue(p.data, ["subjectCode", "subject_code"]),
  } as ColDef<AnyRow>,
  subjectName: {
    headerName: "Subject Name",
    minWidth: 220,
    flex: 1.5,
    valueGetter: (p) =>
      cellValue(p.data, ["subjectName", "subject_name", "shortName"]),
  } as ColDef<AnyRow>,
  monthYear: {
    headerName: "Month Year",
    minWidth: 130,
    flex: 1,
    cellClass: "text-center",
    valueGetter: (p) =>
      cellValue(p.data, ["examMonthYr", "exam_month_yr", "monthYear"]),
  } as ColDef<AnyRow>,
  finalGrade: {
    headerName: "Final Grade",
    minWidth: 110,
    flex: 0.8,
    cellClass: "text-center",
    valueGetter: (p) =>
      cellValue(p.data, ["grade", "finalGrade", "final_grade"]),
  } as ColDef<AnyRow>,
  credits: {
    headerName: "Credits",
    minWidth: 90,
    flex: 0.7,
    cellClass: "text-center",
    valueGetter: (p) => cellValue(p.data, ["credits", "credit"]),
  } as ColDef<AnyRow>,
  status: {
    headerName: "Status",
    minWidth: 100,
    flex: 0.8,
    cellClass: "text-center",
    valueGetter: (p) =>
      cellValue(p.data, ["subjectResult", "subject_result", "resultStatus"]),
  } as ColDef<AnyRow>,
};

function ResultsSummary({ rows }: { readonly rows: AnyRow[] }) {
  const summary = rows[0] ?? {};
  return (
    <div className="flex flex-wrap items-center justify-end gap-x-6 gap-y-1 px-2 py-2 text-sm font-semibold text-[#0c51a4]">
      <span>
        SGPA : {cellValue(summary, ["sgpa", "semesterGpa", "sem_gpa"])}
      </span>
      <span>
        CGPA : {cellValue(summary, ["cgpa", "cumulativeGpa", "cum_gpa"])}
      </span>
      <span>
        RESULT :{" "}
        {cellValue(summary, [
          "result",
          "examResult",
          "exam_result",
          "overallResult",
        ])}
      </span>
    </div>
  );
}

function ResultsTable({
  rows,
  loading,
}: {
  readonly rows: AnyRow[];
  readonly loading: boolean;
}) {
  const columnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.subjectCode,
      COL_DEFS.subjectName,
      COL_DEFS.monthYear,
      COL_DEFS.finalGrade,
      COL_DEFS.credits,
      COL_DEFS.status,
    ],
    [],
  );

  if (!loading && rows.length === 0) {
    return (
      <p className="py-6 text-center text-sm font-medium text-destructive">
        No Results are found.
      </p>
    );
  }

  return (
    <div className="space-y-1">
      <DataTable
        title=""
        subtitle=""
        rowData={rows}
        columnDefs={columnDefs}
        loading={loading}
        bordered={false}
        height="auto"
        pagination
        toolbar={{
          search: true,
          searchPlaceholder: "Search subjects…",
        }}
        getRowId={(p) => {
          const code = cellValue(p.data, ["subjectCode", "subject_code"]);
          const name = cellValue(p.data, [
            "subjectName",
            "subject_name",
            "shortName",
          ]);
          const month = cellValue(p.data, [
            "examMonthYr",
            "exam_month_yr",
            "monthYear",
          ]);
          return `${code}|${name}|${month}|${p.data?.subjectId ?? ""}`;
        }}
      />
      {!loading && rows.length > 0 ? <ResultsSummary rows={rows} /> : null}
    </div>
  );
}

export function StudentExamResultsTable({
  student,
}: {
  readonly student: AnyRow;
}) {
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
        if (shell.semesters[0]) {
          setActiveSem(String(shell.semesters[0].courseYearId));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [student]);

  useEffect(() => {
    const courseYearId = Number(activeSem);
    if (!courseYearId) return;
    let cancelled = false;
    void (async () => {
      setSemLoading(true);
      try {
        const data = await loadStudentExamResultsForSemester(
          student,
          courseYearId,
        );
        if (!cancelled) setRows(data);
      } finally {
        if (!cancelled) setSemLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [student, activeSem]);

  if (loading) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Loading exam results…
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-sm border border-[#52a9ff75] bg-[#52a9ff75] px-3 py-2 text-sm font-medium text-foreground">
        Semwise Final Marks
      </div>

      {!semesters.length ? (
        <p className="py-6 text-center text-sm font-medium text-destructive">
          No Results are found.
        </p>
      ) : (
        <div className="rounded-md border-2 border-[#B2EBF2] p-2">
          <Tabs value={activeSem} onValueChange={setActiveSem}>
            <div className="overflow-x-auto rounded-sm border border-[#52a9ff75]">
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
                  <ResultsTable rows={rows} loading={semLoading} />
                ) : null}
              </TabsContent>
            ))}
          </Tabs>
        </div>
      )}
    </div>
  );
}
