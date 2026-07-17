"use client";

import { useMemo, useState } from "react";
import type { ColDef } from "ag-grid-community";
import { Select } from "@/common/components/select";
import { StudentSearchSelect } from "@/common/components/student-search";
import { DatePicker } from "@/common/components/date-picker";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { useSessionContext } from "@/context/SessionContext";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  listStudents,
  listCourseGroupsForStudentCourseChange,
  submitStudentCourseGroupChange,
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

export default function ModifySubjectGroupsPage() {
  const { user } = useSessionContext();
  const [searchRows, setSearchRows] = useState<AnyRow[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(
    null,
  );
  const [student, setStudent] = useState<AnyRow | null>(null);
  const [groupRows, setGroupRows] = useState<AnyRow[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [targetGroupId, setTargetGroupId] = useState<number | null>(null);
  const [modifiedOn, setModifiedOn] = useState<Date | null>(new Date());
  const [submitting, setSubmitting] = useState(false);

  const groupOptions = useMemo(
    () =>
      groupRows.map((row) => ({
        value: String(
          pickNum(row, [
            "fk_course_group_id",
            "courseGroupId",
            "course_group_id",
          ]),
        ),
        label:
          pickText(row, [
            "group_code",
            "groupCode",
            "group_name",
            "groupName",
          ]) || "Course Group",
      })),
    [groupRows],
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
        minWidth: 220,
        valueGetter: (p) =>
          pickText(p.data, ["courseCode", "courseName"]) || "-",
      },
      {
        headerName: "Course Group",
        minWidth: 180,
        valueGetter: (p) => pickText(p.data, ["groupCode", "groupName"]) || "-",
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
    setGroupRows([]);
    setTargetGroupId(null);
    if (!id || !row) return;

    if (
      String(row.studentStatusCode ?? "")
        .trim()
        .toUpperCase() === "DETAINRECOMMENDED"
    ) {
      toastError("This student is not in in-college status");
      return;
    }

    setStudent(row);
    setLoadingGroups(true);
    try {
      const rows = await listCourseGroupsForStudentCourseChange({
        organizationId: Number(user?.organizationId ?? 0),
        employeeId: Number(user?.employeeId ?? 0),
        collegeId: pickNum(row, ["collegeId", "fk_college_id"]),
        courseId: pickNum(row, ["courseId", "fk_course_id"]),
      });
      setGroupRows(rows);
    } catch {
      setGroupRows([]);
    } finally {
      setLoadingGroups(false);
    }
  }

  async function onSubmitChange() {
    if (!student || !targetGroupId) {
      toastError("Please select student and target course group");
      return;
    }
    setSubmitting(true);
    try {
      await submitStudentCourseGroupChange([
        {
          studentId: pickNum(student, ["studentId", "fk_student_id"]),
          isActive: student.isActive ?? true,
          groupSectionId: pickNum(student, [
            "groupSectionId",
            "fk_group_section_id",
          ]),
          regulationId: pickNum(student, ["regulationId", "fk_regulation_id"]),
          batchId: pickNum(student, ["batchId", "fk_batch_id"]),
          academicYearId: pickNum(student, [
            "academicYearId",
            "fk_academic_year_id",
          ]),
          quotaId: pickNum(student, ["quotaId", "fk_quota_id"]),
          collegeId: pickNum(student, ["collegeId", "fk_college_id"]),
          courseId: pickNum(student, ["courseId", "fk_course_id"]),
          courseGroupId: targetGroupId,
          courseYearId: pickNum(student, ["courseYearId", "fk_course_year_id"]),
          studentStatusId: pickNum(student, [
            "studentStatusId",
            "fk_student_status_id",
          ]),
          modifiedOn,
        },
      ]);
      toastSuccess("Course group changed successfully");
      setSelectedStudentId(null);
      setStudent(null);
      setTargetGroupId(null);
      setGroupRows([]);
      setSearchRows([]);
    } catch (error) {
      toastError(error, "Failed to change course group");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <FilteredListPage
      title="Modify Subject Groups"
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
              To Course Group
            </h3>
            <div className="space-y-3 p-3">
              <Select
                label="Course Group *"
                value={targetGroupId ? String(targetGroupId) : null}
                onChange={(v) => setTargetGroupId(v ? Number(v) : null)}
                options={groupOptions}
                placeholder="Select course group"
                searchable
                isLoading={loadingGroups}
                disabled={loadingGroups}
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
                  disabled={!targetGroupId || submitting}
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
