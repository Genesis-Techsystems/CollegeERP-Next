"use client";

/**
 * Evaluated Marks Report — Angular parity for
 * evaluation-process/evaluated-marks-report
 *
 * Cascade: Course → AY → Exam → Course Year → Regulation → Subject
 * Table shows only after Get List returns records length > 0.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, type SelectOption } from "@/common/components/select";
import {
  getEvaluatedMarksReport,
  getRegSupBaseFilters,
  getRegSupRestFilters,
  getRegSupSubjectFilters,
} from "@/services/evaluation";
import { dedupeBy, num, txt } from "@/common/utils/data-helpers";
import { rowIndexGetter } from "@/lib/utils";

type AnyRow = Record<string, unknown>;

type MarksTableRow = {
  omr_serial_no: string;
  evaluator1Marks: string;
  evaluator2Marks: string;
  evaluator3Marks: string;
  finalMarks: string;
  evaluator1Title: string;
  evaluator2Title: string;
  evaluator3Title: string;
};

const COL_DEFS = {
  siNo: {
    headerName: "S No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<MarksTableRow>,
  omr: {
    field: "omr_serial_no",
    headerName: "Omr Serial No",
    minWidth: 150,
  } as ColDef<MarksTableRow>,
  e1: {
    field: "evaluator1Marks",
    headerName: "Evaluator 1",
    minWidth: 200,
  } as ColDef<MarksTableRow>,
  e2: {
    field: "evaluator2Marks",
    headerName: "Evaluator 2",
    minWidth: 200,
  } as ColDef<MarksTableRow>,
  e3: {
    field: "evaluator3Marks",
    headerName: "Evaluator 3",
    minWidth: 200,
  } as ColDef<MarksTableRow>,
  final: {
    field: "finalMarks",
    headerName: "Final Marks",
    minWidth: 120,
  } as ColDef<MarksTableRow>,
};

function marksRenderer(
  nameField: keyof MarksTableRow,
  marksField: keyof MarksTableRow,
) {
  return (p: ICellRendererParams<MarksTableRow>) => {
    const marks = txt(p.data?.[marksField]);
    const name = txt(p.data?.[nameField]);
    if (!marks) return <span>-</span>;
    return (
      <span className="text-blue-700 font-medium">
        {name ? `${marks} (${name})` : marks}
      </span>
    );
  };
}

function finalMarksRenderer(p: ICellRendererParams<MarksTableRow>) {
  const marks = txt(p.data?.finalMarks);
  return <span>{marks || "-"}</span>;
}

export default function EvaluatedMarksReportPage() {
  const [loading, setLoading] = useState(false);
  const [isReevaluation, setIsReevaluation] = useState(false);
  const [rows, setRows] = useState<AnyRow[]>([]);

  const [baseRows, setBaseRows] = useState<AnyRow[]>([]);
  const [restRows, setRestRows] = useState<AnyRow[]>([]);
  const [subjectRows, setSubjectRows] = useState<AnyRow[]>([]);

  const [courseId, setCourseId] = useState<number | null>(null);
  const [academicYearId, setAcademicYearId] = useState<number | null>(null);
  const [examId, setExamId] = useState<number | null>(null);
  const [courseYearId, setCourseYearId] = useState<number | null>(null);
  const [regulationId, setRegulationId] = useState<number | null>(null);
  const [subjectId, setSubjectId] = useState<number | null>(null);

  const restReqSeq = useRef(0);
  const subjectReqSeq = useRef(0);

  const employeeId = Number(
    globalThis?.localStorage?.getItem("employeeId") ?? 0,
  );
  const organizationId = Number(
    globalThis?.localStorage?.getItem("organizationId") ?? 0,
  );

  const courses = useMemo(
    () => dedupeBy(baseRows, (r) => num(r.fk_course_id)),
    [baseRows],
  );
  const courseOptions = useMemo<SelectOption[]>(
    () =>
      courses.map((r) => ({
        value: String(num(r.fk_course_id)),
        label: txt(r.course_code),
      })),
    [courses],
  );

  const academicYears = useMemo(() => {
    const list = dedupeBy(
      baseRows.filter((r) => num(r.fk_course_id) === num(courseId)),
      (r) => num(r.fk_academic_year_id),
    );
    return [...list].sort(
      (a, b) =>
        parseInt(txt(b.academic_year) || "0", 10) -
        parseInt(txt(a.academic_year) || "0", 10),
    );
  }, [baseRows, courseId]);

  const academicYearOptions = useMemo<SelectOption[]>(
    () =>
      academicYears.map((r) => ({
        value: String(num(r.fk_academic_year_id)),
        label: txt(r.academic_year),
      })),
    [academicYears],
  );

  const exams = useMemo(
    () =>
      dedupeBy(
        baseRows.filter(
          (r) =>
            num(r.fk_course_id) === num(courseId) &&
            num(r.fk_academic_year_id) === num(academicYearId),
        ),
        (r) => num(r.fk_exam_id),
      ),
    [baseRows, courseId, academicYearId],
  );

  const examOptions = useMemo<SelectOption[]>(
    () =>
      exams.map((r) => ({
        value: String(num(r.fk_exam_id)),
        label: txt(r.exam_name),
      })),
    [exams],
  );

  const courseYears = useMemo(
    () => dedupeBy(restRows, (r) => num(r.fk_course_year_id)),
    [restRows],
  );
  const courseYearOptions = useMemo<SelectOption[]>(
    () =>
      courseYears.map((r) => ({
        value: String(num(r.fk_course_year_id)),
        label: txt(r.course_year_code),
      })),
    [courseYears],
  );

  const regulations = useMemo(
    () =>
      dedupeBy(
        restRows.filter((r) => num(r.fk_course_year_id) === num(courseYearId)),
        (r) => num(r.fk_regulation_id),
      ),
    [restRows, courseYearId],
  );
  const regulationOptions = useMemo<SelectOption[]>(
    () =>
      regulations.map((r) => ({
        value: String(num(r.fk_regulation_id)),
        label: txt(r.regulation_code),
      })),
    [regulations],
  );

  const subjects = useMemo(
    () => dedupeBy(subjectRows, (r) => num(r.fk_subject_id)),
    [subjectRows],
  );
  const subjectOptions = useMemo<SelectOption[]>(
    () =>
      subjects.map((r) => ({
        value: String(num(r.fk_subject_id)),
        label: `${txt(r.subject_name)} - ${txt(r.subject_code)} (${txt(r.regulation_code)})`,
      })),
    [subjects],
  );

  function clearResults() {
    setRows([]);
  }

  function clearBelowCourse() {
    setAcademicYearId(null);
    setExamId(null);
    setCourseYearId(null);
    setRegulationId(null);
    setSubjectId(null);
    setRestRows([]);
    setSubjectRows([]);
  }

  function clearBelowAcademicYear() {
    setExamId(null);
    setCourseYearId(null);
    setRegulationId(null);
    setSubjectId(null);
    setRestRows([]);
    setSubjectRows([]);
  }

  function clearBelowExam() {
    setCourseYearId(null);
    setRegulationId(null);
    setSubjectId(null);
    setRestRows([]);
    setSubjectRows([]);
  }

  function clearBelowCourseYear() {
    setRegulationId(null);
    setSubjectId(null);
    setSubjectRows([]);
  }

  function clearBelowRegulation() {
    setSubjectId(null);
    setSubjectRows([]);
  }

  type CascadeCtx = {
    courseId: number;
    academicYearId: number;
    examId: number;
    courseYearId: number;
  };

  /** Angular selectedCourse → AY[0] DESC → selectedAcademicYear. */
  function applyCourse(nextCourseId: number | null) {
    clearResults();
    restReqSeq.current += 1;
    subjectReqSeq.current += 1;
    setCourseId(nextCourseId);
    clearBelowCourse();
    if (!nextCourseId) return;
    const ayRows = dedupeBy(
      baseRows.filter((r) => num(r.fk_course_id) === nextCourseId),
      (r) => num(r.fk_academic_year_id),
    );
    const sorted = [...ayRows].sort(
      (a, b) =>
        parseInt(txt(b.academic_year) || "0", 10) -
        parseInt(txt(a.academic_year) || "0", 10),
    );
    const firstAy = num(sorted[0]?.fk_academic_year_id) || null;
    if (firstAy) applyAcademicYear(firstAy, nextCourseId);
  }

  /** Angular selectedAcademicYear → exam[0] → selectedExam. */
  function applyAcademicYear(nextAyId: number | null, forCourseId = courseId) {
    clearResults();
    restReqSeq.current += 1;
    subjectReqSeq.current += 1;
    setAcademicYearId(nextAyId);
    clearBelowAcademicYear();
    if (!nextAyId || !forCourseId) return;
    const examRows = dedupeBy(
      baseRows.filter(
        (r) =>
          num(r.fk_course_id) === num(forCourseId) &&
          num(r.fk_academic_year_id) === nextAyId,
      ),
      (r) => num(r.fk_exam_id),
    );
    const firstExam = num(examRows[0]?.fk_exam_id) || null;
    if (firstExam) applyExam(firstExam, forCourseId, nextAyId);
  }

  /** Angular selectedExam → rest filters → course year[0] → selectedCourseYr. */
  function applyExam(
    nextExamId: number | null,
    forCourseId = courseId,
    forAyId = academicYearId,
  ) {
    clearResults();
    subjectReqSeq.current += 1;
    setExamId(nextExamId);
    clearBelowExam();
    if (!nextExamId || !forCourseId || !forAyId) return;
    const seq = ++restReqSeq.current;
    void (async () => {
      const list = await getRegSupRestFilters({
        courseId: forCourseId,
        academicYearId: forAyId,
        examId: nextExamId,
        employeeId,
      }).catch(() => [] as AnyRow[]);
      if (seq !== restReqSeq.current) return;
      setRestRows(list);
      const years = dedupeBy(list, (r) => num(r.fk_course_year_id));
      const firstYear = num(years[0]?.fk_course_year_id) || null;
      if (firstYear) {
        applyCourseYear(firstYear, list, {
          courseId: forCourseId,
          academicYearId: forAyId,
          examId: nextExamId,
          courseYearId: firstYear,
        });
      }
    })();
  }

  /** Angular selectedCourseYr → regulations for that year → regulation[0]. */
  function applyCourseYear(
    nextYearId: number | null,
    fromRest: AnyRow[] = restRows,
    ctx?: Partial<CascadeCtx>,
  ) {
    clearResults();
    subjectReqSeq.current += 1;
    setCourseYearId(nextYearId);
    clearBelowCourseYear();
    if (!nextYearId) return;
    const regs = dedupeBy(
      fromRest.filter((r) => num(r.fk_course_year_id) === nextYearId),
      (r) => num(r.fk_regulation_id),
    );
    const firstReg = num(regs[0]?.fk_regulation_id) || null;
    if (!firstReg) return;
    applyRegulation(firstReg, {
      courseId: num(ctx?.courseId ?? courseId),
      academicYearId: num(ctx?.academicYearId ?? academicYearId),
      examId: num(ctx?.examId ?? examId),
      courseYearId: nextYearId,
    });
  }

  /** Angular selectedRegulation → load subjects (no auto-select subject). */
  function applyRegulation(
    nextRegId: number | null,
    ctx?: Partial<CascadeCtx>,
  ) {
    clearResults();
    setRegulationId(nextRegId);
    clearBelowRegulation();
    const cId = num(ctx?.courseId ?? courseId);
    const ayId = num(ctx?.academicYearId ?? academicYearId);
    const eId = num(ctx?.examId ?? examId);
    const yId = num(ctx?.courseYearId ?? courseYearId);
    if (!nextRegId || !cId || !ayId || !eId || !yId) return;
    const seq = ++subjectReqSeq.current;
    void (async () => {
      const list = await getRegSupSubjectFilters({
        courseId: cId,
        academicYearId: ayId,
        examId: eId,
        courseYearId: yId,
        regulationId: nextRegId,
        employeeId,
      }).catch(() => [] as AnyRow[]);
      if (seq !== subjectReqSeq.current) return;
      setSubjectRows(list);
    })();
  }

  /** Angular selectedsubject — clear prior Get List results. */
  function applySubject(nextSubjectId: number | null) {
    clearResults();
    setSubjectId(nextSubjectId);
  }

  /** Angular selectedFlag — clear prior Get List results. */
  function applyReevaluation(checked: boolean) {
    clearResults();
    setIsReevaluation(checked);
  }

  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const list = await getRegSupBaseFilters(employeeId);
        setBaseRows(list);
        const firstCourse = num(list[0]?.fk_course_id) || null;
        if (!firstCourse) return;

        setCourseId(firstCourse);
        clearBelowCourse();

        const ayRows = dedupeBy(
          list.filter((r) => num(r.fk_course_id) === firstCourse),
          (r) => num(r.fk_academic_year_id),
        );
        const sorted = [...ayRows].sort(
          (a, b) =>
            parseInt(txt(b.academic_year) || "0", 10) -
            parseInt(txt(a.academic_year) || "0", 10),
        );
        const firstAy = num(sorted[0]?.fk_academic_year_id) || null;
        if (!firstAy) return;

        setAcademicYearId(firstAy);
        clearBelowAcademicYear();

        const examRows = dedupeBy(
          list.filter(
            (r) =>
              num(r.fk_course_id) === firstCourse &&
              num(r.fk_academic_year_id) === firstAy,
          ),
          (r) => num(r.fk_exam_id),
        );
        const firstExam = num(examRows[0]?.fk_exam_id) || null;
        if (!firstExam) return;

        setExamId(firstExam);
        clearBelowExam();

        const seq = ++restReqSeq.current;
        const rest = await getRegSupRestFilters({
          courseId: firstCourse,
          academicYearId: firstAy,
          examId: firstExam,
          employeeId,
        }).catch(() => [] as AnyRow[]);
        if (seq !== restReqSeq.current) return;

        setRestRows(rest);
        const years = dedupeBy(rest, (r) => num(r.fk_course_year_id));
        const firstYear = num(years[0]?.fk_course_year_id) || null;
        if (!firstYear) return;

        setCourseYearId(firstYear);
        clearBelowCourseYear();

        const regs = dedupeBy(
          rest.filter((r) => num(r.fk_course_year_id) === firstYear),
          (r) => num(r.fk_regulation_id),
        );
        const firstReg = num(regs[0]?.fk_regulation_id) || null;
        if (!firstReg) return;

        setRegulationId(firstReg);
        clearBelowRegulation();

        const subSeq = ++subjectReqSeq.current;
        const subs = await getRegSupSubjectFilters({
          courseId: firstCourse,
          academicYearId: firstAy,
          examId: firstExam,
          courseYearId: firstYear,
          regulationId: firstReg,
          employeeId,
        }).catch(() => [] as AnyRow[]);
        if (subSeq !== subjectReqSeq.current) return;
        setSubjectRows(subs);
      } finally {
        setLoading(false);
      }
    }
    void init();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount/employeeId only; cascade is explicit
  }, [employeeId]);

  async function getList() {
    if (
      !courseId ||
      !academicYearId ||
      !examId ||
      !courseYearId ||
      !regulationId ||
      !subjectId
    )
      return;
    setLoading(true);
    try {
      const data = await getEvaluatedMarksReport({
        organizationId: organizationId || 1,
        examId,
        courseYearId,
        subjectId,
        regulationId,
        courseId,
        academicYearId,
        employeeId,
        isReevaluation,
      });
      setRows(data);
    } finally {
      setLoading(false);
    }
  }

  const tableRows = useMemo<MarksTableRow[]>(() => {
    const byOmr = new Map<string, AnyRow>();
    for (const row of rows) {
      const key = txt(row.omr_serial_no);
      if (key && !byOmr.has(key)) byOmr.set(key, row);
    }

    function getMarks(serialNo: string, evaluatorNumber: number): string {
      const row = rows.find(
        (r) =>
          txt(r.omr_serial_no) === serialNo &&
          num(r.evaluator_number) === evaluatorNumber,
      );
      return txt(row?.evaluated_totalmarks);
    }

    function getEvaluatorName(
      serialNo: string,
      evaluatorNumber: number,
    ): string {
      const row = rows.find(
        (r) =>
          txt(r.omr_serial_no) === serialNo &&
          num(r.evaluator_number) === evaluatorNumber,
      );
      return txt(row?.evaluator_name) || txt(row?.user_name);
    }

    function getFinalMarks(serialNo: string): string {
      const row = rows.find((r) => txt(r.omr_serial_no) === serialNo);
      return txt(row?.final_marks);
    }

    return Array.from(byOmr.values()).map((row) => {
      const serialNo = txt(row.omr_serial_no);
      return {
        omr_serial_no: serialNo,
        evaluator1Marks: getMarks(serialNo, 1),
        evaluator2Marks: getMarks(serialNo, 2),
        evaluator3Marks: getMarks(serialNo, 3),
        finalMarks: getFinalMarks(serialNo),
        evaluator1Title: getEvaluatorName(serialNo, 1),
        evaluator2Title: getEvaluatorName(serialNo, 2),
        evaluator3Title: getEvaluatorName(serialNo, 3),
      };
    });
  }, [rows]);

  const columnDefs = useMemo<ColDef<MarksTableRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.omr,
      {
        ...COL_DEFS.e1,
        cellRenderer: marksRenderer("evaluator1Title", "evaluator1Marks"),
      },
      {
        ...COL_DEFS.e2,
        cellRenderer: marksRenderer("evaluator2Title", "evaluator2Marks"),
      },
      {
        ...COL_DEFS.e3,
        cellRenderer: marksRenderer("evaluator3Title", "evaluator3Marks"),
      },
      { ...COL_DEFS.final, cellRenderer: finalMarksRenderer },
    ],
    [],
  );

  return (
    <FilteredListPage
      title="Evaluated Marks Report"
      showTable={tableRows.length > 0}
      filters={
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
          <div className="md:col-span-2 space-y-1">
            <Label>Course</Label>
            <Select
              value={courseId ? String(courseId) : null}
              onChange={(v) => applyCourse(num(v) || null)}
              options={courseOptions}
              placeholder="Search course…"
            />
          </div>
          <div className="md:col-span-2 space-y-1">
            <Label>Academic Year</Label>
            <Select
              value={academicYearId ? String(academicYearId) : null}
              onChange={(v) => applyAcademicYear(num(v) || null)}
              options={academicYearOptions}
              placeholder="Search academic year…"
            />
          </div>
          <div className="md:col-span-4 space-y-1">
            <Label>Exam</Label>
            <Select
              value={examId ? String(examId) : null}
              onChange={(v) => applyExam(num(v) || null)}
              options={examOptions}
              placeholder="Search exam…"
            />
          </div>
          <div className="md:col-span-2 space-y-1">
            <Label>Course Year</Label>
            <Select
              value={courseYearId ? String(courseYearId) : null}
              onChange={(v) => applyCourseYear(num(v) || null)}
              options={courseYearOptions}
              placeholder="Search course year…"
            />
          </div>
          <div className="md:col-span-2 space-y-1">
            <Label>Regulation</Label>
            <Select
              value={regulationId ? String(regulationId) : null}
              onChange={(v) => applyRegulation(num(v) || null)}
              options={regulationOptions}
              placeholder="Search regulation…"
            />
          </div>
          <div className="md:col-span-5 space-y-1">
            <Label>Subject</Label>
            <Select
              value={subjectId ? String(subjectId) : null}
              onChange={(v) => applySubject(num(v) || null)}
              options={subjectOptions}
              placeholder="Search subjects…"
            />
          </div>
          <div className="md:col-span-3">
            <label className="inline-flex items-center gap-2 text-[12px]">
              <input
                type="checkbox"
                checked={isReevaluation}
                onChange={(e) => applyReevaluation(e.target.checked)}
              />
              <span>Is Re-Evaluation</span>
            </label>
          </div>
          <div className="md:col-span-2 flex justify-end">
            <Button
              type="button"
              onClick={() => void getList()}
              disabled={
                loading ||
                !courseId ||
                !academicYearId ||
                !examId ||
                !courseYearId ||
                !regulationId ||
                !subjectId
              }
            >
              Get List
            </Button>
          </div>
        </div>
      }
      rowData={tableRows}
      columnDefs={columnDefs}
      pagination
      loading={loading}
      toolbar={{
        search: true,
        searchPlaceholder: "Search OMR serial…",
        pdfDocumentTitle: "Evaluated Marks Report",
      }}
    />
  );
}
