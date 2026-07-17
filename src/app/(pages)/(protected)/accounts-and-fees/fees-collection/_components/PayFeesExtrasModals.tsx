"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FormModal } from "@/common/components/feedback";
import { Select } from "@/common/components/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  listFeeCategoriesByCollege,
  listFeeParticularsByCollege,
  searchEmployeesForTransport,
} from "@/services";
import type {
  FeeStudentData,
  FeeStudentParticularRow,
} from "@/types/fees-collection";

function particularOptions(rows: FeeStudentParticularRow[]) {
  return rows.map((p) => ({
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
  onSave,
  saving,
  showEmployeeReason,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  amountLabel: string;
  amountKey?: "value" | "holdAmount";
  particulars: FeeStudentParticularRow[];
  onSave: (payload: Record<string, unknown>) => void;
  saving?: boolean;
  showEmployeeReason?: boolean;
}) {
  const [particularKey, setParticularKey] = useState<string | null>(null);
  const [amount, setAmount] = useState(0);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [empTerm, setEmpTerm] = useState("");
  const [empRows, setEmpRows] = useState<{ value: string; label: string }[]>(
    [],
  );
  const [empLoading, setEmpLoading] = useState(false);

  const options = useMemo(() => particularOptions(particulars), [particulars]);

  useEffect(() => {
    if (!open) {
      setParticularKey(null);
      setAmount(0);
      setEmployeeId(null);
      setReason("");
      setEmpRows([]);
    }
  }, [open]);

  async function searchEmployees(term: string) {
    setEmpTerm(term);
    if (term.trim().length < 5) {
      setEmpRows([]);
      return;
    }
    setEmpLoading(true);
    try {
      const rows = await searchEmployeesForTransport(term);
      setEmpRows(
        rows.map((e) => ({
          value: String(e.employeeId),
          label: `${e.firstName ?? "Employee"}${e.empNumber ? ` (${e.empNumber})` : ""}`,
        })),
      );
    } finally {
      setEmpLoading(false);
    }
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
          payload.authorizedEmployeeId = Number(employeeId);
          payload.authComments = reason.trim();
        }
        onSave(payload);
      }}
      isSubmitting={saving}
      submitLabel="Save"
      size="md"
    >
      <Select
        label="Fee Category"
        required
        value={particularKey}
        onChange={setParticularKey}
        options={options.map((o) => ({ value: o.value, label: o.label }))}
      />
      <div className="space-y-1.5">
        <Label>{amountLabel}</Label>
        <Input
          type="number"
          min={0}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value) || 0)}
        />
      </div>
      {showEmployeeReason ? (
        <>
          <Select
            label="Requested Employee"
            required
            value={employeeId}
            onChange={setEmployeeId}
            options={empRows}
            searchable
            onSearch={(t) => void searchEmployees(t)}
            isLoading={empLoading}
            placeholder={
              empTerm ? "Select employee" : "Search employee (min 5 chars)"
            }
          />
          <div className="space-y-1.5">
            <Label>Reason</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
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
