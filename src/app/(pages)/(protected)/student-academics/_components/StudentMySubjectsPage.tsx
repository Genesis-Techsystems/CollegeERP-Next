"use client";

/**
 * Angular `student-academics/my-subjects` → `StudentMySubjectsComponent`.
 * Student portal: session/localStorage studentId → studentdetail → StudentSubject list.
 * Reuses fetchStudentDetail / listStudentSubjectsForStudent (no new APIs).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColDef } from "ag-grid-community";
import { FilteredListPage } from "@/components/layout";
import { useSession } from "@/hooks/useSession";
import { rowIndexGetter } from "@/lib/utils";
import { toastError, toastInfo } from "@/lib/toast";
import {
  fetchStudentDetail,
  fetchStudentDetailByUserId,
  listStudentSubjectsForStudent,
} from "@/services";

type AnyRow = Record<string, unknown>;

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

/** Angular template header: college | year | course | group | course year | section */
function buildContextLine(student: AnyRow | null): string {
  if (!student) return "";
  return [
    txt(student, ["collegeCode", "college_code"]),
    txt(student, ["academicYear", "academicYearName", "academic_year"]),
    txt(student, ["courseName", "course_name", "groupName"]),
    txt(student, ["courseGroupName", "groupCode", "courseGroupCode", "group_code"]),
    txt(student, ["courseYearName", "fromCourseYearName", "course_year_name"]),
    (() => {
      const section = txt(student, [
        "section",
        "sectionName",
        "groupSectionName",
      ]);
      return section ? `Section - ${section}` : "";
    })(),
  ]
    .filter(Boolean)
    .join(" | ");
}

const COL_DEFS = {
  siNo: {
    headerName: "No.",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<AnyRow>,
  subjectCode: {
    field: "subjectCode",
    headerName: "Subject Code",
    minWidth: 130,
    valueGetter: (p) =>
      txt(p.data, ["subjectCode", "subject_code"]) || "—",
  } as ColDef<AnyRow>,
  subjectName: {
    field: "subjectName",
    headerName: "Subject Name",
    minWidth: 200,
    valueGetter: (p) =>
      txt(p.data, ["subjectName", "subject_name"]) || "—",
  } as ColDef<AnyRow>,
  subjectTypeCode: {
    field: "subjectTypeCode",
    headerName: "Subject Type",
    minWidth: 130,
    valueGetter: (p) =>
      txt(p.data, [
        "subjectTypeCode",
        "subjectTypeName",
        "subjectType",
        "subject_type_code",
        "subject_type_name",
      ]) || "—",
  } as ColDef<AnyRow>,
  subCredits: {
    field: "subCredits",
    headerName: "Credits",
    minWidth: 100,
    valueGetter: (p) => {
      const v = txt(p.data, ["subCredits", "credits", "sub_credits"]);
      return v || "—";
    },
  } as ColDef<AnyRow>,
  regulationName: {
    field: "regulationName",
    headerName: "Regulation",
    minWidth: 140,
    valueGetter: (p) =>
      txt(p.data, [
        "regulationName",
        "regulationCode",
        "regulation_name",
      ]) || "—",
  } as ColDef<AnyRow>,
};

export function StudentMySubjectsPage() {
  const { user, isLoading: sessionLoading } = useSession();
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<AnyRow | null>(null);
  const [subjects, setSubjects] = useState<AnyRow[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setSubjects([]);
    try {
      // Angular: localStorage.studentId → getStudentDetails → selectedStudent
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

      if (!detail) {
        toastInfo("Could not load your student profile.");
        setStudent(null);
        return;
      }

      setStudent(detail);

      const collegeId = num(detail, ["collegeId", "fk_college_id"]);
      const academicYearId = num(detail, [
        "academicYearId",
        "fk_academic_year_id",
      ]);
      const sid = num(detail, ["studentId", "fk_student_id", "student_id"]);
      const courseYearId = num(detail, [
        "courseYearId",
        "fk_course_year_id",
      ]);

      if (!collegeId || !academicYearId || !sid || !courseYearId) {
        toastInfo("Student academic details are incomplete for subjects.");
        return;
      }

      // Angular listDetailsByFiveIds(StudentSubject, …, isActive==true)
      const rows = await listStudentSubjectsForStudent({
        collegeId,
        academicYearId,
        studentId: sid,
        courseYearId,
      });
      setSubjects(Array.isArray(rows) ? rows : []);
    } catch (e) {
      toastError(e, "Failed to load subjects");
      setStudent(null);
      setSubjects([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (sessionLoading) return;
    void load();
  }, [sessionLoading, load]);

  const contextLine = useMemo(() => buildContextLine(student), [student]);

  const columnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.subjectCode,
      COL_DEFS.subjectName,
      COL_DEFS.subjectTypeCode,
      COL_DEFS.subCredits,
      COL_DEFS.regulationName,
    ],
    [],
  );

  const busy = sessionLoading || loading;

  return (
    <FilteredListPage
      title="Subjects List"
      filters={
        contextLine ? (
          <p className="text-[12px] font-semibold leading-snug text-[#1a5fb4]">
            {contextLine}
          </p>
        ) : busy ? (
          <p className="text-sm text-muted-foreground">Loading student…</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Student profile not available.
          </p>
        )
      }
      filtersCollapsible={false}
      columnDefs={columnDefs}
      rowData={student ? subjects : []}
      loading={busy && Boolean(student)}
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
