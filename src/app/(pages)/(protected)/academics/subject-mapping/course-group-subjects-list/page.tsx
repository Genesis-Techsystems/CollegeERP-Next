"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye } from "lucide-react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { DataTable } from "@/common/components/table";
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
import { Input } from "@/components/ui/input";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  getDigitalOnlineSyncFilters,
  listStaffSubjectRows,
  listStaffMappingSections,
  listActiveEmployeesByCollege,
  saveStaffSubjectMappings,
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

/** Angular `genericFunctions.moment()` — presentDate (DD-MM-YYYY) → ISO UTC midnight. */
function presentDateIso(): string {
  const raw = String(localStorage.getItem("presentDate") ?? "").trim();
  const m = raw.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (m) {
    const [, dd, mm, yyyy] = m;
    return new Date(Date.UTC(+yyyy, +mm - 1, +dd)).toISOString();
  }
  const d = new Date();
  return new Date(
    Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()),
  ).toISOString();
}

/** Angular `genericFunctions.momentWithDateFormatYMD(moment())` → YYYY-MM-DD. */
function presentDateYmd(): string {
  return presentDateIso().slice(0, 10);
}

function makeActionsRenderer(
  onAssign: (row: AnyRow) => void,
  onView: (row: AnyRow) => void,
) {
  return (p: ICellRendererParams<AnyRow>) => (
    <div className="flex items-center gap-2 h-full">
      <button
        type="button"
        className="text-blue-700 text-xs font-medium hover:underline"
        onClick={() => onAssign(p.data ?? {})}
      >
        Assign
      </button>
      <span className="text-muted-foreground">|</span>
      <button
        type="button"
        className="inline-flex items-center"
        onClick={() => onView(p.data ?? {})}
        title="View Staff Details"
      >
        <Eye className="h-3.5 w-3.5 text-slate-600" />
      </button>
    </div>
  );
}

function makeEmployeeCheckboxRenderer(
  checked: Set<number>,
  setChecked: (next: Set<number>) => void,
) {
  return (p: ICellRendererParams<AnyRow>) => {
    const id = n(p.data?.employeeId);
    return (
      <input
        type="checkbox"
        checked={checked.has(id)}
        onChange={(e) => {
          const next = new Set(checked);
          if (e.target.checked) next.add(id);
          else next.delete(id);
          setChecked(next);
        }}
      />
    );
  };
}

export default function StaffSubjectMappingPage() {
  const [filtersData, setFiltersData] = useState<AnyRow[]>([]);
  const [academicData, setAcademicData] = useState<AnyRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [collegeId, setCollegeId] = useState<number | null>(null);
  const [courseId, setCourseId] = useState<number | null>(null);
  const [courseGroupId, setCourseGroupId] = useState<number | null>(null);
  const [courseYearId, setCourseYearId] = useState<number | null>(null);
  const [academicYearId, setAcademicYearId] = useState<number | null>(null);
  const [groupSectionId, setGroupSectionId] = useState<number | null>(null);
  const [sections, setSections] = useState<AnyRow[]>([]);

  const [rows, setRows] = useState<AnyRow[]>([]);
  const [assignOpen, setAssignOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<AnyRow | null>(null);
  const [employees, setEmployees] = useState<AnyRow[]>([]);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  /** Angular modal `checkedEmployees` — assigned staff at dialog open (not live-updated). */
  const [assignedStaffSummary, setAssignedStaffSummary] = useState<AnyRow[]>(
    [],
  );
  const [employeeSearch, setEmployeeSearch] = useState("");

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
    setRows([]);
  }, [collegeId]);
  useEffect(() => {
    if (!courseId && courses.length) setCourseId(n(courses[0].fk_course_id));
  }, [courses, courseId]);
  useEffect(() => {
    setCourseGroupId(null);
    setCourseYearId(null);
    setAcademicYearId(null);
    setGroupSectionId(null);
    setRows([]);
  }, [courseId]);
  useEffect(() => {
    if (!courseGroupId && courseGroups.length)
      setCourseGroupId(n(courseGroups[0].fk_course_group_id));
  }, [courseGroups, courseGroupId]);
  useEffect(() => {
    setCourseYearId(null);
    setAcademicYearId(null);
    setGroupSectionId(null);
    setRows([]);
  }, [courseGroupId]);
  useEffect(() => {
    if (!courseYearId && courseYears.length)
      setCourseYearId(n(courseYears[0].fk_course_year_id));
  }, [courseYears, courseYearId]);
  useEffect(() => {
    setAcademicYearId(null);
    setGroupSectionId(null);
    setRows([]);
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
    setRows([]);
    setSections([]);
  }, [academicYearId]);
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
    if (!collegeId || !academicYearId || !groupSectionId) return setRows([]);
    setLoading(true);
    listStaffSubjectRows({ collegeId, academicYearId, groupSectionId })
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [collegeId, academicYearId, groupSectionId]);

  const contextLine = useMemo(() => {
    const clg = s(
      colleges.find((x) => n(x.fk_college_id) === collegeId)?.college_code,
    );
    const ay = s(
      academicYears.find((x) => n(x.fk_academic_year_id) === academicYearId)
        ?.academic_year,
    );
    const c = s(
      courses.find((x) => n(x.fk_course_id) === courseId)?.course_code,
    );
    const g = s(
      courseGroups.find((x) => n(x.fk_course_group_id) === courseGroupId)
        ?.group_code,
    );
    const y = s(
      courseYears.find((x) => n(x.fk_course_year_id) === courseYearId)
        ?.course_year_name,
    );
    const sec = s(
      sections.find(
        (x) => n(x.pk_group_section_id ?? x.groupSectionId) === groupSectionId,
      )?.section,
    );
    return [clg, ay, c, g, y, sec].filter(Boolean).join(" / ");
  }, [
    colleges,
    academicYears,
    courses,
    courseGroups,
    courseYears,
    sections,
    collegeId,
    academicYearId,
    courseId,
    courseGroupId,
    courseYearId,
    groupSectionId,
  ]);

  function renderStaffCell(p: ICellRendererParams<AnyRow>) {
    const staff = Array.isArray(p.data?.staffCourseyrSubjects)
      ? p.data.staffCourseyrSubjects
      : [];
    if (staff.length === 0)
      return <span className="text-red-600">Not Assigned</span>;
    const names = staff
      .map((x: AnyRow) =>
        [x.firstName, x.middleName, x.lastName]
          .filter(Boolean)
          .join(" ")
          .trim(),
      )
      .filter(Boolean);
    return <span>{names.length ? names.join(", ") : "-"}</span>;
  }

  async function openAssign(row: AnyRow) {
    if (!collegeId || !academicYearId) return;
    setSelectedRow(row);
    setAssignOpen(true);
    setEmployeeSearch("");
    const list = await listActiveEmployeesByCollege(collegeId).catch(() => []);
    const existing = Array.isArray(row.staffCourseyrSubjects)
      ? (row.staffCourseyrSubjects as AnyRow[])
      : [];
    const existingByEmp = new Map<number, AnyRow>(
      existing.map((x) => [n(x.employeeId), x]),
    );
    const mapped = new Set<number>();
    const summary: AnyRow[] = [];
    // Angular assign-staff-subject-modal ngOnInit: merge staffCourseyrSubjects onto employees
    const enriched = list.map((emp) => {
      const employeeId = n(emp.employeeId);
      const found = existingByEmp.get(employeeId);
      if (!found) {
        return { ...emp, checked: false, isActive: true };
      }
      mapped.add(employeeId);
      const merged = {
        ...emp,
        checked: true,
        isActive: true,
        staffCourseyrSubjectId: found.staffCourseyrSubjectId,
        fromDate: found.fromDate,
        toDate: found.toDate,
        subjectCourseyearId: n(
          row.subjectCourseyearId ?? found.subjectCourseyearId,
        ),
        collegeId,
        academicYearId,
      };
      summary.push(merged);
      return merged;
    });
    setEmployees(enriched);
    setChecked(mapped);
    setAssignedStaffSummary(summary);
  }

  async function saveAssign() {
    if (!selectedRow || !collegeId || !academicYearId) return;
    // Angular AssignStaffSubjectModalComponent.submit()
    const payload: AnyRow[] = [];
    const subjectCourseyearId = n(selectedRow.subjectCourseyearId);
    const fromDateIso = presentDateIso();
    const toDateYmd = presentDateYmd();

    for (const emp of employees) {
      const employeeId = n(emp.employeeId);
      if (!employeeId) continue;
      const isChecked = checked.has(employeeId);
      const mappingId = emp.staffCourseyrSubjectId;
      if (mappingId) {
        if (!isChecked) {
          payload.push({
            ...emp,
            isActive: false,
            toDate: toDateYmd,
          });
        } else {
          payload.push(emp);
        }
      } else if (isChecked) {
        payload.push({
          ...emp,
          subjectCourseyearId,
          collegeId,
          fromDate: fromDateIso,
          toDate: "9999-12-31",
          academicYearId,
        });
      }
    }
    try {
      await saveStaffSubjectMappings(payload);
      toastSuccess("Staff mapping saved");
      setAssignOpen(false);
      setAssignedStaffSummary([]);
      const refreshed = await listStaffSubjectRows({
        collegeId,
        academicYearId,
        groupSectionId: n(groupSectionId),
      });
      setRows(refreshed);
    } catch {
      toastError("Failed to save staff mapping");
    }
  }

  const columnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      {
        headerName: "SI.No",
        valueGetter: (p: any) => (p.node?.rowIndex ?? 0) + 1,
        minWidth: 70,
        maxWidth: 80,
        flex: 0,
      },
      {
        field: "subjectCode",
        headerName: "Subject Code",
        minWidth: 120,
        flex: 1,
      },
      { field: "subjectName", headerName: "Subject", minWidth: 180, flex: 1.2 },
      {
        field: "subjectType",
        headerName: "Subject Type",
        minWidth: 120,
        flex: 1,
      },
      {
        field: "regulationName",
        headerName: "Regulation",
        minWidth: 110,
        flex: 1,
      },
      {
        headerName: "Staff",
        minWidth: 220,
        flex: 1.5,
        cellRenderer: renderStaffCell,
      },
      {
        headerName: "Actions",
        minWidth: 140,
        maxWidth: 160,
        flex: 0,
        cellRenderer: makeActionsRenderer(
          (row) => {
            void openAssign(row);
          },
          (row) => {
            setSelectedRow(row);
            setViewOpen(true);
          },
        ),
      },
    ],
    [openAssign],
  );

  const viewCourseLine = useMemo(() => {
    const clg = s(
      colleges.find((x) => n(x.fk_college_id) === collegeId)?.college_code,
    );
    const c = s(
      courses.find((x) => n(x.fk_course_id) === courseId)?.course_code,
    );
    const g = s(
      courseGroups.find((x) => n(x.fk_course_group_id) === courseGroupId)
        ?.group_code,
    );
    const y = s(
      courseYears.find((x) => n(x.fk_course_year_id) === courseYearId)
        ?.course_year_name,
    );
    const sec = s(
      sections.find(
        (x) => n(x.pk_group_section_id ?? x.groupSectionId) === groupSectionId,
      )?.section,
    );
    return [clg, c, g, y, sec].filter(Boolean).join(" / ");
  }, [
    colleges,
    courses,
    courseGroups,
    courseYears,
    sections,
    collegeId,
    courseId,
    courseGroupId,
    courseYearId,
    groupSectionId,
  ]);

  const viewStaffRows = useMemo(() => {
    const staff = Array.isArray(selectedRow?.staffCourseyrSubjects)
      ? (selectedRow.staffCourseyrSubjects as AnyRow[])
      : [];
    return staff.map((x) => ({
      ...x,
      staffName:
        [x.firstName, x.middleName, x.lastName]
          .filter(Boolean)
          .join(" ")
          .trim() || "-",
      designationName: s(x.designationName) || "-",
      deptName: s(x.deptName) || "-",
    }));
  }, [selectedRow]);

  const filteredEmployees = useMemo(() => {
    const q = employeeSearch.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((row) => {
      const fullName = [row.firstName, row.middleName, row.lastName]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return (
        s(row.empNumber).toLowerCase().includes(q) ||
        fullName.includes(q) ||
        s(row.deptName).toLowerCase().includes(q)
      );
    });
  }, [employees, employeeSearch]);

  return (
    <>
      <FilteredListPage
        title="Staff Subject Mapping"
        notice={
          rows.length > 0 ? (
            <div className="px-1 text-[13px] text-blue-700 font-medium">
              {contextLine}
            </div>
          ) : undefined
        }
        filters={
          <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
            <Select
              label="College"
              value={collegeId ? String(collegeId) : null}
              onChange={(v) => setCollegeId(v ? Number(v) : null)}
              options={colleges.map((x) => ({
                value: String(n(x.fk_college_id)),
                label: s(x.college_code),
              }))}
              searchable
            />
            <Select
              label="Course"
              value={courseId ? String(courseId) : null}
              onChange={(v) => setCourseId(v ? Number(v) : null)}
              options={courses.map((x) => ({
                value: String(n(x.fk_course_id)),
                label: s(x.course_code),
              }))}
              searchable
              disabled={!collegeId}
            />
            <Select
              label="Course Group"
              value={courseGroupId ? String(courseGroupId) : null}
              onChange={(v) => setCourseGroupId(v ? Number(v) : null)}
              options={courseGroups.map((x) => ({
                value: String(n(x.fk_course_group_id)),
                label: s(x.group_code),
              }))}
              searchable
              disabled={!courseId}
            />
            <Select
              label="Course Year"
              value={courseYearId ? String(courseYearId) : null}
              onChange={(v) => setCourseYearId(v ? Number(v) : null)}
              options={courseYears.map((x) => ({
                value: String(n(x.fk_course_year_id)),
                label: s(x.course_year_name),
              }))}
              searchable
              disabled={!courseGroupId}
            />
            <Select
              label="Academic Year"
              value={academicYearId ? String(academicYearId) : null}
              onChange={(v) => setAcademicYearId(v ? Number(v) : null)}
              options={academicYears.map((x) => ({
                value: String(n(x.fk_academic_year_id)),
                label: s(x.academic_year),
              }))}
              searchable
              disabled={!courseYearId}
            />
            <Select
              label="Section"
              value={groupSectionId ? String(groupSectionId) : null}
              onChange={(v) => setGroupSectionId(v ? Number(v) : null)}
              options={sections.map((x) => ({
                value: String(n(x.pk_group_section_id ?? x.groupSectionId)),
                label: s(x.section),
              }))}
              searchable
              disabled={!academicYearId}
            />
          </div>
        }
        rowData={rows}
        columnDefs={columnDefs}
        loading={loading}
        toolbar={{ search: true, searchPlaceholder: "Search" }}
        pagination
        paginationPageSize={10}
      />

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-hidden p-0 flex flex-col gap-0">
          <DialogHeader className="px-4 pt-3 pb-2 pr-12 border-b bg-background">
            <DialogTitle className="text-base font-semibold leading-none text-[hsl(var(--primary))]">
              Staff List
            </DialogTitle>
          </DialogHeader>
          <div className="px-4 py-3 space-y-3 flex-1 overflow-y-auto">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <Input
                value={employeeSearch}
                onChange={(e) => setEmployeeSearch(e.target.value)}
                placeholder="Employee Number / Name / Department"
                className="h-9 max-w-md"
              />
              {assignedStaffSummary.length > 0 ? (
                <div className="flex gap-2 text-[13px] min-w-0 sm:max-w-[45%]">
                  <strong className="shrink-0">Assigned Staff :</strong>
                  <div className="min-w-0 space-y-0.5">
                    {assignedStaffSummary.map((item) => (
                      <p key={n(item.employeeId)} className="truncate">
                        {s(item.firstName)} -{" "}
                        <span className="text-blue-700">
                          {s(item.empNumber)}
                        </span>
                      </p>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <DataTable
              rowData={filteredEmployees}
              columnDefs={[
                {
                  headerName: "Select",
                  minWidth: 72,
                  maxWidth: 84,
                  flex: 0,
                  cellRenderer: makeEmployeeCheckboxRenderer(
                    checked,
                    setChecked,
                  ),
                },
                {
                  field: "empNumber",
                  headerName: "Employee No",
                  minWidth: 130,
                  flex: 1,
                },
                {
                  headerName: "Staff Name",
                  minWidth: 210,
                  flex: 1.4,
                  valueGetter: (p: any) =>
                    [p.data?.firstName, p.data?.middleName, p.data?.lastName]
                      .filter(Boolean)
                      .join(" "),
                },
                {
                  field: "designationName",
                  headerName: "Designation",
                  minWidth: 170,
                  flex: 1.1,
                },
                {
                  field: "deptName",
                  headerName: "Department",
                  minWidth: 140,
                  flex: 1.1,
                },
              ]}
              pagination
              paginationPageSize={10}
            />
          </div>
          <DialogFooter className="px-4 py-3 border-t bg-background">
            <Button variant="outline" onClick={() => setAssignOpen(false)}>
              Close
            </Button>
            <Button
              onClick={() => {
                void saveAssign();
              }}
            >
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Angular subject-staff-list-modal */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden p-0 flex flex-col gap-0">
          <DialogHeader className="px-4 pt-3 pb-2 pr-12 border-b bg-background">
            <DialogTitle className="text-base font-semibold leading-none text-[hsl(var(--primary))]">
              Staff List
            </DialogTitle>
          </DialogHeader>
          <div className="px-4 py-3 space-y-3 flex-1 overflow-y-auto">
            <div className="rounded border border-border px-3 py-2 text-[13px]">
              <div className="grid grid-cols-1 gap-1 md:grid-cols-2">
                <p>
                  <span className="font-medium">Course:</span> {viewCourseLine}
                </p>
                <p className="md:text-right">
                  <span className="font-medium">Regulation:</span>{" "}
                  {s(selectedRow?.regulationName)}
                </p>
                <p>
                  <span className="font-medium">Subject:</span>{" "}
                  {s(selectedRow?.subjectName)}{" "}
                  <span className="text-blue-700">
                    ({s(selectedRow?.subjectCode)})
                  </span>
                </p>
                <p className="md:text-right">
                  <span className="font-medium">Subject Type :</span>{" "}
                  {s(selectedRow?.subjectType)}
                </p>
              </div>
            </div>
            <div className="app-card p-0 overflow-hidden">
              <DataTable
                rowData={viewStaffRows}
                columnDefs={[
                  {
                    field: "staffName",
                    headerName: "Staff Name",
                    minWidth: 200,
                    flex: 1.4,
                  },
                  {
                    field: "designationName",
                    headerName: "Designation",
                    minWidth: 160,
                    flex: 1.1,
                  },
                  {
                    field: "deptName",
                    headerName: "Department",
                    minWidth: 140,
                    flex: 1,
                  },
                ]}
                toolbar={false}
                pagination={false}
              />
            </div>
          </div>
          <DialogFooter className="px-4 py-3 border-t bg-background">
            <Button variant="outline" onClick={() => setViewOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
