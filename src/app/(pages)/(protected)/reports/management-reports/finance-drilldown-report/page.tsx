"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import {
  ArrowLeft,
  ChevronRight,
  FileSpreadsheet,
  Printer,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Select } from "@/common/components/select";
import { exportHtmlTableAsExcel } from "@/common/export-html-table";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { QK } from "@/lib/query-keys";
import { getErrorMessage } from "@/lib/errors";
import { toastError } from "@/lib/toast";
import { fetchTimetableFilterRows, getAllRecords } from "@/services";

const REPORT_TITLE = "Finance Report";

type StepItem = {
  id: number;
  name: string;
  in_flag: string;
  in_college_id: number;
  in_academic_year: string;
  in_head_id: number;
  in_account_id: number;
  detailName: string;
  detailValue: string;
};

type SummaryRow = {
  varaiableName?: string;
  varaiableValue?: string;
  Head?: string;
  account?: string;
  Totalamount?: number;
  amount?: number;
  transaction_date?: string;
  pk_college_id?: number;
  academic_year?: string;
  pk_account_type_id?: number;
  head_account_id?: number;
  account_id?: number;
  [key: string]: unknown;
};

function formatAmount(input: number | string | undefined | null): string {
  if (input == null || input === "") return "0";
  const num = Number(input);
  if (Number.isNaN(num)) return String(input);
  const isNegative = num < 0;
  const absStr = Math.abs(num).toString();
  const parts = absStr.split(".");
  let lastThree = parts[0].substring(parts[0].length - 3);
  const otherNumbers = parts[0].substring(0, parts[0].length - 3);
  if (otherNumbers !== "") lastThree = "," + lastThree;
  let output = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + lastThree;
  if (parts.length > 1) output += "." + parts[1];
  if (isNegative) output = "-" + output;
  return output;
}

export default function FinanceDrilldownReportPage() {
  const [academicYear, setAcademicYear] = useState("");
  const [summaryList, setSummaryList] = useState<SummaryRow[]>([]);
  const [steps, setSteps] = useState<StepItem[]>([]);
  const [currentPosition, setCurrentPosition] = useState("");
  const [loadingReport, setLoadingReport] = useState(false);

  const excelTableRef = useRef<HTMLDivElement>(null);

  // Fetch filter rows for Academic Year options
  const filtersQuery = useQuery({
    queryKey: QK.timetableReports.clsFilters(),
    queryFn: () => fetchTimetableFilterRows("cls_timtable_filters", 0),
  });

  const filterRows = useMemo(
    () => (Array.isArray(filtersQuery.data) ? filtersQuery.data : []),
    [filtersQuery.data],
  );

  const ayOptions = useMemo(() => {
    if (!filterRows.length) return [];
    const aySet = new Set<string>();
    for (const r of filterRows) {
      const ay = String(r.academic_year ?? r.academicYear ?? "");
      if (ay) aySet.add(ay);
    }
    const list = Array.from(aySet).sort((a, b) => b.localeCompare(a));
    return [
      { value: "", label: "All" },
      ...list.map((ay) => ({ value: ay, label: ay })),
    ];
  }, [filterRows]);

  // Angular parity API call: getAllRecords("s_rep_finance", { in_flag, in_college_id, in_academic_year, in_head_id, in_account_id })
  const fetchSummaryData = useCallback(
    async (
      in_flag: string,
      in_college_id: number,
      in_academic_year: string,
      in_head_id: number,
      in_account_id: number,
      detailName: string,
      detailValue: string,
    ) => {
      setLoadingReport(true);
      try {
        const res = await getAllRecords<{ result?: SummaryRow[][] }>(
          "s_rep_finance",
          {
            in_flag,
            in_college_id,
            in_academic_year: in_academic_year || 0,
            in_head_id,
            in_account_id,
          },
        );

        const list = (res?.result?.[0] ?? []) as SummaryRow[];
        const mapped = list.map((x) => {
          let val = String(x[detailValue] ?? "");
          if (
            in_flag === "student_fee_details_students" &&
            x.hallticket_number
          ) {
            val = `${val} (${String(x.hallticket_number)})`;
          }
          return {
            ...x,
            varaiableName: detailName,
            varaiableValue: val,
          };
        });

        setSummaryList(mapped);
      } catch (e) {
        toastError(getErrorMessage(e) || "Failed to load finance summary.");
        setSummaryList([]);
      } finally {
        setLoadingReport(false);
      }
    },
    [],
  );

  // Initial load with default academic year
  useEffect(() => {
    if (ayOptions.length > 1 && !academicYear) {
      const firstAy = ayOptions[1].value;
      setAcademicYear(firstAy);
      void fetchSummaryData(
        "finance_Summary_ay",
        0,
        firstAy,
        0,
        0,
        "College",
        "college_code",
      );
    }
  }, [ayOptions, academicYear, fetchSummaryData]);

  // Handle drilldown navigation (click '>')
  const handleStepClick = useCallback(
    (
      stepName: string,
      in_flag: string,
      in_college_id: number,
      in_head_id: number,
      in_account_id: number,
      detailName: string,
      detailValue: string,
      isBack: boolean = false,
    ) => {
      void fetchSummaryData(
        in_flag,
        in_college_id,
        academicYear,
        in_head_id,
        in_account_id,
        detailName,
        detailValue,
      );

      if (!isBack) {
        setSteps((prev) => [
          ...prev,
          {
            id: prev.length + 1,
            name: stepName,
            in_flag,
            in_college_id,
            in_academic_year: academicYear,
            in_head_id,
            in_account_id,
            detailName,
            detailValue,
          },
        ]);
      }
      setCurrentPosition(detailValue);
    },
    [academicYear, fetchSummaryData],
  );

  // Handle drilldown level back
  const handleBackStep = useCallback(() => {
    setSteps((prev) => {
      const nextSteps = prev.slice(0, -1);
      if (nextSteps.length > 0) {
        const last = nextSteps[nextSteps.length - 1];
        handleStepClick(
          last.name,
          last.in_flag,
          last.in_college_id,
          last.in_head_id,
          last.in_account_id,
          last.detailName,
          last.detailValue,
          true,
        );
      } else {
        void fetchSummaryData(
          "finance_Summary_ay",
          0,
          academicYear,
          0,
          0,
          "College",
          "college_code",
        );
        setCurrentPosition("");
      }
      return nextSteps;
    });
  }, [academicYear, fetchSummaryData, handleStepClick]);

  // Handle Export Excel
  const handleExportExcel = useCallback(() => {
    if (!excelTableRef.current) return;
    const tableHtml = excelTableRef.current.innerHTML;
    const title = academicYear
      ? `Finance Report - (${academicYear})`
      : "Finance Report";
    exportHtmlTableAsExcel(`${title}.xls`, tableHtml);
  }, [academicYear]);

  return (
    <FilteredListPage
      title={REPORT_TITLE}
      filters={
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 lg:items-end">
          <Select
            label="Academic Year"
            value={academicYear}
            onChange={(val) => {
              const v = val ?? "";
              setAcademicYear(v);
              setSteps([]);
              setCurrentPosition("");
              void fetchSummaryData(
                "finance_Summary_ay",
                0,
                v,
                0,
                0,
                "College",
                "college_code",
              );
            }}
            options={ayOptions}
            placeholder="All"
            isLoading={filtersQuery.isLoading}
          />
          <div className="flex flex-wrap items-center gap-2 lg:col-span-3 lg:justify-end">
            <Button
              type="button"
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleExportExcel}
              disabled={summaryList.length === 0}
            >
              <FileSpreadsheet className="h-4 w-4" />
              Export Excel
            </Button>
            <Button
              type="button"
              variant="outline"
              className="gap-1.5"
              disabled={summaryList.length === 0}
              onClick={() => window.print()}
            >
              <Printer className="h-4 w-4" />
              Print Report
            </Button>
          </div>
        </div>
      }
      showTable={false}
      loading={loadingReport}
      body={
        <div className="space-y-4" ref={excelTableRef}>
          {/* Drilldown Trail & Level Back Button */}
          {steps.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs">
              <div className="flex flex-wrap items-center gap-1 font-medium text-slate-700">
                {steps.map((s, idx) => (
                  <span key={s.id} className="flex items-center gap-1">
                    <span className="font-semibold text-blue-700">
                      {s.name}
                    </span>
                    {idx < steps.length - 1 && (
                      <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                    )}
                  </span>
                ))}
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 gap-1 text-xs"
                onClick={handleBackStep}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </Button>
            </div>
          )}

          {/* Table Matrix */}
          <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 font-semibold text-slate-700 border-b border-slate-200">
                <tr>
                  <th className="p-2 border-r border-slate-200 w-16 text-center">
                    Expand
                  </th>
                  <th className="p-2 border-r border-slate-200 min-w-[140px]">
                    {currentPosition === ""
                      ? "College"
                      : currentPosition === "Head"
                        ? "Head"
                        : "Account"}
                  </th>
                  {currentPosition === "" && (
                    <>
                      <th className="p-2 border-r border-slate-200">Head</th>
                      <th className="p-2 border-r border-slate-200 text-right min-w-[120px]">
                        Total Amount
                      </th>
                    </>
                  )}
                  {currentPosition === "Head" && (
                    <>
                      <th className="p-2 border-r border-slate-200">Account</th>
                      <th className="p-2 border-r border-slate-200 text-right min-w-[120px]">
                        Total Amount
                      </th>
                    </>
                  )}
                  {currentPosition === "account" && (
                    <>
                      <th className="p-2 border-r border-slate-200 min-w-[140px]">
                        Transaction Date
                      </th>
                      <th className="p-2 border-r border-slate-200 text-right min-w-[120px]">
                        Amount
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {summaryList.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="py-8 text-center text-slate-500 italic"
                    >
                      {loadingReport
                        ? "Loading finance summary..."
                        : "No records found."}
                    </td>
                  </tr>
                ) : (
                  summaryList.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      {/* Expand Button */}
                      <td className="p-2 border-r border-slate-200 text-center">
                        {currentPosition === "" ? (
                          <button
                            type="button"
                            className="rounded p-1 text-blue-600 hover:bg-blue-50 font-bold"
                            onClick={() =>
                              handleStepClick(
                                String(row.varaiableValue ?? ""),
                                "finance_Summary_ay_college_head",
                                Number(row.pk_college_id ?? 0),
                                Number(row.pk_account_type_id ?? 0),
                                0,
                                "Head",
                                "Head",
                              )
                            }
                          >
                            &gt;
                          </button>
                        ) : currentPosition === "Head" ? (
                          <button
                            type="button"
                            className="rounded p-1 text-blue-600 hover:bg-blue-50 font-bold"
                            onClick={() =>
                              handleStepClick(
                                String(row.varaiableValue ?? ""),
                                "finance_Summary_ay_college_head_account",
                                Number(row.pk_college_id ?? 0),
                                Number(row.head_account_id ?? 0),
                                Number(row.account_id ?? 0),
                                "Account",
                                "account",
                              )
                            }
                          >
                            &gt;
                          </button>
                        ) : (
                          <span className="text-slate-400">•</span>
                        )}
                      </td>

                      {/* Variable Name / Value */}
                      <td className="p-2 border-r border-slate-200 font-medium text-slate-900">
                        {row.varaiableValue}
                      </td>

                      {/* Level Columns */}
                      {currentPosition === "" && (
                        <>
                          <td className="p-2 border-r border-slate-200 text-slate-700">
                            {row.Head ?? "—"}
                          </td>
                          <td className="p-2 border-r border-slate-200 text-right font-medium text-slate-900">
                            {formatAmount(row.Totalamount)}
                          </td>
                        </>
                      )}

                      {currentPosition === "Head" && (
                        <>
                          <td className="p-2 border-r border-slate-200 text-slate-700">
                            {row.account ?? "—"}
                          </td>
                          <td className="p-2 border-r border-slate-200 text-right font-medium text-slate-900">
                            {formatAmount(row.Totalamount)}
                          </td>
                        </>
                      )}

                      {currentPosition === "account" && (
                        <>
                          <td className="p-2 border-r border-slate-200 text-slate-700">
                            {row.transaction_date
                              ? format(
                                  new Date(row.transaction_date),
                                  "dd/MM/yyyy",
                                )
                              : "—"}
                          </td>
                          <td className="p-2 border-r border-slate-200 text-right font-medium text-slate-900">
                            {formatAmount(row.amount)}
                          </td>
                        </>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      }
    />
  );
}
