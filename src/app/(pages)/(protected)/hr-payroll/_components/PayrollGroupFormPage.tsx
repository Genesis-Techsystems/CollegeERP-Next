"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useRouter, useSearchParams } from "next/navigation";
import { Monitor, Plus, X } from "lucide-react";
import { EmptyState } from "@/common/components/feedback";
import { ActiveStatusField } from "@/common/components/forms";
import { Select, type SelectOption } from "@/common/components/select";
import { PageContainer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QK } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  getPayrollGroupById,
  listActiveCollegesForGeneralSettings,
  listPayrollCategoriesByCollege,
  listPaymentFrequencies,
  savePayrollGroup,
} from "@/services";
import { useQueryClient } from "@tanstack/react-query";

type CatRow = Record<string, unknown> & {
  payrollCategoryId?: number;
  sortOrder?: string | number;
  payrollCategoryGroupId?: number;
  payrollCategoryType?: string;
};

const WEEKLY_DAYS = [1, 2, 3, 4, 5, 6, 7];
const MONTHLY_DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
const BIWEEKLY_DAYS = Array.from({ length: 15 }, (_, i) => i + 1);
const CATEGORY_TYPES: Array<"E" | "D" | "M"> = ["E", "D", "M"];

const LIST_BACK_HREF = "/hr-payroll/payroll/payroll-group";
const SECTION_TITLE = "text-[15px] font-semibold text-[#0c51a4]";
const TABLE_HEAD_CELL =
  "border border-[#b8cfe8] px-3 py-2 text-left text-[12px] font-semibold text-slate-800";
const TABLE_BODY_CELL =
  "border border-[#d0d7de] px-3 py-2 text-[12px] text-slate-800";
const BACK_BTN =
  "h-9 min-w-20 !rounded-[5px] !border-0 !bg-[#ffcf46] px-4 !text-black shadow-sm hover:!bg-[#e5b535]";
const SAVE_BTN =
  "h-9 min-w-20 !rounded-[5px] bg-[#042956] px-4 text-white hover:bg-[#031f42]";

function categoryTypeLabel(t: unknown): string {
  if (t === "E") return "Earnings";
  if (t === "D") return "Deductions";
  if (t === "M") return "Management Deductions";
  return String(t ?? "");
}

function AngularSectionTitle({ children }: { children: ReactNode }) {
  return <h2 className={SECTION_TITLE}>{children}</h2>;
}

function CategoryRowsTable({
  rows,
  mode,
  onRemove,
  onAdd,
  onSortOrderChange,
}: {
  rows: CatRow[];
  mode: "selected" | "available";
  onRemove?: (row: CatRow, index: number) => void;
  onAdd?: (row: CatRow) => void;
  onSortOrderChange?: (index: number, sortOrder: string) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[12px]">
        <thead>
          <tr className="bg-[#c3d9ff]">
            <th className={TABLE_HEAD_CELL}>Payroll Category</th>
            <th className={TABLE_HEAD_CELL}>Category Code</th>
            <th className={TABLE_HEAD_CELL}>Value</th>
            {mode === "selected" ? (
              <th className={cn(TABLE_HEAD_CELL, "w-28")}>Sort Order</th>
            ) : null}
            <th className={cn(TABLE_HEAD_CELL, "w-24 text-center")}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={mode === "selected" ? 5 : 4}
                className="border border-[#d0d7de] px-4 py-8 text-center text-[13px] text-slate-500"
              >
                {mode === "selected"
                  ? "Add payroll categories from the below table"
                  : "No payroll categories available for this college"}
              </td>
            </tr>
          ) : (
            CATEGORY_TYPES.map((type) => {
              const typed = rows.filter((r) => r.payrollCategoryType === type);
              if (typed.length === 0) return null;
              return (
                <Fragment key={type}>
                  <tr className="bg-[#eef4fb]">
                    <td
                      colSpan={mode === "selected" ? 5 : 4}
                      className="border border-[#d0d7de] px-3 py-1.5 text-[11px] font-medium text-[#0c51a4]"
                    >
                      {categoryTypeLabel(type)}
                    </td>
                  </tr>
                  {typed.map((row) => {
                    const index = rows.indexOf(row);
                    const id = String(row.payrollCategoryId ?? index);
                    return (
                      <tr key={id} className="bg-white">
                        <td className={TABLE_BODY_CELL}>
                          {String(row.payrollCategoryName ?? "")}
                        </td>
                        <td className={TABLE_BODY_CELL}>
                          {String(row.payrollCategoryCode ?? "")}
                        </td>
                        <td className={TABLE_BODY_CELL}>
                          {String(row.value ?? "")}
                        </td>
                        {mode === "selected" && onSortOrderChange ? (
                          <td className={TABLE_BODY_CELL}>
                            <Input
                              type="number"
                              min={0}
                              className="h-8 w-20 rounded-none border-0 border-b border-input bg-transparent px-0 text-[12px] shadow-none focus-visible:ring-0"
                              placeholder=""
                              value={String(row.sortOrder ?? "")}
                              onChange={(e) =>
                                onSortOrderChange(index, e.target.value)
                              }
                            />
                          </td>
                        ) : null}
                        <td className={cn(TABLE_BODY_CELL, "text-center")}>
                          {mode === "selected" && onRemove ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                              onClick={() => onRemove(row, index)}
                            >
                              <X className="h-4 w-4" />
                              <span className="sr-only">Remove</span>
                            </Button>
                          ) : null}
                          {mode === "available" && onAdd ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-[#0c51a4] hover:text-[#0c51a4]"
                              onClick={() => onAdd(row)}
                            >
                              <Plus className="h-4 w-4" />
                              <span className="sr-only">Add</span>
                            </Button>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </Fragment>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

type PayrollGroupFormPageProps = { mode: "add" | "edit" };

export function PayrollGroupFormPage({ mode }: PayrollGroupFormPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const payrollGroupId = Number(searchParams.get("payrollGroupId") ?? 0);

  const [colleges, setColleges] = useState<SelectOption[]>([]);
  const [frequencies, setFrequencies] = useState<SelectOption[]>([]);
  const [freqCodeById, setFreqCodeById] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);

  const [collegeId, setCollegeId] = useState<number | null>(null);
  const [payrollGroupName, setPayrollGroupName] = useState("");
  const [paymentFrequency, setPaymentFrequency] = useState<number | null>(null);
  const [payslipGenerationDay, setPayslipGenerationDay] = useState<
    number | null
  >(null);
  const [isActive, setIsActive] = useState(true);
  const [reason, setReason] = useState("active");

  const [selectedCategories, setSelectedCategories] = useState<CatRow[]>([]);
  const [availableCategories, setAvailableCategories] = useState<CatRow[]>([]);
  const [deletedCategories, setDeletedCategories] = useState<CatRow[]>([]);

  const paymentFreqCode =
    paymentFrequency != null ? (freqCodeById[paymentFrequency] ?? "") : "";

  const payslipDayOptions = useMemo((): SelectOption[] => {
    let days: number[] = [];
    if (paymentFreqCode === "WEEKLY") days = WEEKLY_DAYS;
    else if (paymentFreqCode === "BIWEEKLY") days = BIWEEKLY_DAYS;
    else if (paymentFreqCode === "MONTHLY") days = MONTHLY_DAYS;
    return days.map((d) => ({ value: String(d), label: String(d) }));
  }, [paymentFreqCode]);

  const loadAvailableForCollege = useCallback(
    async (cid: number, selected: CatRow[]) => {
      const all = await listPayrollCategoriesByCollege(cid);
      const selectedIds = new Set(
        selected.map((s) => Number(s.payrollCategoryId)),
      );
      setAvailableCategories(
        all
          .filter((c) => !selectedIds.has(Number(c.payrollCategoryId)))
          .map(
            (c): CatRow => ({
              ...c,
              sortOrder: (c.sortOrder ?? "") as string | number,
            }),
          ),
      );
    },
    [],
  );

  useEffect(() => {
    void (async () => {
      try {
        const [collegeList, freqList] = await Promise.all([
          listActiveCollegesForGeneralSettings(),
          listPaymentFrequencies(),
        ]);
        setColleges(
          collegeList.map((c) => ({
            value: String(c.collegeId),
            label: String(c.collegeCode ?? c.collegeName ?? c.collegeId),
          })),
        );
        setFrequencies(
          freqList.map((f) => ({
            value: String(f.generalDetailId ?? f.generalDetailID),
            label: String(
              f.generalDetailDisplayName ?? f.generalDetailCode ?? "",
            ),
          })),
        );
        const codeMap: Record<number, string> = {};
        for (const f of freqList) {
          const id = Number(f.generalDetailId ?? f.generalDetailID);
          if (id) codeMap[id] = String(f.generalDetailCode ?? "");
        }
        setFreqCodeById(codeMap);
      } catch (e) {
        toastError(e, "Failed to load form data");
      }
    })();
  }, []);

  useEffect(() => {
    if (mode !== "edit" || !payrollGroupId) return;
    void (async () => {
      setLoading(true);
      try {
        const group = await getPayrollGroupById(payrollGroupId);
        if (!group) {
          toastError(null, "Payroll group not found");
          router.push(LIST_BACK_HREF);
          return;
        }
        const cid = Number(group.collegeId ?? 0);
        const selected = (
          Array.isArray(group.payrollCategoryGroups)
            ? (group.payrollCategoryGroups as CatRow[])
            : []
        ).map((c) => ({ ...c, sortOrder: c.sortOrder ?? "" }));
        setCollegeId(cid || null);
        setPayrollGroupName(String(group.payrollGroupName ?? ""));
        setPaymentFrequency(Number(group.paymentFrequency) || null);
        setPayslipGenerationDay(
          group.payslipGenerationDay != null
            ? Number(group.payslipGenerationDay)
            : null,
        );
        setIsActive(group.isActive !== false);
        setReason(String(group.reason ?? "active"));
        setSelectedCategories(selected);
        if (cid) await loadAvailableForCollege(cid, selected);
      } catch (e) {
        toastError(e, "Failed to load payroll group");
      } finally {
        setLoading(false);
      }
    })();
  }, [mode, payrollGroupId, router, loadAvailableForCollege]);

  const handleCollegeChange = (v: string | null) => {
    const cid = v ? Number(v) : null;
    setCollegeId(cid);
    setSelectedCategories([]);
    setDeletedCategories([]);
    if (cid) void loadAvailableForCollege(cid, []);
    else setAvailableCategories([]);
  };

  const addCategory = (item: CatRow) => {
    const id = Number(item.payrollCategoryId);
    setSelectedCategories((prev) => [...prev, { ...item, sortOrder: "" }]);
    setAvailableCategories((prev) =>
      prev.filter((c) => Number(c.payrollCategoryId) !== id),
    );
  };

  const removeCategory = (item: CatRow, index: number) => {
    setSelectedCategories((prev) => prev.filter((_, i) => i !== index));
    setAvailableCategories((prev) => [...prev, item]);
    if (item.payrollCategoryGroupId) {
      setDeletedCategories((prev) => [...prev, { ...item, isActive: false }]);
    }
  };

  const updateSortOrder = (index: number, sortOrder: string) => {
    setSelectedCategories((prev) =>
      prev.map((row, i) => (i === index ? { ...row, sortOrder } : row)),
    );
  };

  const handleSave = async () => {
    if (!collegeId || !payrollGroupName.trim() || !paymentFrequency) {
      toastError(null, "Please fill all required fields");
      return;
    }
    setSaving(true);
    try {
      const groups = [...selectedCategories];
      if (mode === "edit") groups.push(...deletedCategories);
      await savePayrollGroup({
        collegeId,
        payrollGroupName: payrollGroupName.trim(),
        empSalType: "Salaried",
        paymentFrequency,
        payslipGenerationDay,
        isActive,
        reason: isActive ? "active" : reason,
        payrollCategoryGroups: groups,
        ...(mode === "edit" ? { payrollGroupId } : {}),
      });
      toastSuccess(
        mode === "add" ? "Payroll group created" : "Payroll group updated",
      );
      void queryClient.invalidateQueries({
        queryKey: QK.hrPayroll.payrollGroups(),
      });
      router.push(LIST_BACK_HREF);
    } catch (e) {
      toastError(e, "Save failed");
    } finally {
      setSaving(false);
    }
  };

  function goBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(LIST_BACK_HREF);
  }

  const title = mode === "add" ? "Add Payroll Group" : "Edit Payroll Group";

  if (mode === "edit" && !payrollGroupId) {
    return (
      <PageContainer>
        <EmptyState
          title="Payroll group not specified"
          description="Open this page from the payroll groups list to edit a group."
          action={{
            label: "Back to list",
            onClick: () => router.push(LIST_BACK_HREF),
          }}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer className="space-y-4">
      <div className="app-card overflow-hidden">
        <div className="border-b-2 border-[#ffcf46] px-4 py-3 sm:px-5">
          <h1 className="inline-flex items-center gap-2 text-[15px] font-semibold text-[#0c51a4]">
            <Monitor className="h-4 w-4 shrink-0" aria-hidden />
            {title}
          </h1>
        </div>

        {loading ? (
          <p className="px-4 py-8 text-sm text-muted-foreground sm:px-5">
            Loading payroll group…
          </p>
        ) : (
          <div className="space-y-6 p-4 sm:p-5">
            <div className="grid gap-4 sm:grid-cols-2 lg:max-w-4xl">
              <Select
                label="College"
                required
                value={collegeId != null ? String(collegeId) : ""}
                onChange={handleCollegeChange}
                options={colleges}
                placeholder="College"
                searchable
              />
              <div className="space-y-1.5">
                <Label htmlFor="payroll-group-name">
                  Payroll Group Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="payroll-group-name"
                  value={payrollGroupName}
                  onChange={(e) => setPayrollGroupName(e.target.value)}
                  placeholder="Payroll Group Name"
                  className="rounded-none border-0 border-b border-input bg-transparent px-0 shadow-none focus-visible:ring-0"
                />
              </div>
            </div>

            <div className="space-y-4">
              <AngularSectionTitle>Salary Preference</AngularSectionTitle>
              <div className="grid gap-4 sm:grid-cols-2 lg:max-w-4xl">
                <div className="space-y-1.5">
                  <Label htmlFor="emp-sal-type">Employee Salary Type</Label>
                  <Input
                    id="emp-sal-type"
                    value="Salaried"
                    disabled
                    className="rounded-none border-0 border-b border-input bg-transparent px-0 text-slate-700 shadow-none"
                  />
                </div>
                <Select
                  label="Payment Frequency"
                  required
                  value={
                    paymentFrequency != null ? String(paymentFrequency) : ""
                  }
                  onChange={(v) => {
                    setPaymentFrequency(v ? Number(v) : null);
                    setPayslipGenerationDay(null);
                  }}
                  options={frequencies}
                  placeholder="Payment Frequency"
                />
                {payslipDayOptions.length > 0 ? (
                  <Select
                    label="Payslip Generation Date"
                    value={
                      payslipGenerationDay != null
                        ? String(payslipGenerationDay)
                        : ""
                    }
                    onChange={(v) =>
                      setPayslipGenerationDay(v ? Number(v) : null)
                    }
                    options={payslipDayOptions}
                    placeholder="Select day"
                  />
                ) : null}
              </div>
            </div>

            <div className="space-y-3">
              <AngularSectionTitle>
                Selected Payroll Categories
              </AngularSectionTitle>
              {!collegeId ? (
                <p className="text-[13px] text-slate-500">
                  Select a college to load payroll categories.
                </p>
              ) : (
                <CategoryRowsTable
                  rows={selectedCategories}
                  mode="selected"
                  onRemove={removeCategory}
                  onSortOrderChange={updateSortOrder}
                />
              )}
            </div>

            <div className="space-y-3">
              <AngularSectionTitle>Add Payroll Categories</AngularSectionTitle>
              {!collegeId ? (
                <p className="text-[13px] text-slate-500">
                  Select a college to load payroll categories.
                </p>
              ) : (
                <CategoryRowsTable
                  rows={availableCategories}
                  mode="available"
                  onAdd={addCategory}
                />
              )}
            </div>

            {mode === "edit" ? (
              <div className="max-w-xl">
                <ActiveStatusField
                  isActive={isActive}
                  reason={reason}
                  onActiveChange={(v) => setIsActive(v === true)}
                  onReasonChange={setReason}
                />
              </div>
            ) : null}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" className={BACK_BTN} onClick={goBack}>
                Back
              </Button>
              <Button
                type="button"
                className={SAVE_BTN}
                disabled={saving}
                onClick={() => void handleSave()}
              >
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
