"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { format } from "date-fns";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { DatePicker } from "@/common/components/date-picker";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
import { Select, type SelectOption } from "@/common/components/select";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  enrichMonthlyPayslipEmployees,
  generateMonthlyPayslips,
  listActiveCollegesForGeneralSettings,
  listDepartmentsByCollege,
  listEmployeePayrollGroupByCollege,
  listEmployeePayslipGenerationsByDate,
  sendPayslipEmails,
} from "@/services";
import { rowIndexGetter } from "@/lib/utils";

type EmpRow = Record<string, unknown>;

function makeMonthlyViewRenderer(collegeId: number, payslipDate: Date) {
  return (p: ICellRendererParams<EmpRow>) => {
    if (!p.data?.employeeId || !p.data?.empPayrollGroupId) return null;
    const q = new URLSearchParams({
      payslipMonth: String(p.data.generatedDate ?? payslipDate.toISOString()),
      status: String(p.data.status ?? ""),
      empPayrollGroupId: String(p.data.empPayrollGroupId ?? ""),
      payrollGroupId: String(p.data.payrollGroupId ?? ""),
      empPayslipGenerationId: String(p.data.empPayslipGenerationId ?? ""),
      empId: String(p.data.employeeId ?? ""),
      collegeId: String(collegeId),
      departmentId: String(p.data.departmentId ?? 0),
      date: format(payslipDate, "yyyy-MM-dd"),
    });
    return (
      <Button asChild size="sm" variant="ghost">
        <Link
          href={`/hr-payroll/payroll/monthly-playslip/view-monthly-payslip?${q}`}
        >
          View
        </Link>
      </Button>
    );
  };
}

export function MonthlyPayslipPage() {
  const searchParams = useSearchParams();
  const didRestoreGrid = useRef(false);
  const [collegeId, setCollegeId] = useState<number | null>(
    Number(searchParams.get("collegeId") ?? 0) || null,
  );
  const [departmentId, setDepartmentId] = useState<number | null>(() => {
    const value = searchParams.get("departmentId");
    return value != null && value !== "" ? Number(value) : null;
  });
  const [payslipDate, setPayslipDate] = useState<Date>(() => {
    const d = searchParams.get("date");
    return d ? new Date(d) : new Date();
  });

  const [colleges, setColleges] = useState<SelectOption[]>([]);
  const [departments, setDepartments] = useState<SelectOption[]>([]);
  const [rows, setRows] = useState<EmpRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [departmentsLoading, setDepartmentsLoading] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const list = await listActiveCollegesForGeneralSettings();
        setColleges(
          list.map((c) => ({
            value: String(c.collegeId),
            label: String(c.collegeCode ?? c.collegeName ?? c.collegeId),
          })),
        );
      } catch (error) {
        toastError(error, "Failed to load colleges");
      }
    })();
  }, []);

  const loadDepartments = useCallback(async (cid: number) => {
    setDepartmentsLoading(true);
    try {
      const depts = await listDepartmentsByCollege(cid);
      setDepartments([
        { value: "0", label: "All" },
        ...depts.map((d) => ({
          value: String(d.departmentId),
          label: String(d.deptCode ?? d.deptName ?? d.departmentId),
        })),
      ]);
    } catch (error) {
      toastError(error, "Failed to load departments");
      setDepartments([{ value: "0", label: "All" }]);
    } finally {
      setDepartmentsLoading(false);
    }
  }, []);

  const loadGrid = useCallback(async () => {
    if (!collegeId || departmentId == null) return;
    setLoading(true);
    try {
      const dateYmd = format(payslipDate, "yyyy-MM-dd");
      let employees = await listEmployeePayrollGroupByCollege(collegeId);
      if (departmentId !== 0) {
        employees = employees.filter(
          (e) => Number(e.departmentId) === departmentId,
        );
      }
      const payslips = await listEmployeePayslipGenerationsByDate(dateYmd);
      const merged = enrichMonthlyPayslipEmployees(
        employees,
        payslips,
        payslipDate,
      );
      setRows(merged);
      if (merged.length === 0)
        toast.message("No payslips found for the selected criteria");
    } catch (e) {
      toastError(e, "Failed to load monthly payslips");
    } finally {
      setLoading(false);
    }
  }, [collegeId, departmentId, payslipDate]);

  useEffect(() => {
    if (collegeId) void loadDepartments(collegeId);
  }, [collegeId, loadDepartments]);

  // Angular restores the result grid only when returning from View.
  useEffect(() => {
    if (
      didRestoreGrid.current ||
      !searchParams.has("collegeId") ||
      !collegeId ||
      departmentId == null
    ) {
      return;
    }
    didRestoreGrid.current = true;
    void loadGrid();
  }, [collegeId, departmentId, loadGrid, searchParams]);

  const columnDefs = useMemo<ColDef<EmpRow>[]>(
    () => [
      { headerName: "SI.No", valueGetter: rowIndexGetter, width: 70, flex: 0 },
      { field: "firstName", headerName: "Employee", minWidth: 150 },
      { field: "departmentCode", headerName: "Department", minWidth: 100 },
      { field: "empCatName", headerName: "Category", minWidth: 110 },
      {
        field: "generatedDate",
        headerName: "Recent Payslip",
        minWidth: 110,
        valueFormatter: (p) =>
          p.value ? format(new Date(String(p.value)), "dd MMM, yyyy") : "—",
      },
      {
        field: "grossPay",
        headerName: "Gross",
        minWidth: 90,
        valueFormatter: (p) =>
          p.value != null ? Number(p.value).toFixed(2) : "—",
      },
      {
        field: "netAmount",
        headerName: "Net",
        minWidth: 90,
        valueFormatter: (p) =>
          p.value != null ? Number(p.value).toFixed(2) : "—",
      },
      {
        headerName: "Actions",
        minWidth: 80,
        flex: 0,
        cellRenderer:
          collegeId != null
            ? makeMonthlyViewRenderer(collegeId, payslipDate)
            : undefined,
      },
    ],
    [collegeId, departmentId, payslipDate],
  );

  const buildPayload = () => {
    if (!collegeId || departmentId == null) return null;
    const base = {
      collegeId,
      payslipGenerationDate: payslipDate,
      payslipMonth: payslipDate,
    };
    if (departmentId !== 0) return { ...base, departmentId };
    return base;
  };

  const handleGenerate = async () => {
    const payload = buildPayload();
    if (!payload) return;
    setBusy(true);
    try {
      const result = await generateMonthlyPayslips(payload);
      if (result.success) {
        toastSuccess(result.message || "Monthly payslips generated");
        await loadGrid();
      } else {
        toast.info(result.message || "Payslips were not generated");
      }
    } catch (e) {
      toastError(e, "Generate failed");
    } finally {
      setBusy(false);
    }
  };

  const handleEmail = async () => {
    const payload = buildPayload();
    if (!payload) return;
    setBusy(true);
    try {
      const result = await sendPayslipEmails(payload);
      if (result.success) {
        toastSuccess(result.message || "Payslip emails sent");
        await loadGrid();
      } else {
        toast.info(result.message || "Payslip emails were not sent");
      }
    } catch (e) {
      toastError(e, "Email failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <FilteredListPage<EmpRow>
      title="Generate Monthly Payslip"
      filtersCollapsible
      filtersDefaultOpen
      filters={
        <GlobalFilterBarRow>
          <GlobalFilterField label="College *">
            <Select
              value={collegeId != null ? String(collegeId) : null}
              onChange={(value) => {
                setCollegeId(value ? Number(value) : null);
                setDepartmentId(null);
                setRows([]);
              }}
              options={colleges}
              placeholder="Select college"
              clearable={false}
            />
          </GlobalFilterField>
          <GlobalFilterField label="Department *">
            <Select
              value={departmentId != null ? String(departmentId) : null}
              onChange={(value) => {
                setDepartmentId(
                  value != null && value !== "" ? Number(value) : null,
                );
                setRows([]);
              }}
              options={departments}
              placeholder="Select department"
              isLoading={departmentsLoading}
              disabled={!collegeId}
              clearable={false}
            />
          </GlobalFilterField>
          <GlobalFilterField label="Date">
            <DatePicker
              value={payslipDate}
              onChange={(date) => {
                if (date) {
                  setPayslipDate(date);
                  setRows([]);
                }
              }}
              displayFormat="dd/MM/yyyy"
              clearable={false}
            />
          </GlobalFilterField>
          <GlobalFilterField label={"\u00a0"}>
            <Button
              type="button"
              size="sm"
              className="h-9"
              disabled={!collegeId || departmentId == null || loading}
              onClick={() => void loadGrid()}
            >
              {loading ? "Loading…" : "Generate"}
            </Button>
          </GlobalFilterField>
        </GlobalFilterBarRow>
      }
      rowData={rows}
      columnDefs={columnDefs}
      loading={loading}
      pagination
      paginationPageSize={10}
      toolbar={{
        search: true,
        searchPlaceholder: "Search",
        columnPicker: true,
        exportExcel: true,
        exportPdf: true,
        pdfDocumentTitle: "Generate Monthly Payslip",
      }}
    >
      {rows.length > 0 ? (
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            size="sm"
            disabled={busy}
            onClick={() => void handleGenerate()}
          >
            {busy ? "Processing…" : "Generate"}
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={busy}
            onClick={() => void handleEmail()}
          >
            {busy ? "Processing…" : "Send Payslip To Email"}
          </Button>
        </div>
      ) : null}
    </FilteredListPage>
  );
}
