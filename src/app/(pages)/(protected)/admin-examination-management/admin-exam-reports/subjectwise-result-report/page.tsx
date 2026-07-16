"use client";

/**
 * Subject Wise Result Report — Angular `subjectwise-result-report`.
 * Cascade filters auto-select first college → group → year → regulation → subject type → subject,
 * then loads `exammarksentrystddetails` (no Get List button).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColDef } from "ag-grid-community";
import { format, parseISO } from "date-fns";
import { RefreshCw } from "lucide-react";
import { FilteredListPage } from "@/components/layout";
import { DatePicker } from "@/common/components/date-picker";
import { Select } from "@/common/components/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toastError } from "@/lib/toast";
import {
  getSubjectWiseResultReport,
  getUnivExamFiltersRegSup,
  getUnivExamRestInRegExamStd,
  getUnivExamSubjectUc,
  type AnyRow,
} from "@/services";

type Row = AnyRow;

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function txt(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
}

function dash(v: unknown): string {
  const s = txt(v);
  return !s || s === "null" ? "—" : s;
}

function dedupeBy<T>(rows: T[], keyFn: (r: T) => number): T[] {
  const seen = new Set<number>();
  const out: T[] = [];
  for (const r of rows) {
    const k = keyFn(r);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(r);
  }
  return out;
}

function parseMaybeDate(v: unknown): string {
  const s = txt(v);
  if (!s) return "";
  try {
    if (/^\d{4}-\d{2}-\d{2}/.test(s))
      return format(parseISO(s.slice(0, 10)), "dd MMM, yyyy");
    return format(new Date(s), "dd MMM, yyyy");
  } catch {
    return s;
  }
}

function toYmd(d: Date | null | undefined): string {
  if (!d || Number.isNaN(d.getTime())) return "";
  return format(d, "yyyy-MM-dd");
}

function examMasterLabel(r: Row): string {
  const name = txt(r.exam_name ?? r.examName) || "Exam";
  const from = parseMaybeDate(r.from_date ?? r.fromDate);
  const to = parseMaybeDate(r.to_date ?? r.toDate);
  const range = from && to ? ` (${from} - ${to})` : "";
  return `${name}${range}`;
}

function makeColDefs(isInternalExam: boolean): ColDef<Row>[] {
  return [
    {
      headerName: "Sl No",
      valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1,
      width: 70,
      flex: 0,
    },
    {
      headerName: "Hallticket Number",
      minWidth: 140,
      flex: 0,
      valueGetter: (p) =>
        dash(
          p.data?.hallticketNumber ??
            p.data?.hallticket_number ??
            p.data?.hallticket_no ??
            p.data?.rollNumber,
        ),
    },
    {
      headerName: "Student",
      minWidth: 200,
      flex: 1,
      valueGetter: (p) =>
        dash(
          p.data?.firstName ??
            p.data?.student_name ??
            p.data?.studentName ??
            p.data?.Student,
        ),
    },
    {
      headerName: isInternalExam ? "Internal Marks" : "External Marks",
      minWidth: 120,
      flex: 0,
      valueGetter: (p) => {
        const m = p.data?.marks ?? p.data?.external_marks ?? p.data?.extMarks;
        if (m === null || m === undefined || m === "") return "0";
        return dash(m);
      },
    },
  ];
}

export default function SubjectwiseResultReportPage() {
  const [loading, setLoading] = useState(false);
  const [loadingFilters, setLoadingFilters] = useState(false);
  const [employeeId, setEmployeeId] = useState(0);
  const [baseRows, setBaseRows] = useState<Row[]>([]);
  const [restRows, setRestRows] = useState<Row[]>([]);
  const [regulations, setRegulations] = useState<Row[]>([]);
  const [subjectRows, setSubjectRows] = useState<Row[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [courseId, setCourseId] = useState("");
  const [academicYearId, setAcademicYearId] = useState("");
  const [examId, setExamId] = useState("");
  const [collegeId, setCollegeId] = useState("");
  const [courseGroupId, setCourseGroupId] = useState("");
  const [courseYearId, setCourseYearId] = useState("");
  const [regulationId, setRegulationId] = useState("");
  const [subjectTypeId, setSubjectTypeId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [examDate, setExamDate] = useState<Date | null>(() => new Date());
  const [listOfMarks] = useState(1);

  useEffect(() => {
    setEmployeeId(Number(globalThis?.localStorage?.getItem("employeeId") ?? 0));
  }, []);

  useEffect(() => {
    async function init() {
      if (!employeeId) return;
      setLoadingFilters(true);
      try {
        const filters = await getUnivExamFiltersRegSup(employeeId);
        const list = Array.isArray(filters) ? filters : [];
        setBaseRows(list);
        const courses = dedupeBy(list, (r) => num(r.fk_course_id));
        if (courses[0]) setCourseId(String(num(courses[0].fk_course_id)));
      } catch (e) {
        toastError(e, "Failed to load filters");
      } finally {
        setLoadingFilters(false);
      }
    }
    void init();
  }, [employeeId]);

  const courses = useMemo(
    () => dedupeBy(baseRows, (r) => num(r.fk_course_id)),
    [baseRows],
  );
  const academicYears = useMemo(
    () =>
      dedupeBy(
        baseRows.filter((r) => num(r.fk_course_id) === Number(courseId)),
        (r) => num(r.fk_academic_year_id),
      ),
    [baseRows, courseId],
  );
  const exams = useMemo(
    () =>
      dedupeBy(
        baseRows.filter(
          (r) =>
            num(r.fk_course_id) === Number(courseId) &&
            num(r.fk_academic_year_id) === Number(academicYearId),
        ),
        (r) => num(r.fk_exam_id),
      ),
    [baseRows, courseId, academicYearId],
  );
  const colleges = useMemo(
    () => dedupeBy(restRows, (r) => num(r.fk_college_id)),
    [restRows],
  );
  const courseGroups = useMemo(() => {
    const source = restRows.filter(
      (r) => !collegeId || num(r.fk_college_id) === Number(collegeId),
    );
    return dedupeBy(source, (r) => num(r.fk_course_group_id));
  }, [restRows, collegeId]);
  const courseYears = useMemo(() => {
    const source = restRows.filter(
      (r) =>
        (!collegeId || num(r.fk_college_id) === Number(collegeId)) &&
        (!courseGroupId ||
          courseGroupId === "0" ||
          num(r.fk_course_group_id) === Number(courseGroupId)),
    );
    return dedupeBy(source, (r) => num(r.fk_course_year_id));
  }, [restRows, collegeId, courseGroupId]);

  const regulationOptions = useMemo(() => {
    const fromBundle = dedupeBy(regulations, (r) => num(r.fk_regulation_id));
    const fromRest = dedupeBy(
      restRows.filter(
        (r) =>
          num(r.fk_regulation_id) > 0 &&
          (!courseId || num(r.fk_course_id) === Number(courseId)),
      ),
      (r) => num(r.fk_regulation_id),
    );
    const source = fromBundle.length ? fromBundle : fromRest;
    return [
      { value: "0", label: "All" },
      ...source.map((r) => ({
        value: String(num(r.fk_regulation_id)),
        label: txt(r.regulation_code) || String(num(r.fk_regulation_id)),
      })),
    ];
  }, [regulations, restRows, courseId]);

  const subjectTypes = useMemo(
    () =>
      dedupeBy(
        subjectRows.filter((r) => num(r.fk_subjecttype_catdet_id) > 0),
        (r) => num(r.fk_subjecttype_catdet_id),
      ),
    [subjectRows],
  );

  const subjectsForType = useMemo(() => {
    const filtered = subjectTypeId
      ? subjectRows.filter(
          (r) => num(r.fk_subjecttype_catdet_id) === Number(subjectTypeId),
        )
      : subjectRows;
    return dedupeBy(filtered, (r) => num(r.fk_subject_id));
  }, [subjectRows, subjectTypeId]);

  const selectedSubject = useMemo(
    () =>
      subjectsForType.find((r) => num(r.fk_subject_id) === Number(subjectId)) ??
      null,
    [subjectsForType, subjectId],
  );

  const selectedExam = useMemo(
    () => exams.find((r) => num(r.fk_exam_id) === Number(examId)) ?? null,
    [exams, examId],
  );

  const isInternalExam = Boolean(
    selectedExam?.is_internal_exam ?? selectedExam?.isInternalExam ?? false,
  );

  /**
   * Angular `examTypeId` for this report:
   * - Prefer subject's `fk_examtype_catdet_id` (same as working exam-marks-entry / timetable path)
   * - Fall back to subject-type id (Angular `selectedSubjectType` sets this when timetable list is empty)
   */
  const examTypeId = useMemo(() => {
    if (selectedSubject) {
      const fromSubject = num(
        selectedSubject.fk_examtype_catdet_id ??
          selectedSubject.examTypeCatId ??
          selectedSubject.exam_type_id ??
          selectedSubject.examTypeCatdetId,
      );
      if (fromSubject > 0) return fromSubject;
    }
    return Number(subjectTypeId) || 0;
  }, [selectedSubject, subjectTypeId]);

  const columnDefs = useMemo(
    () => makeColDefs(isInternalExam),
    [isInternalExam],
  );

  const summary = useMemo(() => {
    const college =
      colleges.find((r) => num(r.fk_college_id) === Number(collegeId)) ?? null;
    const group =
      courseGroups.find(
        (r) => num(r.fk_course_group_id) === Number(courseGroupId),
      ) ?? null;
    const year =
      courseYears.find(
        (r) => num(r.fk_course_year_id) === Number(courseYearId),
      ) ?? null;
    const course =
      courses.find((r) => num(r.fk_course_id) === Number(courseId)) ?? null;
    const ay =
      academicYears.find(
        (r) => num(r.fk_academic_year_id) === Number(academicYearId),
      ) ?? null;
    const regCode =
      txt(selectedSubject?.regulation_code) ||
      regulationOptions.find((o) => o.value === regulationId)?.label ||
      "";
    const subjectDetails = selectedSubject
      ? `${[txt(selectedSubject.subject_code), txt(selectedSubject.subject_name)].filter(Boolean).join(" - ")}${
          regCode && regCode !== "All" ? ` (${regCode})` : ""
        }`
      : "";
    const subjectTypCode =
      txt(selectedSubject?.subject_type) ||
      txt(
        subjectTypes.find(
          (r) => num(r.fk_subjecttype_catdet_id) === Number(subjectTypeId),
        )?.subject_type,
      );
    const examTypeCatCode = txt(
      selectedSubject?.ttd_exam_type ??
        selectedSubject?.exam_type ??
        selectedSubject?.examType,
    );
    return {
      exam: txt(selectedExam?.exam_name ?? selectedExam?.examName),
      examDateLabel: examDate ? format(examDate, "dd/MM/yyyy") : "",
      collegeCode: txt(college?.college_code),
      course: txt(course?.course_code),
      courseGroup: courseGroupId === "0" ? "All" : txt(group?.group_code),
      courseyear: courseYearId === "0" ? "All" : txt(year?.course_year_code),
      academicYear: txt(ay?.academic_year),
      subjectDetails,
      subjectTypCode,
      examTypeCatCode,
    };
  }, [
    colleges,
    courseGroups,
    courseYears,
    courses,
    academicYears,
    collegeId,
    courseGroupId,
    courseYearId,
    courseId,
    academicYearId,
    regulationId,
    regulationOptions,
    selectedSubject,
    selectedExam,
    examDate,
    subjectTypeId,
    subjectTypes,
  ]);

  useEffect(() => {
    if (!courseId || !academicYears.length) return;
    if (
      !academicYears.some(
        (r) => num(r.fk_academic_year_id) === Number(academicYearId),
      )
    ) {
      setAcademicYearId(String(num(academicYears[0].fk_academic_year_id)));
    }
  }, [courseId, academicYears, academicYearId]);

  useEffect(() => {
    if (!academicYearId || !exams.length) return;
    if (!exams.some((r) => num(r.fk_exam_id) === Number(examId))) {
      setExamId(String(num(exams[0].fk_exam_id)));
    }
  }, [academicYearId, exams, examId]);

  useEffect(() => {
    async function loadRest() {
      if (!courseId || !academicYearId || !examId || !employeeId) {
        setRestRows([]);
        setRegulations([]);
        return;
      }
      setRows([]);
      setSubjectTypeId("");
      setSubjectId("");
      setSubjectRows([]);
      setLoadingFilters(true);
      try {
        const bundle = await getUnivExamRestInRegExamStd({
          courseId: Number(courseId),
          examId: Number(examId),
          academicYearId: Number(academicYearId),
          employeeId,
        });
        setRestRows(
          Array.isArray(bundle.restFilters) ? bundle.restFilters : [],
        );
        setRegulations(
          Array.isArray(bundle.regulations) ? bundle.regulations : [],
        );
        // Angular selectedExam → selectedCollege(first) → selectedGroup(first) → selectedYear(first)
        setCollegeId("");
        setCourseGroupId("");
        setCourseYearId("");
        setRegulationId("");
      } catch (e) {
        toastError(e, "Failed to load filters");
        setRestRows([]);
        setRegulations([]);
      } finally {
        setLoadingFilters(false);
      }
    }
    void loadRest();
  }, [courseId, academicYearId, examId, employeeId]);

  useEffect(() => {
    if (!colleges.length) return;
    if (!colleges.some((r) => num(r.fk_college_id) === Number(collegeId))) {
      setCollegeId(String(num(colleges[0].fk_college_id)));
    }
  }, [colleges, collegeId]);

  // Angular selectedCollege → first course group (not All)
  useEffect(() => {
    if (!collegeId || !courseGroups.length) return;
    if (
      courseGroupId === "0" ||
      courseGroups.some(
        (r) => num(r.fk_course_group_id) === Number(courseGroupId),
      )
    ) {
      return;
    }
    setCourseGroupId(String(num(courseGroups[0].fk_course_group_id)));
    setCourseYearId("");
    setRegulationId("");
  }, [collegeId, courseGroups, courseGroupId]);

  // Angular selectedGroup → first course year
  useEffect(() => {
    if (!courseGroupId || !courseYears.length) return;
    if (
      courseYearId === "0" ||
      courseYears.some((r) => num(r.fk_course_year_id) === Number(courseYearId))
    ) {
      return;
    }
    setCourseYearId(String(num(courseYears[0].fk_course_year_id)));
    setRegulationId("");
  }, [courseGroupId, courseYears, courseYearId]);

  // Angular selectedYear → first regulation
  useEffect(() => {
    if (!courseYearId) return;
    const opts = regulationOptions.filter((o) => o.value !== "0");
    if (!opts.length) return;
    if (regulationId === "0" || opts.some((o) => o.value === regulationId)) {
      return;
    }
    setRegulationId(opts[0].value);
  }, [courseYearId, regulationOptions, regulationId]);

  useEffect(() => {
    async function loadSubjects() {
      // Wait for Angular cascade: college → group → year → regulation before univ_exam_subject_uc
      if (
        !collegeId ||
        !examId ||
        !courseId ||
        !academicYearId ||
        !employeeId ||
        !courseGroupId ||
        !courseYearId ||
        !regulationId
      ) {
        setSubjectRows([]);
        return;
      }
      setRows([]);
      setSubjectTypeId("");
      setSubjectId("");
      setLoadingFilters(true);
      try {
        const list = await getUnivExamSubjectUc({
          collegeId: Number(collegeId),
          courseId: Number(courseId),
          courseGroupId: Number(courseGroupId || 0),
          courseYearId: Number(courseYearId || 0),
          examId: Number(examId),
          academicYearId: Number(academicYearId),
          regulationId: Number(regulationId || 0),
          employeeId,
        });
        setSubjectRows(Array.isArray(list) ? list : []);
      } catch {
        setSubjectRows([]);
      } finally {
        setLoadingFilters(false);
      }
    }
    void loadSubjects();
  }, [
    collegeId,
    courseGroupId,
    courseYearId,
    examId,
    courseId,
    academicYearId,
    regulationId,
    employeeId,
  ]);

  // Angular selectedRegulation → first subject type → selectedSubjectType → first subject → load marks
  useEffect(() => {
    if (!subjectTypes.length) {
      setSubjectTypeId("");
      return;
    }
    if (
      !subjectTypes.some(
        (r) => num(r.fk_subjecttype_catdet_id) === Number(subjectTypeId),
      )
    ) {
      setSubjectTypeId(String(num(subjectTypes[0].fk_subjecttype_catdet_id)));
    }
  }, [subjectTypes, subjectTypeId]);

  useEffect(() => {
    if (!subjectsForType.length) {
      setSubjectId("");
      return;
    }
    if (
      !subjectsForType.some((r) => num(r.fk_subject_id) === Number(subjectId))
    ) {
      setSubjectId(String(num(subjectsForType[0].fk_subject_id)));
    }
  }, [subjectsForType, subjectId]);

  // Prefer subject's exam_date when available (Angular date field is disabled)
  useEffect(() => {
    const raw = txt(selectedSubject?.exam_date ?? selectedSubject?.examDate);
    if (!raw) return;
    try {
      const d = /^\d{4}-\d{2}-\d{2}/.test(raw)
        ? parseISO(raw.slice(0, 10))
        : new Date(raw);
      if (!Number.isNaN(d.getTime())) setExamDate(d);
    } catch {
      /* keep current */
    }
  }, [selectedSubject]);

  // Angular selectedSubject → listByEightIds(exammarksentrystddetails)
  useEffect(() => {
    async function loadReport() {
      const dateYmd = toYmd(examDate);
      if (
        loadingFilters ||
        !courseId ||
        !examId ||
        !collegeId ||
        !subjectId ||
        Number(subjectId) <= 0 ||
        !subjectTypeId ||
        !dateYmd
      ) {
        if (!subjectId) setRows([]);
        return;
      }
      setLoading(true);
      try {
        const list = await getSubjectWiseResultReport({
          examId: Number(examId),
          collegeId: Number(collegeId),
          courseId: Number(courseId),
          courseGroupId: Number(courseGroupId || 0),
          courseYearId: Number(courseYearId || 0),
          subjectId: Number(subjectId),
          examDate: dateYmd,
          examTypeId,
        });
        const seen = new Set<string>();
        const deduped: Row[] = [];
        for (const r of Array.isArray(list) ? list : []) {
          const roll = txt(
            r.rollNumber ??
              r.hallticketNumber ??
              r.hallticket_number ??
              r.hallticket_no,
          );
          if (roll && seen.has(roll)) continue;
          if (roll) seen.add(roll);
          const marks = r.marks;
          deduped.push({
            ...r,
            marks:
              marks === null || marks === undefined || marks === "" ? 0 : marks,
          });
        }
        setRows(deduped);
      } catch (e) {
        toastError(e, "Failed to load report");
        setRows([]);
      } finally {
        setLoading(false);
      }
    }
    void loadReport();
  }, [
    loadingFilters,
    courseId,
    examId,
    collegeId,
    courseGroupId,
    courseYearId,
    subjectId,
    subjectTypeId,
    examDate,
    examTypeId,
  ]);

  const getRowId = useCallback(
    (p: { data?: Row; node?: { rowIndex?: number | null } }) =>
      `row-${p.node?.rowIndex ?? 0}-${txt(p.data?.rollNumber ?? p.data?.hallticketNumber)}-${txt(p.data?.studentId)}`,
    [],
  );

  const showDetail = Boolean(subjectId);

  return (
    <FilteredListPage
      title="Subject Wise Result Report"
      filters={
        <div className="space-y-3">
          <div className="grid grid-cols-1 items-end gap-2 md:grid-cols-12">
            <div className="space-y-1 md:col-span-2">
              <Label>Course *</Label>
              <Select
                value={courseId || null}
                onChange={(v) => {
                  setRows([]);
                  setSubjectId("");
                  setSubjectTypeId("");
                  setCourseId(v ?? "");
                  setAcademicYearId("");
                  setExamId("");
                }}
                options={courses.map((r) => ({
                  value: String(num(r.fk_course_id)),
                  label: txt(r.course_code) || String(num(r.fk_course_id)),
                }))}
                isLoading={loadingFilters}
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Exam Year *</Label>
              <Select
                value={academicYearId || null}
                onChange={(v) => {
                  setRows([]);
                  setSubjectId("");
                  setSubjectTypeId("");
                  setAcademicYearId(v ?? "");
                  setExamId("");
                }}
                options={academicYears.map((r) => ({
                  value: String(num(r.fk_academic_year_id)),
                  label:
                    txt(r.academic_year) || String(num(r.fk_academic_year_id)),
                }))}
                disabled={!courseId}
              />
            </div>
            <div className="space-y-1 md:col-span-4">
              <Label>Exam Master *</Label>
              <Select
                value={examId || null}
                onChange={(v) => {
                  setRows([]);
                  setSubjectId("");
                  setSubjectTypeId("");
                  setExamId(v ?? "");
                }}
                options={exams.map((r) => ({
                  value: String(num(r.fk_exam_id)),
                  label: examMasterLabel(r),
                }))}
                searchable
                wrapOptionLabels
                disabled={!academicYearId}
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>College *</Label>
              <Select
                value={collegeId || null}
                onChange={(v) => {
                  setRows([]);
                  setSubjectId("");
                  setSubjectTypeId("");
                  setCollegeId(v ?? "");
                  setCourseGroupId("");
                  setCourseYearId("");
                  setRegulationId("");
                }}
                options={colleges.map((r) => ({
                  value: String(num(r.fk_college_id)),
                  label: txt(r.college_code) || String(num(r.fk_college_id)),
                }))}
                disabled={!examId}
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Course Group *</Label>
              <Select
                value={courseGroupId || null}
                onChange={(v) => {
                  setRows([]);
                  setSubjectId("");
                  setSubjectTypeId("");
                  setCourseGroupId(v ?? "");
                  setCourseYearId("");
                  setRegulationId("");
                }}
                options={[
                  { value: "0", label: "All" },
                  ...courseGroups.map((r) => ({
                    value: String(num(r.fk_course_group_id)),
                    label:
                      txt(r.group_code) || String(num(r.fk_course_group_id)),
                  })),
                ]}
                disabled={!collegeId}
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Course Years *</Label>
              <Select
                value={courseYearId || null}
                onChange={(v) => {
                  setRows([]);
                  setSubjectId("");
                  setSubjectTypeId("");
                  setCourseYearId(v ?? "");
                  setRegulationId("");
                }}
                options={[
                  { value: "0", label: "All" },
                  ...courseYears.map((r) => ({
                    value: String(num(r.fk_course_year_id)),
                    label:
                      txt(r.course_year_code) ||
                      String(num(r.fk_course_year_id)),
                  })),
                ]}
                disabled={!collegeId}
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Regulation</Label>
              <Select
                value={regulationId || null}
                onChange={(v) => {
                  setRows([]);
                  setSubjectId("");
                  setSubjectTypeId("");
                  setRegulationId(v ?? "");
                }}
                options={regulationOptions}
                disabled={!collegeId}
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Subject Type</Label>
              <Select
                value={subjectTypeId || null}
                onChange={(v) => {
                  setSubjectTypeId(v ?? "");
                  setSubjectId("");
                }}
                options={subjectTypes.map((r) => ({
                  value: String(num(r.fk_subjecttype_catdet_id)),
                  label:
                    txt(r.subject_type) ||
                    String(num(r.fk_subjecttype_catdet_id)),
                }))}
                disabled={!collegeId || !subjectTypes.length}
                isLoading={loadingFilters}
              />
            </div>
            <div className="space-y-1 md:col-span-3">
              <Label>Subject *</Label>
              <Select
                value={subjectId || null}
                onChange={(v) => setSubjectId(v ?? "")}
                options={subjectsForType.map((r) => ({
                  value: String(num(r.fk_subject_id)),
                  label:
                    [txt(r.subject_code), txt(r.subject_name)]
                      .filter(Boolean)
                      .join(" - ") || String(num(r.fk_subject_id)),
                }))}
                searchable
                wrapOptionLabels
                disabled={!subjectTypeId && subjectTypes.length > 0}
                isLoading={loadingFilters}
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Choose a exam date</Label>
              <DatePicker
                value={examDate}
                onChange={setExamDate}
                displayFormat="dd/MM/yyyy"
                clearable={false}
                disabled
              />
            </div>
            <div className="flex items-end gap-2 md:col-span-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                title="Reset"
                onClick={() => {
                  setRows([]);
                  setSubjectId("");
                  setSubjectTypeId("");
                  setExamDate(new Date());
                  const c = courses[0];
                  if (c) setCourseId(String(num(c.fk_course_id)));
                }}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {showDetail ? (
            <>
              <div className="flex items-center gap-2 px-1">
                <label className="flex cursor-default items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="listOfMarks"
                    checked={listOfMarks === 1}
                    readOnly
                    className="h-3.5 w-3.5 accent-primary"
                  />
                  List Of Marks
                </label>
              </div>

              <div className="flex gap-4 rounded-md border border-border bg-muted/30 p-3">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded bg-background text-2xl font-bold text-primary shadow-sm">
                  A+
                </div>
                <div className="min-w-0 space-y-1 text-sm leading-snug">
                  <p>
                    {summary.exam || "—"}{" "}
                    <span className="text-blue-600">
                      ({summary.examDateLabel || "—"})
                    </span>
                  </p>
                  <p className="text-muted-foreground">
                    {summary.collegeCode || "—"} / {summary.course || "—"} /{" "}
                    {summary.courseGroup || "—"} / {summary.courseyear || "—"}
                    {summary.academicYear ? (
                      <span className="text-blue-600">
                        {" "}
                        ({summary.academicYear})
                      </span>
                    ) : null}
                  </p>
                  <p className="font-semibold text-foreground">
                    {summary.subjectDetails || "—"}
                    {summary.subjectTypCode ? (
                      <span className="ml-1 font-normal text-muted-foreground">
                        - {summary.subjectTypCode}
                      </span>
                    ) : null}
                    {summary.examTypeCatCode ? (
                      <span className="font-normal">
                        {" "}
                        ({summary.examTypeCatCode})
                      </span>
                    ) : null}
                  </p>
                </div>
              </div>
            </>
          ) : null}
        </div>
      }
      rowData={rows}
      columnDefs={columnDefs}
      loading={loading}
      pagination
      getRowId={getRowId}
      toolbar={{
        search: true,
        searchPlaceholder: "Search…",
        exportPdf: false,
        exportExcel: true,
      }}
    />
  );
}
