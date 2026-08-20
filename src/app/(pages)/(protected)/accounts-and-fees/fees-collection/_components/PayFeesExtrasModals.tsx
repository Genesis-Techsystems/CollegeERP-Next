"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FormModal } from "@/common/components/feedback";
import { Select } from "@/common/components/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toastInfo } from "@/lib/toast";
import {
  listDepartmentsByCollege,
  listDepartmentHeadsByDepartment,
  listFeeCategoriesByCollege,
  listFeeParticularsByCollege,
} from "@/services";
import type {
  FeeStudentData,
  FeeStudentParticularRow,
} from "@/types/fees-collection";

/**
 * Angular `remove_duplicates` on add-fine / add-scholarship:
 * keep first row per `feeCategoryId` from `feeStudentDataParticulars`.
 * (add-discount has a buggy variant; we use the fine/scholarship algorithm
 * so Tuition/Transport are not dropped when SPECIAL FEE duplicates appear early.)
 */
function uniqueParticularsByCategory(
  arr: FeeStudentParticularRow[],
): FeeStudentParticularRow[] {
  const unique_array: FeeStudentParticularRow[] = [];
  for (let i = 0; i < arr.length; i++) {
    if (i !== 0) {
      if (
        unique_array.filter((x) => x.feeCategoryId === arr[i].feeCategoryId)
          .length === 0
      ) {
        unique_array.push(arr[i]);
      }
    } else {
      unique_array.push(arr[i]);
    }
  }
  return unique_array;
}

function particularOptions(rows: FeeStudentParticularRow[]) {
  return uniqueParticularsByCategory(rows).map((p) => ({
    value: String(
      p.feeStdDataParticularsId ?? `${p.feeCategoryId}-${p.feeParticularsId}`,
    ),
    label: [p.categoryName, p.particularsName].filter(Boolean).join(" - "),
    row: p,
  }));
}

export function AddParticularModal({
  open,
  onClose,
  collegeId,
  onSave,
  saving,
}: {
  open: boolean;
  onClose: () => void;
  collegeId: number;
  onSave: (payload: {
    feeCategoryId: number;
    feeParticularsId: number;
    amount: number;
    isActive: boolean;
  }) => void;
  saving?: boolean;
}) {
  const [feeCategoryId, setFeeCategoryId] = useState<string | null>(null);
  const [feeParticularsId, setFeeParticularsId] = useState<string | null>(null);
  const [amount, setAmount] = useState(0);

  const { data: categories = [], isLoading: loadingCat } = useQuery({
    queryKey: ["FeesCollection", "feeCategories", collegeId],
    queryFn: () => listFeeCategoriesByCollege(collegeId),
    enabled: open && collegeId > 0,
  });
  const { data: particulars = [], isLoading: loadingPart } = useQuery({
    queryKey: ["FeesCollection", "feeParticulars", collegeId],
    queryFn: () => listFeeParticularsByCollege(collegeId),
    enabled: open && collegeId > 0,
  });

  useEffect(() => {
    if (!open) {
      setFeeCategoryId(null);
      setFeeParticularsId(null);
      setAmount(0);
    }
  }, [open]);

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title="Add Particular"
      onSubmit={(e) => {
        e.preventDefault();
        if (!feeCategoryId || !feeParticularsId || amount <= 0) return;
        onSave({
          feeCategoryId: Number(feeCategoryId),
          feeParticularsId: Number(feeParticularsId),
          amount,
          isActive: true,
        });
      }}
      isSubmitting={saving}
      submitLabel="Save"
      size="md"
    >
      <Select
        label="Fee Category"
        required
        value={feeCategoryId}
        onChange={(v) => {
          setFeeCategoryId(v);
          setFeeParticularsId(null);
        }}
        options={categories.map((c) => ({
          value: String(c.feeCategoryId),
          label: c.categoryName ?? String(c.feeCategoryId),
        }))}
        isLoading={loadingCat}
      />
      <Select
        label="Fee Particular"
        required
        value={feeParticularsId}
        onChange={setFeeParticularsId}
        options={particulars.map((p) => ({
          value: String(p.feeParticularsId),
          label: p.particularsName ?? String(p.feeParticularsId),
        }))}
        isLoading={loadingPart}
      />
      <div className="space-y-1.5">
        <Label>Fee Amount</Label>
        <Input
          type="number"
          min={0}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value) || 0)}
        />
      </div>
    </FormModal>
  );
}

export function AddAmountOnParticularModal({
  open,
  onClose,
  title,
  amountLabel,
  amountKey = "value",
  particulars,
  collegeId = 0,
  onSave,
  saving,
  showEmployeeReason,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  amountLabel: string;
  amountKey?: "value" | "holdAmount";
  /** Angular: full `feeStudentData.feeStudentDataParticulars` */
  particulars: FeeStudentParticularRow[];
  /** Required for Institutional Scholarship — Angular loads MGMNT dept heads. */
  collegeId?: number;
  onSave: (payload: Record<string, unknown>) => void;
  saving?: boolean;
  showEmployeeReason?: boolean;
}) {
  const [particularKey, setParticularKey] = useState<string | null>(null);
  const [amount, setAmount] = useState(0);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [balanceAmt, setBalanceAmt] = useState<number | null>(null);

  const options = useMemo(() => particularOptions(particulars), [particulars]);

  // Angular add-discount: departments where deptCode === 'MGMNT' → EmpDeptHeads
  const mgmtEmployeesQuery = useQuery({
    queryKey: ["FeesCollection", "mgmtEmployees", collegeId],
    queryFn: async () => {
      const depts = await listDepartmentsByCollege(collegeId);
      const mgmt = depts.find(
        (d) => String(d.deptCode ?? "").toUpperCase() === "MGMNT",
      );
      if (!mgmt?.departmentId) return [];
      const heads = await listDepartmentHeadsByDepartment(mgmt.departmentId);
      return heads
        .map((h) => {
          const id = Number(
            h.employeeId ??
              (h as { employee?: { employeeId?: number } }).employee
                ?.employeeId ??
              0,
          );
          const name = String(
            h.employeeName ??
              h.firstName ??
              (h as { employee?: { employeeName?: string } }).employee
                ?.employeeName ??
              "",
          ).trim();
          if (!id || !name) return null;
          return { value: String(id), label: name };
        })
        .filter((x): x is { value: string; label: string } => x != null);
    },
    enabled: open && showEmployeeReason === true && collegeId > 0,
  });

  useEffect(() => {
    if (!open) {
      setParticularKey(null);
      setAmount(0);
      setEmployeeId(null);
      setReason("");
      setBalanceAmt(null);
    }
  }, [open]);

  function onParticularChange(v: string | null) {
    setParticularKey(v);
    const picked = options.find((o) => o.value === v)?.row;
    const bal = Number(picked?.balanceAmount ?? 0);
    setBalanceAmt(picked ? bal : null);
    if (showEmployeeReason && Number(amount) > bal) {
      setAmount(0);
    }
  }

  function onAmountChange(raw: string) {
    const next = Number(raw) || 0;
    if (showEmployeeReason && balanceAmt != null && next > balanceAmt) {
      setAmount(0);
      toastInfo("Discount amount is greater than balance amount.");
      return;
    }
    setAmount(next);
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={title}
      onSubmit={(e) => {
        e.preventDefault();
        const picked = options.find((o) => o.value === particularKey)?.row;
        if (!picked || amount <= 0) return;
        if (showEmployeeReason && (!employeeId || !reason.trim())) return;
        const payload: Record<string, unknown> = {
          feeStdDataParticularsId: picked.feeStdDataParticularsId,
          feeCategoryId: picked.feeCategoryId,
          feeParticularsId: picked.feeParticularsId,
          categoryName: picked.categoryName,
          particularsName: picked.particularsName,
          isActive: true,
          [amountKey]: amount,
        };
        if (showEmployeeReason) {
          payload.requestedEmployeeId = Number(employeeId);
          // Angular: authorizedEmployeeId = logged-in employee
          payload.authorizedEmployeeId = Number(
            globalThis?.localStorage?.getItem("employeeId") ?? employeeId,
          );
          payload.authComments = reason.trim();
        }
        onSave(payload);
      }}
      isSubmitting={saving}
      submitLabel="Save"
      cancelLabel="Close"
      size="md"
    >
      <Select
        label="Fee Category"
        required
        value={particularKey}
        onChange={onParticularChange}
        options={options.map((o) => ({ value: o.value, label: o.label }))}
        placeholder="Fee Category"
      />
      <div className="space-y-1.5">
        <Label>{amountLabel}</Label>
        <Input
          type="number"
          min={0}
          value={amount}
          onChange={(e) => onAmountChange(e.target.value)}
        />
      </div>

      {showEmployeeReason ? (
        <>
          <Select
            label="Requested Employee"
            required
            value={employeeId}
            onChange={setEmployeeId}
            options={mgmtEmployeesQuery.data ?? []}
            searchable
            isLoading={mgmtEmployeesQuery.isLoading}
            placeholder="Requested Employee"
          />
          <div className="space-y-1.5">
            <Label>Reason *</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          {showEmployeeReason && balanceAmt != null ? (
            <p className="m-0 text-sm font-medium text-blue-700">
              Balance Amount is {balanceAmt}
            </p>
          ) : null}
        </>
      ) : null}
    </FormModal>
  );
}

export function MinFeePercentModal({
  open,
  onClose,
  initialValue,
  onSave,
  saving,
}: {
  open: boolean;
  onClose: () => void;
  initialValue?: number | null;
  onSave: (minFeePercent: number) => void;
  saving?: boolean;
}) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (open) setValue(Number(initialValue ?? 0) || 0);
  }, [open, initialValue]);

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title="Add Min Fee Percentage"
      onSubmit={(e) => {
        e.preventDefault();
        if (value <= 0) return;
        onSave(value);
      }}
      isSubmitting={saving}
      submitLabel="Save"
      size="sm"
    >
      <div className="space-y-1.5">
        <Label>Min Fee Percent</Label>
        <Input
          type="number"
          min={0}
          value={value}
          onChange={(e) => setValue(Number(e.target.value) || 0)}
        />
      </div>
    </FormModal>
  );
}

export type FeeExtraRow = {
  feeStdDiscountId?: number;
  feeStdFineId?: number;
  feeStdScholorshipId?: number;
  feeStdParticularId?: number;
  feeCategoryId?: number;
  feeParticularsId?: number;
  categoryName?: string;
  particularsName?: string;
  value?: number;
  holdAmount?: number;
  [key: string]: unknown;
};

export function readExtraLists(data: FeeStudentData | null | undefined) {
  return {
    discounts: (Array.isArray(data?.feeStudentwiseDiscounts)
      ? data?.feeStudentwiseDiscounts
      : []) as FeeExtraRow[],
    fines: (Array.isArray(data?.feeStudentwiseFines)
      ? data?.feeStudentwiseFines
      : []) as FeeExtraRow[],
    scholarships: (Array.isArray(data?.feeStudentwiseScholorshipDTOS)
      ? data?.feeStudentwiseScholorshipDTOS
      : []) as FeeExtraRow[],
    stdWiseParticulars: (Array.isArray(data?.feeStudentWiseParticulars)
      ? data?.feeStudentWiseParticulars
      : []) as FeeExtraRow[],
  };
}
