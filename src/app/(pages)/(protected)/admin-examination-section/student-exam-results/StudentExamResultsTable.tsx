"use client";

import { useEffect, useMemo, useState } from "react";
import type { ColDef } from "ag-grid-community";
import { Monitor } from "lucide-react";
import { DataTable } from "@/common/components/table";
import { PageContainer } from "@/components/layout";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { rowIndexGetter } from "@/lib/utils";
import {
  loadStudentExamResultsForSemester,
  loadStudentExamResultsShell,
  pickProfileCell,
  type StudentCurriculumSemester,
} from "@/services";
import { StudentExamResultsHeader } from "./StudentExamResultsHeader";

type AnyRow = Record<string, unknown>;

const SEM_TAB_CLASS =
  "h-9 min-w-[110px] rounded-none border-0 border-r border-[#d7e1ed] px-4 text-[12px] font-normal text-[#666] shadow-none last:border-r-0 data-[state=active]:bg-[#ffcf46] data-[state=active]:font-medium data-[state=active]:text-[#111] data-[state=active]:shadow-none";

function cellValue(row: AnyRow | undefined, keys: string[]): string {
  if (!row) return "—";
  const value = pickProfileCell(row, keys);
  return value && value !== "—" ? value : "—";
}

const COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 50,
    flex: 0,
  } as ColDef<AnyRow>,
  subjectCode: {
    headerName: "Subject Code",
    width: 130,
    flex: 0,
    valueGetter: (p) => cellValue(p.data, ["subjectCode", "subject_code"]),
  } as ColDef<AnyRow>,
  subjectName: {
    headerName: "Subject Name",
    width: 280,
    flex: 0,
    valueGetter: (p) =>
      cellValue(p.data, ["subjectName", "subject_name", "shortName"]),
  } as ColDef<AnyRow>,
  monthYear: {
    headerName: "Month Year",
    width: 110,
    flex: 0,
    cellClass: "text-center",
    valueGetter: (p) =>
      cellValue(p.data, ["examMonthYr", "exam_month_yr", "monthYear"]),
  } as ColDef<AnyRow>,
  finalGrade: {
    headerName: "Final Grade",
    width: 90,
    flex: 0,
    cellClass: "text-center",
    valueGetter: (p) =>
      cellValue(p.data, ["grade", "finalGrade", "final_grade"]),
  } as ColDef<AnyRow>,
  credits: {
    headerName: "Credits",
    width: 70,
    flex: 0,
    cellClass: "text-center",
    valueGetter: (p) => cellValue(p.data, ["credits", "credit"]),
  } as ColDef<AnyRow>,
  status: {
    headerName: "Status",
    width: 80,
    flex: 0,
    cellClass: "text-center",
    valueGetter: (p) =>
      cellValue(p.data, ["subjectResult", "subject_result", "resultStatus"]),
  } as ColDef<AnyRow>,
};

/** Column width ratios — keep footer aligned with AG Grid when fitColumnsToWidth is on. */
const FOOTER_GRID_COLS = "50fr 130fr 280fr 110fr 90fr 70fr 80fr";

function ResultsSummary({ rows }: { readonly rows: AnyRow[] }) {
  const summary = rows[0] ?? {};
  return (
    <div
      className="grid w-full border-t border-[#d7e1ed] text-xs font-semibold text-[#0c51a4]"
      style={{ gridTemplateColumns: FOOTER_GRID_COLS }}
    >
      <div aria-hidden />
      <div aria-hidden />
      <div aria-hidden />
      <div aria-hidden />
      <div className="px-2 py-2 text-center">
        SGPA : {cellValue(summary, ["sgpa", "semesterGpa", "sem_gpa"])}
      </div>
      <div className="px-2 py-2 text-center">
        CGPA : {cellValue(summary, ["cgpa", "cumulativeGpa", "cum_gpa"])}
      </div>
      <div className="px-2 py-2 text-center">
        RESULT :{" "}
        {cellValue(summary, [
          "result",
          "examResult",
          "exam_result",
          "overallResult",
        ])}
      </div>
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

  const tableLoading = loading || semLoading;
  const showEmptyMessage =
    !tableLoading && (semesters.length === 0 || rows.length === 0);

  return (
    <PageContainer className="space-y-2 bg-white">
      <div className="flex h-9 items-center gap-2 border-b-2 border-[#ffcf46] px-1 text-[15px] font-medium text-[#111]">
        <Monitor className="h-5 w-5" strokeWidth={2} aria-hidden />
        <h1>Exam Results</h1>
      </div>

      <StudentExamResultsHeader student={student} />

      <section className="overflow-hidden rounded-[4px] border border-[#a9e4e7] bg-white p-2">
        <div className="-mx-2 -mt-2 mb-2 border-b-2 border-[#ffcf46] bg-white">
          <div className="inline-flex min-h-8 items-center bg-[#ffcf46] px-5 text-[12px] font-medium text-[#111]">
            Semwise Final Marks
          </div>
        </div>

        {semesters.length > 0 ? (
          <Tabs value={activeSem} onValueChange={setActiveSem}>
            <div className="overflow-x-auto rounded-[3px] border border-[#d7e1ed]">
              <TabsList className="flex h-9 w-full justify-start rounded-none bg-white p-0">
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
          </Tabs>
        ) : null}

        {showEmptyMessage ? (
          <p className="px-2 py-6 text-sm font-medium text-destructive">
            No Results are found.
          </p>
        ) : (
          <div className="mt-2 max-w-full overflow-x-auto [&_.ag-cell]:!text-[12px] [&_.ag-header-cell-text]:!text-[12px]">
            <DataTable
              bordered={false}
              rowData={rows}
              columnDefs={columnDefs}
              loading={tableLoading}
              pagination={false}
              toolbar={false}
              columnFilters={false}
              fitColumnsToWidth={true}
              autoHeight
              rowHeight={28}
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
              afterGrid={<ResultsSummary rows={rows} />}
            />
          </div>
        )}
      </section>
    </PageContainer>
  );
}
