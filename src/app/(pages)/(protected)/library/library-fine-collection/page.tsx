"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ColDef } from "ag-grid-community";
import { Loader2, Printer } from "lucide-react";
import { DatePicker } from "@/common/components/date-picker";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
import { Select } from "@/common/components/select";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { toDateStr } from "@/common/generic-functions";
import { getErrorMessage } from "@/lib/errors";
import { QK } from "@/lib/query-keys";
import { toastError, toastInfo } from "@/lib/toast";
import { rowIndexGetter } from "@/lib/utils";
import {
  listActiveCollegesForGeneralSettings,
  listLibrariesByCollege,
  listLibraryFineCollection,
  printLibraryFineCollectionReport,
} from "@/services";
import type { LibraryFineCollectionRow } from "@/types/library";

const COL_DEFS = {
  siNo: {
    headerName: "No.",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<LibraryFineCollectionRow>,
  rollNumber: {
    field: "Roll_Number",
    headerName: "Roll Number",
    minWidth: 120,
  } as ColDef<LibraryFineCollectionRow>,
  studentName: {
    field: "Student_Name",
    headerName: "Student Name",
    minWidth: 160,
  } as ColDef<LibraryFineCollectionRow>,
  accessionNo: {
    field: "Accession_No",
    headerName: "Accession No",
    minWidth: 120,
  } as ColDef<LibraryFineCollectionRow>,
  employeeName: {
    field: "Employee_Name",
    headerName: "Employee Name",
    minWidth: 140,
  } as ColDef<LibraryFineCollectionRow>,
  fineDate: {
    field: "Fine_Collected_Date",
    headerName: "Fine Collected Date",
    minWidth: 140,
  } as ColDef<LibraryFineCollectionRow>,
  fineAmount: {
    field: "Fine_Collected_Amount",
    headerName: "Fine Collected Amount",
    minWidth: 150,
    flex: 0,
  } as ColDef<LibraryFineCollectionRow>,
  fineRemarks: {
    field: "Fine_Remarks",
    headerName: "Fine Remarks",
    minWidth: 140,
  } as ColDef<LibraryFineCollectionRow>,
};

export default function LibraryFineCollectionPage() {
  const [collegeId, setCollegeId] = useState<number | null>(null);
  const [libraryId, setLibraryId] = useState<number | null>(null);
  const [collectedDate, setCollectedDate] = useState<Date | null>(new Date());
  const [rows, setRows] = useState<LibraryFineCollectionRow[]>([]);
  const [lastQuery, setLastQuery] = useState<{
    dateYmd: string;
    libraryId: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [printing, setPrinting] = useState(false);

  const { data: colleges = [], isLoading: loadingColleges } = useQuery({
    queryKey: QK.library.collegesForFineCollection(),
    queryFn: listActiveCollegesForGeneralSettings,
  });

  const collegeNum = collegeId ?? 0;
  const { data: libraries = [], isLoading: loadingLibraries } = useQuery({
    queryKey: QK.library.librariesByCollegeForFine(collegeNum),
    queryFn: () => listLibrariesByCollege(collegeNum),
    enabled: collegeNum > 0,
  });

  useEffect(() => {
    if (colleges.length === 0 || collegeId != null) return;
    const first = colleges[0]?.collegeId;
    if (first) setCollegeId(first);
  }, [colleges, collegeId]);

  const collegeOptions = useMemo(
    () =>
      colleges.map((college) => ({
        value: String(college.collegeId),
        label:
          college.collegeCode ??
          college.collegeName ??
          String(college.collegeId),
      })),
    [colleges],
  );

  const libraryOptions = useMemo(
    () =>
      libraries.map((library) => ({
        value: String(library.libraryId),
        label:
          library.libraryCode ??
          library.libraryName ??
          String(library.libraryId),
      })),
    [libraries],
  );

  const columnDefs = useMemo<ColDef<LibraryFineCollectionRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.rollNumber,
      COL_DEFS.studentName,
      COL_DEFS.accessionNo,
      COL_DEFS.employeeName,
      COL_DEFS.fineDate,
      COL_DEFS.fineAmount,
      COL_DEFS.fineRemarks,
    ],
    [],
  );

  const totalAmount = useMemo(
    () =>
      rows.reduce(
        (sum, row) => sum + Number(row.Fine_Collected_Amount ?? 0),
        0,
      ),
    [rows],
  );

  function clearResults() {
    setRows([]);
    setLastQuery(null);
  }

  async function handleGetList() {
    const dateYmd = toDateStr(collectedDate);
    if (!collegeId) {
      toastError("College is required");
      return;
    }
    if (!libraryId) {
      toastError("Library is required");
      return;
    }
    if (!dateYmd) {
      toastError("Fine Collected Date is required");
      return;
    }

    setLoading(true);
    clearResults();
    try {
      const data = await listLibraryFineCollection({ dateYmd, libraryId });
      setRows(data);
      setLastQuery({ dateYmd, libraryId });
      if (data.length === 0) {
        // Angular: snotifyService.success(result.message) for empty result
        toastInfo("No Records(s) found.");
      }
    } catch (error) {
      toastError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function handlePrint() {
    if (!lastQuery) {
      toastError("Load the list before printing the report");
      return;
    }
    setPrinting(true);
    try {
      await printLibraryFineCollectionReport(lastQuery);
    } catch (error) {
      toastError(getErrorMessage(error));
    } finally {
      setPrinting(false);
    }
  }

  return (
    <FilteredListPage
      title="Library Fine Collection"
      filters={
        <GlobalFilterBarRow>
          <GlobalFilterField label="College *">
            <Select
              value={collegeId ? String(collegeId) : null}
              onChange={(value) => {
                setCollegeId(value ? Number(value) : null);
                setLibraryId(null);
                clearResults();
              }}
              options={collegeOptions}
              placeholder="College"
              searchable
              isLoading={loadingColleges}
            />
          </GlobalFilterField>
          <GlobalFilterField label="Library *">
            <Select
              value={libraryId ? String(libraryId) : null}
              onChange={(value) => {
                setLibraryId(value ? Number(value) : null);
                clearResults();
              }}
              options={libraryOptions}
              placeholder="Library"
              searchable
              isLoading={loadingLibraries}
              disabled={!collegeId}
            />
          </GlobalFilterField>
          <GlobalFilterField label="Fine Collected Date">
            <DatePicker
              value={collectedDate}
              onChange={(date) => {
                setCollectedDate(date);
                clearResults();
              }}
            />
          </GlobalFilterField>
          <GlobalFilterField
            label=" "
            className="global-filter-field--action global-filter-field--shrink"
          >
            <Button
              type="button"
              size="sm"
              className="h-9 shrink-0 px-4 text-[12px]"
              onClick={() => void handleGetList()}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading…
                </>
              ) : (
                "Get List"
              )}
            </Button>
          </GlobalFilterField>
        </GlobalFilterBarRow>
      }
      rowData={rows}
      columnDefs={columnDefs}
      loading={loading}
      pagination
      paginationPageSize={25}
      toolbar={{
        search: true,
        searchPlaceholder: "Search",
        pdfDocumentTitle: "Library Fee Collection",
      }}
      toolbarTrailing={
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-[30px] w-8 p-0"
          aria-label="Print report"
          disabled={printing || !lastQuery}
          onClick={() => void handlePrint()}
        >
          {printing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Printer className="h-3.5 w-3.5" />
          )}
        </Button>
      }
      body={
        rows.length > 0 ? (
          <div className="flex justify-end rounded-lg border bg-card px-5 py-3 text-sm shadow-sm">
            <span className="font-semibold">Total Amount: {totalAmount}</span>
          </div>
        ) : undefined
      }
    />
  );
}
