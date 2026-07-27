"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, UserPlus } from "lucide-react";
import { DatePicker } from "@/common/components/date-picker";
import { Select } from "@/common/components/select";
import { SearchInput } from "@/common/components/search";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { useSessionContext } from "@/context/SessionContext";
import { useLoginEmployeeId } from "@/hooks/useLoginEmployeeId";
import { toastError, toastInfo, toastSuccess } from "@/lib/toast";
import { getErrorMessage } from "@/lib/errors";
import {
  getMentorshipAssignFilters,
  listMappedCounselorStudents,
  listStudentsForCounselorAssignment,
  saveCounselorMappings,
  searchEmployeesForMentorship,
  type ClgFilterAcademicYearRow,
  type ClgFilterRow,
  type MentorshipRow,
} from "@/services";

type StudentRow = MentorshipRow & {
  studentId?: number;
  firstName?: string;
  rollNumber?: string;
  genderDisplayName?: string;
  counselorId?: number;
  employeeId?: number;
};

function num(val: unknown): number {
  const n = Number(val);
  return Number.isFinite(n) ? n : 0;
}

function text(val: unknown): string {
  if (typeof val === "string") return val;
  if (typeof val === "number") return String(val);
  return "";
}

function uniqueBy<T>(rows: T[], key: (row: T) => number): T[] {
  const seen = new Set<number>();
  return rows.filter((row) => {
    const k = key(row);
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function parseMaybeDate(value: unknown): Date | null {
  if (value == null || value === "") return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

function studentLabel(s: StudentRow): string {
  const name = String(s.firstName ?? "");
  const roll = String(s.rollNumber ?? "");
  const gender = String(s.genderDisplayName ?? "");
  const base = roll ? `${name}(${roll})` : name;
  return gender ? `${base}:${gender}` : base;
}

function studentKey(s: StudentRow): number {
  return Number(s.studentId ?? 0);
}

function readOrgId(userOrgId: unknown): number {
  const fromUser = num(userOrgId);
  if (fromUser > 0) return fromUser;
  if (typeof globalThis === "undefined" || !globalThis.localStorage) return 0;
  for (const key of ["organizationId", "orgId", "orgID"]) {
    const n = num(globalThis.localStorage.getItem(key));
    if (n > 0) return n;
  }
  return 0;
}

type AssignCounselorPageProps = {
  title?: string;
};

/** Angular `staff-mentorship/assign-counselor` — clg_filters cascade + dual student lists. */
export function AssignCounselorPage({
  title = "Assign Counselor",
}: Readonly<AssignCounselorPageProps>) {
  const { user, isLoading: sessionLoading } = useSessionContext();
  const { employeeId: loginEmployeeId, isResolving } = useLoginEmployeeId(
    user,
    sessionLoading,
  );

  const [filtersData, setFiltersData] = useState<ClgFilterRow[]>([]);
  const [academicYearData, setAcademicYearData] = useState<
    ClgFilterAcademicYearRow[]
  >([]);
  const [loadingFilters, setLoadingFilters] = useState(false);

  const [collegeId, setCollegeId] = useState<number | null>(null);
  const [academicYearId, setAcademicYearId] = useState<number | null>(null);
  const [courseId, setCourseId] = useState<number | null>(null);
  const [courseGroupId, setCourseGroupId] = useState<number | null>(null);
  const [courseYearId, setCourseYearId] = useState<number | null>(null);

  const [employeeId, setEmployeeId] = useState<number | null>(null);
  const [employeeOptions, setEmployeeOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [employees, setEmployees] = useState<MentorshipRow[]>([]);
  const [employeeSearching, setEmployeeSearching] = useState(false);
  const [fromDate, setFromDate] = useState<Date | null>(() => new Date());
  const [toDate, setToDate] = useState<Date | null>(() => new Date());

  const [allStudents, setAllStudents] = useState<StudentRow[]>([]);
  const [unassigned, setUnassigned] = useState<StudentRow[]>([]);
  const [assigned, setAssigned] = useState<StudentRow[]>([]);
  const [selectedUnassigned, setSelectedUnassigned] = useState<Set<number>>(
    new Set(),
  );
  const [selectedAssigned, setSelectedAssigned] = useState<Set<number>>(
    new Set(),
  );
  const [leftSearch, setLeftSearch] = useState("");
  const [rightSearch, setRightSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [headerLine, setHeaderLine] = useState("");

  const colleges = useMemo(
    () =>
      uniqueBy(filtersData, (r) => num(r.fk_college_id)).sort(
        (a, b) => num(a.clg_sort_order) - num(b.clg_sort_order),
      ),
    [filtersData],
  );

  const universityId = useMemo(
    () =>
      num(
        filtersData.find((r) => num(r.fk_college_id) === collegeId)
          ?.fk_university_id,
      ) || null,
    [filtersData, collegeId],
  );

  const academicYears = useMemo(() => {
    if (!universityId) return [];
    const rows = academicYearData.filter(
      (r) => num(r.fk_university_id) === universityId,
    );
    return uniqueBy(rows, (r) => num(r.fk_academic_year_id)).sort(
      (a, b) =>
        parseInt(text(b.academic_year), 10) -
        parseInt(text(a.academic_year), 10),
    );
  }, [academicYearData, universityId]);

  const courses = useMemo(() => {
    if (!collegeId) return [];
    const rows = filtersData.filter((r) => num(r.fk_college_id) === collegeId);
    return uniqueBy(rows, (r) => num(r.fk_course_id));
  }, [filtersData, collegeId]);

  const courseGroups = useMemo(() => {
    if (!collegeId || !courseId) return [];
    const rows = filtersData.filter(
      (r) =>
        num(r.fk_college_id) === collegeId && num(r.fk_course_id) === courseId,
    );
    return uniqueBy(rows, (r) => num(r.fk_course_group_id));
  }, [filtersData, collegeId, courseId]);

  const courseYears = useMemo(() => {
    if (!collegeId || !courseId || !courseGroupId) return [];
    const rows = filtersData.filter(
      (r) =>
        num(r.fk_college_id) === collegeId &&
        num(r.fk_course_id) === courseId &&
        num(r.fk_course_group_id) === courseGroupId,
    );
    return uniqueBy(rows, (r) => num(r.fk_course_year_id)).sort(
      (a, b) => num(a.year_order) - num(b.year_order),
    );
  }, [filtersData, collegeId, courseId, courseGroupId]);

  const collegeOptions = useMemo(
    () =>
      colleges.map((c) => ({
        value: String(c.fk_college_id),
        label: text(c.college_code),
      })),
    [colleges],
  );
  const academicYearOptions = useMemo(
    () =>
      academicYears.map((ay) => ({
        value: String(ay.fk_academic_year_id),
        label: text(ay.academic_year),
      })),
    [academicYears],
  );
  const courseOptions = useMemo(
    () =>
      courses.map((c) => ({
        value: String(c.fk_course_id),
        label: text(c.course_code),
      })),
    [courses],
  );
  const courseGroupOptions = useMemo(
    () =>
      courseGroups.map((g) => ({
        value: String(g.fk_course_group_id),
        label: text(g.group_code) || text(g.group_name),
      })),
    [courseGroups],
  );
  const courseYearOptions = useMemo(
    () =>
      courseYears.map((y) => ({
        value: String(y.fk_course_year_id),
        label: text(y.course_year_name),
      })),
    [courseYears],
  );

  function resetEmployeeSearch() {
    setEmployeeId(null);
    setEmployees([]);
    setEmployeeOptions([]);
  }

  function resetStudents() {
    setAllStudents([]);
    setUnassigned([]);
    setAssigned([]);
    setSelectedUnassigned(new Set());
    setSelectedAssigned(new Set());
    setHeaderLine("");
  }

  // Angular getFiltersList — auto-select first college.
  useEffect(() => {
    if (sessionLoading || isResolving) return;
    const orgId = readOrgId(user?.organizationId);
    const empId =
      loginEmployeeId || num(globalThis.localStorage?.getItem("employeeId"));
    if (!orgId || !empId) return;

    let cancelled = false;
    setLoadingFilters(true);
    void (async () => {
      try {
        const data = await getMentorshipAssignFilters(orgId, empId);
        if (cancelled) return;
        setFiltersData(data.filtersData);
        setAcademicYearData(data.academicYearData);
        const sorted = uniqueBy(data.filtersData, (r) =>
          num(r.fk_college_id),
        ).sort((a, b) => num(a.clg_sort_order) - num(b.clg_sort_order));
        if (sorted.length === 0) {
          toastSuccess("No Record(s) found.");
          return;
        }
        setCollegeId(num(sorted[0]?.fk_college_id) || null);
      } catch (e) {
        if (!cancelled) toastError(getErrorMessage(e));
      } finally {
        if (!cancelled) setLoadingFilters(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionLoading, isResolving, user?.organizationId, loginEmployeeId]);

  // Angular selectedCollege → current AY → selectedAcamicYear → first course → group (year NOT auto).
  useEffect(() => {
    if (!collegeId) {
      setAcademicYearId(null);
      setCourseId(null);
      setCourseGroupId(null);
      setCourseYearId(null);
      resetEmployeeSearch();
      resetStudents();
      return;
    }
    resetEmployeeSearch();
    resetStudents();
    setCourseYearId(null);

    const uni = num(
      filtersData.find((r) => num(r.fk_college_id) === collegeId)
        ?.fk_university_id,
    );
    const ayRows = uniqueBy(
      academicYearData.filter((r) => num(r.fk_university_id) === uni),
      (r) => num(r.fk_academic_year_id),
    );
    const currentAy = [...ayRows].sort(
      (a, b) => num(b.is_curr_ay) - num(a.is_curr_ay),
    )[0];
    const nextAy = num(currentAy?.fk_academic_year_id) || null;
    setAcademicYearId(nextAy);

    const courseRows = uniqueBy(
      filtersData.filter((r) => num(r.fk_college_id) === collegeId),
      (r) => num(r.fk_course_id),
    );
    const nextCourse = num(courseRows[0]?.fk_course_id) || null;
    setCourseId(nextCourse);

    if (nextCourse) {
      const groupRows = uniqueBy(
        filtersData.filter(
          (r) =>
            num(r.fk_college_id) === collegeId &&
            num(r.fk_course_id) === nextCourse,
        ),
        (r) => num(r.fk_course_group_id),
      );
      setCourseGroupId(num(groupRows[0]?.fk_course_group_id) || null);
    } else {
      setCourseGroupId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- college-driven cascade only
  }, [collegeId, filtersData, academicYearData]);

  function onAcademicYearChange(ayId: number | null) {
    setAcademicYearId(ayId);
    setCourseYearId(null);
    resetEmployeeSearch();
    resetStudents();
    if (!collegeId || !ayId) {
      setCourseId(null);
      setCourseGroupId(null);
      return;
    }
    const courseRows = uniqueBy(
      filtersData.filter((r) => num(r.fk_college_id) === collegeId),
      (r) => num(r.fk_course_id),
    );
    const nextCourse = num(courseRows[0]?.fk_course_id) || null;
    setCourseId(nextCourse);
    if (nextCourse) {
      const groupRows = uniqueBy(
        filtersData.filter(
          (r) =>
            num(r.fk_college_id) === collegeId &&
            num(r.fk_course_id) === nextCourse,
        ),
        (r) => num(r.fk_course_group_id),
      );
      setCourseGroupId(num(groupRows[0]?.fk_course_group_id) || null);
    } else {
      setCourseGroupId(null);
    }
  }

  function onCourseChange(coid: number | null) {
    setCourseId(coid);
    setCourseYearId(null);
    resetEmployeeSearch();
    resetStudents();
    if (!collegeId || !coid) {
      setCourseGroupId(null);
      return;
    }
    const groupRows = uniqueBy(
      filtersData.filter(
        (r) =>
          num(r.fk_college_id) === collegeId && num(r.fk_course_id) === coid,
      ),
      (r) => num(r.fk_course_group_id),
    );
    setCourseGroupId(num(groupRows[0]?.fk_course_group_id) || null);
  }

  function onCourseGroupChange(gid: number | null) {
    setCourseGroupId(gid);
    setCourseYearId(null);
    resetEmployeeSearch();
    resetStudents();
  }

  /** Angular selectedSection(courseYearId) — set AY dates from course year row; do not auto-load students. */
  function onCourseYearChange(yid: number | null) {
    setCourseYearId(yid);
    resetEmployeeSearch();
    resetStudents();
    if (!yid) return;
    const year = courseYears.find((y) => num(y.fk_course_year_id) === yid);
    const from = parseMaybeDate(year?.ay_from_date);
    const to = parseMaybeDate(year?.ay_to_date);
    if (from) setFromDate(from);
    if (to) setToDate(to);

    const clg = colleges.find((c) => num(c.fk_college_id) === collegeId);
    const ay = academicYears.find(
      (a) => num(a.fk_academic_year_id) === academicYearId,
    );
    const course = courses.find((c) => num(c.fk_course_id) === courseId);
    const group = courseGroups.find(
      (g) => num(g.fk_course_group_id) === courseGroupId,
    );
    setHeaderLine(
      [
        text(clg?.college_code),
        text(ay?.academic_year),
        text(course?.course_code),
        text(group?.group_name) || text(group?.group_code),
        text(year?.course_year_name),
      ]
        .filter(Boolean)
        .join(" / "),
    );
  }

  function onFromDateChange(d: Date | null) {
    setFromDate(d);
    if (d && toDate && d.getTime() > toDate.getTime()) {
      toastInfo("From date should be less then To date.");
      setToDate(d);
    }
  }

  function onToDateChange(d: Date | null) {
    if (d && fromDate && fromDate.getTime() > d.getTime()) {
      toastInfo("From date should be less then To date.");
      setToDate(fromDate);
      return;
    }
    setToDate(d);
  }

  const loadStudentsForEmployee = useCallback(
    async (eid: number) => {
      if (
        !collegeId ||
        !academicYearId ||
        !courseId ||
        !courseGroupId ||
        !courseYearId
      )
        return;
      setLoading(true);
      resetStudents();
      try {
        const [students, mapped] = await Promise.all([
          listStudentsForCounselorAssignment({
            collegeId,
            academicYearId,
            courseId,
            courseGroupId,
            courseYearId,
          }),
          listMappedCounselorStudents({
            collegeId,
            courseGroupId,
            courseYearId,
          }),
        ]);

        if (students.length === 0) {
          toastSuccess("No Record(s) found.");
          return;
        }

        let mappingFrom: Date | null = null;
        let mappingTo: Date | null = null;
        const normalized = students.map((s) => {
          const row = { ...(s as StudentRow) };
          if (row.genderDisplayName === "Male") row.genderDisplayName = "M";
          if (row.genderDisplayName === "Female") row.genderDisplayName = "F";
          const map = mapped.find(
            (m) =>
              Number(m.studentId) === Number(row.studentId) &&
              m.isActive === true,
          );
          if (map) {
            row.counselorId = Number(map.counselorId);
            row.employeeId = Number(map.employeeId);
            row.fromDate = map.fromDate;
            row.toDate = map.toDate;
            if (Number(map.employeeId) === eid) {
              if (map.fromDate) mappingFrom = new Date(String(map.fromDate));
              if (map.toDate) mappingTo = new Date(String(map.toDate));
            }
          }
          return row;
        });

        setAllStudents(normalized);
        setAssigned(
          normalized.filter(
            (s) => Number(s.employeeId) === eid && Boolean(s.counselorId),
          ),
        );
        setUnassigned(normalized.filter((s) => !s.counselorId));
        if (mappingFrom) setFromDate(mappingFrom);
        if (mappingTo) setToDate(mappingTo);

        const clg = colleges.find((c) => num(c.fk_college_id) === collegeId);
        const ay = academicYears.find(
          (a) => num(a.fk_academic_year_id) === academicYearId,
        );
        const course = courses.find((c) => num(c.fk_course_id) === courseId);
        const group = courseGroups.find(
          (g) => num(g.fk_course_group_id) === courseGroupId,
        );
        const year = courseYears.find(
          (y) => num(y.fk_course_year_id) === courseYearId,
        );
        setHeaderLine(
          [
            text(clg?.college_code),
            text(ay?.academic_year),
            text(course?.course_code),
            text(group?.group_name) || text(group?.group_code),
            text(year?.course_year_name),
          ]
            .filter(Boolean)
            .join(" / "),
        );
      } catch (e) {
        toastError(getErrorMessage(e));
      } finally {
        setLoading(false);
      }
    },
    [
      collegeId,
      academicYearId,
      courseId,
      courseGroupId,
      courseYearId,
      colleges,
      academicYears,
      courses,
      courseGroups,
      courseYears,
    ],
  );

  useEffect(() => {
    if (employeeId && courseYearId) void loadStudentsForEmployee(employeeId);
  }, [employeeId, courseYearId, loadStudentsForEmployee]);

  async function onEmployeeSearch(term: string) {
    const q = term.trim();
    if (q.length < 4) {
      setEmployeeOptions([]);
      return;
    }
    setEmployeeSearching(true);
    try {
      // Angular enteredEmployee: employeesearch?q=&empStatus=ACTV (no collegeId)
      const found = await searchEmployeesForMentorship(0, q);
      setEmployees(found);
      setEmployeeOptions(
        found.map((e) => ({
          value: String(e.employeeId),
          label:
            `${e.empNumber ?? ""}${e.firstName ? `(${String(e.firstName)})` : ""}`.trim(),
        })),
      );
    } catch (e) {
      toastError(getErrorMessage(e));
      setEmployeeOptions([]);
    } finally {
      setEmployeeSearching(false);
    }
  }

  const filteredUnassigned = useMemo(() => {
    const q = leftSearch.trim().toLowerCase();
    if (!q) return unassigned;
    return unassigned.filter((s) => studentLabel(s).toLowerCase().includes(q));
  }, [unassigned, leftSearch]);

  const filteredAssigned = useMemo(() => {
    const q = rightSearch.trim().toLowerCase();
    if (!q) return assigned;
    return assigned.filter((s) => studentLabel(s).toLowerCase().includes(q));
  }, [assigned, rightSearch]);

  function moveToAssigned() {
    const moving = unassigned.filter((s) =>
      selectedUnassigned.has(studentKey(s)),
    );
    if (!moving.length) return;
    setUnassigned((prev) =>
      prev.filter((s) => !selectedUnassigned.has(studentKey(s))),
    );
    setAssigned((prev) => [...prev, ...moving]);
    setSelectedUnassigned(new Set());
  }

  function moveToUnassigned() {
    const moving = assigned.filter((s) => selectedAssigned.has(studentKey(s)));
    if (!moving.length) return;
    setAssigned((prev) =>
      prev.filter((s) => !selectedAssigned.has(studentKey(s))),
    );
    setUnassigned((prev) => [...prev, ...moving]);
    setSelectedAssigned(new Set());
  }

  function toggleSet(
    setter: React.Dispatch<React.SetStateAction<Set<number>>>,
    id: number,
  ) {
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function assignCounselor() {
    if (!employeeId || !collegeId) {
      toastError("Select college and employee");
      return;
    }
    const from = fromDate;
    const to = toDate;
    if (!from || !to) {
      toastError("Select from and to dates");
      return;
    }
    if (from > to) {
      toastInfo("From date should be less then To date.");
      return;
    }

    const payload: MentorshipRow[] = [];

    for (const s of assigned) {
      payload.push({
        ...s,
        collegeId,
        employeeId,
        fromDate: from.toISOString(),
        toDate: to.toISOString(),
        isActive: true,
      });
    }

    for (const s of unassigned) {
      const original = allStudents.find((x) => studentKey(x) === studentKey(s));
      if (original?.counselorId) {
        payload.push({
          ...original,
          isActive: false,
        });
      }
    }

    if (!payload.length) {
      toastInfo("No students to assign.");
      return;
    }

    setSaving(true);
    try {
      await saveCounselorMappings(payload);
      toastSuccess("Counselor assignment saved");
      await loadStudentsForEmployee(employeeId);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      toastError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  // Angular shows dual lists when students API returned rows (even if both sides empty of unassigned).
  const showStudents = allStudents.length > 0;
  const counselorName =
    (employees.find((e) => Number(e.employeeId) === employeeId)?.firstName as
      | string
      | undefined) ?? "Counselor";

  return (
    <FilteredListPage
      title={title}
      filters={
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <Select
              label="College *"
              value={collegeId ? String(collegeId) : null}
              onChange={(v) => setCollegeId(v ? Number(v) : null)}
              options={collegeOptions}
              searchable
              isLoading={loadingFilters}
              placeholder="College"
              className="md:col-span-2"
            />
            <Select
              label="Academic Year *"
              value={academicYearId ? String(academicYearId) : null}
              onChange={(v) => onAcademicYearChange(v ? Number(v) : null)}
              options={academicYearOptions}
              searchable
              disabled={!collegeId}
              placeholder="Academic Year"
              className="md:col-span-2"
            />
            <Select
              label="Course *"
              value={courseId ? String(courseId) : null}
              onChange={(v) => onCourseChange(v ? Number(v) : null)}
              options={courseOptions}
              searchable
              disabled={!academicYearId}
              placeholder="Course"
              className="md:col-span-2"
            />
            <Select
              label="Course Group *"
              value={courseGroupId ? String(courseGroupId) : null}
              onChange={(v) => onCourseGroupChange(v ? Number(v) : null)}
              options={courseGroupOptions}
              searchable
              disabled={!courseId}
              placeholder="Course Group"
              className="md:col-span-3"
            />
            <Select
              label="Course Year *"
              value={courseYearId ? String(courseYearId) : null}
              onChange={(v) => onCourseYearChange(v ? Number(v) : null)}
              options={courseYearOptions}
              searchable
              disabled={!courseGroupId}
              placeholder="Course Year"
              className="md:col-span-3"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            {courseYearId ? (
              <Select
                label="Employee *"
                value={employeeId ? String(employeeId) : null}
                onChange={(v) => setEmployeeId(v ? Number(v) : null)}
                options={employeeOptions}
                searchable
                isLoading={employeeSearching}
                onSearch={(term) => void onEmployeeSearch(term)}
                placeholder="Employee"
                className="md:col-span-4"
              />
            ) : null}
            <DatePicker
              label="From Date *"
              value={fromDate}
              onChange={onFromDateChange}
              clearable={false}
              className="md:col-span-2"
            />
            <DatePicker
              label="To Date *"
              value={toDate}
              onChange={onToDateChange}
              clearable={false}
              className="md:col-span-2"
            />
          </div>
        </div>
      }
      bodyClassName="border-t-0"
      body={
        showStudents ? (
          <div className="space-y-3">
            {headerLine ? (
              <p className="text-sm font-medium text-[hsl(var(--card-title))]">
                Students —{" "}
                <span className="text-muted-foreground font-normal">
                  {headerLine}
                </span>
              </p>
            ) : null}

            <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
              <div className="md:col-span-5 border rounded-sm overflow-hidden bg-card">
                <div className="bg-primary/10 border-b px-3 py-1.5 flex items-center justify-between text-sm font-semibold">
                  <span>Students</span>
                  <span>{unassigned.length}</span>
                </div>
                <div className="p-2 space-y-2">
                  <SearchInput
                    value={leftSearch}
                    onChange={setLeftSearch}
                    placeholder="Search…"
                  />
                  <ul className="h-[360px] overflow-y-auto border rounded-sm p-1 space-y-0.5">
                    {filteredUnassigned.length === 0 ? (
                      <li className="p-3 text-sm text-muted-foreground">
                        No students
                      </li>
                    ) : (
                      filteredUnassigned.map((s) => {
                        const id = studentKey(s);
                        return (
                          <li key={id}>
                            <label className="flex items-center gap-2 text-sm cursor-pointer px-2 py-1.5 hover:bg-muted/40 rounded-sm">
                              <input
                                type="checkbox"
                                checked={selectedUnassigned.has(id)}
                                onChange={() =>
                                  toggleSet(setSelectedUnassigned, id)
                                }
                              />
                              {studentLabel(s)}
                            </label>
                          </li>
                        );
                      })
                    )}
                  </ul>
                </div>
              </div>

              <div className="md:col-span-1 flex flex-row md:flex-col items-center justify-center gap-2 py-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={moveToAssigned}
                  disabled={loading}
                >
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={moveToUnassigned}
                  disabled={loading}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </div>

              <div className="md:col-span-6 border rounded-sm overflow-hidden bg-card">
                <div className="bg-primary/10 border-b px-3 py-1.5 flex items-center justify-between text-sm font-semibold">
                  <span className="truncate">{counselorName}</span>
                  <span>{assigned.length}</span>
                </div>
                <div className="p-2 space-y-2">
                  <SearchInput
                    value={rightSearch}
                    onChange={setRightSearch}
                    placeholder="Search…"
                  />
                  <ul className="h-[360px] overflow-y-auto border rounded-sm p-1 space-y-0.5">
                    {filteredAssigned.length === 0 ? (
                      <li className="p-3 text-sm text-muted-foreground">
                        No students
                      </li>
                    ) : (
                      filteredAssigned.map((s) => {
                        const id = studentKey(s);
                        return (
                          <li key={id}>
                            <label className="flex items-center gap-2 text-sm cursor-pointer px-2 py-1.5 hover:bg-muted/40 rounded-sm">
                              <input
                                type="checkbox"
                                checked={selectedAssigned.has(id)}
                                onChange={() =>
                                  toggleSet(setSelectedAssigned, id)
                                }
                              />
                              {studentLabel(s)}
                            </label>
                          </li>
                        );
                      })
                    )}
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                type="button"
                onClick={() => void assignCounselor()}
                disabled={saving || loading}
              >
                <UserPlus className="h-4 w-4 mr-1.5" />
                {saving ? "Saving…" : "Assign Counselor"}
              </Button>
            </div>
          </div>
        ) : loading ? (
          <p className="text-sm text-muted-foreground">Loading students…</p>
        ) : null
      }
    />
  );
}
