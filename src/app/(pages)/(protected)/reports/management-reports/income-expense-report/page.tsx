"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ColDef, ValueFormatterParams } from "ag-grid-community";
import { FilteredListPage } from "@/components/layout";
import { Select } from "@/common/components/select";
import { Button } from "@/components/ui/button";
import { QK } from "@/lib/query-keys";
import { getErrorMessage } from "@/lib/errors";
import { rowIndexGetter } from "@/lib/utils";
import { toastInfo } from "@/lib/toast";
import {
  filterAcademicYears,
  filterColleges,
  pickNum,
  pickText,
  type FilterRow,
} from "@/app/(pages)/(protected)/accounts-and-fees/fee-masters/_lib/fee-master-filters";
import {
  fetchIncomeExpenseSummary,
  getFeeMasterCollegeFilters,
} from "@/services";
import type { IncomeExpenseSummaryRow } from "@/types/finance";

/** Angular `currency:'INR'` — ₹ with 2 decimals; null income → "-". */
function inrCurrency(value: unknown): string {
  if (value == null || value === "") return "-";
  const n = Number(value);
  if (Number.isNaN(n)) return "-";
  return n.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function incomeFormatter(p: ValueFormatterParams<IncomeExpenseSummaryRow>) {
  if (p.data?.TotalIncome == null) return "-";
  return inrCurrency(p.data.TotalIncome);
}

function expenseFormatter(p: ValueFormatterParams<IncomeExpenseSummaryRow>) {
  return inrCurrency(p.data?.TotalExpense);
}

const COL_DEFS = {
  siNo: {
    headerName: "S.No",
    valueGetter: rowIndexGetter,
    width: 80,
    flex: 0,
    cellClass: "text-left",
  } as ColDef<IncomeExpenseSummaryRow>,
  district: {
    field: "district_name",
    headerName: "District Name",
    minWidth: 140,
    flex: 1,
    cellClass: "text-left",
  } as ColDef<IncomeExpenseSummaryRow>,
  college: {
    field: "college_shortname",
    headerName: "College",
    minWidth: 120,
    flex: 1,
    cellClass: "text-left",
  } as ColDef<IncomeExpenseSummaryRow>,
  year: {
    field: "Year",
    headerName: "Year",
    minWidth: 90,
    flex: 0.6,
    cellClass: "text-left",
  } as ColDef<IncomeExpenseSummaryRow>,
  month: {
    field: "Month",
    headerName: "Month",
    minWidth: 110,
    flex: 0.8,
    cellClass: "text-left",
  } as ColDef<IncomeExpenseSummaryRow>,
  income: {
    field: "TotalIncome",
    headerName: "Total Income",
    minWidth: 140,
    flex: 1,
    cellClass: "text-left",
    valueFormatter: incomeFormatter,
  } as ColDef<IncomeExpenseSummaryRow>,
  expense: {
    field: "TotalExpense",
    headerName: "Total Expenses",
    minWidth: 140,
    flex: 1,
    cellClass: "text-left",
    valueFormatter: expenseFormatter,
  } as ColDef<IncomeExpenseSummaryRow>,
};

export default function IncomeExpenseReportPage() {
  const employeeId = Number(
    globalThis?.localStorage?.getItem("employeeId") ?? 0,
  );
  const orgId = Number(
    globalThis?.localStorage?.getItem("organizationId") ?? 0,
  );

  const [collegeId, setCollegeId] = useState<string | null>(null);
  /** Angular mat-option value = `academic_year` string (form control name academicYearId). */
  const [academicYear, setAcademicYear] = useState<string | null>(null);
  const [loadKey, setLoadKey] = useState<string | null>(null);
  const [dataDetails, setDataDetails] = useState("");
  const emptyToastKey = useRef<string | null>(null);

  const { data: filterBundle, isLoading: loadingFilters } = useQuery({
    queryKey: ["IncomeExpenseReport", "filters", orgId, employeeId],
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

  const colleges = useMemo(() => filterColleges(filtersData), [filtersData]);
  const collegeNum = Number(collegeId ?? 0);

  const academicYears = useMemo(
    () => filterAcademicYears(academicData, collegeNum || null, filtersData),
    [academicData, collegeNum, filtersData],
  );

  useEffect(() => {
    if (!collegeId && colleges.length > 0) {
      setCollegeId(
        String(pickNum(colleges[0], ["fk_college_id", "collegeId"])),
      );
    }
  }, [colleges, collegeId]);

  useEffect(() => {
    if (!collegeNum) {
      setAcademicYear(null);
      return;
    }
    if (academicYears.length === 0) {
      setAcademicYear(null);
      return;
    }
    // Angular: prefer is_curr_ay, option value = academic_year string
    const current =
      [...academicYears].sort(
        (a, b) =>
          Number(b.is_curr_ay ?? b.isCurrAy ?? 0) -
          Number(a.is_curr_ay ?? a.isCurrAy ?? 0),
      )[0] ?? academicYears[0];
    const label = pickText(current, ["academic_year", "academicYear"]);
    setAcademicYear(label || null);
  }, [collegeNum, academicYears]);

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

  const ayOptions = useMemo(() => {
    const sorted = [...academicYears].sort(
      (a, b) =>
        Number(pickText(b, ["academic_year"])) -
        Number(pickText(a, ["academic_year"])),
    );
    return sorted.map((r) => {
      const label = pickText(r, ["academic_year", "academicYear"]);
      return { value: label, label: label || "—" };
    });
  }, [academicYears]);

  const {
    data: rows = [],
    isFetching,
    error,
    isSuccess,
  } = useQuery({
    queryKey: QK.incomeExpenseSummary(
      loadKey ? Number(JSON.parse(loadKey).collegeId) : 0,
      loadKey ? JSON.parse(loadKey).year : "",
    ),
    queryFn: () => {
      const p = JSON.parse(loadKey!) as {
        collegeId: number;
        year: string;
      };
      return fetchIncomeExpenseSummary(p);
    },
    enabled: loadKey != null,
  });

  useEffect(() => {
    if (!loadKey || isFetching) return;
    if (emptyToastKey.current === loadKey) return;
    if (!isSuccess) return;
    emptyToastKey.current = loadKey;
    // Angular snotify success when empty / no rows
    if (rows.length === 0) {
      toastInfo("No Record(s) found.");
    }
  }, [loadKey, isSuccess, isFetching, rows.length]);

  function handleGetReport() {
    if (!collegeNum) {
      toastInfo("Please select college.");
      return;
    }
    if (!academicYear) {
      toastInfo("Please select academic year.");
      return;
    }
    const collegeCode =
      collegeOptions.find((o) => o.value === collegeId)?.label ?? "";
    setDataDetails(`${collegeCode}/${academicYear}`);
    emptyToastKey.current = null;
    setLoadKey(JSON.stringify({ collegeId: collegeNum, year: academicYear }));
  }

  const columnDefs = useMemo(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.district,
      COL_DEFS.college,
      COL_DEFS.year,
      COL_DEFS.month,
      COL_DEFS.income,
      COL_DEFS.expense,
    ],
    [],
  );

  const tableRows = useMemo(
    () =>
      rows.map((row, i) => ({
        ...row,
        __rowKey: [
          row.district_name ?? "",
          row.college_shortname ?? "",
          row.Year ?? "",
          row.Month ?? "",
          row.TotalIncome ?? "",
          row.TotalExpense ?? "",
          i,
        ].join("|"),
      })),
    [rows],
  );

  // Angular *ngIf="reportData.length > 0" — hide results until data exists
  const resultsVisible = loadKey != null && !isFetching && rows.length > 0;

  return (
    <FilteredListPage<IncomeExpenseSummaryRow>
      title="Income & Expense Report"
      notice={
        error ? (
          <p className="text-sm text-destructive">{getErrorMessage(error)}</p>
        ) : null
      }
      filters={
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[180px] flex-1">
            <Select
              label="College"
              required
              value={collegeId}
              onChange={(v) => {
                setCollegeId(v);
                setAcademicYear(null);
                setLoadKey(null);
                setDataDetails("");
              }}
              options={collegeOptions}
              placeholder="College"
              isLoading={loadingFilters}
            />
          </div>
          <div className="min-w-[180px] flex-1">
            <Select
              label="Academic Year"
              required
              value={academicYear}
              onChange={(v) => {
                setAcademicYear(v);
                setLoadKey(null);
                setDataDetails("");
              }}
              options={ayOptions}
              placeholder="Academic Year"
              disabled={!collegeId}
            />
          </div>
          <Button
            type="button"
            size="sm"
            disabled={isFetching || !collegeId || !academicYear}
            onClick={handleGetReport}
          >
            {isFetching ? "Loading…" : "Get Report"}
          </Button>
        </div>
      }
      filtersFooter={
        resultsVisible && dataDetails ? (
          <p className="text-sm font-semibold text-blue-600">{dataDetails}</p>
        ) : null
      }
      rowData={tableRows}
      columnDefs={columnDefs}
      loading={isFetching}
      resultsVisible={resultsVisible}
      height="auto"
      pagination={false}
      columnFilters={false}
      getRowId={(p) => String(p.data?.__rowKey ?? "")}
      toolbar={{
        search: true,
        searchPlaceholder: "Search",
        exportExcel: true,
        exportPdf: true,
        columnPicker: false,
        excelDocumentTitle: "Income & Expense Report",
        excelFileName: "Income & Expense Report.xls",
        pdfDocumentTitle: "Income & Expense Report",
      }}
    />
  );
}
