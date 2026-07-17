"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { useQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import { Select } from "@/common/components/select";
import { FilteredListPage } from "@/components/layout";
import { QK } from "@/lib/query-keys";
import { rowIndexGetter } from "@/lib/utils";
import { toastError } from "@/lib/toast";
import {
  listActiveCollegesForGeneralSettings,
  listAcademicYearsForCollege,
  listStudentFeeReceiptDetails,
  searchStudentsInCollege,
} from "@/services";
import type {
  FeeReceiptRow,
  StudentFeeSearchRow,
} from "@/types/fees-collection";
import {
  FEE_RECEIPTS_LIST_PATH,
  FEE_RECEIPTS_PRINT_PATH,
  storeFeeReceiptPrint,
} from "../_lib/fee-receipt-print";

function pick(
  row: Record<string, unknown> | undefined,
  ...keys: string[]
): string {
  if (!row) return "";
  for (const key of keys) {
    const v = row[key];
    if (v != null && String(v).trim() !== "") return String(v);
  }
  return "";
}

function studentOptionLabel(s: StudentFeeSearchRow): string {
  const name = s.firstName ?? "Student";
  const id = s.hallticketNumber ?? s.rollNumber ?? s.studentId;
  return id ? `${name} (${id})` : name;
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

function makePrintRenderer(onPrint: (row: FeeReceiptRow) => void) {
  return (p: ICellRendererParams<FeeReceiptRow>) => {
    if (!p.data) return null;
    return (
      <button
        type="button"
        className="inline-flex text-[#e91e63] hover:text-[#c2185b]"
        title="Print Receipt"
        onClick={() => onPrint(p.data!)}
      >
        <Printer className="h-4 w-4" />
      </button>
    );
  };
}

/** Angular `fees-collection/fee-receipts` → `FeeReceiptsComponent`. */
export default function FeeReceiptsPage() {
  const router = useRouter();
  const [collegeId, setCollegeId] = useState<string | null>(null);
  const [academicYearId, setAcademicYearId] = useState<string | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [studentRows, setStudentRows] = useState<StudentFeeSearchRow[]>([]);
  const [selectedStudent, setSelectedStudent] =
    useState<StudentFeeSearchRow | null>(null);
  const [studentSearchLoading, setStudentSearchLoading] = useState(false);

  const collegeNum = Number(collegeId ?? 0);
  const yearNum = Number(academicYearId ?? 0);
  const studentNum = Number(studentId ?? 0);

  const { data: colleges = [], isLoading: loadingColleges } = useQuery({
    queryKey: ["FeesCollection", "feeReceipts", "colleges"],
    queryFn: listActiveCollegesForGeneralSettings,
  });

  const { data: academicYears = [], isLoading: loadingYears } = useQuery({
    queryKey: QK.feesCollection.feeReceipts({
      collegeId: collegeNum,
      kind: "years",
    }),
    queryFn: () => listAcademicYearsForCollege(collegeNum),
    enabled: collegeNum > 0,
  });

  const {
    data: receipts = [],
    isLoading: loadingReceipts,
    isFetching: fetchingReceipts,
  } = useQuery({
    queryKey: QK.feesCollection.feeReceiptDetails({
      collegeId: collegeNum,
      academicYearId: yearNum,
      studentId: studentNum,
    }),
    queryFn: () =>
      listStudentFeeReceiptDetails({
        collegeId: collegeNum,
        academicYearId: yearNum,
        studentId: studentNum,
      }),
    enabled: collegeNum > 0 && yearNum > 0 && studentNum > 0,
  });

  useEffect(() => {
    if (collegeId || colleges.length === 0) return;
    setCollegeId(String(colleges[0].collegeId));
  }, [colleges, collegeId]);

  useEffect(() => {
    if (!collegeNum || academicYears.length === 0) return;
    if (
      academicYearId &&
      academicYears.some((y) => String(y.academicYearId) === academicYearId)
    ) {
      return;
    }
    setAcademicYearId(String(academicYears[0].academicYearId));
  }, [academicYears, academicYearId, collegeNum]);

  const collegeOptions = useMemo(
    () =>
      colleges.map((c) => ({
        value: String(c.collegeId),
        label: c.collegeCode ?? c.collegeName ?? String(c.collegeId),
      })),
    [colleges],
  );

  const yearOptions = useMemo(
    () =>
      academicYears.map((y) => ({
        value: String(y.academicYearId),
        label: String(y.academicYear ?? y.academicYearId),
      })),
    [academicYears],
  );

  const studentOptions = useMemo(() => {
    const base = studentRows.map((s) => ({
      value: String(s.studentId),
      label: studentOptionLabel(s),
    }));
    if (
      studentId &&
      selectedStudent &&
      !base.some((o) => o.value === studentId)
    ) {
      return [
        { value: studentId, label: studentOptionLabel(selectedStudent) },
        ...base,
      ];
    }
    return base;
  }, [studentRows, studentId, selectedStudent]);

  const onStudentSearch = useCallback(
    async (term: string) => {
      const q = term.trim();
      if (!collegeNum || q.length < 5) {
        setStudentRows([]);
        return;
      }
      setStudentSearchLoading(true);
      try {
        const rows = await searchStudentsInCollege(collegeNum, q);
        setStudentRows(Array.isArray(rows) ? rows : []);
      } catch (e) {
        toastError(e, "Student search failed");
        setStudentRows([]);
      } finally {
        setStudentSearchLoading(false);
      }
    },
    [collegeNum],
  );

  function handleCollegeChange(v: string | null) {
    setCollegeId(v);
    setAcademicYearId(null);
    setStudentId(null);
    setSelectedStudent(null);
    setStudentRows([]);
  }

  function handleYearChange(v: string | null) {
    setAcademicYearId(v);
    setStudentId(null);
    setSelectedStudent(null);
    setStudentRows([]);
  }

  function handleStudentChange(v: string | null) {
    setStudentId(v);
    if (!v) {
      setSelectedStudent(null);
      return;
    }
    const row =
      studentRows.find((s) => String(s.studentId) === v) ??
      (selectedStudent && String(selectedStudent.studentId) === v
        ? selectedStudent
        : null);
    setSelectedStudent(row);
  }

  const onPrint = useCallback(
    (row: FeeReceiptRow) => {
      storeFeeReceiptPrint({
        ...row,
        collegeId: collegeNum || undefined,
        returnPath: FEE_RECEIPTS_LIST_PATH,
        fk_student_id: studentNum || pick(row, "fk_student_id", "studentId"),
        student_name:
          pick(row, "student_name", "studentName") ||
          selectedStudent?.firstName ||
          "",
        hallticket_number:
          pick(row, "hallticket_number", "hallTicketNo", "rollNumber") ||
          selectedStudent?.hallticketNumber ||
          selectedStudent?.rollNumber ||
          "",
      });
      router.push(FEE_RECEIPTS_PRINT_PATH);
    },
    [collegeNum, router, selectedStudent, studentNum],
  );

  const columnDefs = useMemo<ColDef<FeeReceiptRow>[]>(
    () => [
      { headerName: "SI.No", valueGetter: rowIndexGetter, width: 70, flex: 0 },
      {
        headerName: "Student",
        minWidth: 180,
        valueGetter: (p) => pick(p.data, "student_name", "studentName") || "—",
      },
      {
        headerName: "Academic Year",
        minWidth: 130,
        valueGetter: (p) =>
          pick(p.data, "academic_year", "academicYear") || "—",
      },
      {
        headerName: "Fee Receipt",
        minWidth: 120,
        valueGetter: (p) =>
          pick(
            p.data,
            "payment_receipts_no",
            "paymentReceiptsNo",
            "feeReceiptsId_display",
          ) || "—",
      },
      {
        headerName: "Payment Date",
        minWidth: 170,
        valueGetter: (p) =>
          formatReceiptDate(
            pick(p.data, "receipt_date", "receiptDate", "createdDt"),
          ),
      },
      {
        headerName: "Merchant Reference No.",
        minWidth: 160,
        valueGetter: (p) =>
          pick(p.data, "transaction_no", "transactionNo", "referenceNumber") ||
          "—",
      },
      {
        headerName: "Amount",
        minWidth: 100,
        valueGetter: (p) =>
          pick(p.data, "receipt_amount", "receiptAmount") || "0",
      },
      {
        headerName: "Print",
        width: 90,
        flex: 0,
        cellRenderer: makePrintRenderer(onPrint),
      },
    ],
    [onPrint],
  );

  const showTable = collegeNum > 0 && yearNum > 0 && studentNum > 0;

  return (
    <FilteredListPage
      title="Fee Receipts"
      filters={
        <div className="grid max-w-5xl grid-cols-1 gap-4 md:grid-cols-3">
          <Select
            label="College"
            required
            value={collegeId}
            onChange={handleCollegeChange}
            options={collegeOptions}
            placeholder="Select college"
            searchable
            isLoading={loadingColleges}
          />
          <Select
            label="Academic Year"
            required
            value={academicYearId}
            onChange={handleYearChange}
            options={yearOptions}
            placeholder="Select academic year"
            searchable
            disabled={!collegeId}
            isLoading={loadingYears}
          />
          <Select
            label="Student"
            required
            value={studentId}
            onChange={handleStudentChange}
            options={studentOptions}
            placeholder="Search by student name or rollno."
            searchable
            onSearch={onStudentSearch}
            isLoading={studentSearchLoading}
            disabled={!collegeId || !academicYearId}
          />
        </div>
      }
      rowData={showTable ? receipts : []}
      columnDefs={columnDefs}
      loading={showTable && (loadingReceipts || fetchingReceipts)}
      height="auto"
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: "Search…",
      }}
    />
  );
}
