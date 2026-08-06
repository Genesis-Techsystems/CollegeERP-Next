"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import type { ColDef } from "ag-grid-community";
import { format } from "date-fns";
import { FilteredListPage } from "@/components/layout";
import { DatePicker } from "@/common/components/date-picker";
import { Select } from "@/common/components/select";
import { Button } from "@/components/ui/button";
import { QK } from "@/lib/query-keys";
import { toastInfo } from "@/lib/toast";
import { useApiQueryToasts } from "@/hooks";
import { getCertificateSummaryReport } from "@/services";
import type { CertificateSummaryReportRow } from "@/types/tc-no-due";
import { useTcCollegeCascade } from "@/app/(pages)/(protected)/tc-no-due-approval/_lib/use-tc-college-cascade";

const COL_DEFS: ColDef<CertificateSummaryReportRow>[] = [
  {
    field: "id",
    headerName: "S.No",
    width: 80,
    flex: 0,
    cellClass: "text-left",
  },
  {
    field: "college_shortname",
    headerName: "College",
    minWidth: 120,
    flex: 1,
    cellClass: "text-left",
  },
  {
    field: "academic_year",
    headerName: "Academic Year",
    minWidth: 120,
    flex: 1,
    cellClass: "text-left",
  },
  {
    field: "Transfer_Certificates",
    headerName: "Transfer Certificate",
    minWidth: 140,
    flex: 1,
    cellClass: "text-left",
  },
  {
    field: "Bonafide_Certificates",
    headerName: "Bonafide Certificate",
    minWidth: 140,
    flex: 1,
    cellClass: "text-left",
  },
  {
    field: "Other_Certificates",
    headerName: "Other Certificates",
    minWidth: 140,
    flex: 1,
    cellClass: "text-left",
  },
];

export default function CertificateRequestReportPage() {
  const router = useRouter();
  const [collegeId, setCollegeId] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState<Date | null>(new Date());
  const [toDate, setToDate] = useState<Date | null>(new Date());
  const [loadKey, setLoadKey] = useState<string | null>(null);

  const collegeNum = Number(collegeId ?? 0);
  const { colleges, loadingColleges } = useTcCollegeCascade(collegeNum);

  useEffect(() => {
    if (!collegeId && colleges.length > 0) {
      setCollegeId(String(colleges[0]!.value));
    }
  }, [colleges, collegeId]);

  const {
    data: rows = [],
    isFetching,
    error,
    isSuccess,
    isError,
  } = useQuery({
    queryKey: QK.tcNoDue.summaryReport(
      loadKey ? Number(JSON.parse(loadKey).collegeId) : 0,
      loadKey ? JSON.parse(loadKey).fromDate : "",
      loadKey ? JSON.parse(loadKey).toDate : "",
    ),
    queryFn: () => {
      const p = JSON.parse(loadKey!) as {
        collegeId: number;
        fromDate: string;
        toDate: string;
      };
      return getCertificateSummaryReport(p);
    },
    enabled: loadKey != null,
  });

  const { resetApiToast } = useApiQueryToasts({
    requestKey: loadKey,
    isFetching,
    isSuccess,
    isError,
    error,
    rowCount: rows.length,
  });

  const tableRows = useMemo(
    () =>
      rows.map((row, i) => ({
        ...row,
        id: row.id ?? i + 1,
      })),
    [rows],
  );

  function handleGetList() {
    if (!collegeNum) {
      toastInfo("Please select college.");
      return;
    }
    if (!fromDate || !toDate) {
      toastInfo("Please select from and to dates.");
      return;
    }
    resetApiToast();
    setLoadKey(
      JSON.stringify({
        collegeId: collegeNum,
        fromDate: format(fromDate, "yyyy-MM-dd"),
        toDate: format(toDate, "yyyy-MM-dd"),
      }),
    );
  }

  const resultsVisible = loadKey != null && !isFetching && rows.length > 0;

  return (
    <FilteredListPage<CertificateSummaryReportRow>
      title="Certificate Request Report"
      filters={
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[180px] flex-1">
            <Select
              label="College"
              required
              value={collegeId}
              onChange={(v) => {
                setCollegeId(v);
                setLoadKey(null);
              }}
              options={colleges}
              placeholder="College"
              isLoading={loadingColleges}
            />
          </div>
          <div className="min-w-[160px] flex-1">
            <DatePicker
              label="From Date"
              value={fromDate}
              onChange={(d) => {
                setFromDate(d);
                setLoadKey(null);
              }}
              maxDate={new Date()}
            />
          </div>
          <div className="min-w-[160px] flex-1">
            <DatePicker
              label="To Date"
              value={toDate}
              onChange={(d) => {
                setToDate(d);
                setLoadKey(null);
              }}
              maxDate={new Date()}
            />
          </div>
          <Button
            type="button"
            size="sm"
            disabled={isFetching || !collegeId || !fromDate || !toDate}
            onClick={handleGetList}
          >
            {isFetching ? "Loading…" : "Get List"}
          </Button>
        </div>
      }
      rowData={tableRows}
      columnDefs={COL_DEFS}
      loading={isFetching}
      resultsVisible={resultsVisible}
      height="auto"
      pagination
      columnFilters={true}
      getRowId={(p) => String(p.data?.id ?? "")}
      toolbar={{
        search: true,
        searchPlaceholder: "Search",
        exportExcel: true,
        exportPdf: true,
        columnPicker: false,
        excelDocumentTitle: "Certificate Request Report",
        excelFileName: "Certificate Request Report.xls",
      }}
    />
  );
}
