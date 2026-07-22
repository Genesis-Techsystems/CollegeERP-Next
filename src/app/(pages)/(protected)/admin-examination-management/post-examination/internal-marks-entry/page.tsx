"use client";

import { useMemo, useState, useEffect } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { GraduationCap } from "lucide-react";
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
  listExamMarksSetup,
  saveInternalMarksEntry,
} from "@/services";
import { toastError, toastSuccess } from "@/lib/toast";
import { usePrintMode } from "@/lib/print";

type AnyRow = Record<string, any>;
type MarkRow = Record<string, any>;

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

function MarkInputRenderer(
  params: ICellRendererParams<MarkRow> & {
    field: string;
    maxMarks?: number;
    onChange: (row: MarkRow, field: string, value: number) => void;
    disabled?: boolean;
  },
) {
  const value = Number(params.data?.[params.field] ?? 0);
  const max =
    params.maxMarks && params.maxMarks > 0 ? params.maxMarks : undefined;
  return (
    <Input
      type="number"
      min={0}
      max={max}
      className="h-8 text-[12px]"
      value={Number.isFinite(value) ? String(value) : "0"}
      disabled={Boolean(params.disabled)}
      onChange={(e) =>
        params.data &&
        params.onChange(params.data, params.field, Number(e.target.value || 0))
      }
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
  const colleges = useMemo(
    () => dedupeBy(restFilters, "fk_college_id"),
    [restFilters],
  );
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
  const subjectTypes = useMemo(
    () =>
      dedupeBy(
        subjectRows.filter(
          (x) => Number(x.fk_regulation_id) === Number(regulationId),
        ),
        "fk_subjecttype_catdet_id",
      ),
    [subjectRows, regulationId],
  );
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
  const selectedExam = useMemo(
    () => exams.find((x) => Number(x.fk_exam_id) === Number(examId)),
    [exams, examId],
  );
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
  const displayMaxMarks = useMemo(
    () =>
      [
        maxMarks,
        ...rows.flatMap((row) => [
          row.internalmarks,
          row.internalMarks,
          row.internal_max_marks,
        ]),
        selectedSubject?.internalmarks,
        selectedSubject?.internalMarks,
        selectedSubject?.internal_max_marks,
        selectedMarksSetup?.internalMarks,
        selectedMarksSetup?.internalmarks,
      ]
        .map(Number)
        .find((value) => Number.isFinite(value) && value > 0) ?? 0,
    [maxMarks, rows, selectedSubject, selectedMarksSetup],
  );

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
    if (!subjectId || !courseId || !regulationId) return;

    void listExamMarksSetup(courseId, regulationId, false)
      .then((data) => {
        if (!cancelled) setMarksSetupRows(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setMarksSetupRows([]);
      });

    return () => {
      cancelled = true;
    };
  }, [subjectId, courseId, regulationId]);
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

  function updateMarks(row: MarkRow, field: string, value: number) {
    const targetStudentId = Number(row.studentId ?? row.fk_student_id ?? 0);
    const targetHallTicket = String(
      row.hallticketNumber ?? row.hallticket_number ?? "",
    );
    let parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) parsed = 0;
    if (maxMarks > 0 && parsed > maxMarks) {
      parsed = maxMarks;
      toastError(`Entered marks should not exceed ${maxMarks}.`);
    }
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
        const next = { ...r, [field]: parsed };
        if (field !== "internal_total_marks") {
          const total =
            Number(next.internal_exam_marks ?? 0) +
            Number(next.internal_assignment_marks ?? 0) +
            Number(next.internal_quiz_marks ?? 0);
          next.internal_total_marks = total;
        }
        return next;
      }),
    );
  }

  async function onGetList() {
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
      const normalized = (Array.isArray(data) ? data : []).map((r) => ({
        ...r,
        internal_exam_marks: Number(r.internal_exam_marks ?? 0),
        internal_assignment_marks: Number(r.internal_assignment_marks ?? 0),
        internal_quiz_marks: Number(r.internal_quiz_marks ?? 0),
        internal_total_marks: Number(r.internal_total_marks ?? 0),
      }));
      setRows(normalized);
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
      !regulationId
    )
      return;
    if (rows.length === 0) return;
    setSaving(true);
    try {
      const payload = rows.map((row) => ({
        examStudentDetailDTO: {
          ...row,
          marksEnteredEmpId: employeeId,
          courseId,
          regulationId,
          subjectTypeId,
          credits: row.isPass ? Number(row.sub_credits ?? 0) : 0,
        },
        examStudentInternalMarkDTO: {
          examDate,
          isActive: true,
          isPresent: Boolean(row.isPresent),
          isPublished: false,
          marks: Number(row.internal_total_marks ?? row.marks ?? 0),
          internal_total_marks: Number(row.internal_total_marks ?? 0),
          internal_exam_marks: Number(row.internal_exam_marks ?? 0),
          internal_quiz_marks: Number(row.internal_quiz_marks ?? 0),
          internal_assignment_marks: Number(row.internal_assignment_marks ?? 0),
          collegeId,
          studentId: Number(row.studentId ?? row.fk_student_id ?? 0),
          courseYearId,
          subjectId,
          examId,
          employeeId,
          examStdInternalMarkId:
            row.examStdInternalMarkId ?? row.exam_std_internal_mark_id ?? 0,
        },
      }));
      await saveInternalMarksEntry(payload);
      toastSuccess("Marks saved successfully");
      await onGetList();
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
    return [
      {
        headerName: "SI No",
        width: 70,
        flex: 0,
        valueGetter: (p: any) => (p.node?.rowIndex ?? 0) + 1,
      },
      {
        field: "hallticketNumber",
        headerName: "Hallticket Number",
        minWidth: 190,
        flex: 1,
      },
      { field: "firstName", headerName: "Student", minWidth: 240, flex: 2 },
      {
        headerName: "Attendance Status",
        minWidth: 170,
        flex: 1,
        valueGetter: (p: any) => attendanceValue(p.data?.isPresent),
      },
      {
        headerName: "Total Internal",
        minWidth: 170,
        flex: 1,
        // Read-only -- updateMarks keeps internal_total_marks = sum of the three.
        valueGetter: (p: any) => Number(p.data?.internal_total_marks ?? 0),
      },
    ];
  }, [maxMarks]);

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
                onClick={onGetList}
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
      toolbar={{
        search: true,
        searchPlaceholder: "Search…",
        pdfDocumentTitle: "Internal Marks Entry",
      }}
      toolbarTrailing={
        <div className="order-first text-[12px] text-slate-600 whitespace-nowrap shrink-0">
          Max Marks :{" "}
          <span className="font-semibold">{displayMaxMarks || "-"}</span>
        </div>
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
