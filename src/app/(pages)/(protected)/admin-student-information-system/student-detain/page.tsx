"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Filter } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/layout";
import { Select } from "@/common/components/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSessionContext } from "@/context/SessionContext";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  getStudentInfoCollegeFilters,
  listStudentsForPromotionPreview,
  listStudentSectionsByProc,
  normalizeStudentRow,
  resolveDetainRecommendedGeneralDetailId,
  searchStudentsByKeyword,
  submitStudentDetain,
} from "@/services";
import { StudentSearchSelect } from "@/common/components/student-search";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/common/components/feedback";

/** Date-only ISO (YYYY-MM-DD) for detain from/to dates. */
function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

type AnyRow = Record<string, any>;

const UNIV = ["fk_university_id", "universityId"];
const COL = ["fk_college_id", "collegeId"];
const AY = ["fk_academic_year_id", "academicYearId"];
const CRS = ["fk_course_id", "courseId"];
const GRP = ["fk_course_group_id", "courseGroupId"];
const YR = ["fk_course_year_id", "courseYearId"];
const SEC = [
  "pk_group_section_id",
  "groupSectionId",
  "group_section_id",
  "fk_group_section_id",
];

function pickNum(row: AnyRow | null | undefined, keys: string[]): number {
  if (!row) return 0;
  for (const k of keys) {
    const n = Number(row[k] ?? 0);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

function pickText(row: AnyRow | null | undefined, keys: string[]): string {
  if (!row) return "";
  for (const k of keys) {
    const v = row[k];
    if (v != null && String(v).trim() !== "") return String(v);
  }
  return "";
}

function studentId(row: AnyRow, fallback: number): number {
  return (
    pickNum(row, [
      "studentId",
      "fk_student_id",
      "student_id",
      "id",
      "studentDetailId",
    ]) || fallback
  );
}

function dedupeBy<T>(rows: T[], keyFn: (row: T) => string | number): T[] {
  const seen = new Set<string | number>();
  return rows.filter((row) => {
    const key = keyFn(row);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function dedupeColleges(rows: AnyRow[]): AnyRow[] {
  const seen = new Set<number>();
  const out: AnyRow[] = [];
  for (const r of rows) {
    const id = pickNum(r, COL);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(r);
  }
  return out.sort(
    (a, b) => (Number(a.clg_sort_order) || 0) - (Number(b.clg_sort_order) || 0),
  );
}

function parseSelectNumber(v: string | null): number | null {
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function selectClass() {
  return "[&_label]:text-xs [&_label]:font-medium [&_button[role='combobox']]:h-8 [&_button[role='combobox']]:text-[12px]";
}

// eslint-disable-next-line sonarjs/cognitive-complexity -- Angular student-detain section cascade
export default function StudentDetainPage() {
  const { user } = useSessionContext();
  const employeeId = Number(user?.employeeId ?? 0);
  const organizationId = Number(user?.organizationId ?? 0);

  const [mode, setMode] = useState<"student" | "section">("student");
  const [filterOpen, setFilterOpen] = useState(true);
  const [studentOptions, setStudentOptions] = useState<AnyRow[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(
    null,
  );
  const [rows, setRows] = useState<AnyRow[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [reasonById, setReasonById] = useState<Record<number, string>>({});
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingRows, setLoadingRows] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [filtersData, setFiltersData] = useState<AnyRow[]>([]);
  const [academicYearData, setAcademicYearData] = useState<AnyRow[]>([]);
  const [sectionApiRows, setSectionApiRows] = useState<AnyRow[]>([]);
  const [loadingFilters, setLoadingFilters] = useState(false);

  const [collegeId, setCollegeId] = useState<number | null>(null);
  const [academicYearId, setAcademicYearId] = useState<number | null>(null);
  const [courseId, setCourseId] = useState<number | null>(null);
  const [courseGroupId, setCourseGroupId] = useState<number | null>(null);
  const [courseYearId, setCourseYearId] = useState<number | null>(null);
  const [groupSectionId, setGroupSectionId] = useState<number | null>(null);

  const sectionCascadeAutoFill = useRef(true);
  const studentsLoadSeq = useRef(0);

  const selectedRows = useMemo(
    () => rows.filter((row, i) => selectedIds.includes(studentId(row, i + 1))),
    [rows, selectedIds],
  );

  const canSubmit = useMemo(() => {
    if (selectedRows.length === 0 || submitting) return false;
    return selectedRows.every((row, index) => {
      const sid = studentId(row, index + 1);
      return (reasonById[sid] ?? "").trim().length > 0;
    });
  }, [reasonById, selectedRows, submitting]);

  const loadFilters = useCallback(async () => {
    setLoadingFilters(true);
    try {
      const r = await getStudentInfoCollegeFilters(organizationId, employeeId);
      setFiltersData(Array.isArray(r.filtersData) ? r.filtersData : []);
      setAcademicYearData(Array.isArray(r.academicData) ? r.academicData : []);
    } catch {
      setFiltersData([]);
      setAcademicYearData([]);
    } finally {
      setLoadingFilters(false);
    }
  }, [organizationId, employeeId]);

  useEffect(() => {
    if (mode === "section") void loadFilters();
  }, [mode, loadFilters]);

  const colleges = useMemo(
    () => dedupeColleges(filtersData.filter((r) => pickNum(r, COL) > 0)),
    [filtersData],
  );

  const universityId = useMemo(() => {
    if (!collegeId) return 0;
    const row = colleges.find((r) => pickNum(r, COL) === collegeId);
    return pickNum(row, UNIV);
  }, [colleges, collegeId]);

  const academicYears = useMemo(() => {
    if (!universityId) return [];
    const raw = academicYearData.filter(
      (r) => pickNum(r, UNIV) === universityId,
    );
    const deduped = dedupeBy(raw, (r) => pickNum(r, AY));
    return deduped.sort(
      (a, b) =>
        parseInt(String(b.academic_year ?? b.academicYear ?? 0), 10) -
        parseInt(String(a.academic_year ?? a.academicYear ?? 0), 10),
    );
  }, [academicYearData, universityId]);

  const courses = useMemo(() => {
    if (!collegeId) return [];
    return dedupeBy(
      filtersData.filter((x) => pickNum(x, COL) === collegeId),
      (r) => pickNum(r, CRS),
    );
  }, [collegeId, filtersData]);

  const courseGroups = useMemo(() => {
    if (!collegeId || !courseId) return [];
    return dedupeBy(
      filtersData.filter(
        (x) => pickNum(x, COL) === collegeId && pickNum(x, CRS) === courseId,
      ),
      (r) => pickNum(r, GRP),
    );
  }, [collegeId, courseId, filtersData]);

  const courseYears = useMemo(() => {
    if (!collegeId || !courseId || !courseGroupId) return [];
    return dedupeBy(
      filtersData.filter(
        (x) =>
          pickNum(x, COL) === collegeId &&
          pickNum(x, CRS) === courseId &&
          pickNum(x, GRP) === courseGroupId,
      ),
      (r) => pickNum(r, YR),
    ).sort((a, b) => (Number(a.year_order) || 0) - (Number(b.year_order) || 0));
  }, [collegeId, courseId, courseGroupId, filtersData]);

  useEffect(() => {
    if (mode !== "section" || loadingFilters || colleges.length === 0) return;
    if (!sectionCascadeAutoFill.current) return;
    setCollegeId((prev) =>
      prev && colleges.some((c) => pickNum(c, COL) === prev)
        ? prev
        : pickNum(colleges[0], COL),
    );
  }, [mode, loadingFilters, colleges]);

  useEffect(() => {
    if (!academicYears.length) {
      setAcademicYearId(null);
      return;
    }
    if (!sectionCascadeAutoFill.current) return;
    const current = academicYears.find((y) => Number(y.is_curr_ay ?? 0) === 1);
    setAcademicYearId((prev) =>
      prev && academicYears.some((y) => pickNum(y, AY) === prev)
        ? prev
        : pickNum(current ?? academicYears[0], AY),
    );
  }, [academicYears]);

  useEffect(() => {
    if (!courses.length) {
      setCourseId(null);
      return;
    }
    if (!sectionCascadeAutoFill.current) return;
    setCourseId((prev) =>
      prev && courses.some((c) => pickNum(c, CRS) === prev)
        ? prev
        : pickNum(courses[0], CRS),
    );
  }, [courses]);

  useEffect(() => {
    if (!courseGroups.length) {
      setCourseGroupId(null);
      return;
    }
    if (!sectionCascadeAutoFill.current) return;
    setCourseGroupId((prev) =>
      prev && courseGroups.some((g) => pickNum(g, GRP) === prev)
        ? prev
        : pickNum(courseGroups[0], GRP),
    );
  }, [courseGroups]);

  useEffect(() => {
    if (!courseYears.length) {
      setCourseYearId(null);
      return;
    }
    if (!sectionCascadeAutoFill.current) return;
    setCourseYearId((prev) =>
      prev && courseYears.some((y) => pickNum(y, YR) === prev)
        ? prev
        : pickNum(courseYears[0], YR),
    );
  }, [courseYears]);

  useEffect(() => {
    async function loadSections() {
      if (
        !collegeId ||
        !courseId ||
        !courseGroupId ||
        !courseYearId ||
        !academicYearId
      ) {
        setSectionApiRows([]);
        return;
      }
      const apiRows = await listStudentSectionsByProc({
        organizationId,
        employeeId,
        collegeId,
        courseId,
        courseGroupId,
        courseYearId,
        academicYearId,
      }).catch(() => []);
      setSectionApiRows(Array.isArray(apiRows) ? apiRows : []);
    }
    void loadSections();
  }, [
    organizationId,
    employeeId,
    collegeId,
    courseId,
    courseGroupId,
    courseYearId,
    academicYearId,
  ]);

  const sectionOpts = useMemo(
    () =>
      sectionApiRows.map((r) => ({
        value: String(pickNum(r, SEC)),
        label:
          pickText(r, ["section", "group_section_name", "groupSectionName"]) ||
          `Section ${pickNum(r, SEC)}`,
      })),
    [sectionApiRows],
  );

  const loadStudentsBySection = useCallback(async () => {
    if (!collegeId || !courseGroupId || !groupSectionId) {
      setRows([]);
      setSelectedIds([]);
      setReasonById({});
      return;
    }
    const seq = ++studentsLoadSeq.current;
    setLoadingRows(true);
    try {
      const fetched = await listStudentsForPromotionPreview({
        collegeId,
        courseGroupId,
        groupSectionId,
      });
      if (seq !== studentsLoadSeq.current) return;
      const normalized = (Array.isArray(fetched) ? fetched : []).map((row) =>
        normalizeStudentRow(row),
      );
      setRows(normalized);
      setSelectedIds([]);
      setReasonById({});
    } catch {
      if (seq !== studentsLoadSeq.current) return;
      setRows([]);
      setSelectedIds([]);
      setReasonById({});
    } finally {
      if (seq === studentsLoadSeq.current) setLoadingRows(false);
    }
  }, [collegeId, courseGroupId, groupSectionId]);

  useEffect(() => {
    if (mode !== "section") return;
    if (!groupSectionId) {
      setRows([]);
      setSelectedIds([]);
      setReasonById({});
      return;
    }
    void loadStudentsBySection();
  }, [mode, groupSectionId, loadStudentsBySection]);

  function clearSectionCascade() {
    setRows([]);
    setGroupSectionId(null);
    setSelectedIds([]);
    setReasonById({});
  }

  function resetSectionFilters() {
    sectionCascadeAutoFill.current = true;
    setCollegeId(null);
    setAcademicYearId(null);
    setCourseId(null);
    setCourseGroupId(null);
    setCourseYearId(null);
    setGroupSectionId(null);
    setSectionApiRows([]);
    setRows([]);
    setSelectedIds([]);
    setReasonById({});
  }

  async function onSearchStudents(term: string) {
    const q = term.trim();
    if (q.length === 0) {
      setStudentOptions([]);
      return;
    }
    if (q.length < 5) return;
    setLoadingStudents(true);
    try {
      const fetched = await searchStudentsByKeyword(q).catch(() => []);
      setStudentOptions(Array.isArray(fetched) ? fetched : []);
    } finally {
      setLoadingStudents(false);
    }
  }

  function onStudentSelect(nextId: number | null, match: AnyRow | null) {
    setSelectedStudentId(nextId);
    if (!nextId || !match) {
      setRows([]);
      setSelectedIds([]);
      setReasonById({});
      return;
    }
    setRows([normalizeStudentRow(match)]);
    setSelectedIds([]);
    setReasonById({});
  }

  function toggleSelected(id: number, checked: boolean) {
    setSelectedIds((prev) => {
      if (checked) return prev.includes(id) ? prev : [...prev, id];
      return prev.filter((x) => x !== id);
    });
  }

  function statusCode(row: AnyRow): string {
    return String(row.studentStatusCode ?? row.student_status_code ?? "")
      .trim()
      .toUpperCase();
  }

  function canDetain(row: AnyRow): boolean {
    const code = statusCode(row);
    if (!code) return true;
    return code !== "DTND" && code !== "DETAINRECOMMENDED";
  }

  function setReason(id: number, reason: string) {
    setReasonById((prev) => ({ ...prev, [id]: reason }));
  }

  async function onSubmitDetain() {
    if (!canSubmit) return;
    const selected = rows.filter((row, i) =>
      selectedIds.includes(studentId(row, i + 1)),
    );
    if (selected.length === 0) return;

    setSubmitting(true);
    try {
      // Detain must write the numeric STUDENTSTATUS/DETAINRECOMMENDED generalDetailId
      // as `studentStatusId` (Angular detain-modal parity) — not the string code, and
      // not the student's stale current status carried by ...row.
      const detainStatusId = await resolveDetainRecommendedGeneralDetailId();
      const nowIso = toIsoDate(new Date());
      const payloadRows = selected.map((row, i) => {
        const sid = studentId(row, i + 1);
        return {
          ...row,
          studentId: sid,
          reason: (reasonById[sid] ?? "").trim(),
          studentStatusId: detainStatusId,
          isPresent: true,
          isActive: true,
          fromDate: nowIso,
          toDate: nowIso,
        };
      });

      // Angular posts exactly one shape: the raw array. Sending it directly (instead of
      // trying wrapper variants and treating any non-throw as success) means a genuine
      // backend failure surfaces instead of a false "submitted successfully".
      await submitStudentDetain(payloadRows);

      toastSuccess("Student detain submitted successfully");
      if (mode === "student") {
        setRows((prev) =>
          prev.map((row, i) =>
            selectedIds.includes(studentId(row, i + 1))
              ? { ...row, studentStatusCode: "DETAINRECOMMENDED" }
              : row,
          ),
        );
      } else if (groupSectionId) {
        await loadStudentsBySection();
      }
      setSelectedIds([]);
      setReasonById({});
    } catch (error) {
      toastError(error, "Failed to submit student detain");
    } finally {
      setSubmitting(false);
    }
  }

  const collegeOpts = colleges.map((r) => ({
    value: String(pickNum(r, COL)),
    label: pickText(r, ["college_code", "collegeCode"]) || "College",
  }));
  const ayOpts = academicYears.map((r) => ({
    value: String(pickNum(r, AY)),
    label:
      pickText(r, ["academic_year", "academicYear"]) || `AY ${pickNum(r, AY)}`,
  }));
  const courseOpts = courses.map((r) => ({
    value: String(pickNum(r, CRS)),
    label: pickText(r, ["course_code", "courseCode"]) || "Course",
  }));
  const groupOpts = courseGroups.map((r) => ({
    value: String(pickNum(r, GRP)),
    label: pickText(r, ["group_code", "groupCode"]) || "Group",
  }));
  const yearOpts = courseYears.map((r) => ({
    value: String(pickNum(r, YR)),
    label:
      pickText(r, [
        "course_year_name",
        "courseYearName",
        "course_year_code",
        "courseYearCode",
      ]) || "Year",
  }));

  return (
    <PageContainer className="space-y-4">
      <div className="px-1">
        <Tabs
          value={mode}
          onValueChange={(v) => {
            if (v === "student") {
              setMode("student");
              resetSectionFilters();
              setStudentOptions([]);
              setSelectedStudentId(null);
              return;
            }
            setMode("section");
            setSelectedStudentId(null);
            setStudentOptions([]);
            setRows([]);
            setSelectedIds([]);
            setReasonById({});
            sectionCascadeAutoFill.current = true;
            void loadFilters();
          }}
        >
          <TabsList className="h-auto rounded-none border-b border-border bg-transparent p-0 text-muted-foreground">
            <TabsTrigger
              value="student"
              className="rounded-none border-b-2 border-transparent px-3 py-1.5 text-xs data-[state=active]:border-[#2f8fd4] data-[state=active]:bg-[#eaf4ff] data-[state=active]:text-[#1f4f7a] data-[state=active]:shadow-none"
            >
              Search By Student
            </TabsTrigger>
            <TabsTrigger
              value="section"
              className="rounded-none border-b-2 border-transparent px-3 py-1.5 text-xs data-[state=active]:border-[#2f8fd4] data-[state=active]:bg-[#eaf4ff] data-[state=active]:text-[#1f4f7a] data-[state=active]:shadow-none"
            >
              Search By Section
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="app-card overflow-hidden">
        <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/40 px-4 py-3">
          <h2 className="app-card-title">
            {mode === "section" ? "Students Detain" : "Student Detain"}
          </h2>
          <Button
            type="button"
            style={{ marginRight: "0px" }}
            size="sm"
            className="inline-flex items-center text-[12px] text-slate-700"
            onClick={() => setFilterOpen((v) => !v)}
            aria-expanded={filterOpen}
          >
            <Filter className="mr-1.5 h-3.5 w-3.5" />
            Filter
            <ChevronDown
              className={`ml-1.5 h-3.5 w-3.5 transition-transform ${filterOpen ? "rotate-180" : ""}`}
            />
          </Button>
        </div>

        {filterOpen && (
          <div className="p-3">
            {mode === "student" ? (
              <StudentSearchSelect
                label="Student"
                placeholder="Search student"
                value={selectedStudentId}
                students={studentOptions}
                selectedStudent={rows[0] ?? null}
                isLoading={loadingStudents}
                onSearch={(term) => void onSearchStudents(term)}
                onChange={onStudentSelect}
              />
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                  <div className={selectClass()}>
                    <Select
                      label="College"
                      required
                      value={collegeId ? String(collegeId) : null}
                      options={collegeOpts}
                      placeholder="Select College"
                      onChange={(v) => {
                        sectionCascadeAutoFill.current = v !== null && v !== "";
                        setCollegeId(parseSelectNumber(v));
                        setCourseId(null);
                        setCourseGroupId(null);
                        setCourseYearId(null);
                        clearSectionCascade();
                      }}
                      disabled={loadingFilters || !collegeOpts.length}
                      searchable
                    />
                  </div>
                  <div className={selectClass()}>
                    <Select
                      label="Academic Year"
                      required
                      value={academicYearId ? String(academicYearId) : null}
                      options={ayOpts}
                      placeholder="Select Academic Year"
                      onChange={(v) => {
                        sectionCascadeAutoFill.current = v !== null && v !== "";
                        setAcademicYearId(parseSelectNumber(v));
                        clearSectionCascade();
                      }}
                      disabled={loadingFilters || !ayOpts.length}
                      searchable
                    />
                  </div>
                  <div className={selectClass()}>
                    <Select
                      label="Course"
                      required
                      value={courseId ? String(courseId) : null}
                      options={courseOpts}
                      placeholder="Select Course"
                      onChange={(v) => {
                        sectionCascadeAutoFill.current = v !== null && v !== "";
                        setCourseId(parseSelectNumber(v));
                        setCourseGroupId(null);
                        setCourseYearId(null);
                        clearSectionCascade();
                      }}
                      disabled={loadingFilters || !courseOpts.length}
                      searchable
                    />
                  </div>
                  <div className={selectClass()}>
                    <Select
                      label="Course Group"
                      required
                      value={courseGroupId ? String(courseGroupId) : null}
                      options={groupOpts}
                      placeholder="Select Course Group"
                      onChange={(v) => {
                        sectionCascadeAutoFill.current = v !== null && v !== "";
                        setCourseGroupId(parseSelectNumber(v));
                        setCourseYearId(null);
                        clearSectionCascade();
                      }}
                      disabled={loadingFilters || !groupOpts.length}
                      searchable
                    />
                  </div>
                  <div className={selectClass()}>
                    <Select
                      label="Course Year"
                      required
                      value={courseYearId ? String(courseYearId) : null}
                      options={yearOpts}
                      placeholder="Select Course Year"
                      onChange={(v) => {
                        sectionCascadeAutoFill.current = v !== null && v !== "";
                        setCourseYearId(parseSelectNumber(v));
                        clearSectionCascade();
                      }}
                      disabled={loadingFilters || !yearOpts.length}
                      searchable
                    />
                  </div>
                  <div className={selectClass()}>
                    <Select
                      label="Section"
                      required
                      value={groupSectionId ? String(groupSectionId) : null}
                      options={sectionOpts}
                      placeholder="Select Section"
                      onChange={(v) => {
                        sectionCascadeAutoFill.current = v !== null && v !== "";
                        setGroupSectionId(parseSelectNumber(v));
                      }}
                      disabled={
                        loadingFilters ||
                        !courseYearId ||
                        sectionOpts.length === 0
                      }
                      searchable
                    />
                  </div>
                </div>
                {loadingRows ? (
                  <p className="text-xs text-muted-foreground">
                    Loading students…
                  </p>
                ) : null}
              </div>
            )}
          </div>
        )}
      </div>

      {rows.length > 0 && (
        <div className="app-card overflow-hidden">
          <div className="border-b border-border bg-muted/40 px-4 py-3">
            <h2 className="app-card-title">Detain</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2">
            <div className="border-b p-3 lg:border-b-0 lg:border-r">
              <div className="overflow-auto rounded border">
                <table className="w-full text-[12px]">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="px-2 py-1 text-left">Sl.No</th>
                      <th className="px-2 py-1 text-left">Hallticket No</th>
                      <th className="px-2 py-1 text-left">Student Name</th>
                      <th className="px-2 py-1 text-left">Select</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, index) => {
                      const sid = studentId(row, index + 1);
                      const disabled = !canDetain(row);
                      return (
                        <tr
                          key={`detain-row-${sid}-${index}`}
                          className="border-t"
                        >
                          <td className="px-2 py-1">{index + 1}</td>
                          <td className="px-2 py-1">
                            {pickText(row, [
                              "hallticketNumber",
                              "rollNumber",
                            ]) || "-"}
                          </td>
                          <td className="px-2 py-1">
                            {pickText(row, ["studentName", "firstName"]) || "-"}
                          </td>
                          <td className="px-2 py-1">
                            <input
                              type="checkbox"
                              disabled={disabled}
                              checked={selectedIds.includes(sid)}
                              onChange={(e) =>
                                toggleSelected(sid, e.target.checked)
                              }
                            />
                            {disabled && (
                              <span className="ml-2 text-[11px] text-amber-700">
                                {statusCode(row)}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-3">
              <div className="overflow-hidden rounded border">
                <div className="flex items-center justify-between border-b bg-muted/40 px-3 py-2 text-[12px] font-semibold">
                  <span>SELECTED STUDENT LIST</span>
                  <span>{selectedRows.length}</span>
                </div>
                <div className="p-3 text-[12px] text-slate-700">
                  {selectedRows.length === 0 ? (
                    <p>No Students Detain.</p>
                  ) : (
                    <ul className="space-y-2">
                      {selectedRows.map((row, index) => (
                        <li
                          key={`selected-${studentId(row, index + 1)}-${index}`}
                          className="space-y-1"
                        >
                          <div>
                            {pickText(row, ["studentName", "firstName"]) || "-"}{" "}
                            (
                            {pickText(row, [
                              "hallticketNumber",
                              "rollNumber",
                            ]) || "-"}
                            )
                          </div>
                          <textarea
                            value={reasonById[studentId(row, index + 1)] ?? ""}
                            onChange={(e) =>
                              setReason(
                                studentId(row, index + 1),
                                e.target.value,
                              )
                            }
                            placeholder="Detain reason"
                            className="w-full rounded border border-input px-2 py-1 text-[12px]"
                            rows={2}
                          />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {rows.length > 0 && selectedRows.length > 0 && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            disabled={!canSubmit}
            className="inline-flex items-center rounded bg-[hsl(var(--primary))] px-3 py-1.5 text-[12px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Submitting…" : "Submit"}
          </button>
        </div>
      )}
      <ConfirmDialog
        open={confirmOpen}
        title="Detain students?"
        description={`Recommend detention for ${selectedRows.length} selected student(s)? This updates their status and cannot be undone from this screen.`}
        confirmLabel="Detain"
        confirmVariant="destructive"
        isLoading={submitting}
        onConfirm={async () => {
          await onSubmitDetain();
          setConfirmOpen(false);
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </PageContainer>
  );
}
