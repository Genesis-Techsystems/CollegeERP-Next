"use client";

/**
 * Angular `feedback/feedback-summary-report` — Survey Summary Report.
 */

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ColDef } from "ag-grid-community";
import { PrinterIcon } from "lucide-react";
import { FilteredListPage } from "@/components/layout";
import { Select } from "@/common/components/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QK } from "@/lib/query-keys";
import { toastError, toastSuccess } from "@/lib/toast";
import { getErrorMessage } from "@/lib/errors";
import { rowIndexGetter } from "@/lib/utils";
import {
  getFeedbackSummaryFilterBundles,
  getFeedbackSummaryReportRows,
  listGroupSectionsByFilters,
  type FeedbackSummaryReportRow,
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

const COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 80,
    flex: 0,
    sortable: false,
    filter: false,
  } as ColDef<FeedbackSummaryReportRow>,
  subject: {
    field: "subject_name",
    headerName: "Subject",
    minWidth: 160,
  } as ColDef<FeedbackSummaryReportRow>,
  faculty: {
    field: "Faculty_Name",
    headerName: "Faculty Name",
    minWidth: 160,
  } as ColDef<FeedbackSummaryReportRow>,
  participants: {
    field: "Participants",
    headerName: "Participants",
    minWidth: 120,
    cellClass: "text-center",
  } as ColDef<FeedbackSummaryReportRow>,
  rating: {
    field: "Summary_Rating",
    headerName: "Subject Wise Mean(μ)",
    minWidth: 160,
    cellClass: "text-center",
  } as ColDef<FeedbackSummaryReportRow>,
  stdDev: {
    field: "Summary_Standard_Deviation",
    headerName: "Subject Wise Standard Deviation",
    minWidth: 200,
    cellClass: "text-center",
  } as ColDef<FeedbackSummaryReportRow>,
};

export default function FeedbackSummaryPage() {
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

  const [rows, setRows] = useState<FeedbackSummaryReportRow[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  const [collegeCode, setCollegeCode] = useState("");
  const [collegeName, setCollegeName] = useState("");
  const [academicYearLabel, setAcademicYearLabel] = useState("");
  const [courseLabel, setCourseLabel] = useState("");
  const [groupLabel, setGroupLabel] = useState("");
  const [yearLabel, setYearLabel] = useState("");
  const [sectionLabel, setSectionLabel] = useState("");
  const [surveyLabel, setSurveyLabel] = useState("");

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

  // Angular: auto-select first college on load
  useEffect(() => {
    if (collegeId || colleges.length === 0) return;
    setCollegeId(String(n(colleges[0].fk_college_id)));
  }, [colleges, collegeId]);

  const clearResults = () => {
    setRows([]);
    setHasFetched(false);
  };

  // College change → cascade (Angular selectedCollege)
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
    // colleges used only for labels; reset when collegeId changes
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
    const sv = surveyForms.find(
      (x) => n(x.fk_survey_form_id) === n(surveyFormId),
    );
    setSurveyLabel(s(sv?.survey_name));
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

  const columnDefs = useMemo<ColDef<FeedbackSummaryReportRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.subject,
      COL_DEFS.faculty,
      COL_DEFS.participants,
      COL_DEFS.rating,
      COL_DEFS.stdDev,
    ],
    [],
  );

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
      const list = await getFeedbackSummaryReportRows({
        surveyFormId: n(surveyFormId),
        groupSectionId: n(groupSectionId),
        courseYearId: n(courseYearId),
        percentageValue: Number(percentageValue) || 0,
      });
      setRows(list);
      if (list.length === 0) toastSuccess("No records found.");
    } catch (e) {
      setRows([]);
      toastError(getErrorMessage(e) || "Failed to load feedback summary");
    } finally {
      setLoadingList(false);
    }
  }

  function handlePrint() {
    if (rows.length === 0) return;
    const printContents = `
      <div style="width:100%;text-align:center;">
        <p style="font-size:15px;line-height:15px;margin:4px 0;">Viswambhara Educational Society</p>
        <p style="font-size:17px;line-height:15px;margin:4px 0;">${collegeName || collegeCode}</p>
        <p style="font-size:17px;line-height:15px;margin:4px 0;">UGC AUTONOMOUS</p>
        <p style="font-size:14px;line-height:13px;margin:4px 0;">P.O.Bollikunta, Warangal - 506 005 (Telangana State)</p>
        <p style="font-size:13px;line-height:15px;margin:4px 0;">Department of ${groupLabel} / ${academicYearLabel} (${yearLabel} Section - ${sectionLabel})</p>
        <p style="color:blue;font-size:18px;margin-top:15px;font-weight:500;">${surveyLabel}</p>
      </div>
      <table border="1" cellspacing="0" cellpadding="6" style="width:100%;border-collapse:collapse;margin-top:20px;font-size:12px;">
        <thead>
          <tr>
            <th>S.No</th>
            <th>Subject Name</th>
            <th>Faculty Name</th>
            <th>Participants</th>
            <th>Subject Wise Mean(μ)</th>
            <th>Subject Wise Standard Deviation</th>
          </tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (r, i) => `<tr>
              <td style="text-align:center;">${i + 1}</td>
              <td>${s(r.subject_name)}</td>
              <td>${s(r.Faculty_Name)}</td>
              <td style="text-align:center;">${s(r.Participants)}</td>
              <td style="text-align:center;">${s(r.Summary_Rating)}</td>
              <td style="text-align:center;">${s(r.Summary_Standard_Deviation)}</td>
            </tr>`,
            )
            .join("")}
        </tbody>
      </table>
    `;
    const popupWin = window.open("", "_blank", "");
    if (!popupWin) return;
    popupWin.document.open();
    popupWin.document.write(`
      <html>
        <head><title>Feedback Summary</title></head>
        <body onload="window.print();window.close()">${printContents}</body>
      </html>
    `);
    popupWin.document.close();
  }

  const showTable = hasFetched && rows.length > 0;
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
      ? `${subtitleParts}${surveyLabel ? ` - ${surveyLabel}` : ""}`
      : "Survey Summary Report";

  return (
    <FilteredListPage
      title="Feedback Summary"
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
                  setRows([]);
                  setHasFetched(false);
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
      rowData={showTable ? rows : []}
      columnDefs={columnDefs}
      loading={loadingList || filtersQuery.isLoading}
      resultsVisible={showTable}
      hideEmptyGrid
      pagination
      paginationPageSize={25}
      toolbar={{
        search: true,
        searchPlaceholder: "Search",
        exportExcel: true,
        exportPdf: true,
        pdfDocumentTitle: tableTitle,
      }}
      toolbarTrailing={
        showTable ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-[30px] w-8 p-0"
            title="Print Feedback Summary"
            aria-label="Print Feedback Summary"
            onClick={handlePrint}
          >
            <PrinterIcon className="h-3.5 w-3.5" />
          </Button>
        ) : null
      }
      filtersFooter={
        showTable ? (
          <div className="space-y-1 px-1 pt-1">
            <p className="text-sm font-semibold text-foreground">
              {tableTitle}
            </p>
            <p className="text-sm font-medium text-destructive">
              Note: Feedback Summary for attendance percentage of{" "}
              {percentageValue}%.
            </p>
          </div>
        ) : null
      }
    />
  );
}
