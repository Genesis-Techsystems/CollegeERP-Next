"use client";

/**
 * Library Fee Report / Library Students Fee Collections —
 * Angular `reports/admin-fee-reports/library-fee-collections` parity.
 * Get List: `libraryfeecollections?collegeId=&academicYearId=&quotaId=&page=&size=&courseId=&courseGroupId=&courseYearId=&status=true`
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FileSpreadsheet, Printer } from "lucide-react";
import { Select } from "@/common/components/select";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { printHtmlInIframe } from "@/lib/print";
import { buildHtmlTable, escapeHtml } from "@/common/export-html-table";
import { getErrorMessage } from "@/lib/errors";
import { resolveReportCatalogHref } from "@/lib/report-catalog";
import { toastError, toastInfo } from "@/lib/toast";
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
  fetchLibraryFeeCollections,
  getFeePaylinkCollegeFilters,
} from "@/services";

import { useCollegeLogo, DEFAULT_COLLEGE_LOGO } from "@/hooks/useCollegeLogo";
type AnyRow = Record<string, unknown>;

const SELECT_EMPTY = { value: "", label: "Select" };

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

function courseCell(row: AnyRow): string {
  return `${String(row.course ?? "")} / ${String(row.groupCode ?? "")} / ${String(row.courseYearName ?? "")} / section - ${String(row.section ?? "")}`;
}

export default function LibraryFeeCollectionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const excelTableRef = useRef<HTMLDivElement>(null);

  const [filtersData, setFiltersData] = useState<FilterRow[]>([]);
  const [academicData, setAcademicData] = useState<FilterRow[]>([]);
  const [gmRows, setGmRows] = useState<FilterRow[]>([]);
  const [loadingFilters, setLoadingFilters] = useState(true);

  const [collegeId, setCollegeId] = useState<string | null>(null);
  const [academicYearId, setAcademicYearId] = useState<string>("");
  const [quotaId, setQuotaId] = useState<string>("");
  const [courseId, setCourseId] = useState<string>("");
  const [courseGroupId, setCourseGroupId] = useState<string>("");
  const [courseYearId, setCourseYearId] = useState<string>("");

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
      SELECT_EMPTY,
      ...filterAcademicYears(academicData, cid || null, filtersData).map(
        (r) => ({
          value: String(pickNum(r, ["fk_academic_year_id", "academicYearId"])),
          label: pickText(r, ["academic_year", "academicYear"]) || "—",
        }),
      ),
    ];
  }, [academicData, collegeId, filtersData]);

  const quotaOptions = useMemo(
    () => [SELECT_EMPTY, ...gmQuotaOptions(gmRows)],
    [gmRows],
  );

  const courseOptions = useMemo(() => {
    const cid = Number(collegeId ?? 0);
    return [
      SELECT_EMPTY,
      ...filterCourses(filtersData, cid || null).map((r) => ({
        value: String(pickNum(r, ["fk_course_id", "courseId"])),
        label: pickText(r, ["course_code", "courseCode", "course_name"]),
      })),
    ];
  }, [filtersData, collegeId]);

  const groupOptions = useMemo(() => {
    const cid = Number(collegeId ?? 0);
    const cr = Number(courseId || 0);
    return [
      SELECT_EMPTY,
      ...filterCourseGroups(filtersData, cid || null, cr || null).map((r) => ({
        value: String(pickNum(r, ["fk_course_group_id", "courseGroupId"])),
        label: pickText(r, ["group_code", "groupCode", "courseGroupCode"]),
      })),
    ];
  }, [filtersData, collegeId, courseId]);

  const yearOptions = useMemo(() => {
    const cid = Number(collegeId ?? 0);
    const cr = Number(courseId || 0);
    const g = Number(courseGroupId || 0);
    return [
      SELECT_EMPTY,
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

  useEffect(() => {
    if (collegeId || collegeOptions.length === 0) return;
    setCollegeId(collegeOptions[0].value);
  }, [collegeId, collegeOptions]);

  useEffect(() => {
    if (!collegeId) return;
    const rowsAy = filterAcademicYears(
      academicData,
      Number(collegeId),
      filtersData,
    );
    if (rowsAy.length === 0) {
      setAcademicYearId("");
      setQuotaId("");
      setCourseId("");
      setCourseGroupId("");
      setCourseYearId("");
      return;
    }
    const current =
      rowsAy.find((r) => Number(r.is_curr_ay ?? 0) === 1) ?? rowsAy[0];
    setAcademicYearId(
      String(pickNum(current, ["fk_academic_year_id", "academicYearId"])),
    );
  }, [collegeId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!collegeId || !academicYearId) return;
    const quotas = quotaOptions.filter((o) => o.value !== "");
    if (quotas.length > 0 && !quotaId) setQuotaId(quotas[0].value);
    const courses = courseOptions.filter((o) => o.value !== "");
    if (courses.length === 0) {
      setCourseId("");
      setCourseGroupId("");
      setCourseYearId("");
      return;
    }
    setCourseId(courses[0].value);
  }, [collegeId, academicYearId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!courseId) {
      setCourseGroupId("");
      setCourseYearId("");
      return;
    }
    const groups = groupOptions.filter((o) => o.value !== "");
    if (groups.length === 0) {
      setCourseGroupId("");
      setCourseYearId("");
      return;
    }
    setCourseGroupId(groups[0].value);
  }, [courseId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!courseGroupId) {
      setCourseYearId("");
      return;
    }
    const years = yearOptions.filter((o) => o.value !== "");
    if (years.length === 0) {
      setCourseYearId("");
      return;
    }
    setCourseYearId(years[0].value);
  }, [courseGroupId]); // eslint-disable-line react-hooks/exhaustive-deps

  const onCollegeChange = (v: string | null) => {
    setCollegeId(v);
    setAcademicYearId("");
    setQuotaId("");
    setCourseId("");
    setCourseGroupId("");
    setCourseYearId("");
    clearResults();
  };

  const buildDataDetails = () => {
    const parts: string[] = [];
    const clg = collegeOptions.find((o) => o.value === collegeId);
    if (clg?.label) parts.push(clg.label);
    const ay = ayOptions.find((o) => o.value === academicYearId && o.value);
    if (ay?.label) parts.push(ay.label);
    const cr = courseOptions.find((o) => o.value === courseId && o.value);
    if (cr?.label) parts.push(cr.label);
    const g = groupOptions.find((o) => o.value === courseGroupId && o.value);
    if (g?.label) parts.push(g.label);
    const y = yearOptions.find((o) => o.value === courseYearId && o.value);
    if (y?.label) parts.push(y.label);
    const q = quotaOptions.find((o) => o.value === quotaId && o.value);
    if (q?.label) parts.push(q.label);
    return parts.join(" / ");
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
      const { rows: raw } = await fetchLibraryFeeCollections({
        collegeId: cid,
        academicYearId: Number(academicYearId || 0),
        quotaId: Number(quotaId || 0),
        courseId: Number(courseId || 0),
        courseGroupId: Number(courseGroupId || 0),
        courseYearId: Number(courseYearId || 0),
        page: 0,
        size: 1000,
      });
      if (raw.length === 0) {
        toastInfo("No library fee collection records found.");
        return;
      }
      setRows(
        raw.map((r, i) => ({
          ...r,
          id: i + 1,
        })),
      );
      setShowTable(true);
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setLoadingList(false);
    }
  };

  const filteredRows = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const blob = [
        r.studentRollNo,
        r.studentName,
        r.quotaName,
        r.course,
        r.groupCode,
        r.paymentReceiptsNo,
        r.receiptAmount,
      ]
        .map((x) => String(x ?? "").toLowerCase())
        .join(" ");
      return blob.includes(q);
    });
  }, [rows, searchText]);
  const collegeLogo = useCollegeLogo(collegeId ? Number(collegeId) : null);
  const exportAsExcel = () => {
    if (!excelTableRef.current) return;
    const uri = "data:application/vnd.ms-excel;base64,";
    const template = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>{worksheet}</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body><table>{table}</table></body></html>`;
    const base64 = (s: string) => window.btoa(unescape(encodeURIComponent(s)));
    const formatTpl = (s: string, c: Record<string, string>) =>
      s.replace(/{(\w+)}/g, (_, p: string) => c[p] ?? "");
    const link = document.createElement("a");
    link.download = "Library Fee Report.xls";
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

  const handlePrintReport = () => {
    if (!excelTableRef.current) return;

    const collegeLabel =
      collegeOptions.find((o) => o.value === collegeId)?.label || "";

    const columns = [
      { key: "siNo", header: "SI.No" },
      { key: "studentRollNo", header: "Roll No." },
      { key: "studentName", header: "Student" },
      { key: "quotaName", header: "Quota" },
      { key: "course", header: "Course" },
      { key: "receiptDt", header: "Payment Date" },
      { key: "paymentReceiptsNo", header: "Receipt" },
      { key: "receiptAmount", header: "Amount" },
    ];

    const rowsWithIndex = filteredRows.map((row: AnyRow, idx: number) => ({
      ...row,
      siNo: idx + 1,
      course: courseCell(row),
      receiptDt: fmtDate(row.receiptDt),
    }));

    const tableHtml = buildHtmlTable(columns, rowsWithIndex);

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Library Fee Report</title>
  <style>
    @page {
      margin: 12mm;
    }

    body {
      font-family: Arial, sans-serif;
      padding: 12px;
      color: #111;
      margin: 0;
    }

    .header {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      margin-bottom: 16px;
    }

    .header img {
      width: 90px;
      height: auto;
      max-height: 100px;
      object-fit: contain;
    }

    .header-text {
      flex: 1;
    }

    .collegeName {
      font-size: 20px;
      font-weight: 600;
      margin: 0 0 6px;
    }

    .title {
      font-size: 18px;
      font-weight: 600;
      margin: 0 0 6px;
    }

    .details {
      font-size: 12px;
      color: #666;
      margin: 0 0 6px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
      margin-top: 8px;
    }

    th,
    td {
      border: 1px solid #333;
      padding: 6px 5px;
    }

    th {
      background: #f2f2f2;
      font-weight: 600;
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
      <p class="collegeName">
        ${escapeHtml(collegeLabel)}
      </p>

      ${dataDetails ? `<p class="details">${escapeHtml(dataDetails)}</p>` : ""}

      <p class="title">
        Library Fee Report
      </p>
    </div>
  </div>

  ${tableHtml}

</body>
</html>`;

    printHtmlInIframe(html);
  };
  const goBack = () => {
    router.push(resolveReportCatalogHref(searchParams.get("path")));
  };

  const pageTitle =
    showTable && dataDetails
      ? `Library Fee Report - ${dataDetails}`
      : "Library Fee Report";

  return (
    <FilteredListPage
      title={pageTitle}
      filterTitle="Library Fee Report"
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
              value={academicYearId || null}
              onChange={(v) => {
                setAcademicYearId(v ?? "");
                clearResults();
              }}
              options={ayOptions}
              placeholder="Academic Year"
            />
            <Select
              label="Quota"
              value={quotaId || null}
              onChange={(v) => {
                setQuotaId(v ?? "");
                clearResults();
              }}
              options={quotaOptions}
              placeholder="Quota"
            />
            <Select
              label="Course"
              value={courseId || null}
              onChange={(v) => {
                setCourseId(v ?? "");
                clearResults();
              }}
              options={courseOptions}
              placeholder="Course"
              disabled={!collegeId}
            />
            <Select
              label="Course Group"
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
              value={courseYearId || null}
              onChange={(v) => {
                setCourseYearId(v ?? "");
                clearResults();
              }}
              options={yearOptions}
              placeholder="Course Year"
              disabled={!courseGroupId}
            />
          </div>
          <div className="flex shrink-0 items-center gap-2">
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
              onClick={goBack}
            >
              Back
            </Button>
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
                  size="sm"
                  className="h-9 px-3 text-[12px]"
                  onClick={() => handlePrintReport()}
                >
                  <Printer className="mr-1.5 h-3.5 w-3.5" />
                  Print Report
                </Button>
              </div>
            </div>

            <div ref={excelTableRef} className="overflow-x-auto">
              <strong className="hidden">
                Library Fee Report - {dataDetails}
              </strong>
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-sky-50">
                    {[
                      "SI.No",
                      "Roll No.",
                      "Student",
                      "Quota",
                      "Course",
                      "Payment Date",
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
                  {filteredRows.map((row, i) => (
                    <tr key={`${row.paymentReceiptsNo ?? ""}-${i}`}>
                      <td className="border px-2 py-1 text-center">
                        {String(row.id ?? i + 1)}
                      </td>
                      <td className="border px-2 py-1">
                        {String(row.studentRollNo ?? "")}
                      </td>
                      <td className="border px-2 py-1">
                        {String(row.studentName ?? "")}
                      </td>
                      <td className="border px-2 py-1">
                        {String(row.quotaName ?? "")}
                      </td>
                      <td className="border px-2 py-1">
                        {courseCell(row)}{" "}
                        <span className="font-medium text-blue-600">
                          ({String(row.academicYear ?? "")})
                        </span>
                      </td>
                      <td className="border px-2 py-1">
                        {fmtDate(row.receiptDt)}
                      </td>
                      <td className="border px-2 py-1">
                        {String(row.paymentReceiptsNo ?? "")}
                      </td>
                      <td className="border px-2 py-1 text-center">
                        {String(row.receiptAmount ?? "")}
                      </td>
                    </tr>
                  ))}
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
