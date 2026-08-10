"use client";

/**
 * Scholarship Detailed Report —
 * Angular `accounts-and-fees/fee-reports/scholarship-detailed-report` parity.
 * Drill-down via `getAllRecords/s_rep_fee_studentdetails` (`student_sch_details_*`).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileSpreadsheet, Printer } from "lucide-react";
import { Select } from "@/common/components/select";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { printHtmlInIframe } from "@/lib/print";
import { escapeHtml } from "@/common/export-html-table";
import { getErrorMessage } from "@/lib/errors";
import { QK } from "@/lib/query-keys";
import { toastError, toastInfo } from "@/lib/toast";
import {
  pickNum,
  pickText,
  type FilterRow,
} from "@/app/(pages)/(protected)/accounts-and-fees/fee-masters/_lib/fee-master-filters";
import {
  fetchScholarshipDetailedSummary,
  getFeeMasterCollegeFilters,
} from "@/services";

type AnyRow = Record<string, unknown>;

type DrillStep = {
  id: number;
  name: string;
  flag: string;
  collegeId: number;
  academicYear: string | number;
  courseId: number;
  courseGroupId: number;
  courseYearId: number;
  studentId: number;
  categoryCode: string;
  particularCode: string;
  detailName: string;
  detailValue: string;
};

function formatIndianNumber(input: unknown): string {
  if (input == null || input === "") return "0";
  const num = Number(input);
  if (Number.isNaN(num)) return String(input);
  const isNegative = num < 0;
  const abs = Math.abs(num).toString();
  const [intPart, decPart] = abs.split(".");
  const lastThree = intPart.substring(intPart.length - 3);
  const other = intPart.substring(0, intPart.length - 3);
  const withCommas =
    (other !== "" ? other.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," : "") +
    lastThree;
  const out = decPart != null ? `${withCommas}.${decPart}` : withCommas;
  return isNegative ? `-${out}` : out;
}

function n(v: unknown): number {
  const x = Number(v ?? 0);
  return Number.isFinite(x) ? x : 0;
}

function annotateRows(
  rows: AnyRow[],
  flag: string,
  detailName: string,
  detailValue: string,
): AnyRow[] {
  return rows.map((x) => {
    if (flag === "student_sch_details_students") {
      return {
        ...x,
        varaiableName: x.hallticket_number,
        varaiableValue: x[detailValue],
      };
    }
    return {
      ...x,
      varaiableName: detailName,
      varaiableValue: x[detailValue],
    };
  });
}

export default function ScholarshipDetailedReportPage() {
  const orgId = Number(
    globalThis?.localStorage?.getItem("organizationId") ?? 0,
  );
  const employeeId = Number(
    globalThis?.localStorage?.getItem("employeeId") ?? 0,
  );

  const [academicYear, setAcademicYear] = useState<string>("");
  const [summaryList, setSummaryList] = useState<AnyRow[]>([]);
  const [steps, setSteps] = useState<DrillStep[]>([]);
  const [currentPosition, setCurrentPosition] = useState("");
  const [scholarShipTypeCode, setScholarShipTypeCode] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const excelTableRef = useRef<HTMLTableElement>(null);
  const autoLoadedAy = useRef<string | null>(null);

  const filtersQuery = useQuery({
    queryKey: QK.feesCollection.scholarshipDetailedReport.filters(
      orgId,
      employeeId,
    ),
    queryFn: () => getFeeMasterCollegeFilters(orgId, employeeId),
    enabled: orgId > 0 && employeeId > 0,
  });

  const academicData = useMemo(
    () => (filtersQuery.data?.academicData ?? []) as FilterRow[],
    [filtersQuery.data?.academicData],
  );

  const ayOptions = useMemo(() => {
    const seen = new Set<string>();
    const distinct: FilterRow[] = [];
    for (const row of academicData) {
      const ay = pickText(row, ["academic_year", "academicYear"]);
      if (!ay || seen.has(ay)) continue;
      seen.add(ay);
      distinct.push(row);
    }
    distinct.sort(
      (a, b) =>
        n(pickNum(b, ["is_curr_ay", "isCurrAy"])) -
        n(pickNum(a, ["is_curr_ay", "isCurrAy"])),
    );
    const currentFirst = [...distinct];
    currentFirst.sort(
      (a, b) =>
        parseInt(pickText(b, ["academic_year", "academicYear"]) || "0", 10) -
        parseInt(pickText(a, ["academic_year", "academicYear"]) || "0", 10),
    );
    return [
      { value: "", label: "All" },
      ...currentFirst.map((a) => ({
        value: pickText(a, ["academic_year", "academicYear"]),
        label: pickText(a, ["academic_year", "academicYear"]) || "—",
      })),
    ];
  }, [academicData]);

  const defaultAy = useMemo(() => {
    if (academicData.length === 0) return "";
    const sorted = [...academicData].sort(
      (a, b) =>
        n(pickNum(b, ["is_curr_ay", "isCurrAy"])) -
        n(pickNum(a, ["is_curr_ay", "isCurrAy"])),
    );
    return pickText(sorted[0], ["academic_year", "academicYear"]);
  }, [academicData]);

  const totals = useMemo(() => {
    let applied = 0;
    let received = 0;
    let due = 0;
    for (const row of summaryList) {
      applied += n(row.total_scholarship_applied);
      received += n(row.total_scholarship_received);
      due += n(row.total_scholarship_due);
    }
    return { applied, received, due };
  }, [summaryList]);

  const loadSummary = useCallback(
    async (args: {
      flag: string;
      collegeId: number;
      academicYear: string | number;
      courseId: number;
      courseGroupId: number;
      courseYearId: number;
      studentId: number;
      categoryCode: string;
      particularCode: string;
      detailName: string;
      detailValue: string;
    }) => {
      setLoading(true);
      setSummaryList([]);
      try {
        const rows = await fetchScholarshipDetailedSummary({
          flag: args.flag,
          collegeId: args.collegeId,
          academicYear: args.academicYear || 0,
          courseId: args.courseId,
          courseGroupId: args.courseGroupId,
          courseYearId: args.courseYearId,
          loginUserEmpId: employeeId,
          studentId: args.studentId,
          categoryCode: args.categoryCode,
          particularCode: args.particularCode,
        });
        const annotated = annotateRows(
          rows,
          args.flag,
          args.detailName,
          args.detailValue,
        );
        setSummaryList(annotated);
        setScholarShipTypeCode(annotated[0]?.scholarship_type ?? null);
        setCurrentPosition(args.detailValue === "college_code" ? "" : args.detailValue);
        if (annotated.length === 0) toastInfo("No records found.");
      } catch (err) {
        toastError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    },
    [employeeId],
  );

  useEffect(() => {
    if (!defaultAy || academicYear !== "") return;
    if (autoLoadedAy.current !== null) return;
    setAcademicYear(defaultAy);
  }, [defaultAy, academicYear]);

  useEffect(() => {
    if (filtersQuery.isLoading) return;
    if (academicData.length === 0 && academicYear === "") return;
    if (autoLoadedAy.current === academicYear) return;
    autoLoadedAy.current = academicYear;
    setSteps([]);
    void loadSummary({
      flag: "student_sch_details_college",
      collegeId: 0,
      academicYear,
      courseId: 0,
      courseGroupId: 0,
      courseYearId: 0,
      studentId: 0,
      categoryCode: "",
      particularCode: "",
      detailName: "College",
      detailValue: "college_code",
    });
  }, [
    academicYear,
    academicData.length,
    filtersQuery.isLoading,
    loadSummary,
  ]);

  const onAcademicYearChange = (v: string | null) => {
    const next = v ?? "";
    setAcademicYear(next);
    autoLoadedAy.current = null;
    setSteps([]);
    setCurrentPosition("");
    setSummaryList([]);
  };

  const drill = async (
    name: string,
    flag: string,
    collegeId: number,
    courseId: number,
    courseGroupId: number,
    courseYearId: number,
    studentId: number,
    detailName: string,
    detailValue: string,
    mode: "add" | "back",
  ) => {
    await loadSummary({
      flag,
      collegeId,
      academicYear,
      courseId,
      courseGroupId,
      courseYearId,
      studentId,
      categoryCode: "",
      particularCode: "",
      detailName,
      detailValue,
    });
    if (mode === "add") {
      setSteps((prev) => [
        ...prev,
        {
          id: prev.length + 1,
          name,
          flag,
          collegeId,
          academicYear,
          courseId,
          courseGroupId,
          courseYearId,
          studentId,
          categoryCode: "",
          particularCode: "",
          detailName,
          detailValue,
        },
      ]);
    }
  };

  const goBack = async () => {
    const next = steps.slice(0, -1);
    setSteps(next);
    if (next.length > 0) {
      const last = next[next.length - 1];
      await loadSummary({
        flag: last.flag,
        collegeId: last.collegeId,
        academicYear: last.academicYear,
        courseId: last.courseId,
        courseGroupId: last.courseGroupId,
        courseYearId: last.courseYearId,
        studentId: last.studentId,
        categoryCode: last.categoryCode,
        particularCode: last.particularCode,
        detailName: last.detailName,
        detailValue: last.detailValue,
      });
      return;
    }
    await loadSummary({
      flag: "student_sch_details_college",
      collegeId: 0,
      academicYear,
      courseId: 0,
      courseGroupId: 0,
      courseYearId: 0,
      studentId: 0,
      categoryCode: "",
      particularCode: "",
      detailName: "College",
      detailValue: "college_code",
    });
    setCurrentPosition("");
  };

  const onRowExpand = (row: AnyRow) => {
    const collegeId = n(row.fk_college_id);
    const ay = String(row.academic_year ?? academicYear ?? "");
    const courseId = n(row.fk_course_id);
    const courseGroupId = n(row.fk_course_group_id);
    const courseYearId = n(row.fk_course_year_id);
    const studentId = n(row.pk_student_id);
    const label = String(row.varaiableValue ?? "");

    if (currentPosition === "") {
      void drill(
        label,
        "student_sch_details_course",
        collegeId,
        0,
        0,
        0,
        0,
        "Course",
        "course_code",
        "add",
      );
      return;
    }
    if (currentPosition === "course_code") {
      void drill(
        label,
        "student_sch_details_course_group",
        collegeId,
        courseId,
        0,
        0,
        0,
        "Course Group",
        "group_code",
        "add",
      );
      return;
    }
    if (currentPosition === "group_code") {
      void drill(
        label,
        "student_sch_details_course_year",
        collegeId,
        courseId,
        courseGroupId,
        0,
        0,
        "Course Year",
        "course_year_code",
        "add",
      );
      return;
    }
    if (currentPosition === "course_year_code") {
      void drill(
        label,
        "student_sch_details_students",
        collegeId,
        courseId,
        courseGroupId,
        courseYearId,
        0,
        "Student",
        "student_name",
        "add",
      );
      return;
    }
    if (currentPosition === "student_name") {
      void drill(
        label,
        "student_sch_details_std_particular",
        collegeId,
        courseId,
        courseGroupId,
        courseYearId,
        studentId,
        "Student",
        "student_particular",
        "add",
      );
    }
  };

  const exportAsExcel = () => {
    if (!excelTableRef.current) return;
    const uri = "data:application/vnd.ms-excel;base64,";
    const template = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>{worksheet}</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body><table>{table}</table></body></html>`;
    const base64 = (s: string) => window.btoa(unescape(encodeURIComponent(s)));
    const formatTpl = (s: string, c: Record<string, string>) =>
      s.replace(/{(\w+)}/g, (_, p: string) => c[p] ?? "");
    const link = document.createElement("a");
    link.download = "ScholarShip Detailed Report.xls";
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
<html><head><meta charset="utf-8"/><title>Scholarship Detailed Report</title>
<style>
body{font-family:Arial,sans-serif;padding:16px;color:#111}
table{width:100%;border-collapse:collapse;font-size:11px}
th,td{border:1px solid #333;padding:3px 5px;text-align:center}
th{background:#e8f0fe}
</style></head><body>
<p style="font-weight:600">Scholarship Detailed Report${academicYear ? ` — ${escapeHtml(academicYear)}` : ""}</p>
${excelTableRef.current.outerHTML}
</body></html>`);
  };

  const showCount =
    currentPosition !== "student_name" &&
    currentPosition !== "student_particular";
  const showCategory =
    currentPosition === "student_name" ||
    currentPosition === "student_particular";
  const canExpand = currentPosition !== "student_particular";

  return (
    <FilteredListPage
      title="Scholarship Detailed Report"
      filters={
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[180px] flex-1 sm:max-w-[220px]">
            <Select
              label="Academic Year"
              value={academicYear}
              onChange={onAcademicYearChange}
              options={ayOptions}
              placeholder="Academic Year"
              isLoading={filtersQuery.isLoading}
            />
          </div>
          <div className="flex gap-2 pb-0.5">
            <Button
              type="button"
              size="sm"
              className="h-9 px-3 text-[12px]"
              disabled={summaryList.length === 0}
              onClick={exportAsExcel}
            >
              <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
              Export Excel
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-9 px-3 text-[12px]"
              disabled={summaryList.length === 0}
              onClick={printReport}
            >
              <Printer className="mr-1.5 h-3.5 w-3.5" />
              Print Report
            </Button>
          </div>
        </div>
      }
      body={
        <div className="space-y-3">
          {(steps.length > 0 || loading) && (
            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
              <div className="text-sm text-muted-foreground">
                {steps.map((s, i) => (
                  <span key={s.id}>
                    {s.name}
                    {i < steps.length - 1 ? " > " : ""}
                  </span>
                ))}
                {currentPosition === "student_particular" &&
                  scholarShipTypeCode != null && (
                    <span> &nbsp; - &nbsp; {String(scholarShipTypeCode)}</span>
                  )}
              </div>
              {steps.length > 0 && (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => void goBack()}
                  disabled={loading}
                >
                  Back
                </Button>
              )}
            </div>
          )}
          <div className="overflow-x-auto">
            <table
              ref={excelTableRef}
              className="w-full border-collapse text-sm"
            >
              <thead>
                <tr className="bg-muted/50">
                  <th className="border px-2 py-1.5 text-center">Expand</th>
                  <th className="border px-2 py-1.5" />
                  <th className="border px-2 py-1.5" />
                  {showCategory && (
                    <th className="border px-2 py-1.5 text-center">Category</th>
                  )}
                  {showCount && (
                    <th className="border px-2 py-1.5 text-center">
                      ScholarShip Students Count
                    </th>
                  )}
                  <th className="border px-2 py-1.5 text-center">
                    Total Scholarship Applied
                  </th>
                  <th className="border px-2 py-1.5 text-center">
                    Total Scholarship Received
                  </th>
                  <th className="border px-2 py-1.5 text-center">
                    Total Scholarship Due
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td
                      colSpan={showCategory || showCount ? 7 : 6}
                      className="border px-2 py-6 text-center text-muted-foreground"
                    >
                      Loading…
                    </td>
                  </tr>
                )}
                {!loading && summaryList.length === 0 && (
                  <tr>
                    <td
                      colSpan={showCategory || showCount ? 7 : 6}
                      className="border px-2 py-6 text-center text-muted-foreground"
                    >
                      No records
                    </td>
                  </tr>
                )}
                {!loading &&
                  summaryList.map((row, idx) => (
                    <tr
                      key={idx}
                      className={
                        canExpand
                          ? "cursor-pointer hover:bg-muted/40"
                          : undefined
                      }
                      onClick={() => {
                        if (canExpand) onRowExpand(row);
                      }}
                    >
                      <td className="border px-2 py-1.5 text-center">
                        {canExpand ? ">" : ""}
                      </td>
                      <td className="border px-2 py-1.5 text-center">
                        {String(row.varaiableName ?? "")}
                      </td>
                      <td
                        className={`border px-2 py-1.5 ${
                          currentPosition === "student_particular"
                            ? "text-left"
                            : "text-center"
                        }`}
                      >
                        {currentPosition === "student_particular"
                          ? String(row.student_name ?? "")
                          : String(row.varaiableValue ?? "")}
                      </td>
                      {currentPosition === "student_name" && (
                        <td className="border px-2 py-1.5 text-left">
                          {String(row.scholarship_type ?? "")}
                        </td>
                      )}
                      {currentPosition === "student_particular" && (
                        <td className="border px-2 py-1.5 text-left">
                          {String(row.fee_category_name ?? "")}
                        </td>
                      )}
                      {showCount && (
                        <td className="border px-2 py-1.5 text-center">
                          {row.scholarship_student_count != null
                            ? String(row.scholarship_student_count)
                            : ""}
                        </td>
                      )}
                      <td className="border px-2 py-1.5 text-center">
                        {formatIndianNumber(row.total_scholarship_applied)}
                      </td>
                      <td className="border px-2 py-1.5 text-center">
                        {formatIndianNumber(row.total_scholarship_received)}
                      </td>
                      <td className="border px-2 py-1.5 text-center">
                        {formatIndianNumber(row.total_scholarship_due)}
                      </td>
                    </tr>
                  ))}
                {!loading && summaryList.length > 0 && (
                  <tr className="font-medium">
                    <td
                      className="border px-2 py-1.5 text-center"
                      colSpan={4}
                    >
                      Grand Total
                    </td>
                    <td className="border px-2 py-1.5 text-center">
                      {formatIndianNumber(totals.applied)}
                    </td>
                    <td className="border px-2 py-1.5 text-center">
                      {formatIndianNumber(totals.received)}
                    </td>
                    <td className="border px-2 py-1.5 text-center">
                      {formatIndianNumber(totals.due)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      }
    />
  );
}
