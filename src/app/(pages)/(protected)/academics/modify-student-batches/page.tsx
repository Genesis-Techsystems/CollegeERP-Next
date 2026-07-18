"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type {
  ColDef,
  ICellRendererParams,
  IHeaderParams,
} from "ag-grid-community";
import { DatePicker } from "@/common/components/date-picker";
import { Select } from "@/common/components/select";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toastError, toastInfo, toastSuccess } from "@/lib/toast";
import {
  getDigitalOnlineSyncFilters,
  listLabBatchStudentsForModify,
  listStaffMappingSections,
  listStudentLabBatches,
  submitLabBatchChange,
} from "@/services";

type AnyRow = Record<string, any>;

const n = (v: unknown) => Number(v) || 0;
const s = (v: unknown) => {
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  return "";
};
const uniq = (rows: AnyRow[], key: string) => {
  const seen = new Set<number>();
  return rows.filter((r) => {
    const id = n(r[key]);
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};

/** 'YYYY-MM-DD HH:mm:ss' — mirrors Angular genericFunctions.momentWithTime(). */
const toDateTime = (d: Date | null | string | undefined): string => {
  if (!d) return "";
  const date = d instanceof Date ? d : new Date(String(d));
  if (Number.isNaN(date.getTime())) return "";
  const p = (x: number) => String(x).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())} ${p(date.getHours())}:${p(date.getMinutes())}:${p(date.getSeconds())}`;
};

/** Mirrors Angular genericFunctions.momentBeforeDayWithDate(). */
const dayBefore = (d: Date | null): string => {
  if (!d) return "";
  const prev = new Date(d);
  prev.setDate(prev.getDate() - 1);
  return toDateTime(prev);
};

function formatDisplayDate(value: unknown): string {
  if (!value) return "-";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return s(value) || "-";
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const batchIdOf = (row: AnyRow) =>
  n(row.studentbatchId ?? row.studentBatchId ?? row.fk_student_batch_id);
const batchLabel = (row: AnyRow) =>
  s(row.batchName) || s(row.batch_name) || s(row.batchCode) || "Batch";

type MarkAllHeaderParams = IHeaderParams & {
  checked: boolean;
  onToggle: (checked: boolean) => void;
};

function MarkAllHeader(props: MarkAllHeaderParams) {
  return (
    <label className="flex h-full w-full cursor-pointer items-center gap-1.5 px-1 text-[12px] font-medium leading-none">
      <input
        type="checkbox"
        checked={props.checked}
        onChange={(e) => props.onToggle(e.target.checked)}
      />
      <span>{props.checked ? "UnMark All" : "Mark All"}</span>
    </label>
  );
}

export default function ModifyStudentBatchesPage() {
  const [filtersData, setFiltersData] = useState<AnyRow[]>([]);
  const [academicData, setAcademicData] = useState<AnyRow[]>([]);
  const [sections, setSections] = useState<AnyRow[]>([]);
  const [studentBatches, setStudentBatches] = useState<AnyRow[]>([]);
  const [rows, setRows] = useState<AnyRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tableEnabled, setTableEnabled] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [fromDate, setFromDate] = useState<Date | null>(new Date());
  const [toDate, setToDate] = useState<Date | null>(new Date());
  const [attendanceOpen, setAttendanceOpen] = useState(false);
  const [attendanceRows, setAttendanceRows] = useState<AnyRow[]>([]);

  const [collegeId, setCollegeId] = useState<number | null>(null);
  const [courseId, setCourseId] = useState<number | null>(null);
  const [courseGroupId, setCourseGroupId] = useState<number | null>(null);
  const [courseYearId, setCourseYearId] = useState<number | null>(null);
  const [academicYearId, setAcademicYearId] = useState<number | null>(null);
  const [groupSectionId, setGroupSectionId] = useState<number | null>(null);
  const [sourceBatchId, setSourceBatchId] = useState<number | null>(null);
  const [targetBatchId, setTargetBatchId] = useState<number | null>(null);

  useEffect(() => {
    const orgId = Number(localStorage.getItem("organizationId") ?? 0);
    const empId = Number(localStorage.getItem("employeeId") ?? 0);
    getDigitalOnlineSyncFilters(orgId, empId)
      .then((d) => {
        setFiltersData(d.filtersData as AnyRow[]);
        setAcademicData(d.academicYearData as AnyRow[]);
      })
      .catch(() => {
        setFiltersData([]);
        setAcademicData([]);
      });
  }, []);

  const colleges = useMemo(
    () =>
      uniq(filtersData, "fk_college_id").sort(
        (a, b) => n(a.clg_sort_order) - n(b.clg_sort_order),
      ),
    [filtersData],
  );
  const courses = useMemo(
    () =>
      uniq(
        filtersData.filter((r) => n(r.fk_college_id) === (collegeId ?? 0)),
        "fk_course_id",
      ),
    [filtersData, collegeId],
  );
  const courseGroups = useMemo(
    () =>
      uniq(
        filtersData.filter(
          (r) =>
            n(r.fk_college_id) === (collegeId ?? 0) &&
            n(r.fk_course_id) === (courseId ?? 0),
        ),
        "fk_course_group_id",
      ),
    [filtersData, collegeId, courseId],
  );
  const courseYears = useMemo(
    () =>
      uniq(
        filtersData.filter(
          (r) =>
            n(r.fk_college_id) === (collegeId ?? 0) &&
            n(r.fk_course_id) === (courseId ?? 0) &&
            n(r.fk_course_group_id) === (courseGroupId ?? 0),
        ),
        "fk_course_year_id",
      ).sort((a, b) => n(a.year_order) - n(b.year_order)),
    [filtersData, collegeId, courseId, courseGroupId],
  );
  const academicYears = useMemo(() => {
    const univId = n(
      filtersData.find((x) => n(x.fk_college_id) === (collegeId ?? 0))
        ?.fk_university_id,
    );
    return uniq(
      academicData.filter((r) => n(r.fk_university_id) === univId),
      "fk_academic_year_id",
    ).sort((a, b) =>
      String(b.academic_year ?? "").localeCompare(
        String(a.academic_year ?? ""),
      ),
    );
  }, [academicData, filtersData, collegeId]);
  const sectionOptions = useMemo(
    () =>
      sections.map((x) => ({
        value: String(n(x.pk_group_section_id ?? x.groupSectionId)),
        label: s(x.section) || s(x.sectionName),
      })),
    [sections],
  );
  const batchOptions = useMemo(
    () =>
      studentBatches
        .map((x) => ({
          value: String(batchIdOf(x)),
          label: batchLabel(x),
        }))
        .filter((opt) => opt.value !== "0"),
    [studentBatches],
  );

  useEffect(() => {
    if (!collegeId && colleges.length)
      setCollegeId(n(colleges[0].fk_college_id));
  }, [colleges, collegeId]);
  useEffect(() => {
    setCourseId(null);
    setCourseGroupId(null);
    setCourseYearId(null);
    setAcademicYearId(null);
    setGroupSectionId(null);
    setSourceBatchId(null);
    setTargetBatchId(null);
  }, [collegeId]);
  useEffect(() => {
    if (!courseId && courses.length) setCourseId(n(courses[0].fk_course_id));
  }, [courses, courseId]);
  useEffect(() => {
    setCourseGroupId(null);
    setCourseYearId(null);
    setAcademicYearId(null);
    setGroupSectionId(null);
    setSourceBatchId(null);
    setTargetBatchId(null);
  }, [courseId]);
  useEffect(() => {
    if (!courseGroupId && courseGroups.length)
      setCourseGroupId(n(courseGroups[0].fk_course_group_id));
  }, [courseGroups, courseGroupId]);
  useEffect(() => {
    setCourseYearId(null);
    setAcademicYearId(null);
    setGroupSectionId(null);
    setSourceBatchId(null);
    setTargetBatchId(null);
  }, [courseGroupId]);
  useEffect(() => {
    if (!courseYearId && courseYears.length)
      setCourseYearId(n(courseYears[0].fk_course_year_id));
  }, [courseYears, courseYearId]);
  useEffect(() => {
    setAcademicYearId(null);
    setGroupSectionId(null);
    setSourceBatchId(null);
    setTargetBatchId(null);
  }, [courseYearId]);
  useEffect(() => {
    if (!academicYearId && academicYears.length)
      setAcademicYearId(
        n(
          [...academicYears].sort(
            (a, b) => n(b.is_curr_ay) - n(a.is_curr_ay),
          )[0]?.fk_academic_year_id,
        ),
      );
  }, [academicYears, academicYearId]);
  useEffect(() => {
    setGroupSectionId(null);
    setSourceBatchId(null);
    setTargetBatchId(null);
  }, [academicYearId]);
  useEffect(() => {
    if (!groupSectionId && sections.length)
      setGroupSectionId(
        n(sections[0].pk_group_section_id ?? sections[0].groupSectionId),
      );
  }, [sections, groupSectionId]);

  useEffect(() => {
    async function loadSections() {
      if (
        !collegeId ||
        !courseId ||
        !courseGroupId ||
        !courseYearId ||
        !academicYearId
      ) {
        setSections([]);
        return;
      }
      const organizationId = Number(
        localStorage.getItem("organizationId") ?? 0,
      );
      const employeeId = Number(localStorage.getItem("employeeId") ?? 0);
      const list = await listStaffMappingSections({
        organizationId,
        employeeId,
        collegeId,
        courseId,
        courseGroupId,
        courseYearId,
        academicYearId,
      }).catch(() => []);
      setSections(list);
    }
    void loadSections();
  }, [collegeId, courseId, courseGroupId, courseYearId, academicYearId]);

  // Angular getSections → Studentbatch (LAB) for college + course
  useEffect(() => {
    async function loadBatches() {
      setSourceBatchId(null);
      setTargetBatchId(null);
      setRows([]);
      setTableEnabled(false);
      if (!collegeId || !courseId) {
        setStudentBatches([]);
        return;
      }
      const list = await listStudentLabBatches({ collegeId, courseId }).catch(
        () => [],
      );
      setStudentBatches(Array.isArray(list) ? list : []);
    }
    void loadBatches();
  }, [collegeId, courseId]);

  useEffect(() => {
    setSourceBatchId(null);
    setTargetBatchId(null);
    setRows([]);
    setTableEnabled(false);
    setSelectedIds(new Set());
  }, [groupSectionId]);

  useEffect(() => {
    async function loadStudents() {
      setSelectedIds(new Set());
      if (
        !collegeId ||
        !courseGroupId ||
        !groupSectionId ||
        !sourceBatchId
      ) {
        setRows([]);
        setTableEnabled(false);
        return;
      }
      setLoading(true);
      const list = await listLabBatchStudentsForModify({
        collegeId,
        courseGroupId,
        groupSectionId,
        studentbatchId: sourceBatchId,
      }).catch(() => []);
      const mapped = list.map((row, i) => ({
        ...row,
        __rowKey: `${n(row.batchwiseStudentId) || n(row.studentId)}-${i}`,
      }));
      setRows(mapped);
      setTableEnabled(mapped.length > 0);
      setLoading(false);
    }
    void loadStudents();
  }, [collegeId, courseGroupId, groupSectionId, sourceBatchId]);

  function toggleRow(key: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(key);
      else next.delete(key);
      return next;
    });
  }

  const allSelected =
    rows.length > 0 && rows.every((r) => selectedIds.has(s(r.__rowKey)));
  function toggleAll(checked: boolean) {
    setSelectedIds(
      checked ? new Set(rows.map((r) => s(r.__rowKey))) : new Set(),
    );
  }
  const toggleAllRef = useRef(toggleAll);
  toggleAllRef.current = toggleAll;

  function onFromDateChange(d: Date | null) {
    setFromDate(d);
    if (d && toDate && d.getTime() > toDate.getTime()) {
      toastInfo("From date should be less then To date.");
      setToDate(d);
    }
  }

  function onToDateChange(d: Date | null) {
    if (fromDate && d && fromDate.getTime() > d.getTime()) {
      toastInfo("From date should be less then To date.");
      setToDate(fromDate);
      return;
    }
    setToDate(d);
  }

  const studentColumnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      {
        headerName: "SI.No",
        width: 70,
        flex: 0,
        valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1,
      },
      {
        headerName: "Roll No.",
        minWidth: 150,
        valueGetter: (p) =>
          s(p.data?.rollNumber) ||
          s(p.data?.hallticketNumber) ||
          "-",
      },
      {
        headerName: "Student Name",
        minWidth: 220,
        flex: 1,
        valueGetter: (p) =>
          s(p.data?.studentFirstName) ||
          s(p.data?.studentName) ||
          s(p.data?.firstName) ||
          "-",
      },
      {
        headerName: "Date",
        minWidth: 200,
        valueGetter: (p) => {
          if (!p.data?.fromDate) return "-";
          return `${formatDisplayDate(p.data.fromDate)} - ${formatDisplayDate(p.data.toDate)}`;
        },
      },
      {
        headerName: "",
        minWidth: 130,
        width: 130,
        flex: 0,
        sortable: false,
        filter: false,
        headerComponent: MarkAllHeader,
        headerComponentParams: {
          checked: allSelected,
          onToggle: (checked: boolean) => toggleAllRef.current(checked),
        },
        cellRenderer: (p: ICellRendererParams<AnyRow>) => (
          <div className="flex h-full items-center px-1">
            <input
              type="checkbox"
              checked={selectedIds.has(s(p.data?.__rowKey))}
              onChange={(e) =>
                toggleRow(s(p.data?.__rowKey), e.target.checked)
              }
            />
          </div>
        ),
      },
    ],
    [selectedIds, allSelected],
  );

  async function reloadStudents() {
    if (!collegeId || !courseGroupId || !groupSectionId || !sourceBatchId) {
      setRows([]);
      return;
    }
    const list = await listLabBatchStudentsForModify({
      collegeId,
      courseGroupId,
      groupSectionId,
      studentbatchId: sourceBatchId,
    }).catch(() => []);
    setRows(
      list.map((row, i) => ({
        ...row,
        __rowKey: `${n(row.batchwiseStudentId) || n(row.studentId)}-${i}`,
      })),
    );
  }

  async function onChange() {
    if (selectedIds.size === 0) {
      toastInfo("Please select atleast one student.");
      return;
    }
    if (!targetBatchId) {
      toastError("Please select the target batch");
      return;
    }
    if (targetBatchId === sourceBatchId) {
      toastInfo("Change to different batch.");
      return;
    }
    if (!fromDate || !toDate) {
      toastError("Please select from and to dates");
      return;
    }

    const selectedRows = rows.filter((r) => selectedIds.has(s(r.__rowKey)));
    const payload: AnyRow[] = [];
    for (const student of selectedRows) {
      // Close current LAB batch assignment (toDate = day before new fromDate)
      payload.push({
        academicYearId: n(student.academicYearId),
        batchId: n(student.batchId),
        batchwiseStudentId: n(student.batchwiseStudentId) || null,
        createdDt: student.createdDt ?? null,
        collegeId: n(student.collegeId),
        courseYearId: n(student.courseYearId),
        electiveGroupyrMappingId: n(student.electiveGroupyrMappingId) || null,
        electiveGroupCode: student.electiveGroupCode ?? null,
        fromDate: toDateTime(student.fromDate),
        groupSectionId: n(student.groupSectionId),
        isActive: true,
        regulationId: n(student.regulationId),
        studentId: n(student.studentId),
        studentbatchId: n(student.studentbatchId) || sourceBatchId,
        subjectId: n(student.subjectId) || null,
        subjectType: student.subjectType ?? null,
        toDate: dayBefore(fromDate),
      });
      // Open new LAB batch assignment
      payload.push({
        academicYearId: n(student.academicYearId),
        batchId: n(student.batchId),
        batchwiseStudentId: null,
        collegeId: n(student.collegeId),
        courseYearId: n(student.courseYearId),
        electiveGroupyrMappingId: n(student.electiveGroupyrMappingId) || null,
        electiveGroupCode: student.electiveGroupCode ?? null,
        fromDate: toDateTime(fromDate),
        groupSectionId: n(student.groupSectionId),
        isActive: true,
        regulationId: n(student.regulationId),
        studentId: n(student.studentId),
        studentbatchId: targetBatchId,
        subjectId: n(student.subjectId) || null,
        subjectType: student.subjectType ?? null,
        toDate: toDateTime(toDate),
      });
    }

    setSaving(true);
    try {
      const result = await submitLabBatchChange(payload);
      setSelectedIds(new Set());
      await reloadStudents();

      // Angular: success + non-empty data → attendance conflict modal
      if (Array.isArray(result) && result.length > 0) {
        setAttendanceRows(result as AnyRow[]);
        setAttendanceOpen(true);
      } else {
        toastSuccess("Student batches updated successfully");
      }
    } catch (e) {
      setSelectedIds(new Set());
      await reloadStudents();
      toastInfo(
        e instanceof Error && e.message
          ? e.message
          : "Failed to change student batches",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <FilteredListPage
        title="Modify Student Batches"
        filters={
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <Select
              label="College *"
              value={collegeId ? String(collegeId) : null}
              onChange={(v) => setCollegeId(v ? Number(v) : null)}
              options={colleges.map((x) => ({
                value: String(n(x.fk_college_id)),
                label: s(x.college_code),
              }))}
              searchable
              className="md:col-span-3"
            />
            <Select
              label="Course *"
              value={courseId ? String(courseId) : null}
              onChange={(v) => setCourseId(v ? Number(v) : null)}
              options={courses.map((x) => ({
                value: String(n(x.fk_course_id)),
                label: s(x.course_code),
              }))}
              searchable
              className="md:col-span-3"
            />
            <Select
              label="Course Group *"
              value={courseGroupId ? String(courseGroupId) : null}
              onChange={(v) => setCourseGroupId(v ? Number(v) : null)}
              options={courseGroups.map((x) => ({
                value: String(n(x.fk_course_group_id)),
                label: s(x.group_code) || s(x.group_name),
              }))}
              searchable
              className="md:col-span-3"
            />
            <Select
              label="Course Year *"
              value={courseYearId ? String(courseYearId) : null}
              onChange={(v) => setCourseYearId(v ? Number(v) : null)}
              options={courseYears.map((x) => ({
                value: String(n(x.fk_course_year_id)),
                label: s(x.course_year_code) || s(x.course_year_name),
              }))}
              searchable
              className="md:col-span-3"
            />
            <Select
              label="Academic Year *"
              value={academicYearId ? String(academicYearId) : null}
              onChange={(v) => setAcademicYearId(v ? Number(v) : null)}
              options={academicYears.map((x) => ({
                value: String(n(x.fk_academic_year_id)),
                label: s(x.academic_year),
              }))}
              searchable
              className="md:col-span-3"
            />
            <Select
              label="Section *"
              value={groupSectionId ? String(groupSectionId) : null}
              onChange={(v) => setGroupSectionId(v ? Number(v) : null)}
              options={sectionOptions}
              searchable
              className="md:col-span-2"
            />
            <Select
              label="Student Batch *"
              value={sourceBatchId ? String(sourceBatchId) : null}
              onChange={(v) => setSourceBatchId(v ? Number(v) : null)}
              options={batchOptions}
              searchable
              className="md:col-span-2"
            />
          </div>
        }
        rowData={tableEnabled ? rows : []}
        columnDefs={studentColumnDefs}
        loading={loading}
        pagination
        toolbar={{ search: true, searchPlaceholder: "Search" }}
        rightRail={
          tableEnabled && selectedIds.size > 0 ? (
            <div className="overflow-hidden rounded border border-[#c3d9ff] bg-card">
              <h3 className="bg-[#ecf3ff] px-3 py-2 text-center text-[14px] font-semibold uppercase text-slate-700">
                Change Batch To
              </h3>
              <div className="space-y-3 p-3">
                <DatePicker
                  label="From Date"
                  value={fromDate}
                  onChange={onFromDateChange}
                  placeholder="Select date"
                />
                <DatePicker
                  label="To Date"
                  value={toDate}
                  onChange={onToDateChange}
                  placeholder="Select date"
                />
                <Select
                  label="Change Batch To *"
                  value={targetBatchId ? String(targetBatchId) : null}
                  onChange={(v) => setTargetBatchId(v ? Number(v) : null)}
                  options={batchOptions}
                  searchable
                />
                <div className="flex justify-end pt-1">
                  <Button
                    type="button"
                    className="h-8 px-5"
                    onClick={() => {
                      void onChange();
                    }}
                    disabled={saving || !targetBatchId}
                  >
                    {saving ? "Changing..." : "Change"}
                  </Button>
                </div>
              </div>
            </div>
          ) : undefined
        }
      />

      <Dialog open={attendanceOpen} onOpenChange={setAttendanceOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Students Attendance Details</DialogTitle>
          </DialogHeader>
          <div className="max-h-[45vh] overflow-auto rounded border">
            <table className="w-full text-[12px]">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-2 py-1 text-left">SI.No</th>
                  <th className="px-2 py-1 text-left">Student</th>
                  <th className="px-2 py-1 text-left">Subject Name</th>
                  <th className="px-2 py-1 text-left">Employee</th>
                  <th className="px-2 py-1 text-left">Attendance Taken Date</th>
                </tr>
              </thead>
              <tbody>
                {attendanceRows.map((row, index) => (
                  <tr key={`att-${index}`} className="border-t">
                    <td className="px-2 py-1">{index + 1}</td>
                    <td className="px-2 py-1">
                      {s(row.stdName ?? row.studentName ?? row.firstName) ||
                        "-"}{" "}
                      (
                      <span className="font-medium text-blue-700">
                        {s(row.rollNumber ?? row.hallticketNumber) || "-"}
                      </span>
                      )
                    </td>
                    <td className="px-2 py-1">
                      {s(row.subjectName ?? row.subject_name) || "-"}
                    </td>
                    <td className="px-2 py-1">
                      {s(row.employeeName ?? row.empName) || "-"}
                    </td>
                    <td className="px-2 py-1">
                      {formatDisplayDate(
                        row.attendanceDate ?? row.attendanceTakenDate,
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <DialogFooter>
            <Button type="button" onClick={() => setAttendanceOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
