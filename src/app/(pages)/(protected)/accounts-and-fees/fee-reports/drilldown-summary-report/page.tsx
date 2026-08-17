"use client";

/**
 * Student Fee Report (Drilldown) —
 * Angular `accounts-and-fees/fee-reports/drilldown-summary-report` parity.
 * Drill-down via `getAllRecords/s_rep_fee_studentdetails` (`student_fee_details_*`).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileSpreadsheet, Monitor, Printer } from "lucide-react";
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
  buildStudentFeeParticularGroups,
  fetchFeeLedgerRows,
  fetchScholarshipDetailedSummary,
  getFeeMasterCollegeFilters,
  listOrganizations,
  type StudentFeeParticularGroup,
} from "@/services";

type AnyRow = Record<string, unknown>;

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

/** Angular `function(input)` — dash when empty, else Indian grouping. */
function printAmt(v: unknown): string {
  if (v == null || v === "") return "-";
  return escapeHtml(formatIndianNumber(v));
}

const DRILL_AMOUNT_HEADERS = [
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
] as const;

const DRILL_AMOUNT_KEYS = [
  "total_gross_amount",
  "total_rtf_amount",
  "total_college_amount",
  "total_discount_amount",
  "total_net_college_amount",
  "total_paid_amount",
  "total_due_college_amount",
  "total_rtf_received",
  "total_due_rtf_amount",
  "total_balance_amount",
] as const;

type DrillTotals = {
  gross: number;
  rtf: number;
  college: number;
  discount: number;
  net: number;
  paid: number;
  dueCollege: number;
  rtfReceived: number;
  dueRtf: number;
  balance: number;
};

/**
 * Angular print/excel table (no Expand). Screen table keeps Expand.
 * Print thead: S.NO + (blank, blank) or (Student, Category) + amount cols.
 */
function buildDrilldownExportTableHtml(args: {
  currentPosition: string;
  rows: AnyRow[];
  totals: DrillTotals;
  steps: { name: string }[];
}): string {
  const isParticular = args.currentPosition === "student_particular";
  const identHeads = isParticular
    ? `<th class="table-th">Student</th><th class="table-th">Category</th>`
    : `<th class="table-th"></th><th class="table-th"></th>`;
  const amountHeads = DRILL_AMOUNT_HEADERS.map(
    (h) => `<th class="table-th">${h}</th>`,
  ).join("");

  const body = args.rows
    .map((row, i) => {
      const ident = isParticular
        ? `<td class="table-td">${escapeHtml(studentParticularLabel(row.student_name, row.hallticket_number))}</td><td class="table-td">${escapeHtml(String(row.fee_category_name ?? ""))}</td>`
        : `<td class="table-td">${escapeHtml(String(row.varaiableName ?? ""))}</td><td class="table-td">${escapeHtml(String(row.varaiableValue ?? ""))}</td>`;
      const amts = DRILL_AMOUNT_KEYS.map(
        (k) => `<td class="table-td">${printAmt(row[k])}</td>`,
      ).join("");
      return `<tr><td class="table-td">${i + 1}</td>${ident}${amts}</tr>`;
    })
    .join("");

  const totalVals = [
    args.totals.gross,
    args.totals.rtf,
    args.totals.college,
    args.totals.discount,
    args.totals.net,
    args.totals.paid,
    args.totals.dueCollege,
    args.totals.rtfReceived,
    args.totals.dueRtf,
    args.totals.balance,
  ]
    .map((v) => `<td class="table-td">${printAmt(v)}</td>`)
    .join("");

  const grand = isParticular
    ? ""
    : `<tr><td class="table-td" colspan="3">Grand Total</td>${totalVals}</tr>`;

  const crumb =
    args.steps.length > 0
      ? `<div class="drilldown">${args.steps
          .map(
            (s, i) =>
              `${escapeHtml(s.name)}${i < args.steps.length - 1 ? " &gt; " : ""}`,
          )
          .join("")}</div>`
      : "";

  return `${crumb}<table class="mar">
<thead><tr><th class="table-th">S.NO</th>${identHeads}${amountHeads}</tr></thead>
<tbody>${body}${grand}</tbody>
</table>`;
}

const DEFAULT_STUDENT_PHOTO = "/assets/images/avatars/default_Student.png";

function displayHt(ht: unknown): string {
  if (ht == null || ht === "" || ht === "null" || ht === "undefined") return "";
  return String(ht);
}

/** Angular students list: `name + ' (' + hallticket_number + ')'`. */
function studentListLabel(name: unknown, ht: unknown): string {
  return `${name == null ? "" : String(name)} (${displayHt(ht)})`;
}

/** Angular particular cell: `student_name(hallticket_number)`. */
function studentParticularLabel(name: unknown, ht: unknown): string {
  return `${name == null ? "" : String(name)}(${displayHt(ht)})`;
}

function studentPhotoUrl(path: unknown): string {
  const raw = String(path ?? "").trim();
  if (!raw) return DEFAULT_STUDENT_PHOTO;
  if (/^(https?:\/\/|data:|\/)/i.test(raw)) return raw;
  const base = String(MINIO_URL ?? "").replace(/\/$/, "");
  return base ? `${base}/${raw.replace(/^\/+/, "")}` : raw;
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
        varaiableName: detailName,
        varaiableValue: studentListLabel(x[detailValue], x.hallticket_number),
      };
    }
    return {
      ...x,
      varaiableName: detailName,
      varaiableValue: x[detailValue],
    };
  });
}

function sumAmtList(values: (number | null)[]): number {
  return values.reduce<number>((acc, v) => acc + (v ?? 0), 0);
}

function ledgerColumnTotals(groups: StudentFeeParticularGroup[]) {
  return {
    total: groups.reduce((a, g) => a + sumAmtList(g.totalAmt), 0),
    rtf: groups.reduce((a, g) => a + sumAmtList(g.rtfAmt), 0),
    college: groups.reduce((a, g) => a + sumAmtList(g.collegeAmt), 0),
    discount: groups.reduce((a, g) => a + sumAmtList(g.discountAmt), 0),
    net: groups.reduce((a, g) => a + sumAmtList(g.netAmt), 0),
    paid: groups.reduce((a, g) => a + sumAmtList(g.paidAmt), 0),
    dueCollege: groups.reduce((a, g) => a + sumAmtList(g.dueCollegeAmt), 0),
    rtfReceived: groups.reduce((a, g) => a + sumAmtList(g.rtfReceivedAmt), 0),
    dueRtf: groups.reduce((a, g) => a + sumAmtList(g.dueRtfAmt), 0),
    totalDue: groups.reduce((a, g) => a + sumAmtList(g.totalDueAmt), 0),
  };
}

function stackedPrintAmt(values: (number | null)[]): string {
  return values
    .map((v) => `<p>${v == null ? "-" : escapeHtml(formatIndianNumber(v))}</p>`)
    .join("");
}

function buildLedgerPrintTableHtml(
  groups: StudentFeeParticularGroup[],
): string {
  if (groups.length === 0) return "";
  const totals = ledgerColumnTotals(groups);
  const rows = groups
    .map(
      (g) => `<tr>
      <td class="table-td">${escapeHtml(String(g.year))} year</td>
      <td class="table-td text-left">${g.structures.map((s) => `<p>${escapeHtml(s)}</p>`).join("")}</td>
      <td class="table-td text-right">${stackedPrintAmt(g.totalAmt)}</td>
      <td class="table-td text-right">${stackedPrintAmt(g.rtfAmt)}</td>
      <td class="table-td text-right">${stackedPrintAmt(g.collegeAmt)}</td>
      <td class="table-td text-right">${stackedPrintAmt(g.discountAmt)}</td>
      <td class="table-td text-right">${stackedPrintAmt(g.netAmt)}</td>
      <td class="table-td text-right">${stackedPrintAmt(g.paidAmt)}</td>
      <td class="table-td text-right">${stackedPrintAmt(g.dueCollegeAmt)}</td>
      <td class="table-td text-right">${stackedPrintAmt(g.rtfReceivedAmt)}</td>
      <td class="table-td text-right">${stackedPrintAmt(g.dueRtfAmt)}</td>
      <td class="table-td text-right">${stackedPrintAmt(g.totalDueAmt)}</td>
    </tr>`,
    )
    .join("");
  const totalCells = [
    totals.total,
    totals.rtf,
    totals.college,
    totals.discount,
    totals.net,
    totals.paid,
    totals.dueCollege,
    totals.rtfReceived,
    totals.dueRtf,
    totals.totalDue,
  ]
    .map(
      (v) =>
        `<td class="table-td text-right">${escapeHtml(formatIndianNumber(v))}</td>`,
    )
    .join("");
  return `<table class="mar" style="margin-top:8px">
<thead>
  <tr>
    <th class="table-th" rowspan="2">Year</th>
    <th class="table-th" rowspan="2">Particulars</th>
    <th class="table-th" colspan="10">Amount</th>
  </tr>
  <tr>${DRILL_AMOUNT_HEADERS.map((h) => `<th class="table-th">${h}</th>`).join("")}</tr>
</thead>
<tbody>
${rows}
<tr><td class="table-td" colspan="2">Total</td>${totalCells}</tr>
</tbody>
</table>`;
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
  const [steps, setSteps] = useState<DrillStep[]>([]);
  const [currentPosition, setCurrentPosition] = useState("");
  const [loading, setLoading] = useState(false);
  const [feeLedgerRows, setFeeLedgerRows] = useState<AnyRow[]>([]);
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

  const feeLedgerGroups = useMemo(
    () => buildStudentFeeParticularGroups(feeLedgerRows),
    [feeLedgerRows],
  );
  const feeLedgerTotals = useMemo(
    () => ledgerColumnTotals(feeLedgerGroups),
    [feeLedgerGroups],
  );
  const feeLedgerProfile = feeLedgerRows[0] ?? null;

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
        setCurrentPosition(
          args.detailValue === "college_code" ? "" : args.detailValue,
        );
        if (
          args.flag === "student_fee_details_std_particular" &&
          args.studentId
        ) {
          const ledger = await fetchFeeLedgerRows(
            { in_std_id: args.studentId },
            { resultIndex: 0 },
          );
          setFeeLedgerRows(ledger);
        } else {
          setFeeLedgerRows([]);
        }
        if (annotated.length === 0) toastInfo("No records found.");
      } catch (err) {
        setFeeLedgerRows([]);
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
    if (summaryList.length === 0) return;
    const orgLabel = orgPrintMeta.orgName || "Organization";
    const titleLine = academicYear
      ? `Student Fee Report - (${academicYear})`
      : "Student Fee Report";
    const tableHtml = buildDrilldownExportTableHtml({
      currentPosition,
      rows: summaryList,
      totals,
      steps,
    });
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
          table: `<p>${escapeHtml(orgLabel)}</p><p>${escapeHtml(titleLine)}</p>${tableHtml}`,
        }),
      );
    link.click();
  };

  const printReport = () => {
    if (summaryList.length === 0) return;
    const orgLabel = orgPrintMeta.orgName || "Organization";
    const titleLine = academicYear
      ? `Student Fee Report - (${academicYear})`
      : "Student Fee Report";
    const logoSrc = toOrgPrintLogoUrl(orgPrintMeta.logoPath);
    const tableHtml = buildDrilldownExportTableHtml({
      currentPosition,
      rows: summaryList,
      totals,
      steps,
    });

    printHtmlInIframe(`<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>Student Fee Report</title>
<style>
@page{margin:12mm}
body{font-family:Arial,Helvetica,sans-serif;padding:12px;color:#000;margin:0;background:#fff}
.print-header{display:flex;align-items:flex-start;width:100%;margin-bottom:10px}
.portraitLogo{height:96px;width:100px;object-fit:contain;display:block;flex-shrink:0}
.print-header-text{flex:1;min-width:0;padding-left:8px}
.collegeName{text-align:left!important;font-size:25px;font-weight:700;margin:20px 0 -5px;color:#000}
.title{text-align:left!important;font-size:23px;font-weight:700;margin:0 0 2%;color:#000}
.drilldown{color:#0c51a4;font-size:16px;font-weight:500;padding:5px 10px}
table.mar{width:100%;border-collapse:collapse;border-spacing:1px}
.table-th{padding:5px;background:#C3D9FF;font-weight:500;text-align:center;border:1px solid #000}
.table-td{padding:5px 8px;text-align:center;font-weight:400;border:1px solid #000}
.table-td p{margin:2px 0}
.text-left{text-align:left}
.text-right{text-align:right}
</style></head><body>
<div class="print-header">
  <img src="${escapeHtml(logoSrc)}" alt="" class="portraitLogo" />
  <div class="print-header-text">
    <p class="collegeName">${escapeHtml(orgLabel)}</p>
    <p class="title">${escapeHtml(titleLine)}</p>
  </div>
</div>
${tableHtml}
${currentPosition === "student_particular" ? buildLedgerPrintTableHtml(feeLedgerGroups) : ""}
</body></html>`);
  };

  const isParticular = currentPosition === "student_particular";
  const canExpand = !isParticular;
  const amountColSpan = 4;
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
              <div className="text-[16px] font-medium text-[#0c51a4]">
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
          <div className="overflow-x-auto">
            <table className="min-w-full w-max border-collapse border-spacing-px text-sm">
              <thead>
                <tr>
                  {!isParticular && (
                    <th className={`fee-drill-expand ${SUMMARY_TH}`}>Expand</th>
                  )}
                  <th className={SUMMARY_TH}>S.NO</th>
                  {isParticular ? (
                    <>
                      <th className={SUMMARY_TH}>Student</th>
                      <th className={SUMMARY_TH}>Category</th>
                    </>
                  ) : (
                    <>
                      <th className={SUMMARY_TH}>{idHeaders.type}</th>
                      <th className={SUMMARY_TH}>{idHeaders.value}</th>
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
                        <td className="border px-2 py-1.5 text-center">
                          {canExpand ? ">" : ""}
                        </td>
                      )}
                      <td className="border px-2 py-1.5 text-center">
                        {idx + 1}
                      </td>
                      {isParticular ? (
                        <>
                          <td className="border px-2 py-1.5 text-center whitespace-nowrap">
                            {studentParticularLabel(
                              row.student_name,
                              row.hallticket_number,
                            )}
                          </td>
                          <td className="border px-2 py-1.5 text-center">
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
            <div className="overflow-hidden rounded-md border border-border">
              <div className="flex items-center gap-2 bg-muted/40 px-3 py-2">
                <Monitor className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Student Details</span>
              </div>
              <div className="flex flex-col gap-3 p-3 lg:flex-row">
                <div className="flex w-full flex-col items-center px-2 text-center lg:w-[18%]">
                  <img
                    src={studentPhotoUrl(feeLedgerProfile?.student_photo_path)}
                    alt=""
                    className="mb-3 mt-2 w-[70%] max-w-[140px] bg-[#c3d9ff] p-1.5 object-contain"
                    onError={(e) => {
                      const img = e.currentTarget;
                      if (!img.src.endsWith("default_Student.png")) {
                        img.src = DEFAULT_STUDENT_PHOTO;
                      }
                    }}
                  />
                  <p className="m-0.5 font-semibold text-[#c76d2f]">
                    {String(feeLedgerProfile?.student_name ?? "")}
                  </p>
                  <p className="m-0.5 text-[#8c8c8c]">
                    {displayHt(summaryList[0]?.hallticket_number)}
                  </p>
                  <p className="m-0.5 text-[#8c8c8c]">
                    {String(
                      feeLedgerProfile?.Current_Academic_Details ??
                        feeLedgerProfile?.current_academic_details ??
                        "",
                    )}
                  </p>
                  <p className="m-0.5 text-[#8c8c8c]">
                    {String(feeLedgerProfile?.student_mobile ?? "")}
                  </p>
                  {feeLedgerProfile?.student_quota != null &&
                  String(feeLedgerProfile.student_quota) !== "" ? (
                    <span className="font-semibold text-blue-600">
                      {String(feeLedgerProfile.student_quota)}
                    </span>
                  ) : null}
                </div>
                <div className="min-w-0 flex-1 overflow-x-auto py-2">
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr>
                        <th className={`${SUMMARY_TH} align-middle`} rowSpan={2}>
                          Year
                        </th>
                        <th className={`${SUMMARY_TH} align-middle`} rowSpan={2}>
                          Particulars
                        </th>
                        <th className={SUMMARY_TH} colSpan={10}>
                          Amount
                        </th>
                      </tr>
                      <tr>
                        {DRILL_AMOUNT_HEADERS.map((h) => (
                          <th key={h} className={SUMMARY_TH}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {feeLedgerGroups.map((g) => (
                        <tr key={g.year}>
                          <td className="border px-2 py-1.5 text-center">
                            {g.year} year
                          </td>
                          <td className="border px-2 py-1.5">
                            {g.structures.map((s, i) => (
                              <p key={i} className="my-0.5">
                                {s}
                              </p>
                            ))}
                          </td>
                          {(
                            [
                              g.totalAmt,
                              g.rtfAmt,
                              g.collegeAmt,
                              g.discountAmt,
                              g.netAmt,
                              g.paidAmt,
                              g.dueCollegeAmt,
                              g.rtfReceivedAmt,
                              g.dueRtfAmt,
                              g.totalDueAmt,
                            ] as (number | null)[][]
                          ).map((vals, col) => (
                            <td
                              key={col}
                              className="border px-2 py-1.5 text-right"
                            >
                              {vals.map((v, i) => (
                                <p key={i} className="my-0.5">
                                  {v == null ? "-" : formatIndianNumber(v)}
                                </p>
                              ))}
                            </td>
                          ))}
                        </tr>
                      ))}
                      {feeLedgerGroups.length > 0 ? (
                        <tr>
                          <td
                            className="border px-2 py-1.5 text-center font-medium"
                            colSpan={2}
                          >
                            Total
                          </td>
                          {(
                            [
                              feeLedgerTotals.total,
                              feeLedgerTotals.rtf,
                              feeLedgerTotals.college,
                              feeLedgerTotals.discount,
                              feeLedgerTotals.net,
                              feeLedgerTotals.paid,
                              feeLedgerTotals.dueCollege,
                              feeLedgerTotals.rtfReceived,
                              feeLedgerTotals.dueRtf,
                              feeLedgerTotals.totalDue,
                            ] as number[]
                          ).map((v, i) => (
                            <td
                              key={i}
                              className="border px-2 py-1.5 text-right font-medium"
                            >
                              {formatIndianNumber(v)}
                            </td>
                          ))}
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
    </PageContainer>
  );
}
