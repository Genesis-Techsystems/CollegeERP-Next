"use client";

/**
 * Subject Wise Syllabus Report —
 * Angular `reports/student-admission-reports/subject-wise-syllabus-report` parity.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import type { ColDef } from "ag-grid-community";
import { Printer } from "lucide-react";
import { Select } from "@/common/components/select";
import {
  buildHtmlTable,
  escapeHtml,
  exportHtmlTableAsExcel,
} from "@/common/export-html-table";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { printHtmlInIframe } from "@/lib/print";
import { getErrorMessage } from "@/lib/errors";
import { resolveReportCatalogHref } from "@/lib/report-catalog";
import { rowIndexGetter } from "@/lib/utils";
import { toastError, toastInfo } from "@/lib/toast";
import { DEFAULT_COLLEGE_LOGO, useCollegeLogo } from "@/hooks/useCollegeLogo";
import {
  fetchTimetableFilterRows,
  getCollegeById,
  getCourseSubjectFilters,
  getSubjectWiseSyllabusReport,
} from "@/services";
import type { FilterRow } from "@/app/(pages)/(protected)/accounts-and-fees/fee-masters/_lib/fee-master-filters";
import {
  attendancePrintShell,
  resolveAttendancePrintLogo,
  toPrintLogoUrl,
} from "../../admin-attendance-reports/_lib/attendance-report-print";

const PRINT_REPORT_TITLE = "Subject Wise Syllabus Report";

type AnyRow = Record<string, unknown>;

type SubjectSyllabusRow = {
  Subject_Name: string;
  Unit_Name: string;
  Unit_Description: string;
  Topic_Name: string;
  Topic_Description: string;
  No_Of_Periods: string;
};

const EXCEL_COLUMNS: { key: string; header: string }[] = [
  { key: "siNo", header: "SI.No" },
  { key: "Subject_Name", header: "Subject Name" },
  { key: "Unit_Name", header: "Unit Name" },
  { key: "Unit_Description", header: "Unit_Description" },
  { key: "Topic_Name", header: "Topic Name" },
  { key: "Topic_Description", header: "Topic Description" },
  { key: "No_Of_Periods", header: "No Of Periods" },
];

const COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<SubjectSyllabusRow>,
  subjectName: {
    field: "Subject_Name",
    headerName: "Subject Name",
    minWidth: 160,
  } as ColDef<SubjectSyllabusRow>,
  unitName: {
    field: "Unit_Name",
    headerName: "Unit Name",
    minWidth: 140,
  } as ColDef<SubjectSyllabusRow>,
  unitDescription: {
    field: "Unit_Description",
    headerName: "Unit_Description",
    minWidth: 160,
  } as ColDef<SubjectSyllabusRow>,
  topicName: {
    field: "Topic_Name",
    headerName: "Topic Name",
    minWidth: 160,
  } as ColDef<SubjectSyllabusRow>,
  topicDescription: {
    field: "Topic_Description",
    headerName: "Topic Description",
    minWidth: 180,
  } as ColDef<SubjectSyllabusRow>,
  noOfPeriods: {
    field: "No_Of_Periods",
    headerName: "No Of Periods",
    minWidth: 120,
  } as ColDef<SubjectSyllabusRow>,
};

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function txt(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
}

function dedupeBy(rows: AnyRow[], keyFn: (r: AnyRow) => number): AnyRow[] {
  const seen = new Set<number>();
  const out: AnyRow[] = [];
  for (const r of rows) {
    const k = keyFn(r);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(r);
  }
  return out;
}

export default function SubjectWiseSyllabusReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [collegeId, setCollegeId] = useState("");
  const [academicYearId, setAcademicYearId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [courseGroupId, setCourseGroupId] = useState("");
  const [courseYearId, setCourseYearId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [subjectId, setSubjectId] = useState("0");

  const [rows, setRows] = useState<AnyRow[]>([]);
  const [dataDetails, setDataDetails] = useState("");
  const [collegeName, setCollegeName] = useState("");
  const [loadingList, setLoadingList] = useState(false);
  const [showTable, setShowTable] = useState(false);

  const collegeLogo = useCollegeLogo(collegeId ? Number(collegeId) : null);

  const clearResults = useCallback(() => {
    setRows([]);
    setShowTable(false);
    setDataDetails("");
  }, []);

  const filtersQuery = useQuery({
    queryKey: ["StudentAdmissionReports", "clsTimetableFilters"],
    queryFn: () => fetchTimetableFilterRows("cls_timtable_filters", 0),
  });

  const filterRows = useMemo(
    () => (Array.isArray(filtersQuery.data) ? filtersQuery.data : []),
    [filtersQuery.data],
  );

  const colleges = useMemo(
    () =>
      dedupeBy(filterRows, (r) => num(r.fk_college_id ?? r.collegeId)).sort(
        (a, b) =>
          num(a.clg_sort_order ?? a.clgSortOrder) -
          num(b.clg_sort_order ?? b.clgSortOrder),
      ),
    [filterRows],
  );

  const academicYears = useMemo(
    () =>
      dedupeBy(
        filterRows.filter(
          (r) => !collegeId || num(r.fk_college_id ?? r.collegeId) === Number(collegeId),
        ),
        (r) => num(r.fk_academic_year_id ?? r.academicYearId),
      ).sort(
        (a, b) =>
          num(b.is_curr_ay ?? b.isCurrAy) - num(a.is_curr_ay ?? a.isCurrAy) ||
          String(b.academic_year ?? "").localeCompare(String(a.academic_year ?? "")),
      ),
    [filterRows, collegeId],
  );

  const courses = useMemo(
    () =>
      dedupeBy(
        filterRows.filter(
          (r) =>
            (!collegeId || num(r.fk_college_id ?? r.collegeId) === Number(collegeId)) &&
            (!academicYearId ||
              num(r.fk_academic_year_id ?? r.academicYearId) === Number(academicYearId)),
        ),
        (r) => num(r.fk_course_id ?? r.courseId),
      ),
    [filterRows, collegeId, academicYearId],
  );

  const courseGroups = useMemo(
    () =>
      dedupeBy(
        filterRows.filter(
          (r) =>
            (!collegeId || num(r.fk_college_id ?? r.collegeId) === Number(collegeId)) &&
            (!academicYearId ||
              num(r.fk_academic_year_id ?? r.academicYearId) === Number(academicYearId)) &&
            (!courseId || num(r.fk_course_id ?? r.courseId) === Number(courseId)),
        ),
        (r) => num(r.fk_course_group_id ?? r.courseGroupId),
      ),
    [filterRows, collegeId, academicYearId, courseId],
  );

  const courseYears = useMemo(
    () =>
      dedupeBy(
        filterRows.filter(
          (r) =>
            (!collegeId || num(r.fk_college_id ?? r.collegeId) === Number(collegeId)) &&
            (!academicYearId ||
              num(r.fk_academic_year_id ?? r.academicYearId) === Number(academicYearId)) &&
            (!courseId || num(r.fk_course_id ?? r.courseId) === Number(courseId)) &&
            (!courseGroupId ||
              num(r.fk_course_group_id ?? r.courseGroupId) === Number(courseGroupId)),
        ),
        (r) => num(r.fk_course_year_id ?? r.courseYearId),
      ).sort(
        (a, b) =>
          num(a.year_order ?? a.yearOrder) - num(b.year_order ?? b.yearOrder),
      ),
    [filterRows, collegeId, academicYearId, courseId, courseGroupId],
  );

  const sections = useMemo(
    () =>
      dedupeBy(
        filterRows.filter(
          (r) =>
            (!collegeId || num(r.fk_college_id ?? r.collegeId) === Number(collegeId)) &&
            (!academicYearId ||
              num(r.fk_academic_year_id ?? r.academicYearId) === Number(academicYearId)) &&
            (!courseId || num(r.fk_course_id ?? r.courseId) === Number(courseId)) &&
            (!courseGroupId ||
              num(r.fk_course_group_id ?? r.courseGroupId) === Number(courseGroupId)) &&
            (!courseYearId ||
              num(r.fk_course_year_id ?? r.courseYearId) === Number(courseYearId)),
        ),
        (r) => num(r.fk_group_section_id ?? r.groupSectionId ?? r.sectionId),
      ).sort(
        (a, b) =>
          num(a.fk_group_section_id ?? a.groupSectionId) -
          num(b.fk_group_section_id ?? b.groupSectionId),
      ),
    [filterRows, collegeId, academicYearId, courseId, courseGroupId, courseYearId],
  );

  useEffect(() => {
    if (!colleges.length) return;
    if (!colleges.some((r) => num(r.fk_college_id ?? r.collegeId) === Number(collegeId))) {
      setCollegeId(String(num(colleges[0].fk_college_id ?? colleges[0].collegeId)));
    }
  }, [colleges, collegeId]);

  useEffect(() => {
    if (!academicYears.length) {
      setAcademicYearId("");
      return;
    }
    if (
      !academicYears.some(
        (r) => num(r.fk_academic_year_id ?? r.academicYearId) === Number(academicYearId),
      )
    ) {
      setAcademicYearId(
        String(
          num(academicYears[0].fk_academic_year_id ?? academicYears[0].academicYearId),
        ),
      );
    }
  }, [academicYears, academicYearId]);

  useEffect(() => {
    if (!courses.length) {
      setCourseId("");
      return;
    }
    if (!courses.some((r) => num(r.fk_course_id ?? r.courseId) === Number(courseId))) {
      setCourseId(String(num(courses[0].fk_course_id ?? courses[0].courseId)));
    }
  }, [courses, courseId]);

  useEffect(() => {
    if (!courseGroups.length) {
      setCourseGroupId("");
      return;
    }
    if (
      !courseGroups.some(
        (r) => num(r.fk_course_group_id ?? r.courseGroupId) === Number(courseGroupId),
      )
    ) {
      setCourseGroupId(
        String(num(courseGroups[0].fk_course_group_id ?? courseGroups[0].courseGroupId)),
      );
    }
  }, [courseGroups, courseGroupId]);

  useEffect(() => {
    if (!courseYears.length) {
      setCourseYearId("");
      return;
    }
    if (
      !courseYears.some(
        (r) => num(r.fk_course_year_id ?? r.courseYearId) === Number(courseYearId),
      )
    ) {
      setCourseYearId(
        String(num(courseYears[0].fk_course_year_id ?? courseYears[0].courseYearId)),
      );
    }
  }, [courseYears, courseYearId]);

  useEffect(() => {
    if (!sections.length) {
      setSectionId("");
      return;
    }
    if (
      !sections.some(
        (r) =>
          num(r.fk_group_section_id ?? r.groupSectionId ?? r.sectionId) ===
          Number(sectionId),
      )
    ) {
      setSectionId(
        String(
          num(
            sections[0].fk_group_section_id ??
              sections[0].groupSectionId ??
              sections[0].sectionId,
          ),
        ),
      );
    }
  }, [sections, sectionId]);

  const subjectsQuery = useQuery({
    queryKey: [
      "StudentAdmissionReports",
      "courseSubjectFilters",
      collegeId,
      courseId,
      courseGroupId,
      courseYearId,
      sectionId,
      academicYearId,
    ],
    queryFn: () =>
      getCourseSubjectFilters({
        collegeId: Number(collegeId),
        courseId: Number(courseId),
        courseGroupId: Number(courseGroupId),
        courseYearId: Number(courseYearId),
        groupSectionId: Number(sectionId),
        academicYearId: Number(academicYearId),
      }),
    enabled:
      !!collegeId &&
      !!courseId &&
      !!courseGroupId &&
      !!courseYearId &&
      !!sectionId &&
      !!academicYearId,
  });

  const subjects = useMemo(
    () =>
      dedupeBy(
        Array.isArray(subjectsQuery.data) ? subjectsQuery.data : [],
        (r) => num(r.fk_subject_id ?? r.subjectId),
      ),
    [subjectsQuery.data],
  );

  useEffect(() => {
    setSubjectId("0");
    clearResults();
  }, [sectionId, clearResults]);

  const collegeOptions = useMemo(
    () =>
      colleges.map((r) => ({
        value: String(num(r.fk_college_id ?? r.collegeId)),
        label: txt(r.college_code ?? r.collegeCode) || "—",
      })),
    [colleges],
  );

  const selectedCollegeRow = useMemo(
    () =>
      colleges.find(
        (r) => num(r.fk_college_id ?? r.collegeId) === Number(collegeId),
      ) ?? null,
    [colleges, collegeId],
  );

  // Angular print header uses full college name (not college code).
  useEffect(() => {
    const cid = Number(collegeId || 0);
    if (!cid) {
      setCollegeName("");
      return;
    }
    const fromFilter = txt(
      selectedCollegeRow?.college_name ?? selectedCollegeRow?.collegeName,
    );
    if (fromFilter) {
      setCollegeName(fromFilter);
      return;
    }
    let cancelled = false;
    void getCollegeById(cid)
      .then((college) => {
        if (cancelled) return;
        setCollegeName(college?.collegeName?.trim() || "");
      })
      .catch(() => {
        if (!cancelled) setCollegeName("");
      });
    return () => {
      cancelled = true;
    };
  }, [collegeId, selectedCollegeRow]);
  const ayOptions = useMemo(
    () =>
      academicYears.map((r) => ({
        value: String(num(r.fk_academic_year_id ?? r.academicYearId)),
        label: txt(r.academic_year ?? r.academicYear) || "—",
      })),
    [academicYears],
  );
  const courseOptions = useMemo(
    () =>
      courses.map((r) => ({
        value: String(num(r.fk_course_id ?? r.courseId)),
        label: txt(r.course_code ?? r.courseCode) || "—",
      })),
    [courses],
  );
  const groupOptions = useMemo(
    () =>
      courseGroups.map((r) => ({
        value: String(num(r.fk_course_group_id ?? r.courseGroupId)),
        label: txt(r.group_code ?? r.groupCode) || "—",
      })),
    [courseGroups],
  );
  const yearOptions = useMemo(
    () =>
      courseYears.map((r) => ({
        value: String(num(r.fk_course_year_id ?? r.courseYearId)),
        label: txt(r.course_year_name ?? r.courseYearName) || "—",
      })),
    [courseYears],
  );
  const sectionOptions = useMemo(
    () =>
      sections.map((r) => ({
        value: String(
          num(r.fk_group_section_id ?? r.groupSectionId ?? r.sectionId),
        ),
        label:
          txt(r.section ?? r.section_name ?? r.group_section_name) ||
          String(num(r.fk_group_section_id ?? r.groupSectionId ?? r.sectionId)),
      })),
    [sections],
  );
  const subjectOptions = useMemo(
    () => [
      { value: "0", label: "All" },
      ...subjects.map((r) => {
        const name = txt(r.subject_name ?? r.subjectName);
        const code = txt(r.subject_code ?? r.subjectCode);
        return {
          value: String(num(r.fk_subject_id ?? r.subjectId)),
          label: code ? `${name} (${code})` : name || "—",
        };
      }),
    ],
    [subjects],
  );

  const displayRows = useMemo<SubjectSyllabusRow[]>(
    () =>
      rows.map((row) => ({
        Subject_Name: txt(row.Subject_Name),
        Unit_Name: txt(row.Unit_Name),
        Unit_Description: txt(row.Unit_Description),
        Topic_Name: txt(row.Topic_Name),
        Topic_Description: txt(row.Topic_Description),
        No_Of_Periods: txt(row.No_Of_Periods),
      })),
    [rows],
  );

  const exportRows = useMemo(
    () =>
      displayRows.map((row, i) => ({
        siNo: i + 1,
        ...row,
      })),
    [displayRows],
  );

  const columnDefs = useMemo<ColDef<SubjectSyllabusRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.subjectName,
      COL_DEFS.unitName,
      COL_DEFS.unitDescription,
      COL_DEFS.topicName,
      COL_DEFS.topicDescription,
      COL_DEFS.noOfPeriods,
    ],
    [],
  );

  const buildDataDetails = () => {
    const parts = [
      collegeOptions.find((o) => o.value === collegeId)?.label,
      ayOptions.find((o) => o.value === academicYearId)?.label,
      courseOptions.find((o) => o.value === courseId)?.label,
      groupOptions.find((o) => o.value === courseGroupId)?.label,
      yearOptions.find((o) => o.value === courseYearId)?.label,
      sectionOptions.find((o) => o.value === sectionId)?.label,
    ].filter(Boolean);
    let details = parts.join(" / ");
    const sub = subjectOptions.find((o) => o.value === subjectId && o.value !== "0");
    if (sub) {
      const codeMatch = sub.label.match(/\(([^)]+)\)\s*$/);
      details += codeMatch ? `- ${codeMatch[1]}` : `- ${sub.label}`;
    }
    return details;
  };

  const handleGetList = async () => {
    const cid = Number(collegeId || 0);
    if (!cid) {
      toastInfo("College is required");
      return;
    }
    if (!academicYearId || !courseId || !courseGroupId || !courseYearId || !sectionId) {
      toastInfo("All filters are required");
      return;
    }
    setLoadingList(true);
    clearResults();
    const details = buildDataDetails();
    setDataDetails(details);
    try {
      const raw = await getSubjectWiseSyllabusReport({
        collegeId: cid,
        subjectId: Number(subjectId || 0),
      });
      if (raw.length === 0) {
        toastInfo("No syllabus records found.");
        return;
      }
      setRows(raw);
      setShowTable(true);
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setLoadingList(false);
    }
  };

  const handleExcelExport = () => {
    if (exportRows.length === 0) {
      toastInfo("No records to export.");
      return;
    }
    // Angular excel header: college name + filter path + report title
    const headerHtml = `<div style="margin-bottom:12px;">
      <div style="font-size:18px;font-weight:600;">${escapeHtml(collegeName || "College")}</div>
      ${dataDetails ? `<div style="font-size:14px;font-weight:550;margin-top:4px;">${escapeHtml(dataDetails)}</div>` : ""}
      <div style="font-size:16px;font-weight:550;margin-top:4px;">${escapeHtml(PRINT_REPORT_TITLE)}</div>
    </div>`;
    exportHtmlTableAsExcel(
      "Subject Wise Syllabus Report.xls",
      buildHtmlTable(EXCEL_COLUMNS, exportRows),
      headerHtml,
    );
  };

  const printReport = async () => {
    if (exportRows.length === 0) {
      toastInfo("No records to print.");
      return;
    }
    const cid = Number(collegeId || 0);
    const logoSrc = await resolveAttendancePrintLogo(
      (selectedCollegeRow as FilterRow | null) ?? null,
      cid,
      collegeLogo || DEFAULT_COLLEGE_LOGO,
    );
    const fallbackLogo = toPrintLogoUrl(DEFAULT_COLLEGE_LOGO);
    const tableHtml = buildHtmlTable(EXCEL_COLUMNS, exportRows);
    // Angular print-Section: logo left + college name + dataDetails + title
    printHtmlInIframe(
      attendancePrintShell({
        title: escapeHtml(PRINT_REPORT_TITLE),
        logoSrc: escapeHtml(logoSrc),
        fallbackLogo: escapeHtml(fallbackLogo),
        collegeName: escapeHtml(collegeName || "College"),
        dataDetails: dataDetails ? escapeHtml(dataDetails) : undefined,
        tableHtml,
      }),
    );
  };

  const goBack = () => {
    router.push(resolveReportCatalogHref(searchParams.get("path")));
  };

  const pageTitle = showTable
    ? `Subject Wise Syllabus Report For : ${dataDetails}`
    : "Subject Wise Syllabus Report";

  return (
    <FilteredListPage<SubjectSyllabusRow>
      title={pageTitle}
      filters={
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <Select
              label="College"
              required
              value={collegeId || null}
              onChange={(v) => {
                setCollegeId(v ?? "");
                clearResults();
              }}
              options={collegeOptions}
              placeholder="College"
              isLoading={filtersQuery.isLoading}
            />
            <Select
              label="Academic Year"
              required
              value={academicYearId || null}
              onChange={(v) => {
                setAcademicYearId(v ?? "");
                clearResults();
              }}
              options={ayOptions}
              placeholder="Academic Year"
              disabled={!collegeId}
            />
            <Select
              label="Course"
              required
              value={courseId || null}
              onChange={(v) => {
                setCourseId(v ?? "");
                clearResults();
              }}
              options={courseOptions}
              placeholder="Course"
              disabled={!academicYearId}
            />
            <Select
              label="Course Group"
              required
              value={courseGroupId || null}
              onChange={(v) => {
                setCourseGroupId(v ?? "");
                clearResults();
              }}
              options={groupOptions}
              placeholder="Course Group"
              disabled={!courseId}
            />
            <Select
              label="Course Year"
              required
              value={courseYearId || null}
              onChange={(v) => {
                setCourseYearId(v ?? "");
                clearResults();
              }}
              options={yearOptions}
              placeholder="Course Year"
              disabled={!courseGroupId}
            />
            <Select
              label="Section"
              required
              value={sectionId || null}
              onChange={(v) => {
                setSectionId(v ?? "");
                clearResults();
              }}
              options={sectionOptions}
              placeholder="Section"
              disabled={!courseYearId}
            />
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-full min-w-[14rem] sm:max-w-md sm:flex-1">
              <Select
                label="Subject"
                required
                value={subjectId}
                onChange={(v) => {
                  setSubjectId(v ?? "0");
                  clearResults();
                }}
                options={subjectOptions}
                placeholder="Subject"
                isLoading={subjectsQuery.isFetching}
                disabled={!sectionId}
              />
            </div>
            <div className="flex shrink-0 items-center gap-2 pb-0.5">
              <Button
                type="button"
                className="h-9 w-fit px-4"
                disabled={loadingList}
                onClick={() => void handleGetList()}
              >
                {loadingList ? "Loading…" : "Get Syllabus List"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="h-9 w-fit px-4"
                onClick={goBack}
              >
                Back
              </Button>
            </div>
          </div>
        </div>
      }
      rowData={showTable ? displayRows : []}
      columnDefs={columnDefs}
      loading={loadingList}
      resultsVisible={showTable}
      hideEmptyGrid
      pagination
      paginationPageSize={25}
      toolbar={{
        search: true,
        searchPlaceholder: "Search",
        exportExcel: true,
        exportPdf: false,
      }}
      onExportExcel={handleExcelExport}
      toolbarTrailing={
        showTable ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 px-3 text-[12px]"
            onClick={() => void printReport()}
          >
            <Printer className="mr-1.5 h-3.5 w-3.5" />
            Print Report
          </Button>
        ) : null
      }
    />
  );
}
