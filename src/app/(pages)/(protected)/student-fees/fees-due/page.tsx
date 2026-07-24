"use client";

/**
 * Angular `student-fees/fees-due` → `FeesDueComponent`.
 * Student portal: loads the logged-in student and their fee structures.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { setSecuredValue } from "@/common/generic-functions";
import { useSession } from "@/hooks/useSession";
import { QK } from "@/lib/query-keys";
import { toastError, toastInfo } from "@/lib/toast";
import {
  fetchStudentDetail,
  fetchStudentDetailByUserId,
  listStudentFeeStructuresByStudent,
} from "@/services";
import type {
  StudentFeeSearchRow,
  StudentFeeStructureRow,
} from "@/types/fees-collection";
import { FeeStudentProfileCard } from "@/app/(pages)/(protected)/accounts-and-fees/fees-collection/_components/FeeStudentProfileCard";
import { buildPayFeesSearchParams } from "@/app/(pages)/(protected)/accounts-and-fees/fees-collection/_lib/pay-fees-params";

const YELLOW_BTN =
  "h-[30px] bg-[#f0c040] px-4 text-[12px] font-medium text-slate-900 hover:bg-[#e5b535]";
const VIEW_BTN =
  "h-[30px] bg-[#00b8ff] px-4 text-[12px] font-medium text-white hover:bg-[#00a6e6]";

const PAY_PAGE = "fees-due/fee-payment";
const VIEW_PAGE = "fees-due/view-fee-data";
const FEE_PAYMENT_PATH = "/student-fees/fees-due/fee-payment";
const VIEW_FEE_DATA_PATH = "/student-fees/fees-due/view-fee-data";

type AnyRow = Record<string, unknown>;

function num(row: AnyRow, keys: string[]): number {
  for (const key of keys) {
    const v = row[key];
    if (v != null && v !== "" && Number.isFinite(Number(v))) return Number(v);
  }
  return 0;
}

function txt(row: AnyRow, keys: string[]): string {
  for (const key of keys) {
    const v = row[key];
    if (v != null && String(v).trim() !== "") return String(v);
  }
  return "";
}

function amtValue(v: unknown): string {
  if (v == null || v === "") return "0";
  const n = Number(v);
  return Number.isFinite(n) ? String(n) : String(v);
}

/** Angular `getFinalBalance` — balance − scholarship hold + scholarship. */
function getFinalBalance(
  item: StudentFeeStructureRow | Record<string, unknown> | null | undefined,
): number {
  if (!item) return 0;
  const row = item as Record<string, unknown>;
  const bal = Number(row.balanceAmount) || 0;
  const hold = Number(row.scholarshipHoldAmount) || 0;
  const sch = Number(row.scholarshipAmount) || 0;
  return bal - hold + sch;
}

function feeBalanceSource(
  row: StudentFeeStructureRow,
): StudentFeeStructureRow | Record<string, unknown> {
  const dto = row.feeStudentDataDTO;
  if (dto && typeof dto === "object") return dto as Record<string, unknown>;
  return row;
}

function getFirstUnpaidIndex(rows: StudentFeeStructureRow[]): number {
  return rows.findIndex((item) => getFinalBalance(feeBalanceSource(item)) > 0);
}

/** Angular `canShowPayment` — Payment only on the first year with a positive final balance. */
function canShowPayment(
  index: number,
  row: StudentFeeStructureRow,
  rows: StudentFeeStructureRow[],
): boolean {
  const firstUnpaid = getFirstUnpaidIndex(rows);
  if (firstUnpaid === -1) return false;
  return index === firstUnpaid && getFinalBalance(feeBalanceSource(row)) > 0;
}

function toStudentFeeSearchRow(row: AnyRow): StudentFeeSearchRow {
  const studentId = num(row, ["studentId", "studentDetailId", "id"]);
  return {
    studentId,
    firstName: txt(row, ["firstName", "studentName", "name"]) || undefined,
    rollNumber: txt(row, ["rollNumber", "rollNo"]) || undefined,
    hallticketNumber:
      txt(row, ["hallticketNumber", "hallTicketNumber", "rollNumber"]) ||
      undefined,
    collegeId: num(row, ["collegeId"]) || undefined,
    collegeCode: txt(row, ["collegeCode"]) || undefined,
    academicYear: txt(row, ["academicYear", "academicYearName"]) || undefined,
    courseCode: txt(row, ["courseCode", "courseName"]) || undefined,
    groupCode: txt(row, ["groupCode", "courseGroupCode"]) || undefined,
    courseYearName:
      txt(row, ["courseYearName", "fromCourseYearName"]) || undefined,
    section: txt(row, ["section", "sectionName"]) || undefined,
    mobile: txt(row, ["mobile", "mobileNumber"]) || undefined,
    studentPhotoPath: txt(row, ["studentPhotoPath"]) || undefined,
    quotaDisplayName: txt(row, ["quotaDisplayName", "quotaName"]) || undefined,
    studentStatusCode: txt(row, ["studentStatusCode"]) || undefined,
    studentStatusDisplayName:
      txt(row, ["studentStatusDisplayName", "studentStatusName"]) || undefined,
    isLateral: Boolean(row.isLateral),
  };
}

function courseYearRenderer(p: ICellRendererParams<StudentFeeStructureRow>) {
  const row = p.data;
  if (!row) return null;
  const yearNo = row.courseYearNo;
  const yearLabel =
    yearNo != null && Number(yearNo) > 0
      ? `${yearNo} year`
      : (row.courseYearName ?? "—");
  return (
    <span>
      <span className="text-[15px] font-medium">{yearLabel}</span>
      {row.academicYear ? (
        <>
          {" "}
          (<span className="font-medium text-blue-600">{row.academicYear}</span>
          )
        </>
      ) : null}
    </span>
  );
}

export default function StudentFeesDuePage() {
  const router = useRouter();
  const { user, isLoading: sessionLoading } = useSession();
  const [student, setStudent] = useState<StudentFeeSearchRow | null>(null);
  const [loadingStudent, setLoadingStudent] = useState(true);

  const studentId = student?.studentId ?? 0;

  const loadStudent = useCallback(async () => {
    if (!user) return;
    setLoadingStudent(true);
    try {
      let row: AnyRow | null = null;
      if (user.studentId) {
        row = (await fetchStudentDetail(user.studentId)) as AnyRow | null;
      }
      if (!row && user.userId) {
        row = (await fetchStudentDetailByUserId(user.userId)) as AnyRow | null;
      }
      if (!row) {
        toastInfo("Could not load your student profile.");
        setStudent(null);
        return;
      }
      setStudent(toStudentFeeSearchRow(row));
    } catch (e) {
      toastError(e, "Failed to load student details");
      setStudent(null);
    } finally {
      setLoadingStudent(false);
    }
  }, [user]);

  useEffect(() => {
    if (!sessionLoading && user) void loadStudent();
  }, [sessionLoading, user, loadStudent]);

  const {
    data: feeRows = [],
    isLoading: loadingFees,
  } = useQuery({
    queryKey: QK.feesCollection.studentStructures(studentId),
    queryFn: () => listStudentFeeStructuresByStudent(studentId),
    enabled: studentId > 0,
  });

  const goView = useCallback(
    (row: StudentFeeStructureRow) => {
      if (!student) return;
      const params = buildPayFeesSearchParams(
        student,
        {
          ...row,
          section: row.section ?? student.section,
        },
        VIEW_PAGE,
      );
      router.push(`${VIEW_FEE_DATA_PATH}?${params.toString()}`);
    },
    [student, router],
  );

  const goPay = useCallback(
    (row: StudentFeeStructureRow) => {
      if (!student) return;
      const params = buildPayFeesSearchParams(student, row, PAY_PAGE);
      const req: Record<string, string> = {};
      params.forEach((value, key) => {
        req[key] = value;
      });
      setSecuredValue("paymentRedirectUrl", FEE_PAYMENT_PATH);
      setSecuredValue("payFeeDueDetails", req);
      router.push(`${FEE_PAYMENT_PATH}?${params.toString()}`);
    },
    [student, router],
  );

  const columnDefs = useMemo<ColDef<StudentFeeStructureRow>[]>(
    () => [
      {
        headerName: "Course Year",
        minWidth: 180,
        cellRenderer: courseYearRenderer,
      },
      {
        headerName: "Gross Amt",
        width: 110,
        valueGetter: (p) => amtValue(p.data?.grossAmount),
      },
      {
        headerName: "LateFee",
        width: 100,
        valueGetter: (p) => amtValue(p.data?.fineAmount),
      },
      {
        headerName: "Net Amt",
        width: 100,
        valueGetter: (p) => amtValue(p.data?.netAmount),
      },
      {
        headerName: "Paid Amt",
        width: 100,
        valueGetter: (p) => amtValue(p.data?.paidAmount),
      },
      {
        headerName: "Balance Due",
        width: 120,
        cellClass: "font-medium",
        valueGetter: (p) => {
          if (!p.data) return "";
          const bal = getFinalBalance(feeBalanceSource(p.data));
          return bal >= 0 ? amtValue(bal) : "";
        },
      },
      {
        headerName: "Fee Details",
        minWidth: 110,
        flex: 0,
        width: 120,
        cellRenderer: (p: ICellRendererParams<StudentFeeStructureRow>) => (
          <Button
            type="button"
            size="sm"
            className={VIEW_BTN}
            onClick={() => p.data && goView(p.data)}
          >
            View
          </Button>
        ),
      },
      {
        headerName: "Payment",
        minWidth: 110,
        flex: 0,
        width: 120,
        cellRenderer: (p: ICellRendererParams<StudentFeeStructureRow>) => {
          const row = p.data;
          if (!row) return null;
          const index = p.node?.rowIndex ?? -1;
          if (index < 0 || !canShowPayment(index, row, feeRows)) return null;
          return (
            <Button
              type="button"
              size="sm"
              className={YELLOW_BTN}
              onClick={() => goPay(row)}
            >
              Payment
            </Button>
          );
        },
      },
    ],
    [feeRows, goView, goPay],
  );

  const loading = sessionLoading || loadingStudent || (studentId > 0 && loadingFees);
  const showEmptyNote = Boolean(student) && !loadingFees && feeRows.length === 0;

  return (
    <FilteredListPage
      title="Fee Due/Paid"
      filters={
        student ? (
          <div className="space-y-3">
            <FeeStudentProfileCard student={student} />
            {showEmptyNote ? (
              <p className="text-sm text-muted-foreground">No fee dues.</p>
            ) : null}
          </div>
        ) : loadingStudent || sessionLoading ? (
          <p className="text-sm text-muted-foreground">Loading student…</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Student profile not available.
          </p>
        )
      }
      columnDefs={columnDefs}
      rowData={student && studentId > 0 ? feeRows : []}
      loading={loading && studentId > 0}
      height="auto"
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: "Search fee data…",
        exportExcel: true,
        exportPdf: true,
      }}
    >
      {feeRows.length > 0 ? (
        <p className="text-sm text-red-600">
          Note: The above fees particulars may be correlated in the fees counter
          A Block for any variation.
        </p>
      ) : null}
    </FilteredListPage>
  );
}
