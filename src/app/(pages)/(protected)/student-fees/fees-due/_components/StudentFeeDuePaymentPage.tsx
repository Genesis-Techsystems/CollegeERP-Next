"use client";

/**
 * Angular `student-fees/fees-due/fee-payment` → `FeeDuePaymentComponent`.
 * Student portal: ONLINE-only pay, Pay Details dialog, then stgOnlineFeereceipts
 * + initiatePayment. Staff PayFeesPage is not used here.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import { PageContainer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import {
  getSecuredValue,
  setSecuredValue,
  utcMidnightIso,
} from "@/common/generic-functions";
import { useSession } from "@/hooks/useSession";
import { QK } from "@/lib/query-keys";
import { toastError, toastInfo, toastSuccess } from "@/lib/toast";
import {
  getFeeStudentData,
  getFinancialYearForReceiptDate,
  getOnlineFeeLimit,
  getStudentOnlineFeePaymentLookups,
  initiateStudentCollegeFeePayment,
  listCollegePaymentSettings,
  listFeeStructureParticularsForPayment,
  listStudentFeeReceiptDetails,
  submitOnlineFeeReceipt,
} from "@/services";
import type {
  FeeReceiptPaymentPayload,
  FeeStudentData,
  FeeStudentParticularRow,
} from "@/types/fees-collection";
import {
  FEE_RECEIPT_PRINT_PATH,
  storeFeeReceiptPrint,
} from "@/app/(pages)/(protected)/accounts-and-fees/fees-collection/_lib/fee-receipt-print";
import {
  StudentPayDialog,
  type StudentPayDialogData,
} from "./StudentPayDialog";

const DEFAULT_STUDENT_PHOTO = "/assets/images/avatars/default_Student.png";

const YELLOW_BTN =
  "h-[36px] bg-[#f0c040] px-6 text-[13px] font-medium text-slate-900 hover:bg-[#e5b535]";

const FEES_DUE_PATH = "/student-fees/fees-due";

type ParticularPayRow = FeeStudentParticularRow & { amount?: number };

type ReceiptRow = {
  payment_receipts_no?: string;
  paymentReceiptsNo?: string;
  receipt_date?: string;
  receiptDate?: string;
  createdDt?: string;
  payment_mode?: string;
  paymentMode?: string;
  payment_type?: string;
  paymentType?: string;
  transaction_no?: string;
  transactionNo?: string;
  referenceNumber?: string;
  receipt_amount?: number | string;
  receiptAmount?: number | string;
  [key: string]: unknown;
};

function amt(v: unknown): string {
  if (v == null || v === "") return "0";
  const n = Number(v);
  return Number.isFinite(n) ? String(n) : String(v);
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function pick(
  row: Record<string, unknown> | null | undefined,
  ...keys: string[]
): string {
  if (!row) return "";
  for (const key of keys) {
    const v = row[key];
    if (v != null && String(v).trim() !== "") return String(v);
  }
  return "";
}

function isEmptyObject(obj: unknown): boolean {
  return !obj || Object.keys(obj as object).length === 0;
}

function formatReceiptDate(value?: string): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy}, ${hh}:${min}:${ss}`;
}

function studentPhotoUrl(path?: string): string {
  const raw = String(path ?? "").trim();
  if (!raw) return "";
  return raw.includes("?") ? raw : `${raw}?${Date.now()}`;
}

function cloneParticulars(
  feeData: FeeStudentData | null | undefined,
): ParticularPayRow[] {
  const list = feeData?.feeStudentDataParticulars;
  if (!Array.isArray(list)) return [];
  const feeStructureId = Number(feeData?.feeStructureId ?? 0) || undefined;
  return list.map((row) => ({
    ...row,
    feeStructureId: row.feeStructureId ?? feeStructureId,
    amount: 0,
  }));
}

/** Angular `genericFunctions.moment()` — presentDate (DD-MM-YYYY) or UTC midnight. */
function angularReceiptDt(): string {
  if (typeof window === "undefined") return utcMidnightIso();
  const present = String(window.localStorage.getItem("presentDate") ?? "").trim();
  const parts = present.split("-");
  if (parts.length === 3) {
    const [dd, mm, yyyy] = parts;
    const d = Number(dd);
    const m = Number(mm);
    const y = Number(yyyy);
    if (d > 0 && m > 0 && y > 0) {
      return `${yyyy}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}T00:00:00Z`;
    }
  }
  return utcMidnightIso();
}

/** Angular fee-due-payment `payFeeDetails` body for `stgOnlineFeereceipts`. */
type StudentOnlinePayPayload = FeeReceiptPaymentPayload & {
  tranCatDetailsId?: number;
  orderId?: null;
  courseYearNo?: string;
  stgOnlineFeeParticularwisePaymentDTOS?: FeeStudentParticularRow[];
};

export function StudentFeeDuePaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useSession();

  const collegeId = Number(searchParams.get("collegeId") ?? 0);
  const academicYearId = Number(searchParams.get("academicYearId") ?? 0);
  const studentId = Number(searchParams.get("studentId") ?? 0);
  const feeStructureId = Number(searchParams.get("feeStructureId") ?? 0);
  const courseYearNo = searchParams.get("courseYearNo") ?? "";
  const courseCode = searchParams.get("courseCode") ?? "";

  const [amount, setAmount] = useState("0");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogData, setDialogData] = useState<StudentPayDialogData | null>(
    null,
  );
  const [payPayload, setPayPayload] = useState<StudentOnlinePayPayload | null>(
    null,
  );
  const [submitting, setSubmitting] = useState(false);
  const [photoError, setPhotoError] = useState(false);
  const statusToastShown = useRef(false);

  const receiptDate = useMemo(() => new Date(), []);

  const { data: feeData, isLoading: loadingFee } = useQuery({
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

  const { data: financialYears = [], isLoading: loadingFy } = useQuery({
    queryKey: QK.feesCollection.payFinancialYear(
      collegeId,
      receiptDate.toDateString(),
    ),
    queryFn: () => getFinancialYearForReceiptDate(collegeId, receiptDate),
    enabled: collegeId > 0,
  });

  const { data: lookups } = useQuery({
    queryKey: [...QK.feesCollection.payLookups(), "student-online"] as const,
    queryFn: getStudentOnlineFeePaymentLookups,
  });

  const { data: feeLimit = 0 } = useQuery({
    queryKey: QK.feesCollection.studentFeeDuePayment({
      collegeId,
      kind: "feeLimit",
    }),
    queryFn: () => getOnlineFeeLimit(collegeId),
    enabled: collegeId > 0,
  });

  const { data: paymentSettings = [] } = useQuery({
    queryKey: QK.feesCollection.studentFeeDuePayment({
      collegeId,
      kind: "paymentSettings",
    }),
    queryFn: () => listCollegePaymentSettings(collegeId),
    enabled: collegeId > 0,
  });

  const { data: structureParticulars = [] } = useQuery({
    queryKey: QK.feesCollection.payStructureParticulars(feeStructureId),
    queryFn: () => listFeeStructureParticularsForPayment(feeStructureId),
    enabled: feeStructureId > 0,
  });

  const {
    data: receipts = [],
    isLoading: loadingReceipts,
    refetch: refetchReceipts,
  } = useQuery({
    queryKey: [
      ...QK.feesCollection.receipts(studentId, collegeId, academicYearId),
      "fee-due-payment",
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
    setAmount("0");
    setPhotoError(false);
  }, [feeData]);

  useEffect(() => {
    if (statusToastShown.current) return;
    const orderId = searchParams.get("orderId");
    const orderStatus = searchParams.get("orderStatus");
    const paymentStatus = searchParams.get("paymentStatus") ?? "";
    if (!orderId) return;
    statusToastShown.current = true;
    if (orderStatus === "SUC") {
      toastSuccess(paymentStatus || "Payment successful");
      void refetchReceipts();
    } else if (orderStatus === "REJ") {
      toastError(paymentStatus || "Payment failed");
    }
  }, [searchParams, refetchReceipts]);

  const courseLine = [
    searchParams.get("collegeCode") ?? "",
    feeData?.studentAcademicYear ??
      feeData?.academicYear ??
      searchParams.get("academicYear") ??
      "",
    searchParams.get("courseCode") ?? "",
    feeData?.studentGroupCode ?? searchParams.get("groupCode") ?? "",
    feeData?.studentCourseYearName ?? searchParams.get("courseYearName") ?? "",
    `Section ${feeData?.studentSection ?? searchParams.get("section") ?? ""}`,
  ].join(" / ");

  const studentStatus =
    pick(
      feeData as Record<string, unknown> | undefined,
      "studentStatus",
      "studentStatusDisplayName",
    ) ||
    searchParams.get("studentStatusDisplayName") ||
    "";

  const photoUrl = studentPhotoUrl(feeData?.studentPhotoPath);

  const allParticulars = useMemo<FeeStudentParticularRow[]>(() => {
    const list = feeData?.feeStudentDataParticulars;
    return Array.isArray(list) ? list : [];
  }, [feeData]);

  const yearWiseRows = useMemo(() => {
    const fromStructure = allParticulars.filter((p) => p.isFromStructure);
    if (fromStructure.length > 0) return fromStructure;
    const withoutStdwise = allParticulars.filter((p) => !p.isFromStdwise);
    return withoutStdwise.length > 0 ? withoutStdwise : allParticulars;
  }, [allParticulars]);

  const studentWiseRows = useMemo(() => {
    const wiseLen = Array.isArray(feeData?.feeStudentWiseParticulars)
      ? feeData.feeStudentWiseParticulars.length
      : 0;
    if (wiseLen === 0 && !allParticulars.some((p) => p.isFromStdwise)) {
      return [];
    }
    return allParticulars.filter((p) => p.isFromStdwise);
  }, [allParticulars, feeData?.feeStudentWiseParticulars]);

  const particularTableRows = useMemo(() => {
    const rows: Array<
      | { kind: "group"; label: string }
      | { kind: "data"; siNo: number; particular: FeeStudentParticularRow }
    > = [];
    rows.push({ kind: "group", label: "Year-wise" });
    let si = 0;
    for (const particular of yearWiseRows) {
      si += 1;
      rows.push({ kind: "data", siNo: si, particular });
    }
    if (studentWiseRows.length > 0) {
      rows.push({ kind: "group", label: "Student-wise" });
      for (const particular of studentWiseRows) {
        si += 1;
        rows.push({ kind: "data", siNo: si, particular });
      }
    }
    return rows;
  }, [yearWiseRows, studentWiseRows]);

  const receiptRows = receipts as ReceiptRow[];
  const balanceAmount = num(feeData?.balanceAmount);
  const showPaySection = Boolean(feeData) && balanceAmount > 0;
  const hasFinancialYear = financialYears.length > 0;

  const splitParticulars = useCallback(
    (rawAmt: number): ParticularPayRow[] | null => {
      const rows = cloneParticulars(feeData);
      if (rawAmt > balanceAmount) {
        toastInfo("Pay amount should be less than balance amount.");
        setAmount("0");
        return null;
      }
      let remaining = rawAmt;
      return rows.map((row) => {
        const bal = num(row.balanceAmount);
        if (remaining >= bal) {
          remaining -= bal;
          return { ...row, amount: bal };
        }
        if (remaining > 0) {
          const take = remaining;
          remaining = 0;
          return { ...row, amount: take };
        }
        return { ...row, amount: 0 };
      });
    },
    [feeData, balanceAmount],
  );

  function applyAmountSplit(rawAmt: number) {
    splitParticulars(rawAmt);
  }

  /** Angular `checkAmount` (active branch — isLessThan path is commented out). */
  function checkAmount(amtValue: number): boolean {
    if (amtValue <= balanceAmount) {
      if (amtValue >= num(feeLimit) || amtValue === balanceAmount) {
        return true;
      }
      toastInfo(`Pay amount should be greater than or equal to ${feeLimit}.`);
      setAmount(String(feeLimit));
      applyAmountSplit(num(feeLimit));
      return false;
    }
    toastInfo("Pay amount should be lessthan or equal to balance amount.");
    setAmount(String(balanceAmount));
    applyAmountSplit(balanceAmount);
    return false;
  }

  function goBack() {
    const qs = new URLSearchParams();
    for (const key of [
      "collegeId",
      "academicYearId",
      "quotaId",
      "courseId",
      "courseGroupId",
      "courseYearId",
    ]) {
      const v = searchParams.get(key);
      if (v) qs.set(key, v);
    }
    const suffix = qs.toString();
    router.push(suffix ? `${FEES_DUE_PATH}?${suffix}` : FEES_DUE_PATH);
  }

  function payFee() {
    if (paymentSettings.length === 0) {
      toastInfo("Payment settings are missing, please contact admin.");
      return;
    }
    const amtValue = num(amount);
    if (!(amtValue > 0)) {
      toastInfo("Pay amount should be greater than zero.");
      return;
    }
    if (!checkAmount(amtValue)) return;
    if (!feeData || !hasFinancialYear) return;

    const splitRows = splitParticulars(amtValue);
    if (!splitRows) return;

    const paymentModeId = Number(
      lookups?.paymentModes[0]?.generalDetailId ?? 0,
    );
    const paymentTypeId = Number(
      lookups?.paymentTypes[0]?.generalDetailId ?? 0,
    );
    if (!paymentModeId || !paymentTypeId) {
      toastInfo("Online payment mode/type is missing, please contact admin.");
      return;
    }
    const payerTypeId = lookups?.payerTypes.find(
      (p) => String(p.generalDetailCode ?? "").toUpperCase() === "STD",
    )?.generalDetailId;
    const fyId = financialYears[0].financialYearId;
    // Angular: localStorage.getItem('employeeId') (often null for student login)
    const employeeId =
      user?.employeeId ??
      (typeof window !== "undefined"
        ? window.localStorage.getItem("employeeId")
        : null);

    const lines: ParticularPayRow[] = [];
    for (const row of splitRows) {
      if (num(row.balanceAmount) > 0 && num(row.amount) > 0) {
        const matched = structureParticulars.find(
          (x) =>
            Number(x.feeStructureId) === Number(row.feeStructureId) &&
            Number(x.feeCategoryId) === Number(row.feeCategoryId) &&
            Number(x.feeParticularsId) === Number(row.feeParticularsId),
        );
        lines.push({
          ...row,
          payerName: feeData.firstName,
          financialYearId: fyId,
          feeStructureParticularId:
            Number(
              matched?.feeStructureParticularId ?? row.feeStructureParticularId,
            ) || row.feeStructureParticularId,
        });
      }
    }
    if (lines.length === 0) {
      toastInfo("No payable fee particulars found for this amount.");
      return;
    }

    const payload: StudentOnlinePayPayload = {
      paymentFor: "",
      fineReason: "",
      receiptDt: angularReceiptDt(),
      amount: amtValue,
      paymentTypeId,
      paymentModeId,
      transactionNo: "",
      otherPaymentNumber: "",
      referenceNumber: "",
      ddno: "",
      chequeNo: "",
      collegeId,
      academicYearId,
      studentId,
      financialYearId: fyId,
      isFeeRefund: false,
      receiptAmount: amtValue,
      feeStdDataId: Number(feeData.feeStdDataId ?? 0),
      revertbByEmployeeId: employeeId ?? undefined,
      feeParticularwisePayments: lines,
      stgOnlineFeeParticularwisePaymentDTOS: lines,
      tranCatDetailsId: 685,
      orderId: null,
      payerTypeId,
      payerName: feeData.firstName,
      firstName: feeData.firstName,
      collegeCode: searchParams.get("collegeCode") ?? undefined,
      academicYear: feeData.academicYear,
      courseCode: courseCode || undefined,
      groupCode: searchParams.get("groupCode") ?? undefined,
      courseYearName: searchParams.get("courseYearName") ?? undefined,
      section: searchParams.get("section") ?? undefined,
      courseYearNo: courseYearNo || undefined,
    };

    setPayPayload(payload);
    setDialogData({
      firstName: feeData.firstName,
      collegeCode: searchParams.get("collegeCode") ?? undefined,
      academicYear: feeData.academicYear,
      courseCode: courseCode || undefined,
      groupCode: searchParams.get("groupCode") ?? undefined,
      courseYearName: searchParams.get("courseYearName") ?? undefined,
      section: searchParams.get("section") ?? undefined,
      courseYearNo: courseYearNo || undefined,
      feeParticularwisePayments: lines,
    });
    setDialogOpen(true);
  }

  async function savePayDetails() {
    if (!payPayload) return;
    setSubmitting(true);
    try {
      // Angular savePayDetails → POST stgOnlineFeereceipts then initiatePayment.
      const result = await submitOnlineFeeReceipt(payPayload);
      const orderId = result.orderId;
      if (orderId == null || orderId === "") {
        throw new Error(
          "Unable to process your request at this time, please try again!",
        );
      }
      const isPhd = courseCode.toUpperCase() === "PHD";
      const gatewayCollegeId = isPhd
        ? 0
        : Number(result.collegeId ?? collegeId);
      const feeType = isPhd ? "PHD" : "COLLEGEFEE";
      if (!getSecuredValue("paymentRedirectUrl")) {
        const req: Record<string, string> = {};
        searchParams.forEach((value, key) => {
          req[key] = value;
        });
        setSecuredValue(
          "paymentRedirectUrl",
          "/student-fees/fees-due/fee-payment",
        );
        setSecuredValue("payFeeDueDetails", req);
      }
      setDialogOpen(false);
      // This page only: paymentGateway/initiatePayment (not BillDesk/PayPhi).
      await initiateStudentCollegeFeePayment(
        num(payPayload.receiptAmount),
        orderId,
        gatewayCollegeId,
        feeType,
      );
    } catch (e) {
      toastError(e, "Failed to initiate payment");
    } finally {
      setSubmitting(false);
    }
  }

  const hasParams = !isEmptyObject(
    Object.fromEntries(
      [...searchParams.entries()].filter(([, v]) => v != null && v !== ""),
    ),
  );
  const showStudent = hasParams && Boolean(feeData);
  const isLateral = Boolean(
    (feeData as Record<string, unknown> | undefined)?.isLateral ??
    searchParams.get("isLateral") === "true",
  );
  const rollNumber =
    searchParams.get("rollNumber") || searchParams.get("hallTicketNo") || "";

  function printReceipt(row: ReceiptRow) {
    storeFeeReceiptPrint({
      ...row,
      collegeId,
      returnPath: `/student-fees/fees-due/fee-payment?${searchParams.toString()}`,
    });
    router.push(FEE_RECEIPT_PRINT_PATH);
  }

  return (
    <PageContainer className="space-y-4">
      <div className="app-card overflow-hidden" data-page-first-card="">
        <div className="table-context-header px-5 pt-2">
          <span
            className="material-icons table-context-header__icon"
            aria-hidden
          >
            computer
          </span>
          <strong className="table-context-header__title">Fee Payment</strong>
        </div>

        <div className="space-y-3 px-6 pb-5 pt-3">
          {loadingFee ? (
            <p className="text-sm text-muted-foreground">Loading fee data…</p>
          ) : null}

          {showStudent ? (
            <div className="rounded-[3px] border-4 border-[#c3d9ff] bg-white px-3 py-2">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
                <div className="flex w-full shrink-0 justify-center sm:w-[15%]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={
                      photoUrl && !photoError ? photoUrl : DEFAULT_STUDENT_PHOTO
                    }
                    alt=""
                    className="h-auto w-[80%] bg-[#c3d9ff] p-1.5 object-cover"
                    onError={() => setPhotoError(true)}
                  />
                </div>
                <div className="min-w-0 flex-1 space-y-0.5 py-2 text-[15px] font-medium">
                  <p>
                    <span>Name : </span>
                    <span className="font-semibold text-blue-700">
                      {feeData?.firstName} ({isLateral ? "LATERAL" : "REGULAR"})
                    </span>
                  </p>
                  <p className="text-[#8c8c8c]">
                    <span className="text-[rgba(0,0,0,0.87)]">Roll no : </span>
                    {rollNumber}
                  </p>
                  <p className="text-[#8c8c8c]">
                    <span className="text-[rgba(0,0,0,0.87)]">Course : </span>
                    {courseLine}
                  </p>
                  <p className="text-[#8c8c8c]">
                    <span className="text-[rgba(0,0,0,0.87)]">Mobile : </span>
                    {feeData?.mobile}
                  </p>
                </div>
                <div className="space-y-1 py-2 text-[15px] sm:min-w-[220px]">
                  <p>
                    <span>Quota : </span>
                    {searchParams.get("quotaDisplayName") ? (
                      <span className="text-blue-600">
                        {searchParams.get("quotaDisplayName")}
                      </span>
                    ) : null}
                  </p>
                  <p>
                    <span>Student Status : </span>
                    {studentStatus}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {showStudent ? (
            <div className="rounded-[3px] border-4 border-[#c3d9ff] bg-[#c3d9ff] px-3 py-1">
              <p className="text-[17px] font-medium text-black">
                Payment for{" "}
                <span className="text-blue-700">{courseYearNo} Year fees</span>
              </p>
            </div>
          ) : null}

          {showPaySection ? (
            <div className="rounded-[3px] border-[10px] border-[#c3d9ff] bg-[#f1f6ff] p-2">
              {!hasFinancialYear && !loadingFy ? (
                <p className="px-2 text-sm font-medium text-red-600">
                  Not found related financial year, please contact system admin.
                </p>
              ) : null}
              <div className="grid items-center gap-3 p-2 sm:grid-cols-2 lg:grid-cols-4">
                <p className="text-[16px] font-medium">
                  Total amount to pay (₹) :{" "}
                  <span className="font-bold text-[#0d29ff]">
                    {amt(feeData?.netAmount)}
                  </span>
                </p>
                <p className="text-[16px] font-medium">
                  Total amount paid (₹) :{" "}
                  <span className="font-bold text-[#0d29ff]">
                    {amt(feeData?.paidAmount)}
                  </span>
                </p>
                <p className="text-[16px] font-medium">
                  Total due amount (₹) :{" "}
                  <span className="font-bold text-[#ff7d0d]">
                    {amt(feeData?.balanceAmount)}
                  </span>
                </p>
                <p className="details-off flex flex-wrap items-center gap-2 text-[16px] font-medium">
                  <span>Payment Amount (₹) :</span>
                  <input
                    type="number"
                    min={0}
                    autoComplete="off"
                    name="amount"
                    className="student-fee-pay-amt"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    onBlur={() => applyAmountSplit(num(amount))}
                  />
                </p>
              </div>
            </div>
          ) : null}

          {showStudent ? (
            <div className="overflow-x-auto rounded-[3px] border border-[#b8d0f0] bg-white">
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr className="bg-[#c3d9ff]">
                    <th className="w-[5%] border border-[#b8d0f0] px-3 py-2 text-left font-semibold">
                      Sl No
                    </th>
                    <th className="w-[35%] border border-[#b8d0f0] px-3 py-2 text-left font-semibold">
                      Particulars
                    </th>
                    <th className="w-[10%] border border-[#b8d0f0] px-3 py-2 text-right font-semibold">
                      Gross Amt (₹)
                    </th>
                    <th className="w-[10%] border border-[#b8d0f0] px-3 py-2 text-right font-semibold">
                      Dis Amt (₹)
                    </th>
                    <th className="w-[10%] border border-[#b8d0f0] px-3 py-2 text-right font-semibold">
                      LateFee (₹)
                    </th>
                    <th className="w-[10%] border border-[#b8d0f0] px-3 py-2 text-right font-semibold">
                      Paid Amt (₹)
                    </th>
                    <th className="w-[10%] border border-[#b8d0f0] px-3 py-2 text-right font-semibold">
                      Bal Amt (₹)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {particularTableRows.map((row, idx) => {
                    if (row.kind === "group") {
                      return (
                        <tr
                          key={`g-${row.label}-${idx}`}
                          className="bg-[#c3d9ff]"
                        >
                          <td className="border border-[#b8d0f0] px-3 py-2" />
                          <td
                            className="border border-[#b8d0f0] px-3 py-2 font-bold"
                            colSpan={6}
                          >
                            {row.label}
                          </td>
                        </tr>
                      );
                    }
                    const { particular, siNo } = row;
                    const label = [
                      particular.categoryName,
                      particular.particularsName,
                    ]
                      .filter(Boolean)
                      .join(" - ");
                    return (
                      <tr
                        key={`d-${siNo}-${label}`}
                        className={siNo % 2 === 0 ? "bg-[#f1f6ff]" : "bg-white"}
                      >
                        <td className="border border-[#b8d0f0] px-3 py-2">
                          {siNo}
                        </td>
                        <td className="border border-[#b8d0f0] px-3 py-2">
                          {label}
                        </td>
                        <td className="border border-[#b8d0f0] px-3 py-2 text-right">
                          {amt(particular.grossAmount)}
                        </td>
                        <td className="border border-[#b8d0f0] px-3 py-2 text-right">
                          {amt(particular.discountAmount)}
                        </td>
                        <td className="border border-[#b8d0f0] px-3 py-2 text-right">
                          {amt(particular.fineAmount)}
                        </td>
                        <td className="border border-[#b8d0f0] px-3 py-2 text-right">
                          {amt(particular.paidAmount)}
                        </td>
                        <td className="border border-[#b8d0f0] px-3 py-2 text-right">
                          {amt(particular.balanceAmount)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}

          {showPaySection && hasFinancialYear ? (
            <div className="flex justify-end">
              <Button type="button" className={YELLOW_BTN} onClick={payFee}>
                Pay fees
              </Button>
            </div>
          ) : null}

          {receiptRows.length > 0 || loadingReceipts ? (
            <div>
              <h2 className="mb-2 text-[18px] font-medium">Fee Receipts</h2>
              <div className="overflow-x-auto rounded-[3px] bg-[#c3d9ff] p-3">
                {loadingReceipts ? (
                  <p className="bg-white px-3 py-4 text-sm text-muted-foreground">
                    Loading receipts…
                  </p>
                ) : (
                  <table className="w-full border-collapse bg-white text-[13px]">
                    <thead>
                      <tr>
                        {[
                          "SI No.",
                          "Receipt No.",
                          "Payment Date",
                          "Payment Mode",
                          "Payment Type",
                          "Merchant Ref No.",
                          "Amount (₹)",
                          "Print",
                        ].map((h) => (
                          <th
                            key={h}
                            className={`border-b-[5px] border-[#c3d9ff] bg-white px-2 py-1.5 font-medium ${
                              h === "Amount (₹)" ? "text-right" : "text-left"
                            }`}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {receiptRows.map((row, i) => (
                        <tr
                          key={`${pick(row, "payment_receipts_no", "paymentReceiptsNo")}-${i}`}
                          className={i % 2 === 1 ? "bg-[#f1f6ff]" : "bg-white"}
                        >
                          <td className="px-2 py-1.5">{i + 1}</td>
                          <td className="px-2 py-1.5">
                            {pick(
                              row,
                              "payment_receipts_no",
                              "paymentReceiptsNo",
                            ) || "—"}
                          </td>
                          <td className="px-2 py-1.5">
                            {formatReceiptDate(
                              pick(
                                row,
                                "receipt_date",
                                "receiptDate",
                                "createdDt",
                              ) || undefined,
                            )}
                          </td>
                          <td className="px-2 py-1.5">
                            {pick(row, "payment_mode", "paymentMode") || "—"}
                          </td>
                          <td className="px-2 py-1.5">
                            {pick(row, "payment_type", "paymentType") || "—"}
                          </td>
                          <td className="px-2 py-1.5">
                            {pick(
                              row,
                              "transaction_no",
                              "transactionNo",
                              "referenceNumber",
                            )}
                          </td>
                          <td className="px-2 py-1.5 text-right">
                            {amt(
                              pick(row, "receipt_amount", "receiptAmount") || 0,
                            )}
                          </td>
                          <td className="px-2 py-1.5">
                            <button
                              type="button"
                              className="inline-flex text-[#e91e63] hover:text-[#c2185b]"
                              title="Print Receipt"
                              onClick={() => printReceipt(row)}
                            >
                              <Printer className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          ) : null}

          <div className="flex justify-end">
            <Button type="button" className={YELLOW_BTN} onClick={goBack}>
              Back
            </Button>
          </div>
        </div>
      </div>

      <StudentPayDialog
        open={dialogOpen}
        data={dialogData}
        isSubmitting={submitting}
        onClose={() => {
          if (!submitting) setDialogOpen(false);
        }}
        onPay={() => {
          void savePayDetails();
        }}
      />
    </PageContainer>
  );
}
