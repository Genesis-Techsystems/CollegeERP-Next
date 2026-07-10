"use client";

import { useEffect, useMemo, useState } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { ChevronDown, Filter } from "lucide-react";
import { PageContainer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Select as SearchableSelect } from "@/common/components/select";
import type { SelectOption } from "@/common/components/select";
import { DataTable } from "@/common/components/table";
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
  const [filterOpen, setFilterOpen] = useState(true);
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
  const academicYears = useMemo(
    () =>
      dedupeBy(
        baseRows.filter((r) => num(r.fk_course_id) === num(courseId)),
        (r) => num(r.fk_academic_year_id),
      ),
    [baseRows, courseId],
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
  const regulations = useMemo(
    () =>
      dedupeBy(
        restRows.filter((r) => num(r.fk_course_year_id) === num(courseYearId)),
        (r) => num(r.fk_regulation_id),
      ),
    [restRows, courseYearId],
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

  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const list = await getRegSupBaseFilters(employeeId);
        setBaseRows(list);
        setCourseId(num(list[0]?.fk_course_id) || null);
      } finally {
        setLoading(false);
      }
    }
    void init();
  }, [employeeId]);

  useEffect(
    () => setAcademicYearId(num(academicYears[0]?.fk_academic_year_id) || null),
    [academicYears],
  );
  useEffect(() => setExamId(num(exams[0]?.fk_exam_id) || null), [exams]);
  useEffect(
    () => setRegulationId(num(regulations[0]?.fk_regulation_id) || null),
    [regulations],
  );

  useEffect(() => {
    async function loadRest() {
      if (!courseId || !academicYearId || !examId) return;
      const rest = await getRegSupRestFilters({
        courseId,
        academicYearId,
        examId,
        employeeId,
      });
      setRestRows(rest);
      setCourseYearId(num(rest[0]?.fk_course_year_id) || null);
    }
    void loadRest();
  }, [courseId, academicYearId, examId, employeeId]);

  useEffect(() => {
    async function loadSubjects() {
      if (
        !courseId ||
        !academicYearId ||
        !examId ||
        !courseYearId ||
        !regulationId
      )
        return;
      const sub = await getRegSupSubjectFilters({
        courseId,
        academicYearId,
        examId,
        courseYearId,
        regulationId,
        employeeId,
      });
      setSubjectRows(sub);
      setSubjectId(num(sub[0]?.fk_subject_id) || null);
    }
    void loadSubjects();
  }, [
    courseId,
    academicYearId,
    examId,
    courseYearId,
    regulationId,
    employeeId,
  ]);

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

  const selectedCourse = courses.find(
    (r) => num(r.fk_course_id) === num(courseId),
  );
  const selectedCourseYear = courseYears.find(
    (r) => num(r.fk_course_year_id) === num(courseYearId),
  );
  const selectedSubject = subjects.find(
    (r) => num(r.fk_subject_id) === num(subjectId),
  );
  const selectedExam = exams.find((r) => num(r.fk_exam_id) === num(examId));

  const contextLabel = `${txt(selectedCourse?.course_code)} / ${txt(selectedCourseYear?.course_year_code)} / ${txt(selectedSubject?.subject_code)} / ${txt(selectedExam?.exam_name)}`;

  return (
    <PageContainer className="space-y-4">
      <div className="app-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/40 flex items-center justify-between gap-2">
          <h2 className="app-card-title">Evaluated Marks Report</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            style={{ marginRight: "0px" }}
            className="h-6 px-2.5 text-[12px]"
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
          <div className="p-3 space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
              <div className="md:col-span-2 space-y-1">
                <Label>Course</Label>
                <Select
                  value={courseId ? String(courseId) : undefined}
                  onValueChange={(v) => setCourseId(num(v) || null)}
                >
                  <SelectTrigger className="h-8 text-[12px]">
                    <SelectValue placeholder="Course" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((r) => (
                      <SelectItem
                        key={String(num(r.fk_course_id))}
                        value={String(num(r.fk_course_id))}
                      >
                        {txt(r.course_code)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2 space-y-1">
                <Label>Academic Year</Label>
                <Select
                  value={academicYearId ? String(academicYearId) : undefined}
                  onValueChange={(v) => setAcademicYearId(num(v) || null)}
                >
                  <SelectTrigger className="h-8 text-[12px]">
                    <SelectValue placeholder="Academic Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {academicYears.map((r) => (
                      <SelectItem
                        key={String(num(r.fk_academic_year_id))}
                        value={String(num(r.fk_academic_year_id))}
                      >
                        {txt(r.academic_year)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-4 space-y-1">
                <Label>Exam</Label>
                <SearchableSelect
                  value={examId ? String(examId) : null}
                  onChange={(v) => setExamId(num(v) || null)}
                  options={examOptions}
                  placeholder="Search exam…"
                  searchable
                />
              </div>
              <div className="md:col-span-2 space-y-1">
                <Label>Course Year</Label>
                <Select
                  value={courseYearId ? String(courseYearId) : undefined}
                  onValueChange={(v) => setCourseYearId(num(v) || null)}
                >
                  <SelectTrigger className="h-8 text-[12px]">
                    <SelectValue placeholder="Course Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {courseYears.map((r) => (
                      <SelectItem
                        key={String(num(r.fk_course_year_id))}
                        value={String(num(r.fk_course_year_id))}
                      >
                        {txt(r.course_year_code)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2 space-y-1">
                <Label>Regulation</Label>
                <Select
                  value={regulationId ? String(regulationId) : undefined}
                  onValueChange={(v) => setRegulationId(num(v) || null)}
                >
                  <SelectTrigger className="h-8 text-[12px]">
                    <SelectValue placeholder="Regulation" />
                  </SelectTrigger>
                  <SelectContent>
                    {regulations.map((r) => (
                      <SelectItem
                        key={String(num(r.fk_regulation_id))}
                        value={String(num(r.fk_regulation_id))}
                      >
                        {txt(r.regulation_code)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-5 space-y-1">
                <Label>Subject</Label>
                <SearchableSelect
                  value={subjectId ? String(subjectId) : null}
                  onChange={(v) => setSubjectId(num(v) || null)}
                  options={subjectOptions}
                  placeholder="Search subjects…"
                  searchable
                />
              </div>
              <div className="md:col-span-3">
                <label className="inline-flex items-center gap-2 text-[12px]">
                  <input
                    type="checkbox"
                    checked={isReevaluation}
                    onChange={(e) => setIsReevaluation(e.target.checked)}
                  />
                  <span>Is Re-Evaluation</span>
                </label>
              </div>
              <div className="md:col-span-2 flex justify-end">
                <Button
                  type="button"
                  onClick={() => void getList()}
                  disabled={loading}
                >
                  Get List
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {tableRows.length > 0 && (
        <div className="app-card overflow-hidden">
          <DataTable
            title=""
            subtitle=""
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
        </div>
      )}
    </PageContainer>
  );
}
