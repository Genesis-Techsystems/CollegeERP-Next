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
import { toastError, toastSuccess } from "@/lib/toast";
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

/** Mirrors Angular `genericFunctions.momentWithTime()`. */
const toDateTime = (d: Date | null): string => {
  if (!d) return "";
  const p = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};

/** Mirrors Angular `genericFunctions.momentBeforeDayWithDate()`. */
const dayBefore = (d: Date | null): string => {
  if (!d) return "";
  const prev = new Date(d);
  prev.setDate(prev.getDate() - 1);
  return toDateTime(prev);
};

function formatBatchDate(value: unknown): string {
  if (!value) return "";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateRange(from: unknown, to: unknown): string {
  if (!from) return "-";
  const start = formatBatchDate(from);
  const end = to ? formatBatchDate(to) : "";
  return end ? `${start} - ${end}` : start;
}

function studentDisplayName(row: AnyRow | undefined): string {
  return (
    s(
      row?.studentFirstName ??
        row?.studentName ??
        row?.student_name ??
        row?.firstName ??
        row?.fullName,
    ) || "-"
  );
}

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

export default function ModifyAcademicBatchPage() {
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

  const [collegeId, setCollegeId] = useState<number | null>(null);
  const [courseId, setCourseId] = useState<number | null>(null);
  const [courseGroupId, setCourseGroupId] = useState<number | null>(null);
  const [courseYearId, setCourseYearId] = useState<number | null>(null);
  const [academicYearId, setAcademicYearId] = useState<number | null>(null);
  const [groupSectionId, setGroupSectionId] = useState<number | null>(null);
  const [studentBatchId, setStudentBatchId] = useState<number | null>(null);
  const [targetStudentBatchId, setTargetStudentBatchId] = useState<
    number | null
  >(null);

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
  const studentBatchOptions = useMemo(() => {
    const seen = new Set<string>();
    return studentBatches
      .map((x) => {
        const value = String(
          n(x.studentbatchId ?? x.studentBatchId ?? x.pk_student_batch_id),
        );
        const label = s(x.batchName) || s(x.batch_name) || "Batch";
        return { value, label };
      })
      .filter((opt) => {
        if (!opt.value || opt.value === "0") return false;
        const key = `${opt.value}::${opt.label}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }, [studentBatches]);

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
    setStudentBatchId(null);
    setTargetStudentBatchId(null);
  }, [collegeId]);
  useEffect(() => {
    if (!courseId && courses.length) setCourseId(n(courses[0].fk_course_id));
  }, [courses, courseId]);
  useEffect(() => {
    setCourseGroupId(null);
    setCourseYearId(null);
    setAcademicYearId(null);
    setGroupSectionId(null);
    setStudentBatchId(null);
    setTargetStudentBatchId(null);
  }, [courseId]);
  useEffect(() => {
    if (!courseGroupId && courseGroups.length)
      setCourseGroupId(n(courseGroups[0].fk_course_group_id));
  }, [courseGroups, courseGroupId]);
  useEffect(() => {
    setCourseYearId(null);
    setAcademicYearId(null);
    setGroupSectionId(null);
    setStudentBatchId(null);
    setTargetStudentBatchId(null);
  }, [courseGroupId]);
  useEffect(() => {
    if (!courseYearId && courseYears.length)
      setCourseYearId(n(courseYears[0].fk_course_year_id));
  }, [courseYears, courseYearId]);
  useEffect(() => {
    setAcademicYearId(null);
    setGroupSectionId(null);
    setStudentBatchId(null);
    setTargetStudentBatchId(null);
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
    setStudentBatchId(null);
    setTargetStudentBatchId(null);
  }, [academicYearId]);
  useEffect(() => {
    if (!groupSectionId && sections.length)
      setGroupSectionId(
        n(sections[0].pk_group_section_id ?? sections[0].groupSectionId),
      );
  }, [sections, groupSectionId]);
  useEffect(() => {
    setStudentBatchId(null);
    setTargetStudentBatchId(null);
  }, [groupSectionId]);

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

  useEffect(() => {
    async function loadStudentBatches() {
      if (!collegeId || !courseId || !academicYearId) {
        setStudentBatches([]);
        setStudentBatchId(null);
        return;
      }
      const list = await listStudentLabBatches({ collegeId, courseId }).catch(
        () => [],
      );
      setStudentBatches(Array.isArray(list) ? list : []);
    }
    void loadStudentBatches();
  }, [collegeId, courseId, academicYearId]);

  useEffect(() => {
    if (!studentBatchId && studentBatchOptions.length > 0) {
      setStudentBatchId(n(studentBatchOptions[0].value));
    }
  }, [studentBatchId, studentBatchOptions]);

  useEffect(() => {
    async function loadStudents() {
      setSelectedIds(new Set());
      if (!collegeId || !courseGroupId || !groupSectionId || !studentBatchId) {
        setRows([]);
        setTableEnabled(false);
        return;
      }
      setLoading(true);
      const list = await listLabBatchStudentsForModify({
        collegeId,
        courseGroupId,
        groupSectionId,
        studentbatchId: studentBatchId,
      }).catch(() => []);
      const mapped = (Array.isArray(list) ? list : []).map((row, idx) => ({
        ...row,
        __rowKey: `${n(row.batchwiseStudentId) || n(row.studentId ?? row.fk_student_id) || idx + 1}`,
      }));
      setRows(mapped);
      setTableEnabled(mapped.length > 0);
      setLoading(false);
    }
    void loadStudents();
  }, [collegeId, courseGroupId, groupSectionId, studentBatchId]);

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

  function validateDates(nextFrom: Date | null, nextTo: Date | null) {
    if (!nextFrom || !nextTo) return;
    if (nextFrom.getTime() > nextTo.getTime()) {
      toastError("From date should be less than To date");
      setToDate(nextFrom);
    }
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
        minWidth: 170,
        valueGetter: (p) =>
          s(
            p.data?.rollNumber ??
              p.data?.roll_number ??
              p.data?.hallticketNumber ??
              p.data?.registerNo,
          ) || "-",
      },
      {
        headerName: "Student Name",
        minWidth: 220,
        flex: 1,
        valueGetter: (p) => studentDisplayName(p.data),
      },
      {
        headerName: "Date",
        minWidth: 220,
        valueGetter: (p) => formatDateRange(p.data?.fromDate, p.data?.toDate),
        cellClass: "text-primary",
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
              onChange={(e) => toggleRow(s(p.data?.__rowKey), e.target.checked)}
            />
          </div>
        ),
      },
    ],
    [selectedIds, allSelected],
  );

  async function reloadBatchStudents() {
    if (!collegeId || !courseGroupId || !groupSectionId || !studentBatchId)
      return;
    const list = await listLabBatchStudentsForModify({
      collegeId,
      courseGroupId,
      groupSectionId,
      studentbatchId: studentBatchId,
    }).catch(() => []);
    const mapped = (Array.isArray(list) ? list : []).map((row, idx) => ({
      ...row,
      __rowKey: `${n(row.batchwiseStudentId) || n(row.studentId ?? row.fk_student_id) || idx + 1}`,
    }));
    setRows(mapped);
    setTableEnabled(mapped.length > 0);
  }

  async function onChange() {
    if (!fromDate || !toDate) {
      toastError("Please select From and To dates");
      return;
    }
    if (fromDate.getTime() > toDate.getTime()) {
      toastError("From date should be less than To date");
      return;
    }
    if (!targetStudentBatchId) {
      toastError("Please select target batch");
      return;
    }
    if (targetStudentBatchId === studentBatchId) {
      toastError("Change to a different batch");
      return;
    }
    if (selectedIds.size === 0) {
      toastError("Please select at least one student");
      return;
    }

    const selectedRows = rows.filter((r) => selectedIds.has(s(r.__rowKey)));
    const payload: AnyRow[] = [];
    for (const student of selectedRows) {
      payload.push({
        academicYearId: n(
          student.academicYearId ?? student.fk_academic_year_id,
        ),
        batchId: n(student.batchId),
        batchwiseStudentId: n(student.batchwiseStudentId),
        createdDt: student.createdDt,
        collegeId: n(student.collegeId ?? student.fk_college_id ?? collegeId),
        courseYearId: n(student.courseYearId ?? student.fk_course_year_id),
        electiveGroupyrMappingId: student.electiveGroupyrMappingId,
        electiveGroupCode: student.electiveGroupCode,
        fromDate: student.fromDate,
        groupSectionId: n(
          student.groupSectionId ??
            student.fk_group_section_id ??
            groupSectionId,
        ),
        isActive: true,
        regulationId: n(student.regulationId ?? student.fk_regulation_id),
        studentId: n(student.studentId ?? student.fk_student_id),
        studentbatchId: n(
          student.studentbatchId ?? student.studentBatchId ?? studentBatchId,
        ),
        subjectId: n(student.subjectId),
        subjectType: student.subjectType,
        toDate: dayBefore(fromDate),
      });
      payload.push({
        academicYearId: n(
          student.academicYearId ?? student.fk_academic_year_id,
        ),
        batchId: n(student.batchId),
        batchwiseStudentId: null,
        collegeId: n(student.collegeId ?? student.fk_college_id ?? collegeId),
        courseYearId: n(student.courseYearId ?? student.fk_course_year_id),
        electiveGroupyrMappingId: student.electiveGroupyrMappingId,
        electiveGroupCode: student.electiveGroupCode,
        fromDate: toDateTime(fromDate),
        groupSectionId: n(
          student.groupSectionId ??
            student.fk_group_section_id ??
            groupSectionId,
        ),
        isActive: true,
        regulationId: n(student.regulationId ?? student.fk_regulation_id),
        studentId: n(student.studentId ?? student.fk_student_id),
        studentbatchId: targetStudentBatchId,
        subjectId: n(student.subjectId),
        subjectType: student.subjectType,
        toDate: toDateTime(toDate),
      });
    }

    setSaving(true);
    try {
      await submitLabBatchChange(payload);
      toastSuccess("Student lab batches updated successfully");
      setSelectedIds(new Set());
      setTargetStudentBatchId(null);
      await reloadBatchStudents();
    } catch {
      toastError("Failed to update student lab batches");
    } finally {
      setSaving(false);
    }
  }

  return (
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
              label: s(x.course_year_name),
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
            value={studentBatchId ? String(studentBatchId) : null}
            onChange={(v) => setStudentBatchId(v ? Number(v) : null)}
            options={studentBatchOptions}
            searchable
            className="md:col-span-2"
          />
        </div>
      }
      rowData={tableEnabled ? rows : []}
      columnDefs={studentColumnDefs}
      loading={loading}
      pagination
      toolbar={{ search: true, searchPlaceholder: "Search students" }}
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
                onChange={(d) => {
                  setFromDate(d);
                  validateDates(d, toDate);
                }}
                placeholder="Select date"
              />
              <DatePicker
                label="To Date"
                value={toDate}
                onChange={(d) => {
                  setToDate(d);
                  validateDates(fromDate, d);
                }}
                placeholder="Select date"
              />
              <Select
                label="Change Batch To *"
                value={
                  targetStudentBatchId ? String(targetStudentBatchId) : null
                }
                onChange={(v) => setTargetStudentBatchId(v ? Number(v) : null)}
                options={studentBatchOptions.filter(
                  (x) => n(x.value) !== (studentBatchId ?? 0),
                )}
                searchable
              />
              <div className="flex justify-end pt-1">
                <Button
                  type="button"
                  className="h-8 px-5"
                  onClick={() => {
                    void onChange();
                  }}
                  disabled={saving || !targetStudentBatchId}
                >
                  Change
                </Button>
              </div>
            </div>
          </div>
        ) : undefined
      }
    />
  );
}
