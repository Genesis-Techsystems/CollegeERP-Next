"use client";

import { useEffect, useState } from "react";
import type { ColDef } from "ag-grid-community";
import { StatusBadge } from "@/common/components/data-display";
import { EmptyState } from "@/common/components/feedback";
import { DataTable } from "@/common/components/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { rowIndexGetter } from "@/lib/utils";
import {
  loadStudentCurriculumSemester,
  loadStudentCurriculumShell,
  pickProfileCell,
  type StudentCurriculumSemester,
} from "@/services";
import { formatProfileDate } from "./profile-utils";

type AnyRow = Record<string, any>;

const SEM_TAB_CLASS =
  "rounded-none border-b-2 border-transparent px-3 py-2 text-[11px] whitespace-nowrap data-[state=active]:border-[#ffcf46] data-[state=active]:bg-[#ffcf46]/30 data-[state=active]:text-primary data-[state=active]:shadow-none";

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-md border border-border">
      <div className="border-b border-sky-200/80 bg-sky-50/80 px-3 py-2">
        <h3 className="text-xs font-semibold text-primary">{title}</h3>
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}

function col(
  headerName: string,
  keys: string[],
  width?: number,
  minWidth?: number,
  renderer?: (row: AnyRow) => React.ReactNode,
): ColDef<AnyRow> {
  return {
    headerName,
    width,
    minWidth,
    valueGetter: (p) =>
      renderer ? "" : pickProfileCell(p.data ?? {}, keys) || "—",
    cellRenderer: renderer ? (p: any) => renderer(p.data ?? {}) : undefined,
  };
}

function studentStatusCell(row: AnyRow) {
  const code = pickProfileCell(row, [
    "studentStatusCode",
    "student_status_code",
    "statusCode",
  ]).toUpperCase();
  const label =
    pickProfileCell(row, [
      "studentStatusDisplayName",
      "studentStatusName",
      "student_status",
      "statusName",
    ]) ||
    code ||
    "—";
  if (!label || label === "—") return "—";
  let variant: "active" | "inactive" | "pending" | "published" = "inactive";
  if (code === "INCOLLEGE" || code === "IN COLLEGE") variant = "active";
  else if (code === "PASSEDOUT" || code === "PASSED OUT") variant = "published";
  else if (code.includes("DETAIN")) variant = "pending";
  return <StatusBadge status={variant} label={label} />;
}

const SI_NO_COL: ColDef<AnyRow> = {
  headerName: "Sl.No",
  valueGetter: rowIndexGetter,
  width: 70,
  flex: 0,
};

const SUBJECT_COLS: ColDef<AnyRow>[] = [
  SI_NO_COL,
  col(
    "Academic Year",
    ["academicYear", "academic_year", "academicYearName"],
    140,
    140,
  ),
  col("Subject Code", ["subjectCode", "subject_code"], 140, 130),
  col(
    "Subject Name",
    ["subjectName", "subject_name", "shortName", "subjectShortName"],
    undefined,
    180,
  ),
  col("Subject Type", [], undefined, 140, (row) => {
    const typeName =
      pickProfileCell(row, ["subjecttypeName", "subject_type_name"]) ||
      pickProfileCell(row, [
        "subjectTypeName",
        "subject_type_name",
        "subjectTypeCode",
        "subject_type_code",
      ]);
    return typeName || "—";
  }),
];

const ELECTIVE_COLS: ColDef<AnyRow>[] = [
  SI_NO_COL,
  col(
    "Elective Group",
    [
      "electiveGroupName",
      "elective_group_name",
      "electiveGroupCode",
      "groupName",
    ],
    undefined,
    170,
  ),
  col(
    "Subject",
    [
      "electiveName",
      "elective_name",
      "subjectName",
      "subject_name",
      "subjectCode",
      "subject_code",
    ],
    undefined,
    170,
  ),
  col("From Date", [], 120, 120, (row) =>
    formatProfileDate(row.fromDate ?? row.from_date ?? row.effectiveFrom),
  ),
  col("To Date", [], 120, 120, (row) =>
    formatProfileDate(row.toDate ?? row.to_date ?? row.effectiveTo),
  ),
];

const LAB_COLS: ColDef<AnyRow>[] = [
  SI_NO_COL,
  col(
    "Course",
    [
      "displayName",
      "display_name",
      "courseName",
      "course_name",
      "courseCode",
      "course_code",
      "subjectName",
      "subjectCode",
    ],
    undefined,
    150,
  ),
  col(
    "Batch",
    [
      "studentBatchName",
      "batchName",
      "batch_name",
      "labBatchName",
      "batchCode",
      "batch",
    ],
    undefined,
    120,
  ),
  col("From Date", [], 120, 120, (row) =>
    formatProfileDate(row.fromDate ?? row.from_date ?? row.startDate),
  ),
  col("To Date", [], 120, 120, (row) =>
    formatProfileDate(row.toDate ?? row.to_date ?? row.endDate),
  ),
];

const ACADEMIC_COLS: ColDef<AnyRow>[] = [
  SI_NO_COL,
  col(
    "Academic Year",
    ["academicYear", "academic_year", "academicYearName"],
    undefined,
    130,
  ),
  col(
    "From Course Year",
    [
      "fromCourseYearName",
      "from_course_year_name",
      "fromCourseYear",
      "courseYearName",
    ],
    undefined,
    140,
  ),
  col(
    "From Section",
    [
      "fromSection",
      "fromSectionName",
      "from_group_section",
      "fromGroupSectionName",
      "section",
    ],
    undefined,
    120,
  ),
  col(
    "To Course Year",
    ["toCourseYearName", "to_course_year_name", "toCourseYear"],
    undefined,
    130,
  ),
  col(
    "To Section",
    ["toSection", "toSectionName", "to_group_section", "toGroupSectionName"],
    undefined,
    120,
  ),
  col("From Date", [], 120, 120, (row) =>
    formatProfileDate(row.fromDate ?? row.from_date),
  ),
  col("To Date", [], 120, 120, (row) =>
    formatProfileDate(row.toDate ?? row.to_date),
  ),
  col("Student Status", [], undefined, 140, (row) => studentStatusCell(row)),
];

export function CurriculumTab({ student }: { student: AnyRow }) {
  const [semesters, setSemesters] = useState<StudentCurriculumSemester[]>([]);
  const [academicDetails, setAcademicDetails] = useState<AnyRow[]>([]);
  const [activeSem, setActiveSem] = useState<string>("");
  const [subjects, setSubjects] = useState<AnyRow[]>([]);
  const [electives, setElectives] = useState<AnyRow[]>([]);
  const [labBatches, setLabBatches] = useState<AnyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [semLoading, setSemLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const shell = await loadStudentCurriculumShell(student);
        if (cancelled) return;
        setSemesters(shell.semesters);
        setAcademicDetails(shell.academicDetails);
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
    const sem = semesters.find((s) => s.courseYearId === cyId);
    let cancelled = false;
    void (async () => {
      setSemLoading(true);
      try {
        const payload = await loadStudentCurriculumSemester(
          student,
          cyId,
          academicDetails,
          sem?.label,
        );
        if (cancelled) return;
        setSubjects(payload.subjects);
        setElectives(payload.electives);
        setLabBatches(payload.labBatches);
      } finally {
        if (!cancelled) setSemLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [student, activeSem, academicDetails, semesters]);

  if (loading)
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Loading curriculum…
      </p>
    );
  if (!semesters.length)
    return <EmptyState title="No curriculum data found." />;

  return (
    <div className="space-y-4">
      <SectionCard title="Student Semester Wise Subjects">
        <Tabs value={activeSem} onValueChange={setActiveSem}>
          <TabsList className="mb-4 h-auto w-full justify-start overflow-x-auto rounded-none border border-[#ffcf46] bg-transparent p-0">
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
        </Tabs>

        <div className="flex flex-col gap-4 ">
          <div className="lg:col-span-2">
            <DataTable
              title=""
              subtitle=""
              rowData={subjects}
              columnDefs={SUBJECT_COLS}
              loading={semLoading}
              pagination={false}
              toolbar={{
                search: true,
                searchPlaceholder: "Search...",
                columnPicker: false,
                exportPdf: false,
                exportExcel: false,
                columnFilters: false,
              }}
            />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Elective Group
              </p>
              <DataTable
                title=""
                subtitle=""
                rowData={electives}
                columnDefs={ELECTIVE_COLS}
                loading={semLoading}
                pagination={false}
                toolbar={{
                  search: true,
                  searchPlaceholder: "Search...",
                  columnPicker: false,
                  exportPdf: false,
                  exportExcel: false,
                  columnFilters: false,
                }}
              />
            </div>
            <div className="flex-1">
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Lab Batches
              </p>
              <DataTable
                title=""
                subtitle=""
                rowData={labBatches}
                columnDefs={LAB_COLS}
                loading={semLoading}
                pagination={false}
                toolbar={{
                  search: true,
                  searchPlaceholder: "Search...",
                  columnPicker: false,
                  exportPdf: false,
                  exportExcel: false,
                  columnFilters: false,
                }}
              />
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Student Academic Details">
        <DataTable
          title=""
          subtitle=""
          rowData={academicDetails}
          columnDefs={ACADEMIC_COLS}
          loading={loading}
          pagination={false}
          toolbar={{
            search: true,
            searchPlaceholder: "Search...",
            columnPicker: false,
            exportPdf: false,
            exportExcel: false,
            columnFilters: false,
          }}
        />
      </SectionCard>
    </div>
  );
}
