"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { DatePicker } from "@/common/components/date-picker";
import { FormModal } from "@/common/components/feedback";
import { FormField } from "@/common/components/forms";
import { Select, type SelectOption } from "@/common/components/select";
import { DataTable } from "@/common/components/table";
import { PageContainer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getErrorMessage } from "@/lib/errors";
import { toastError, toastInfo, toastSuccess } from "@/lib/toast";
import {
  generateEmployeePayslip,
  getActiveEmployeeDetailById,
  getEmployeePayrollGroupById,
  getPayrollGroupById,
  listActivePayrollCategoriesForPayslip,
  listEmployeePayslipHistory,
  listPayslipStatuses,
  PAYROLL_ESI_PERCENT,
} from "@/services";
import { rowIndexGetter } from "@/lib/utils";

type AnyRow = Record<string, unknown>;
type SalaryRow = AnyRow & {
  payrollCategoryId?: number;
  payrollCategoryName?: string;
  payrollCategoryCode?: string;
  payrollCategoryType?: string;
  valueType?: string;
  amount?: number;
  _added?: boolean;
};

const amount = (value: unknown) => Number(value ?? 0);
const categoryId = (row: AnyRow) =>
  Number(
    row.payrollCategoryId ??
      (row.payrollCategory as AnyRow | undefined)?.payrollCategoryId ??
      0,
  );
const categoryType = (row: AnyRow) =>
  String(
    row.payrollCategoryType ??
      (row.payrollCategory as AnyRow | undefined)?.payrollCategoryType ??
      "",
  );

function normalizeSalaryRows(assignment: AnyRow, group: AnyRow): SalaryRow[] {
  const salary = Array.isArray(assignment.employeeSalaryStructure)
    ? (assignment.employeeSalaryStructure as AnyRow[])
    : [];
  const groups = Array.isArray(group.payrollCategoryGroups)
    ? (group.payrollCategoryGroups as AnyRow[])
    : [];

  return salary.map((row) => {
    const id = categoryId(row);
    const metadata = groups.find((entry) => categoryId(entry) === id) ?? {};
    const category = (row.payrollCategory as AnyRow | undefined) ?? {};
    return {
      ...row,
      payrollCategoryId: id,
      payrollCategoryName: String(
        row.payrollCategoryName ??
          category.payrollCategoryName ??
          metadata.payrollCategoryName ??
          "",
      ),
      payrollCategoryCode: String(
        row.payrollCategoryCode ??
          category.payrollCategoryCode ??
          metadata.payrollCategoryCode ??
          "",
      ),
      payrollCategoryType: categoryType(metadata) || categoryType(row) || "",
      valueType: String(metadata.valueType ?? row.valueType ?? "F"),
      amount: amount(row.amount),
    };
  });
}

function EmployeeSummary({
  employee,
  group,
}: {
  employee: AnyRow | null;
  group: AnyRow | null;
}) {
  return (
    <div className="grid gap-x-8 gap-y-2 rounded border border-[#b8d9ee] bg-[#f7fbfe] p-4 text-sm md:grid-cols-3">
      <p>
        <span className="text-muted-foreground">Employee: </span>
        <strong>
          {String(employee?.firstName ?? "—")}
          {employee?.empNumber ? ` (${String(employee.empNumber)})` : ""}
        </strong>
      </p>
      <p>
        <span className="text-muted-foreground">Department: </span>
        <strong>{String(employee?.departmentCode ?? "—")}</strong>
      </p>
      <p>
        <span className="text-muted-foreground">Designation: </span>
        <strong>{String(employee?.designationName ?? "—")}</strong>
      </p>
      <p>
        <span className="text-muted-foreground">Payroll Group: </span>
        <strong>{String(group?.payrollGroupName ?? "—")}</strong>
      </p>
      <p>
        <span className="text-muted-foreground">Frequency: </span>
        <strong>
          {String(
            group?.paymentFrequencyCode ?? group?.paymentFrequency ?? "—",
          )}
        </strong>
      </p>
    </div>
  );
}

function SalarySection({
  title,
  rows,
  editable,
  onAmountChange,
  onAdd,
  total,
}: {
  title: string;
  rows: SalaryRow[];
  editable: boolean;
  onAmountChange?: (id: number, value: number) => void;
  onAdd?: () => void;
  total?: number;
}) {
  return (
    <div className="min-w-[260px] flex-1">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr>
            <th
              colSpan={2}
              className="border border-slate-300 bg-[#e8eef7] px-2 py-2 text-left"
            >
              <span>{title}</span>
              {onAdd ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="float-right h-6 px-2"
                  onClick={onAdd}
                >
                  + Add
                </Button>
              ) : null}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const canEdit =
              editable &&
              row.valueType === "N" &&
              row.payrollCategoryCode !== "ESI";
            return (
              <tr
                key={`${row.payrollCategoryId}-${row._added ? "new" : "saved"}`}
              >
                <td className="border border-slate-300 px-2 py-1.5">
                  {row.payrollCategoryName || row.payrollCategoryCode}
                </td>
                <td className="w-36 border border-slate-300 px-2 py-1">
                  <Input
                    type="number"
                    value={String(amount(row.amount))}
                    disabled={!canEdit}
                    className="h-8 text-right"
                    onChange={(event) =>
                      onAmountChange?.(
                        Number(row.payrollCategoryId),
                        Number(event.target.value || 0),
                      )
                    }
                  />
                </td>
              </tr>
            );
          })}
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={2}
                className="border border-slate-300 px-2 py-4 text-center text-muted-foreground"
              >
                No categories
              </td>
            </tr>
          ) : null}
          {total != null ? (
            <tr className="font-semibold">
              <td className="border border-slate-300 px-2 py-2">Total</td>
              <td className="border border-slate-300 px-2 py-2 text-right">
                {total.toFixed(2)}
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

function GeneratePayslip() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const empPayrollGroupId = Number(searchParams.get("empPayrollGroupId") ?? 0);
  const employeeId = Number(searchParams.get("employeeId") ?? 0);
  const payrollGroupId = Number(searchParams.get("payrollGroupId") ?? 0);
  const collegeId = Number(searchParams.get("collegeId") ?? 0);
  const isAlreadyExists = searchParams.get("isAlreadyExists") === "true";
  const [employee, setEmployee] = useState<AnyRow | null>(null);
  const [group, setGroup] = useState<AnyRow | null>(null);
  const [assignment, setAssignment] = useState<AnyRow | null>(null);
  const [rows, setRows] = useState<SalaryRow[]>([]);
  const [categories, setCategories] = useState<AnyRow[]>([]);
  const [pendingStatusId, setPendingStatusId] = useState(0);
  const [payslipMonth, setPayslipMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addType, setAddType] = useState<"E" | "D" | "M">("D");
  const [addOpen, setAddOpen] = useState(false);
  const [addCategoryId, setAddCategoryId] = useState<string | null>(null);
  const [addAmount, setAddAmount] = useState("0");

  const backHref = `/hr-payroll/payroll/payslip-for-employees?collegeId=${collegeId}`;

  useEffect(() => {
    if (!empPayrollGroupId || !employeeId || !payrollGroupId) return;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const [employeeRow, groupRow, assignmentRow, statuses, allCategories] =
          await Promise.all([
            getActiveEmployeeDetailById(employeeId),
            getPayrollGroupById(payrollGroupId),
            getEmployeePayrollGroupById(empPayrollGroupId),
            listPayslipStatuses(),
            listActivePayrollCategoriesForPayslip(),
          ]);
        if (!groupRow || !assignmentRow) {
          throw new Error("Employee payroll assignment was not found");
        }
        setEmployee(employeeRow);
        setGroup(groupRow);
        setAssignment(assignmentRow);
        setRows(normalizeSalaryRows(assignmentRow, groupRow));
        setCategories(allCategories);
        const pending = statuses.find(
          (row) => String(row.generalDetailCode) === "PSPENDING",
        );
        setPendingStatusId(Number(pending?.generalDetailId ?? 0));
      } catch (loadError) {
        setError(getErrorMessage(loadError));
        toastError(loadError, "Failed to load payslip");
      } finally {
        setLoading(false);
      }
    })();
  }, [empPayrollGroupId, employeeId, payrollGroupId]);

  const earnings = rows.filter((row) => row.payrollCategoryType === "E");
  const deductions = rows.filter((row) => row.payrollCategoryType === "D");
  const management = rows.filter((row) => row.payrollCategoryType === "M");
  const totalEarnings = earnings.reduce(
    (sum, row) => sum + amount(row.amount),
    0,
  );
  const regularDeductions = deductions.reduce(
    (sum, row) => sum + amount(row.amount),
    0,
  );
  const addedManagementDeductions = management
    .filter((row) => row._added)
    .reduce((sum, row) => sum + amount(row.amount), 0);
  const totalDeductions = regularDeductions + addedManagementDeductions;
  const netPay = totalEarnings - totalDeductions;

  const updateAmount = useCallback((id: number, nextAmount: number) => {
    setRows((current) => {
      let updated = current.map((row) =>
        Number(row.payrollCategoryId) === id
          ? { ...row, amount: nextAmount }
          : row,
      );
      const changed = updated.find(
        (row) => Number(row.payrollCategoryId) === id,
      );
      if (changed?.payrollCategoryCode === "LOPAmt.") {
        const basic = updated.find(
          (row) => row.payrollCategoryCode === "BASIC",
        );
        updated = updated.map((row) =>
          row.payrollCategoryCode === "ESI"
            ? {
                ...row,
                amount: Number(
                  (
                    (Math.max(0, amount(basic?.amount) - nextAmount) *
                      PAYROLL_ESI_PERCENT) /
                    100
                  ).toFixed(2),
                ),
              }
            : row,
        );
      }
      return updated;
    });
  }, []);

  const categoryOptions = useMemo<SelectOption[]>(
    () =>
      categories
        .filter((row) => categoryType(row) === addType)
        .map((row) => ({
          value: String(categoryId(row)),
          label: String(
            row.payrollCategoryName ??
              row.payrollCategoryCode ??
              categoryId(row),
          ),
        })),
    [addType, categories],
  );

  const addCategory = () => {
    const id = Number(addCategoryId ?? 0);
    const selected = categories.find((row) => categoryId(row) === id);
    if (!selected) {
      toastInfo("Select a payroll category");
      return;
    }
    if (rows.some((row) => Number(row.payrollCategoryId) === id)) {
      toastInfo("Payroll category already exists");
      return;
    }
    const selectedCode = String(selected.payrollCategoryCode ?? "");
    const basicAmount = amount(
      rows.find((row) => row.payrollCategoryCode === "BASIC")?.amount,
    );
    const lossOfPay = amount(
      rows.find((row) => row.payrollCategoryCode === "LOPAmt.")?.amount,
    );
    const selectedAmount =
      selectedCode === "ESI"
        ? Number(
            (
              (Math.max(0, basicAmount - lossOfPay) * PAYROLL_ESI_PERCENT) /
              100
            ).toFixed(2),
          )
        : Number(addAmount || 0);
    setRows((current) => [
      ...current,
      {
        collegeId: Number(group?.collegeId ?? collegeId),
        payrollCategoryId: id,
        payrollCategoryName: String(selected.payrollCategoryName ?? ""),
        payrollCategoryCode: selectedCode,
        payrollCategoryType: addType,
        amount: selectedAmount,
        isActive: true,
        valueType: "N",
        empSalaryStructureId: null,
        employeePayrollGroupId: null,
        payrollGroupId: null,
        paymentFrequency: null,
        payslipGenerationDay: null,
        _added: true,
      },
    ]);
    setAddOpen(false);
    setAddCategoryId(null);
    setAddAmount("0");
  };

  const save = async () => {
    if (!assignment || !pendingStatusId) {
      toastInfo("Pending payslip status is unavailable");
      return;
    }
    setSaving(true);
    try {
      const originalRows = rows
        .filter((row) => !row._added)
        .map(({ _added: _ignored, ...row }) => row);
      const result = await generateEmployeePayslip({
        collegeId: Number(group?.collegeId ?? collegeId),
        employeeId,
        payrollGroupId,
        grossPay: amount(assignment.grossPay),
        netPay,
        payslipMonth: payslipMonth.toISOString(),
        payslipGenerationDate: new Date().toISOString(),
        paySlipGeneratedByEmployeeId: window.localStorage.getItem("employeeId"),
        payslipStatusCatdetId: pendingStatusId,
        isActive: true,
        employeeSalaryStructureDTO: originalRows,
      });
      if (result.success === false) {
        toastInfo(result.message || "Payslip was not generated");
      } else {
        toastSuccess(result.message || "Payslip generated successfully");
      }
      router.push(backHref);
    } catch (saveError) {
      toastError(saveError, "Failed to generate payslip");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageContainer className="space-y-4">
      <div className="app-card overflow-hidden">
        <div className="border-b border-[#e8c547] px-4 py-3">
          <h1 className="font-semibold text-[hsl(var(--card-title))]">
            Generate Payslip
          </h1>
        </div>
        <div className="space-y-5 p-4">
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {loading ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Loading payslip…
            </p>
          ) : (
            <>
              <EmployeeSummary employee={employee} group={group} />
              {isAlreadyExists ? (
                <p className="rounded border border-amber-300 bg-amber-50 p-3 text-sm">
                  A payslip already exists for this employee and month.
                </p>
              ) : null}
              <div className="max-w-xs">
                <FormField label="Payslip Month" required>
                  <DatePicker
                    value={payslipMonth}
                    onChange={(date) => date && setPayslipMonth(date)}
                    displayFormat="dd/MM/yyyy"
                  />
                </FormField>
              </div>
              <div className="flex flex-col gap-4 lg:flex-row">
                <SalarySection
                  title="Earnings"
                  rows={earnings}
                  editable={false}
                  total={totalEarnings}
                  onAdd={() => {
                    setAddType("E");
                    setAddOpen(true);
                  }}
                />
                <SalarySection
                  title="Deductions"
                  rows={deductions}
                  editable
                  onAmountChange={updateAmount}
                  total={totalDeductions}
                  onAdd={() => {
                    setAddType("D");
                    setAddOpen(true);
                  }}
                />
                <SalarySection
                  title="Management Deductions"
                  rows={management}
                  editable
                  onAmountChange={updateAmount}
                  onAdd={() => {
                    setAddType("M");
                    setAddOpen(true);
                  }}
                />
              </div>
              <div className="flex items-center justify-end gap-6 border-t pt-4">
                <p className="text-sm">
                  Net Pay: <strong>₹ {netPay.toFixed(2)}</strong>
                </p>
                <Button type="button" disabled={saving} onClick={save}>
                  {saving ? "Generating…" : "Generate Payslip"}
                </Button>
                <Button asChild type="button" variant="outline">
                  <Link href={backHref}>Back</Link>
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      <FormModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title={`Add ${addType === "E" ? "Earning" : addType === "D" ? "Deduction" : "Management Deduction"}`}
        onSubmit={addCategory}
        submitLabel="Add"
      >
        <div className="space-y-4">
          <FormField label="Payroll Category" required>
            <Select
              value={addCategoryId}
              onChange={setAddCategoryId}
              options={categoryOptions}
              placeholder="Select category"
            />
          </FormField>
          <FormField label="Amount" required>
            <Input
              type="number"
              value={addAmount}
              onChange={(event) => setAddAmount(event.target.value)}
            />
          </FormField>
        </div>
      </FormModal>
    </PageContainer>
  );
}

function makeHistoryActions(
  employeeId: number,
  empPayrollGroupId: number,
  payrollGroupId: number,
  collegeId: number,
) {
  return (params: ICellRendererParams<AnyRow>) => {
    const id = Number(params.data?.empPayslipGenerationId ?? 0);
    if (!id) return null;
    const query = new URLSearchParams({
      payslipMonth: String(params.data?.payslipMonth ?? ""),
      status: String(params.data?.status ?? "Pending"),
      empPayrollGroupId: String(empPayrollGroupId),
      payrollGroupId: String(payrollGroupId),
      empPayslipGenerationId: String(id),
      empId: String(employeeId),
      collegeId: String(collegeId),
    });
    return (
      <div className="flex items-center gap-1">
        <Button asChild size="sm" variant="ghost">
          <Link
            href={`/hr-payroll/payroll/payslip-for-employees/view-employee-payslip?${query}&Isprint=0`}
          >
            View
          </Link>
        </Button>
        <Button asChild size="sm" variant="ghost">
          <Link
            href={`/hr-payroll/payroll/payslip-for-employees/view-employee-payslip?${query}&Isprint=1`}
          >
            Print
          </Link>
        </Button>
      </div>
    );
  };
}

function ViewPayslipHistory() {
  const searchParams = useSearchParams();
  const employeeId = Number(searchParams.get("employeeId") ?? 0);
  const empPayrollGroupId = Number(searchParams.get("empPayrollGroupId") ?? 0);
  const payrollGroupId = Number(searchParams.get("payrollGroupId") ?? 0);
  const collegeId = Number(searchParams.get("collegeId") ?? 0);
  const [employee, setEmployee] = useState<AnyRow | null>(null);
  const [group, setGroup] = useState<AnyRow | null>(null);
  const [assignment, setAssignment] = useState<AnyRow | null>(null);
  const [rows, setRows] = useState<AnyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!employeeId || !payrollGroupId) return;
    void (async () => {
      setLoading(true);
      try {
        const [employeeRow, groupRow, assignmentRow, history] =
          await Promise.all([
            getActiveEmployeeDetailById(employeeId),
            getPayrollGroupById(payrollGroupId),
            getEmployeePayrollGroupById(empPayrollGroupId),
            listEmployeePayslipHistory(employeeId),
          ]);
        setEmployee(employeeRow);
        setGroup(groupRow);
        setAssignment(assignmentRow);
        setRows(history);
      } catch (loadError) {
        setError(getErrorMessage(loadError));
        toastError(loadError, "Failed to load payslip history");
      } finally {
        setLoading(false);
      }
    })();
  }, [employeeId, empPayrollGroupId, payrollGroupId]);

  const columnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      {
        headerName: "SI.No",
        valueGetter: rowIndexGetter,
        width: 70,
        flex: 0,
      },
      {
        field: "payslipMonth",
        headerName: "Pay Period",
        minWidth: 160,
        valueFormatter: (params) => {
          const date = new Date(String(params.value ?? ""));
          return Number.isNaN(date.getTime())
            ? String(params.value ?? "—")
            : format(date, "MMMM yyyy");
        },
      },
      {
        field: "netPay",
        headerName: "Net Pay",
        minWidth: 120,
        valueFormatter: (params) => amount(params.value).toFixed(2),
      },
      {
        headerName: "Status",
        minWidth: 110,
        valueGetter: () => "Pending",
      },
      {
        headerName: "Actions",
        minWidth: 150,
        flex: 0,
        cellRenderer: makeHistoryActions(
          employeeId,
          empPayrollGroupId,
          payrollGroupId,
          collegeId,
        ),
      },
    ],
    [employeeId, empPayrollGroupId, payrollGroupId, collegeId],
  );

  return (
    <PageContainer className="space-y-4">
      <div className="app-card overflow-hidden">
        <div className="border-b border-[#e8c547] px-4 py-3">
          <h1 className="font-semibold text-[hsl(var(--card-title))]">
            Employee Payslips
          </h1>
        </div>
        <div className="space-y-4 p-4">
          <EmployeeSummary employee={employee} group={group} />
          {assignment?.grossPay != null ? (
            <p className="text-sm">
              Gross Pay:{" "}
              <strong>{amount(assignment.grossPay).toFixed(2)}</strong>
            </p>
          ) : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DataTable
            rowData={rows}
            columnDefs={columnDefs}
            loading={loading}
            paginationPageSize={10}
            toolbar={{ search: true, searchPlaceholder: "Search" }}
          />
          <div className="flex justify-end">
            <Button asChild variant="outline">
              <Link
                href={`/hr-payroll/payroll/payslip-for-employees?collegeId=${collegeId}`}
              >
                Back
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}

export function PayrollPayslipWorkflowPage({
  mode,
}: {
  mode: "generate" | "view";
}) {
  return mode === "generate" ? <GeneratePayslip /> : <ViewPayslipHistory />;
}
