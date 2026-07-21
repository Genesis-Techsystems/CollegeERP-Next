"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { FileSpreadsheet, Printer } from "lucide-react";
import { DatePicker } from "@/common/components/date-picker";
import { FilterCard } from "@/common/components/feedback";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
import { SearchInput } from "@/common/components/search";
import { Select, type SelectOption } from "@/common/components/select";
import { PageContainer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { MINIO_URL } from "@/config/constants/api";
import { getErrorMessage } from "@/lib/errors";
import { toastError } from "@/lib/toast";
import {
  getVisitorsSummaryReport,
  listActiveHostelsForVisitorReport,
  toHostelApiDate,
} from "@/services";

type ReportRow = Record<string, unknown>;
type ReportMode = "summary" | "detailed";

function applicationDate(): Date {
  if (typeof window === "undefined") return new Date();
  const raw = String(localStorage.getItem("presentDate") ?? "").trim();
  const match = raw.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!match) return new Date();
  const date = new Date(
    Number(match[3]),
    Number(match[2]) - 1,
    Number(match[1]),
  );
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function displayVisitedDate(value: unknown): string {
  if (!value) return "—";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? "—" : format(date, "dd-MM-yyyy");
}

function reportLogoUrl(value: unknown): string {
  const path = String(value ?? "").trim();
  if (!path || /^https?:\/\//i.test(path)) return path;
  return `${MINIO_URL}${path.replace(/^\/+/, "")}`;
}

function stringFieldMatches(row: ReportRow, query: string): boolean {
  return Object.values(row).some((value) => {
    if (typeof value === "string") return value.toLowerCase().includes(query);
    if (Array.isArray(value)) {
      return value.some(
        (entry) =>
          typeof entry === "string" && entry.toLowerCase().includes(query),
      );
    }
    if (value && typeof value === "object") {
      return stringFieldMatches(value as ReportRow, query);
    }
    return false;
  });
}

export default function MonthlyVisitorSummaryReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tableRef = useRef<HTMLDivElement>(null);
  const [hostelId, setHostelId] = useState<string | null>(null);
  const [hostels, setHostels] = useState<SelectOption[]>([]);
  const [loadingHostels, setLoadingHostels] = useState(true);
  const [fromDate, setFromDate] = useState<Date | null>(new Date());
  const [toDate, setToDate] = useState<Date | null>(new Date());
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<ReportMode>("summary");
  const [searchText, setSearchText] = useState("");
  const today = useMemo(() => new Date(), []);

  useEffect(() => {
    const date = applicationDate();
    setFromDate(date);
    setToDate(date);
    setLoadingHostels(true);
    void listActiveHostelsForVisitorReport()
      .then((items) =>
        setHostels(
          items.map((hostel) => ({
            value: String(hostel.hostelId),
            label: String(hostel.hostelName ?? hostel.hostelId),
          })),
        ),
      )
      .catch((loadError) => toastError(loadError, "Failed to load hostels"))
      .finally(() => setLoadingHostels(false));
  }, []);

  const filteredRows = useMemo(() => {
    const query = searchText.toLowerCase();
    return query ? rows.filter((row) => stringFieldMatches(row, query)) : rows;
  }, [rows, searchText]);

  const getList = async () => {
    const hostelNum = Number(hostelId ?? 0);
    const from = toHostelApiDate(fromDate);
    const to = toHostelApiDate(toDate);
    if (!hostelNum || !from || !to) return;
    setLoading(true);
    setError(null);
    setSearchText("");
    try {
      setRows(
        await getVisitorsSummaryReport({
          hostelId: hostelNum,
          fromDate: from,
          toDate: to,
        }),
      );
    } catch (loadError) {
      setRows([]);
      setError(getErrorMessage(loadError));
      toastError(loadError, "Failed to load visitor report");
    } finally {
      setLoading(false);
    }
  };

  const exportExcel = () => {
    if (!tableRef.current) return;
    const html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office"
        xmlns:x="urn:schemas-microsoft-com:office:excel">
        <head><meta charset="UTF-8"></head>
        <body><h3>Monthly Visitor Summary Report</h3>${tableRef.current.innerHTML}</body>
      </html>`;
    const blob = new Blob([html], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "Monthly Visitors Summary  Report.xls";
    link.click();
    URL.revokeObjectURL(url);
  };

  const firstRow = rows[0];

  return (
    <PageContainer className="space-y-4">
      <div className="print:hidden">
        <FilterCard title="Monthly Visitor Summary Report">
          <GlobalFilterBarRow>
            <GlobalFilterField label="Hostel *">
              <Select
                value={hostelId}
                onChange={(value) => {
                  setHostelId(value);
                  setRows([]);
                }}
                options={hostels}
                isLoading={loadingHostels}
                searchable={false}
                clearable={false}
                placeholder="Select hostel"
              />
            </GlobalFilterField>
            <GlobalFilterField label="From Date">
              <DatePicker
                value={fromDate}
                onChange={(date) => {
                  setFromDate(date);
                  if (date && toDate && date.getTime() > toDate.getTime()) {
                    setToDate(date);
                  }
                }}
                maxDate={today}
                clearable={false}
              />
            </GlobalFilterField>
            <GlobalFilterField label="To Date">
              <DatePicker
                value={toDate}
                onChange={(date) => {
                  setToDate(date);
                  setRows([]);
                }}
                minDate={fromDate ?? undefined}
                maxDate={today}
                clearable={false}
              />
            </GlobalFilterField>
            <GlobalFilterField label={"\u00a0"}>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="h-9"
                  onClick={() => void getList()}
                >
                  {loading ? "Loading…" : "Get List"}
                </Button>
              </div>
            </GlobalFilterField>
          </GlobalFilterBarRow>
        </FilterCard>
      </div>

      {error ? (
        <p className="print:hidden px-1 text-sm text-destructive">{error}</p>
      ) : null}

      {rows.length > 0 ? (
        <div className="app-card space-y-4 p-4">
          <div className="hidden print:block">
            {firstRow?.logo_path ? (
              <img
                src={reportLogoUrl(firstRow.logo_path)}
                alt=""
                className="mx-auto mb-2 max-h-24 object-contain"
              />
            ) : null}
            <h2 className="text-center text-lg font-semibold">
              {String(firstRow?.college_name ?? "")}
            </h2>
            <h3 className="text-center font-semibold">
              Monthly Visitor Summary Report
            </h3>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
            <SearchInput
              value={searchText}
              onChange={setSearchText}
              placeholder="Search"
              className="max-w-xs"
            />
            <div className="flex flex-wrap items-center gap-4">
              <RadioGroup
                value={mode}
                onValueChange={(value) => setMode(value as ReportMode)}
                className="flex"
              >
                <Label className="flex items-center gap-2">
                  <RadioGroupItem value="summary" />
                  Summary Report
                </Label>
                <Label className="flex items-center gap-2">
                  <RadioGroupItem value="detailed" />
                  Detailed Report
                </Label>
              </RadioGroup>
              <Button type="button" size="sm" onClick={exportExcel}>
                <FileSpreadsheet className="mr-1.5 h-4 w-4" />
                Export Excel
              </Button>
              <Button type="button" size="sm" onClick={() => window.print()}>
                <Printer className="mr-1.5 h-4 w-4" />
                Print Report
              </Button>
            </div>
          </div>

          <div ref={tableRef} className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-px text-sm">
              <thead className="bg-[#c3d9ff]">
                <tr>
                  <th className="p-2 text-left font-medium">S.No</th>
                  <th className="p-2 text-left font-medium">Hostel</th>
                  {mode === "summary" ? (
                    <>
                      <th className="p-2 text-left font-medium">
                        Parent Visitors
                      </th>
                      <th className="p-2 text-left font-medium">
                        Other Visitors
                      </th>
                    </>
                  ) : (
                    <>
                      <th className="p-2 text-left font-medium">
                        Student Name
                      </th>
                      <th className="p-2 text-left font-medium">
                        Visitor Name
                      </th>
                      <th className="p-2 text-left font-medium">
                        Visitor Relation
                      </th>
                      <th className="p-2 text-left font-medium">
                        Visited Date
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row, index) => (
                  <tr key={`${String(row.hostel_name)}-${index}`}>
                    <td className="p-2 font-medium">{index + 1}</td>
                    <td className="p-2 font-medium">
                      {String(row.hostel_name ?? "")}
                    </td>
                    {mode === "summary" ? (
                      <>
                        <td className="p-2 font-medium">
                          {String(row.ParentVisits ?? "")}
                        </td>
                        <td className="p-2 font-medium">
                          {String(row.OthersVisits ?? "")}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="p-2 font-medium">
                          {String(row.student_name ?? "")}
                        </td>
                        <td className="p-2 font-medium">
                          {String(row.visitor_name ?? "")}
                        </td>
                        <td className="p-2 font-medium">
                          {String(row.relation ?? "")}
                        </td>
                        <td className="p-2 font-medium">
                          {displayVisitedDate(row.Visited_Date)}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </PageContainer>
  );
}
