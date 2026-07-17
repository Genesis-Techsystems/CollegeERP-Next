"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DatePicker } from "@/common/components/date-picker";
import { ConfirmDialog } from "@/common/components/feedback";
import { Select } from "@/common/components/select";
import { TableCard } from "@/common/components/table";
import { PageContainer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QK } from "@/lib/query-keys";
import { toastError, toastInfo, toastSuccess } from "@/lib/toast";
import {
  createStudentWiseParticulars,
  deleteFeeStudentWiseDiscount,
  getFeePaymentLookups,
  getFeeStudentData,
  getFinancialYearForReceiptDate,
  listFeeCategoriesByCollege,
  listFeeParticularsByCollege,
  listFeeStructureParticularsForPayment,
  listParticularWiseReceipts,
  listTransportAllocationForStudent,
  printFeeReceiptById,
  saveFeeStudentWiseDiscount,
  submitFeeReceipt,
} from "@/services";
import type { FeeCategory } from "@/types/fee-category";
import type { FeeParticular } from "@/types/fee-particular";
import type {
  FeeParticularWiseReceiptRow,
  FeeReceiptPaymentPayload,
  FeeStudentData,
  FeeStudentParticularRow,
  StudentFeeSearchRow,
  TransportAllocationRow,
} from "@/types/fees-collection";
import { FeeStudentProfileCard } from "./FeeStudentProfileCard";
import {
  buildTransportPaymentFor,
  referenceFieldForPaymentMode,
  type CategoryFeePayConfig,
} from "../_lib/pay-fees-mode";

const DEFAULT_PAYMENT_MODE_ID = 131;

type PayFormState = {
  paymentModeId: number | null;
  paymentTypeId: number | null;
  receiptDt: Date | null;
  paymentFor: string;
  referenceNumber: string;
  transactionNo: string;
  chequeNo: string;
  ddno: string;
  otherPaymentNumber: string;
};

export type CategoryFeePayFormProps = {
  config: CategoryFeePayConfig;
  collegeId: number;
  academicYearId: number;
  studentId: number;
  feeStructureId: number;
  queryParams: URLSearchParams;
};

function emptyParticular(code: string): FeeStudentParticularRow {
  return {
    feeCategoryId: undefined,
    feeCategoryCode: code,
    feeParticularsId: undefined,
    grossAmount: 0,
    discountAmount: 0,
    paidAmount: 0,
    balanceAmount: 0,
    amt: 0,
    isPaid: false,
    isDiscounted: false,
  };
}

function normalizeParticular(
  row: FeeStudentParticularRow,
  categoryCode: string,
): FeeStudentParticularRow {
  const balance = Number(row.balanceAmount ?? 0);
  const discount = Number(row.discountAmount ?? 0);
  return {
    ...row,
    feeCategoryCode: row.feeCategoryCode ?? categoryCode,
    amt: balance > 0 ? balance : 0,
    isPaid: balance === 0,
    isDiscounted: discount > 0,
  };
}

function toProfileStudent(
  data: FeeStudentData | null,
  qs: URLSearchParams,
): StudentFeeSearchRow {
  return {
    studentId: Number(qs.get("studentId") ?? 0),
    firstName: data?.firstName ?? qs.get("firstName") ?? undefined,
    rollNumber: qs.get("rollNumber") ?? undefined,
    hallticketNumber: qs.get("hallTicketNo") ?? undefined,
    collegeCode: qs.get("collegeCode") ?? undefined,
    academicYear:
      data?.studentAcademicYear ??
      data?.academicYear ??
      qs.get("academicYear") ??
      undefined,
    courseCode: qs.get("courseCode") ?? undefined,
    groupCode: data?.studentGroupCode ?? qs.get("groupCode") ?? undefined,
    courseYearName:
      data?.studentCourseYearName ?? qs.get("courseYearName") ?? undefined,
    section: data?.studentSection ?? qs.get("section") ?? undefined,
    mobile: data?.mobile ?? undefined,
    quotaDisplayName: qs.get("quotaDisplayName") ?? undefined,
    studentStatusCode: qs.get("studentStatusCode") ?? undefined,
    studentStatusDisplayName: qs.get("studentStatusDisplayName") ?? undefined,
    isLateral: qs.get("isLateral") === "true",
    studentPhotoPath: data?.studentPhotoPath,
  };
}

function filterByCode<
  T extends { feeCategoryCode?: string; particularsCode?: string },
>(rows: T[], code: string, kind: "category" | "particular"): T[] {
  if (!code) return rows;
  return rows.filter((r) =>
    kind === "category"
      ? String(r.feeCategoryCode ?? "") === code
      : String(r.particularsCode ?? "") === code,
  );
}

export function CategoryFeePayForm({
  config,
  collegeId,
  academicYearId,
  studentId,
  feeStructureId,
  queryParams,
}: CategoryFeePayFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { categoryCode, requireTransport, filterOnlineLookups, title } = config;

  const [form, setForm] = useState<PayFormState>({
    paymentModeId: DEFAULT_PAYMENT_MODE_ID,
    paymentTypeId: null,
    receiptDt: new Date(),
    paymentFor: categoryCode || "",
    referenceNumber: "",
    transactionNo: "",
    chequeNo: "",
    ddno: "",
    otherPaymentNumber: "",
  });
  const [particular, setParticular] = useState<FeeStudentParticularRow | null>(
    null,
  );
  const [feeStudentData, setFeeStudentData] = useState<FeeStudentData | null>(
    null,
  );
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [paying, setPaying] = useState(false);
  const [payPreview, setPayPreview] = useState<FeeReceiptPaymentPayload | null>(
    null,
  );

  const receiptDateKey = form.receiptDt
    ? format(form.receiptDt, "yyyy-MM-dd")
    : "";

  const studentFilters = useMemo(
    () => ({ collegeId, academicYearId, studentId, feeStructureId }),
    [collegeId, academicYearId, studentId, feeStructureId],
  );

  const { data: lookups } = useQuery({
    queryKey: QK.feesCollection.payLookups(),
    queryFn: getFeePaymentLookups,
  });

  const { data: categories = [] } = useQuery({
    queryKey: QK.feesCollection.payCategories(collegeId, categoryCode),
    queryFn: async () => {
      const rows = await listFeeCategoriesByCollege(collegeId);
      return filterByCode(rows, categoryCode, "category");
    },
    enabled: collegeId > 0,
  });

  const { data: particulars = [] } = useQuery({
    queryKey: QK.feesCollection.payParticulars(collegeId, categoryCode),
    queryFn: async () => {
      const rows = await listFeeParticularsByCollege(collegeId);
      return filterByCode(rows, categoryCode, "particular");
    },
    enabled: collegeId > 0,
  });

  const { data: structureParticulars = [] } = useQuery({
    queryKey: QK.feesCollection.payStructureParticulars(feeStructureId),
    queryFn: () => listFeeStructureParticularsForPayment(feeStructureId),
    enabled: feeStructureId > 0,
  });

  const { data: financialYears = [], isLoading: loadingFy } = useQuery({
    queryKey: QK.feesCollection.payFinancialYear(collegeId, receiptDateKey),
    queryFn: () =>
      getFinancialYearForReceiptDate(collegeId, form.receiptDt ?? new Date()),
    enabled: collegeId > 0 && Boolean(receiptDateKey),
  });

  const { data: transportRows = [] } = useQuery({
    queryKey: QK.feesCollection.payTransport(
      studentId,
      academicYearId,
      receiptDateKey,
    ),
    queryFn: () =>
      listTransportAllocationForStudent({
        studentId,
        academicYearId,
        date: receiptDateKey,
      }),
    enabled:
      requireTransport &&
      studentId > 0 &&
      academicYearId > 0 &&
      Boolean(receiptDateKey),
  });

  const transport: TransportAllocationRow | null = transportRows[0] ?? null;

  const {
    data: studentData,
    isLoading: loadingStudent,
    refetch: refetchStudent,
  } = useQuery({
    queryKey: QK.feesCollection.payStudentData(studentFilters),
    queryFn: () => getFeeStudentData(studentFilters),
    enabled:
      collegeId > 0 &&
      academicYearId > 0 &&
      studentId > 0 &&
      feeStructureId > 0,
  });

  useEffect(() => {
    if (!studentData) {
      setFeeStudentData(null);
      setParticular(null);
      return;
    }
    setFeeStudentData(studentData);
    const rows = Array.isArray(studentData.feeStudentDataParticulars)
      ? studentData.feeStudentDataParticulars
      : [];
    const match = categoryCode
      ? rows.find((r) => String(r.feeCategoryCode ?? "") === categoryCode)
      : rows[0];
    setParticular(
      match
        ? normalizeParticular(
            match,
            categoryCode || String(match.feeCategoryCode ?? ""),
          )
        : emptyParticular(categoryCode),
    );
  }, [studentData, categoryCode]);

  useEffect(() => {
    if (!categoryCode) return;
    if (requireTransport) {
      setForm((prev) => ({
        ...prev,
        paymentFor: buildTransportPaymentFor(categoryCode, transport),
      }));
      return;
    }
    setForm((prev) => ({
      ...prev,
      paymentFor: prev.paymentFor || categoryCode,
    }));
  }, [categoryCode, requireTransport, transport]);

  // Stub Transport/HF row: auto-select sole category / particular masters.
  useEffect(() => {
    if (!particular || particular.feeStdDataParticularsId) return;
    setParticular((prev) => {
      if (!prev || prev.feeStdDataParticularsId) return prev;
      let next = prev;
      if (!next.feeCategoryId && categories.length === 1) {
        next = {
          ...next,
          feeCategoryId: categories[0].feeCategoryId,
          categoryName: categories[0].categoryName,
          feeCategoryCode: categories[0].feeCategoryCode || categoryCode,
        };
      }
      if (!next.feeParticularsId && particulars.length === 1) {
        next = {
          ...next,
          feeParticularsId: particulars[0].feeParticularsId,
          particularsName: particulars[0].particularsName,
        };
      }
      return next;
    });
  }, [particular, categories, particulars, categoryCode]);

  const receiptFilters = useMemo(() => {
    if (!particular?.feeStdDataParticularsId || !particular.feeParticularsId)
      return null;
    return {
      feeStructureId: Number(particular.feeStructureId ?? feeStructureId),
      collegeId,
      studentId,
      feeParticularsId: Number(particular.feeParticularsId),
      feeStdDataParticularsId: Number(particular.feeStdDataParticularsId),
    };
  }, [particular, feeStructureId, collegeId, studentId]);

  const { data: receipts = [], isLoading: loadingReceipts } = useQuery({
    queryKey: QK.feesCollection.particularWiseReceipts(receiptFilters ?? {}),
    queryFn: () => listParticularWiseReceipts(receiptFilters!),
    enabled: Boolean(receiptFilters),
  });

  const paymentModes = useMemo(() => {
    const rows = lookups?.paymentModes ?? [];
    if (!filterOnlineLookups) return rows;
    return rows.filter(
      (r) => String(r.generalDetailCode ?? "").toUpperCase() !== "ONLINE",
    );
  }, [lookups, filterOnlineLookups]);

  const paymentTypes = useMemo(() => {
    const rows = lookups?.paymentTypes ?? [];
    if (!filterOnlineLookups) return rows;
    return rows.filter(
      (r) => String(r.generalDetailCode ?? "").toUpperCase() !== "ONLINE",
    );
  }, [lookups, filterOnlineLookups]);

  // Prefer Angular default mode 131; otherwise first available mode.
  useEffect(() => {
    if (paymentModes.length === 0) return;
    setForm((prev) => {
      if (
        prev.paymentModeId &&
        paymentModes.some(
          (m) => Number(m.generalDetailId) === prev.paymentModeId,
        )
      ) {
        return prev;
      }
      const preferred = paymentModes.find(
        (m) => Number(m.generalDetailId) === DEFAULT_PAYMENT_MODE_ID,
      );
      const nextId = Number((preferred ?? paymentModes[0]).generalDetailId);
      return { ...prev, paymentModeId: nextId };
    });
  }, [paymentModes]);
  const modeOptions = useMemo(
    () =>
      paymentModes.map((m) => ({
        value: String(m.generalDetailId),
        label: String(
          m.generalDetailName ?? m.generalDetailCode ?? m.generalDetailId,
        ),
      })),
    [paymentModes],
  );

  const typeOptions = useMemo(
    () =>
      paymentTypes.map((m) => ({
        value: String(m.generalDetailId),
        label: String(
          m.generalDetailName ?? m.generalDetailCode ?? m.generalDetailId,
        ),
      })),
    [paymentTypes],
  );

  const categoryOptions = useMemo(
    () =>
      categories.map((c: FeeCategory) => ({
        value: String(c.feeCategoryId),
        label: c.categoryName,
      })),
    [categories],
  );

  const particularOptions = useMemo(
    () =>
      particulars.map((p: FeeParticular) => ({
        value: String(p.feeParticularsId),
        label: p.particularsName,
      })),
    [particulars],
  );

  const refField = referenceFieldForPaymentMode(form.paymentModeId);
  const isPaid = Boolean(particular?.isPaid);
  const canPayAmount = Number(particular?.amt ?? 0) > 0;
  const hasFinancialYear = financialYears.length > 0;
  const transportOk = !requireTransport || Boolean(transport);
  const canSubmit =
    canPayAmount &&
    hasFinancialYear &&
    transportOk &&
    Boolean(form.paymentModeId) &&
    Boolean(form.paymentTypeId) &&
    Boolean(form.receiptDt) &&
    !isPaid;

  const profileStudent = useMemo(
    () => toProfileStudent(feeStudentData, queryParams),
    [feeStudentData, queryParams],
  );

  const contextLine = [
    queryParams.get("collegeCode"),
    queryParams.get("academicYear"),
    queryParams.get("courseCode"),
    queryParams.get("groupCode"),
    queryParams.get("courseYearName"),
  ]
    .filter(Boolean)
    .join(" / ");

  const updateParticular = useCallback(
    (patch: Partial<FeeStudentParticularRow>) => {
      setParticular((prev) => {
        if (!prev) return prev;
        const next = { ...prev, ...patch };
        const gross = Number(next.grossAmount ?? 0);
        const discount = Number(next.discountAmount ?? 0);
        const paid = Number(next.paidAmount ?? 0);
        next.balanceAmount = Math.max(0, gross - discount - paid);
        if (patch.amt == null && patch.grossAmount != null) {
          next.amt = next.balanceAmount;
        }
        if (Number(next.amt ?? 0) > Number(next.balanceAmount ?? 0)) {
          next.amt = next.balanceAmount;
        }
        return next;
      });
    },
    [],
  );

  function onPayAmountChange(raw: string) {
    const amt = Number(raw);
    if (!particular) return;
    if (Number.isFinite(amt) && amt > Number(particular.balanceAmount ?? 0)) {
      toastInfo("Pay amount should be less than balance amount.");
      updateParticular({ amt: Number(particular.balanceAmount ?? 0) });
      return;
    }
    updateParticular({ amt: Number.isFinite(amt) ? amt : 0 });
    if (requireTransport) {
      setForm((prev) => ({
        ...prev,
        paymentFor: buildTransportPaymentFor(categoryCode, transport),
      }));
    } else if (categoryCode) {
      setForm((prev) => ({ ...prev, paymentFor: categoryCode }));
    }
  }

  function onPaymentTypeChange(v: string | null) {
    const id = v ? Number(v) : null;
    if (id != null) {
      const type = paymentTypes.find((t) => Number(t.generalDetailId) === id);
      const quota = queryParams.get("quotaDisplayName") ?? "";
      if (
        String(type?.generalDetailCode ?? "").toUpperCase() === "MQA" &&
        quota.toUpperCase() === "REGULAR CONVENER"
      ) {
        toastInfo("Student is in regular quota.");
        setForm((prev) => ({ ...prev, paymentTypeId: null }));
        return;
      }
    }
    setForm((prev) => ({ ...prev, paymentTypeId: id }));
  }

  async function preparePay() {
    if (!particular || !feeStudentData || !canSubmit) return;
    const fyId = Number(financialYears[0]?.financialYearId ?? 0);
    if (!fyId) {
      toastInfo(
        "Not found related financial year, please contact system admin.",
      );
      return;
    }

    const category = categories.find(
      (c) => Number(c.feeCategoryId) === Number(particular.feeCategoryId),
    );
    const particularMaster = particulars.find(
      (p) => Number(p.feeParticularsId) === Number(particular.feeParticularsId),
    );
    if (!particular.feeCategoryId || !particular.feeParticularsId) {
      toastInfo("Select fee category and particular.");
      return;
    }

    const structureMatch = structureParticulars.find((x) => {
      const fsId = Number(
        x.feeStructureId ??
          (x as { FeeStructure?: { feeStructureId?: number } }).FeeStructure
            ?.feeStructureId ??
          feeStructureId,
      );
      const catId = Number(
        x.feeCategoryId ??
          (x as { FeeCategory?: { feeCategoryId?: number } }).FeeCategory
            ?.feeCategoryId,
      );
      const partId = Number(
        x.feeParticularsId ??
          (x as { FeeParticular?: { feeParticularsId?: number } }).FeeParticular
            ?.feeParticularsId,
      );
      return (
        fsId === feeStructureId &&
        catId === Number(particular.feeCategoryId) &&
        partId === Number(particular.feeParticularsId)
      );
    });

    const payAmt = Number(particular.amt ?? 0);
    let working: FeeStudentParticularRow = {
      ...particular,
      collegeId: Number(feeStudentData.collegeId ?? collegeId),
      studentId: Number(feeStudentData.studentId ?? studentId),
      feeStructureId: Number(feeStudentData.feeStructureId ?? feeStructureId),
      feeStdDataId: Number(feeStudentData.feeStdDataId),
      financialYearId: fyId,
      payerName: String(feeStudentData.firstName ?? ""),
      isActive: true,
      amount: Number(particular.grossAmount ?? 0),
      value: Number(particular.discountAmount ?? 0),
      categoryName: category?.categoryName ?? particular.categoryName,
      particularsName:
        particularMaster?.particularsName ?? particular.particularsName,
      feeStructureParticularId: structureMatch
        ? Number(
            structureMatch.feeStructureParticularId ??
              (structureMatch as { feeStructureParticularId?: number })
                .feeStructureParticularId,
          )
        : particular.feeStructureParticularId,
    };

    setPaying(true);
    try {
      if (!working.feeStdDataParticularsId) {
        const created = await createStudentWiseParticulars([working]);
        const createdRow = created[0];
        if (createdRow) {
          working = {
            ...working,
            feeStdParticularId:
              createdRow.feeStdParticularId ??
              createdRow.feeStdDataParticularsId,
            feeStdDataParticularsId:
              createdRow.feeStdDataParticularsId ??
              createdRow.feeStdParticularId,
          };
        }
      }

      if (!working.isDiscounted && Number(working.discountAmount ?? 0) > 0) {
        await saveFeeStudentWiseDiscount([
          {
            ...working,
            value: Number(working.discountAmount ?? 0),
          },
        ]);
      }

      const payerTypeId = lookups?.payerTypes.find(
        (p) => String(p.generalDetailCode ?? "").toUpperCase() === "STD",
      )?.generalDetailId;

      const payload: FeeReceiptPaymentPayload = {
        paymentFor: form.paymentFor,
        receiptDt: form.receiptDt ? format(form.receiptDt, "yyyy-MM-dd") : "",
        paymentTypeId: Number(form.paymentTypeId),
        paymentModeId: Number(form.paymentModeId),
        referenceNumber: form.referenceNumber || undefined,
        transactionNo: form.transactionNo || undefined,
        chequeNo: form.chequeNo || undefined,
        ddno: form.ddno || undefined,
        otherPaymentNumber: form.otherPaymentNumber || undefined,
        collegeId,
        academicYearId,
        studentId,
        isFeeRefund: false,
        receiptAmount: payAmt,
        financialYearId: fyId,
        feeStdDataId: Number(feeStudentData.feeStdDataId),
        revertbByEmployeeId: localStorage.getItem("employeeId") ?? undefined,
        feeParticularwisePayments: [{ ...working, amount: payAmt }],
        payerTypeId: payerTypeId ? Number(payerTypeId) : undefined,
        payerName: String(feeStudentData.firstName ?? ""),
        firstName: String(feeStudentData.firstName ?? ""),
        collegeCode: queryParams.get("collegeCode") ?? undefined,
        academicYear: String(
          feeStudentData.academicYear ?? queryParams.get("academicYear") ?? "",
        ),
        courseCode: queryParams.get("courseCode") ?? undefined,
        groupCode: queryParams.get("groupCode") ?? undefined,
        courseYearName: queryParams.get("courseYearName") ?? undefined,
        section: queryParams.get("section") ?? undefined,
      };

      setPayPreview(payload);
      setParticular(working);
      setConfirmOpen(true);
    } catch (e) {
      toastError(e, "Unable to prepare payment");
    } finally {
      setPaying(false);
    }
  }

  async function confirmPay() {
    if (!payPreview) return;
    setPaying(true);
    try {
      await submitFeeReceipt(payPreview);
      toastSuccess("Fee payment saved successfully.");
      setConfirmOpen(false);
      setPayPreview(null);
      setForm((prev) => ({
        ...prev,
        paymentModeId: DEFAULT_PAYMENT_MODE_ID,
        paymentTypeId: null,
        referenceNumber: "",
        transactionNo: "",
        chequeNo: "",
        ddno: "",
        otherPaymentNumber: "",
        receiptDt: new Date(),
        paymentFor: categoryCode || "",
      }));
      await queryClient.invalidateQueries({
        queryKey: QK.feesCollection.payStudentData(studentFilters),
      });
      await refetchStudent();
      if (receiptFilters) {
        await queryClient.invalidateQueries({
          queryKey: QK.feesCollection.particularWiseReceipts(receiptFilters),
        });
      }
    } catch (e) {
      toastError(e, "Fee payment failed");
    } finally {
      setPaying(false);
    }
  }

  async function onDeleteDiscount() {
    if (!particular || !feeStudentData) return;
    const discounts = Array.isArray(feeStudentData.feeStudentwiseDiscounts)
      ? (feeStudentData.feeStudentwiseDiscounts as Array<
          Record<string, unknown>
        >)
      : [];
    const match = discounts.find(
      (d) =>
        Number(d.feeCategoryId) === Number(particular.feeCategoryId) &&
        Number(d.feeParticularsId) === Number(particular.feeParticularsId),
    );
    const discountId = Number(match?.feeStdDiscountId ?? 0);
    if (!discountId) {
      toastInfo("Discount record not found.");
      return;
    }
    try {
      await deleteFeeStudentWiseDiscount(discountId);
      toastSuccess("Discount deleted.");
      await refetchStudent();
    } catch (e) {
      toastError(e, "Failed to delete discount");
    }
  }

  async function onPrintReceipt(row: FeeParticularWiseReceiptRow) {
    const receiptId = Number(
      row.feeReceipts?.feeReceiptsId ?? row.feeReceiptsId ?? 0,
    );
    if (!receiptId) {
      toastInfo("Receipt id not available.");
      return;
    }
    try {
      await printFeeReceiptById(receiptId);
    } catch (e) {
      toastError(e, "Unable to print receipt");
    }
  }

  const hidePrintCodes = new Set(["MQA", "CONVREMIT", "SCHOLARSHIP"]);

  if (!collegeId || !academicYearId || !studentId || !feeStructureId) {
    const missing = [
      !collegeId ? "collegeId" : null,
      !academicYearId ? "academicYearId" : null,
      !studentId ? "studentId" : null,
      !feeStructureId ? "feeStructureId" : null,
    ].filter(Boolean);

    return (
      <PageContainer className="space-y-4">
        <p className="text-sm font-medium text-slate-900">{title}</p>
        <p className="text-sm text-muted-foreground">
          Missing payment parameters ({missing.join(", ")}). Open this screen
          from <strong>Pay Details</strong> on the student fee list so college,
          academic year, student, and fee structure IDs are passed in the URL.
        </p>
        <Button
          type="button"
          onClick={() => router.push(config.backHref(queryParams))}
        >
          Back
        </Button>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="space-y-5">
      <div className="flex items-center gap-2">
        <span className="text-base font-semibold">{title}</span>
      </div>

      {loadingStudent ? (
        <p className="text-sm text-muted-foreground">
          Loading student fee data…
        </p>
      ) : feeStudentData ? (
        <>
          <FeeStudentProfileCard student={profileStudent} />

          {requireTransport && !transport ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              To pay transport fee please allocate route to student.
            </p>
          ) : null}

          {categoryCode &&
          (categories.length === 0 || particulars.length === 0) ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              No active fee category / particular with code{" "}
              <strong>{categoryCode}</strong> for this college. Configure it
              under Fee Masters before collecting this fee.
            </p>
          ) : null}

          {contextLine ? (
            <div className="rounded-md bg-[#c3d9ff] px-3 py-2 text-sm font-medium text-slate-900">
              Payment for {contextLine}
              {transport ? (
                <span className="ml-1 font-medium text-blue-700">
                  ({transport.pickupRouteStopName}{" "}
                  {formatTransportTimeLabel(transport.pickTime)} -{" "}
                  {transport.dropRoutestopName}{" "}
                  {formatTransportTimeLabel(transport.dropTime)} /{" "}
                  {transport.routeCode})
                </span>
              ) : null}
            </div>
          ) : null}

          {!isPaid ? (
            <div className="space-y-4 rounded-lg border bg-white p-4">
              <h2 className="text-sm font-semibold">Payment</h2>
              {!hasFinancialYear && !loadingFy ? (
                <p className="text-sm font-medium text-red-600">
                  Not found related financial year, please contact system admin.
                </p>
              ) : null}

              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <Select
                  label="Pay Mode"
                  required
                  value={
                    form.paymentModeId != null
                      ? String(form.paymentModeId)
                      : null
                  }
                  onChange={(v) =>
                    setForm((prev) => ({
                      ...prev,
                      paymentModeId: v ? Number(v) : null,
                      referenceNumber: "",
                      transactionNo: "",
                      chequeNo: "",
                      ddno: "",
                      otherPaymentNumber: "",
                    }))
                  }
                  options={modeOptions}
                  placeholder="Select pay mode"
                />
                <Select
                  label="Payment Type"
                  required
                  value={
                    form.paymentTypeId != null
                      ? String(form.paymentTypeId)
                      : null
                  }
                  onChange={onPaymentTypeChange}
                  options={typeOptions}
                  placeholder="Select payment type"
                />
                {refField ? (
                  <div className="space-y-1.5">
                    <Label>{refField.label}</Label>
                    <Input
                      value={form[refField.key]}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          [refField.key]: e.target.value,
                        }))
                      }
                    />
                  </div>
                ) : null}
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <DatePicker
                  label="Payment Date"
                  required
                  value={form.receiptDt}
                  onChange={(d) =>
                    setForm((prev) => ({ ...prev, receiptDt: d }))
                  }
                  clearable={false}
                  displayFormat="dd/MM/yyyy"
                />
                <div className="space-y-1.5 md:col-span-2">
                  <Label>Payment Notes</Label>
                  <Input
                    value={form.paymentFor}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        paymentFor: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    type="button"
                    className="h-9 w-full bg-[#f0c040] text-slate-900 hover:bg-[#e5b535]"
                    disabled={!canSubmit || paying}
                    onClick={() => void preparePay()}
                  >
                    Pay fees
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          <TableCard
            headerLeft={
              <span className="text-sm font-medium">Fee Particular</span>
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 text-left">
                    <th className="px-2 py-2">SI No</th>
                    <th className="px-2 py-2">Category</th>
                    <th className="px-2 py-2">Particular</th>
                    <th className="px-2 py-2 text-right">Gross Amt (₹)</th>
                    <th className="px-2 py-2 text-right">Dis Amt (₹)</th>
                    <th className="px-2 py-2 text-right">Paid Amt (₹)</th>
                    <th className="px-2 py-2 text-right">Bal Amt (₹)</th>
                    <th className="px-2 py-2 text-right">Pay Amt (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {particular ? (
                    <tr className="border-b">
                      <td className="px-2 py-2">1.</td>
                      <td className="px-2 py-2">
                        {particular.feeStdDataParticularsId ? (
                          particular.categoryName
                        ) : (
                          <Select
                            value={
                              particular.feeCategoryId != null
                                ? String(particular.feeCategoryId)
                                : null
                            }
                            onChange={(v) =>
                              updateParticular({
                                feeCategoryId: v ? Number(v) : undefined,
                              })
                            }
                            options={categoryOptions}
                            placeholder="Fee Category"
                          />
                        )}
                      </td>
                      <td className="px-2 py-2">
                        {particular.feeStdDataParticularsId ? (
                          particular.particularsName
                        ) : (
                          <Select
                            value={
                              particular.feeParticularsId != null
                                ? String(particular.feeParticularsId)
                                : null
                            }
                            onChange={(v) =>
                              updateParticular({
                                feeParticularsId: v ? Number(v) : undefined,
                              })
                            }
                            options={particularOptions}
                            placeholder="Fee Particular"
                          />
                        )}
                      </td>
                      <td className="px-2 py-2 text-right">
                        {particular.isPaid ? (
                          Number(particular.grossAmount ?? 0)
                        ) : (
                          <Input
                            className="ml-auto h-8 w-24 text-right"
                            type="number"
                            value={Number(particular.grossAmount ?? 0)}
                            onChange={(e) =>
                              updateParticular({
                                grossAmount: Number(e.target.value) || 0,
                              })
                            }
                          />
                        )}
                      </td>
                      <td className="px-2 py-2 text-right">
                        {particular.isDiscounted ? (
                          <span className="inline-flex items-center gap-1">
                            {Number(particular.discountAmount ?? 0)}
                            {Number(particular.balanceAmount ?? 0) > 0 ? (
                              <button
                                type="button"
                                className="text-xs text-red-600 underline"
                                onClick={() => void onDeleteDiscount()}
                              >
                                Delete
                              </button>
                            ) : null}
                          </span>
                        ) : (
                          <Input
                            className="ml-auto h-8 w-24 text-right"
                            type="number"
                            min={0}
                            value={Number(particular.discountAmount ?? 0)}
                            onChange={(e) =>
                              updateParticular({
                                discountAmount: Number(e.target.value) || 0,
                              })
                            }
                          />
                        )}
                      </td>
                      <td className="px-2 py-2 text-right">
                        {Number(particular.paidAmount ?? 0)}
                      </td>
                      <td className="px-2 py-2 text-right">
                        {Number(particular.balanceAmount ?? 0)}
                      </td>
                      <td className="px-2 py-2 text-right">
                        {particular.isPaid ? (
                          <span className="font-medium text-emerald-700">
                            Paid
                          </span>
                        ) : (
                          <Input
                            className="ml-auto h-8 w-24 text-right text-blue-700"
                            type="number"
                            min={0}
                            value={Number(particular.amt ?? 0)}
                            onChange={(e) => onPayAmountChange(e.target.value)}
                          />
                        )}
                      </td>
                    </tr>
                  ) : (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-2 py-4 text-center text-muted-foreground"
                      >
                        No particular data
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </TableCard>

          <TableCard
            headerLeft={<span className="text-sm font-medium">Receipts</span>}
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 text-left">
                    <th className="px-2 py-2">SI No</th>
                    <th className="px-2 py-2">Receipt No</th>
                    <th className="px-2 py-2">Payment Date</th>
                    <th className="px-2 py-2">Payment Notes</th>
                    <th className="px-2 py-2">Payment Mode</th>
                    <th className="px-2 py-2">Payment Type</th>
                    <th className="px-2 py-2">Reference No</th>
                    <th className="px-2 py-2 text-right">Amount</th>
                    <th className="px-2 py-2">Print</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingReceipts ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="px-2 py-4 text-center text-muted-foreground"
                      >
                        Loading receipts…
                      </td>
                    </tr>
                  ) : receipts.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="px-2 py-4 text-center text-muted-foreground"
                      >
                        No receipts
                      </td>
                    </tr>
                  ) : (
                    receipts.map((row, idx) => {
                      const typeCode = String(
                        row.paymentTypeCode ?? "",
                      ).toUpperCase();
                      const showPrint = !hidePrintCodes.has(typeCode);
                      return (
                        <tr
                          key={`${row.paymentReceiptsNo ?? idx}-${idx}`}
                          className="border-b"
                        >
                          <td className="px-2 py-2">{idx + 1}</td>
                          <td className="px-2 py-2">
                            {row.paymentReceiptsNo ?? "—"}
                          </td>
                          <td className="px-2 py-2">{row.receiptDt ?? "—"}</td>
                          <td className="px-2 py-2">{row.paymentFor ?? "—"}</td>
                          <td className="px-2 py-2">
                            {row.paymentMode ?? "—"}
                          </td>
                          <td className="px-2 py-2">
                            {row.paymentType ?? "—"}
                          </td>
                          <td className="px-2 py-2">
                            {row.referenceNumber ?? "—"}
                          </td>
                          <td className="px-2 py-2 text-right">
                            {row.receiptAmount ?? 0}
                          </td>
                          <td className="px-2 py-2">
                            {showPrint ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => void onPrintReceipt(row)}
                              >
                                Print
                              </Button>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </TableCard>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          No fee student data found for this structure.
        </p>
      )}

      <div className="flex justify-end">
        <Button
          type="button"
          className="h-9 min-w-[88px] bg-[#f0c040] px-5 text-[13px] font-medium text-slate-900 hover:bg-[#e5b535]"
          onClick={() => router.push(config.backHref(queryParams))}
        >
          Back
        </Button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Confirm Payment"
        confirmLabel="Pay"
        cancelLabel="Close"
        confirmVariant="default"
        confirmFirst
        isLoading={paying}
        contentClassName="sm:max-w-xl"
        onCancel={() => {
          if (!paying) {
            setConfirmOpen(false);
            setPayPreview(null);
          }
        }}
        onConfirm={() => void confirmPay()}
      >
        {payPreview ? (
          <div className="space-y-3 text-sm">
            <p>
              <span className="text-muted-foreground">Student:</span>{" "}
              {payPreview.firstName ?? profileStudent.firstName}
            </p>
            <p>
              <span className="text-muted-foreground">College / AY:</span>{" "}
              {payPreview.collegeCode} / {payPreview.academicYear}
            </p>
            <p>
              <span className="text-muted-foreground">Course:</span>{" "}
              {[
                payPreview.courseCode,
                payPreview.groupCode,
                payPreview.courseYearName,
                payPreview.section,
              ]
                .filter(Boolean)
                .join(" / ")}
            </p>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-1">Particular</th>
                  <th className="py-1 text-right">Fee Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="py-2">
                    {payPreview.feeParticularwisePayments[0]?.categoryName} -{" "}
                    {payPreview.feeParticularwisePayments[0]?.particularsName}
                  </td>
                  <td className="py-2 text-right">
                    {payPreview.receiptAmount}
                  </td>
                </tr>
              </tbody>
            </table>
            <p className="text-right font-semibold">
              Total: ₹ {payPreview.receiptAmount}
            </p>
          </div>
        ) : null}
      </ConfirmDialog>
    </PageContainer>
  );
}

function formatTransportTimeLabel(time?: string): string {
  if (!time) return "";
  const match = String(time).match(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/);
  if (!match) return String(time);
  const hour = Number(match[1]);
  const min = match[2];
  const ampm = hour < 12 ? "AM" : "PM";
  const h12 = hour % 12 || 12;
  return `${h12}:${min} ${ampm}`;
}
