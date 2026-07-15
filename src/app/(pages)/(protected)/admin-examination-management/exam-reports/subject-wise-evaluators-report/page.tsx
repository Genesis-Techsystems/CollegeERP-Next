"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ColDef } from "ag-grid-community";
import { FilteredListPage } from "@/components/layout";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
import { Select } from "@/common/components/select";
import { Button } from "@/components/ui/button";
import { rowIndexGetter } from "@/lib/utils";
import { dedupeBy, num, txt } from "@/common/utils/data-helpers";
import { toastError, toastSuccess } from "@/lib/toast";
import { toast } from "sonner";
import {
  buildHtmlTable,
  exportHtmlTableAsExcel,
} from "../../_lib/export-html-table";
import {
  getSubjectWiseEvalBaseFilters,
  getSubjectWiseEvalRestFilters,
  getSubjectWiseEvalSubjects,
  getSubjectWiseEvaluatorsReport,
} from "@/services";

type AnyRow = Record<string, unknown>;

const toastInfo = (msg: string) => toast.info(msg);

const TOOLBAR = {
  search: true,
  searchPlaceholder: "Search...",
  columnPicker: false,
  exportPdf: false,
  exportExcel: false,
  columnFilters: false,
} as const;

const EXPORT_COLS = [
  { key: "si", header: "SI.No" },
  { key: "subject", header: "Subject" },
  { key: "evaluatorName", header: "Evaluator Name" },
  { key: "email", header: "Evaluator Email" },
] as const;

function formatExamLabel(exam: AnyRow): string {
  const name = txt(exam.exam_name);
  const from = txt(exam.from_date).slice(0, 10);
  const to = txt(exam.to_date).slice(0, 10);
  const bits: string[] = [];
  if (exam.is_internal_exam) bits.push("Internal");
  if (exam.is_regular_exam) bits.push("Regular");
  if (exam.is_supply_exam) bits.push("Supple");
  const range = from && to ? ` (${from} - ${to})` : "";
  const tags = bits.length ? bits.map((b) => `(${b})`).join("") : "";
  return `${name}${range}${tags}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function toExportRows(rows: AnyRow[]): Record<string, unknown>[] {
  return rows.map((row, i) => ({
    si: i + 1,
    subject: txt(row.subject_code),
    evaluatorName: txt(row.evaluator_name),
    email: txt(row.email),
  }));
}

function printSubjectWiseReport(rows: AnyRow[], subtitle: string) {
  if (!rows.length) return;
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Subject Wise Evaluators Report</title>
<style>
@page { size: A4 landscape; margin: 10mm; }
body { font: 11px/1.4 Arial, sans-serif; color: #000; margin: 0; }
.title, .sub { text-align: center; margin: 4px 0; }
.title { font-size: 15px; font-weight: bold; }
table { width: 100%; border-collapse: collapse; margin-top: 10px; }
th, td { border: 1px solid #000; padding: 4px 6px; text-align: left; }
th { background: #f2f2f2; }
</style></head>
<body>
  <p class="title">Subject Wise Evaluators Report</p>
  <p class="sub">${escapeHtml(subtitle)}</p>
  ${buildHtmlTable([...EXPORT_COLS], toExportRows(rows))}
</body></html>`;

  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
  document.body.appendChild(frame);
  const fdoc = frame.contentDocument;
  const win = frame.contentWindow;
  if (!fdoc || !win) {
    frame.remove();
    return;
  }
  fdoc.open();
  fdoc.write(html);
  fdoc.close();
  win.addEventListener("afterprint", () => frame.remove());
  setTimeout(() => {
    win.focus();
    win.print();
  }, 50);
}

export default function SubjectWiseEvaluatorsReportPage() {
  const router = useRouter();
  const [loadingFilters, setLoadingFilters] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [showBack, setShowBack] = useState(false);

  const [baseRows, setBaseRows] = useState<AnyRow[]>([]);
  const [restRows, setRestRows] = useState<AnyRow[]>([]);
  const [subjectRows, setSubjectRows] = useState<AnyRow[]>([]);
  const [rows, setRows] = useState<AnyRow[]>([]);

  const [courseId, setCourseId] = useState("");
  const [academicYearId, setAcademicYearId] = useState("");
  const [examId, setExamId] = useState("");
  const [collegeId, setCollegeId] = useState("");
  const [courseGroupId, setCourseGroupId] = useState("");
  const [courseYearId, setCourseYearId] = useState("");
  const [regulationId, setRegulationId] = useState("");
  const [subjectId, setSubjectId] = useState("");

  const employeeId = Number(
    globalThis?.localStorage?.getItem("employeeId") ?? 0,
  );
  const organizationId = Number(
    globalThis?.localStorage?.getItem("organizationId") ?? 0,
  );

  useEffect(() => {
    try {
      setShowBack(sessionStorage.getItem("examVerificationBack") === "back");
    } catch {
      setShowBack(false);
    }
  }, []);

  const courses = useMemo(
    () => dedupeBy(baseRows, (r) => num(r.fk_course_id)),
    [baseRows],
  );
  const academicYears = useMemo(() => {
    if (!courseId) return [];
    return dedupeBy(
      baseRows.filter((r) => num(r.fk_course_id) === Number(courseId)),
      (r) => num(r.fk_academic_year_id),
    );
  }, [baseRows, courseId]);
  const exams = useMemo(() => {
    if (!courseId || !academicYearId) return [];
    return dedupeBy(
      baseRows.filter(
        (r) =>
          num(r.fk_course_id) === Number(courseId) &&
          num(r.fk_academic_year_id) === Number(academicYearId),
      ),
      (r) => num(r.fk_exam_id),
    );
  }, [baseRows, courseId, academicYearId]);

  const colleges = useMemo(
    () => dedupeBy(restRows, (r) => num(r.fk_college_id)),
    [restRows],
  );
  const courseGroups = useMemo(() => {
    if (!collegeId) return [];
    return dedupeBy(
      restRows.filter((r) => num(r.fk_college_id) === Number(collegeId)),
      (r) => num(r.fk_course_group_id),
    );
  }, [restRows, collegeId]);
  const courseYears = useMemo(() => {
    if (!collegeId || !courseGroupId) return [];
    return dedupeBy(
      restRows.filter(
        (r) =>
          num(r.fk_college_id) === Number(collegeId) &&
          num(r.fk_course_group_id) === Number(courseGroupId),
      ),
      (r) => num(r.fk_course_year_id),
    );
  }, [restRows, collegeId, courseGroupId]);
  const regulations = useMemo(() => {
    if (!courseId || !restRows.length) return [];
    return dedupeBy(
      restRows.filter((r) => num(r.fk_course_id) === Number(courseId)),
      (r) => num(r.fk_regulation_id),
    );
  }, [restRows, courseId]);
  const subjects = useMemo(
    () => dedupeBy(subjectRows, (r) => num(r.fk_subject_id)),
    [subjectRows],
  );

  const selectedCourse = useMemo(
    () => courses.find((c) => num(c.fk_course_id) === Number(courseId)),
    [courses, courseId],
  );
  const selectedYear = useMemo(
    () =>
      academicYears.find(
        (y) => num(y.fk_academic_year_id) === Number(academicYearId),
      ),
    [academicYears, academicYearId],
  );
  const selectedCourseYear = useMemo(
    () =>
      courseYears.find((y) => num(y.fk_course_year_id) === Number(courseYearId)),
    [courseYears, courseYearId],
  );
  const selectedSubject = useMemo(
    () => subjects.find((s) => num(s.fk_subject_id) === Number(subjectId)),
    [subjects, subjectId],
  );

  const reportSubtitle = useMemo(() => {
    const parts = [
      txt(selectedCourse?.course_code),
      txt(selectedYear?.academic_year),
      txt(selectedCourseYear?.course_year_code),
    ].filter(Boolean);
    const sub = txt(selectedSubject?.subject_code);
    if (sub) parts.push(sub);
    return parts.join(" / ");
  }, [selectedCourse, selectedYear, selectedCourseYear, selectedSubject]);

  function clearResults() {
    setRows([]);
  }

  useEffect(() => {
    async function loadBase() {
      setLoadingFilters(true);
      try {
        const list = await getSubjectWiseEvalBaseFilters(employeeId);
        setBaseRows(list);
        const first = dedupeBy(list, (r) => num(r.fk_course_id))[0];
        if (first) setCourseId(String(num(first.fk_course_id)));
      } catch (e) {
        toastError(e, "Failed to load filters");
        setBaseRows([]);
      } finally {
        setLoadingFilters(false);
      }
    }
    void loadBase();
  }, [employeeId]);

  useEffect(() => {
    setAcademicYearId("");
    setExamId("");
    setCollegeId("");
    setCourseGroupId("");
    setCourseYearId("");
    setRegulationId("");
    setSubjectId("");
    setRestRows([]);
    setSubjectRows([]);
    clearResults();
    if (!courseId || !academicYears.length) return;
    setAcademicYearId(String(num(academicYears[0].fk_academic_year_id)));
  }, [courseId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setExamId("");
    setCollegeId("");
    setCourseGroupId("");
    setCourseYearId("");
    setRegulationId("");
    setSubjectId("");
    setRestRows([]);
    setSubjectRows([]);
    clearResults();
    if (!academicYearId || !exams.length) return;
    setExamId(String(num(exams[0].fk_exam_id)));
  }, [academicYearId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    async function loadRest() {
      setCollegeId("");
      setCourseGroupId("");
      setCourseYearId("");
      setRegulationId("");
      setSubjectId("");
      setSubjectRows([]);
      clearResults();
      if (!courseId || !academicYearId || !examId) {
        setRestRows([]);
        return;
      }
      setLoadingFilters(true);
      try {
        const list = await getSubjectWiseEvalRestFilters({
          courseId: Number(courseId),
          academicYearId: Number(academicYearId),
          examId: Number(examId),
          employeeId,
        });
        setRestRows(list);
        const firstCollege = dedupeBy(list, (r) => num(r.fk_college_id))[0];
        if (firstCollege) {
          setCollegeId(String(num(firstCollege.fk_college_id)));
        }
      } catch (e) {
        toastError(e, "Failed to load colleges");
        setRestRows([]);
      } finally {
        setLoadingFilters(false);
      }
    }
    void loadRest();
  }, [courseId, academicYearId, examId, employeeId]);

  useEffect(() => {
    setCourseGroupId("");
    setCourseYearId("");
    setRegulationId("");
    setSubjectId("");
    setSubjectRows([]);
    clearResults();
    if (!collegeId) return;
    if (courseGroups.length) {
      setCourseGroupId(String(num(courseGroups[0].fk_course_group_id)));
    } else {
      setCourseGroupId("0");
    }
  }, [collegeId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setCourseYearId("");
    setRegulationId("");
    setSubjectId("");
    setSubjectRows([]);
    clearResults();
    if (!courseGroupId) return;
    if (courseYears.length) {
      setCourseYearId(String(num(courseYears[0].fk_course_year_id)));
    } else {
      setCourseYearId("0");
    }
  }, [courseGroupId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setRegulationId("");
    setSubjectId("");
    setSubjectRows([]);
    clearResults();
    if (!courseYearId) return;
    if (regulations.length) {
      setRegulationId(String(num(regulations[0].fk_regulation_id)));
    } else {
      setRegulationId("0");
    }
  }, [courseYearId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    async function loadSubjects() {
      setSubjectId("");
      clearResults();
      if (
        !courseId ||
        !academicYearId ||
        !examId ||
        !collegeId ||
        courseGroupId === "" ||
        courseYearId === "" ||
        regulationId === ""
      ) {
        setSubjectRows([]);
        return;
      }
      setLoadingFilters(true);
      try {
        const list = await getSubjectWiseEvalSubjects({
          courseId: Number(courseId),
          academicYearId: Number(academicYearId),
          examId: Number(examId),
          collegeId: Number(collegeId),
          courseGroupId: Number(courseGroupId),
          courseYearId: Number(courseYearId),
          regulationId: Number(regulationId),
          employeeId,
        });
        setSubjectRows(list);
        const first = dedupeBy(list, (r) => num(r.fk_subject_id))[0];
        if (first) setSubjectId(String(num(first.fk_subject_id)));
      } catch (e) {
        toastError(e, "Failed to load subjects");
        setSubjectRows([]);
      } finally {
        setLoadingFilters(false);
      }
    }
    void loadSubjects();
  }, [
    courseId,
    academicYearId,
    examId,
    collegeId,
    courseGroupId,
    courseYearId,
    regulationId,
    employeeId,
  ]);

  async function onGetList() {
    if (
      !courseId ||
      !academicYearId ||
      !examId ||
      !collegeId ||
      courseGroupId === "" ||
      courseYearId === "" ||
      !subjectId
    ) {
      toastInfo("Please Select Valid Filters");
      return;
    }
    setLoadingList(true);
    try {
      const list = await getSubjectWiseEvaluatorsReport({
        organizationId: organizationId || 1,
        examId: Number(examId),
        courseId: Number(courseId),
        courseYearId: Number(courseYearId),
        subjectId: Number(subjectId),
        academicYearId: Number(academicYearId),
        employeeId,
      });
      setRows(list.map((row, i) => ({ ...row, __rid: i })));
      if (!list.length) toastSuccess("No Records Found.");
    } catch (e) {
      toastError(e, "Failed to load report");
      setRows([]);
    } finally {
      setLoadingList(false);
    }
  }

  function onBack() {
    try {
      sessionStorage.removeItem("examVerificationBack");
    } catch {
      /* ignore */
    }
    router.back();
  }

  function handleExportExcel() {
    if (!rows.length) {
      toastInfo("No data to export");
      return;
    }
    exportHtmlTableAsExcel(
      "Subject Wise Evaluators Report",
      buildHtmlTable([...EXPORT_COLS], toExportRows(rows)),
      `<strong>Subject Wise Evaluators Report - ${escapeHtml(reportSubtitle)}</strong>`,
    );
  }

  const columnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      {
        headerName: "SI.No",
        valueGetter: rowIndexGetter,
        width: 70,
        flex: 0,
      },
      {
        headerName: "Subject",
        minWidth: 140,
        valueGetter: (p) => txt(p.data?.subject_code),
      },
      {
        headerName: "Evaluator Name",
        minWidth: 200,
        valueGetter: (p) => txt(p.data?.evaluator_name),
      },
      {
        headerName: "Evaluator Email",
        minWidth: 220,
        valueGetter: (p) => txt(p.data?.email),
      },
    ],
    [],
  );

  const filters = (
    <>
      <GlobalFilterBarRow>
        <GlobalFilterField label="Course *">
          <Select
            value={courseId || undefined}
            onChange={(v) => setCourseId(v ?? "")}
            isLoading={loadingFilters}
            options={courses.map((c) => ({
              value: String(num(c.fk_course_id)),
              label: txt(c.course_code),
            }))}
            placeholder="Course"
            searchable
          />
        </GlobalFilterField>
        <GlobalFilterField label="Exam Year *">
          <Select
            value={academicYearId || undefined}
            onChange={(v) => setAcademicYearId(v ?? "")}
            isLoading={loadingFilters}
            options={academicYears.map((y) => ({
              value: String(num(y.fk_academic_year_id)),
              label: txt(y.academic_year),
            }))}
            placeholder="Exam Year"
            searchable
          />
        </GlobalFilterField>
        <GlobalFilterField label="Exam Master *" className="min-w-[280px] flex-[2]">
          <Select
            value={examId || undefined}
            onChange={(v) => setExamId(v ?? "")}
            isLoading={loadingFilters}
            options={exams.map((e) => ({
              value: String(num(e.fk_exam_id)),
              label: formatExamLabel(e),
            }))}
            placeholder="Exam Master"
            searchable
          />
        </GlobalFilterField>
      </GlobalFilterBarRow>

      <GlobalFilterBarRow>
        <GlobalFilterField label="College *">
          <Select
            value={collegeId || undefined}
            onChange={(v) => setCollegeId(v ?? "")}
            isLoading={loadingFilters}
            options={colleges.map((c) => ({
              value: String(num(c.fk_college_id)),
              label: txt(c.college_code) || txt(c.college_name),
            }))}
            placeholder="College"
            searchable
          />
        </GlobalFilterField>
        <GlobalFilterField label="Course Group *">
          <Select
            value={courseGroupId || undefined}
            onChange={(v) => setCourseGroupId(v ?? "")}
            isLoading={loadingFilters}
            options={[
              { value: "0", label: "All" },
              ...courseGroups.map((g) => ({
                value: String(num(g.fk_course_group_id)),
                label:
                  txt(g.group_name) && txt(g.group_code)
                    ? `${txt(g.group_name)}(${txt(g.group_code)})`
                    : txt(g.group_code) || txt(g.group_name),
              })),
            ]}
            placeholder="Course Group"
            searchable
          />
        </GlobalFilterField>
        <GlobalFilterField label="Course Years *">
          <Select
            value={courseYearId || undefined}
            onChange={(v) => setCourseYearId(v ?? "")}
            isLoading={loadingFilters}
            options={[
              { value: "0", label: "All" },
              ...courseYears.map((y) => ({
                value: String(num(y.fk_course_year_id)),
                label: txt(y.course_year_code),
              })),
            ]}
            placeholder="Course Years"
            searchable
          />
        </GlobalFilterField>
        <GlobalFilterField label="Regulation">
          <Select
            value={regulationId || undefined}
            onChange={(v) => setRegulationId(v ?? "")}
            isLoading={loadingFilters}
            options={[
              { value: "0", label: "All" },
              ...regulations.map((r) => ({
                value: String(num(r.fk_regulation_id)),
                label: txt(r.regulation_code),
              })),
            ]}
            placeholder="Regulation"
            searchable
          />
        </GlobalFilterField>
        <GlobalFilterField label="Subject *" className="min-w-[240px] flex-[2]">
          <Select
            value={subjectId || undefined}
            onChange={(v) => {
              setSubjectId(v ?? "");
              clearResults();
            }}
            isLoading={loadingFilters}
            options={subjects.map((s) => ({
              value: String(num(s.fk_subject_id)),
              label: `${txt(s.subject_name)} (${txt(s.subject_code)})`,
            }))}
            placeholder="Subject"
            searchable
          />
        </GlobalFilterField>
        <GlobalFilterField
          label=""
          className="global-filter-field--shrink global-filter-field--action"
        >
          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={() => void onGetList()}
              disabled={loadingList}
              className="h-[30px] px-3 text-[12px]"
            >
              Get List
            </Button>
            {showBack && (
              <Button
                type="button"
                variant="secondary"
                onClick={onBack}
                className="h-[30px] px-3 text-[12px] bg-amber-400 hover:bg-amber-500 text-black"
              >
                Back
              </Button>
            )}
          </div>
        </GlobalFilterField>
      </GlobalFilterBarRow>
    </>
  );

  return (
    <FilteredListPage
      title={
        rows.length > 0
          ? `Subject Wise Evaluators Report - ${reportSubtitle}`
          : "Subject Wise Evaluators Report"
      }
      filters={filters}
      rowData={rows}
      columnDefs={columnDefs}
      loading={loadingList}
      pagination
      toolbar={TOOLBAR}
      toolbarTrailing={
        rows.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              className="h-[30px] px-3 text-[12px]"
              onClick={handleExportExcel}
            >
              Export Excel
            </Button>
            <Button
              type="button"
              className="h-[30px] px-3 text-[12px]"
              onClick={() => printSubjectWiseReport(rows, reportSubtitle)}
            >
              Print Report
            </Button>
          </div>
        ) : null
      }
      getRowId={(p) => String(p.data?.__rid ?? "")}
    />
  );
}
