"use client";

/**
 * Fee Ledger report — Angular `accounts-and-fees/fee-reports/fee-ledger` parity.
 * Get List: `getAllRecords/s_fee_std_ledger?in_std_id=`
 * Export Excel / Print Report: HTML table export + iframe print (Angular exportAsExcel / PrintData).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FileSpreadsheet, Printer } from "lucide-react";
import { Select } from "@/common/components/select";
import { StudentSearchSelect } from "@/common/components/student-search";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { DEFAULT_COLLEGE_LOGO } from "@/hooks/useCollegeLogo";
import { MINIO_URL } from "@/config/constants/api";
import { escapeHtml } from "@/common/export-html-table";
import { getErrorMessage } from "@/lib/errors";
import { printHtmlInIframe } from "@/lib/print";
import { toastError, toastInfo } from "@/lib/toast";
import { resolveReportCatalogHref } from "@/lib/report-catalog";
import {
  filterColleges,
  pickNum,
  pickText,
  type FilterRow,
} from "@/app/(pages)/(protected)/accounts-and-fees/fee-masters/_lib/fee-master-filters";
import {
  fetchFeeLedgerRows,
  getCollegeById,
  getFeeMasterCollegeFilters,
  printFeeLedgerDownload,
  searchStudentsInCollege,
} from "@/services";

type AnyRow = Record<string, unknown>;

type FeeLedgerYearGroup = {
  year: string | number;
  structures: (string | null)[];
  totalAmt: (number | null)[];
  paidAmt: (number | null)[];
  disAmt: (number | null)[];
  fineAmt: (number | null)[];
  refAmt: (number | null)[];
  balAmt: (number | null)[];
  reason: (string | null)[];
};

function toLogoUrl(path: string | null | undefined): string {
  if (!path) return DEFAULT_COLLEGE_LOGO;
  const raw = String(path);
  if (/^(https?:\/\/|data:|\/)/i.test(raw)) return raw;
  return `${MINIO_URL}${raw.replace(/^\/+/, "")}`;
}

function numOrNull(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function fmtAmt(v: number | null | undefined): string {
  if (v == null) return "";
  return v.toFixed(2);
}

/** Angular getFeeLedger() year-group shaping from `result[0]` rows. */
function groupFeeLedgerRows(rows: AnyRow[]): {
  groups: FeeLedgerYearGroup[];
  total: number;
  paid: number;
  discount: number;
  fine: number;
  refund: number;
  balance: number;
} {
  const groups: FeeLedgerYearGroup[] = [];
  let total = 0;
  let paid = 0;
  let discount = 0;
  let fine = 0;
  let refund = 0;
  let balance = 0;

  for (const row of rows) {
    const gross = numOrNull(row.P_gross_amount);
    const paidAmt = numOrNull(row.P_paid_amount);
    const disAmt = numOrNull(row.P_discount_amount);
    const fineAmt = numOrNull(row.P_fine_amount);
    const balAmt = numOrNull(row.P_balance_amount);
    const refAmt = numOrNull(row.P_refund_amount);
    const reason =
      row.P_discount_reason == null ? null : String(row.P_discount_reason);
    const structure =
      row.fee_category_name == null ? null : String(row.fee_category_name);
    const year = (row.year as string | number) ?? "";

    if (gross != null) {
      total += gross;
      paid += paidAmt ?? 0;
      discount += disAmt ?? 0;
      fine += fineAmt ?? 0;
      balance += balAmt ?? 0;
      refund += refAmt ?? 0;
    }

    const existing = groups.find((g) => g.year === year);
    if (existing) {
      existing.structures.push(structure);
      existing.totalAmt.push(gross);
      existing.paidAmt.push(paidAmt);
      existing.disAmt.push(disAmt);
      existing.fineAmt.push(fineAmt);
      existing.refAmt.push(refAmt);
      existing.balAmt.push(balAmt);
      existing.reason.push(reason);
    } else {
      groups.push({
        year,
        structures: [structure],
        totalAmt: [gross],
        paidAmt: [paidAmt],
        disAmt: [disAmt],
        fineAmt: [fineAmt],
        refAmt: [refAmt],
        balAmt: [balAmt],
        reason: [reason],
      });
    }
  }

  return { groups, total, paid, discount, fine, refund, balance };
}

function buildLedgerTableHtml(
  groups: FeeLedgerYearGroup[],
  totals: {
    total: number;
    paid: number;
    discount: number;
    fine: number;
    refund: number;
    balance: number;
  },
): string {
  const bodyRows = groups
    .map((g) => {
      const structures = g.structures
        .map((s) => `<p>${escapeHtml(s ?? "")}</p>`)
        .join("");
      const col = (vals: (number | null)[]) =>
        vals
          .map((v) =>
            v != null
              ? `<p><span>${escapeHtml(fmtAmt(v))}</span></p>`
              : "<p></p>",
          )
          .join("");
      const reasons = g.reason
        .map((r) =>
          r != null
            ? `<p><span>${escapeHtml(r)}</span></p>`
            : "<p><span>-</span></p>",
        )
        .join("");
      return `<tr>
        <td style="text-align:center">${escapeHtml(String(g.year ?? ""))}</td>
        <td>${structures}</td>
        <td style="text-align:right">${col(g.totalAmt)}</td>
        <td style="text-align:right">${col(g.paidAmt)}</td>
        <td style="text-align:right">${col(g.disAmt)}</td>
        <td style="text-align:right">${col(g.fineAmt)}</td>
        <td style="text-align:right">${col(g.refAmt)}</td>
        <td style="text-align:right">${col(g.balAmt)}</td>
        <td>${reasons}</td>
      </tr>`;
    })
    .join("");

  const totalRow =
    groups.length > 0
      ? `<tr>
          <td style="text-align:center" colspan="2">Total</td>
          <td style="text-align:right">${escapeHtml(fmtAmt(totals.total))}</td>
          <td style="text-align:right">${escapeHtml(fmtAmt(totals.paid))}</td>
          <td style="text-align:right">${escapeHtml(fmtAmt(totals.discount))}</td>
          <td style="text-align:right">${escapeHtml(fmtAmt(totals.fine))}</td>
          <td style="text-align:right">${escapeHtml(fmtAmt(totals.refund))}</td>
          <td style="text-align:right">${escapeHtml(fmtAmt(totals.balance))}</td>
          <td></td>
        </tr>`
      : "";

  return `<table border="1" cellspacing="0" cellpadding="4" style="width:100%;border-collapse:collapse;font-size:12px">
    <thead>
      <tr>
        <th rowspan="2" style="text-align:center">Year</th>
        <th rowspan="2" style="text-align:center">Particulars</th>
        <th colspan="6" style="text-align:center">Amount</th>
        <th rowspan="2" style="text-align:center">Remarks</th>
      </tr>
      <tr>
        <th style="text-align:center">Total Amount</th>
        <th style="text-align:center">Paid Amount</th>
        <th style="text-align:center">Discount Amount</th>
        <th style="text-align:center">Fine Amount</th>
        <th style="text-align:center">Refund Amount</th>
        <th style="text-align:center">Balance Amount</th>
      </tr>
    </thead>
    <tbody>${bodyRows}${totalRow}</tbody>
  </table>`;
}

export default function FeeLedgerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const excelTableRef = useRef<HTMLTableElement>(null);

  const employeeId = Number(
    globalThis?.localStorage?.getItem("employeeId") ?? 0,
  );
  const orgId = Number(
    globalThis?.localStorage?.getItem("organizationId") ?? 0,
  );
  const orgCode =
    typeof window !== "undefined"
      ? window.localStorage.getItem("orgCode") ?? ""
      : "";

  const [collegeId, setCollegeId] = useState<string | null>(null);
  const [studentId, setStudentId] = useState<number | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<AnyRow | null>(null);
  const [students, setStudents] = useState<AnyRow[]>([]);
  const [searchingStudents, setSearchingStudents] = useState(false);

  const [groups, setGroups] = useState<FeeLedgerYearGroup[]>([]);
  const [totals, setTotals] = useState({
    total: 0,
    paid: 0,
    discount: 0,
    fine: 0,
    refund: 0,
    balance: 0,
  });
  const [studentLabel, setStudentLabel] = useState("");
  const [collegeName, setCollegeName] = useState("");
  const [collegeLogo, setCollegeLogo] = useState(DEFAULT_COLLEGE_LOGO);
  const [loadingList, setLoadingList] = useState(false);
  const [showTable, setShowTable] = useState(false);

  const [filterBundle, setFilterBundle] = useState<{
    filtersData: FilterRow[];
  } | null>(null);
  const [loadingFilters, setLoadingFilters] = useState(false);

  // Angular: one-shot clg_filters load — do not refetch on tab focus.
  useEffect(() => {
    if (orgId <= 0 || employeeId <= 0) return;
    let cancelled = false;
    setLoadingFilters(true);
    void getFeeMasterCollegeFilters(orgId, employeeId)
      .then((data) => {
        if (!cancelled) setFilterBundle(data);
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
  }, [orgId, employeeId]);

  const filtersData = useMemo(
    () => (filterBundle?.filtersData ?? []) as FilterRow[],
    [filterBundle?.filtersData],
  );

  const collegeOptions = useMemo(() => {
    const cols = filterColleges(filtersData);
    return cols.map((r) => ({
      value: String(pickNum(r, ["fk_college_id", "collegeId"])),
      label: pickText(r, ["college_code", "collegeCode", "college_name"]),
    }));
  }, [filtersData]);

  useEffect(() => {
    if (collegeId || collegeOptions.length === 0) return;
    setCollegeId(collegeOptions[0].value);
  }, [collegeId, collegeOptions]);

  const clearResults = useCallback(() => {
    setGroups([]);
    setTotals({
      total: 0,
      paid: 0,
      discount: 0,
      fine: 0,
      refund: 0,
      balance: 0,
    });
    setShowTable(false);
    setStudentLabel("");
  }, []);

  const onCollegeChange = (v: string | null) => {
    setCollegeId(v);
    setStudentId(null);
    setSelectedStudent(null);
    setStudents([]);
    clearResults();
  };

  const onStudentSearch = useCallback(
    async (term: string) => {
      const cid = Number(collegeId ?? 0);
      if (!cid || term.trim().length < 5) {
        setStudents([]);
        return;
      }
      setSearchingStudents(true);
      try {
        // Angular: studentsearch?q=&collegeId= (no isActive)
        const rows = await searchStudentsInCollege(cid, term, {
          includeActive: false,
        });
        setStudents(rows as AnyRow[]);
      } catch (err) {
        setStudents([]);
        toastError(getErrorMessage(err));
      } finally {
        setSearchingStudents(false);
      }
    },
    [collegeId],
  );

  const handleGetList = async () => {
    const cid = Number(collegeId ?? 0);
    const sid = Number(studentId ?? 0);
    if (!cid) {
      toastInfo("College is required");
      return;
    }
    if (!sid) {
      toastInfo("Student is required");
      return;
    }

    setLoadingList(true);
    clearResults();
    try {
      const [rows, college] = await Promise.all([
        fetchFeeLedgerRows({ in_std_id: sid }, { resultIndex: 0 }),
        getCollegeById(cid).catch(() => null),
      ]);

      const name =
        pickText(selectedStudent ?? {}, ["firstName", "studentName"]) ||
        String(selectedStudent?.firstName ?? "");
      const ht =
        pickText(selectedStudent ?? {}, [
          "hallticketNumber",
          "studentRollNo",
          "rollNo",
        ]) || "";
      setStudentLabel(ht ? `${name}(${ht})` : name);

      if (college) {
        setCollegeName(String(college.collegeName ?? ""));
        setCollegeLogo(toLogoUrl(college.logo));
      } else {
        setCollegeName("");
        setCollegeLogo(DEFAULT_COLLEGE_LOGO);
      }

      const shaped = groupFeeLedgerRows(rows as AnyRow[]);
      setGroups(shaped.groups);
      setTotals({
        total: shaped.total,
        paid: shaped.paid,
        discount: shaped.discount,
        fine: shaped.fine,
        refund: shaped.refund,
        balance: shaped.balance,
      });
      setShowTable(shaped.groups.length > 0);
      if (shaped.groups.length === 0) {
        toastInfo("No fee ledger data found for this student.");
      }
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setLoadingList(false);
    }
  };

  /** Angular exportAsExcel() — table #excelTable → Fee Ledger Report.xls */
  const exportAsExcel = () => {
    if (!excelTableRef.current) return;
    const uri = "data:application/vnd.ms-excel;base64,";
    const template = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>{worksheet}</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body><table>{table}</table></body></html>`;
    const base64 = (s: string) => window.btoa(unescape(encodeURIComponent(s)));
    const formatTpl = (s: string, c: Record<string, string>) =>
      s.replace(/{(\w+)}/g, (_, p: string) => c[p] ?? "");
    const link = document.createElement("a");
    link.download = "Fee Ledger Report.xls";
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

  /** Angular print() PDF, with PrintData() HTML fallback. */
  const printReport = async () => {
    const cid = Number(collegeId ?? 0);
    const sid = Number(studentId ?? 0);
    if (!cid || !sid || groups.length === 0) return;

    try {
      await printFeeLedgerDownload(cid, sid);
      return;
    } catch {
      // Angular PrintData() HTML fallback when PDF download is unavailable
    }

    const tableHtml = buildLedgerTableHtml(groups, totals);
    const logoBlock =
      orgCode === "SUK"
        ? `<div style="text-align:center;margin-bottom:12px">
            <img src="${escapeHtml(collegeLogo)}" alt="" style="height:auto;max-width:100%;width:900px;object-fit:contain" onerror="this.src='${DEFAULT_COLLEGE_LOGO}'" />
            <p style="font-size:18px;font-weight:600;margin:8px 0 4px">${escapeHtml(collegeName)}</p>
            <p style="font-size:16px;margin:0 0 4px">Fee Ledger Report</p>
            <p style="font-size:13px;margin:0">${escapeHtml(studentLabel)}</p>
          </div>`
        : `<div style="display:flex;align-items:flex-start;gap:16px;margin-bottom:12px">
            <img src="${escapeHtml(collegeLogo)}" alt="" style="height:80px;object-fit:contain" onerror="this.src='${DEFAULT_COLLEGE_LOGO}'" />
            <div>
              <p style="font-size:18px;font-weight:600;margin:0 0 4px;text-align:left">${escapeHtml(collegeName)}</p>
              <p style="font-size:16px;margin:0;text-align:left">Fee Ledger Report</p>
            </div>
          </div>`;

    printHtmlInIframe(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Fee Ledger Report</title>
<style>
  body{font-family:Arial,sans-serif;color:#111;padding:16px;margin:0;background:#fff}
  table{width:100%;border-collapse:collapse}
  th,td{border:1px solid #333;padding:4px 6px;vertical-align:top}
  th{background:#e8f0fe}
  p{margin:0 0 2px}
</style>
</head>
<body>
${logoBlock}
${tableHtml}
</body>
</html>`);
  };

  const goBack = () => {
    router.push(resolveReportCatalogHref(searchParams.get("path")));
  };

  return (
    <FilteredListPage
      title="Fee Ledger"
      filters={
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-full min-w-[12rem] sm:w-[14rem]">
            <Select
              label="College"
              required
              value={collegeId}
              onChange={onCollegeChange}
              options={collegeOptions}
              placeholder="College"
              isLoading={loadingFilters}
            />
          </div>
          <div className="w-full min-w-[18rem] flex-1 sm:max-w-xl">
            <StudentSearchSelect
              label="Student"
              placeholder="Search by student name or rollno."
              value={studentId}
              students={students}
              selectedStudent={selectedStudent}
              isLoading={searchingStudents}
              onSearch={(term) => void onStudentSearch(term)}
              onChange={(id, row) => {
                setStudentId(id);
                setSelectedStudent(row);
                clearResults();
              }}
              fullWidth
              className="[&_input]:h-9"
            />
          </div>
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
            <div className="mb-3 flex flex-wrap gap-2">
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
                onClick={() => void printReport()}
              >
                <Printer className="mr-1.5 h-3.5 w-3.5" />
                Print Report
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table
                ref={excelTableRef}
                className="w-full border-collapse text-sm"
              >
                <thead>
                  <tr className="bg-sky-50">
                    <th
                      rowSpan={2}
                      className="border px-2 py-1.5 text-center font-semibold"
                    >
                      Year
                    </th>
                    <th
                      rowSpan={2}
                      className="border px-2 py-1.5 text-center font-semibold"
                    >
                      Particulars
                    </th>
                    <th
                      colSpan={6}
                      className="border px-2 py-1.5 text-center font-semibold"
                    >
                      Amount
                    </th>
                    <th
                      rowSpan={2}
                      className="border px-2 py-1.5 text-center font-semibold"
                    >
                      Remarks
                    </th>
                  </tr>
                  <tr className="bg-sky-50">
                    <th className="border px-2 py-1.5 text-center font-semibold">
                      Total Amount
                    </th>
                    <th className="border px-2 py-1.5 text-center font-semibold">
                      Paid Amount
                    </th>
                    <th className="border px-2 py-1.5 text-center font-semibold">
                      Discount Amount
                    </th>
                    <th className="border px-2 py-1.5 text-center font-semibold">
                      Fine Amount
                    </th>
                    <th className="border px-2 py-1.5 text-center font-semibold">
                      Refund Amount
                    </th>
                    <th className="border px-2 py-1.5 text-center font-semibold">
                      Balance Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map((g, i) => (
                    <tr key={`${g.year}-${i}`}>
                      <td className="border px-2 py-1 text-center">{g.year}</td>
                      <td className="border px-2 py-1">
                        {g.structures.map((s, j) => (
                          <p key={j} className="m-0">
                            {s}
                          </p>
                        ))}
                      </td>
                      {(
                        [
                          g.totalAmt,
                          g.paidAmt,
                          g.disAmt,
                          g.fineAmt,
                          g.refAmt,
                          g.balAmt,
                        ] as (number | null)[][]
                      ).map((col, ci) => (
                        <td key={ci} className="border px-2 py-1 text-right">
                          {col.map((v, j) => (
                            <p key={j} className="m-0">
                              {v != null ? fmtAmt(v) : null}
                            </p>
                          ))}
                        </td>
                      ))}
                      <td className="border px-2 py-1">
                        {g.reason.map((r, j) => (
                          <p key={j} className="m-0">
                            {r != null ? r : "-"}
                          </p>
                        ))}
                      </td>
                    </tr>
                  ))}
                  {groups.length > 0 ? (
                    <tr className="font-semibold">
                      <td
                        colSpan={2}
                        className="border px-2 py-1 text-center"
                      >
                        Total
                      </td>
                      <td className="border px-2 py-1 text-right">
                        {fmtAmt(totals.total)}
                      </td>
                      <td className="border px-2 py-1 text-right">
                        {fmtAmt(totals.paid)}
                      </td>
                      <td className="border px-2 py-1 text-right">
                        {fmtAmt(totals.discount)}
                      </td>
                      <td className="border px-2 py-1 text-right">
                        {fmtAmt(totals.fine)}
                      </td>
                      <td className="border px-2 py-1 text-right">
                        {fmtAmt(totals.refund)}
                      </td>
                      <td className="border px-2 py-1 text-right">
                        {fmtAmt(totals.balance)}
                      </td>
                      <td className="border px-2 py-1" />
                    </tr>
                  ) : null}
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
