"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
import { Select } from "@/common/components/select";
import { StudentSearchSelect } from "@/common/components/student-search";
import { DataTable } from "@/common/components/table";
import { FilteredPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useSession } from "@/hooks/useSession";
import { toastError, toastSuccess } from "@/lib/toast";
import { rowIndexGetter } from "@/lib/utils";
import {
  buildFeeManagementSavePayloads,
  getFeeMasterCollegeFilters,
  listFeeCategoriesByCollege,
  listFeeManagementStudentsByFilters,
  listFeeParticularsByCollege,
  listOrganizations,
  listPaySchedulesForFeeManagement,
  patchFeeManagementStudentDetail,
  saveFeeManagementStudentDetails,
  searchFeeManagementStudents,
} from "@/services";
import type { Organization } from "@/types/organization";
import type { FeeManagementStudentRow } from "@/types/fees-collection";
import {
  academicYearOption,
  collegeOption,
  courseGroupOption,
  courseOption,
  courseYearOption,
  filterAcademicYearsByUniversity,
  filterColleges,
  filterCourseGroups,
  filterCourses,
  filterCourseYears,
  pickNum,
  type FilterRow,
} from "../../fee-masters/_lib/fee-master-filters";

type Mode = "student" | "all";

function ensureDto(row: FeeManagementStudentRow): FeeManagementStudentRow {
  const dtos = row.feeManagmentStdDetailsDtos;
  if (Array.isArray(dtos) && dtos.length > 0) return row;
  return { ...row, feeManagmentStdDetailsDtos: [{}] };
}

function studentChip(row: FeeManagementStudentRow | undefined): string {
  if (!row) return "";
  return [
    row.collegeCode,
    row.academicYear,
    row.courseCode,
    row.groupCode,
    row.courseYearName,
  ]
    .map((p) => (p && String(p).trim() ? String(p).trim() : ""))
    .join(" | ");
}

function lateralTag(row: FeeManagementStudentRow): string {
  if (row.isLateral === true) return "(LATERAL)";
  return "(REG)";
}

export default function StudentFeeManagementPage() {
  const { user } = useSession();
  const [mode, setMode] = useState<Mode>("student");

  const [paySchedules, setPaySchedules] = useState<
    { value: string; label: string }[]
  >([]);
  const [categories, setCategories] = useState<
    { value: string; label: string }[]
  >([]);
  const [particulars, setParticulars] = useState<
    { value: string; label: string }[]
  >([]);

  const [searchRows, setSearchRows] = useState<FeeManagementStudentRow[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [studentId, setStudentId] = useState<number | null>(null);
  const [selectedStudent, setSelectedStudent] =
    useState<FeeManagementStudentRow | null>(null);

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [filtersData, setFiltersData] = useState<FilterRow[]>([]);
  const [academicData, setAcademicData] = useState<FilterRow[]>([]);
  const [loadingFilters, setLoadingFilters] = useState(false);

  const [organizationId, setOrganizationId] = useState<number | null>(null);
  const [collegeId, setCollegeId] = useState<number | null>(null);
  const [academicYearId, setAcademicYearId] = useState<number | null>(null);
  const [courseId, setCourseId] = useState<number | null>(null);
  const [courseGroupId, setCourseGroupId] = useState<number | null>(null);
  const [courseYearId, setCourseYearId] = useState<number | null>(null);

  const [rows, setRows] = useState<FeeManagementStudentRow[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadSchedules() {
      try {
        const list = await listPaySchedulesForFeeManagement();
        if (cancelled) return;
        setPaySchedules(
          (list ?? []).map((g) => ({
            value: String(g.generalDetailId),
            label: String(
              g.generalDetailDisplayName ??
                g.generalDetailName ??
                g.generalDetailId,
            ),
          })),
        );
      } catch (err) {
        if (!cancelled) toastError(err, "Failed to load fee schedules");
      }
    }
    void loadSchedules();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadCategoriesParticulars = useCallback(async (cid: number) => {
    if (!cid) {
      setCategories([]);
      setParticulars([]);
      return;
    }
    try {
      const [cats, parts] = await Promise.all([
        listFeeCategoriesByCollege(cid),
        listFeeParticularsByCollege(cid),
      ]);
      setCategories(
        (cats ?? []).map((c) => ({
          value: String(c.feeCategoryId),
          label: c.categoryName || String(c.feeCategoryId),
        })),
      );
      setParticulars(
        (parts ?? []).map((p) => ({
          value: String(p.feeParticularsId),
          label: p.particularsName || String(p.feeParticularsId),
        })),
      );
    } catch (err) {
      toastError(err, "Failed to load fee categories / particulars");
      setCategories([]);
      setParticulars([]);
    }
  }, []);

  const orgOptions = useMemo(
    () =>
      organizations
        .filter((o) => o.isActive !== false)
        .map((o) => ({
          value: String(o.organizationId),
          label: o.orgCode || o.orgName || String(o.organizationId),
        })),
    [organizations],
  );

  const collegeOptions = useMemo(
    () => filterColleges(filtersData).map(collegeOption),
    [filtersData],
  );

  const academicYearOptions = useMemo(() => {
    if (!collegeId) return [];
    const universityId = pickNum(
      filtersData.find(
        (r) => pickNum(r, ["fk_college_id", "collegeId"]) === collegeId,
      ),
      ["fk_university_id", "universityId"],
    );
    return filterAcademicYearsByUniversity(
      academicData,
      universityId || null,
    ).map(academicYearOption);
  }, [academicData, filtersData, collegeId]);

  const courseOptions = useMemo(
    () => filterCourses(filtersData, collegeId).map(courseOption),
    [filtersData, collegeId],
  );
  const groupOptions = useMemo(
    () =>
      filterCourseGroups(filtersData, collegeId, courseId).map(
        courseGroupOption,
      ),
    [filtersData, collegeId, courseId],
  );
  const yearOptions = useMemo(
    () =>
      filterCourseYears(filtersData, collegeId, courseId, courseGroupId).map(
        courseYearOption,
      ),
    [filtersData, collegeId, courseId, courseGroupId],
  );

  async function loadOrgFilters(orgId: number) {
    const empId =
      Number(globalThis.localStorage?.getItem("employeeId") ?? 0) ||
      Number(user?.employeeId ?? 0);
    setLoadingFilters(true);
    setFiltersData([]);
    setAcademicData([]);
    setCollegeId(null);
    setAcademicYearId(null);
    setCourseId(null);
    setCourseGroupId(null);
    setCourseYearId(null);
    setRows([]);
    setSelectedIds(new Set());
    try {
      const { filtersData: fd, academicData: ay } =
        await getFeeMasterCollegeFilters(orgId, empId);
      setFiltersData(fd as FilterRow[]);
      setAcademicData(ay as FilterRow[]);
      const colleges = filterColleges(fd as FilterRow[]);
      const firstCollege = pickNum(colleges[0], ["fk_college_id", "collegeId"]);
      if (firstCollege) {
        applyCollege(firstCollege, fd as FilterRow[], ay as FilterRow[]);
      }
    } catch (err) {
      toastError(err, "Failed to load college filters");
    } finally {
      setLoadingFilters(false);
    }
  }

  function applyCollege(
    nextCollegeId: number,
    source: FilterRow[],
    aySource: FilterRow[],
  ) {
    setCollegeId(nextCollegeId);
    setAcademicYearId(null);
    setCourseId(null);
    setCourseGroupId(null);
    setCourseYearId(null);
    setRows([]);
    setSelectedIds(new Set());
    void loadCategoriesParticulars(nextCollegeId);

    const universityId = pickNum(
      source.find(
        (r) => pickNum(r, ["fk_college_id", "collegeId"]) === nextCollegeId,
      ),
      ["fk_university_id", "universityId"],
    );
    const years = filterAcademicYearsByUniversity(
      aySource,
      universityId || null,
    );
    const current = [...years].sort(
      (a, b) => pickNum(b, ["is_curr_ay"]) - pickNum(a, ["is_curr_ay"]),
    )[0];
    const ayId = pickNum(current, ["fk_academic_year_id", "academicYearId"]);
    if (ayId) {
      setAcademicYearId(ayId);
      applyAcademicYear(nextCollegeId, ayId, source);
    }
  }

  function applyAcademicYear(cid: number, ayId: number, source: FilterRow[]) {
    setCourseId(null);
    setCourseGroupId(null);
    setCourseYearId(null);
    setRows([]);
    setSelectedIds(new Set());
    const courses = filterCourses(source, cid);
    const firstCourse = pickNum(courses[0], ["fk_course_id", "courseId"]);
    if (!firstCourse) return;
    setCourseId(firstCourse);
    applyCourse(cid, firstCourse, ayId, source);
  }

  function applyCourse(
    cid: number,
    crsId: number,
    _ayId: number | null,
    source: FilterRow[],
  ) {
    setCourseGroupId(null);
    setCourseYearId(null);
    setRows([]);
    setSelectedIds(new Set());
    const groups = filterCourseGroups(source, cid, crsId);
    const firstGroup = pickNum(groups[0], [
      "fk_course_group_id",
      "courseGroupId",
    ]);
    if (!firstGroup) return;
    setCourseGroupId(firstGroup);
    // Angular leaves course year unset until the user picks one.
    void loadCategoriesParticulars(cid);
  }

  async function loadAllStudents(
    cid: number | null,
    ayId: number | null,
    cyrId: number | null,
    grpId: number | null,
  ) {
    if (!cid || !ayId || !cyrId || !grpId) {
      setRows([]);
      return;
    }
    setLoadingList(true);
    setSelectedIds(new Set());
    setSelectAll(false);
    try {
      const data = await listFeeManagementStudentsByFilters({
        collegeId: cid,
        academicYearId: ayId,
        courseYearId: cyrId,
        courseGroupId: grpId,
      });
      setRows((Array.isArray(data) ? data : []).map(ensureDto));
    } catch (err) {
      setRows([]);
      toastError(err, "Failed to load students");
    } finally {
      setLoadingList(false);
    }
  }

  async function onModeChange(next: Mode) {
    setMode(next);
    setRows([]);
    setSelectedIds(new Set());
    setSelectAll(false);
    setStudentId(null);
    setSelectedStudent(null);
    setSearchRows([]);
    setCollegeId(null);
    setAcademicYearId(null);
    setCourseId(null);
    setCourseGroupId(null);
    setCourseYearId(null);

    if (next === "all") {
      setLoadingFilters(true);
      try {
        const orgs = await listOrganizations();
        const active = (orgs ?? []).filter((o) => o.isActive !== false);
        setOrganizations(active);
        const sessionOrg =
          Number(globalThis.localStorage?.getItem("organizationId") ?? 0) ||
          Number(user?.organizationId ?? 0);
        const first =
          active.find((o) => o.organizationId === sessionOrg)?.organizationId ??
          active[0]?.organizationId ??
          null;
        if (first) {
          setOrganizationId(first);
          await loadOrgFilters(first);
        }
      } catch (err) {
        toastError(err, "Failed to load organizations");
      } finally {
        setLoadingFilters(false);
      }
    }
  }

  const onStudentSearch = useCallback(async (term: string) => {
    const q = term.trim();
    if (q.length < 5) {
      setSearchRows([]);
      return;
    }
    setSearchLoading(true);
    try {
      const data = await searchFeeManagementStudents(q);
      setSearchRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setSearchRows([]);
      toastError(err, "Student search failed");
    } finally {
      setSearchLoading(false);
    }
  }, []);

  function onStudentSelect(
    nextId: number | null,
    student: FeeManagementStudentRow | null,
  ) {
    setStudentId(nextId);
    setSelectedIds(new Set());
    setSelectAll(false);
    if (!nextId || !student) {
      setSelectedStudent(null);
      setRows([]);
      setSearchRows([]);
      return;
    }
    const normalized = ensureDto(student);
    setSelectedStudent(normalized);
    setRows([normalized]);
    void loadCategoriesParticulars(Number(normalized.collegeId ?? 0));
  }

  function updateRow(
    studentKey: number,
    patch: Parameters<typeof patchFeeManagementStudentDetail>[1],
  ) {
    setRows((prev) =>
      prev.map((r) =>
        r.studentId === studentKey
          ? patchFeeManagementStudentDetail(ensureDto(r), patch)
          : r,
      ),
    );
    if (selectedStudent?.studentId === studentKey) {
      setSelectedStudent((prev) =>
        prev ? patchFeeManagementStudentDetail(ensureDto(prev), patch) : prev,
      );
    }
  }

  function toggleSelectAll(checked: boolean) {
    setSelectAll(checked);
    if (checked) {
      setSelectedIds(new Set(rows.map((r) => r.studentId)));
    } else {
      setSelectedIds(new Set());
    }
  }

  function toggleRow(studentKey: number, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(studentKey);
      else next.delete(studentKey);
      setSelectAll(next.size > 0 && next.size === rows.length);
      return next;
    });
  }

  async function onSave() {
    const employeeId =
      Number(globalThis.localStorage?.getItem("employeeId") ?? 0) ||
      Number(user?.employeeId ?? 0);
    if (!employeeId) {
      toastError("Employee session not found");
      return;
    }

    let toSave: FeeManagementStudentRow[] = [];
    if (mode === "all") {
      toSave = rows.filter((r) => selectedIds.has(r.studentId)).map(ensureDto);
      if (toSave.length === 0) {
        toastError("Please select the students");
        return;
      }
    } else {
      toSave = rows.map(ensureDto);
      if (toSave.length === 0) {
        toastError("Please select the students");
        return;
      }
    }

    setSaving(true);
    try {
      await saveFeeManagementStudentDetails(
        buildFeeManagementSavePayloads(toSave, employeeId),
      );
      toastSuccess("Saved successfully");
      if (
        mode === "all" &&
        collegeId &&
        academicYearId &&
        courseYearId &&
        courseGroupId
      ) {
        await loadAllStudents(
          collegeId,
          academicYearId,
          courseYearId,
          courseGroupId,
        );
      } else if (mode === "student" && studentId) {
        // Re-select from current search cache if available
        const refreshed =
          searchRows.find((r) => r.studentId === studentId) ?? rows[0];
        if (refreshed) onStudentSelect(studentId, refreshed);
      }
    } catch (err) {
      toastError(err, "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const scheduleOptions = paySchedules;
  const categoryOptions = categories;
  const particularOptions = particulars;

  const columnDefs = useMemo<ColDef<FeeManagementStudentRow>[]>(() => {
    const cols: ColDef<FeeManagementStudentRow>[] = [
      {
        headerName: "SNo.",
        valueGetter: rowIndexGetter,
        width: 70,
        flex: 0,
        cellClass: "fee-mgmt-grid-cell",
        headerClass: "fee-mgmt-grid-cell",
      },
    ];

    if (mode === "all") {
      cols.push({
        headerName: "All",
        width: 70,
        flex: 0,
        cellClass: "fee-mgmt-grid-cell fee-mgmt-compact-cell",
        headerClass: "fee-mgmt-grid-cell fee-mgmt-compact-cell",
        headerComponent: () => (
          <div className="flex items-center gap-1.5 px-1">
            <Checkbox
              checked={selectAll}
              onCheckedChange={(v) => toggleSelectAll(v === true)}
              aria-label="Select all"
            />
            <span className="text-xs">All</span>
          </div>
        ),
        cellRenderer: (p: ICellRendererParams<FeeManagementStudentRow>) => {
          const id = p.data?.studentId;
          if (!id) return null;
          return (
            <Checkbox
              checked={selectedIds.has(id)}
              onCheckedChange={(v) => toggleRow(id, v === true)}
              aria-label={`Select student ${id}`}
            />
          );
        },
      });
    }

    cols.push(
      {
        headerName: "Student Name",
        minWidth: 260,
        flex: 1.2,
        cellClass: "fee-mgmt-grid-cell fee-mgmt-student-cell",
        headerClass: "fee-mgmt-grid-cell",
        cellRenderer: (p: ICellRendererParams<FeeManagementStudentRow>) => {
          const row = p.data;
          if (!row) return null;
          const idPart =
            row.hallticketNumber || row.admissionNumber || row.rollNumber || "";
          return (
            <div className="space-y-0.5 text-xs leading-snug">
              <p className="font-medium text-foreground">
                {idPart ? `${idPart}, ` : ""}
                {row.firstName ?? "—"}{" "}
                <span className="text-primary">{lateralTag(row)}</span>
              </p>
              <p className="text-muted-foreground">
                {[
                  row.collegeCode || "-",
                  row.academicYear || "-",
                  row.courseCode || "-",
                  row.groupCode || "-",
                  row.courseYearName || "-",
                  row.section || "-",
                ].join(" | ")}
              </p>
              <p className="text-muted-foreground">
                {row.mobile || "-"}
                {row.studentStatusCode ? ` | ${row.studentStatusCode}` : ""}
              </p>
            </div>
          );
        },
      },
      {
        headerName: "Fee Schedule",
        minWidth: 150,
        cellClass: "fee-mgmt-grid-cell fee-mgmt-compact-cell",
        headerClass: "fee-mgmt-grid-cell fee-mgmt-compact-cell",
        cellRenderer: (p: ICellRendererParams<FeeManagementStudentRow>) => {
          const row = p.data;
          if (!row) return null;
          const dto = row.feeManagmentStdDetailsDtos?.[0];
          return (
            <Select
              value={dto?.payScheduleId ? String(dto.payScheduleId) : null}
              onChange={(v) =>
                updateRow(row.studentId, {
                  payScheduleId: v ? Number(v) : undefined,
                })
              }
              options={scheduleOptions}
              placeholder="Fee Schedule"
              searchable
            />
          );
        },
      },
      {
        headerName: "Category",
        minWidth: 150,
        cellClass: "fee-mgmt-grid-cell fee-mgmt-compact-cell",
        headerClass: "fee-mgmt-grid-cell fee-mgmt-compact-cell",
        cellRenderer: (p: ICellRendererParams<FeeManagementStudentRow>) => {
          const row = p.data;
          if (!row) return null;
          const dto = row.feeManagmentStdDetailsDtos?.[0];
          return (
            <Select
              value={dto?.feeCategoryId ? String(dto.feeCategoryId) : null}
              onChange={(v) =>
                updateRow(row.studentId, {
                  feeCategoryId: v ? Number(v) : undefined,
                })
              }
              options={categoryOptions}
              placeholder="Category"
              searchable
            />
          );
        },
      },
      {
        headerName: "Fee Particular",
        minWidth: 160,
        cellClass: "fee-mgmt-grid-cell fee-mgmt-compact-cell",
        headerClass: "fee-mgmt-grid-cell fee-mgmt-compact-cell",
        cellRenderer: (p: ICellRendererParams<FeeManagementStudentRow>) => {
          const row = p.data;
          if (!row) return null;
          const dto = row.feeManagmentStdDetailsDtos?.[0];
          return (
            <Select
              value={
                dto?.feeParticularsId ? String(dto.feeParticularsId) : null
              }
              onChange={(v) =>
                updateRow(row.studentId, {
                  feeParticularsId: v ? Number(v) : undefined,
                })
              }
              options={particularOptions}
              placeholder="Fee Particular"
              searchable
            />
          );
        },
      },
      {
        headerName: "Amount",
        minWidth: 120,
        width: 130,
        flex: 0,
        cellClass: "fee-mgmt-grid-cell fee-mgmt-compact-cell",
        headerClass: "fee-mgmt-grid-cell fee-mgmt-compact-cell",
        cellRenderer: (p: ICellRendererParams<FeeManagementStudentRow>) => {
          const row = p.data;
          if (!row) return null;
          const dto = row.feeManagmentStdDetailsDtos?.[0];
          return (
            <Input
              className="h-8"
              defaultValue={
                dto?.grossAmount != null ? String(dto.grossAmount) : ""
              }
              onBlur={(e) => {
                const raw = e.target.value.trim();
                updateRow(row.studentId, {
                  grossAmount: raw === "" ? undefined : raw,
                });
              }}
            />
          );
        },
      },
    );

    return cols;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    mode,
    selectAll,
    selectedIds,
    scheduleOptions,
    categoryOptions,
    particularOptions,
    rows,
  ]);

  const chipText = studentChip(rows[0]);

  return (
    <FilteredPage
      title={mode === "student" ? "Students Search" : "Student Fee Management"}
      filters={
        <div className="space-y-4">
          <RadioGroup
            value={mode}
            onValueChange={(v) => void onModeChange(v as Mode)}
            className="flex flex-wrap gap-4"
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="student" id="sfm-student" />
              <Label htmlFor="sfm-student">Search By Student</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="all" id="sfm-all" />
              <Label htmlFor="sfm-all">Search By All Students</Label>
            </div>
          </RadioGroup>

          {mode === "student" ? (
            <StudentSearchSelect
              label="Student"
              placeholder="Search by student name or roll no."
              value={studentId}
              students={searchRows}
              selectedStudent={selectedStudent}
              isLoading={searchLoading}
              onSearch={(t) => void onStudentSearch(t)}
              onChange={(id, row) =>
                onStudentSelect(
                  id,
                  (row as FeeManagementStudentRow | null) ?? null,
                )
              }
              className="max-w-xl"
            />
          ) : (
            <GlobalFilterBarRow>
              <GlobalFilterField label="Organization">
                <Select
                  value={organizationId ? String(organizationId) : null}
                  onChange={(v) => {
                    const next = v ? Number(v) : null;
                    setOrganizationId(next);
                    if (next) void loadOrgFilters(next);
                  }}
                  options={orgOptions}
                  placeholder="Select organization"
                  searchable
                  isLoading={loadingFilters}
                />
              </GlobalFilterField>
              <GlobalFilterField label="College">
                <Select
                  value={collegeId ? String(collegeId) : null}
                  onChange={(v) => {
                    const next = v ? Number(v) : null;
                    if (!next) {
                      setCollegeId(null);
                      return;
                    }
                    applyCollege(next, filtersData, academicData);
                  }}
                  options={collegeOptions}
                  placeholder="Select college"
                  searchable
                  disabled={!organizationId}
                />
              </GlobalFilterField>
              <GlobalFilterField label="Academic Year">
                <Select
                  value={academicYearId ? String(academicYearId) : null}
                  onChange={(v) => {
                    const next = v ? Number(v) : null;
                    setAcademicYearId(next);
                    if (next && collegeId)
                      applyAcademicYear(collegeId, next, filtersData);
                  }}
                  options={academicYearOptions}
                  placeholder="Select academic year"
                  searchable
                  disabled={!collegeId}
                />
              </GlobalFilterField>
              <GlobalFilterField label="Course">
                <Select
                  value={courseId ? String(courseId) : null}
                  onChange={(v) => {
                    const next = v ? Number(v) : null;
                    setCourseId(next);
                    if (next && collegeId) {
                      applyCourse(collegeId, next, academicYearId, filtersData);
                    }
                  }}
                  options={courseOptions}
                  placeholder="Select course"
                  searchable
                  disabled={!collegeId}
                />
              </GlobalFilterField>
              <GlobalFilterField label="Course Group">
                <Select
                  value={courseGroupId ? String(courseGroupId) : null}
                  onChange={(v) => {
                    const next = v ? Number(v) : null;
                    setCourseGroupId(next);
                    setCourseYearId(null);
                    setRows([]);
                    if (next && collegeId && courseId) {
                      void loadCategoriesParticulars(collegeId);
                    }
                  }}
                  options={groupOptions}
                  placeholder="Select course group"
                  searchable
                  disabled={!courseId}
                />
              </GlobalFilterField>
              <GlobalFilterField label="Course Year">
                <Select
                  value={courseYearId ? String(courseYearId) : null}
                  onChange={(v) => {
                    const next = v ? Number(v) : null;
                    setCourseYearId(next);
                    void loadAllStudents(
                      collegeId,
                      academicYearId,
                      next,
                      courseGroupId,
                    );
                  }}
                  options={yearOptions}
                  placeholder="Select course year"
                  searchable
                  disabled={!courseGroupId}
                />
              </GlobalFilterField>
            </GlobalFilterBarRow>
          )}
        </div>
      }
    >
      {rows.length > 0 ? (
        <div className="space-y-3">
          {chipText ? (
            <p className="px-1 text-sm font-semibold text-sky-700">
              {chipText}
            </p>
          ) : null}
          <div className="fee-mgmt-data-table">
            <DataTable
              title="Student Fee Details"
              bordered
              rowData={rows}
              columnDefs={columnDefs}
              loading={loadingList}
              getRowId={(p) => String(p.data.studentId)}
              pagination
              toolbar={{
                search: mode === "all",
                searchPlaceholder: "Search…",
                pdfDocumentTitle: "Student Fee Management",
              }}
              toolbarTrailing={
                <Button
                  size="sm"
                  disabled={saving}
                  onClick={() => void onSave()}
                >
                  Save
                </Button>
              }
            />
          </div>
        </div>
      ) : null}
    </FilteredPage>
  );
}
