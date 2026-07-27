"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { FilteredPage } from "@/components/layout";
import { Select } from "@/common/components/select";
import {
  getExamLabTimetableFilters,
  getExamLabTimetableGrid,
  getExamLabTimetableRestFilters,
} from "@/services/exam-lab-timetable";
import { useRouter, useSearchParams } from "next/navigation";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
import { Building2, Calendar, GraduationCap, ScrollText } from "lucide-react";
import { useSessionContext } from "@/context/SessionContext";
import CheckConflictsModal from "@/app/(pages)/(protected)/admin-examination-management/admin-exam-masters/exam-timetable/CheckConflictsModal";
import { EditExamLabTimetableModal } from "./_components/EditExamLabTimetableModal";

type AnyRow = Record<string, any>;

function formatExamOptionLabel(e: AnyRow): string {
  const name = String(e.exam_name ?? "—");
  let range = "";
  try {
    if (e.from_date && e.to_date) {
      range = ` (${format(parseISO(String(e.from_date)), "d MMM, yyyy")} - ${format(parseISO(String(e.to_date)), "d MMM, yyyy")})`;
    }
  } catch {
    // ignore
  }
  const tags: string[] = [];
  if (e.is_internal_exam) tags.push("(Internal)");
  if (e.is_regular_exam) tags.push("(Regular)");
  if (e.is_supply_exam) tags.push("(Supple)");
  return `${name}${range}${tags.length ? ` ${tags.join("")}` : ""}`;
}

function typeBadge(code: unknown): string {
  const c = String(code ?? "").toLowerCase();
  if (c === "regular") return "R";
  if (c === "supple") return "S";
  if (c === "internal") return "I";
  return String(code ?? "").slice(0, 1);
}

function cellClass(row: AnyRow): string {
  const flg = String(row.flg ?? row.flag ?? "");
  const session = String(row.examsessioninCatCode ?? "").toUpperCase();
  if (flg && flg !== "clgwise") return "bg-emerald-100";
  if (flg === "clgwise" && session === "AFTERNOON") return "bg-yellow-100";
  return "bg-sky-100";
}

function isCollegeWise(row: AnyRow): boolean {
  const flg = String(row.flg ?? row.flag ?? "clgwise");
  return flg === "clgwise" || flg === "";
}

export default function ExamLabTimetablePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useSessionContext();
  const empId = Number(user?.employeeId ?? 31754);
  const orgId = useMemo(() => {
    const fromStorage = Number(
      globalThis.localStorage?.getItem("organizationId") ?? 0,
    );
    const fromSession = Number(user?.organizationId ?? 0);
    return fromStorage || fromSession || 1;
  }, [user?.organizationId]);
  const orgIdRef = useRef(orgId);
  const empIdRef = useRef(empId);
  orgIdRef.current = orgId;
  empIdRef.current = empId;

  const [base, setBase] = useState<AnyRow[]>([]);
  const [rest, setRest] = useState<AnyRow[]>([]);
  const [gridRows, setGridRows] = useState<AnyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState(true);

  const [courseId, setCourseId] = useState<number | null>(null);
  const [academicYearId, setAcademicYearId] = useState<number | null>(null);
  const [examId, setExamId] = useState<number | null>(null);
  const [collegeId, setCollegeId] = useState<number | null>(null);
  const [courseYearId, setCourseYearId] = useState<number | null>(null);

  const [conflictsOpen, setConflictsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<AnyRow | null>(null);

  const preferred = useMemo(
    () => ({
      collegeId: Number(searchParams.get("collegeId") ?? 0) || null,
      courseId: Number(searchParams.get("courseId") ?? 0) || null,
      academicYearId: Number(searchParams.get("academicYearId") ?? 0) || null,
      courseYearId: Number(searchParams.get("courseYearId") ?? 0) || null,
      examId: Number(searchParams.get("examId") ?? 0) || null,
    }),
    [searchParams],
  );

  useEffect(() => {
    async function load() {
      setLoading(true);
      const rows = await getExamLabTimetableFilters(empId).catch(() => []);
      const list = rows.filter((x) => x.flag === "univ_exam_filters");
      setBase(list);
      const courses = dedupe(list, "fk_course_id");
      const first =
        preferred.courseId &&
        courses.some((c) => Number(c.fk_course_id) === preferred.courseId)
          ? preferred.courseId
          : Number(courses[0]?.fk_course_id ?? 0) || null;
      setCourseId(first);
      setLoading(false);
      setRestoring(false);
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empId]);

  const courses = useMemo(() => dedupe(base, "fk_course_id"), [base]);
  const years = useMemo(() => {
    const list = dedupe(
      base.filter((x) => Number(x.fk_course_id) === Number(courseId)),
      "fk_academic_year_id",
    );
    return [...list].sort(
      (a, b) =>
        Number(b?.is_curr_ay ?? 0) - Number(a?.is_curr_ay ?? 0) ||
        Number(String(b.academic_year).split("-")[0]) -
          Number(String(a.academic_year).split("-")[0]),
    );
  }, [base, courseId]);
  const exams = useMemo(
    () =>
      dedupe(
        base.filter(
          (x) =>
            Number(x.fk_course_id) === Number(courseId) &&
            Number(x.fk_academic_year_id) === Number(academicYearId),
        ),
        "fk_exam_id",
      ),
    [base, courseId, academicYearId],
  );

  useEffect(() => {
    if (!years.length) {
      setAcademicYearId(null);
      return;
    }
    if (
      preferred.academicYearId &&
      years.some(
        (y) => Number(y.fk_academic_year_id) === preferred.academicYearId,
      )
    ) {
      setAcademicYearId(preferred.academicYearId);
      return;
    }
    setAcademicYearId(Number(years[0].fk_academic_year_id));
  }, [years, preferred.academicYearId]);

  useEffect(() => {
    if (!exams.length) {
      setExamId(null);
      return;
    }
    if (
      preferred.examId &&
      exams.some((e) => Number(e.fk_exam_id) === preferred.examId)
    ) {
      setExamId(preferred.examId);
      return;
    }
    setExamId(Number(exams[0].fk_exam_id));
  }, [exams, preferred.examId]);

  useEffect(() => {
    async function loadRest() {
      setRest([]);
      setCollegeId(null);
      setCourseYearId(null);
      if (!courseId || !examId || !academicYearId) return;
      const rows = await getExamLabTimetableRestFilters({
        courseId,
        examId,
        academicYearId,
        empId: empIdRef.current,
      }).catch(() => []);
      const list = rows.filter((x) => x.flag === "univ_exam_rest_filters");
      setRest(list);
      const colleges = dedupe(list, "fk_college_id");
      const nextCollege =
        preferred.collegeId &&
        colleges.some((c) => Number(c.fk_college_id) === preferred.collegeId)
          ? preferred.collegeId
          : Number(colleges[0]?.fk_college_id ?? 0) || null;
      setCollegeId(nextCollege);
    }
    void loadRest();
  }, [courseId, examId, academicYearId, preferred.collegeId]);

  const colleges = useMemo(() => dedupe(rest, "fk_college_id"), [rest]);
  const courseYears = useMemo(
    () =>
      dedupe(
        rest.filter((x) => Number(x.fk_college_id) === Number(collegeId)),
        "fk_course_year_id",
      ),
    [rest, collegeId],
  );
  const courseGroups = useMemo(
    () =>
      dedupe(
        rest.filter((x) => Number(x.fk_course_id) === Number(courseId)),
        "fk_course_group_id",
      ),
    [rest, courseId],
  );

  // Angular does NOT auto-select course year — only restore from query params.
  useEffect(() => {
    if (!courseYears.length) {
      setCourseYearId(null);
      return;
    }
    if (
      preferred.courseYearId &&
      courseYears.some(
        (y) => Number(y.fk_course_year_id) === preferred.courseYearId,
      )
    ) {
      setCourseYearId(preferred.courseYearId);
    }
  }, [courseYears, preferred.courseYearId]);

  const reloadGrid = useCallback(async () => {
    setGridRows([]);
    if (!collegeId || !courseId || !courseYearId || !examId) return;
    const rows = await getExamLabTimetableGrid({
      orgId: orgIdRef.current,
      collegeId,
      courseId,
      courseYearId,
      examId,
      empId: empIdRef.current,
    }).catch(() => []);
    setGridRows(Array.isArray(rows) ? rows : []);
  }, [collegeId, courseId, courseYearId, examId]);

  useEffect(() => {
    void reloadGrid();
  }, [reloadGrid]);

  const examDetails = useMemo(
    () => exams.find((e) => Number(e.fk_exam_id) === Number(examId)),
    [exams, examId],
  );
  const selectedCollege = useMemo(
    () => colleges.find((c) => Number(c.fk_college_id) === Number(collegeId)),
    [colleges, collegeId],
  );
  const examTypeLabel = useMemo(() => {
    if (!examDetails) return "";
    const tags: string[] = [];
    if (examDetails.is_internal_exam) tags.push("[Internal]");
    if (examDetails.is_regular_exam) tags.push("[Regular]");
    if (examDetails.is_supply_exam) tags.push("[Supple]");
    return tags.join(" ");
  }, [examDetails]);

  const dateColumns = useMemo(() => {
    if (!examDetails?.from_date || !examDetails?.to_date) return [];
    const out: Date[] = [];
    const cur = new Date(examDetails.from_date);
    const end = new Date(examDetails.to_date);
    while (cur <= end) {
      out.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    return out;
  }, [examDetails]);

  const matrix = useMemo(() => {
    const byGroupId: Record<string, AnyRow[]> = {};
    const byGroupCode: Record<string, AnyRow[]> = {};
    for (const row of gridRows) {
      const gid = String(row.courseGroupId ?? row.fk_course_group_id ?? "");
      const gcode = String(row.group_code ?? row.groupCode ?? "");
      if (gid) {
        if (!byGroupId[gid]) byGroupId[gid] = [];
        byGroupId[gid].push(row);
      }
      if (gcode) {
        if (!byGroupCode[gcode]) byGroupCode[gcode] = [];
        byGroupCode[gcode].push(row);
      }
    }
    const days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
    return courseGroups.map((g) => {
      const code = String(g.group_code ?? "");
      const gid = String(g.fk_course_group_id ?? "");
      const groupRows = byGroupId[gid]?.length
        ? byGroupId[gid]
        : (byGroupCode[code] ?? []);
      const cells = dateColumns.map((d) => {
        const ymd = format(d, "yyyy-MM-dd");
        const rows = groupRows.filter((r) => {
          try {
            return format(parseISO(String(r.examDate)), "yyyy-MM-dd") === ymd;
          } catch {
            return false;
          }
        });
        return { date: d, day: days[d.getDay()], rows };
      });
      return { code, groupId: gid, cells };
    });
  }, [gridRows, courseGroups, dateColumns]);

  const pageTitle = selectedCollege?.college_code
    ? `Exam Lab Timetable For : ${selectedCollege.college_code}`
    : "Exam Lab Timetable";

  function openEdit(row: AnyRow) {
    if (!isCollegeWise(row)) return;
    setEditingRow({
      ...row,
      courseId,
      collegeId,
      courseYearId,
      academicYearId,
      examId,
      fromDate: examDetails?.from_date,
      toDate: examDetails?.to_date,
      examName: examDetails?.exam_name,
      collegeName:
        selectedCollege?.college_name ?? selectedCollege?.college_code,
      courseYearName: courseYears.find(
        (y) => Number(y.fk_course_year_id) === Number(courseYearId),
      )?.course_year_code,
    });
    setEditOpen(true);
  }

  return (
    <FilteredPage
      title={pageTitle}
      filters={
        <>
          <GlobalFilterBarRow columns={3}>
            <GlobalFilterField label="Course" icon={GraduationCap}>
              <Select
                value={courseId ? String(courseId) : null}
                onChange={(v) => {
                  setCourseId(Number(v));
                  setCourseYearId(null);
                }}
                options={courses.map((c) => ({
                  value: String(c.fk_course_id),
                  label: String(c.course_code ?? ""),
                }))}
                placeholder="Course"
                disabled={loading || restoring}
                searchable
              />
            </GlobalFilterField>
            <GlobalFilterField label="Exam Year" icon={Calendar}>
              <Select
                value={academicYearId ? String(academicYearId) : null}
                onChange={(v) => {
                  setAcademicYearId(Number(v));
                  setCourseYearId(null);
                }}
                options={years.map((y) => ({
                  value: String(y.fk_academic_year_id),
                  label: String(y.academic_year ?? ""),
                }))}
                placeholder="Exam Year"
                searchable
              />
            </GlobalFilterField>
            <GlobalFilterField label="Exam Master" icon={ScrollText}>
              <Select
                value={examId ? String(examId) : null}
                onChange={(v) => {
                  setExamId(Number(v));
                  setCourseYearId(null);
                }}
                options={exams.map((e) => ({
                  value: String(e.fk_exam_id),
                  label: formatExamOptionLabel(e),
                }))}
                placeholder="Exam Master"
                searchable
              />
            </GlobalFilterField>
          </GlobalFilterBarRow>
          <GlobalFilterBarRow columns={2}>
            <GlobalFilterField label="College" icon={Building2}>
              <Select
                value={collegeId ? String(collegeId) : null}
                onChange={(v) => {
                  setCollegeId(Number(v));
                  setCourseYearId(null);
                }}
                options={colleges.map((c) => ({
                  value: String(c.fk_college_id),
                  label: String(c.college_code ?? ""),
                }))}
                placeholder="College"
                searchable
              />
            </GlobalFilterField>
            <GlobalFilterField label="Course Year" icon={GraduationCap}>
              <Select
                value={courseYearId ? String(courseYearId) : null}
                onChange={(v) => setCourseYearId(v ? Number(v) : null)}
                options={courseYears.map((y) => ({
                  value: String(y.fk_course_year_id),
                  label: String(y.course_year_code ?? ""),
                }))}
                placeholder="Course Year"
                searchable
                clearable
              />
            </GlobalFilterField>
          </GlobalFilterBarRow>
        </>
      }
    >
      {courseYearId ? (
        <div className="app-card p-4">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="truncate text-[12px] text-slate-700">
              {selectedCollege?.college_code ?? ""} /{" "}
              {courses.find((c) => Number(c.fk_course_id) === Number(courseId))
                ?.course_code ?? ""}{" "}
              /{" "}
              {years.find(
                (y) => Number(y.fk_academic_year_id) === Number(academicYearId),
              )?.academic_year ?? ""}{" "}
              /{" "}
              {courseYears.find(
                (y) => Number(y.fk_course_year_id) === Number(courseYearId),
              )?.course_year_code ?? ""}
              {" - ( "}
              <span className="font-medium text-slate-900">
                {examDetails?.exam_name ?? ""}
              </span>{" "}
              {examDetails?.from_date
                ? (() => {
                    try {
                      return `(${format(parseISO(String(examDetails.from_date)), "d MMM, yyyy")} - ${format(parseISO(String(examDetails.to_date ?? "")), "d MMM, yyyy")})`;
                    } catch {
                      return "";
                    }
                  })()
                : ""}{" "}
              <span className="text-blue-700">{examTypeLabel}</span>
              {" )"}
            </div>
            <Button
              className="h-8 shrink-0 text-[12px]"
              onClick={() =>
                router.push(
                  `/admin-examination-management/admin-exam-masters/exam-lab-timetable/add-exam-timetables?collegeId=${collegeId}&courseId=${courseId}&courseYearId=${courseYearId}&academicYearId=${academicYearId}&examId=${examId}&courseYearName=${encodeURIComponent(
                    courseYears.find(
                      (y) =>
                        Number(y.fk_course_year_id) === Number(courseYearId),
                    )?.course_year_code ?? "",
                  )}`,
                )
              }
            >
              + Create Shedule
            </Button>
          </div>
          <p className="mb-2 text-right text-[12px]">
            <span className="border bg-sky-200 px-1">M</span> MORNING{" "}
            <span className="ml-2 border bg-yellow-200 px-1">A</span> AFTERNOON
          </p>
          <div className="overflow-auto">
            <table className="w-full border text-[12px]">
              <thead className="bg-muted/40">
                <tr>
                  <th className="border px-2 py-1">Branch</th>
                  {dateColumns.map((d) => (
                    <th className="border px-2 py-1" key={d.toISOString()}>
                      {format(d, "dd MMM, yyyy")}
                      <div className="text-blue-600">
                        (
                        {
                          ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][
                            d.getDay()
                          ]
                        }
                        )
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.map((g) => (
                  <tr key={g.code}>
                    <td className="border px-2 py-1 text-center text-blue-700">
                      {g.code}
                    </td>
                    {g.cells.map((c) => (
                      <td
                        className="border px-2 py-1 align-top"
                        key={`${g.code}-${c.date.toISOString()}`}
                      >
                        {c.rows.length === 0 ? (
                          <span>-</span>
                        ) : (
                          c.rows.map((r: AnyRow, i: number) => (
                            <button
                              type="button"
                              key={`r-${i}`}
                              className={`mb-1 block w-full rounded p-1 text-left ${cellClass(r)} ${
                                isCollegeWise(r)
                                  ? "cursor-pointer hover:brightness-95"
                                  : "cursor-default"
                              }`}
                              onClick={() => openEdit(r)}
                              disabled={!isCollegeWise(r)}
                            >
                              {r.subjectCode ?? r.shortName}{" "}
                              {r.examLabBatchName
                                ? `(${r.examLabBatchName})`
                                : ""}
                              <span className="ml-1 text-[10px]">
                                {typeBadge(r.examTypeCatCode)}
                              </span>
                            </button>
                          ))
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex justify-end">
            <Button
              className="h-8 text-[12px]"
              onClick={() => setConflictsOpen(true)}
            >
              Check Conflicts
            </Button>
          </div>
        </div>
      ) : null}

      <CheckConflictsModal
        open={conflictsOpen}
        onClose={() => setConflictsOpen(false)}
        examId={examId}
        academicYearId={academicYearId}
        orgId={orgId}
      />

      <EditExamLabTimetableModal
        open={editOpen}
        onClose={() => {
          setEditOpen(false);
          setEditingRow(null);
        }}
        row={editingRow}
        orgId={orgId}
        empId={empId}
        courseId={courseId ?? 0}
        collegeId={collegeId ?? 0}
        courseYearId={courseYearId ?? 0}
        academicYearId={academicYearId ?? 0}
        examId={examId ?? 0}
        onSaved={() => void reloadGrid()}
      />
    </FilteredPage>
  );
}

function dedupe<T extends Record<string, any>>(arr: T[], key: string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of arr) {
    const v = String(item?.[key] ?? "");
    if (!v || seen.has(v)) continue;
    seen.add(v);
    out.push(item);
  }
  return out;
}
