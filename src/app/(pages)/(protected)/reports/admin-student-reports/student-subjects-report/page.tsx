"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { useQuery } from "@tanstack/react-query";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { PrinterIcon } from "lucide-react";
import { FilteredListPage } from "@/components/layout";
import { DataTable } from "@/common/components/table";
import { Select } from "@/common/components/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { QK } from "@/lib/query-keys";
import { printElementInIframe } from "@/lib/print";
import { rowIndexGetter } from "@/lib/utils";
import { toastInfo } from "@/lib/toast";
import { useApiQueryToasts } from "@/hooks";
import { useCollegeLogo, DEFAULT_COLLEGE_LOGO } from "@/hooks/useCollegeLogo";
import {
  filterAcademicYears,
  filterBatches,
  filterColleges,
  filterCourseGroups,
  filterCourses,
  filterCourseYears,
  pickNum,
  pickText,
  type FilterRow,
} from "@/app/(pages)/(protected)/accounts-and-fees/fee-masters/_lib/fee-master-filters";
import {
  fetchStudentSubjectsReport,
  getFeeMasterCollegeFilters,
  type StudentSubjectGroupedRow,
  type StudentSubjectReportParams,
  type StudentSubjectReportRawRow,
} from "@/services";

const TH: CSSProperties = {
  padding: "8px 5px",
  background: "#C3D9FF",
  fontWeight: 550,
  border: "1px solid #96aacb",
  textAlign: "left",
};

const TD: CSSProperties = {
  padding: "8px",
  textAlign: "left",
  fontWeight: 400,
  border: "1px solid #96aacb",
};

type PivotRow = StudentSubjectGroupedRow & { __rowKey: string };

type SubjectDetailRow = {
  __rowKey: string;
  subject_code: string;
  subject_name: string;
};

function exportHtmlTableAsExcel(root: HTMLElement, fileName: string) {
  const uri = "data:application/vnd.ms-excel;base64,";
  const template =
    '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>{worksheet}</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body><table>{table}</table></body></html>';
  const base64 = (s: string) => window.btoa(unescape(encodeURIComponent(s)));
  const formatTpl = (s: string, c: Record<string, string>) =>
    s.replace(/{(\w+)}/g, (_, p: string) => c[p] ?? "");
  const ctx = { worksheet: "Worksheet", table: root.innerHTML };
  const link = document.createElement("a");
  link.download = `${fileName}.xls`;
  link.href = uri + base64(formatTpl(template, ctx));
  link.click();
}

function makeMarkRenderer(code: string) {
  return function markRenderer(params: ICellRendererParams<PivotRow>) {
    const has = params.data?.subjects.includes(code) ?? false;
    return (
      <span className="flex w-full justify-center">{has ? "✔" : "✖"}</span>
    );
  };
}

const DETAIL_COL_DEFS = {
  siNo: {
    colId: "siNo",
    headerName: "S.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<SubjectDetailRow>,
  subjectCode: {
    field: "subject_code",
    headerName: "Subject Code",
    minWidth: 140,
    flex: 1,
  } as ColDef<SubjectDetailRow>,
  subjectName: {
    field: "subject_name",
    headerName: "Subject Name",
    minWidth: 220,
    flex: 2,
  } as ColDef<SubjectDetailRow>,
};

/** Angular `students-subject-report` — Academic-Wise / Batch-Wise. */
export default function StudentSubjectsReportPage() {
  const employeeId = Number(
    globalThis?.localStorage?.getItem("employeeId") ?? 0,
  );
  const orgId = Number(
    globalThis?.localStorage?.getItem("organizationId") ?? 0,
  );
  const orgCode =
    typeof window !== "undefined"
      ? window.localStorage.getItem("orgCode")
      : null;

  /** 1 = Academic-Wise, 2 = Batch-Wise (Angular `check`) */
  const [mode, setMode] = useState<"1" | "2">("1");
  const [collegeId, setCollegeId] = useState<string | null>(null);
  const [courseId, setCourseId] = useState<string | null>(null);
  const [courseGroupId, setCourseGroupId] = useState<string | null>(null);
  const [academicYearId, setAcademicYearId] = useState<string | null>(null);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [courseYearId, setCourseYearId] = useState<string | null>(null);
  const [loadKey, setLoadKey] = useState<string | null>(null);
  const [dataDetails, setDataDetails] = useState("");
  const [collegeName, setCollegeName] = useState("");
  const excelRef = useRef<HTMLDivElement>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const skipInitialCollegeDefault = useRef(false);

  const collegeNum = Number(collegeId ?? 0);
  const courseNum = Number(courseId ?? 0);
  const groupNum = Number(courseGroupId ?? 0);
  const yearNum = Number(courseYearId ?? 0);
  const ayNum = Number(academicYearId ?? 0);
  const batchNum = Number(batchId ?? 0);
  const logoUrl = useCollegeLogo(collegeNum || null);

  const { data: filterBundle, isLoading: loadingFilters } = useQuery({
    queryKey: ["StudentSubjectsReport", "filters", orgId, employeeId],
    queryFn: () => getFeeMasterCollegeFilters(orgId, employeeId),
    enabled: orgId > 0 && employeeId > 0,
  });

  const filtersData = useMemo(
    () => (filterBundle?.filtersData ?? []) as FilterRow[],
    [filterBundle?.filtersData],
  );
  const academicData = useMemo(
    () => (filterBundle?.academicData ?? []) as FilterRow[],
    [filterBundle?.academicData],
  );
  const batchesData = useMemo(
    () => (filterBundle?.batchesData ?? []) as FilterRow[],
    [filterBundle?.batchesData],
  );

  const colleges = useMemo(() => filterColleges(filtersData), [filtersData]);
  const courses = useMemo(
    () => filterCourses(filtersData, collegeNum || null),
    [filtersData, collegeNum],
  );
  const courseGroups = useMemo(
    () =>
      filterCourseGroups(filtersData, collegeNum || null, courseNum || null),
    [filtersData, collegeNum, courseNum],
  );
  const academicYears = useMemo(
    () => filterAcademicYears(academicData, collegeNum || null, filtersData),
    [academicData, collegeNum, filtersData],
  );
  const batches = useMemo(
    () => filterBatches(batchesData, courseNum || null),
    [batchesData, courseNum],
  );
  const courseYears = useMemo(
    () =>
      filterCourseYears(
        filtersData,
        collegeNum || null,
        courseNum || null,
        groupNum || null,
      ),
    [filtersData, collegeNum, courseNum, groupNum],
  );

  useEffect(() => {
    if (skipInitialCollegeDefault.current) return;
    if (!collegeId && colleges.length > 0) {
      setCollegeId(
        String(pickNum(colleges[0], ["fk_college_id", "collegeId"])),
      );
    }
  }, [colleges, collegeId]);

  useEffect(() => {
    if (!collegeNum || courses.length === 0) return;
    if (courseId) return;
    setCourseId(String(pickNum(courses[0], ["fk_course_id", "courseId"])));
  }, [collegeNum, courses, courseId]);

  useEffect(() => {
    if (!collegeNum || !courseNum || courseGroups.length === 0) return;
    if (courseGroupId) return;
    setCourseGroupId(
      String(pickNum(courseGroups[0], ["fk_course_group_id", "courseGroupId"])),
    );
  }, [collegeNum, courseNum, courseGroups, courseGroupId]);

  useEffect(() => {
    if (!collegeNum || !courseNum || !groupNum) return;
    if (mode === "1") {
      if (academicYearId || academicYears.length === 0) return;
      const current =
        [...academicYears].sort(
          (a, b) =>
            Number(b.is_curr_ay ?? b.isCurrAy ?? 0) -
            Number(a.is_curr_ay ?? a.isCurrAy ?? 0),
        )[0] ?? academicYears[0];
      setAcademicYearId(
        String(pickNum(current, ["fk_academic_year_id", "academicYearId"])),
      );
    }
  }, [collegeNum, courseNum, groupNum, mode, academicYears, academicYearId]);

  const collegeOptions = useMemo(
    () =>
      colleges.map((r) => ({
        value: String(pickNum(r, ["fk_college_id", "collegeId"])),
        label:
          pickText(r, ["college_code", "collegeCode"]) ||
          String(pickNum(r, ["fk_college_id"])),
      })),
    [colleges],
  );
  const courseOptions = useMemo(
    () =>
      courses.map((r) => ({
        value: String(pickNum(r, ["fk_course_id", "courseId"])),
        label:
          pickText(r, ["course_code", "courseCode"]) ||
          String(pickNum(r, ["fk_course_id"])),
      })),
    [courses],
  );
  const groupOptions = useMemo(
    () =>
      courseGroups.map((r) => ({
        value: String(pickNum(r, ["fk_course_group_id", "courseGroupId"])),
        label:
          pickText(r, ["group_code", "courseGroupCode"]) ||
          String(pickNum(r, ["fk_course_group_id"])),
      })),
    [courseGroups],
  );
  const ayOptions = useMemo(() => {
    const sorted = [...academicYears].sort(
      (a, b) =>
        Number(pickText(b, ["academic_year"])) -
        Number(pickText(a, ["academic_year"])),
    );
    return sorted.map((r) => ({
      value: String(pickNum(r, ["fk_academic_year_id", "academicYearId"])),
      label: pickText(r, ["academic_year", "academicYear"]) || "—",
    }));
  }, [academicYears]);
  const batchOptions = useMemo(
    () =>
      batches.map((r) => ({
        value: String(pickNum(r, ["fk_batch_id", "batchId"])),
        label:
          pickText(r, ["batch_name", "batchName"]) ||
          String(pickNum(r, ["fk_batch_id"])),
      })),
    [batches],
  );
  const yearOptions = useMemo(
    () =>
      courseYears.map((r) => ({
        value: String(pickNum(r, ["fk_course_year_id", "courseYearId"])),
        label:
          pickText(r, ["course_year_name", "courseYearName"]) ||
          String(pickNum(r, ["fk_course_year_id"])),
      })),
    [courseYears],
  );

  const {
    data: report,
    isFetching,
    error,
    isSuccess,
    isError,
  } = useQuery({
    queryKey: QK.studentSubjectsReport(loadKey ?? ""),
    queryFn: () => {
      const p = JSON.parse(loadKey!) as StudentSubjectReportParams;
      return fetchStudentSubjectsReport(p);
    },
    enabled: loadKey != null,
  });

  const grouped = report?.grouped ?? [];
  const subjectCodes = report?.subjectCodes ?? [];
  const subjectsTable = report?.subjectsTable ?? [];

  const { resetApiToast } = useApiQueryToasts({
    requestKey: loadKey,
    isFetching,
    isSuccess,
    isError,
    error,
    rowCount: grouped.length,
  });

  const pivotRows = useMemo<PivotRow[]>(
    () =>
      grouped.map((row, i) => ({
        ...row,
        __rowKey: `pivot-${row.hallticket_number}-${i}`,
      })),
    [grouped],
  );

  const detailRows = useMemo<SubjectDetailRow[]>(
    () =>
      subjectsTable.map((row: StudentSubjectReportRawRow, i) => ({
        __rowKey: `detail-${String(row.subject_code ?? "")}-${i}`,
        subject_code: String(row.subject_code ?? ""),
        subject_name: String(row.subject_name ?? ""),
      })),
    [subjectsTable],
  );

  const pivotColumnDefs = useMemo<ColDef<PivotRow>[]>(() => {
    const defs: ColDef<PivotRow>[] = [
      {
        colId: "siNo",
        headerName: "S.No",
        valueGetter: rowIndexGetter,
        width: 70,
        flex: 0,
      },
      {
        colId: "hallticket",
        headerName: "HallTicket No",
        minWidth: 220,
        flex: 1.4,
        valueGetter: (p) => {
          const d = p.data;
          if (!d) return "";
          return `${d.hallticket_number}(${d.student_name})`;
        },
      },
      {
        field: "regulation_code",
        headerName: "Regulation",
        minWidth: 120,
        flex: 0.8,
      },
    ];
    for (const code of subjectCodes) {
      defs.push({
        colId: `subj-${code}`,
        headerName: code,
        minWidth: 90,
        flex: 0.6,
        cellRenderer: makeMarkRenderer(code),
        sortable: false,
        filter: false,
      });
    }
    return defs;
  }, [subjectCodes]);

  const detailColumnDefs = useMemo<ColDef<SubjectDetailRow>[]>(
    () => [
      DETAIL_COL_DEFS.siNo,
      DETAIL_COL_DEFS.subjectCode,
      DETAIL_COL_DEFS.subjectName,
    ],
    [],
  );

  function clearResults() {
    setLoadKey(null);
    setDataDetails("");
  }

  function resetAllFilters() {
    skipInitialCollegeDefault.current = true;
    setCollegeId(null);
    setCourseId(null);
    setCourseGroupId(null);
    setAcademicYearId(null);
    setBatchId(null);
    setCourseYearId(null);
    clearResults();
  }

  function handleModeChange(next: string) {
    setMode(next === "2" ? "2" : "1");
    resetAllFilters();
  }

  function handleGetList() {
    if (!collegeNum) {
      toastInfo("Please select college.");
      return;
    }
    if (!courseNum) {
      toastInfo("Please select course.");
      return;
    }
    if (!groupNum) {
      toastInfo("Please select course group.");
      return;
    }
    if (!yearNum) {
      toastInfo("Please select course year.");
      return;
    }

    const collegeRow = colleges.find(
      (r) => pickNum(r, ["fk_college_id", "collegeId"]) === collegeNum,
    );
    const parts: string[] = [
      pickText(collegeRow, ["college_code", "collegeCode"]),
    ];
    const course = courseOptions.find((o) => o.value === courseId);
    if (course) parts.push(course.label);
    const group = groupOptions.find((o) => o.value === courseGroupId);
    if (group) parts.push(group.label);
    const year = yearOptions.find((o) => o.value === courseYearId);
    if (year) parts.push(year.label);
    if (mode === "1") {
      const ay = ayOptions.find((o) => o.value === academicYearId);
      if (ay) parts.push(ay.label);
    } else {
      const batch = batchOptions.find((o) => o.value === batchId);
      if (batch) parts.push(batch.label);
    }

    setCollegeName(
      pickText(collegeRow, ["college_name", "collegeName"]) || parts[0] || "",
    );
    setDataDetails(parts.filter(Boolean).join(" / "));
    resetApiToast();
    setLoadKey(
      JSON.stringify({
        collegeId: collegeNum,
        courseId: courseNum,
        courseGroupId: groupNum,
        courseYearId: yearNum,
        academicYearId: mode === "1" ? ayNum || 0 : 0,
        batchId: mode === "2" ? batchNum || 0 : 0,
      } satisfies StudentSubjectReportParams),
    );
  }

  function handleExportExcel() {
    if (!excelRef.current) return;
    exportHtmlTableAsExcel(excelRef.current, "Student Subjects Report");
  }

  function handlePrint() {
    if (!printRef.current) return;
    printElementInIframe(printRef.current, "Student Subjects Report", {
      extraCss: `
        @page { margin: 0.8cm; size: landscape; }
        html, body { background: #fff !important; }
        .ssr-print { width: 100%; color: #000; }
        .ssr-print .collegeName, .ssr-print .title {
          text-align: left !important;
          font-weight: 550 !important;
          margin: 2px 0 !important;
        }
        .ssr-print table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        .ssr-print th, .ssr-print td {
          border: 1px solid #96aacb; padding: 4px 6px; font-size: 10px;
        }
        .ssr-print th {
          background: #C3D9FF !important;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .ssr-print .center { text-align: center !important; }
        .ssr-print img.portraitLogo {
          height: 80px; width: auto; max-width: 120px; object-fit: contain;
        }
      `,
    });
  }

  const resultsVisible = loadKey != null && !isFetching && grouped.length > 0;

  return (
    <FilteredListPage<PivotRow>
      title="Student Subjects Report"
      className="relative"
      resultsVisible={resultsVisible}
      notice={
        <RadioGroup
          value={mode}
          onValueChange={handleModeChange}
          className="flex flex-wrap items-center gap-6 px-1"
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="1" id="ssr-academic" />
            <Label
              htmlFor="ssr-academic"
              className="cursor-pointer font-normal"
            >
              Is Academic-Wise
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="2" id="ssr-batch" />
            <Label htmlFor="ssr-batch" className="cursor-pointer font-normal">
              Is Batch-Wise
            </Label>
          </div>
        </RadioGroup>
      }
      filters={
        <div className="space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[150px] flex-1">
              <Select
                label="College"
                required
                value={collegeId}
                onChange={(v) => {
                  skipInitialCollegeDefault.current = false;
                  setCollegeId(v);
                  setCourseId(null);
                  setCourseGroupId(null);
                  setAcademicYearId(null);
                  setBatchId(null);
                  setCourseYearId(null);
                  clearResults();
                }}
                options={collegeOptions}
                placeholder="College"
                isLoading={loadingFilters}
              />
            </div>
            <div className="min-w-[150px] flex-1">
              <Select
                label="Course"
                required
                value={courseId}
                onChange={(v) => {
                  setCourseId(v);
                  setCourseGroupId(null);
                  setAcademicYearId(null);
                  setBatchId(null);
                  setCourseYearId(null);
                  clearResults();
                }}
                options={courseOptions}
                placeholder="Course"
                disabled={!collegeId}
              />
            </div>
            <div className="min-w-[150px] flex-1">
              <Select
                label="Course Group"
                required
                value={courseGroupId}
                onChange={(v) => {
                  setCourseGroupId(v);
                  setAcademicYearId(null);
                  setBatchId(null);
                  setCourseYearId(null);
                  clearResults();
                }}
                options={groupOptions}
                placeholder="Course Group"
                disabled={!courseId}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            {mode === "1" ? (
              <div className="min-w-[150px] flex-1">
                <Select
                  label="Academic Year"
                  value={academicYearId}
                  onChange={(v) => {
                    setAcademicYearId(v);
                    clearResults();
                  }}
                  options={ayOptions}
                  placeholder="Academic Year"
                  disabled={!courseGroupId}
                />
              </div>
            ) : (
              <div className="min-w-[150px] flex-1">
                <Select
                  label="Batch"
                  value={batchId}
                  onChange={(v) => {
                    setBatchId(v);
                    clearResults();
                  }}
                  options={batchOptions}
                  placeholder="Batch"
                  disabled={!courseGroupId}
                />
              </div>
            )}
            <div className="min-w-[150px] flex-1">
              <Select
                label="Course Year"
                required
                value={courseYearId}
                onChange={(v) => {
                  setCourseYearId(v);
                  clearResults();
                }}
                options={yearOptions}
                placeholder="Course Year"
                disabled={!courseGroupId}
              />
            </div>
            <Button
              type="button"
              size="sm"
              disabled={isFetching || !collegeId}
              onClick={handleGetList}
            >
              {isFetching ? "Loading…" : "Get List"}
            </Button>
          </div>
        </div>
      }
      body={
        resultsVisible ? (
          <div className="space-y-6">
            {dataDetails ? (
              <p className="text-sm font-semibold text-blue-600">
                {dataDetails}
              </p>
            ) : null}
            <DataTable<PivotRow>
              title=""
              subtitle=""
              bordered={false}
              rowData={pivotRows}
              columnDefs={pivotColumnDefs}
              loading={isFetching}
              height="auto"
              pagination
              columnFilters={false}
              getRowId={(p) => String(p.data?.__rowKey ?? "")}
              toolbar={{
                search: true,
                searchPlaceholder: "Search",
                searchFields: [
                  "hallticket_number",
                  "student_name",
                  "regulation_code",
                ],
                exportExcel: true,
                exportPdf: false,
                columnPicker: false,
                excelDocumentTitle: "Student Subjects Report",
                excelFileName: "Student Subjects Report.xls",
              }}
              onExportExcel={handleExportExcel}
              toolbarTrailing={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="app-data-table-toolbar-btn h-9 px-3 text-[12px]"
                  onClick={handlePrint}
                >
                  <PrinterIcon className="mr-1.5 h-3.5 w-3.5" />
                  Print Report
                </Button>
              }
            />

            {detailRows.length > 0 ? (
              <DataTable<SubjectDetailRow>
                title=""
                subtitle=""
                bordered={false}
                rowData={detailRows}
                columnDefs={detailColumnDefs}
                height="auto"
                pagination
                columnFilters={false}
                getRowId={(p) => String(p.data?.__rowKey ?? "")}
                toolbar={{
                  search: true,
                  searchPlaceholder: "Search",
                  exportExcel: false,
                  exportPdf: false,
                  columnPicker: false,
                }}
              />
            ) : null}
          </div>
        ) : null
      }
      bodyClassName="border-t border-border"
    >
      {resultsVisible ? (
        <div ref={excelRef} className="hidden" aria-hidden>
          <strong>Student Subjects Report &nbsp; ({dataDetails})</strong>
          <table>
            <thead>
              <tr>
                <th style={TH}>S.No</th>
                <th style={TH}>HallTicket No</th>
                <th style={TH}>Regulation</th>
                {subjectCodes.map((code) => (
                  <th key={`eh-${code}`} style={TH}>
                    {code}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grouped.map((row, i) => (
                <tr key={`excel-${row.hallticket_number}`}>
                  <td style={TD}>{i + 1}</td>
                  <td style={TD}>
                    {row.hallticket_number}({row.student_name})
                  </td>
                  <td style={TD}>{row.regulation_code}</td>
                  {subjectCodes.map((code) => (
                    <td
                      key={`e-${row.hallticket_number}-${code}`}
                      style={{ ...TD, textAlign: "center" }}
                    >
                      {row.subjects.includes(code) ? "V" : "X"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <strong>Student Subject Details</strong>
          <table>
            <thead>
              <tr>
                <th style={TH}>S.No</th>
                <th style={TH}>Subject Code</th>
                <th style={TH}>Subject Name</th>
              </tr>
            </thead>
            <tbody>
              {detailRows.map((row, i) => (
                <tr key={`excel-subj-${row.__rowKey}`}>
                  <td style={TD}>{i + 1}</td>
                  <td style={TD}>{row.subject_code}</td>
                  <td style={TD}>{row.subject_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {resultsVisible ? (
        <div className="pointer-events-none absolute -left-[9999px] top-0 w-[1200px] bg-white text-black">
          <div ref={printRef} className="ssr-print bg-white p-4 text-black">
            <div className="mb-2 flex items-start gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoUrl || DEFAULT_COLLEGE_LOGO}
                alt=""
                className="portraitLogo shrink-0"
                onError={(e) => {
                  const img = e.currentTarget;
                  if (!img.src.endsWith("default_logo.png")) {
                    img.src = DEFAULT_COLLEGE_LOGO;
                  }
                }}
              />
              <div>
                {orgCode !== "SUK" ? (
                  <p className="collegeName">{collegeName}</p>
                ) : null}
                <p className="title">Student Subjects Report</p>
                {dataDetails ? <p className="title">{dataDetails}</p> : null}
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>S.No</th>
                  <th>HallTicket No</th>
                  <th>Regulation</th>
                  {subjectCodes.map((code) => (
                    <th key={`ph-${code}`}>{code}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grouped.map((row, i) => (
                  <tr key={`print-${row.hallticket_number}`}>
                    <td>{i + 1}</td>
                    <td>
                      {row.hallticket_number}({row.student_name})
                    </td>
                    <td>{row.regulation_code}</td>
                    {subjectCodes.map((code) => (
                      <td
                        key={`p-${row.hallticket_number}-${code}`}
                        className="center"
                      >
                        {row.subjects.includes(code) ? "✔" : "✖"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <table>
              <thead>
                <tr>
                  <th>S.No</th>
                  <th>Subject Code</th>
                  <th>Subject Name</th>
                </tr>
              </thead>
              <tbody>
                {detailRows.map((row, i) => (
                  <tr key={`print-subj-${row.__rowKey}`}>
                    <td>{i + 1}</td>
                    <td>{row.subject_code}</td>
                    <td>{row.subject_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </FilteredListPage>
  );
}
