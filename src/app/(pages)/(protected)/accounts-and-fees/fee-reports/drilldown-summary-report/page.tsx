"use client";

/**
 * Student Fee Report (Drilldown) —
 * Angular `accounts-and-fees/fee-reports/drilldown-summary-report` parity.
 * Drill-down via `getAllRecords/s_rep_fee_studentdetails` (`student_fee_details_*`).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileSpreadsheet, Printer } from "lucide-react";
import { CardHeadingTitle } from "@/common/components/data-display";
import { Select } from "@/common/components/select";
import { PageContainer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { MINIO_URL } from "@/config/constants/api";
import { useSessionContext } from "@/context/SessionContext";
import { DEFAULT_COLLEGE_LOGO } from "@/hooks/useCollegeLogo";
import { printHtmlInIframe } from "@/lib/print";
import { escapeHtml } from "@/common/export-html-table";
import { getErrorMessage } from "@/lib/errors";
import { toastError, toastInfo } from "@/lib/toast";
import {
  pickNum,
  pickText,
  type FilterRow,
} from "@/app/(pages)/(protected)/accounts-and-fees/fee-masters/_lib/fee-master-filters";
import {
  fetchFeeLedgerRows,
  fetchScholarshipDetailedSummary,
  getFeeMasterCollegeFilters,
  listOrganizations,
} from "@/services";

type AnyRow = Record<string, unknown>;

const DEFAULT_STUDENT_PHOTO = "/assets/images/avatars/default_Student.png";

type FeeYearGroup = { year: string; items: AnyRow[] };

function studentPhotoSrc(path: unknown): string {
  const raw = String(path ?? "").trim();
  if (!raw) return DEFAULT_STUDENT_PHOTO;
  if (/^(https?:\/\/|data:)/i.test(raw) || raw.startsWith("/")) return raw;
  const base = String(MINIO_URL ?? "").replace(/\/$/, "");
  return base ? `${base}/${raw.replace(/^\/+/, "")}` : raw;
}

function StudentParticularPhoto({ path }: { path?: unknown }) {
  const [failed, setFailed] = useState(false);
  const resolved = studentPhotoSrc(path);
  useEffect(() => {
    setFailed(false);
  }, [resolved]);
  const src = failed ? DEFAULT_STUDENT_PHOTO : resolved;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      className="mx-auto my-3.5 max-w-[86%] bg-[#c3d9ff] p-1.5"
      onError={() => setFailed(true)}
    />
  );
}

function groupFeeLedgersByYear(rows: AnyRow[]): FeeYearGroup[] {
  const map = new Map<string, AnyRow[]>();
  for (const row of rows) {
    const key = String(row.year ?? "");
    const list = map.get(key);
    if (list) list.push(row);
    else map.set(key, [row]);
  }
  return [...map.entries()].map(([year, items]) => ({ year, items }));
}

function formatLedgerAmt(input: unknown): string {
  if (input == null || input === "") return "-";
  return formatIndianNumber(input);
}

function htmlForFeeDrillPrint(root: HTMLElement): string {
  const clone = root.cloneNode(true) as HTMLElement;
  const expandCells = clone.querySelectorAll(".fee-drill-expand");
  const removedExpand = expandCells.length > 0;
  expandCells.forEach((el) => el.remove());
  if (removedExpand) {
    const label = clone.querySelector("[data-grand-total-label]");
    if (label instanceof HTMLTableCellElement) {
      const span = Number(label.getAttribute("colspan") ?? label.colSpan ?? 0);
      if (span > 1) label.colSpan = span - 1;
    }
  }
  return clone.innerHTML;
}

/**
 * Angular PrintData logo: `MINIO + organization.logoPath`.
 * Falls back to default placeholder when path is missing.
 */
function toOrgPrintLogoUrl(path: string | null | undefined): string {
  const raw = String(path ?? "").trim();
  if (!raw) {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return origin ? `${origin}${DEFAULT_COLLEGE_LOGO}` : DEFAULT_COLLEGE_LOGO;
  }
  if (/^(https?:\/\/|data:)/i.test(raw)) return raw;
  if (raw.startsWith("/")) {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return origin ? `${origin}${raw}` : raw;
  }
  const base = String(MINIO_URL ?? "").replace(/\/$/, "");
  return base ? `${base}/${raw.replace(/^\/+/, "")}` : raw;
}

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

/** Angular `.table-th` — single-line, vertically centered headers. */
const SUMMARY_TH =
  "border border-white bg-[#C3D9FF] px-1.5 py-1.5 text-center align-middle text-[13px] font-medium whitespace-nowrap";

function identifierHeaders(position: string): { type: string; value: string } {
  if (position === "student_name") {
    return { type: "Hall Ticket", value: "Name" };
  }
  if (position === "course_code") {
    return { type: "Type", value: "Course" };
  }
  if (position === "group_code") {
    return { type: "Type", value: "Group" };
  }
  if (position === "course_year_code") {
    return { type: "Type", value: "Year" };
  }
  return { type: "Type", value: "College" };
}

function annotateRows(
  rows: AnyRow[],
  flag: string,
  detailName: string,
  detailValue: string,
): AnyRow[] {
  return rows.map((x) => {
    if (flag === "student_fee_details_students") {
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

export default function DrilldownSummaryReportPage() {
  const { user } = useSessionContext();
  const orgId = Number(
    user?.organizationId ??
      globalThis?.localStorage?.getItem("organizationId") ??
      0,
  );
  const employeeId = Number(
    user?.employeeId ?? globalThis?.localStorage?.getItem("employeeId") ?? 0,
  );

  const [academicYear, setAcademicYear] = useState<string>("");
  const [summaryList, setSummaryList] = useState<AnyRow[]>([]);
  const [feeLedger, setFeeLedger] = useState<AnyRow[]>([]);
  const [scholarShipDetails, setScholarShipDetails] = useState<AnyRow[]>([]);
  const [steps, setSteps] = useState<DrillStep[]>([]);
  const [currentPosition, setCurrentPosition] = useState("");
  const [loading, setLoading] = useState(false);
  const excelTableRef = useRef<HTMLTableElement>(null);
  const printContentRef = useRef<HTMLDivElement>(null);
  const autoLoadedAy = useRef<string | null>(null);

  const filtersQuery = useQuery({
    queryKey: ["fee-reports", "student-fee-drilldown", orgId, employeeId],
    queryFn: () => getFeeMasterCollegeFilters(orgId, employeeId),
    enabled: orgId > 0 && employeeId > 0,
  });

  // Angular: Logo = organization.logoPath, display name = organization.orgName
  const orgsQuery = useQuery({
    queryKey: ["organizations", "student-fee-drilldown-print"],
    queryFn: listOrganizations,
    enabled: orgId > 0,
    staleTime: 5 * 60_000,
  });

  const orgPrintMeta = useMemo(() => {
    const org =
      (orgsQuery.data ?? []).find((o) => Number(o.organizationId) === orgId) ??
      null;
    return {
      orgName:
        org?.orgName?.trim() ||
        user?.collegeName?.trim() ||
        String(
          globalThis?.localStorage?.getItem("currentCollege") ?? "",
        ).trim() ||
        "",
      logoPath: org?.logoPath?.trim() || "",
    };
  }, [orgsQuery.data, orgId, user?.collegeName]);

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
        parseInt(pickText(b, ["academic_year", "academicYear"]) || "0", 10) -
        parseInt(pickText(a, ["academic_year", "academicYear"]) || "0", 10),
    );
    return [
      { value: "", label: "All" },
      ...distinct.map((a) => ({
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
    let gross = 0;
    let rtf = 0;
    let college = 0;
    let discount = 0;
    let net = 0;
    let paid = 0;
    let dueCollege = 0;
    let rtfReceived = 0;
    let dueRtf = 0;
    let balance = 0;
    for (const row of summaryList) {
      gross += n(row.total_gross_amount);
      rtf += n(row.total_rtf_amount);
      college += n(row.total_college_amount);
      discount += n(row.total_discount_amount);
      net += n(row.total_net_college_amount);
      paid += n(row.total_paid_amount);
      dueCollege += n(row.total_due_college_amount);
      rtfReceived += n(row.total_rtf_received);
      dueRtf += n(row.total_due_rtf_amount);
      balance += n(row.total_balance_amount);
    }
    return {
      gross,
      rtf,
      college,
      discount,
      net,
      paid,
      dueCollege,
      rtfReceived,
      dueRtf,
      balance,
    };
  }, [summaryList]);

  const groupedFeeLedgers = useMemo(
    () => groupFeeLedgersByYear(feeLedger),
    [feeLedger],
  );

  const ledgerTotals = useMemo(() => {
    let total = 0;
    let paid = 0;
    let discount = 0;
    let fine = 0;
    let balance = 0;
    let refund = 0;
    let scholar = 0;
    let scholarHold = 0;
    let dueRtfAmt = 0;
    let totalDue = 0;
    for (const row of feeLedger) {
      total += n(row.P_gross_amount);
      paid += n(row.Scholarship_Hold_Amount);
      discount += n(row.p_college_amount);
      fine += n(row.P_discount_amount);
      balance += n(row.P_net_amount);
      refund += n(row.P_paid_amount);
      scholar += n(row.P_college_due_amount);
      scholarHold += n(row.P_scholarship_amount);
      dueRtfAmt += n(row.P_due_rtf_amount);
      totalDue += n(row.P_balance_amount);
    }
    return {
      total,
      paid,
      discount,
      fine,
      balance,
      refund,
      scholar,
      scholarHold,
      dueRtfAmt,
      totalDue,
    };
  }, [feeLedger]);

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
      setFeeLedger([]);
      setScholarShipDetails([]);
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
        setCurrentPosition(
          args.detailValue === "college_code" ? "" : args.detailValue,
        );
        // Angular selectedStudent(): fee ledger photo + year-grouped particulars.
        if (args.detailValue === "student_particular" && args.studentId > 0) {
          const [ledger, scholarship] = await Promise.all([
            fetchFeeLedgerRows(
              { in_std_id: args.studentId },
              { resultIndex: 0 },
            ),
            fetchFeeLedgerRows(
              { in_std_id: args.studentId },
              { resultIndex: 1 },
            ),
          ]);
          setFeeLedger(ledger);
          setScholarShipDetails(scholarship);
        }
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
      flag: "student_fee_details_college",
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
  }, [academicYear, academicData.length, filtersQuery.isLoading, loadSummary]);

  const onAcademicYearChange = (v: string | null) => {
    const next = v ?? "";
    setAcademicYear(next);
    autoLoadedAy.current = null;
    setSteps([]);
    setCurrentPosition("");
    setSummaryList([]);
    setFeeLedger([]);
    setScholarShipDetails([]);
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
      const last = next[next.length - 1]!;
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
      flag: "student_fee_details_college",
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
    const courseId = n(row.fk_course_id);
    const courseGroupId = n(row.fk_course_group_id);
    const courseYearId = n(row.fk_course_year_id);
    const studentId = n(row.pk_student_id);
    const label = String(row.varaiableValue ?? "");

    if (currentPosition === "") {
      void drill(
        label,
        "student_fee_details_course",
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
        "student_fee_details_course_group",
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
        "student_fee_details_course_year",
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
        "student_fee_details_students",
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
        "student_fee_details_std_particular",
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
    link.download = "Student Fee Report.xls";
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
    const content = printContentRef.current;
    if (!content) return;
    const orgLabel = orgPrintMeta.orgName || "Organization";
    const titleLine = academicYear
      ? `Student Fee Report - (${academicYear})`
      : "Student Fee Report";
    const logoSrc = toOrgPrintLogoUrl(orgPrintMeta.logoPath);
    const trail = steps.map((s) => s.name).join(" > ");
    const tablesHtml = htmlForFeeDrillPrint(content);

    printHtmlInIframe(`<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>Student Fee Report</title>
<style>
@page{margin:12mm}
body{font-family:Arial,Helvetica,sans-serif;padding:12px;color:#111;margin:0;background:#fff}
.print-header{display:flex;align-items:flex-start;gap:16px;margin-bottom:10px}
.portraitLogo{
  height:90px;width:90px;min-width:90px;min-height:90px;
  object-fit:contain;display:block;flex-shrink:0
}
.print-header-text{flex:1;min-width:0}
.collegeName{text-align:left!important;font-size:24px;font-weight:550;margin:12px 0 2px;color:#000}
.title{text-align:left!important;font-size:18px;font-weight:550;margin:0 0 8px;color:#000}
.trail{font-size:12px;margin:0 0 8px;color:#0c51a4}
table{width:100%!important;border-collapse:collapse!important;font-size:11px;margin-bottom:12px}
th,td{border:1px solid #333!important;padding:4px 6px!important;text-align:center;vertical-align:middle}
th{background:#C3D9FF!important;font-weight:600;white-space:nowrap}
.print-student-info{text-align:center;font-size:12px}
.print-student-info p{margin:3px 0;font-weight:500}
.print-student-info img{max-width:120px;background:#c3d9ff;padding:6px}
</style></head><body>
<div class="print-header">
  <img src="${escapeHtml(logoSrc)}" alt="Organization Logo" class="portraitLogo" />
  <div class="print-header-text">
    <p class="collegeName">${escapeHtml(orgLabel)}</p>
    <p class="title">${escapeHtml(titleLine)}</p>
  </div>
</div>
${trail ? `<p class="trail">${escapeHtml(trail)}</p>` : ""}
${tablesHtml}
</body></html>`);
  };

  const isParticular = currentPosition === "student_particular";
  const isStudentName = currentPosition === "student_name";
  const canExpand = !isParticular;
  const amountColSpan = isParticular || isStudentName ? 5 : 4;
  const idHeaders = identifierHeaders(currentPosition);

  return (
    <PageContainer className="space-y-4">
      <div className="app-card app-card--mixed-content overflow-hidden">
        <div>
          <CardHeadingTitle>Student Fee Report</CardHeadingTitle>
        </div>
        <div className="p-4">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
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
            <div className="flex flex-wrap gap-2 pb-0.5">
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
                </div>
                {steps.length > 0 && (
                  <Button
                    type="button"
                    size="sm"
                    className="h-9 px-3 text-[12px]"
                    onClick={() => void goBack()}
                    disabled={loading}
                  >
                    Back
                  </Button>
                )}
              </div>
            )}
            <div ref={printContentRef} className="space-y-3">
              <div className="overflow-x-auto">
                <table
                  ref={excelTableRef}
                  className="min-w-full w-max border-collapse border-spacing-px text-sm"
                >
                  <thead>
                    <tr>
                      {!isParticular && (
                        <th className={`fee-drill-expand ${SUMMARY_TH}`}>
                          Expand
                        </th>
                      )}
                      <th className={SUMMARY_TH}>S.NO</th>
                      {isParticular ? (
                        <>
                          <th className={SUMMARY_TH}>Hall Ticket</th>
                          <th className={SUMMARY_TH}>Name</th>
                          <th className={SUMMARY_TH}>Category</th>
                        </>
                      ) : (
                        <>
                          <th className={SUMMARY_TH}>{idHeaders.type}</th>
                          <th className={SUMMARY_TH}>{idHeaders.value}</th>
                          {isStudentName && (
                            <th className={SUMMARY_TH}>Category</th>
                          )}
                        </>
                      )}
                      <th className={SUMMARY_TH}>Total Amount</th>
                      <th className={SUMMARY_TH}>RTF Amount</th>
                      <th className={SUMMARY_TH}>College Amount</th>
                      <th className={SUMMARY_TH}>College Discount</th>
                      <th className={SUMMARY_TH}>NET Amount</th>
                      <th className={SUMMARY_TH}>Paid Amount</th>
                      <th className={SUMMARY_TH}>Due College Amount</th>
                      <th className={SUMMARY_TH}>RTF Received</th>
                      <th className={SUMMARY_TH}>Due RTF Amount</th>
                      <th className={SUMMARY_TH}>Total Due</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading && (
                      <tr>
                        <td
                          colSpan={16}
                          className="border px-2 py-6 text-center text-muted-foreground"
                        >
                          Loading…
                        </td>
                      </tr>
                    )}
                    {!loading && summaryList.length === 0 && (
                      <tr>
                        <td
                          colSpan={16}
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
                          {!isParticular && (
                            <td className="fee-drill-expand border px-2 py-1.5 text-center">
                              {canExpand ? ">" : ""}
                            </td>
                          )}
                          <td className="border px-2 py-1.5 text-center">
                            {idx + 1}
                          </td>
                          {isParticular ? (
                            <>
                              <td className="border px-2 py-1.5 text-center">
                                {String(row.hallticket_number ?? "")}
                              </td>
                              <td className="border px-2 py-1.5 text-left">
                                {String(row.student_name ?? "")}
                              </td>
                              <td className="border px-2 py-1.5 text-left">
                                {String(row.fee_category_name ?? "")}
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="border px-2 py-1.5 text-center">
                                {String(row.varaiableName ?? "")}
                              </td>
                              <td className="border px-2 py-1.5 text-center">
                                {String(row.varaiableValue ?? "")}
                              </td>
                              {isStudentName && (
                                <td className="border px-2 py-1.5 text-left">
                                  {String(
                                    row.fee_category_name ??
                                      row.scholarship_type ??
                                      "",
                                  )}
                                </td>
                              )}
                            </>
                          )}
                          <td className="border px-2 py-1.5 text-center">
                            {formatIndianNumber(row.total_gross_amount)}
                          </td>
                          <td className="border px-2 py-1.5 text-center">
                            {formatIndianNumber(row.total_rtf_amount)}
                          </td>
                          <td className="border px-2 py-1.5 text-center">
                            {formatIndianNumber(row.total_college_amount)}
                          </td>
                          <td className="border px-2 py-1.5 text-center">
                            {formatIndianNumber(row.total_discount_amount)}
                          </td>
                          <td className="border px-2 py-1.5 text-center">
                            {formatIndianNumber(row.total_net_college_amount)}
                          </td>
                          <td className="border px-2 py-1.5 text-center">
                            {formatIndianNumber(row.total_paid_amount)}
                          </td>
                          <td className="border px-2 py-1.5 text-center">
                            {formatIndianNumber(row.total_due_college_amount)}
                          </td>
                          <td className="border px-2 py-1.5 text-center">
                            {formatIndianNumber(row.total_rtf_received)}
                          </td>
                          <td className="border px-2 py-1.5 text-center">
                            {formatIndianNumber(row.total_due_rtf_amount)}
                          </td>
                          <td className="border px-2 py-1.5 text-center">
                            {formatIndianNumber(row.total_balance_amount)}
                          </td>
                        </tr>
                      ))}
                    {!loading && summaryList.length > 0 && !isParticular && (
                      <tr className="font-medium">
                        <td
                          data-grand-total-label
                          className="border px-2 py-1.5 text-center"
                          colSpan={amountColSpan}
                        >
                          Grand Total
                        </td>
                        <td className="border px-2 py-1.5 text-center">
                          {formatIndianNumber(totals.gross)}
                        </td>
                        <td className="border px-2 py-1.5 text-center">
                          {formatIndianNumber(totals.rtf)}
                        </td>
                        <td className="border px-2 py-1.5 text-center">
                          {formatIndianNumber(totals.college)}
                        </td>
                        <td className="border px-2 py-1.5 text-center">
                          {formatIndianNumber(totals.discount)}
                        </td>
                        <td className="border px-2 py-1.5 text-center">
                          {formatIndianNumber(totals.net)}
                        </td>
                        <td className="border px-2 py-1.5 text-center">
                          {formatIndianNumber(totals.paid)}
                        </td>
                        <td className="border px-2 py-1.5 text-center">
                          {formatIndianNumber(totals.dueCollege)}
                        </td>
                        <td className="border px-2 py-1.5 text-center">
                          {formatIndianNumber(totals.rtfReceived)}
                        </td>
                        <td className="border px-2 py-1.5 text-center">
                          {formatIndianNumber(totals.dueRtf)}
                        </td>
                        <td className="border px-2 py-1.5 text-center">
                          {formatIndianNumber(totals.balance)}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {isParticular ? (
                <div className="overflow-hidden rounded-sm border border-black/10 bg-white shadow-[0_2px_4px_rgba(0,0,0,0.12)]">
                  <div className="flex items-center gap-2 border-b border-[#ffcf46] px-3 py-2">
                    <span
                      className="material-icons text-[20px] text-[#042956]"
                      aria-hidden
                    >
                      computer
                    </span>
                    <span className="text-[15px] font-semibold text-[#042956]">
                      Student Details
                    </span>
                  </div>
                  <div className="flex flex-col gap-2 p-2 md:flex-row md:items-start">
                    <div className="print-student-info w-full shrink-0 px-2.5 pb-3 text-center md:w-[18%]">
                      <StudentParticularPhoto
                        path={
                          feeLedger[0]?.student_photo_path ??
                          summaryList[0]?.student_photo_path
                        }
                      />
                      <p className="m-1 font-medium text-[#c76d2f]">
                        {String(
                          feeLedger[0]?.student_name ??
                            summaryList[0]?.student_name ??
                            "",
                        )}
                      </p>
                      <p className="m-1 font-medium text-[#8c8c8c]">
                        {String(summaryList[0]?.hallticket_number ?? "")}
                      </p>
                      <p className="m-1 font-medium text-[#8c8c8c]">
                        {String(
                          feeLedger[0]?.Current_Academic_Details ??
                            feeLedger[0]?.current_academic_details ??
                            "",
                        )}
                      </p>
                      <p className="m-1 font-medium text-[#8c8c8c]">
                        {String(feeLedger[0]?.student_mobile ?? "")}
                      </p>
                      {feeLedger[0]?.student_quota != null &&
                      String(feeLedger[0].student_quota) !== "" ? (
                        <span className="font-semibold text-blue-700">
                          {String(feeLedger[0].student_quota)}
                        </span>
                      ) : null}
                      {scholarShipDetails[0]?.scholarship_type_code != null &&
                      String(scholarShipDetails[0].scholarship_type_code) !==
                        "" ? (
                        <span className="ml-1 font-semibold text-blue-700">
                          {String(scholarShipDetails[0].scholarship_type_code)}
                        </span>
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1 overflow-x-auto py-2">
                      <table className="w-full border-collapse border-spacing-px text-sm">
                        <thead>
                          <tr>
                            <th
                              rowSpan={2}
                              className={`${SUMMARY_TH} align-middle`}
                            >
                              Year
                            </th>
                            <th
                              rowSpan={2}
                              className={`${SUMMARY_TH} align-middle`}
                            >
                              Particulars
                            </th>
                            <th colSpan={10} className={SUMMARY_TH}>
                              Amount
                            </th>
                          </tr>
                          <tr>
                            {[
                              "Total Amount",
                              "RTF Amount",
                              "College Amount",
                              "College Discount",
                              "NET Amount",
                              "Paid Amount",
                              "Due College Amount",
                              "RTF Received",
                              "Due RTF Amount",
                              "Total Due",
                            ].map((h) => (
                              <th key={h} className={SUMMARY_TH}>
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {groupedFeeLedgers.map((group) =>
                            group.items.map((item, i) => (
                              <tr
                                key={`${group.year}-${i}`}
                                className="odd:bg-[#eaf2ff]"
                              >
                                {i === 0 ? (
                                  <td
                                    rowSpan={group.items.length}
                                    className="border px-2 py-2 text-center align-middle font-medium"
                                  >
                                    {group.year}
                                  </td>
                                ) : null}
                                <td className="border px-2 py-1.5 font-medium text-[#c76d2f]">
                                  {String(item.fee_category_name ?? "")}
                                </td>
                                <td className="border px-2 py-1.5 text-right">
                                  {formatLedgerAmt(item.P_gross_amount)}
                                </td>
                                <td className="border px-2 py-1.5 text-right">
                                  {formatLedgerAmt(
                                    item.Scholarship_Hold_Amount,
                                  )}
                                </td>
                                <td className="border px-2 py-1.5 text-right">
                                  {formatLedgerAmt(item.p_college_amount)}
                                </td>
                                <td className="border px-2 py-1.5 text-right">
                                  {formatLedgerAmt(item.P_discount_amount)}
                                </td>
                                <td className="border px-2 py-1.5 text-right">
                                  {formatLedgerAmt(item.P_net_amount)}
                                </td>
                                <td className="border px-2 py-1.5 text-right">
                                  {formatLedgerAmt(item.P_paid_amount)}
                                </td>
                                <td className="border px-2 py-1.5 text-right">
                                  {formatLedgerAmt(item.P_college_due_amount)}
                                </td>
                                <td className="border px-2 py-1.5 text-right">
                                  {formatLedgerAmt(item.P_scholarship_amount)}
                                </td>
                                <td className="border px-2 py-1.5 text-right">
                                  {formatLedgerAmt(item.P_due_rtf_amount)}
                                </td>
                                <td className="border px-2 py-1.5 text-right">
                                  {formatLedgerAmt(item.P_balance_amount)}
                                </td>
                              </tr>
                            )),
                          )}
                          {groupedFeeLedgers.length > 0 ? (
                            <tr className="font-medium">
                              <td
                                colSpan={2}
                                className="border px-2 py-1.5 text-center"
                              >
                                Total
                              </td>
                              <td className="border px-2 py-1.5 text-right">
                                {formatIndianNumber(ledgerTotals.total)}
                              </td>
                              <td className="border px-2 py-1.5 text-right">
                                {formatIndianNumber(ledgerTotals.paid)}
                              </td>
                              <td className="border px-2 py-1.5 text-right">
                                {formatIndianNumber(ledgerTotals.discount)}
                              </td>
                              <td className="border px-2 py-1.5 text-right">
                                {formatIndianNumber(ledgerTotals.fine)}
                              </td>
                              <td className="border px-2 py-1.5 text-right">
                                {formatIndianNumber(ledgerTotals.balance)}
                              </td>
                              <td className="border px-2 py-1.5 text-right">
                                {formatIndianNumber(ledgerTotals.refund)}
                              </td>
                              <td className="border px-2 py-1.5 text-right">
                                {formatIndianNumber(ledgerTotals.scholar)}
                              </td>
                              <td className="border px-2 py-1.5 text-right">
                                {formatIndianNumber(ledgerTotals.scholarHold)}
                              </td>
                              <td className="border px-2 py-1.5 text-right">
                                {formatIndianNumber(ledgerTotals.dueRtfAmt)}
                              </td>
                              <td className="border px-2 py-1.5 text-right">
                                {formatIndianNumber(ledgerTotals.totalDue)}
                              </td>
                            </tr>
                          ) : null}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
