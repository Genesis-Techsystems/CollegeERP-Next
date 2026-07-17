"use client";

import { useCallback, useMemo, useState } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { format, parseISO } from "date-fns";
import { BookOpen, Printer, X } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Select } from "@/common/components/select";
import { ConfirmDialog } from "@/common/components/feedback";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DATE_FORMATS } from "@/config/constants/app";
import { QK } from "@/lib/query-keys";
import { rowIndexGetter } from "@/lib/utils";
import { toastError, toastInfo, toastSuccess } from "@/lib/toast";
import {
  deleteFeeReceipt,
  listActiveCollegesForGeneralSettings,
  listAcademicYearsByUniversity,
  listFeeReceiptsForStudent,
  printStudentFeeReceiptDownload,
} from "@/services";
import type { College } from "@/types/college";
import type {
  FeeReceiptRow,
  StudentFeeSearchRow,
} from "@/types/fees-collection";
import { FeeStudentSearchSelect } from "../_components/FeeStudentSearchSelect";

const COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<FeeReceiptRow>,
  student: {
    field: "studentName",
    headerName: "Student",
    minWidth: 160,
  } as ColDef<FeeReceiptRow>,
  academicYear: {
    field: "academicYear",
    headerName: "Academic Year",
    minWidth: 120,
  } as ColDef<FeeReceiptRow>,
  feeStructure: {
    headerName: "Fee Structure",
    minWidth: 160,
    valueGetter: (p) =>
      String(p.data?.classGroupName ?? p.data?.structureName ?? ""),
  } as ColDef<FeeReceiptRow>,
  receiptNo: {
    headerName: "Fee Receipt",
    minWidth: 120,
    valueGetter: (p) =>
      String(p.data?.paymentReceiptsNo ?? p.data?.feeReceiptsId ?? ""),
  } as ColDef<FeeReceiptRow>,
  paymentDate: {
    headerName: "Payment Date",
    minWidth: 120,
  } as ColDef<FeeReceiptRow>,
  paymentFor: {
    field: "paymentFor",
    headerName: "Payment Notes",
    minWidth: 140,
  } as ColDef<FeeReceiptRow>,
  reference: {
    headerName: "Reference No.",
    minWidth: 130,
  } as ColDef<FeeReceiptRow>,
  amount: {
    field: "receiptAmount",
    headerName: "Amount",
    minWidth: 100,
  } as ColDef<FeeReceiptRow>,
  actions: {
    headerName: "Actions",
    minWidth: 90,
    flex: 0,
    width: 90,
  } as ColDef<FeeReceiptRow>,
};

function formatReceiptDate(value: unknown): string {
  if (value == null || value === "") return "—";
  const raw = String(value);
  try {
    const d = raw.includes("T") ? parseISO(raw) : new Date(raw);
    if (Number.isNaN(d.getTime())) return raw;
    return format(d, DATE_FORMATS.DISPLAY);
  } catch {
    return raw;
  }
}

function paymentDateRenderer(p: ICellRendererParams<FeeReceiptRow>) {
  return (
    <span>{formatReceiptDate(p.data?.receiptDt ?? p.data?.createdDt)}</span>
  );
}

function referenceRenderer(p: ICellRendererParams<FeeReceiptRow>) {
  const row = p.data;
  if (!row) return null;
  const ref =
    row.referenceNumber ?? row.ddno ?? row.transactionNo ?? row.chequeNo ?? "";
  return <span>{ref ? String(ref) : "—"}</span>;
}

function toOptions(
  rows: Array<Record<string, unknown>>,
  valueKey: string,
  labelKeys: string[],
) {
  return rows
    .map((r) => {
      const value = Number(r[valueKey] ?? 0);
      if (!value) return null;
      let label = "";
      for (const k of labelKeys) {
        if (r[k] != null && String(r[k]).trim() !== "") {
          label = String(r[k]);
          break;
        }
      }
      return { value: String(value), label: label || String(value) };
    })
    .filter((o): o is { value: string; label: string } => o != null);
}

function makeDeleteRenderer(onDelete: (row: FeeReceiptRow) => void) {
  return (p: ICellRendererParams<FeeReceiptRow>) => (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
      title="Receipt Delete"
      onClick={() => p.data && onDelete(p.data)}
    >
      <X className="h-4 w-4" />
    </Button>
  );
}

export default function FeeReceiptUpdatePage() {
  const queryClient = useQueryClient();
  const [collegeId, setCollegeId] = useState<string | null>(null);
  const [academicYearId, setAcademicYearId] = useState<string | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] =
    useState<StudentFeeSearchRow | null>(null);
  const [deleteRow, setDeleteRow] = useState<FeeReceiptRow | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [printing, setPrinting] = useState(false);

  const { data: colleges = [], isLoading: loadingColleges } = useQuery({
    queryKey: ["FeeReceiptUpdate", "colleges"],
    queryFn: listActiveCollegesForGeneralSettings,
  });

  const selectedCollege = useMemo(
    () => colleges.find((c) => String(c.collegeId) === collegeId) ?? null,
    [colleges, collegeId],
  );
  const universityId = Number(selectedCollege?.universityId ?? 0);
  const collegeNum = Number(collegeId ?? 0);
  const ayNum = Number(academicYearId ?? 0);
  const studentNum = Number(studentId ?? 0);

  const { data: academicYears = [], isLoading: loadingAy } = useQuery({
    queryKey: ["FeeReceiptUpdate", "academicYears", universityId],
    queryFn: () => listAcademicYearsByUniversity(universityId),
    enabled: universityId > 0,
  });

  const receiptsQuery = useQuery({
    queryKey: QK.feesCollection.feeReceipts({
      studentId: studentNum,
      collegeId: collegeNum,
      academicYearId: ayNum,
    }),
    queryFn: () =>
      listFeeReceiptsForStudent({
        studentId: studentNum,
        collegeId: collegeNum,
        academicYearId: ayNum,
      }),
    enabled: studentNum > 0 && collegeNum > 0 && ayNum > 0,
  });

  const collegeOptions = useMemo(
    () =>
      colleges.map((c: College) => ({
        value: String(c.collegeId),
        label: c.collegeCode || c.collegeName || String(c.collegeId),
      })),
    [colleges],
  );

  const ayOptions = useMemo(
    () =>
      toOptions(
        academicYears as Array<Record<string, unknown>>,
        "academicYearId",
        ["academicYear"],
      ),
    [academicYears],
  );

  const handleStudentChange = useCallback(
    (id: string | null, student: StudentFeeSearchRow | null) => {
      setStudentId(id);
      setSelectedStudent(student);
    },
    [],
  );

  const columnDefs = useMemo<ColDef<FeeReceiptRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.student,
      COL_DEFS.academicYear,
      COL_DEFS.feeStructure,
      COL_DEFS.receiptNo,
      { ...COL_DEFS.paymentDate, cellRenderer: paymentDateRenderer },
      COL_DEFS.paymentFor,
      { ...COL_DEFS.reference, cellRenderer: referenceRenderer },
      COL_DEFS.amount,
      { ...COL_DEFS.actions, cellRenderer: makeDeleteRenderer(setDeleteRow) },
    ],
    [],
  );

  async function onConfirmDelete() {
    const id = Number(deleteRow?.feeReceiptsId ?? 0);
    const reason = deleteReason.trim();
    if (!id) return;
    if (!reason) {
      toastInfo("Reason is required.");
      return;
    }
    setDeleting(true);
    try {
      await deleteFeeReceipt(id, reason);
      toastSuccess("Fee receipt deleted successfully.");
      setDeleteRow(null);
      setDeleteReason("");
      await queryClient.invalidateQueries({
        queryKey: QK.feesCollection.feeReceipts({
          studentId: studentNum,
          collegeId: collegeNum,
          academicYearId: ayNum,
        }),
      });
    } catch (e) {
      toastError(e, "Failed to delete fee receipt");
    } finally {
      setDeleting(false);
    }
  }

  async function onPrint() {
    if (!studentNum) {
      toastInfo("Select a student to print receipts.");
      return;
    }
    setPrinting(true);
    try {
      await printStudentFeeReceiptDownload(studentNum);
    } catch (e) {
      toastError(e, "Unable to print receipts");
    } finally {
      setPrinting(false);
    }
  }

  const rows = receiptsQuery.data ?? [];

  return (
    <>
      <FilteredListPage<FeeReceiptRow>
        title="Fee Receipts Delete"
        filters={
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Select
              label="College"
              required
              value={collegeId}
              onChange={(v) => {
                setCollegeId(v);
                setAcademicYearId(null);
                setStudentId(null);
                setSelectedStudent(null);
              }}
              options={collegeOptions}
              placeholder="Select college"
              searchable
              isLoading={loadingColleges}
            />
            <Select
              label="Academic Year"
              required
              value={academicYearId}
              onChange={(v) => {
                setAcademicYearId(v);
                setStudentId(null);
                setSelectedStudent(null);
              }}
              options={ayOptions}
              placeholder="Select academic year"
              searchable
              disabled={!collegeId}
              isLoading={loadingAy}
            />
            <FeeStudentSearchSelect
              value={studentId}
              selectedStudent={selectedStudent}
              onChange={handleStudentChange}
              collegeId={collegeNum > 0 ? collegeNum : null}
              disabled={!collegeId || !academicYearId}
              placeholder="Search by student name or roll no."
            />
          </div>
        }
        rowData={studentNum > 0 && ayNum > 0 && collegeNum > 0 ? rows : []}
        columnDefs={columnDefs}
        loading={receiptsQuery.isLoading}
        height="auto"
        pagination
        toolbar={{ search: true, searchPlaceholder: "Search" }}
        toolbarTrailing={
          studentNum > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 w-9 p-0"
              title="Print Receipt"
              disabled={printing || rows.length === 0}
              onClick={() => void onPrint()}
            >
              <Printer className="h-4 w-4" />
            </Button>
          ) : undefined
        }
        getRowId={(p) =>
          String(
            p.data?.feeReceiptsId ??
              `${p.data?.paymentReceiptsNo ?? ""}-${p.data?.receiptAmount ?? ""}-${p.data?.studentName ?? ""}`,
          )
        }
      />

      <ConfirmDialog
        open={deleteRow != null}
        title="Confirmation"
        headerIcon={<BookOpen className="h-4 w-4" />}
        confirmLabel="Ok"
        cancelLabel="Close"
        confirmFirst
        confirmVariant="default"
        isLoading={deleting}
        contentClassName="sm:max-w-[750px]"
        onCancel={() => {
          if (deleting) return;
          setDeleteRow(null);
          setDeleteReason("");
        }}
        onConfirm={() => void onConfirmDelete()}
      >
        {deleteRow ? (
          <div className="space-y-3">
            <div className="space-y-1.5 rounded-md border p-3 text-sm">
              <p>
                <span className="text-muted-foreground">Student</span>
                {" : "}
                <span className="font-medium">
                  {String(deleteRow.studentName ?? "—")}
                  {deleteRow.studentRollNo != null
                    ? ` - ( ${String(deleteRow.studentRollNo)} )`
                    : ""}
                </span>
              </p>
              <p>
                <span className="text-muted-foreground">Academic Year</span>
                {" : "}
                <span className="font-medium">
                  {String(deleteRow.academicYear ?? "—")}
                </span>
              </p>
              <p>
                <span className="text-muted-foreground">Fee Structure</span>
                {" : "}
                <span className="font-medium">
                  {String(
                    deleteRow.classGroupName ?? deleteRow.structureName ?? "—",
                  )}
                </span>
              </p>
              <p>
                <span className="text-muted-foreground">Fee Receipt</span>
                {" : "}
                <span className="font-medium">
                  {String(
                    deleteRow.paymentReceiptsNo ??
                      deleteRow.feeReceiptsId ??
                      "—",
                  )}
                </span>
              </p>
              <p>
                <span className="text-muted-foreground">Payment Date</span>
                {" : "}
                <span className="font-medium">
                  {formatReceiptDate(
                    deleteRow.receiptDt ?? deleteRow.createdDt,
                  )}
                </span>
              </p>
              <p>
                <span className="text-muted-foreground">Amount</span>
                {" : "}
                <span className="font-medium">
                  {String(deleteRow.receiptAmount ?? "—")}
                </span>
              </p>
            </div>
            <p>Sure, you want to delete ?</p>
            <div className="space-y-1.5">
              <Label htmlFor="receipt-delete-reason">Reason</Label>
              <Input
                id="receipt-delete-reason"
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="Reason"
                required
              />
            </div>
          </div>
        ) : null}
      </ConfirmDialog>
    </>
  );
}
