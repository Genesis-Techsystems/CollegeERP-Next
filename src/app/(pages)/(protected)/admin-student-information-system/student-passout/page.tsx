"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, Filter } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/layout";
import { Select } from "@/common/components/select";
import { DatePicker } from "@/common/components/date-picker";
import { ConfirmDialog } from "@/common/components/feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useSessionContext } from "@/context/SessionContext";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  buildStudentPassoutPayload,
  getPassoutCollegeFilters,
  listStudentsForPassout,
  normalizeStudentRow,
  passoutDateTimeFromPicker,
  resolvePassedOutGeneralDetailId,
  submitStudentPassout,
} from "@/services";

type AnyRow = Record<string, any>;

const COL = ["fk_college_id", "collegeId"];
const AY = ["fk_academic_year_id", "academicYearId"];
const CRS = ["fk_course_id", "courseId"];
const GRP = ["fk_course_group_id", "courseGroupId"];
const YR = ["fk_course_year_id", "courseYearId"];

function dedupeByKey<T>(rows: T[], keyFn: (r: T) => string | number): T[] {
  const seen = new Set<string | number>();
  return rows.filter((r) => {
    const key = keyFn(r);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function pickNum(row: AnyRow | null | undefined, keys: string[]): number {
  if (!row) return 0;
  for (const k of keys) {
    const n = Number(row[k]);
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

function parseSelectNumber(v: string | null): number | null {
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function statusUpper(row: AnyRow): string {
  return String(row.studentStatusCode ?? row.student_status_code ?? "")
    .trim()
    .toUpperCase();
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

function selectClass() {
  return "[&_label]:text-xs [&_label]:font-medium [&_button[role='combobox']]:h-8 [&_button[role='combobox']]:text-[12px]";
}

// eslint-disable-next-line sonarjs/cognitive-complexity -- Cascade + table mirrors legacy Angular screen
export default function StudentPassoutPage() {
  const { user } = useSessionContext();

  const [filtersData, setFiltersData] = useState<AnyRow[]>([]);
  const [academicYearData, setAcademicYearData] = useState<AnyRow[]>([]);
  const [gmCodes, setGmCodes] = useState<AnyRow[]>([]);

  const [loadingFilters, setLoadingFilters] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [filterOpen, setFilterOpen] = useState(true);

  const [collegeId, setCollegeId] = useState<number | null>(null);
  const [academicYearId, setAcademicYearId] = useState<number | null>(null);
  const [courseId, setCourseId] = useState<number | null>(null);
  const [courseGroupId, setCourseGroupId] = useState<number | null>(null);
  const [courseYearId, setCourseYearId] = useState<number | null>(null);

  const [students, setStudents] = useState<AnyRow[]>([]);
  const [tableFilter, setTableFilter] = useState("");
  const [markAllChecked, setMarkAllChecked] = useState(false);

  const [passoutDate, setPassoutDate] = useState<Date | null>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const passedOutGdId = useMemo(
    () => resolvePassedOutGeneralDetailId(gmCodes),
    [gmCodes],
  );

  const loadFilters = useCallback(async () => {
    const employeeId = Number(user?.employeeId ?? 0);
    const organizationId = Number(user?.organizationId ?? 0);
    setLoadingFilters(true);
    try {
      const r = await getPassoutCollegeFilters(organizationId, employeeId);
      setFiltersData(Array.isArray(r.filtersData) ? r.filtersData : []);
      setAcademicYearData(Array.isArray(r.academicData) ? r.academicData : []);
      setGmCodes(
        Array.isArray(r.studentStatusGmCodes) ? r.studentStatusGmCodes : [],
      );

      const cols = dedupeColleges(
        Array.isArray(r.filtersData) ? r.filtersData : [],
      );
      if (cols.length) {
        setCollegeId(pickNum(cols[0], COL));
        setAcademicYearId(null);
        setCourseId(null);
        setCourseGroupId(null);
        setCourseYearId(null);
      }
    } catch (e) {
      toastError(e, "Failed to load filters");
      setFiltersData([]);
      setAcademicYearData([]);
      setGmCodes([]);
    } finally {
      setLoadingFilters(false);
    }
  }, [user?.employeeId, user?.organizationId]);

  useEffect(() => {
    void loadFilters();
  }, [loadFilters]);

  const colleges = useMemo(() => dedupeColleges(filtersData), [filtersData]);

  const universityId = useMemo(() => {
    if (!collegeId || !filtersData.length) return 0;
    const row = filtersData.find((x) => pickNum(x, COL) === collegeId);
    return pickNum(row ?? {}, ["fk_university_id", "universityId"]);
  }, [collegeId, filtersData]);

  const academicYears = useMemo(() => {
    if (!universityId) return [];
    const raw = academicYearData.filter(
      (x) => pickNum(x, ["fk_university_id", "universityId"]) === universityId,
    );
    const deduped = dedupeByKey(raw, (r) => pickNum(r, AY));
    return deduped.sort(
      (a, b) =>
        parseInt(String(b.academic_year ?? 0), 10) -
        parseInt(String(a.academic_year ?? 0), 10),
    );
  }, [universityId, academicYearData]);

  useEffect(() => {
    if (!academicYears.length) {
      setAcademicYearId(null);
      return;
    }
    setAcademicYearId((prev) => {
      if (prev && academicYears.some((y) => pickNum(y, AY) === prev))
        return prev;
      return pickNum(academicYears[0], AY);
    });
  }, [academicYears]);

  const courses = useMemo(() => {
    if (!collegeId) return [];
    const raw = filtersData.filter((x) => pickNum(x, COL) === collegeId);
    return dedupeByKey(raw, (r) => pickNum(r, CRS));
  }, [collegeId, filtersData]);

  useEffect(() => {
    if (!courses.length) {
      setCourseId(null);
      return;
    }
    setCourseId((prev) => {
      if (prev && courses.some((c) => pickNum(c, CRS) === prev)) return prev;
      return pickNum(courses[0], CRS);
    });
  }, [courses]);

  const courseGroups = useMemo(() => {
    if (!collegeId || !courseId) return [];
    const raw = filtersData.filter(
      (x) => pickNum(x, COL) === collegeId && pickNum(x, CRS) === courseId,
    );
    return dedupeByKey(raw, (r) => pickNum(r, GRP));
  }, [collegeId, courseId, filtersData]);

  useEffect(() => {
    if (!courseGroups.length) {
      setCourseGroupId(null);
      return;
    }
    setCourseGroupId((prev) => {
      if (prev && courseGroups.some((g) => pickNum(g, GRP) === prev))
        return prev;
      return pickNum(courseGroups[0], GRP);
    });
  }, [courseGroups]);

  const courseYears = useMemo(() => {
    if (!collegeId || !courseId || !courseGroupId) return [];
    const raw = filtersData.filter(
      (x) =>
        pickNum(x, COL) === collegeId &&
        pickNum(x, CRS) === courseId &&
        pickNum(x, GRP) === courseGroupId,
    );
    return dedupeByKey(raw, (r) => pickNum(r, YR));
  }, [collegeId, courseId, courseGroupId, filtersData]);

  /** Angular does not default course year — user chooses, then list loads. */
  const loadStudentsForYear = useCallback(
    async (yearId: number | null) => {
      if (!collegeId || !academicYearId || !courseGroupId || !yearId) {
        setStudents([]);
        return;
      }
      setLoadingStudents(true);
      try {
        const rows = await listStudentsForPassout({
          collegeId,
          academicYearId,
          courseGroupId,
          courseYearId: yearId,
        });
        setStudents(
          rows.map((r) => ({
            ...normalizeStudentRow(r),
            ...r,
            checked: false,
            isPresent: false,
          })),
        );
        setMarkAllChecked(false);
      } catch (e) {
        toastError(e, "Failed to load students");
        setStudents([]);
      } finally {
        setLoadingStudents(false);
      }
    },
    [collegeId, academicYearId, courseGroupId],
  );

  useEffect(() => {
    void loadStudentsForYear(courseYearId);
  }, [courseYearId, loadStudentsForYear]);

  const filteredStudents = useMemo(() => {
    const q = tableFilter.trim().toLowerCase();
    if (!q) return students;
    return students.filter((row) => {
      const parts = [
        pickText(row, ["hallticketNumber", "hallticket_number"]),
        pickText(row, ["firstName", "first_name"]),
        pickText(row, ["studentStatusCode", "student_status_code"]),
        pickText(row, ["section", "group_section_name"]),
      ]
        .join(" ")
        .toLowerCase();
      return parts.includes(q);
    });
  }, [students, tableFilter]);

  const selectedCount = useMemo(
    () =>
      students.filter(
        (r) => r.checked && r.isPresent && statusUpper(r) !== "PASSEDOUT",
      ).length,
    [students],
  );

  const eligibleForMarkAll = useMemo(
    () => students.filter((r) => statusUpper(r) !== "PASSEDOUT"),
    [students],
  );

  useEffect(() => {
    const elig = students.filter((r) => statusUpper(r) !== "PASSEDOUT");
    if (!elig.length) {
      setMarkAllChecked(false);
      return;
    }
    setMarkAllChecked(elig.every((r) => r.isPresent));
  }, [students]);

  function handleCheckRow(studentKey: string, checked: boolean) {
    setStudents((prev) =>
      prev.map((row) => {
        const key = rowStudentKey(row);
        if (key !== studentKey) return row;
        if (statusUpper(row) === "PASSEDOUT") return row;
        return { ...row, checked, isPresent: checked };
      }),
    );
  }

  function rowStudentKey(row: AnyRow): string {
    const id = pickNum(row, ["studentId", "fk_student_id"]);
    const ht = pickText(row, ["hallticketNumber", "hallticket_number"]);
    return id ? `id:${id}` : `ht:${ht}`;
  }

  function handleMarkAllToggle() {
    const nextChecked = !markAllChecked;
    setStudents((prev) =>
      prev.map((row) =>
        statusUpper(row) === "PASSEDOUT"
          ? row
          : { ...row, checked: nextChecked, isPresent: nextChecked },
      ),
    );
  }

  const headerLine = useMemo(() => {
    const c = colleges.find((x) => pickNum(x, COL) === collegeId);
    const ay = academicYears.find((x) => pickNum(x, AY) === academicYearId);
    const cr = courses.find((x) => pickNum(x, CRS) === courseId);
    const cg = courseGroups.find((x) => pickNum(x, GRP) === courseGroupId);
    const cy = courseYears.find((x) => pickNum(x, YR) === courseYearId);
    return {
      clg: pickText(c, ["college_code", "collegeCode"]) || "—",
      ac: pickText(ay, ["academic_year", "academicYear"]) || "—",
      cr: pickText(cr, ["course_code", "courseCode"]) || "—",
      grp: pickText(cg, ["group_code", "groupCode"]) || "—",
      yr:
        pickText(cy, [
          "course_year_name",
          "courseYearName",
          "course_year_code",
        ]) || "—",
    };
  }, [
    colleges,
    collegeId,
    academicYears,
    academicYearId,
    courses,
    courseId,
    courseGroups,
    courseGroupId,
    courseYears,
    courseYearId,
  ]);

  function requestPassout() {
    if (!passedOutGdId) {
      toastError(
        new Error("Missing PASSEDOUT status"),
        "General master STUDENTSTATUS is missing PASSEDOUT.",
      );
      return;
    }
    const chosen = students.filter(
      (r) => r.checked && r.isPresent && statusUpper(r) !== "PASSEDOUT",
    );
    if (!chosen.length) {
      toastError(new Error("No students"), "Select at least one student.");
      return;
    }
    if (!passoutDate) {
      toastError(new Error("No date"), "Choose passed out date.");
      return;
    }
    setConfirmOpen(true);
  }

  async function confirmPassout() {
    if (!passedOutGdId || !passoutDate) return;
    const dt = passoutDateTimeFromPicker(passoutDate);
    const chosen = students.filter(
      (r) => r.checked && r.isPresent && statusUpper(r) !== "PASSEDOUT",
    );
    const payloads = chosen.map((row) =>
      buildStudentPassoutPayload(row, passedOutGdId, dt),
    );
    setSubmitting(true);
    try {
      await submitStudentPassout(payloads);
      toastSuccess("Students marked as passed out.");
      setConfirmOpen(false);
      void loadStudentsForYear(courseYearId);
    } catch (e) {
      toastError(e, "Pass out failed");
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
      pickText(r, ["course_year_name", "courseYearName", "course_year_code"]) ||
      "Year",
  }));

  return (
    <PageContainer>
      <div className="space-y-4">
        <div className="app-card overflow-hidden">
          <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/40 px-3 py-2.5">
            <h2 className="app-card-title">Student Passout</h2>
            <Button
              type="button"
              variant="outline"
              style={{ marginRight: "0px" }}
              size="sm"
              className="h-6 px-2.5 text-[12px]"
              onClick={() => setFilterOpen((v) => !v)}
              aria-expanded={filterOpen}
            >
              <Filter className="mr-1.5 h-3.5 w-3.5" />
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${filterOpen ? "rotate-180" : ""}`}
              />
            </Button>
          </div>
          {filterOpen && (
            <div className="p-3">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <div className={selectClass()}>
                  <Select
                    label="College"
                    placeholder="College"
                    value={collegeId ? String(collegeId) : null}
                    onChange={(v) => {
                      const id = parseSelectNumber(v);
                      setCollegeId(id);
                      setCourseYearId(null);
                    }}
                    options={collegeOpts}
                    disabled={loadingFilters || !collegeOpts.length}
                    searchable
                  />
                </div>
                <div className={selectClass()}>
                  <Select
                    label="Academic year"
                    placeholder="Academic year"
                    value={academicYearId ? String(academicYearId) : null}
                    onChange={(v) => {
                      setAcademicYearId(parseSelectNumber(v));
                      setCourseYearId(null);
                    }}
                    options={ayOpts}
                    disabled={loadingFilters || !ayOpts.length}
                    searchable
                  />
                </div>
                <div className={selectClass()}>
                  <Select
                    label="Course"
                    placeholder="Course"
                    value={courseId ? String(courseId) : null}
                    onChange={(v) => {
                      setCourseId(parseSelectNumber(v));
                      setCourseYearId(null);
                    }}
                    options={courseOpts}
                    disabled={loadingFilters || !courseOpts.length}
                    searchable
                  />
                </div>
                <div className={selectClass()}>
                  <Select
                    label="Course group"
                    placeholder="Course group"
                    value={courseGroupId ? String(courseGroupId) : null}
                    onChange={(v) => {
                      setCourseGroupId(parseSelectNumber(v));
                      setCourseYearId(null);
                    }}
                    options={groupOpts}
                    disabled={loadingFilters || !groupOpts.length}
                    searchable
                  />
                </div>
                <div className={selectClass()}>
                  <Select
                    label="Course year"
                    placeholder="Course year"
                    value={courseYearId ? String(courseYearId) : null}
                    onChange={(v) => setCourseYearId(parseSelectNumber(v))}
                    options={yearOpts}
                    disabled={loadingFilters || !yearOpts.length}
                    searchable
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {students.length > 0 && (
          <div className="rounded-lg border bg-card shadow-sm">
            <div className="border-b px-4 py-3">
              <p className="text-sm font-medium">
                Students — {headerLine.clg} / {headerLine.ac} / {headerLine.cr}{" "}
                / {headerLine.grp} / {headerLine.yr}{" "}
                <span className="text-muted-foreground">
                  (Total: {students.length})
                </span>
              </p>
            </div>
            <div className="flex flex-col gap-4 p-4 lg:flex-row">
              <div className="min-w-0 flex-1 space-y-3">
                <Input
                  placeholder="Search"
                  value={tableFilter}
                  onChange={(e) => setTableFilter(e.target.value)}
                  className="max-w-xs"
                />
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50 text-left">
                        <th className="px-3 py-2 font-medium">SI.No</th>
                        <th className="px-3 py-2 font-medium">
                          Hallticket No.
                        </th>
                        <th className="px-3 py-2 font-medium">Student name</th>
                        <th className="px-3 py-2 font-medium">Section</th>
                        <th className="px-3 py-2 font-medium">Status</th>
                        <th className="px-3 py-2 font-medium">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={markAllChecked}
                              onCheckedChange={() => handleMarkAllToggle()}
                              disabled={!eligibleForMarkAll.length}
                              aria-label="Mark all"
                            />
                            <span>
                              {markAllChecked ? "Unmark All" : "Mark All"}
                            </span>
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingStudents ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-3 py-6 text-center text-muted-foreground"
                          >
                            Loading students…
                          </td>
                        </tr>
                      ) : (
                        filteredStudents.map((row, index) => {
                          const disabled = statusUpper(row) === "PASSEDOUT";
                          const rowKey = `${rowStudentKey(row)}-${index}`;
                          const k = rowStudentKey(row);
                          const globalIdx = students.findIndex(
                            (s) => rowStudentKey(s) === k,
                          );
                          const siNo =
                            globalIdx >= 0 ? globalIdx + 1 : index + 1;
                          return (
                            <tr key={rowKey} className="border-b last:border-0">
                              <td className="px-3 py-2">{siNo}</td>
                              <td className="px-3 py-2">
                                {pickText(row, [
                                  "hallticketNumber",
                                  "hallticket_number",
                                ]) || "—"}
                              </td>
                              <td className="px-3 py-2">
                                {pickText(row, ["firstName", "first_name"]) ||
                                  "—"}
                              </td>
                              <td className="px-3 py-2">
                                {pickText(row, [
                                  "section",
                                  "group_section_name",
                                ]) || "—"}
                              </td>
                              <td className="px-3 py-2">
                                {pickText(row, [
                                  "studentStatusCode",
                                  "student_status_code",
                                ]) || "—"}
                              </td>
                              <td className="px-3 py-2">
                                {disabled ? (
                                  "—"
                                ) : (
                                  <Checkbox
                                    checked={Boolean(row.checked)}
                                    onCheckedChange={(c) =>
                                      handleCheckRow(
                                        rowStudentKey(row),
                                        c === true,
                                      )
                                    }
                                  />
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="w-full shrink-0 rounded-md border bg-muted/20 p-4 lg:w-72">
                <DatePicker
                  label="Passed out on"
                  value={passoutDate}
                  onChange={setPassoutDate}
                />
                <Button
                  className="mt-4 w-full"
                  onClick={requestPassout}
                  disabled={!selectedCount || submitting || loadingStudents}
                >
                  Pass out
                </Button>
                {selectedCount > 0 && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {selectedCount} student(s) selected
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {!!courseYearId && !loadingStudents && students.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No students found for this selection.
          </p>
        )}

        <ConfirmDialog
          open={confirmOpen}
          title="Confirm pass out"
          description={`Mark ${selectedCount} student(s) as passed out on this date?`}
          confirmLabel="Confirm pass out"
          confirmVariant="default"
          isLoading={submitting}
          onConfirm={() => void confirmPassout()}
          onCancel={() => setConfirmOpen(false)}
        />
      </div>
    </PageContainer>
  );
}
