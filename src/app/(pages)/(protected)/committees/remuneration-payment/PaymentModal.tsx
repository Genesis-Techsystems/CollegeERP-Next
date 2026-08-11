"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FormModal } from "@/common/components/feedback";
import { Select } from "@/common/components/select";
import { DatePicker } from "@/common/components/date-picker";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GM_CODES } from "@/config/constants/ui";
import { listGeneralDetailsByMaster } from "@/services";
import type {
  RemunerationPaymentSummary,
  RemunerationPaymentWritePayload,
} from "@/types/committees";

export type PaymentModalContext = {
  orgName: string;
  orgId: number;
  examName: string;
};

type PaymentModalProps = {
  open: boolean;
  onClose: () => void;
  row: RemunerationPaymentSummary | null;
  context: PaymentModalContext | null;
  employeeId: number;
  onSave: (payload: RemunerationPaymentWritePayload) => void;
  isSubmitting?: boolean;
};

/** Angular default `paymentModeCatDetId: 132`. */
const DEFAULT_PAYMENT_MODE_ID = 132;

function fmtDateInput(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function PaymentModal({
  open,
  onClose,
  row,
  context,
  employeeId,
  onSave,
  isSubmitting,
}: Readonly<PaymentModalProps>) {
  const isPaid = Boolean(row?.fk_univ_remuneration_trsansaction_id);

  const [transactionDate, setTransactionDate] = useState<Date | null>(
    new Date(),
  );
  const [refNo, setRefNo] = useState("");
  const [accountNo, setAccountNo] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [isUpiPayment, setIsUpiPayment] = useState(false);
  const [paymentModeId, setPaymentModeId] = useState<string | null>(
    String(DEFAULT_PAYMENT_MODE_ID),
  );

  const { data: paymentModes = [], isLoading: loadingModes } = useQuery({
    queryKey: ["Committees", "paymentModes"],
    queryFn: () => listGeneralDetailsByMaster(GM_CODES.PAYMENT_MODE),
    enabled: open && !isPaid,
    staleTime: Number.POSITIVE_INFINITY,
  });

  useEffect(() => {
    if (!open) return;
    setTransactionDate(new Date());
    setRefNo("");
    setAccountNo("");
    setIfscCode("");
    setIsUpiPayment(false);
    setPaymentModeId(String(DEFAULT_PAYMENT_MODE_ID));
  }, [open, row]);

  function handleSubmit(e: { preventDefault: () => void }) {
    e.preventDefault();
    if (isPaid) {
      onClose();
      return;
    }
    if (!row || !context || !paymentModeId || !transactionDate) return;
    if (!refNo.trim() || !accountNo.trim()) return;

    const payload: RemunerationPaymentWritePayload = {
      organizationId: context.orgId,
      examEvaluatorProfileId: row.fk_exam_evaluator_profile_id ?? null,
      employeeId: null,
      evaluatorRoleId: row.fk_evaluatorrole_id ?? null,
      remunerationForcatDetID: null,
      transactionAmount: Number(row.total_amount ?? 0),
      transactionDate: fmtDateInput(transactionDate),
      transactionByEmpId: employeeId,
      paymentModeCatDetId: Number(paymentModeId),
      refNo: refNo.trim(),
      accountNo: accountNo.trim(),
      ifscCode: isUpiPayment ? null : ifscCode.trim() || null,
      isUpiPayment,
      isActive: true,
    };
    onSave(payload);
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title="Payment Details"
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      submitLabel="Ok"
      cancelLabel="Close"
      size="lg"
      showHeaderDivider
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-x-6 gap-y-2 text-[12px] sm:grid-cols-2">
          <div className="flex gap-2">
            <span className="font-semibold text-slate-700">Organization :</span>
            <span>{context?.orgName ?? ""}</span>
          </div>
          <div className="flex gap-2">
            <span className="font-semibold text-slate-700">Exam :</span>
            <span>{context?.examName ?? ""}</span>
          </div>
          <div className="flex gap-2">
            <span className="font-semibold text-slate-700">Exam Date :</span>
            <span>{row?.exam_month_yr ?? ""}</span>
          </div>
          <div className="flex gap-2">
            <span className="font-semibold text-slate-700">Evalutor :</span>
            <span>{row?.remuneration_to ?? ""}</span>
          </div>
          <div className="flex gap-2">
            <span className="font-semibold text-slate-700">Role :</span>
            <span>{row?.role_name ?? ""}</span>
          </div>
          <div className="flex gap-2">
            <span className="font-semibold text-slate-700">
              No. of papers :
            </span>
            <span>{row?.total_nos ?? ""}</span>
          </div>
        </div>

        {!isPaid && (
          <div className="space-y-3 rounded-md border border-slate-200 bg-slate-50/60 p-3">
            <p className="text-[13px] font-medium text-slate-800">
              Payment Amount :{" "}
              <span className="text-base font-bold text-[#001f3f]">
                {row?.total_amount ?? ""}
              </span>
            </p>

            <label className="flex items-center gap-2 text-[12px]">
              <Checkbox
                checked={isUpiPayment}
                onCheckedChange={(v) => setIsUpiPayment(v === true)}
              />
              Is UPI Payment
            </label>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Select
                label="Pay Mode"
                required
                value={paymentModeId}
                onChange={setPaymentModeId}
                options={paymentModes.map((m) => ({
                  value: String(m.generalDetailId),
                  label: String(
                    m.generalDetailDisplayName ??
                      m.generalDetailCode ??
                      m.generalDetailId,
                  ),
                }))}
                placeholder="Select pay mode"
                searchable
                isLoading={loadingModes}
              />
              <div className="space-y-1">
                <Label className="text-[12px]">
                  {isUpiPayment ? "UPI Id *" : "Account Number *"}
                </Label>
                <Input
                  className="h-9 text-[12px]"
                  value={accountNo}
                  onChange={(e) => setAccountNo(e.target.value)}
                  required
                />
              </div>
              {!isUpiPayment && (
                <div className="space-y-1">
                  <Label className="text-[12px]">IFSC Code</Label>
                  <Input
                    className="h-9 text-[12px]"
                    value={ifscCode}
                    onChange={(e) => setIfscCode(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <DatePicker
                label="Transaction Date"
                required
                value={transactionDate}
                onChange={setTransactionDate}
              />
              <div className="space-y-1">
                <Label className="text-[12px]">Transaction Number *</Label>
                <Input
                  className="h-9 text-[12px]"
                  value={refNo}
                  onChange={(e) => setRefNo(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </FormModal>
  );
}
