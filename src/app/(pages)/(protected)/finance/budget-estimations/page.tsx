"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { FileSpreadsheetIcon, PrinterIcon } from "lucide-react";
import { PageContainer } from "@/components/layout";
import { SearchInput } from "@/common/components/search";
import { Button } from "@/components/ui/button";
import { QK } from "@/lib/query-keys";
import { getErrorMessage } from "@/lib/errors";
import { printElementInIframe } from "@/lib/print";
import { toastInfo } from "@/lib/toast";
import { useCollegeLogo, DEFAULT_COLLEGE_LOGO } from "@/hooks/useCollegeLogo";
import { fetchFinanceBudgetReport } from "@/services";
import { BudgetEstimationsReportTables } from "../_components/BudgetEstimationsReportTables";
import { FinanceBudgetFilters } from "../_components/FinanceBudgetFilters";
import { useFinanceCascade } from "../_lib/use-finance-cascade";

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

function resolveCollegeName(): string {
  if (typeof window === "undefined") return "";
  return (
    window.localStorage.getItem("currentCollege") ??
    window.localStorage.getItem("collegeName") ??
    ""
  );
}

export default function BudgetEstimationReportPage() {
  const cascade = useFinanceCascade({ withTransactionType: true });
  const logoUrl = useCollegeLogo(cascade.collegeId || null);
  const [loadKey, setLoadKey] = useState<string | null>(null);
  const [selectedData, setSelectedData] = useState("");
  const [transactionTypeLabel, setTransactionTypeLabel] = useState("All");
  const [financialYearLabel, setFinancialYearLabel] = useState("");
  const [entityLabel, setEntityLabel] = useState("");
  const [collegeName, setCollegeName] = useState("");
  const [search, setSearch] = useState("");
  const excelRef = useRef<HTMLDivElement>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const emptyToastKey = useRef<string | null>(null);

  const {
    data: rows = [],
    isFetching,
    error,
    isSuccess,
  } = useQuery({
    queryKey: QK.finBudgetReport(
      "financial_budget_report",
      loadKey ? JSON.parse(loadKey) : {},
    ),
    queryFn: () => fetchFinanceBudgetReport(JSON.parse(loadKey!)),
    enabled: loadKey != null,
  });

  useEffect(() => {
    if (!loadKey || isFetching) return;
    if (emptyToastKey.current === loadKey) return;

    const emptySuccess = isSuccess && rows.length === 0;
    const emptyError =
      !!error && /no\s+record(?:\(s\)|s)?/i.test(getErrorMessage(error));

    if (!emptySuccess && !emptyError) return;
    emptyToastKey.current = loadKey;
    // Angular snotify success for empty — reusable white info toast (top-right).
    toastInfo(emptyError ? getErrorMessage(error) : "No Record(s) found.");
  }, [loadKey, isSuccess, isFetching, rows.length, error]);

  const sectionTypes = useMemo(
    () => cascade.transactionTypes.map((t) => t.label),
    [cascade.transactionTypes],
  );

  function handleGetList() {
    if (!cascade.filtersValid) return;
    const college =
      cascade.colleges.find((c) => c.value === cascade.collegeId)?.label ??
      "null";
    const entity =
      cascade.entities.find((e) => e.value === cascade.accountEntityId)
        ?.label ?? "null";
    const year =
      cascade.years.find((y) => y.value === cascade.financialYearId)?.label ??
      "null";
    const txn =
      cascade.majorAccountTypeCatId === 0
        ? "All"
        : (cascade.transactionTypes.find(
            (t) => t.value === cascade.majorAccountTypeCatId,
          )?.label ?? "All");
    setSelectedData(`${college}/${entity}/${year}/${txn}`);
    setTransactionTypeLabel(txn);
    setFinancialYearLabel(year);
    setEntityLabel(entity);
    setCollegeName(resolveCollegeName() || college);
    setSearch("");
    emptyToastKey.current = null;
    setLoadKey(
      JSON.stringify(
        cascade.toBudgetParams({
          in_budgetdate: format(new Date(), "yyyy-MM-dd"),
          in_account_type_id: 0,
          in_major_accounttype: cascade.majorAccountTypeCatId,
        }),
      ),
    );
  }

  function handlePrint() {
    if (!printRef.current) return;
    // Angular parity: fit full wide table on the page — no clip / scrollbar.
    printElementInIframe(printRef.current, "Budget Estimations Report", {
      extraCss: `
        html, body, * {
          overflow: visible !important;
          max-height: none !important;
        }
        @page { margin: 0.5cm; }
        .budget-estimations-print {
          width: 100% !important;
          max-width: 100% !important;
          padding: 6px !important;
          box-sizing: border-box;
        }
        .budget-estimations-print .overflow-x-auto,
        .budget-estimations-print .overflow-visible {
          overflow: visible !important;
        }
        .budget-estimations-print table {
          width: 100% !important;
          min-width: 0 !important;
          table-layout: fixed !important;
          border-collapse: collapse !important;
        }
        .budget-estimations-print th,
        .budget-estimations-print td {
          font-size: 7pt !important;
          line-height: 1.2 !important;
          padding: 2px 3px !important;
          white-space: normal !important;
          word-wrap: break-word !important;
          overflow-wrap: anywhere !important;
          vertical-align: top !important;
        }
        .budget-estimations-print img {
          max-width: 64px !important;
          max-height: 64px !important;
        }
        .budget-estimations-print p {
          font-size: 14pt !important;
          margin: 0 !important;
          line-height: 1.2 !important;
        }
        .budget-estimations-print p:first-child {
          font-size: 16pt !important;
        }
        .budget-estimations-print h3 {
          font-size: 11pt !important;
          margin: 8px 0 4px !important;
        }
      `,
    });
  }

  function handleExportExcel() {
    if (!excelRef.current) return;
    // Angular: link.download = `${this.trafoItem}.xls` (trafoItem = "Budget Estimation Report")
    exportHtmlTableAsExcel(excelRef.current, "Budget Estimation Report");
  }

  return (
    <PageContainer className="relative space-y-4">
      {error && !/no\s+record(?:\(s\)|s)?/i.test(getErrorMessage(error)) ? (
        <p className="text-sm text-destructive">{getErrorMessage(error)}</p>
      ) : null}

      <div className="rounded-lg border bg-card p-4">
        <h2 className="mb-3 text-base font-semibold">Budget Estimations</h2>
        <FinanceBudgetFilters
          cascade={cascade}
          showTransactionType
          loadLabel="Get List"
          loading={isFetching}
          bare
          onLoad={handleGetList}
        />
      </div>

      {loadKey ? (
        <div className="space-y-3 rounded-lg border bg-card p-4">
          <p className="text-sm font-semibold text-blue-600">
            Budget Estimations - {selectedData}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-[200px] flex-1">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search"
              />
            </div>
            <div className="ml-auto flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                onClick={handleExportExcel}
                disabled={isFetching}
              >
                <FileSpreadsheetIcon className="mr-1 h-4 w-4" />
                Export Excel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handlePrint}
                disabled={isFetching}
              >
                <PrinterIcon className="mr-1 h-4 w-4" />
                Print Report
              </Button>
            </div>
          </div>

          {isFetching ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <div ref={excelRef}>
              {/* Angular #excelTable hidden title block — included in Export Excel */}
              <div className="hidden" aria-hidden>
                <table>
                  <tbody>
                    <tr>
                      <td colSpan={10} style={{ textAlign: "center" }}>
                        <h3 style={{ fontWeight: 700, margin: 0 }}>
                          {collegeName}
                        </h3>
                        <h5 style={{ fontWeight: 700, margin: "4px 0" }}>
                          Budget Estimations Report
                        </h5>
                        <h6 style={{ fontWeight: 700, margin: 0 }}>
                          {`BUDGET ESTIMATES FOR THE YEAR ${financialYearLabel} (${entityLabel},${transactionTypeLabel})`}
                        </h6>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <BudgetEstimationsReportTables
                rows={rows}
                search={search}
                transactionTypeLabel={transactionTypeLabel}
                sectionTypes={sectionTypes}
              />
            </div>
          )}
        </div>
      ) : null}

      {/* Angular print block (outside #printNone): logo + titles + tables */}
      {loadKey && !isFetching ? (
        <div className="pointer-events-none absolute -left-[9999px] top-0 w-[1100px] bg-white text-black">
          <div
            ref={printRef}
            className="budget-estimations-print bg-white p-4 text-black"
          >
            <div className="mb-4 flex items-start gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoUrl || DEFAULT_COLLEGE_LOGO}
                alt=""
                className="h-20 w-20 shrink-0 object-contain"
                onError={(e) => {
                  const img = e.currentTarget;
                  if (!img.src.endsWith("default_logo.png")) {
                    img.src = DEFAULT_COLLEGE_LOGO;
                  }
                }}
              />
              <div className="min-w-0 flex-1 text-center">
                <p className="text-[30px] font-normal capitalize leading-tight">
                  {collegeName}
                </p>
                <p className="mt-1 text-[25px] capitalize leading-tight">
                  Budget Estimations Report
                </p>
                <p className="mt-1 text-[20px] uppercase leading-tight">
                  {`BUDGET ESTIMATES FOR THE YEAR ${financialYearLabel} (${entityLabel},${transactionTypeLabel})`}
                </p>
              </div>
            </div>
            <BudgetEstimationsReportTables
              rows={rows}
              search={search}
              transactionTypeLabel={transactionTypeLabel}
              sectionTypes={sectionTypes}
              forPrint
            />
          </div>
        </div>
      ) : null}
    </PageContainer>
  );
}
