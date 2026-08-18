"use client";

/**
 * Consolidated Marks Report — Angular
 * `examination/exam-reports/consolidated-marks-report`.
 * Live route: `/reports/admin-exam-reports/consolidated-marks-report`.
 */

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Printer } from "lucide-react";
import { FilteredListPage } from "@/components/layout";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
import { Select, type SelectOption } from "@/common/components/select";
import { Button } from "@/components/ui/button";
import { toastError } from "@/lib/toast";
import { toast } from "sonner";
import {
  getExamStudentResultsReport,
  searchStudentsForCertificate,
} from "@/services";
import type { StudentFeeSearchRow } from "@/types/fees-collection";
import {
  CONSOLIDATED_MEMO_PRINT_HREF,
  groupExamRows,
  saveConsolidatedMemoPrint,
  txt,
  type ConsolidatedMemoExamGroup,
  type ConsolidatedMemoRow,
} from "./consolidated-marks-memo";

const REPORT_TITLE = "Consolidated Marks Report";

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function studentLabel(row: StudentFeeSearchRow): string {
  const roll = txt(row.rollNumber ?? row.hallticketNumber);
  const name = txt(row.firstName);
  if (roll && name) return `${roll}(${name})`;
  return roll || name || String(row.studentId);
}

export function ConsolidatedMarksReportPage() {
  const router = useRouter();
  const [studentId, setStudentId] = useState("");
  const [students, setStudents] = useState<StudentFeeSearchRow[]>([]);
  const [selectedStudent, setSelectedStudent] =
    useState<StudentFeeSearchRow | null>(null);
  const [studentSearchLoading, setStudentSearchLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [studentDetails, setStudentDetails] = useState<ConsolidatedMemoRow[]>(
    [],
  );
  const [groups, setGroups] = useState<ConsolidatedMemoExamGroup[]>([]);
  const [filterSummary, setFilterSummary] = useState("");

  const studentOptions = useMemo<SelectOption[]>(() => {
    const list = [...students];
    if (
      selectedStudent &&
      !list.some((s) => s.studentId === selectedStudent.studentId)
    ) {
      list.unshift(selectedStudent);
    }
    return list.map((s) => ({
      value: String(s.studentId),
      label: studentLabel(s),
    }));
  }, [students, selectedStudent]);

  async function onStudentSearch(term: string) {
    const q = term.trim();
    if (q.length < 5) {
      setStudents([]);
      return;
    }
    setStudentSearchLoading(true);
    try {
      setStudents(await searchStudentsForCertificate(q));
    } catch (e) {
      toastError(e, "Student search failed");
      setStudents([]);
    } finally {
      setStudentSearchLoading(false);
    }
  }

  function onStudentChange(value: string | null) {
    const id = value ?? "";
    setStudentId(id);
    setHasFetched(false);
    setGroups([]);
    setStudentDetails([]);
    setFilterSummary("");
    if (!id) {
      setSelectedStudent(null);
      return;
    }
    const found =
      students.find((s) => String(s.studentId) === id) ??
      (selectedStudent && String(selectedStudent.studentId) === id
        ? selectedStudent
        : null);
    setSelectedStudent(found);
  }

  async function onGetList() {
    if (!studentId) {
      toastError("Please select a student.");
      return;
    }
    const collegeId = num(selectedStudent?.collegeId);
    setLoading(true);
    try {
      const rows = await getExamStudentResultsReport({
        flag: "exam_std_result_detail",
        examId: 0,
        courseId: 0,
        courseGroupId: 0,
        courseYearId: 0,
        collegeId,
        studentId: Number(studentId),
        regulationId: 0,
        isPass: -1,
      });
      setHasFetched(true);
      if (!rows.length) {
        setGroups([]);
        setStudentDetails([]);
        setFilterSummary("");
        toast.info("No Records Found.");
        return;
      }
      setStudentDetails(rows);
      setGroups(groupExamRows(rows));
      const parts = [
        txt(selectedStudent?.collegeCode ?? rows[0]?.college_code),
        txt(selectedStudent?.courseCode ?? rows[0]?.course_code),
        txt(selectedStudent?.groupCode ?? rows[0]?.group_code),
      ].filter(Boolean);
      setFilterSummary(parts.join(" / "));
    } catch (e) {
      toastError(e, "Failed to load report");
      setGroups([]);
      setStudentDetails([]);
    } finally {
      setLoading(false);
    }
  }

  function onPrintReport() {
    saveConsolidatedMemoPrint({
      data: studentDetails,
      examdata: groups,
    });
    router.push(CONSOLIDATED_MEMO_PRINT_HREF);
  }

  const showResults = hasFetched && groups.length > 0;

  return (
    <FilteredListPage
      title={REPORT_TITLE}
      resultsVisible={showResults}
      showTable={showResults}
      filters={
        <div>
          <GlobalFilterBarRow>
            <GlobalFilterField
              label="Student *"
              className="global-filter-field--shrink w-[220px] max-w-[220px]"
            >
              <Select
                value={studentId || null}
                onChange={onStudentChange}
                options={studentOptions}
                placeholder="Search by student name or rollNo."
                searchable
                onSearch={(term) => void onStudentSearch(term)}
                isLoading={studentSearchLoading}
                clearable
              />
            </GlobalFilterField>
            <GlobalFilterField
              label=""
              className="global-filter-field--shrink global-filter-field--action"
            >
              <Button
                type="button"
                className="h-[30px] px-3 text-[12px]"
                onClick={() => void onGetList()}
                disabled={loading}
              >
                Get List
              </Button>
            </GlobalFilterField>
          </GlobalFilterBarRow>
        </div>
      }
      tableHeader={
        <div className="table-context-header flex w-full items-center justify-between gap-3">
          <div className="flex min-w-0 items-center">
            <span
              className="material-icons table-context-header__icon"
              aria-hidden
            >
              book
            </span>
            <strong className="table-context-header__title">
              {REPORT_TITLE}
            </strong>
          </div>
          {filterSummary ? (
            <span className="shrink-0 text-sm font-medium text-primary">
              {filterSummary}
            </span>
          ) : null}
        </div>
      }
      body={
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              className="h-9 text-[12px]"
              onClick={onPrintReport}
            >
              <Printer className="mr-1.5 h-3.5 w-3.5" />
            </Button>
          </div>
          {groups.map((ex, gi) => (
            <div key={`${ex.exam_name}-${ex.course_year_code}-${gi}`}>
              <p className="mb-2 text-sm font-medium">
                {ex.exam_name} / {ex.examtype} / {ex.course_year_code} /{" "}
                {ex.regulation_code}
              </p>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[12px]">
                  <thead>
                    <tr>
                      <th className="border border-border bg-muted/40 px-2 py-1.5 text-center">
                        S.No
                      </th>
                      <th className="border border-border bg-muted/40 px-2 py-1.5 text-left">
                        Subject
                      </th>
                      <th className="border border-border bg-muted/40 px-2 py-1.5 text-center">
                        Internal Marks
                      </th>
                      <th className="border border-border bg-muted/40 px-2 py-1.5 text-center">
                        External Marks
                      </th>
                      <th className="border border-border bg-muted/40 px-2 py-1.5 text-center">
                        Result
                      </th>
                      <th className="border border-border bg-muted/40 px-2 py-1.5 text-center">
                        Credits
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {ex.subjects.map((s, i) => (
                      <tr key={`${s.subject_code}-${i}`}>
                        <td className="border border-border px-2 py-1.5 text-center">
                          {i + 1}
                        </td>
                        <td className="border border-border px-2 py-1.5">
                          {s.subject_name} ({s.subject_code})
                        </td>
                        <td className="border border-border px-2 py-1.5 text-center">
                          {s.internal_marks}
                        </td>
                        <td className="border border-border px-2 py-1.5 text-center">
                          {s.external_marks}
                        </td>
                        <td className="border border-border px-2 py-1.5 text-center">
                          {s.result}
                        </td>
                        <td className="border border-border px-2 py-1.5 text-center">
                          {s.credits}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      }
    />
  );
}
