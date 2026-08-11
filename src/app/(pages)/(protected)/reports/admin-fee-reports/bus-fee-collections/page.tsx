"use client";

/**
 * Bus Fee Collections / Bus Fee Report —
 * Angular `reports/admin-fee-reports/bus-fee-collections` parity.
 * Get List: `getAllRecords/s_rep_fee_transport_collection` (8 in_* params).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FileSpreadsheet, Printer } from "lucide-react";
import { Select } from "@/common/components/select";
import { StudentSearchSelect } from "@/common/components/student-search";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { printHtmlInIframe } from "@/lib/print";
import { buildHtmlTable, escapeHtml } from "@/common/export-html-table";
import { getErrorMessage } from "@/lib/errors";
import { toastError, toastInfo } from "@/lib/toast";
import { resolveReportCatalogHref } from "@/lib/report-catalog";
import {
  filterAcademicYears,
  filterColleges,
  filterCourseGroups,
  filterCourses,
  filterCourseYears,
  pickNum,
  pickText,
  type FilterRow,
} from "@/app/(pages)/(protected)/accounts-and-fees/fee-masters/_lib/fee-master-filters";
import {
  fetchFeeTransportCollection,
  getFeePaylinkCollegeFilters,
  searchEmployeesForTransport,
  searchStudentsInCollege,
} from "@/services";

import { useCollegeLogo, DEFAULT_COLLEGE_LOGO } from "@/hooks/useCollegeLogo";

type AnyRow = Record<string, unknown>;

const SELECT0 = { value: "0", label: "Select" };

const TRAVELLER_TYPE_OPTIONS = [
  { value: "", label: "Select" },
  { value: "S", label: "Student" },
  { value: "E", label: "Employee" },
];

function gmQuotaOptions(rows: FilterRow[]) {
  return rows
    .filter((r) => Number(r.pk_gm_id ?? r.generalMasterId ?? 0) === 8)
    .map((r) => ({
      value: String(r.pk_gd_id ?? r.generalDetailId ?? ""),
      label: String(r.gd_name ?? r.generalDetailDisplayName ?? r.gd_code ?? ""),
    }))
    .filter((o) => o.value && o.value !== "0");
}

function fmtDate(v: unknown): string {
  if (v == null || v === "") return "";
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function payerLabel(row: AnyRow): string {
  const name = String(row.Payer ?? "");
  const t = String(row.Traveller_Type ?? "");
  if (t === "S") return `${name}`;
  if (t === "E") return `${name}`;
  return name;
}

export default function BusFeeCollectionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const excelTableRef = useRef<HTMLDivElement>(null);

  const [filtersData, setFiltersData] = useState<FilterRow[]>([]);
  const [academicData, setAcademicData] = useState<FilterRow[]>([]);
  const [gmRows, setGmRows] = useState<FilterRow[]>([]);
  const [loadingFilters, setLoadingFilters] = useState(true);

  const [collegeId, setCollegeId] = useState<string | null>(null);
  const [academicYearId, setAcademicYearId] = useState<string>("0");
  const [quotaId, setQuotaId] = useState<string>("0");
  const [courseId, setCourseId] = useState<string>("0");
  const [courseGroupId, setCourseGroupId] = useState<string>("0");
  const [courseYearId, setCourseYearId] = useState<string>("0");
  const [travellerType, setTravellerType] = useState<string>("");
  const [travellerId, setTravellerId] = useState<number>(0);

  const [studentHits, setStudentHits] = useState<AnyRow[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<AnyRow | null>(null);
  const [studentLoading, setStudentLoading] = useState(false);

  const [employeeHits, setEmployeeHits] = useState<AnyRow[]>([]);
  const [employeeLoading, setEmployeeLoading] = useState(false);
  const [employeeTerm, setEmployeeTerm] = useState("");

  const [rows, setRows] = useState<AnyRow[]>([]);
  const [dataDetails, setDataDetails] = useState("");
  const [loadingList, setLoadingList] = useState(false);
  const [showTable, setShowTable] = useState(false);
  const [searchText, setSearchText] = useState("");

  const clearResults = useCallback(() => {
    setRows([]);
    setShowTable(false);
    setDataDetails("");
    setSearchText("");
  }, []);

  const resetTraveller = useCallback(() => {
    setTravellerId(0);
    setSelectedStudent(null);
    setStudentHits([]);
    setEmployeeHits([]);
    setEmployeeTerm("");
  }, []);

  useEffect(() => {
    const orgId = Number(
      globalThis.localStorage?.getItem("organizationId") ?? 0,
    );
    const empId = Number(globalThis.localStorage?.getItem("employeeId") ?? 0);
    if (!orgId || !empId) {
      setLoadingFilters(false);
      return;
    }
    let cancelled = false;
    setLoadingFilters(true);
    void getFeePaylinkCollegeFilters(orgId, empId)
      .then((data) => {
        if (cancelled) return;
        setFiltersData((data.filtersData ?? []) as FilterRow[]);
        setAcademicData((data.academicData ?? []) as FilterRow[]);
        setGmRows((data.generalDetails ?? []) as FilterRow[]);
      })
      .catch((err) => {
        if (!cancelled) toastError(getErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoadingFilters(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const collegeLogo = useCollegeLogo(collegeId ? Number(collegeId) : null);

  const collegeOptions = useMemo(
    () =>
      filterColleges(filtersData).map((r) => ({
        value: String(pickNum(r, ["fk_college_id", "collegeId"])),
        label: pickText(r, ["college_code", "collegeCode"]),
      })),
    [filtersData],
  );

  const ayOptions = useMemo(() => {
    const cid = Number(collegeId ?? 0);
    return [
      SELECT0,
      ...filterAcademicYears(academicData, cid || null, filtersData).map(
        (r) => ({
          value: String(pickNum(r, ["fk_academic_year_id", "academicYearId"])),
          label: pickText(r, ["academic_year", "academicYear"]) || "—",
        }),
      ),
    ];
  }, [academicData, collegeId, filtersData]);

  // const columnDefs = pivot ? pivotColumnDefs : flatColumnDefs;

  const handlePrintReport = () => {
    const collegeLabel =
      collegeOptions.find((o) => o.value === collegeId)?.label || "";

    // Build columns including S.No
    const columns = [
      { key: "siNo", header: "SI.No" },
      ...columnsDefs
        .filter(
          (col: any) =>
            !col.children && col.headerName && col.headerName !== "SI.No",
        )
        .map((col: any) => ({
          key:
            col.field ||
            col.headerName?.toLowerCase().replace(/[^a-z0-9]/g, "_"),
          header: col.headerName || "",
        })),
    ];

    // Add S.No to rows
    const rowsWithIndex = rows.map((row: any, idx: number) => ({
      ...row,
      siNo: idx + 1,
    }));

    const tableHtml = buildHtmlTable(columns as any, rowsWithIndex as any);

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>Fee Due List Report</title>
<style>
@page{margin:12mm}
body{font-family:Arial,sans-serif;padding:12px;color:#111;margin:0}
.header{display:flex;align-items:flex-start;gap:16px;margin-bottom:16px}
.header img{width:90px;height:auto;max-height:100px;object-fit:contain}
.header-text{flex:1}
.collegeName{font-size:24px;font-weight:600;margin:0 0 6px}
.title{font-size:20px;font-weight:550;margin:0 0 6px}
.details{font-size:12px;color:#666;margin:0}
table{width:100%;border-collapse:collapse;font-size:11px;margin-top:8px}
th,td{border:1px solid #333;padding:6px 5px}
th{background:#f2f2f2;font-weight:600}
</style></head><body>
<div class="header">
  <img src="${collegeLogo}" alt="College Logo" onerror="this.onerror=null;this.src='${DEFAULT_COLLEGE_LOGO}'" />
  <div class="header-text">
    <p class="collegeName">${escapeHtml(collegeLabel)}</p>
    ${dataDetails ? `<p class="details">${escapeHtml(dataDetails)}</p>` : ""}
    <p class="title">Fee Due List Report</p>
  </div>
</div>
${tableHtml}
</body></html>`;

    printHtmlInIframe(html);
  };
  const courseOptions = useMemo(() => {
    const cid = Number(collegeId ?? 0);
    return [
      SELECT0,
      ...filterCourses(filtersData, cid || null).map((r) => ({
        value: String(pickNum(r, ["fk_course_id", "courseId"])),
        label: pickText(r, ["course_code", "courseCode", "course_name"]),
      })),
    ];
  }, [filtersData, collegeId]);

  const groupOptions = useMemo(() => {
    const cid = Number(collegeId ?? 0);
    const cr = Number(courseId ?? 0);
    return [
      SELECT0,
      ...filterCourseGroups(filtersData, cid || null, cr || null).map((r) => ({
        value: String(pickNum(r, ["fk_course_group_id", "courseGroupId"])),
        label: pickText(r, ["group_code", "groupCode", "courseGroupCode"]),
      })),
    ];
  }, [filtersData, collegeId, courseId]);

  const yearOptions = useMemo(() => {
    const cid = Number(collegeId ?? 0);
    const cr = Number(courseId ?? 0);
    const g = Number(courseGroupId ?? 0);
    return [
      SELECT0,
      ...filterCourseYears(filtersData, cid || null, cr || null, g || null)
        .sort(
          (a, b) =>
            pickNum(a, ["year_order", "sortOrder"]) -
            pickNum(b, ["year_order", "sortOrder"]),
        )
        .map((r) => ({
          value: String(pickNum(r, ["fk_course_year_id", "courseYearId"])),
          label: pickText(r, ["course_year_name", "courseYearName"]),
        })),
    ];
  }, [filtersData, collegeId, courseId, courseGroupId]);

  const quotaOptions = useMemo(() => gmQuotaOptions(gmRows), [gmRows]);

  // Default college
  useEffect(() => {
    if (collegeId || collegeOptions.length === 0) return;
    setCollegeId(collegeOptions[0].value);
  }, [collegeId, collegeOptions]);

  // Angular selectedCollege → current AY + first course cascade
  useEffect(() => {
    if (!collegeId) return;
    const ays = ayOptions.filter((o) => o.value !== "0");
    if (ays.length === 0) {
      setAcademicYearId("0");
      return;
    }
    const rows = filterAcademicYears(
      academicData,
      Number(collegeId),
      filtersData,
    );
    const current =
      rows.find((r) => Number(r.is_curr_ay ?? 0) === 1) ?? rows[0];
    const ayId = current
      ? String(pickNum(current, ["fk_academic_year_id", "academicYearId"]))
      : ays[0].value;
    setAcademicYearId(ayId);
  }, [collegeId]); // eslint-disable-line react-hooks/exhaustive-deps -- Angular college change only

  useEffect(() => {
    if (!collegeId || !academicYearId) return;
    const courses = courseOptions.filter((o) => o.value !== "0");
    if (courses.length === 0) {
      setCourseId("0");
      setCourseGroupId("0");
      setCourseYearId("0");
      return;
    }
    setCourseId(courses[0].value);
  }, [collegeId, academicYearId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const cr = Number(courseId ?? 0);
    if (!cr) {
      setCourseGroupId("0");
      setCourseYearId("0");
      return;
    }
    const groups = groupOptions.filter((o) => o.value !== "0");
    if (groups.length === 0) {
      setCourseGroupId("0");
      setCourseYearId("0");
      return;
    }
    setCourseGroupId(groups[0].value);
  }, [courseId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const g = Number(courseGroupId ?? 0);
    if (!g) {
      setCourseYearId("0");
      return;
    }
    const years = yearOptions.filter((o) => o.value !== "0");
    if (years.length === 0) {
      setCourseYearId("0");
      return;
    }
    setCourseYearId(years[0].value);
  }, [courseGroupId]); // eslint-disable-line react-hooks/exhaustive-deps

  const onCollegeChange = (v: string | null) => {
    setCollegeId(v);
    setAcademicYearId("0");
    setQuotaId("0");
    setCourseId("0");
    setCourseGroupId("0");
    setCourseYearId("0");
    setTravellerType("");
    resetTraveller();
    clearResults();
  };

  const buildDataDetails = () => {
    const parts: string[] = [];
    const clg = collegeOptions.find((o) => o.value === collegeId);
    if (clg?.label) parts.push(clg.label);
    const ay = ayOptions.find(
      (o) => o.value === academicYearId && o.value !== "0",
    );
    if (ay?.label) parts.push(ay.label);
    const cr = courseOptions.find(
      (o) => o.value === courseId && o.value !== "0",
    );
    if (cr?.label) parts.push(cr.label);
    const g = groupOptions.find(
      (o) => o.value === courseGroupId && o.value !== "0",
    );
    if (g?.label) parts.push(g.label);
    const y = yearOptions.find(
      (o) => o.value === courseYearId && o.value !== "0",
    );
    if (y?.label) parts.push(y.label);
    let detail = parts.join(" / ");
    if (travellerType === "S") detail = `${detail} - Student`;
    else if (travellerType === "E") detail = `${detail} - Employee`;
    return detail;
  };

  const handleGetList = async () => {
    const cid = Number(collegeId ?? 0);
    if (!cid) {
      toastInfo("College is required");
      return;
    }
    setLoadingList(true);
    clearResults();
    const details = buildDataDetails();
    setDataDetails(details);
    try {
      const raw = await fetchFeeTransportCollection({
        collegeId: cid,
        academicYearId: Number(academicYearId ?? 0),
        quotaId: Number(quotaId ?? 0),
        courseId: Number(courseId ?? 0),
        courseGroupId: Number(courseGroupId ?? 0),
        courseYearId: Number(courseYearId ?? 0),
        travellerId: travellerId || 0,
        travellerType: travellerType || "",
      });
      if (raw.length === 0) {
        toastInfo("No bus fee collection records found.");
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

  const handleClear = () => {
    setTravellerType("");
    resetTraveller();
    clearResults();
  };

  const onStudentSearch = useCallback(
    (term: string) => {
      const cid = Number(collegeId ?? 0);
      if (!cid || term.trim().length < 5) {
        setStudentHits([]);
        return;
      }
      setStudentLoading(true);
      void searchStudentsInCollege(cid, term, {
        courseId: Number(courseId) || undefined,
        courseGroupId: Number(courseGroupId) || undefined,
        includeActive: false,
      })
        .then((list) => setStudentHits(list as AnyRow[]))
        .catch((err) => toastError(getErrorMessage(err)))
        .finally(() => setStudentLoading(false));
    },
    [collegeId, courseId, courseGroupId],
  );

  const onEmployeeSearch = useCallback(
    (term: string) => {
      setEmployeeTerm(term);
      const cid = Number(collegeId ?? 0);
      if (!cid || term.trim().length < 5) {
        setEmployeeHits([]);
        return;
      }
      setEmployeeLoading(true);
      void searchEmployeesForTransport(term, cid)
        .then((list) => setEmployeeHits(list as AnyRow[]))
        .catch((err) => toastError(getErrorMessage(err)))
        .finally(() => setEmployeeLoading(false));
    },
    [collegeId],
  );

  const filteredRows = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const blob = [
        r.Payer,
        r.Payer_no,
        r.Quota,
        r.Course,
        r.Route,
        r.Students_Stops,
        r.Payment_For,
        r.Receipt,
        r.Amount,
      ]
        .map((x) => String(x ?? "").toLowerCase())
        .join(" ");
      return blob.includes(q);
    });
  }, [rows, searchText]);

  const exportAsExcel = () => {
    if (!excelTableRef.current) return;
    const uri = "data:application/vnd.ms-excel;base64,";
    const template = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>{worksheet}</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body><table>{table}</table></body></html>`;
    const base64 = (s: string) => window.btoa(unescape(encodeURIComponent(s)));
    const formatTpl = (s: string, c: Record<string, string>) =>
      s.replace(/{(\w+)}/g, (_, p: string) => c[p] ?? "");
    const link = document.createElement("a");
    link.download = "Bus Fee Report.xls";
    link.href =
      uri +
      base64(
        formatTpl(template, {
          worksheet: "Worksheet",
          table: excelTableRef.current.innerHTML,
        }),
      );
    link.click();
  };

  const printReport = () => {
    if (!excelTableRef.current) return;

    const collegeLabel =
      collegeOptions.find((o) => o.value === collegeId)?.label || "";

    printHtmlInIframe(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Bus Fee Report</title>
  <style>
    @page{margin:12mm}
    body{
      font-family:Arial,sans-serif;
      padding:12px;
      color:#111;
      margin:0
    }
    .header{
      display:flex;
      align-items:flex-start;
      gap:16px;
      margin-bottom:16px
    }
    .header img{
      width:90px;
      height:auto;
      max-height:100px;
      object-fit:contain
    }
    .header-text{
      flex:1
    }
    .collegeName{
      font-size:24px;
      font-weight:600;
      margin:0 0 6px
    }
    .title{
      font-size:20px;
      font-weight:550;
      margin:0 0 6px
    }
    .details{
      font-size:12px;
      color:#666;
      margin:0
    }
    table{
      width:100%;
      border-collapse:collapse;
      font-size:11px;
      margin-top:8px
    }
    th,td{
      border:1px solid #333;
      padding:6px 5px
    }
    th{
      background:#f2f2f2;
      font-weight:600
    }
  </style>
</head>
<body>

  <div class="header">
    <img
      src="${collegeLogo}"
      alt="College Logo"
      onerror="this.onerror=null;this.src='${DEFAULT_COLLEGE_LOGO}'"
    />

    <div class="header-text">
      <p class="collegeName">${escapeHtml(collegeLabel)}</p>

      ${dataDetails ? `<p class="details">${escapeHtml(dataDetails)}</p>` : ""}

      <p class="title">Bus Fee Report</p>
    </div>
  </div>

  ${excelTableRef.current.innerHTML}

</body>
</html>`);
  };

  const goBack = () => {
    router.push(resolveReportCatalogHref(searchParams.get("path")));
  };

  const pageTitle =
    showTable && dataDetails
      ? `Bus Fee Report - ${dataDetails}`
      : "Bus Fee Report";

  const employeeOptions = useMemo(
    () =>
      employeeHits.map((e) => {
        const id = String(
          pickNum(e as FilterRow, ["employeeId", "pk_employee_id"]),
        );
        const name = pickText(e as FilterRow, ["firstName", "employeeName"]);
        const no = pickText(e as FilterRow, ["empNumber", "employeeNumber"]);
        return {
          value: id,
          label: no ? `${name} (${no})` : name,
        };
      }),
    [employeeHits],
  );

  return (
    <FilteredListPage
      title={pageTitle}
      filterTitle="Bus Fee Report"
      filters={
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <Select
              label="College"
              required
              value={collegeId}
              onChange={onCollegeChange}
              options={collegeOptions}
              placeholder="College"
              isLoading={loadingFilters}
            />
            <Select
              label="Academic Year"
              value={academicYearId}
              onChange={(v) => {
                setAcademicYearId(v ?? "0");
                resetTraveller();
                clearResults();
              }}
              options={ayOptions}
              placeholder="Academic Year"
            />
            <Select
              label="Quota"
              value={quotaId}
              onChange={(v) => {
                setQuotaId(v ?? "0");
                resetTraveller();
                clearResults();
              }}
              options={quotaOptions}
              placeholder="Quota"
            />
            <Select
              label="Course"
              value={courseId}
              onChange={(v) => {
                setCourseId(v ?? "0");
                resetTraveller();
                clearResults();
              }}
              options={courseOptions}
              placeholder="Course"
              disabled={!collegeId}
            />
            <Select
              label="Course Group"
              value={courseGroupId}
              onChange={(v) => {
                setCourseGroupId(v ?? "0");
                resetTraveller();
                clearResults();
              }}
              options={groupOptions}
              placeholder="Course Group"
              disabled={!courseId || courseId === "0"}
            />
            <Select
              label="Course Year"
              value={courseYearId}
              onChange={(v) => {
                setCourseYearId(v ?? "0");
                clearResults();
              }}
              options={yearOptions}
              placeholder="Course Year"
              disabled={!courseGroupId || courseGroupId === "0"}
            />
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div className="w-full min-w-[12rem] sm:w-[14rem]">
              <Select
                label="Traveller Type"
                value={travellerType || null}
                onChange={(v) => {
                  setTravellerType(v ?? "");
                  resetTraveller();
                  clearResults();
                }}
                options={TRAVELLER_TYPE_OPTIONS}
                placeholder="Traveller Type"
                clearable
              />
            </div>

            {travellerType === "S" ? (
              <div className="min-w-[16rem] flex-1 sm:max-w-xl">
                <StudentSearchSelect
                  label="Student"
                  value={travellerId || null}
                  students={studentHits}
                  selectedStudent={selectedStudent}
                  isLoading={studentLoading}
                  onSearch={onStudentSearch}
                  onChange={(id, student) => {
                    setTravellerId(id ?? 0);
                    setSelectedStudent(student);
                    clearResults();
                  }}
                  placeholder="Search by student name or rollno."
                  fullWidth
                />
              </div>
            ) : null}

            {travellerType === "E" ? (
              <div className="w-full min-w-[16rem] sm:w-[22rem]">
                <Select
                  label="Employee"
                  value={travellerId ? String(travellerId) : null}
                  onChange={(v) => {
                    setTravellerId(Number(v ?? 0));
                    clearResults();
                  }}
                  options={employeeOptions}
                  placeholder={
                    employeeLoading
                      ? "Searching…"
                      : employeeTerm.length > 0 && employeeTerm.length < 5
                        ? "Type at least 5 characters"
                        : "Search by Employee name or Id."
                  }
                  searchable
                  onSearch={onEmployeeSearch}
                  isLoading={employeeLoading}
                  clearable
                />
              </div>
            ) : null}

            <div className="flex shrink-0 items-center gap-2 pb-0.5">
              <Button
                type="button"
                className="h-9 w-fit px-4"
                disabled={loadingList}
                onClick={() => void handleGetList()}
              >
                {loadingList ? "Loading…" : "Get List"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="h-9 w-fit px-4"
                onClick={handleClear}
              >
                Clear
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
      body={
        showTable ? (
          <>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">Search</Label>
                <input
                  className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Search"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="h-9 px-3 text-[12px]"
                  onClick={exportAsExcel}
                >
                  <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
                  Export Excel
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 px-3 text-[12px]"
                  onClick={printReport}
                >
                  <Printer className="mr-1.5 h-3.5 w-3.5" />
                  Print Report
                </Button>
              </div>
            </div>

            <div ref={excelTableRef} className="overflow-x-auto">
              <strong className="hidden">Bus Fee Report - {dataDetails}</strong>
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-sky-50">
                    {[
                      "SI.No",
                      "Traveller No.",
                      "Traveller Name",
                      "Quota",
                      "Course",
                      "Route",
                      "Route Stops",
                      "Payment Date",
                      "Payment For",
                      "Receipt",
                      "Amount",
                    ].map((h) => (
                      <th
                        key={h}
                        className="border px-2 py-1.5 text-center font-semibold"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row, i) => {
                    const t = String(row.Traveller_Type ?? "");
                    return (
                      <tr key={`${row.Receipt ?? ""}-${i}`}>
                        <td className="border px-2 py-1 text-center">
                          {String(row.S_NO ?? i + 1)}
                        </td>
                        <td className="border px-2 py-1">
                          {String(row.Payer_no ?? "")}
                        </td>
                        <td className="border px-2 py-1">
                          {payerLabel(row)}
                          {t === "S" ? (
                            <span className="ml-1 font-medium text-blue-600">
                              (Student)
                            </span>
                          ) : null}
                          {t === "E" ? (
                            <span className="ml-1 font-medium text-blue-600">
                              (Employee)
                            </span>
                          ) : null}
                        </td>
                        <td className="border px-2 py-1">
                          {row.Quota == null ? "-" : String(row.Quota)}
                        </td>
                        <td className="border px-2 py-1">
                          {String(row.Course ?? "")}
                        </td>
                        <td className="border px-2 py-1">
                          {String(row.Route ?? "")}
                        </td>
                        <td className="border px-2 py-1">
                          {String(row.Students_Stops ?? "")}
                        </td>
                        <td className="border px-2 py-1">
                          {fmtDate(row.Payment_Date)}
                        </td>
                        <td className="border px-2 py-1">
                          {String(row.Payment_For ?? "")}
                        </td>
                        <td className="border px-2 py-1">
                          {String(row.Receipt ?? "")}
                        </td>
                        <td className="border px-2 py-1 text-center">
                          {String(row.Amount ?? "")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : null
      }
      bodyClassName={showTable ? undefined : "hidden border-0 p-0"}
    />
  );
}
