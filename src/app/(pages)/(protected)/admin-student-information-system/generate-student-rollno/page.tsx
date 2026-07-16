"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Printer, Download } from "lucide-react";
import { FilteredPage } from "@/components/layout";
import { Select } from "@/common/components/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSessionContext } from "@/context/SessionContext";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  getStudentInfoCollegeFilters,
  listStudentsForRollNumberAssignment,
  submitStudentRollNumbers,
} from "@/services";

type AnyRow = Record<string, any>;

const COL = ["fk_college_id", "collegeId"];
const AY = ["fk_academic_year_id", "academicYearId"];
const CRS = ["fk_course_id", "courseId"];
const GRP = ["fk_course_group_id", "courseGroupId"];
const YR = ["fk_course_year_id", "courseYearId"];
const SEC = ["fk_group_section_id", "groupSectionId", "group_section_id"];

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

function parseSelectNumberOrZero(v: string | null): number {
  if (v === null || v === "") return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
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

function rowStudentKey(row: AnyRow): string {
  const id = pickNum(row, ["studentId", "fk_student_id", "student_id"]);
  return id
    ? `id:${id}`
    : `ad:${pickText(row, ["admissionNumber", "admission_no"])}`;
}

function selectClass() {
  return "[&_label]:text-xs [&_label]:font-medium [&_button[role='combobox']]:h-8 [&_button[role='combobox']]:text-[12px]";
}

function exportRollCsv(rows: AnyRow[]) {
  const header = [
    "SI.No",
    "Admission No",
    "Student Name",
    "Roll Number",
    "Hallticket Number",
  ];
  const lines = [header.join(",")];
  rows.forEach((row, i) => {
    const cells = [
      String(i + 1),
      pickText(row, ["admissionNumber", "admission_no"]) || "",
      pickText(row, ["firstName", "first_name"]) || "",
      String(row.rollNumber ?? row.roll_number ?? ""),
      String(row.hallticketNumber ?? row.hallticket_number ?? ""),
    ].map((c) => `"${String(c).replace(/"/g, '""')}"`);
    lines.push(cells.join(","));
  });
  const blob = new Blob(["\ufeff" + lines.join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "Assigned-Student-Roll-Number.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// eslint-disable-next-line sonarjs/cognitive-complexity -- Legacy cascade + editable grid
export default function GenerateStudentRollnoPage() {
  const { user } = useSessionContext();

  const [filtersData, setFiltersData] = useState<AnyRow[]>([]);
  const [academicYearData, setAcademicYearData] = useState<AnyRow[]>([]);

  const [loadingFilters, setLoadingFilters] = useState(true);
  const [loadingList, setLoadingList] = useState(false);
  const [saving, setSaving] = useState(false);
  const [collegeId, setCollegeId] = useState<number | null>(null);
  const [academicYearId, setAcademicYearId] = useState<number | null>(null);
  const [courseId, setCourseId] = useState<number | null>(null);
  const [courseGroupId, setCourseGroupId] = useState<number | null>(null);
  const [courseYearId, setCourseYearId] = useState<number | null>(null);
  /** 0 = all sections (four-id list), &gt; 0 = section-specific (five-id list). */
  const [groupSectionId, setGroupSectionId] = useState(0);

  const [students, setStudents] = useState<AnyRow[]>([]);
  const [tableFilter, setTableFilter] = useState("");
  const [rollPrefix, setRollPrefix] = useState("");
  const [rollStart, setRollStart] = useState("");

  const loadFilters = useCallback(async () => {
    const employeeId = Number(user?.employeeId ?? 0);
    const organizationId = Number(user?.organizationId ?? 0);
    setLoadingFilters(true);
    try {
      const r = await getStudentInfoCollegeFilters(organizationId, employeeId);
      setFiltersData(Array.isArray(r.filtersData) ? r.filtersData : []);
      setAcademicYearData(Array.isArray(r.academicData) ? r.academicData : []);

      const cols = dedupeColleges(
        Array.isArray(r.filtersData) ? r.filtersData : [],
      );
      if (cols.length) {
        setCollegeId(pickNum(cols[0], COL));
        setAcademicYearId(null);
        setCourseId(null);
        setCourseGroupId(null);
        setCourseYearId(null);
        setGroupSectionId(0);
      }
    } catch (e) {
      toastError(e, "Failed to load filters");
      setFiltersData([]);
      setAcademicYearData([]);
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

  useEffect(() => {
    if (!courseYears.length) {
      setCourseYearId(null);
      return;
    }
    setCourseYearId((prev) => {
      if (prev && courseYears.some((y) => pickNum(y, YR) === prev)) return prev;
      return pickNum(courseYears[0], YR);
    });
  }, [courseYears]);

  const sectionRows = useMemo(() => {
    if (!collegeId || !courseId || !courseGroupId || !courseYearId) return [];
    const raw = filtersData.filter(
      (x) =>
        pickNum(x, COL) === collegeId &&
        pickNum(x, CRS) === courseId &&
        pickNum(x, GRP) === courseGroupId &&
        pickNum(x, YR) === courseYearId,
    );
    return dedupeByKey(raw, (r) => pickNum(r, SEC));
  }, [collegeId, courseId, courseGroupId, courseYearId, filtersData]);

  useEffect(() => {
    setGroupSectionId(0);
    setStudents([]);
  }, [collegeId, academicYearId, courseId, courseGroupId, courseYearId]);

  const displayHeader = useMemo(() => {
    const c = colleges.find((x) => pickNum(x, COL) === collegeId);
    const ay = academicYears.find((x) => pickNum(x, AY) === academicYearId);
    const cr = courses.find((x) => pickNum(x, CRS) === courseId);
    const cg = courseGroups.find((x) => pickNum(x, GRP) === courseGroupId);
    const cy = courseYears.find((x) => pickNum(x, YR) === courseYearId);
    const secRow =
      groupSectionId > 0
        ? sectionRows.find((x) => pickNum(x, SEC) === groupSectionId)
        : null;
    return {
      collegeCode: pickText(c, ["college_code", "collegeCode"]) || "—",
      academicYear: pickText(ay, ["academic_year", "academicYear"]) || "—",
      course: pickText(cr, ["course_code", "courseCode"]) || "—",
      courseGroup: pickText(cg, ["group_code", "groupCode"]) || "—",
      courseYear:
        pickText(cy, [
          "course_year_name",
          "courseYearName",
          "course_year_code",
        ]) || "—",
      section:
        groupSectionId > 0
          ? pickText(secRow ?? {}, [
              "section",
              "group_section_name",
              "groupSectionName",
            ]) || "—"
          : "All",
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
    sectionRows,
    groupSectionId,
  ]);

  const handleGetList = useCallback(async () => {
    if (!collegeId || !academicYearId || !courseGroupId || !courseYearId) {
      toastError(new Error("Filters"), "Select college through course year.");
      return;
    }
    setLoadingList(true);
    try {
      const rows = await listStudentsForRollNumberAssignment({
        collegeId,
        academicYearId,
        courseGroupId,
        courseYearId,
        groupSectionId: groupSectionId > 0 ? groupSectionId : undefined,
      });
      setStudents(rows.map((r) => ({ ...r })));
      if (!rows.length) toastSuccess("No students found for this selection.");
    } catch (e) {
      toastError(e, "Failed to load students");
      setStudents([]);
    } finally {
      setLoadingList(false);
    }
  }, [collegeId, academicYearId, courseGroupId, courseYearId, groupSectionId]);

  const filteredStudents = useMemo(() => {
    const q = tableFilter.trim().toLowerCase();
    if (!q) return students;
    return students.filter((row) => {
      const blob = [
        pickText(row, ["admissionNumber", "admission_no"]),
        pickText(row, ["firstName", "first_name"]),
        String(row.rollNumber ?? ""),
        String(row.hallticketNumber ?? ""),
      ]
        .join(" ")
        .toLowerCase();
      return blob.includes(q);
    });
  }, [students, tableFilter]);

  function updateStudentField(
    key: string,
    field: "rollNumber" | "hallticketNumber",
    value: string,
  ) {
    setStudents((prev) =>
      prev.map((row) =>
        rowStudentKey(row) === key ? { ...row, [field]: value } : row,
      ),
    );
  }

  // Angular parity: auto-generate roll numbers for the whole loaded cohort from a
  // prefix + starting number, assigned in load order. Mutates local state only; the
  // existing saveRollNumbers path writes the full array.
  function generateRollNumbers() {
    if (!students.length) {
      toastError(new Error("Empty"), "Load students first.");
      return;
    }
    const start = Number(rollStart);
    if (!rollStart.trim() || !Number.isFinite(start)) {
      toastError(new Error("Invalid"), "Enter a valid starting number.");
      return;
    }
    setStudents((prev) =>
      prev.map((row, i) => ({ ...row, rollNumber: `${rollPrefix}${start + i}` })),
    );
  }

  async function saveRollNumbers() {
    if (!students.length) {
      toastError(new Error("Empty"), "Load students first.");
      return;
    }
    setSaving(true);
    try {
      await submitStudentRollNumbers(students);
      toastSuccess("Roll numbers saved.");
      await handleGetList();
    } catch (e) {
      toastError(e, "Save failed");
    } finally {
      setSaving(false);
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
  const sectionOpts = [
    { value: "0", label: "All sections" },
    ...sectionRows.map((r) => ({
      value: String(pickNum(r, SEC)),
      label:
        pickText(r, ["section", "group_section_name", "groupSectionName"]) ||
        `Section ${pickNum(r, SEC)}`,
    })),
  ];

  return (
    <FilteredPage
      title="Generate Student Roll No."
      className="print:space-y-2"
      filters={
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <div className={selectClass()}>
              <Select
                label="College"
                placeholder="College"
                value={collegeId ? String(collegeId) : null}
                onChange={(v) => {
                  setCollegeId(parseSelectNumber(v));
                  setStudents([]);
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
                  setStudents([]);
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
                  setStudents([]);
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
                  setStudents([]);
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
                onChange={(v) => {
                  setCourseYearId(parseSelectNumber(v));
                  setStudents([]);
                }}
                options={yearOpts}
                disabled={loadingFilters || !yearOpts.length}
                searchable
              />
            </div>
            <div className={selectClass()}>
              <Select
                label="Section"
                placeholder="Section"
                value={String(groupSectionId)}
                onChange={(v) => {
                  setGroupSectionId(parseSelectNumberOrZero(v));
                  setStudents([]);
                }}
                options={sectionOpts}
                disabled={loadingFilters || !courseYearId}
                searchable
              />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              onClick={() => void handleGetList()}
              disabled={loadingList || loadingFilters}
            >
              {loadingList ? "Loading…" : "Get list"}
            </Button>
            {loadingFilters && (
              <span className="self-center text-xs text-muted-foreground">
                Loading…
              </span>
            )}
          </div>
        </>
      }
    >
      <div className="space-y-4 print:space-y-2">
        {students.length > 0 && (
          <>
            <div className="rounded-lg border border-b-0 bg-muted/30 px-4 py-3 print:border print:bg-transparent">
              <p className="text-sm font-medium">
                Assign student roll number — {displayHeader.collegeCode} /{" "}
                {displayHeader.academicYear} / {displayHeader.course} /{" "}
                {displayHeader.courseGroup} / {displayHeader.courseYear} /{" "}
                {displayHeader.section}{" "}
                <span className="text-muted-foreground">
                  (Total: {students.length})
                </span>
              </p>
            </div>

            <div className="rounded-lg border bg-card shadow-sm print:border-0 print:shadow-none">
              <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-end sm:justify-between print:hidden">
                <div className="flex flex-wrap items-end gap-2">
                  <Input
                    placeholder="Search"
                    value={tableFilter}
                    onChange={(e) => setTableFilter(e.target.value)}
                    className="max-w-[12rem]"
                  />
                  <Input
                    placeholder="Prefix"
                    value={rollPrefix}
                    onChange={(e) => setRollPrefix(e.target.value)}
                    className="h-9 w-28"
                  />
                  <Input
                    placeholder="Starting number"
                    inputMode="numeric"
                    value={rollStart}
                    onChange={(e) => setRollStart(e.target.value)}
                    className="h-9 w-36"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={generateRollNumbers}
                  >
                    Generate roll numbers
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => exportRollCsv(students)}
                  >
                    <Download className="mr-1.5 h-4 w-4" />
                    Export CSV
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => window.print()}
                  >
                    <Printer className="mr-1.5 h-4 w-4" />
                    Print
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto px-4 pb-4 print:px-0">
                <table className="w-full min-w-[720px] text-xs">
                  <thead>
                    <tr className="border-b bg-muted/50 text-left text-xs">
                      <th className="px-2 py-1.5 font-medium">SI.No</th>
                      <th className="px-2 py-1.5 font-medium">Admission No</th>
                      <th className="px-2 py-1.5 font-medium">Student name</th>
                      <th className="px-2 py-1.5 font-medium">Roll number</th>
                      <th className="px-2 py-1.5 font-medium">
                        Hallticket number
                      </th>
                    </tr>
                  </thead>
                  <tbody className="text-xs">
                    {filteredStudents.map((row, index) => {
                      const key = rowStudentKey(row);
                      const gIdx = students.findIndex(
                        (s) => rowStudentKey(s) === key,
                      );
                      const siNo = gIdx >= 0 ? gIdx + 1 : index + 1;
                      return (
                        <tr key={key} className="border-b last:border-0">
                          <td className="px-2 py-1.5">{siNo}</td>
                          <td className="px-2 py-1.5">
                            {pickText(row, [
                              "admissionNumber",
                              "admission_no",
                            ]) || "—"}
                          </td>
                          <td className="px-2 py-1.5">
                            {pickText(row, ["firstName", "first_name"]) || "—"}
                          </td>
                          <td className="px-2 py-1.5">
                            <Input
                              className="h-7 min-w-[120px] text-xs"
                              value={String(
                                row.rollNumber ?? row.roll_number ?? "",
                              )}
                              onChange={(e) =>
                                updateStudentField(
                                  key,
                                  "rollNumber",
                                  e.target.value,
                                )
                              }
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <Input
                              className="h-7 min-w-[120px] text-xs"
                              value={String(
                                row.hallticketNumber ??
                                  row.hallticket_number ??
                                  "",
                              )}
                              onChange={(e) =>
                                updateStudentField(
                                  key,
                                  "hallticketNumber",
                                  e.target.value,
                                )
                              }
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end border-t p-4 print:hidden">
                <Button
                  onClick={() => void saveRollNumbers()}
                  disabled={saving}
                >
                  {saving ? "Saving…" : "Save"}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </FilteredPage>
  );
}
