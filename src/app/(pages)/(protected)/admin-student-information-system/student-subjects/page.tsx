"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/layout";
import { Select } from "@/common/components/select";
import { Button } from "@/components/ui/button";
import { toastError } from "@/lib/toast";
import {
  listStudentSubjectsForStudent,
  searchStudentsByKeyword,
} from "@/services";
import { StudentSearchSelect } from "@/common/components/student-search";

type AnyRow = Record<string, any>;

const PAGE_SIZES = ["5", "10", "25"];

const COLORS = {
  contextBlue: "#1a5fb4",
  headerBg: "#eef6ff",
  border: "#dee2e6",
  accentYellow: "#ffc107",
  navy: "#003366",
  muted: "#6c757d",
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

function StudentSubjectsResultTable({
  subjects,
  loading,
}: {
  subjects: AnyRow[];
  loading: boolean;
}) {
  const [pageSize, setPageSize] = useState("5");
  const [pageIndex, setPageIndex] = useState(0);

  useEffect(() => {
    setPageIndex(0);
  }, [subjects]);

  const size = Number(pageSize) || 5;
  const total = subjects.length;
  const totalPages = Math.max(1, Math.ceil(total / size));
  const safePage = Math.min(pageIndex, totalPages - 1);
  const pageRows = subjects.slice(safePage * size, safePage * size + size);
  const rangeStart = total === 0 ? 0 : safePage * size + 1;
  const rangeEnd = Math.min(total, (safePage + 1) * size);

  const thClass = "border px-2 py-1 text-left text-[12px] font-bold";
  const tdClass = "border px-2 py-1 text-[12px] text-[#333333]";

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[12px]">
          <thead>
            <tr style={{ backgroundColor: COLORS.headerBg }}>
              <th
                className={thClass}
                style={{ borderColor: COLORS.border, color: COLORS.navy }}
              >
                Sl.No
              </th>
              <th
                className={thClass}
                style={{ borderColor: COLORS.border, color: COLORS.navy }}
              >
                Subject Code
              </th>
              <th
                className={thClass}
                style={{ borderColor: COLORS.border, color: COLORS.navy }}
              >
                Subject Name
              </th>
              <th
                className={thClass}
                style={{ borderColor: COLORS.border, color: COLORS.navy }}
              >
                Subject Type
              </th>
              <th
                className={thClass}
                style={{ borderColor: COLORS.border, color: COLORS.navy }}
              >
                Regulation
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr className="bg-white">
                <td
                  className={tdClass}
                  colSpan={5}
                  style={{ borderColor: COLORS.border, color: COLORS.muted }}
                >
                  Loading subjects…
                </td>
              </tr>
            ) : pageRows.length === 0 ? (
              <tr className="bg-white">
                <td
                  className={tdClass}
                  colSpan={5}
                  style={{ borderColor: COLORS.border, color: COLORS.muted }}
                >
                  No subjects found.
                </td>
              </tr>
            ) : (
              pageRows.map((row, index) => (
                <tr
                  key={`subject-${safePage * size + index}`}
                  className="bg-white"
                >
                  <td
                    className={tdClass}
                    style={{ borderColor: COLORS.border }}
                  >
                    {safePage * size + index + 1}
                  </td>
                  <td
                    className={tdClass}
                    style={{ borderColor: COLORS.border }}
                  >
                    {pickText(row, ["subjectCode", "subject_code"]) || "—"}
                  </td>
                  <td
                    className={tdClass}
                    style={{ borderColor: COLORS.border }}
                  >
                    {pickText(row, ["subjectName", "subject_name"]) || "—"}
                  </td>
                  <td
                    className={tdClass}
                    style={{ borderColor: COLORS.border }}
                  >
                    {pickText(row, [
                      "subjectTypeName",
                      "subjectType",
                      "subject_type_name",
                    ]) || "—"}
                  </td>
                  <td
                    className={tdClass}
                    style={{ borderColor: COLORS.border }}
                  >
                    {pickText(row, [
                      "regulationName",
                      "regulationCode",
                      "regulation_name",
                    ]) || "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div
        className="flex flex-wrap items-center justify-end gap-3 border-t bg-white px-4 py-2 text-[11px]"
        style={{ borderColor: COLORS.border, color: COLORS.muted }}
      >
        <div className="flex items-center gap-2">
          <span>Items per page:</span>
          <Select
            value={pageSize}
            onChange={(v) => {
              setPageSize(v ?? "5");
              setPageIndex(0);
            }}
            options={PAGE_SIZES.map((n) => ({ value: n, label: n }))}
            className="w-[72px] [&_button[role='combobox']]:h-7 [&_button[role='combobox']]:border-[#dee2e6] [&_button[role='combobox']]:text-[11px]"
          />
        </div>
        <span>
          {rangeStart} – {rangeEnd} of {total}
        </span>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-[#6c757d] hover:text-foreground"
            disabled={safePage <= 0}
            onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-[#6c757d] hover:text-foreground"
            disabled={safePage >= totalPages - 1}
            onClick={() => setPageIndex((p) => Math.min(totalPages - 1, p + 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </>
  );
}

export default function StudentSubjectsPage() {
  const [filterOpen, setFilterOpen] = useState(true);
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

  return (
    <PageContainer className="space-y-4">
      <PageHeader
        title="Student Subjects"
        description="Search a student and view assigned subjects."
      />

      <div className="app-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-border bg-muted/40 px-3 py-2.5">
          <h2 className="app-card-title">Student Subjects</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-6 px-2.5 text-[12px]"
            style={{ marginRight: "0px" }}
            onClick={() => setFilterOpen((v) => !v)}
            aria-expanded={filterOpen}
          >
            <Filter className="mr-1.5 h-3.5 w-3.5" />
            Filter
            <ChevronDown
              className={`ml-1.5 h-3.5 w-3.5 transition-transform ${filterOpen ? "rotate-180" : ""}`}
            />
          </Button>
        </div>

        {filterOpen && (
          <div className="p-3">
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
          </div>
        )}
      </div>

      {selectedStudent ? (
        <div
          className="overflow-hidden rounded border bg-white shadow-sm"
          style={{ borderColor: COLORS.border }}
        >
          {contextLine ? (
            <div className="border-b-2 px-4 py-2">
              <p
                className="text-[12px] font-semibold leading-snug"
                style={{ color: COLORS.contextBlue }}
              >
                {contextLine}
              </p>
            </div>
          ) : null}
          <StudentSubjectsResultTable
            subjects={subjects}
            loading={loadingSubjects}
          />
        </div>
      ) : null}
    </PageContainer>
  );
}
