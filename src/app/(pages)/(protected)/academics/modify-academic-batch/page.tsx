"use client";

import { useMemo, useState } from "react";
import type { ColDef } from "ag-grid-community";
import { Select } from "@/common/components/select";
import { StudentSearchSelect } from "@/common/components/student-search";
import { DatePicker } from "@/common/components/date-picker";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  listBatchesForModifyAcademicBatch,
  listStudents,
  submitStudentBatchChange,
} from "@/services";

type AnyRow = Record<string, any>;

function pickNum(row: AnyRow | null | undefined, keys: string[]): number {
  if (!row) return 0;
  for (const key of keys) {
    const n = Number(row[key] ?? 0);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

function pickText(row: AnyRow | null | undefined, keys: string[]): string {
  if (!row) return "";
  for (const key of keys) {
    const raw = row[key];
    if (raw != null) {
      const out = String(raw).trim();
      if (out) return out;
    }
  }
  return "";
}

export default function ModifyAcademicBatchPage() {
  const [searchRows, setSearchRows] = useState<AnyRow[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(
    null,
  );
  const [student, setStudent] = useState<AnyRow | null>(null);
  const [batchRows, setBatchRows] = useState<AnyRow[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [targetBatchId, setTargetBatchId] = useState<number | null>(null);
  const [modifiedOn, setModifiedOn] = useState<Date | null>(new Date());
  const [submitting, setSubmitting] = useState(false);

  const batchOptions = useMemo(
    () =>
      batchRows
        .map((row) => ({
          value: String(
            pickNum(row, [
              "fk_batch_id",
              "batchId",
              "batch_id",
              "studentBatchId",
            ]),
          ),
          label:
            pickText(row, [
              "batch_name",
              "batchName",
              "batch_code",
              "batchCode",
              "batchname",
            ]) || "Batch",
        }))
        .filter((opt) => opt.value !== "0"),
    [batchRows],
  );
  const studentDetailsRows = useMemo(
    () => (student ? [student] : []),
    [student],
  );
  const studentDetailsColumnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      { headerName: "SI.No", width: 80, flex: 0, valueGetter: () => 1 },
      {
        headerName: "Hallticket No.",
        minWidth: 160,
        valueGetter: (p) =>
          pickText(p.data, ["hallticketNumber", "rollNumber"]) || "-",
      },
      {
        headerName: "Student Name",
        minWidth: 220,
        valueGetter: (p) =>
          pickText(p.data, ["firstName", "studentName"]) || "-",
      },
      {
        headerName: "Course Name",
        minWidth: 180,
        valueGetter: (p) =>
          pickText(p.data, ["courseCode", "courseName"]) || "-",
      },
      {
        headerName: "Batch",
        minWidth: 160,
        valueGetter: (p) =>
          pickText(p.data, ["batchname", "batchName", "batch_name"]) || "-",
      },
    ],
    [],
  );

  async function onSearchStudents(term: string) {
    const q = term.trim();
    if (!q) {
      setSearchRows([]);
      return;
    }
    if (q.length < 5) return;
    setLoadingSearch(true);
    try {
      const rows = await listStudents(q);
      setSearchRows(Array.isArray(rows) ? rows : []);
    } catch {
      setSearchRows([]);
    } finally {
      setLoadingSearch(false);
    }
  }

  async function onStudentSelect(id: number | null, row: AnyRow | null) {
    setSelectedStudentId(id);
    setStudent(null);
    setBatchRows([]);
    setTargetBatchId(null);
    if (!id || !row) return;

    // Angular: block DETAINRECOMMENDED with info toast.
    if (
      String(row.studentStatusCode ?? "")
        .trim()
        .toUpperCase() === "DETAINRECOMMENDED"
    ) {
      toastError("This student is not in in-college status");
      return;
    }

    setStudent(row);
    setLoadingBatches(true);
    try {
      // Angular selectedStudent → getfilterDetails:
      // getAllRecords/s_get_collegewisedetails_bycode?in_flag=clg_filters&in_course_id=<courseId>
      const courseId = pickNum(row, ["courseId", "fk_course_id"]);
      const rows = await listBatchesForModifyAcademicBatch({
        organizationId: Number(localStorage.getItem("organizationId") ?? 0),
        employeeId: Number(localStorage.getItem("employeeId") ?? 0),
        courseId,
      });
      setBatchRows(Array.isArray(rows) ? rows : []);
    } catch {
      setBatchRows([]);
    } finally {
      setLoadingBatches(false);
    }
  }

  function clearSelection() {
    setSelectedStudentId(null);
    setStudent(null);
    setTargetBatchId(null);
    setBatchRows([]);
    setSearchRows([]);
    setModifiedOn(new Date());
  }

  async function onSubmitChange() {
    if (!student || !targetBatchId) {
      toastError("Please select student and target batch");
      return;
    }
    // Mirrors Angular `changeStudentBatch` → `addStudentBatches`.
    setSubmitting(true);
    try {
      await submitStudentBatchChange([
        {
          studentId: pickNum(student, ["studentId", "fk_student_id"]),
          isActive: student.isActive ?? true,
          groupSectionId: pickNum(student, [
            "groupSectionId",
            "fk_group_section_id",
          ]),
          regulationId: pickNum(student, ["regulationId", "fk_regulation_id"]),
          batchId: targetBatchId,
          academicYearId: pickNum(student, [
            "academicYearId",
            "fk_academic_year_id",
          ]),
          quotaId: pickNum(student, ["quotaId", "fk_quota_id"]),
          collegeId: pickNum(student, ["collegeId", "fk_college_id"]),
          courseId: pickNum(student, ["courseId", "fk_course_id"]),
          courseGroupId: pickNum(student, [
            "courseGroupId",
            "fk_course_group_id",
          ]),
          courseYearId: pickNum(student, ["courseYearId", "fk_course_year_id"]),
          studentStatusId: pickNum(student, [
            "studentStatusId",
            "fk_student_status_id",
          ]),
          modifiedOn,
        },
      ]);
      toastSuccess("Academic batch changed successfully");
      clearSelection();
    } catch (error) {
      toastError(error, "Failed to change academic batch");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <FilteredListPage
      title="Modify Academic Batch"
      filters={
        <StudentSearchSelect
          label="Student"
          value={selectedStudentId}
          students={searchRows}
          selectedStudent={student}
          isLoading={loadingSearch}
          onSearch={(term) => void onSearchStudents(term)}
          onChange={(id, row) => void onStudentSelect(id, row)}
        />
      }
      rowData={student ? studentDetailsRows : []}
      columnDefs={studentDetailsColumnDefs}
      toolbar={student ? { search: true, searchPlaceholder: "Search" } : false}
      pagination={false}
      rightRail={
        student ? (
          <div className="overflow-hidden rounded-md border border-[#c3d9ff] bg-card">
            <h3 className="bg-[#ecf3ff] px-3 py-2 text-center text-[13px] font-semibold uppercase tracking-wide text-slate-700">
              To Batch
            </h3>
            <div className="space-y-3 p-3">
              <Select
                label="Batch *"
                value={targetBatchId ? String(targetBatchId) : null}
                onChange={(v) => setTargetBatchId(v ? Number(v) : null)}
                options={batchOptions}
                placeholder="Select batch"
                searchable
                isLoading={loadingBatches}
                disabled={loadingBatches}
              />
              <DatePicker
                label="Modified On"
                value={modifiedOn}
                onChange={setModifiedOn}
                placeholder="Select date"
              />
              <div className="flex justify-end pt-1">
                <Button
                  type="button"
                  disabled={!targetBatchId || submitting}
                  onClick={() => void onSubmitChange()}
                >
                  {submitting ? "Changing..." : "Change"}
                </Button>
              </div>
            </div>
          </div>
        ) : null
      }
    />
  );
}
