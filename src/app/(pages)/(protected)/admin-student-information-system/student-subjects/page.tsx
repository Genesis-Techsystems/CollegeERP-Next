"use client";

import { useCallback, useMemo, useState } from "react";
import type { ColDef } from "ag-grid-community";
import { DataTable } from "@/common/components/table";
import { FilteredPage } from "@/components/layout";
import { StudentSearchSelect } from "@/common/components/student-search";
import { rowIndexGetter } from "@/lib/utils";
import { toastError } from "@/lib/toast";
import {
  listStudentSubjectsForStudent,
  searchStudentsByKeyword,
} from "@/services";

type AnyRow = Record<string, any>;

const SEARCH_ONLY_TOOLBAR = {
  search: true,
  searchPlaceholder: "Search...",
  columnPicker: false,
  exportPdf: false,
  exportExcel: false,
  columnFilters: false,
} as const;

function pickNum(row: AnyRow | null | undefined, keys: string[]): number {
  if (!row) return 0;
  for (const k of keys) {
    const n = Number(row[k] ?? 0);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

function pickText(row: AnyRow | null | undefined, keys: string[]): string {
  if (!row) return "";
  for (const k of keys) {
    const v = row[k];
    if (v != null && String(v).trim() !== "") return String(v);
  }
  return "";
}

const SUBJECT_COLS: ColDef<AnyRow>[] = [
  { headerName: "Sl.No", valueGetter: rowIndexGetter, width: 70, flex: 0 },
  {
    headerName: "Subject Code",
    minWidth: 130,
    valueGetter: (p) =>
      pickText(p.data, ["subjectCode", "subject_code"]) || "—",
  },
  {
    headerName: "Subject Name",
    minWidth: 200,
    valueGetter: (p) =>
      pickText(p.data, ["subjectName", "subject_name"]) || "—",
  },
  {
    headerName: "Subject Type",
    minWidth: 130,
    valueGetter: (p) =>
      pickText(p.data, [
        "subjectTypeName",
        "subjectType",
        "subject_type_name",
      ]) || "—",
  },
  {
    headerName: "Regulation",
    minWidth: 140,
    valueGetter: (p) =>
      pickText(p.data, [
        "regulationName",
        "regulationCode",
        "regulation_name",
      ]) || "—",
  },
];

export default function StudentSubjectsPage() {
  const [loadingStudentSearch, setLoadingStudentSearch] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(false);

  const [studentOptionsRows, setStudentOptionsRows] = useState<AnyRow[]>([]);
  const [studentId, setStudentId] = useState<number | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<AnyRow | null>(null);
  const [subjects, setSubjects] = useState<AnyRow[]>([]);

  const loadStudentSubjects = useCallback(async (row: AnyRow) => {
    const sid = pickNum(row, ["studentId", "fk_student_id", "student_id"]);
    const cid = pickNum(row, ["collegeId", "fk_college_id"]);
    const ayid = pickNum(row, ["academicYearId", "fk_academic_year_id"]);
    const cyid = pickNum(row, ["courseYearId", "fk_course_year_id"]);
    const sectionId = pickNum(row, [
      "groupSectionId",
      "fk_group_section_id",
      "group_section_id",
    ]);

    if (!sectionId) {
      toastError(
        new Error("Section missing"),
        "This student is not assigned to any section.",
      );
      setSubjects([]);
      return;
    }
    if (!sid || !cid || !ayid || !cyid) {
      toastError(
        new Error("Incomplete student record"),
        "Unable to resolve student subject keys.",
      );
      setSubjects([]);
      return;
    }

    setLoadingSubjects(true);
    try {
      const rows = await listStudentSubjectsForStudent({
        collegeId: cid,
        academicYearId: ayid,
        studentId: sid,
        courseYearId: cyid,
      });
      setSubjects(Array.isArray(rows) ? rows : []);
    } catch (e) {
      setSubjects([]);
      toastError(e, "Failed to load student subjects");
    } finally {
      setLoadingSubjects(false);
    }
  }, []);

  async function searchStudents(term: string) {
    const q = term.trim();
    if (q.length === 0) {
      setStudentOptionsRows([]);
      return;
    }
    if (q.length < 5) return;

    setLoadingStudentSearch(true);
    try {
      const rows = await searchStudentsByKeyword(q);
      setStudentOptionsRows(Array.isArray(rows) ? rows : []);
    } catch (e) {
      setStudentOptionsRows([]);
      toastError(e, "Student search failed");
    } finally {
      setLoadingStudentSearch(false);
    }
  }

  async function onStudentSelect(nextId: number | null, row: AnyRow | null) {
    setStudentId(nextId);
    setSubjects([]);
    if (!nextId || !row) {
      setSelectedStudent(null);
      return;
    }
    setSelectedStudent(row);
    await loadStudentSubjects(row);
  }

  const contextLine = selectedStudent
    ? [
        pickText(selectedStudent, ["collegeCode", "college_code"]),
        pickText(selectedStudent, ["academicYear", "academic_year"]),
        pickText(selectedStudent, ["courseCode", "course_code"]),
        pickText(selectedStudent, ["groupCode", "group_code"]),
        pickText(selectedStudent, ["courseYearName", "course_year_name"]),
        pickText(selectedStudent, [
          "section",
          "sectionName",
          "group_section_name",
        ]),
      ]
        .filter(Boolean)
        .join(" | ")
    : "";

  const columnDefs = useMemo(() => SUBJECT_COLS, []);

  return (
    <FilteredPage
      title="Student Subjects"
      filters={
        <StudentSearchSelect
          label="Student"
          placeholder="Search student"
          value={studentId}
          students={studentOptionsRows}
          selectedStudent={selectedStudent}
          isLoading={loadingStudentSearch}
          onSearch={(term) => void searchStudents(term)}
          onChange={(id, row) => void onStudentSelect(id, row)}
        />
      }
    >
      {selectedStudent ? (
        <div className="space-y-2">
          {contextLine ? (
            <p className="text-[12px] font-semibold leading-snug text-[#1a5fb4]">
              {contextLine}
            </p>
          ) : null}
          <DataTable
            title=""
            subtitle=""
            rowData={subjects}
            columnDefs={columnDefs}
            loading={loadingSubjects}
            pagination
            toolbar={SEARCH_ONLY_TOOLBAR}
          />
        </div>
      ) : null}
    </FilteredPage>
  );
}
