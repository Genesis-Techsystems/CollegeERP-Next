"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { Trash2Icon } from "lucide-react";
import { ConfirmDialog } from "@/common/components/feedback";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
import { Select } from "@/common/components/select";
import { StudentSearchSelect } from "@/common/components/student-search";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { toastError, toastSuccess } from "@/lib/toast";
import { rowIndexGetter } from "@/lib/utils";
import {
  deleteFeeReceipt,
  listAcademicYearsByUniversity,
  listActiveCollegesForGeneralSettings,
  listFeeReceiptsForStudent,
  searchStudentsInCollege,
} from "@/services";
import type { College } from "@/types/college";
import type {
  FeeReceiptRow,
  StudentFeeSearchRow,
} from "@/types/fees-collection";

function formatReceiptDate(value?: string): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const COL_DEFS = {
  siNo: {
    headerName: "S.No.",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<FeeReceiptRow>,
  student: {
    headerName: "Student",
    minWidth: 160,
    valueGetter: (p) => p.data?.studentName ?? "—",
  } as ColDef<FeeReceiptRow>,
  academicYear: {
    field: "academicYear",
    headerName: "Academic Year",
    minWidth: 120,
  } as ColDef<FeeReceiptRow>,
  feeStructure: {
    headerName: "Fee Structure",
    minWidth: 140,
    valueGetter: (p) => p.data?.classGroupName ?? p.data?.structureName ?? "—",
  } as ColDef<FeeReceiptRow>,
  feeReceipt: {
    headerName: "Fee Receipt",
    minWidth: 120,
    valueGetter: (p) =>
      p.data?.paymentReceiptsNo ??
      p.data?.feeReceiptsId_display ??
      p.data?.feeReceiptsId ??
      "—",
  } as ColDef<FeeReceiptRow>,
  paymentDate: {
    headerName: "Payment Date",
    minWidth: 120,
    valueGetter: (p) => formatReceiptDate(p.data?.createdDt),
  } as ColDef<FeeReceiptRow>,
  paymentNotes: {
    field: "paymentFor",
    headerName: "Payment Notes",
    minWidth: 140,
  } as ColDef<FeeReceiptRow>,
  referenceNo: {
    field: "referenceNumber",
    headerName: "Reference No.",
    minWidth: 120,
  } as ColDef<FeeReceiptRow>,
  amount: {
    field: "receiptAmount",
    headerName: "Amount",
    minWidth: 100,
  } as ColDef<FeeReceiptRow>,
  actions: {
    headerName: "Actions",
    minWidth: 90,
    width: 90,
    flex: 0,
  } as ColDef<FeeReceiptRow>,
};

/**
 * Angular fee-refunds filter cascade:
 * 1. College (active) → Academic Years by college.universityId
 * 2. Academic Year → clear student + receipts
 * 3. Student search: studentsearch?collegeId=&q= (min 5 chars, requires AY selected)
 * 4. Student select → feereceipts?studentId=&collegeId=&academicYearId=
 */
export default function FeeRefundsPage() {
  const [colleges, setColleges] = useState<College[]>([]);
  const [loadingColleges, setLoadingColleges] = useState(true);
  const [academicYears, setAcademicYears] = useState<
    { value: string; label: string }[]
  >([]);
  const [loadingYears, setLoadingYears] = useState(false);

  const [collegeId, setCollegeId] = useState<number | null>(null);
  const [academicYearId, setAcademicYearId] = useState<number | null>(null);
  const [studentId, setStudentId] = useState<number | null>(null);
  const [selectedStudent, setSelectedStudent] =
    useState<StudentFeeSearchRow | null>(null);

  const [studentRows, setStudentRows] = useState<StudentFeeSearchRow[]>([]);
  const [studentSearchLoading, setStudentSearchLoading] = useState(false);

  const [receipts, setReceipts] = useState<FeeReceiptRow[]>([]);
  const [loadingReceipts, setLoadingReceipts] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<FeeReceiptRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadingColleges(true);
      try {
        const rows = await listActiveCollegesForGeneralSettings();
        if (!cancelled) setColleges(rows ?? []);
      } catch (err) {
        if (!cancelled) toastError(err, "Failed to load colleges");
      } finally {
        if (!cancelled) setLoadingColleges(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const collegeOptions = useMemo(
    () =>
      colleges.map((c) => ({
        value: String(c.collegeId),
        label: c.collegeCode || c.collegeName || String(c.collegeId),
      })),
    [colleges],
  );

  const loadReceipts = useCallback(
    async (sid: number, cid: number, ayId: number) => {
      setLoadingReceipts(true);
      try {
        // Angular: feereceipts?studentId=&collegeId=&academicYearId=
        const rows = await listFeeReceiptsForStudent({
          studentId: sid,
          collegeId: cid,
          academicYearId: ayId,
        });
        setReceipts(Array.isArray(rows) ? rows : []);
      } catch (err) {
        setReceipts([]);
        toastError(err, "Failed to load fee receipts");
      } finally {
        setLoadingReceipts(false);
      }
    },
    [],
  );

  async function onCollegeChange(value: string | null) {
    const next = value ? Number(value) : null;
    setCollegeId(next);
    setAcademicYearId(null);
    setStudentId(null);
    setSelectedStudent(null);
    setStudentRows([]);
    setReceipts([]);
    setAcademicYears([]);
    if (!next) return;

    // Angular: academic years by college.universityId, sorted fromDate DESC
    const universityId = Number(
      colleges.find((c) => c.collegeId === next)?.universityId ?? 0,
    );
    if (!universityId) {
      toastError("University not found for selected college");
      return;
    }

    setLoadingYears(true);
    try {
      const years = await listAcademicYearsByUniversity(universityId);
      setAcademicYears(
        (years ?? [])
          .map((y) => ({
            value: String(y.academicYearId ?? ""),
            label: String(y.academicYear ?? y.academicYearId ?? ""),
          }))
          .filter((o) => o.value && o.value !== "0"),
      );
    } catch (err) {
      toastError(err, "Failed to load academic years");
    } finally {
      setLoadingYears(false);
    }
  }

  function onAcademicYearChange(value: string | null) {
    // Angular selectedAcademicYear: clear student + receipts
    setAcademicYearId(value ? Number(value) : null);
    setStudentId(null);
    setSelectedStudent(null);
    setStudentRows([]);
    setReceipts([]);
  }

  const onStudentSearch = useCallback(
    async (term: string) => {
      // Angular enteredStudent: requires academicYearId and q length > 4
      if (!collegeId || !academicYearId) return;
      const q = term.trim();
      if (q.length < 5) {
        setStudentRows([]);
        return;
      }
      setStudentSearchLoading(true);
      try {
        // Angular: studentsearch?collegeId=&q=
        const rows = await searchStudentsInCollege(collegeId, q);
        setStudentRows(Array.isArray(rows) ? rows : []);
      } catch (err) {
        toastError(err, "Student search failed");
        setStudentRows([]);
      } finally {
        setStudentSearchLoading(false);
      }
    },
    [collegeId, academicYearId],
  );

  function onStudentSelect(
    nextId: number | null,
    student: StudentFeeSearchRow | null,
  ) {
    setStudentId(nextId);
    setSelectedStudent(student);
    if (!nextId) {
      setReceipts([]);
      setStudentRows([]);
      return;
    }
    if (collegeId && academicYearId) {
      void loadReceipts(nextId, collegeId, academicYearId);
    }
  }

  async function confirmDelete() {
    const id = Number(deleteTarget?.feeReceiptsId ?? 0);
    if (!id) return;
    setDeleting(true);
    try {
      await deleteFeeReceipt(id);
      toastSuccess("Fee receipt deleted");
      setDeleteTarget(null);
      if (studentId && collegeId && academicYearId) {
        await loadReceipts(studentId, collegeId, academicYearId);
      }
    } catch (err) {
      toastError(err, "Failed to delete fee receipt");
    } finally {
      setDeleting(false);
    }
  }

  const columnDefs = useMemo<ColDef<FeeReceiptRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.student,
      COL_DEFS.academicYear,
      COL_DEFS.feeStructure,
      COL_DEFS.feeReceipt,
      COL_DEFS.paymentDate,
      COL_DEFS.paymentNotes,
      COL_DEFS.referenceNo,
      COL_DEFS.amount,
      {
        ...COL_DEFS.actions,
        cellRenderer: (p: ICellRendererParams<FeeReceiptRow>) =>
          p.data?.feeReceiptsId ? (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-destructive"
              aria-label="Delete fee receipt"
              onClick={() => setDeleteTarget(p.data ?? null)}
            >
              <Trash2Icon className="h-3.5 w-3.5" />
            </Button>
          ) : null,
      },
    ],
    [],
  );

  const showTable = Boolean(studentId && collegeId && academicYearId);

  return (
    <FilteredListPage
      title="Fee Refunds"
      filters={
        <GlobalFilterBarRow>
          <GlobalFilterField label="College">
            <Select
              value={collegeId ? String(collegeId) : null}
              onChange={onCollegeChange}
              options={collegeOptions}
              placeholder="Select college"
              searchable
              isLoading={loadingColleges}
            />
          </GlobalFilterField>
          <GlobalFilterField label="Academic Year">
            <Select
              value={academicYearId ? String(academicYearId) : null}
              onChange={onAcademicYearChange}
              options={academicYears}
              placeholder="Select academic year"
              searchable
              disabled={!collegeId}
              isLoading={loadingYears}
            />
          </GlobalFilterField>
          <GlobalFilterField
            label="Student"
            className="min-w-[280px] flex-[1.6]"
          >
            <StudentSearchSelect
              label=""
              placeholder="Search by student name or rollno."
              value={studentId}
              students={studentRows}
              selectedStudent={selectedStudent}
              isLoading={studentSearchLoading}
              onSearch={(t) => void onStudentSearch(t)}
              onChange={(id, row) =>
                onStudentSelect(id, (row as StudentFeeSearchRow | null) ?? null)
              }
              className={
                !collegeId || !academicYearId
                  ? "pointer-events-none opacity-50"
                  : undefined
              }
            />
          </GlobalFilterField>
        </GlobalFilterBarRow>
      }
      rowData={showTable ? receipts : []}
      columnDefs={columnDefs}
      loading={loadingReceipts}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: "Search receipts…",
        pdfDocumentTitle: "Fee Refunds",
      }}
    >
      <ConfirmDialog
        open={deleteTarget != null}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
        title="Delete fee receipt?"
        description="This will permanently delete the selected fee receipt."
        confirmLabel="Delete"
        confirmVariant="destructive"
        isLoading={deleting}
      />
    </FilteredListPage>
  );
}
