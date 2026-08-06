"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { Eye, Printer } from "lucide-react";
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

function employeeGradeLabel(employee: AnyRow | null): string {
  if (!employee) return "-";
  if (employee.empgrade == null && employee.empGrade == null) return "-";
  const code = String(
    employee.empGradeCode ?? employee.emp_grade_code ?? "",
  ).trim();
  return code || "-";
}

/** Angular generate header — Employee / Dept / Position / Grade. */
function EmployeeInfoCard({ employee }: { employee: AnyRow | null }) {
  return (
    <div className="space-y-1.5 rounded border border-[#b8d9ee] bg-[#f7fbfe] p-4 text-[13px]">
      <p>
        <span className="text-muted-foreground">Employee : </span>
        <span className="font-medium text-[#1565C0]">
          {String(employee?.firstName ?? "—")}
          {employee?.empNumber ? (
            <>
              {" "}
              (
              <span className="text-foreground">
                {String(employee.empNumber)}
              </span>
              )
            </>
          ) : null}
        </span>
      </p>
      <p>
        <span className="text-muted-foreground">Department : </span>
        <span className="font-medium text-[#1565C0]">
          {String(
            employee?.deptName ??
              employee?.departmentName ??
              employee?.departmentCode ??
              "—",
          )}
        </span>
      </p>
      <p>
        <span className="text-muted-foreground">Position : </span>
        <span className="font-medium text-[#1565C0]">
          {String(employee?.designationName ?? "—")}
        </span>
      </p>
      <p>
        <span className="text-muted-foreground">Grade : </span>
        <span className="font-medium text-[#1565C0]">
          {employeeGradeLabel(employee)}
        </span>
      </p>
    </div>
  );
}

function frequencyLabel(...sources: Array<AnyRow | null | undefined>): string {
  for (const src of sources) {
    if (!src) continue;
    const code = String(
      src.paymentFrequencyCode ?? src.payment_frequency_code ?? "",
    ).trim();
    if (code && !/^\d+$/.test(code)) return code;
    const name = String(
      src.paymentFrequencyName ?? src.payment_frequency_name ?? "",
    ).trim();
    if (name) return name;
  }
  return "—";
}

/** Compact summary used on view-history (same fields as generate employee card). */
function EmployeeSummary({
  employee,
  group,
  assignment,
}: {
  employee: AnyRow | null;
  group: AnyRow | null;
  assignment?: AnyRow | null;
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
        <strong>
          {String(
            employee?.deptName ??
              employee?.departmentName ??
              employee?.departmentCode ??
              "—",
          )}
        </strong>
      </p>
      <p>
        <span className="text-muted-foreground">Position: </span>
        <strong>{String(employee?.designationName ?? "—")}</strong>
      </p>
      <p>
        <span className="text-muted-foreground">Grade: </span>
        <strong>{employeeGradeLabel(employee)}</strong>
      </p>
      <p>
        <span className="text-muted-foreground">Payroll Group: </span>
        <strong>
          {String(
            assignment?.payrollGroupName ?? group?.payrollGroupName ?? "—",
          )}
        </strong>
      </p>
    </div>
  );
}

function SalarySection({
  title,
  amountHeader,
  rows,
  editable,
  onAmountChange,
  onAdd,
  addLabel,
  totalLabel,
  total,
}: {
  title: string;
  amountHeader: string;
  rows: SalaryRow[];
  editable: boolean;
  onAmountChange?: (id: number, value: number) => void;
  onAdd?: () => void;
  addLabel?: string;
  totalLabel?: string;
  total?: number;
}) {
  return (
    <div className="min-w-[260px] flex-1">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr>
            <th className="border border-slate-300 bg-[#c3d9ff] px-2 py-2 text-left font-semibold">
              {title}
            </th>
            <th className="border border-slate-300 bg-[#c3d9ff] px-2 py-2 text-right font-semibold">
              {amountHeader}
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
                —
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
      {onAdd && addLabel ? (
        <button
          type="button"
          className="mt-2 cursor-pointer text-[13px] font-medium text-[#1565C0] underline-offset-2 hover:underline"
          onClick={onAdd}
        >
          {addLabel}
        </button>
      ) : null}
      {total != null && totalLabel ? (
        <div className="mt-3 flex items-center justify-between text-[13px] font-medium">
          <span>{totalLabel}</span>
          <span>{total.toFixed(2)} ₹</span>
        </div>
      ) : null}
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
  // Angular: Management (M) is displayed but excluded from net pay.
  const totalDeductions = deductions.reduce(
    (sum, row) => sum + amount(row.amount),
    0,
  );
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

  /** Angular Add modal `selectedPayrollCategory` — toast + clear on pick. */
  const onPickCategory = (value: string | null) => {
    const id = Number(value ?? 0);
    if (!id) {
      setAddCategoryId(null);
      return;
    }
    if (rows.some((row) => Number(row.payrollCategoryId) === id)) {
      toastInfo("Already this category exists in payroll group.");
      setAddCategoryId(null);
      return;
    }
    setAddCategoryId(value);
  };

  const addCategory = () => {
    const id = Number(addCategoryId ?? 0);
    const selected = categories.find((row) => categoryId(row) === id);
    if (!selected) {
      toastInfo("Select a payroll category");
      return;
    }
    if (rows.some((row) => Number(row.payrollCategoryId) === id)) {
      toastInfo("Already this category exists in payroll group.");
      setAddCategoryId(null);
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
    if (isAlreadyExists) {
      toastInfo(
        "The payslip has already been generated for this employee for the selected pay period.",
      );
      return;
    }
    if (!assignment || !pendingStatusId) {
      toastInfo("Pending payslip status is unavailable");
      return;
    }
    if (!payslipMonth) {
      toastInfo("Payslip Month is required");
      return;
    }
    setSaving(true);
    try {
      // Angular generateEmpPayroll(): employeeSalaryStructureDTO =
      // employeePayroll[0].employeeSalaryStructure (amount edits only).
      // Modal-added rows are UI-only in Angular and are NOT posted.
      const structureDto = rows
        .filter((row) => !row._added)
        .map(({ _added: _ignored, ...row }) => row);
      const result = await generateEmployeePayslip({
        // Angular: payrollGroup[0].collegeId
        collegeId: Number(group?.collegeId ?? collegeId),
        employeeId,
        payrollGroupId,
        // Angular: employeePayroll[0].grossPay
        grossPay: amount(assignment.grossPay),
        netPay,
        payslipMonth: payslipMonth.toISOString(),
        payslipGenerationDate: new Date().toISOString(),
        paySlipGeneratedByEmployeeId: window.localStorage.getItem("employeeId"),
        payslipStatusCatdetId: pendingStatusId,
        isActive: true,
        employeeSalaryStructureDTO: structureDto,
      });
      // Angular: navigate list with collegeId on both success and soft failure
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

  const payrollGroupName = String(
    assignment?.payrollGroupName ?? group?.payrollGroupName ?? "—",
  );
  const payrollFrequency = String(
    assignment?.paymentFrequencyCode ??
      group?.paymentFrequencyCode ??
      group?.paymentFrequency ??
      "—",
  );

  return (
    <PageContainer className="space-y-4">
      <div className="app-card overflow-hidden">
        <div className="border-b border-[#e8c547] px-4 py-3">
          <h1 className="font-semibold text-[hsl(var(--card-title))]">
            Generated Employee Payslips
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
              <EmployeeInfoCard employee={employee} />

              <div className="space-y-3">
                <h2 className="border-b pb-1 text-[15px] font-semibold">
                  Payroll Details
                </h2>
                <div className="space-y-1.5 text-[13px]">
                  <p>
                    <span className="text-muted-foreground">
                      Payroll Group :{" "}
                    </span>
                    <span className="font-medium text-[#1565C0]">
                      {payrollGroupName}
                    </span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">
                      Payroll Frequency :{" "}
                    </span>
                    <span className="font-medium text-[#1565C0]">
                      {payrollFrequency}
                    </span>
                  </p>
                </div>
                {!isAlreadyExists ? (
                  <div className="max-w-xs pt-1">
                    <FormField label="Payslip Month" required>
                      <DatePicker
                        value={payslipMonth}
                        onChange={(date) => date && setPayslipMonth(date)}
                        displayFormat="dd/MM/yyyy"
                      />
                    </FormField>
                  </div>
                ) : null}
              </div>

              {isAlreadyExists ? (
                <p className="text-[13px] font-medium text-red-600">
                  The payslip has already been generated for this employee for
                  the selected pay period.
                </p>
              ) : (
                <>
                  <div className="space-y-2">
                    <h2 className="border-b pb-1 text-[15px] font-semibold">
                      Payroll categories of this payroll group
                    </h2>
                    <p className="text-[12px] text-muted-foreground">
                      The payroll amounts are calculated based on how each
                      payroll category is set up. You can edit the amounts if
                      needed.
                    </p>
                    <div className="flex flex-col gap-4 lg:flex-row">
                      <SalarySection
                        title="Earnings"
                        amountHeader="Credited (₹)"
                        rows={earnings}
                        editable={false}
                        total={totalEarnings}
                        totalLabel="Total Earnings"
                        addLabel="Add Earning"
                        onAdd={() => {
                          setAddType("E");
                          setAddOpen(true);
                        }}
                      />
                      <SalarySection
                        title="Deductions"
                        amountHeader="Deducted (₹)"
                        rows={deductions}
                        editable
                        onAmountChange={updateAmount}
                        total={totalDeductions}
                        totalLabel="Total Deductions"
                        addLabel="Add Deduction"
                        onAdd={() => {
                          setAddType("D");
                          setAddOpen(true);
                        }}
                      />
                      <SalarySection
                        title="Management Deductions"
                        amountHeader="Deducted (₹)"
                        rows={management}
                        editable
                        onAmountChange={updateAmount}
                        addLabel="Add Management Deduction"
                        onAdd={() => {
                          setAddType("M");
                          setAddOpen(true);
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-4 border-t pt-4">
                    <p className="text-sm">
                      Net Pay: <strong>₹ {netPay.toFixed(2)}</strong>
                    </p>
                    <Button type="button" disabled={saving} onClick={save}>
                      {saving ? "Generating…" : "Generate"}
                    </Button>
                    <Button asChild type="button" variant="outline">
                      <Link href={backHref}>Back</Link>
                    </Button>
                  </div>
                </>
              )}

              {isAlreadyExists ? (
                <div className="flex justify-end">
                  <Button asChild type="button" variant="outline">
                    <Link href={backHref}>Back</Link>
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>

      <FormModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title={`Add ${addType === "E" ? "Earning" : addType === "D" ? "Deduction" : "Management Deduction"}`}
        onSubmit={addCategory}
        submitLabel="Save"
      >
        <div className="space-y-4">
          <FormField label="Payroll Category" required>
            <Select
              value={addCategoryId}
              onChange={onPickCategory}
              options={categoryOptions}
              placeholder="Select category"
            />
          </FormField>
          <FormField label="Amount">
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
        <Button
          asChild
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0 text-[#1565C0]"
          title="View"
        >
          <Link
            href={`/hr-payroll/payroll/payslip-for-employees/view-employee-payslip?${query}&Isprint=0`}
            aria-label="View payslip"
          >
            <Eye className="h-4 w-4" />
          </Link>
        </Button>
        <Button
          asChild
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0 text-[#1565C0]"
          title="Print"
        >
          <Link
            href={`/hr-payroll/payroll/payslip-for-employees/view-employee-payslip?${query}&Isprint=1`}
            aria-label="Print payslip"
          >
            <Printer className="h-4 w-4" />
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
            : format(date, "MMM d, yyyy");
        },
      },
      {
        field: "netPay",
        headerName: "Salary",
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
        minWidth: 110,
        width: 110,
        flex: 0,
        sortable: false,
        filter: false,
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

  const pageTitle = employee?.firstName
    ? `Generated Payslips - ${String(employee.firstName)}`
    : "Generated Payslips";

  return (
    <PageContainer>
      <DataTable
        title={pageTitle}
        subtitle=""
        bordered
        filtersFooter={
          <div className="space-y-2">
            <EmployeeSummary
              employee={employee}
              group={group}
              assignment={assignment}
            />
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>
        }
        rowData={rows}
        columnDefs={columnDefs}
        loading={loading}
        pagination
        paginationPageSize={10}
        getRowId={(p) =>
          String(
            p.data?.empPayslipGenerationId ??
              `${p.data?.payslipMonth ?? "row"}-${p.data?.netPay ?? ""}`,
          )
        }
        toolbar={{
          search: false,
          columnPicker: true,
          exportExcel: false,
          exportPdf: false,
          excelDocumentTitle: pageTitle,
        }}
        toolbarTrailing={
          <Button asChild variant="outline" size="sm" className="h-9">
            <Link
              href={`/hr-payroll/payroll/payslip-for-employees?collegeId=${collegeId}`}
            >
              Back
            </Link>
          </Button>
        }
      />
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
