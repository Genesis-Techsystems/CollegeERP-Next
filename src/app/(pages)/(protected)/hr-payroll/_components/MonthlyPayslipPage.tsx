"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { format } from "date-fns";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { EyeIcon } from "lucide-react";
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

/** Angular `momentFormatYMD` → `YYYY/MM/DD` for `employeepayslipgenerationsbydate`. */
function toPayslipByDateParam(date: Date): string {
  return format(date, "yyyy/MM/dd");
}

function employeeDisplayLabel(row: EmpRow | undefined | null): string {
  if (!row) return "";
  const firstName = row.firstName != null ? String(row.firstName).trim() : "";
  const empNumber = row.empNumber != null ? String(row.empNumber).trim() : "";
  if (firstName && empNumber) return `${firstName} (${empNumber})`;
  if (firstName) return firstName;
  if (empNumber) return `(${empNumber})`;
  return "";
}

function employeeNameRenderer(p: ICellRendererParams<EmpRow>) {
  const label = employeeDisplayLabel(p.data);
  if (!label) return null;
  const firstName = p.data?.firstName != null ? String(p.data.firstName) : "";
  const empNumber = p.data?.empNumber != null ? String(p.data.empNumber) : "";
  return (
    <span className="block truncate">
      {firstName ? <span>{firstName} </span> : null}(
      {empNumber ? (
        <span className="font-medium text-blue-600">{empNumber}</span>
      ) : null}
      )
    </span>
  );
}

function makeMonthlyViewRenderer(collegeId: number, payslipDate: Date) {
  return (p: ICellRendererParams<EmpRow>) => {
    if (!p.data?.employeeId || !p.data?.empPayrollGroupId) return null;
    const q = new URLSearchParams({
      // Angular passes `item.generatedDate` as-is (may be empty when unmatched).
      payslipMonth:
        p.data.generatedDate != null ? String(p.data.generatedDate) : "",
      status: String(p.data.status ?? ""),
      empPayrollGroupId: String(p.data.empPayrollGroupId ?? ""),
      payrollGroupId: String(p.data.payrollGroupId ?? ""),
      empPayslipGenerationId: String(p.data.empPayslipGenerationId ?? ""),
      empId: String(p.data.employeeId ?? ""),
      collegeId: String(collegeId),
      departmentId: String(p.data.departmentId ?? 0),
      // Angular restores with the filter date value from the form.
      date: payslipDate.toISOString(),
    });
    return (
      <Button
        asChild
        size="sm"
        variant="ghost"
        className="h-8 w-8 p-0 text-blue-600"
        title="View"
      >
        <Link
          href={`/hr-payroll/payroll/monthly-playslip/view-monthly-payslip?${q}`}
        >
          <EyeIcon className="h-4 w-4" />
          <span className="sr-only">View</span>
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
    if (!d) return new Date();
    const parsed = new Date(d);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
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
      // Angular `momentFormatYMD` → YYYY/MM/DD for by-date lookup.
      const dateYmdSlash = toPayslipByDateParam(payslipDate);
      let employees = await listEmployeePayrollGroupByCollege(collegeId);
      if (departmentId !== 0) {
        // Angular sets `generatedDate = null` when filtering by department.
        employees = employees
          .filter((e) => Number(e.departmentId) === departmentId)
          .map((e) => ({ ...e, generatedDate: null }));
      }
      const payslips = await listEmployeePayslipGenerationsByDate(dateYmdSlash);
      const merged = enrichMonthlyPayslipEmployees(
        employees,
        payslips,
        payslipDate,
      );
      setRows(merged);
      if (merged.length === 0) {
        toast.message("No Payslips Found For Given Criteria");
      }
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
      {
        field: "firstName",
        headerName: "Employee",
        minWidth: 180,
        flex: 1,
        tooltipValueGetter: (p) => employeeDisplayLabel(p.data),
        cellRenderer: employeeNameRenderer,
      },
      { field: "departmentCode", headerName: "Department", minWidth: 100 },
      {
        field: "empCatName",
        headerName: "Employee Category",
        minWidth: 140,
      },
      {
        field: "generatedDate",
        headerName: "Recent Payslip",
        minWidth: 120,
        valueFormatter: (p) =>
          p.value ? format(new Date(String(p.value)), "dd MMM, yyyy") : "-",
      },
      {
        field: "grossPay",
        headerName: "Gross Pay",
        minWidth: 100,
        valueFormatter: (p) =>
          p.value != null && p.value !== "" ? Number(p.value).toFixed(2) : "",
      },
      {
        field: "netAmount",
        headerName: "Net Pay",
        minWidth: 100,
        valueFormatter: (p) =>
          p.value != null && p.value !== "" ? Number(p.value).toFixed(2) : "",
      },
      {
        headerName: "Actions",
        minWidth: 90,
        flex: 0,
        cellRenderer:
          collegeId != null
            ? makeMonthlyViewRenderer(collegeId, payslipDate)
            : undefined,
      },
    ],
    [collegeId, payslipDate],
  );

  /** Angular generate/email payload — omit departmentId when "All" (0). */
  const buildPayload = () => {
    if (!collegeId || departmentId == null) return null;
    const payslipGenerationDate = payslipDate.toISOString();
    if (departmentId !== 0) {
      return {
        collegeId,
        departmentId,
        payslipGenerationDate,
        payslipMonth: payslipGenerationDate,
      };
    }
    return {
      collegeId,
      payslipGenerationDate,
      payslipMonth: payslipGenerationDate,
    };
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
      title="Generate Employee Payslip"
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
