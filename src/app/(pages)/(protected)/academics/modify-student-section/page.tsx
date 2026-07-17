"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toastError, toastInfo, toastSuccess } from "@/lib/toast";
import {
  buildModifyStudentSectionPayload,
  getDigitalOnlineSyncFilters,
  listStudentsForModifyStudentBatches,
  listStaffMappingSections,
  submitModifyStudentSections,
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

function asRows(data: unknown): AnyRow[] {
  if (Array.isArray(data)) return data;
  return [];
}

function pickText(row: AnyRow, keys: string[]): string {
  for (const key of keys) {
    const value = row[key];
    if (value === null || value === undefined) continue;
    const out = String(value).trim();
    if (out) return out;
  }
  return "";
}

function formatDisplayDate(value: unknown): string {
  if (!value) return "-";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return s(value) || "-";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function parseSectionConflictData(data: unknown): {
  attendanceRows: AnyRow[];
  academicBatchRows: AnyRow[];
} {
  if (!data || typeof data !== "object") {
    return { attendanceRows: [], academicBatchRows: [] };
  }
  const row = data as AnyRow;
  return {
    attendanceRows: asRows(
      row.studenAttendanceDTOs ?? row.studentAttendanceDTOs,
    ),
    academicBatchRows: asRows(
      row.studentAcademicbatchDTOs ?? row.studentAcademicBatchDTOs,
    ),
  };
}

function studentDisplayName(row: AnyRow | undefined): string {
  return (
    s(
      row?.studentName ?? row?.student_name ?? row?.firstName ?? row?.fullName,
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

export default function ModifyStudentSectionPage() {
  const [filtersData, setFiltersData] = useState<AnyRow[]>([]);
  const [academicData, setAcademicData] = useState<AnyRow[]>([]);
  const [sections, setSections] = useState<AnyRow[]>([]);
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
  const [targetSectionId, setTargetSectionId] = useState<number | null>(null);
  const [conflictOpen, setConflictOpen] = useState(false);
  const [attendanceRows, setAttendanceRows] = useState<AnyRow[]>([]);
  const [academicBatchRows, setAcademicBatchRows] = useState<AnyRow[]>([]);

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
    setTargetSectionId(null);
  }, [collegeId]);
  useEffect(() => {
    if (!courseId && courses.length) setCourseId(n(courses[0].fk_course_id));
  }, [courses, courseId]);
  useEffect(() => {
    setCourseGroupId(null);
    setCourseYearId(null);
    setAcademicYearId(null);
    setGroupSectionId(null);
    setTargetSectionId(null);
  }, [courseId]);
  useEffect(() => {
    if (!courseGroupId && courseGroups.length)
      setCourseGroupId(n(courseGroups[0].fk_course_group_id));
  }, [courseGroups, courseGroupId]);
  useEffect(() => {
    setCourseYearId(null);
    setAcademicYearId(null);
    setGroupSectionId(null);
    setTargetSectionId(null);
  }, [courseGroupId]);
  useEffect(() => {
    if (!courseYearId && courseYears.length)
      setCourseYearId(n(courseYears[0].fk_course_year_id));
  }, [courseYears, courseYearId]);
  useEffect(() => {
    setAcademicYearId(null);
    setGroupSectionId(null);
    setTargetSectionId(null);
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
    setTargetSectionId(null);
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

  const reloadStudents = useCallback(async () => {
    if (!collegeId || !courseGroupId || !groupSectionId) {
      setRows([]);
      setTableEnabled(false);
      return;
    }
    setLoading(true);
    const list = await listStudentsForModifyStudentBatches({
      collegeId,
      courseGroupId,
      groupSectionId,
    }).catch(() => []);
    const mapped = (Array.isArray(list) ? list : []).map((row, idx) => ({
      ...row,
      __rowKey: `${n(row.studentId ?? row.fk_student_id) || idx + 1}`,
    }));
    setRows(mapped);
    setTableEnabled(mapped.length > 0);
    setSelectedIds(new Set());
    setLoading(false);
  }, [collegeId, courseGroupId, groupSectionId]);

  useEffect(() => {
    void reloadStudents();
  }, [reloadStudents]);

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
            p.data?.registerNo ??
              p.data?.register_number ??
              p.data?.rollNumber ??
              p.data?.hallticketNumber,
          ) || "-",
      },
      {
        headerName: "Student Name",
        minWidth: 220,
        flex: 1,
        valueGetter: (p) => studentDisplayName(p.data),
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

  async function onSave() {
    if (!fromDate || !toDate) {
      toastError("Please select From and To dates");
      return;
    }
    if (fromDate.getTime() > toDate.getTime()) {
      toastError("From date should be less than To date");
      return;
    }
    if (!targetSectionId) {
      toastError("Please select target section");
      return;
    }
    if (targetSectionId === groupSectionId) {
      toastInfo("Change to different section.");
      return;
    }
    if (selectedIds.size === 0) {
      toastError("Please select at least one student");
      return;
    }
    const selectedRows = rows.filter((r) => selectedIds.has(s(r.__rowKey)));
    const payload = selectedRows.map((student) =>
      buildModifyStudentSectionPayload(
        student,
        targetSectionId,
        fromDate,
        toDate,
      ),
    );
    setSaving(true);
    try {
      const result = await submitModifyStudentSections(payload);
      const success = result.success !== false;
      const conflicts = parseSectionConflictData(result.data);
      setAttendanceRows(conflicts.attendanceRows);
      setAcademicBatchRows(conflicts.academicBatchRows);
      setSelectedIds(new Set());
      setTargetSectionId(null);
      await reloadStudents();
      if (success) {
        toastSuccess(
          typeof result.message === "string" && result.message
            ? result.message
            : "Student sections updated successfully",
        );
      } else {
        toastInfo(
          typeof result.message === "string" && result.message
            ? result.message
            : "Section change completed with conflicts.",
        );
        setConflictOpen(true);
      }
    } catch (e) {
      toastError(e, "Failed to update student sections");
    } finally {
      setSaving(false);
    }
  }

  const defaultConflictTab =
    attendanceRows.length > 0 ? "attendance" : "academic-batches";

  return (
    <>
      <FilteredListPage
        title="Modify Student Section"
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
                Change Section To
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
                  label="Change Section To *"
                  value={targetSectionId ? String(targetSectionId) : null}
                  onChange={(v) => setTargetSectionId(v ? Number(v) : null)}
                  options={sectionOptions.filter(
                    (x) => n(x.value) !== (groupSectionId ?? 0),
                  )}
                  searchable
                />
                <div className="flex justify-end pt-1">
                  <Button
                    type="button"
                    className="h-8 px-5"
                    onClick={() => {
                      void onSave();
                    }}
                    disabled={saving || !targetSectionId}
                  >
                    Change
                  </Button>
                </div>
              </div>
            </div>
          ) : undefined
        }
      />
      <Dialog open={conflictOpen} onOpenChange={setConflictOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Students Attendance Details</DialogTitle>
          </DialogHeader>
          <Tabs key={defaultConflictTab} defaultValue={defaultConflictTab}>
            <TabsList>
              {attendanceRows.length > 0 ? (
                <TabsTrigger value="attendance">Attendance</TabsTrigger>
              ) : null}
              <TabsTrigger value="academic-batches">
                Academic Batches
              </TabsTrigger>
            </TabsList>
            {attendanceRows.length > 0 ? (
              <TabsContent value="attendance">
                <div className="max-h-[45vh] overflow-auto rounded border">
                  <table className="w-full text-[12px]">
                    <thead className="bg-muted/40">
                      <tr>
                        <th className="px-2 py-1 text-left">SI.No</th>
                        <th className="px-2 py-1 text-left">Student</th>
                        <th className="px-2 py-1 text-left">Subject Name</th>
                        <th className="px-2 py-1 text-left">Employee</th>
                        <th className="px-2 py-1 text-left">
                          Attendance Taken Date
                        </th>
                        <th className="px-2 py-1 text-left">Course</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendanceRows.map((row, index) => (
                        <tr key={`att-${index}`} className="border-t">
                          <td className="px-2 py-1">{index + 1}</td>
                          <td className="px-2 py-1">
                            {pickText(row, [
                              "stdName",
                              "studentName",
                              "firstName",
                            ])}{" "}
                            (
                            <span className="font-medium text-blue-700">
                              {pickText(row, [
                                "rollNumber",
                                "hallticketNumber",
                              ])}
                            </span>
                            )
                          </td>
                          <td className="px-2 py-1">
                            {pickText(row, ["subjectName"]) || "-"}
                          </td>
                          <td className="px-2 py-1">
                            {pickText(row, ["classTakenByEmployeeFirstName"])} (
                            <span className="font-medium text-blue-700">
                              {pickText(row, ["classTakenByEmployeeNumber"])}
                            </span>
                            )
                          </td>
                          <td className="px-2 py-1">
                            {formatDisplayDate(row.attendanceTakenDate)}
                          </td>
                          <td className="px-2 py-1">
                            {[
                              pickText(row, ["collegeCode"]),
                              pickText(row, ["academicYear"]),
                              pickText(row, ["courseCode"]),
                              pickText(row, ["groupCode"]),
                              pickText(row, ["courseYearCode"]),
                              pickText(row, ["section"]),
                            ]
                              .filter(Boolean)
                              .join(" / ") || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </TabsContent>
            ) : null}
            <TabsContent value="academic-batches">
              <div className="max-h-[45vh] overflow-auto rounded border">
                <table className="w-full text-[12px]">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="px-2 py-1 text-left">SI.No</th>
                      <th className="px-2 py-1 text-left">Student</th>
                      <th className="px-2 py-1 text-left">Regulation</th>
                      <th className="px-2 py-1 text-left">Course</th>
                      <th className="px-2 py-1 text-left">From Date</th>
                      <th className="px-2 py-1 text-left">To Date</th>
                      <th className="px-2 py-1 text-left">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {academicBatchRows.length === 0 ? (
                      <tr className="border-t">
                        <td className="px-2 py-2 text-rose-600" colSpan={7}>
                          No academic batches found for this date.
                        </td>
                      </tr>
                    ) : (
                      academicBatchRows.map((row, index) => (
                        <tr key={`batch-${index}`} className="border-t">
                          <td className="px-2 py-1">{index + 1}</td>
                          <td className="px-2 py-1">
                            {pickText(row, ["firstName", "studentName"])} (
                            <span className="font-medium text-blue-700">
                              {pickText(row, ["rollNo", "rollNumber"])}
                            </span>
                            )
                          </td>
                          <td className="px-2 py-1">
                            {pickText(row, ["regulationName"]) || "-"}
                          </td>
                          <td className="px-2 py-1">
                            {[
                              pickText(row, ["collegeCode"]),
                              pickText(row, ["academicYear"]),
                              pickText(row, ["courseCode"]),
                              pickText(row, ["groupCode"]),
                              pickText(row, ["fromCourseYearName"]),
                              pickText(row, ["fromGroupSectionName"]),
                            ]
                              .filter(Boolean)
                              .join(" / ") || "-"}
                          </td>
                          <td className="px-2 py-1">
                            {formatDisplayDate(row.fromDate)}
                          </td>
                          <td className="px-2 py-1">
                            {formatDisplayDate(row.toDate)}
                          </td>
                          <td className="px-2 py-1">
                            {pickText(row, ["reason"]) || "-"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConflictOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
