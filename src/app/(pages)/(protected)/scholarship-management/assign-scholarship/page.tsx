"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
import { SearchInput } from "@/common/components/search";
import { Select } from "@/common/components/select";
import { FilteredPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSession } from "@/hooks/useSession";
import { QK } from "@/lib/query-keys";
import { getErrorMessage } from "@/lib/errors";
import { toastError, toastInfo, toastSuccess } from "@/lib/toast";
import {
  academicYearOption,
  batchOption,
  collegeOption,
  courseGroupOption,
  courseOption,
  courseYearOption,
  filterAcademicYearsByUniversity,
  filterCollegesByUniversity,
  filterCourseGroups,
  filterCourses,
  filterCourseYears,
  filterUniversities,
  pickNum,
  universityOption,
  type FilterRow,
} from "@/app/(pages)/(protected)/accounts-and-fees/fee-masters/_lib/fee-master-filters";
import {
  getScholarshipCollegeFilters,
  getScholarshipTypeAndValues,
  getStudentsScholarshipDetails,
  listBatchesByCourse,
  updateStdStudentScholarship,
} from "@/services";
import type {
  AssignScholarshipStudent,
  ScholarshipTypeAndValue,
  UpdateStdStudentScholarshipPayload,
} from "@/types/scholarship";

type StructureMode = "batch" | "academic";
type StudentTab = "assigned" | "unassigned";

type StudentRow = AssignScholarshipStudent & { checked?: boolean };

function matchesSearch(row: StudentRow, q: string): boolean {
  if (!q) return true;
  const hay = `${row.firstName ?? ""} ${row.rollNumber ?? ""}`.toLowerCase();
  return hay.includes(q);
}

function amountLabel(row: StudentRow): string {
  const amount = row.scholarshipAmount;
  if (amount == null || Number.isNaN(Number(amount)) || Number(amount) === 0) {
    return row.isAssigned ? "0" : "—";
  }
  return String(amount);
}

/** Angular `scholarship/assign-scholarship` → Assign Scholarship. */
export default function AssignScholarshipPage() {
  const { user } = useSession();

  const [mode, setMode] = useState<StructureMode>("batch");
  const [tab, setTab] = useState<StudentTab>("assigned");
  const [search, setSearch] = useState("");

  const [filtersData, setFiltersData] = useState<FilterRow[]>([]);
  const [academicData, setAcademicData] = useState<FilterRow[]>([]);
  const [loadingFilters, setLoadingFilters] = useState(true);

  const [universityId, setUniversityId] = useState<number | null>(null);
  const [collegeId, setCollegeId] = useState<number | null>(null);
  const [courseId, setCourseId] = useState<number | null>(null);
  const [courseGroupId, setCourseGroupId] = useState<number | null>(null);
  const [courseYearId, setCourseYearId] = useState<number | null>(null);
  const [batchId, setBatchId] = useState<number | null>(null);
  const [academicYearId, setAcademicYearId] = useState<number | null>(null);
  const [scholarshipTypeId, setScholarshipTypeId] = useState<number | null>(
    null,
  );

  const [scholarshipValues, setScholarshipValues] = useState<
    ScholarshipTypeAndValue[]
  >([]);
  const [assignedList, setAssignedList] = useState<StudentRow[]>([]);
  const [unAssignedList, setUnAssignedList] = useState<StudentRow[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);

  const isBatchMode = mode === "batch";

  const universityOptions = useMemo(
    () => filterUniversities(filtersData).map(universityOption),
    [filtersData],
  );

  const collegeOptions = useMemo(
    () =>
      filterCollegesByUniversity(filtersData, universityId).map(collegeOption),
    [filtersData, universityId],
  );

  const courseOptions = useMemo(
    () => filterCourses(filtersData, collegeId).map(courseOption),
    [filtersData, collegeId],
  );

  const courseGroupOptions = useMemo(
    () =>
      filterCourseGroups(filtersData, collegeId, courseId).map(
        courseGroupOption,
      ),
    [filtersData, collegeId, courseId],
  );

  const courseYearOptions = useMemo(
    () =>
      filterCourseYears(
        filtersData,
        collegeId,
        courseId,
        courseGroupId,
      ).map(courseYearOption),
    [filtersData, collegeId, courseId, courseGroupId],
  );

  const academicYearOptions = useMemo(
    () =>
      filterAcademicYearsByUniversity(academicData, universityId).map(
        academicYearOption,
      ),
    [academicData, universityId],
  );

  const { data: batches = [], isLoading: loadingBatches } = useQuery({
    queryKey: QK.assignScholarship.batches(courseId ?? 0),
    queryFn: () => listBatchesByCourse(courseId!),
    enabled: isBatchMode && (courseId ?? 0) > 0,
  });

  const batchOptions = useMemo(
    () =>
      batches.map((b) =>
        batchOption({
          fk_batch_id: b.batchId,
          batchId: b.batchId,
          batch_name: b.batchName,
          batchName: b.batchName,
        }),
      ),
    [batches],
  );

  const scholarshipTypeOptions = useMemo(
    () =>
      scholarshipValues.map((s) => ({
        value: String(s.scholarshipTypeId),
        label: s.scholarshipTypeCode || String(s.scholarshipTypeId),
      })),
    [scholarshipValues],
  );

  const filtersReady = Boolean(
    collegeId &&
      courseId &&
      courseGroupId &&
      courseYearId &&
      (isBatchMode ? batchId : academicYearId),
  );

  const clearStudents = useCallback(() => {
    setAssignedList([]);
    setUnAssignedList([]);
    setScholarshipValues([]);
    setScholarshipTypeId(null);
  }, []);

  const loadStudentsAndTypes = useCallback(async () => {
    if (
      !collegeId ||
      !courseId ||
      !courseGroupId ||
      !courseYearId ||
      (isBatchMode && !batchId) ||
      (!isBatchMode && !academicYearId)
    ) {
      clearStudents();
      return;
    }

    setLoadingStudents(true);
    try {
      const [types, students] = await Promise.all([
        getScholarshipTypeAndValues({
          collegeId,
          courseId,
          batchId: isBatchMode ? (batchId ?? undefined) : undefined,
          academicYearId: !isBatchMode
            ? (academicYearId ?? undefined)
            : undefined,
        }),
        getStudentsScholarshipDetails({
          collegeId,
          courseId,
          courseGroupId,
          courseYearId,
          batchId: isBatchMode ? (batchId ?? undefined) : undefined,
          academicYearId: !isBatchMode
            ? (academicYearId ?? undefined)
            : undefined,
        }),
      ]);

      setScholarshipValues(types);
      const assigned: StudentRow[] = [];
      const unassigned: StudentRow[] = [];
      for (const row of students) {
        const next = { ...row, checked: false };
        if (row.isAssigned) assigned.push(next);
        else unassigned.push(next);
      }
      setAssignedList(assigned);
      setUnAssignedList(unassigned);
    } catch (err) {
      clearStudents();
      toastError(err, "Failed to load students");
    } finally {
      setLoadingStudents(false);
    }
  }, [
    collegeId,
    courseId,
    courseGroupId,
    courseYearId,
    batchId,
    academicYearId,
    isBatchMode,
    clearStudents,
  ]);

  useEffect(() => {
    const orgId =
      Number(globalThis.localStorage?.getItem("organizationId") ?? 0) ||
      Number(user?.organizationId ?? 0);
    const employeeId =
      Number(globalThis.localStorage?.getItem("employeeId") ?? 0) ||
      Number(user?.employeeId ?? 0);

    let cancelled = false;
    setLoadingFilters(true);
    void getScholarshipCollegeFilters(orgId, employeeId)
      .then((filters) => {
        if (cancelled) return;
        setFiltersData(filters.filtersData);
        setAcademicData(filters.academicData);

        const universities = filterUniversities(filters.filtersData);
        const firstUniversity =
          pickNum(universities[0], ["fk_university_id", "universityId"]) || null;
        setUniversityId(firstUniversity);

        if (!firstUniversity) return;
        const colleges = filterCollegesByUniversity(
          filters.filtersData,
          firstUniversity,
        );
        const firstCollege =
          pickNum(colleges[0], ["fk_college_id", "collegeId"]) || null;
        setCollegeId(firstCollege);

        const years = filterAcademicYearsByUniversity(
          filters.academicData,
          firstUniversity,
        );
        const firstYear =
          pickNum(years[0], ["fk_academic_year_id", "academicYearId"]) || null;
        setAcademicYearId(firstYear);
      })
      .catch((err) => toastError(err, "Failed to load filters"))
      .finally(() => {
        if (!cancelled) setLoadingFilters(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.organizationId, user?.employeeId]);

  useEffect(() => {
    if (!filtersReady) {
      clearStudents();
      return;
    }
    void loadStudentsAndTypes();
  }, [filtersReady, loadStudentsAndTypes, clearStudents]);

  function onModeChange(next: StructureMode) {
    setMode(next);
    setCourseId(null);
    setCourseGroupId(null);
    setCourseYearId(null);
    setBatchId(null);
    setScholarshipTypeId(null);
    clearStudents();
    if (next === "academic" && universityId) {
      const years = filterAcademicYearsByUniversity(academicData, universityId);
      const firstYear =
        pickNum(years[0], ["fk_academic_year_id", "academicYearId"]) || null;
      setAcademicYearId(firstYear);
    } else {
      setAcademicYearId(null);
    }
  }

  function onUniversityChange(value: string | null) {
    const next = value ? Number(value) : null;
    setUniversityId(next);
    setCollegeId(null);
    setCourseId(null);
    setCourseGroupId(null);
    setCourseYearId(null);
    setBatchId(null);
    setAcademicYearId(null);
    setScholarshipTypeId(null);
    clearStudents();
    if (!next) return;
    const colleges = filterCollegesByUniversity(filtersData, next);
    const firstCollege =
      pickNum(colleges[0], ["fk_college_id", "collegeId"]) || null;
    setCollegeId(firstCollege);
    const years = filterAcademicYearsByUniversity(academicData, next);
    const firstYear =
      pickNum(years[0], ["fk_academic_year_id", "academicYearId"]) || null;
    if (!isBatchMode) setAcademicYearId(firstYear);
  }

  function onCollegeChange(value: string | null) {
    setCollegeId(value ? Number(value) : null);
    setCourseId(null);
    setCourseGroupId(null);
    setCourseYearId(null);
    setBatchId(null);
    setScholarshipTypeId(null);
    clearStudents();
  }

  function onCourseChange(value: string | null) {
    setCourseId(value ? Number(value) : null);
    setCourseGroupId(null);
    setCourseYearId(null);
    setBatchId(null);
    setScholarshipTypeId(null);
    clearStudents();
  }

  function onCourseGroupChange(value: string | null) {
    setCourseGroupId(value ? Number(value) : null);
    setCourseYearId(null);
    setBatchId(null);
    setScholarshipTypeId(null);
    clearStudents();
  }

  function onCourseYearChange(value: string | null) {
    setCourseYearId(value ? Number(value) : null);
    setBatchId(null);
    setScholarshipTypeId(null);
    clearStudents();
  }

  function onBatchChange(value: string | null) {
    setBatchId(value ? Number(value) : null);
    setScholarshipTypeId(null);
  }

  function onAcademicYearChange(value: string | null) {
    setAcademicYearId(value ? Number(value) : null);
    setScholarshipTypeId(null);
  }

  const filteredAssigned = useMemo(() => {
    const q = search.trim().toLowerCase();
    return assignedList.filter((r) => matchesSearch(r, q));
  }, [assignedList, search]);

  const filteredUnassigned = useMemo(() => {
    const q = search.trim().toLowerCase();
    return unAssignedList.filter((r) => matchesSearch(r, q));
  }, [unAssignedList, search]);

  const activeList = tab === "assigned" ? filteredAssigned : filteredUnassigned;
  const allChecked =
    activeList.length > 0 && activeList.every((r) => r.checked);
  const someChecked = activeList.some((r) => r.checked);

  function toggleAll(checked: boolean) {
    if (tab === "assigned") {
      setAssignedList((prev) =>
        prev.map((r) =>
          matchesSearch(r, search.trim().toLowerCase())
            ? { ...r, checked }
            : r,
        ),
      );
    } else {
      setUnAssignedList((prev) =>
        prev.map((r) =>
          matchesSearch(r, search.trim().toLowerCase())
            ? { ...r, checked }
            : r,
        ),
      );
    }
  }

  function toggleOne(studentId: number, checked: boolean) {
    const updater = (prev: StudentRow[]) =>
      prev.map((r) => (r.studentId === studentId ? { ...r, checked } : r));
    if (tab === "assigned") setAssignedList(updater);
    else setUnAssignedList(updater);
  }

  function resolveAmount(typeId: number): number {
    const match = scholarshipValues.find((s) => s.scholarshipTypeId === typeId);
    return Number(match?.scholarshipAmount ?? 0);
  }

  async function assignScholarship(label: "Assign" | "Unassign") {
    if (!collegeId) {
      toastInfo("Select college first");
      return;
    }

    const source =
      label === "Assign"
        ? unAssignedList.filter((r) => r.checked)
        : assignedList.filter((r) => r.checked);

    if (source.length === 0) {
      toastInfo("Select at least one student");
      return;
    }

    const typeId = scholarshipTypeId ?? 0;
    if (label === "Assign" && !typeId) {
      toastInfo("Select scholarship type");
      return;
    }

    const unAssigned = label !== "Assign";
    const assignedType = label === "Assign" ? "ASSIGNED" : "UNASSIGNED";
    const amount = typeId ? resolveAmount(typeId) : 0;

    const payload: UpdateStdStudentScholarshipPayload[] = source.map((x) => {
      const studentTypeId =
        typeId ||
        Number(x.scholarshipTypeId ?? 0) ||
        0;
      return {
        studentScholarshipId: x.studentScholarshipId ?? null,
        collegeId,
        studentDetailId: x.studentId,
        scholarshipTypesId: studentTypeId,
        amount: typeId ? amount : Number(x.scholarshipAmount ?? 0),
        isStdFeeUpdated: Boolean(x.studentScholarshipId),
        feeParticularId: null,
        unAssigned,
        isActive: true,
        assignedType,
      };
    });

    if (payload.some((p) => !p.scholarshipTypesId)) {
      toastInfo("Select scholarship type");
      return;
    }

    setSaving(true);
    try {
      await updateStdStudentScholarship(payload);
      toastSuccess(
        label === "Assign"
          ? "Scholarship assigned successfully"
          : "Scholarship unassigned successfully",
      );
      await loadStudentsAndTypes();
    } catch (err) {
      toastError(err, getErrorMessage(err) || `Failed to ${label.toLowerCase()}`);
    } finally {
      setSaving(false);
    }
  }

  const summaryParts = useMemo(() => {
    const sample = assignedList[0] ?? unAssignedList[0];
    if (!sample) return [];
    return [
      sample.courseName,
      sample.courseGroupName,
      sample.courseYearName,
      sample.batchName,
    ].filter(Boolean);
  }, [assignedList, unAssignedList]);

  const hasStudents = assignedList.length > 0 || unAssignedList.length > 0;

  return (
    <FilteredPage
      title="Assign Scholarship"
      filters={
        <div className="space-y-4">
          <RadioGroup
            value={mode}
            onValueChange={(value) => onModeChange(value as StructureMode)}
            className="flex flex-wrap gap-6"
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="batch" id="assign-sch-batch" />
              <Label htmlFor="assign-sch-batch" className="font-normal">
                Batch-Wise ScholarShip Structure
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="academic" id="assign-sch-academic" />
              <Label htmlFor="assign-sch-academic" className="font-normal">
                Academic-Wise ScholarShip Structure
              </Label>
            </div>
          </RadioGroup>

          <GlobalFilterBarRow>
            <GlobalFilterField label="University">
              <Select
                value={universityId ? String(universityId) : null}
                onChange={onUniversityChange}
                options={universityOptions}
                placeholder="Select university"
                searchable
                isLoading={loadingFilters}
              />
            </GlobalFilterField>

            <GlobalFilterField label="College">
              <Select
                value={collegeId ? String(collegeId) : null}
                onChange={onCollegeChange}
                options={collegeOptions}
                placeholder="Select college"
                searchable
                disabled={!universityId}
                isLoading={loadingFilters}
              />
            </GlobalFilterField>

            <GlobalFilterField label="Course">
              <Select
                value={courseId ? String(courseId) : null}
                onChange={onCourseChange}
                options={courseOptions}
                placeholder="Select course"
                searchable
                disabled={!collegeId}
              />
            </GlobalFilterField>

            <GlobalFilterField label="Course Group">
              <Select
                value={courseGroupId ? String(courseGroupId) : null}
                onChange={onCourseGroupChange}
                options={courseGroupOptions}
                placeholder="Select course group"
                searchable
                disabled={!courseId}
              />
            </GlobalFilterField>

            <GlobalFilterField label="Course Year">
              <Select
                value={courseYearId ? String(courseYearId) : null}
                onChange={onCourseYearChange}
                options={courseYearOptions}
                placeholder="Select course year"
                searchable
                disabled={!courseGroupId}
              />
            </GlobalFilterField>

            {isBatchMode ? (
              <GlobalFilterField label="Batch">
                <Select
                  value={batchId ? String(batchId) : null}
                  onChange={onBatchChange}
                  options={batchOptions}
                  placeholder="Select batch"
                  searchable
                  disabled={!courseId}
                  isLoading={loadingBatches}
                />
              </GlobalFilterField>
            ) : (
              <GlobalFilterField label="Academic Year">
                <Select
                  value={academicYearId ? String(academicYearId) : null}
                  onChange={onAcademicYearChange}
                  options={academicYearOptions}
                  placeholder="Select academic year"
                  searchable
                  disabled={!universityId}
                />
              </GlobalFilterField>
            )}
          </GlobalFilterBarRow>
        </div>
      }
      body={
        loadingStudents ? (
          <p className="text-sm text-muted-foreground">Loading students…</p>
        ) : hasStudents ? (
          <div className="space-y-4">
            {summaryParts.length > 0 ? (
              <p className="text-sm font-semibold text-foreground">
                {summaryParts.join(" | ")}
              </p>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="w-full max-w-sm">
                <SearchInput
                  value={search}
                  onChange={setSearch}
                  placeholder="Search"
                />
              </div>
              {tab === "unassigned" ? (
                <div className="w-full max-w-xs">
                  <Select
                    label="Scholarship Type"
                    value={
                      scholarshipTypeId ? String(scholarshipTypeId) : null
                    }
                    onChange={(v) =>
                      setScholarshipTypeId(v ? Number(v) : null)
                    }
                    options={scholarshipTypeOptions}
                    placeholder="Select scholarship type"
                    searchable
                  />
                </div>
              ) : null}
            </div>

            <Tabs
              value={tab}
              onValueChange={(v) => setTab(v as StudentTab)}
              className="w-full"
            >
              <TabsList className="h-auto w-full justify-start rounded-none border-b border-border bg-transparent p-0">
                <TabsTrigger
                  value="assigned"
                  className="rounded-none border-b-2 border-transparent px-4 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  Assigned Students ({assignedList.length})
                </TabsTrigger>
                <TabsTrigger
                  value="unassigned"
                  className="rounded-none border-b-2 border-transparent px-4 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  Unassigned Students ({unAssignedList.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="assigned" className="mt-4 space-y-3">
                <StudentTable
                  rows={filteredAssigned}
                  showTypeAsAssigned
                  allChecked={allChecked}
                  someChecked={someChecked}
                  onToggleAll={toggleAll}
                  onToggleOne={toggleOne}
                  scholarshipTypeOptions={scholarshipTypeOptions}
                  scholarshipTypeId={scholarshipTypeId}
                />
                <div className="flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    disabled={saving || !someChecked}
                    onClick={() => void assignScholarship("Unassign")}
                  >
                    {saving ? "Saving…" : "Unassign"}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="unassigned" className="mt-4 space-y-3">
                <StudentTable
                  rows={filteredUnassigned}
                  showTypeAsAssigned={false}
                  allChecked={allChecked}
                  someChecked={someChecked}
                  onToggleAll={toggleAll}
                  onToggleOne={toggleOne}
                  scholarshipTypeOptions={scholarshipTypeOptions}
                  scholarshipTypeId={scholarshipTypeId}
                  onScholarshipTypeChange={(v) =>
                    setScholarshipTypeId(v ? Number(v) : null)
                  }
                />
                <div className="flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    disabled={saving || !someChecked}
                    onClick={() => void assignScholarship("Assign")}
                  >
                    {saving ? "Saving…" : "Assign"}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        ) : undefined
      }
    />
  );
}

function StudentTable({
  rows,
  showTypeAsAssigned,
  allChecked,
  someChecked,
  onToggleAll,
  onToggleOne,
  scholarshipTypeOptions,
  scholarshipTypeId,
  onScholarshipTypeChange,
}: {
  rows: StudentRow[];
  showTypeAsAssigned: boolean;
  allChecked: boolean;
  someChecked: boolean;
  onToggleAll: (checked: boolean) => void;
  onToggleOne: (studentId: number, checked: boolean) => void;
  scholarshipTypeOptions: { value: string; label: string }[];
  scholarshipTypeId: number | null;
  onScholarshipTypeChange?: (value: string | null) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="bg-muted/40">
          <tr className="border-b border-border text-left">
            <th className="w-[120px] px-3 py-2 font-medium">
              <label className="inline-flex items-center gap-2">
                <Checkbox
                  checked={
                    allChecked ? true : someChecked ? "indeterminate" : false
                  }
                  onCheckedChange={(v) => onToggleAll(v === true)}
                />
                <span>Select All</span>
              </label>
            </th>
            <th className="px-3 py-2 font-medium">Student</th>
            <th className="px-3 py-2 font-medium">Roll No.</th>
            <th className="px-3 py-2 font-medium">Value</th>
            <th className="px-3 py-2 font-medium">
              {showTypeAsAssigned ? "Assigned Type" : "Scholarship Type"}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={5}
                className="px-3 py-6 text-center text-muted-foreground"
              >
                No students
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={row.studentId}
                className="border-b border-border last:border-0"
              >
                <td className="px-3 py-2">
                  <Checkbox
                    checked={Boolean(row.checked)}
                    onCheckedChange={(v) =>
                      onToggleOne(row.studentId, v === true)
                    }
                  />
                </td>
                <td className="px-3 py-2">{row.firstName || "—"}</td>
                <td className="px-3 py-2">{row.rollNumber || "—"}</td>
                <td className="px-3 py-2">{amountLabel(row)}</td>
                <td className="px-3 py-2">
                  {showTypeAsAssigned ? (
                    row.assignedType || "—"
                  ) : (
                    <Select
                      value={
                        scholarshipTypeId
                          ? String(scholarshipTypeId)
                          : null
                      }
                      onChange={(v) => onScholarshipTypeChange?.(v)}
                      options={scholarshipTypeOptions}
                      placeholder="Scholarship Type"
                      searchable
                    />
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
