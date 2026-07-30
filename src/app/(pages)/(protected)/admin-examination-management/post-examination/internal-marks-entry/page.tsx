"use client";

import { useCallback, useMemo, useState, useEffect } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { Select } from "@/common/components/select";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getInternalMarksEntryFilters,
  getInternalMarksEntryRestFilters,
  getInternalMarksEntryStudents,
  getInternalMarksEntrySubjects,
  getInternalMarksEntrySubjectMarks,
  listInternalExamMarksSetup,
  listExamStudentInternalMarksForEntry,
  saveInternalMarksEntry,
} from "@/services";
import { toastError, toastSuccess } from "@/lib/toast";
import { usePrintMode } from "@/lib/print";

type AnyRow = Record<string, any>;
type MarkRow = Record<string, any>;

const THEORY_SUBJECT_TYPE_ID = 3;
const ELECTIVE_SUBJECT_TYPE_ID = 4;

function dedupeBy<T extends AnyRow>(arr: T[], key: string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const row of arr) {
    const value = String(row?.[key] ?? "");
    if (!value || seen.has(value)) continue;
    seen.add(value);
    out.push(row);
  }
  return out;
}

function hasSemisterRole(): boolean {
  try {
    const raw = globalThis?.localStorage?.getItem("userDetails");
    if (!raw) return false;
    const user = JSON.parse(raw) as {
      userRoles?: Array<{ roleName?: string }>;
    };
    const roles = user.userRoles ?? [];
    return roles.some((role) => {
      const name = String(role.roleName ?? "").toUpperCase();
      return (
        name === "OFFLINEEVALUATION" ||
        name === "EXAMCONTROLLER" ||
        name === "ADMIN"
      );
    });
  } catch {
    return false;
  }
}

/** Angular save DTO sends mat-datepicker Date (serialized to ISO). */
function toSaveExamDate(date: string): string {
  if (!date) return date;
  const ymd = String(date).slice(0, 10);
  const parsed = new Date(`${ymd}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? date : parsed.toISOString();
}

function MarkInputRenderer(
  params: ICellRendererParams<MarkRow> & {
    field: string;
    maxMarks?: number;
    onChange: (row: MarkRow, field: string, value: number | "") => void;
    /** When true, Total Internal is auto-sum (Exam+Assignment+Quiz). */
    lockWhenBreakdown?: boolean;
  },
) {
  const raw = params.data?.[params.field];
  const max =
    params.maxMarks && params.maxMarks > 0 ? params.maxMarks : undefined;
  const display =
    raw === "" || raw == null
      ? ""
      : Number.isFinite(Number(raw))
        ? String(Number(raw))
        : "";
  const disabled =
    params.data?.isPresent !== true || Boolean(params.lockWhenBreakdown);
  return (
    <Input
      type="number"
      min={0}
      max={max}
      className="h-8 text-[12px]"
      value={display}
      disabled={disabled}
      onChange={(e) => {
        if (!params.data || disabled) return;
        const v = e.target.value;
        params.onChange(params.data, params.field, v === "" ? "" : Number(v));
      }}
    />
  );
}

function clearDownstreamFilters(
  setAcademicYearId: (v: number | null) => void,
  setExamId: (v: number | null) => void,
  setCollegeId: (v: number | null) => void,
  setCourseGroupId: (v: number | null) => void,
  setCourseYearId: (v: number | null) => void,
  setRegulationId: (v: number | null) => void,
  setSubjectTypeId: (v: number | null) => void,
  setSubjectId: (v: number | null) => void,
  setLabBatchId: (v: number) => void,
  setExamDate: (v: string) => void,
  setRestFilters: (v: AnyRow[]) => void,
  setSubjectRows: (v: AnyRow[]) => void,
  setRows: (v: MarkRow[]) => void,
  setHasFetched: (v: boolean) => void,
  opts?: { keepAcademicYear?: boolean; keepExam?: boolean },
) {
  if (!opts?.keepAcademicYear) setAcademicYearId(null);
  if (!opts?.keepExam) setExamId(null);
  setCollegeId(null);
  setCourseGroupId(null);
  setCourseYearId(null);
  setRegulationId(null);
  setSubjectTypeId(null);
  setSubjectId(null);
  setLabBatchId(0);
  setExamDate("");
  setRestFilters([]);
  setSubjectRows([]);
  setRows([]);
  setHasFetched(false);
}

export default function InternalMarksEntryPage() {
  const employeeId = Number(
    globalThis?.localStorage?.getItem("employeeId") ?? 0,
  );
  const empNumber = globalThis?.localStorage?.getItem("empNumber") ?? "";
  const userName = globalThis?.localStorage?.getItem("userName") ?? "";
  const roleName = globalThis?.localStorage?.getItem("roleName") ?? "";
  const userRole = globalThis?.localStorage?.getItem("userRole") ?? "";
  const examEvaluatorProfileId = Number(
    globalThis?.localStorage?.getItem("examEvaluatorProfileId") ?? 0,
  );

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [checkUploadType] = useState(1);
  const { mode: printMode, setMode: setPrintMode } =
    usePrintMode<"marks-sheet">();

  const [allFilters, setAllFilters] = useState<AnyRow[]>([]);
  const [restFilters, setRestFilters] = useState<AnyRow[]>([]);
  const [subjectRows, setSubjectRows] = useState<AnyRow[]>([]);
  const [marksSetupRows, setMarksSetupRows] = useState<AnyRow[]>([]);
  const [examMarks, setExamMarks] = useState<AnyRow[]>([]);
  const [rows, setRows] = useState<MarkRow[]>([]);

  const [courseId, setCourseId] = useState<number | null>(null);
  const [academicYearId, setAcademicYearId] = useState<number | null>(null);
  const [examId, setExamId] = useState<number | null>(null);
  const [collegeId, setCollegeId] = useState<number | null>(null);
  const [courseGroupId, setCourseGroupId] = useState<number | null>(null);
  const [courseYearId, setCourseYearId] = useState<number | null>(null);
  const [regulationId, setRegulationId] = useState<number | null>(null);
  const [subjectTypeId, setSubjectTypeId] = useState<number | null>(null);
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [labBatchId, setLabBatchId] = useState<number>(0);
  const [examDate, setExamDate] = useState("");

  const courses = useMemo(
    () => dedupeBy(allFilters, "fk_course_id"),
    [allFilters],
  );
  // Angular sorts academic years DESC before defaulting to [0].
  const academicYears = useMemo(() => {
    const years = dedupeBy(
      allFilters.filter((x) => Number(x.fk_course_id) === Number(courseId)),
      "fk_academic_year_id",
    );
    return [...years].sort(
      (a, b) =>
        parseInt(String(b.academic_year ?? 0), 10) -
        parseInt(String(a.academic_year ?? 0), 10),
    );
  }, [allFilters, courseId]);
  // Angular (non-ADMIN) only lists unpublished exams — that determines default exam_id.
  const exams = useMemo(() => {
    let list = dedupeBy(
      allFilters.filter(
        (x) =>
          Number(x.fk_course_id) === Number(courseId) &&
          Number(x.fk_academic_year_id) === Number(academicYearId),
      ),
      "fk_exam_id",
    );
    if (roleName !== "ADMIN") {
      list = list.filter((x) => x.is_published === false);
    }
    return list;
  }, [allFilters, courseId, academicYearId, roleName]);
  const selectedExam = useMemo(
    () => exams.find((x) => Number(x.fk_exam_id) === Number(examId)),
    [exams, examId],
  );
  const colleges = useMemo(() => {
    const list = dedupeBy(restFilters, "fk_college_id");
    return [...list].sort(
      (a, b) =>
        Number(a.clg_sort_order ?? a.clgSortOrder ?? 0) -
        Number(b.clg_sort_order ?? b.clgSortOrder ?? 0),
    );
  }, [restFilters]);
  const courseGroups = useMemo(
    () =>
      dedupeBy(
        restFilters.filter(
          (x) => Number(x.fk_college_id) === Number(collegeId),
        ),
        "fk_course_group_id",
      ),
    [restFilters, collegeId],
  );
  const courseYears = useMemo(
    () =>
      dedupeBy(
        restFilters.filter(
          (x) =>
            Number(x.fk_college_id) === Number(collegeId) &&
            Number(x.fk_course_group_id) === Number(courseGroupId),
        ),
        "fk_course_year_id",
      ),
    [restFilters, collegeId, courseGroupId],
  );
  const regulations = useMemo(
    () =>
      dedupeBy(
        restFilters.filter(
          (x) =>
            Number(x.fk_college_id) === Number(collegeId) &&
            Number(x.fk_course_group_id) === Number(courseGroupId) &&
            Number(x.fk_course_year_id) === Number(courseYearId),
        ),
        "fk_regulation_id",
      ),
    [restFilters, collegeId, courseGroupId, courseYearId],
  );
  const subjectTypes = useMemo(() => {
    let list = dedupeBy(
      subjectRows.filter(
        (x) => Number(x.fk_regulation_id) === Number(regulationId),
      ),
      "fk_subjecttype_catdet_id",
    );
    const semister = hasSemisterRole();
    if (
      !semister &&
      selectedExam?.is_regular_exam === true &&
      list.length > 0
    ) {
      list = list.filter(
        (x) =>
          Number(x.fk_subjecttype_catdet_id) !== THEORY_SUBJECT_TYPE_ID &&
          Number(x.fk_subjecttype_catdet_id) !== ELECTIVE_SUBJECT_TYPE_ID,
      );
    }
    return list;
  }, [subjectRows, regulationId, selectedExam]);
  const subjects = useMemo(
    () =>
      dedupeBy(
        subjectRows.filter(
          (x) =>
            Number(x.fk_regulation_id) === Number(regulationId) &&
            Number(x.fk_subjecttype_catdet_id) === Number(subjectTypeId),
        ),
        "fk_subject_id",
      ),
    [subjectRows, regulationId, subjectTypeId],
  );
  const labBatches = useMemo(
    () =>
      dedupeBy(
        subjectRows.filter(
          (x) =>
            Number(x.fk_subject_id) === Number(subjectId) &&
            Number(x.fk_exam_labbatch_id ?? 0) > 0,
        ),
        "fk_exam_labbatch_id",
      ),
    [subjectRows, subjectId],
  );

  const maxMarks = useMemo(() => {
    const values = rows.map((r) =>
      Number(r.maxMarks ?? r.internal_max_marks ?? 0),
    );
    const firstValid = values.find((v) => Number.isFinite(v) && v > 0);
    return firstValid ?? 0;
  }, [rows]);
  const employeeDisplay = userName ? `${empNumber} (${userName})` : empNumber;
  const selectedCollege = useMemo(
    () => colleges.find((x) => Number(x.fk_college_id) === Number(collegeId)),
    [colleges, collegeId],
  );
  const selectedCourse = useMemo(
    () => courses.find((x) => Number(x.fk_course_id) === Number(courseId)),
    [courses, courseId],
  );
  const selectedGroup = useMemo(
    () =>
      courseGroups.find(
        (x) => Number(x.fk_course_group_id) === Number(courseGroupId),
      ),
    [courseGroups, courseGroupId],
  );
  const selectedYear = useMemo(
    () =>
      courseYears.find(
        (x) => Number(x.fk_course_year_id) === Number(courseYearId),
      ),
    [courseYears, courseYearId],
  );
  const selectedRegulation = useMemo(
    () =>
      regulations.find(
        (x) => Number(x.fk_regulation_id) === Number(regulationId),
      ),
    [regulations, regulationId],
  );
  const selectedSubject = useMemo(
    () => subjects.find((x) => Number(x.fk_subject_id) === Number(subjectId)),
    [subjects, subjectId],
  );
  const selectedAcademicYear = useMemo(
    () =>
      academicYears.find(
        (x) => Number(x.fk_academic_year_id) === Number(academicYearId),
      ),
    [academicYears, academicYearId],
  );
  const selectedSubjectCategoryId = Number(
    selectedSubject?.fk_subjectcategory_catdet_id ??
      selectedSubject?.subjectCategoryCatDetId ??
      rows[0]?.subjectCategoryCatDetId ??
      rows[0]?.subjectcategoryId ??
      0,
  );
  const selectedMarksSetup = useMemo(
    () =>
      marksSetupRows.find(
        (setup) =>
          Number(
            setup.subjectCategoryCatDetId ??
              setup.generalDetailId ??
              setup.subjectCategory?.generalDetailId ??
              0,
          ) === selectedSubjectCategoryId,
      ),
    [marksSetupRows, selectedSubjectCategoryId],
  );
  const examMarkRow = examMarks[0] ?? null;
  const examSetupRow = marksSetupRows[0] ?? selectedMarksSetup ?? null;

  const marks1 = Boolean(
    examMarkRow?.marks1 != null || examSetupRow?.marks1 != null,
  );
  const marks2 = Boolean(
    examMarkRow?.marks2 != null || examSetupRow?.marks2 != null,
  );
  const marks3 = Boolean(
    examMarkRow?.marks3 != null || examSetupRow?.marks3 != null,
  );
  const totalField = marks1 || marks2 || marks3;
  const maxMarks1 = Number(
    examMarkRow?.marks1 != null
      ? examMarkRow.marks1
      : (examSetupRow?.marks1 ?? 0),
  );
  const maxMarks2 = Number(
    examMarkRow?.marks2 != null
      ? examMarkRow.marks2
      : (examSetupRow?.marks2 ?? 0),
  );
  const maxMarks3 = Number(
    examMarkRow?.marks3 != null
      ? examMarkRow.marks3
      : (examSetupRow?.marks3 ?? 0),
  );
  const maxValue = useMemo(() => {
    const subjectMarksRow = examMarks.find(
      (m) => Number(m.subjectId ?? m.fk_subject_id) === Number(subjectId),
    );
    const fromSubject =
      subjectMarksRow?.internalmarks ?? subjectMarksRow?.internalMarks;
    if (fromSubject != null && fromSubject !== "")
      return Number(fromSubject) || 0;
    const setup =
      marksSetupRows.find(
        (s) =>
          Number(
            s.subjectCategoryCatDetId ??
              s.subjectcategoryCatDetId ??
              s.generalDetailId ??
              0,
          ) === selectedSubjectCategoryId,
      ) ?? examSetupRow;
    return Number(setup?.internalMarks ?? setup?.internalmarks ?? 0) || 0;
  }, [
    examMarks,
    marksSetupRows,
    subjectId,
    selectedSubjectCategoryId,
    examSetupRow,
  ]);

  const displayMaxMarks = useMemo(() => {
    if (maxValue > 0) return maxValue;
    const fallback = [
      maxMarks,
      ...rows.flatMap((row) => [
        row.internalmarks,
        row.internalMarks,
        row.internal_max_marks,
      ]),
      selectedSubject?.internalmarks,
      selectedSubject?.internalMarks,
      selectedMarksSetup?.internalMarks,
      selectedMarksSetup?.internalmarks,
    ]
      .map(Number)
      .find((value) => Number.isFinite(value) && value > 0);
    return fallback ?? 0;
  }, [maxValue, maxMarks, rows, selectedSubject, selectedMarksSetup]);

  useEffect(() => {
    if (printMode !== "marks-sheet") return;

    const printRoot = document.querySelector<HTMLElement>("[data-print-root]");
    if (!printRoot) return;

    const frame = document.createElement("iframe");
    frame.setAttribute("aria-hidden", "true");
    frame.style.cssText =
      "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
    document.body.appendChild(frame);

    const printDocument = frame.contentDocument;
    const printWindow = frame.contentWindow;
    if (!printDocument || !printWindow) {
      frame.remove();
      setPrintMode(null);
      return;
    }

    printDocument.open();
    printDocument.write(`<!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <base href="${window.location.origin}/" />
          <title>Internal Marks Entry</title>
          <style>
            * { box-sizing: border-box; }
            html, body { margin: 0; padding: 0; background: #fff; color: #000; }
            [data-print-root] { width: 100% !important; margin: 0 auto !important; }
            table { page-break-inside: auto; }
            thead { display: table-header-group; }
            tr { page-break-inside: avoid; }
            @page { size: portrait; margin: 10mm; }
          </style>
        </head>
        <body>${printRoot.outerHTML}</body>
      </html>`);
    printDocument.close();

    let cleanedUp = false;
    const cleanup = () => {
      if (cleanedUp) return;
      cleanedUp = true;
      frame.remove();
      setPrintMode(null);
    };
    printWindow.addEventListener("afterprint", cleanup, { once: true });

    const images = Array.from(printDocument.images);
    const imagesReady = images.length
      ? Promise.all(
          images.map(
            (image) =>
              new Promise<void>((resolve) => {
                if (image.complete) {
                  resolve();
                  return;
                }
                image.addEventListener("load", () => resolve(), { once: true });
                image.addEventListener("error", () => resolve(), {
                  once: true,
                });
              }),
          ),
        )
      : Promise.resolve();

    void imagesReady.then(() => {
      if (cleanedUp) return;
      printWindow.focus();
      printWindow.print();
      window.setTimeout(cleanup, 1500);
    });

    return () => {
      if (!cleanedUp) frame.remove();
    };
  }, [printMode, setPrintMode]);

  useEffect(() => {
    let cancelled = false;
    async function loadFilters() {
      setLoading(true);
      try {
        const data = await getInternalMarksEntryFilters(employeeId).catch(
          () => [],
        );
        if (!cancelled) setAllFilters(Array.isArray(data) ? data : []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadFilters();
    return () => {
      cancelled = true;
    };
  }, [employeeId]);

  // Auto-pick only when empty/invalid — Angular clears dependents then sets [0] once.
  useEffect(() => {
    if (!courseId && courses[0]?.fk_course_id)
      setCourseId(Number(courses[0].fk_course_id));
  }, [courses, courseId]);
  useEffect(() => {
    if (!academicYears[0]?.fk_academic_year_id) return;
    const valid = academicYears.some(
      (x) => Number(x.fk_academic_year_id) === Number(academicYearId),
    );
    if (!academicYearId || !valid)
      setAcademicYearId(Number(academicYears[0].fk_academic_year_id));
  }, [academicYears, academicYearId]);
  useEffect(() => {
    if (!exams[0]?.fk_exam_id) return;
    const valid = exams.some((x) => Number(x.fk_exam_id) === Number(examId));
    if (!examId || !valid) setExamId(Number(exams[0].fk_exam_id));
  }, [exams, examId]);

  useEffect(() => {
    let cancelled = false;
    async function loadRest() {
      setRestFilters([]);
      setSubjectRows([]);
      if (!courseId || !academicYearId || !examId) return;
      // Skip stale exam from a previous course/year (prevents the double rest-filters call).
      const examValid = exams.some(
        (x) => Number(x.fk_exam_id) === Number(examId),
      );
      if (!examValid) return;
      const data = await getInternalMarksEntryRestFilters({
        courseId,
        academicYearId,
        examId,
        employeeId,
      }).catch(() => []);
      if (cancelled) return;
      setRestFilters(Array.isArray(data) ? data : []);
    }
    void loadRest();
    return () => {
      cancelled = true;
    };
  }, [courseId, academicYearId, examId, employeeId, exams]);

  useEffect(() => {
    if (!colleges[0]?.fk_college_id) return;
    const valid = colleges.some(
      (x) => Number(x.fk_college_id) === Number(collegeId),
    );
    if (!collegeId || !valid) setCollegeId(Number(colleges[0].fk_college_id));
  }, [colleges, collegeId]);
  useEffect(() => {
    if (!courseGroups[0]?.fk_course_group_id) return;
    const valid = courseGroups.some(
      (x) => Number(x.fk_course_group_id) === Number(courseGroupId),
    );
    if (!courseGroupId || !valid)
      setCourseGroupId(Number(courseGroups[0].fk_course_group_id));
  }, [courseGroups, courseGroupId]);
  useEffect(() => {
    if (!courseYears[0]?.fk_course_year_id) return;
    const valid = courseYears.some(
      (x) => Number(x.fk_course_year_id) === Number(courseYearId),
    );
    if (!courseYearId || !valid)
      setCourseYearId(Number(courseYears[0].fk_course_year_id));
  }, [courseYears, courseYearId]);
  useEffect(() => {
    if (!regulations[0]?.fk_regulation_id) return;
    const valid = regulations.some(
      (x) => Number(x.fk_regulation_id) === Number(regulationId),
    );
    if (!regulationId || !valid)
      setRegulationId(Number(regulations[0].fk_regulation_id));
  }, [regulations, regulationId]);

  useEffect(() => {
    let cancelled = false;
    async function loadSubjects() {
      setSubjectRows([]);
      if (
        !courseId ||
        !academicYearId ||
        !examId ||
        !collegeId ||
        !courseGroupId ||
        !courseYearId ||
        !regulationId
      )
        return;
      const examValid = exams.some(
        (x) => Number(x.fk_exam_id) === Number(examId),
      );
      if (!examValid) return;
      const data = await getInternalMarksEntrySubjects({
        collegeId,
        courseId,
        courseGroupId,
        courseYearId,
        examId,
        academicYearId,
        regulationId,
        employeeId,
      }).catch(() => []);
      if (cancelled) return;
      setSubjectRows(Array.isArray(data) ? data : []);
    }
    void loadSubjects();
    return () => {
      cancelled = true;
    };
  }, [
    courseId,
    academicYearId,
    examId,
    collegeId,
    courseGroupId,
    courseYearId,
    regulationId,
    employeeId,
    exams,
  ]);

  useEffect(() => {
    if (!subjectTypes[0]?.fk_subjecttype_catdet_id) return;
    const valid = subjectTypes.some(
      (x) => Number(x.fk_subjecttype_catdet_id) === Number(subjectTypeId),
    );
    if (!subjectTypeId || !valid)
      setSubjectTypeId(Number(subjectTypes[0].fk_subjecttype_catdet_id));
  }, [subjectTypes, subjectTypeId]);
  useEffect(() => {
    if (!subjects[0]?.fk_subject_id) return;
    const valid = subjects.some(
      (x) => Number(x.fk_subject_id) === Number(subjectId),
    );
    if (!subjectId || !valid) setSubjectId(Number(subjects[0].fk_subject_id));
  }, [subjects, subjectId]);
  useEffect(() => {
    let cancelled = false;
    setMarksSetupRows([]);
    setExamMarks([]);
    if (!subjectId || !courseId || !regulationId || !subjectTypeId) return;

    void Promise.all([
      listInternalExamMarksSetup({
        courseId,
        regulationId,
        subjectTypeId,
      }),
      courseGroupId
        ? getInternalMarksEntrySubjectMarks({
            courseId,
            courseGroupId,
            regulationId,
            subjectId,
          })
        : Promise.resolve([]),
    ])
      .then(([setups, subjectMarks]) => {
        if (cancelled) return;
        setMarksSetupRows(Array.isArray(setups) ? setups : []);
        setExamMarks(Array.isArray(subjectMarks) ? subjectMarks : []);
      })
      .catch(() => {
        if (!cancelled) {
          setMarksSetupRows([]);
          setExamMarks([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [subjectId, courseId, regulationId, subjectTypeId, courseGroupId]);
  useEffect(() => {
    const selectedSubject = subjects.find(
      (subject) => Number(subject.fk_subject_id) === Number(subjectId),
    );
    const dateValue = String(selectedSubject?.exam_date ?? "").slice(0, 10);
    setExamDate(dateValue || "");
  }, [subjects, subjectId]);

  function resetAfterCourseChange() {
    clearDownstreamFilters(
      setAcademicYearId,
      setExamId,
      setCollegeId,
      setCourseGroupId,
      setCourseYearId,
      setRegulationId,
      setSubjectTypeId,
      setSubjectId,
      setLabBatchId,
      setExamDate,
      setRestFilters,
      setSubjectRows,
      setRows,
      setHasFetched,
    );
  }

  function resetAfterAcademicYearChange() {
    clearDownstreamFilters(
      setAcademicYearId,
      setExamId,
      setCollegeId,
      setCourseGroupId,
      setCourseYearId,
      setRegulationId,
      setSubjectTypeId,
      setSubjectId,
      setLabBatchId,
      setExamDate,
      setRestFilters,
      setSubjectRows,
      setRows,
      setHasFetched,
      { keepAcademicYear: true },
    );
  }

  function resetAfterExamChange() {
    clearDownstreamFilters(
      setAcademicYearId,
      setExamId,
      setCollegeId,
      setCourseGroupId,
      setCourseYearId,
      setRegulationId,
      setSubjectTypeId,
      setSubjectId,
      setLabBatchId,
      setExamDate,
      setRestFilters,
      setSubjectRows,
      setRows,
      setHasFetched,
      { keepAcademicYear: true, keepExam: true },
    );
  }

  function calculateTotal(row: MarkRow): number {
    return (
      Number(row.internal_exam_marks ?? 0) +
      Number(row.internal_assignment_marks ?? 0) +
      Number(row.internal_quiz_marks ?? 0)
    );
  }

  function applyEnteredMarks(row: MarkRow): MarkRow {
    const next = { ...row };
    const total = next.internal_total_marks;
    if (total !== "" && total != null) {
      let parsed = Number(total);
      if (!Number.isFinite(parsed) || parsed < 0) parsed = 0;
      if (maxValue > 0 && parsed > maxValue) {
        toast.info(`Entered Marks Should Less Than ${maxValue}Marks`);
        next.internal_total_marks = "";
      } else {
        next.internal_total_marks = parsed;
      }
    }
    if (next.isPresent === false) {
      next.isPass = false;
    } else if (next.isPresent != null) {
      next.isPass = true; // Internal exam — Angular always passes if present
    }
    return next;
  }

  const updateMarks = useCallback(
    (row: MarkRow, field: string, value: number | "") => {
      const targetStudentId = Number(row.studentId ?? row.fk_student_id ?? 0);
      const targetHallTicket = String(
        row.hallticketNumber ?? row.hallticket_number ?? "",
      );
      setRows((prev) =>
        prev.map((r) => {
          const sid = Number(r.studentId ?? r.fk_student_id ?? 0);
          const hall = String(r.hallticketNumber ?? r.hallticket_number ?? "");
          const sameRow =
            (targetStudentId > 0 && sid === targetStudentId) ||
            (targetStudentId <= 0 &&
              targetHallTicket.length > 0 &&
              hall === targetHallTicket);
          if (!sameRow) return r;

          let next: MarkRow = { ...r, [field]: value };

          if (field === "internal_exam_marks" && maxMarks1 > 0) {
            const v = Number(value);
            if (Number.isFinite(v) && v > maxMarks1) {
              toast.info(
                `The Exam Marks should not be greater than ${maxMarks1}`,
              );
              next.internal_exam_marks = "";
            }
          }
          if (field === "internal_assignment_marks" && maxMarks2 > 0) {
            const v = Number(value);
            if (Number.isFinite(v) && v > maxMarks2) {
              toast.info(
                `The Assignment Marks should not be greater than ${maxMarks2}`,
              );
              next.internal_assignment_marks = "";
            }
          }
          if (field === "internal_quiz_marks" && maxMarks3 > 0) {
            const v = Number(value);
            if (Number.isFinite(v) && v > maxMarks3) {
              toast.info(
                `The Quiz Marks should not be greater than ${maxMarks3}`,
              );
              next.internal_quiz_marks = "";
            }
          }

          if (field !== "internal_total_marks") {
            next.internal_total_marks = calculateTotal(next);
          }

          if (maxValue > 0 && Number(next.internal_total_marks) > maxValue) {
            toast.info(
              `The Total Internal Marks should not be greater than ${maxValue}`,
            );
            next.internal_total_marks = "";
          }

          return applyEnteredMarks(next);
        }),
      );
    },
    [maxMarks1, maxMarks2, maxMarks3, maxValue],
  );

  function mergeValidationRows(
    rowsIn: MarkRow[],
    validationRows: AnyRow[],
  ): MarkRow[] {
    if (!validationRows.length) return rowsIn;
    return rowsIn.map((row) => {
      const match = validationRows.find(
        (v) =>
          Number(v.studentId ?? v.fk_student_id) ===
          Number(row.studentId ?? row.fk_student_id),
      );
      if (!match) return row;
      return applyEnteredMarks({
        ...row,
        marks: match.marks ?? row.marks,
        isvalidate: match.isvalidate,
        reason: match.reason,
        color:
          match.isvalidate === false
            ? "#ff7777"
            : match.isvalidate === true
              ? null
              : row.color,
      });
    });
  }

  async function onGetList(
    validationRows: AnyRow[] = [],
    options?: { mergeSavedMarks?: boolean },
  ) {
    const mergeSavedMarks = options?.mergeSavedMarks ?? true;
    if (
      !collegeId ||
      !courseId ||
      !examId ||
      !courseGroupId ||
      !courseYearId ||
      !regulationId ||
      !subjectId ||
      !examDate
    )
      return;
    setLoading(true);
    setHasFetched(true);
    try {
      const data = await getInternalMarksEntryStudents({
        collegeId,
        courseId,
        examId,
        courseGroupId,
        courseYearId,
        regulationId,
        subjectId,
        labBatchId,
        examDate,
      }).catch(() => []);
      let normalized = (Array.isArray(data) ? data : []).map((r) => {
        const internalMarkId =
          r.examStdInternalMarkId ?? r.exam_std_internal_mark_id ?? null;
        const base: MarkRow = {
          ...r,
          examStdInternalMarkId: internalMarkId,
          exam_std_internal_mark_id: internalMarkId,
          marks: r.marks == null ? 0 : r.marks,
          internal_exam_marks:
            r.internal_exam_marks == null ? 0 : r.internal_exam_marks,
          internal_assignment_marks:
            r.internal_assignment_marks == null
              ? 0
              : r.internal_assignment_marks,
          internal_quiz_marks:
            r.internal_quiz_marks == null ? 0 : r.internal_quiz_marks,
          internal_total_marks:
            r.internal_total_marks == null ? 0 : r.internal_total_marks,
          isMarksPublished:
            r.isMarksPublished == null ? false : r.isMarksPublished,
          isAttSatisfied: r.isAttSatisfied == null ? true : r.isAttSatisfied,
        };
        if (base.isPresent === false) base.isPass = false;
        return applyEnteredMarks(base);
      });

      if (mergeSavedMarks) {
        const existing = await listExamStudentInternalMarksForEntry({
          collegeId,
          examId,
          subjectId,
        }).catch(() => []);
        if (existing.length) {
          normalized = normalized.map((row) => {
            const match = existing.find(
              (e) =>
                Number(e.studentId ?? e.student?.studentId) ===
                Number(row.studentId ?? row.fk_student_id),
            );
            if (!match) return row;
            // marks_entry proc already returns the correct examStdInternalMarkId
            // for this exam date/subject. Domain list can return a different (stale)
            // record for the same student — keep proc id when present.
            const procInternalMarkId =
              row.examStdInternalMarkId ?? row.exam_std_internal_mark_id;
            return applyEnteredMarks({
              ...row,
              marks: match.marks ?? row.marks,
              extMarks: 0,
              examStdInternalMarkId:
                procInternalMarkId ??
                match.examStdInternalMarkId ??
                match.exam_std_internal_mark_id,
              exam_std_internal_mark_id:
                procInternalMarkId ??
                match.examStdInternalMarkId ??
                match.exam_std_internal_mark_id,
            });
          });
        }
      }

      setRows(mergeValidationRows(normalized, validationRows));
    } finally {
      setLoading(false);
    }
  }

  async function onSaveMarks() {
    if (
      !courseId ||
      !collegeId ||
      !examId ||
      !courseYearId ||
      !subjectId ||
      !regulationId ||
      !subjectTypeId
    )
      return;
    if (rows.length === 0) return;
    if (selectedExam && selectedExam.is_internal_exam === false) return;
    setSaving(true);
    try {
      const isExternalEvaluator =
        userRole.toUpperCase() === "EXTERNAL EVALUATOR";
      const subCredits = Number(
        selectedSubject?.sub_credits ?? selectedSubject?.subCredits ?? 0,
      );
      const saveExamDate = toSaveExamDate(examDate);
      const payload = rows.map((row) => ({
        examStudentDetailDTO: {
          ...row,
          marksEnteredEmpId: employeeId,
          courseId,
          regulationId,
          subjectTypeId,
          isExtenalpersonApprove: isExternalEvaluator,
          examEvaluatorProfileId: isExternalEvaluator
            ? examEvaluatorProfileId || null
            : null,
          credits: row.isPass ? subCredits : 0,
        },
        examStudentInternalMarkDTO: {
          examDate: saveExamDate,
          isActive: true,
          isPresent: row.isPresent,
          isPublished: false,
          marks: row.marks,
          internal_total_marks: row.internal_total_marks,
          internal_exam_marks: row.internal_exam_marks,
          internal_quiz_marks: row.internal_quiz_marks,
          internal_assignment_marks: row.internal_assignment_marks,
          collegeId,
          studentId: Number(row.studentId ?? row.fk_student_id ?? 0),
          courseYearId,
          subjectId,
          examId,
          employeeId,
          createdDt: new Date().toISOString(),
          examStdInternalMarkId:
            row.examStdInternalMarkId ?? row.exam_std_internal_mark_id,
        },
      }));
      const result = await saveInternalMarksEntry(payload);
      if (result.success) {
        toastSuccess(result.message ?? "Marks saved successfully");
      } else {
        toast.info(result.message ?? "Marks saved with validation notes");
      }
      // Angular postExamMarks → getStudentsList(result.data) twice (no ExamStudentInternalMark on this path).
      const validation = result.validationRows;
      void onGetList(validation, { mergeSavedMarks: false });
      if (validation.length) {
        void onGetList(validation, { mergeSavedMarks: false });
      } else {
        void onGetList([], { mergeSavedMarks: false });
      }
    } catch (error) {
      toastError(error, "Failed to save marks");
    } finally {
      setSaving(false);
    }
  }

  const columnDefs = useMemo<ColDef<MarkRow>[]>(() => {
    const attendanceValue = (isPresent: unknown) => {
      if (isPresent === true) return "Present";
      if (isPresent === false) return "Absent";
      return "Not Marked";
    };
    const invalidStyle = (p: { data?: MarkRow }) =>
      p.data?.color ? { backgroundColor: String(p.data.color) } : undefined;

    const cols: ColDef<MarkRow>[] = [
      {
        headerName: "SI No",
        width: 70,
        flex: 0,
        valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1,
        cellStyle: invalidStyle,
      },
      {
        field: "hallticketNumber",
        headerName: "Hallticket Number",
        minWidth: 190,
        flex: 1,
        cellStyle: invalidStyle,
      },
      {
        field: "firstName",
        headerName: "Student",
        minWidth: 240,
        flex: 2,
        cellStyle: invalidStyle,
      },
      {
        headerName: "Attendance Status",
        minWidth: 170,
        flex: 1,
        valueGetter: (p) => attendanceValue(p.data?.isPresent),
        cellStyle: invalidStyle,
      },
    ];

    if (marks1) {
      cols.push({
        headerName: "Exam",
        minWidth: 120,
        flex: 1,
        cellRenderer: MarkInputRenderer,
        cellRendererParams: {
          field: "internal_exam_marks",
          maxMarks: maxMarks1,
          onChange: updateMarks,
        },
        cellStyle: invalidStyle,
      });
    }
    if (marks2) {
      cols.push({
        headerName: "Assignment",
        minWidth: 120,
        flex: 1,
        cellRenderer: MarkInputRenderer,
        cellRendererParams: {
          field: "internal_assignment_marks",
          maxMarks: maxMarks2,
          onChange: updateMarks,
        },
        cellStyle: invalidStyle,
      });
    }
    if (marks3) {
      cols.push({
        headerName: "Quiz",
        minWidth: 120,
        flex: 1,
        cellRenderer: MarkInputRenderer,
        cellRendererParams: {
          field: "internal_quiz_marks",
          maxMarks: maxMarks3,
          onChange: updateMarks,
        },
        cellStyle: invalidStyle,
      });
    }

    cols.push({
      headerName: "Total Internal",
      minWidth: 150,
      flex: 1,
      cellRenderer: MarkInputRenderer,
      cellRendererParams: {
        field: "internal_total_marks",
        maxMarks: maxValue || displayMaxMarks,
        onChange: updateMarks,
        lockWhenBreakdown: totalField,
      },
      cellStyle: invalidStyle,
    });

    return cols;
  }, [
    marks1,
    marks2,
    marks3,
    totalField,
    maxMarks1,
    maxMarks2,
    maxMarks3,
    maxValue,
    displayMaxMarks,
    updateMarks,
  ]);

  // ── Print layout ─────────────────────────────────────────────────────────
  // Mirrors Angular's #printsection: banner placeholder, MARKS SHEET title,
  // college/course/subject info block, students table with conditional
  // Exam / Assignment / Quiz columns, and Faculty/HOD signature lines.
  if (printMode === "marks-sheet") {
    const first = rows[0] ?? {};
    const externalExamName = String(
      first.external_exam_name ?? first.externalExamName ?? "",
    );
    const sheetTitle = `${externalExamName} - MARKS SHEET`;
    const universityCode = String(
      selectedCourse?.university_code ?? first.universityCode ?? "",
    );
    const bannerSrc =
      universityCode === "SUK"
        ? "/assets/images/avatars/SUK_BANNER_NEW.jpg"
        : universityCode === "MVSR"
          ? "/assets/images/avatars/MVSR_BANNER.png"
          : "/assets/images/avatars/MECS_BANNER.png";
    const isLab =
      Number(first.subjecttypeId ?? first.fk_subjecttype_catdet_id ?? 0) ===
        5 ||
      Number(first.subjecttypeId ?? first.fk_subjecttype_catdet_id ?? 0) ===
        6026;
    const subjectTypeLabel = isLab ? "LAB" : "THEORY";
    return (
      <div
        data-print-root
        className="text-black"
        style={{
          width: "100%",
          maxWidth: "900px",
          margin: "0 auto",
          padding: "12px 20px",
          background: "#fff",
          color: "#000",
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={bannerSrc}
          alt=""
          style={{
            display: "block",
            width: "100%",
            maxHeight: "125px",
            objectFit: "contain",
          }}
        />
        {universityCode === "SUK" && (
          <p
            style={{
              margin: "2px 0 0",
              textAlign: "center",
              fontSize: "11px",
              fontWeight: 600,
            }}
          >
            KALABURAGI-585103, KARNATAKA, INDIA
          </p>
        )}
        <hr
          style={{ border: 0, borderTop: "1px solid #000", margin: "12px 0" }}
        />
        <p
          style={{
            textAlign: "center",
            fontSize: "14px",
            fontWeight: 600,
            margin: 0,
          }}
        >
          {sheetTitle}
        </p>

        <div style={{ marginTop: "14px", fontSize: "12px", lineHeight: 1.6 }}>
          <div>
            <strong>College:</strong>{" "}
            {first.collegeName ??
              selectedCollege?.college_name ??
              selectedCollege?.college_code ??
              "-"}
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 4,
            }}
          >
            <div>
              <strong>Course:</strong>{" "}
              {first.courseCode ?? selectedCourse?.course_code ?? "-"} -{" "}
              {first.groupName ?? selectedGroup?.group_code ?? "-"}
            </div>
            <div>
              <strong>Academic Year:</strong>{" "}
              {selectedAcademicYear?.academic_year ?? "-"}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 4,
            }}
          >
            <div>
              <strong>Subject Code:</strong>{" "}
              {first.subjectCode ?? selectedSubject?.subject_code ?? "-"}
            </div>
            <div>
              <strong>Subject Title:</strong>{" "}
              {first.subjectName ?? selectedSubject?.subject_name ?? "-"}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 4,
            }}
          >
            <div>
              <strong>Max Marks:</strong> {displayMaxMarks || "-"}
            </div>
            <div>
              <strong>Subject Type:</strong> {subjectTypeLabel}
            </div>
          </div>
        </div>

        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            marginTop: "12px",
            fontSize: "12px",
          }}
        >
          <thead>
            <tr>
              <th
                style={{
                  border: "1px solid #000",
                  padding: "4px",
                  textAlign: "center",
                }}
              >
                SI.NO
              </th>
              <th
                style={{
                  border: "1px solid #000",
                  padding: "4px",
                  textAlign: "center",
                }}
              >
                USN
              </th>
              <th
                style={{
                  border: "1px solid #000",
                  padding: "4px",
                  textAlign: "center",
                }}
              >
                Student Name
              </th>
              <th
                style={{
                  border: "1px solid #000",
                  padding: "4px",
                  textAlign: "center",
                }}
              >
                Attendance
              </th>
              <th
                style={{
                  border: "1px solid #000",
                  padding: "4px",
                  textAlign: "center",
                }}
              >
                Total Internal Marks
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const attendance =
                r.isPresent === true
                  ? "Present"
                  : r.isPresent === false
                    ? "Absent"
                    : "";
              return (
                <tr key={`print-${r.hallticketNumber ?? r.studentId ?? i}`}>
                  <td
                    style={{
                      border: "1px solid #000",
                      padding: "4px",
                      textAlign: "center",
                    }}
                  >
                    {i + 1}
                  </td>
                  <td style={{ border: "1px solid #000", padding: "4px" }}>
                    {r.hallticketNumber ?? r.hallticket_number ?? "-"}
                  </td>
                  <td style={{ border: "1px solid #000", padding: "4px" }}>
                    {r.firstName ?? r.student_name ?? "-"}
                  </td>
                  <td style={{ border: "1px solid #000", padding: "4px" }}>
                    {attendance}
                  </td>
                  <td
                    style={{
                      border: "1px solid #000",
                      padding: "4px",
                      textAlign: "center",
                    }}
                  >
                    {Number(r.internal_total_marks ?? 0)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <p style={{ marginTop: "14px", fontSize: "12px", fontWeight: 500 }}>
          Date of Submission of IA Marks:
        </p>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: "60px",
            fontSize: "12px",
            fontWeight: 600,
          }}
        >
          <div>Signature of the Faculty</div>
          <div>HOD</div>
        </div>
      </div>
    );
  }

  return (
    <FilteredListPage
      title="Internal Marks Entry"
      filters={
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-12 items-end">
            <div className="space-y-1 md:col-span-2">
              <Label>Course *</Label>
              <Select
                value={courseId ? String(courseId) : null}
                onChange={(v) => {
                  if (!v) return;
                  resetAfterCourseChange();
                  setCourseId(Number(v));
                }}
                options={courses.map((x) => ({
                  value: String(x.fk_course_id),
                  label: String(x.course_code ?? ""),
                }))}
                placeholder="Course"
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Academic Year *</Label>
              <Select
                value={academicYearId ? String(academicYearId) : null}
                onChange={(v) => {
                  if (!v) return;
                  resetAfterAcademicYearChange();
                  setAcademicYearId(Number(v));
                }}
                options={academicYears.map((x) => ({
                  value: String(x.fk_academic_year_id),
                  label: String(x.academic_year ?? ""),
                }))}
                placeholder="Academic Year"
              />
            </div>
            <div className="space-y-1 md:col-span-8">
              <Label>Exam *</Label>
              <Select
                value={examId ? String(examId) : null}
                onChange={(v) => {
                  if (!v) return;
                  resetAfterExamChange();
                  setExamId(Number(v));
                }}
                options={exams.map((x) => ({
                  value: String(x.fk_exam_id),
                  label: String(x.exam_name ?? ""),
                }))}
                placeholder="Exam"
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>College *</Label>
              <Select
                value={collegeId ? String(collegeId) : null}
                onChange={(v) => {
                  if (!v) return;
                  setCourseGroupId(null);
                  setCourseYearId(null);
                  setRegulationId(null);
                  setSubjectTypeId(null);
                  setSubjectId(null);
                  setLabBatchId(0);
                  setSubjectRows([]);
                  setRows([]);
                  setHasFetched(false);
                  setCollegeId(Number(v));
                }}
                options={colleges.map((x) => ({
                  value: String(x.fk_college_id),
                  label: String(x.college_code ?? ""),
                }))}
                placeholder="College"
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Course Group *</Label>
              <Select
                value={courseGroupId ? String(courseGroupId) : null}
                onChange={(v) => {
                  if (!v) return;
                  setCourseYearId(null);
                  setRegulationId(null);
                  setSubjectTypeId(null);
                  setSubjectId(null);
                  setLabBatchId(0);
                  setSubjectRows([]);
                  setRows([]);
                  setHasFetched(false);
                  setCourseGroupId(Number(v));
                }}
                options={courseGroups.map((x) => ({
                  value: String(x.fk_course_group_id),
                  label: String(x.group_code ?? ""),
                }))}
                placeholder="Course Group"
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Course Year *</Label>
              <Select
                value={courseYearId ? String(courseYearId) : null}
                onChange={(v) => {
                  if (!v) return;
                  setRegulationId(null);
                  setSubjectTypeId(null);
                  setSubjectId(null);
                  setLabBatchId(0);
                  setSubjectRows([]);
                  setRows([]);
                  setHasFetched(false);
                  setCourseYearId(Number(v));
                }}
                options={courseYears.map((x) => ({
                  value: String(x.fk_course_year_id),
                  label: String(x.course_year_code ?? ""),
                }))}
                placeholder="Course Year"
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Regulation</Label>
              <Select
                value={regulationId ? String(regulationId) : null}
                onChange={(v) => {
                  if (!v) return;
                  setSubjectTypeId(null);
                  setSubjectId(null);
                  setLabBatchId(0);
                  setSubjectRows([]);
                  setRows([]);
                  setHasFetched(false);
                  setRegulationId(Number(v));
                }}
                options={regulations.map((x) => ({
                  value: String(x.fk_regulation_id),
                  label: String(x.regulation_code ?? ""),
                }))}
                placeholder="Regulation"
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Subject Type</Label>
              <Select
                value={subjectTypeId ? String(subjectTypeId) : null}
                onChange={(v) => {
                  if (!v) return;
                  setSubjectId(null);
                  setLabBatchId(0);
                  setRows([]);
                  setHasFetched(false);
                  setSubjectTypeId(Number(v));
                }}
                options={subjectTypes.map((x) => ({
                  value: String(x.fk_subjecttype_catdet_id),
                  label: String(x.subject_type ?? ""),
                }))}
                placeholder="Subject Type"
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Subject</Label>
              <Select
                value={subjectId ? String(subjectId) : null}
                onChange={(v) => {
                  if (!v) return;
                  setLabBatchId(0);
                  setRows([]);
                  setHasFetched(false);
                  setSubjectId(Number(v));
                }}
                options={subjects.map((x) => ({
                  value: String(x.fk_subject_id),
                  label: `${String(x.subject_name ?? "")} (${String(x.subject_code ?? "")})`,
                }))}
                placeholder="Subject"
              />
            </div>
            {labBatches.length > 0 && (
              <div className="space-y-1 md:col-span-2">
                <Label>Lab Batch</Label>
                <Select
                  value={String(labBatchId)}
                  onChange={(v) => setLabBatchId(Number(v ?? 0))}
                  options={[
                    { value: "0", label: "All" },
                    ...labBatches.map((x) => ({
                      value: String(x.fk_exam_labbatch_id),
                      label: String(x.labbatch_name ?? ""),
                    })),
                  ]}
                  placeholder="All"
                />
              </div>
            )}
            <div className="space-y-1 md:col-span-2">
              <Label>Employee</Label>
              <Input
                className="h-8 text-[12px]"
                value={employeeDisplay}
                disabled
              />
            </div>
            {subjectId && (
              <div className="space-y-1 md:col-span-2">
                <Label>Exam Date</Label>
                <Input
                  className="h-8 text-[12px]"
                  type="date"
                  value={examDate}
                  disabled
                />
              </div>
            )}
            <div className="md:col-span-2">
              <Button
                className="h-8 text-[12px] w-full"
                onClick={() => void onGetList()}
                disabled={loading}
              >
                {loading ? "Loading..." : "Get List"}
              </Button>
            </div>
          </div>
          {hasFetched && checkUploadType === 1 ? (
            <div className="overflow-hidden rounded-md border border-[#c3d9ff]">
              <div className="flex items-start gap-4 p-3">
                <div className="flex h-20 w-24 shrink-0 items-center justify-center bg-[#c3d9ff] text-slate-700">
                  <GraduationCap className="h-10 w-10" />
                </div>
                <div className="space-y-1 text-[13px]">
                  <p className="text-slate-700">
                    {selectedExam?.exam_name ?? "-"}{" "}
                    <span className="text-muted-foreground">
                      ({String(selectedExam?.from_date ?? "").slice(0, 10)} -{" "}
                      {String(selectedExam?.to_date ?? "").slice(0, 10)})
                    </span>{" "}
                    {examDate ? (
                      <span className="text-blue-700">({examDate})</span>
                    ) : null}
                  </p>
                  <p className="text-muted-foreground">
                    / {selectedCollege?.college_code ?? "-"} /{" "}
                    {selectedCourse?.course_code ?? "-"} /{" "}
                    {selectedGroup?.group_code ?? "-"} /{" "}
                    {selectedYear?.course_year_code ?? "-"} /{" "}
                    <span className="text-blue-700">
                      ({selectedAcademicYear?.academic_year ?? "-"})
                    </span>
                  </p>
                  <p className="font-semibold text-slate-800">
                    {selectedSubject?.subject_name ?? "-"} (
                    {selectedRegulation?.regulation_code ?? "-"}) -{" "}
                    <span className="text-blue-700">
                      {selectedSubject?.subject_type ?? "-"}
                    </span>{" "}
                    <span>
                      ({selectedExam?.is_internal_exam ? "Internal" : "Regular"}
                      )
                    </span>
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      }
      rowData={hasFetched ? rows : []}
      columnDefs={columnDefs}
      loading={loading}
      hideEmptyGrid
      getRowId={(p) =>
        String(
          p.data.studentId ??
            p.data.fk_student_id ??
            p.data.hallticketNumber ??
            p.data.hallticket_number ??
            "",
        )
      }
      pagination
      toolbar={
        hasFetched && rows.length > 0
          ? {
              search: true,
              searchPlaceholder: "Search…",
              pdfDocumentTitle: "Internal Marks Entry",
            }
          : false
      }
      toolbarTrailing={
        hasFetched && rows.length > 0 ? (
          <div className="order-first text-[12px] text-slate-600 whitespace-nowrap shrink-0">
            Max Marks :{" "}
            <span className="font-semibold">{displayMaxMarks || "-"}</span>
          </div>
        ) : undefined
      }
    >
      {hasFetched && (
        <div className="flex items-center justify-end gap-2">
          <Button
            className="h-8 text-[12px]"
            onClick={onSaveMarks}
            disabled={saving || rows.length === 0}
          >
            {saving ? "Saving..." : "Save Marks"}
          </Button>
          <Button
            className="h-8 bg-blue-600 text-[12px] text-white hover:bg-blue-700"
            onClick={() => setPrintMode("marks-sheet")}
            disabled={rows.length === 0}
          >
            Print
          </Button>
        </div>
      )}
    </FilteredListPage>
  );
}
