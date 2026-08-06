"use client";

/**
 * Scholarship Report / Scholarship Due List —
 * Angular `reports/admin-fee-reports/scholarship-due-list` parity.
 * Get List: `getAllRecords/s_rep_scholarship_duelist` (6 in_* params).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FileSpreadsheet, Printer } from "lucide-react";
import { Select } from "@/common/components/select";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { printHtmlInIframe } from "@/lib/print";
import { escapeHtml } from "@/common/export-html-table";
import { getErrorMessage } from "@/lib/errors";
import { resolveReportCatalogHref } from "@/lib/report-catalog";
import { toastError, toastInfo } from "@/lib/toast";
import {
  filterAcademicYears,
  filterColleges,
  filterCourses,
  pickNum,
  pickText,
  type FilterRow,
} from "@/app/(pages)/(protected)/accounts-and-fees/fee-masters/_lib/fee-master-filters";
import {
  fetchScholarshipDueList,
  getFeeMasterCollegeFilters,
} from "@/services";

type AnyRow = Record<string, unknown>;

type YearAmt = {
  year_name: string;
  scholarship_amount: number;
  total_amount_received: number;
  balance_amount: number;
};

type PivotRow = {
  rollNumber: string;
  firstName: string;
  applicationNo: string;
  courseDetails: string;
  amounts: number[];
};

const SELECT0 = { value: "0", label: "Select" };

function n(v: unknown): number {
  const x = Number(v ?? 0);
  return Number.isFinite(x) ? x : 0;
}

function normalizeYear(item: AnyRow): string {
  if (item.year !== undefined && item.year !== null) {
    const yNum = Number(item.year);
    if (!Number.isNaN(yNum) && yNum >= 1 && yNum <= 4) return String(yNum);
    if (!Number.isNaN(yNum)) return String(yNum);
  }
  if (item.Year !== undefined && item.Year !== null) {
    const raw = String(item.Year).trim();
    if (/^\d+$/.test(raw)) return raw;
    const r = raw.toUpperCase();
    if (r.includes("I YEAR") || r.includes("I SEM") || r === "1" || r === "I")
      return "1";
    if (
      r.includes("II YEAR") ||
      r.includes("II SEM") ||
      r === "2" ||
      r === "II"
    )
      return "2";
    if (
      r.includes("III YEAR") ||
      r.includes("III SEM") ||
      r === "3" ||
      r === "III"
    )
      return "3";
    if (
      r.includes("IV YEAR") ||
      r.includes("IV SEM") ||
      r === "4" ||
      r === "IV"
    )
      return "4";
    const match = raw.match(/\d/);
    if (match) return match[0];
  }
  return "";
}

function emptyFeeDue(studentItem: AnyRow): {
  rollNumber: string;
  firstName: string;
  applicationNo: string;
  courseDetails: string;
  feeAmountsByYear: YearAmt[];
} {
  const courseDetails = `${String(studentItem.course_code ?? "")}/${String(studentItem.group_code ?? "")}/${String(studentItem.course_year_code ?? "")}`;
  return {
    rollNumber: String(
      studentItem.roll_number ?? studentItem.rollNumber ?? "",
    ),
    firstName: String(
      studentItem.Student_Name ?? studentItem.firstName ?? "",
    ),
    applicationNo: String(
      studentItem.sch_application_no ?? studentItem.applicationNo ?? "",
    ),
    courseDetails,
    feeAmountsByYear: [
      {
        year_name: "1",
        balance_amount: 0,
        total_amount_received: 0,
        scholarship_amount: 0,
      },
      {
        year_name: "2",
        balance_amount: 0,
        total_amount_received: 0,
        scholarship_amount: 0,
      },
      {
        year_name: "3",
        balance_amount: 0,
        total_amount_received: 0,
        scholarship_amount: 0,
      },
      {
        year_name: "4",
        balance_amount: 0,
        total_amount_received: 0,
        scholarship_amount: 0,
      },
    ],
  };
}

function buildPivotRows(raw: AnyRow[]): PivotRow[] {
  const list: ReturnType<typeof emptyFeeDue>[] = [];
  const indexMap = new Map<string, number>();

  for (const s of raw) {
    const yearStr = normalizeYear(s);
    if (!yearStr) continue;

    const roll = String(s.roll_number ?? s.rollNumber ?? "");
    let idx = roll ? indexMap.get(roll) : undefined;
    if (idx == null) {
      list.push(emptyFeeDue(s));
      idx = list.length - 1;
      if (roll) indexMap.set(roll, idx);
    }

    const yearObj = list[idx].feeAmountsByYear.find(
      (y) => y.year_name === yearStr,
    );
    if (yearObj) {
      yearObj.scholarship_amount += n(s.scholarship_amount);
      yearObj.total_amount_received += n(s.total_amount_received);
      yearObj.balance_amount += n(s.balance_amount);
    }
  }

  return list.map((entry) => {
    const ordered = [...entry.feeAmountsByYear].sort(
      (a, b) => Number(a.year_name) - Number(b.year_name),
    );
    const amounts: number[] = [];
    for (const y of ordered) {
      amounts.push(y.scholarship_amount, y.total_amount_received, y.balance_amount);
    }
    return {
      rollNumber: entry.rollNumber,
      firstName: entry.firstName,
      applicationNo: entry.applicationNo,
      courseDetails: entry.courseDetails,
      amounts,
    };
  });
}

export default function ScholarshipDueListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const excelTableRef = useRef<HTMLDivElement>(null);

  const [filtersData, setFiltersData] = useState<FilterRow[]>([]);
  const [academicData, setAcademicData] = useState<FilterRow[]>([]);
  const [loadingFilters, setLoadingFilters] = useState(true);

  const [collegeId, setCollegeId] = useState<string | null>(null);
  const [academicYearId, setAcademicYearId] = useState<string>("0");
  const [courseId, setCourseId] = useState<string>("0");

  const [pivotRows, setPivotRows] = useState<PivotRow[]>([]);
  const [collegeCode, setCollegeCode] = useState("");
  const [academicYearCode, setAcademicYearCode] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [loadingList, setLoadingList] = useState(false);
  const [showTable, setShowTable] = useState(false);
  const [searchText, setSearchText] = useState("");

  const clearResults = useCallback(() => {
    setPivotRows([]);
    setShowTable(false);
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
    void getFeeMasterCollegeFilters(orgId, empId)
      .then((data) => {
        if (cancelled) return;
        setFiltersData((data.filtersData ?? []) as FilterRow[]);
        setAcademicData((data.academicData ?? []) as FilterRow[]);
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
      SELECT0,
      ...filterAcademicYears(academicData, cid || null, filtersData).map(
        (r) => ({
          value: String(pickNum(r, ["fk_academic_year_id", "academicYearId"])),
          label: pickText(r, ["academic_year", "academicYear"]) || "—",
        }),
      ),
    ];
  }, [academicData, collegeId, filtersData]);

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
      setAcademicYearId("0");
      setCourseId("0");
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
    const courses = courseOptions.filter((o) => o.value !== "0");
    if (courses.length === 0) {
      setCourseId("0");
      return;
    }
    setCourseId(courses[0].value);
  }, [collegeId, academicYearId]); // eslint-disable-line react-hooks/exhaustive-deps

  const onCollegeChange = (v: string | null) => {
    setCollegeId(v);
    setAcademicYearId("0");
    setCourseId("0");
    clearResults();
  };

  const handleGetList = async () => {
    const cid = Number(collegeId ?? 0);
    if (!cid) {
      toastInfo("College is required");
      return;
    }
    setLoadingList(true);
    clearResults();

    const clg = collegeOptions.find((o) => o.value === collegeId);
    setCollegeCode(clg?.label ?? "");
    const ay = ayOptions.find(
      (o) => o.value === academicYearId && o.value !== "0",
    );
    setAcademicYearCode(ay?.label ?? "");
    const cr = courseOptions.find((o) => o.value === courseId && o.value !== "0");
    setCourseCode(cr?.label ?? (Number(courseId) === 0 ? "All" : ""));

    try {
      const raw = await fetchScholarshipDueList({
        collegeId: cid,
        academicYearId: Number(academicYearId || 0),
        courseId: Number(courseId || 0),
        courseGroupId: 0,
        courseYearId: 0,
        studentId: 0,
      });
      if (raw.length === 0) {
        toastInfo("No scholarship due list records found.");
        return;
      }
      setPivotRows(buildPivotRows(raw));
      setShowTable(true);
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setLoadingList(false);
    }
  };

  const filteredRows = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return pivotRows;
    return pivotRows.filter(
      (r) =>
        r.firstName.toLowerCase().includes(q) ||
        r.rollNumber.toLowerCase().includes(q) ||
        r.applicationNo.toLowerCase().includes(q) ||
        r.courseDetails.toLowerCase().includes(q),
    );
  }, [pivotRows, searchText]);

  const dataDetails = [
    collegeCode,
    academicYearCode,
    courseCode,
  ]
    .filter(Boolean)
    .join(" / ");

  const exportAsExcel = () => {
    if (!excelTableRef.current) return;
    const uri = "data:application/vnd.ms-excel;base64,";
    const template = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>{worksheet}</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body><table>{table}</table></body></html>`;
    const base64 = (s: string) => window.btoa(unescape(encodeURIComponent(s)));
    const formatTpl = (s: string, c: Record<string, string>) =>
      s.replace(/{(\w+)}/g, (_, p: string) => c[p] ?? "");
    const link = document.createElement("a");
    link.download = "Scholarship Report.xls";
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
    printHtmlInIframe(`<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>Scholarship Report</title>
<style>
body{font-family:Arial,sans-serif;padding:16px;color:#111}
table{width:100%;border-collapse:collapse;font-size:11px}
th,td{border:1px solid #333;padding:3px 5px}
th{background:#e8f0fe}
</style></head><body>
<p style="font-weight:600">Scholarship Report${dataDetails ? ` — ${escapeHtml(dataDetails)}` : ""}</p>
${excelTableRef.current.innerHTML}
</body></html>`);
  };

  const goBack = () => {
    router.push(resolveReportCatalogHref(searchParams.get("path")));
  };

  const pageTitle = showTable
    ? `Scholarship Report - (${dataDetails})`
    : "Scholarship Report";

  return (
    <FilteredListPage
      title={pageTitle}
      filters={
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
                clearResults();
              }}
              options={ayOptions}
              placeholder="Academic Year"
            />
            <Select
              label="Course"
              value={courseId}
              onChange={(v) => {
                setCourseId(v ?? "0");
                clearResults();
              }}
              options={courseOptions}
              placeholder="Course"
              disabled={!collegeId}
            />
            <div className="flex items-end gap-2 pb-0.5">
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
                  onClick={printReport}
                >
                  <Printer className="mr-1.5 h-3.5 w-3.5" />
                  Print Report
                </Button>
              </div>
            </div>

            <div ref={excelTableRef} className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-sky-50">
                    <th
                      rowSpan={2}
                      className="border px-1 py-1 text-center font-semibold"
                    >
                      SI.No
                    </th>
                    <th
                      rowSpan={2}
                      className="border px-1 py-1 text-center font-semibold"
                    >
                      Application No.
                    </th>
                    <th
                      rowSpan={2}
                      className="border px-1 py-1 text-center font-semibold"
                    >
                      Student
                    </th>
                    <th
                      rowSpan={2}
                      className="border px-1 py-1 text-center font-semibold"
                    >
                      Course Details
                    </th>
                    {["1st Year", "2nd Year", "3rd Year", "4th Year"].map(
                      (y) => (
                        <th
                          key={y}
                          colSpan={3}
                          className="border px-1 py-1 text-center font-semibold"
                        >
                          {y}
                        </th>
                      ),
                    )}
                  </tr>
                  <tr className="bg-sky-50">
                    {Array.from({ length: 4 }).flatMap((_, yi) =>
                      ["Scholarship Amt", "Received Amt", "Balance Due"].map(
                        (h) => (
                          <th
                            key={`${yi}-${h}`}
                            className="border px-1 py-1 text-center font-semibold"
                          >
                            {h}
                          </th>
                        ),
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row, i) => (
                    <tr key={`${row.rollNumber}-${i}`}>
                      <td className="border px-1 py-1 text-center">{i + 1}</td>
                      <td className="border px-1 py-1">{row.applicationNo}</td>
                      <td className="border px-1 py-1">
                        {row.firstName}{" "}
                        <span className="text-blue-600">
                          ({row.rollNumber})
                        </span>
                      </td>
                      <td className="border px-1 py-1">{row.courseDetails}</td>
                      {row.amounts.map((amt, ai) => (
                        <td key={ai} className="border px-1 py-1 text-center">
                          {amt.toFixed(2)}
                        </td>
                      ))}
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
