"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { Printer } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Select } from "@/common/components/select";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { rowIndexGetter } from "@/lib/utils";
import { toastError, toastInfo } from "@/lib/toast";
import {
  filterAcademicYears,
  filterColleges,
  pickNum,
  pickText,
  type FilterRow,
} from "@/app/(pages)/(protected)/accounts-and-fees/fee-masters/_lib/fee-master-filters";
import { getFeeMasterCollegeFilters, listFeeConcessions } from "@/services";
import type { FeeConcessionRow } from "@/types/fees-collection";

const COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<FeeConcessionRow>,
  rollNo: {
    field: "studentRollNo",
    headerName: "Roll No.",
    minWidth: 120,
  } as ColDef<FeeConcessionRow>,
  student: {
    field: "studentFirstName",
    headerName: "Student",
    minWidth: 150,
  } as ColDef<FeeConcessionRow>,
  quota: {
    field: "quotaName",
    headerName: "Quota",
    minWidth: 110,
  } as ColDef<FeeConcessionRow>,
  course: { headerName: "Course", minWidth: 180 } as ColDef<FeeConcessionRow>,
  receiptDt: {
    field: "receiptDt",
    headerName: "Institutional Scholarship By",
    minWidth: 160,
  } as ColDef<FeeConcessionRow>,
  requestedEmp: {
    headerName: "Collected Employee",
    minWidth: 140,
    valueGetter: (p) => String(p.data?.requestedEmployeeFirstName ?? "—"),
  } as ColDef<FeeConcessionRow>,
  authorizedEmp: {
    headerName: "Collected Employee",
    minWidth: 140,
    valueGetter: (p) => String(p.data?.authorizedEmployeeFirstName ?? "—"),
  } as ColDef<FeeConcessionRow>,
  particular: {
    headerName: "Particular",
    minWidth: 140,
    valueGetter: (p) =>
      String(p.data?.particularsName ?? p.data?.categoryName ?? "—"),
  } as ColDef<FeeConcessionRow>,
  value: {
    field: "value",
    headerName: "Amount",
    minWidth: 100,
  } as ColDef<FeeConcessionRow>,
};

function courseRenderer(p: ICellRendererParams<FeeConcessionRow>) {
  const row = p.data;
  if (!row) return null;
  const course = String(row.studentCourseName ?? row.course ?? "");
  const ay = String(row.academicYear ?? "");
  return (
    <span>
      {course}
      {ay ? (
        <>
          {" "}
          (<span className="font-medium text-blue-600">{ay}</span>)
        </>
      ) : null}
    </span>
  );
}

export default function ConcessionListPage() {
  const employeeId = Number(
    globalThis?.localStorage?.getItem("employeeId") ?? 0,
  );
  const orgId = Number(
    globalThis?.localStorage?.getItem("organizationId") ?? 0,
  );

  const [collegeId, setCollegeId] = useState<string | null>(null);
  const [academicYearId, setAcademicYearId] = useState<string | null>(null);
  const [rows, setRows] = useState<FeeConcessionRow[]>([]);
  const [dataDetails, setDataDetails] = useState("");
  const [loadingList, setLoadingList] = useState(false);

  const { data: filterBundle, isLoading: loadingFilters } = useQuery({
    queryKey: ["ConcessionList", "filters", orgId, employeeId],
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
      setAcademicYearId(null);
      return;
    }
    if (academicYears.length === 0) {
      setAcademicYearId(null);
      return;
    }
    const current =
      academicYears.find(
        (r) => Number(r.is_curr_ay ?? r.isCurrAy ?? 0) === 1,
      ) ?? academicYears[0];
    setAcademicYearId(
      String(pickNum(current, ["fk_academic_year_id", "academicYearId"])),
    );
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

  const ayOptions = useMemo(
    () =>
      academicYears.map((r) => ({
        value: String(pickNum(r, ["fk_academic_year_id", "academicYearId"])),
        label:
          pickText(r, ["academic_year", "academicYear"]) ||
          String(pickNum(r, ["fk_academic_year_id"])),
      })),
    [academicYears],
  );

  const getList = useCallback(async () => {
    if (!collegeNum) {
      toastInfo("Please select college.");
      return;
    }
    const collegeCode =
      collegeOptions.find((o) => o.value === collegeId)?.label ?? "";
    const ayLabel = academicYearId
      ? (ayOptions.find((o) => o.value === academicYearId)?.label ?? "")
      : "";
    setDataDetails([collegeCode, ayLabel].filter(Boolean).join(" / "));

    setLoadingList(true);
    try {
      const result = await listFeeConcessions({
        collegeId: collegeNum,
        academicYearId: academicYearId ? Number(academicYearId) : 0,
        page: 0,
        size: 1000,
        status: true,
      });
      setRows(result.rows);
      if (result.rows.length === 0)
        toastInfo("No institutional scholarship records found.");
    } catch (e) {
      toastError(e, "Failed to load institutional scholarship list");
      setRows([]);
    } finally {
      setLoadingList(false);
    }
  }, [collegeNum, collegeId, academicYearId, collegeOptions, ayOptions]);

  const columnDefs = useMemo<ColDef<FeeConcessionRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.rollNo,
      COL_DEFS.student,
      COL_DEFS.quota,
      { ...COL_DEFS.course, cellRenderer: courseRenderer },
      COL_DEFS.receiptDt,
      COL_DEFS.requestedEmp,
      COL_DEFS.authorizedEmp,
      COL_DEFS.particular,
      COL_DEFS.value,
    ],
    [],
  );

  const pageTitle =
    rows.length > 0 && dataDetails
      ? dataDetails
      : "Institutional Scholarship List";

  return (
    <FilteredListPage<FeeConcessionRow>
      title={pageTitle}
      filters={
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 lg:items-end">
          <Select
            label="College"
            required
            value={collegeId}
            onChange={(v) => {
              setCollegeId(v);
              setAcademicYearId(null);
              setRows([]);
              setDataDetails("");
            }}
            options={collegeOptions}
            placeholder="Select college"
            searchable
            isLoading={loadingFilters}
          />
          <Select
            label="Academic Year"
            value={academicYearId}
            onChange={(v) => {
              setAcademicYearId(v);
              setRows([]);
            }}
            options={ayOptions}
            placeholder="Select"
            searchable
            clearable
            disabled={!collegeId}
          />
          <div className="flex flex-wrap items-center gap-2 lg:col-span-2">
            <Button
              type="button"
              size="sm"
              className="!h-8 w-auto shrink-0 !px-3 !text-[12px] bg-[#f0c040] font-medium text-slate-900 hover:bg-[#e5b535]"
              disabled={loadingList || !collegeId}
              onClick={() => void getList()}
            >
              {loadingList ? "Loading…" : "Get List"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="!h-8 w-auto shrink-0 gap-1.5 !px-3 !text-[12px]"
              disabled={rows.length === 0}
              onClick={() => window.print()}
            >
              <Printer className="!h-3.5 !w-3.5" />
              Print Report
            </Button>
          </div>
        </div>
      }
      rowData={rows}
      columnDefs={columnDefs}
      loading={loadingList}
      height="auto"
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: "Search",
        exportExcel: rows.length > 0,
      }}
      getRowId={(p) =>
        String(
          p.data?.feeStdDiscountId ??
            [
              p.data?.studentRollNo,
              p.data?.feeParticularsId,
              p.data?.value,
              p.data?.particularsName ?? p.data?.categoryName,
            ].join("-"),
        )
      }
    />
  );
}
