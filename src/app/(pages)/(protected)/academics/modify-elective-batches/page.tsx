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
  listStaffMappingSections,
  listSectionElectiveGroups,
  listElectiveBatchStudents,
  submitElectiveBatchChange,
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
const toDateTime = (d: Date | null): string => {
  if (!d) return "";
  const p = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};

const electiveId = (row: AnyRow) =>
  n(
    row.electiveGroupyrMappingId ??
      row.electivegroupyrMappingId ??
      row.elective_group_yr_mapping_id,
  );
const electiveLabel = (row: AnyRow) =>
  s(row.subjectName) || s(row.subject_name) || s(row.subjectCode) || "Elective";

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

export default function ModifyElectiveBatchesPage() {
  const [filtersData, setFiltersData] = useState<AnyRow[]>([]);
  const [academicData, setAcademicData] = useState<AnyRow[]>([]);
  const [sections, setSections] = useState<AnyRow[]>([]);
  const [electiveGroups, setElectiveGroups] = useState<AnyRow[]>([]);
  const [rows, setRows] = useState<AnyRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tableEnabled, setTableEnabled] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [toDate, setToDate] = useState<Date | null>(new Date());

  const [collegeId, setCollegeId] = useState<number | null>(null);
  const [courseId, setCourseId] = useState<number | null>(null);
  const [courseGroupId, setCourseGroupId] = useState<number | null>(null);
  const [courseYearId, setCourseYearId] = useState<number | null>(null);
  const [academicYearId, setAcademicYearId] = useState<number | null>(null);
  const [groupSectionId, setGroupSectionId] = useState<number | null>(null);
  const [sourceElectiveId, setSourceElectiveId] = useState<number | null>(null);
  const [targetElectiveId, setTargetElectiveId] = useState<number | null>(null);

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
  const electiveOptions = useMemo(
    () =>
      uniq(electiveGroups, "electiveGroupyrMappingId").map((x) => ({
        value: String(electiveId(x)),
        label: electiveLabel(x),
      })),
    [electiveGroups],
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
    setSourceElectiveId(null);
    setTargetElectiveId(null);
  }, [collegeId]);
  useEffect(() => {
    if (!courseId && courses.length) setCourseId(n(courses[0].fk_course_id));
  }, [courses, courseId]);
  useEffect(() => {
    setCourseGroupId(null);
    setCourseYearId(null);
    setAcademicYearId(null);
    setGroupSectionId(null);
    setSourceElectiveId(null);
    setTargetElectiveId(null);
  }, [courseId]);
  useEffect(() => {
    if (!courseGroupId && courseGroups.length)
      setCourseGroupId(n(courseGroups[0].fk_course_group_id));
  }, [courseGroups, courseGroupId]);
  useEffect(() => {
    setCourseYearId(null);
    setAcademicYearId(null);
    setGroupSectionId(null);
    setSourceElectiveId(null);
    setTargetElectiveId(null);
  }, [courseGroupId]);
  useEffect(() => {
    if (!courseYearId && courseYears.length)
      setCourseYearId(n(courseYears[0].fk_course_year_id));
  }, [courseYears, courseYearId]);
  useEffect(() => {
    setAcademicYearId(null);
    setGroupSectionId(null);
    setSourceElectiveId(null);
    setTargetElectiveId(null);
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
    setSourceElectiveId(null);
    setTargetElectiveId(null);
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

  useEffect(() => {
    async function loadElectiveGroups() {
      setSourceElectiveId(null);
      setTargetElectiveId(null);
      setRows([]);
      setTableEnabled(false);
      if (!collegeId || !academicYearId || !groupSectionId) {
        setElectiveGroups([]);
        return;
      }
      const list = await listSectionElectiveGroups({
        collegeId,
        academicYearId,
        groupSectionId,
      }).catch(() => []);
      setElectiveGroups(Array.isArray(list) ? list : []);
    }
    void loadElectiveGroups();
  }, [collegeId, academicYearId, groupSectionId]);

  useEffect(() => {
    async function loadStudents() {
      setSelectedIds(new Set());
      if (
        !collegeId ||
        !courseGroupId ||
        !groupSectionId ||
        !sourceElectiveId
      ) {
        setRows([]);
        setTableEnabled(false);
        return;
      }
      setLoading(true);
      const list = await listElectiveBatchStudents({
        collegeId,
        courseGroupId,
        groupSectionId,
        electiveGroupyrMappingId: sourceElectiveId,
      }).catch(() => []);
      const mapped = list.map((row, i) => ({
        ...row,
        __rowKey: `${n(row.batchwiseStudentId) || n(row.studentId)}-${i}`,
      }));
      setRows(mapped);
      setTableEnabled(mapped.length > 0);
      setTargetElectiveId((prev) => prev ?? sourceElectiveId);
      setLoading(false);
    }
    void loadStudents();
  }, [collegeId, courseGroupId, groupSectionId, sourceElectiveId]);

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
        valueGetter: (p) => s(p.data?.hallticketNumber) || "-",
      },
      {
        headerName: "Student Name",
        minWidth: 220,
        flex: 1,
        valueGetter: (p) => s(p.data?.studentName) || "-",
      },
      {
        headerName: "Current Elective",
        minWidth: 180,
        valueGetter: (p) => s(p.data?.subjectName) || "-",
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

  async function onModify() {
    if (!targetElectiveId) {
      toastError("Please select the target elective");
      return;
    }
    if (selectedIds.size === 0) {
      toastError("Please select at least one student");
      return;
    }
    const selectedRows = rows.filter((r) => selectedIds.has(s(r.__rowKey)));
    const payload = selectedRows.map((student) => ({
      electiveGroupyrMappingId: targetElectiveId,
      toDate: toDateTime(toDate),
      batchwiseStudentId: n(student.batchwiseStudentId),
      subjectId: n(student.subjectId),
      studentSubjectDTOList: [
        {
          studentSubjectId: n(student.studentSubjectId),
          subjectId: n(student.subjectId),
        },
      ],
    }));
    setSaving(true);
    try {
      await submitElectiveBatchChange(payload);
      toastSuccess("Elective batches updated successfully");
      setSelectedIds(new Set());
      const list = await listElectiveBatchStudents({
        collegeId: collegeId!,
        courseGroupId: courseGroupId!,
        groupSectionId: groupSectionId!,
        electiveGroupyrMappingId: sourceElectiveId!,
      }).catch(() => []);
      setRows(
        list.map((row, i) => ({
          ...row,
          __rowKey: `${n(row.batchwiseStudentId) || n(row.studentId)}-${i}`,
        })),
      );
    } catch {
      toastError("Failed to update elective batches");
    } finally {
      setSaving(false);
    }
  }

  return (
    <FilteredListPage
      title="Modify Elective Batches"
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
            label="Elective *"
            value={sourceElectiveId ? String(sourceElectiveId) : null}
            onChange={(v) => setSourceElectiveId(v ? Number(v) : null)}
            options={electiveOptions}
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
              Modify Elective To
            </h3>
            <div className="space-y-3 p-3">
              <DatePicker
                label="To Date"
                value={toDate}
                onChange={setToDate}
                placeholder="Select date"
              />
              <Select
                label="Modify Elective To *"
                value={targetElectiveId ? String(targetElectiveId) : null}
                onChange={(v) => setTargetElectiveId(v ? Number(v) : null)}
                options={electiveOptions}
                searchable
              />
              <div className="flex justify-end pt-1">
                <Button
                  type="button"
                  className="h-8 px-5"
                  onClick={() => {
                    void onModify();
                  }}
                  disabled={saving || !targetElectiveId}
                >
                  Modify
                </Button>
              </div>
            </div>
          </div>
        ) : undefined
      }
    />
  );
}
