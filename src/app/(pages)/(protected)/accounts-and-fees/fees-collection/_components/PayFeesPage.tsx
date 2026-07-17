"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Pencil, Printer, Trash2 } from "lucide-react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { DatePicker } from "@/common/components/date-picker";
import { ConfirmDialog } from "@/common/components/feedback";
import { Select } from "@/common/components/select";
import { DataTable } from "@/common/components/table";
import { PageContainer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QK } from "@/lib/query-keys";
import { rowIndexGetter } from "@/lib/utils";
import { toastError, toastInfo, toastSuccess } from "@/lib/toast";
import {
  FEE_RECEIPT_PRINT_PATH,
  storeFeeReceiptPrint,
} from "../_lib/fee-receipt-print";
import {
  deleteFeeStudentWiseDiscount,
  deleteFeeStudentWiseFine,
  deleteFeeStudentWiseParticular,
  deleteFeeStudentWiseScholarship,
  generateFeeTransactions,
  getFeePaymentLookups,
  getFeeStudentData,
  getFinancialYearForReceiptDate,
  listFeeStructureParticularsForPayment,
  listStudentFeeReceiptDetails,
  saveFeeStudentWiseDiscount,
  saveFeeStudentWiseFines,
  saveFeeStudentWiseParticulars,
  saveFeeStudentWiseScholarship,
  submitFeeReceipt,
  updateMinFeePercent,
} from "@/services";
import type {
  FeeReceiptPaymentPayload,
  FeeStudentData,
  FeeStudentParticularRow,
} from "@/types/fees-collection";
import { FeeStudentProfileCard } from "./FeeStudentProfileCard";
import {
  PayFeesConfirmDialog,
  type PayFeesConfirmData,
} from "./PayFeesConfirmDialog";
import {
  AddAmountOnParticularModal,
  AddParticularModal,
  MinFeePercentModal,
  readExtraLists,
} from "./PayFeesExtrasModals";

type ParticularPayRow = FeeStudentParticularRow & { amount?: number };

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function pickModeField(
  modeId: string | null,
  modes: { value: string; label: string; code?: string }[],
): "reference" | "cheque" | "dd" | "other" | "transaction" | null {
  if (!modeId) return null;
  const mode = modes.find((m) => m.value === modeId);
  const code = String(mode?.code ?? "").toUpperCase();
  const id = Number(modeId);
  if (code.includes("CASH") || id === 131) return "reference";
  if (code.includes("CHEQUE") || id === 133) return "cheque";
  if (code === "DD" || code.includes("DEMAND") || id === 134) return "dd";
  if (code.includes("OTHER") || id === 135) return "other";
  if (
    code.includes("CARD") ||
    code.includes("NEFT") ||
    code.includes("UPI") ||
    code.includes("ONLINE") ||
    code.includes("BANK") ||
    id === 132
  ) {
    return "transaction";
  }
  return "reference";
}

function formatReceiptDate(value?: string): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return format(d, "MMM d, yyyy");
}

function ActionLink({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="font-bold text-blue-700 hover:underline"
      onClick={onClick}
    >
      {label}
    </button>
  );
}

export function PayFeesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const collegeId = Number(searchParams.get("collegeId") ?? 0);
  const academicYearId = Number(searchParams.get("academicYearId") ?? 0);
  const studentId = Number(searchParams.get("studentId") ?? 0);
  const feeStructureId = Number(searchParams.get("feeStructureId") ?? 0);
  const courseYearId = Number(searchParams.get("courseYearId") ?? 0);
  const page = searchParams.get("page") ?? "fee-payment";

  const [receiptDt, setReceiptDt] = useState<Date | null>(new Date());
  const [amount, setAmount] = useState(0);
  const [paymentModeId, setPaymentModeId] = useState<string | null>(null);
  const [paymentTypeId, setPaymentTypeId] = useState<string | null>(null);
  const [paymentFor, setPaymentFor] = useState("");
  const [fineReason, setFineReason] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [chequeNo, setChequeNo] = useState("");
  const [ddno, setDdno] = useState("");
  const [otherPaymentNumber, setOtherPaymentNumber] = useState("");
  const [transactionNo, setTransactionNo] = useState("");
  const [particulars, setParticulars] = useState<ParticularPayRow[]>([]);
  const [equalAmount, setEqualAmount] = useState(0);
  const [amountFlag, setAmountFlag] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmData, setConfirmData] = useState<PayFeesConfirmData | null>(
    null,
  );
  const [submitting, setSubmitting] = useState(false);
  const [extraSaving, setExtraSaving] = useState(false);
  const [addParticularOpen, setAddParticularOpen] = useState(false);
  const [addDiscountOpen, setAddDiscountOpen] = useState(false);
  const [addFineOpen, setAddFineOpen] = useState(false);
  const [addRtfOpen, setAddRtfOpen] = useState(false);
  const [minFeeOpen, setMinFeeOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    kind: "particular" | "discount" | "fine" | "rtf";
    id: number;
  } | null>(null);

  const { data: lookups, isLoading: loadingLookups } = useQuery({
    queryKey: ["FeesCollection", "paymentLookups"],
    queryFn: getFeePaymentLookups,
  });

  const paymentModeOptions = useMemo(
    () =>
      (lookups?.paymentModes ?? []).map((m) => ({
        value: String(m.generalDetailId),
        label: String(
          m.generalDetailDisplayName ??
            m.generalDetailName ??
            m.generalDetailCode ??
            m.generalDetailId,
        ),
        code: m.generalDetailCode,
      })),
    [lookups?.paymentModes],
  );

  const paymentTypeOptions = useMemo(
    () =>
      (lookups?.paymentTypes ?? []).map((m) => ({
        value: String(m.generalDetailId),
        label: String(
          m.generalDetailDisplayName ??
            m.generalDetailName ??
            m.generalDetailCode ??
            m.generalDetailId,
        ),
        code: m.generalDetailCode,
      })),
    [lookups?.paymentTypes],
  );

  useEffect(() => {
    if (paymentModeId || paymentModeOptions.length === 0) return;
    const cash =
      paymentModeOptions.find((m) =>
        String(m.code ?? "")
          .toUpperCase()
          .includes("CASH"),
      ) ??
      paymentModeOptions.find((m) => m.value === "131") ??
      paymentModeOptions[0];
    if (cash) setPaymentModeId(cash.value);
  }, [paymentModeId, paymentModeOptions]);

  const {
    data: feeStudentData,
    isLoading: loadingFee,
    refetch: refetchFee,
  } = useQuery({
    queryKey: QK.feesCollection.studentData(
      collegeId,
      academicYearId,
      studentId,
      feeStructureId,
    ),
    queryFn: () =>
      getFeeStudentData({
        collegeId,
        academicYearId,
        studentId,
        feeStructureId,
      }),
    enabled:
      collegeId > 0 &&
      academicYearId > 0 &&
      studentId > 0 &&
      feeStructureId > 0,
  });

  const { data: structureParticulars = [] } = useQuery({
    queryKey: ["FeesCollection", "structureParticulars", feeStructureId],
    queryFn: () => listFeeStructureParticularsForPayment(feeStructureId),
    enabled: feeStructureId > 0,
  });

  const { data: financialYears = [], isFetching: loadingFy } = useQuery({
    queryKey: [
      "FeesCollection",
      "financialYear",
      collegeId,
      receiptDt ? format(receiptDt, "yyyy-MM-dd") : "",
    ],
    queryFn: () =>
      getFinancialYearForReceiptDate(collegeId, receiptDt ?? new Date()),
    enabled: collegeId > 0 && receiptDt != null,
  });

  const { data: receipts = [] } = useQuery({
    queryKey: [
      ...QK.feesCollection.receipts(studentId, collegeId, academicYearId),
      courseYearId,
      "pay-fees",
    ],
    queryFn: () =>
      listStudentFeeReceiptDetails({
        collegeId,
        academicYearId,
        studentId,
        courseYearId: 0,
      }),
    enabled: collegeId > 0 && academicYearId > 0 && studentId > 0,
  });

  useEffect(() => {
    const list = feeStudentData?.feeStudentDataParticulars;
    if (!Array.isArray(list)) {
      setParticulars([]);
      return;
    }
    setParticulars(
      list.map((p) => ({
        ...p,
        feeStructureId: p.feeStructureId ?? feeStudentData?.feeStructureId,
        amount: 0,
      })),
    );
    setAmount(0);
    setEqualAmount(0);
    setAmountFlag(false);
    setPaymentFor("");
  }, [feeStudentData]);

  const profileStudent = useMemo(() => {
    const data = feeStudentData;
    return {
      studentId,
      firstName: data?.firstName ?? searchParams.get("firstName") ?? undefined,
      hallticketNumber: searchParams.get("hallTicketNo") ?? undefined,
      rollNumber: searchParams.get("rollNumber") ?? undefined,
      collegeId,
      collegeCode: searchParams.get("collegeCode") ?? undefined,
      academicYear:
        data?.studentAcademicYear ??
        data?.academicYear ??
        searchParams.get("academicYear") ??
        undefined,
      courseCode: searchParams.get("courseCode") ?? undefined,
      groupCode:
        data?.studentGroupCode ?? searchParams.get("groupCode") ?? undefined,
      courseYearName:
        data?.studentCourseYearName ??
        searchParams.get("courseYearName") ??
        undefined,
      mobile: data?.mobile,
      studentPhotoPath: data?.studentPhotoPath,
      section: data?.studentSection ?? searchParams.get("section") ?? undefined,
      quotaDisplayName: searchParams.get("quotaDisplayName") ?? undefined,
      studentStatusCode: searchParams.get("studentStatusCode") ?? undefined,
      studentStatusDisplayName:
        searchParams.get("studentStatusDisplayName") ?? undefined,
      isLateral: searchParams.get("isLateral") === "true",
    };
  }, [feeStudentData, searchParams, studentId, collegeId]);

  const structureRows = useMemo(
    () => particulars.filter((p) => Boolean(p.isFromStructure)),
    [particulars],
  );
  const stdwiseRows = useMemo(
    () => particulars.filter((p) => Boolean(p.isFromStdwise)),
    [particulars],
  );
  const { discounts, fines, scholarships, stdWiseParticulars } = useMemo(
    () => readExtraLists(feeStudentData),
    [feeStudentData],
  );

  // Fallback: if API omits isFromStructure flags, show unpaid/paid lines under Year-wise.
  const yearWiseRows =
    structureRows.length > 0
      ? structureRows
      : particulars.filter((p) => !p.isFromStdwise);

  async function refreshFeeData(feeStdDataId?: number) {
    if (feeStdDataId) {
      try {
        await generateFeeTransactions(feeStdDataId);
      } catch {
        // still reload student fee data
      }
    }
    await queryClient.invalidateQueries({ queryKey: ["FeesCollection"] });
    await refetchFee();
  }

  const recomputeEqual = useCallback(
    (rows: ParticularPayRow[], payAmt: number) => {
      let remaining = payAmt;
      let paymentNames = "";
      let j = 0;
      const next = rows.map((p) => ({ ...p }));
      for (let i = 0; i < next.length; i++) {
        const row = next[i];
        const pay = num(row.amount);
        if (pay <= 0) continue;
        if (pay > num(row.balanceAmount)) {
          toastInfo("Pay amount should be less than balance amount.");
          row.amount = 0;
          continue;
        }
        if (pay > remaining) {
          toastInfo(
            "particular amount should be less than or equal to remaining amount.",
          );
          row.amount = 0;
          continue;
        }
        remaining -= pay;
        paymentNames =
          j === 0
            ? String(row.particularsName ?? "")
            : `${paymentNames},${row.particularsName}`;
        j++;
      }
      setParticulars(next);
      setEqualAmount(remaining);
      setPaymentFor(paymentNames);
    },
    [],
  );

  function onPaymentAmountChange(raw: string) {
    const value = Number(raw);
    const bal = num(feeStudentData?.balanceAmount);
    if (!Number.isFinite(value) || value < 0) {
      setAmount(0);
      setEqualAmount(0);
      setAmountFlag(false);
      return;
    }
    if (value > bal) {
      toastInfo("Pay amount should be less than balance amount.");
      setAmount(0);
      setEqualAmount(0);
      setAmountFlag(false);
      setParticulars((prev) => prev.map((p) => ({ ...p, amount: 0 })));
      return;
    }
    setAmount(value);
    setAmountFlag(value > 0);
    const next = particulars.map((p) => ({
      ...p,
      amount: num(p.balanceAmount) > 0 ? num(p.balanceAmount) : 0,
    }));
    recomputeEqual(next, value);
  }

  function onParticularPayChange(
    index: number,
    raw: string,
    list: "structure" | "stdwise",
  ) {
    const value = Number(raw);
    const source = list === "structure" ? yearWiseRows : stdwiseRows;
    const target = source[index];
    if (!target) return;
    const next = particulars.map((p) =>
      p === target ||
      (p.feeCategoryId === target.feeCategoryId &&
        p.feeParticularsId === target.feeParticularsId &&
        Boolean(p.isFromStdwise) === Boolean(target.isFromStdwise))
        ? { ...p, amount: Number.isFinite(value) ? value : 0 }
        : p,
    );
    recomputeEqual(next, amount);
  }

  const modeField = pickModeField(paymentModeId, paymentModeOptions);
  const canPay =
    financialYears.length > 0 &&
    amountFlag &&
    equalAmount === 0 &&
    amount > 0 &&
    Boolean(paymentModeId) &&
    Boolean(paymentTypeId) &&
    !loadingFy;

  function buildPaymentLines(): FeeStudentParticularRow[] {
    const fyId = financialYears[0]?.financialYearId;
    const lines: FeeStudentParticularRow[] = [];
    for (const p of particulars) {
      if (num(p.balanceAmount) <= 0 || num(p.amount) <= 0) continue;
      const match = structureParticulars.find(
        (sp) =>
          Number(sp.feeStructureId ?? 0) ===
            Number(p.feeStructureId ?? feeStructureId) &&
          Number(sp.feeCategoryId ?? 0) === Number(p.feeCategoryId ?? 0) &&
          Number(sp.feeParticularsId ?? 0) === Number(p.feeParticularsId ?? 0),
      );
      lines.push({
        ...p,
        payerName: feeStudentData?.firstName,
        financialYearId: fyId,
        feeStructureParticularId:
          Number(
            match?.feeStructureParticularId ?? p.feeStructureParticularId ?? 0,
          ) || p.feeStructureParticularId,
        paidAmount: num(p.amount),
      });
    }
    const typeCode = paymentTypeOptions.find(
      (t) => t.value === paymentTypeId,
    )?.code;
    if (String(typeCode ?? "").toUpperCase() === "SCHOLARSHIP") {
      return lines.map((item) =>
        String(item.categoryName ?? "").toUpperCase() === "TUTION FEE"
          ? {
              ...item,
              scholarshipAmount: num(item.amount),
              paidAmount: num(item.amount),
            }
          : { ...item, paidAmount: num(item.amount) },
      );
    }
    return lines.map((item) => ({ ...item, paidAmount: num(item.amount) }));
  }

  function openPayConfirm() {
    if (!feeStudentData || !canPay || !receiptDt) {
      toastInfo("Please complete payment details.");
      return;
    }
    const lines = buildPaymentLines();
    if (lines.length === 0) {
      toastInfo("Enter particulars pay amount.");
      return;
    }
    setConfirmData({
      firstName: feeStudentData.firstName,
      collegeCode: searchParams.get("collegeCode") ?? undefined,
      academicYear:
        feeStudentData.academicYear ??
        searchParams.get("academicYear") ??
        undefined,
      courseCode: searchParams.get("courseCode") ?? undefined,
      groupCode: searchParams.get("groupCode") ?? undefined,
      courseYearName: searchParams.get("courseYearName") ?? undefined,
      section: searchParams.get("section") ?? undefined,
      courseYearNo: searchParams.get("courseYearNo") ?? undefined,
      receiptAmount: amount,
      feeParticularwisePayments: lines,
    });
    setConfirmOpen(true);
  }

  async function confirmPay() {
    if (!feeStudentData || !receiptDt || financialYears.length === 0) return;
    const fyId = financialYears[0].financialYearId;
    const payerTypeId = (lookups?.payerTypes ?? []).find(
      (p) => String(p.generalDetailCode ?? "").toUpperCase() === "STD",
    )?.generalDetailId;

    let paymentForValue = paymentFor;
    if (fineReason.trim()) {
      paymentForValue = `${paymentForValue} - ${fineReason.trim()}`;
    }

    const employeeId =
      globalThis?.localStorage?.getItem("employeeId") ?? undefined;
    const payload: FeeReceiptPaymentPayload = {
      paymentFor: paymentForValue,
      fineReason: fineReason || undefined,
      receiptDt,
      amount,
      paymentTypeId: Number(paymentTypeId),
      paymentModeId: Number(paymentModeId),
      transactionNo: transactionNo || undefined,
      otherPaymentNumber: otherPaymentNumber || undefined,
      referenceNumber: referenceNumber || undefined,
      ddno: ddno || undefined,
      chequeNo: chequeNo || undefined,
      collegeId,
      academicYearId,
      studentId,
      financialYearId: fyId,
      isFeeRefund: false,
      receiptAmount: amount,
      feeStdDataId: Number(feeStudentData.feeStdDataId),
      revertbByEmployeeId: employeeId,
      feeParticularwisePayments: buildPaymentLines(),
      payerTypeId,
    };

    setSubmitting(true);
    try {
      await submitFeeReceipt(payload);
      toastSuccess("Fee payment saved successfully");
      setConfirmOpen(false);
      setConfirmData(null);
      await queryClient.invalidateQueries({ queryKey: ["FeesCollection"] });
      await refetchFee();
      goBack();
    } catch (e) {
      toastError(e, "Fee payment failed");
    } finally {
      setSubmitting(false);
    }
  }

  function goBack() {
    if (page === "hostel-fee") {
      router.push(
        "/accounts-and-fees/fees-collection/hostel-payment/hostel-fee-payment",
      );
      return;
    }
    if (page === "student-fee-collection") {
      const qs = new URLSearchParams();
      for (const key of [
        "collegeId",
        "academicYearId",
        "quotaId",
        "courseId",
        "courseGroupId",
        "courseYearId",
      ] as const) {
        const v = searchParams.get(key);
        if (v) qs.set(key, v);
      }
      const q = qs.toString();
      router.push(
        q
          ? `/accounts-and-fees/fees-collection/payment/student-fee-collection?${q}`
          : "/accounts-and-fees/fees-collection/payment/student-fee-collection",
      );
      return;
    }
    const qs = new URLSearchParams();
    if (studentId) qs.set("studentId", String(studentId));
    if (collegeId) qs.set("collegeId", String(collegeId));
    const roll =
      searchParams.get("rollNumber") ?? searchParams.get("hallTicketNo");
    if (roll) qs.set("rollNumber", roll);
    router.push(`/accounts-and-fees/fees-collection/payment/fee-payment?${qs}`);
  }

  async function handleAddParticular(payload: {
    feeCategoryId: number;
    feeParticularsId: number;
    amount: number;
    isActive: boolean;
  }) {
    if (!feeStudentData?.feeStdDataId) return;
    const exists = particulars.some(
      (p) =>
        Number(p.feeCategoryId) === payload.feeCategoryId &&
        Number(p.feeParticularsId) === payload.feeParticularsId,
    );
    if (exists) {
      toastInfo("Already particular exists with same category.");
      return;
    }
    setExtraSaving(true);
    try {
      await saveFeeStudentWiseParticulars([
        {
          ...payload,
          collegeId,
          studentId,
          feeStructureId: feeStudentData.feeStructureId ?? feeStructureId,
          feeStdDataId: feeStudentData.feeStdDataId,
        },
      ]);
      toastSuccess("Particular added successfully");
      setAddParticularOpen(false);
      await refreshFeeData(Number(feeStudentData.feeStdDataId));
    } catch (e) {
      toastError(e, "Failed to add particular");
    } finally {
      setExtraSaving(false);
    }
  }

  async function handleAddDiscount(payload: Record<string, unknown>) {
    if (!feeStudentData?.feeStdDataId) return;
    setExtraSaving(true);
    try {
      await saveFeeStudentWiseDiscount([
        {
          feeCategoryId: Number(payload.feeCategoryId),
          feeParticularsId: Number(payload.feeParticularsId ?? 0) || undefined,
          value: Number(payload.value),
          isActive: true,
          authComments: String(payload.authComments ?? ""),
          requestedEmployeeId: Number(payload.requestedEmployeeId),
          authorizedEmployeeId: Number(
            payload.authorizedEmployeeId ?? payload.requestedEmployeeId,
          ),
          collegeId,
          studentId,
          feeStructureId: Number(
            feeStudentData.feeStructureId ?? feeStructureId,
          ),
          feeStdDataId: Number(feeStudentData.feeStdDataId),
        },
      ]);
      toastSuccess("Discount added successfully");
      setAddDiscountOpen(false);
      await refreshFeeData(Number(feeStudentData.feeStdDataId));
    } catch (e) {
      toastError(e, "Failed to add discount");
    } finally {
      setExtraSaving(false);
    }
  }

  async function handleAddFine(payload: Record<string, unknown>) {
    if (!feeStudentData?.feeStdDataId) return;
    setExtraSaving(true);
    try {
      await saveFeeStudentWiseFines([
        {
          ...payload,
          collegeId,
          studentId,
          feeStructureId,
          feeStdDataId: feeStudentData.feeStdDataId,
        },
      ]);
      toastSuccess("Fine added successfully");
      setAddFineOpen(false);
      await refreshFeeData(Number(feeStudentData.feeStdDataId));
    } catch (e) {
      toastError(e, "Failed to add fine");
    } finally {
      setExtraSaving(false);
    }
  }

  async function handleAddRtf(payload: Record<string, unknown>) {
    if (!feeStudentData?.feeStdDataId) return;
    setExtraSaving(true);
    try {
      await saveFeeStudentWiseScholarship([
        {
          ...payload,
          collegeId,
          studentId,
          feeStructureId,
          feeStdDataId: feeStudentData.feeStdDataId,
        },
      ]);
      toastSuccess("RTF added successfully");
      setAddRtfOpen(false);
      await refreshFeeData(Number(feeStudentData.feeStdDataId));
    } catch (e) {
      toastError(e, "Failed to add RTF");
    } finally {
      setExtraSaving(false);
    }
  }

  async function handleMinFee(minFeePercent: number) {
    setExtraSaving(true);
    try {
      await updateMinFeePercent({ studentId, academicYearId, minFeePercent });
      toastSuccess("Min fee percent updated");
      setMinFeeOpen(false);
      await refreshFeeData();
    } catch (e) {
      toastError(e, "Failed to update min fee percent");
    } finally {
      setExtraSaving(false);
    }
  }

  async function confirmDeleteExtra() {
    if (!deleteTarget) return;
    setExtraSaving(true);
    try {
      if (deleteTarget.kind === "particular") {
        await deleteFeeStudentWiseParticular(deleteTarget.id);
      } else if (deleteTarget.kind === "discount") {
        await deleteFeeStudentWiseDiscount(deleteTarget.id);
      } else if (deleteTarget.kind === "fine") {
        await deleteFeeStudentWiseFine(deleteTarget.id);
      } else {
        await deleteFeeStudentWiseScholarship(deleteTarget.id);
      }
      toastSuccess("Deleted successfully");
      setDeleteTarget(null);
      await refreshFeeData(
        Number(feeStudentData?.feeStdDataId ?? 0) || undefined,
      );
    } catch (e) {
      toastError(e, "Delete failed");
    } finally {
      setExtraSaving(false);
    }
  }

  const balance = num(feeStudentData?.balanceAmount);
  const showPaymentForm = Boolean(feeStudentData) && balance > 0;
  const paymentForLabel = [
    searchParams.get("collegeCode"),
    searchParams.get("academicYear"),
    searchParams.get("courseCode"),
    searchParams.get("groupCode"),
    searchParams.get("courseYearName"),
  ]
    .filter(Boolean)
    .join(" / ");

  const receiptColumnDefs = useMemo<ColDef<Record<string, unknown>>[]>(
    () => [
      { headerName: "SI No.", valueGetter: rowIndexGetter, width: 70, flex: 0 },
      {
        headerName: "Receipt No.",
        minWidth: 110,
        valueGetter: (p) => String(p.data?.payment_receipts_no ?? "—"),
      },
      {
        headerName: "Payment Date",
        minWidth: 130,
        valueGetter: (p) =>
          formatReceiptDate(
            String(p.data?.receipt_date ?? p.data?.receiptDt ?? ""),
          ),
      },
      {
        headerName: "Payment Mode",
        minWidth: 110,
        valueGetter: (p) => String(p.data?.payment_mode ?? "—"),
      },
      {
        headerName: "Payment Type",
        minWidth: 110,
        valueGetter: (p) => String(p.data?.payment_type ?? "—"),
      },
      {
        headerName: "Merchant Ref No.",
        minWidth: 130,
        valueGetter: (p) => String(p.data?.transaction_no ?? ""),
      },
      {
        headerName: "Amount (₹)",
        width: 110,
        type: "rightAligned",
        valueGetter: (p) => String(p.data?.receipt_amount ?? 0),
      },
      {
        headerName: "Print",
        width: 80,
        flex: 0,
        cellRenderer: (p: ICellRendererParams<Record<string, unknown>>) => (
          <button
            type="button"
            className="inline-flex items-center justify-center text-[#e91e63] hover:text-[#c2185b]"
            title="Print Receipt"
            onClick={() => {
              if (!p.data) return;
              storeFeeReceiptPrint({ ...p.data, collegeId });
              router.push(FEE_RECEIPT_PRINT_PATH);
            }}
          >
            <Printer className="h-4 w-4" />
          </button>
        ),
      },
    ],
    [collegeId, router],
  );

  return (
    <PageContainer className="space-y-4">
      <div
        className="rounded-sm border bg-card p-3 shadow-sm"
        data-no-page-name
      >
        <h1 className="mb-3 text-base font-semibold">Fee Payment</h1>

        {loadingFee ? (
          <p className="text-sm text-muted-foreground">Loading fee details…</p>
        ) : feeStudentData ? (
          <FeeStudentProfileCard student={profileStudent} />
        ) : (
          <p className="text-sm text-muted-foreground">
            Student fee data not found.
          </p>
        )}
      </div>

      {feeStudentData ? (
        <div className="rounded-sm bg-[#c3d9ff] px-3 py-2 text-[14px] font-medium text-slate-900">
          Payment for <span className="text-blue-700">{paymentForLabel}</span>
        </div>
      ) : null}

      {showPaymentForm ? (
        <div className="space-y-3 rounded-sm border bg-card p-3 shadow-sm">
          {financialYears.length === 0 && !loadingFy ? (
            <p className="rounded-sm bg-red-50 px-3 py-2 text-sm font-medium text-red-600">
              Not found related financial year, please contact system admin.
            </p>
          ) : null}

          <div className="grid gap-2 md:grid-cols-3">
            <SummaryLine
              label="Total Amount to Pay (₹)"
              value={feeStudentData?.netAmount}
            />
            <SummaryLine
              label="Total Est. RTF Amount (₹)"
              value={feeStudentData?.scholarshipHoldAmount}
            />
            <SummaryLine
              label="Total Received RTF Amount (₹)"
              value={feeStudentData?.scholarshipAmount}
            />
            <SummaryLine
              label="Total Amount Paid (₹)"
              value={feeStudentData?.paidAmount}
            />
            <SummaryLine
              label="Total Due Amount (₹)"
              value={feeStudentData?.balanceAmount}
              valueClassName="text-[#ff7d0d]"
            />
            {financialYears.length > 0 ? (
              <div className="flex items-center gap-2 text-sm">
                <span className="whitespace-nowrap">Payment Amount (₹) :</span>
                <Input
                  type="number"
                  min={0}
                  className="h-9 max-w-[140px] rounded-sm text-base font-bold"
                  value={Number.isFinite(amount) ? amount : 0}
                  onChange={(e) => onPaymentAmountChange(e.target.value)}
                />
              </div>
            ) : null}
          </div>

          {financialYears.length > 0 ? (
            <>
              <div className="grid gap-3 md:grid-cols-4">
                <Select
                  label="Pay Mode"
                  required
                  value={paymentModeId}
                  onChange={setPaymentModeId}
                  options={paymentModeOptions}
                  isLoading={loadingLookups}
                  searchable={false}
                />
                <Select
                  label="Payment Type"
                  required
                  value={paymentTypeId}
                  onChange={setPaymentTypeId}
                  options={paymentTypeOptions}
                  isLoading={loadingLookups}
                  searchable={false}
                />
                {modeField === "reference" ? (
                  <Field label="Reference Number">
                    <Input
                      className="rounded-sm"
                      value={referenceNumber}
                      onChange={(e) => setReferenceNumber(e.target.value)}
                    />
                  </Field>
                ) : null}
                {modeField === "cheque" ? (
                  <Field label="Cheque Number">
                    <Input
                      className="rounded-sm"
                      value={chequeNo}
                      onChange={(e) => setChequeNo(e.target.value)}
                    />
                  </Field>
                ) : null}
                {modeField === "dd" ? (
                  <Field label="DD Number">
                    <Input
                      className="rounded-sm"
                      value={ddno}
                      onChange={(e) => setDdno(e.target.value)}
                    />
                  </Field>
                ) : null}
                {modeField === "other" ? (
                  <Field label="Other Payment Number">
                    <Input
                      className="rounded-sm"
                      value={otherPaymentNumber}
                      onChange={(e) => setOtherPaymentNumber(e.target.value)}
                    />
                  </Field>
                ) : null}
                {modeField === "transaction" ? (
                  <Field label="Transaction Number">
                    <Input
                      className="rounded-sm"
                      value={transactionNo}
                      onChange={(e) => setTransactionNo(e.target.value)}
                    />
                  </Field>
                ) : null}
              </div>

              <div className="grid gap-3 md:grid-cols-4">
                <DatePicker
                  label="Payment Date"
                  required
                  value={receiptDt}
                  onChange={setReceiptDt}
                  displayFormat="dd/MM/yyyy"
                  clearable={false}
                />
                <Field label="Payment Notes">
                  <Input
                    className="rounded-sm"
                    value={paymentFor}
                    onChange={(e) => setPaymentFor(e.target.value)}
                  />
                </Field>
                <Field label="LateFee Reason">
                  <Input
                    className="rounded-sm"
                    value={fineReason}
                    onChange={(e) => setFineReason(e.target.value)}
                  />
                </Field>
                <div className="flex items-end gap-2">
                  <Button
                    type="button"
                    className="h-9 rounded-sm"
                    disabled={!canPay}
                    onClick={openPayConfirm}
                  >
                    Pay fees
                  </Button>
                </div>
              </div>
            </>
          ) : null}

          <p className="text-sm text-red-600">
            Note: The above fees particulars may be correlated in the fees
            counter A Block for any variation.
          </p>
        </div>
      ) : null}

      {feeStudentData ? (
        <div className="overflow-x-auto rounded-sm border bg-card shadow-sm">
          <table className="w-full min-w-[900px] border-collapse text-[13px]">
            <thead className="bg-muted/50">
              <tr>
                <th className="border-b px-2 py-2 text-left font-semibold">
                  SI No
                </th>
                <th className="border-b px-2 py-2 text-left font-semibold">
                  Particulars
                </th>
                <th className="border-b px-2 py-2 text-right font-semibold">
                  Gross Amt (₹)
                </th>
                <th className="border-b px-2 py-2 text-right font-semibold">
                  Dis Amt (₹)
                </th>
                <th className="border-b px-2 py-2 text-right font-semibold">
                  RTF (₹)
                </th>
                <th className="border-b px-2 py-2 text-right font-semibold">
                  LateFee (₹)
                </th>
                <th className="border-b px-2 py-2 text-right font-semibold">
                  Paid Amt (₹)
                </th>
                <th className="border-b px-2 py-2 text-right font-semibold">
                  Bal Amt (₹)
                </th>
                <th className="border-b px-2 py-2 text-right font-semibold">
                  Pay Amt (₹)
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-slate-100">
                <td />
                <td className="px-2 py-1.5 font-bold">Year-wise</td>
                <td
                  colSpan={7}
                  className="px-2 py-1.5 text-right text-[16px] font-medium text-red-600"
                >
                  * Enter particulars pay amount.
                </td>
              </tr>
              {yearWiseRows.map((p, i) => (
                <ParticularRow
                  key={`s-${p.feeCategoryId}-${p.feeParticularsId}-${i}`}
                  index={i}
                  row={p}
                  payDisabled={amount <= 0}
                  onPayChange={(v) => onParticularPayChange(i, v, "structure")}
                />
              ))}

              <tr className="bg-slate-100">
                <td />
                <td className="px-2 py-1.5 font-bold" colSpan={5}>
                  {stdwiseRows.length > 0 ? "Student-wise" : null}
                </td>
                <td
                  colSpan={stdwiseRows.length > 0 ? 3 : 8}
                  className="px-2 py-1.5 text-right"
                >
                  <ActionLink
                    label="+ Add Particular"
                    onClick={() => setAddParticularOpen(true)}
                  />
                </td>
              </tr>
              {stdwiseRows.map((p, i) => (
                <ParticularRow
                  key={`w-${p.feeCategoryId}-${p.feeParticularsId}-${i}`}
                  index={i}
                  row={p}
                  payDisabled={amount <= 0}
                  onPayChange={(v) => onParticularPayChange(i, v, "stdwise")}
                  onDelete={
                    num(p.balanceAmount) > 0 &&
                    num(p.paidAmount) === 0 &&
                    !String(p.categoryName ?? "")
                      .toLowerCase()
                      .includes("hostel") &&
                    !String(p.categoryName ?? "")
                      .toLowerCase()
                      .includes("transport")
                      ? () => {
                          const id = Number(
                            (
                              p as ParticularPayRow & {
                                feeStdParticularId?: number;
                              }
                            ).feeStdParticularId ??
                              stdWiseParticulars.find(
                                (x) =>
                                  Number(x.feeCategoryId) ===
                                    Number(p.feeCategoryId) &&
                                  Number(x.feeParticularsId) ===
                                    Number(p.feeParticularsId),
                              )?.feeStdParticularId ??
                              0,
                          );
                          if (id) setDeleteTarget({ kind: "particular", id });
                        }
                      : undefined
                  }
                />
              ))}

              {amountFlag ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-2 py-2 text-right font-medium text-red-600"
                  >
                    * To pay the fees, equate total particular amount to zero.
                  </td>
                  <td className="px-2 py-2 text-right">
                    <Input
                      type="number"
                      disabled
                      className="ml-auto h-8 w-24 text-right font-medium text-blue-700"
                      value={equalAmount}
                    />
                  </td>
                </tr>
              ) : null}

              <ExtraSectionHeader
                title={discounts.length > 0 ? "Discounts" : undefined}
                actionLabel="+ Add Discount"
                onAction={() => setAddDiscountOpen(true)}
              />
              {discounts.map((d, i) => (
                <ExtraValueRow
                  key={`d-${d.feeStdDiscountId ?? i}`}
                  index={i}
                  label={[d.categoryName, d.particularsName]
                    .filter(Boolean)
                    .join(" - ")}
                  value={d.value}
                  onDelete={() =>
                    d.feeStdDiscountId
                      ? setDeleteTarget({
                          kind: "discount",
                          id: Number(d.feeStdDiscountId),
                        })
                      : undefined
                  }
                />
              ))}

              <ExtraSectionHeader
                title={fines.length > 0 ? "Fines" : undefined}
                actionLabel="+ Add Fine"
                onAction={() => setAddFineOpen(true)}
              />
              {fines.map((f, i) => (
                <ExtraValueRow
                  key={`f-${f.feeStdFineId ?? i}`}
                  index={i}
                  label={[f.categoryName, f.particularsName]
                    .filter(Boolean)
                    .join(" - ")}
                  value={f.value}
                  onDelete={() =>
                    f.feeStdFineId
                      ? setDeleteTarget({
                          kind: "fine",
                          id: Number(f.feeStdFineId),
                        })
                      : undefined
                  }
                />
              ))}

              <ExtraSectionHeader
                title={scholarships.length > 0 ? "RTF" : undefined}
                actionLabel="+ Add RTF"
                onAction={() => setAddRtfOpen(true)}
                titleColSpan={6}
              />
              {scholarships.map((s, i) => (
                <ExtraValueRow
                  key={`r-${s.feeStdScholorshipId ?? i}`}
                  index={i}
                  label={[s.categoryName, s.particularsName]
                    .filter(Boolean)
                    .join(" - ")}
                  value={s.holdAmount}
                  onDelete={() =>
                    s.feeStdScholorshipId
                      ? setDeleteTarget({
                          kind: "rtf",
                          id: Number(s.feeStdScholorshipId),
                        })
                      : undefined
                  }
                />
              ))}

              <tr className="bg-slate-100">
                <td />
                <td className="px-2 py-1.5 font-bold" colSpan={8}>
                  Min Fee Payment %
                </td>
              </tr>
              <tr className="border-t">
                <td className="px-2 py-1.5">1</td>
                <td className="px-2 py-1.5" colSpan={7}>
                  Min Fee Payment %
                </td>
                <td className="relative px-2 py-1.5 text-right">
                  <span className="mr-2">
                    {feeStudentData.minFeePercent ?? 0}
                  </span>
                  <button
                    type="button"
                    className="inline-flex text-blue-600 hover:text-blue-800"
                    title="Update minFeePercent"
                    onClick={() => setMinFeeOpen(true)}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </td>
              </tr>

              <SummaryTableRows data={feeStudentData} />
            </tbody>
          </table>
        </div>
      ) : null}

      {receipts.length > 0 ? (
        <DataTable
          title="Fee Receipts"
          bordered
          columnDefs={receiptColumnDefs}
          rowData={receipts as Record<string, unknown>[]}
          height="auto"
          pagination
          toolbar={{
            search: true,
            searchPlaceholder: "Search receipts…",
            exportExcel: true,
            exportPdf: true,
          }}
        />
      ) : null}

      <div className="flex justify-end">
        <Button
          type="button"
          className="h-9 min-w-[88px] bg-[#1565c0] px-5 text-[13px] font-medium text-white hover:bg-[#0d47a1]"
          onClick={goBack}
        >
          Back
        </Button>
      </div>

      <PayFeesConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void confirmPay()}
        data={confirmData}
        confirming={submitting}
      />

      <AddParticularModal
        open={addParticularOpen}
        onClose={() => setAddParticularOpen(false)}
        collegeId={collegeId}
        onSave={(p) => void handleAddParticular(p)}
        saving={extraSaving}
      />
      <AddAmountOnParticularModal
        open={addDiscountOpen}
        onClose={() => setAddDiscountOpen(false)}
        title="Add Institutional Scholarship"
        amountLabel="Discount Amount"
        particulars={yearWiseRows.length ? yearWiseRows : particulars}
        showEmployeeReason
        onSave={(p) => void handleAddDiscount(p)}
        saving={extraSaving}
      />
      <AddAmountOnParticularModal
        open={addFineOpen}
        onClose={() => setAddFineOpen(false)}
        title="Add Fine"
        amountLabel="Fine Amount"
        particulars={yearWiseRows.length ? yearWiseRows : particulars}
        onSave={(p) => void handleAddFine(p)}
        saving={extraSaving}
      />
      <AddAmountOnParticularModal
        open={addRtfOpen}
        onClose={() => setAddRtfOpen(false)}
        title="Add RTF"
        amountLabel="RTF Hold Amount"
        amountKey="holdAmount"
        particulars={yearWiseRows.length ? yearWiseRows : particulars}
        onSave={(p) => void handleAddRtf(p)}
        saving={extraSaving}
      />
      <MinFeePercentModal
        open={minFeeOpen}
        onClose={() => setMinFeeOpen(false)}
        initialValue={Number(feeStudentData?.minFeePercent ?? 0)}
        onSave={(v) => void handleMinFee(v)}
        saving={extraSaving}
      />
      <ConfirmDialog
        open={deleteTarget != null}
        title="Delete?"
        description="Are you sure you want to delete this record?"
        confirmLabel="Delete"
        onConfirm={() => void confirmDeleteExtra()}
        onCancel={() => setDeleteTarget(null)}
        isLoading={extraSaving}
      />
    </PageContainer>
  );
}

function SummaryLine({
  label,
  value,
  valueClassName = "text-blue-700",
}: {
  label: string;
  value?: unknown;
  valueClassName?: string;
}) {
  return (
    <p className="text-[15px]">
      {label} :{" "}
      <span className={`font-bold ${valueClassName}`}>{num(value)}</span>
    </p>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function ExtraSectionHeader({
  title,
  actionLabel,
  onAction,
  titleColSpan = 5,
}: {
  title?: string;
  actionLabel: string;
  onAction: () => void;
  titleColSpan?: number;
}) {
  return (
    <tr className="bg-slate-100">
      <td />
      {title ? (
        <td className="px-2 py-1.5 font-bold" colSpan={titleColSpan}>
          {title}
        </td>
      ) : null}
      <td
        colSpan={title ? 9 - 1 - titleColSpan : 8}
        className="px-2 py-1.5 text-right"
      >
        <ActionLink label={actionLabel} onClick={onAction} />
      </td>
    </tr>
  );
}

function ExtraValueRow({
  index,
  label,
  value,
  onDelete,
}: {
  index: number;
  label: string;
  value?: unknown;
  onDelete?: () => void;
}) {
  return (
    <tr className="border-t">
      <td className="px-2 py-1.5">{index + 1}</td>
      <td className="px-2 py-1.5" colSpan={7}>
        {label}
      </td>
      <td className="relative px-2 py-1.5 text-right">
        <span className="mr-2">{num(value)}</span>
        {onDelete ? (
          <button
            type="button"
            className="inline-flex text-red-600 hover:text-red-700"
            title="Delete"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        ) : null}
      </td>
    </tr>
  );
}

function ParticularRow({
  index,
  row,
  payDisabled,
  onPayChange,
  onDelete,
}: {
  index: number;
  row: ParticularPayRow;
  payDisabled: boolean;
  onPayChange: (value: string) => void;
  onDelete?: () => void;
}) {
  const bal = num(row.balanceAmount);
  return (
    <tr className="border-t">
      <td className="px-2 py-1.5">{index + 1}</td>
      <td className="px-2 py-1.5">
        {[row.categoryName, row.particularsName].filter(Boolean).join(" - ")}
      </td>
      <td className="px-2 py-1.5 text-right">{num(row.grossAmount)}</td>
      <td className="px-2 py-1.5 text-right">{num(row.discountAmount)}</td>
      <td className="px-2 py-1.5 text-right">{num(row.scholarshipAmount)}</td>
      <td className="px-2 py-1.5 text-right">{num(row.fineAmount)}</td>
      <td className="px-2 py-1.5 text-right">{num(row.paidAmount)}</td>
      <td className="px-2 py-1.5 text-right">{bal}</td>
      <td className="relative px-2 py-1.5 text-right">
        {bal > 0 ? (
          <div className="inline-flex items-center gap-1">
            <Input
              type="number"
              min={0}
              disabled={payDisabled}
              className="h-8 w-24 rounded-sm text-right"
              value={row.amount ?? 0}
              onChange={(e) => onPayChange(e.target.value)}
            />
            <span className="text-red-600">*</span>
            {onDelete ? (
              <button
                type="button"
                className="inline-flex text-red-600 hover:text-red-700"
                title="Delete particular"
                onClick={onDelete}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        ) : (
          <span className="font-medium text-emerald-600">Paid</span>
        )}
      </td>
    </tr>
  );
}

function SummaryTableRows({ data }: { data: FeeStudentData }) {
  return (
    <>
      <tr className="bg-slate-100">
        <td />
        <td className="px-2 py-1.5 font-bold text-blue-700" colSpan={8}>
          Summary
        </td>
      </tr>
      <tr className="border-t">
        <td className="px-2 py-1.5">1</td>
        <td className="px-2 py-1.5 font-bold" colSpan={7}>
          Total Fees
        </td>
        <td className="px-2 py-1.5 text-right font-bold">
          {num(data.grossAmount)}
        </td>
      </tr>
      <tr className="border-t">
        <td className="px-2 py-1.5">2</td>
        <td className="px-2 py-1.5 font-bold" colSpan={7}>
          Total Discount
        </td>
        <td className="px-2 py-1.5 text-right font-bold">
          {num(data.discountAmount)}
        </td>
      </tr>
      <tr className="border-t">
        <td className="px-2 py-1.5">3</td>
        <td className="px-2 py-1.5 font-bold" colSpan={7}>
          Total Fine
        </td>
        <td className="px-2 py-1.5 text-right font-bold">
          {num(data.fineAmount)}
        </td>
      </tr>
      <tr className="border-t">
        <td />
        <td className="px-2 py-1.5 text-right font-bold" colSpan={7}>
          Total net amount
        </td>
        <td className="px-2 py-1.5 text-right font-bold">
          {num(data.netAmount)}
        </td>
      </tr>
      <tr className="border-t">
        <td />
        <td className="px-2 py-1.5 text-right font-bold" colSpan={7}>
          Total amount paid
        </td>
        <td className="px-2 py-1.5 text-right font-bold">
          {num(data.paidAmount)}
        </td>
      </tr>
      <tr className="border-t">
        <td />
        <td className="px-2 py-1.5 text-right font-bold" colSpan={7}>
          Total due amount
        </td>
        <td className="px-2 py-1.5 text-right font-bold text-[#ff7d0d]">
          {num(data.balanceAmount)}
        </td>
      </tr>
    </>
  );
}
