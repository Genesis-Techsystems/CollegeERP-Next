"use client";

/**
 * Exam Result Sheets — Angular `exam_results_sheets`.
 * Groups hall tickets by ResultStatus (Passed / Promoted / Detained) in a 4-column grid.
 */

import { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { Loader2, Printer, RefreshCw } from "lucide-react";
import { FilteredListPage } from "@/components/layout";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
import { SearchInput } from "@/common/components/search";
import { Select, type SelectOption } from "@/common/components/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toastError } from "@/lib/toast";
import { toast } from "sonner";
import { GM_CODES } from "@/config/constants/ui";
import {
  getExamFinalAnalysisReport,
  getUnivExamFiltersRegSup,
  getUnivExamRestInRegExamStd,
  getGeneralDetails,
  type AnyRow,
} from "@/services";
import { printHtmlInIframe } from "@/lib/print";
import { escapeHtml } from "@/common/export-html-table";
import { DEFAULT_COLLEGE_LOGO, useCollegeLogo } from "@/hooks/useCollegeLogo";
import {
  resolveAttendancePrintLogo as resolveReportPrintLogo,
  toPrintLogoUrl,
} from "@/app/(pages)/(protected)/reports/admin-attendance-reports/_lib/attendance-report-print";

type Row = AnyRow;

const STATUS_ORDER = ["Passed", "Promoted", "Detained"] as const;

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function txt(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
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

function examMasterLabel(r: Row): string {
  const name = txt(r.exam_name ?? r.examName) || "Exam";
  const from = parseMaybeDate(r.from_date ?? r.fromDate);
  const to = parseMaybeDate(r.to_date ?? r.toDate);
  const range = from && to ? ` (${from} - ${to})` : "";
  return `${name}${range}`;
}

export default function ExamResultsSheetsPage() {
  const [loading, setLoading] = useState(false);
  const [loadingFilters, setLoadingFilters] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [employeeId, setEmployeeId] = useState(0);
  const [baseRows, setBaseRows] = useState<Row[]>([]);
  const [restRows, setRestRows] = useState<Row[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [searchText, setSearchText] = useState("");
  const [isReevaluation, setIsReevaluation] = useState(false);
  const [courseId, setCourseId] = useState("");
  const [academicYearId, setAcademicYearId] = useState("");
  const [examId, setExamId] = useState("");
  const [examTypeId, setExamTypeId] = useState("0");
  const [collegeId, setCollegeId] = useState("");
  const [courseGroupId, setCourseGroupId] = useState("");
  const [courseYearId, setCourseYearId] = useState("");
  const [examFeeTypes, setExamFeeTypes] = useState<Row[]>([]);
  const collegeLogo = useCollegeLogo(collegeId ? Number(collegeId) : null);

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
        (!courseGroupId || num(r.fk_course_group_id) === Number(courseGroupId)),
    );
    return dedupeBy(source, (r) => num(r.fk_course_year_id));
  }, [restRows, collegeId, courseGroupId]);

  const examTypeOptions: SelectOption[] = useMemo(
    () => [
      { value: "0", label: "All" },
      ...examFeeTypes.map((r) => ({
        value: String(num(r.generalDetailId ?? r.general_detail_id)),
        label:
          txt(r.generalDetailCode ?? r.general_detail_code) ||
          String(num(r.generalDetailId)),
      })),
    ],
    [examFeeTypes],
  );

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
        return;
      }
      setLoadingFilters(true);
      try {
        const [bundle, feeTypes] = await Promise.all([
          getUnivExamRestInRegExamStd({
            courseId: Number(courseId),
            examId: Number(examId),
            academicYearId: Number(academicYearId),
            employeeId,
          }),
          getGeneralDetails(GM_CODES.EXAM_FEE_TYPE).catch(() => []),
        ]);
        setRestRows(
          Array.isArray(bundle.restFilters) ? bundle.restFilters : [],
        );
        setExamFeeTypes(feeTypes);
        setExamTypeId(
          feeTypes[0]
            ? String(
                num(
                  feeTypes[0].generalDetailId ?? feeTypes[0].general_detail_id,
                ),
              )
            : "0",
        );
        setCollegeId("");
        setCourseGroupId("");
        setCourseYearId("");
        setRows([]);
        setHasFetched(false);
      } catch (e) {
        toastError(e, "Failed to load filters");
        setRestRows([]);
        setExamFeeTypes([]);
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

  useEffect(() => {
    if (!courseGroups.length) return;
    if (
      !courseGroups.some(
        (r) => num(r.fk_course_group_id) === Number(courseGroupId),
      )
    ) {
      setCourseGroupId(String(num(courseGroups[0].fk_course_group_id)));
      setCourseYearId("");
    }
  }, [courseGroups, courseGroupId]);

  useEffect(() => {
    if (!courseYears.length) return;
    if (
      !courseYears.some(
        (r) => num(r.fk_course_year_id) === Number(courseYearId),
      )
    ) {
      setCourseYearId(String(num(courseYears[0].fk_course_year_id)));
    }
  }, [courseYears, courseYearId]);

  const filterSummary = useMemo(() => {
    const college = colleges.find(
      (r) => num(r.fk_college_id) === Number(collegeId),
    );
    const course = courses.find(
      (r) => num(r.fk_course_id) === Number(courseId),
    );
    const group = courseGroups.find(
      (r) => num(r.fk_course_group_id) === Number(courseGroupId),
    );
    const year = courseYears.find(
      (r) => num(r.fk_course_year_id) === Number(courseYearId),
    );
    return [
      txt(college?.college_code),
      txt(course?.course_code),
      txt(group?.group_code),
      txt(year?.course_year_code ?? year?.course_year_name),
    ]
      .filter(Boolean)
      .join(" / ");
  }, [
    colleges,
    courses,
    courseGroups,
    courseYears,
    collegeId,
    courseId,
    courseGroupId,
    courseYearId,
  ]);

  const statusGroups = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    const filtered = q
      ? rows.filter((r) => txt(r.hallticket_number).toLowerCase().includes(q))
      : rows;
    return STATUS_ORDER.map((status) => ({
      status,
      items: filtered.filter(
        (r) => txt(r.ResultStatus ?? r.result_status) === status,
      ),
    })).filter((g) => g.items.length > 0);
  }, [rows, searchText]);

  async function onGetReport() {
    if (!courseId || !examId || !collegeId || !courseGroupId || !courseYearId) {
      toast.info("Please Select Valid Filters");
      return;
    }
    setLoading(true);
    setHasFetched(true);
    try {
      const list = await getExamFinalAnalysisReport({
        flag: isReevaluation
          ? "final_reeval_results_list"
          : "final_results_list",
        examId: Number(examId),
        examTypeCatDetId: Number(examTypeId || 0),
        collegeId: Number(collegeId),
        courseId: Number(courseId),
        courseGroupId: Number(courseGroupId),
        courseYearId: Number(courseYearId),
      });
      setRows(Array.isArray(list) ? list : []);
      if (!list?.length) toast.info("No Records Found.");
    } catch (e) {
      toastError(e, "Failed to load report");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  async function printReport() {
    if (!statusGroups.length) {
      toast.info("No Records Found.");
      return;
    }
    const college = colleges.find(
      (r) => num(r.fk_college_id) === Number(collegeId),
    );
    const examRow = exams.find((r) => num(r.fk_exam_id) === Number(examId));
    const group = courseGroups.find(
      (r) => num(r.fk_course_group_id) === Number(courseGroupId),
    );
    const cid = Number(collegeId || 0);
    const logoSrc = await resolveReportPrintLogo(
      null,
      cid,
      collegeLogo || DEFAULT_COLLEGE_LOGO,
    );
    const fallbackLogo = toPrintLogoUrl(DEFAULT_COLLEGE_LOGO);
    const collegeName =
      txt(college?.college_name) || txt(college?.college_code) || "College";
    const examLabel = examRow ? examMasterLabel(examRow) : "";
    const courseLine = txt(group?.group_code);
    const dateLine = format(new Date(), "dd/MM/yyyy");

    const groupsHtml = statusGroups
      .map((groupRow) => {
        const cells = groupRow.items
          .map(
            (r) =>
              `<span style="display:inline-block;width:25%;padding:4px 0;box-sizing:border-box">${escapeHtml(txt(r.hallticket_number) || "—")}</span>`,
          )
          .join("");
        return `<p style="font-weight:600;margin:12px 0 4px">${escapeHtml(courseLine)} - ${escapeHtml(groupRow.status)} (${groupRow.items.length})</p>
<hr/>
<div>${cells}</div>
<hr/>`;
      })
      .join("");

    printHtmlInIframe(`<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>Exam Result Sheets</title>
<style>
@page{margin:12mm}
body{font-family:Arial,sans-serif;padding:12px;color:#111;margin:0}
.header{display:flex;align-items:flex-start;gap:16px;margin-bottom:12px}
.header img{width:90px;height:auto;max-height:100px;object-fit:contain}
.collegeName{font-size:24px;font-weight:600;margin:0 0 6px}
.title{font-size:20px;font-weight:550;margin:0 0 6px}
.details{font-size:16px;margin:0}
.meta{display:flex;justify-content:space-between;margin:8px 0 12px}
.footer{display:flex;justify-content:space-between;margin-top:48px;font-weight:600}
</style></head><body>
<div class="header">
  <img src="${escapeHtml(logoSrc)}" alt="College Logo" onerror="this.onerror=null;this.src='${escapeHtml(fallbackLogo)}'" />
  <div>
    <p class="collegeName">${escapeHtml(collegeName)}</p>
    <p class="title">Exam Result Sheets</p>
    ${examLabel ? `<p class="details">${escapeHtml(examLabel)}</p>` : ""}
  </div>
</div>
<div class="meta">
  <p>${courseLine ? `Course : ${escapeHtml(courseLine)}` : ""}</p>
  <p>Date : ${escapeHtml(dateLine)}</p>
</div>
${groupsHtml}
<div class="footer"><p>Controller of Examinations</p><p>Principal</p></div>
</body></html>`);
  }

  const showResults = hasFetched && rows.length > 0;
  const showResultsCard = hasFetched && (loading || rows.length > 0);

  const filters = (
    <>
      <GlobalFilterBarRow>
        <GlobalFilterField label="Course *">
          <Select
            value={courseId || null}
            onChange={(v) => {
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
        </GlobalFilterField>
        <GlobalFilterField label="Exam Year *">
          <Select
            value={academicYearId || null}
            onChange={(v) => {
              setAcademicYearId(v ?? "");
              setExamId("");
            }}
            options={academicYears.map((r) => ({
              value: String(num(r.fk_academic_year_id)),
              label: txt(r.academic_year) || String(num(r.fk_academic_year_id)),
            }))}
            disabled={!courseId}
          />
        </GlobalFilterField>
        <GlobalFilterField label="Exam *" className="min-w-[280px] flex-[2]">
          <Select
            value={examId || null}
            onChange={(v) => setExamId(v ?? "")}
            options={exams.map((r) => ({
              value: String(num(r.fk_exam_id)),
              label: examMasterLabel(r),
            }))}
            searchable
            wrapOptionLabels
            disabled={!academicYearId}
          />
        </GlobalFilterField>
        <GlobalFilterField label="Exam Type *">
          <Select
            value={examTypeId}
            onChange={(v) => setExamTypeId(v ?? "0")}
            options={examTypeOptions}
          />
        </GlobalFilterField>
      </GlobalFilterBarRow>

      <GlobalFilterBarRow>
        <GlobalFilterField label="College *">
          <Select
            value={collegeId || null}
            onChange={(v) => {
              setCollegeId(v ?? "");
              setCourseGroupId("");
              setCourseYearId("");
            }}
            options={colleges.map((r) => ({
              value: String(num(r.fk_college_id)),
              label: txt(r.college_code) || String(num(r.fk_college_id)),
            }))}
            disabled={!examId}
          />
        </GlobalFilterField>
        <GlobalFilterField label="Course Group *">
          <Select
            value={courseGroupId || null}
            onChange={(v) => {
              setCourseGroupId(v ?? "");
              setCourseYearId("");
            }}
            options={courseGroups.map((r) => ({
              value: String(num(r.fk_course_group_id)),
              label: txt(r.group_code) || String(num(r.fk_course_group_id)),
            }))}
            disabled={!collegeId}
          />
        </GlobalFilterField>
        <GlobalFilterField label="Course Year *">
          <Select
            value={courseYearId || null}
            onChange={(v) => setCourseYearId(v ?? "")}
            options={courseYears.map((r) => ({
              value: String(num(r.fk_course_year_id)),
              label:
                txt(r.course_year_code) || String(num(r.fk_course_year_id)),
            }))}
            disabled={!courseGroupId}
          />
        </GlobalFilterField>
        <GlobalFilterField
          label="Is Re-Evaluation"
          className="global-filter-field--shrink"
        >
          <div className="flex h-[30px] items-center gap-2">
            <Checkbox
              id="result-sheets-reeval"
              checked={isReevaluation}
              onCheckedChange={(v) => setIsReevaluation(v === true)}
            />
            <Label
              htmlFor="result-sheets-reeval"
              className="cursor-pointer text-[12px] font-normal"
            >
              Is Re-Evaluation
            </Label>
          </div>
        </GlobalFilterField>
        <GlobalFilterField
          label=""
          className="global-filter-field--shrink global-filter-field--action"
        >
          <div className="flex items-end gap-2">
            <Button
              type="button"
              className="h-[30px] px-3 text-[12px]"
              onClick={() => void onGetReport()}
              disabled={loading}
            >
              Get Report
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-[30px] w-[30px]"
              title="Reset"
              onClick={() => {
                setRows([]);
                setHasFetched(false);
                setSearchText("");
                setIsReevaluation(false);
              }}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </GlobalFilterField>
      </GlobalFilterBarRow>
    </>
  );

  const tableHeader = (
    <div className="table-context-header flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
      <div className="flex items-center gap-2">
        <span className="material-icons table-context-header__icon" aria-hidden>
          ballot
        </span>
        <strong className="table-context-header__title">
          Exam Result Sheets
        </strong>
      </div>
      {filterSummary ? (
        <span className="text-[12px] font-medium text-blue-700">
          {filterSummary}
        </span>
      ) : null}
    </div>
  );

  const body = showResults ? (
    <div className="-mx-4 -mb-4 bg-white px-4 pb-4">
      <div className="app-data-table-toolbar flex flex-row flex-wrap items-center justify-between gap-x-3 gap-y-2 pb-3">
        <Button
          type="button"
          size="sm"
          className="h-[30px] rounded-[5px] px-3 text-[12px]"
          onClick={() => void printReport()}
        >
          <Printer className="mr-1.5 h-3.5 w-3.5" />
          Print Report
        </Button>
        <SearchInput
          value={searchText}
          onChange={setSearchText}
          placeholder="Search"
          className="w-full max-w-[260px]"
        />
      </div>

      <div className="mat-elevation-z8 overflow-hidden">
        {statusGroups.map((group) => (
          <section key={group.status}>
            <div className="bg-[#c3d9ff] px-3 py-2 text-center text-[15px] font-medium text-foreground">
              {group.status} ({group.items.length})
            </div>
            <div className="grid grid-cols-4 bg-white px-1 py-2">
              {group.items.map((r, idx) => (
                <div
                  key={`${group.status}-${txt(r.hallticket_number)}-${idx}`}
                  className="px-2 py-1.5 text-center text-[13px] tabular-nums text-foreground"
                >
                  {txt(r.hallticket_number) || "—"}
                </div>
              ))}
            </div>
          </section>
        ))}
        {statusGroups.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No matching hall tickets
          </p>
        ) : null}
      </div>
    </div>
  ) : loading ? (
    <div className="flex min-h-[120px] items-center justify-center py-8 text-sm text-muted-foreground">
      <span className="inline-flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading…
      </span>
    </div>
  ) : undefined;

  return (
    <FilteredListPage
      title="Exam Result Sheets"
      filters={filters}
      showTable={showResultsCard}
      resultsVisible={showResultsCard}
      tableHeader={showResults ? tableHeader : null}
      body={body}
      bodyClassName="app-data-table app-data-table-card flex flex-col !border !border-border !bg-white !shadow-md"
    />
  );
}
