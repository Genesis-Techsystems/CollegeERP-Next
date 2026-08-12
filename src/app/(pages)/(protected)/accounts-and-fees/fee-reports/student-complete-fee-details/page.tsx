"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { PrinterIcon } from "lucide-react";
import { FilteredPage } from "@/components/layout";
import { SearchInput } from "@/common/components/search";
import { Select } from "@/common/components/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { QK } from "@/lib/query-keys";
import { printElementInIframe } from "@/lib/print";
import { toastInfo } from "@/lib/toast";
import { useApiQueryToasts } from "@/hooks";
import { useCollegeLogo, DEFAULT_COLLEGE_LOGO } from "@/hooks/useCollegeLogo";
import {
  filterColleges,
  filterCourseGroups,
  filterCourses,
  filterCourseYears,
  pickNum,
  pickText,
  type FilterRow,
} from "@/app/(pages)/(protected)/accounts-and-fees/fee-masters/_lib/fee-master-filters";
import {
  fetchCompleteStudentFeeReport,
  getFeePaylinkCollegeFilters,
  listBatchesByCourse,
} from "@/services";
import {
  buildCompleteFeeDueList,
  formatFeeAmt,
  type CompleteFeeDueRow,
} from "./_lib/pivot-complete-fee";

const ALL = { value: "0", label: "All" };

const YEAR_HEADERS = ["1st Year", "2nd Year", "3rd Year", "4th Year"] as const;
const AMT_HEADERS = [
  "Gross Amt",
  "Discount Amt",
  "College Fee",
  "Scholarship Hold Amt",
  "Scholarship Amt",
  "Paid Amt",
  "Balance Due",
] as const;

const TH: CSSProperties = {
  padding: "6px 4px",
  background: "#C3D9FF",
  fontWeight: 550,
  border: "1px solid #96aacb",
  textAlign: "center",
  fontSize: 12,
  whiteSpace: "nowrap",
};

const TD: CSSProperties = {
  padding: "6px 4px",
  border: "1px solid #96aacb",
  textAlign: "center",
  fontSize: 12,
};

function gmOptions(rows: FilterRow[], gmId: number) {
  return rows
    .filter((r) => Number(r.pk_gm_id ?? r.generalMasterId ?? 0) === gmId)
    .map((r) => ({
      value: String(pickNum(r, ["pk_gd_id", "generalDetailId", "id"])),
      label:
        pickText(r, ["gd_name", "generalDetailName", "name"]) ||
        pickText(r, ["gd_code"]) ||
        String(pickNum(r, ["pk_gd_id"])),
    }))
    .filter((o) => o.value !== "0");
}

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

function FeeTableHead() {
  return (
    <thead>
      <tr>
        <th style={{ ...TH, width: "1%" }} rowSpan={2}>
          SI.No
        </th>
        <th style={{ ...TH, width: "12%" }} rowSpan={2}>
          Student
        </th>
        <th style={TH} rowSpan={2}>
          Mobile No
        </th>
        {YEAR_HEADERS.map((y) => (
          <th key={y} style={TH} colSpan={7}>
            {y}
          </th>
        ))}
      </tr>
      <tr>
        {YEAR_HEADERS.flatMap((y) =>
          AMT_HEADERS.map((h) => (
            <th key={`${y}-${h}`} style={TH}>
              {h}
            </th>
          )),
        )}
      </tr>
    </thead>
  );
}

function FeeTableBody({ rows }: { rows: CompleteFeeDueRow[] }) {
  return (
    <tbody>
      {rows.map((feeDue, i) => (
        <tr key={`${feeDue.hallticket_number}-${i}`}>
          <td style={TD}>{i + 1}</td>
          <td style={{ ...TD, textAlign: "left", whiteSpace: "nowrap" }}>
            {feeDue.firstName}{" "}
            <span style={{ color: "blue" }}>({feeDue.hallticket_number})</span>
          </td>
          <td style={TD}>{feeDue.Student_Mobile || "-"}</td>
          {feeDue.amounts.map((amt, j) => (
            <td key={`${i}-${j}`} style={TD}>
              {formatFeeAmt(amt)}
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}

export default function StudentCompleteFeeDetailsPage() {
  const router = useRouter();
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

  const [collegeId, setCollegeId] = useState<string | null>(null);
  const [courseId, setCourseId] = useState<string | null>(null);
  const [courseGroupId, setCourseGroupId] = useState("0");
  const [courseYearId, setCourseYearId] = useState("0");
  const [quotaId, setQuotaId] = useState("0");
  const [batchId, setBatchId] = useState("0");
  const [studentStatusId, setStudentStatusId] = useState("0");
  const [includeScholarship, setIncludeScholarship] = useState(false);
  const [loadKey, setLoadKey] = useState<string | null>(null);
  const [dataDetails, setDataDetails] = useState("");
  const [collegeName, setCollegeName] = useState("");
  const [search, setSearch] = useState("");
  const excelRef = useRef<HTMLDivElement>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const collegeNum = Number(collegeId ?? 0);
  const courseNum = Number(courseId ?? 0);
  const logoUrl = useCollegeLogo(collegeNum || null);

  const { data: filterBundle, isLoading: loadingFilters } = useQuery({
    queryKey: ["CompleteStudentFee", "filters", orgId, employeeId],
    queryFn: () => getFeePaylinkCollegeFilters(orgId, employeeId),
    enabled: orgId > 0 && employeeId > 0,
  });

  const filtersData = useMemo(
    () => (filterBundle?.filtersData ?? []) as FilterRow[],
    [filterBundle?.filtersData],
  );
  const gmRows = useMemo(
    () => (filterBundle?.generalDetails ?? []) as FilterRow[],
    [filterBundle?.generalDetails],
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
  const courseYears = useMemo(
    () =>
      filterCourseYears(
        filtersData,
        collegeNum || null,
        courseNum || null,
        Number(courseGroupId) || null,
      ),
    [filtersData, collegeNum, courseNum, courseGroupId],
  );

  const { data: batchRows = [] } = useQuery({
    queryKey: ["CompleteStudentFee", "batches", courseNum],
    queryFn: () => listBatchesByCourse(courseNum),
    enabled: courseNum > 0,
  });

  useEffect(() => {
    if (!collegeId && colleges.length > 0) {
      const id = String(pickNum(colleges[0], ["fk_college_id", "collegeId"]));
      setCollegeId(id);
    }
  }, [colleges, collegeId]);

  // Default Course / Group / Year only when unset — never overwrite explicit "All" ("0").
  useEffect(() => {
    if (!collegeNum || courses.length === 0) return;
    if (courseId) return;
    const nextCourse = String(
      pickNum(courses[0], ["fk_course_id", "courseId"]),
    );
    setCourseId(nextCourse);
    const groups = filterCourseGroups(
      filtersData,
      collegeNum,
      Number(nextCourse),
    );
    const nextGroup =
      groups.length > 0
        ? String(pickNum(groups[0], ["fk_course_group_id", "courseGroupId"]))
        : "0";
    setCourseGroupId(nextGroup);
    const years = filterCourseYears(
      filtersData,
      collegeNum,
      Number(nextCourse),
      Number(nextGroup) || null,
    );
    setCourseYearId(
      years.length > 0
        ? String(pickNum(years[0], ["fk_course_year_id", "courseYearId"]))
        : "0",
    );
  }, [collegeNum, courses, courseId, filtersData]);

  function applyCourseCascade(nextCourseId: string | null) {
    setCourseId(nextCourseId);
    if (!nextCourseId || !collegeNum) {
      setCourseGroupId("0");
      setCourseYearId("0");
      return;
    }
    const groups = filterCourseGroups(
      filtersData,
      collegeNum,
      Number(nextCourseId),
    );
    const nextGroup =
      groups.length > 0
        ? String(pickNum(groups[0], ["fk_course_group_id", "courseGroupId"]))
        : "0";
    setCourseGroupId(nextGroup);
    const years = filterCourseYears(
      filtersData,
      collegeNum,
      Number(nextCourseId),
      Number(nextGroup) || null,
    );
    setCourseYearId(
      years.length > 0
        ? String(pickNum(years[0], ["fk_course_year_id", "courseYearId"]))
        : "0",
    );
  }

  function applyGroupCascade(nextGroupId: string) {
    setCourseGroupId(nextGroupId);
    if (!collegeNum || !courseNum) {
      setCourseYearId("0");
      return;
    }
    if (nextGroupId === "0") {
      setCourseYearId("0");
      return;
    }
    const years = filterCourseYears(
      filtersData,
      collegeNum,
      courseNum,
      Number(nextGroupId),
    );
    setCourseYearId(
      years.length > 0
        ? String(pickNum(years[0], ["fk_course_year_id", "courseYearId"]))
        : "0",
    );
  }

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
    () => [
      ALL,
      ...courseGroups.map((r) => ({
        value: String(pickNum(r, ["fk_course_group_id", "courseGroupId"])),
        label:
          pickText(r, ["group_code", "courseGroupCode"]) ||
          String(pickNum(r, ["fk_course_group_id"])),
      })),
    ],
    [courseGroups],
  );
  const yearOptions = useMemo(
    () => [
      ALL,
      ...courseYears.map((r) => ({
        value: String(pickNum(r, ["fk_course_year_id", "courseYearId"])),
        label:
          pickText(r, ["course_year_name", "courseYearName"]) ||
          String(pickNum(r, ["fk_course_year_id"])),
      })),
    ],
    [courseYears],
  );
  const quotaOptions = useMemo(() => [ALL, ...gmOptions(gmRows, 8)], [gmRows]);
  const statusOptions = useMemo(
    () => [ALL, ...gmOptions(gmRows, 51)],
    [gmRows],
  );
  const batchOptions = useMemo(
    () => [
      ALL,
      ...batchRows
        .slice()
        .sort(
          (a, b) =>
            Number.parseInt(String(a.batchName ?? "0"), 10) -
            Number.parseInt(String(b.batchName ?? "0"), 10),
        )
        .map((b) => ({
          value: String(b.batchId),
          label: String(b.batchName ?? b.batchId),
        })),
    ],
    [batchRows],
  );

  const {
    data: rawRows = [],
    isFetching,
    error,
    isSuccess,
    isError,
  } = useQuery({
    queryKey: QK.completeStudentFeeReport(loadKey ?? ""),
    queryFn: () => {
      const p = JSON.parse(loadKey!) as {
        collegeId: number;
        courseId: number;
        courseGroupId: number;
        courseYearId: number;
        quotaId: number;
        batchId: number;
        studentStatusId: number;
      };
      return fetchCompleteStudentFeeReport(p);
    },
    enabled: loadKey != null,
  });

  const feeDueList = useMemo(() => buildCompleteFeeDueList(rawRows), [rawRows]);

  const { resetApiToast } = useApiQueryToasts({
    requestKey: loadKey,
    isFetching,
    isSuccess,
    isError,
    error,
    rowCount: feeDueList.length,
  });

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return feeDueList;
    return feeDueList.filter((r) =>
      [r.firstName, r.hallticket_number, r.Student_Mobile, r.Batch]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [feeDueList, search]);

  const resultsVisible =
    loadKey != null && !isFetching && feeDueList.length > 0;

  function clearResults() {
    setLoadKey(null);
    setDataDetails("");
    setSearch("");
  }

  function buildDataDetails() {
    const parts: string[] = [];
    const collegeRow = colleges.find(
      (r) => pickNum(r, ["fk_college_id", "collegeId"]) === collegeNum,
    );
    const courseRow = courses.find(
      (r) => pickNum(r, ["fk_course_id", "courseId"]) === courseNum,
    );
    const groupRow = courseGroups.find(
      (r) =>
        pickNum(r, ["fk_course_group_id", "courseGroupId"]) ===
        Number(courseGroupId),
    );
    const yearRow = courseYears.find(
      (r) =>
        pickNum(r, ["fk_course_year_id", "courseYearId"]) ===
        Number(courseYearId),
    );
    const quota = quotaOptions.find((o) => o.value === quotaId);
    const batch = batchOptions.find((o) => o.value === batchId);
    const status = statusOptions.find((o) => o.value === studentStatusId);

    const code = pickText(collegeRow, ["college_code", "collegeCode"]);
    if (code) parts.push(code);
    const cCode = pickText(courseRow, ["course_code", "courseCode"]);
    if (cCode) parts.push(cCode);
    const gCode = pickText(groupRow, ["group_code", "courseGroupCode"]);
    if (gCode) parts.push(gCode);
    const yName = pickText(yearRow, ["course_year_name", "courseYearName"]);
    if (yName) parts.push(yName);
    if (quota && quota.value !== "0") parts.push(quota.label);
    if (batch && batch.value !== "0") parts.push(batch.label);
    if (status && status.value !== "0") parts.push(status.label);

    setCollegeName(
      pickText(collegeRow, ["college_name", "collegeName"]) || code,
    );
    setDataDetails(parts.join("/"));
  }

  function handleGetDueList() {
    if (!collegeNum) {
      toastInfo("Please select college.");
      return;
    }
    if (!courseNum) {
      toastInfo("Please select course.");
      return;
    }
    buildDataDetails();
    setSearch("");
    resetApiToast();
    setLoadKey(
      JSON.stringify({
        collegeId: collegeNum,
        courseId: courseNum,
        courseGroupId: Number(courseGroupId) || 0,
        courseYearId: Number(courseYearId) || 0,
        quotaId: Number(quotaId) || 0,
        batchId: Number(batchId) || 0,
        studentStatusId: Number(studentStatusId) || 0,
        includeScholarship,
      }),
    );
  }

  function handleExportExcel() {
    if (!excelRef.current) return;
    exportHtmlTableAsExcel(excelRef.current, "Student Complete Fee Details");
  }

  function handlePrint() {
    if (!printRef.current) return;
    printElementInIframe(printRef.current, "Student Complete Fee Details", {
      extraCss: `
        @page { margin: 0.6cm; size: landscape; }
        html, body { background: #fff !important; }
        .fee-print { width: 100%; color: #000; }
        .fee-print .collegeName {
          text-align: left !important;
          font-size: 20px !important;
          font-weight: 550 !important;
          margin: 4px 0 !important;
        }
        .fee-print .title, .fee-print .title-2 {
          text-align: left !important;
          font-size: 16px !important;
          font-weight: 550 !important;
          margin: 2px 0 !important;
        }
        .fee-print table { width: 100%; border-collapse: collapse; }
        .fee-print th, .fee-print td {
          border: 1px solid #96aacb;
          padding: 4px;
          text-align: center;
          font-size: 10px;
        }
        .fee-print th {
          background: #C3D9FF !important;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .fee-print img.portraitLogo {
          height: 80px;
          width: auto;
          max-width: 120px;
          object-fit: contain;
        }
      `,
    });
  }

  return (
    <FilteredPage
      title="Student Complete Fee Details"
      className="relative"
      filters={
        <div className="space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[140px] flex-1">
              <Select
                label="College"
                required
                value={collegeId}
                onChange={(v) => {
                  setCollegeId(v);
                  setCourseId(null);
                  setCourseGroupId("0");
                  setCourseYearId("0");
                  setQuotaId("0");
                  setBatchId("0");
                  setStudentStatusId("0");
                  setIncludeScholarship(false);
                  clearResults();
                }}
                options={collegeOptions}
                placeholder="College"
                isLoading={loadingFilters}
              />
            </div>
            <div className="min-w-[140px] flex-1">
              <Select
                label="Course"
                required
                value={courseId}
                onChange={(v) => {
                  applyCourseCascade(v);
                  setQuotaId("0");
                  setBatchId("0");
                  setStudentStatusId("0");
                  setIncludeScholarship(false);
                  clearResults();
                }}
                options={courseOptions}
                placeholder="Course"
                disabled={!collegeId}
              />
            </div>
            <div className="min-w-[140px] flex-1">
              <Select
                label="Course Group"
                value={courseGroupId}
                onChange={(v) => {
                  applyGroupCascade(v ?? "0");
                  setQuotaId("0");
                  setBatchId("0");
                  setStudentStatusId("0");
                  setIncludeScholarship(false);
                  clearResults();
                }}
                options={groupOptions}
                placeholder="Course Group"
                disabled={!courseId}
              />
            </div>
            <div className="min-w-[140px] flex-1">
              <Select
                label="Course Year"
                value={courseYearId}
                onChange={(v) => {
                  setCourseYearId(v ?? "0");
                  clearResults();
                }}
                options={yearOptions}
                placeholder="Course Year"
                disabled={!courseId}
              />
            </div>
            <div className="min-w-[120px] flex-1">
              <Select
                label="Quota"
                value={quotaId}
                onChange={(v) => {
                  setQuotaId(v ?? "0");
                  clearResults();
                }}
                options={quotaOptions}
                placeholder="Quota"
              />
            </div>
            <div className="min-w-[120px] flex-1">
              <Select
                label="Batch"
                value={batchId}
                onChange={(v) => {
                  setBatchId(v ?? "0");
                  clearResults();
                }}
                options={batchOptions}
                placeholder="Batch"
                disabled={!courseId}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[140px] flex-1">
              <Select
                label="Student Status"
                value={studentStatusId}
                onChange={(v) => {
                  setStudentStatusId(v ?? "0");
                  clearResults();
                }}
                options={statusOptions}
                placeholder="Student Status"
              />
            </div>
            <div className="mb-1 flex items-center gap-2">
              <Checkbox
                id="include-scholarship"
                checked={includeScholarship}
                onCheckedChange={(c) => {
                  setIncludeScholarship(c === true);
                  clearResults();
                }}
              />
              <Label htmlFor="include-scholarship" className="text-sm">
                Include Scholarship
              </Label>
            </div>
            <Button
              type="button"
              size="sm"
              disabled={isFetching || !collegeId || !courseId}
              onClick={handleGetDueList}
            >
              {isFetching ? "Loading…" : "Get Due List"}
            </Button>
          </div>
        </div>
      }
    >
      {resultsVisible ? (
        <div className="app-data-table app-data-table-card flex flex-col overflow-hidden">
          <div className="px-5 pt-4 pb-2">
            <h2 className="text-base font-semibold tracking-tight">
              Fee Due List ({dataDetails})
            </h2>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 pb-3">
            <div className="min-w-[200px] max-w-xs flex-1">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" onClick={handleExportExcel}>
                Export Excel
              </Button>
              <Button type="button" size="sm" onClick={handlePrint}>
                <PrinterIcon className="mr-1.5 h-3.5 w-3.5" />
                Print Report
              </Button>
            </div>
          </div>
          <div className="overflow-x-auto px-5 pb-5">
            <div ref={excelRef}>
              <strong className="hidden">
                Complete Fee Due List - {dataDetails}
              </strong>
              <table className="w-full border-collapse">
                <FeeTableHead />
                <FeeTableBody rows={filteredRows} />
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {resultsVisible ? (
        <div className="pointer-events-none absolute -left-[9999px] top-0 w-[1400px] bg-white text-black">
          <div ref={printRef} className="fee-print bg-white p-4 text-black">
            {orgCode === "SUK" ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoUrl || DEFAULT_COLLEGE_LOGO}
                  alt=""
                  className="mb-2 max-w-full"
                  onError={(e) => {
                    const img = e.currentTarget;
                    if (!img.src.endsWith("default_logo.png")) {
                      img.src = DEFAULT_COLLEGE_LOGO;
                    }
                  }}
                />
                <p className="collegeName">{collegeName}</p>
                <p className="title">{dataDetails}</p>
                <p className="title-2">Student Complete Fee Details</p>
              </>
            ) : (
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
                  <p className="collegeName">{collegeName}</p>
                  <p className="title">{dataDetails}</p>
                  <p className="title-2">Student Complete Fee Details</p>
                </div>
              </div>
            )}
            <table>
              <FeeTableHead />
              <FeeTableBody rows={filteredRows} />
            </table>
          </div>
        </div>
      ) : null}
    </FilteredPage>
  );
}
