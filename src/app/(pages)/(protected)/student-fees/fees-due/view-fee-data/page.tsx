"use client";

/**
 * Angular `student-fees/fees-due/view-fee-data` → `ViewFeeDataComponent`.
 * Full page (not a dialog) — particulars + receipts for one fee structure year.
 */
import { Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { Printer } from "lucide-react";
import { DataTable, TableCard } from "@/common/components/table";
import { FilteredPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { QK } from "@/lib/query-keys";
import { rowIndexGetter } from "@/lib/utils";
import { getFeeStudentData, listStudentFeeReceiptDetails } from "@/services";
import type {
  FeeStudentData,
  FeeStudentParticularRow,
  StudentFeeSearchRow,
} from "@/types/fees-collection";
import { FeeStudentProfileCard } from "@/app/(pages)/(protected)/accounts-and-fees/fees-collection/_components/FeeStudentProfileCard";
import { studentFromPayQueryParams } from "@/app/(pages)/(protected)/accounts-and-fees/fees-collection/_lib/pay-fees-params";
import {
  FEE_RECEIPT_PRINT_PATH,
  storeFeeReceiptPrint,
} from "@/app/(pages)/(protected)/accounts-and-fees/fees-collection/_lib/fee-receipt-print";

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

/** Angular `getFinalBalance`. */
function getFinalBalance(
  item: Record<string, unknown> | FeeStudentParticularRow | FeeStudentData | null | undefined,
): number {
  if (!item) return 0;
  const row = item as Record<string, unknown>;
  const bal = Number(row.balanceAmount) || 0;
  const hold = Number(row.scholarshipHoldAmount) || 0;
  const sch = Number(row.scholarshipAmount) || 0;
  return bal - hold + sch;
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

function profileFromParams(
  qs: URLSearchParams,
  feeData: FeeStudentData | null | undefined,
): StudentFeeSearchRow | null {
  const base = studentFromPayQueryParams(qs);
  if (!base) return null;
  return {
    ...base,
    firstName: feeData?.firstName ?? base.firstName,
    mobile: feeData?.mobile ?? base.mobile,
    studentPhotoPath: feeData?.studentPhotoPath ?? base.studentPhotoPath,
    academicYear:
      feeData?.studentAcademicYear ??
      feeData?.academicYear ??
      base.academicYear,
    groupCode: feeData?.studentGroupCode ?? base.groupCode,
    courseYearName: feeData?.studentCourseYearName ?? base.courseYearName,
    section: feeData?.studentSection ?? base.section,
    studentStatusDisplayName:
      pick(feeData as Record<string, unknown> | undefined, "studentStatus", "studentStatusDisplayName") ||
      base.studentStatusDisplayName,
    isLateral:
      (feeData as Record<string, unknown> | null | undefined)?.isLateral !=
      null
        ? Boolean(
            (feeData as Record<string, unknown>).isLateral,
          )
        : base.isLateral,
  };
}

function ViewFeeDataContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const collegeId = Number(searchParams.get("collegeId") ?? 0);
  const academicYearId = Number(searchParams.get("academicYearId") ?? 0);
  const studentId = Number(searchParams.get("studentId") ?? 0);
  const feeStructureId = Number(searchParams.get("feeStructureId") ?? 0);
  const courseYearId = Number(searchParams.get("courseYearId") ?? 0);
  const courseYearNo = searchParams.get("courseYearNo");

  const { data: feeData, isLoading } = useQuery({
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

  const { data: receipts = [], isLoading: loadingReceipts } = useQuery({
    queryKey: [
      ...QK.feesCollection.receipts(studentId, collegeId, academicYearId),
      courseYearId,
      "view-fee-data",
    ],
    queryFn: () =>
      listStudentFeeReceiptDetails({
        collegeId,
        academicYearId,
        studentId,
        courseYearId,
      }),
    enabled: collegeId > 0 && academicYearId > 0 && studentId > 0,
  });

  const student = useMemo(
    () => profileFromParams(searchParams, feeData),
    [searchParams, feeData],
  );

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

  const receiptCols = useMemo<ColDef<ReceiptRow>[]>(
    () => [
      { headerName: "SI No.", valueGetter: rowIndexGetter, width: 70, flex: 0 },
      {
        headerName: "Receipt No.",
        minWidth: 120,
        valueGetter: (p) =>
          pick(p.data, "payment_receipts_no", "paymentReceiptsNo") || "—",
      },
      {
        headerName: "Payment Date",
        minWidth: 170,
        valueGetter: (p) =>
          formatReceiptDate(
            pick(p.data, "receipt_date", "receiptDate", "createdDt") ||
              undefined,
          ),
      },
      {
        headerName: "Payment Mode",
        minWidth: 110,
        valueGetter: (p) => pick(p.data, "payment_mode", "paymentMode") || "—",
      },
      {
        headerName: "Payment Type",
        minWidth: 110,
        valueGetter: (p) => pick(p.data, "payment_type", "paymentType") || "—",
      },
      {
        headerName: "Merchant Ref No.",
        minWidth: 130,
        valueGetter: (p) =>
          pick(p.data, "transaction_no", "transactionNo", "referenceNumber"),
      },
      {
        headerName: "Amount (₹)",
        width: 110,
        type: "rightAligned",
        valueGetter: (p) =>
          amt(pick(p.data, "receipt_amount", "receiptAmount") || 0),
      },
      {
        headerName: "Print",
        width: 80,
        flex: 0,
        cellRenderer: (p: ICellRendererParams<ReceiptRow>) => (
          <button
            type="button"
            className="inline-flex items-center justify-center text-[#e91e63] hover:text-[#c2185b]"
            title="Print Receipt"
            onClick={() => {
              if (!p.data) return;
              storeFeeReceiptPrint({
                ...p.data,
                collegeId,
                returnPath: `/student-fees/fees-due/view-fee-data?${searchParams.toString()}`,
              });
              router.push(FEE_RECEIPT_PRINT_PATH);
            }}
          >
            <Printer className="h-4 w-4" />
          </button>
        ),
      },
    ],
    [collegeId, router, searchParams],
  );

  const balanceDue = getFinalBalance(feeData);
  const showTotals = Boolean(feeData) && Number(feeData?.balanceAmount ?? 0) > 0;

  return (
    <FilteredPage
      title="Fee Details"
      filtersCollapsible={false}
      filters={
        <div className="space-y-3">
          {student ? <FeeStudentProfileCard student={student} /> : null}
          {feeData || courseYearNo ? (
            <div className="rounded-sm bg-[#c3d9ff] px-3 py-2">
              <p className="text-[17px] font-medium text-blue-700">
                {courseYearNo
                  ? `${courseYearNo} Year Fees`
                  : (searchParams.get("courseYearName") ?? "Year Fees")}
              </p>
            </div>
          ) : null}
          {showTotals ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <p className="text-[16px]">
                Total amount to pay (₹) :{" "}
                <span className="font-bold">{amt(feeData?.netAmount)}</span>
              </p>
              <p className="text-[16px]">
                Total amount paid (₹) :{" "}
                <span className="font-bold">{amt(feeData?.paidAmount)}</span>
              </p>
              <p className="text-[16px]">
                Total due amount (₹) :{" "}
                <span className="font-bold text-[#ff7d0d]">
                  {balanceDue >= 0 ? amt(balanceDue) : ""}
                </span>
              </p>
            </div>
          ) : null}
        </div>
      }
      body={
        <div className="space-y-5">
          <div className="overflow-x-auto rounded-[10px] border border-[#b8d0f0] bg-white">
            {isLoading ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">
                Loading particulars…
              </p>
            ) : (
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr className="bg-[#c3d9ff]">
                    <th className="border border-[#b8d0f0] px-3 py-2 text-left font-semibold">
                      Sl No
                    </th>
                    <th className="border border-[#b8d0f0] px-3 py-2 text-left font-semibold">
                      Particulars
                    </th>
                    <th className="border border-[#b8d0f0] px-3 py-2 text-right font-semibold">
                      Gross Amt (₹)
                    </th>
                    <th className="border border-[#b8d0f0] px-3 py-2 text-right font-semibold">
                      LateFee (₹)
                    </th>
                    <th className="border border-[#b8d0f0] px-3 py-2 text-right font-semibold">
                      Paid Amt (₹)
                    </th>
                    <th className="border border-[#b8d0f0] px-3 py-2 text-right font-semibold">
                      Bal Amt (₹)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {particularTableRows.map((row, idx) => {
                    if (row.kind === "group") {
                      return (
                        <tr key={`g-${row.label}-${idx}`} className="bg-[#c3d9ff]">
                          <td className="border border-[#b8d0f0] px-3 py-2" />
                          <td
                            className="border border-[#b8d0f0] px-3 py-2 font-bold"
                            colSpan={5}
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
                    const bal = getFinalBalance(particular);
                    return (
                      <tr key={`d-${siNo}-${label}`}>
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
                          {amt(particular.fineAmount)}
                        </td>
                        <td className="border border-[#b8d0f0] px-3 py-2 text-right">
                          {amt(particular.paidAmount)}
                        </td>
                        <td className="border border-[#b8d0f0] px-3 py-2 text-right">
                          {bal >= 0 ? amt(bal) : ""}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {receiptRows.length > 0 || loadingReceipts ? (
            <TableCard
              headerLeft={
                <span className="text-sm font-medium">Fee Receipts</span>
              }
            >
              <DataTable
                columnDefs={receiptCols}
                rowData={receiptRows}
                loading={loadingReceipts}
                height="auto"
                toolbar={false}
                pagination={false}
              />
            </TableCard>
          ) : null}

          <div className="flex justify-end">
            <Button
              type="button"
              className="h-9 min-w-[88px] bg-[#f0c040] px-5 text-[13px] font-medium text-slate-900 hover:bg-[#e5b535]"
              onClick={() => router.push("/student-fees/fees-due")}
            >
              Back
            </Button>
          </div>
        </div>
      }
    />
  );
}

export default function StudentFeesViewFeeDataPage() {
  return (
    <Suspense fallback={null}>
      <ViewFeeDataContent />
    </Suspense>
  );
}
