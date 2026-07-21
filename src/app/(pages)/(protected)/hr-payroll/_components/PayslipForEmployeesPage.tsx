"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { format } from "date-fns";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
import { Select, type SelectOption } from "@/common/components/select";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/errors";
import { toastError } from "@/lib/toast";
import {
  enrichEmployeesWithPayslipMonths,
  listActiveCollegesForGeneralSettings,
  listEmployeePayrollGroupPage,
  listEmployeePayslipGenerationsForEmployeeList,
} from "@/services";
import { rowIndexGetter } from "@/lib/utils";

type EmpRow = Record<string, unknown>;
const PAGE_SIZE = 50;

function makePayslipActionsRenderer(collegeId: number) {
  return (params: ICellRendererParams<EmpRow>) => {
    const row = params.data;
    const empPayrollGroupId = Number(row?.empPayrollGroupId ?? 0);
    const employeeId = Number(row?.employeeId ?? 0);
    const payrollGroupId = Number(row?.payrollGroupId ?? 0);
    if (!empPayrollGroupId || !employeeId || !payrollGroupId) return null;

    // Angular calculates this flag but always sends false from this page.
    const query = new URLSearchParams({
      empPayrollGroupId: String(empPayrollGroupId),
      employeeId: String(employeeId),
      payrollGroupId: String(payrollGroupId),
      collegeId: String(collegeId),
      isAlreadyExists: "false",
    });

    return (
      <div className="flex items-center gap-1">
        <Button asChild size="sm" variant="ghost" className="h-7 px-2">
          <Link
            href={`/hr-payroll/payroll/payslip-for-employees/generate-payslip?${query}`}
          >
            Generate
          </Link>
        </Button>
        <span className="text-muted-foreground">|</span>
        <Button asChild size="sm" variant="ghost" className="h-7 px-2">
          <Link
            href={`/hr-payroll/payroll/payslip-for-employees/view-payslip?${query}`}
          >
            View
          </Link>
        </Button>
      </div>
    );
  };
}

export function PayslipForEmployeesPage() {
  const searchParams = useSearchParams();
  const initialCollegeId = Number(searchParams.get("collegeId") ?? 0);
  const [collegeId, setCollegeId] = useState<number | null>(
    initialCollegeId || null,
  );
  const [colleges, setColleges] = useState<SelectOption[]>([]);
  const [rows, setRows] = useState<EmpRow[]>([]);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [fetchEnabled, setFetchEnabled] = useState(initialCollegeId > 0);
  const [requestId, setRequestId] = useState(0);
  const [loading, setLoading] = useState(false);
  const [collegesLoading, setCollegesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      setCollegesLoading(true);
      try {
        const list = await listActiveCollegesForGeneralSettings();
        setColleges(
          list.map((college) => ({
            value: String(college.collegeId),
            label: String(
              college.collegeCode ?? college.collegeName ?? college.collegeId,
            ),
          })),
        );
      } catch (loadError) {
        toastError(loadError, "Failed to load colleges");
      } finally {
        setCollegesLoading(false);
      }
    })();
  }, []);

  const loadEmployees = useCallback(async () => {
    if (!collegeId || !fetchEnabled) return;
    setLoading(true);
    setError(null);
    try {
      const [employeePage, payslips] = await Promise.all([
        listEmployeePayrollGroupPage({
          collegeId,
          page,
          size: PAGE_SIZE,
        }),
        listEmployeePayslipGenerationsForEmployeeList(collegeId),
      ]);
      setRows(enrichEmployeesWithPayslipMonths(employeePage.rows, payslips));
      setTotalCount(employeePage.totalCount);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
      setRows([]);
      setTotalCount(0);
      toastError(loadError, "Failed to load employees");
    } finally {
      setLoading(false);
    }
  }, [collegeId, fetchEnabled, page]);

  useEffect(() => {
    void loadEmployees();
  }, [loadEmployees, requestId]);

  const columnDefs = useMemo<ColDef<EmpRow>[]>(
    () => [
      {
        headerName: "SI.No",
        valueGetter: rowIndexGetter,
        width: 70,
        flex: 0,
      },
      {
        field: "firstName",
        headerName: "Employee",
        minWidth: 180,
        valueFormatter: (params) => {
          const name = String(params.data?.firstName ?? "");
          const number = String(params.data?.empNumber ?? "");
          return number ? `${name} (${number})` : name;
        },
      },
      {
        field: "departmentCode",
        headerName: "Department",
        minWidth: 120,
      },
      {
        field: "payrollGroupName",
        headerName: "Payroll Group",
        minWidth: 150,
      },
      {
        field: "paymentFrequencyCode",
        headerName: "Frequency",
        minWidth: 110,
      },
      {
        field: "generatedDate",
        headerName: "Payslip",
        minWidth: 130,
        valueFormatter: (params) =>
          params.value
            ? format(new Date(String(params.value)), "MMM d, yyyy")
            : "—",
      },
      {
        headerName: "Actions",
        minWidth: 160,
        flex: 0,
        cellRenderer: collegeId
          ? makePayslipActionsRenderer(collegeId)
          : undefined,
      },
    ],
    [collegeId],
  );

  return (
    <FilteredListPage<EmpRow>
      title="Payslips for Employees"
      filters={
        <GlobalFilterBarRow>
          <GlobalFilterField label="College *">
            <Select
              value={collegeId != null ? String(collegeId) : null}
              onChange={(value) => {
                setCollegeId(value ? Number(value) : null);
                setRows([]);
                setTotalCount(0);
                setPage(0);
                setFetchEnabled(false);
              }}
              options={colleges}
              isLoading={collegesLoading}
              placeholder="Select college"
              clearable={false}
            />
          </GlobalFilterField>
          <GlobalFilterField label={"\u00a0"}>
            <Button
              type="button"
              size="sm"
              className="h-9"
              disabled={!collegeId || loading}
              onClick={() => {
                setPage(0);
                setFetchEnabled(true);
                setRequestId((value) => value + 1);
              }}
            >
              {loading ? "Loading…" : "Get List"}
            </Button>
          </GlobalFilterField>
        </GlobalFilterBarRow>
      }
      rowData={fetchEnabled ? rows : []}
      columnDefs={columnDefs}
      loading={loading}
      serverSide
      totalCount={totalCount}
      currentPage={page}
      paginationPageSize={PAGE_SIZE}
      onPageChange={(nextPage) => {
        setPage(nextPage);
        setFetchEnabled(true);
      }}
      toolbar={{
        search: true,
        searchPlaceholder: "Search",
        columnPicker: true,
        exportExcel: true,
        exportPdf: true,
        pdfDocumentTitle: "Payslips for Employees",
      }}
    />
  );
}
