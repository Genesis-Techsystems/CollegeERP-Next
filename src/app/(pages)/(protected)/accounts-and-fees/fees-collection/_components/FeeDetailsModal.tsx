"use client";

import { useMemo } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { useQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import { DataTable } from "@/common/components/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QK } from "@/lib/query-keys";
import { rowIndexGetter } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { getFeeStudentData, listStudentFeeReceiptDetails } from "@/services";
import type {
  FeeStudentParticularRow,
  StudentFeeSearchRow,
  StudentFeeStructureRow,
} from "@/types/fees-collection";
import {
  FEE_RECEIPT_PRINT_PATH,
  storeFeeReceiptPrint,
} from "../_lib/fee-receipt-print";

export type FeeDetailsModalTarget = {
  row: StudentFeeStructureRow;
  student: StudentFeeSearchRow;
};

/** Stored-proc receipt row (Angular `fee_student_receipt_details`). */
type StudentFeeReceiptDetailRow = {
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

const PARTICULAR_COLS: ColDef<FeeStudentParticularRow>[] = [
  { headerName: "SI.No", valueGetter: rowIndexGetter, width: 70, flex: 0 },
  {
    headerName: "Particular",
    minWidth: 200,
    valueGetter: (p) => {
      const row = p.data;
      if (!row) return "";
      const cat = row.categoryName ?? "";
      const name = row.particularsName ?? "";
      return cat && name ? `${cat} - ${name}` : cat || name;
    },
  },
  {
    headerName: "Gross Amt",
    width: 100,
    valueGetter: (p) => amt(p.data?.grossAmount),
  },
  {
    headerName: "Dis Amt",
    width: 90,
    valueGetter: (p) => amt(p.data?.discountAmount),
  },
  {
    headerName: "LateFee",
    width: 90,
    valueGetter: (p) => amt(p.data?.fineAmount),
  },
  {
    headerName: "RTF Hold Amt",
    width: 110,
    valueGetter: (p) => amt(p.data?.scholarshipHoldAmount),
  },
  {
    headerName: "RTF Amt",
    width: 90,
    valueGetter: (p) => amt(p.data?.scholarshipAmount),
  },
  {
    headerName: "Net Amt",
    width: 90,
    valueGetter: (p) => amt(p.data?.netAmount),
  },
  {
    headerName: "Paid Amt",
    width: 90,
    valueGetter: (p) => amt(p.data?.paidAmount),
  },
  {
    headerName: "Bal Amt",
    width: 90,
    valueGetter: (p) => amt(p.data?.balanceAmount),
  },
];

export function FeeDetailsModal({
  open,
  onClose,
  target,
}: {
  open: boolean;
  onClose: () => void;
  target: FeeDetailsModalTarget | null;
}) {
  const router = useRouter();
  const student = target?.student;
  const row = target?.row;
  const collegeId = Number(student?.collegeId ?? 0);
  const academicYearId = Number(row?.academicYearId ?? 0);
  const studentId = Number(row?.studentId ?? student?.studentId ?? 0);
  const feeStructureId = Number(row?.feeStructureId ?? 0);
  const courseYearId = Number(row?.courseYearId ?? 0);

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
      open &&
      collegeId > 0 &&
      academicYearId > 0 &&
      studentId > 0 &&
      feeStructureId > 0,
  });

  const { data: receipts = [], isLoading: loadingReceipts } = useQuery({
    queryKey: [
      ...QK.feesCollection.receipts(studentId, collegeId, academicYearId),
      courseYearId,
      "fee-details-modal",
    ],
    queryFn: () =>
      listStudentFeeReceiptDetails({
        collegeId,
        academicYearId,
        studentId,
        courseYearId,
      }),
    enabled: open && collegeId > 0 && academicYearId > 0 && studentId > 0,
  });

  const receiptRows = receipts as StudentFeeReceiptDetailRow[];

  const particulars = useMemo<FeeStudentParticularRow[]>(() => {
    const list =
      feeData?.feeStudentDataParticulars ?? feeData?.feeStudentWiseParticulars;
    return Array.isArray(list) ? list : [];
  }, [feeData]);

  const receiptCols = useMemo<ColDef<StudentFeeReceiptDetailRow>[]>(
    () => [
      { headerName: "SI No.", valueGetter: rowIndexGetter, width: 70, flex: 0 },
      {
        headerName: "Receipt No.",
        minWidth: 110,
        valueGetter: (p) =>
          pick(p.data, "payment_receipts_no", "paymentReceiptsNo") || "—",
      },
      {
        headerName: "Payment Date",
        minWidth: 160,
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
        cellRenderer: (p: ICellRendererParams<StudentFeeReceiptDetailRow>) => (
          <button
            type="button"
            className="inline-flex items-center justify-center text-[#e91e63] hover:text-[#c2185b]"
            title="Print Receipt"
            onClick={() => {
              if (!p.data) return;
              storeFeeReceiptPrint({ ...p.data, collegeId });
              onClose();
              router.push(FEE_RECEIPT_PRINT_PATH);
            }}
          >
            <Printer className="h-4 w-4" />
          </button>
        ),
      },
    ],
    [collegeId, onClose, router],
  );

  const collegeLine = [
    student?.collegeCode,
    row?.academicYear ?? feeData?.studentAcademicYear ?? feeData?.academicYear,
  ]
    .filter(Boolean)
    .join(" / ");

  const courseLine = [
    row?.courseName,
    row?.groupName ?? feeData?.studentGroupCode,
    row?.courseYearName ?? feeData?.studentCourseYearName,
    (() => {
      const section =
        row?.section ?? student?.section ?? feeData?.studentSection;
      return section ? `section - ${section}` : "";
    })(),
  ]
    .filter(Boolean)
    .join(" / ");

  const studentName =
    student?.firstName ?? feeData?.firstName ?? row?.firstName ?? "";
  const studentIdLabel =
    student?.rollNumber ||
    student?.hallticketNumber ||
    String(row?.rollNumber ?? "") ||
    "";

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden rounded-sm sm:max-w-5xl sm:rounded-sm">
        <DialogHeader>
          <DialogTitle>Fee Details</DialogTitle>
          <DialogDescription className="sr-only">
            Fee structure particulars and receipts
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto py-1 text-sm [&_.app-data-table-card]:rounded-none">
          <div className="space-y-1.5 rounded-sm border bg-muted/30 px-3 py-2 text-[13px]">
            <p>
              <span className="text-muted-foreground">College : </span>
              <span className="font-medium text-blue-700">
                {collegeLine || "—"}
              </span>
            </p>
            <p>
              <span className="text-muted-foreground">Course : </span>
              <span className="font-medium text-blue-700">
                {courseLine || "—"}
              </span>
            </p>
            <p>
              <span className="text-muted-foreground">Fee Structure : </span>
              <span className="font-medium text-blue-700">
                {row?.structureName ?? row?.classGroupName ?? "—"}
              </span>
            </p>
            <p>
              <span className="text-muted-foreground">Student : </span>
              <span className="font-medium text-blue-700">
                {studentName}
                {studentIdLabel ? ` (${studentIdLabel})` : ""}
              </span>
            </p>
          </div>

          <DataTable
            columnDefs={PARTICULAR_COLS}
            rowData={particulars}
            loading={isLoading}
            height="auto"
            toolbar={false}
            pagination={false}
          />

          <div className="space-y-2">
            <h3 className="text-base font-semibold">Fee Receipts</h3>
            <DataTable
              columnDefs={receiptCols}
              rowData={receiptRows}
              loading={loadingReceipts}
              height="auto"
              toolbar={false}
              pagination={false}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 min-w-[5.5rem]"
            onClick={onClose}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
