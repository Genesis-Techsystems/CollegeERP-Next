"use client";

/**
 * Angular `feedback/feedback-consolidated-report` —
 * Survey Feedback Consolidated Report.
 */

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { PrinterIcon } from "lucide-react";
import { FilteredListPage } from "@/components/layout";
import { Select } from "@/common/components/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QK } from "@/lib/query-keys";
import { toastError, toastSuccess } from "@/lib/toast";
import { getErrorMessage } from "@/lib/errors";
import {
  getFeedbackConsolidatedReportRows,
  getFeedbackSummaryFilterBundles,
  listGroupSectionsByFilters,
  pivotFeedbackConsolidatedRows,
  type FeedbackConsolidatedPivotRow,
  type FeedbackConsolidatedQuestionKey,
} from "@/services";

type AnyRow = Record<string, unknown>;

const n = (v: unknown) => {
  const x = typeof v === "number" ? v : Number(v);
  return Number.isFinite(x) ? x : 0;
};
const s = (v: unknown) => String(v ?? "").trim();

const uniqBy = (rows: AnyRow[], key: string) => {
  const seen = new Set<number>();
  return rows.filter((r) => {
    const id = n(r[key]);
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};

function blueCenter(text: string) {
  return (
    <span className="block text-center text-[hsl(var(--primary))]">{text}</span>
  );
}

export default function FeedbackConsolidatedReportPage() {
  const [organizationId, setOrganizationId] = useState(0);
  const [employeeId, setEmployeeId] = useState(0);

  useEffect(() => {
    setOrganizationId(Number(localStorage.getItem("organizationId") ?? 0));
    setEmployeeId(Number(localStorage.getItem("employeeId") ?? 0));
  }, []);

  const [collegeId, setCollegeId] = useState<string | null>(null);
  const [academicYearId, setAcademicYearId] = useState<string | null>(null);
  const [courseId, setCourseId] = useState<string | null>(null);
  const [courseGroupId, setCourseGroupId] = useState<string | null>(null);
  const [courseYearId, setCourseYearId] = useState<string | null>(null);
  const [groupSectionId, setGroupSectionId] = useState<string | null>(null);
  const [surveyFormId, setSurveyFormId] = useState<string | null>(null);
  const [percentageValue, setPercentageValue] = useState("0");

  const [pivotRows, setPivotRows] = useState<FeedbackConsolidatedPivotRow[]>(
    [],
  );
  const [questionKeys, setQuestionKeys] = useState<
    FeedbackConsolidatedQuestionKey[]
  >([]);
  const [loadingList, setLoadingList] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  const [collegeCode, setCollegeCode] = useState("");
  const [collegeName, setCollegeName] = useState("");
  const [academicYearLabel, setAcademicYearLabel] = useState("");
  const [courseLabel, setCourseLabel] = useState("");
  const [groupLabel, setGroupLabel] = useState("");
  const [yearLabel, setYearLabel] = useState("");
  const [sectionLabel, setSectionLabel] = useState("");
  /** Angular selectedSurveyForm hard-codes print title. */
  const surveyPrintTitle = "Online Feedback Report";

  const filtersQuery = useQuery({
    queryKey: QK.feedbackSummary.filters(organizationId, employeeId),
    queryFn: () =>
      getFeedbackSummaryFilterBundles({ organizationId, employeeId }),
    enabled: organizationId > 0,
  });

  const filtersData = filtersQuery.data?.filtersData ?? [];
  const academicYearData = filtersQuery.data?.academicYearData ?? [];
  const surveyData = filtersQuery.data?.surveyData ?? [];

  const colleges = useMemo(
    () =>
      uniqBy(filtersData, "fk_college_id").sort(
        (a, b) => n(a.clg_sort_order) - n(b.clg_sort_order),
      ),
    [filtersData],
  );

  const academicYears = useMemo(() => {
    const univId = n(
      filtersData.find((x) => n(x.fk_college_id) === n(collegeId))
        ?.fk_university_id,
    );
    return uniqBy(
      academicYearData.filter((r) => n(r.fk_university_id) === univId),
      "fk_academic_year_id",
    );
  }, [academicYearData, filtersData, collegeId]);

  const courses = useMemo(
    () =>
      uniqBy(
        filtersData.filter((r) => n(r.fk_college_id) === n(collegeId)),
        "fk_course_id",
      ),
    [filtersData, collegeId],
  );

  const courseGroups = useMemo(
    () =>
      uniqBy(
        filtersData.filter(
          (r) =>
            n(r.fk_college_id) === n(collegeId) &&
            n(r.fk_course_id) === n(courseId),
        ),
        "fk_course_group_id",
      ),
    [filtersData, collegeId, courseId],
  );

  const courseYears = useMemo(
    () =>
      uniqBy(
        filtersData.filter(
          (r) =>
            n(r.fk_college_id) === n(collegeId) &&
            n(r.fk_course_id) === n(courseId) &&
            n(r.fk_course_group_id) === n(courseGroupId),
        ),
        "fk_course_year_id",
      ).sort((a, b) => n(a.year_order) - n(b.year_order)),
    [filtersData, collegeId, courseId, courseGroupId],
  );

  const surveyForms = useMemo(() => {
    const list = surveyData.filter((r) => n(r.fk_college_id) === n(collegeId));
    return uniqBy(list, "fk_survey_form_id");
  }, [surveyData, collegeId]);

  const sectionsQuery = useQuery({
    queryKey: QK.feedbackSummary.sections(
      n(collegeId),
      n(academicYearId),
      n(courseGroupId),
      n(courseYearId),
    ),
    queryFn: () =>
      listGroupSectionsByFilters({
        collegeId: n(collegeId),
        academicYearId: n(academicYearId),
        courseGroupId: n(courseGroupId),
        courseYearId: n(courseYearId),
      }),
    enabled:
      n(collegeId) > 0 &&
      n(academicYearId) > 0 &&
      n(courseGroupId) > 0 &&
      n(courseYearId) > 0,
  });

  const sections = sectionsQuery.data ?? [];

  useEffect(() => {
    if (collegeId || colleges.length === 0) return;
    setCollegeId(String(n(colleges[0].fk_college_id)));
  }, [colleges, collegeId]);

  const clearResults = () => {
    setPivotRows([]);
    setQuestionKeys([]);
    setHasFetched(false);
  };

  useEffect(() => {
    if (!collegeId) return;
    const c = colleges.find((x) => n(x.fk_college_id) === n(collegeId));
    setCollegeCode(s(c?.college_code));
    setCollegeName(s(c?.college_name ?? c?.college_code));
    setAcademicYearId(null);
    setCourseId(null);
    setCourseGroupId(null);
    setCourseYearId(null);
    setGroupSectionId(null);
    setSurveyFormId(null);
    setPercentageValue("0");
    clearResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collegeId]);

  useEffect(() => {
    if (!collegeId) return;
    const c = colleges.find((x) => n(x.fk_college_id) === n(collegeId));
    if (c) {
      setCollegeCode(s(c.college_code));
      setCollegeName(s(c.college_name ?? c.college_code));
    }
  }, [collegeId, colleges]);

  useEffect(() => {
    if (!collegeId || academicYearId || academicYears.length === 0) return;
    setAcademicYearId(String(n(academicYears[0].fk_academic_year_id)));
  }, [collegeId, academicYears, academicYearId]);

  useEffect(() => {
    if (!academicYearId) return;
    const ay = academicYears.find(
      (x) => n(x.fk_academic_year_id) === n(academicYearId),
    );
    setAcademicYearLabel(s(ay?.academic_year));
    setCourseId(null);
    setCourseGroupId(null);
    setCourseYearId(null);
    setGroupSectionId(null);
    setSurveyFormId(null);
    setPercentageValue("0");
    clearResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [academicYearId]);

  useEffect(() => {
    if (!academicYearId || courseId || courses.length === 0) return;
    setCourseId(String(n(courses[0].fk_course_id)));
  }, [academicYearId, courses, courseId]);

  useEffect(() => {
    if (!courseId) return;
    const c = courses.find((x) => n(x.fk_course_id) === n(courseId));
    setCourseLabel(s(c?.course_code));
    setCourseGroupId(null);
    setCourseYearId(null);
    setGroupSectionId(null);
    setSurveyFormId(null);
    setPercentageValue("0");
    clearResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  useEffect(() => {
    if (!courseId || courseGroupId || courseGroups.length === 0) return;
    setCourseGroupId(String(n(courseGroups[0].fk_course_group_id)));
  }, [courseId, courseGroups, courseGroupId]);

  useEffect(() => {
    if (!courseGroupId) return;
    const g = courseGroups.find(
      (x) => n(x.fk_course_group_id) === n(courseGroupId),
    );
    setGroupLabel(s(g?.group_code));
    setCourseYearId(null);
    setGroupSectionId(null);
    setSurveyFormId(null);
    setPercentageValue("0");
    clearResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseGroupId]);

  useEffect(() => {
    if (!courseGroupId || courseYearId || courseYears.length === 0) return;
    setCourseYearId(String(n(courseYears[0].fk_course_year_id)));
  }, [courseGroupId, courseYears, courseYearId]);

  useEffect(() => {
    if (!courseYearId) return;
    const y = courseYears.find(
      (x) => n(x.fk_course_year_id) === n(courseYearId),
    );
    setYearLabel(s(y?.course_year_name));
    setGroupSectionId(null);
    setSurveyFormId(null);
    setPercentageValue("0");
    clearResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseYearId]);

  useEffect(() => {
    if (!groupSectionId) return;
    const sec = sections.find(
      (x) => n(x.groupSectionId ?? x.pk_group_section_id) === n(groupSectionId),
    );
    setSectionLabel(s(sec?.section ?? sec?.groupSectionName));
    setSurveyFormId(null);
    setPercentageValue("0");
    clearResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupSectionId]);

  useEffect(() => {
    if (!surveyFormId) return;
    setPercentageValue("0");
    clearResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surveyFormId]);

  const collegeOptions = useMemo(
    () =>
      colleges.map((c) => ({
        value: String(n(c.fk_college_id)),
        label: s(c.college_code) || String(n(c.fk_college_id)),
      })),
    [colleges],
  );
  const ayOptions = useMemo(
    () =>
      academicYears.map((a) => ({
        value: String(n(a.fk_academic_year_id)),
        label: s(a.academic_year) || String(n(a.fk_academic_year_id)),
      })),
    [academicYears],
  );
  const courseOptions = useMemo(
    () =>
      courses.map((c) => ({
        value: String(n(c.fk_course_id)),
        label: s(c.course_code) || String(n(c.fk_course_id)),
      })),
    [courses],
  );
  const groupOptions = useMemo(
    () =>
      courseGroups.map((g) => ({
        value: String(n(g.fk_course_group_id)),
        label: s(g.group_code) || String(n(g.fk_course_group_id)),
      })),
    [courseGroups],
  );
  const yearOptions = useMemo(
    () =>
      courseYears.map((y) => ({
        value: String(n(y.fk_course_year_id)),
        label: s(y.course_year_name) || String(n(y.fk_course_year_id)),
      })),
    [courseYears],
  );
  const sectionOptions = useMemo(
    () =>
      sections.map((sec) => ({
        value: String(n(sec.groupSectionId ?? sec.pk_group_section_id)),
        label:
          s(sec.section ?? sec.groupSectionName) ||
          String(n(sec.groupSectionId)),
      })),
    [sections],
  );
  const surveyOptions = useMemo(
    () =>
      surveyForms.map((sv) => ({
        value: String(n(sv.fk_survey_form_id)),
        label: s(sv.survey_name) || String(n(sv.fk_survey_form_id)),
      })),
    [surveyForms],
  );

  const columnDefs = useMemo<ColDef<FeedbackConsolidatedPivotRow>[]>(() => {
    const questionCols: ColDef<FeedbackConsolidatedPivotRow>[] =
      questionKeys.map((key, index) => ({
        colId: `q_${index}`,
        headerName: `${key.question_sort_order}. ${key.FB_Question}`,
        minWidth: 140,
        valueGetter: (p) => p.data?.questionSurvey?.[index] ?? "",
        cellClass: "text-center",
      }));

    return [
      {
        field: "subject_name",
        headerName: "Subject",
        minWidth: 140,
        cellRenderer: (p: ICellRendererParams<FeedbackConsolidatedPivotRow>) =>
          blueCenter(s(p.data?.subject_name)),
      },
      {
        field: "Faculty_Name",
        headerName: "Faculty",
        minWidth: 140,
        cellRenderer: (p: ICellRendererParams<FeedbackConsolidatedPivotRow>) =>
          blueCenter(s(p.data?.Faculty_Name)),
      },
      ...questionCols,
      {
        field: "mean",
        headerName: "Subject Wise Mean(μ)",
        minWidth: 160,
        cellRenderer: (p: ICellRendererParams<FeedbackConsolidatedPivotRow>) =>
          blueCenter(s(p.data?.mean)),
      },
      {
        field: "Standard_Deviation",
        headerName: "Subject Wise Standard Deviation",
        minWidth: 200,
        cellRenderer: (p: ICellRendererParams<FeedbackConsolidatedPivotRow>) =>
          blueCenter(s(p.data?.Standard_Deviation)),
      },
    ];
  }, [questionKeys]);

  const canGetList =
    Boolean(collegeId) &&
    Boolean(academicYearId) &&
    Boolean(courseId) &&
    Boolean(courseGroupId) &&
    Boolean(courseYearId) &&
    Boolean(groupSectionId) &&
    Boolean(surveyFormId) &&
    percentageValue !== "";

  async function handleGetList() {
    if (!canGetList) {
      toastError("Please fill all required filters.");
      return;
    }
    setLoadingList(true);
    setHasFetched(true);
    try {
      const list = await getFeedbackConsolidatedReportRows({
        surveyFormId: n(surveyFormId),
        groupSectionId: n(groupSectionId),
        courseYearId: n(courseYearId),
        percentageValue: Number(percentageValue) || 0,
      });
      const pivoted = pivotFeedbackConsolidatedRows(list);
      setQuestionKeys(pivoted.keys);
      setPivotRows(pivoted.survey);
      if (list.length === 0) toastSuccess("No records found.");
    } catch (e) {
      setQuestionKeys([]);
      setPivotRows([]);
      toastError(getErrorMessage(e) || "Failed to load consolidated report");
    } finally {
      setLoadingList(false);
    }
  }

  function handlePrint() {
    if (pivotRows.length === 0) return;
    const questionHeaders = questionKeys
      .map(
        (k) =>
          `<th class="table-th">${s(k.question_sort_order)}. ${s(k.FB_Question)}</th>`,
      )
      .join("");
    const bodyRows = pivotRows
      .map((row) => {
        const qCells = row.questionSurvey
          .map((v) => `<td style="text-align:center;">${s(v)}</td>`)
          .join("");
        return `<tr>
          <td style="text-align:center;color:blue;">${s(row.subject_name)}</td>
          <td style="text-align:center;color:blue;">${s(row.Faculty_Name)}</td>
          ${qCells}
          <td style="text-align:center;">${s(row.mean)}</td>
          <td style="text-align:center;">${s(row.Standard_Deviation)}</td>
        </tr>`;
      })
      .join("");

    const printContents = `
      <div style="width:100%;text-align:center;">
        <p style="font-size:15px;line-height:15px;margin:4px 0;">Viswambhara Educational Society</p>
        <p style="font-size:17px;line-height:15px;margin:4px 0;">${collegeName || collegeCode}</p>
        <p style="font-size:17px;line-height:15px;margin:4px 0;">UGC AUTONOMOUS</p>
        <p style="font-size:14px;line-height:13px;margin:4px 0;">P.O.Bollikunta, Warangal - 506 005 (Telangana State)</p>
        <p style="font-size:13px;line-height:15px;margin:4px 0;">Department of ${groupLabel} / ${academicYearLabel} (${yearLabel} Section - ${sectionLabel})</p>
        <p style="color:blue;font-size:18px;margin-top:15px;font-weight:500;">${surveyPrintTitle}</p>
      </div>
      <table border="1" cellspacing="0" cellpadding="6" style="width:100%;border-collapse:collapse;margin-top:20px;font-size:11px;">
        <thead>
          <tr>
            <th>Subject</th>
            <th>Faculty</th>
            ${questionHeaders}
            <th>Subject Wise Mean(μ)</th>
            <th>Subject Wise Standard Deviation</th>
          </tr>
        </thead>
        <tbody>${bodyRows}</tbody>
      </table>
    `;
    const popupWin = window.open("", "_blank", "");
    if (!popupWin) return;
    popupWin.document.open();
    popupWin.document.write(`
      <html>
        <head><title>Feedback Consolidated Report</title></head>
        <body onload="window.print();window.close()">${printContents}</body>
      </html>
    `);
    popupWin.document.close();
  }

  const showTable = hasFetched && pivotRows.length > 0;
  const subtitleParts = [
    collegeCode,
    academicYearLabel,
    courseLabel,
    groupLabel,
    yearLabel,
    sectionLabel,
  ]
    .filter(Boolean)
    .join(" / ");
  const tableTitle =
    showTable && subtitleParts
      ? `${subtitleParts} - ${surveyPrintTitle}`
      : "Survey Feedback Consolidated Report";

  return (
    <FilteredListPage
      title="Survey Feedback Consolidated Report"
      filters={
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <Select
              label="College"
              required
              value={collegeId}
              onChange={setCollegeId}
              options={collegeOptions}
              placeholder="College"
              isLoading={filtersQuery.isLoading}
            />
            <Select
              label="Academic Year"
              required
              value={academicYearId}
              onChange={setAcademicYearId}
              options={ayOptions}
              placeholder="Academic Year"
              disabled={!collegeId}
            />
            <Select
              label="Course"
              required
              value={courseId}
              onChange={setCourseId}
              options={courseOptions}
              placeholder="Course"
              disabled={!academicYearId}
            />
            <Select
              label="Course Group"
              required
              value={courseGroupId}
              onChange={setCourseGroupId}
              options={groupOptions}
              placeholder="Course Group"
              disabled={!courseId}
            />
            <Select
              label="Course Year"
              required
              value={courseYearId}
              onChange={setCourseYearId}
              options={yearOptions}
              placeholder="Course Year"
              disabled={!courseGroupId}
            />
            <Select
              label="Section"
              required
              value={groupSectionId}
              onChange={setGroupSectionId}
              options={sectionOptions}
              placeholder="Section"
              isLoading={sectionsQuery.isLoading}
              disabled={!courseYearId}
            />
          </div>
          <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <Select
                label="Survey"
                required
                value={surveyFormId}
                onChange={setSurveyFormId}
                options={surveyOptions}
                placeholder="Survey"
                disabled={!groupSectionId}
              />
            </div>
            <div className="space-y-1.5 lg:col-span-3">
              <Label className="text-xs font-medium">
                Attedance Percentage <span className="text-destructive">*</span>
              </Label>
              <Input
                type="number"
                step="any"
                value={percentageValue}
                onChange={(e) => {
                  setPercentageValue(e.target.value);
                  clearResults();
                }}
                className="h-9"
              />
            </div>
            <div className="lg:col-span-2">
              <Button
                type="button"
                className="h-9 w-full"
                disabled={loadingList}
                onClick={() => void handleGetList()}
              >
                Get List
              </Button>
            </div>
          </div>
        </div>
      }
      rowData={showTable ? pivotRows : []}
      columnDefs={columnDefs}
      loading={loadingList || filtersQuery.isLoading}
      resultsVisible={showTable}
      hideEmptyGrid
      pagination={false}
      toolbar={{
        search: false,
        exportExcel: false,
        exportPdf: false,
      }}
      toolbarTrailing={
        showTable ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-[30px] w-8 p-0"
            title="Print Report"
            aria-label="Print Report"
            onClick={handlePrint}
          >
            <PrinterIcon className="h-3.5 w-3.5" />
          </Button>
        ) : null
      }
      filtersFooter={
        showTable ? (
          <p className="px-1 pt-1 text-sm font-semibold text-foreground">
            {tableTitle}
          </p>
        ) : null
      }
    />
  );
}
